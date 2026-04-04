import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadEnv, type Plugin } from 'vite'

type TranslateRequestBody = {
  targetLang?: string
  texts?: string[]
}

type TranslateResponseBody = {
  translations: string[]
}

type PublishContentBody = {
  content?: unknown
}

type MediaCleanupResult = {
  removed: number
  kept: number
}

function writeJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readRawBody(req: IncomingMessage, maxBytes = 1_000_000): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', chunk => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      chunks.push(buffer)
      total += buffer.length
      if (total > maxBytes) {
        reject(new Error('Payload trop volumineux'))
      }
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function readJsonBody<T>(req: IncomingMessage, maxBytes = 1_000_000): Promise<T> {
  return new Promise((resolve, reject) => {
    void readRawBody(req, maxBytes)
      .then(buffer => {
        try {
          const parsed = buffer.length ? JSON.parse(buffer.toString('utf-8')) : {}
          resolve(parsed as T)
        } catch {
          reject(new Error('JSON invalide'))
        }
      })
      .catch(reject)
  })
}

function sanitizeTexts(texts: unknown): string[] {
  if (!Array.isArray(texts)) return []
  return texts
    .map(value => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
    .slice(0, 300)
}

function resolveEnvValue(key: string, env: Record<string, string>): string {
  const fromProcess = process.env[key]
  if (typeof fromProcess === 'string' && fromProcess.trim()) return fromProcess.trim()
  const fromLoaded = env[key]
  return typeof fromLoaded === 'string' ? fromLoaded.trim() : ''
}

async function requestOpenAiTranslations(
  texts: string[],
  targetLang: string,
  env: Record<string, string>,
): Promise<string[]> {
  const apiKey = resolveEnvValue('OPENAI_API_KEY', env)
  if (!apiKey) throw new Error('OPENAI_API_KEY manquant')

  const model = resolveEnvValue('OPENAI_TRANSLATION_MODEL', env) || 'gpt-4o-mini'
  const prompt = {
    targetLang,
    texts,
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a professional localization translator. Return JSON only with key "translations" as an array of strings. Keep exact order and array length. Preserve placeholders, punctuation, line breaks, and brand/product names. Do not rewrite URLs or emails.',
        },
        {
          role: 'user',
          content: JSON.stringify(prompt),
        },
      ],
    }),
  })

  const json = await response.json() as {
    error?: { message?: string }
    choices?: Array<{ message?: { content?: string } }>
  }

  if (!response.ok) {
    const message = json.error?.message ?? 'Erreur OpenAI'
    throw new Error(message)
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('Réponse vide du modèle')

  let parsed: TranslateResponseBody
  try {
    parsed = JSON.parse(content) as TranslateResponseBody
  } catch {
    throw new Error('Réponse JSON invalide du modèle')
  }

  const translations = Array.isArray(parsed.translations) ? parsed.translations : []
  return texts.map((source, index) => {
    const candidate = translations[index]
    return typeof candidate === 'string' && candidate.trim() ? candidate : source
  })
}

function sanitizeSegment(input: string, fallback = 'project'): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return normalized || fallback
}

function normalizePublicMediaRoute(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return ''

  const maybePath = (() => {
    if (/^https?:\/\//i.test(trimmed)) {
      try {
        return new URL(trimmed).pathname
      } catch {
        return trimmed
      }
    }
    return trimmed
  })()

  const [withoutHash] = maybePath.split('#')
  const [withoutQuery] = withoutHash.split('?')
  const normalized = withoutQuery
    .replace(/\\/g, '/')
    .split('/')
    .map(segment => segment
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase())
    .filter((segment, index) => !(segment === '' && index > 0))
    .map(segment => {
      if (segment === 'projets') return 'projects'
      if (segment === 'projet') return 'project'
      return segment
    })
    .join('/')

  if (!normalized) return ''
  return normalized.startsWith('/') ? normalized : `/${normalized}`
}

function extensionFromMime(contentType: string): string {
  const value = contentType.trim().toLowerCase()
  if (value === 'image/avif') return 'avif'
  if (value === 'image/webp') return 'webp'
  if (value === 'image/jpeg') return 'jpg'
  if (value === 'image/png') return 'png'
  if (value === 'video/mp4') return 'mp4'
  if (value === 'video/webm') return 'webm'
  if (value === 'video/ogg') return 'ogg'
  if (value === 'video/quicktime') return 'mov'
  return ''
}

function extensionFromFileName(fileName: string): string {
  const ext = path.extname(fileName).replace('.', '').toLowerCase()
  if (!ext) return ''
  return ext.replace(/[^a-z0-9]/g, '')
}

