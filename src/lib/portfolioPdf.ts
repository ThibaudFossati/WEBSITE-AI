import type { SiteContent } from '../data/defaultSiteContent'
import type { Project } from '../data/projects'
import { isLocalImageToken, resolveLocalImageToObjectUrl } from './localImageStore'
import type { LanguageCode } from './i18n'
import { getProjectRoutePath } from './projectRouting'
import QRCode from 'qrcode'

type PdfImage = {
  bytes: Uint8Array
  width: number
  height: number
}

type PdfPageImagePlacement = {
  name: string
  image: PdfImage
  x: number
  y: number
  width: number
  height: number
}

type PdfPage = {
  ops: string[]
  images: PdfPageImagePlacement[]
}

type PdfPageMeta = {
  pageId: number
  contentId: number
  images: Array<PdfPageImagePlacement & { objectId: number }>
}

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842

function encode(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i)
    bytes[i] = code <= 0xff ? code : 0x3f
  }
  return bytes
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const result = new Uint8Array(total)
  let offset = 0
  parts.forEach(part => {
    result.set(part, offset)
    offset += part.length
  })
  return result
}

function toPdfText(input: string): string {
  return input
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2018\u2019]/g, '\'')
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/•/g, '|')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, ' ')
}

function escapePdfText(input: string): string {
  return toPdfText(input)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function wrapText(input: string, maxChars: number, maxLines = 2): string[] {
  const text = toPdfText(input).replace(/\s+/g, ' ').trim()
  if (!text) return []
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  words.forEach(word => {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
      return
    }
    if (current) lines.push(current)
    current = word
  })

  if (current) lines.push(current)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
  return kept
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function createStreamObject(streamBytes: Uint8Array): Uint8Array {
  return concatBytes([
    encode(`<< /Length ${streamBytes.length} >>\nstream\n`),
    streamBytes,
    encode('\nendstream'),
  ])
}

function createImageObject(image: PdfImage): Uint8Array {
  return concatBytes([
    encode(
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`
    ),
    image.bytes,
    encode('\nendstream'),
  ])
}

async function loadImageElement(src: string, useCors = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    if (useCors) image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Image non lisible: ${src.slice(0, 80)}`))
    image.src = src
  })
}

async function resolveImageSource(candidate: string): Promise<{ src: string; revoke?: () => void; cors?: boolean } | null> {
  if (!candidate) return null

  if (/^data:image\//i.test(candidate)) {
    return { src: candidate }
  }

  if (isLocalImageToken(candidate)) {
    const objectUrl = await resolveLocalImageToObjectUrl(candidate)
    if (!objectUrl) return null
    return {
      src: objectUrl,
      revoke: () => URL.revokeObjectURL(objectUrl),
    }
  }

  if (/^https?:\/\//i.test(candidate)) {
    const sameOrigin = typeof window !== 'undefined' && candidate.startsWith(window.location.origin)
    // Allow external URLs but flag them for CORS
    return { src: candidate, cors: !sameOrigin }
  }

  if (typeof window === 'undefined') return null
  return { src: new URL(candidate, window.location.origin).toString() }
}

function drawImageToJpeg(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  fit: 'cover' | 'contain',
  background: string,
): PdfImage | null {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight
    const context = canvas.getContext('2d')
    if (!context) return null

    const scale = fit === 'cover'
      ? Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
      : Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
    const drawWidth = image.naturalWidth * scale
    const drawHeight = image.naturalHeight * scale
    const offsetX = (canvas.width - drawWidth) * 0.5
    const offsetY = (canvas.height - drawHeight) * 0.5

    context.fillStyle = background
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight)

    // toDataURL throws SecurityError if canvas is tainted (cross-origin image)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.84)
    const base64 = dataUrl.split(',')[1]
    if (!base64) return null
    return {
      bytes: fromBase64(base64),
      width: canvas.width,
      height: canvas.height,
    }
  } catch {
    return null
  }
}

