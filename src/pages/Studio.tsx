import { useEffect, useMemo, useRef, useState, type DragEventHandler } from 'react'
import type { MediaAspectRatio, Project } from '../data/projects'
import { type SiteContent, type SocialLink } from '../data/defaultSiteContent'
import { cloneDefaultSiteContent, loadSiteContent, resetSiteContent, saveSiteContent } from '../lib/siteContent'
import {
  addCustomTranslations,
  autoTranslateText,
  getStoredLanguage,
  listenLanguageChange,
  localizeSiteContent,
  type LanguageCode,
} from '../lib/i18n'
import DisplayText from '../components/DisplayText'
import Seo from '../components/Seo'
import { isLocalVideoToken, resolveLocalVideoToObjectUrl, saveLocalVideo } from '../lib/localVideoStore'
import { isLocalImageToken, resolveLocalImageToObjectUrl, saveLocalImage } from '../lib/localImageStore'
import ResolvedImage from '../components/ResolvedImage'
import {
  DISPLAY_CASE_OPTIONS,
  DISPLAY_EMPHASIS_OPTIONS,
  DISPLAY_FONT_OPTIONS,
  DISPLAY_LETTER_SPACING_MAX,
  DISPLAY_LETTER_SPACING_MIN,
  DISPLAY_LINE_HEIGHT_MAX,
  DISPLAY_LINE_HEIGHT_MIN,
  DISPLAY_SIZE_MAX,
  DISPLAY_SIZE_MIN,
  DISPLAY_WORD_SPACING_MAX,
  DISPLAY_WORD_SPACING_MIN,
  getDisplayFontFamily,
  getDisplayLetterSpacing,
  getDisplayLineHeight,
  getDisplaySizeScale,
  getDisplayWordSpacing,
  getDisplayFontWeight,
  DISPLAY_WEIGHT_OPTIONS,
  type DisplayFontKey,
} from '../lib/typography'
import { generatePortfolioPdf } from '../lib/portfolioPdf'
import { buildBehanceExportPack } from '../lib/behanceExport'
import { clearTrackedEventsSnapshot, getTrackedEventsSnapshot } from '../lib/analytics'
import { getProjectRoutePath } from '../lib/projectRouting'
import JSZip from 'jszip'

type StudioSection = 'home' | 'about' | 'contact' | 'projects' | 'settings'
type VideoPlacement = 'full' | 'left' | 'right' | 'grid'
type ImageAspectRatio = Exclude<MediaAspectRatio, 'original'>
type VideoRow = { url: string; placement: VideoPlacement; aspectRatio: MediaAspectRatio; autoplay: boolean }
type ImageRow = { url: string; aspectRatio: ImageAspectRatio }
type ImageBlockRow = { id: string; rows: ImageRow[] }
type TranslationPath = Array<string | number>
type TranslationEntry = { path: TranslationPath; text: string }
type PublishStep = 'prepare' | 'upload' | 'snapshot' | 'done' | 'error'
type PublishProgress = { step: PublishStep; percent: number; label: string; detail: string }
type ConversionKpi = {
  similarClicks: number
  briefClicks: number
  pdfPopupClicks: number
  pdfMenuClicks: number
  total: number
  updatedAt: number
}

const IMAGE_ASPECT_RATIO_OPTIONS: Array<{ value: ImageAspectRatio; label: string }> = [
  { value: '16 / 9', label: 'Cinéma (16:9)' },
  { value: '4 / 5', label: 'Portrait (4:5)' },
  { value: '1 / 1', label: 'Carré (1:1)' },
  { value: '9 / 16', label: 'Format vertical (9:16)' },
]

const VIDEO_ASPECT_RATIO_OPTIONS: Array<{ value: MediaAspectRatio; label: string }> = [
  ...IMAGE_ASPECT_RATIO_OPTIONS,
  { value: 'original', label: 'Format original (auto)' },
]

const MAX_LOCAL_VIDEO_FILE_SIZE_MB = 80
const MAX_LOCAL_VIDEO_FILE_SIZE_BYTES = MAX_LOCAL_VIDEO_FILE_SIZE_MB * 1024 * 1024

const TRANSLATION_LITERAL_VALUES = new Set([
  'draft',
  'published',
  'default',
  'uppercase',
  'lowercase',
  'none',
  'important-italic',
  'system',
  'light',
  'night',
  'safe',
  'bold',
  'bodoni',
  'gloock',
  'cormorant',
  'roboto',
  'a',
  'b',
  'c',
  'native',
  'embed',
  'full',
  'left',
  'right',
  'grid',
  '16 / 9',
  '4 / 5',
  '1 / 1',
  '9 / 16',
  'original',
])

const TRANSLATION_IGNORED_KEYS = new Set([
  'id',
  'status',
  'order',
  'year',
  'cover',
  'imageBlocks',
  'images',
  'imageAspectRatios',
  'videoUrl',
  'videoUrls',
  'videoAspectRatios',
  'videoAutoplay',
  'videoPlacements',
  'coverFocalPoint',
  'displayFont',
  'displayProfiles',
  'displayWeight',
  'displaySize',
  'displayLetterSpacing',
  'displayWordSpacing',
  'displayLineHeight',
  'displayCase',
  'displayEmphasis',
  'isEnabled',
  'triggerProjectViews',
  'pdfUrl',
  'colorModePreference',
  'colorMode',
  'nightStyle',
  'defaultVariant',
  'mode',
  'aspectRatio',
  'color',
  'href',
  'email',
  'phone',
])

function shouldTranslateValue(value: string, path: TranslationPath): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false

  const isProjectTitle = path.length >= 3
    && path[0] === 'projects'
    && typeof path[1] === 'number'
    && path[2] === 'title'
  if (isProjectTitle) return false

  const lastKey = path[path.length - 1]
  if (typeof lastKey === 'string' && TRANSLATION_IGNORED_KEYS.has(lastKey)) return false

  const lower = trimmed.toLowerCase()
  if (TRANSLATION_LITERAL_VALUES.has(lower)) return false
  if (/^https?:\/\//i.test(trimmed)) return false
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(trimmed)) return false
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) return false
  if (/^[0-9\s.,/+:-]+$/.test(trimmed)) return false
  return true
}

function collectTranslationEntries(value: unknown, path: TranslationPath = []): TranslationEntry[] {
  if (typeof value === 'string') {
    return shouldTranslateValue(value, path) ? [{ path, text: value }] : []
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectTranslationEntries(item, [...path, index]))
  }

  if (!value || typeof value !== 'object') return []

  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, next]) => collectTranslationEntries(next, [...path, key]))
}

function sanitizeProjectSlug(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^projet-/, 'project-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized
}

function buildProjectSlugFromFields(client: string, title: string): string {
  return sanitizeProjectSlug(`${client}-${title}`)
}

function isLegacyGeneratedProjectId(value: string): boolean {
  return /^project-\d{6,}$/.test(sanitizeProjectSlug(value))
}

