export interface Project {
  id: string
  client: string
  title: string
  tagline: string
  status: 'draft' | 'published'
  order: number
  category: string[]
  year: string
  agencies: string[]
  description: string
  brief: string
  deliverables: string[]
  tools: string[]
  cover: string
  images: string[]
  videoUrl: string
  color: string
}

export const projects: Project[] = [
  {
    id: 'salomon',
    client: 'Salomon',
    title: 'Tomorrow Is Yours',
    tagline: 'Art direction trail running',
    status: 'published',
    order: 0,
    category: ['Art direction', 'Motion'],
    year: '2024',
    agencies: ['TBWA'],
    description: 'Campagne trail running pour Salomon — une direction artistique brute, terreuse, en mouvement.',
    brief: 'Positionner Salomon comme la marque du futur du trail. Énergie, performance, authenticité.',
    deliverables: ['Campagne social media', 'Motion design', 'Key visuals'],
    tools: ['Art direction', 'AI Creativity', 'Motion'],
    cover: '/images/salomon-cover.jpg',
    images: [],
    videoUrl: '',
    color: '#e8e0d5',
  },
  {
    id: 'armani-beauty',
    client: 'Armani Beauty',
    title: 'Crema Nera',
    tagline: 'The remodeling sheer cream',
    status: 'published',
    order: 1,
    category: ['Art direction', 'AI Creativity'],
    year: '2024',
    agencies: ['Publicis'],
    description: 'Direction artistique pour le lancement de Crema Nera — luxe, matière, lumière.',
    brief: 'Sublimer le produit dans toute sa complexité. Montrer la formule, la texture, l\'élégance Armani.',
    deliverables: ['Visuels produit', 'Social media', 'Campagne digitale'],
    tools: ['Art direction', 'AI Creativity', 'Editing'],
    cover: '/images/armani-cover.jpg',
    images: [],
    videoUrl: '',
    color: '#f0ede8',
  },
  {
    id: 'nespresso-fusalp',
    client: 'Nespresso × Fusalp',
    title: 'Taste The Winter Wonder',
    tagline: 'Collaboration luxe montagne',
    status: 'published',
    order: 2,
    category: ['Art direction', 'Social media'],
    year: '2023',
    agencies: ['BBDO'],
    description: 'Collaboration entre Nespresso et Fusalp — luxe alpin, café et performance.',
    brief: 'Fusionner deux univers premium en une identité visuelle commune cohérente et désirable.',
    deliverables: ['Social media', 'Key visuals', 'Motion'],
    tools: ['Art direction', 'Social media', 'Motion'],
    cover: '/images/nespresso-cover.jpg',
    images: [],
    videoUrl: '',
    color: '#e5e8ed',
  },
  {
    id: 'estee-lauder',
    client: 'Estée Lauder',
    title: 'Advanced Night Repair',
    tagline: 'For beautiful skin, timing is everything',
    status: 'published',
    order: 3,
    category: ['Art direction', 'Web design'],
    year: '2023',
    agencies: ['Ogilvy'],
    description: 'Campagne 360° pour l\'Advanced Night Repair — digital, OOH, social.',
    brief: 'Moderniser l\'iconique sérum ANR pour une audience digitale-first tout en préservant l\'ADN luxe.',
    deliverables: ['Campagne OOH', 'Social media', 'Email marketing', 'Motion'],
    tools: ['Art direction', 'Web design', 'Editing'],
    cover: '/images/estee-cover.jpg',
    images: [],
    videoUrl: '',
    color: '#eceaf5',
  },
  {
    id: 'granier',
    client: 'Garnier',
    title: 'Ultra Doux',
    tagline: 'Naturalité & performance',
    status: 'published',
    order: 4,
    category: ['Art direction', 'Social media'],
    year: '2023',
    agencies: ['DDB'],
    description: 'Refonte de la communication sociale de la gamme Ultra Doux — naturel, inclusif, moderne.',
    brief: 'Rajeunir la marque Garnier Ultra Doux sur les réseaux sociaux sans perdre son territoire naturel.',
    deliverables: ['Social media', 'Content series', 'Motion'],
    tools: ['Art direction', 'AI Creativity', 'Social media'],
    cover: '/images/granier-cover.jpg',
    images: [],
    videoUrl: '',
    color: '#e8f0e5',
  },
]
