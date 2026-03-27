import { useEffect, useRef } from 'react'

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

// ── Ink Diffusion 3D ──────────────────────────────────────────────────────
// Encre bioluminescente qui se diffuse dans l'eau sombre en 3D
// 4 couches de profondeur avec parallax + densité gaussienne
// Mouvement organique et imprévisible — jamais la même forme
const FRAG = `#version 300 es
precision highp float;

uniform float u_t;
uniform vec2  u_mouse;
uniform vec2  u_res;
out vec4 fragColor;

// ── Hash sans sin() ───────────────────────────────────────────────────────
float hash(float x, float y) {
  vec2 p = fract(vec2(x,y)*vec2(.1031,.1030));
  p += dot(p,p.yx+33.33);
  return fract((p.x+p.y)*p.x);
}
float sn(vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  return mix(mix(hash(i.x,i.y), hash(i.x+1.,i.y), u.x),
             mix(hash(i.x,i.y+1.), hash(i.x+1.,i.y+1.), u.x), u.y);
}
// fBm 4 octaves — plus de détails pour l'encre
float fbm(vec2 p) {
  float v=0.,a=.5,f=1.,tot=0.;
  for(int i=0;i<4;i++){v+=sn(p*f)*a;tot+=a;f*=2.;a*=.48;}
  return v/tot;
}

// ── Domain warp triple — très organique ──────────────────────────────────
vec2 warp(vec2 p, float t) {
  vec2 q = vec2(fbm(p + vec2(t*.007, .31)),
                fbm(p + vec2(5.2 + t*.006, 1.3)));
  vec2 r = vec2(fbm(p + 2.2*q + vec2(1.7 + t*.005, 9.2)),
                fbm(p + 2.2*q + vec2(8.3, 2.8 - t*.004)));
  return p + 2.4*r;
}

// ── Densité d'encre — seuil soft : seulement le top ~25% du fBm ──────────
// Crée des masses isolées sur fond noir (pas de brouillard global)
float inkDensity(vec2 p, float t, float freq, float offset) {
  vec2 wp = warp(p * freq, t);
  float n  = fbm(wp + offset);

  // Seuil : 0 en dessous de .48, monte vers 1 au-dessus de .70
  // → seulement les crêtes du bruit deviennent encre
  float d = smoothstep(.48, .72, n);
  return d * d; // carré = encore plus contrasté
}

// ── Tendrons : filaments fins autour des masses ───────────────────────────
float tendril(vec2 p, float t, float freq) {
  vec2 wp = warp(p * freq, t * 1.3);
  float n  = fbm(wp);
  // Crêtes fines aux iso-lignes
  float d  = abs(fract(n * 4.5 + .5) * 2. - 1.);
  return smoothstep(.12, .0, d) * .4;
}

void main() {
  vec2 uv  = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_res;
  float asp = u_res.x / u_res.y;
  vec2  p   = vec2(uv.x * asp, uv.y);
  vec2  ctr = vec2(asp*.5, .5);

  // ── Mouse : distorsion locale (goutte d'encre) ───────────────────────
  vec2  mp    = vec2(u_mouse.x * asp, u_mouse.y);
  vec2  mDiff = p - mp;
  float mDist = length(mDiff);
  // Déplace légèrement les couches vers/autour du curseur
  vec2  mPush = mDiff * exp(-mDist*mDist*6.) * .08;

  // ── 4 couches de profondeur — parallax ────────────────────────────────
  // Chaque couche : décalage parallax différent, vitesse différente
  vec2 p0 = p - (mp - ctr)*.000 + mPush*.10; // fond fixe
  vec2 p1 = p - (mp - ctr)*.020 + mPush*.25; // profond
  vec2 p2 = p - (mp - ctr)*.055 + mPush*.55; // moyen
  vec2 p3 = p - (mp - ctr)*.100 + mPush*.90; // avant-plan

  // ── Densités sharpenées — concentre la lumière aux cœurs ────────────
  float d0 = pow(inkDensity(p0, u_t * .40, .70, 0.0),  3.5);
  float d1 = pow(inkDensity(p1, u_t * .60, .95, 3.71), 2.8);
  float d2 = pow(inkDensity(p2, u_t * .82, 1.25, 7.13),2.2);
  float d3 = pow(inkDensity(p3, u_t * 1.0, 1.60, 1.94),2.0);

  float ten = tendril(p2, u_t, 1.8) + tendril(p3, u_t, 2.4)*.6;

  // ── Palette sombre — eau noire, encre lumineuse par couches ─────────
  vec3 col0  = vec3(.005, .003, .022); // fond quasi-noir / violet nuit
  vec3 col1  = vec3(.008, .018, .100); // bleu nuit profond
  vec3 col2  = vec3(.020, .090, .340); // bleu moyen (pas trop vif)
  vec3 col3  = vec3(.060, .240, .580); // bleu-cyan avant-plan
  vec3 colT  = vec3(.280, .600, .900); // filaments — cyan
  vec3 colHot= vec3(.600, .860, 1.000);// cœurs seulement — blanc-cyan

  // ── Composition sur noir pur ──────────────────────────────────────────
  vec3 col = vec3(0.0);

  // Couches de base — max blending, pas d'accumulation
  col = max(col, col0 * d0);
  col = max(col, col1 * d1);
  col = max(col, col2 * d2);
  col = max(col, col3 * d3);

  // Cœur lumineux — seulement aux intersections denses (rare)
  col += colHot * pow(d2 * d3, 1.2) * 1.6;

  // Filaments — visibles seulement là où il y a de l'encre
  col += colT * ten * max(d2, d3) * .60;

  // ── Halo souris ───────────────────────────────────────────────────────
  float mGlow = exp(-mDist * mDist * 5.0) * .35;
  col += col3  * mGlow;
  col += colHot * exp(-mDist * mDist * 25.) * .30;

  // ── Vignette quadratique — bords très sombres ─────────────────────────
  float vig = 1. - smoothstep(.15, 1.08, length(p - ctr) * .88);
  col *= vig * vig;

  // ── Simple clamp — pas de tone mapping qui lève les noirs ────────────
  col = clamp(col, 0., 1.);

  fragColor = vec4(col, 1.0);
}
`

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2')
    if (!gl) return

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src); gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
        console.error(gl.getShaderInfoLog(s))
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER,   VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
      console.error(gl.getProgramInfoLog(prog))
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uT     = gl.getUniformLocation(prog, 'u_t')
    const uMouse = gl.getUniformLocation(prog, 'u_mouse')
    const uRes   = gl.getUniformLocation(prog, 'u_res')

    let cw = 0, ch = 0
    const setSize = () => {
      const el  = canvas.closest('section') || canvas.parentElement
      const sw  = el ? el.clientWidth  : window.innerWidth
      const sh  = el ? el.clientHeight : window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      cw = Math.round(sw * dpr); ch = Math.round(sh * dpr)
      canvas.width = cw; canvas.height = ch
      canvas.style.width = sw + 'px'; canvas.style.height = sh + 'px'
      gl.viewport(0, 0, cw, ch)
    }
    const ro = new ResizeObserver(setSize)
    ro.observe(canvas.parentElement || canvas)
    setSize()

    const mouse = { x: .5, y: .5 }
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = (e.clientX - r.left) / r.width
      mouse.y = (e.clientY - r.top)  / r.height
    }
    window.addEventListener('mousemove', onMove)

    let visible = true
    const io = new IntersectionObserver(
      ([e]) => { visible = e.isIntersecting }, { threshold: 0 }
    )
    io.observe(canvas)

    let t = 0
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      if (!visible) return
      t += 0.007  // lent et organique

      gl.uniform1f(uT,    t)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.uniform2f(uRes,   cw, ch)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