function ensureUniqueProjectSlug(
  desired: string,
  projects: Project[],
  currentId?: string,
): string {
  const base = sanitizeProjectSlug(desired) || `project-${Date.now()}`
  const used = new Set(
    projects
      .map(project => project.id)
      .filter(id => id && id !== currentId)
      .map(id => sanitizeProjectSlug(id))
  )
  if (!used.has(base)) return base
  let index = 2
  while (used.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

function shouldAutoUpdateProjectSlug(project: Project): boolean {
  const currentId = sanitizeProjectSlug(project.id)
  if (!currentId) return true
  if (isLegacyGeneratedProjectId(currentId)) return true
  const derived = buildProjectSlugFromFields(project.client, project.title)
  return currentId === sanitizeProjectSlug(derived)
}

function hasFrenchMarkers(value: string): boolean {
  if (/[àâçéèêëîïôûùüÿœ]/i.test(value)) return true
  return /\b(le|la|les|des|du|de|une|un|pour|avec|et|par|sur|dans|au|aux|est|sont|beauté|produit|projet|créative|visuelle)\b/i.test(value)
}

function hasEnglishMarkers(value: string): boolean {
  return /\b(the|and|for|with|from|to|of|in|on|is|are|creative|visual|beauty|product|project|daily|booster)\b/i.test(value)
}

function needsApiTranslation(source: string, targetLang: LanguageCode): boolean {
  const current = source.trim()
  const translated = autoTranslateText(source, targetLang).trim()
  if (!translated || translated === current) return true
  return targetLang === 'en' ? hasFrenchMarkers(translated) : hasEnglishMarkers(translated)
}

function normalizeVideoTokenValue(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return trimmed
  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (/^instories-local-video:\/\//i.test(normalized)) {
    const suffix = normalized.replace(/^instories-local-video:\/\//i, '')
    return `instories-local-video://${suffix}`
  }
  return trimmed
}

function normalizeMediaSourceUrl(sourceUrl: string): string {
  const trimmed = sourceUrl.trim()
  if (!trimmed) return ''
  if (/^instories-local-video/i.test(trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) {
    return normalizeVideoTokenValue(trimmed)
  }
  return trimmed
}

function normalizePublicMediaPath(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return trimmed

  const [pathPart, hashPart = ''] = trimmed.split('#')
  const [pathname, queryPart = ''] = pathPart.split('?')
  const normalizedSlashes = pathname.replace(/\\/g, '/')
  if (!/^\/?media\//i.test(normalizedSlashes)) return trimmed
  const normalizedPath = pathname
    .replace(/\\/g, '/')
    .replace(/^media\//i, '/media/')
    .replace(/^\/media\//i, '/media/')
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
    .replace(/^media\//, '/media/')

  const normalizedFinalPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  const withQuery = queryPart ? `${normalizedFinalPath}?${queryPart}` : normalizedFinalPath
  return hashPart ? `${withQuery}#${hashPart}` : withQuery
}

function toProjectMediaPath(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const directPath = normalizePublicMediaPath(trimmed)
  const directPathOnly = directPath.split('#')[0]?.split('?')[0] ?? directPath
  if (directPathOnly.startsWith('/media/projects/')) return directPathOnly

  if (typeof window === 'undefined') return null
  try {
    const parsed = new URL(trimmed, window.location.origin)
    if (parsed.origin !== window.location.origin) return null
    const normalized = normalizePublicMediaPath(parsed.pathname)
    const normalizedPathOnly = normalized.split('#')[0]?.split('?')[0] ?? normalized
    return normalizedPathOnly.startsWith('/media/projects/') ? normalizedPathOnly : null
  } catch {
    return null
  }
}

function extractMediaExtFromPath(value: string, fallback: string): string {
  const pathOnly = value.split('#')[0]?.split('?')[0] ?? value
  const match = pathOnly.match(/\.([a-z0-9]{2,5})$/i)
  if (!match) return fallback
  return match[1].toLowerCase().replace(/[^a-z0-9]/g, '') || fallback
}

function buildCanonicalProjectMediaPath(
  projectId: string,
  kind: 'cover' | 'image' | 'video',
  index: number,
  sourcePathForExt: string
): string {
  const safeProjectId = sanitizeProjectMediaId(projectId || 'project')
  const ext = extractMediaExtFromPath(sourcePathForExt, kind === 'video' ? 'mp4' : 'webp')
  const baseName = kind === 'cover'
    ? 'cover'
    : `${kind === 'video' ? 'video' : 'image'}-${String(index).padStart(2, '0')}`
  return `/media/projects/${safeProjectId}/${baseName}.${ext}`
}

function isMigratableMediaUrl(value: string): boolean {
  if (!value) return false
  if (value.startsWith('blob:')) return true
  return isLocalImageToken(value) || isLocalVideoToken(value)
}

const sections: { id: StudioSection; label: string; desc: string }[] = [
  { id: 'home', label: 'Accueil', desc: 'En-tête, services, CTA' },
  { id: 'about', label: 'À propos', desc: 'Variantes et manifeste' },
  { id: 'contact', label: 'Contact', desc: 'Coordonnées et réseaux' },
  { id: 'projects', label: 'Projets', desc: 'Portfolio et détails' },
  { id: 'settings', label: 'Réglages', desc: 'Pied de page et sauvegarde' },
]

const createEmptyProject = (lang: LanguageCode = 'fr'): Project => ({
  id: sanitizeProjectSlug(`${autoTranslateText('Nouveau client', lang)}-${autoTranslateText('Nouveau projet', lang)}`),
  client: autoTranslateText('Nouveau client', lang),
  title: autoTranslateText('Nouveau projet', lang),
  tagline: '',
  status: 'draft',
  order: Date.now(),
  category: [autoTranslateText('Direction artistique', lang)],
  year: new Date().getFullYear().toString(),
  agencies: [autoTranslateText('Agence', lang)],
  description: '',
  brief: '',
  deliverables: [''],
  tools: [''],
  cover: '',
  coverFocalPoint: { x: 50, y: 50 },
  imageBlocks: [{ id: 'block-1', images: [], imageAspectRatios: [] }],
  images: [],
  imageAspectRatios: [],
  videoUrl: '',
  videoUrls: [],
  videoAspectRatios: [],
  videoAutoplay: [],
  videoPlacements: [],
  videoOptions: {
    mode: 'native',
    minimal: false,
    autoplay: false,
    muted: true,
    loop: true,
    aspectRatio: '16 / 9',
  },
  color: '#f3efe7',
})

function sortProjects(projects: Project[]) {
  return [...projects].sort((a, b) => a.order - b.order)
}

function StudioInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props
  const lang = getStoredLanguage()
  return (
    <label className="studio-field">
      <span>{autoTranslateText(label, lang)}</span>
      <input {...rest} />
    </label>
  )
}

function StudioTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, ...rest } = props
  const lang = getStoredLanguage()
  return (
    <label className="studio-field">
      <span>{autoTranslateText(label, lang)}</span>
      <textarea {...rest} />
    </label>
  )
}

function CsvInput({
  label,
  items,
  onCommit,
  placeholder,
}: {
  label: string
  items: string[]
  onCommit: (next: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState(items.join(', '))
  const lang = getStoredLanguage()

  useEffect(() => {
    setDraft(items.join(', '))
  }, [items])

  return (
    <label className="studio-field">
      <span>{autoTranslateText(label, lang)}</span>
      <input
        value={draft}
        placeholder={placeholder}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          onCommit(draft.split(',').map(item => item.trim()).filter(Boolean))
        }}
      />
    </label>
  )
}

function StudioCard({ title, children }: { title: string; children: React.ReactNode }) {
  const lang = getStoredLanguage()
  const storageKey = `instories.studio.card-open.${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = window.localStorage.getItem(storageKey)
    return saved !== '0'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, isOpen ? '1' : '0')
  }, [isOpen, storageKey])

  return (
    <section className={`studio-card${isOpen ? '' : ' studio-card-collapsed'}`}>
      <div className="studio-card-head">
        <h2>{autoTranslateText(title, lang)}</h2>
        <button
          type="button"
          className={`studio-card-toggle${isOpen ? ' is-open' : ''}`}
          onClick={() => setIsOpen(current => !current)}
          aria-label={autoTranslateText(isOpen ? 'Fermer le bloc' : 'Ouvrir le bloc', lang)}
          title={autoTranslateText(isOpen ? 'Fermer le bloc' : 'Ouvrir le bloc', lang)}
        >
          <span className={`studio-card-toggle-icon${isOpen ? ' is-open' : ''}`} aria-hidden="true">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none">
              <path d="M3.5 6L8 10.5L12.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
      <div className={`studio-card-content${isOpen ? '' : ' is-collapsed'}`}>
        {children}
      </div>
    </section>
  )
}

function canPreviewVideoSource(url: string): boolean {
  const value = url.trim()
  if (!value) return false
  if (value.startsWith('blob:')) return true
  if (/^data:video\//i.test(value)) return true
  if (
    value.includes('youtube.com/watch')
    || value.includes('youtube.com/shorts')
    || value.includes('youtu.be/')
    || value.includes('vimeo.com/')
    || value.includes('dailymotion.com/')
    || value.includes('facebook.com/')
    || value.includes('instagram.com/reel/')
  ) {
    return false
  }
  if (/^https?:\/\//i.test(value)) return true
  return /\.(mp4|webm|ogg|m4v|mov)(\?.*)?(#.*)?$/i.test(value)
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

function makeMediaKey(value: string): string {
  return value
    .trim()
    .split('#')[0]
    .split('?')[0]
    .replace(/\\/g, '/')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function makeImageBlockId(indexHint = 1): string {
  return `block-${Date.now()}-${indexHint}`
}

function getFileExtension(file: File, fallback: string): string {
  const fromName = file.name.split('.').pop()?.trim().toLowerCase() ?? ''
  if (fromName) return fromName.replace(/[^a-z0-9]/g, '') || fallback
  const mime = file.type.toLowerCase()
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/avif') return 'avif'
  if (mime === 'image/png') return 'png'
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'video/mp4') return 'mp4'
  if (mime === 'video/webm') return 'webm'
  if (mime === 'video/ogg') return 'ogg'
  if (mime === 'video/quicktime') return 'mov'
  return fallback
}

function renameFileForProject(file: File, projectId: string, kind: 'image' | 'video', index: number): File {
  const safeProjectId = sanitizeProjectMediaId(projectId)
  const ext = getFileExtension(file, kind === 'video' ? 'mp4' : 'webp')
  const base = `${safeProjectId}-${kind}-${String(index).padStart(2, '0')}`
  return new File([file], `${base}.${ext}`, {
    type: file.type,
    lastModified: file.lastModified,
  })
}

function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  return /\.(avif|webp|jpe?g|png)$/i.test(file.name)
}

function isVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true
  return /\.(mp4|webm|ogg|m4v|mov)$/i.test(file.name)
}

function buildStudioVideoCandidates(source: string, projectId?: string, mediaIndex?: number): string[] {
  const normalizedSource = normalizeVideoTokenValue(source).trim()
  const candidates = new Set<string>()
  if (normalizedSource && !isLocalVideoToken(normalizedSource)) {
    candidates.add(normalizedSource)
    const normalizedPublicPath = normalizePublicMediaPath(normalizedSource)
    if (normalizedPublicPath) candidates.add(normalizedPublicPath)

    if (normalizedPublicPath.startsWith('/media/') || normalizedSource.toLowerCase().startsWith('/media/')) {
      const baseCandidates = [normalizedSource, normalizedPublicPath].filter(Boolean)
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
            candidates.add(withHash)
          })
        })
      })
    }
  }

  if (projectId && typeof mediaIndex === 'number') {
    const safeId = sanitizeProjectMediaId(projectId)
    const safeIndex = Math.max(1, mediaIndex + 1)
    ;['mp4', 'webm', 'm4v', 'mov', 'ogg'].forEach(ext => {
      candidates.add(`/media/projects/${safeId}/video-${String(safeIndex).padStart(2, '0')}.${ext}`)
    })
  }

  return Array.from(candidates)
}

function StudioVideoMiniPreview({
  source,
  label,
  projectId,
  mediaIndex,
}: {
  source: string
  label: string
  projectId?: string
  mediaIndex?: number
}) {
  const normalizedSource = normalizeVideoTokenValue(source)
  const [resolvedSource, setResolvedSource] = useState(normalizedSource.trim())
  const [hasError, setHasError] = useState(false)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const objectUrlRef = useRef<string | null>(null)
  const sourceValue = normalizedSource.trim()
  const isLocalToken = isLocalVideoToken(sourceValue)
  const fallbackCandidates = useMemo(
    () => buildStudioVideoCandidates(sourceValue, projectId, mediaIndex),
    [sourceValue, projectId, mediaIndex]
  )

  useEffect(() => {
    setCandidateIndex(0)
  }, [sourceValue, projectId, mediaIndex])

  useEffect(() => {
    const revoke = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }

    let canceled = false
    setHasError(false)
    revoke()

    if (!sourceValue) {
      setResolvedSource('')
      return () => {
        canceled = true
        revoke()
      }
    }

    if (!isLocalToken) {
      setResolvedSource(fallbackCandidates[candidateIndex] ?? sourceValue)
      return () => {
        canceled = true
        revoke()
      }
    }

    setResolvedSource('')
    void resolveLocalVideoToObjectUrl(sourceValue)
      .then(url => {
        if (canceled) {
          if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
          return
        }
        if (!url) {
          if (fallbackCandidates.length > 0) {
            setResolvedSource(fallbackCandidates[candidateIndex] ?? '')
            return
          }
          setHasError(true)
          return
        }
        objectUrlRef.current = url.startsWith('blob:') ? url : null
        setResolvedSource(url)
      })
      .catch(() => {
        if (canceled) return
        if (fallbackCandidates.length > 0) {
          setResolvedSource(fallbackCandidates[candidateIndex] ?? '')
          setHasError(false)
        } else {
          setHasError(true)
        }
      })

    return () => {
      canceled = true
      revoke()
    }
  }, [candidateIndex, fallbackCandidates, isLocalToken, sourceValue])

  const canPreview = !hasError && canPreviewVideoSource(resolvedSource)
  if (!canPreview) {
    return <span>{label}</span>
  }

  return (
    <video
      src={resolvedSource}
      muted
      playsInline
      preload="metadata"
      onError={() => {
        setCandidateIndex(current => {
          if (current < fallbackCandidates.length - 1) return current + 1
          setHasError(true)
          return current
        })
      }}
    />
  )
}

function SocialLinksEditor({
  links,
  onChange,
}: {
  links: SocialLink[]
  onChange: (next: SocialLink[]) => void
}) {
  const lang = getStoredLanguage()
  return (
    <div className="studio-stack">
      {links.map((link, index) => (
        <div key={`social-link-${index}`} className="studio-inline-grid">
          <StudioInput
            label={autoTranslateText('Nom', lang)}
            value={link.label}
            onChange={e => {
              const next = [...links]
              next[index] = { ...link, label: e.target.value }
              onChange(next)
            }}
          />
          <StudioInput
            label={autoTranslateText('URL', lang)}
            value={link.href}
            onChange={e => {
              const next = [...links]
              next[index] = { ...link, href: e.target.value }
              onChange(next)
            }}
          />
          <button
            type="button"
            className="studio-remove"
            onClick={() => onChange(links.filter((_, i) => i !== index))}
          >
            {autoTranslateText('Supprimer', lang)}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="studio-secondary"
        onClick={() => onChange([...links, { label: autoTranslateText('Nouveau réseau', lang), href: 'https://' }])}
      >
        {autoTranslateText('Ajouter un lien', lang)}
      </button>
    </div>
  )
}

export default function Studio() {
  const importJsonRef = useRef<HTMLInputElement>(null)
  const galleryUploadRef = useRef<HTMLInputElement>(null)
  const videoUploadRef = useRef<HTMLInputElement>(null)
  const [section, setSection] = useState<StudioSection>('home')
  const [content, setContent] = useState<SiteContent>(() => {
    const loaded = localizeSiteContent(loadSiteContent(), getStoredLanguage())
    return { ...loaded, projects: sortProjects(loaded.projects) }
  })
  const [selectedProjectId, setSelectedProjectId] = useState(content.projects[0]?.id ?? '')
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null)
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null)
  const [imageBlocks, setImageBlocks] = useState<ImageBlockRow[]>([])
  const [activeImageBlockIndex, setActiveImageBlockIndex] = useState(0)
  const [draggedImageBlockIndex, setDraggedImageBlockIndex] = useState<number | null>(null)
  const [dragOverImageBlockIndex, setDragOverImageBlockIndex] = useState<number | null>(null)
  const [draggedImageRowIndex, setDraggedImageRowIndex] = useState<number | null>(null)
  const [dragOverImageRowIndex, setDragOverImageRowIndex] = useState<number | null>(null)
  const [draggedVideoRowIndex, setDraggedVideoRowIndex] = useState<number | null>(null)
  const [dragOverVideoRowIndex, setDragOverVideoRowIndex] = useState<number | null>(null)
  const [videoRows, setVideoRows] = useState<VideoRow[]>([])
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [isImageDropActive, setIsImageDropActive] = useState(false)
  const [isVideoDropActive, setIsVideoDropActive] = useState(false)
  const [saveLabel, setSaveLabel] = useState(() => autoTranslateText('Sauvegarde locale active', getStoredLanguage()))
  const [lang, setLang] = useState<LanguageCode>(() => getStoredLanguage())
  const [isTranslatingText, setIsTranslatingText] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null)
  const [conversionKpi, setConversionKpi] = useState<ConversionKpi>({
    similarClicks: 0,
    briefClicks: 0,
    pdfPopupClicks: 0,
    pdfMenuClicks: 0,
    total: 0,
    updatedAt: 0,
  })

  useEffect(() => listenLanguageChange(next => {
    setLang(next)
    const localized = localizeSiteContent(loadSiteContent(), next)
    setContent({ ...localized, projects: sortProjects(localized.projects) })
  }), [])
  const ui = (value: string) => autoTranslateText(value, lang)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const updateKpi = () => {
      const snapshot = getTrackedEventsSnapshot()
      const similarClicks = snapshot.events.lead_similar_project_click?.total ?? 0
      const briefClicks = snapshot.events.lead_brief_send_click?.total ?? 0
      const pdfPopupClicks = snapshot.events.pdf_reminder_download_click?.total ?? 0
      const pdfMenuClicks = snapshot.events.pdf_download_click?.total ?? 0
      setConversionKpi({
        similarClicks,
        briefClicks,
        pdfPopupClicks,
        pdfMenuClicks,
        total: similarClicks + briefClicks + pdfPopupClicks + pdfMenuClicks,
        updatedAt: snapshot.updatedAt,
      })
    }
    updateKpi()
    const timer = window.setInterval(updateKpi, 1500)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    try {
      saveSiteContent(content)
      setSaveLabel(`${ui('Sauvegardé localement à')} ${new Date().toLocaleTimeString(lang === 'en' ? 'en-US' : 'fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`)
    } catch {
      setSaveLabel(ui('Impossible de sauvegarder localement. Vérifie l’espace navigateur ou le mode privé.'))
    }
  }, [content, lang])

  useEffect(() => {
    if (!content.projects.some(project => project.id === selectedProjectId)) {
      setSelectedProjectId(content.projects[0]?.id ?? '')
    }
  }, [content.projects, selectedProjectId])

  const selectedProject = useMemo(
    () => content.projects.find(project => project.id === selectedProjectId) ?? content.projects[0],
    [content.projects, selectedProjectId]
  )

  const getDefaultVideoRatio = (project: Project | undefined): MediaAspectRatio => (
    project?.videoOptions?.aspectRatio ?? '16 / 9'
  )

  useEffect(() => {
    const sourceBlocks = selectedProject?.imageBlocks?.length
      ? selectedProject.imageBlocks
      : [{
        id: 'block-1',
        images: selectedProject?.images ?? [],
        imageAspectRatios: selectedProject?.imageAspectRatios ?? [],
      }]

    const nextBlocks = sourceBlocks.map((block, blockIndex) => ({
      id: block.id?.trim() || makeImageBlockId(blockIndex + 1),
      rows: (block.images ?? []).map((url, index) => ({
        url,
        aspectRatio: block.imageAspectRatios?.[index] ?? '4 / 5',
      })),
    }))

    if (nextBlocks.length === 0) {
      nextBlocks.push({ id: makeImageBlockId(1), rows: [] })
    }

    setImageBlocks(nextBlocks)
    setActiveImageBlockIndex(current => Math.max(0, Math.min(current, nextBlocks.length - 1)))
  }, [selectedProject?.id, selectedProject?.imageBlocks, selectedProject?.images, selectedProject?.imageAspectRatios])

  useEffect(() => {
    const urls = selectedProject?.videoUrls?.length
      ? selectedProject.videoUrls
      : (selectedProject?.videoUrl ? [selectedProject.videoUrl] : [])
    const placements = selectedProject?.videoPlacements ?? []
    const ratios = selectedProject?.videoAspectRatios ?? []
    const autoplayFlags = selectedProject?.videoAutoplay ?? []
    const fallbackRatio = getDefaultVideoRatio(selectedProject)
    const defaultPlacement: VideoPlacement = urls.length > 1 ? 'grid' : 'full'
    setVideoRows(urls.map((url, index) => ({
      url,
      placement: placements[index] ?? defaultPlacement,
      aspectRatio: ratios[index] ?? fallbackRatio,
      autoplay: typeof autoplayFlags[index] === 'boolean'
        ? autoplayFlags[index]
        : (selectedProject?.videoOptions?.autoplay ?? false),
    })))
  }, [selectedProject?.id, selectedProject?.videoUrls, selectedProject?.videoUrl, selectedProject?.videoPlacements, selectedProject?.videoAspectRatios, selectedProject?.videoAutoplay, selectedProject?.videoOptions?.aspectRatio, selectedProject?.videoOptions?.autoplay])

  const publishedCount = content.projects.filter(project => project.status === 'published').length
  const coverFocalX = selectedProject?.coverFocalPoint?.x ?? 50
  const coverFocalY = selectedProject?.coverFocalPoint?.y ?? 50
  const activeImageBlock = imageBlocks[activeImageBlockIndex] ?? imageBlocks[0] ?? { id: 'block-1', rows: [] }
  const activeImageRows = activeImageBlock.rows
  const setProject = (updater: (project: Project) => Project) => {
    if (!selectedProject) return
    setContent(current => ({
      ...current,
      projects: sortProjects(current.projects.map(project => (
        project.id === selectedProject.id ? updater(project) : project
      ))),
    }))
  }

  type DisplayProfileDraft = {
    displayWeight: SiteContent['design']['displayWeight']
    displaySize: SiteContent['design']['displaySize']
    displayLetterSpacing: SiteContent['design']['displayLetterSpacing']
    displayWordSpacing: SiteContent['design']['displayWordSpacing']
    displayLineHeight: SiteContent['design']['displayLineHeight']
    displayCase: SiteContent['design']['displayCase']
    displayEmphasis: SiteContent['design']['displayEmphasis']
  }

  const captureDisplayProfile = (design: SiteContent['design']): DisplayProfileDraft => ({
    displayWeight: design.displayWeight,
    displaySize: design.displaySize,
    displayLetterSpacing: design.displayLetterSpacing,
    displayWordSpacing: design.displayWordSpacing,
    displayLineHeight: design.displayLineHeight,
    displayCase: design.displayCase,
    displayEmphasis: design.displayEmphasis,
  })

  const patchDisplaySetting = <K extends keyof DisplayProfileDraft>(key: K, value: DisplayProfileDraft[K]) => {
    setContent(current => {
      const activeFont = current.design.displayFont
      const nextProfile = {
        ...captureDisplayProfile(current.design),
        [key]: value,
      } as DisplayProfileDraft
      return {
        ...current,
        design: {
          ...current.design,
          [key]: value,
          displayProfiles: {
            ...(current.design.displayProfiles ?? {}),
            [activeFont]: nextProfile,
          },
        },
      }
    })
  }

  const applyDisplayFont = (nextFont: DisplayFontKey) => {
    setContent(current => {
      const currentFont = current.design.displayFont
      const currentProfile = captureDisplayProfile(current.design)
      const profiles = {
        ...(current.design.displayProfiles ?? {}),
        [currentFont]: currentProfile,
      }
      const targetProfile = profiles[nextFont] ?? currentProfile
      return {
        ...current,
        design: {
          ...current.design,
          displayFont: nextFont,
          ...targetProfile,
          displayProfiles: {
            ...profiles,
            [nextFont]: targetProfile,
          },
        },
      }
    })
  }

  const patchDesignSetting = <K extends keyof SiteContent['design']>(
    key: K,
    value: SiteContent['design'][K]
  ) => {
    setContent(current => ({
      ...current,
      design: {
        ...current.design,
        [key]: value,
      },
    }))
  }

  const moveProject = (projectId: string, direction: -1 | 1) => {
    setContent(current => {
      const sorted = sortProjects(current.projects)
      const index = sorted.findIndex(project => project.id === projectId)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return current

      const swapped = [...sorted]
      ;[swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]]
      const reordered = swapped.map((project, orderedIndex) => ({ ...project, order: orderedIndex }))
      return { ...current, projects: reordered }
    })
  }

  const moveProjectToProject = (sourceProjectId: string, targetProjectId: string) => {
    if (sourceProjectId === targetProjectId) return
    setContent(current => {
      const sorted = sortProjects(current.projects)
      const fromIndex = sorted.findIndex(project => project.id === sourceProjectId)
      const targetIndex = sorted.findIndex(project => project.id === targetProjectId)
      if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return current
      const reordered = [...sorted]
      const [moved] = reordered.splice(fromIndex, 1)
      if (!moved) return current
      reordered.splice(targetIndex, 0, moved)
      return {
        ...current,
        projects: reordered.map((project, orderedIndex) => ({ ...project, order: orderedIndex })),
      }
    })
  }

  const toObjectUrl = (file: File) => URL.createObjectURL(file)
  const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

  const setCoverFocalPoint = (x: number, y: number) => {
    setProject(project => ({
      ...project,
      coverFocalPoint: {
        x: clampPercent(x),
        y: clampPercent(y),
      },
    }))
  }

  const handleGalleryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    await handleGalleryUploadFiles(Array.from(files))
  }

  const handleGalleryUploadFiles = async (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return
    const projectMediaId = selectedProject?.id || 'project'
    const renamedFiles = incomingFiles.map((file, offset) =>
      renameFileForProject(file, projectMediaId, 'image', activeImageRows.length + offset + 1)
    )
    let urls: string[] = []
    try {
      urls = await Promise.all(renamedFiles.map(file => saveLocalImage(file, { maxDimension: 1800, quality: 0.82 })))
    } catch {
      urls = renamedFiles.map(file => toObjectUrl(file))
    }
    const nextRows: ImageRow[] = [
      ...activeImageRows,
      ...urls.map(url => ({ url, aspectRatio: '4 / 5' as ImageAspectRatio })),
    ]
    updateImageBlockRows(activeImageBlockIndex, nextRows)
    setSaveLabel(ui('Images galerie importées, compressées et persistées.'))
  }

  const commitImageBlocks = (blocks: ImageBlockRow[]) => {
    const cleaned = blocks
      .map((block, blockIndex) => ({
        id: block.id?.trim() || makeImageBlockId(blockIndex + 1),
        rows: block.rows
          .map(row => ({
            url: row.url.trim(),
            aspectRatio: row.aspectRatio,
          }))
          .filter(row => Boolean(row.url)),
      }))

    const withFallback = cleaned.length > 0 ? cleaned : [{ id: makeImageBlockId(1), rows: [] as ImageRow[] }]
    const activeCover = selectedProject?.cover.trim() || withFallback.flatMap(block => block.rows)[0]?.url || ''
    const activeCoverKey = makeMediaKey(activeCover)
    const seen = new Set<string>()

    const deduped = withFallback.map(block => ({
      id: block.id,
      rows: block.rows.filter(row => {
        const key = makeMediaKey(row.url)
        if (!key) return false
        if (activeCoverKey && key === activeCoverKey) return false
        if (seen.has(key)) return false
        seen.add(key)
        return true
      }),
    }))

    const nonEmpty = deduped.filter(block => block.rows.length > 0)
    const finalBlocks = nonEmpty.length > 0
      ? nonEmpty
      : [{ id: deduped[0]?.id ?? makeImageBlockId(1), rows: [] as ImageRow[] }]

    setImageBlocks(finalBlocks)
    setActiveImageBlockIndex(current => Math.max(0, Math.min(current, finalBlocks.length - 1)))

    const flatRows = finalBlocks.flatMap(block => block.rows)
    setProject(project => ({
      ...project,
      cover: project.cover.trim() || flatRows[0]?.url || '',
      imageBlocks: finalBlocks.map(block => ({
        id: block.id,
        images: block.rows.map(row => row.url),
        imageAspectRatios: block.rows.map(row => row.aspectRatio),
      })),
      images: flatRows.map(row => row.url),
      imageAspectRatios: flatRows.map(row => row.aspectRatio),
    }))
  }

  const updateImageBlockRows = (blockIndex: number, rows: ImageRow[]) => {
    const nextBlocks = [...imageBlocks]
    const existing = nextBlocks[blockIndex] ?? { id: makeImageBlockId(blockIndex + 1), rows: [] as ImageRow[] }
    nextBlocks[blockIndex] = {
      ...existing,
      rows,
    }
    commitImageBlocks(nextBlocks)
  }

  const addImageBlock = () => {
    const nextBlocks = [...imageBlocks, { id: makeImageBlockId(imageBlocks.length + 1), rows: [] }]
    setImageBlocks(nextBlocks)
    setActiveImageBlockIndex(nextBlocks.length - 1)
    setProject(project => ({
      ...project,
      imageBlocks: nextBlocks.map(block => ({
        id: block.id,
        images: block.rows.map(row => row.url),
        imageAspectRatios: block.rows.map(row => row.aspectRatio),
      })),
    }))
  }

  const removeImageBlock = (blockIndex: number) => {
    if (imageBlocks.length <= 1) {
      commitImageBlocks([{ id: imageBlocks[0]?.id ?? makeImageBlockId(1), rows: [] }])
      setActiveImageBlockIndex(0)
      return
    }
    const nextBlocks = imageBlocks.filter((_, index) => index !== blockIndex)
    commitImageBlocks(nextBlocks)
    setActiveImageBlockIndex(current => Math.max(0, Math.min(current, nextBlocks.length - 1)))
  }

  const moveImageBlock = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || fromIndex >= imageBlocks.length) return
    if (toIndex < 0 || toIndex >= imageBlocks.length) return
    const nextBlocks = [...imageBlocks]
    const [moved] = nextBlocks.splice(fromIndex, 1)
    if (!moved) return
    nextBlocks.splice(toIndex, 0, moved)
    commitImageBlocks(nextBlocks)
    setActiveImageBlockIndex(toIndex)
  }

  const moveActiveImageBlock = (delta: number) => {
    moveImageBlock(activeImageBlockIndex, activeImageBlockIndex + delta)
  }

  const shouldIgnoreDragFromTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false
    return Boolean(target.closest('button, select, input, textarea, label, a'))
  }

  const clearProjectDragState = () => {
    setDraggedProjectId(null)
    setDragOverProjectId(null)
  }

  const handleProjectDragStart = (projectId: string): DragEventHandler<HTMLElement> => event => {
    if (shouldIgnoreDragFromTarget(event.target)) {
      event.preventDefault()
      return
    }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-instories-project-id', projectId)
    event.dataTransfer.setData('text/plain', projectId)
    setDraggedProjectId(projectId)
    setDragOverProjectId(projectId)
  }

  const handleProjectDragOver = (projectId: string): DragEventHandler<HTMLElement> => event => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverProjectId(projectId)
  }

  const handleProjectDrop = (targetProjectId: string): DragEventHandler<HTMLElement> => event => {
    event.preventDefault()
    const sourceProjectId = event.dataTransfer.getData('application/x-instories-project-id')
      || event.dataTransfer.getData('text/plain')
      || draggedProjectId
    if (sourceProjectId) {
      moveProjectToProject(sourceProjectId, targetProjectId)
    }
    clearProjectDragState()
  }

  const handleImageBlockDragStart = (blockIndex: number): DragEventHandler<HTMLButtonElement> => event => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(blockIndex))
    setDraggedImageBlockIndex(blockIndex)
    setDragOverImageBlockIndex(blockIndex)
  }

  const handleImageBlockDragOver = (blockIndex: number): DragEventHandler<HTMLButtonElement> => event => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverImageBlockIndex(blockIndex)
  }

  const clearImageBlockDragState = () => {
    setDraggedImageBlockIndex(null)
    setDragOverImageBlockIndex(null)
  }

  const handleImageBlockDrop = (blockIndex: number): DragEventHandler<HTMLButtonElement> => event => {
    event.preventDefault()
    const payload = Number(event.dataTransfer.getData('text/plain'))
    const fromIndex = Number.isInteger(payload) ? payload : draggedImageBlockIndex
    if (typeof fromIndex === 'number') {
      moveImageBlock(fromIndex, blockIndex)
    }
    clearImageBlockDragState()
  }

  const clearImageRowDragState = () => {
    setDraggedImageRowIndex(null)
    setDragOverImageRowIndex(null)
  }

  const handleImageRowDragStart = (rowIndex: number): DragEventHandler<HTMLElement> => event => {
    if (shouldIgnoreDragFromTarget(event.target)) {
      event.preventDefault()
      return
    }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(rowIndex))
    setDraggedImageRowIndex(rowIndex)
    setDragOverImageRowIndex(rowIndex)
  }

  const handleImageRowDragOver = (rowIndex: number): DragEventHandler<HTMLElement> => event => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverImageRowIndex(rowIndex)
  }

  const handleImageRowDrop = (rowIndex: number): DragEventHandler<HTMLElement> => event => {
    event.preventDefault()
    const payload = Number(event.dataTransfer.getData('text/plain'))
    const fromIndex = Number.isInteger(payload) ? payload : draggedImageRowIndex
    if (typeof fromIndex === 'number') {
      moveImageRowTo(fromIndex, rowIndex)
    }
    clearImageRowDragState()
  }

  const clearVideoRowDragState = () => {
    setDraggedVideoRowIndex(null)
    setDragOverVideoRowIndex(null)
  }

  const handleVideoRowDragStart = (rowIndex: number): DragEventHandler<HTMLElement> => event => {
    if (shouldIgnoreDragFromTarget(event.target)) {
      event.preventDefault()
      return
    }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(rowIndex))
    setDraggedVideoRowIndex(rowIndex)
    setDragOverVideoRowIndex(rowIndex)
  }

  const handleVideoRowDragOver = (rowIndex: number): DragEventHandler<HTMLElement> => event => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverVideoRowIndex(rowIndex)
  }

  const handleVideoRowDrop = (rowIndex: number): DragEventHandler<HTMLElement> => event => {
    event.preventDefault()
    const payload = Number(event.dataTransfer.getData('text/plain'))
    const fromIndex = Number.isInteger(payload) ? payload : draggedVideoRowIndex
    if (typeof fromIndex === 'number') {
      moveVideoRowTo(fromIndex, rowIndex)
    }
    clearVideoRowDragState()
  }

  const commitVideoRows = (rows: VideoRow[]) => {
    const cleaned = rows
      .map(row => ({
        url: row.url.trim(),
        placement: row.placement,
        aspectRatio: row.aspectRatio,
        autoplay: row.autoplay,
      }))
      .filter(row => Boolean(row.url))

    setVideoRows(cleaned)
    setProject(project => ({
      ...project,
      videoUrl: cleaned[0]?.url ?? '',
      videoUrls: cleaned.map(row => row.url),
      videoAspectRatios: cleaned.map(row => row.aspectRatio),
      videoAutoplay: cleaned.map(row => row.autoplay),
      videoPlacements: cleaned.map(row => row.placement),
    }))
  }

  const removeImageRow = (index: number) => {
    const removedUrl = activeImageRows[index]?.url.trim() ?? ''
    const nextRows = activeImageRows.filter((_, rowIndex) => rowIndex !== index)
    updateImageBlockRows(activeImageBlockIndex, nextRows)
    if (!removedUrl) return
    if (selectedProject?.cover.trim() !== removedUrl) return
    setProject(project => ({
      ...project,
      cover: nextRows[0]?.url ?? '',
    }))
  }

  const setImageAsCover = (url: string) => {
    const target = url.trim()
    if (!target) return
    setProject(project => ({ ...project, cover: target }))
  }

  const addImageByUrl = () => {
    const url = newImageUrl.trim()
    if (!url) return
    updateImageBlockRows(activeImageBlockIndex, [...activeImageRows, { url, aspectRatio: '4 / 5' }])
    setNewImageUrl('')
  }

  const addVideoByUrl = () => {
    const url = newVideoUrl.trim()
    if (!url) return
    commitVideoRows([
      ...videoRows,
      {
        url,
        placement: 'grid',
        aspectRatio: getDefaultVideoRatio(selectedProject),
        autoplay: selectedProject?.videoOptions?.autoplay ?? false,
      },
    ])
    setProject(project => ({
      ...project,
      videoOptions: { ...project.videoOptions, mode: 'native' },
    }))
    setNewVideoUrl('')
  }

  const removeVideoRow = (index: number) => {
    const nextRows = videoRows.filter((_, rowIndex) => rowIndex !== index)
    commitVideoRows(nextRows)
  }

  const moveImageRow = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= activeImageRows.length) return
    const next = [...activeImageRows]
    ;[next[index], next[target]] = [next[target], next[index]]
    updateImageBlockRows(activeImageBlockIndex, next)
  }

  const moveImageRowTo = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    if (toIndex < 0 || toIndex >= activeImageRows.length) return
    const next = [...activeImageRows]
    const [moved] = next.splice(fromIndex, 1)
    if (!moved) return
    next.splice(toIndex, 0, moved)
    updateImageBlockRows(activeImageBlockIndex, next)
  }

  const moveVideoRow = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= videoRows.length) return
    const next = [...videoRows]
    ;[next[index], next[target]] = [next[target], next[index]]
    commitVideoRows(next)
  }

  const moveVideoRowTo = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    if (toIndex < 0 || toIndex >= videoRows.length) return
    const next = [...videoRows]
    const [moved] = next.splice(fromIndex, 1)
    if (!moved) return
    next.splice(toIndex, 0, moved)
    commitVideoRows(next)
  }

  const handleVideoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    await handleVideoUploadFiles(Array.from(files))
  }

  const handleVideoUploadFiles = async (incomingFiles: File[]) => {
    if (incomingFiles.length === 0) return
    const projectMediaId = selectedProject?.id || 'project'
    const preparedFiles = incomingFiles.map((file, offset) =>
      renameFileForProject(file, projectMediaId, 'video', videoRows.length + offset + 1)
    )
    const acceptedPrepared = preparedFiles.filter(file => file.size <= MAX_LOCAL_VIDEO_FILE_SIZE_BYTES)
    const rejectedCount = preparedFiles.length - acceptedPrepared.length

    if (acceptedPrepared.length === 0) {
      setSaveLabel(`${ui('Vidéo trop lourde')} (${ui('Maximum')} ${MAX_LOCAL_VIDEO_FILE_SIZE_MB}MB ${ui('par fichier')}).`)
      return
    }

    const urls: string[] = []
    for (const file of acceptedPrepared) {
      try {
        urls.push(await saveLocalVideo(file))
      } catch {
        // Fallback temporaire si IndexedDB n'est pas accessible
        urls.push(toObjectUrl(file))
      }
    }

    const nextRows: VideoRow[] = [
      ...videoRows,
      ...urls.map(url => ({
        url,
        placement: 'grid' as VideoPlacement,
        aspectRatio: getDefaultVideoRatio(selectedProject),
        autoplay: selectedProject?.videoOptions?.autoplay ?? false,
      })),
    ]
    commitVideoRows(nextRows)
    setProject(project => ({
      ...project,
      videoOptions: { ...project.videoOptions, mode: 'native' },
    }))
    if (rejectedCount > 0) {
      setSaveLabel(`${ui('Import partiel')}: ${rejectedCount} ${ui('vidéo(s) ignorée(s)')} (>${MAX_LOCAL_VIDEO_FILE_SIZE_MB}MB).`)
    } else {
      setSaveLabel(ui('Vidéo(s) importée(s) en local (persistées pour ce navigateur).'))
    }
  }

  const handleImageDrop: DragEventHandler<HTMLElement> = event => {
    event.preventDefault()
    event.stopPropagation()
    setIsImageDropActive(false)
    const files = Array.from(event.dataTransfer.files ?? []).filter(isImageFile)
    if (files.length === 0) {
      setSaveLabel(ui('Aucune image valide détectée.'))
      return
    }
    void handleGalleryUploadFiles(files)
  }

  const handleVideoDrop: DragEventHandler<HTMLElement> = event => {
    event.preventDefault()
    event.stopPropagation()
    setIsVideoDropActive(false)
    const files = Array.from(event.dataTransfer.files ?? []).filter(isVideoFile)
    if (files.length === 0) {
      setSaveLabel(ui('Aucune vidéo valide détectée.'))
      return
    }
    void handleVideoUploadFiles(files)
  }

  const blobFromLocalToken = async (value: string, kind: 'image' | 'video'): Promise<Blob | null> => {
    if (value.startsWith('blob:')) {
      const response = await fetch(value)
      if (!response.ok) return null
      return await response.blob()
    }

    if (kind === 'image') {
      if (!isLocalImageToken(value)) return null
      const objectUrl = await resolveLocalImageToObjectUrl(value)
      if (!objectUrl) return null
      try {
        const response = await fetch(objectUrl)
        if (!response.ok) return null
        return await response.blob()
      } finally {
        if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl)
      }
    }

    const normalizedToken = normalizeVideoTokenValue(value)
    if (!isLocalVideoToken(normalizedToken)) return null
    const objectUrl = await resolveLocalVideoToObjectUrl(normalizedToken)
    if (!objectUrl) return null
    try {
      const response = await fetch(objectUrl)
      if (!response.ok) return null
      return await response.blob()
    } finally {
      if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl)
    }
  }

  const uploadMediaBlob = async ({
    blob,
    projectId,
    kind,
    index,
    sourceName,
  }: {
    blob: Blob
    projectId: string
    kind: 'cover' | 'image' | 'video'
    index: number
    sourceName: string
  }): Promise<string> => {
    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        'Content-Type': blob.type || (kind === 'video' ? 'video/mp4' : 'image/webp'),
        'x-project-id': projectId,
        'x-media-kind': kind,
        'x-media-index': String(index),
        'x-source-name': sourceName,
      },
      body: blob,
    })

    const payload = await response.json() as { url?: string; error?: string }
    if (!response.ok || typeof payload.url !== 'string') {
      throw new Error(payload.error ?? ui('Erreur de publication'))
    }
    return payload.url
  }

  const resolveExistingPublishedMediaUrl = async ({
    projectId,
    kind,
    index,
  }: {
    projectId: string
    kind: 'cover' | 'image' | 'video'
    index: number
  }): Promise<string | null> => {
    const extensions = kind === 'video'
      ? ['mp4', 'webm', 'm4v', 'mov', 'ogg']
      : ['webp', 'avif', 'jpg', 'jpeg', 'png']
    const baseName = kind === 'cover'
      ? 'cover'
      : `${kind}-${String(index).padStart(2, '0')}`
    const candidates = extensions.map(ext => `/media/projects/${projectId}/${baseName}.${ext}`)

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, { method: 'HEAD' })
        if (response.ok) return candidate
      } catch {
        // ignore and continue with next extension
      }
    }
    return null
  }

  const syncLocalMediaIntoPublicUrls = async (
    onProgress?: (uploaded: number, total: number) => void,
  ): Promise<SiteContent> => {
    const mediaCache = new Map<string, string>()
    let migratedCount = 0
    let unresolvedLocalCount = 0
    const migratableSources = new Set<string>()

    content.projects.forEach(project => {
      const sourceVideoUrls = project.videoUrls.length
        ? project.videoUrls
        : (project.videoUrl ? [project.videoUrl] : [])
      const sourceImageUrls = project.imageBlocks?.length
        ? project.imageBlocks.flatMap(block => block.images ?? [])
        : project.images
      ;[project.cover, ...sourceImageUrls, ...project.images, ...sourceVideoUrls].forEach(rawValue => {
        const value = normalizeMediaSourceUrl(rawValue)
        if (isMigratableMediaUrl(value) || Boolean(toProjectMediaPath(value))) {
          migratableSources.add(value)
        }
      })
    })

    const totalToMigrate = migratableSources.size
    onProgress?.(0, totalToMigrate)

    const projects = await Promise.all(content.projects.map(async project => {
      const projectId = project.id || `project-${project.order + 1}`
      const nextProject: Project = {
        ...project,
        category: [...project.category],
        agencies: [...project.agencies],
        deliverables: [...project.deliverables],
        tools: [...project.tools],
        imageBlocks: (project.imageBlocks ?? []).map(block => ({
          id: block.id,
          images: [...(block.images ?? [])],
          imageAspectRatios: [...(block.imageAspectRatios ?? [])],
        })),
        images: [...project.images],
        videoUrls: [...project.videoUrls],
        videoPlacements: [...project.videoPlacements],
        imageAspectRatios: [...(project.imageAspectRatios ?? [])],
        videoAspectRatios: [...(project.videoAspectRatios ?? [])],
        videoAutoplay: [...(project.videoAutoplay ?? [])],
        coverFocalPoint: project.coverFocalPoint ? { ...project.coverFocalPoint } : { x: 50, y: 50 },
        videoOptions: { ...project.videoOptions },
      }

      const resolveMediaUrl = async (
        sourceUrl: string,
        kind: 'cover' | 'image' | 'video',
        index: number,
      ): Promise<string> => {
        const trimmed = normalizeMediaSourceUrl(sourceUrl)
        if (!trimmed) return ''
        if (mediaCache.has(trimmed)) return mediaCache.get(trimmed) as string
        const blob = await blobFromLocalToken(trimmed, kind === 'video' ? 'video' : 'image')
        if (!blob) {
          const currentProjectMediaPath = toProjectMediaPath(trimmed)
          if (currentProjectMediaPath) {
            const canonicalPath = buildCanonicalProjectMediaPath(projectId, kind, index, currentProjectMediaPath)
            if (canonicalPath !== currentProjectMediaPath) {
              try {
                const response = await fetch(currentProjectMediaPath)
                if (response.ok) {
                  const existingBlob = await response.blob()
                  const uploadedUrl = await uploadMediaBlob({
                    blob: existingBlob,
                    projectId,
                    kind,
                    index,
                    sourceName: `${projectId}-${kind}-${index}.${extractMediaExtFromPath(currentProjectMediaPath, kind === 'video' ? 'mp4' : 'webp')}`,
                  })
                  mediaCache.set(trimmed, uploadedUrl)
                  migratedCount += 1
                  onProgress?.(migratedCount, totalToMigrate)
                  return uploadedUrl
                }
              } catch {
                // ignore and fallback below
              }
              const existingCanonical = await resolveExistingPublishedMediaUrl({ projectId, kind, index })
              if (existingCanonical) {
                mediaCache.set(trimmed, existingCanonical)
                return existingCanonical
              }
            }
            mediaCache.set(trimmed, canonicalPath)
            return canonicalPath
          }

          const isEphemeralLocal = trimmed.startsWith('blob:') || isLocalImageToken(trimmed) || isLocalVideoToken(trimmed)
          if (isEphemeralLocal) {
            const existingUrl = await resolveExistingPublishedMediaUrl({ projectId, kind, index })
            if (existingUrl) {
              mediaCache.set(trimmed, existingUrl)
              return existingUrl
            }
            unresolvedLocalCount += 1
          }
          return normalizePublicMediaPath(trimmed)
        }
        const uploadedUrl = await uploadMediaBlob({
          blob,
          projectId,
          kind,
          index,
          sourceName: `${projectId}-${kind}-${index}`,
        })
        mediaCache.set(trimmed, uploadedUrl)
        migratedCount += 1
        onProgress?.(migratedCount, totalToMigrate)
        return uploadedUrl
      }

      nextProject.cover = await resolveMediaUrl(nextProject.cover, 'cover', 1)

      const imageBlocksSource = nextProject.imageBlocks?.length
        ? nextProject.imageBlocks
        : [{
          id: 'block-1',
          images: nextProject.images,
          imageAspectRatios: nextProject.imageAspectRatios ?? [],
        }]

      let imageIndex = 1
      const resolvedImageBlocks = await Promise.all(imageBlocksSource.map(async block => {
        const resolvedImages = await Promise.all((block.images ?? []).map(url => {
          const currentIndex = imageIndex
          imageIndex += 1
          return resolveMediaUrl(url, 'image', currentIndex)
        }))
        const normalizedRows = resolvedImages
          .map((url, rowIndex) => ({
            url,
            ratio: block.imageAspectRatios?.[rowIndex] ?? '4 / 5',
          }))
          .filter(row => Boolean(row.url))
        return {
          id: block.id,
          rows: normalizedRows,
        }
      }))

      const seenImageKeys = new Set<string>()
      const cleanedImageBlocks = resolvedImageBlocks
        .map(block => ({
          id: block.id,
          rows: block.rows.filter(row => {
            const key = makeMediaKey(row.url)
            if (!key) return false
            if (seenImageKeys.has(key)) return false
            seenImageKeys.add(key)
            return true
          }),
        }))
        .filter(block => block.rows.length > 0)

      nextProject.imageBlocks = cleanedImageBlocks.map(block => ({
        id: block.id,
        images: block.rows.map(row => row.url),
        imageAspectRatios: block.rows.map(row => row.ratio),
      }))
      nextProject.images = nextProject.imageBlocks.flatMap(block => block.images)
      nextProject.imageAspectRatios = nextProject.imageBlocks.flatMap(block => block.imageAspectRatios ?? [])

      const sourceVideoUrls = nextProject.videoUrls.length
        ? [...nextProject.videoUrls]
        : (nextProject.videoUrl ? [nextProject.videoUrl] : [])
      const nextVideoUrls = await Promise.all(
        sourceVideoUrls.map((url, index) => resolveMediaUrl(url, 'video', index + 1))
      )
      nextProject.videoUrls = nextVideoUrls
      nextProject.videoUrl = nextVideoUrls[0] ?? ''

      return nextProject
    }))

    if (migratedCount > 0) {
      setSaveLabel(
        lang === 'en'
          ? `Media synced: ${migratedCount} local file(s) converted to public URLs.`
          : `Medias synchronises: ${migratedCount} fichier(s) local(aux) converti(s) en URL publiques.`
      )
    } else if (unresolvedLocalCount > 0) {
      setSaveLabel(
        lang === 'en'
          ? `Warning: ${unresolvedLocalCount} local media file(s) are no longer available in this browser. Re-upload them.`
          : `Attention: ${unresolvedLocalCount} fichier(s) media local(aux) ne sont plus disponibles dans ce navigateur. Reteleverse-les.`
      )
    }

    return {
      ...content,
      projects: sortProjects(projects),
    }
  }

  const uploadPublishedPdfFile = async (blob: Blob): Promise<string> => {
    const response = await fetch('/api/pdf/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'x-pdf-name': 'instories-dossier.pdf',
      },
      body: blob,
    })
    const payload = await response.json() as { ok?: boolean; url?: string; error?: string }
    if (!response.ok || !payload.ok || typeof payload.url !== 'string') {
      throw new Error(payload.error ?? ui('Erreur de synchronisation du PDF'))
    }
    return payload.url
  }

  const handlePublishToRepo = async () => {
    setIsPublishing(true)
    setSaveLabel(ui('Publication en cours...'))
    setPublishProgress({
      step: 'prepare',
      percent: 5,
      label: ui('Préparation'),
      detail: ui('Analyse du contenu local...'),
    })
    try {
      const syncedContent = await syncLocalMediaIntoPublicUrls((uploaded, total) => {
        const percent = total > 0
          ? Math.round(15 + (uploaded / total) * 75)
          : 90
        setPublishProgress({
          step: 'upload',
          percent,
          label: ui('Upload des médias'),
          detail: total > 0
            ? `${ui('Fichiers traités')}: ${uploaded}/${total}`
            : ui('Aucun média local à migrer.'),
        })
      })

      setPublishProgress({
        step: 'snapshot',
        percent: 90,
        label: ui('Génération du PDF'),
        detail: ui('Mise à jour du PDF public...'),
      })

      const generatedPdf = await generatePortfolioPdf(syncedContent, lang)
      const uploadedPdfUrl = await uploadPublishedPdfFile(generatedPdf)
      const versionedPdfUrl = `${uploadedPdfUrl}${uploadedPdfUrl.includes('?') ? '&' : '?'}v=${Date.now()}`
      const publishReadyContent: SiteContent = {
        ...syncedContent,
        pdfReminder: {
          ...syncedContent.pdfReminder,
          pdfUrl: versionedPdfUrl,
        },
      }
      saveSiteContent(publishReadyContent)
      setContent(publishReadyContent)

      setPublishProgress({
        step: 'snapshot',
        percent: 96,
        label: ui('Génération du snapshot'),
        detail: ui('Écriture du contenu publié...'),
      })

      const response = await fetch('/api/content/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: publishReadyContent }),
      })
      const payload = await response.json() as {
        ok?: boolean
        error?: string
        mediaCleanup?: { removed?: number; kept?: number }
      }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? ui('Erreur de publication'))
      }

      const removedCount = Number(payload.mediaCleanup?.removed ?? 0)
      const keptCount = Number(payload.mediaCleanup?.kept ?? 0)
      setPublishProgress({
        step: 'done',
        percent: 100,
        label: ui('Publication prête'),
        detail: removedCount > 0
          ? `${ui('Médias nettoyés')}: ${removedCount} ${ui('supprimé(s)')} · ${keptCount} ${ui('conservé(s)')}. ${ui('Commit + push vers GitHub pour déclencher le déploiement Render.')}`
          : ui('Commit + push vers GitHub pour déclencher le déploiement Render.'),
      })
      setSaveLabel(ui('Publication prête. Le fichier source est à jour: commit + push pour Render.'))
    } catch (error) {
      const message = error instanceof Error ? error.message : ui('Erreur de publication')
      setPublishProgress({
        step: 'error',
        percent: 100,
        label: ui('Erreur de publication'),
        detail: message,
      })
      setSaveLabel(`${ui('Erreur de publication')}: ${message}`)
    } finally {
      setIsPublishing(false)
    }
  }

  const handleTranslateContent = async () => {
    const entries = collectTranslationEntries(content)
    const uniqueTexts = Array.from(new Set(entries.map(entry => entry.text.trim()).filter(Boolean)))

    if (uniqueTexts.length === 0) {
      setSaveLabel(ui('Aucun nouveau texte à traduire.'))
      return
    }

    const toEnglishSet = new Set<string>()
    const toFrenchSet = new Set<string>()

    uniqueTexts.forEach(source => {
      const sourceTrimmed = source.trim()
      const looksFrench = hasFrenchMarkers(sourceTrimmed)
      const looksEnglish = hasEnglishMarkers(sourceTrimmed)

      if (looksFrench && needsApiTranslation(sourceTrimmed, 'en')) {
        toEnglishSet.add(sourceTrimmed)
      }
      if (looksEnglish && needsApiTranslation(sourceTrimmed, 'fr')) {
        toFrenchSet.add(sourceTrimmed)
      }

      if (!looksFrench && !looksEnglish) {
        const fallbackTarget: LanguageCode = lang === 'fr' ? 'en' : 'fr'
        if (needsApiTranslation(sourceTrimmed, fallbackTarget)) {
          if (fallbackTarget === 'en') toEnglishSet.add(sourceTrimmed)
          else toFrenchSet.add(sourceTrimmed)
        }
      }
    })

    const toEnglish = Array.from(toEnglishSet)
    const toFrench = Array.from(toFrenchSet)
    if (toEnglish.length === 0 && toFrench.length === 0) {
      setSaveLabel(ui('Aucune traduction manquante.'))
      return
    }

    setIsTranslatingText(true)
    setSaveLabel(ui('Traduction en cours...'))

    try {
      const requestTranslations = async (targetLang: LanguageCode, texts: string[]) => {
        if (texts.length === 0) return [] as string[]
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetLang,
            texts,
          }),
        })

        const payload = await response.json() as { translations?: string[]; error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? ui('Erreur de traduction'))
        }
        return Array.isArray(payload.translations) ? payload.translations : []
      }

      const [translationsToEnglish, translationsToFrench] = await Promise.all([
        requestTranslations('en', toEnglish),
        requestTranslations('fr', toFrench),
      ])

      const translationMap: Record<string, string> = {}

      toEnglish.forEach((source, index) => {
        const translated = translationsToEnglish[index]
        const target = typeof translated === 'string' && translated.trim() ? translated.trim() : source
        if (target !== source) translationMap[source] = target
      })

      toFrench.forEach((source, index) => {
        const translated = translationsToFrench[index]
        const target = typeof translated === 'string' && translated.trim() ? translated.trim() : source
        if (target !== source) translationMap[target] = source
      })

      addCustomTranslations(translationMap)
      const totalAdded = Object.keys(translationMap).length
      if (totalAdded === 0) {
        setSaveLabel(ui('Aucune traduction manquante.'))
      } else {
        setSaveLabel(
          lang === 'en'
            ? `${totalAdded} translation pair(s) updated.`
            : `${totalAdded} paire(s) de traduction mises à jour.`
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : ui('Erreur de traduction')
      if (/openai_api_key/i.test(message)) {
        setSaveLabel(ui('Clé API OpenAI manquante. Ajoute OPENAI_API_KEY dans .env.local puis redémarre le serveur.'))
      } else {
        setSaveLabel(`${ui('Erreur de traduction')}: ${message}`)
      }
    } finally {
      setIsTranslatingText(false)
    }
  }

  const handleSaveNow = () => {
    try {
      saveSiteContent(content)
      setSaveLabel(ui('Sauvegarde manuelle effectuée.'))
    } catch {
      setSaveLabel(ui('Impossible de sauvegarder localement. Vérifie l’espace navigateur ou le mode privé.'))
    }
  }

  const handleExportJson = () => {
    try {
      const payload = JSON.stringify(content, null, 2)
      const blob = new Blob([payload], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      link.href = url
      link.download = `instories-content-${date}.json`
      link.click()
      URL.revokeObjectURL(url)
      setSaveLabel(ui('JSON exporté. Les médias locaux ne sont pas inclus.'))
    } catch {
      setSaveLabel(ui('Impossible de sauvegarder localement. Vérifie l’espace navigateur ou le mode privé.'))
    }
  }

  const handleExportBehancePack = async () => {
    try {
      const { pack, markdown, csv } = buildBehanceExportPack(content, lang, window.location.origin)
      const date = new Date().toISOString().slice(0, 10)
      const base = `instories-behance-pack-${date}.zip`
      const zip = new JSZip()

      zip.file('behance-pack.json', JSON.stringify(pack, null, 2))
      zip.file('behance-pack.md', markdown)
      zip.file('behance-pack.csv', csv)
      zip.file(
        'README.txt',
        lang === 'en'
          ? 'Use the markdown for copy/paste and the CSV for planning your Behance posts.\nIf media is missing, re-upload local files to get public URLs first.'
          : 'Utilise le markdown pour copier/coller et le CSV pour planifier tes posts Behance.\nSi des medias manquent, reteleverse les fichiers locaux pour obtenir des URLs publiques.'
      )

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = base
      link.click()
      URL.revokeObjectURL(url)

      setSaveLabel(
        pack.unresolvedMediaCount > 0
          ? (lang === 'en'
            ? `Behance ZIP exported. ${pack.unresolvedMediaCount} local media file(s) still need re-upload.`
            : `ZIP Behance exporte. ${pack.unresolvedMediaCount} media local(aux) a reteleverser.`)
          : (lang === 'en'
            ? 'Behance ZIP exported.'
            : 'ZIP Behance exporte.')
      )
    } catch {
      setSaveLabel(
        lang === 'en'
          ? 'Unable to export the Behance pack right now.'
          : 'Impossible d exporter le pack Behance pour le moment.'
      )
    }
  }

  const handleGeneratePortfolioPdf = async () => {
    try {
      setIsGeneratingPdf(true)
      const blob = await generatePortfolioPdf(content, lang)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const date = new Date().toISOString().slice(0, 10)
      const fileBase = lang === 'en' ? 'instories-portfolio-deck' : 'instories-dossier-portfolio'
      link.href = url
      link.download = `${fileBase}-${date}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      let isSynced = true
      try {
        const uploadedPdfUrl = await uploadPublishedPdfFile(blob)
        const versionedPdfUrl = `${uploadedPdfUrl}${uploadedPdfUrl.includes('?') ? '&' : '?'}v=${Date.now()}`
        setContent(current => ({
          ...current,
          pdfReminder: {
            ...current.pdfReminder,
            pdfUrl: versionedPdfUrl,
          },
        }))
      } catch {
        isSynced = false
      }
      setSaveLabel(
        isSynced
          ? ui('PDF généré et synchronisé pour le site publié.')
          : ui('PDF généré localement, mais non synchronisé pour Render.')
      )
    } catch {
      setSaveLabel(ui('Impossible de générer le PDF pour le moment.'))
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleImportJson = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as SiteContent
      saveSiteContent(parsed)
      const latest = localizeSiteContent(loadSiteContent(), lang)
      setContent({ ...latest, projects: sortProjects(latest.projects) })
      setSelectedProjectId(latest.projects[0]?.id ?? '')
      setSaveLabel(ui('Contenu JSON importé. Vérifie les médias locaux (ils dépendent de ce navigateur).'))
    } catch {
      setSaveLabel(ui('Import JSON annulé: fichier invalide.'))
    }
  }

  return (
    <main className="studio-shell">
      <Seo
        title={`${ui('Studio contenu')} — InStories`}
        description={ui('Interface locale de gestion des contenus InStories.')}
        path="/content"
        noindex
      />
      <aside className="studio-sidebar">
        <div>
          <p className="studio-kicker">{ui('Admin contenu')}</p>
          <h1>{ui('InStories Studio Contenu')}</h1>
          <p className="studio-muted">
            {ui('Alimente le site, organise les contenus, et sauvegarde localement dans ce navigateur.')}
          </p>
        </div>

        <nav className="studio-nav">
          {sections.map(item => (
            <button
              key={item.id}
              type="button"
              className={`studio-nav-item${section === item.id ? ' active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <strong>{ui(item.label)}</strong>
              <span>{ui(item.desc)}</span>
            </button>
          ))}
        </nav>

        <div className="studio-sidebar-footer">
          <p>{ui(saveLabel)}</p>
          <p>{publishedCount} {ui('projet(s) publié(s)')}</p>
          <a href="/" className="studio-link">
            {ui('Ouvrir le site')}
          </a>
        </div>
      </aside>

      <section className="studio-main">
        {section === 'home' && (
          <>
            <StudioCard title="En-tête">
              <div className="studio-grid">
                <StudioInput
                  label="Ligne 1"
                  value={content.home.heroLine1}
                  onChange={e => setContent({ ...content, home: { ...content.home, heroLine1: e.target.value } })}
                />
                <StudioInput
                  label="Ligne 2"
                  value={content.home.heroLine2}
                  onChange={e => setContent({ ...content, home: { ...content.home, heroLine2: e.target.value } })}
                />
              </div>
              <StudioInput
                label="Signature"
                value={content.home.heroTagline}
                onChange={e => setContent({ ...content, home: { ...content.home, heroTagline: e.target.value } })}
              />
              <StudioInput
                label="Ligne de localisation"
                value={content.home.heroLocation}
                onChange={e => setContent({ ...content, home: { ...content.home, heroLocation: e.target.value } })}
              />
            </StudioCard>

            <StudioCard title="Sections Accueil">
              <div className="studio-grid">
                <StudioInput
                  label="Titre projets"
                  value={content.home.projectsTitle}
                  onChange={e => setContent({ ...content, home: { ...content.home, projectsTitle: e.target.value } })}
                />
                <StudioInput
                  label="Titre services"
                  value={content.home.servicesTitle}
                  onChange={e => setContent({ ...content, home: { ...content.home, servicesTitle: e.target.value } })}
                />
              </div>
              <StudioTextarea
                label="Intro services"
                rows={4}
                value={content.home.servicesIntro}
                onChange={e => setContent({ ...content, home: { ...content.home, servicesIntro: e.target.value } })}
              />
              <StudioInput
                label="Eyebrow à propos"
                value={content.home.aboutEyebrow}
                onChange={e => setContent({ ...content, home: { ...content.home, aboutEyebrow: e.target.value } })}
              />
              <StudioTextarea
                label="Citation à propos"
                rows={3}
                value={content.home.aboutQuote}
                onChange={e => setContent({ ...content, home: { ...content.home, aboutQuote: e.target.value } })}
              />
              <div className="studio-grid">
                <StudioInput
                  label="Label bouton à propos"
                  value={content.home.aboutCtaLabel}
                  onChange={e => setContent({ ...content, home: { ...content.home, aboutCtaLabel: e.target.value } })}
                />
                <StudioInput
                  label="Texte bouton contact"
                  value={content.home.contactCtaButton}
                  onChange={e => setContent({ ...content, home: { ...content.home, contactCtaButton: e.target.value } })}
                />
              </div>
              <StudioTextarea
                label="Titre grand CTA"
                rows={3}
                value={content.home.contactCtaTitle}
                onChange={e => setContent({ ...content, home: { ...content.home, contactCtaTitle: e.target.value } })}
              />
              <StudioTextarea
                label="Posts Instagram (une URL de publication/reel par ligne)"
                rows={4}
                placeholder={'https://www.instagram.com/p/XXXXXXXXXXX/\nhttps://www.instagram.com/reel/YYYYYYYYYYY/'}
                value={content.home.instagramPostUrls.join('\n')}
                onChange={e => setContent({
                  ...content,
                  home: {
                    ...content.home,
                    instagramPostUrls: e.target.value
                      .split('\n')
                      .map(item => item.trim()),
                  },
                })}
              />
              <p className="studio-video-note">
                {ui('Automatique: le site tente les 6 derniers posts Instagram. Ce champ sert de secours manuel si le flux auto échoue.')}
              </p>
            </StudioCard>

            <StudioCard title="Liste des services">
              <div className="studio-stack">
                {content.home.services.map((service, index) => (
                  <div key={`home-service-${index}`} className="studio-inline-grid">
                    <StudioInput
                      label="Service"
                      value={service.name}
                      onChange={e => {
                        const next = [...content.home.services]
                        next[index] = { ...service, name: e.target.value }
                        setContent({ ...content, home: { ...content.home, services: next } })
                      }}
                    />
                    <StudioInput
                      label="Description"
                      value={service.desc}
                      onChange={e => {
                        const next = [...content.home.services]
                        next[index] = { ...service, desc: e.target.value }
                        setContent({ ...content, home: { ...content.home, services: next } })
                      }}
                    />
                    <button
                      type="button"
                      className="studio-remove"
                      onClick={() => {
                        const next = content.home.services.filter((_, i) => i !== index)
                        setContent({ ...content, home: { ...content.home, services: next } })
                      }}
                    >
                      {ui('Supprimer')}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => {
                    setContent({
                      ...content,
                      home: {
                        ...content.home,
                        services: [...content.home.services, {
                          name: ui('Nouveau service'),
                          desc: ui('Description service'),
                        }],
                      },
                    })
                  }}
                >
                  {ui('Ajouter un service')}
                </button>
              </div>
            </StudioCard>
          </>
        )}

        {section === 'about' && (
          <>
            <StudioCard title="À propos">
              <div className="studio-grid">
                <StudioInput
                  label="Fondé en (Ex: Est. 2009)"
                  value={content.about.estLabel}
                  onChange={e => setContent({ ...content, about: { ...content.about, estLabel: e.target.value } })}
                />
                <StudioInput
                  label="Label panneau photo"
                  value={content.about.splitDarkLabel}
                  onChange={e => setContent({ ...content, about: { ...content.about, splitDarkLabel: e.target.value } })}
                />
              </div>
              <StudioTextarea
                label="Nom affiché"
                rows={2}
                value={content.about.name}
                onChange={e => setContent({ ...content, about: { ...content.about, name: e.target.value } })}
              />
              <StudioInput
                label="Ligne rôle"
                value={content.about.roleLine}
                onChange={e => setContent({ ...content, about: { ...content.about, roleLine: e.target.value } })}
              />
              <StudioInput
                label="Label fond sombre"
                value={content.about.splitDarkLabel}
                onChange={e => setContent({ ...content, about: { ...content.about, splitDarkLabel: e.target.value } })}
              />
              <StudioTextarea
                label="Biographie"
                rows={6}
                value={content.about.splitIntro}
                onChange={e => setContent({ ...content, about: { ...content.about, splitIntro: e.target.value } })}
              />
              <div className="studio-field">
                <span>{ui('Photo (panneau gauche)')}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {content.about.photo && (
                    <div style={{ position: 'relative', width: '100%', maxWidth: '220px' }}>
                      <ResolvedImage
                        src={content.about.photo}
                        alt="Photo profil"
                        style={{ width: '100%', borderRadius: '8px', display: 'block', objectFit: 'cover', aspectRatio: '3/4' }}
                      />
                      <button
                        type="button"
                        className="studio-remove"
                        style={{ marginTop: '6px' }}
                        onClick={() => setContent({ ...content, about: { ...content.about, photo: '' } })}
                      >
                        {ui('Supprimer la photo')}
                      </button>
                    </div>
                  )}
                  <div>
                    <button
                      type="button"
                      className="studio-secondary"
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/jpeg,image/png,image/webp,image/avif'
                        input.onchange = async () => {
                          const file = input.files?.[0]
                          if (!file) return
                          try {
                            const url = await saveLocalImage(file, { maxDimension: 1800, quality: 0.88 })
                            setContent(prev => ({ ...prev, about: { ...prev.about, photo: url } }))
                          } catch {
                            const objectUrl = URL.createObjectURL(file)
                            setContent(prev => ({ ...prev, about: { ...prev.about, photo: objectUrl } }))
                          }
                        }
                        input.click()
                      }}
                    >
                      {ui('Téléverser une photo')}
                    </button>
                  </div>
                </div>
              </div>
              <StudioTextarea
                label="Citation manifeste"
                rows={3}
                value={content.about.manifestoQuote}
                onChange={e => setContent({ ...content, about: { ...content.about, manifestoQuote: e.target.value } })}
              />
            </StudioCard>

            <StudioCard title="Compétences, stats, agences">
              <CsvInput
                label="Compétences (séparées par des virgules)"
                items={content.about.skills}
                onCommit={next => setContent({
                  ...content,
                  about: {
                    ...content.about,
                    skills: next,
                  },
                })}
              />
              <CsvInput
                label="Agences (séparées par des virgules)"
                items={content.about.agencies}
                onCommit={next => setContent({
                  ...content,
                  about: {
                    ...content.about,
                    agencies: next,
                  },
                })}
              />
              <div className="studio-stack">
                {content.about.stats.map((stat, index) => (
                  <div key={`about-stat-${index}`} className="studio-inline-grid studio-inline-grid--stats">
                    <StudioInput
                      label="Valeur"
                      value={stat.value}
                      onChange={e => {
                        const next = [...content.about.stats]
                        next[index] = { ...stat, value: e.target.value }
                        setContent({ ...content, about: { ...content.about, stats: next } })
                      }}
                    />
                    <StudioInput
                      label="Label"
                      value={stat.label}
                      onChange={e => {
                        const next = [...content.about.stats]
                        next[index] = { ...stat, label: e.target.value }
                        setContent({ ...content, about: { ...content.about, stats: next } })
                      }}
                    />
                    <button
                      type="button"
                      className="studio-remove"
                      onClick={() => {
                        const next = content.about.stats.filter((_, i) => i !== index)
                        setContent({ ...content, about: { ...content.about, stats: next } })
                      }}
                    >
                      {ui('Supprimer')}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => {
                    setContent({
                      ...content,
                      about: {
                        ...content.about,
                        stats: [...content.about.stats, { value: '0', label: ui('Nouveau') }],
                      },
                    })
                  }}
                >
                  {ui('Ajouter une stat')}
                </button>
              </div>
              <div className="studio-grid">
                <StudioInput
                  label="Titre CTA"
                  value={content.about.ctaTitle}
                  onChange={e => setContent({ ...content, about: { ...content.about, ctaTitle: e.target.value } })}
                />
                <StudioInput
                  label="Label CTA"
                  value={content.about.ctaLabel}
                  onChange={e => setContent({ ...content, about: { ...content.about, ctaLabel: e.target.value } })}
                />
              </div>
            </StudioCard>
          </>
        )}

        {section === 'contact' && (
          <>
            <StudioCard title="Coordonnées">
              <StudioInput
                label="Titre"
                value={content.contact.title}
                onChange={e => setContent({ ...content, contact: { ...content.contact, title: e.target.value } })}
              />
              <div className="studio-grid">
                <StudioInput
                  label="Email"
                  value={content.contact.email}
                  onChange={e => setContent({ ...content, contact: { ...content.contact, email: e.target.value } })}
                />
                <StudioInput
                  label="Téléphone"
                  value={content.contact.phone}
                  onChange={e => setContent({ ...content, contact: { ...content.contact, phone: e.target.value } })}
                />
              </div>
              <StudioTextarea
                label="Adresse (une ligne par entrée)"
                rows={3}
                value={content.contact.addressLines.join('\n')}
                onChange={e => setContent({
                  ...content,
                  contact: {
                    ...content.contact,
                    addressLines: e.target.value.split('\n').map(item => item.trim()).filter(Boolean),
                  },
                })}
              />
            </StudioCard>

            <StudioCard title="Disponibilité et réseaux">
              <StudioInput
                label="Badge disponibilité"
                value={content.contact.availabilityLabel}
                onChange={e => setContent({
                  ...content,
                  contact: { ...content.contact, availabilityLabel: e.target.value },
                })}
              />
              <StudioTextarea
                label="Texte disponibilité"
                rows={3}
                value={content.contact.availabilityText}
                onChange={e => setContent({
                  ...content,
                  contact: { ...content.contact, availabilityText: e.target.value },
                })}
              />
              <SocialLinksEditor
                links={content.contact.socials}
                onChange={next => setContent({ ...content, contact: { ...content.contact, socials: next } })}
              />
            </StudioCard>
          </>
        )}

        {section === 'projects' && (
          <div className="studio-projects-layout">
            <StudioCard title="Liste des projets">
              <div className="studio-project-list">
                {sortProjects(content.projects).map((project, index) => (
                  <div
                    key={project.id}
                    className={`studio-project-item studio-project-item--draggable${selectedProject?.id === project.id ? ' active' : ''}${dragOverProjectId === project.id && draggedProjectId && draggedProjectId !== project.id ? ' is-drag-over' : ''}${draggedProjectId === project.id ? ' is-dragging' : ''}`}
                    draggable={content.projects.length > 1}
                    onDragStart={handleProjectDragStart(project.id)}
                    onDragOver={handleProjectDragOver(project.id)}
                    onDrop={handleProjectDrop(project.id)}
                    onDragEnd={clearProjectDragState}
                    title={ui('Glisser pour réordonner')}
                  >
                    <button
                      type="button"
                      className="studio-project-select"
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <strong>{project.client}</strong>
                      <span>{project.title}</span>
                      <em>{project.status === 'published' ? ui('Publié') : ui('Brouillon')}</em>
                    </button>
                    <div className="studio-project-controls">
                      <button type="button" className="studio-order-btn" onClick={() => moveProject(project.id, -1)} disabled={index === 0}>
                        ↑
                      </button>
                      <button
                        type="button"
                        className="studio-order-btn"
                        onClick={() => moveProject(project.id, 1)}
                        disabled={index === content.projects.length - 1}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="studio-secondary"
                onClick={() => {
                  const draftProject = createEmptyProject(lang)
                  const nextProject = {
                    ...draftProject,
                    id: ensureUniqueProjectSlug(
                      buildProjectSlugFromFields(draftProject.client, draftProject.title),
                      content.projects,
                    ),
                  }
                  setContent({
                    ...content,
                    projects: sortProjects([...content.projects, { ...nextProject, order: content.projects.length }]),
                  })
                  setSelectedProjectId(nextProject.id)
                }}
              >
                {ui('Ajouter un projet')}
              </button>
            </StudioCard>

            {selectedProject && (
              <StudioCard title="Édition du projet">
                <div className="studio-project-status-row">
                  <label className="studio-toggle">
                    <span>{ui('Statut')}</span>
                    <select
                      value={selectedProject.status}
                      onChange={e => setProject(project => ({
                        ...project,
                        status: e.target.value as 'draft' | 'published',
                      }))}
                    >
                      <option value="draft">{ui('Brouillon')}</option>
                      <option value="published">{ui('Publié')}</option>
                    </select>
                  </label>
                  <div className="studio-project-preview-meta">
                    <span>{ui('Ordre')} #{selectedProject.order + 1}</span>
                    <span>{ui('Lien')}: {getProjectRoutePath(selectedProject)}</span>
                  </div>
                </div>
                <div className="studio-grid">
                  <StudioInput
                    label="Client"
                    value={selectedProject.client}
                    onChange={e => {
                      const nextClient = e.target.value
                      let nextSelectedId = selectedProject.id
                      setContent(current => ({
                        ...current,
                        projects: sortProjects(current.projects.map(project => {
                          if (project.id !== selectedProject.id) return project
                          const shouldAuto = shouldAutoUpdateProjectSlug(project)
                          const nextId = shouldAuto
                            ? ensureUniqueProjectSlug(
                              buildProjectSlugFromFields(nextClient, project.title),
                              current.projects,
                              project.id,
                            )
                            : project.id
                          nextSelectedId = nextId
                          return { ...project, client: nextClient, id: nextId }
                        })),
                      }))
                      if (nextSelectedId !== selectedProject.id) {
                        setSelectedProjectId(nextSelectedId)
                      }
                    }}
                  />
                  <StudioInput
                    label="Titre"
                    value={selectedProject.title}
                    onChange={e => {
                      const nextTitle = e.target.value
                      let nextSelectedId = selectedProject.id
                      setContent(current => ({
                        ...current,
                        projects: sortProjects(current.projects.map(project => {
                          if (project.id !== selectedProject.id) return project
                          const shouldAuto = shouldAutoUpdateProjectSlug(project)
                          const nextId = shouldAuto
                            ? ensureUniqueProjectSlug(
                              buildProjectSlugFromFields(project.client, nextTitle),
                              current.projects,
                              project.id,
                            )
                            : project.id
                          nextSelectedId = nextId
                          return { ...project, title: nextTitle, id: nextId }
                        })),
                      }))
                      if (nextSelectedId !== selectedProject.id) {
                        setSelectedProjectId(nextSelectedId)
                      }
                    }}
                  />
                </div>
                <div className="studio-grid">
                  <StudioInput
                    label="Slug"
                    value={selectedProject.id}
                    onChange={e => {
                      const cleaned = sanitizeProjectSlug(e.target.value)
                      const fallback = buildProjectSlugFromFields(selectedProject.client, selectedProject.title)
                      const desired = cleaned || fallback || `project-${Date.now()}`
                      const nextId = ensureUniqueProjectSlug(desired, content.projects, selectedProject.id)
                      setSelectedProjectId(nextId)
                      setProject(project => ({ ...project, id: nextId }))
                    }}
                  />
                  <StudioInput
                    label="Année"
                    value={selectedProject.year}
                    onChange={e => setProject(project => ({ ...project, year: e.target.value }))}
                  />
                </div>
                <div className="studio-grid">
                  <StudioInput
                    label="Signature"
                    value={selectedProject.tagline}
                    onChange={e => setProject(project => ({ ...project, tagline: e.target.value }))}
                  />
                  <StudioInput
                    label="Couleur de fond"
                    value={selectedProject.color}
                    onChange={e => setProject(project => ({ ...project, color: e.target.value }))}
                  />
                </div>
                <CsvInput
                  label="Catégories (séparées par des virgules)"
                  items={selectedProject.category}
                  onCommit={next => setProject(project => ({
                    ...project,
                    category: next,
                  }))}
                />
                <CsvInput
                  label="Agences (séparées par des virgules)"
                  items={selectedProject.agencies}
                  onCommit={next => setProject(project => ({
                    ...project,
                    agencies: next,
                  }))}
                />
                <CsvInput
                  label="Livrables (séparés par des virgules)"
                  items={selectedProject.deliverables}
                  onCommit={next => setProject(project => ({
                    ...project,
                    deliverables: next,
                  }))}
                />
                <CsvInput
                  label="Outils (séparés par des virgules)"
                  items={selectedProject.tools}
                  onCommit={next => setProject(project => ({
                    ...project,
                    tools: next,
                  }))}
                />
                <div className="studio-media-help">
                  <p>{ui('Utilise des liens directs d’images (CDN/Cloudinary/asset public). Évite les liens de pages.')}</p>
                  <p>{ui('Formats recommandés: AVIF ou WebP (priorité), puis JPG/PNG. Taille conseillée: couverture 2200px de large max, galerie 1800px max.')}</p>
                  <p className="studio-media-help-links">
                    {ui('Liens utiles')}:
                    {' '}
                    <a href="https://cloudinary.com/documentation/image_upload_api_reference" target="_blank" rel="noreferrer">
                      Cloudinary Upload API
                    </a>
                    {' · '}
                    <a href="https://squoosh.app/" target="_blank" rel="noreferrer">
                      Squoosh (compression)
                    </a>
                    {' · '}
                    <a href="https://tinypng.com/" target="_blank" rel="noreferrer">
                      TinyPNG
                    </a>
                  </p>
                </div>
                <section className="studio-media-group">
                  <div className="studio-media-group-head">
                    <h3>{ui('Bloc images')}</h3>
                    <span>{activeImageRows.length} {ui('élément(s)')}</span>
                  </div>
                  <div className="studio-image-block-toolbar">
                    {imageBlocks.map((block, blockIndex) => (
                      <button
                        key={block.id}
                        type="button"
                        className={`studio-image-block-chip${blockIndex === activeImageBlockIndex ? ' is-active' : ''}${dragOverImageBlockIndex === blockIndex && draggedImageBlockIndex !== null && draggedImageBlockIndex !== blockIndex ? ' is-drag-over' : ''}`}
                        onClick={() => setActiveImageBlockIndex(blockIndex)}
                        draggable={imageBlocks.length > 1}
                        onDragStart={handleImageBlockDragStart(blockIndex)}
                        onDragOver={handleImageBlockDragOver(blockIndex)}
                        onDrop={handleImageBlockDrop(blockIndex)}
                        onDragEnd={clearImageBlockDragState}
                        title={ui('Glisser pour réordonner')}
                      >
                        {ui('Bloc')} {blockIndex + 1}
                      </button>
                    ))}
                    {imageBlocks.length > 1 && (
                      <div className="studio-image-block-order">
                        <span>{ui('Ordre bloc')}</span>
                        <select
                          value={activeImageBlockIndex}
                          onChange={e => moveImageBlock(activeImageBlockIndex, Number(e.target.value))}
                        >
                          {imageBlocks.map((_, orderIndex) => (
                            <option key={`block-order-${orderIndex}`} value={orderIndex}>
                              {orderIndex + 1}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="studio-image-block-shift"
                          onClick={() => moveActiveImageBlock(-1)}
                          disabled={activeImageBlockIndex === 0}
                          aria-label={ui('Bloc avant')}
                          title={ui('Bloc avant')}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="studio-image-block-shift"
                          onClick={() => moveActiveImageBlock(1)}
                          disabled={activeImageBlockIndex === imageBlocks.length - 1}
                          aria-label={ui('Bloc après')}
                          title={ui('Bloc après')}
                        >
                          ↓
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      className="studio-image-block-add"
                      onClick={addImageBlock}
                    >
                      + {ui('Ajouter un bloc image')}
                    </button>
                    {imageBlocks.length > 1 && (
                      <button
                        type="button"
                        className="studio-image-block-delete"
                        onClick={() => removeImageBlock(activeImageBlockIndex)}
                      >
                        {ui('Supprimer le bloc image')}
                      </button>
                    )}
                  </div>
                  <div className="studio-media-card-grid studio-media-card-grid--images">
                    {activeImageRows.map((row, index) => {
                      const isCover = selectedProject.cover.trim() === row.url.trim()
                      return (
                        <article
                          key={`image-card-${index}`}
                          className={`studio-media-card studio-media-card--draggable${dragOverImageRowIndex === index && draggedImageRowIndex !== null && draggedImageRowIndex !== index ? ' is-drag-over' : ''}${draggedImageRowIndex === index ? ' is-dragging' : ''}`}
                          draggable={activeImageRows.length > 1}
                          onDragStart={handleImageRowDragStart(index)}
                          onDragOver={handleImageRowDragOver(index)}
                          onDrop={handleImageRowDrop(index)}
                          onDragEnd={clearImageRowDragState}
                          title={ui('Glisser pour réordonner')}
                        >
                          <div className="studio-media-order-controls">
                            <button
                              type="button"
                              className="studio-media-order-btn"
                              onClick={() => moveImageRow(index, -1)}
                              disabled={index === 0}
                              aria-label={ui('Déplacer avant')}
                              title={ui('Déplacer avant')}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="studio-media-order-btn"
                              onClick={() => moveImageRow(index, 1)}
                              disabled={index === activeImageRows.length - 1}
                              aria-label={ui('Déplacer après')}
                              title={ui('Déplacer après')}
                            >
                              ↓
                            </button>
                          </div>
                          <div className="studio-media-top-actions">
                            <button
                              type="button"
                              className={`studio-media-cover-icon${isCover ? ' is-active' : ''}`}
                              onClick={() => setImageAsCover(row.url)}
                              aria-label={isCover ? ui('Image de couverture') : ui('Mettre en couverture')}
                              title={isCover ? ui('Image de couverture') : ui('Mettre en couverture')}
                            >
                              ◎
                            </button>
                            <button
                              type="button"
                              className="studio-media-trash"
                              onClick={() => removeImageRow(index)}
                              aria-label={ui('Supprimer')}
                              title={ui('Supprimer')}
                            >
                              🗑
                            </button>
                          </div>
                          {isCover && (
                            <span className="studio-media-cover-badge">
                              {ui('Image de couverture')}
                            </span>
                          )}
                          <div className="studio-media-card-preview studio-media-card-preview--image">
                            <ResolvedImage
                              src={row.url}
                              projectId={selectedProject.id}
                              mediaKind="image"
                              mediaIndex={index}
                              alt={`${selectedProject.title} image ${index + 1}`}
                              loading="lazy"
                            />
                          </div>
                          <label className="studio-media-card-field">
                            <span>{ui('Ordre')}</span>
                            <select
                              value={index}
                              onChange={e => moveImageRowTo(index, Number(e.target.value))}
                            >
                              {activeImageRows.map((_, orderIndex) => (
                                <option key={`img-order-${orderIndex}`} value={orderIndex}>
                                  {orderIndex + 1}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="studio-media-card-field">
                            <span>{ui('Format image')}</span>
                            <select
                              value={row.aspectRatio}
                              onChange={e => {
                                const next = [...activeImageRows]
                                next[index] = { ...row, aspectRatio: e.target.value as ImageAspectRatio }
                                updateImageBlockRows(activeImageBlockIndex, next)
                              }}
                            >
                              {IMAGE_ASPECT_RATIO_OPTIONS.map(option => (
                                <option key={`img-ratio-${option.value}`} value={option.value}>
                                  {ui(option.label)}
                                </option>
                              ))}
                            </select>
                          </label>
                        </article>
                      )
                    })}
                    <button
                      type="button"
                      className={`studio-media-add-card studio-media-add-card--image${isImageDropActive ? ' is-drop-active' : ''}`}
                      onClick={() => galleryUploadRef.current?.click()}
                      onDragEnter={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        setIsImageDropActive(true)
                      }}
                      onDragOver={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        event.dataTransfer.dropEffect = 'copy'
                        if (!isImageDropActive) setIsImageDropActive(true)
                      }}
                      onDragLeave={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        const related = event.relatedTarget as Node | null
                        if (related && event.currentTarget.contains(related)) return
                        setIsImageDropActive(false)
                      }}
                      onDrop={handleImageDrop}
                    >
                      <span className="studio-media-add-icon">+</span>
                      <span>{isImageDropActive ? ui('Déposer les images') : ui('Ajouter un visuel')}</span>
                    </button>
                  </div>
                  {activeImageRows.length === 0 && (
                    <p className="studio-video-note">{ui('Aucune image. Ajoute une URL ou téléverse des images.')}</p>
                  )}
                  <div className="studio-media-quick-add">
                    <input
                      value={newImageUrl}
                      placeholder="https://.../image-01.webp"
                      onChange={e => setNewImageUrl(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addImageByUrl()
                        }
                      }}
                    />
                    <button type="button" className="studio-secondary" onClick={addImageByUrl}>
                      {ui('Ajouter via URL')}
                    </button>
                  </div>
                  <div className="studio-upload-row">
                    <button
                      type="button"
                      className="studio-secondary"
                      onClick={() => galleryUploadRef.current?.click()}
                    >
                      {ui('Téléverser des images galerie')}
                    </button>
                    <input
                      ref={galleryUploadRef}
                      type="file"
                      accept="image/avif,image/webp,image/jpeg,image/png"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => { void handleGalleryUpload(e.target.files) }}
                    />
                  </div>
                  <div className="studio-video-options">
                    <div className="studio-field">
                      <span>{ui('Zone visible du header (couverture)')}</span>
                      {selectedProject.cover ? (
                        <button
                          type="button"
                          className="studio-cover-focus-editor"
                          onClick={e => {
                            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                            const x = ((e.clientX - rect.left) / rect.width) * 100
                            const y = ((e.clientY - rect.top) / rect.height) * 100
                            setCoverFocalPoint(x, y)
                          }}
                        >
                          <ResolvedImage
                            src={selectedProject.cover}
                            projectId={selectedProject.id}
                            mediaKind="cover"
                            alt={selectedProject.title}
                            className="studio-cover-focus-image"
                            style={{ objectPosition: `${coverFocalX}% ${coverFocalY}%` }}
                          />
                          <span
                            className="studio-cover-focus-target"
                            style={{ left: `${coverFocalX}%`, top: `${coverFocalY}%` }}
                          />
                        </button>
                      ) : (
                        <p className="studio-video-note">{ui('Ajoute une image de couverture pour choisir le cadrage.')}</p>
                      )}
                    </div>
                    <div className="studio-grid">
                      <label className="studio-field">
                        <span>{ui('Position horizontale')} ({Math.round(coverFocalX)}%)</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={coverFocalX}
                          onChange={e => setCoverFocalPoint(Number(e.target.value), coverFocalY)}
                        />
                      </label>
                      <label className="studio-field">
                        <span>{ui('Position verticale')} ({Math.round(coverFocalY)}%)</span>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={coverFocalY}
                          onChange={e => setCoverFocalPoint(coverFocalX, Number(e.target.value))}
                        />
                      </label>
                    </div>
                  </div>
                <p className="studio-upload-note">
                  {ui('Import local = image compressée + stockage persistant local. En production, privilégie un CDN (Cloudinary) pour garder URL publiques.')}
                </p>
                <p className="studio-upload-note">
                  {ui('Si une image ou vidéo locale disparaît, le fichier local n’est plus disponible dans ce navigateur. Utilise une URL publique ou retéléverse.')}
                </p>
                </section>

                <section className="studio-media-group">
                  <div className="studio-media-group-head">
                    <h3>{ui('Bloc vidéos')}</h3>
                    <span>{videoRows.length} {ui('élément(s)')}</span>
                  </div>
                  <div className="studio-media-card-grid studio-media-card-grid--videos">
                    {videoRows.map((row, index) => (
                      <article
                        key={`video-card-${index}`}
                        className={`studio-media-card studio-media-card--video studio-media-card--draggable${dragOverVideoRowIndex === index && draggedVideoRowIndex !== null && draggedVideoRowIndex !== index ? ' is-drag-over' : ''}${draggedVideoRowIndex === index ? ' is-dragging' : ''}`}
                        draggable={videoRows.length > 1}
                        onDragStart={handleVideoRowDragStart(index)}
                        onDragOver={handleVideoRowDragOver(index)}
                        onDrop={handleVideoRowDrop(index)}
                        onDragEnd={clearVideoRowDragState}
                        title={ui('Glisser pour réordonner')}
                      >
                        <div className="studio-media-order-controls">
                          <button
                            type="button"
                            className="studio-media-order-btn"
                            onClick={() => moveVideoRow(index, -1)}
                            disabled={index === 0}
                            aria-label={ui('Déplacer avant')}
                            title={ui('Déplacer avant')}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="studio-media-order-btn"
                            onClick={() => moveVideoRow(index, 1)}
                            disabled={index === videoRows.length - 1}
                            aria-label={ui('Déplacer après')}
                            title={ui('Déplacer après')}
                          >
                            ↓
                          </button>
                        </div>
                        <div className="studio-media-top-actions">
                          <button
                            type="button"
                            className="studio-media-trash"
                            onClick={() => removeVideoRow(index)}
                            aria-label={ui('Supprimer')}
                            title={ui('Supprimer')}
                          >
                            🗑
                          </button>
                        </div>
                        <div className="studio-media-card-preview studio-media-card-preview--video">
                          <StudioVideoMiniPreview
                            source={row.url}
                            label={`${ui('Vidéo')} ${index + 1}`}
                            projectId={selectedProject.id}
                            mediaIndex={index}
                          />
                        </div>
                        <div className="studio-media-card-fields">
                          <label className="studio-media-card-field">
                            <span>{ui('Ordre')}</span>
                            <select
                              value={index}
                              onChange={e => moveVideoRowTo(index, Number(e.target.value))}
                            >
                              {videoRows.map((_, orderIndex) => (
                                <option key={`video-order-${orderIndex}`} value={orderIndex}>
                                  {orderIndex + 1}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="studio-media-card-field">
                            <span>{ui('Placement vidéo')}</span>
                            <select
                              value={row.placement}
                              onChange={e => {
                                const next = [...videoRows]
                                next[index] = { ...row, placement: e.target.value as VideoPlacement }
                                commitVideoRows(next)
                              }}
                            >
                              <option value="full">{ui('Pleine largeur')}</option>
                              <option value="left">{ui('Alignée gauche')}</option>
                              <option value="right">{ui('Alignée droite')}</option>
                              <option value="grid">{ui('Grille auto (2/3 colonnes)')}</option>
                            </select>
                          </label>
                          <label className="studio-media-card-field">
                            <span>{ui('Format vidéo')}</span>
                            <select
                              value={row.aspectRatio}
                              onChange={e => {
                                const next = [...videoRows]
                                next[index] = { ...row, aspectRatio: e.target.value as MediaAspectRatio }
                                commitVideoRows(next)
                              }}
                            >
                              {VIDEO_ASPECT_RATIO_OPTIONS.map(option => (
                                <option key={`video-ratio-${option.value}`} value={option.value}>
                                  {ui(option.label)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="studio-media-card-check">
                            <input
                              type="checkbox"
                              checked={row.autoplay}
                              onChange={e => {
                                const next = [...videoRows]
                                next[index] = { ...row, autoplay: e.target.checked }
                                commitVideoRows(next)
                              }}
                            />
                            <span>{ui('Autoplay')}</span>
                          </label>
                        </div>
                      </article>
                    ))}
                    <button
                      type="button"
                      className={`studio-media-add-card studio-media-add-card--video${isVideoDropActive ? ' is-drop-active' : ''}`}
                      onClick={() => videoUploadRef.current?.click()}
                      onDragEnter={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        setIsVideoDropActive(true)
                      }}
                      onDragOver={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        event.dataTransfer.dropEffect = 'copy'
                        if (!isVideoDropActive) setIsVideoDropActive(true)
                      }}
                      onDragLeave={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        const related = event.relatedTarget as Node | null
                        if (related && event.currentTarget.contains(related)) return
                        setIsVideoDropActive(false)
                      }}
                      onDrop={handleVideoDrop}
                    >
                      <span className="studio-media-add-icon">+</span>
                      <span>{isVideoDropActive ? ui('Déposer les vidéos') : ui('Ajouter une vidéo')}</span>
                    </button>
                  </div>
                  {videoRows.length === 0 && (
                    <p className="studio-video-note">{ui('Aucune vidéo. Ajoute une URL ou téléverse une vidéo.')}</p>
                  )}
                  <div className="studio-media-quick-add">
                    <input
                      value={newVideoUrl}
                      placeholder="https://.../video-01.mp4"
                      onChange={e => setNewVideoUrl(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addVideoByUrl()
                        }
                      }}
                    />
                    <button type="button" className="studio-secondary" onClick={addVideoByUrl}>
                      {ui('Ajouter via URL')}
                    </button>
                  </div>
                  <div className="studio-upload-row">
                    <button
                      type="button"
                      className="studio-secondary"
                      onClick={() => videoUploadRef.current?.click()}
                    >
                      {ui('Téléverser une vidéo')}
                    </button>
                    <input
                      ref={videoUploadRef}
                      type="file"
                      accept="video/mp4,video/webm,video/ogg,video/quicktime,.m4v,.mov"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => { void handleVideoUpload(e.target.files) }}
                    />
                  </div>
                  <div className="studio-video-options">
                    <label className="studio-field">
                      <span>{ui('Format par défaut pour les nouvelles vidéos')}</span>
                      <select
                        value={selectedProject.videoOptions.aspectRatio}
                        onChange={e => setProject(project => ({
                          ...project,
                          videoOptions: {
                            ...project.videoOptions,
                            aspectRatio: e.target.value as '16 / 9' | '4 / 5' | '1 / 1' | '9 / 16' | 'original',
                          },
                        }))}
                      >
                        <option value="16 / 9">{ui('Cinéma (16:9)')}</option>
                        <option value="4 / 5">{ui('Portrait (4:5)')}</option>
                        <option value="1 / 1">{ui('Carré (1:1)')}</option>
                        <option value="9 / 16">{ui('Format vertical (9:16)')}</option>
                        <option value="original">{ui('Format original (auto)')}</option>
                      </select>
                    </label>
                    <label className="studio-check">
                      <input
                        type="checkbox"
                        checked={selectedProject.videoOptions.autoplay}
                        onChange={e => setProject(project => ({
                          ...project,
                          videoOptions: {
                            ...project.videoOptions,
                            autoplay: e.target.checked,
                          },
                        }))}
                      />
                      <span>{ui('Autoplay par défaut (nouvelles vidéos)')}</span>
                    </label>
                    <label className="studio-check">
                      <input
                        type="checkbox"
                        checked={selectedProject.videoOptions.loop}
                        onChange={e => setProject(project => ({
                          ...project,
                          videoOptions: {
                            ...project.videoOptions,
                            loop: e.target.checked,
                          },
                        }))}
                      />
                      <span>{ui('Lecture en boucle')}</span>
                    </label>
                    <p className="studio-video-note">
                      {ui("Le player est simplifié automatiquement: pas de son, pas de plein écran, pas d'options natives visibles.")}
                    </p>
                  </div>
                </section>
                <StudioTextarea
                  label="Description"
                  rows={4}
                  value={selectedProject.description}
                  onChange={e => setProject(project => ({ ...project, description: e.target.value }))}
                />
                <StudioTextarea
                  label="Brief créatif"
                  rows={4}
                  value={selectedProject.brief}
                  onChange={e => setProject(project => ({ ...project, brief: e.target.value }))}
                />
                <div className="studio-preview-card" style={{ background: selectedProject.color }}>
                  <div className="studio-preview-copy">
                    <p>{selectedProject.client}</p>
                    <h3>{selectedProject.title}</h3>
                    <span>{selectedProject.tagline || 'Ajoute une accroche projet'}</span>
                  </div>
                  {selectedProject.cover ? (
                    <ResolvedImage
                      src={selectedProject.cover}
                      projectId={selectedProject.id}
                      mediaKind="cover"
                      alt={selectedProject.title}
                      className="studio-preview-image"
                      style={{ objectPosition: `${coverFocalX}% ${coverFocalY}%` }}
                    />
                  ) : (
                    <div className="studio-preview-placeholder">{ui('Aperçu couverture')}</div>
                  )}
                </div>
                <button
                  type="button"
                  className="studio-danger"
                  onClick={() => {
                    setContent(current => ({
                      ...current,
                      projects: sortProjects(current.projects
                        .filter(project => project.id !== selectedProject.id)
                        .map((project, index) => ({ ...project, order: index }))),
                    }))
                  }}
                >
                  {ui('Supprimer ce projet')}
                </button>
              </StudioCard>
            )}
          </div>
        )}

        {section === 'settings' && (
          <>
            <StudioCard title="Typographie des titres">
              <div className="studio-grid">
                <label className="studio-field">
                  <span>{ui('Mode couleur du site')}</span>
                  <select
                    value={content.design.colorModePreference}
                    onChange={e => patchDesignSetting('colorModePreference', e.target.value as SiteContent['design']['colorModePreference'])}
                  >
                    <option value="system">{ui('Automatique (système)')}</option>
                    <option value="light">{ui('Jour')}</option>
                    <option value="night">{ui('Nuit')}</option>
                  </select>
                </label>
                <label className="studio-field">
                  <span>{ui('Style du mode nuit')}</span>
                  <select
                    value={content.design.nightStyle}
                    disabled={content.design.colorModePreference === 'light'}
                    onChange={e => patchDesignSetting('nightStyle', e.target.value as SiteContent['design']['nightStyle'])}
                  >
                    <option value="safe">{ui('Élégant (safe)')}</option>
                    <option value="bold">{ui('Dramatique (bold)')}</option>
                  </select>
                </label>
              </div>
              <label className="studio-field">
                <span>{ui('Police des gros titres')}</span>
                <select
                  value={content.design.displayFont}
                  onChange={e => applyDisplayFont(e.target.value as DisplayFontKey)}
                >
                  {DISPLAY_FONT_OPTIONS.map(option => (
                    <option key={option.key} value={option.key}>
                      {ui(option.label)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="studio-field">
                <span>{ui('Épaisseur des titres')} · {content.design.displayWeight}</span>
                <input
                  type="range"
                  min={0}
                  max={DISPLAY_WEIGHT_OPTIONS.length - 1}
                  step={1}
                  value={Math.max(0, DISPLAY_WEIGHT_OPTIONS.findIndex(option => option.key === content.design.displayWeight))}
                  onChange={e => {
                    const nextIndex = Number(e.target.value)
                    const nextWeight = DISPLAY_WEIGHT_OPTIONS[nextIndex]?.key ?? 400
                    patchDisplaySetting('displayWeight', nextWeight)
                  }}
                />
              </label>
              <div className="studio-grid">
                <label className="studio-field">
                  <span>{ui('Taille des titres')} · {Math.round(content.design.displaySize)}%</span>
                  <input
                    type="range"
                    min={DISPLAY_SIZE_MIN}
                    max={DISPLAY_SIZE_MAX}
                    step={1}
                    value={content.design.displaySize}
                    onChange={e => patchDisplaySetting('displaySize', Number(e.target.value))}
                  />
                </label>
                <label className="studio-field">
                  <span>{ui('Interlettrage')} · {content.design.displayLetterSpacing.toFixed(3)}em</span>
                  <input
                    type="range"
                    min={DISPLAY_LETTER_SPACING_MIN}
                    max={DISPLAY_LETTER_SPACING_MAX}
                    step={0.001}
                    value={content.design.displayLetterSpacing}
                    onChange={e => patchDisplaySetting('displayLetterSpacing', Number(e.target.value))}
                  />
                </label>
                <label className="studio-field">
                  <span>{ui('Intermots')} · {content.design.displayWordSpacing.toFixed(3)}em</span>
                  <input
                    type="range"
                    min={DISPLAY_WORD_SPACING_MIN}
                    max={DISPLAY_WORD_SPACING_MAX}
                    step={0.001}
                    value={content.design.displayWordSpacing}
                    onChange={e => patchDisplaySetting('displayWordSpacing', Number(e.target.value))}
                  />
                </label>
                <label className="studio-field">
                  <span>{ui('Interlignage')} · {content.design.displayLineHeight.toFixed(2)}</span>
                  <input
                    type="range"
                    min={DISPLAY_LINE_HEIGHT_MIN}
                    max={DISPLAY_LINE_HEIGHT_MAX}
                    step={0.01}
                    value={content.design.displayLineHeight}
                    onChange={e => patchDisplaySetting('displayLineHeight', Number(e.target.value))}
                  />
                </label>
              </div>
              <small className="studio-video-note">{ui('Réglages fins des gros titres (menu inclus).')}</small>
              <div className="studio-grid">
                <label className="studio-field">
                  <span>{ui('Casse des titres')}</span>
                  <select
                    value={content.design.displayCase}
                    onChange={e => patchDisplaySetting('displayCase', e.target.value as SiteContent['design']['displayCase'])}
                  >
                    {DISPLAY_CASE_OPTIONS.map(option => (
                      <option key={option.key} value={option.key}>
                        {ui(option.label)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="studio-field">
                  <span>{ui("Style d'emphase")}</span>
                  <select
                    value={content.design.displayEmphasis}
                    onChange={e => patchDisplaySetting('displayEmphasis', e.target.value as SiteContent['design']['displayEmphasis'])}
                  >
                    {DISPLAY_EMPHASIS_OPTIONS.map(option => (
                      <option key={option.key} value={option.key}>
                        {ui(option.label)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                className="studio-font-preview"
                style={{
                  fontFamily: getDisplayFontFamily(content.design.displayFont),
                  fontWeight: getDisplayFontWeight(content.design.displayFont, content.design.displayWeight),
                  fontSize: `calc(44px * ${getDisplaySizeScale(content.design.displaySize)})`,
                  letterSpacing: `${getDisplayLetterSpacing(content.design.displayLetterSpacing)}em`,
                  wordSpacing: `${getDisplayWordSpacing(content.design.displayWordSpacing)}em`,
                  lineHeight: getDisplayLineHeight(content.design.displayLineHeight),
                }}
              >
                <DisplayText
                  text={`${ui(DISPLAY_FONT_OPTIONS.find(option => option.key === content.design.displayFont)?.preview ?? 'Direction artistique')}\nStudio InStories`}
                  caseMode={content.design.displayCase}
                  emphasisMode={content.design.displayEmphasis}
                />
              </div>
            </StudioCard>

            <StudioCard title="Pied de page">
              <div className="studio-grid">
                <StudioInput
                  label="Copyright"
                  value={content.footer.copyright}
                  onChange={e => setContent({ ...content, footer: { ...content.footer, copyright: e.target.value } })}
                />
                <StudioInput
                  label="Mentions"
                  value={content.footer.registration}
                  onChange={e => setContent({ ...content, footer: { ...content.footer, registration: e.target.value } })}
                />
              </div>
              <SocialLinksEditor
                links={content.footer.socials}
                onChange={next => setContent({ ...content, footer: { ...content.footer, socials: next } })}
              />
            </StudioCard>

            <StudioCard title="Relance PDF après projets">
              <label
                className="studio-field"
                style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginBottom: '20px' }}
              >
                <input
                  className="studio-checkbox-blue"
                  type="checkbox"
                  checked={content.pdfReminder.isEnabled}
                  onChange={e => {
                    setContent(current => ({
                      ...current,
                      pdfReminder: {
                        ...current.pdfReminder,
                        isEnabled: e.target.checked,
                      },
                    }))
                  }}
                />
                <strong style={{ fontSize: '13px', letterSpacing: '0.02em', fontWeight: 500 }}>
                  {ui('Activer le bouton PDF après consultation de projets')}
                </strong>
              </label>

              <div className="studio-grid">
                <label className="studio-field">
                  <span>{ui('Déclenchement après X projets')}</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={content.pdfReminder.triggerProjectViews}
                    onChange={e => {
                      const parsed = Number(e.target.value)
                      const nextValue = Number.isNaN(parsed) ? 3 : Math.max(1, Math.min(12, Math.round(parsed)))
                      setContent(current => ({
                        ...current,
                        pdfReminder: {
                          ...current.pdfReminder,
                          triggerProjectViews: nextValue,
                        },
                      }))
                    }}
                  />
                </label>
                <StudioInput
                  label="URL du PDF"
                  value={content.pdfReminder.pdfUrl}
                  placeholder="https://.../dossier-instories.pdf"
                  onChange={e => setContent(current => ({
                    ...current,
                    pdfReminder: {
                      ...current.pdfReminder,
                      pdfUrl: e.target.value,
                    },
                  }))}
                />
              </div>

              <div className="studio-grid">
                <StudioInput
                  label="Titre du popup"
                  value={content.pdfReminder.title}
                  onChange={e => setContent(current => ({
                    ...current,
                    pdfReminder: {
                      ...current.pdfReminder,
                      title: e.target.value,
                    },
                  }))}
                />
                <StudioInput
                  label="Texte du bouton"
                  value={content.pdfReminder.ctaLabel}
                  onChange={e => setContent(current => ({
                    ...current,
                    pdfReminder: {
                      ...current.pdfReminder,
                      ctaLabel: e.target.value,
                    },
                  }))}
                />
              </div>

              <label className="studio-field">
                <span>{ui('Texte court')}</span>
                <textarea
                  value={content.pdfReminder.description}
                  rows={2}
                  onChange={e => setContent(current => ({
                    ...current,
                    pdfReminder: {
                      ...current.pdfReminder,
                      description: e.target.value,
                    },
                  }))}
                />
              </label>
            </StudioCard>

            <StudioCard title="KPI conversion (local)">
              <div className="studio-grid">
                <div className="studio-field">
                  <span>{ui('CTA projet similaire')}</span>
                  <strong style={{ fontSize: '28px', fontWeight: 500 }}>{conversionKpi.similarClicks}</strong>
                </div>
                <div className="studio-field">
                  <span>{ui('CTA mini brief envoyé')}</span>
                  <strong style={{ fontSize: '28px', fontWeight: 500 }}>{conversionKpi.briefClicks}</strong>
                </div>
                <div className="studio-field">
                  <span>{ui('Téléchargement PDF (popup projets)')}</span>
                  <strong style={{ fontSize: '28px', fontWeight: 500 }}>{conversionKpi.pdfPopupClicks}</strong>
                </div>
                <div className="studio-field">
                  <span>{ui('Téléchargement PDF (menu)')}</span>
                  <strong style={{ fontSize: '28px', fontWeight: 500 }}>{conversionKpi.pdfMenuClicks}</strong>
                </div>
              </div>
              <div
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <p style={{ margin: 0, fontSize: '12px', color: 'rgba(10,10,10,0.5)' }}>
                  {ui('Total conversions')}: {conversionKpi.total}
                  {' · '}
                  {conversionKpi.updatedAt
                    ? `${ui('Dernière mise à jour')}: ${new Date(conversionKpi.updatedAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                    : ui('Aucune donnée pour le moment')}
                </p>
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => {
                    clearTrackedEventsSnapshot()
                    setConversionKpi({
                      similarClicks: 0,
                      briefClicks: 0,
                      pdfPopupClicks: 0,
                      pdfMenuClicks: 0,
                      total: 0,
                      updatedAt: 0,
                    })
                  }}
                >
                  {ui('Réinitialiser les KPI')}
                </button>
              </div>
            </StudioCard>

            <StudioCard title="Actions">
              <div className="studio-actions">
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={handleSaveNow}
                >
                  {ui('Sauvegarder maintenant')}
                </button>
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={handleExportJson}
                >
                  {ui('Exporter le contenu en JSON')}
                </button>
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={handleExportBehancePack}
                >
                  {ui('Exporter pack Behance')}
                </button>
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => { void handleGeneratePortfolioPdf() }}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? ui('Génération PDF...') : ui('Générer le dossier PDF')}
                </button>
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => { void handlePublishToRepo() }}
                  disabled={isPublishing}
                >
                  {isPublishing ? ui('Publication en cours...') : ui('Publier vers le repo (Render)')}
                </button>
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => importJsonRef.current?.click()}
                >
                  {ui('Importer un JSON de contenu')}
                </button>
                <input
                  ref={importJsonRef}
                  type="file"
                  accept="application/json,.json"
                  style={{ display: 'none' }}
                  onChange={e => { void handleImportJson(e.target.files) }}
                />
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => { void handleTranslateContent() }}
                  disabled={isTranslatingText}
                >
                  {isTranslatingText ? ui('Traduction en cours...') : ui('Traduire')}
                </button>
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => {
                    const latest = localizeSiteContent(loadSiteContent(), lang)
                    setContent({ ...latest, projects: sortProjects(latest.projects) })
                    setSaveLabel(ui('Contenu relu depuis le stockage local'))
                  }}
                >
                  {ui('Recharger depuis le local')}
                </button>
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => {
                    const defaults = localizeSiteContent(cloneDefaultSiteContent(), lang)
                    setContent({ ...defaults, projects: sortProjects(defaults.projects) })
                    saveSiteContent(defaults)
                    setSelectedProjectId(defaults.projects[0]?.id ?? '')
                    setSaveLabel(ui('Contenu réinitialisé aux valeurs par défaut'))
                  }}
                >
                  {ui('Restaurer le contenu par défaut')}
                </button>
                <button
                  type="button"
                  className="studio-danger"
                  onClick={() => {
                    resetSiteContent()
                    const defaults = localizeSiteContent(cloneDefaultSiteContent(), lang)
                    setContent({ ...defaults, projects: sortProjects(defaults.projects) })
                    setSelectedProjectId(defaults.projects[0]?.id ?? '')
                    setSaveLabel(ui('Contenu local effacé'))
                  }}
                >
                  {ui('Effacer le contenu local')}
                </button>
              </div>
              {publishProgress && (
                <div className="studio-publish-progress" role="status" aria-live="polite">
                  <div className="studio-publish-progress-head">
                    <strong>{publishProgress.label}</strong>
                    <span>{publishProgress.percent}%</span>
                  </div>
                  <div className="studio-publish-progress-track">
                    <span style={{ width: `${publishProgress.percent}%` }} />
                  </div>
                  <p>{publishProgress.detail}</p>
                  <div className="studio-publish-progress-steps">
                    {[
                      { key: 'prepare', label: ui('Préparation') },
                      { key: 'upload', label: ui('Médias') },
                      { key: 'snapshot', label: ui('Snapshot') },
                      { key: 'done', label: ui('Terminé') },
                    ].map(step => {
                      const stepOrder: Record<PublishStep, number> = {
                        prepare: 1,
                        upload: 2,
                        snapshot: 3,
                        done: 4,
                        error: 0,
                      }
                      const currentOrder = stepOrder[publishProgress.step]
                      const isActive = publishProgress.step !== 'error' && stepOrder[step.key as PublishStep] <= currentOrder
                      return (
                        <span key={step.key} className={isActive ? 'is-active' : ''}>
                          {step.label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </StudioCard>
          </>
        )}
      </section>
    </main>
  )
}
