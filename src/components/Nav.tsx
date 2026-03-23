import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Magnet from './Magnet'

export default function Nav() {
  const location = useLocation()
  const [scrolled,  setScrolled]  = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close on route change
  useEffect(() => { setMenuOpen(false) }, [location])

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      {/* ── Mobile menu overlay ── */}
      <div className={`nav-overlay${menuOpen ? ' open' : ''}`}>
        {[
          { label: 'Projets',  to: '/#projects' },
          { label: 'Services', to: '/#services' },
          { label: 'About',    to: '/about' },
          { label: 'Contact',  to: '/contact' },
        ].map(({ label, to }) => (
          <a key={label} href={to} onClick={() => setMenuOpen(false)}>{label}</a>
        ))}
        <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginTop: '40px' }}>
          Thibaud Fossati · Paris
        </span>
      </div>

      {/* ── Nav bar ── */}
      <nav
        className="nav-inner"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 1000,
          padding: '28px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background 0.4s ease, backdrop-filter 0.4s ease',
          background: scrolled || menuOpen ? 'rgba(255,255,255,0.95)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(10,10,10,0.06)' : 'none',
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '18px',
            letterSpacing: '-0.02em',
            color: menuOpen ? '#0a0a0a' : '#0a0a0a',
            textDecoration: 'none',
            position: 'relative',
            zIndex: 1001,
          }}
        >
          InStories
        </Link>

        {/* Desktop links */}
        <div className="nav-desktop" style={{ gap: '40px', alignItems: 'center' }}>
          {[
            { label: 'Projets',  to: '/#projects' },
            { label: 'Services', to: '/#services' },
            { label: 'About',    to: '/about' },
            { label: 'Contact',  to: '/contact' },
          ].map(({ label, to }) => (
            <Magnet key={label} strength={0.3} radius={80}>
              <a href={to} className="nav-link">{label}</a>
            </Magnet>
          ))}
        </div>

        {/* Desktop availability */}
        <div className="nav-desktop" style={{ alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6,
            borderRadius: '50%',
            background: '#4ade80',
            boxShadow: '0 0 8px #4ade80',
          }} />
          <span style={{ fontSize: 11, letterSpacing: '0.1em', color: 'rgba(10,10,10,0.4)', textTransform: 'uppercase' }}>
            Disponible
          </span>
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-mobile-btn"
          onClick={() => setMenuOpen(o => !o)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            position: 'relative',
            zIndex: 1001,
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
          }}
          aria-label="Menu"
        >
          <span style={{
            display: 'block', width: '24px', height: '1px',
            background: '#0a0a0a',
            transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none',
            transition: 'transform 0.3s ease',
          }} />
          <span style={{
            display: 'block', width: '24px', height: '1px',
            background: '#0a0a0a',
            opacity: menuOpen ? 0 : 1,
            transition: 'opacity 0.2s ease',
          }} />
          <span style={{
            display: 'block', width: '24px', height: '1px',
            background: '#0a0a0a',
            transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
            transition: 'transform 0.3s ease',
          }} />
        </button>
      </nav>
    </>
  )
}
