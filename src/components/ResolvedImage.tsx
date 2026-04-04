import { useEffect, useMemo, useRef, useState, type CSSProperties, type ImgHTMLAttributes } from 'react'
import { isLocalImageToken, resolveLocalImageToObjectUrl } from '../lib/localImageStore'

type ResolvedImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src: string
  projectId?: string
  mediaKind?: 'cover' | 'image'
  mediaIndex?: number
}

function normalizeMediaPathValue(value: string): string {
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

function buildImageCandidates(value: string): string[] {
  const trimmed = value.trim()
  const set = new Set<string>()
  if (trimmed && !isLocalImageToken(trimmed)) set.add(trimmed)
  const normalized = normalizeMediaPathValue(trimmed)
  if (normalized && !isLocalImageToken(normalized)) set.add(normalized)
  return Array.from(set).filter(Boolean)
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

function appendWithExtensions(set: Set<string>, candidate: string, extensions: string[]) {
  const [pathPart, hashPart = ''] = candidate.split('#')
  const [pathname, queryPart = ''] = pathPart.split('?')
  const dotIndex = pathname.lastIndexOf('.')
  const hasExt = dotIndex > pathname.lastIndexOf('/')
  const basePath = hasExt ? pathname.slice(0, dotIndex) : pathname

  const normalizedBasePaths = new Set<string>([basePath])
  const numberedMatch = basePath.match(/^(.*\/)(image)-(\d{1,2})$/)
  if (numberedMatch) {
    const [, prefix, kind, rawIndex] = numberedMatch
    const index = Number(rawIndex)
    if (Number.isFinite(index) && index > 0) {
      normalizedBasePaths.add(`${prefix}${kind}-${String(index).padStart(2, '0')}`)
      normalizedBasePaths.add(`${prefix}${kind}-${String(index)}`)
    }
  }

  normalizedBasePaths.forEach(path => {
    extensions.forEach(ext => {
      const nextPath = `${path}.${ext}`
      const withQuery = queryPart ? `${nextPath}?${queryPart}` : nextPath
      const withHash = hashPart ? `${withQuery}#${hashPart}` : withQuery
      set.add(withHash)
    })
  })
}

function buildProjectImageCandidates(projectId: string | undefined, mediaKind: 'cover' | 'image' | undefined, mediaIndex: number | undefined): string[] {
  if (!projectId || !mediaKind) return []
  const safeProjectId = sanitizeProjectMediaId(projectId)
  const extensions = ['avif', 'webp', 'jpg', 'jpeg', 'png']
  const set = new Set<string>()

  if (mediaKind === 'cover') {
    extensions.forEach(ext => {
      set.add(`/media/projects/${safeProjectId}/cover.${ext}`)
    })
    return Array.from(set)
  }

  if (typeof mediaIndex !== 'number') return []
  const safeIndex = Math.max(1, mediaIndex + 1)
  const padded = String(safeIndex).padStart(2, '0')
  extensions.forEach(ext => {
    set.add(`/media/projects/${safeProjectId}/image-${padded}.${ext}`)
    set.add(`/media/projects/${safeProjectId}/image-${safeIndex}.${ext}`)
  })
  return Array.from(set)
}

function buildResolvedCandidates({
  src,
  projectId,
  mediaKind,
  mediaIndex,
}: {
  src: string
  projectId?: string
  mediaKind?: 'cover' | 'image'
  mediaIndex?: number
}): string[] {
  const set = new Set<string>()
  const extensions = ['avif', 'webp', 'jpg', 'jpeg', 'png']
  const direct = buildImageCandidates(src)
  direct.forEach(candidate => {
    set.add(candidate)
    appendWithExtensions(set, candidate, extensions)
  })
  buildProjectImageCandidates(projectId, mediaKind, mediaIndex).forEach(candidate => set.add(candidate))
  // Brand fallback to avoid browser broken-image icon + alt text flashes.
  set.add('/InStories-logo-BOT-with-label.svg')
  set.add('/InStories-logo-BOT.png')
  set.add('/instories-logo.svg')
  return Array.from(set)
}

export default function ResolvedImage({ src, projectId, mediaKind, mediaIndex, ...rest }: ResolvedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const objectUrlRef = useRef<string | null>(null)
  const tokenValue = src.trim()
  const candidates = useMemo(
    () => buildResolvedCandidates({ src: tokenValue, projectId, mediaKind, mediaIndex }),
    [tokenValue, projectId, mediaKind, mediaIndex]
  )

  useEffect(() => {
    setCandidateIndex(0)
  }, [tokenValue])

  useEffect(() => {
    const revoke = () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }

    let canceled = false
    revoke()

    if (!tokenValue) {
      setResolvedSrc('')
      return () => {
        canceled = true
        revoke()
      }
    }

    if (!isLocalImageToken(tokenValue)) {
      setResolvedSrc(candidates[candidateIndex] ?? '')
      return () => {
        canceled = true
        revoke()
      }
    }

    setResolvedSrc('')
    void resolveLocalImageToObjectUrl(tokenValue)
      .then(url => {
        if (canceled) {
          if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
          return
        }
        if (!url) {
          setResolvedSrc(candidates[candidateIndex] ?? '')
          return
        }
        objectUrlRef.current = url.startsWith('blob:') ? url : null
        setResolvedSrc(url)
      })
      .catch(() => {
        if (canceled) return
        setResolvedSrc(candidates[candidateIndex] ?? '')
      })

    return () => {
      canceled = true
      revoke()
    }
  }, [tokenValue, candidates, candidateIndex])

  if (!resolvedSrc) return null
  const loadingMode = rest.loading ?? (mediaKind === 'cover' ? 'eager' : 'lazy')
  const decodingMode = rest.decoding ?? 'async'
  const isBrandFallback = (
    resolvedSrc.includes('/InStories-logo-BOT-with-label.svg')
    || resolvedSrc.includes('/InStories-logo-BOT.png')
    || resolvedSrc.includes('/instories-logo.svg')
  )
  const mergedStyle: CSSProperties = {
    ...(rest.style as CSSProperties | undefined),
    ...(isBrandFallback
      ? {
        objectFit: 'contain',
        objectPosition: 'center',
        padding: '10%',
        opacity: 0.24,
        filter: 'grayscale(1) contrast(0.85)',
        background: 'rgba(10,10,10,0.035)',
      }
      : {}),
  }
  return (
    <img
      {...rest}
      src={resolvedSrc}
      style={mergedStyle}
      loading={loadingMode}
      decoding={decodingMode}
      onError={event => {
        if (candidateIndex < candidates.length - 1) {
          setCandidateIndex(candidateIndex + 1)
          return
        }
        if (typeof rest.onError === 'function') {
          rest.onError(event)
        }
      }}
    />
  )
}
