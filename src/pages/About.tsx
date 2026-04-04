import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DisplayText from '../components/DisplayText'
import ArrowIcon from '../components/ArrowIcon'
import Seo from '../components/Seo'
import { useSiteContent } from '../hooks/useSiteContent'
import { useIsMobile } from '../hooks/useIsMobile'
import { getStoredLanguage } from '../lib/i18n'
import { getDisplayFontFamily, getDisplayFontWeight, getDisplayLetterSpacing, getDisplayLineHeight, getDisplaySizeScale, getDisplayWordSpacing } from '../lib/typography'
import { isLocalImageToken, resolveLocalImageToObjectUrl } from '../lib/localImageStore'

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

  useEffect(() => { setDisplayValue(value) }, [value])

  const animateValue = () => {
    const { numeric, suffix } = splitStatValue(value)
    if (numeric === null) return
    const duration = 680
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(`${Math.max(0, Math.round(numeric * eased))}${suffix}`)
      if (progress < 1) requestAnimationFrame(step)
      else setDisplayValue(value)
    }
    setDisplayValue(`0${suffix}`)
    requestAnimationFrame(step)
  }

  return (
    <div
      onMouseEnter={() => { setHovered(true); animateValue() }}
      onMouseLeave={() => { setHovered(false); setDisplayValue(value) }}
      style={{
        padding: '18px 20px',
        borderRadius: '16px',
        border: hovered ? '1px solid var(--border-mid)' : '1px solid var(--border-ui)',
        background: hovered ? 'var(--surface-input)' : 'var(--surface-soft)',
        boxShadow: hovered ? '0 10px 32px rgba(10,10,10,0.07)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: '110px',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'all 0.22s ease',
      }}
    >
      <div style={{
        fontFamily: BODONI,
        fontStyle: 'italic',
        fontSize: 'calc(clamp(48px, 5vw, 80px) * var(--display-size-scale))',
        fontWeight: 'var(--display-weight)',
        letterSpacing: 'var(--display-letter-spacing)',
        color: '#0a0a0a',
        lineHeight: 1,
      }}>
        {displayValue}
      </div>
      <div style={{
        fontFamily: INTER,
        fontSize: '10px',
        letterSpacing: '0.20em',
        textTransform: 'uppercase',
        color: 'rgba(10,10,10,0.35)',
        marginTop: '10px',
      }}>
        {label}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function About() {
  const content = useSiteContent()
  const lang = getStoredLanguage()
  const isMobile = useIsMobile()
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === 'undefined' ? 1440 : window.innerWidth
  )
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const displayFont = getDisplayFontFamily(content.design.displayFont)
  const displayCase = content.design.displayCase
  const displayEmphasis = content.design.displayEmphasis
  const displayWeight = getDisplayFontWeight(content.design.displayFont, content.design.displayWeight)
  const displaySizeScale = getDisplaySizeScale(content.design.displaySize)
  const displayLetterSpacing = `${getDisplayLetterSpacing(content.design.displayLetterSpacing)}em`
  const displayWordSpacing = `${getDisplayWordSpacing(content.design.displayWordSpacing)}em`
  const displayLineHeight = getDisplayLineHeight(content.design.displayLineHeight)

  const isTablet = !isMobile && viewportWidth < 1100

  useEffect(() => { window.scrollTo(0, 0) }, [])
  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const photo = content.about.photo
    if (!photo) { setPhotoUrl(null); return }
    if (isLocalImageToken(photo)) {
      resolveLocalImageToObjectUrl(photo).then(url => setPhotoUrl(url ?? photo))
    } else {
      setPhotoUrl(photo)
    }
  }, [content.about.photo])

  const bioLines = content.about.splitIntro.split('\n').filter(Boolean)

  return (
    <main
      className="site-themed"
      style={{
        ['--display-font' as string]: displayFont,
        ['--display-weight' as string]: displayWeight,
        ['--display-size-scale' as string]: displaySizeScale,
        ['--display-letter-spacing' as string]: displayLetterSpacing,
        ['--display-word-spacing' as string]: displayWordSpacing,
        ['--display-line-height' as string]: displayLineHeight,
      }}
    >
      <Seo
        title={lang === 'en' ? 'About — Thibaud Fossati | InStories' : 'À propos — Thibaud Fossati | InStories'}
        description={content.about.splitIntro}
        path="/about"
        type="profile"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: 'Thibaud Fossati',
          jobTitle: lang === 'en' ? 'Art Director' : 'Directeur artistique',
          address: { '@type': 'PostalAddress', addressLocality: 'Paris', addressCountry: 'FR' },
          worksFor: { '@type': 'Organization', name: 'InStories', url: 'https://instories.fr/' },
          knowsAbout: content.about.skills,
        }}
      />

      <section style={{
        display: 'grid',
        gridTemplateColumns: isMobile || isTablet ? '1fr' : '42% 1fr',
        minHeight: '100svh',
        paddingTop: isMobile || isTablet ? '80px' : '0',
      }}>

        {/* ── LEFT: Photo panel ─────────────────────────────────────────── */}
        <div style={{
          position: isMobile || isTablet ? 'relative' : 'sticky',
          top: 0,
          height: isMobile ? '60svh' : isTablet ? '50svh' : '100svh',
          background: 'linear-gradient(160deg, #0c0c18 0%, #161220 50%, #0b1616 100%)',
          overflow: 'hidden',
        }}>
          {/* Photo */}
          {photoUrl && (
            <img
              src={photoUrl}
              alt="Thibaud Fossati"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center top',
                opacity: 0.88,
              }}
            />
          )}
          {/* Dark overlay on photo for contrast */}
          {photoUrl && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(160deg, rgba(8,8,16,0.35) 0%, rgba(8,8,16,0.15) 50%, rgba(8,8,16,0.55) 100%)',
            }}/>
          )}

          {/* Grain */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05, pointerEvents: 'none' }}>
            <filter id="about-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch"/>
              <feColorMatrix type="saturate" values="0"/>
            </filter>
            <rect width="100%" height="100%" filter="url(#about-grain)"/>
          </svg>

          {/* Glow — only without photo */}
          {!photoUrl && (
            <div style={{
              position: 'absolute',
              top: '15%', left: '20%',
              width: '65%', height: '60%',
              background: 'radial-gradient(ellipse, rgba(0,155,175,0.22) 0%, transparent 70%)',
              filter: 'blur(52px)',
            }}/>
          )}

          {/* Bottom gradient fade */}
          <div style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '38%',
            background: 'linear-gradient(to top, rgba(6,6,12,0.96) 0%, rgba(6,6,12,0.60) 55%, transparent 100%)',
          }}/>

          {/* Labels bottom-left */}
          <div style={{
            position: 'absolute',
            bottom: isMobile ? '20px' : '36px',
            left: isMobile ? '20px' : '40px',
            right: isMobile ? '20px' : '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}>
            <p style={{
              fontFamily: INTER,
              fontSize: '10px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.30)',
              margin: 0,
            }}>
              {content.about.splitDarkLabel}
            </p>
            <p style={{
              fontFamily: INTER,
              fontSize: '10px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.18)',
              margin: 0,
            }}>
              {content.about.estLabel}
            </p>
          </div>
        </div>

        {/* ── RIGHT: Content ────────────────────────────────────────────── */}
        <div className="night-surface" style={{
          padding: isMobile ? '48px 24px 64px' : isTablet ? '56px 40px 72px' : '100px 64px 80px 72px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0,
        }}>

          {/* Name */}
          <h1 style={{
            fontFamily: BODONI,
            fontWeight: 'var(--display-weight)',
            fontSize: isMobile
              ? 'calc(clamp(48px, 14vw, 96px) * var(--display-size-scale))'
              : isTablet
                ? 'calc(clamp(56px, 9vw, 110px) * var(--display-size-scale))'
                : 'calc(clamp(64px, 6.5vw, 120px) * var(--display-size-scale))',
            lineHeight: 'var(--display-line-height)',
            letterSpacing: 'var(--display-letter-spacing)',
            wordSpacing: 'var(--display-word-spacing)',
            color: '#0a0a0a',
            margin: '0 0 32px',
          }}>
            <DisplayText text={content.about.name} caseMode={displayCase} emphasisMode={displayEmphasis} />
          </h1>

          {/* Separator */}
          <div style={{ width: '48px', height: '1px', background: 'rgba(10,10,10,0.14)', marginBottom: '28px' }} />

          {/* Role */}
          <p data-cursor="quiet" style={{
            fontFamily: INTER,
            fontWeight: 400,
            fontSize: '11px',
            letterSpacing: '0.20em',
            textTransform: 'uppercase',
            color: 'rgba(10,10,10,0.38)',
            margin: '0 0 36px',
          }}>
            {content.about.roleLine}
          </p>

          {/* Bio */}
          <div style={{ marginBottom: '48px' }}>
            {bioLines.length > 0
              ? bioLines.map((line, i) => (
                  <p key={i} data-cursor="quiet" style={{
                    fontFamily: INTER,
                    fontWeight: 300,
                    fontSize: isMobile ? '16px' : '17px',
                    lineHeight: 1.80,
                    color: 'rgba(10,10,10,0.62)',
                    margin: i < bioLines.length - 1 ? '0 0 16px' : '0',
                    maxWidth: '520px',
                  }}>
                    {line}
                  </p>
                ))
              : (
                <p data-cursor="quiet" style={{
                  fontFamily: INTER,
                  fontWeight: 300,
                  fontSize: isMobile ? '16px' : '17px',
                  lineHeight: 1.80,
                  color: 'rgba(10,10,10,0.62)',
                  margin: 0,
                  maxWidth: '520px',
                }}>
                  {content.about.splitIntro}
                </p>
              )
            }
          </div>

          {/* Stats */}
          {content.about.stats.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(content.about.stats.length, 3)}, 1fr)`,
              gap: '12px',
              marginBottom: '40px',
              maxWidth: '480px',
            }}>
              {content.about.stats.map(stat => (
                <HoverStat key={stat.label} value={stat.value} label={stat.label} />
              ))}
            </div>
          )}

          {/* Skills */}
          {content.about.skills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
              {content.about.skills.map(s => (
                <span key={s} style={{
                  fontFamily: INTER,
                  fontSize: '10px',
                  letterSpacing: '0.13em',
                  textTransform: 'uppercase',
                  color: 'rgba(10,10,10,0.42)',
                  padding: '5px 12px',
                  border: '1px solid rgba(10,10,10,0.10)',
                  borderRadius: '2px',
                }}>
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Agencies */}
          {content.about.agencies.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '20px',
              flexWrap: 'wrap',
              marginBottom: '52px',
            }}>
              {content.about.agencies.map(a => (
                <span key={a} style={{
                  fontFamily: INTER,
                  fontSize: '10px',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'rgba(10,10,10,0.28)',
                }}>
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div>
            <Link
              to="/contact"
              className="btn-pill"
              data-cursor="hover"
            >
              {content.about.ctaLabel}
              <ArrowIcon size={12} />
            </Link>
          </div>

        </div>
      </section>
    </main>
  )
}
