import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import DisplayText from '../components/DisplayText'
import { useSiteContent } from '../hooks/useSiteContent'
import { useIsMobile } from '../hooks/useIsMobile'
import { getDisplayFontFamily, type DisplayCaseMode, type DisplayEmphasisMode } from '../lib/typography'

type Variant = 'A' | 'B' | 'C'

const BODONI = 'var(--display-font)'
const INTER  = 'Inter, Helvetica Neue, sans-serif'

function splitStatValue(value: string): { numeric: number | null; suffix: string } {
  const match = value.trim().match(/^(\d+)(.*)$/)
  if (!match) return { numeric: null, suffix: '' }
  return { numeric: parseInt(match[1], 10), suffix: match[2] ?? '' }
}

function HoverStat({ value, label }: { value: string; label: string }) {
  const [displayValue, setDisplayValue] = useState(value)
  const [hovered, setHovered] = useState(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    setDisplayValue(value)
  }, [value])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const animateValue = () => {
    const { numeric, suffix } = splitStatValue(value)
    if (numeric === null) return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const duration = 680
    const start = performance.now()

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.max(0, Math.round(numeric * eased))
      setDisplayValue(`${current}${suffix}`)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        setDisplayValue(value)
      }
    }

    setDisplayValue(`0${suffix}`)
    rafRef.current = requestAnimationFrame(step)
  }

  return (
    <div
      onMouseEnter={() => {
        setHovered(true)
        animateValue()
      }}
      onMouseLeave={() => {
        setHovered(false)
        setDisplayValue(value)
      }}
      style={{
        textAlign: 'right',
        padding: '14px 18px',
        borderRadius: '14px',
        border: '1px solid rgba(10,10,10,0.10)',
        background: hovered ? 'rgba(10,10,10,0.03)' : 'transparent',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform 0.25s ease, background 0.25s ease, border-color 0.25s ease',
      }}
    >
      <div style={{
        fontFamily: BODONI,
        fontStyle: 'italic',
        fontSize: 'clamp(52px, 6vw, 90px)',
        fontWeight: 400,
        letterSpacing: '-0.04em',
        color: '#0a0a0a',
        lineHeight: 0.9,
      }}>
        {displayValue}
      </div>
      <div style={{
        fontFamily: INTER,
        fontSize: '11px',
        letterSpacing: '0.20em',
        textTransform: 'uppercase',
        color: 'rgba(10,10,10,0.38)',
        marginTop: '10px',
      }}>
        {label}
      </div>
    </div>
  )
}

// ─── A — Monumental ──────────────────────────────────────────────────────────
function VariantA({
  name,
  roleLine,
  estLabel,
  caseMode,
  emphasisMode,
  isMobile,
}: {
  name: string
  roleLine: string
  estLabel: string
  caseMode: DisplayCaseMode
  emphasisMode: DisplayEmphasisMode
  isMobile: boolean
}) {
  return (
    <section style={{
      minHeight: '100svh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      padding: isMobile ? '110px 20px 76px' : '0 48px',
    }}>
      <h1 style={{
        fontFamily: BODONI,
        fontWeight: 400,
        fontSize: isMobile ? 'clamp(58px, 20vw, 120px)' : 'clamp(100px, 18vw, 280px)',
        lineHeight: 0.88,
        letterSpacing: '-0.04em',
        color: '#0a0a0a',
        textAlign: 'center',
        whiteSpace: isMobile ? 'normal' : 'nowrap',
        userSelect: 'none',
      }}>
        <DisplayText text={name} caseMode={caseMode} emphasisMode={emphasisMode} />
      </h1>
      <p data-cursor="quiet" style={{
        fontFamily: INTER,
        fontWeight: 300,
        fontSize: '11px',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'rgba(10,10,10,0.28)',
        marginTop: '52px',
        textAlign: 'center',
      }}>
        {roleLine}
      </p>
      <span style={{
        position: 'absolute',
        bottom: isMobile ? '24px' : '40px',
        right: isMobile ? '20px' : '48px',
        fontFamily: INTER,
        fontSize: '10px',
        letterSpacing: '0.18em',
        color: 'rgba(10,10,10,0.18)',
        textTransform: 'uppercase',
      }}>
        {estLabel}
      </span>
    </section>
  )
}

