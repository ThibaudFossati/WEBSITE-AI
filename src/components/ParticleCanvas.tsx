import { useEffect, useRef } from 'react'

// ── Vertex shader — simple fullscreen quad ────────────────────────────────
const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

// ── Fragment shader — domain-warped fBm + Phong shading on GPU ────────────
const FRAG = `#version 300 es
precision highp float;

uniform float u_t;
uniform vec2  u_mouse;
uniform vec2  u_res;
out vec4 fragColor;

// ── Noise ─────────────────────────────────────────────────────────────────
float hash(float x, float y) {
  float v = sin(x * 127.1 + y * 311.7) * 43758.5453;
  return v - floor(v);
}

float sn(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i.x,       i.y);
  float b = hash(i.x + 1.0, i.y);
  float c = hash(i.x,       i.y + 1.0);
  float d = hash(i.x + 1.0, i.y + 1.0);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, amp = 0.5, freq = 1.0, tot = 0.0;
  for (int i = 0; i < 4; i++) {
    v   += sn(p * freq) * amp;
    tot += amp;
    freq *= 2.0;
    amp  *= 0.50;
  }
  return v / tot;
}

// ── Triple domain warp — chaque couche à sa propre vitesse ────────────────
float wfbm(vec2 p, float t) {
  // Couche 1 : grande structure, très lente
  vec2 q = vec2(
    fbm(p + vec2(t * 0.016,        0.30)),
    fbm(p + vec2(5.20 + t * 0.012, 1.30))
  );
  // Couche 2 : replis intermédiaires, vitesse opposée
  vec2 r = vec2(
    fbm(p + 2.2 * q + vec2(1.70 + t * 0.030,  9.20)),
    fbm(p + 2.2 * q + vec2(8.30,              2.80 - t * 0.025))
  );
  // Final : détail scintillant
  return fbm(p + 2.2 * r + vec2(t * 0.008, -t * 0.006));
}

// ── Masque d'émergence — formes qui apparaissent et disparaissent ─────────
float emerge(vec2 uv, float t) {
  float e0 = fbm(uv * 0.5 + vec2(t * 0.007,  t * 0.005));
  float e1 = fbm(uv * 0.4 + vec2(-t * 0.004, t * 0.009));
  return 0.5 + 0.5 * sin((e0 - e1) * 6.2832);
}

// ── Palette glace ─────────────────────────────────────────────────────────
vec3 iceCol(float v) {
  v = clamp(v, 0.0, 1.0);
  vec3 c0 = vec3(  4.,  14.,  38.) / 255.0;
  vec3 c1 = vec3( 14.,  42.,  85.) / 255.0;
  vec3 c2 = vec3( 32.,  82., 140.) / 255.0;
  vec3 c3 = vec3( 72., 148., 200.) / 255.0;
  vec3 c4 = vec3(130., 196., 228.) / 255.0;
  vec3 c5 = vec3(188., 230., 246.) / 255.0;
  vec3 c6 = vec3(235., 250., 255.) / 255.0;
  if (v < 0.12) return mix(c0, c1, v / 0.12);
  if (v < 0.28) return mix(c1, c2, (v - 0.12) / 0.16);
  if (v < 0.45) return mix(c2, c3, (v - 0.28) / 0.17);
  if (v < 0.62) return mix(c3, c4, (v - 0.45) / 0.17);
  if (v < 0.80) return mix(c4, c5, (v - 0.62) / 0.18);
  return mix(c5, c6, (v - 0.80) / 0.20);
}

void main() {
  // UV : (0,0) en haut-gauche → (1,1) en bas-droite
  vec2 uv = vec2(gl_FragCoord.x, u_res.y - gl_FragCoord.y) / u_res;

  // Influence curseur
  vec2  md   = uv - u_mouse;
  float mf   = pow(max(0.0, 1.0 - length(md) / 0.38), 2.0);
  vec2  np   = uv * 1.5 + mf * md * 0.28;

  // Champ de hauteur + gradient pour la normale
  float eps = 0.025;
  float h   = wfbm(np,                   u_t);
  float hx  = wfbm(np + vec2(eps, 0.0),  u_t);
  float hy  = wfbm(np + vec2(0.0, eps),  u_t);

  // Masque d'émergence
  float em  = emerge(uv, u_t);

  // Normale de surface
  float dx = (hx - h) / eps * 2.8;
  float dy = (hy - h) / eps * 2.8;
  vec3  N  = normalize(vec3(-dx, -dy, 1.0));

  // Lumière haut-gauche
  vec3  L    = normalize(vec3(-0.38, -0.58, 0.72));
  float diff = max(0.0, dot(N, L));

  // Spéculaire Blinn-Phong
  vec3  H    = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(0.0, dot(N, H)), 20.0) * 1.1;

  // Lueur curseur
  float glow = mf * 0.16;

  // Luminosité finale modulée par l'émergence
  float lit = (0.05 + diff * 0.82 + spec + glow) * (0.50 + 0.50 * em);

  fragColor = vec4(iceCol(min(1.0, lit)), 1.0);
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

    // Compile + link shaders
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(s))
      }
      return s
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl.VERTEX_SHADER,   VERT))
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog))
    }
    gl.useProgram(prog)

    // Fullscreen quad (triangle strip)
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
      const dpr  = window.devicePixelRatio || 1
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

    let t = 0
    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      t += 0.012
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
