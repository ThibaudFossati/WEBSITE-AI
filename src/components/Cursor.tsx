import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// GRAPHITE PULSE CURSOR
// Principe : un trait graphite qui respire, tremble légèrement (main humaine),
// s'oriente avec le mouvement et porte la texture implicite du graphite sur papier.
// ─────────────────────────────────────────────────────────────────────────────

// Capsule orientée — le "trait" principal
function strokeMark(
  vx: number, vy: number,
  breath: number,
  trX: number, trY: number
): string {
  const speed = Math.sqrt(vx * vx + vy * vy)
  const angle = Math.atan2(vy, vx)

  // Longueur : s'allonge avec la vitesse, respire lentement
  const len = (9 + Math.min(speed * 0.4, 10)) * breath
  const wid = (1.4 - Math.min(speed * 0.015, 0.6)) * breath // s'affine à vitesse

  const cos = Math.cos(angle), sin = Math.sin(angle)
  const px  = -sin, py  = cos   // perpendiculaire

  // 4 coins de la capsule + micro-tremblement
  const ax = -cos * len * 0.5 + px * wid + trX
  const ay = -sin * len * 0.5 + py * wid + trY
  const bx =  cos * len * 0.5 + px * wid + trX
  const by =  sin * len * 0.5 + py * wid + trY
  const cx =  cos * len * 0.5 - px * wid + trX
  const cy =  sin * len * 0.5 - py * wid + trY
  const dx = -cos * len * 0.5 - px * wid + trX
  const dy = -sin * len * 0.5 - py * wid + trY

  const r = (n: number) => n.toFixed(2)
  // Extrémités arrondies avec quadratiques légèrement décalées → trait naturel
  return `M ${r(ax)} ${r(ay)}
    Q ${r(bx + px * wid * 0.8)} ${r(by + py * wid * 0.8)} ${r(bx)} ${r(by)}
    L ${r(cx)} ${r(cy)}
    Q ${r(dx - px * wid * 0.8)} ${r(dy - py * wid * 0.8)} ${r(dx)} ${r(dy)} Z`
}

// Quadrilatère irrégulier "dessiné à la main" — le follower
function handRect(
  offX: number, offY: number,
  t: number,
  breath: number
): string {
  const s = 22 * breath

  // 4 coins avec oscillations indépendantes → jamais parfaitement carré
  const corners = [
    [-s, -s], [ s, -s], [ s,  s], [-s,  s]
  ].map(([cx, cy], i) => ({
    x: cx + offX + Math.sin(t * 0.55 + i * 1.7) * 2.2 + Math.sin(t * 1.3 + i * 2.9) * 1.0,
    y: cy + offY + Math.cos(t * 0.48 + i * 2.1) * 2.2 + Math.cos(t * 1.1 + i * 1.3) * 1.0,
  }))

  // Côtés légèrement bossus — trait tiré à la main
  const mid = (a: {x:number,y:number}, b: {x:number,y:number}, noise: number) => ({
    x: (a.x + b.x) / 2 + noise,
    y: (a.y + b.y) / 2 + noise * 0.6,
  })

  const r = (n: number) => n.toFixed(2)
  const [c0, c1, c2, c3] = corners
  const m0 = mid(c0, c1, Math.sin(t * 0.9 + 0.5) * 1.5)
  const m1 = mid(c1, c2, Math.sin(t * 0.7 + 1.8) * 1.5)
  const m2 = mid(c2, c3, Math.sin(t * 1.1 + 3.2) * 1.5)
  const m3 = mid(c3, c0, Math.sin(t * 0.8 + 4.6) * 1.5)

  return `M ${r(c0.x)} ${r(c0.y)}
    Q ${r(m0.x)} ${r(m0.y)} ${r(c1.x)} ${r(c1.y)}
    Q ${r(m1.x)} ${r(m1.y)} ${r(c2.x)} ${r(c2.y)}
    Q ${r(m2.x)} ${r(m2.y)} ${r(c3.x)} ${r(c3.y)}
    Q ${r(m3.x)} ${r(m3.y)} ${r(c0.x)} ${r(c0.y)} Z`
}

export default function Cursor() {
  const svgRef  = useRef<SVGSVGElement>(null)
  const markRef = useRef<SVGPathElement>(null)
  const quadRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const svg  = svgRef.current
    const mark = markRef.current
    const quad = quadRef.current
    if (!svg || !mark || !quad) return

    let mx = -300, my = -300
    let fx = -300, fy = -300   // follower lerpé
    let pmx = mx,  pmy = my
    let vx = 0, vy = 0
    let t = 0
    let raf: number

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }

    const frame = () => {
      raf = requestAnimationFrame(frame)
      t += 0.018

      // Vélocité lissée
      vx = vx * 0.72 + (mx - pmx) * 0.28
      vy = vy * 0.72 + (my - pmy) * 0.28
      pmx = mx; pmy = my

      // Follower avec inertie douce
      fx += (mx - fx) * 0.08
      fy += (my - fy) * 0.08

      // Respiration lente — cycle ~4 s
      const breath = 1 + Math.sin(t * 1.6) * 0.10

      // Micro-tremblement — superposition 2 fréquences (signature humaine)
      const trX = Math.sin(t * 14.7) * 0.35 + Math.sin(t * 9.1) * 0.20
      const trY = Math.cos(t * 12.3) * 0.35 + Math.cos(t * 7.8) * 0.20

      // Positionne le SVG sur le curseur exact
      svg.style.left = `${mx}px`
      svg.style.top  = `${my}px`

      // Trait graphite
      mark.setAttribute('d', strokeMark(vx, vy, breath, trX, trY))

      // Cadre irrégulier follower
      quad.setAttribute('d', handRect(fx - mx, fy - my, t, breath))
    }

    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(frame)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 10000,
        overflow: 'visible',
        width: 0,
        height: 0,
        mixBlendMode: 'difference',
      }}
    >
      <defs>
        {/* Texture graphite — grain fractal sur les bords */}
        <filter id="graphite" x="-40%" y="-40%" width="180%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.72 0.58"
            numOctaves="3" seed="12" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise"
            scale="1.6" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>

      {/* Trait principal — graphite, texturé */}
      <path ref={markRef} fill="white" filter="url(#graphite)" />

      {/* Cadre irrégulier — contour "dessiné à la main" */}
      <path
        ref={quadRef}
        fill="none"
        stroke="white"
        strokeWidth="0.9"
        strokeLinejoin="round"
        filter="url(#graphite)"
        opacity="0.55"
      />
    </svg>
  )
}
