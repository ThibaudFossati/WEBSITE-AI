import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import Magnet from './Magnet'
import { useSiteContent } from '../hooks/useSiteContent'
import { autoTranslateText, type LanguageCode, getStoredLanguage, listenLanguageChange, setStoredLanguage, t } from '../lib/i18n'
import { getDisplayFontFamily, getDisplayFontWeight, getDisplayLetterSpacing, getDisplayLineHeight, getDisplaySizeScale } from '../lib/typography'
import { loadSiteContent, saveSiteContent } from '../lib/siteContent'
import { downloadPortfolioPdfLive } from '../lib/pdfDownload'
import { trackEvent } from '../lib/analytics'

export default function Nav() {
  const content = useSiteContent()
  const { contact, design, pdfReminder } = content
  const location = useLocation()
  const navigate = useNavigate()
  const [lang, setLang] = useState<LanguageCode>(() => getStoredLanguage())
  const [scrolled,  setScrolled]  = useState(false)
  const [pastHomeHero, setPastHomeHero] = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [showScrollHeader, setShowScrollHeader] = useState(true)
  const lastScrollYRef = useRef(0)
  const isHome = location.pathname === '/'
  const isProject = location.pathname.startsWith('/projects/')
  const isContentRoute = location.pathname.startsWith('/content')
  const isHomeHeroClear = isHome && !pastHomeHero && !menuOpen
  const onDarkHero = isHomeHeroClear
  const isNight = design.colorMode === 'night' && !isContentRoute
  const useDarkNavText = onDarkHero || isNight
  const [projectHeroBg, setProjectHeroBg] = useState<string | null>(null)

  useEffect(() => {
    if (!isProject) { setProjectHeroBg(null); return }
    const read = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--project-hero-bg').trim()
      setProjectHeroBg(v || null)
    }
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
    return () => observer.disconnect()
  }, [isProject, location.pathname])

  const navBackground = onDarkHero
    ? (menuOpen
      ? 'rgba(5, 12, 30, 0.76)'
      : 'rgba(5, 12, 30, 0.28)')
    : isNight
      ? (menuOpen
        ? 'rgba(8, 12, 18, 0.86)'
        : (scrolled ? 'rgba(8, 12, 18, 0.76)' : 'rgba(8, 12, 18, 0.64)'))
      : isProject && projectHeroBg && !scrolled && !menuOpen
        ? projectHeroBg
        : (isHome && pastHomeHero
          ? 'rgba(255, 255, 255, 0.60)'
          : (scrolled || menuOpen
            ? 'rgba(255, 255, 255, 0.70)'
            : 'rgba(255, 255, 255, 0.58)'))

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 60)

      const lastY = lastScrollYRef.current
      const delta = y - lastY
      const isScrollingUp = delta < -4
      const isScrollingDown = delta > 4

      if (y <= 12) {
        setShowScrollHeader(true)
      } else if (isScrollingUp) {
        setShowScrollHeader(true)
      } else if (isScrollingDown) {
        setShowScrollHeader(false)
      }
      lastScrollYRef.current = y

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

  useEffect(() => {
    if (menuOpen) setShowScrollHeader(true)
  }, [menuOpen])

  useEffect(() => listenLanguageChange(next => setLang(next)), [])
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

    const sectionTop = el.getBoundingClientRect().top + window.scrollY
    const targetY = Math.max(0, sectionTop + 1)
    window.scrollTo({ top: targetY, left: 0, behavior: 'smooth' })
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

  const navLinks = [
    { label: t(lang, 'nav.projects'), to: '/#projects' },
    { label: t(lang, 'nav.services'), to: '/#services' },
    { label: t(lang, 'nav.about'), to: '/about' },
    { label: t(lang, 'nav.contact'), to: '/contact' },
  ]
  const ui = (value: string) => autoTranslateText(value, lang)
  const navDisplayFont = getDisplayFontFamily(design.displayFont)
  const navDisplayWeight = getDisplayFontWeight(design.displayFont, design.displayWeight)
  const navDisplaySizeScale = getDisplaySizeScale(design.displaySize)
  const navDisplayLetterSpacing = `${getDisplayLetterSpacing(design.displayLetterSpacing)}em`
  const navDisplayLineHeight = getDisplayLineHeight(design.displayLineHeight)
  const nextLang: LanguageCode = lang === 'fr' ? 'en' : 'fr'
  const pdfDownloadUrl = pdfReminder.pdfUrl.trim()
  const pdfDownloadLabel = isPdfGenerating
    ? (lang === 'fr' ? 'Génération...' : 'Generating...')
    : (lang === 'fr' ? 'Télécharger le dossier PDF' : 'Download portfolio PDF')
  const nextMode: 'light' | 'night' = design.colorMode === 'night' ? 'light' : 'night'
  const currentModeIcon = design.colorMode === 'night' ? '☾' : '☀︎'
  const nextModeIcon = nextMode === 'night' ? '☾' : '☀︎'

  const setColorMode = (mode: 'light' | 'night') => {
    if (isContentRoute) return
    const raw = loadSiteContent()
    const currentPreference = raw.design?.colorModePreference ?? 'system'
    const nextPreference: 'system' | 'light' | 'night' = currentPreference === 'system' ? mode : 'system'
    saveSiteContent({
      ...raw,
      design: {
        ...raw.design,
        colorModePreference: nextPreference,
        colorMode: mode,
      },
    })
  }

  return (
    <>
      {/* ── Mobile menu overlay ── */}
      <div
        className={`nav-overlay${menuOpen ? ' open' : ''}`}
        style={{
          ['--nav-display-font' as string]: navDisplayFont,
          ['--nav-display-weight' as string]: navDisplayWeight,
          ['--nav-display-size-scale' as string]: navDisplaySizeScale,
          ['--nav-display-letter-spacing' as string]: navDisplayLetterSpacing,
          ['--nav-display-line-height' as string]: navDisplayLineHeight,
        }}
      >
        {navLinks.map(({ label, to }) => (
          <Link
            key={label}
            to={to}
            data-cursor="hover"
            onClick={e => handleMenuLinkClick(e, to)}
          >
            {label}
          </Link>
        ))}
        {pdfDownloadUrl && (
          <button
            type="button"
            className="nav-overlay-pdf-btn"
            data-cursor="hover"
            disabled={isPdfGenerating}
            onClick={async () => {
              if (isPdfGenerating) return
              setMenuOpen(false)
              setIsPdfGenerating(true)
              try {
                trackEvent('pdf_download_click', {
                  source: 'menu_overlay',
                  language: lang,
                })
                await downloadPortfolioPdfLive(content, lang, pdfDownloadUrl)
              } finally {
                setIsPdfGenerating(false)
              }
            }}
          >
            {pdfDownloadLabel}
          </button>
        )}
        <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginTop: '40px' }}>
          Thibaud Fossati · Paris
        </span>
        <div style={{ marginTop: '16px', display: 'inline-flex', gap: '6px' }}>
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              setStoredLanguage(nextLang)
            }}
            className="nav-toggle-btn"
            style={{
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.9)',
              borderRadius: '999px',
              width: '46px',
              height: '26px',
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            <span className="nav-toggle-track" style={{ minWidth: '2ch' }}>
              <span className="nav-toggle-current">{lang.toUpperCase()}</span>
              <span className="nav-toggle-next">{nextLang.toUpperCase()}</span>
            </span>
          </button>
          {!isContentRoute && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setColorMode(nextMode)
              }}
              className="nav-toggle-btn"
              aria-label={nextMode === 'night' ? ui('Nuit') : ui('Jour')}
              style={{
                border: '1px solid rgba(255,255,255,0.18)',
                background: 'rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.9)',
                borderRadius: '999px',
                width: '46px',
                height: '26px',
                fontSize: '12px',
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              <span className="nav-toggle-track" style={{ minWidth: '1.2em' }}>
                <span className="nav-toggle-current">{currentModeIcon}</span>
                <span className="nav-toggle-next">{nextModeIcon}</span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── Nav bar ── */}
      <nav
        className="nav-inner"
        data-cursor-tone={isHomeHeroClear ? 'light' : undefined}
        style={{
          ['--nav-display-font' as string]: navDisplayFont,
          ['--nav-display-weight' as string]: navDisplayWeight,
          ['--nav-display-size-scale' as string]: navDisplaySizeScale,
          ['--nav-display-letter-spacing' as string]: navDisplayLetterSpacing,
          ['--nav-display-line-height' as string]: navDisplayLineHeight,
          ['--nav-link-color' as string]: useDarkNavText ? 'rgba(225,235,255,0.92)' : 'rgba(10,10,10,0.55)',
          ['--nav-link-hover' as string]: useDarkNavText ? '#ffffff' : '#0a0a0a',
          ['--nav-link-underline' as string]: useDarkNavText ? 'rgba(240,244,255,1.0)' : '#0a0a0a',
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 1000,
          padding: '28px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'background 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease',
          background: isHomeHeroClear ? 'linear-gradient(to bottom, rgba(2,5,18,0.55) 0%, transparent 100%)' : navBackground,
          backdropFilter: isHomeHeroClear ? 'none' : 'blur(18px) saturate(135%)',
          WebkitBackdropFilter: isHomeHeroClear ? 'none' : 'blur(18px) saturate(135%)',
          borderBottom: isHomeHeroClear ? 'none' : `1px solid ${useDarkNavText ? 'rgba(194, 220, 255, 0.12)' : 'rgba(10, 10, 10, 0.07)'}`,
          transform: isHomeHeroClear || showScrollHeader || menuOpen ? 'translateY(0)' : 'translateY(-120%)',
          opacity: isHomeHeroClear || showScrollHeader || menuOpen ? 1 : 0,
          pointerEvents: isHomeHeroClear || showScrollHeader || menuOpen ? 'auto' : 'none',
          transitionProperty: 'background, backdrop-filter, border-color, transform, opacity',
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
            color: useDarkNavText ? '#f0f4ff' : '#0a0a0a',
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
          {navLinks.map(({ label, to }) => (
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
        <div className="nav-desktop" style={{ alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 8px #4ade80',
            }} />
            <span style={{ fontSize: 11, letterSpacing: '0.1em', color: useDarkNavText ? 'rgba(225,235,255,0.82)' : 'rgba(10,10,10,0.5)', textTransform: 'uppercase' }}>
              {contact.availabilityLabel}
            </span>
          </div>
        </div>

        {/* Desktop toggles (pushed to the right, near menu icon) */}
        <div
          className="nav-desktop"
          style={{
            position: 'absolute',
            right: '104px',
            top: '50%',
            transform: 'translateY(-50%)',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              setStoredLanguage(nextLang)
            }}
            className="nav-toggle-btn"
            aria-label={lang === 'fr' ? 'Passer en anglais' : 'Switch to French'}
            title={lang === 'fr' ? 'Passer en anglais' : 'Switch to French'}
            style={{
              border: `1px solid ${useDarkNavText ? 'rgba(225,235,255,0.22)' : 'rgba(10,10,10,0.1)'}`,
              background: useDarkNavText ? 'rgba(225,235,255,0.14)' : 'rgba(10,10,10,0.03)',
              color: useDarkNavText ? '#f0f4ff' : 'rgba(10,10,10,0.62)',
              borderRadius: '999px',
              width: '46px',
              height: '26px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'background 0.25s ease, border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
            }}
          >
            <span className="nav-toggle-track" style={{ minWidth: '2ch' }}>
              <span className="nav-toggle-current">{lang.toUpperCase()}</span>
              <span className="nav-toggle-next">{nextLang.toUpperCase()}</span>
            </span>
          </button>
          {!isContentRoute && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setColorMode(nextMode)
              }}
              className="nav-toggle-btn"
              aria-label={nextMode === 'night' ? ui('Nuit') : ui('Jour')}
              title={nextMode === 'night' ? ui('Nuit') : ui('Jour')}
              style={{
                border: `1px solid ${useDarkNavText ? 'rgba(225,235,255,0.22)' : 'rgba(10,10,10,0.1)'}`,
                background: useDarkNavText ? 'rgba(225,235,255,0.14)' : 'rgba(10,10,10,0.03)',
                color: useDarkNavText ? 'rgba(240,244,255,0.9)' : 'rgba(10,10,10,0.58)',
                borderRadius: '999px',
                width: '46px',
                height: '26px',
                fontSize: '12px',
                lineHeight: 1,
                cursor: 'pointer',
                transition: 'background 0.25s ease, border-color 0.25s ease, color 0.25s ease',
              }}
            >
              <span className="nav-toggle-track" style={{ minWidth: '1.2em' }}>
                <span className="nav-toggle-current">{currentModeIcon}</span>
                <span className="nav-toggle-next">{nextModeIcon}</span>
              </span>
            </button>
          )}
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
            flexDirection: 'column',
            gap: '5px',
          }}
          aria-label={autoTranslateText('Menu', lang)}
        >
          <span style={{
            display: 'block', width: '24px', height: '1px',
            background: useDarkNavText ? 'rgba(240,244,255,0.9)' : '#0a0a0a',
            transform: menuOpen ? 'translateY(6px) rotate(45deg)' : 'none',
            transition: 'transform 0.3s ease',
          }} />
          <span style={{
            display: 'block', width: '24px', height: '1px',
            background: useDarkNavText ? 'rgba(240,244,255,0.9)' : '#0a0a0a',
            opacity: menuOpen ? 0 : 1,
            transition: 'opacity 0.2s ease',
          }} />
          <span style={{
            display: 'block', width: '24px', height: '1px',
            background: useDarkNavText ? 'rgba(240,244,255,0.9)' : '#0a0a0a',
            transform: menuOpen ? 'translateY(-6px) rotate(-45deg)' : 'none',
            transition: 'transform 0.3s ease',
          }} />
        </button>
      </nav>
    </>
  )
}
