import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import DisplayText from '../components/DisplayText'
import ArrowIcon from '../components/ArrowIcon'
import TextReveal from '../components/TextReveal'
import Seo from '../components/Seo'
import ResolvedImage from '../components/ResolvedImage'
import { useSiteContent } from '../hooks/useSiteContent'
import { useIsMobile } from '../hooks/useIsMobile'
import { getDisplayFontFamily, getDisplayFontWeight, getDisplayLetterSpacing, getDisplayLineHeight, getDisplaySizeScale, getDisplayWordSpacing } from '../lib/typography'
import type { MediaAspectRatio, Project as ProjectType } from '../data/projects'
import { isLocalVideoToken, resolveLocalVideoToObjectUrl } from '../lib/localVideoStore'
import { isLocalImageToken, resolveLocalImageToObjectUrl } from '../lib/localImageStore'
import { type LanguageCode, getStoredLanguage, t } from '../lib/i18n'
import { downloadPortfolioPdfLive } from '../lib/pdfDownload'
import { trackEvent } from '../lib/analytics'
import { getProjectRoutePath, slugifyProjectValue } from '../lib/projectRouting'

const PROJECT_BASE_BG = '#e7e7e8'
const PROJECT_VIEW_HISTORY_KEY = 'instories.analytics.viewed-projects.session.v1'
const PROJECT_VIEW_HISTORY_LEGACY_KEY = 'instories.analytics.viewed-projects.v1'

function readViewedProjectIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.sessionStorage.getItem(PROJECT_VIEW_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(value => typeof value === 'string')
  } catch {
    return []
  }
}

function trackViewedProject(projectId: string): number {
  if (typeof window === 'undefined') return 0
  const safeId = projectId.trim()
  if (!safeId) return 0
  const current = readViewedProjectIds()
  if (!current.includes(safeId)) current.push(safeId)
  const capped = current.slice(-50)
  window.sessionStorage.setItem(PROJECT_VIEW_HISTORY_KEY, JSON.stringify(capped))
  return capped.length
}

function isKnownEmbeddedVideoUrl(url: string): boolean {
  const value = url.trim().toLowerCase()
  return (
    value.includes('youtube.com/watch') ||
    value.includes('youtube.com/shorts') ||
    value.includes('youtu.be/') ||
    value.includes('vimeo.com/') ||
    value.includes('dailymotion.com/') ||
    value.includes('facebook.com/') ||
    value.includes('instagram.com/reel/')
  )
}

function canAttemptNativeVideo(url: string): boolean {
  const value = url.trim()
  if (!value) return false
  if (value.startsWith('blob:')) return true
  if (/^data:video\//i.test(value)) return true
  if (isKnownEmbeddedVideoUrl(value)) return false
  if (/\.(mp4|webm|ogg|m4v|mov)(\?.*)?(#.*)?$/i.test(value)) return true
  return /^https?:\/\//i.test(value)
}

function inferAspectFromSource(url: string): '16 / 9' | '9 / 16' {
  const source = url.toLowerCase()
  if (
    source.includes('/shorts/') ||
    source.includes('/reel/') ||
    source.includes('tiktok.com') ||
    source.includes('story')
  ) {
    return '9 / 16'
  }
  return '16 / 9'
}

function normalizePublicPath(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('/')) return trimmed
  const [pathPart, hashPart = ''] = trimmed.split('#')
  const [pathname, queryPart = ''] = pathPart.split('?')
  const normalizedPath = pathname
    .split('/')
    .map(segment => segment
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase())
    .map(segment => {
      if (segment === 'projets') return 'projects'
      if (segment === 'projet') return 'project'
      return segment
    })
    .join('/')
  const withQuery = queryPart ? `${normalizedPath}?${queryPart}` : normalizedPath
  return hashPart ? `${withQuery}#${hashPart}` : withQuery
}

function sanitizeProjectMediaId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'project'
}

function buildVideoCandidates(source: string, projectId?: string, mediaIndex?: number): string[] {
  const trimmed = source.trim()
  const set = new Set<string>()
  if (trimmed) set.add(trimmed)

  const normalized = normalizePublicPath(trimmed)
  if (normalized) set.add(normalized)

  if (trimmed.startsWith('/media/') || normalized.startsWith('/media/')) {
    const baseCandidates = [trimmed, normalized].filter(Boolean)
    const extensions = ['mp4', 'webm', 'm4v', 'mov', 'ogg']
    baseCandidates.forEach(candidate => {
      const [pathPart, hashPart = ''] = candidate.split('#')
      const [pathname, queryPart = ''] = pathPart.split('?')
      const dotIndex = pathname.lastIndexOf('.')
      const hasExt = dotIndex > pathname.lastIndexOf('/')
      const basePath = hasExt ? pathname.slice(0, dotIndex) : pathname
      const numberingMatch = basePath.match(/^(.*\/video-)(\d{1,2})$/)
      const basePaths = new Set<string>([basePath])
      if (numberingMatch) {
        const prefix = numberingMatch[1]
        const rawIndex = Number(numberingMatch[2])
        if (Number.isFinite(rawIndex) && rawIndex > 0) {
          basePaths.add(`${prefix}${String(rawIndex).padStart(2, '0')}`)
          basePaths.add(`${prefix}${rawIndex}`)
        }
      }
      basePaths.forEach(path => {
        extensions.forEach(ext => {
          const nextPath = `${path}.${ext}`
          const withQuery = queryPart ? `${nextPath}?${queryPart}` : nextPath
          const withHash = hashPart ? `${withQuery}#${hashPart}` : withQuery
          set.add(withHash)
        })
      })
    })
  }

  if (projectId && typeof mediaIndex === 'number') {
    const safeProjectId = sanitizeProjectMediaId(projectId)
    const safeIndex = Math.max(1, mediaIndex + 1)
    ;['mp4', 'webm', 'm4v', 'mov', 'ogg'].forEach(ext => {
      set.add(`/media/projects/${safeProjectId}/video-${String(safeIndex).padStart(2, '0')}.${ext}`)
    })
  }

  return Array.from(set).filter(Boolean)
}

function aspectToNumeric(aspect: MediaAspectRatio | undefined, source: string): number {
  const resolved = aspect === 'original'
    ? inferAspectFromSource(source)
    : (aspect ?? '16 / 9')
  if (resolved === '9 / 16') return 9 / 16
  if (resolved === '4 / 5') return 4 / 5
  if (resolved === '1 / 1') return 1
  return 16 / 9
}

function sanitizeCoverFocus(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 50
  return Math.max(0, Math.min(100, value))
}

function sanitizeImageAspectRatio(value: unknown): Exclude<MediaAspectRatio, 'original'> {
  if (value === '16 / 9' || value === '4 / 5' || value === '1 / 1' || value === '9 / 16') return value
  return '4 / 5'
}

type RgbColor = { r: number; g: number; b: number }

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function mixColor(a: RgbColor, b: RgbColor, ratio: number): RgbColor {
  const t = Math.max(0, Math.min(1, ratio))
  return {
    r: clampColor(a.r + (b.r - a.r) * t),
    g: clampColor(a.g + (b.g - a.g) * t),
    b: clampColor(a.b + (b.b - a.b) * t),
  }
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
  const base = hexToRgb(PROJECT_BASE_BG) ?? { r: 231, g: 231, b: 232 }
  return rgbToHex(mixColor(base, pastel, 0.58))
}

async function extractPastelFromImage(sourceUrl: string): Promise<string | null> {
  const source = sourceUrl.trim()
  const src = isLocalImageToken(source)
    ? await resolveLocalImageToObjectUrl(source)
    : source
  if (!src) return null

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.crossOrigin = 'anonymous'
    element.decoding = 'async'
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('image-load-error'))
    element.src = src
  }).catch(() => null)

  if (!image) return null

  const size = 28
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  try {
    context.drawImage(image, 0, 0, size, size)
    const data = context.getImageData(0, 0, size, size).data
    let count = 0
    let r = 0
    let g = 0
    let b = 0

    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3]
      if (alpha < 18) continue
      r += data[index]
      g += data[index + 1]
      b += data[index + 2]
      count += 1
    }

    if (count === 0) return null
    return createPastelFromRgb({
      r: r / count,
      g: g / count,
      b: b / count,
    })
  } catch {
    return null
  } finally {
    if (src.startsWith('blob:')) {
      URL.revokeObjectURL(src)
    }
  }
}

