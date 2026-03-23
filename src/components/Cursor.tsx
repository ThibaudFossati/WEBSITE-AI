import { useEffect, useRef, useState } from 'react'

export default function Cursor() {
  const dotRef      = useRef<HTMLDivElement>(null)
  const followerRef = useRef<HTMLDivElement>(null)
  const pos         = useRef({ x: -200, y: -200 })
  const followerPos = useRef({ x: -200, y: -200 })
  const rafRef      = useRef<number>(0)
  const [state, setState] = useState<'default' | 'hover' | 'click'>('default')

  useEffect(() => {
    const dot      = dotRef.current
    const follower = followerRef.current
    if (!dot || !follower) return

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY }
      dot.style.left = `${e.clientX}px`
      dot.style.top  = `${e.clientY}px`
    }

    const onOver = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('a, button, [data-cursor]'))
        setState('hover')
    }
    const onOut = (e: MouseEvent) => {
      if (!(e.relatedTarget as HTMLElement)?.closest?.('a, button, [data-cursor]'))
        setState('default')
    }

    const onDown = () => setState('click')
    const onUp   = () => setState(s => s === 'click' ? 'default' : s)

    const animate = () => {
      followerPos.current.x += (pos.current.x - followerPos.current.x) * 0.10
      followerPos.current.y += (pos.current.y - followerPos.current.y) * 0.10
      follower.style.left = `${followerPos.current.x}px`
      follower.style.top  = `${followerPos.current.y}px`
      rafRef.current = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseover', onOver)
    document.addEventListener('mouseout',  onOut)
    window.addEventListener('mousedown', onDown)
    window.addEventListener('mouseup',   onUp)
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseout',  onOut)
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('mouseup',   onUp)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      <div ref={dotRef}      id="cursor"          data-state={state} />
      <div ref={followerRef} id="cursor-follower" data-state={state} />
    </>
  )
}
