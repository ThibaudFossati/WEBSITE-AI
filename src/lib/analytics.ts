type GtagCommand = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: GtagCommand
    __instoriesGaInit?: boolean
  }
}

const GA_MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim()
const LOCAL_EVENT_STORE_KEY = 'instories.analytics.events.v1'

type TrackedEventItem = {
  total: number
  lastTs: number
}

type TrackedEventStore = {
  updatedAt: number
  events: Record<string, TrackedEventItem>
}

export type TrackedEventSnapshot = {
  updatedAt: number
  events: Record<string, TrackedEventItem>
}

const EMPTY_EVENT_SNAPSHOT: TrackedEventSnapshot = {
  updatedAt: 0,
  events: {},
}

function isAnalyticsEnabled(): boolean {
  return Boolean(GA_MEASUREMENT_ID) && !import.meta.env.DEV
}

export function initAnalytics() {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return
  if (window.__instoriesGaInit) return

  window.__instoriesGaInit = true
  window.dataLayer = window.dataLayer || []
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args)
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`
  document.head.appendChild(script)

  window.gtag('js', new Date())
  // On envoie les pageviews manuellement pour supporter React Router.
  window.gtag('config', GA_MEASUREMENT_ID, { send_page_view: false })
}

export function trackPageView(path: string) {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return

  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

export function trackEvent(eventName: string, params?: Record<string, string | number | boolean | null | undefined>) {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return
  window.gtag('event', eventName, params ?? {})
  persistLocalEvent(eventName)
}

function readLocalEventStore(): TrackedEventStore {
  if (typeof window === 'undefined') return EMPTY_EVENT_SNAPSHOT
  try {
    const raw = window.localStorage.getItem(LOCAL_EVENT_STORE_KEY)
    if (!raw) return EMPTY_EVENT_SNAPSHOT
    const parsed = JSON.parse(raw) as Partial<TrackedEventStore>
    if (!parsed || typeof parsed !== 'object') return EMPTY_EVENT_SNAPSHOT
    const safeEvents = Object.entries(parsed.events ?? {}).reduce<Record<string, TrackedEventItem>>((acc, [name, item]) => {
      if (!item || typeof item !== 'object') return acc
      const total = Number((item as Partial<TrackedEventItem>).total)
      const lastTs = Number((item as Partial<TrackedEventItem>).lastTs)
      if (!Number.isFinite(total) || !Number.isFinite(lastTs)) return acc
      acc[name] = {
        total: Math.max(0, Math.floor(total)),
        lastTs: Math.max(0, Math.floor(lastTs)),
      }
      return acc
    }, {})
    return {
      updatedAt: Number.isFinite(Number(parsed.updatedAt)) ? Math.max(0, Math.floor(Number(parsed.updatedAt))) : 0,
      events: safeEvents,
    }
  } catch {
    return EMPTY_EVENT_SNAPSHOT
  }
}

function persistLocalEvent(eventName: string) {
  if (typeof window === 'undefined') return
  const key = eventName.trim()
  if (!key) return
  const current = readLocalEventStore()
  const now = Date.now()
  const prev = current.events[key] ?? { total: 0, lastTs: 0 }
  const next: TrackedEventStore = {
    updatedAt: now,
    events: {
      ...current.events,
      [key]: {
        total: prev.total + 1,
        lastTs: now,
      },
    },
  }
  window.localStorage.setItem(LOCAL_EVENT_STORE_KEY, JSON.stringify(next))
}

export function getTrackedEventsSnapshot(): TrackedEventSnapshot {
  return readLocalEventStore()
}

export function clearTrackedEventsSnapshot() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(LOCAL_EVENT_STORE_KEY)
}
