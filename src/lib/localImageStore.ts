const DB_NAME = 'instories.local-image-db'
const STORE_NAME = 'images'
const TOKEN_PREFIX = 'instories-local-image://'

type StoredImage = {
  id: string
  blob: Blob
  name: string
  type: string
  updatedAt: number
}

type SaveImageOptions = {
  maxDimension?: number
  quality?: number
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponible'))
      return
    }

    const request = window.indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Ouverture DB impossible'))
  })
}

function sanitizeBaseName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[a-z0-9]+$/i, '')
  return withoutExt
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, 48) || 'image'
}

function makeImageId(file: File): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const safeName = sanitizeBaseName(file.name).slice(0, 24)
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
}

function toToken(id: string, fileName?: string): string {
  if (!fileName) return `${TOKEN_PREFIX}${id}`
  return `${TOKEN_PREFIX}${id}/${encodeURIComponent(fileName)}`
}

function normalizeTokenPrefix(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const match = normalized.match(/^instories-local-image:\/\//i)
  if (!match) return trimmed
  const suffix = normalized.slice(match[0].length).trim()
  return `${TOKEN_PREFIX}${suffix}`
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parseToken(token: string): { id: string; fileName?: string } | null {
  const value = normalizeTokenPrefix(token)
  if (!value.startsWith(TOKEN_PREFIX)) return null
  const payload = value.slice(TOKEN_PREFIX.length)
  if (!payload) return null
  if (!payload.includes('/')) {
    const fileName = safeDecode(payload)
    return { id: fileName, fileName }
  }

  // Compat tokens legacy: TOKEN + "<id>/<fileName>"
  const [legacyId, encodedName] = payload.split('/', 2)
  if (!legacyId) return null
  return {
    id: safeDecode(legacyId),
    fileName: encodedName ? safeDecode(encodedName) : undefined,
  }
}

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Image illisible'))
    }
    img.src = objectUrl
  })
}

async function compressImage(
  file: File,
  { maxDimension = 1800, quality = 0.82 }: SaveImageOptions = {}
): Promise<{ blob: Blob; outputName: string }> {
  const img = await loadImageElement(file)
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  const scale = Math.min(1, maxDimension / Math.max(width, height))
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponible')
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  const base = sanitizeBaseName(file.name)
  const outputName = `${base}.webp`
  const outputType = 'image/webp'

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => {
      if (!result) {
        reject(new Error('Compression image impossible'))
        return
      }
      resolve(result)
    }, outputType, quality)
  })

  return { blob, outputName }
}

export function isLocalImageToken(value: string): boolean {
  return normalizeTokenPrefix(value).startsWith(TOKEN_PREFIX)
}

export async function saveLocalImage(file: File, options?: SaveImageOptions): Promise<string> {
  const { blob, outputName } = await compressImage(file, options)
  const id = makeImageId(file)
  const payload: StoredImage = {
    id,
    blob,
    name: outputName,
    type: blob.type || 'image/webp',
    updatedAt: Date.now(),
  }

  const db = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(payload)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Écriture image impossible'))
      tx.onabort = () => reject(tx.error ?? new Error('Transaction image annulée'))
    })
  } finally {
    db.close()
  }

  return toToken(id, outputName)
}

export async function resolveLocalImageToObjectUrl(value: string): Promise<string | null> {
  const parsed = parseToken(value)
  if (!parsed) return null

  const db = await openDatabase()
  try {
    let record = await new Promise<StoredImage | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(parsed.id)
      request.onsuccess = () => resolve(request.result as StoredImage | undefined)
      request.onerror = () => reject(request.error ?? new Error('Lecture image impossible'))
    })

    if (!record?.blob && parsed.fileName && parsed.fileName !== parsed.id) {
      record = await new Promise<StoredImage | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const request = tx.objectStore(STORE_NAME).get(parsed.fileName as string)
        request.onsuccess = () => resolve(request.result as StoredImage | undefined)
        request.onerror = () => reject(request.error ?? new Error('Lecture image impossible'))
      })
    }

    if (!record?.blob) return null
    return URL.createObjectURL(record.blob)
  } finally {
    db.close()
  }
}
