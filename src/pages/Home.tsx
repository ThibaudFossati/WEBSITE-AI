import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ParticleCanvas from '../components/ParticleCanvas'
import DisplayText from '../components/DisplayText'
import TextReveal from '../components/TextReveal'
import Magnet from '../components/Magnet'
import { useSiteContent } from '../hooks/useSiteContent'
import { getDisplayFontFamily } from '../lib/typography'

export default function Home() {
  const heroRef = useRef<HTMLElement>(null)
  const heroTextRef = useRef<HTMLDivElement>(null)
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)
  const [reduceMotion, setReduceMotion] = useState(false)
  const content = useSiteContent()
  const { home, footer } = content
  const displayFont = getDisplayFontFamily(content.design.displayFont)
  const displayCase = content.design.displayCase
  const displayEmphasis = content.design.displayEmphasis
  const projects = content.projects
    .filter(project => project.status === 'published')
    .sort((a, b) => a.order - b.order)
  const ctaLines = home.contactCtaTitle.split('\n')

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  // ── Parallax hero — texte dérive à 0.38x du scroll ───────────────────────
  useEffect(() => {
    if (reduceMotion) return

    const onScroll = () => {
      if (!heroTextRef.current || !heroRef.current) return
      const heroH = heroRef.current.clientHeight
      const scrollY = window.scrollY
      if (scrollY > heroH) return
      heroTextRef.current.style.transform = `translateY(${scrollY * 0.38}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [reduceMotion])

  return (
    <main style={{ ['--display-font' as string]: displayFont }}>
      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="hero-velvet"
        style={{
          position: 'relative',
          height: '100svh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 48px 64px',
          overflow: 'hidden',
          background: '#040913',
        }}
      >
        {reduceMotion ? (
          <div
            className="hero-atmosphere reduced-motion"
            style={{ position: 'absolute', inset: 0, zIndex: 0 }}
          >
            <span className="velvet-base" />
            <span className="velvet-vignette" />
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <ParticleCanvas />
          </div>
        )}

        {/* Gradient bottom overlay — très léger sur fond clair */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          background: 'linear-gradient(to top, rgba(4,8,18,0.78) 0%, rgba(4,8,18,0.28) 44%, rgba(4,8,18,0.08) 68%, rgba(4,8,18,0.04) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Hero content */}
        <div ref={heroTextRef} style={{ position: 'relative', zIndex: 3 }}>
          {/* Big display title */}
          <div style={{ marginBottom: '32px' }}>
            <TextReveal delay={200} className="block" as="h1">
              <span
                style={{
                  fontFamily: 'var(--display-font)',
                  fontWeight: 300,
                  fontSize: 'clamp(72px, 10vw, 160px)',
                  lineHeight: 0.9,
                  letterSpacing: '-0.03em',
                  color: '#f0f4ff',  // Void Chrome: texte blanc
                  display: 'block',
                  textShadow: '0 2px 48px rgba(180,210,255,0.20)',
                }}
              >
                <DisplayText text={home.heroLine1} caseMode={displayCase} emphasisMode={displayEmphasis} />
              </span>
            </TextReveal>
            <TextReveal delay={350} className="block" as="span">
              <span
                style={{
                  fontFamily: 'var(--display-font)',
                  fontWeight: 300,
                  fontSize: 'clamp(72px, 10vw, 160px)',
                  lineHeight: 0.9,
                  letterSpacing: '-0.03em',
                  color: '#f0f4ff',
                  display: 'block',
                  textShadow: '0 2px 48px rgba(100,180,255,0.25)',
                }}
              >
                <DisplayText text={home.heroLine2} caseMode={displayCase} emphasisMode={displayEmphasis} />
              </span>
            </TextReveal>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '48px' }}>
            <TextReveal delay={550} as="p">
              <span style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(200,220,255,0.55)',
                fontWeight: 300,
                whiteSpace: 'nowrap',
              }}>
                {home.heroTagline}
              </span>
            </TextReveal>

            <TextReveal delay={700} as="p">
              <span style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(200,220,255,0.30)',
                fontWeight: 300,
                whiteSpace: 'nowrap',
              }}>
                {home.heroLocation}
              </span>
            </TextReveal>
          </div>
        </div>


        {/* Scroll indicator */}
        <div
          style={{
            position: 'absolute',
            bottom: '64px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            opacity: 0.3,
            animation: 'fadeInUp 1s 1.5s both',
          }}
        >
          <div
            style={{
              width: '1px',
              height: '48px',
              background: 'rgba(140,200,255,0.5)',
              animation: 'scrollLine 2s ease infinite',
            }}
          />
        </div>
      </section>

      {/* ── PROJECTS ── */}
      <section
        id="projects"
        style={{ padding: '120px 48px', background: '#ffffff' }}
      >
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '80px',
          }}
        >
          <TextReveal as="h2">
            <span
              style={{
                fontFamily: 'var(--display-font)',
                fontSize: 'clamp(36px, 5vw, 64px)',
                fontWeight: 300,
                letterSpacing: '-0.02em',
              }}
            >
              <DisplayText text={home.projectsTitle} caseMode={displayCase} emphasisMode={displayEmphasis} />
            </span>
          </TextReveal>
          <TextReveal as="span">
            <span
              style={{
                fontSize: '11px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'rgba(10,10,10,0.35)',
              }}
            >
              {projects.length} références
            </span>
          </TextReveal>
        </div>

        {/* Projects grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {projects.map((project, index) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              data-cursor="hover"
              style={{ textDecoration: 'none', color: 'inherit' }}
              onMouseEnter={() => setHoveredProject(project.id)}
              onMouseLeave={() => setHoveredProject(null)}
            >
              <div
                className="project-card project-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 1fr 1fr auto',
                  alignItems: 'center',
                  gap: '40px',
                  padding: '32px 0',
                  borderTop: '1px solid rgba(10,10,10,0.08)',
                  transition: 'background 0.3s ease',
                  background: hoveredProject === project.id ? '#f8f6f2' : 'transparent',
                  paddingLeft: hoveredProject === project.id ? '24px' : '0',
                }}
              >
                {/* Index */}
                <span
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.1em',
                    color: 'rgba(10,10,10,0.25)',
                    fontWeight: 300,
                  }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                {/* Client + title */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: 'rgba(10,10,10,0.4)',
                      marginBottom: '6px',
                    }}
                  >
                    {project.client}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--display-font)',
                      fontSize: 'clamp(22px, 3vw, 36px)',
                      fontWeight: 300,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.1,
                    }}
                  >
                    <DisplayText text={project.title} caseMode={displayCase} emphasisMode={displayEmphasis} />
                  </div>
                </div>

                {/* Categories */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {project.category.map(cat => (
                    <span
                      key={cat}
                      style={{
                        fontSize: '10px',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'rgba(10,10,10,0.35)',
                        padding: '4px 10px',
                        border: '1px solid rgba(10,10,10,0.12)',
                        borderRadius: '2px',
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Year + arrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingRight: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(10,10,10,0.3)', letterSpacing: '0.08em' }}>
                    {project.year}
                  </span>
                  <span
                    style={{
                      fontSize: '18px',
                      color: 'rgba(10,10,10,0.3)',
                      transform: hoveredProject === project.id ? 'translateX(6px)' : 'translateX(0)',
                      transition: 'transform 0.3s ease',
                    }}
                  >
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {/* Divider bottom */}
          <div style={{ borderTop: '1px solid rgba(10,10,10,0.08)', paddingTop: '0' }} />
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section
        id="services"
        style={{
          padding: '120px 48px',
          background: '#0a0a0a',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'start',
          }}
        >
          {/* Left */}
          <div>
            <TextReveal as="h2" delay={100}>
              <span
                style={{
                  fontFamily: 'var(--display-font)',
                  fontSize: 'clamp(40px, 5vw, 72px)',
                  fontWeight: 300,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.0,
                  color: '#ffffff',
                  display: 'block',
                }}
              >
                <DisplayText text={home.servicesTitle} caseMode={displayCase} emphasisMode={displayEmphasis} />
              </span>
            </TextReveal>
            <TextReveal as="p" delay={300}>
              <span
                data-cursor="quiet"
                style={{
                  fontSize: '14px',
                  lineHeight: 1.9,
                  color: 'rgba(255,255,255,0.45)',
                  display: 'block',
                  marginTop: '32px',
                  maxWidth: '360px',
                }}
              >
                {home.servicesIntro}
              </span>
            </TextReveal>
          </div>

          {/* Right — service list */}
          <div>
            {home.services.map((service, i) => (
              <div
                key={service.name}
                className="service-row"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '24px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  gap: '32px',
                }}
              >
                <div className="service-row-content">
                  <div className="service-row-title" style={{ fontWeight: 400, fontSize: '16px', color: '#fff', marginBottom: '4px' }}>
                    {service.name}
                  </div>
                  <div className="service-row-desc" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
                    {service.desc}
                  </div>
                </div>
                <span className="service-row-index" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT TEASER ── */}
      <section
        style={{
          padding: '160px 48px',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '40px',
        }}
      >
        <TextReveal as="p">
          <span
            data-cursor="quiet"
            style={{
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(10,10,10,0.35)',
            }}
          >
            {home.aboutEyebrow}
          </span>
        </TextReveal>

        <TextReveal delay={150} as="h2">
          <span
            data-cursor="quiet"
            style={{
              fontFamily: 'var(--display-font)',
              fontSize: 'clamp(32px, 5vw, 72px)',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              maxWidth: '800px',
              display: 'block',
            }}
          >
            <DisplayText text={home.aboutQuote} caseMode={displayCase} emphasisMode={displayEmphasis} />
          </span>
        </TextReveal>

        <TextReveal delay={300} as="div">
          <Link
            to="/about"
            data-cursor="hover"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '11px',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#0a0a0a',
              textDecoration: 'none',
              borderBottom: '1px solid rgba(10,10,10,0.25)',
              paddingBottom: '4px',
              marginTop: '16px',
            }}
          >
            {home.aboutCtaLabel} <span>→</span>
          </Link>
        </TextReveal>
      </section>

      {/* ── CTA CONTACT ── */}
      <section
        style={{
          padding: '120px 48px',
          background: '#f8f6f2',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <TextReveal as="h2">
          <span
            style={{
              fontFamily: 'var(--display-font)',
              fontSize: 'clamp(40px, 6vw, 96px)',
              fontWeight: 300,
              letterSpacing: '-0.03em',
              lineHeight: 0.95,
            }}
          >
            <DisplayText text={ctaLines.join('\n')} caseMode={displayCase} emphasisMode={displayEmphasis} />
          </span>
        </TextReveal>

        <TextReveal delay={200} as="div" className="reveal-overflow-visible">
          <Magnet strength={0.5} radius={160}>
            <Link
              to="/contact"
              data-cursor="hover"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                border: '1px solid rgba(10,10,10,0.2)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#0a0a0a',
                textDecoration: 'none',
                transition: 'background 0.4s ease, color 0.4s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.background = '#0a0a0a'
                ;(e.currentTarget as HTMLElement).style.color = '#fff'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                ;(e.currentTarget as HTMLElement).style.color = '#0a0a0a'
              }}
            >
              {home.contactCtaButton}
            </Link>
          </Magnet>
        </TextReveal>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          padding: '32px 48px',
          background: '#0a0a0a',
          color: 'rgba(255,255,255,0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '10px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        <span>{footer.copyright}</span>
        <span>{footer.registration}</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          {footer.socials.map(link => (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              {link.label}
            </a>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes scrollLine {
          0% { transform: scaleY(0); transform-origin: top; }
          50% { transform: scaleY(1); transform-origin: top; }
          51% { transform: scaleY(1); transform-origin: bottom; }
          100% { transform: scaleY(0); transform-origin: bottom; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 0.3; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </main>
  )
}