// ─── B — Split Screen ─────────────────────────────────────────────────────────
function VariantB({
  name,
  darkLabel,
  intro,
  skills,
  caseMode,
  emphasisMode,
}: {
  name: string
  darkLabel: string
  intro: string
  skills: string[]
  caseMode: DisplayCaseMode
  emphasisMode: DisplayEmphasisMode
}) {
  return (
    <section style={{
      height: '100svh',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      overflow: 'hidden',
    }}>
      {/* Left — dark texture */}
      <div style={{
        background: 'linear-gradient(145deg, #0a0a14 0%, #1a1520 40%, #0d1a1a 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        padding: '48px',
      }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06 }}>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
            <feColorMatrix type="saturate" values="0"/>
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)"/>
        </svg>
        <div style={{
          position: 'absolute',
          top: '20%', left: '25%',
          width: '60%', height: '55%',
          background: 'radial-gradient(ellipse, rgba(0,160,180,0.20) 0%, transparent 70%)',
          filter: 'blur(48px)',
        }}/>
        <p data-cursor="quiet" style={{
          fontFamily: INTER, fontSize: '10px',
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.22)', position: 'relative', zIndex: 1,
        }}>
          {darkLabel}
        </p>
      </div>

      {/* Right — white */}
      <div style={{
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '64px 56px',
        gap: '28px',
      }}>
        <h1 style={{
          fontFamily: BODONI,
          fontWeight: 400,
          fontSize: 'clamp(52px, 6.5vw, 108px)',
          lineHeight: 0.92,
          letterSpacing: '-0.03em',
          color: '#0a0a0a',
        }}>
          <DisplayText text={name} caseMode={caseMode} emphasisMode={emphasisMode} />
        </h1>
        <div style={{ width: '40px', height: '1px', background: 'rgba(10,10,10,0.15)' }}/>
        <p data-cursor="quiet" style={{
          fontFamily: INTER, fontWeight: 300,
          fontSize: '15px', lineHeight: 1.85,
          color: 'rgba(10,10,10,0.55)', maxWidth: '340px',
        }}>
          {intro}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {skills.map(s => (
            <span key={s} style={{
              fontFamily: INTER, fontSize: '10px',
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: 'rgba(10,10,10,0.4)',
              padding: '5px 12px',
              border: '1px solid rgba(10,10,10,0.1)',
              borderRadius: '2px',
            }}>{s}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── C — Manifeste ────────────────────────────────────────────────────────────
function VariantC({
  name,
  quote,
  stats,
  agencies,
  caseMode,
  emphasisMode,
}: {
  name: string
  quote: string
  stats: { value: string; label: string }[]
  agencies: string[]
  caseMode: DisplayCaseMode
  emphasisMode: DisplayEmphasisMode
}) {
  const quoteLines = quote.split('\n')
  return (
    <section style={{
      height: '100svh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '40px 48px 64px',
      overflow: 'hidden',
    }}>
      <h1 style={{
        fontFamily: BODONI,
        fontWeight: 400,
        fontSize: 'clamp(72px, 13vw, 200px)',
        lineHeight: 0.88,
        letterSpacing: '-0.04em',
        color: '#0a0a0a',
      }}>
        <DisplayText text={name} caseMode={caseMode} emphasisMode={emphasisMode} />
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'end' }}>
        <p data-cursor="quiet" style={{
          fontFamily: INTER,
          fontWeight: 300,
          fontSize: 'clamp(17px, 2vw, 26px)',
          lineHeight: 1.55,
          color: 'rgba(10,10,10,0.72)',
          letterSpacing: '-0.01em',
        }}>
          {quoteLines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < quoteLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {stats.map(stat => (
              <HoverStat key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '560px' }}>
            {agencies.map(a => (
              <span key={a} style={{
                fontFamily: INTER,
                fontSize: '10px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(10,10,10,0.34)',
                padding: '4px 8px',
              }}>{a}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function About() {
  const content = useSiteContent()
  const isMobile = useIsMobile()
  const displayFont = getDisplayFontFamily(content.design.displayFont)
  const displayCase = content.design.displayCase
  const displayEmphasis = content.design.displayEmphasis
  const [variant, setVariant] = useState<Variant>(content.about.defaultVariant)
  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => { setVariant(content.about.defaultVariant) }, [content.about.defaultVariant])

  const activeVariant: Variant = isMobile ? 'A' : variant

  return (
    <main style={{ paddingTop: '80px', ['--display-font' as string]: displayFont }}>

      {/* Switcher */}
      {!isMobile && (
        <div style={{
          position: 'fixed', top: '82px', right: '48px', zIndex: 500,
          display: 'flex', gap: '3px',
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(10,10,10,0.08)',
          borderRadius: '4px', padding: '3px',
        }}>
          {(['A', 'B', 'C'] as Variant[]).map(v => (
            <button key={v} onClick={() => setVariant(v)} style={{
              width: '30px', height: '26px',
              border: 'none', borderRadius: '2px',
              background: variant === v ? '#0a0a0a' : 'transparent',
              color: variant === v ? '#fff' : 'rgba(10,10,10,0.35)',
              fontFamily: INTER, fontSize: '11px',
              letterSpacing: '0.08em',
              fontWeight: variant === v ? 500 : 300,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}>{v}</button>
          ))}
        </div>
      )}

      {activeVariant === 'A' && (
        <VariantA
          name={content.about.name}
          roleLine={content.about.roleLine}
          estLabel={content.about.estLabel}
          caseMode={displayCase}
          emphasisMode={displayEmphasis}
          isMobile={isMobile}
        />
      )}
      {activeVariant === 'B' && (
        <VariantB
          name={content.about.name}
          darkLabel={content.about.splitDarkLabel}
          intro={content.about.splitIntro}
          skills={content.about.skills}
          caseMode={displayCase}
          emphasisMode={displayEmphasis}
        />
      )}
      {activeVariant === 'C' && (
        <VariantC
          name={content.about.name}
          quote={content.about.manifestoQuote}
          stats={content.about.stats}
          agencies={content.about.agencies}
          caseMode={displayCase}
          emphasisMode={displayEmphasis}
        />
      )}

      {/* CTA */}
      <section style={{
        padding: isMobile ? '56px 20px' : '80px 48px', background: '#f8f6f2',
        display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '18px' : '0',
      }}>
        <p style={{ fontFamily: BODONI, fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 400, color: '#0a0a0a' }}>
          <DisplayText text={content.about.ctaTitle} caseMode={displayCase} emphasisMode={displayEmphasis} />
        </p>
        <Link to="/contact" style={{
          fontFamily: INTER, fontSize: '11px', letterSpacing: '0.15em',
          textTransform: 'uppercase', color: '#0a0a0a', textDecoration: 'none',
          borderBottom: '1px solid rgba(10,10,10,0.25)', paddingBottom: '4px',
        }}>
          {content.about.ctaLabel} →
        </Link>
      </section>
    </main>
  )
}
