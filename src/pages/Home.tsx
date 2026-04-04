import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ParticleCanvas from '../components/ParticleCanvas'
import DisplayText from '../components/DisplayText'
import ArrowIcon from '../components/ArrowIcon'
import TextReveal from '../components/TextReveal'
import Magnet from '../components/Magnet'
import Seo from '../components/Seo'
import InstagramPreview from '../components/InstagramPreview'
import { useSiteContent } from '../hooks/useSiteContent'
import { useIsMobile } from '../hooks/useIsMobile'
import { getDisplayFontFamily, getDisplayFontWeight, getDisplayLetterSpacing, getDisplayLineHeight, getDisplaySizeScale, getDisplayWordSpacing } from '../lib/typography'
import { autoTranslateText, getStoredLanguage, t } from '../lib/i18n'
import { isLocalImageToken, resolveLocalImageToObjectUrl } from '../lib/localImageStore'
import { getProjectRoutePath } from '../lib/projectRouting'

type InstagramFeedItem = {
  id: string
  title: string
  label?: string
  href: string
  image?: string
}

const PROJECT_ROW_BASE_BG = '#e7e7e8'
const PROJECT_ROW_NIGHT_SAFE_BG = '#1a2028'
const PROJECT_ROW_NIGHT_BOLD_BG = '#12171e'