async function createJpegImageFromSource(
  candidate: string,
  targetWidth: number,
  targetHeight: number,
  fit: 'cover' | 'contain',
  background = '#e9e8e6'
): Promise<PdfImage | null> {
  const source = await resolveImageSource(candidate)
  if (!source) {
    console.warn('[PDF] Could not resolve image source:', candidate.slice(0, 100))
    return null
  }

  try {
    // Try with CORS first if flagged, otherwise try without
    const useCors = source.cors ?? false
    let image: HTMLImageElement
    try {
      image = await loadImageElement(source.src, useCors)
    } catch {
      // If CORS load fails, retry without CORS (same-origin might work)
      if (useCors) {
        try {
          image = await loadImageElement(source.src, false)
        } catch {
          console.warn('[PDF] Image load failed (both CORS and no-CORS):', candidate.slice(0, 100))
          return null
        }
      } else {
        console.warn('[PDF] Image load failed:', candidate.slice(0, 100))
        return null
      }
    }

    // Try to draw to canvas — if tainted, retry with CORS
    const result = await drawImageToJpeg(image, targetWidth, targetHeight, fit, background)
    if (result) return result

    // Canvas toDataURL may have failed silently (tainted canvas),
    // retry with CORS if we didn't use it before
    if (!useCors) {
      try {
        const corsImage = await loadImageElement(source.src, true)
        const corsResult = await drawImageToJpeg(corsImage, targetWidth, targetHeight, fit, background)
        if (corsResult) return corsResult
      } catch {
        // CORS retry also failed
      }
    }

    // Last resort: fetch the image as a blob and try again
    try {
      const response = await fetch(source.src)
      if (response.ok) {
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        try {
          const blobImage = await loadImageElement(blobUrl, false)
          const blobResult = drawImageToJpeg(blobImage, targetWidth, targetHeight, fit, background)
          if (blobResult) return blobResult
        } finally {
          URL.revokeObjectURL(blobUrl)
        }
      }
    } catch {
      // fetch fallback also failed
    }

    console.warn('[PDF] All image loading strategies failed for:', candidate.slice(0, 100))
    return null
  } catch (error) {
    console.warn('[PDF] Image processing error:', candidate.slice(0, 100), error)
    return null
  } finally {
    source.revoke?.()
  }
}

function getProjectImageCandidates(project: Project): string[] {
  const sourceImages = project.imageBlocks?.length
    ? project.imageBlocks.flatMap(block => block.images ?? [])
    : (project.images ?? [])
  const merged = [
    project.cover ?? '',
    ...sourceImages,
    ...(project.images ?? []),
  ]
  const seen = new Set<string>()
  const result: string[] = []
  merged.forEach(raw => {
    const value = raw.trim()
    if (!value) return
    const key = value.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    result.push(value)
  })
  return result
}

async function createProjectImages(project: Project, count: number): Promise<Array<PdfImage | null>> {
  const candidates = getProjectImageCandidates(project).slice(0, count)
  const resolved = await Promise.all(
    candidates.map(candidate => createJpegImageFromNaturalSize(candidate, 1200))
  )
  const padded: Array<PdfImage | null> = [...resolved]
  while (padded.length < count) padded.push(null)
  return padded
}

/** Load image at its natural aspect ratio, scaled to fit within maxDim */
async function createJpegImageFromNaturalSize(
  candidate: string,
  maxDim: number,
): Promise<PdfImage | null> {
  const source = await resolveImageSource(candidate)
  if (!source) {
    console.warn('[PDF] Could not resolve image source:', candidate.slice(0, 100))
    return null
  }

  try {
    const useCors = source.cors ?? false
    let image: HTMLImageElement
    try {
      image = await loadImageElement(source.src, useCors)
    } catch {
      if (useCors) {
        try { image = await loadImageElement(source.src, false) } catch { return null }
      } else { return null }
    }

    const nw = image.naturalWidth
    const nh = image.naturalHeight
    if (nw <= 0 || nh <= 0) return null

    const scale = Math.min(maxDim / nw, maxDim / nh, 1)
    const tw = Math.round(nw * scale)
    const th = Math.round(nh * scale)

    // Draw at natural ratio — no contain/cover, just fill canvas
    const result = drawImageToJpeg(image, tw, th, 'cover', '#f5f2ee')
    if (result) return result

    // Fallback: retry with CORS / blob
    if (!useCors) {
      try {
        const corsImg = await loadImageElement(source.src, true)
        const corsResult = drawImageToJpeg(corsImg, tw, th, 'cover', '#f5f2ee')
        if (corsResult) return corsResult
      } catch { /* */ }
    }
    try {
      const resp = await fetch(source.src)
      if (resp.ok) {
        const blob = await resp.blob()
        const blobUrl = URL.createObjectURL(blob)
        try {
          const blobImg = await loadImageElement(blobUrl, false)
          const blobResult = drawImageToJpeg(blobImg, tw, th, 'cover', '#f5f2ee')
          if (blobResult) return blobResult
        } finally { URL.revokeObjectURL(blobUrl) }
      }
    } catch { /* */ }

    return null
  } finally {
    source.revoke?.()
  }
}

type ImageOrientation = 'landscape' | 'portrait' | 'square'

function getOrientation(img: PdfImage): ImageOrientation {
  const ratio = img.width / img.height
  if (ratio > 1.15) return 'landscape'
  if (ratio < 0.85) return 'portrait'
  return 'square'
}

async function createBrandLogoImage(): Promise<PdfImage | null> {
  const siteLogo = await createJpegImageFromSource('/LOGO-INSTORIES.png', 900, 220, 'contain', '#f6f4f0')
  if (siteLogo) return siteLogo
  const svgLogo = await createJpegImageFromSource('/instories-logo.svg', 700, 220, 'contain', '#f6f4f0')
  if (svgLogo) return svgLogo
  return createJpegImageFromSource('/InStories-logo-BOT.png', 700, 220, 'contain', '#f6f4f0')
}

