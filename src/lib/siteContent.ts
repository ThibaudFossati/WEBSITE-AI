import { defaultSiteContent, type SiteContent } from '../data/defaultSiteContent'
import type { Project, ProjectImageBlock } from '../data/projects'
import { localizeSiteContent } from './i18n'
import {
  DISPLAY_LETTER_SPACING_DEFAULT,
  DISPLAY_LETTER_SPACING_MAX,
  DISPLAY_LETTER_SPACING_MIN,
  DISPLAY_LINE_HEIGHT_DEFAULT,
  DISPLAY_LINE_HEIGHT_MAX,
  DISPLAY_LINE_HEIGHT_MIN,
  DISPLAY_SIZE_DEFAULT,
  DISPLAY_SIZE_MAX,
  DISPLAY_SIZE_MIN,
  DISPLAY_WORD_SPACING_DEFAULT,
  DISPLAY_WORD_SPACING_MAX,
  DISPLAY_WORD_SPACING_MIN,
} from './typography'

const STORAGE_KEY = 'instories.site-content.v1'
const FR_MIGRATION_KEY = 'instories.content.fr_migrated_v4'
const PROJECT_TEXT_MIGRATION_KEY = 'instories.content.project_text_v1'
const PROJECT_SEED_MIGRATION_KEY = 'instories.content.project_seed_v1'
const ONLYONE_CASE_MIGRATION_KEY = 'instories.content.onlyone_case_v1'
const PROJECT_TITLE_CASE_MIGRATION_KEY = 'instories.content.project_title_case_v1'
const ARMANI_VIDEO_RESET_MIGRATION_KEY = 'instories.content.armani_video_reset_v1'
export const CONTENT_SYNC_EVENT = 'instories:content-updated'

const TITLE_SMALL_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'via', 'vs',
])

const TITLE_ACRONYMS = new Set([
  'AI', 'AR', 'CGI', 'OOH', 'UI', 'UX', 'VFX', 'VR', '2D', '3D', '4K', '8K',
])

export function cloneDefaultSiteContent(): SiteContent {
  const cloned = JSON.parse(JSON.stringify(defaultSiteContent)) as SiteContent
  return {
    ...cloned,
    pdfReminder: {
      ...cloned.pdfReminder,
      pdfUrl: normalizePdfReminderUrl(cloned.pdfReminder?.pdfUrl, '/pdf/instories-dossier.pdf'),
    },
    projects: Array.isArray(cloned.projects)
      ? cloned.projects.map((project, index) => normalizeProject(project, index))
      : [],
  }
}

function normalizeProjectStatus(status: unknown): Project['status'] {
  if (typeof status !== 'string') return 'draft'
  const value = status.trim().toLowerCase()
  if (value === 'published' || value === 'publie' || value === 'publié') {
    return 'published'
  }
  return 'draft'
}


function normalizeDisplayFont(value: unknown): SiteContent['design']['displayFont'] {
  if (value === 'bodoni' || value === 'gloock' || value === 'cormorant' || value === 'roboto') return value
  return 'bodoni'
}

function normalizeDisplayWeight(value: unknown): SiteContent['design']['displayWeight'] {
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (parsed === 100 || parsed === 300 || parsed === 400 || parsed === 500 || parsed === 700 || parsed === 900) {
      return parsed
    }
  }
  if (value === 100 || value === 300 || value === 400 || value === 500 || value === 700 || value === 900) return value
  return 400
}

function normalizeDisplayCase(value: unknown): SiteContent['design']['displayCase'] {
  if (value === 'default' || value === 'uppercase' || value === 'lowercase') return value
  return 'default'
}

function normalizeDisplayEmphasis(value: unknown): SiteContent['design']['displayEmphasis'] {
  if (value === 'none' || value === 'important-italic') return value
  return 'none'
}

function normalizeColorMode(value: unknown): SiteContent['design']['colorMode'] {
  if (value === 'light' || value === 'night') return value
  return 'light'
}

