import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Magnet from './Magnet'
import { useSiteContent } from '../hooks/useSiteContent'

export default function Nav() {
  const { contact } = useSiteContent()
  const location = useLocation()
  const navigate = useNavigate()
  const [scrolled,  setScrolled]  = useState(false)
  const [pastHomeHero, setPastHomeHero] = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const isHome = location.pathname === '/'
  const isHomeHeroClear = isHome && !pastHomeHero && !menuOpen
  const onDarkHero = isHomeHeroClear
  const navBackground = onDarkHero
    ? (menuOpen
      ? 'rgba(5, 12, 30, 0.76)'
      : 'rgba(5, 12, 30, 0.28)')
    : (isHome && pastHomeHero
      ? 'rgba(255, 255, 255, 0.60)'
      : (scrolled || menuOpen
        ? 'rgba(255, 255, 255, 0.70)'
        : 'rgba(255, 255, 255, 0.58)'))

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 60)
      if (location.pathname === '/') {
        const heroHeight = window.innerHeight
        setPastHomeHero(y >= Math.max(0, heroHeight - 8))
      } else {
        setPastHomeHero(false)
      }
    }
    window.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onScroll)
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [location.pathname])

  // Close on route change
  useEffect(() => { setMenuOpen(false) }, [location])

  // Lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return false

    const targetY = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: Math.max(0, targetY), left: 0, behavior: 'smooth' })
    return true
  }

  const handleMenuLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, to: string) => {
    setMenuOpen(false)
    if (!to.startsWith('/#')) return

    e.preventDefault()
    const hash = to.slice(2)

    if (location.pathname !== '/') {
      navigate(to)
      return
    }

    const didScroll = scrollToSection(hash)
    if (!didScroll) {
      navigate(to)
      return
    }

    const nextHash = `#${hash}`
    if (location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash)
    }
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setMenuOpen(false)

    if (location.pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
      if (location.hash) {
        window.history.replaceState(null, '', '/')
      }
      return
    }

    e.preventDefault()
    navigate('/')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    })
  }

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
          <Link
            key={label}
            to={to}
            data-cursor="hover"
            onClick={e => handleMenuLinkClick(e, to)}
          >
            {label}
          </Link>
        ))}
        <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginTop: '40px' }}>
          Thibaud Fossati · Paris
        </span>
      </div>

      {/* ── Nav bar ── */}
      <nav
        className="nav-inner"
        data-cursor-tone={isHomeHeroClear ? 'light' : undefined}
        style={{
          ['--nav-link-color' as string]: onDarkHero ? 'rgba(225,235,255,0.72)' : 'rgba(10,10,10,0.45)',
          ['--nav-link-hover' as string]: onDarkHero ? '#f0f4ff' : '#0a0a0a',
          ['--nav-link-underline' as string]: onDarkHero ? 'rgba(240,244,255,0.9)' : '#0a0a0a',
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 1000,
          padding: '28px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease',
          background: isHomeHeroClear ? 'transparent' : navBackground,
          backdropFilter: isHomeHeroClear ? 'none' : 'blur(18px) saturate(135%)',
          WebkitBackdropFilter: isHomeHeroClear ? 'none' : 'blur(18px) saturate(135%)',
          borderBottom: isHomeHeroClear ? 'none' : `1px solid ${onDarkHero ? 'rgba(194, 220, 255, 0.12)' : 'rgba(10, 10, 10, 0.07)'}`,
        }}
      >
        {/* Logo */}
        <Link
          to="/"
          onClick={handleLogoClick}
          data-cursor="hover"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '18px',
            letterSpacing: '-0.02em',
            color: onDarkHero ? '#f0f4ff' : '#0a0a0a',
            textDecoration: 'none',
            position: 'relative',
            zIndex: 1001,
            transition: 'color 0.3s ease',
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
              <Link
                to={to}
                className="nav-link"
                data-cursor="hover"
                onClick={e => handleMenuLinkClick(e, to)}
              >
                {label}
              </Link>
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
          <span style={{ fontSize: 11, letterSpacing: '0.1em', color: onDarkHero ? 'rgba(225,235,255,0.58)' : 'rgba(10,10,10,0.4)', textTransform: 'uppercase' }}>
            {contact.availabilityLabel}
          </span>
        </div>

        {/* Mobile hamburger */}
        <button
          className="nav-mobile-btn"
          data-cursor="hover"
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
            background: onDarkHero ? 'rgba(240,244,255,0.9)' : '#0a0a0a',
            transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none',
            transition: 'transform 0.3s ease',
          }} />
          <span style={{
            display: 'block', width: '24px', height: '1px',
            background: onDarkHero ? 'rgba(240,244,255,0.9)' : '#0a0a0a',
            opacity: menuOpen ? 0 : 1,
            transition: 'opacity 0.2s ease',
          }} />
          <span style={{
            display: 'block', width: '24px', height: '1px',
            background: onDarkHero ? 'rgba(240,244,255,0.9)' : '#0a0a0a',
            transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
            transition: 'transform 0.3s ease',
          }} />
        </button>
      </nav>
    </>
  )
}