function isAllowedImageExt(ext: string): boolean {
  return ext === 'avif' || ext === 'webp' || ext === 'jpg' || ext === 'jpeg' || ext === 'png'
}

function isAllowedVideoExt(ext: string): boolean {
  return ext === 'mp4' || ext === 'webm' || ext === 'ogg' || ext === 'mov' || ext === 'm4v'
}

async function handleMediaUpload(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    writeJson(res, 405, { error: 'Méthode non autorisée' })
    return
  }

  const projectIdHeader = String(req.headers['x-project-id'] ?? '')
  const kindHeader = String(req.headers['x-media-kind'] ?? 'image')
  const indexHeader = Number(String(req.headers['x-media-index'] ?? '1'))
  const sourceNameHeader = String(req.headers['x-source-name'] ?? '')
  const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()

  const projectId = sanitizeSegment(projectIdHeader || 'project')
  const kind = sanitizeSegment(kindHeader, 'image')
  const safeIndex = Number.isFinite(indexHeader) && indexHeader > 0 ? Math.floor(indexHeader) : 1
  const body = await readRawBody(req, 450_000_000)
  if (!body.length) {
    writeJson(res, 400, { error: 'Fichier vide' })
    return
  }

  const extFromMime = extensionFromMime(contentType)
  const extFromName = extensionFromFileName(sourceNameHeader)
  const extCandidate = extFromMime || extFromName
  const isVideoKind = kind === 'video'
  const ext = isVideoKind
    ? (isAllowedVideoExt(extCandidate) ? extCandidate : 'mp4')
    : (isAllowedImageExt(extCandidate) ? extCandidate : 'webp')

  const baseName = kind === 'cover'
    ? 'cover'
    : `${kind === 'video' ? 'video' : 'image'}-${String(safeIndex).padStart(2, '0')}`
  const fileName = `${baseName}.${ext}`
  const relativePath = path.posix.join('media', 'projects', projectId, fileName)
  const absolutePath = path.join(process.cwd(), 'public', relativePath)

  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, body)

  writeJson(res, 200, {
    url: `/${relativePath.replace(/\\/g, '/')}`,
    projectId,
    fileName,
  })
}

async function handlePdfUpload(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    writeJson(res, 405, { error: 'Méthode non autorisée' })
    return
  }

  const requestedName = String(req.headers['x-pdf-name'] ?? 'instories-dossier.pdf')
  const safeBase = sanitizeSegment(path.basename(requestedName, path.extname(requestedName)), 'instories-dossier')
  const fileName = `${safeBase}.pdf`
  const body = await readRawBody(req, 25_000_000)
  if (!body.length) {
    writeJson(res, 400, { error: 'Fichier PDF vide' })
    return
  }

  const relativePath = path.posix.join('pdf', fileName)
  const absolutePath = path.join(process.cwd(), 'public', relativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, body)

  writeJson(res, 200, {
    ok: true,
    url: `/${relativePath.replace(/\\/g, '/')}`,
    fileName,
  })
}

function buildPublishedContentSource(content: unknown): string {
  const serialized = JSON.stringify(content, null, 2)
  return [
    "import type { SiteContent } from './defaultSiteContent'",
    '',
    `export const publishedSiteContent: SiteContent | null = ${serialized} as SiteContent`,
    '',
  ].join('\n')
}

function collectProjectMediaRoutes(content: unknown): Set<string> {
  const keep = new Set<string>()
  if (!content || typeof content !== 'object') return keep

  const projects = (content as { projects?: unknown }).projects
  if (!Array.isArray(projects)) return keep

  for (const item of projects) {
    if (!item || typeof item !== 'object') continue
    const project = item as {
      cover?: unknown
      images?: unknown
      imageBlocks?: unknown
      videoUrl?: unknown
      videoUrls?: unknown
    }

    const candidates: string[] = []
    if (typeof project.cover === 'string') candidates.push(project.cover)
    if (typeof project.videoUrl === 'string') candidates.push(project.videoUrl)
    if (Array.isArray(project.images)) {
      candidates.push(...project.images.filter((value): value is string => typeof value === 'string'))
    }
    if (Array.isArray(project.imageBlocks)) {
      project.imageBlocks.forEach(block => {
        if (!block || typeof block !== 'object') return
        const images = (block as { images?: unknown }).images
        if (!Array.isArray(images)) return
        candidates.push(...images.filter((value): value is string => typeof value === 'string'))
      })
    }
    if (Array.isArray(project.videoUrls)) {
      candidates.push(...project.videoUrls.filter((value): value is string => typeof value === 'string'))
    }

    candidates.forEach(raw => {
      const route = normalizePublicMediaRoute(raw)
      if (route.startsWith('/media/projects/')) keep.add(route)
    })
  }

  return keep
}