async function createQrImage(url: string): Promise<PdfImage | null> {
  if (!url) return null
  try {
    const qrDataUrl = await QRCode.toDataURL(url, {
      width: 360,
      margin: 0,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#101318',
        light: '#FFFFFF',
      },
    })
    return createJpegImageFromSource(qrDataUrl, 360, 360, 'contain', '#ffffff')
  } catch {
    return null
  }
}

function textLine(ops: string[], text: string, x: number, y: number, size: number) {
  ops.push(`BT\n/F1 ${size} Tf\n${x.toFixed(2)} ${y.toFixed(2)} Td\n(${escapePdfText(text)}) Tj\nET`)
}

function setTextColor(ops: string[], rgb: [number, number, number]) {
  ops.push(`${rgb[0]} ${rgb[1]} ${rgb[2]} rg`)
}

function drawRectFill(ops: string[], x: number, y: number, width: number, height: number, rgb: [number, number, number]) {
  ops.push(`${rgb[0]} ${rgb[1]} ${rgb[2]} rg`)
  ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`)
}

function drawRectStroke(ops: string[], x: number, y: number, width: number, height: number, rgb: [number, number, number], strokeWidth = 1) {
  ops.push(`${strokeWidth} w`)
  ops.push(`${rgb[0]} ${rgb[1]} ${rgb[2]} RG`)
  ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re S`)
}

