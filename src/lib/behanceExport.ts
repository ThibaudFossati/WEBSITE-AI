import type { SiteContent } from '../data/defaultSiteContent'
import type { Project } from '../data/projects'
import type { LanguageCode } from './i18n'
import { isLocalImageToken } from './localImageStore'
import { isLocalVideoToken } from './localVideoStore'
import { getProjectRoutePath } from './projectRouting'

type BehanceProjectPack = {
  id: string
  status: Project['status']
  order: number
  client: string
  title: string
  year: string
  tags: string[]
  agencies: string[]
  deliverables: string[]
  tools: string[]
  projectUrl: string
  coverUrl: string | null
  imageUrls: string[]
  videoUrls: string[]
  description: string
  brief: string
  unresolvedMediaCount: number
}

export type BehanceExportPack = {
  generatedAt: string
  language: LanguageCode
  profile: {
    studio: string
    about: string
    services: string[]
    contact: {
      email: string
      phone: string
      address: string
      socials: Array<{ label: string; href: string }>
    }
  }
  projects: BehanceProjectPack[]
  unresolvedMediaCount: number
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>()
  return values.filter(value => {
    const key = value.trim()
    if (!key) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function toAbsoluteUrl(value: string, origin: string): string | null {
  const input = value.trim()
  if (!input) return null
  if (input.startsWith('blob:')) return null
  if (isLocalImageToken(input) || isLocalVideoToken(input)) return null
  if (/^https?:\/\//i.test(input)) return input
  if (input.startsWith('/')) return `${origin}${input}`
  return null
}

function getProjectImageUrls(project: Project): string[] {
  const fromBlocks = project.imageBlocks?.length
    ? project.imageBlocks.flatMap(block => block.images ?? [])
    : project.images
  const cover = project.cover?.trim() ?? ''
  return dedupe([cover, ...fromBlocks])
}

function buildProjectDescription(project: Project): string {
  const lines: string[] = []
  if (project.tagline.trim()) lines.push(project.tagline.trim())
  if (project.description.trim()) lines.push(project.description.trim())
  if (project.brief.trim()) lines.push(project.brief.trim())
  return lines.join('\n\n')
}

function csvEscape(value: string): string {
  const safe = value.replace(/\r?\n/g, ' ').trim()
  return `"${safe.replace(/"/g, '""')}"`
}

export function buildBehanceExportPack(
  content: SiteContent,
  lang: LanguageCode,
  origin: string
): { pack: BehanceExportPack; markdown: string; csv: string } {
  const publishedProjects = [...content.projects]
    .filter(project => project.status === 'published')
    .sort((a, b) => a.order - b.order)

  const projects = publishedProjects.map(project => {
    const imageUrlsRaw = getProjectImageUrls(project)
    const videoUrlsRaw = dedupe(project.videoUrls?.length ? project.videoUrls : (project.videoUrl ? [project.videoUrl] : []))

    const imageUrls = imageUrlsRaw
      .map(url => toAbsoluteUrl(url, origin))
      .filter((url): url is string => Boolean(url))
    const videoUrls = videoUrlsRaw
      .map(url => toAbsoluteUrl(url, origin))
      .filter((url): url is string => Boolean(url))

    const coverUrl = toAbsoluteUrl(project.cover, origin)
    const unresolvedMediaCount = (coverUrl ? 0 : 1)
      + (imageUrlsRaw.length - imageUrls.length)
      + (videoUrlsRaw.length - videoUrls.length)

    return {
      id: project.id,
      status: project.status,
      order: project.order,
      client: project.client,
      title: project.title,
      year: project.year,
      tags: dedupe(project.category).slice(0, 10),
      agencies: dedupe(project.agencies),
      deliverables: dedupe(project.deliverables),
      tools: dedupe(project.tools),
      projectUrl: `${origin}${getProjectRoutePath(project)}`,
      coverUrl,
      imageUrls: dedupe(imageUrls),
      videoUrls: dedupe(videoUrls),
      description: buildProjectDescription(project),
      brief: project.brief.trim(),
      unresolvedMediaCount,
    }
  })

  const unresolvedMediaCount = projects.reduce((sum, project) => sum + project.unresolvedMediaCount, 0)

  const pack: BehanceExportPack = {
    generatedAt: new Date().toISOString(),
    language: lang,
    profile: {
      studio: 'InStories',
      about: `${content.about.name.replace(/\n+/g, ' ')} — ${content.about.roleLine}`.trim(),
      services: dedupe(content.home.services.map(service => service.name)),
      contact: {
        email: content.contact.email,
        phone: content.contact.phone,
        address: content.contact.addressLines.join(', '),
        socials: content.contact.socials.filter(link => link.href.trim()),
      },
    },
    projects,
    unresolvedMediaCount,
  }

  const markdownProjects = projects.map((project, index) => {
    const mediaLines: string[] = []
    if (project.coverUrl) mediaLines.push(`1. Cover: ${project.coverUrl}`)
    project.imageUrls.forEach((url, mediaIndex) => {
      mediaLines.push(`${mediaLines.length + 1}. Image ${mediaIndex + 1}: ${url}`)
    })
    project.videoUrls.forEach((url, mediaIndex) => {
      mediaLines.push(`${mediaLines.length + 1}. Video ${mediaIndex + 1}: ${url}`)
    })
    if (mediaLines.length === 0) mediaLines.push('- No public media URL (re-upload needed).')

    return [
      `## ${String(index + 1).padStart(2, '0')} · ${project.client} — ${project.title}`,
      `- Behance title: ${project.client} — ${project.title}`,
      `- Year: ${project.year}`,
      `- Tags: ${project.tags.join(', ')}`,
      `- Project URL: ${project.projectUrl}`,
      `- Agencies: ${project.agencies.join(', ') || '-'}`,
      `- Deliverables: ${project.deliverables.join(', ') || '-'}`,
      `- Tools: ${project.tools.join(', ') || '-'}`,
      '',
      project.description || '-',
      '',
      '### Media',
      ...mediaLines,
    ].join('\n')
  })

  const markdown = [
    '# InStories — Behance export pack',
    '',
    `Generated: ${new Date(pack.generatedAt).toLocaleString()}`,
    `Language: ${lang.toUpperCase()}`,
    '',
    '## Studio profile',
    `- About: ${pack.profile.about}`,
    `- Services: ${pack.profile.services.join(', ')}`,
    `- Contact: ${pack.profile.contact.email} · ${pack.profile.contact.phone}`,
    `- Address: ${pack.profile.contact.address}`,
    '',
    '## Social links',
    ...pack.profile.contact.socials.map(link => `- ${link.label}: ${link.href}`),
    '',
    '## Projects',
    ...markdownProjects,
    '',
  ].join('\n')

  const csvLines = [
    [
      'id',
      'status',
      'order',
      'behance_title',
      'client',
      'project_title',
      'year',
      'tags',
      'project_url',
      'cover_url',
      'image_urls',
      'video_urls',
      'description',
      'deliverables',
      'tools',
    ].join(','),
    ...projects.map(project => [
      csvEscape(project.id),
      csvEscape(project.status),
      csvEscape(String(project.order)),
      csvEscape(`${project.client} — ${project.title}`),
      csvEscape(project.client),
      csvEscape(project.title),
      csvEscape(project.year),
      csvEscape(project.tags.join(' | ')),
      csvEscape(project.projectUrl),
      csvEscape(project.coverUrl ?? ''),
      csvEscape(project.imageUrls.join(' | ')),
      csvEscape(project.videoUrls.join(' | ')),
      csvEscape(project.description),
      csvEscape(project.deliverables.join(' | ')),
      csvEscape(project.tools.join(' | ')),
    ].join(',')),
  ]

  return {
    pack,
    markdown,
    csv: csvLines.join('\n'),
  }
}