function normalizeColorModePreference(value: unknown): SiteContent['design']['colorModePreference'] {
  if (value === 'system' || value === 'light' || value === 'night') return value
  return 'system'
}

function normalizeNightStyle(value: unknown): SiteContent['design']['nightStyle'] {
  if (value === 'safe' || value === 'bold') return value
  return 'safe'
}

function normalizePdfReminderEnabled(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  return false
}

function normalizePdfReminderTrigger(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || Number.isNaN(parsed)) return 3
  return Math.max(1, Math.min(12, Math.round(parsed)))
}

function normalizePdfReminderText(value: unknown, fallback: string, allowEmpty = true): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  if (!allowEmpty && !trimmed) return fallback
  return trimmed
}

function normalizePdfReminderUrl(value: unknown, fallback: string): string {
  const raw = normalizePdfReminderText(value, fallback, false)
  const normalized = raw.trim()
  if (!normalized) return fallback

  const localHostMatch = normalized.match(/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/.+)$/i)
  if (localHostMatch?.[1]) return localHostMatch[1]

  return normalized
}

function normalizeDisplaySize(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || Number.isNaN(parsed)) return DISPLAY_SIZE_DEFAULT
  return Math.max(DISPLAY_SIZE_MIN, Math.min(DISPLAY_SIZE_MAX, Math.round(parsed)))
}

function normalizeDisplayLetterSpacing(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || Number.isNaN(parsed)) return DISPLAY_LETTER_SPACING_DEFAULT
  const clamped = Math.max(DISPLAY_LETTER_SPACING_MIN, Math.min(DISPLAY_LETTER_SPACING_MAX, parsed))
  return Number(clamped.toFixed(3))
}

function normalizeDisplayLineHeight(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || Number.isNaN(parsed)) return DISPLAY_LINE_HEIGHT_DEFAULT
  const clamped = Math.max(DISPLAY_LINE_HEIGHT_MIN, Math.min(DISPLAY_LINE_HEIGHT_MAX, parsed))
  return Number(clamped.toFixed(2))
}

function normalizeDisplayWordSpacing(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (typeof parsed !== 'number' || Number.isNaN(parsed)) return DISPLAY_WORD_SPACING_DEFAULT
  const clamped = Math.max(DISPLAY_WORD_SPACING_MIN, Math.min(DISPLAY_WORD_SPACING_MAX, parsed))
  return Number(clamped.toFixed(3))
}

const DISPLAY_FONT_KEYS: SiteContent['design']['displayFont'][] = ['bodoni', 'gloock', 'cormorant', 'roboto']

function normalizeDisplayProfiles(value: unknown): SiteContent['design']['displayProfiles'] {
  if (!value || typeof value !== 'object') return {}
  const source = value as Record<string, unknown>
  const profiles: SiteContent['design']['displayProfiles'] = {}
  DISPLAY_FONT_KEYS.forEach(fontKey => {
    const raw = source[fontKey]
    if (!raw || typeof raw !== 'object') return
    const typed = raw as Record<string, unknown>
    profiles[fontKey] = {
      displayWeight: normalizeDisplayWeight(typed.displayWeight),
      displaySize: normalizeDisplaySize(typed.displaySize),
      displayLetterSpacing: normalizeDisplayLetterSpacing(typed.displayLetterSpacing),
      displayWordSpacing: normalizeDisplayWordSpacing(typed.displayWordSpacing),
      displayLineHeight: normalizeDisplayLineHeight(typed.displayLineHeight),
      displayCase: normalizeDisplayCase(typed.displayCase),
      displayEmphasis: normalizeDisplayEmphasis(typed.displayEmphasis),
    }
  })
  return profiles
}

function clampPercent(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.max(0, Math.min(100, value))
}

function capitalizeWord(word: string): string {
  if (!word) return word
  if (/^[IVXLCM]+$/.test(word.toUpperCase())) return word.toUpperCase()
  const upper = word.toUpperCase()
  if (TITLE_ACRONYMS.has(upper)) return upper
  const lower = word.toLowerCase()
  const first = lower.charAt(0).toLocaleUpperCase('en-US')
  return `${first}${lower.slice(1)}`
}

