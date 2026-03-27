import { useEffect, useState } from 'react'
import { type SiteContent } from '../data/defaultSiteContent'
import { loadSiteContent } from '../lib/siteContent'

export function useSiteContent() {
  const [content, setContent] = useState<SiteContent>(() => loadSiteContent())

  useEffect(() => {
    const onStorage = () => setContent(loadSiteContent())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return content
}
