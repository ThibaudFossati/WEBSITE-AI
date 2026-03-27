import { useEffect, useRef } from 'react'

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

// Shader Home basé sur colormap + warp fBM fourni par l'utilisateur.
// Adapté en WebGL2 avec interaction souris et grading bleu premium.
const FRAG = `#version 300 es
precision highp float;

uniform float u_t;
uniform vec2 u_mouse;
uniform vec2 u_res;
uniform vec2 u_tilt;

out vec4 fragColor;

float colormap_red(float x) {
  if (x < 0.0) {
    return 54.0 / 255.0;
  } else if (x < 20049.0 / 82979.0) {
    return (829.79 * x + 54.51) / 255.0;
  } else {
    return 1.0;
  }
}

float colormap_green(float x) {
  if (x < 20049.0 / 82979.0) {
    return 0.0;
  } else if (x < 327013.0 / 810990.0) {
    return (8546482679670.0 / 10875673217.0 * x - 2064961390770.0 / 10875673217.0) / 255.0;
  } else if (x <= 1.0) {
    return (103806720.0 / 483977.0 * x + 19607415.0 / 483977.0) / 255.0;
  } else {
    return 1.0;
  }
}

float colormap_blue(float x) {
  if (x < 0.0) {
    return 54.0 / 255.0;
  } else if (x < 7249.0 / 82979.0) {
    return (829.79 * x + 54.51) / 255.0;
  } else if (x < 20049.0 / 82979.0) {
    return 127.0 / 255.0;
  } else if (x < 327013.0 / 810990.0) {
    return (792.0224934136139 * x - 64.36479073560233) / 255.0;
  } else {
    return 1.0;
  }
}

vec4 colormap(float x) {
  return vec4(colormap_red(x), colormap_green(x), colormap_blue(x), 1.0);
}

float rand(vec2 n) {
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u*u*(3.0-2.0*u);

  float res = mix(
      mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
      mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
      u.y
  );
  return res * res;
}

const mat2 mtx = mat2(0.80, 0.60, -0.60, 0.80);

float fbm(vec2 p) {
  float f = 0.0;
  f += 0.500000 * noise(p + u_t); p = mtx * p * 2.02;
  f += 0.031250 * noise(p);       p = mtx * p * 2.01;
  f += 0.250000 * noise(p);       p = mtx * p * 2.03;
  f += 0.125000 * noise(p);       p = mtx * p * 2.01;
  f += 0.062500 * noise(p);       p = mtx * p * 2.04;
  f += 0.015625 * noise(p + sin(u_t));
  return f / 0.96875;
}

float pattern(vec2 p) {
  return fbm(p + fbm(p + fbm(p)));
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = fragCoord / u_res.xy;
  vec2 p = (fragCoord * 2.0 - u_res.xy) / u_res.y;
  vec2 mouse = (u_mouse * 2.0 - 1.0);
  vec2 motion = clamp(mouse + u_tilt * 0.55, vec2(-1.0), vec2(1.0));
  vec2 tilt = clamp(u_tilt, vec2(-1.0), vec2(1.0));
  float tiltStrength = clamp(length(tilt), 0.0, 1.0);
  vec2 tiltDir = tiltStrength > 0.0001 ? normalize(tilt) : vec2(0.0);

  float md = length(p - motion * vec2(u_res.x / u_res.y, 1.0));
  float mGlow = exp(-md * md * 2.0);

  vec2 flow = p;
  flow += motion * 0.35;
  flow += vec2(sin(u_t * 0.24), cos(u_t * 0.19)) * 0.12;
  flow += vec2(p.y, -p.x) * (mGlow * 0.12);
  // Écoulement principal orienté par l'inclinaison du téléphone
  flow += tiltDir * (u_t * (0.22 + tiltStrength * 0.95));
  // Cisaillement latéral pour renforcer la sensation de "coulée"
  flow += vec2(-tiltDir.y, tiltDir.x) * sin(u_t * 0.55 + dot(p, tiltDir) * 6.0) * (0.08 * tiltStrength);
  flow *= 0.92;

  float shade = pattern(flow * (1.22 + tiltStrength * 0.16) + vec2(u_t * 0.06, -u_t * 0.04));
  shade += mGlow * 0.08;
  shade = clamp(shade, 0.0, 1.0);

  vec3 cm = colormap(shade).rgb;

  vec3 deepBlue = vec3(0.010, 0.028, 0.090);
  vec3 electricBlue = vec3(0.185, 0.465, 1.000);
  vec3 cyanBlue = vec3(0.175, 0.700, 1.000);
  vec3 col = mix(deepBlue, cm * vec3(0.62, 0.86, 1.22), pow(shade, 0.9));
  col += electricBlue * smoothstep(0.62, 1.0, shade) * 0.16;
  col += cyanBlue * mGlow * 0.12;

  float vignette = smoothstep(1.35, 0.18, length((uv * 2.0 - 1.0) * vec2(1.05, 1.12)));
  col *= mix(0.50, 1.0, vignette);

  col = col / (col + vec3(1.0));
  col = pow(col, vec3(0.94));

  fragColor = vec4(col, 1.0);
}
`

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', { alpha: true, antialias: false })
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

    const uT = gl.getUniformLocation(prog, 'u_t')
    const uMouse = gl.getUniformLocation(prog, 'u_mouse')
    const uRes = gl.getUniformLocation(prog, 'u_res')
    const uTilt = gl.getUniformLocation(prog, 'u_tilt')

    let cw = 0, ch = 0
    const setSize = () => {
      const el  = canvas.closest('section') || canvas.parentElement
      const sw  = el ? el.clientWidth  : window.innerWidth
      const sh  = el ? el.clientHeight : window.innerHeight
      const dpr = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1 : 1.5)
      cw = Math.round(sw * dpr); ch = Math.round(sh * dpr)
      canvas.width = cw; canvas.height = ch
      canvas.style.width = sw + 'px'; canvas.style.height = sh + 'px'
      gl.viewport(0, 0, cw, ch)
    }
    const ro = new ResizeObserver(setSize)
    ro.observe(canvas.parentElement || canvas)
    setSize()

    const mouse = { x: 0.5, y: 0.5 }
    const targetMouse = { x: 0.5, y: 0.5 }
    const tilt = { x: 0, y: 0 }
    const targetTilt = { x: 0, y: 0 }
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      targetMouse.x = (e.clientX - r.left) / r.width
      targetMouse.y = (e.clientY - r.top) / r.height
    }
    window.addEventListener('mousemove', onMove)
    const onLeave = () => {
      targetMouse.x = 0.5
      targetMouse.y = 0.5
    }
    window.addEventListener('mouseout', onLeave)

    const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

    const applyDeadzone = (value: number, deadzone: number) => {
      if (Math.abs(value) < deadzone) return 0
      return value
    }

    const onDeviceOrientation = (event: DeviceOrientationEvent) => {
      const gamma = event.gamma ?? 0
      const beta = event.beta ?? 0
      targetTilt.x = applyDeadzone(clamp(gamma / 45, -1, 1), 0.04)
      targetTilt.y = applyDeadzone(clamp(-beta / 60, -1, 1), 0.04)
    }

    let removeOrientation = () => {}
    const enableOrientation = () => {
      window.addEventListener('deviceorientation', onDeviceOrientation, true)
      removeOrientation = () => window.removeEventListener('deviceorientation', onDeviceOrientation, true)
    }

    const setupOrientation = () => {
      if (typeof DeviceOrientationEvent === 'undefined') return

      const maybeWithPermission = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }

      if (typeof maybeWithPermission.requestPermission === 'function') {
        const unlock = () => {
          maybeWithPermission.requestPermission?.()
            .then(result => {
              if (result === 'granted') enableOrientation()
            })
            .catch(() => {})
            .finally(() => {
              window.removeEventListener('touchstart', unlock)
              window.removeEventListener('pointerdown', unlock)
            })
        }
        window.addEventListener('touchstart', unlock, { passive: true, once: true })
        window.addEventListener('pointerdown', unlock, { passive: true, once: true })
        return
      }

      enableOrientation()
    }

    setupOrientation()

    let visible = true
    const io = new IntersectionObserver(
      ([e]) => { visible = e.isIntersecting }, { threshold: 0 }
    )
    io.observe(canvas)

    const start = performance.now()
    let lastDraw = 0
    const minFrameMs = coarsePointer ? 33 : 16
    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw)
      if (!visible) return
      if (now - lastDraw < minFrameMs) return
      lastDraw = now

      mouse.x += (targetMouse.x - mouse.x) * 0.08
      mouse.y += (targetMouse.y - mouse.y) * 0.08
      tilt.x += (targetTilt.x - tilt.x) * (coarsePointer ? 0.045 : 0.08)
      tilt.y += (targetTilt.y - tilt.y) * (coarsePointer ? 0.045 : 0.08)

      const t = (now - start) * 0.001

      gl.uniform1f(uT,    t)
      gl.uniform2f(uMouse, mouse.x, mouse.y)
      gl.uniform2f(uRes,   cw, ch)
      gl.uniform2f(uTilt, tilt.x, tilt.y)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      io.disconnect()
      ro.disconnect()
      removeOrientation()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseout', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  )
}
