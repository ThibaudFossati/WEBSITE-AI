import { projects as defaultProjects, type Project } from './projects'
import type { DisplayCaseMode, DisplayEmphasisMode, DisplayFontKey, DisplayWeight } from '../lib/typography'
import { publishedSiteContent } from './publishedSiteContent'

export interface ServiceItem {
  name: string
  desc: string
}

export interface SocialLink {
  label: string
  href: string
}

export interface StatItem {
  value: string
  label: string
}

export interface HomeContent {
  heroLine1: string
  heroLine2: string
  heroTagline: string
  heroLocation: string
  projectsTitle: string
  servicesTitle: string
  servicesIntro: string
  services: ServiceItem[]
  aboutEyebrow: string
  aboutQuote: string
  aboutCtaLabel: string
  contactCtaTitle: string
  contactCtaButton: string
  instagramPostUrls: string[]
}

export interface AboutContent {
  name: string
  roleLine: string
  estLabel: string
  splitDarkLabel: string
  splitIntro: string
  photo?: string
  skills: string[]
  manifestoQuote: string
  stats: StatItem[]
  agencies: string[]
  ctaTitle: string
  ctaLabel: string
}

export interface ContactContent {
  title: string
  email: string
  phone: string
  addressLines: string[]
  socials: SocialLink[]
  availabilityLabel: string
  availabilityText: string
}

export interface FooterContent {
  copyright: string
  registration: string
  socials: SocialLink[]
}

export interface PdfReminderContent {
  isEnabled: boolean
  triggerProjectViews: number
  title: string
  description: string
  ctaLabel: string
  pdfUrl: string
}

export interface DisplayProfileSettings {
  displayWeight: DisplayWeight
  displaySize: number
  displayLetterSpacing: number
  displayWordSpacing: number
  displayLineHeight: number
  displayCase: DisplayCaseMode
  displayEmphasis: DisplayEmphasisMode
}

export type ColorMode = 'light' | 'night'
export type ColorModePreference = 'system' | 'light' | 'night'
export type NightStyle = 'safe' | 'bold'

export interface DesignContent {
  displayFont: DisplayFontKey
  displayWeight: DisplayWeight
  displaySize: number
  displayLetterSpacing: number
  displayWordSpacing: number
  displayLineHeight: number
  displayCase: DisplayCaseMode
  displayEmphasis: DisplayEmphasisMode
  colorModePreference: ColorModePreference
  colorMode: ColorMode
  nightStyle: NightStyle
  displayProfiles?: Partial<Record<DisplayFontKey, DisplayProfileSettings>>
}

export interface SiteContent {
  home: HomeContent
  about: AboutContent
  contact: ContactContent
  footer: FooterContent
  pdfReminder: PdfReminderContent
  design: DesignContent
  projects: Project[]
}