function normalizeMediaKey(value: string): string {
  return value
    .trim()
    .split('#')[0]
    .split('?')[0]
    .replace(/\\/g, '/')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function normalizeProjectKey(value: string | undefined): string {
  if (!value) return ''
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function projectKeyVariants(value: string | undefined): Set<string> {
  const normalized = normalizeProjectKey(value)
  const slugified = slugifyProjectValue(value)
  const variants = new Set<string>([normalized, slugified].filter(Boolean))
  if (normalized.startsWith('projet-')) {
    variants.add(`project-${normalized.slice('projet-'.length)}`)
  }
  if (slugified.startsWith('projet-')) {
    variants.add(`project-${slugified.slice('projet-'.length)}`)
  }
  if (normalized.startsWith('project-')) {
    variants.add(`projet-${normalized.slice('project-'.length)}`)
  }
  if (slugified.startsWith('project-')) {
    variants.add(`projet-${slugified.slice('project-'.length)}`)
  }
  return variants
}

function projectRouteKeyVariants(project: ProjectType): Set<string> {
  const variants = new Set<string>()
  const seeds = [
    project.id,
    project.client,
    `${project.client}-${project.title}`,
    `${project.client}-${project.year}`,
    project.title,
  ]
  seeds.forEach(seed => {
    projectKeyVariants(seed).forEach(value => variants.add(value))
  })
  return variants
}

function InteractiveVideoFrame({
  source,
  title,
  index,
  mediaIndex,
  projectId,
  options,
  autoplay,
  aspectRatio,
  isMobile,
  lang,
}: {
  source: string
  title: string
  index: number
  mediaIndex: number
  projectId: string
  options: ProjectType['videoOptions']
  autoplay: boolean
  aspectRatio?: MediaAspectRatio
  isMobile: boolean
  lang: LanguageCode
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovered, setHovered] = useState(false)
  const [isPlaying, setIsPlaying] = useState(Boolean(autoplay))
  const [hasLoadError, setHasLoadError] = useState(false)
  const [isResolvingSource, setIsResolvingSource] = useState(false)
  const [resolvedSource, setResolvedSource] = useState(source.trim())
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 })
  const sourceValue = source.trim()
  const objectUrlRef = useRef<string | null>(null)
  const isLocalToken = isLocalVideoToken(sourceValue)
  const sourceCandidates = useMemo(
    () => buildVideoCandidates(sourceValue, projectId, mediaIndex),
    [sourceValue, projectId, mediaIndex]
  )
  const playableSource = resolvedSource.trim()
  const isNative = isLocalToken || canAttemptNativeVideo(playableSource)
  const isEmbeddedLink = useMemo(() => isKnownEmbeddedVideoUrl(sourceValue), [sourceValue])
  const inferredRatio = inferAspectFromSource(source)
  const preferredRatio = aspectRatio ?? options.aspectRatio
  const ratio = preferredRatio === 'original'
    ? inferredRatio
    : (preferredRatio === '16 / 9' && inferredRatio === '9 / 16'
      ? '9 / 16'
      : preferredRatio)
  const ratioValue = ratio === '16 / 9'
    ? 16 / 9
    : ratio === '4 / 5'
      ? 4 / 5
      : ratio === '1 / 1'
        ? 1
        : 9 / 16
  const maxHeight = isMobile ? '84svh' : '72vh'
  const computedMaxWidth = `calc(${maxHeight} * ${ratioValue})`

  useEffect(() => {
    setCandidateIndex(0)
  }, [sourceValue])

  useEffect(() => {
    const revokePrevious = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }

    let canceled = false
    setHasLoadError(false)
    revokePrevious()

    if (!sourceValue) {
      setResolvedSource('')
      setIsResolvingSource(false)
      return () => {
        canceled = true
        revokePrevious()
      }
    }

    if (!isLocalToken) {
      setResolvedSource(sourceCandidates[candidateIndex] ?? sourceValue)
      setIsResolvingSource(false)
      return () => {
        canceled = true
        revokePrevious()
      }
    }

    setIsResolvingSource(true)
    setResolvedSource('')

    void resolveLocalVideoToObjectUrl(sourceValue)
      .then(url => {
        if (canceled) {
          if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
          return
        }
        if (!url) {
          setHasLoadError(true)
          setIsResolvingSource(false)
          return
        }
        objectUrlRef.current = url.startsWith('blob:') ? url : null
        setResolvedSource(url)
        setIsResolvingSource(false)
      })
      .catch(() => {
        if (canceled) return
        if (sourceCandidates.length > 0) {
          setResolvedSource(sourceCandidates[candidateIndex] ?? '')
          setHasLoadError(false)
        } else {
          setHasLoadError(true)
        }
        setIsResolvingSource(false)
      })

    return () => {
      canceled = true
      revokePrevious()
    }
  }, [candidateIndex, isLocalToken, sourceCandidates, sourceValue])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !playableSource || !isNative || hasLoadError || isResolvingSource) return

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    setIsPlaying(!video.paused)

    if (autoplay) {
      const maybePromise = video.play()
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {})
      }
    }

    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
    }
  }, [autoplay, hasLoadError, isNative, isResolvingSource, playableSource])

  const onTogglePlay = () => {
    if (!playableSource || !isNative || hasLoadError || isResolvingSource) return
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      const maybePromise = video.play()
      if (maybePromise && typeof maybePromise.catch === 'function') {
        maybePromise.catch(() => {})
      }
    } else {
      video.pause()
    }
  }

  return (
    <div
      data-cursor={isNative && !isResolvingSource && !hasLoadError && !isMobile ? 'hide' : undefined}
      onClick={onTogglePlay}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={e => {
        if (isMobile) return
        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
        setCursorPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
      }}
      style={{
        width: '100%',
        aspectRatio: ratio,
        maxHeight: isMobile ? maxHeight : (ratio === '16 / 9' ? '68vh' : maxHeight),
        background: '#0a0a0a',
        overflow: 'hidden',
        borderRadius: '12px',
        minHeight: isMobile ? '72svh' : '320px',
        maxWidth: isMobile ? '100%' : `min(100%, ${computedMaxWidth})`,
        position: 'relative',
      }}
    >
      {isResolvingSource ? (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.62)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', padding: '0 20px' }}>
          {lang === 'en' ? 'Loading local video…' : 'Chargement vidéo locale…'}
        </div>
      ) : isNative && !hasLoadError ? (
        <video
          ref={videoRef}
          src={playableSource}
          style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#0a0a0a' }}
          autoPlay={autoplay}
          muted
          playsInline
          loop={options.loop}
          controls={false}
          preload={autoplay ? 'metadata' : 'none'}
          disablePictureInPicture
          disableRemotePlayback
          controlsList="nodownload noplaybackrate noremoteplayback nofullscreen"
          onContextMenu={e => e.preventDefault()}
          onError={() => {
            if (isLocalToken) {
              if (candidateIndex < sourceCandidates.length - 1) {
                setCandidateIndex(candidateIndex + 1)
                setResolvedSource(sourceCandidates[candidateIndex + 1] ?? '')
                return
              }
              setHasLoadError(true)
              return
            }
            if (candidateIndex < sourceCandidates.length - 1) {
              setCandidateIndex(candidateIndex + 1)
              return
            }
            setHasLoadError(true)
          }}
          onLoadedData={() => setHasLoadError(false)}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: 'rgba(255,255,255,0.62)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', padding: '0 20px' }}>
          {isLocalToken || sourceValue.startsWith('blob:')
            ? (lang === 'en'
              ? 'Local file expired. Upload the video again in /content.'
              : 'Le fichier local a expiré. Retéléverse la vidéo dans /content.')
            : isEmbeddedLink
              ? (lang === 'en'
                ? 'YouTube/Vimeo link detected. Use a direct video URL (.mp4, .webm, .ogg, .mov).'
                : 'Lien YouTube/Vimeo détecté. Utilise une URL vidéo directe (.mp4, .webm, .ogg, .mov).')
              : (lang === 'en'
                ? 'Invalid or unreachable video URL. Check the direct file URL.'
                : 'URL vidéo invalide ou inaccessible. Vérifie le lien direct du fichier.')}
        </div>
      )}

      {isNative && !isResolvingSource && !hasLoadError && hovered && !isMobile && (
        <div
          style={{
            position: 'absolute',
            left: cursorPosition.x,
            top: cursorPosition.y,
            transform: 'translate(-50%, -50%)',
            width: 62,
            height: 62,
            borderRadius: '50%',
            border: '1.6px solid rgba(255,255,255,0.7)',
            background: 'rgba(12, 14, 18, 0.28)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            display: 'grid',
            placeItems: 'center',
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {isPlaying ? (
            <span style={{ display: 'inline-flex', gap: 4 }}>
              <span style={{ width: 3, height: 14, background: 'rgba(255,255,255,0.95)', borderRadius: 2 }} />
              <span style={{ width: 3, height: 14, background: 'rgba(255,255,255,0.95)', borderRadius: 2 }} />
            </span>
          ) : (
            <span style={{
              width: 0,
              height: 0,
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              borderLeft: '11px solid rgba(255,255,255,0.95)',
              marginLeft: '2px',
            }} />
          )}
        </div>
      )}
    </div>
  )
}

