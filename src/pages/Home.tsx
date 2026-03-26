import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ParticleCanvas from '../components/ParticleCanvas'
import MicroDetails from '../components/MicroDetails'
import TextReveal from '../components/TextReveal'
import Magnet from '../components/Magnet'
import { projects } from '../data/projects'

export default function Home() {
  const heroRef = useRef<HTMLElement>(null)
  const heroTextRef = useRef<HTMLDivElement>(null)
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // ── Parallax hero — texte dérive à 0.38x du scroll ───────────────────────
  useEffect(() => {
    const onScroll = () => {
      if (!heroTextRef.current || !heroRef.current) return
      const heroH = heroRef.current.clientHeight
      const scrollY = window.scrollY
      if (scrollY > heroH) return
      heroTextRef.current.style.transform = `translateY(${scrollY * 0.38}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <main>
      {/* ── HERO ── */}
      <section
        ref={heroRef}
        style={{
          position: 'relative',
          height: '100svh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 48px 64px',
          overflow: 'hidden',
          background: '#01050f',
        }}
      >
        {/* WebGL Refik Anadol particles */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <ParticleCanvas />
        </div>

        {/* Micro-détails Canvas 2D overlay */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
          <MicroDetails />
        </div>

        {/* Gradient bottom overlay — très léger sur fond clair */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          background: 'linear-gradient(to top, rgba(1,5,15,0.90) 0%, rgba(1,5,15,0.3) 45%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Hero content */}
        <div ref={heroTextRef} style={{ position: 'relative', zIndex: 3 }}>
          {/* Big display title */}
          <div style={{ marginBottom: '32px' }}>
            <TextReveal delay={200} className="block" as="h1">
              <span
                style={{
                  fontFamily: 'Bodoni Moda, Georgia, serif',
                  fontWeight: 300,
                  fontSize: 'clamp(72px, 10vw, 160px)',
                  lineHeight: 0.9,
                  letterSpacing: '-0.03em',
                  color: '#f0f4ff',
                  display: 'block',
                  fontStyle: 'italic',
                  textShadow: '0 2px 48px rgba(100,180,255,0.25)',
                }}
              >
                Art
              </span>
            </TextReveal>
            <TextReveal delay={350} className="block" as="span">
              <span
                style={{
                  fontFamily: 'Bodoni Moda, Georgia, serif',
                  fontWeight: 300,
                  fontSize: 'clamp(72px, 10vw, 160px)',
                  lineHeight: 0.9,
                  letterSpacing: '-0.03em',
                  color: '#f0f4ff',
                  display: 'block',
                  textShadow: '0 2px 48px rgba(100,180,255,0.25)',
                }}
              >
                Direction
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
                Art direction & AI crafted for premium brands
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
                Thibaud Fossati — Paris
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
                fontFamily: 'Bodoni Moda, serif',
                fontSize: 'clamp(36px, 5vw, 64px)',
                fontWeight: 300,
                letterSpacing: '-0.02em',
                fontStyle: 'italic',
              }}
            >
              Projets
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
              style={{ textDecoration: 'none', color: 'inherit' }}
              onMouseEnter={() => setHoveredProject(project.id)}
              onMouseLeave={() => setHoveredProject(null)}
            >
              <div
                className="project-card"
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
                      fontFamily: 'Bodoni Moda, serif',
                      fontSize: 'clamp(22px, 3vw, 36px)',
                      fontWeight: 300,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.1,
                    }}
                  >
                    {project.title}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
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
                  fontFamily: 'Bodoni Moda, serif',
                  fontSize: 'clamp(40px, 5vw, 72px)',
                  fontWeight: 300,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.0,
                  fontStyle: 'italic',
                  color: '#ffffff',
                  display: 'block',
                }}
              >
                Services
              </span>
            </TextReveal>
            <TextReveal as="p" delay={300}>
              <span
                style={{
                  fontSize: '14px',
                  lineHeight: 1.9,
                  color: 'rgba(255,255,255,0.45)',
                  display: 'block',
                  marginTop: '32px',
                  maxWidth: '360px',
                }}
              >
                Pour les marques premium qui veulent une direction artistique
                singulière, nourrie par 15 ans d'expérience et l'IA comme outil créatif.
              </span>
            </TextReveal>
          </div>

          {/* Right — service list */}
          <div>
            {[
              { name: 'Art direction', desc: 'Identité visuelle, campagnes, key visuals' },
              { name: 'AI Creativity', desc: 'Images et contenus générés par IA' },
              { name: 'Social media', desc: 'Stratégie et production de contenus' },
              { name: 'Web design', desc: 'Interfaces, UX, digital experiences' },
              { name: 'Motion design', desc: 'Animation, vidéo, reels' },
              { name: 'Editing', desc: 'Post-production, retouche, étalonnage' },
            ].map((service, i) => (
              <div
                key={service.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '24px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  gap: '32px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 400, fontSize: '16px', color: '#fff', marginBottom: '4px' }}>
                    {service.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.06em' }}>
                    {service.desc}
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
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
            style={{
              fontSize: '11px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(10,10,10,0.35)',
            }}
          >
            Thibaud Fossati · Paris
          </span>
        </TextReveal>

        <TextReveal delay={150} as="h2">
          <span
            style={{
              fontFamily: 'Bodoni Moda, serif',
              fontSize: 'clamp(32px, 5vw, 72px)',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              fontStyle: 'italic',
              maxWidth: '800px',
              display: 'block',
            }}
          >
            "15 ans à collaborer avec Publicis, TBWA, BBDO, Ogilvy — et l'IA comme nouveau médium."
          </span>
        </TextReveal>

        <TextReveal delay={300} as="div">
          <Link
            to="/about"
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
            À propos <span>→</span>
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
              fontFamily: 'Bodoni Moda, serif',
              fontSize: 'clamp(40px, 6vw, 96px)',
              fontWeight: 300,
              letterSpacing: '-0.03em',
              lineHeight: 0.95,
              fontStyle: 'italic',
            }}
          >
            Let's create<br />something<br />remarkable.
          </span>
        </TextReveal>

        <TextReveal delay={200} as="div">
          <Magnet strength={0.5} radius={160}>
            <Link
              to="/contact"
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
              Contact
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
        <span>© InStories 2026</span>
        <span>RCS 850 498 635 R.C.S. Paris</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          <a href="https://instagram.com/instories_ai" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Instagram</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Behance</a>
          <a href="https://tiktok.com/@ghost.in.gloss" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>TikTok</a>
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>LinkedIn</a>
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
