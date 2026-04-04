import type { SiteContent } from '../data/defaultSiteContent'
import type { LanguageCode } from './i18n'

function getPdfFileBase(lang: LanguageCode): string {
  return lang === 'en' ? 'instories-portfolio-en' : 'instories-dossier-fr'
}

function buildPdfFileName(lang: LanguageCode): string {
  const date = new Date().toISOString().slice(0, 10)
  return `${getPdfFileBase(lang)}-${date}.pdf`
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 3000)
}

function openFallbackPdf(fallbackUrl: string) {
  const link = document.createElement('a')
  link.href = fallbackUrl
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export async function downloadPortfolioPdfLive(
  content: SiteContent,
  lang: LanguageCode,
  fallbackUrl?: string,
): Promise<'generated' | 'fallback' | 'failed'> {
  try {
    const { generatePortfolioPdf } = await import('./portfolioPdf')
    const blob = await generatePortfolioPdf(content, lang)
    downloadBlob(blob, buildPdfFileName(lang))
    return 'generated'
  } catch {
    const fallback = fallbackUrl?.trim()
    if (fallback) {
      openFallbackPdf(fallback)
      return 'fallback'
    }
    return 'failed'
  }
}

