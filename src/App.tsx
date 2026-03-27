import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import Lenis from 'lenis'
import Nav from './components/Nav'
import Cursor from './components/Cursor'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Project from './pages/Project'
import Studio from './pages/Studio'

export default function App() {
  const location = useLocation()
  const progressRef = useRef<HTMLDivElement>(null)

  // ── Lenis smooth scroll — inertie forte ──────────────────────────────────
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.3,
      touchMultiplier: 1.8,
    })

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
      lenis.destroy()
      cancelAnimationFrame(raf)
    }
  }, [])

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

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
