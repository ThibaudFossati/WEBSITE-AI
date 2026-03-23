import { useEffect, useRef, ReactNode } from 'react'

interface TextRevealProps {
  children: ReactNode
  delay?: number
  className?: string
  as?: keyof JSX.IntrinsicElements
}

export default function TextReveal({ children, delay = 0, className = '', as: Tag = 'div' }: TextRevealProps) {
  const wrapperRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return

    const inner = el.querySelector('.reveal-text') as HTMLElement
    if (!inner) return

    const trigger = () => {
      setTimeout(() => inner.classList.add('visible'), delay)
    }

    // If already in viewport, trigger directly
    const rect = el.getBoundingClientRect()
    const inView = rect.top < window.innerHeight && rect.bottom > 0

    if (inView) {
      trigger()
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trigger()
          observer.disconnect()
        }
      },
      { threshold: 0.01 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    // @ts-ignore
    <Tag ref={wrapperRef} className={`reveal-wrapper ${className}`}>
      <span className="reveal-text">{children}</span>
    </Tag>
  )
}
