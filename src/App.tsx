import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useLayoutEffect, useRef } from 'react'
import Lenis from 'lenis'
import Nav from './components/Nav'
import Cursor from './components/Cursor'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Project from './pages/Project'
import Studio from './pages/Studio'
import { initAnalytics, trackPageView } from './lib/analytics'
import { useSiteContent } from './hooks/useSiteContent'

export default function App() {
  const location = useLocation()
  const progressRef = useRef<HTMLDivElement>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const { design } = useSiteContent()

  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => {
      window.history.scrollRestoration = previous
    }
  }, [])

  // ── Lenis smooth scroll — inertie forte ──────────────────────────────────
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches

    if (reduceMotion || coarsePointer) {
      lenisRef.current = null
      const onScroll = () => {
        const doc = document.documentElement
        const max = Math.max(1, doc.scrollHeight - window.innerHeight)
        const progress = window.scrollY / max
        if (progressRef.current) {
          progressRef.current.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`
        }
      }

      onScroll()
      window.addEventListener('scroll', onScroll, { passive: true })
      window.addEventListener('resize', onScroll)
      return () => {
        window.removeEventListener('scroll', onScroll)
        window.removeEventListener('resize', onScroll)
      }
    }

    const lenis = new Lenis({
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.3,
      touchMultiplier: 1.8,
    })
    lenisRef.current = lenis

    // Barre de progression scroll
    lenis.on('scroll', ({ progress }: { progress: number }) => {
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${progress})`
      }
    })

    let raf: number
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      lenisRef.current = null
      lenis.destroy()
      cancelAnimationFrame(raf)
    }
  }, [])

  // Scroll handling on route/hash change (before paint for reliable top landing).
  useLayoutEffect(() => {
    const hash = location.hash.replace('#', '')
    const lenis = lenisRef.current
    const scrollTopNow = () => {
      if (lenis) {
        lenis.scrollTo(0, { immediate: true })
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    if (hash) {
      const el = document.getElementById(hash)
      if (el) {
        const sectionTop = el.getBoundingClientRect().top + window.scrollY
        const targetY = Math.max(0, sectionTop + 1)
        if (lenis) {
          lenis.scrollTo(targetY, { immediate: true })
        }
        window.scrollTo({ top: targetY, left: 0, behavior: 'auto' })
        return
      }
    }

    scrollTopNow()
    requestAnimationFrame(scrollTopNow)
  }, [location.pathname, location.hash])

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    if (location.pathname.startsWith('/content')) return
    const path = `${location.pathname}${location.search}${location.hash}`
    trackPageView(path)
  }, [location.pathname, location.search, location.hash])

  useEffect(() => {
    const isStudioRoute = location.pathname.startsWith('/content')
    const colorMode = isStudioRoute ? 'light' : design.colorMode
    const nightStyle = isStudioRoute ? 'safe' : design.nightStyle
    document.body.dataset.colorMode = colorMode
    document.body.dataset.nightStyle = nightStyle
    return () => {
      delete document.body.dataset.colorMode
      delete document.body.dataset.nightStyle
    }
  }, [design.colorMode, design.nightStyle, location.pathname])

  return (
    <>
      {/* Barre de progression — 1px en haut, transform-origin left */}
      <div
        ref={progressRef}
        style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100%',
          height: '1px',
          background: 'rgba(26,22,20,0.22)',
          transformOrigin: 'left center',
          transform: 'scaleX(0)',
          zIndex: 9999,
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      />
      <Cursor />
      <Nav />
      <Routes>
        <Route path="/"             element={<Home />} />
        <Route path="/about"        element={<About />} />
        <Route path="/contact"      element={<Contact />} />
        <Route path="/content"      element={<Studio />} />
        <Route path="/projects/:id" element={<Project />} />
      </Routes>
    </>
  )
}
