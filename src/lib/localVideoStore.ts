const DB_NAME = 'instories.local-video-db'
const STORE_NAME = 'videos'
const TOKEN_PREFIX = 'instories-local-video://'

type StoredVideo = {
  id: string
  blob: Blob
  type: string
  name: string
  updatedAt: number
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

function toToken(id: string): string {
  return `${TOKEN_PREFIX}${id}`
}

function normalizeTokenPrefix(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const normalized = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  const match = normalized.match(/^instories-local-video:\/\//i)
  if (!match) return trimmed
  const suffix = normalized.slice(match[0].length).trim()
  return `${TOKEN_PREFIX}${suffix}`
}

function fromToken(token: string): string | null {
  const normalized = normalizeTokenPrefix(token)
  if (!normalized.startsWith(TOKEN_PREFIX)) return null
  const payload = normalized.slice(TOKEN_PREFIX.length).trim()
  if (!payload) return null
  const legacyId = payload.split('/')[0]?.trim()
  if (!legacyId) return null
  try {
    return decodeURIComponent(legacyId) || null
  } catch {
    return legacyId
  }
}

function makeVideoId(file: File): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const safeName = file.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`
}

export function isLocalVideoToken(value: string): boolean {
  return normalizeTokenPrefix(value).startsWith(TOKEN_PREFIX)
}

export async function saveLocalVideo(file: File): Promise<string> {
  const db = await openDatabase()
  const id = makeVideoId(file)

  const payload: StoredVideo = {
    id,
    blob: file,
    type: file.type || 'video/mp4',
    name: file.name,
    updatedAt: Date.now(),
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(payload)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Écriture vidéo impossible'))
      tx.onabort = () => reject(tx.error ?? new Error('Transaction annulée'))
    })

    return toToken(id)
  } finally {
    db.close()
  }
}

export async function resolveLocalVideoToObjectUrl(value: string): Promise<string | null> {
  const id = fromToken(value)
  if (!id) return null

  const db = await openDatabase()
  try {
    const record = await new Promise<StoredVideo | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result as StoredVideo | undefined)
      request.onerror = () => reject(request.error ?? new Error('Lecture vidéo impossible'))
    })

    if (!record?.blob) return null
    return URL.createObjectURL(record.blob)
  } finally {
    db.close()
  }
}