async function listFilesRecursively(rootDir: string): Promise<string[]> {
  try {
    const entries = await readdir(rootDir, { withFileTypes: true })
    const nested = await Promise.all(entries.map(async entry => {
      const absolute = path.join(rootDir, entry.name)
      if (entry.isDirectory()) return await listFilesRecursively(absolute)
      if (entry.isFile()) return [absolute]
      return []
    }))
    return nested.flat()
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function pruneEmptyDirectories(rootDir: string, isRoot = true): Promise<void> {
  let entries: Awaited<ReturnType<typeof readdir>>
  try {
    entries = await readdir(rootDir, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const absolute = path.join(rootDir, entry.name)
    await pruneEmptyDirectories(absolute, false)
  }

  if (isRoot) return

  const remaining = await readdir(rootDir).catch(() => [])
  if (remaining.length === 0) {
    await rm(rootDir, { recursive: false, force: true })
  }
}

async function cleanupUnusedProjectMedia(content: unknown): Promise<MediaCleanupResult> {
  const mediaRoot = path.join(process.cwd(), 'public', 'media', 'projects')
  const keepRoutes = collectProjectMediaRoutes(content)
  const files = await listFilesRecursively(mediaRoot)
  let removed = 0
  let kept = 0

  for (const absoluteFile of files) {
    const relativeFromPublic = path.relative(path.join(process.cwd(), 'public'), absoluteFile).replace(/\\/g, '/')
    const route = normalizePublicMediaRoute(`/${relativeFromPublic}`)
    if (route.endsWith('/.ds_store')) {
      await rm(absoluteFile, { force: true })
      removed += 1
      continue
    }
    if (keepRoutes.has(route)) {
      kept += 1
      continue
    }
    await rm(absoluteFile, { force: true })
    removed += 1
  }

  await pruneEmptyDirectories(mediaRoot, true)
  await mkdir(mediaRoot, { recursive: true })

  return { removed, kept }
}

async function handleContentPublish(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    writeJson(res, 405, { error: 'Méthode non autorisée' })
    return
  }

  const body = await readJsonBody<PublishContentBody>(req, 3_000_000)
  if (!body.content || typeof body.content !== 'object') {
    writeJson(res, 400, { error: 'Contenu invalide' })
    return
  }

  const source = buildPublishedContentSource(body.content)
  const targetPath = path.join(process.cwd(), 'src', 'data', 'publishedSiteContent.ts')
  await writeFile(targetPath, source, 'utf-8')
  const mediaCleanup = await cleanupUnusedProjectMedia(body.content)
  writeJson(res, 200, {
    ok: true,
    file: 'src/data/publishedSiteContent.ts',
    mediaCleanup,
  })
}

function createTranslateMiddleware(getEnv: () => Record<string, string>) {
  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const rawUrl = req.url ?? ''
    const pathname = new URL(rawUrl, 'http://localhost').pathname
    if (pathname === '/api/media/upload') {
      try {
        await handleMediaUpload(req, res)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur upload média'
        writeJson(res, 500, { error: message })
      }
      return
    }

    if (pathname === '/api/content/publish') {
      try {
        await handleContentPublish(req, res)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur publication contenu'
        writeJson(res, 500, { error: message })
      }
      return
    }

    if (pathname === '/api/pdf/upload') {
      try {
        await handlePdfUpload(req, res)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur publication PDF'
        writeJson(res, 500, { error: message })
      }
      return
    }

    if (pathname !== '/api/translate') {
      next()
      return
    }

    if (req.method !== 'POST') {
      writeJson(res, 405, { error: 'Méthode non autorisée' })
      return
    }

    try {
      const body = await readJsonBody<TranslateRequestBody>(req)
      const targetLang = (body.targetLang ?? 'en').trim().toLowerCase()
      const texts = sanitizeTexts(body.texts)

      if (!texts.length) {
        writeJson(res, 400, { error: 'Aucun texte à traduire' })
        return
      }

      const translations = await requestOpenAiTranslations(texts, targetLang, getEnv())
      writeJson(res, 200, { translations })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de traduction'
      writeJson(res, 500, { error: message })
    }
  }
}

export function translateApiPlugin(): Plugin {
  let loadedEnv: Record<string, string> = {}
  const middleware = createTranslateMiddleware(() => loadedEnv)
  return {
    name: 'instories-translate-api',
    config(_, { mode }) {
      loadedEnv = loadEnv(mode, process.cwd(), '')
    },
    configureServer(server) {
      server.middlewares.use(middleware)
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware)
    },
  }
}