export default function Project() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const content = useSiteContent()
  const lang = getStoredLanguage()
  const isMobile = useIsMobile()
  const { projects } = content
  const displayFont = getDisplayFontFamily(content.design.displayFont)
  const displayWeight = getDisplayFontWeight(content.design.displayFont, content.design.displayWeight)
  const displaySizeScale = getDisplaySizeScale(content.design.displaySize)
  const displayLetterSpacing = `${getDisplayLetterSpacing(content.design.displayLetterSpacing)}em`
  const displayWordSpacing = `${getDisplayWordSpacing(content.design.displayWordSpacing)}em`
  const displayLineHeight = getDisplayLineHeight(content.design.displayLineHeight)
  const displayCase = content.design.displayCase
  const displayEmphasis = content.design.displayEmphasis
  const contactEmail = content.contact.email?.trim() || 'contact@instories.fr'
  const isNight = content.design.colorMode === 'night'
  const mutedLabelColor = isNight ? 'var(--night-soft-muted)' : 'rgba(10,10,10,0.3)'
  const subtleMetaColor = isNight ? 'var(--night-muted)' : 'rgba(10,10,10,0.4)'
  const readableBodyColor = isNight ? 'rgba(236,231,222,0.84)' : 'rgba(10,10,10,0.7)'
  const readableBodySoftColor = isNight ? 'rgba(236,231,222,0.78)' : 'rgba(10,10,10,0.55)'
  const chipTextColor = isNight ? 'rgba(236,231,222,0.86)' : 'rgba(10,10,10,0.5)'
  const chipBorderColor = isNight ? 'rgba(186,210,246,0.42)' : 'rgba(10,10,10,0.1)'
  const chipBackground = isNight ? 'rgba(186,210,246,0.08)' : 'transparent'
  const publishedProjects = projects
    .filter(project => project.status === 'published')
    .sort((a, b) => a.order - b.order)
  const idCandidates = projectKeyVariants(id)
  const projectIndex = publishedProjects.findIndex(p => {
    const projectCandidates = projectRouteKeyVariants(p)
    for (const key of projectCandidates) {
      if (idCandidates.has(key)) return true
    }
    return false
  })
  const project = projectIndex >= 0 ? publishedProjects[projectIndex] : undefined
  const nextProject = projectIndex >= 0 ? publishedProjects[(projectIndex + 1) % publishedProjects.length] : null
  const [heroBackground, setHeroBackground] = useState<string>(PROJECT_BASE_BG)
  const [viewedProjectCount, setViewedProjectCount] = useState(0)
  const [pdfReminderDismissed, setPdfReminderDismissed] = useState(false)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const heroSectionRef = useRef<HTMLElement | null>(null)
  const [isBriefOpen, setIsBriefOpen] = useState(false)
  const [briefNeed, setBriefNeed] = useState('')
  const [briefBudget, setBriefBudget] = useState<'tbd' | '1' | '2' | '3' | '4'>('tbd')
  const [briefTimeline, setBriefTimeline] = useState<'1' | '2' | '3' | '4'>('2')
  const pdfReminder = content.pdfReminder
  const pdfReminderThreshold = Math.max(1, Math.min(12, Math.round(pdfReminder.triggerProjectViews || 3)))
  const pdfReminderUrl = pdfReminder.pdfUrl.trim()
  const shouldShowPdfReminder = (
    Boolean(project)
    && pdfReminder.isEnabled
    && Boolean(pdfReminderUrl)
    && viewedProjectCount >= pdfReminderThreshold
    && !pdfReminderDismissed
  )
  const similarProjectSubject = encodeURIComponent(
    lang === 'en'
      ? `Project request inspired by ${project?.client ?? 'InStories'} — ${project?.title ?? ''}`.trim()
      : `Demande de projet inspiree de ${project?.client ?? 'InStories'} — ${project?.title ?? ''}`.trim()
  )
  const similarProjectBody = encodeURIComponent(
    lang === 'en'
      ? `Hello InStories,\n\nI would like a project in the spirit of "${project?.client ?? ''} — ${project?.title ?? ''}".\n\nNeed:\nTimeline:\nBudget range:\n\nThanks.`
      : `Bonjour InStories,\n\nJe souhaite un projet dans l'esprit de "${project?.client ?? ''} — ${project?.title ?? ''}".\n\nBesoin :\nDelai :\nBudget :\n\nMerci.`
  )
  const similarProjectMailto = `mailto:${contactEmail}?subject=${similarProjectSubject}&body=${similarProjectBody}`
  const briefMailto = `mailto:${contactEmail}?subject=${encodeURIComponent(
    lang === 'en'
      ? `Qualified brief — ${project?.client ?? 'InStories'} — ${project?.title ?? ''}`.trim()
      : `Brief qualifie — ${project?.client ?? 'InStories'} — ${project?.title ?? ''}`.trim()
  )}&body=${encodeURIComponent(
    lang === 'en'
      ? [
        'Hello InStories,',
        '',
        `Reference project: ${project?.client ?? ''} — ${project?.title ?? ''}`,
        `Need: ${briefNeed || '-'}`,
        `Budget: ${t(lang, `project.cta.brief.budget.${briefBudget}`)}`,
        `Timeline: ${t(lang, `project.cta.brief.timeline.${briefTimeline}`)}`,
        '',
        'Thanks.',
      ].join('\n')
      : [
        'Bonjour InStories,',
        '',
        `Projet de reference : ${project?.client ?? ''} — ${project?.title ?? ''}`,
        `Besoin : ${briefNeed || '-'}`,
        `Budget : ${t(lang, `project.cta.brief.budget.${briefBudget}`)}`,
        `Delai : ${t(lang, `project.cta.brief.timeline.${briefTimeline}`)}`,
        '',
        'Merci.',
      ].join('\n')
  )}`

  useEffect(() => {
    if (!project || !id) return
    const current = slugifyProjectValue(id)
    const canonical = slugifyProjectValue(getProjectRoutePath(project).split('/').pop() ?? '')
    if (!current || !canonical || current === canonical) return
    navigate(getProjectRoutePath(project), { replace: true })
  }, [id, navigate, project])

  useEffect(() => {
    setIsBriefOpen(false)
    setBriefNeed('')
    setBriefBudget('tbd')
    setBriefTimeline('2')
  }, [project?.id])
  const galleryImageBlocks = project
    ? (() => {
      const sourceBlocks = project.imageBlocks?.length
        ? project.imageBlocks
        : [{
          id: 'block-1',
          images: project.images,
          imageAspectRatios: project.imageAspectRatios ?? [],
        }]

      const coverKey = normalizeMediaKey(project.cover ?? '')
      const seen = new Set<string>()
      let globalIndex = 0

      return sourceBlocks
        .map(block => {
          const items = (block.images ?? [])
            .map((image, index) => ({
              url: image,
              aspectRatio: sanitizeImageAspectRatio(block.imageAspectRatios?.[index]),
            }))
            .filter(item => {
              const key = normalizeMediaKey(item.url)
              if (!key) return false
              if (coverKey && key === coverKey) return false
              if (seen.has(key)) return false
              seen.add(key)
              return true
            })
            .map(item => {
              const mediaIndex = globalIndex
              globalIndex += 1
              return { ...item, mediaIndex }
            })

          return {
            id: block.id,
            items,
          }
        })
        .filter(block => block.items.length > 0)
    })()
    : []
  const galleryImages = galleryImageBlocks.flatMap(block => block.items)
  const videoItems = project
    ? (project.videoUrls?.length ? project.videoUrls : (project.videoUrl ? [project.videoUrl] : []))
      .filter(Boolean)
      .map((url, index) => ({
        url,
        mediaIndex: index,
        placement: project.videoPlacements?.[index] ?? 'full',
        aspectRatio: project.videoAspectRatios?.[index] ?? project.videoOptions.aspectRatio ?? '16 / 9',
        autoplay: typeof project.videoAutoplay?.[index] === 'boolean'
          ? Boolean(project.videoAutoplay?.[index])
          : project.videoOptions.autoplay,
      }))
    : []

  // Force full reset on project switch (window + inner snap containers),
  // so mobile always lands on the hero/title and reveal is visible.
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0

    document.querySelectorAll<HTMLElement>('.project-video-mobile-snap').forEach(container => {
      container.scrollTop = 0
    })

    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      heroSectionRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
  }, [id])

  useEffect(() => {
    if (!project) return
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(PROJECT_VIEW_HISTORY_LEGACY_KEY)
    }
    const count = trackViewedProject(project.id)
    setViewedProjectCount(count)
    setPdfReminderDismissed(false)
  }, [project?.id])

  useEffect(() => {
    let cancelled = false
    setHeroBackground(PROJECT_BASE_BG)
    document.documentElement.style.setProperty('--project-hero-bg', PROJECT_BASE_BG)

    const coverUrl = project?.cover?.trim() ?? ''
    if (!coverUrl) return () => { cancelled = true }

    void extractPastelFromImage(coverUrl)
      .then(color => {
        if (cancelled || !color) return
        setHeroBackground(color)
        document.documentElement.style.setProperty('--project-hero-bg', color)
      })
      .catch(() => {})

    return () => {
      cancelled = true
      document.documentElement.style.removeProperty('--project-hero-bg')
    }
  }, [project?.cover, project?.color])

  if (!project) {
    return (
      <main className="site-themed" style={{ paddingTop: '120px', textAlign: 'center', padding: isMobile ? '150px 20px' : '200px 48px' }}>
        <Seo
          title={lang === 'en' ? 'Project not found — InStories' : 'Projet introuvable — InStories'}
          description={lang === 'en' ? 'This project does not exist or is no longer available.' : "Ce projet n'existe pas ou n'est plus disponible."}
          path={`/projects/${id ?? ''}`}
          noindex
        />
        <p>{t(lang, 'project.notFound')}</p>
        <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
          <ArrowIcon direction="left" size={11} strokeWidth={1.8} />
          {t(lang, 'project.back')}
        </Link>
      </main>
    )
  }

  const coverFocusX = sanitizeCoverFocus(project.coverFocalPoint?.x)
  const coverFocusY = sanitizeCoverFocus(project.coverFocalPoint?.y)

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
        title={`${project.client} — ${project.title} | InStories`}
        description={project.description}
        path={getProjectRoutePath(project)}
        image={project.cover || '/InStories-logo-BOT.png'}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: `${project.client} — ${project.title}`,
          headline: project.title,
          datePublished: project.year,
          creator: { '@type': 'Organization', name: 'InStories' },
          image: ([project.cover, ...galleryImages.map(item => item.url)].filter(Boolean)),
          description: project.description,
          keywords: project.category.join(', '),
        }}
      />
      {/* Hero */}
      <section
        ref={heroSectionRef}
        className="night-surface-soft"
        style={{ paddingTop: isMobile ? '176px' : '200px', paddingBottom: isMobile ? '36px' : '60px', paddingLeft: isMobile ? '20px' : '48px', paddingRight: isMobile ? '20px' : '48px', background: heroBackground }}
      >
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: subtleMetaColor }}>
            {project.client} · {project.year}
          </span>
        </div>
        <TextReveal key={project.id} as="h1" delay={100}>
          <span style={{
            fontFamily: 'var(--display-font)',
            fontSize: 'calc(clamp(48px, 8vw, 120px) * var(--display-size-scale))',
            fontWeight: 'var(--display-weight)',
            letterSpacing: 'var(--display-letter-spacing)',
            wordSpacing: 'var(--display-word-spacing)',
            lineHeight: 'var(--display-line-height)',
            display: 'block',
          }}>
            <DisplayText text={project.title} caseMode={displayCase} emphasisMode={displayEmphasis} />
          </span>
        </TextReveal>
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          {project.category.map(cat => (
            <span key={cat} style={{
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: chipTextColor,
              padding: '4px 12px',
              border: `1px solid ${chipBorderColor}`,
              background: chipBackground,
              borderRadius: '2px',
            }}>{cat}</span>
          ))}
        </div>
      </section>

      {/* Cover placeholder */}
      <div style={{ height: '60vh', background: heroBackground, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {project.cover ? (
          <ResolvedImage
            src={project.cover}
            projectId={project.id}
            mediaKind="cover"
            alt={project.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${coverFocusX}% ${coverFocusY}%` }}
          />
        ) : (
          <span style={{ fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', color: mutedLabelColor }}>
            {t(lang, 'project.visualPending')}
          </span>
        )}
      </div>

      {/* Content */}
      <section className="night-surface" style={{ padding: isMobile ? '56px 20px' : '80px 48px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '36px' : '80px' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedLabelColor, marginBottom: '20px' }}>
            {t(lang, 'project.section.project')}
          </div>
          <p data-cursor="quiet" style={{ fontSize: '18px', lineHeight: 1.8, color: readableBodyColor, fontWeight: 300 }}>
            {project.description}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Brief */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedLabelColor, marginBottom: '12px' }}>
              {t(lang, 'project.section.brief')}
            </div>
            <p data-cursor="quiet" style={{ fontSize: '14px', lineHeight: 1.8, color: readableBodySoftColor, fontWeight: 300 }}>
              {project.brief}
            </p>
          </div>

          {/* Deliverables */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedLabelColor, marginBottom: '12px' }}>
              {t(lang, 'project.section.deliverables')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {project.deliverables.map(d => (
                <span key={d} style={{
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  color: chipTextColor,
                  padding: '5px 12px',
                  border: `1px solid ${chipBorderColor}`,
                  background: chipBackground,
                  borderRadius: '2px',
                }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Agencies */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedLabelColor, marginBottom: '12px' }}>
              {t(lang, 'project.section.with')}
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {project.agencies.map(a => (
                <span key={a} style={{ fontSize: '14px', color: readableBodySoftColor, fontWeight: 300 }}>{a}</span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href={similarProjectMailto}
                className="project-similar-cta"
                onClick={() => {
                  trackEvent('lead_similar_project_click', {
                    source: 'project_page',
                    project_id: project?.id ?? '',
                    project_client: project?.client ?? '',
                    project_title: project?.title ?? '',
                    language: lang,
                  })
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  border: `1px solid ${chipBorderColor}`,
                  borderRadius: '999px',
                  padding: '11px 16px',
                  textDecoration: 'none',
                  color: chipTextColor,
                  background: chipBackground,
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                <span>{t(lang, 'project.cta.similar')}</span>
                <ArrowIcon direction="right" size={14} strokeWidth={1.8} />
              </a>
              <button
                type="button"
                onClick={() => setIsBriefOpen(v => !v)}
                style={{
                  border: `1px solid ${chipBorderColor}`,
                  borderRadius: '999px',
                  padding: '11px 16px',
                  color: chipTextColor,
                  background: chipBackground,
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                {isBriefOpen ? t(lang, 'project.cta.brief.close') : t(lang, 'project.cta.brief.title')}
              </button>
            </div>
            <p style={{ marginTop: '10px', fontSize: '12px', color: readableBodySoftColor }}>
              {t(lang, 'project.cta.note')}
            </p>
            {isBriefOpen && (
              <div style={{ marginTop: '12px', display: 'grid', gap: '10px', maxWidth: '640px' }}>
                <label style={{ display: 'grid', gap: '6px' }}>
                  <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: mutedLabelColor }}>
                    {t(lang, 'project.cta.brief.need')}
                  </span>
                  <textarea
                    value={briefNeed}
                    onChange={e => setBriefNeed(e.target.value)}
                    rows={3}
                    placeholder={t(lang, 'project.cta.brief.needPlaceholder')}
                    style={{ border: `1px solid ${chipBorderColor}`, borderRadius: '12px', padding: '12px 14px', font: 'inherit', resize: 'vertical', background: chipBackground, color: chipTextColor }}
                  />
                </label>
                <div style={{ display: 'grid', gap: '10px', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: mutedLabelColor }}>
                      {t(lang, 'project.cta.brief.budget')}
                    </span>
                    <select
                      value={briefBudget}
                      onChange={e => setBriefBudget(e.target.value as 'tbd' | '1' | '2' | '3' | '4')}
                      style={{ border: `1px solid ${chipBorderColor}`, borderRadius: '12px', padding: '10px 36px 10px 14px', font: 'inherit', background: chipBackground, color: chipTextColor, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='${isNight ? '%23bcd2e6' : '%231a1a1a'}' stroke-opacity='${isNight ? '0.5' : '0.35'}' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
                    >
                      <option value="tbd">{t(lang, 'project.cta.brief.budget.tbd')}</option>
                      <option value="1">{t(lang, 'project.cta.brief.budget.1')}</option>
                      <option value="2">{t(lang, 'project.cta.brief.budget.2')}</option>
                      <option value="3">{t(lang, 'project.cta.brief.budget.3')}</option>
                      <option value="4">{t(lang, 'project.cta.brief.budget.4')}</option>
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: '6px' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: mutedLabelColor }}>
                      {t(lang, 'project.cta.brief.timeline')}
                    </span>
                    <select
                      value={briefTimeline}
                      onChange={e => setBriefTimeline(e.target.value as '1' | '2' | '3' | '4')}
                      style={{ border: `1px solid ${chipBorderColor}`, borderRadius: '12px', padding: '10px 36px 10px 14px', font: 'inherit', background: chipBackground, color: chipTextColor, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='7' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='${isNight ? '%23bcd2e6' : '%231a1a1a'}' stroke-opacity='${isNight ? '0.5' : '0.35'}' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center' }}
                    >
                      <option value="1">{t(lang, 'project.cta.brief.timeline.1')}</option>
                      <option value="2">{t(lang, 'project.cta.brief.timeline.2')}</option>
                      <option value="3">{t(lang, 'project.cta.brief.timeline.3')}</option>
                      <option value="4">{t(lang, 'project.cta.brief.timeline.4')}</option>
                    </select>
                  </label>
                </div>
                <a
                  href={briefMailto}
                  onClick={() => {
                    trackEvent('lead_brief_send_click', {
                      source: 'project_page',
                      project_id: project?.id ?? '',
                      project_client: project?.client ?? '',
                      project_title: project?.title ?? '',
                      language: lang,
                      brief_budget: briefBudget,
                      brief_timeline: briefTimeline,
                      brief_has_need: Boolean(briefNeed.trim()),
                    })
                  }}
                  style={{
                    justifySelf: 'start',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    border: `1px solid ${chipBorderColor}`,
                    borderRadius: '999px',
                    padding: '11px 16px',
                    textDecoration: 'none',
                    color: chipTextColor,
                    background: chipBackground,
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  <span>{t(lang, 'project.cta.brief.send')}</span>
                  <ArrowIcon direction="right" size={14} strokeWidth={1.8} />
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {galleryImages.length > 0 && (
        <section className="night-surface" style={{ padding: isMobile ? '0 20px 56px' : '0 48px 80px', display: 'grid', gap: '24px' }}>
          {galleryImageBlocks.map((block, blockIndex) => (
            <div
              key={block.id || `image-block-${blockIndex}`}
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile
                  ? '1fr'
                  : `repeat(${Math.max(1, block.items.length)}, minmax(0, 1fr))`,
                gap: '24px',
                alignItems: 'start',
              }}
            >
              {block.items.map((image, index) => (
                <div key={`${image.url}-${index}`} style={{ aspectRatio: image.aspectRatio, background: heroBackground, overflow: 'hidden' }}>
                  <ResolvedImage
                    src={image.url}
                    projectId={project.id}
                    mediaKind="image"
                    mediaIndex={image.mediaIndex}
                    alt={`${project.title} ${image.mediaIndex + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {/* Next project */}
      {videoItems.length > 0 && (
        <section className="night-surface" style={{ padding: isMobile ? '0 20px 56px' : '0 48px 80px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedLabelColor, marginBottom: '16px' }}>
            {t(lang, 'project.section.film')}
          </div>
          <div
            className={isMobile ? 'project-video-mobile-snap' : undefined}
            style={{ display: 'grid', gap: '24px' }}
          >
            {(() => {
              type VideoItem = {
                url: string
                mediaIndex: number
                placement: 'full' | 'left' | 'right' | 'grid'
                aspectRatio: MediaAspectRatio
                autoplay: boolean
              }
              type VideoBlock =
                | { type: 'full'; item: VideoItem }
                | { type: 'grid'; items: VideoItem[] }
                | { type: 'side-row'; left?: VideoItem; right?: VideoItem }

              const blocks: VideoBlock[] = []
              const sideBuffer: VideoItem[] = []

              const flushSideBuffer = () => {
                if (sideBuffer.length === 0) return
                let current: { left?: VideoItem; right?: VideoItem } = {}

                sideBuffer.forEach(item => {
                  const preferred = item.placement === 'right' ? 'right' : 'left'
                  const alternate = preferred === 'left' ? 'right' : 'left'

                  if (!current[preferred]) {
                    current[preferred] = item
                  } else if (!current[alternate]) {
                    current[alternate] = item
                  } else {
                    blocks.push({ type: 'side-row', left: current.left, right: current.right })
                    current = { [preferred]: item }
                  }

                  if (current.left && current.right) {
                    blocks.push({ type: 'side-row', left: current.left, right: current.right })
                    current = {}
                  }
                })

                if (current.left || current.right) {
                  blocks.push({ type: 'side-row', left: current.left, right: current.right })
                }
                sideBuffer.length = 0
              }

              videoItems.forEach(item => {
                if (item.placement === 'grid') {
                  flushSideBuffer()
                  const last = blocks[blocks.length - 1]
                  if (last && last.type === 'grid') {
                    last.items.push(item)
                  } else {
                    blocks.push({ type: 'grid', items: [item] })
                  }
                } else if (item.placement === 'full') {
                  flushSideBuffer()
                  blocks.push({ type: 'full', item })
                } else {
                  sideBuffer.push(item)
                }
              })
              flushSideBuffer()

              return blocks.map((block, blockIndex) => {
                if (block.type === 'full') {
                  return (
                    <div
                      key={`video-full-${blockIndex}`}
                      className={isMobile ? 'project-video-snap-item' : undefined}
                      style={{ width: '100%', display: 'grid', justifyItems: 'center' }}
                    >
                      <InteractiveVideoFrame
                        source={block.item.url}
                        title={project.title}
                        index={blockIndex}
                        mediaIndex={block.item.mediaIndex}
                        projectId={project.id}
                        options={project.videoOptions}
                        autoplay={block.item.autoplay}
                        aspectRatio={block.item.aspectRatio}
                        isMobile={isMobile}
                        lang={lang}
                      />
                    </div>
                  )
                }

                if (block.type === 'grid') {
                  const orientationValues = block.items.map(item => aspectToNumeric(item.aspectRatio, item.url))
                  const verticalOnly = orientationValues.every(value => value < 1)
                  const horizontalOnly = orientationValues.every(value => value >= 1)
                  const columns = isMobile ? 1 : (verticalOnly ? Math.min(3, block.items.length) : (horizontalOnly ? Math.min(2, block.items.length) : 2))
                  const singleVertical = !isMobile && block.items.length === 1 && orientationValues[0] < 1
                  return (
                    <div
                      key={`video-grid-${blockIndex}`}
                      className={isMobile ? 'project-video-snap-item' : undefined}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                        gap: isMobile ? '16px' : '20px',
                        alignItems: 'start',
                        justifyItems: singleVertical ? 'center' : 'stretch',
                      }}
                    >
                      {block.items.map((item, itemIndex) => (
                        <div
                          key={`${item.url}-${itemIndex}`}
                          style={singleVertical
                            ? { gridColumn: '1 / -1', display: 'grid', justifyItems: 'center', width: 'min(34vw, 420px)' }
                            : undefined}
                        >
                          <InteractiveVideoFrame
                            source={item.url}
                            title={project.title}
                            index={blockIndex * 100 + itemIndex}
                            mediaIndex={item.mediaIndex}
                            projectId={project.id}
                            options={project.videoOptions}
                            autoplay={item.autoplay}
                            aspectRatio={item.aspectRatio}
                            isMobile={isMobile}
                            lang={lang}
                          />
                        </div>
                      ))}
                    </div>
                  )
                }

                if (isMobile) {
                  if (block.left && !block.right) {
                    return (
                      <div
                        key={`video-side-mobile-left-${blockIndex}`}
                        className="project-video-snap-item"
                        style={{ width: '100%', display: 'grid', justifyItems: 'center' }}
                      >
                        <InteractiveVideoFrame
                          source={block.left.url}
                          title={project.title}
                          index={blockIndex * 10 + 1}
                          mediaIndex={block.left.mediaIndex}
                          projectId={project.id}
                          options={project.videoOptions}
                          autoplay={block.left.autoplay}
                          aspectRatio={block.left.aspectRatio}
                          isMobile={isMobile}
                          lang={lang}
                        />
                      </div>
                    )
                  }

                  if (block.right && !block.left) {
                    return (
                      <div
                        key={`video-side-mobile-right-${blockIndex}`}
                        className="project-video-snap-item"
                        style={{ width: '100%', display: 'grid', justifyItems: 'center' }}
                      >
                        <InteractiveVideoFrame
                          source={block.right.url}
                          title={project.title}
                          index={blockIndex * 10 + 2}
                          mediaIndex={block.right.mediaIndex}
                          projectId={project.id}
                          options={project.videoOptions}
                          autoplay={block.right.autoplay}
                          aspectRatio={block.right.aspectRatio}
                          isMobile={isMobile}
                          lang={lang}
                        />
                      </div>
                    )
                  }

                  return (
                    <div key={`video-side-mobile-${blockIndex}`} className="project-video-snap-item" style={{ display: 'grid', gap: '16px' }}>
                      {block.left ? (
                        <div style={{ width: '100%', display: 'grid', justifyItems: 'center' }}>
                          <InteractiveVideoFrame
                            source={block.left.url}
                            title={project.title}
                            index={blockIndex * 10 + 1}
                            mediaIndex={block.left.mediaIndex}
                            projectId={project.id}
                            options={project.videoOptions}
                            autoplay={block.left.autoplay}
                            aspectRatio={block.left.aspectRatio}
                            isMobile={isMobile}
                            lang={lang}
                          />
                        </div>
                      ) : null}
                      {block.right ? (
                        <div style={{ width: '100%', display: 'grid', justifyItems: 'center' }}>
                          <InteractiveVideoFrame
                            source={block.right.url}
                            title={project.title}
                            index={blockIndex * 10 + 2}
                            mediaIndex={block.right.mediaIndex}
                            projectId={project.id}
                            options={project.videoOptions}
                            autoplay={block.right.autoplay}
                            aspectRatio={block.right.aspectRatio}
                            isMobile={isMobile}
                            lang={lang}
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                }

                if (block.left && !block.right) {
                  return (
                    <div key={`video-side-desktop-left-${blockIndex}`} style={{ width: '100%', display: 'grid', justifyItems: 'start' }}>
                      <InteractiveVideoFrame
                        source={block.left.url}
                        title={project.title}
                        index={blockIndex * 10 + 1}
                        mediaIndex={block.left.mediaIndex}
                        projectId={project.id}
                        options={project.videoOptions}
                        autoplay={block.left.autoplay}
                        aspectRatio={block.left.aspectRatio}
                        isMobile={isMobile}
                        lang={lang}
                      />
                    </div>
                  )
                }

                if (block.right && !block.left) {
                  return (
                    <div key={`video-side-desktop-right-${blockIndex}`} style={{ width: '100%', display: 'grid', justifyItems: 'end' }}>
                      <InteractiveVideoFrame
                        source={block.right.url}
                        title={project.title}
                        index={blockIndex * 10 + 2}
                        mediaIndex={block.right.mediaIndex}
                        projectId={project.id}
                        options={project.videoOptions}
                        autoplay={block.right.autoplay}
                        aspectRatio={block.right.aspectRatio}
                        isMobile={isMobile}
                        lang={lang}
                      />
                    </div>
                  )
                }

                return (
                  <div
                    key={`video-side-${blockIndex}`}
                    style={{
                      width: '100%',
                      display: 'grid',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 'min(100%, 980px)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, minmax(240px, 420px))',
                        gap: '20px',
                        justifyContent: 'center',
                        alignItems: 'start',
                      }}
                    >
                      <div style={{ width: '100%', display: 'grid', justifyItems: 'center' }}>
                        {block.left ? (
                          <InteractiveVideoFrame
                            source={block.left.url}
                            title={project.title}
                            index={blockIndex * 10 + 1}
                            mediaIndex={block.left.mediaIndex}
                            projectId={project.id}
                            options={project.videoOptions}
                            autoplay={block.left.autoplay}
                            aspectRatio={block.left.aspectRatio}
                            isMobile={isMobile}
                            lang={lang}
                          />
                        ) : null}
                      </div>
                      <div style={{ width: '100%', display: 'grid', justifyItems: 'center' }}>
                        {block.right ? (
                          <InteractiveVideoFrame
                            source={block.right.url}
                            title={project.title}
                            index={blockIndex * 10 + 2}
                            mediaIndex={block.right.mediaIndex}
                            projectId={project.id}
                            options={project.videoOptions}
                            autoplay={block.right.autoplay}
                            aspectRatio={block.right.aspectRatio}
                            isMobile={isMobile}
                            lang={lang}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </section>
      )}
 
      {nextProject && (
        <Link
          to={getProjectRoutePath(nextProject)}
          onClick={() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
            requestAnimationFrame(() => {
              window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
            })
          }}
          style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        >
          <section className="night-surface-soft" style={{
            padding: isMobile ? '24px 20px' : '80px 48px',
            margin: isMobile ? '0 16px 16px' : '0',
            background: heroBackground,
            borderRadius: isMobile ? '16px' : '0',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '12px' : '0',
            justifyContent: isMobile ? 'flex-start' : 'space-between',
            minHeight: isMobile ? '120px' : 'auto',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedLabelColor, marginBottom: isMobile ? '6px' : '12px' }}>
                {t(lang, 'project.next')}
              </div>
              <span style={{
                fontFamily: 'var(--display-font)',
                fontSize: isMobile
                  ? 'calc(clamp(22px, 6vw, 32px) * var(--display-size-scale))'
                  : 'calc(clamp(28px, 4vw, 56px) * var(--display-size-scale))',
                fontWeight: 'var(--display-weight)',
                letterSpacing: 'var(--display-letter-spacing)',
                wordSpacing: 'var(--display-word-spacing)',
                lineHeight: '1.1',
              }}>
                <DisplayText
                  text={`${nextProject.client} — ${nextProject.title}`}
                  caseMode={displayCase}
                  emphasisMode={displayEmphasis}
                />
              </span>
            </div>
            <span style={{
              color: mutedLabelColor,
              display: 'inline-flex',
              alignItems: 'center',
              flexShrink: 0,
              paddingLeft: isMobile ? '8px' : '0',
            }}>
              <ArrowIcon direction="right" size={isMobile ? 18 : 26} strokeWidth={1.8} />
            </span>
          </section>
        </Link>
      )}

      {shouldShowPdfReminder && (
        <aside className="project-pdf-reminder" role="status" aria-live="polite">
          <button
            type="button"
            className="project-pdf-reminder-close"
            aria-label={lang === 'en' ? 'Close' : 'Fermer'}
            onClick={() => {
              setPdfReminderDismissed(true)
            }}
          >
            ×
          </button>
          <div className="project-pdf-reminder-kicker">
            {lang === 'en'
              ? `${viewedProjectCount} projects viewed`
              : `${viewedProjectCount} projets consultés`}
          </div>
          <strong className="project-pdf-reminder-title">{pdfReminder.title}</strong>
          <p className="project-pdf-reminder-text">{pdfReminder.description}</p>
          <button
            type="button"
            className="project-pdf-reminder-cta"
            disabled={isPdfGenerating}
            onClick={async () => {
              if (isPdfGenerating) return
              setIsPdfGenerating(true)
              try {
                trackEvent('pdf_reminder_download_click', {
                  source: 'project_popup',
                  project_id: project?.id ?? '',
                  project_client: project?.client ?? '',
                  project_title: project?.title ?? '',
                  language: lang,
                  viewed_projects_count: viewedProjectCount,
                })
                await downloadPortfolioPdfLive(content, lang, pdfReminderUrl)
                setPdfReminderDismissed(true)
              } finally {
                setIsPdfGenerating(false)
              }
            }}
          >
            <span>{isPdfGenerating ? (lang === 'en' ? 'Generating...' : 'Génération...') : pdfReminder.ctaLabel}</span>
            <ArrowIcon direction="right" size={14} strokeWidth={1.8} />
          </button>
        </aside>
      )}
    </main>
  )
}
