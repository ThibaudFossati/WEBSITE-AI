import { defaultSiteContent, type SiteContent } from '../data/defaultSiteContent'
import type { Project } from '../data/projects'

const STORAGE_KEY = 'instories.site-content.v1'

export function cloneDefaultSiteContent(): SiteContent {
  return JSON.parse(JSON.stringify(defaultSiteContent)) as SiteContent
}

function normalizeProject(project: Project, index: number): Project {
  return {
    ...project,
    status: project.status ?? 'draft',
    order: typeof project.order === 'number' ? project.order : index,
    videoUrl: project.videoUrl ?? '',
  }
}

export function loadSiteContent(): SiteContent {
  if (typeof window === 'undefined') return cloneDefaultSiteContent()

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return cloneDefaultSiteContent()

  try {
    const parsed = JSON.parse(raw) as SiteContent
    return {
      ...cloneDefaultSiteContent(),
      ...parsed,
      home: { ...cloneDefaultSiteContent().home, ...parsed.home },
      about: { ...cloneDefaultSiteContent().about, ...parsed.about },
      contact: { ...cloneDefaultSiteContent().contact, ...parsed.contact },
      footer: { ...cloneDefaultSiteContent().footer, ...parsed.footer },
      design: { ...cloneDefaultSiteContent().design, ...parsed.design },
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map((project, index) => normalizeProject(project, index))
        : cloneDefaultSiteContent().projects.map((project, index) => normalizeProject(project, index)),
    }
  } catch {
    return cloneDefaultSiteContent()
  }
}

export function saveSiteContent(content: SiteContent) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content))
}

export function resetSiteContent() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}