const baseSiteContent: SiteContent = {
  home: {
    heroLine1: 'Art',
    heroLine2: 'Direction',
    heroTagline: 'Direction artistique & IA au service des marques premium',
    heroLocation: 'Thibaud Fossati — Paris',
    projectsTitle: 'Projets',
    servicesTitle: 'Services',
    servicesIntro:
      "Pour les marques premium qui veulent une direction artistique singulière, nourrie par 15 ans d'expérience et l'IA comme outil créatif.",
    services: [
      { name: 'Direction artistique', desc: 'Identité visuelle, campagnes, visuels clés' },
      { name: 'Créativité IA', desc: 'Images et contenus générés par IA' },
      { name: 'Réseaux sociaux', desc: 'Stratégie et production de contenus' },
      { name: 'Design web', desc: 'Interfaces, UX, expériences digitales' },
      { name: 'Motion design', desc: 'Animation, vidéo, reels' },
      { name: 'Montage', desc: 'Post-production, retouche, étalonnage' },
    ],
    aboutEyebrow: 'Thibaud Fossati · Paris',
    aboutQuote: `"15 ans à collaborer avec Publicis, TBWA, BBDO, Ogilvy — et l'IA comme nouveau médium."`,
    aboutCtaLabel: 'À propos',
    contactCtaTitle: "Créons\nquelque chose\nd'exception.",
    contactCtaButton: 'Contact',
    instagramPostUrls: [],
  },
  about: {
    name: 'Thibaud\nFossati',
    roleLine: 'Directeur artistique · Créativité IA · Paris',
    estLabel: 'Est. 2009',
    splitDarkLabel: '15+ années · Marques premium',
    splitIntro:
      "Directeur artistique indépendant basé à Paris, Thibaud Fossati collabore depuis 15 ans avec les plus grandes agences — Publicis, TBWA, BBDO, Ogilvy, DDB — pour des marques qui exigent l'excellence créative.\n\nSa signature : une direction artistique rigoureuse, nourrie par une curiosité constante pour les nouvelles formes visuelles. Depuis l'émergence de l'intelligence artificielle générative, il en fait un outil central de sa pratique — non pour remplacer la vision, mais pour l'amplifier.\n\nChez InStories, chaque projet part d'une conviction : les meilleures marques ne se contentent pas de communiquer. Elles racontent.",
    skills: ['Direction artistique', 'Créativité IA', 'Motion design', 'Design web'],
    manifestoQuote: '"Concevoir des récits visuels\npour les marques de luxe."',
    stats: [
      { value: '15+', label: 'Années' },
      { value: '50+', label: 'Marques' },
      { value: '5', label: 'Agences' },
    ],
    agencies: ['Publicis', 'TBWA', 'BBDO', 'Ogilvy', 'DDB'],
    ctaTitle: 'Travaillons ensemble',
    ctaLabel: 'Contact',
  },
  contact: {
    title: 'Contact',
    email: 'contact@instories.fr',
    phone: '06 03 36 18 36',
    addressLines: ['72, rue des Archives', '75003 Paris, France'],
    socials: [
      { label: 'Instagram', href: 'https://www.instagram.com/instories_ai' },
      { label: 'TikTok', href: 'https://tiktok.com/@ghost.in.gloss' },
    ],
    availabilityLabel: 'Disponible',
    availabilityText: 'Parlez-moi de votre projet, et créons ensemble quelque chose de remarquable.',
  },
  footer: {
    copyright: '© InStories 2026',
    registration: 'RCS 850 498 635 R.C.S. Paris',
    socials: [
      { label: 'Instagram', href: 'https://www.instagram.com/instories_ai' },
      { label: 'TikTok', href: 'https://tiktok.com/@ghost.in.gloss' },
    ],
  },
  pdfReminder: {
    isEnabled: false,
    triggerProjectViews: 3,
    title: 'On vous envoie un PDF ?',
    description: 'Après quelques projets vus, téléchargez un résumé clair pour garder InStories en tête.',
    ctaLabel: 'Télécharger le dossier PDF',
    pdfUrl: '/pdf/instories-dossier.pdf',
  },
  design: {
    displayFont: 'bodoni',
    displayWeight: 400,
    displaySize: 100,
    displayLetterSpacing: -0.03,
    displayWordSpacing: 0,
    displayLineHeight: 0.9,
    displayCase: 'default',
    displayEmphasis: 'none',
    colorModePreference: 'system',
    colorMode: 'light',
    nightStyle: 'safe',
    displayProfiles: {
      bodoni: {
        displayWeight: 400,
        displaySize: 100,
        displayLetterSpacing: -0.03,
        displayWordSpacing: 0,
        displayLineHeight: 0.9,
        displayCase: 'default',
        displayEmphasis: 'none',
      },
    },
  },
  projects: defaultProjects,
}

export const defaultSiteContent: SiteContent = (
  publishedSiteContent && typeof publishedSiteContent === 'object'
    ? publishedSiteContent as SiteContent
    : baseSiteContent
)
