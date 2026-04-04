import { useEffect, useState } from 'react'
import { type SiteContent } from '../data/defaultSiteContent'
import { CONTENT_SYNC_EVENT, loadSiteContent } from '../lib/siteContent'
import { getStoredLanguage, listenLanguageChange, localizeSiteContent } from '../lib/i18n'
import { resolveColorMode } from '../lib/colorMode'

function localizeAndResolveColorMode(): SiteContent {
  const raw = loadSiteContent()
  const localized = localizeSiteContent(raw, getStoredLanguage())
  return {
    ...localized,
    design: {
      ...localized.design,
      colorMode: resolveColorMode(localized.design),
    },
  }
}

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(() => localizeAndResolveColorMode())

  useEffect(() => {
    const sync = () => {
      setContent(localizeAndResolveColorMode())
    }
    const onStorage = () => sync()
    const onContentUpdate = () => sync()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') sync()
    }
    const onWindowFocus = () => sync()
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemThemeChange = () => sync()
    window.addEventListener('storage', onStorage)
    window.addEventListener(CONTENT_SYNC_EVENT, onContentUpdate)
    window.addEventListener('focus', onWindowFocus)
    window.addEventListener('pageshow', onWindowFocus)
    document.addEventListener('visibilitychange', onVisibility)
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onSystemThemeChange)
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(onSystemThemeChange)
    }
    const unsubscribeLanguage = listenLanguageChange(() => sync())
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(CONTENT_SYNC_EVENT, onContentUpdate)
      window.removeEventListener('focus', onWindowFocus)
      window.removeEventListener('pageshow', onWindowFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', onSystemThemeChange)
      } else if (typeof mediaQuery.removeListener === 'function') {
        mediaQuery.removeListener(onSystemThemeChange)
      }
      unsubscribeLanguage()
    }
  }, [])

  return content
}