function drawLine(ops: string[], x1: number, y1: number, x2: number, y2: number, rgb: [number, number, number], strokeWidth = 1) {
  ops.push(`${strokeWidth} w`)
  ops.push(`${rgb[0]} ${rgb[1]} ${rgb[2]} RG`)
  ops.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`)
}

function fitRectContain(
  sourceWidth: number,
  sourceHeight: number,
  boxWidth: number,
  boxHeight: number,
): { width: number; height: number; offsetX: number; offsetY: number } {
  if (sourceWidth <= 0 || sourceHeight <= 0 || boxWidth <= 0 || boxHeight <= 0) {
    return { width: 0, height: 0, offsetX: 0, offsetY: 0 }
  }
  const scale = Math.min(boxWidth / sourceWidth, boxHeight / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  return {
    width,
    height,
    offsetX: (boxWidth - width) * 0.5,
    offsetY: (boxHeight - height) * 0.5,
  }
}

function uniqueValues(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  values.forEach(value => {
    const normalized = value.trim()
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    result.push(normalized)
  })
  return result
}

function normalizeSummaryKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getSocialMap(content: SiteContent): Record<'instagram' | 'tiktok' | 'linkedin', string> {
  const allSocials = [...content.contact.socials, ...content.footer.socials]
  const find = (key: string) => {
    const entry = allSocials.find(item => item.label.toLowerCase().includes(key) || item.href.toLowerCase().includes(key))
    return entry?.href ?? ''
  }
  return {
    instagram: find('instagram'),
    tiktok: find('tiktok'),
    linkedin: find('linkedin'),
  }
}

function addLegalFooter(
  ops: string[],
  content: SiteContent,
  pageNumber: number,
  totalPages: number
) {
  drawLine(ops, 42, 44, PAGE_WIDTH - 42, 44, [0.72, 0.72, 0.72], 0.6)
  setTextColor(ops, [0.36, 0.36, 0.36])
  textLine(ops, content.footer.registration || '', 42, 28, 8)
  textLine(ops, content.footer.copyright || '', 42, 16, 8)
  textLine(ops, `Page ${pageNumber}/${totalPages}`, PAGE_WIDTH - 90, 16, 8)
}

async function renderPdfPages(content: SiteContent, lang: LanguageCode): Promise<PdfPage[]> {
  const isEnglish = lang === 'en'
  const publishedProjects = content.projects
    .filter(project => project.status === 'published')
    .sort((a, b) => a.order - b.order)

  const siteBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.instories.fr'

  const cards = await Promise.all(
    publishedProjects.map(async project => ({
      project,
      images: await createProjectImages(project, 5),
      qr: await createQrImage(`${siteBaseUrl}${getProjectRoutePath(project)}`),
    }))
  )

  const pages: PdfPage[] = []
  // Gallery mode: 1 project = 1 page
  const totalPages = 1 + cards.length

  const logoImage = await createBrandLogoImage()
  const socialMap = getSocialMap(content)
  const [instagramQr, tiktokQr, linkedinQr] = await Promise.all([
    createQrImage(socialMap.instagram),
    createQrImage(socialMap.tiktok),
    createQrImage(socialMap.linkedin),
  ])
  const servicesSummary = uniqueValues(content.home.services.map(service => service.name)).slice(0, 8)
  const serviceKeys = new Set(servicesSummary.map(normalizeSummaryKey))
  const tasksSummary = uniqueValues([
    ...publishedProjects.flatMap(project => project.deliverables),
    ...publishedProjects.flatMap(project => project.tools),
  ])
    .filter(item => {
      const key = normalizeSummaryKey(item)
      return key.length > 0 && !serviceKeys.has(key)
    })
    .slice(0, 10)
  const publishedYears = uniqueValues(publishedProjects.map(project => String(project.year)))
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
    .slice(-5)
  const introHeroImage = cards[0]?.images?.[0] ?? null

  {
    const ops: string[] = []
    const images: PdfPageImagePlacement[] = []
    const leftColumnX = 42
    const rightColumnX = 324
    const dateText = `${isEnglish ? 'Generated' : 'Genere'} ${new Date().toLocaleDateString(isEnglish ? 'en-US' : 'fr-FR')}`
    const yearsSpan = publishedYears.length > 0
      ? `${publishedYears[0]} - ${publishedYears[publishedYears.length - 1]}`
      : ''

    const leftColWidth = 248
    const rightColWidth = PAGE_WIDTH - rightColumnX - 42

    drawRectFill(ops, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, [0.952, 0.952, 0.952])
    // Header separator
    drawLine(ops, leftColumnX, PAGE_HEIGHT - 88, PAGE_WIDTH - 42, PAGE_HEIGHT - 88, [0.74, 0.74, 0.74], 0.6)
    // Thin vertical rule between columns
    drawLine(ops, 308, 68, 308, PAGE_HEIGHT - 94, [0.80, 0.80, 0.80], 0.5)

    if (logoImage) {
      const logoBoxWidth = 130
      const logoBoxHeight = 34
      const logoFit = fitRectContain(logoImage.width, logoImage.height, logoBoxWidth, logoBoxHeight)
      images.push({
        name: 'Logo',
        image: logoImage,
        x: leftColumnX + logoFit.offsetX,
        y: PAGE_HEIGHT - 76 + logoFit.offsetY,
        width: logoFit.width,
        height: logoFit.height,
      })
      ops.push(`q\n${logoFit.width.toFixed(2)} 0 0 ${logoFit.height.toFixed(2)} ${(leftColumnX + logoFit.offsetX).toFixed(2)} ${(PAGE_HEIGHT - 76 + logoFit.offsetY).toFixed(2)} cm\n/Logo Do\nQ`)
    }

    // Header text
    setTextColor(ops, [0.08, 0.09, 0.11])
    textLine(ops, isEnglish ? 'Portfolio Deck' : 'Dossier Portfolio', 180, PAGE_HEIGHT - 56, 16)
    setTextColor(ops, [0.44, 0.44, 0.46])
    textLine(ops, dateText, 180, PAGE_HEIGHT - 72, 8)
    textLine(ops, `${publishedProjects.length} ${isEnglish ? 'projects' : 'projets'}${yearsSpan ? '  ·  ' + yearsSpan : ''}`, PAGE_WIDTH - 172, PAGE_HEIGHT - 60, 8)

    // Section heading: small label + thin underline
    const sectionLabel = (x: number, y: number, label: string, colWidth: number) => {
      setTextColor(ops, [0.42, 0.42, 0.44])
      textLine(ops, label.toUpperCase(), x, y, 7.5)
      drawLine(ops, x, y - 5, x + colWidth, y - 5, [0.76, 0.76, 0.76], 0.5)
      return y - 20
    }
    const paragraphAt = (
      x: number,
      y: number,
      text: string,
      size: number,
      maxChars: number,
      maxLines: number,
      gap = 5
    ) => {
      const lines = wrapText(text, maxChars, maxLines)
      lines.forEach((line, index) => {
        textLine(ops, line, x, y - index * (size + gap), size)
      })
      return y - lines.length * (size + gap)
    }

    let leftY = PAGE_HEIGHT - 122
    let rightY = PAGE_HEIGHT - 122

    // — Left column: Services (names only) + Livrables —
    leftY = sectionLabel(leftColumnX, leftY, isEnglish ? 'Services' : 'Services', leftColWidth)
    content.home.services.slice(0, 6).forEach(service => {
      setTextColor(ops, [0.1, 0.11, 0.13])
      textLine(ops, `· ${toPdfText(service.name)}`, leftColumnX + 4, leftY, 10.5)
      leftY -= 17
    })
    leftY -= 10
    leftY = sectionLabel(leftColumnX, leftY, isEnglish ? 'Deliverables & Tools' : 'Livrables & Outils', leftColWidth)
    setTextColor(ops, [0.22, 0.22, 0.24])
    leftY = paragraphAt(leftColumnX, leftY, tasksSummary.slice(0, 8).join('  ·  '), 9.2, 40, 5, 5)

    // — Right column: About, Expertise, Contact —
    rightY = sectionLabel(rightColumnX, rightY, isEnglish ? 'About' : 'A propos', rightColWidth)
    setTextColor(ops, [0.06, 0.07, 0.09])
    textLine(ops, content.about.name.replace(/\n+/g, ' '), rightColumnX, rightY, 15)
    rightY -= 22
    setTextColor(ops, [0.36, 0.36, 0.38])
    rightY = paragraphAt(rightColumnX, rightY, content.about.roleLine, 9.5, 30, 1, 5)
    rightY -= 8
    setTextColor(ops, [0.2, 0.2, 0.22])
    rightY = paragraphAt(rightColumnX, rightY, content.about.splitIntro, 9.2, 33, 30, 5)
    rightY -= 14
    rightY = sectionLabel(rightColumnX, rightY, isEnglish ? 'Expertise' : 'Expertise', rightColWidth)
    setTextColor(ops, [0.2, 0.2, 0.22])
    rightY = paragraphAt(rightColumnX, rightY, uniqueValues(content.about.skills).slice(0, 8).join('  ·  '), 9.2, 32, 3, 5)
    rightY -= 14
    rightY = sectionLabel(rightColumnX, rightY, isEnglish ? 'Contact' : 'Contact', rightColWidth)
    setTextColor(ops, [0.2, 0.2, 0.22])
    textLine(ops, content.contact.email, rightColumnX, rightY, 9.5)
    rightY -= 15
    textLine(ops, content.contact.phone, rightColumnX, rightY, 9.5)
    rightY -= 15
    setTextColor(ops, [0.18, 0.22, 0.54])
    textLine(ops, 'www.instories.fr', rightColumnX, rightY, 9.5)

    if (introHeroImage) {
      const heroBoxX = leftColumnX
      const heroBoxY = 58
      const heroBoxWidth = 246
      const heroBoxHeight = 160
      const heroFit = fitRectContain(introHeroImage.width, introHeroImage.height, heroBoxWidth, heroBoxHeight)
      images.push({
        name: 'Hero',
        image: introHeroImage,
        x: heroBoxX + heroFit.offsetX,
        y: heroBoxY + heroFit.offsetY,
        width: heroFit.width,
        height: heroFit.height,
      })
      ops.push(`q\n${heroFit.width.toFixed(2)} 0 0 ${heroFit.height.toFixed(2)} ${(heroBoxX + heroFit.offsetX).toFixed(2)} ${(heroBoxY + heroFit.offsetY).toFixed(2)} cm\n/Hero Do\nQ`)
    }

    const qrTopY = 84
    const qrSize = 54
    const qrGap = 12
    const qrStartX = rightColumnX
    const qrItems: Array<{ label: string; image: PdfImage | null }> = [
      { label: 'Instagram', image: instagramQr },
      { label: 'TikTok', image: tiktokQr },
      { label: 'LinkedIn', image: linkedinQr },
    ]
    setTextColor(ops, [0.15, 0.15, 0.16])
    textLine(ops, isEnglish ? 'Social links' : 'Liens sociaux', qrStartX, qrTopY + qrSize + 16, 8.4)
    qrItems.forEach((item, index) => {
      const x = qrStartX + index * (qrSize + qrGap)
      const yPos = qrTopY
      drawRectStroke(ops, x, yPos, qrSize, qrSize, [0.64, 0.64, 0.64], 0.7)
      if (item.image) {
        const name = `Qr${index + 1}`
        images.push({
          name,
          image: item.image,
          x: x + 4,
          y: yPos + 4,
          width: qrSize - 8,
          height: qrSize - 8,
        })
        ops.push(`q\n${(qrSize - 8).toFixed(2)} 0 0 ${(qrSize - 8).toFixed(2)} ${(x + 4).toFixed(2)} ${(yPos + 4).toFixed(2)} cm\n/${name} Do\nQ`)
      }
      textLine(ops, item.label, x, yPos - 12, 7)
    })

    addLegalFooter(ops, content, 1, totalPages)
    pages.push({ ops, images })
  }

  // ── Editorial pages: 1 project = 1 page, structured grid layout ──
  const MX = 36               // horizontal margin
  const MY_TOP = 36           // top margin
  const MY_BOT = 36           // bottom margin
  const BG: [number, number, number] = [0.949, 0.945, 0.937] // warm paper
  const INK: [number, number, number] = [0.10, 0.09, 0.08]
  const MUTED: [number, number, number] = [0.42, 0.40, 0.38]
  const FAINT: [number, number, number] = [0.58, 0.56, 0.52]
  const RULE: [number, number, number] = [0.78, 0.76, 0.72]

  // 3-column grid positions
  const COL1_X = MX
  const COL2_X = MX + 180
  const COL3_X = MX + 360
  const CONTENT_W = PAGE_WIDTH - MX * 2
  const COL1_W = 170
  const COL2_W = 170
  const COL3_W = CONTENT_W - COL1_W - COL2_W - 20

  // Helper to place an image — fills box as much as possible (contain, anchored top-left for better framing)
  const placeImage = (
    pOps: string[], pImages: PdfPageImagePlacement[],
    img: PdfImage, name: string,
    bx: number, by: number, bw: number, bh: number,
  ) => {
    const fit = fitRectContain(img.width, img.height, bw, bh)
    // Anchor top-left (PDF y=0 is bottom, so anchor to top = by + bh - fit.height)
    const fx = bx
    const fy = by + bh - fit.height
    pImages.push({ name, image: img, x: fx, y: fy, width: fit.width, height: fit.height })
    pOps.push(`q\n${fit.width.toFixed(2)} 0 0 ${fit.height.toFixed(2)} ${fx.toFixed(2)} ${fy.toFixed(2)} cm\n/${name} Do\nQ`)
  }

  for (let i = 0; i < cards.length; i += 1) {
    const { project, images: projectImages, qr: projectQr } = cards[i]
    const ops: string[] = []
    const images: PdfPageImagePlacement[] = []
    const valid = projectImages.filter((img): img is PdfImage => img !== null)
    const globalIndex = i + 1

    // Paper background
    drawRectFill(ops, 0, 0, PAGE_WIDTH, PAGE_HEIGHT, BG)

    // ═══════ ROW 1: Header bar ═══════
    const headerY = PAGE_HEIGHT - MY_TOP
    const headerBaseY = headerY - 14

    // Top horizontal rule
    drawLine(ops, MX, headerY, PAGE_WIDTH - MX, headerY, RULE, 0.5)

    // Col 1: Client, Year
    setTextColor(ops, INK)
    textLine(ops, `${toPdfText(project.client)}, ${project.year}.`, COL1_X, headerBaseY, 8)

    // Col 2: Categories
    const cats = uniqueValues(project.category).slice(0, 3)
    setTextColor(ops, MUTED)
    textLine(ops, cats.map(c => toPdfText(c)).join('  '), COL2_X, headerBaseY, 8)

    // Col 3: Client (right) + Year (far right)
    setTextColor(ops, MUTED)
    textLine(ops, toPdfText(project.client), COL3_X, headerBaseY, 8)
    textLine(ops, String(project.year), PAGE_WIDTH - MX - 24, headerBaseY, 8)

    // Bottom header rule
    const headerBottomY = headerY - 24
    drawLine(ops, MX, headerBottomY, PAGE_WIDTH - MX, headerBottomY, RULE, 0.5)

    // ═══════ ROW 2: Large title ═══════
    const titleY = headerBottomY - 14
    setTextColor(ops, INK)
    const titleText = toPdfText(project.title)
    // Big display title — centered
    const titleSize = titleText.length > 20 ? 32 : 40
    textLine(ops, titleText, COL2_X - 20, titleY - titleSize + 8, titleSize)

    // Title bottom rule
    const titleBottomY = titleY - titleSize - 14
    drawLine(ops, MX, titleBottomY, PAGE_WIDTH - MX, titleBottomY, RULE, 0.5)

    // ═══════ ROW 3: Meta bar (3 columns) ═══════
    const metaY = titleBottomY - 14

    // Col 1: Deliverables tag
    const deliverables = uniqueValues(project.deliverables).slice(0, 2)
    setTextColor(ops, MUTED)
    textLine(ops, deliverables.map(d => toPdfText(d)).join(', '), COL1_X, metaY, 7.5)

    // Col 2: Tagline (short)
    const shortTagline = toPdfText(project.tagline).slice(0, 40)
    textLine(ops, shortTagline + (project.tagline.length > 40 ? '...' : ''), COL2_X, metaY, 7.5)

    // Col 3: Project label
    setTextColor(ops, FAINT)
    textLine(ops, `Projet ${String(globalIndex).padStart(2, '0')}`, COL3_X, metaY, 7.5)

    // Meta bottom rule
    const metaBottomY = metaY - 14
    drawLine(ops, MX, metaBottomY, PAGE_WIDTH - MX, metaBottomY, RULE, 0.5)

    // ═══════ ROW 4: Main content — Image (left 60%) + Text (right 40%) ═══════
    const contentTopY = metaBottomY - 10
    const contentBottomY = MY_BOT + 20
    const contentH = contentTopY - contentBottomY

    // Image zone: ~60% left
    const imgZoneW = Math.round(CONTENT_W * 0.58)
    const imgZoneH = contentH
    const imgZoneX = MX
    const imgZoneY = contentBottomY

    // Text zone: ~40% right
    const textZoneX = MX + imgZoneW + 18
    const textZoneW = CONTENT_W - imgZoneW - 18
    let textY = contentTopY

    if (valid.length === 0) {
      // No images — gray placeholder
      drawRectFill(ops, imgZoneX, imgZoneY, imgZoneW, imgZoneH, [0.88, 0.86, 0.83])
    } else if (valid.length === 1) {
      // Single image filling the zone
      placeImage(ops, images, valid[0], `G${i}_1`, imgZoneX, imgZoneY, imgZoneW, imgZoneH)
    } else if (valid.length === 2) {
      // Two images stacked
      const gap = 6
      const halfH = (imgZoneH - gap) / 2
      placeImage(ops, images, valid[0], `G${i}_1`, imgZoneX, imgZoneY + halfH + gap, imgZoneW, halfH)
      placeImage(ops, images, valid[1], `G${i}_2`, imgZoneX, imgZoneY, imgZoneW, halfH)
    } else if (valid.length === 3) {
      // 3 images: large top + 2 below
      const gap = 6
      const topH = Math.round(imgZoneH * 0.58)
      const botH = imgZoneH - topH - gap
      placeImage(ops, images, valid[0], `G${i}_1`, imgZoneX, imgZoneY + botH + gap, imgZoneW, topH)
      const halfW = (imgZoneW - gap) / 2
      placeImage(ops, images, valid[1], `G${i}_2`, imgZoneX, imgZoneY, halfW, botH)
      placeImage(ops, images, valid[2], `G${i}_3`, imgZoneX + halfW + gap, imgZoneY, halfW, botH)
    } else if (valid.length === 4) {
      // 4 images: large left + 3 stacked right
      const gap = 6
      const leftW = Math.round(imgZoneW * 0.55)
      const rightW = imgZoneW - leftW - gap
      placeImage(ops, images, valid[0], `G${i}_1`, imgZoneX, imgZoneY, leftW, imgZoneH)
      const rightX = imgZoneX + leftW + gap
      const cellH = (imgZoneH - gap * 2) / 3
      placeImage(ops, images, valid[1], `G${i}_2`, rightX, imgZoneY + cellH * 2 + gap * 2, rightW, cellH)
      placeImage(ops, images, valid[2], `G${i}_3`, rightX, imgZoneY + cellH + gap, rightW, cellH)
      placeImage(ops, images, valid[3], `G${i}_4`, rightX, imgZoneY, rightW, cellH)
    } else {
      // 5 images: large top-left + 4 grid
      const gap = 6
      const topH = Math.round(imgZoneH * 0.55)
      const botH = imgZoneH - topH - gap
      // Top: 1 large left + 1 right
      const topLeftW = Math.round(imgZoneW * 0.58)
      const topRightW = imgZoneW - topLeftW - gap
      const topY = imgZoneY + botH + gap
      placeImage(ops, images, valid[0], `G${i}_1`, imgZoneX, topY, topLeftW, topH)
      placeImage(ops, images, valid[1], `G${i}_2`, imgZoneX + topLeftW + gap, topY, topRightW, topH)
      // Bottom: 3 equal
      const thirdW = (imgZoneW - gap * 2) / 3
      placeImage(ops, images, valid[2], `G${i}_3`, imgZoneX, imgZoneY, thirdW, botH)
      placeImage(ops, images, valid[3], `G${i}_4`, imgZoneX + thirdW + gap, imgZoneY, thirdW, botH)
      placeImage(ops, images, valid[4], `G${i}_5`, imgZoneX + (thirdW + gap) * 2, imgZoneY, thirdW, botH)
    }

    // Vertical rule between image and text
    drawLine(ops, textZoneX - 9, contentTopY, textZoneX - 9, contentBottomY, RULE, 0.4)

    // ═══════ TEXT ZONE (right column) ═══════

    // Description heading
    setTextColor(ops, FAINT)
    textLine(ops, (isEnglish ? 'Project' : 'Projet').toUpperCase(), textZoneX, textY, 7)
    drawLine(ops, textZoneX, textY - 5, textZoneX + textZoneW, textY - 5, RULE, 0.4)
    textY -= 18

    // Description paragraph
    setTextColor(ops, INK)
    const descLines = wrapText(project.description || project.tagline, Math.floor(textZoneW / 5), 8)
    descLines.forEach((line, li) => {
      textLine(ops, line, textZoneX, textY - li * 12, 8.5)
    })
    textY -= descLines.length * 12 + 20

    // Deliverables heading
    setTextColor(ops, FAINT)
    textLine(ops, (isEnglish ? 'Deliverables' : 'Livrables').toUpperCase(), textZoneX, textY, 7)
    drawLine(ops, textZoneX, textY - 5, textZoneX + textZoneW, textY - 5, RULE, 0.4)
    textY -= 18

    // Deliverables list
    setTextColor(ops, INK)
    const allDeliverables = uniqueValues([...project.deliverables, ...project.tools]).slice(0, 6)
    allDeliverables.forEach(item => {
      textLine(ops, `.${toPdfText(item)}`, textZoneX, textY, 8)
      textY -= 14
    })

    // Agencies if any
    const agencies = uniqueValues(project.agencies).slice(0, 3)
    if (agencies.length > 0) {
      textY -= 10
      setTextColor(ops, FAINT)
      textLine(ops, (isEnglish ? 'With' : 'Avec').toUpperCase(), textZoneX, textY, 7)
      drawLine(ops, textZoneX, textY - 5, textZoneX + textZoneW, textY - 5, RULE, 0.4)
      textY -= 18
      setTextColor(ops, MUTED)
      agencies.forEach(agency => {
        textLine(ops, toPdfText(agency), textZoneX, textY, 8)
        textY -= 14
      })
    }

    // ═══════ QR code (bottom-right, links to project page) ═══════
    if (projectQr) {
      const qrSize = 42
      const qrX = PAGE_WIDTH - MX - qrSize
      const qrY = MY_BOT - 4
      const qrName = `PQr${i}`
      images.push({ name: qrName, image: projectQr, x: qrX + 3, y: qrY + 3, width: qrSize - 6, height: qrSize - 6 })
      ops.push(`q\n${(qrSize - 6).toFixed(2)} 0 0 ${(qrSize - 6).toFixed(2)} ${(qrX + 3).toFixed(2)} ${(qrY + 3).toFixed(2)} cm\n/${qrName} Do\nQ`)
      drawRectStroke(ops, qrX, qrY, qrSize, qrSize, RULE, 0.4)
      setTextColor(ops, FAINT)
      textLine(ops, isEnglish ? 'View online' : 'Voir en ligne', qrX - 58, qrY + qrSize / 2 - 3, 6.5)
    }

    // ═══════ Page number ═══════
    setTextColor(ops, FAINT)
    textLine(ops, `${globalIndex + 1} / ${totalPages}`, MX, MY_BOT, 7)

    pages.push({ ops, images })
  }

  return pages
}

function buildPdfBytes(pages: PdfPage[]): Uint8Array {
  let nextObjectId = 3
  const pageMetas: PdfPageMeta[] = pages.map(page => {
    const pageId = nextObjectId
    nextObjectId += 1
    const contentId = nextObjectId
    nextObjectId += 1
    const imageMetas = page.images.map(item => {
      const objectId = nextObjectId
      nextObjectId += 1
      return { ...item, objectId }
    })
    return { pageId, contentId, images: imageMetas }
  })
  const fontObjectId = nextObjectId
  const maxObjectId = fontObjectId

  const objects: Array<Uint8Array | null> = Array.from({ length: maxObjectId + 1 }, () => null)
  objects[1] = encode('<< /Type /Catalog /Pages 2 0 R >>')
  objects[2] = encode(`<< /Type /Pages /Kids [${pageMetas.map(meta => `${meta.pageId} 0 R`).join(' ')}] /Count ${pageMetas.length} >>`)
  objects[fontObjectId] = encode('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')

  pageMetas.forEach((meta, index) => {
    const page = pages[index]
    const xObjects = meta.images.length > 0
      ? `/XObject << ${meta.images.map(image => `/${image.name} ${image.objectId} 0 R`).join(' ')} >>`
      : ''
    objects[meta.pageId] = encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${meta.contentId} 0 R /Resources << /Font << /F1 ${fontObjectId} 0 R >> ${xObjects} >> >>`
    )
    objects[meta.contentId] = createStreamObject(encode(`${page.ops.join('\n')}\n`))
    meta.images.forEach(image => {
      objects[image.objectId] = createImageObject(image.image)
    })
  })

  const parts: Uint8Array[] = [encode('%PDF-1.4\n')]
  const offsets: number[] = Array.from({ length: maxObjectId + 1 }, () => 0)
  let cursor = parts[0].length

  for (let id = 1; id <= maxObjectId; id += 1) {
    const objectBody = objects[id] ?? encode('<< >>')
    const head = encode(`${id} 0 obj\n`)
    const tail = encode('\nendobj\n')
    offsets[id] = cursor
    parts.push(head, objectBody, tail)
    cursor += head.length + objectBody.length + tail.length
  }

  let xref = `xref\n0 ${maxObjectId + 1}\n0000000000 65535 f \n`
  for (let id = 1; id <= maxObjectId; id += 1) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  }

  const trailer = `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF\n`
  parts.push(encode(xref), encode(trailer))
  return concatBytes(parts)
}

export async function generatePortfolioPdf(content: SiteContent, lang: LanguageCode): Promise<Blob> {
  const pages = await renderPdfPages(content, lang)
  const bytes = buildPdfBytes(pages)
  return new Blob([bytes], { type: 'application/pdf' })
}
