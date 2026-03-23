import { useRef, useEffect, ReactNode } from 'react'

interface MagnetProps {
  children: ReactNode
  strength?: number   // 0.2 = subtle, 0.5 = fort
  radius?: number     // px — zone d'attraction
  className?: string
  style?: React.CSSProperties
}

export default function Magnet({
  children,
  strength = 0.35,
  radius = 120,
  className,
  style,
}: MagnetProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let rafId: number
    let tx = 0, ty = 0   // target
    let cx = 0, cy = 0   // current (lerped)

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const ox   = rect.left + rect.width  / 2
      const oy   = rect.top  + rect.height / 2
      const dx   = e.clientX - ox
      const dy   = e.clientY - oy
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < radius) {
        const factor = (1 - dist / radius) * strength
        tx = dx * factor
        ty = dy * factor
      } else {
        tx = 0
        ty = 0
      }
    }

    const animate = () => {
      cx += (tx - cx) * 0.14
      cy += (ty - cy) * 0.14
      // Snap to zero when close enough
      if (Math.abs(cx) < 0.01 && tx === 0) cx = 0
      if (Math.abs(cy) < 0.01 && ty === 0) cy = 0
      el.style.transform = `translate(${cx}px, ${cy}px)`
      rafId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove)
    rafId = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(rafId)
      el.style.transform = ''
    }
  }, [strength, radius])

  return (
    <div ref={ref} className={className} style={{ display: 'inline-block', ...style }}>
      {children}
    </div>
  )
}