type RgbColor = { r: number; g: number; b: number }

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function hexToRgb(value: string): RgbColor | null {
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return null
  const hex = match[1].length === 3
    ? match[1].split('').map(char => `${char}${char}`).join('')
    : match[1]
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

function rgbToHex(color: RgbColor): string {
  const toHex = (value: number) => clampColor(value).toString(16).padStart(2, '0')
  return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`
}

function mixColor(a: RgbColor, b: RgbColor, ratio: number): RgbColor {
  const t = Math.max(0, Math.min(1, ratio))
  return {
    r: clampColor(a.r + (b.r - a.r) * t),
    g: clampColor(a.g + (b.g - a.g) * t),
    b: clampColor(a.b + (b.b - a.b) * t),
  }
}

function rgbToHsl({ r, g, b }: RgbColor): { h: number; s: number; l: number } {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6
        break
      case gn:
        h = (bn - rn) / delta + 2
        break
      default:
        h = (rn - gn) / delta + 4
        break
    }
    h *= 60
    if (h < 0) h += 360
  }

  return { h, s, l }
}

function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): RgbColor {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r1 = 0
  let g1 = 0
  let b1 = 0

  if (h >= 0 && h < 60) {
    r1 = c
    g1 = x
  } else if (h < 120) {
    r1 = x
    g1 = c
  } else if (h < 180) {
    g1 = c
    b1 = x
  } else if (h < 240) {
    g1 = x
    b1 = c
  } else if (h < 300) {
    r1 = x
    b1 = c
  } else {
    r1 = c
    b1 = x
  }

  return {
    r: clampColor((r1 + m) * 255),
    g: clampColor((g1 + m) * 255),
    b: clampColor((b1 + m) * 255),
  }
}

function createPastelFromRgb(source: RgbColor): string {
  const { h, s, l } = rgbToHsl(source)
  const pastel = hslToRgb({
    h,
    s: Math.max(0.08, Math.min(0.32, s * 0.45 + 0.08)),
    l: Math.max(0.87, Math.min(0.94, l * 0.42 + 0.56)),
  })
  const base = hexToRgb(PROJECT_ROW_BASE_BG) ?? { r: 231, g: 231, b: 232 }
  return rgbToHex(mixColor(base, pastel, 0.58))
}

function createNightTintFromPastel(sourceHex: string, style: 'safe' | 'bold'): string {
  const source = hexToRgb(sourceHex)
  const fallback = style === 'bold' ? PROJECT_ROW_NIGHT_BOLD_BG : PROJECT_ROW_NIGHT_SAFE_BG
  if (!source) return fallback
  const base = hexToRgb(fallback)
  if (!base) return fallback
  const ratio = style === 'bold' ? 0.34 : 0.26
  return rgbToHex(mixColor(base, source, ratio))
}

async function extractPastelFromCover(sourceUrl: string): Promise<string | null> {
  const source = sourceUrl.trim()
  if (!source) return null
  const src = isLocalImageToken(source) ? await resolveLocalImageToObjectUrl(source) : source
  if (!src) return null

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.crossOrigin = 'anonymous'
    element.decoding = 'async'
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('image-load-error'))
    element.src = src
  }).catch(() => null)

  if (!image) {
    if (src.startsWith('blob:')) URL.revokeObjectURL(src)
    return null
  }

  const size = 24
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    if (src.startsWith('blob:')) URL.revokeObjectURL(src)
    return null
  }

  try {
    context.drawImage(image, 0, 0, size, size)
    const data = context.getImageData(0, 0, size, size).data
    let count = 0
    let r = 0
    let g = 0
    let b = 0
    for (let index = 0; index < data.length; index += 4) {
      if (data[index + 3] < 18) continue
      r += data[index]
      g += data[index + 1]
      b += data[index + 2]
      count += 1
    }
    if (count === 0) return null
    return createPastelFromRgb({ r: r / count, g: g / count, b: b / count })
  } catch {
    return null
  } finally {
    if (src.startsWith('blob:')) URL.revokeObjectURL(src)
  }
}

function normalizeInstagramPostUrl(url: string): string {
  const value = url.trim()
  if (!value) return ''
  if (!/^https?:\/\//i.test(value)) return `https://${value}`
  return value
}

function buildInstagramEmbedUrl(postUrl: string): string | null {
  const normalized = normalizeInstagramPostUrl(postUrl)
  if (!normalized) return null
  if (normalized.includes('/embed')) return normalized

  const match = normalized.match(/instagram\.com\/(p|reel)\/([^/?#]+)/i)
  if (!match) return null
  const [, type, shortcode] = match
  return `https://www.instagram.com/${type}/${shortcode}/embed`
}

function extractInstagramUsername(profileUrl: string): string | null {
  const normalized = normalizeInstagramPostUrl(profileUrl)
  const match = normalized.match(/instagram\.com\/([a-zA-Z0-9._]+)/)
  if (!match) return null
  const username = match[1].trim()
  if (!username || username.toLowerCase() === 'p' || username.toLowerCase() === 'reel') return null
  return username
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim()
}

export default function Home() {
  const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/instories_ai'
  const heroRef = useRef<HTMLElement>(null)
  const heroTextRef = useRef<HTMLDivElement>(null)
  const [hoveredProject, setHoveredProject] = useState<string | null>(null)
  const [activeScrollProject, setActiveScrollProject] = useState<string | null>(null)
  const projectRowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [projectHoverPastels, setProjectHoverPastels] = useState<Record<string, string>>({})
  const [reduceMotion, setReduceMotion] = useState(false)
  const [instagramFeedItems, setInstagramFeedItems] = useState<InstagramFeedItem[]>([])
  const content = useSiteContent()
  const lang = getStoredLanguage()
  const isMobile = useIsMobile()
  const { home, footer } = content
  const displayFont = getDisplayFontFamily(content.design.displayFont)
  const displayWeight = getDisplayFontWeight(content.design.displayFont, content.design.displayWeight)
  const displaySizeScale = getDisplaySizeScale(content.design.displaySize)
  const displayLetterSpacing = `${getDisplayLetterSpacing(content.design.displayLetterSpacing)}em`
  const displayWordSpacing = `${getDisplayWordSpacing(content.design.displayWordSpacing)}em`
  const displayLineHeight = getDisplayLineHeight(content.design.displayLineHeight)
  const displayCase = content.design.displayCase
  const displayEmphasis = content.design.displayEmphasis
  const isNight = content.design.colorMode === 'night'
  const nightStyle = content.design.nightStyle
  const rowBorderColor = isNight ? 'var(--night-border)' : 'rgba(10,10,10,0.08)'
  const rowIndexColor = isNight ? 'var(--night-soft-muted)' : 'rgba(10,10,10,0.25)'
  const rowClientColor = isNight ? 'var(--night-muted)' : 'rgba(10,10,10,0.4)'
  const rowTagTextColor = isNight ? 'rgba(236,231,222,0.86)' : 'rgba(10,10,10,0.35)'
  const rowTagBorderColor = isNight ? 'rgba(186,210,246,0.44)' : 'rgba(10,10,10,0.12)'
  const rowTagBackground = isNight ? 'rgba(186,210,246,0.08)' : 'transparent'
  const rowYearColor = isNight ? 'var(--night-soft-muted)' : 'rgba(10,10,10,0.3)'
  const footerTextColor = isNight ? 'rgba(236,231,222,0.68)' : 'rgba(255,255,255,0.58)'
  const footerLinkColor = isNight ? 'rgba(236,231,222,0.84)' : 'rgba(255,255,255,0.78)'
  const footerBorderColor = isNight ? 'rgba(186,210,246,0.24)' : 'rgba(255,255,255,0.16)'
  const projects = useMemo(
    () => content.projects
      .filter(project => project.status === 'published')
      .sort((a, b) => a.order - b.order),
    [content.projects]
  )
  const instagramSocial = content.contact.socials.find(
    social => social.label.toLowerCase().includes('instagram') || social.href.includes('instagram.com')
  )
  const instagramUrl = instagramSocial?.href?.startsWith('http')
    ? instagramSocial.href
    : INSTAGRAM_PROFILE_URL
  const instagramItemsFromPosts = home.instagramPostUrls
    .map(url => normalizeInstagramPostUrl(url))
    .filter(Boolean)
    .map((url, index) => {
      const embedUrl = buildInstagramEmbedUrl(url)
      const shortcodeMatch = url.match(/instagram\.com\/(?:p|reel)\/([^/?#]+)/i)
      const shortcode = shortcodeMatch?.[1]?.toUpperCase() ?? `POST ${String(index + 1).padStart(2, '0')}`
      return {
        id: `${shortcode}-${index}`,
        title: `@instories_ai — ${shortcode}`,
        label: autoTranslateText('Voir le post', lang),
        href: url,
        embedUrl: embedUrl ?? undefined,
      }
    })
    .filter(item => Boolean(item.embedUrl))
  const instagramFeedUsername = extractInstagramUsername(instagramUrl)
  const instagramItemsAuto = instagramFeedItems.map(item => ({
    id: item.id,
    title: item.title,
    label: item.label,
    image: item.image,
    href: item.href,
  }))
  const instagramFallbackItems: InstagramFeedItem[] = [
    { id: 'fallback-1', title: autoTranslateText('@instories_ai — feed', lang), label: autoTranslateText('Voir le post', lang), href: instagramUrl },
    { id: 'fallback-2', title: autoTranslateText('Stories & direction artistique', lang), label: autoTranslateText('Voir le post', lang), href: instagramUrl },
    { id: 'fallback-3', title: autoTranslateText('Créativité IA & luxe', lang), label: autoTranslateText('Voir le post', lang), href: instagramUrl },
  ]
  const instagramItems = instagramItemsAuto.length > 0
    ? instagramItemsAuto
    : (instagramItemsFromPosts.length > 0 ? instagramItemsFromPosts : instagramFallbackItems)
  const instagramSubtitle = instagramItemsAuto.length > 0
    ? t(lang, 'ui.instagram.lastPosts')
      : instagramItemsFromPosts.length > 0
        ? t(lang, 'ui.instagram.preview')
      : autoTranslateText('Suivez @instories_ai', lang)
  const ctaLines = home.contactCtaTitle.split('\n')

  useEffect(() => {
    let canceled = false
    void (async () => {
      const pairs = await Promise.all(projects.map(async project => {
        const pastel = await extractPastelFromCover(project.cover ?? '')
        return [project.id, pastel] as const
      }))
      if (canceled) return
      const next: Record<string, string> = {}
      pairs.forEach(([id, color]) => {
        if (color) next[id] = color
      })
      setProjectHoverPastels(next)
    })()
    return () => { canceled = true }
  }, [projects])

  // Scroll-based spotlight (mobile): lock to a single card nearest viewport center.
  useEffect(() => {
    if (!isMobile) { setActiveScrollProject(null); return }
    const refs = projectRowRefs.current
    if (refs.size === 0) return

    let raf = 0
    const updateActiveProject = () => {
      raf = 0
      const viewportCenter = window.innerHeight * 0.5
      let bestId: string | null = null
      let bestDistance = Number.POSITIVE_INFINITY

      refs.forEach((el, id) => {
        const rect = el.getBoundingClientRect()
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) return
        const cardCenter = rect.top + rect.height * 0.5
        const distance = Math.abs(cardCenter - viewportCenter)
        if (distance < bestDistance) {
          bestDistance = distance
          bestId = id
        }
      })

      setActiveScrollProject(current => {
        if (!bestId) return current
        return current === bestId ? current : bestId
      })
    }

    const requestUpdate = () => {
      if (raf) return
      raf = window.requestAnimationFrame(updateActiveProject)
    }

    requestUpdate()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
    }
  }, [isMobile, projects])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadInstagramFeed = async () => {
      if (!instagramFeedUsername) {
        if (!cancelled) setInstagramFeedItems([])
        return
      }

      try {
        const feedUrl = `https://rsshub.app/instagram/user/${instagramFeedUsername}`
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`
        const response = await fetch(apiUrl)
        if (!response.ok) throw new Error('Impossible de charger le feed Instagram')
        const json = await response.json() as { items?: Array<{ link?: string; title?: string; thumbnail?: string; enclosure?: { link?: string }; description?: string }> }

        const items = (json.items ?? [])
          .map<InstagramFeedItem | null>((item, index) => {
            const href = normalizeInstagramPostUrl(item.link ?? '')
            const title = stripHtml(item.title ?? item.description ?? '').slice(0, 90) || `Post ${String(index + 1).padStart(2, '0')}`
            const image = item.thumbnail || item.enclosure?.link
            if (!href) return null
            return image ? {
              id: `${href}-${index}`,
              title,
              label: autoTranslateText('Voir le post', lang),
              href,
              image,
            } : {
              id: `${href}-${index}`,
              title,
              label: autoTranslateText('Voir le post', lang),
              href,
            }
          })
          .filter((item): item is InstagramFeedItem => item !== null)
          .slice(0, 6)

        if (!cancelled) setInstagramFeedItems(items)
      } catch {
        if (!cancelled) setInstagramFeedItems([])
      }
    }

    void loadInstagramFeed()
    return () => { cancelled = true }
  }, [instagramFeedUsername, lang])

  // ── Parallax hero — texte dérive à 0.38x du scroll ───────────────────────
  useEffect(() => {
    if (reduceMotion || isMobile) return

    const onScroll = () => {
      if (!heroTextRef.current || !heroRef.current) return
      const heroH = heroRef.current.clientHeight
      const scrollY = window.scrollY
      if (scrollY > heroH) return
      heroTextRef.current.style.transform = `translateY(${scrollY * 0.38}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [reduceMotion, isMobile])

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
        title={lang === 'en' ? 'InStories — Art Direction & AI for premium brands' : 'InStories — Art Direction & AI pour marques premium'}
        description={home.servicesIntro}
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              name: 'InStories',
              url: 'https://instories.fr/',
              logo: 'https://instories.fr/InStories-logo-BOT.png',
              sameAs: footer.socials.map(social => social.href).filter(Boolean),
            },
            {
              '@type': 'Person',
              name: 'Thibaud Fossati',
              jobTitle: autoTranslateText('Directeur artistique', lang),
              worksFor: { '@type': 'Organization', name: 'InStories' },
              address: { '@type': 'PostalAddress', addressLocality: 'Paris', addressCountry: 'FR' },
            },
          ],
        }}
      />
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
          padding: isMobile ? '0 20px 36px' : '0 48px 64px',
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
                  fontWeight: 'var(--display-weight)',
                  fontSize: 'calc(clamp(72px, 10vw, 160px) * var(--display-size-scale))',
                  lineHeight: 'var(--display-line-height)',
                  letterSpacing: 'var(--display-letter-spacing)',
                  wordSpacing: 'var(--display-word-spacing)',
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
                  fontWeight: 'var(--display-weight)',
                  fontSize: 'calc(clamp(72px, 10vw, 160px) * var(--display-size-scale))',
                  lineHeight: 'var(--display-line-height)',
                  letterSpacing: 'var(--display-letter-spacing)',
                  wordSpacing: 'var(--display-word-spacing)',
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
          <div style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '14px' : '48px',
          }}>
            <TextReveal delay={550} as="p">
              <span style={{
                fontSize: '11px',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(200,220,255,0.55)',
                fontWeight: 300,
                whiteSpace: isMobile ? 'normal' : 'nowrap',
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
                whiteSpace: isMobile ? 'normal' : 'nowrap',
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
        className="night-surface"
        style={{ padding: isMobile ? '72px 20px' : '120px 48px' }}
      >
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: isMobile ? '36px' : '80px',
          }}
        >
          <TextReveal as="h2">
            <span
              style={{
                fontFamily: 'var(--display-font)',
                fontSize: 'calc(clamp(36px, 5vw, 64px) * var(--display-size-scale))',
                fontWeight: 'var(--display-weight)',
                letterSpacing: 'var(--display-letter-spacing)',
                wordSpacing: 'var(--display-word-spacing)',
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
              {projects.length} {t(lang, 'ui.references')}
            </span>
          </TextReveal>
        </div>

        {/* Projects grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '12px' : '0' }}>
          {projects.map((project, index) => {
            const isHovered = hoveredProject === project.id
            const isAfterHovered = index > 0 && hoveredProject === projects[index - 1].id
            const isMobileActive = isMobile && activeScrollProject === project.id
            return (
              <Link
                key={project.id}
                to={getProjectRoutePath(project)}
                data-cursor="hover"
                style={{ textDecoration: 'none', color: 'inherit' }}
                onMouseEnter={() => setHoveredProject(project.id)}
                onMouseLeave={() => setHoveredProject(null)}
              >
                <div
                  ref={(el) => {
                    if (el) projectRowRefs.current.set(project.id, el)
                    else projectRowRefs.current.delete(project.id)
                  }}
                  data-project-id={project.id}
                  className={`project-card project-row${isMobile && isMobileActive ? ' is-mobile-active' : ''}`}
                  style={isMobile ? {
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '140px',
                    padding: '20px 16px',
                    transition: 'background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease',
                    borderRadius: '16px',
                    background: isMobileActive
                      ? (isNight
                        ? createNightTintFromPastel(projectHoverPastels[project.id] ?? PROJECT_ROW_BASE_BG, nightStyle)
                        : (projectHoverPastels[project.id] ?? PROJECT_ROW_BASE_BG))
                      : (isNight ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                    transform: isMobileActive ? 'scale(1.012)' : 'scale(1)',
                  } : {
                    display: 'grid',
                    gridTemplateColumns: '64px 1fr 1fr auto',
                    alignItems: 'center',
                    gap: '40px',
                    padding: '32px 0',
                    borderTop: `1px solid ${(isHovered || isAfterHovered) ? 'transparent' : rowBorderColor}`,
                    boxShadow: isNight
                      ? ((isHovered || isAfterHovered) ? 'none' : `inset 0 1px 0 ${rowBorderColor}`)
                      : 'none',
                    transition: 'background 0.3s ease',
                    background: isHovered
                      ? (isNight
                        ? createNightTintFromPastel(projectHoverPastels[project.id] ?? PROJECT_ROW_BASE_BG, nightStyle)
                        : (projectHoverPastels[project.id] ?? PROJECT_ROW_BASE_BG))
                      : 'transparent',
                    paddingLeft: isHovered ? '24px' : '0',
                  }}
                >
                {isMobile ? (
                  /* ── Mobile layout: [index/year] | content | arrow ── */
                  <>
                    {/* Left column: index + year stacked */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '42px',
                      flexShrink: 0,
                      alignSelf: 'center',
                      gap: '4px',
                      marginRight: '6px',
                    }}>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 200,
                        letterSpacing: '0.02em',
                        color: rowIndexColor,
                        lineHeight: '1',
                      }}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span style={{
                        fontSize: '9px',
                        letterSpacing: '0.06em',
                        color: rowYearColor,
                        lineHeight: '1',
                      }}>
                        {project.year}
                      </span>
                    </div>

                    {/* Center: client + title + cats */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '10px',
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: rowClientColor,
                        marginBottom: '4px',
                      }}>
                        {project.client}
                      </div>
                      <div style={{
                        fontFamily: 'var(--display-font)',
                        fontSize: 'calc(clamp(22px, 6vw, 32px) * var(--display-size-scale))',
                        fontWeight: 'var(--display-weight)',
                        letterSpacing: 'var(--display-letter-spacing)',
                        wordSpacing: 'var(--display-word-spacing)',
                        lineHeight: '1.1',
                        marginBottom: '10px',
                      }}>
                        <DisplayText text={project.title} caseMode={displayCase} emphasisMode={displayEmphasis} />
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {project.category.slice(0, 2).map(cat => (
                          <span key={cat} style={{
                            fontSize: '8px',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: rowTagTextColor,
                            padding: '2px 7px',
                            border: `1px solid ${rowTagBorderColor}`,
                            background: isNight ? 'rgba(186,210,246,0.1)' : 'rgba(255,255,255,0.5)',
                            borderRadius: '2px',
                          }}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Arrow right */}
                    <span style={{
                      color: rowYearColor,
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                      paddingLeft: '8px',
                      alignSelf: 'center',
                    }}
                    className={`project-row-mobile-arrow${isMobileActive ? ' is-active' : ''}`}>
                      <ArrowIcon direction="right" size={16} strokeWidth={1.6} />
                    </span>
                  </>
                ) : (
                  /* ── Desktop layout ── */
                  <>
                {/* Index */}
                <span
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.1em',
                    color: rowIndexColor,
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
                      color: rowClientColor,
                      marginBottom: '6px',
                    }}
                  >
                    {project.client}
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--display-font)',
                      fontSize: 'calc(clamp(22px, 3vw, 36px) * var(--display-size-scale))',
                      fontWeight: 'var(--display-weight)',
                      letterSpacing: 'var(--display-letter-spacing)',
                      wordSpacing: 'var(--display-word-spacing)',
                      lineHeight: 'var(--display-line-height)',
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
                        color: rowTagTextColor,
                        padding: '4px 10px',
                        border: `1px solid ${rowTagBorderColor}`,
                        background: rowTagBackground,
                        borderRadius: '2px',
                      }}
                    >
                      {cat}
                    </span>
                  ))}
                </div>

                {/* Year + arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px', paddingRight: '12px' }}>
                    <span style={{ fontSize: '11px', color: rowYearColor, letterSpacing: '0.08em' }}>
                      {project.year}
                    </span>
                    <span
                      style={{
                        color: rowYearColor,
                        display: 'inline-flex',
                        alignItems: 'center',
                        transform: isHovered ? 'translateX(6px)' : 'translateX(0)',
                        transition: 'transform 0.3s ease',
                      }}
                    >
                      <ArrowIcon direction="right" size={14} strokeWidth={1.8} />
                    </span>
                  </div>
                  </>
                )}
              </div>
              </Link>
            )
          })}

          {/* Divider bottom */}
          <div
            style={{
              borderTop: `1px solid ${hoveredProject === projects[projects.length - 1]?.id ? 'transparent' : rowBorderColor}`,
              paddingTop: '0',
            }}
          />
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section
        id="services"
        className="night-surface-strong"
        style={{
          padding: '120px 48px',
          paddingLeft: isMobile ? '20px' : '48px',
          paddingRight: isMobile ? '20px' : '48px',
          paddingTop: isMobile ? '72px' : '120px',
          paddingBottom: isMobile ? '72px' : '120px',
          background: '#0a0a0a',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '44px' : '80px',
            alignItems: 'start',
          }}
        >
          {/* Left */}
          <div>
            <TextReveal as="h2" delay={100}>
              <span
                style={{
                  fontFamily: 'var(--display-font)',
                  fontSize: 'calc(clamp(40px, 5vw, 72px) * var(--display-size-scale))',
                  fontWeight: 'var(--display-weight)',
                  letterSpacing: 'var(--display-letter-spacing)',
                  wordSpacing: 'var(--display-word-spacing)',
                  lineHeight: 'var(--display-line-height)',
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
        className="night-surface"
        style={{
          padding: '160px 48px',
          paddingLeft: isMobile ? '20px' : '48px',
          paddingRight: isMobile ? '20px' : '48px',
          paddingTop: isMobile ? '86px' : '160px',
          paddingBottom: isMobile ? '86px' : '160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: isMobile ? '24px' : '40px',
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
              fontSize: 'calc(clamp(32px, 5vw, 72px) * var(--display-size-scale))',
              fontWeight: 'var(--display-weight)',
              letterSpacing: 'var(--display-letter-spacing)',
              wordSpacing: 'var(--display-word-spacing)',
              lineHeight: 'var(--display-line-height)',
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
            className="btn-pill"
            style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}
          >
            {home.aboutCtaLabel}
            <ArrowIcon direction="right" size={11} strokeWidth={1.8} />
          </Link>
        </TextReveal>
      </section>

      {/* ── CTA CONTACT ── */}
      <section
        className="night-surface-soft"
        style={{
          padding: '120px 48px',
          paddingLeft: isMobile ? '20px' : '48px',
          paddingRight: isMobile ? '20px' : '48px',
          paddingTop: isMobile ? '76px' : '120px',
          paddingBottom: isMobile ? '76px' : '120px',
          background: '#f8f6f2',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '28px' : '0',
        }}
      >
        <TextReveal as="h2">
          <span
            style={{
              fontFamily: 'var(--display-font)',
              fontSize: 'calc(clamp(40px, 6vw, 96px) * var(--display-size-scale))',
              fontWeight: 'var(--display-weight)',
              letterSpacing: 'var(--display-letter-spacing)',
              wordSpacing: 'var(--display-word-spacing)',
              lineHeight: 'var(--display-line-height)',
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
              className="btn-circle"
              style={{
                width: isMobile ? '126px' : '160px',
                height: isMobile ? '126px' : '160px',
              }}
            >
              {home.contactCtaButton}
            </Link>
          </Magnet>
        </TextReveal>
      </section>

      <section
        className="night-surface"
        style={{
          padding: isMobile ? '56px 20px' : '72px 48px',
        }}
      >
        <InstagramPreview
          compact
          title="Instagram"
          subtitle={instagramSubtitle}
          instagramUrl={instagramUrl}
          items={instagramItems}
          displayCase={displayCase}
          displayEmphasis={displayEmphasis}
        />
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="night-surface-strong"
        style={{
          padding: '32px 48px',
          paddingLeft: isMobile ? '20px' : '48px',
          paddingRight: isMobile ? '20px' : '48px',
          background: '#0a0a0a',
          color: footerTextColor,
          borderTop: `1px solid ${footerBorderColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '0',
          fontSize: '10px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        <span>{footer.copyright}</span>
        <span>{footer.registration}</span>
        <div style={{ display: 'flex', gap: '24px' }}>
          {footer.socials.map(link => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="footer-link"
              style={{ color: footerLinkColor }}
            >
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
