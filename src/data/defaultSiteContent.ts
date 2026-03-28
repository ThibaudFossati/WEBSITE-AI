import { projects as defaultProjects, type Project } from './projects'
import type { DisplayCaseMode, DisplayEmphasisMode, DisplayFontKey } from '../lib/typography'

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
}

export interface AboutContent {
  defaultVariant: 'A' | 'B' | 'C'
  name: string
  roleLine: string
  estLabel: string
  splitDarkLabel: string
  splitIntro: string
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

export interface DesignContent {
  displayFont: DisplayFontKey
  displayCase: DisplayCaseMode
  displayEmphasis: DisplayEmphasisMode
}

export interface SiteContent {
  home: HomeContent
  about: AboutContent
  contact: ContactContent
  footer: FooterContent
  design: DesignContent
  projects: Project[]
}

export const defaultSiteContent: SiteContent = {
  home: {
    heroLine1: 'Art',
    heroLine2: 'Direction',
    heroTagline: 'Art direction & AI crafted for premium brands',
    heroLocation: 'Thibaud Fossati — Paris',
    projectsTitle: 'Projets',
    servicesTitle: 'Services',
    servicesIntro:
      "Pour les marques premium qui veulent une direction artistique singulière, nourrie par 15 ans d'expérience et l'IA comme outil créatif.",
    services: [
      { name: 'Art direction', desc: 'Identité visuelle, campagnes, key visuals' },
      { name: 'AI Creativity', desc: 'Images et contenus générés par IA' },
      { name: 'Social media', desc: 'Stratégie et production de contenus' },
      { name: 'Web design', desc: 'Interfaces, UX, digital experiences' },
      { name: 'Motion design', desc: 'Animation, vidéo, reels' },
      { name: 'Editing', desc: 'Post-production, retouche, étalonnage' },
    ],
    aboutEyebrow: 'Thibaud Fossati · Paris',
    aboutQuote: `"15 ans à collaborer avec Publicis, TBWA, BBDO, Ogilvy — et l'IA comme nouveau médium."`,
    aboutCtaLabel: 'À propos',
    contactCtaTitle: "Let's create\nsomething\nremarkable.",
    contactCtaButton: 'Contact',
  },
  about: {
    defaultVariant: 'A',
    name: 'Thibaud\nFossati',
    roleLine: 'Art Director · AI Creativity · Paris',
    estLabel: 'Est. 2009',
    splitDarkLabel: '15+ années · Premium brands',
    splitIntro:
      "Directeur artistique indépendant, Thibaud collabore depuis 15 ans avec Publicis, TBWA, BBDO, Ogilvy — pour des marques qui exigent l'excellence.",
    skills: ['Art direction', 'AI Creativity', 'Motion', 'Web design'],
    manifestoQuote: '"Crafting pipeline narratives\n& visuals for luxury brands."',
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
      { label: 'Behance', href: '#' },
      { label: 'TikTok', href: 'https://tiktok.com/@ghost.in.gloss' },
      { label: 'LinkedIn', href: '#' },
    ],
    availabilityLabel: 'Disponible',
    availabilityText: 'Parlez-moi de votre projet, et créons ensemble quelque chose de remarquable.',
  },
  footer: {
    copyright: '© InStories 2026',
    registration: 'RCS 850 498 635 R.C.S. Paris',
    socials: [
      { label: 'Instagram', href: 'https://www.instagram.com/instories_ai' },
      { label: 'Behance', href: '#' },
      { label: 'TikTok', href: 'https://tiktok.com/@ghost.in.gloss' },
      { label: 'LinkedIn', href: '#' },
    ],
  },
  design: {
    displayFont: 'bodoni',
    displayCase: 'default',
    displayEmphasis: 'none',
  },
  projects: defaultProjects,
}
