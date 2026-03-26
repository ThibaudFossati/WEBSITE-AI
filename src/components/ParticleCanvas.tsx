import { useEffect, useRef } from 'react'

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

// ── Refik Anadol Style — Machine Hallucinations ────────────────────────────
// Fond espace profond + rubans lumineux en bleu glace / cyan
// Technique: flow field domain-warped → zero-crossing ribbons multi-échelle
const FRAG = `#version 300 es
precision highp float;

uniform float u_t;
uniform vec2  u_mouse;
uniform vec2  u_res;
out vec4 fragColor;

// ── C: Hash sans sin() — Dave Hoskins ─────────────────────────────────────
float hash(float x, float y) {
  vec2 p = fract(vec2(x, y) * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.x + p.y) * p.x);
}

float sn(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(
    mix(hash(i.x,       i.y),       hash(i.x+1.0, i.y),       u.x),
    mix(hash(i.x,       i.y+1.0),   hash(i.x+1.0, i.y+1.0),   u.x), u.y);
}

// ── D: fBm 3 octaves ──────────────────────────────────────────────────────
float fbm(vec2 p) {
  float v=0.0, a=0.5, f=1.0, tot=0.0;
  for(int i=0;i<3;i++){v+=sn(p*f)*a;tot+=a;f*=2.0;a*=0.5;}
  return v/tot;
}

// ── Domain warp double — mouvement organique lent ─────────────────────────
vec2 warp(vec2 p, float t) {
  vec2 q = vec2(
    fbm(p + vec2(t*0.013,          0.31)),
    fbm(p + vec2(5.20 + t*0.011,   1.30))
  );
  return p + 2.6 * q;
}

// ── Ruban lumineux — pic aux zéros du bruit (pas de taches) ───────────────
float ribbon(float n, float freq, float sharp) {
  float r = abs(fract(n * freq + 0.5) * 2.0 - 1.0);
  return pow(max(0.0, 1.0 - r), sharp);
}

// ── Palette Refik Anadol — vide cosmique → glace → blanc électrique ───────
vec3 anadolPalette(float v) {
  v = clamp(v, 0.0, 1.0);
  vec3 void_  = vec3(0.008, 0.016, 0.050); // espace profond
  vec3 deep   = vec3(0.028, 0.085, 0.230); // bleu nuit
  vec3 ice    = vec3(0.095, 0.430, 0.820); // bleu glace signature
  vec3 bright = vec3(0.520, 0.840, 0.980); // cyan lumineux
  vec3 hot    = vec3(0.940, 0.975, 1.000); // blanc chaud (coeur)

  if(v < 0.08) return mix(void_,  deep,   v/0.08);
  if(v < 0.28) return mix(deep,   ice,    (v-0.08)/0.20);
  if(v < 0.62) return mix(ice,    bright, (v-0.28)/0.34);
  return              mix(bright, hot,    (v-0.62)/0.38);
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_res;
  float asp = u_res.x / u_res.y;
  vec2  p   = vec2(uv.x * asp, uv.y);
  vec2  ctr = vec2(asp * 0.5, 0.5);

  // ── Mouse: gravité organique sur les rubans ───────────────────────────
  vec2  mp     = vec2(u_mouse.x * asp, u_mouse.y);
  vec2  mDelta = p - mp;
  float mPull  = exp(-dot(mDelta, mDelta) * 3.5) * 0.38;
  vec2  np     = p - mDelta * mPull * 0.14;

  // ── Domain warp (calculé une seule fois) ─────────────────────────────
  vec2 wp = warp((np - ctr) * 0.88 + ctr, u_t);

  // ── 3 couches fBm sur le même warp ───────────────────────────────────
  float n1 = fbm(wp);
  float n2 = fbm(wp * 1.65 + vec2(3.71, 1.13));
  float n3 = fbm(wp * 2.90 + vec2(7.34, 5.27));

  // ── Rubans: grand / moyen / fin ───────────────────────────────────────
  float r1 = ribbon(n1, 4.5,  7.0);   // grands flots
  float r2 = ribbon(n2, 9.5,  13.0);  // rubans moyens
  float r3 = ribbon(n3, 17.0, 21.0);  // fils fins

  float flow = r1*0.52 + r2*0.32 + r3*0.16;

  // ── Halo souris ───────────────────────────────────────────────────────
  float mGlow = mPull * 0.55;

  // ── Vignette douce: densité vers le centre de la composition ─────────
  float vig = 1.0 - smoothstep(0.30, 1.05, length(np - ctr));

  float intensity = (flow + mGlow) * (0.65 + 0.35 * vig);
  intensity = pow(clamp(intensity, 0.0, 1.0), 0.70); // récupère les basses lumin.

  fragColor = vec4(anadolPalette(intensity), 1.0);
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
      gl.shaderSource(s, src)
      gl.compileShader(s)
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
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uT     = gl.getUniformLocation(prog, 'u_t')
    const uMouse = gl.getUniformLocation(prog, 'u_mouse')
    const uRes   = gl.getUniformLocation(prog, 'u_res')

    let cw = 0, ch = 0

    const setSize = () => {
      const hero = canvas.closest('section') || canvas.parentElement
      const sw   = hero ? hero.clientWidth  : window.innerWidth
      const sh   = hero ? hero.clientHeight : window.innerHeight
      // ── A: DPR cap 1.5 ────────────────────────────────────────────────
      const dpr  = Math.min(window.devicePixelRatio || 1, 1.5)
      cw = Math.round(sw * dpr)
      ch = Math.round(sh * dpr)
      canvas.width  = cw
      canvas.height = ch
      canvas.style.width  = sw + 'px'
      canvas.style.height = sh + 'px'
      gl.viewport(0, 0, cw, ch)
    }

    const ro = new ResizeObserver(setSize)
    ro.observe(canvas.parentElement || canvas)
    setSize()

    const mouse = { x: 0.5, y: 0.5 }
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = (e.clientX - rect.left) / rect.width
      mouse.y = (e.clientY - rect.top)  / rect.height
    }
    window.addEventListener('mousemove', onMove)

    // ── B: Pause quand hors viewport ─────────────────────────────────────
    let visible = true
    const io = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting },
      { threshold: 0 }
    )
    io.observe(canvas)

    let t = 0
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      if (!visible) return
      t += 0.008  // mouvement lent et majestueux (Anadol)
      gl.uniform1f(uT, t)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.uniform2f(uRes, cw, ch)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', onMove)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="particle-canvas"
      style={{ display: 'block' }}
    />
  )
}
