import { useEffect, useRef } from 'react'

// ── Palette — tons chauds sur fond clair ──────────────────────────────────
const COLORS = [
  [160, 148, 132],   // sable chaud
  [140, 120, 100],   // caramel doux
  [180, 160, 130],   // or sable
  [200, 170,  90],   // or — accent luxe rare
  [160, 140, 180],   // mauve poudré — beauté
  [ 90, 170, 160],   // teal — reflet
]

type Kind = 'dot' | 'drop' | 'capsule' | 'halo' | 'tip'

interface Particle {
  x: number; y: number
  kind: Kind
  size: number
  color: number[]
  phase: number      // offset de phase individuel
  driftX: number     // direction de dérive lente
  driftY: number
  angle: number      // rotation (capsules/tips)
  speed: number      // vitesse d'animation
  life: number       // cycle de vie [0..1] → fade in/out
  lifeSpeed: number
}

const KINDS: Kind[] = ['dot', 'drop', 'capsule', 'halo', 'tip']
const N_PARTICLES = 72

function makeParticle(w: number, h: number): Particle {
  const kind = KINDS[Math.floor(Math.random() * KINDS.length)]
  // Or pâle = rare (10%)
  const colorIdx = Math.random() < 0.10 ? 3
                 : Math.random() < 0.08 ? 4
                 : Math.random() < 0.08 ? 5
                 : Math.floor(Math.random() * 3)
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    kind,
    size: kind === 'halo'    ? 18 + Math.random() * 28
        : kind === 'capsule' ?  8 + Math.random() * 18
        : kind === 'drop'    ?  2 + Math.random() *  5
        : kind === 'tip'     ?  3 + Math.random() *  7
        :                       1 + Math.random() *  2.5,  // dot
    color: COLORS[colorIdx],
    phase: Math.random() * Math.PI * 2,
    driftX: (Math.random() - 0.5) * 0.12,
    driftY: (Math.random() - 0.5) * 0.08,
    angle: Math.random() * Math.PI,
    speed: 0.4 + Math.random() * 0.8,
    life: Math.random(),
    lifeSpeed: 0.003 + Math.random() * 0.006,
  }
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle,
  t: number
) {
  // Cycle de vie — chaque particule fait fondu in/out indépendamment
  const pulse = 0.5 + 0.5 * Math.sin(t * p.speed + p.phase)
  // Opacité max selon le type
  const maxA = p.kind === 'halo' ? 0.07
             : p.kind === 'dot'  ? 0.90
             : p.kind === 'capsule' ? 0.55
             : 0.65
  const alpha = pulse * maxA

  const [r, g, b] = p.color
  ctx.save()
  ctx.translate(p.x, p.y)

  if (p.kind === 'dot') {
    // Micro-point brillant — avec un micro-halo autour
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 3)
    grad.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`)
    grad.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.4})`)
    grad.addColorStop(1,   `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(0, 0, p.size * 3, 0, Math.PI * 2)
    ctx.fill()
    // Cœur brillant
    ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(1, alpha * 1.8)})`
    ctx.beginPath()
    ctx.arc(0, 0, p.size, 0, Math.PI * 2)
    ctx.fill()

  } else if (p.kind === 'drop') {
    // Goutte — ovale légèrement allongé vers le bas
    ctx.rotate(p.angle + Math.sin(t * 0.4 + p.phase) * 0.3)
    ctx.scale(1, 1.55)
    const gd = ctx.createRadialGradient(0, -p.size * 0.3, 0, 0, 0, p.size)
    gd.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`)
    gd.addColorStop(0.6, `rgba(${r},${g},${b},${alpha * 0.5})`)
    gd.addColorStop(1,   `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = gd
    ctx.beginPath()
    ctx.arc(0, 0, p.size, 0, Math.PI * 2)
    ctx.fill()

  } else if (p.kind === 'capsule') {
    // Capsule allongée — orientée, légère rotation animée
    const a = p.angle + Math.sin(t * 0.3 + p.phase) * 0.15
    ctx.rotate(a)
    const len  = p.size
    const wid  = p.size * 0.18
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
    ctx.beginPath()
    ctx.roundRect(-len, -wid, len * 2, wid * 2, wid)
    ctx.fill()
    // Reflet spéculaire sur la capsule
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.4})`
    ctx.beginPath()
    ctx.roundRect(-len * 0.7, -wid * 0.6, len * 1.4, wid * 0.5, wid * 0.25)
    ctx.fill()

  } else if (p.kind === 'halo') {
    // Petit halo diffus — cercle à gradient très doux
    const gh = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size)
    gh.addColorStop(0,   `rgba(${r},${g},${b},${alpha})`)
    gh.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.4})`)
    gh.addColorStop(1,   `rgba(${r},${g},${b},0)`)
    ctx.fillStyle = gh
    ctx.beginPath()
    ctx.arc(0, 0, p.size, 0, Math.PI * 2)
    ctx.fill()

  } else if (p.kind === 'tip') {
    // Pointe douce — losange fin et allongé
    ctx.rotate(p.angle + Math.sin(t * 0.5 + p.phase) * 0.2)
    const l = p.size
    const w = p.size * 0.22
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
    ctx.beginPath()
    ctx.moveTo(0, -l)
    ctx.quadraticCurveTo(w, -l * 0.1, 0,  l)
    ctx.quadraticCurveTo(-w, -l * 0.1, 0, -l)
    ctx.fill()
  }

  ctx.restore()
}

export default function MicroDetails() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef    = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0, h = 0
    let particles: Particle[] = []

    const setSize = () => {
      const parent = canvas.parentElement
      w = parent ? parent.clientWidth  : window.innerWidth
      h = parent ? parent.clientHeight : window.innerHeight
      canvas.width  = w
      canvas.height = h
      canvas.style.width  = w + 'px'
      canvas.style.height = h + 'px'
      // Recrée les particules à la bonne taille
      particles = Array.from({ length: N_PARTICLES }, () => makeParticle(w, h))
    }

    const ro = new ResizeObserver(setSize)
    ro.observe(canvas.parentElement || canvas)
    setSize()

    // Pause hors viewport
    let visible = true
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
    io.observe(canvas)

    let t = 0
    let frame = 0

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw)
      if (!visible) return

      t += 0.016
      frame++

      // Dérive lente des particules
      particles.forEach(p => {
        p.x += p.driftX
        p.y += p.driftY
        // Reboucle aux bords
        if (p.x < -50) p.x = w + 50
        if (p.x > w + 50) p.x = -50
        if (p.y < -50) p.y = h + 50
        if (p.y > h + 50) p.y = -50
      })

      ctx.clearRect(0, 0, w, h)
      particles.forEach(p => drawParticle(ctx, p, t))
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  )
}
