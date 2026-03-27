import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSiteContent } from '../hooks/useSiteContent'

type Variant = 'A' | 'B' | 'C'

const BODONI = 'Bodoni Moda, Georgia, serif'
const INTER  = 'Inter, Helvetica Neue, sans-serif'

// ─── A — Monumental ──────────────────────────────────────────────────────────
function VariantA({
  name,
  roleLine,
  estLabel,
}: {
  name: string
  roleLine: string
  estLabel: string
}) {
  const nameLines = name.split('\n')
  return (
    <section style={{
      height: '100svh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <h1 style={{
        fontFamily: BODONI,
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: 'clamp(100px, 18vw, 280px)',
        lineHeight: 0.88,
        letterSpacing: '-0.04em',
        color: '#0a0a0a',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}>
        {nameLines.map((line, index) => (
          <span key={`${line}-${index}`}>
            {line}
            {index < nameLines.length - 1 ? <br /> : null}
          </span>
        ))}
      </h1>
      <p style={{
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
        bottom: '40px',
        right: '48px',
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
}: {
  name: string
  darkLabel: string
  intro: string
  skills: string[]
}) {
  const nameLines = name.split('\n')
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
        <p style={{
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
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(52px, 6.5vw, 108px)',
          lineHeight: 0.92,
          letterSpacing: '-0.03em',
          color: '#0a0a0a',
        }}>
          {nameLines.map((line, index) => (
            <span key={`${line}-${index}`}>
              {line}
              {index < nameLines.length - 1 ? <br /> : null}
            </span>
          ))}
        </h1>
        <div style={{ width: '40px', height: '1px', background: 'rgba(10,10,10,0.15)' }}/>
        <p style={{
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
}: {
  name: string
  quote: string
  stats: { value: string; label: string }[]
  agencies: string[]
}) {
  const nameLines = name.split('\n')
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
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: 'clamp(72px, 13vw, 200px)',
        lineHeight: 0.88,
        letterSpacing: '-0.04em',
        color: '#0a0a0a',
      }}>
        {nameLines.map((line, index) => (
          <span key={`${line}-${index}`}>
            {line}
            {index < nameLines.length - 1 ? <br /> : null}
          </span>
        ))}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'end' }}>
        <p style={{
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: '36px' }}>
            {stats.map(stat => (
              <div key={stat.label} style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: BODONI, fontStyle: 'italic',
                  fontSize: '34px', fontWeight: 400,
                  letterSpacing: '-0.03em', color: '#0a0a0a', lineHeight: 1,
                }}>{stat.value}</div>
                <div style={{
                  fontFamily: INTER, fontSize: '9px',
                  letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: 'rgba(10,10,10,0.3)', marginTop: '4px',
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {agencies.map(a => (
              <span key={a} style={{
                fontFamily: INTER, fontSize: '9px',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: 'rgba(10,10,10,0.28)',
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
  const [variant, setVariant] = useState<Variant>(content.about.defaultVariant)
  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => { setVariant(content.about.defaultVariant) }, [content.about.defaultVariant])

  return (
    <main style={{ paddingTop: '80px' }}>

      {/* Switcher */}
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

      {variant === 'A' && (
        <VariantA
          name={content.about.name}
          roleLine={content.about.roleLine}
          estLabel={content.about.estLabel}
        />
      )}
      {variant === 'B' && (
        <VariantB
          name={content.about.name}
          darkLabel={content.about.splitDarkLabel}
          intro={content.about.splitIntro}
          skills={content.about.skills}
        />
      )}
      {variant === 'C' && (
        <VariantC
          name={content.about.name}
          quote={content.about.manifestoQuote}
          stats={content.about.stats}
          agencies={content.about.agencies}
        />
      )}

      {/* CTA */}
      <section style={{
        padding: '80px 48px', background: '#f8f6f2',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <p style={{ fontFamily: BODONI, fontStyle: 'italic', fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 400, color: '#0a0a0a' }}>
          {content.about.ctaTitle}
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
