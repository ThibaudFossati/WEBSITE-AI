import type { Project } from '../data/projects'

function normalizeProjectValue(value: string | undefined): string {
  if (!value) return ''
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function slugifyProjectValue(value: string | undefined): string {
  return normalizeProjectValue(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function isGeneratedProjectId(value: string | undefined): boolean {
  const normalized = normalizeProjectValue(value)
  return /^project-\d{6,}$/.test(normalized) || /^projet-\d{6,}$/.test(normalized)
}

export function getProjectRouteSlug(project: Project): string {
  if (isGeneratedProjectId(project.id)) {
    const fromContent = slugifyProjectValue(`${project.client} ${project.title}`)
    if (fromContent) return fromContent
  }
  return slugifyProjectValue(project.id) || slugifyProjectValue(`${project.client} ${project.title}`) || 'project'
}

export function getProjectRoutePath(project: Project): string {
  return `/projects/${getProjectRouteSlug(project)}`
}