function capitalizeApostropheWord(token: string): string {
  return token
    .split(/([’'])/g)
    .map(part => {
      if (part === '\'' || part === '’') return part
      return capitalizeWord(part)
    })
    .join('')
}

function normalizeProjectTitleCase(value: unknown): string {
  if (typeof value !== 'string') return ''
  const compact = value.replace(/\s+/g, ' ').trim()
  if (!compact) return ''
  const lettersOnly = compact.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '')
  if (!lettersOnly) return compact
  const isAllUppercase = lettersOnly === lettersOnly.toUpperCase()
  if (!isAllUppercase) return compact

  const words = compact.split(' ')
  return words
    .map((word, index) => {
      if (!word) return word
      const lower = word.toLowerCase()
      if (index > 0 && TITLE_SMALL_WORDS.has(lower)) return lower
      return capitalizeApostropheWord(word)
    })
    .join(' ')
}

function normalizeProjectId(value: unknown, index: number): string {
  if (typeof value !== 'string') return `project-${index + 1}`
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^projet-/, 'project-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || `project-${index + 1}`
}

function normalizeMediaPath(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()

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

function makeMediaKey(value: string): string {
  return value
    .trim()
    .split('#')[0]
    .split('?')[0]
    .replace(/\\/g, '/')
    .toLowerCase()
}

function normalizeImageBlockId(value: unknown, index: number): string {
  if (typeof value !== 'string') return `block-${index + 1}`
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || `block-${index + 1}`
}

function normalizeProject(project: Project, index: number): Project {
  const normalizedCover = normalizeMediaPath(project.cover)
  const normalizedVideoUrls = Array.isArray(project.videoUrls)
    ? project.videoUrls.map(url => normalizeMediaPath(url)).filter(Boolean)
    : (project.videoUrl ? [normalizeMediaPath(project.videoUrl)] : [])
  const allowedImageRatios: Array<Exclude<Project['videoOptions']['aspectRatio'], 'original'>> = ['16 / 9', '4 / 5', '1 / 1', '9 / 16']
  const imageBlocksSource = Array.isArray(project.imageBlocks) && project.imageBlocks.length > 0
    ? project.imageBlocks
    : [{
      id: 'block-1',
      images: Array.isArray(project.images) ? project.images : [],
      imageAspectRatios: Array.isArray(project.imageAspectRatios) ? project.imageAspectRatios : [],
    }]

  const seenImageKeys = new Set<string>()
  const normalizedImageBlocksRows = imageBlocksSource
    .map((rawBlock, blockIndex) => {
      const rows = (Array.isArray(rawBlock.images) ? rawBlock.images : [])
        .map((image, imageIndex) => {
          const url = normalizeMediaPath(image).trim()
          if (!url) return null
          const ratioCandidate = rawBlock.imageAspectRatios?.[imageIndex]
          const ratio = allowedImageRatios.includes(ratioCandidate as typeof allowedImageRatios[number])
            ? ratioCandidate as Exclude<Project['videoOptions']['aspectRatio'], 'original'>
            : '4 / 5'
          return { url, ratio }
        })
        .filter((row): row is { url: string; ratio: Exclude<Project['videoOptions']['aspectRatio'], 'original'> } => Boolean(row))
        .filter(row => {
          const key = makeMediaKey(row.url)
          if (!key) return false
          if (seenImageKeys.has(key)) return false
          seenImageKeys.add(key)
          return true
        })
      return {
        id: normalizeImageBlockId(rawBlock.id, blockIndex),
        rows,
      }
    })
    .filter(block => block.rows.length > 0)

  const normalizedImageBlocks: ProjectImageBlock[] = normalizedImageBlocksRows.map(block => ({
    id: block.id,
    images: block.rows.map(row => row.url),
    imageAspectRatios: block.rows.map(row => row.ratio),
  }))

  const normalizedImages = normalizedImageBlocks.flatMap(block => block.images)
  const normalizedImageAspectRatios = normalizedImageBlocks.flatMap(block => block.imageAspectRatios ?? [])
  const allowedVideoRatios: Project['videoOptions']['aspectRatio'][] = ['16 / 9', '4 / 5', '1 / 1', '9 / 16', 'original']
  const normalizedVideoAspectRatios: Project['videoOptions']['aspectRatio'][] = normalizedVideoUrls.map((_, videoIndex) => {
    const ratio = project.videoAspectRatios?.[videoIndex]
    if (allowedVideoRatios.includes(ratio as typeof allowedVideoRatios[number])) return ratio as Project['videoOptions']['aspectRatio']
    const fallback = project.videoOptions?.aspectRatio
    return allowedVideoRatios.includes(fallback as typeof allowedVideoRatios[number])
      ? fallback as Project['videoOptions']['aspectRatio']
      : '16 / 9'
  })
  const normalizedVideoAutoplay: boolean[] = normalizedVideoUrls.map((_, videoIndex) => {
    const explicit = project.videoAutoplay?.[videoIndex]
    if (typeof explicit === 'boolean') return explicit
    return project.videoOptions?.autoplay ?? false
  })
  const allowedPlacements: Array<'full' | 'left' | 'right' | 'grid'> = ['full', 'left', 'right', 'grid']
  let normalizedVideoPlacements = normalizedVideoUrls.map((_, videoIndex) => {
    const placement = project.videoPlacements?.[videoIndex]
    return allowedPlacements.includes(placement as typeof allowedPlacements[number]) ? placement : 'full'
  })
  if (normalizedVideoUrls.length > 1 && normalizedVideoPlacements.every(placement => placement === 'full')) {
    normalizedVideoPlacements = normalizedVideoPlacements.map(() => 'grid')
  }
  const coverFocalPoint = {
    x: clampPercent(project.coverFocalPoint?.x, 50),
    y: clampPercent(project.coverFocalPoint?.y, 50),
  }

  return {
    ...project,
    id: normalizeProjectId(project.id, index),
    title: normalizeProjectTitleCase(project.title),
    status: normalizeProjectStatus(project.status),
    order: typeof project.order === 'number' ? project.order : index,
    cover: normalizedCover,
    coverFocalPoint,
    imageBlocks: normalizedImageBlocks,
    images: normalizedImages,
    imageAspectRatios: normalizedImageAspectRatios,
    videoUrl: normalizeMediaPath(project.videoUrl ?? normalizedVideoUrls[0] ?? ''),
    videoUrls: normalizedVideoUrls,
    videoAspectRatios: normalizedVideoAspectRatios,
    videoAutoplay: normalizedVideoAutoplay,
    videoPlacements: normalizedVideoPlacements,
    videoOptions: {
      mode: project.videoOptions?.mode ?? 'native',
      minimal: project.videoOptions?.minimal ?? false,
      autoplay: project.videoOptions?.autoplay ?? false,
      muted: project.videoOptions?.muted ?? true,
      loop: project.videoOptions?.loop ?? true,
      aspectRatio: project.videoOptions?.aspectRatio ?? '16 / 9',
    },
  }
}

function sameStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function hasPlaceholderProjectText(project: Project): boolean {
  const titleNormalized = normalizeText(project.title)
  return titleNormalized === 'nouveau projet'
    || titleNormalized === 'new project'
    || !project.tagline.trim()
    || !project.description.trim()
    || !project.brief.trim()
}

function resolveDefaultProjectTemplate(project: Project, defaults: Project[]): Project | undefined {
  const byId = defaults.find(template => template.id === project.id)
  if (byId) return byId

  const projectClient = normalizeText(project.client)
  if (!projectClient) return undefined

  return defaults.find(template => {
    const templateClient = normalizeText(template.client)
    return templateClient === projectClient
      || templateClient.includes(projectClient)
      || projectClient.includes(templateClient)
  })
}

function applyProjectSeedMigration(content: SiteContent): { content: SiteContent, changed: boolean } {
  const defaultProjects = cloneDefaultSiteContent().projects
  const projectIdsToSeed = ['onlyone-art-of-dynamic-sports-design']

  const existingIds = new Set(content.projects.map(project => project.id))
  const templatesToAdd = projectIdsToSeed
    .map(projectId => defaultProjects.find(project => project.id === projectId))
    .filter((project): project is Project => Boolean(project))
    .filter(project => !existingIds.has(project.id))

  if (!templatesToAdd.length) return { content, changed: false }

  let nextOrder = content.projects.reduce((max, project) => Math.max(max, project.order), -1) + 1
  const appendedProjects = templatesToAdd.map(project => {
    const nextProject: Project = {
      ...project,
      order: nextOrder,
      category: [...project.category],
      agencies: [...project.agencies],
      deliverables: [...project.deliverables],
      tools: [...project.tools],
      imageBlocks: (project.imageBlocks ?? []).map(block => ({
        id: block.id,
        images: [...block.images],
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
    nextOrder += 1
    return nextProject
  })

  return { content: { ...content, projects: [...content.projects, ...appendedProjects] }, changed: true }
}

function applyProjectTextMigration(content: SiteContent): { content: SiteContent, changed: boolean } {
  const defaults = cloneDefaultSiteContent().projects
  if (!defaults.length) return { content, changed: false }

  let changed = false
  const projects = content.projects.map(project => {
    const template = resolveDefaultProjectTemplate(project, defaults)
    if (!template) return project
    if (project.id !== template.id && !hasPlaceholderProjectText(project)) return project

    const nextProject: Project = {
      ...project,
      client: template.client,
      title: template.title,
      tagline: template.tagline,
      category: [...template.category],
      year: template.year,
      agencies: [...template.agencies],
      description: template.description,
      brief: template.brief,
      deliverables: [...template.deliverables],
      tools: [...template.tools],
    }

    const hasDiff = project.client !== nextProject.client
      || project.title !== nextProject.title
      || project.tagline !== nextProject.tagline
      || !sameStringArray(project.category, nextProject.category)
      || project.year !== nextProject.year
      || !sameStringArray(project.agencies, nextProject.agencies)
      || project.description !== nextProject.description
      || project.brief !== nextProject.brief
      || !sameStringArray(project.deliverables, nextProject.deliverables)
      || !sameStringArray(project.tools, nextProject.tools)

    if (hasDiff) changed = true
    return nextProject
  })

  if (!changed) return { content, changed: false }
  return { content: { ...content, projects }, changed: true }
}

function applyOnlyoneTitleCaseMigration(content: SiteContent): { content: SiteContent, changed: boolean } {
  let changed = false
  const projects = content.projects.map(project => {
    if (project.id !== 'onlyone-art-of-dynamic-sports-design') return project
    const title = project.title.trim()
    if (title !== 'THE ART OF DYNAMIC SPORTS DESIGN') return project
    changed = true
    return {
      ...project,
      title: 'The Art of Dynamic Sports Design',
    }
  })
  if (!changed) return { content, changed: false }
  return { content: { ...content, projects }, changed: true }
}

function applyProjectTitleCaseMigration(content: SiteContent): { content: SiteContent, changed: boolean } {
  let changed = false
  const projects = content.projects.map(project => {
    const nextTitle = normalizeProjectTitleCase(project.title)
    if (nextTitle === project.title) return project
    changed = true
    return {
      ...project,
      title: nextTitle,
    }
  })
  if (!changed) return { content, changed: false }
  return { content: { ...content, projects }, changed: true }
}

function applyArmaniVideoResetMigration(content: SiteContent): { content: SiteContent, changed: boolean } {
  let changed = false
  const projects = content.projects.map(project => {
    if (project.id !== 'armani-beauty') return project
    const hasVideo = project.videoUrls.length > 0 || Boolean(project.videoUrl.trim())
    if (!hasVideo) return project
    changed = true
    return {
      ...project,
      videoUrl: '',
      videoUrls: [],
      videoPlacements: [],
      videoAspectRatios: [],
      videoAutoplay: [],
      videoOptions: {
        ...project.videoOptions,
        autoplay: false,
      },
    }
  })
  if (!changed) return { content, changed: false }
  return { content: { ...content, projects }, changed: true }
}

export function loadSiteContent(): SiteContent {
  if (typeof window === 'undefined') return cloneDefaultSiteContent()

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return cloneDefaultSiteContent()

  try {
    const parsed = JSON.parse(raw) as SiteContent
    const defaults = cloneDefaultSiteContent()
    const parsedDisplayFont = normalizeDisplayFont(parsed.design?.displayFont)
    const normalizedDisplayProfiles = normalizeDisplayProfiles(parsed.design?.displayProfiles)
    const fallbackProfile = {
      displayWeight: normalizeDisplayWeight(parsed.design?.displayWeight),
      displaySize: normalizeDisplaySize(parsed.design?.displaySize),
      displayLetterSpacing: normalizeDisplayLetterSpacing(parsed.design?.displayLetterSpacing),
      displayWordSpacing: normalizeDisplayWordSpacing(parsed.design?.displayWordSpacing),
      displayLineHeight: normalizeDisplayLineHeight(parsed.design?.displayLineHeight),
      displayCase: normalizeDisplayCase(parsed.design?.displayCase),
      displayEmphasis: normalizeDisplayEmphasis(parsed.design?.displayEmphasis),
    }
    const activeProfile = normalizedDisplayProfiles?.[parsedDisplayFont] ?? fallbackProfile
    const merged: SiteContent = {
      ...defaults,
      ...parsed,
      home: { ...defaults.home, ...parsed.home },
      about: {
        ...defaults.about,
        ...parsed.about,
      },
      contact: { ...defaults.contact, ...parsed.contact },
      footer: { ...defaults.footer, ...parsed.footer },
      pdfReminder: {
        ...defaults.pdfReminder,
        ...parsed.pdfReminder,
        isEnabled: normalizePdfReminderEnabled(parsed.pdfReminder?.isEnabled),
        triggerProjectViews: normalizePdfReminderTrigger(parsed.pdfReminder?.triggerProjectViews),
        title: normalizePdfReminderText(parsed.pdfReminder?.title, defaults.pdfReminder.title),
        description: normalizePdfReminderText(parsed.pdfReminder?.description, defaults.pdfReminder.description),
        ctaLabel: normalizePdfReminderText(parsed.pdfReminder?.ctaLabel, defaults.pdfReminder.ctaLabel),
        pdfUrl: normalizePdfReminderUrl(parsed.pdfReminder?.pdfUrl, defaults.pdfReminder.pdfUrl),
      },
      design: {
        ...defaults.design,
        ...parsed.design,
        displayFont: parsedDisplayFont,
        colorModePreference: normalizeColorModePreference(parsed.design?.colorModePreference),
        colorMode: normalizeColorMode(parsed.design?.colorMode),
        nightStyle: normalizeNightStyle(parsed.design?.nightStyle),
        displayWeight: activeProfile.displayWeight,
        displaySize: activeProfile.displaySize,
        displayLetterSpacing: activeProfile.displayLetterSpacing,
        displayWordSpacing: activeProfile.displayWordSpacing,
        displayLineHeight: activeProfile.displayLineHeight,
        displayCase: activeProfile.displayCase,
        displayEmphasis: activeProfile.displayEmphasis,
        displayProfiles: {
          ...normalizedDisplayProfiles,
          [parsedDisplayFont]: activeProfile,
        },
      },
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map((project, index) => normalizeProject(project, index))
        : defaults.projects.map((project, index) => normalizeProject(project, index)),
    }

    const alreadyProjectSeedMigrated = window.localStorage.getItem(PROJECT_SEED_MIGRATION_KEY) === '1'
    const seededProjects = alreadyProjectSeedMigrated ? { content: merged, changed: false } : applyProjectSeedMigration(merged)
    if (!alreadyProjectSeedMigrated) {
      if (seededProjects.changed) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seededProjects.content))
      }
      window.localStorage.setItem(PROJECT_SEED_MIGRATION_KEY, '1')
    }

    const alreadyProjectTextMigrated = window.localStorage.getItem(PROJECT_TEXT_MIGRATION_KEY) === '1'
    const migratedProjects = alreadyProjectTextMigrated
      ? { content: seededProjects.content, changed: false }
      : applyProjectTextMigration(seededProjects.content)
    if (!alreadyProjectTextMigrated) {
      if (migratedProjects.changed) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedProjects.content))
      }
      window.localStorage.setItem(PROJECT_TEXT_MIGRATION_KEY, '1')
    }

    const alreadyOnlyoneCaseMigrated = window.localStorage.getItem(ONLYONE_CASE_MIGRATION_KEY) === '1'
    const onlyoneCaseMigrated = alreadyOnlyoneCaseMigrated
      ? { content: migratedProjects.content, changed: false }
      : applyOnlyoneTitleCaseMigration(migratedProjects.content)
    if (!alreadyOnlyoneCaseMigrated) {
      if (onlyoneCaseMigrated.changed) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(onlyoneCaseMigrated.content))
      }
      window.localStorage.setItem(ONLYONE_CASE_MIGRATION_KEY, '1')
    }

    const alreadyProjectTitleCaseMigrated = window.localStorage.getItem(PROJECT_TITLE_CASE_MIGRATION_KEY) === '1'
    const projectTitleCaseMigrated = alreadyProjectTitleCaseMigrated
      ? { content: onlyoneCaseMigrated.content, changed: false }
      : applyProjectTitleCaseMigration(onlyoneCaseMigrated.content)
    if (!alreadyProjectTitleCaseMigrated) {
      if (projectTitleCaseMigrated.changed) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projectTitleCaseMigrated.content))
      }
      window.localStorage.setItem(PROJECT_TITLE_CASE_MIGRATION_KEY, '1')
    }

    const alreadyArmaniVideoReset = window.localStorage.getItem(ARMANI_VIDEO_RESET_MIGRATION_KEY) === '1'
    const armaniVideoResetMigrated = alreadyArmaniVideoReset
      ? { content: projectTitleCaseMigrated.content, changed: false }
      : applyArmaniVideoResetMigration(projectTitleCaseMigrated.content)
    if (!alreadyArmaniVideoReset) {
      if (armaniVideoResetMigrated.changed) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(armaniVideoResetMigrated.content))
      }
      window.localStorage.setItem(ARMANI_VIDEO_RESET_MIGRATION_KEY, '1')
    }

    const content = armaniVideoResetMigrated.content
    const alreadyMigrated = window.localStorage.getItem(FR_MIGRATION_KEY) === '1'
    if (alreadyMigrated) return content

    const localizedFr = localizeSiteContent(content, 'fr')
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(localizedFr))
    window.localStorage.setItem(FR_MIGRATION_KEY, '1')
    return localizedFr
  } catch {
    return cloneDefaultSiteContent()
  }
}

export function saveSiteContent(content: SiteContent) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content))
  window.dispatchEvent(new Event(CONTENT_SYNC_EVENT))
}

export function resetSiteContent() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(FR_MIGRATION_KEY)
  window.localStorage.removeItem(PROJECT_TEXT_MIGRATION_KEY)
  window.localStorage.removeItem(PROJECT_SEED_MIGRATION_KEY)
  window.localStorage.removeItem(ONLYONE_CASE_MIGRATION_KEY)
  window.localStorage.removeItem(PROJECT_TITLE_CASE_MIGRATION_KEY)
  window.localStorage.removeItem(ARMANI_VIDEO_RESET_MIGRATION_KEY)
  window.dispatchEvent(new Event(CONTENT_SYNC_EVENT))
}
