import type { SiteContent } from '../data/defaultSiteContent'

export type LanguageCode = 'fr' | 'en'

const STORAGE_KEY = 'instories.language'
const EVENT_NAME = 'instories:language-change'
const CUSTOM_DICT_KEY = 'instories.custom-dict.en.v1'
let customDictCache: Record<string, string> | null = null

const DICT: Record<string, string> = {
  'Accueil': 'Home',
  'accueil': 'home',
  'Projets': 'Projects',
  'projets': 'projects',
  'Projet': 'Project',
  'projet': 'project',
  'Nouveau': 'New',
  'Nouveau client': 'New client',
  'Nouveau projet': 'New project',
  'Nouveau réseau': 'New social network',
  'Services': 'Services',
  'Contact': 'Contact',
  'Menu': 'Menu',
  'Aperçu visuel': 'Visual preview',
  'Voir Instagram →': 'View Instagram →',
  'Voir': 'View',
  'sur Instagram': 'on Instagram',
  'Suivez @instories_ai': 'Follow @instories_ai',
  '@instories_ai — feed': '@instories_ai — feed',
  'Stories & direction artistique': 'Stories & art direction',
  'Créativité IA & luxe': 'AI creativity & luxury',
  'Traduire': 'Translate',
  'traduire': 'translate',
  'Traduction en cours...': 'Translation in progress...',
  'Aucune traduction manquante.': 'No missing translations.',
  'Disponible': 'Available',
  'disponible': 'available',
  'références': 'references',
  'Références': 'References',
  'années': 'years',
  'Années': 'Years',
  'marques': 'brands',
  'Marques': 'Brands',
  'Agence': 'Agency',
  'agence': 'agency',
  'agences': 'agencies',
  'Agences': 'Agencies',
  'Téléphone': 'Phone',
  'Réseaux': 'Socials',
  'Studio': 'Studio',
  'Réglages': 'Settings',
  'réglages': 'settings',
  'Projet introuvable': 'Project not found',
  'Retour': 'Back',
  'Visuel à venir': 'Visual coming soon',
  'Livrables': 'Deliverables',
  'Avec': 'With',
  'Film': 'Film',
  'Projet suivant': 'Next project',
  'Travaillons ensemble': "Let's work together",
  "À propos": 'About',
  "Parlez-moi de votre projet, et créons ensemble quelque chose de remarquable.": 'Tell me about your project, and let us create something remarkable together.',
  'Direction artistique': 'Art direction',
  'Directeur artistique': 'Art Director',
  'Réseaux sociaux': 'Social media',
  'Design web': 'Web design',
  'Créativité IA': 'AI Creativity',
  'Montage': 'Editing',
  'Série de contenus': 'Content series',
  'Visuels clés': 'Key visuals',
  'Brief créatif': 'Creative brief',
  'Direction artistique & IA au service des marques premium': 'Art direction & AI crafted for premium brands',
  'Direction artistique & IA au service des marques d’exception': 'Art direction & AI crafted for exceptional brands',
  "Direction artistique & IA au service des marques d'exception": 'Art direction & AI crafted for exceptional brands',
  'IA au service des marques premium': 'AI crafted for premium brands',
  'IA dédiée aux marques d’exception': 'AI crafted for exceptional brands',
  "IA dédiée aux marques d'exception": 'AI crafted for exceptional brands',
  'marques d’exception': 'exceptional brands',
  "marques d'exception": 'exceptional brands',
  'direction artistique': 'art direction',
  'créativité IA': 'AI creativity',
  "l'IA": 'AI',
  "L'IA": 'AI',
  "l’IA": 'AI',
  "L’IA": 'AI',
  'IA': 'AI',
  "Créons\nquelque chose\nd'exception.": "Let's create\nsomething\nremarkable.",
  'Directeur artistique · Créativité IA · Paris': 'Art Director · AI Creativity · Paris',
  '15+ années · Marques premium': '15+ years · Premium brands',
  'Direction artistique trail running': 'Trail running art direction',
  'Collaboration luxe montagne': 'Luxury alpine collaboration',
  'Naturalité & performance': 'Nature & performance',
  'Campagne trail running pour Salomon — une direction artistique brute, terreuse, en mouvement.':
    'Trail running campaign for Salomon — raw, earthy, in-motion art direction.',
  'Positionner Salomon comme la marque du futur du trail. Énergie, performance, authenticité.':
    'Position Salomon as the future trail brand. Energy, performance, authenticity.',
  'Direction artistique pour le lancement de Crema Nera — luxe, matière, lumière.':
    'Art direction for the launch of Crema Nera — luxury, materiality, light.',
  "Sublimer le produit dans toute sa complexité. Montrer la formule, la texture, l'élégance Armani.":
    'Elevate the product in all its complexity. Show formula, texture, Armani elegance.',
  'Collaboration entre Nespresso et Fusalp — luxe alpin, café et performance.':
    'Collaboration between Nespresso and Fusalp — alpine luxury, coffee, and performance.',
  "Fusionner deux univers premium en une identité visuelle commune cohérente et désirable.":
    'Merge two premium worlds into one cohesive, desirable visual identity.',
  "Campagne 360° pour l'Advanced Night Repair — digital, OOH, social.":
    '360° campaign for Advanced Night Repair — digital, OOH, social.',
  "Moderniser l'iconique sérum ANR pour une audience digitale-first tout en préservant l'ADN luxe.":
    'Modernize the iconic ANR serum for a digital-first audience while preserving the luxury DNA.',
  'Refonte de la communication sociale de la gamme Ultra Doux — naturel, inclusif, moderne.':
    'Revamp of Ultra Doux social communication — natural, inclusive, modern.',
  'Rajeunir la marque Garnier Ultra Doux sur les réseaux sociaux sans perdre son territoire naturel.':
    'Rejuvenate Garnier Ultra Doux on social media without losing its natural territory.',
  "Pour les marques premium qui veulent une direction artistique singulière, nourrie par 15 ans d'expérience et l'IA comme outil créatif.":
    'For premium brands seeking distinctive art direction, shaped by 15 years of experience and AI as a creative medium.',
  "Pour les marques premium qui veulent une direction artistique singulière, nourrie par 15 ans d’expérience et l’IA comme outil créatif.":
    'For premium brands seeking distinctive art direction, shaped by 15 years of experience and AI as a creative medium.',
  'marques premium': 'premium brands',
  'Marques premium': 'Premium brands',
  '"Concevoir des récits visuels\npour les marques de luxe."': '"Crafting pipeline narratives\n& visuals for luxury brands."',
  'Crème légère remodelante': 'The remodeling sheer cream',
  'Pour une peau sublime, le timing est essentiel': 'For beautiful skin, timing is everything',
  'Booster quotidien & crème': 'Daily Booster & Cream',
  'Exploration produit pilotée par l’IA — textures liquides & minérales': 'AI-driven product exploration — liquid & mineral textures',
  "Exploration produit pilotée par l'IA — textures liquides & minérales": 'AI-driven product exploration — liquid & mineral textures',
  'Direction créative & exploration visuelle pilotée par l’IA pour les produits de beauté':
    'Creative direction & AI-driven visual exploration for beauty products',
  "Direction créative & exploration visuelle pilotée par l'IA pour les produits de beauté":
    'Creative direction & AI-driven visual exploration for beauty products',
  'expériences digitales': 'digital experiences',
  'publication': 'post',
  'publications': 'posts',
  'flux': 'feed',
  'Flux': 'Feed',
  'Admin contenu': 'Content admin',
  'Studio contenu': 'Content studio',
  'InStories Studio Contenu': 'InStories Content Studio',
  'Interface locale de gestion des contenus InStories.': 'Local interface to manage InStories content.',
  'Alimente le site, organise les contenus, et sauvegarde localement dans ce navigateur.': 'Feed the site, organize content, and save locally in this browser.',
  'En-tête, services, CTA': 'Hero, services, CTA',
  'Variantes et manifeste': 'Variants and manifesto',
  'Coordonnées et réseaux': 'Contact details and socials',
  'Portfolio et détails': 'Portfolio and details',
  'Pied de page et sauvegarde': 'Footer and save',
  'Sauvegarde locale active': 'Local save active',
  'Sauvegardé localement à': 'Saved locally at',
  'projet(s) publié(s)': 'published project(s)',
  'Ouvrir le site': 'Open website',
  'En-tête': 'Hero',
  'Sections Accueil': 'Home sections',
  'Ligne 1': 'Line 1',
  'Ligne 2': 'Line 2',
  'Signature': 'Tagline',
  'Ligne de localisation': 'Location line',
  'Titre projets': 'Projects title',
  'Titre services': 'Services title',
  'Intro services': 'Services intro',
  'Eyebrow à propos': 'About eyebrow',
  'Citation à propos': 'About quote',
  'Label bouton à propos': 'About button label',
  'Texte bouton contact': 'Contact button text',
  'Titre grand CTA': 'Main CTA title',
  'Posts Instagram (une URL de publication/reel par ligne)': 'Instagram posts (one post/reel URL per line)',
  'Automatique: le site tente les 6 derniers posts Instagram. Ce champ sert de secours manuel si le flux auto échoue.': 'Automatic: the site tries the latest 6 Instagram posts. This field is a manual fallback if the auto feed fails.',
  'Liste des services': 'Services list',
  'Service': 'Service',
  'Description': 'Description',
  'Description service': 'Service description',
  'Nouveau service': 'New service',
  'Ajouter un service': 'Add a service',
  'Direction éditoriale': 'Editorial direction',
  'Variante par défaut': 'Default variant',
  'Nom affiché': 'Displayed name',
  'Ligne rôle': 'Role line',
  'Label fond sombre': 'Dark background label',
  'Intro variante B': 'Variant B intro',
  'Citation manifeste': 'Manifest quote',
  'Compétences, stats, agences': 'Skills, stats, agencies',
  'Compétences (séparées par des virgules)': 'Skills (comma-separated)',
  'Agences (séparées par des virgules)': 'Agencies (comma-separated)',
  'Valeur': 'Value',
  'Label': 'Label',
  'Ajouter une stat': 'Add a stat',
  'Titre CTA': 'CTA title',
  'Label CTA': 'CTA label',
  'Coordonnées': 'Contact details',
  'Titre': 'Title',
  'Adresse (une ligne par entrée)': 'Address (one line per entry)',
  'Disponibilité et réseaux': 'Availability and socials',
  'Badge disponibilité': 'Availability badge',
  'Texte disponibilité': 'Availability text',
  'Nom': 'Name',
  'URL': 'URL',
  'Supprimer': 'Delete',
  'Ajouter un lien': 'Add link',
  'Image de couverture importée en local, compressée et persistée.': 'Cover image imported locally, compressed, and persisted.',
  'Image de couverture importée en local (URL temporaire).': 'Cover image imported locally (temporary URL).',
  'Images galerie importées, compressées et persistées.': 'Gallery images imported, compressed, and persisted.',
  'Vidéo(s) importée(s) en local (persistées pour ce navigateur).': 'Video(s) imported locally (persisted for this browser).',
  'Vidéo trop lourde': 'Video too large',
  'Maximum': 'Maximum',
  'par fichier': 'per file',
  'Import partiel': 'Partial import',
  'vidéo(s) ignorée(s)': 'video(s) ignored',
  'Liste des projets': 'Projects list',
  'Publié': 'Published',
  'Brouillon': 'Draft',
  'Ajouter un projet': 'Add project',
  'Édition du projet': 'Project editor',
  'Statut': 'Status',
  'Ordre': 'Order',
  'Lien': 'Link',
  'Client': 'Client',
  'Slug': 'Slug',
  'Année': 'Year',
  'Couleur de fond': 'Background color',
  'Catégories (séparées par des virgules)': 'Categories (comma-separated)',
  'Livrables (séparés par des virgules)': 'Deliverables (comma-separated)',
  'Outils (séparés par des virgules)': 'Tools (comma-separated)',
  'Utilise des': 'Use',
  'liens directs': 'direct links',
  'Utilise des liens directs d’images (CDN/Cloudinary/asset public). Évite les liens de pages.':
    'Use direct image links (CDN/Cloudinary/public asset). Avoid page links.',
  'Formats recommandés: AVIF ou WebP (priorité), puis JPG/PNG. Taille conseillée: couverture 2200px de large max, galerie 1800px max.':
    'Recommended formats: AVIF or WebP (priority), then JPG/PNG. Recommended size: cover max 2200px wide, gallery max 1800px.',
  'Bloc images': 'Image block',
  'Blocs image': 'Image blocks',
  'Ajouter un bloc image': 'Add image block',
  'Supprimer le bloc image': 'Delete image block',
  'Bloc': 'Block',
  'Bloc vidéos': 'Video block',
  'Vidéo': 'Video',
  'élément(s)': 'item(s)',
  'Aucun aperçu image pour l’instant.': 'No image preview yet.',
  "Aucun aperçu image pour l'instant.": 'No image preview yet.',
  'Aucun aperçu vidéo pour l’instant.': 'No video preview yet.',
  "Aucun aperçu vidéo pour l'instant.": 'No video preview yet.',
  'Formats recommandés': 'Recommended formats',
  'Taille conseillée': 'Recommended size',
  'Liens utiles': 'Useful links',
  'Mettre en couverture': 'Set as cover',
  'Image de couverture': 'Cover image',
  'Format image': 'Image format',
  'Placement vidéo': 'Video placement',
  'Autoplay': 'Autoplay',
  'Autoplay par défaut (nouvelles vidéos)': 'Default autoplay (new videos)',
  'Déplacer avant': 'Move earlier',
  'Déplacer après': 'Move later',
  'Ajouter un visuel': 'Add visual',
  'Ajouter via URL': 'Add via URL',
  'Ajouter une vidéo': 'Add video',
  'URL image de couverture': 'Cover image URL',
  'Téléverser une image de couverture': 'Upload cover image',
  'Zone visible du header (couverture)': 'Visible header area (cover)',
  'Ajoute une image de couverture pour choisir le cadrage.': 'Add a cover image to choose framing.',
  'Position horizontale': 'Horizontal position',
  'Position verticale': 'Vertical position',
  'Images du projet': 'Project images',
  'Aucune image. Ajoute une URL ou téléverse des images.': 'No image. Add a URL or upload images.',
  'Aucune image valide détectée.': 'No valid image detected.',
  'Déposer les images': 'Drop images',
  'Ajouter une ligne image': 'Add image row',
  'Vidéos du projet': 'Project videos',
  'Pleine largeur': 'Full width',
  'Alignée gauche': 'Left aligned',
  'Alignée droite': 'Right aligned',
  'Grille 2 colonnes': '2-column grid',
  'Grille auto (2/3 colonnes)': 'Auto grid (2/3 columns)',
  'Aucune vidéo. Ajoute une URL ou téléverse une vidéo.': 'No video. Add a URL or upload a video.',
  'Aucune vidéo valide détectée.': 'No valid video detected.',
  'Déposer les vidéos': 'Drop videos',
  'Ajouter une ligne vidéo': 'Add video row',
  'Téléverser une vidéo': 'Upload video',
  'Format vidéo': 'Video format',
  'Cinéma (16:9)': 'Cinema (16:9)',
  'Portrait (4:5)': 'Portrait (4:5)',
  'Carré (1:1)': 'Square (1:1)',
  'Format vertical (9:16)': 'Vertical format (9:16)',
  'Format original (auto)': 'Original format (auto)',
  'Format par défaut pour les nouvelles vidéos': 'Default format for new videos',
  'Lecture auto au chargement': 'Autoplay on load',
  'Lecture en boucle': 'Loop playback',
  "Le player est simplifié automatiquement: pas de son, pas de plein écran, pas d'options natives visibles.": 'The player is simplified automatically: no sound, no fullscreen, no native controls.',
  'URLs galerie (une URL par ligne)': 'Gallery URLs (one URL per line)',
  'Téléverser des images galerie': 'Upload gallery images',
  'Import local = image compressée + stockage persistant local. En production, privilégie un CDN (Cloudinary) pour garder URL publiques.': 'Local import = compressed image + persistent local storage. In production, prefer a CDN (Cloudinary) to keep public URLs.',
  'Si une image ou vidéo locale disparaît, le fichier local n’est plus disponible dans ce navigateur. Utilise une URL publique ou retéléverse.':
    'If a local image or video disappears, the local file is no longer available in this browser. Use a public URL or re-upload.',
  'Ajoute une accroche projet': 'Add a project tagline',
  'Aperçu couverture': 'Cover preview',
  'Supprimer ce projet': 'Delete this project',
  'Typographie des titres': 'Display typography',
  'Mode couleur du site': 'Site color mode',
  'Style du mode nuit': 'Night mode style',
  'Jour': 'Day',
  'Nuit': 'Night',
  'Élégant (safe)': 'Elegant (safe)',
  'Dramatique (bold)': 'Dramatic (bold)',
  'Police des gros titres': 'Display title font',
  'Épaisseur des titres': 'Title thickness',
  'Taille des titres': 'Title size',
  'Interlettrage': 'Letter spacing',
  'Intermots': 'Word spacing',
  'Interlignage': 'Line height',
  'Réglages fins des gros titres (menu inclus).': 'Fine-tune display titles (menu included).',
  'Graisse Roboto': 'Roboto weight',
  'Cette option s’applique quand la police Roboto est sélectionnée.': 'This option applies when Roboto font is selected.',
  "Cette option s'applique quand la police Roboto est sélectionnée.": 'This option applies when Roboto font is selected.',
  'Thin (100)': 'Thin (100)',
  'Light (300)': 'Light (300)',
  'Regular (400)': 'Regular (400)',
  'Medium (500)': 'Medium (500)',
  'Bold (700)': 'Bold (700)',
  'Black (900)': 'Black (900)',
  'Bodoni Moda (actuelle)': 'Bodoni Moda (current)',
  'Normal': 'Normal',
  'Majuscule': 'Uppercase',
  'Minuscule': 'Lowercase',
  'Aucune emphase': 'No emphasis',
  'Mot important en italic': 'Important word in italic',
  "Style d’emphase": 'Emphasis style',
  'Casse des titres': 'Title casing',
  "Style d'emphase": 'Emphasis style',
  'Visuels raffinés': 'Refined visuals',
  'Studio digital': 'Digital studio',
  'Pied de page': 'Footer',
  'Mentions': 'Legal',
  'Actions': 'Actions',
  'Relance PDF après projets': 'PDF reminder after projects',
  'KPI conversion (local)': 'Conversion KPI (local)',
  'CTA projet similaire': 'Similar project CTA',
  'CTA mini brief envoyé': 'Mini brief CTA sent',
  'Téléchargement PDF (popup projets)': 'PDF download (project popup)',
  'Téléchargement PDF (menu)': 'PDF download (menu)',
  'Total conversions': 'Total conversions',
  'Dernière mise à jour': 'Last update',
  'Aucune donnée pour le moment': 'No data yet',
  'Réinitialiser les KPI': 'Reset KPI',
  'Activer le bouton PDF après consultation de projets': 'Enable PDF button after project views',
  'Déclenchement après X projets': 'Trigger after X projects',
  'URL du PDF': 'PDF URL',
  'Titre du popup': 'Popup title',
  'Texte du bouton': 'Button text',
  'Texte court': 'Short text',
  'On vous envoie un PDF ?': 'Send you a PDF?',
  'Après quelques Projets vus, téléchargez un résumé clair pour garder InStories en tête.':
    'After a few viewed projects, download a clear summary to keep InStories top of mind.',
  'Télécharger le dossier PDF': 'Download the PDF deck',
  'Sauvegarder maintenant': 'Save now',
  'Exporter le contenu en JSON': 'Export content as JSON',
  'Importer un JSON de contenu': 'Import content JSON',
  'Publier vers le repo (Render)': 'Publish to repo (Render)',
  'Générer le dossier PDF': 'Generate portfolio PDF',
  'Génération PDF...': 'Generating PDF...',
  'Publication en cours...': 'Publishing...',
  'Génération du PDF': 'PDF generation',
  'Mise à jour du PDF public...': 'Updating public PDF...',
  'Publication prête. Le fichier source est à jour: commit + push pour Render.':
    'Publish snapshot ready. Source file updated: commit + push to Render.',
  'PDF généré avec mise en page + visuels des projets.': 'PDF generated with layout + project visuals.',
  'PDF généré et synchronisé pour le site publié.': 'PDF generated and synced for the published site.',
  'PDF généré localement, mais non synchronisé pour Render.': 'PDF generated locally, but not synced for Render.',
  'Erreur de synchronisation du PDF': 'PDF sync error',
  'Médias nettoyés': 'Media cleanup',
  'Médias': 'Media',
  'Préparation': 'Preparation',
  'Upload des médias': 'Media upload',
  'Génération du snapshot': 'Snapshot generation',
  'Écriture du contenu publié...': 'Writing published content...',
  'Publication prête': 'Publish ready',
  'Snapshot': 'Snapshot',
  'Terminé': 'Done',
  'Analyse du contenu local...': 'Analyzing local content...',
  'Aucun média local à migrer.': 'No local media to migrate.',
  'Fichiers traités': 'Processed files',
  'Commit + push vers GitHub pour déclencher le déploiement Render.':
    'Commit + push to GitHub to trigger Render deployment.',
  'Impossible de générer le PDF pour le moment.': 'Unable to generate PDF right now.',
  'Automatique (système)': 'Automatic (system)',
  'supprimé(s)': 'removed',
  'conservé(s)': 'kept',
  'Erreur de publication': 'Publish error',
  'Sauvegarde manuelle effectuée.': 'Manual save completed.',
  'JSON exporté. Les médias locaux ne sont pas inclus.': 'JSON exported. Local media files are not included.',
  'Contenu importé depuis le fichier JSON.': 'Content imported from JSON file.',
  'Contenu JSON importé. Vérifie les médias locaux (ils dépendent de ce navigateur).':
    'JSON content imported. Check local media (they depend on this browser).',
  'Import JSON annulé: fichier invalide.': 'JSON import cancelled: invalid file.',
  'Impossible de sauvegarder localement. Vérifie l’espace navigateur ou le mode privé.': 'Unable to save locally. Check browser storage or private mode.',
  'Recharger depuis le local': 'Reload from local',
  'Restaurer le contenu par défaut': 'Restore default content',
  'Effacer le contenu local': 'Clear local content',
  'Contenu relu depuis le stockage local': 'Content reloaded from local storage',
  'Contenu réinitialisé aux valeurs par défaut': 'Content reset to default values',
  'Contenu local effacé': 'Local content cleared',
  'Traduire les nouveaux textes vers l’anglais (API)': 'Translate new text to English (API)',
  "Traduire les nouveaux textes vers l'anglais (API)": 'Translate new text to English (API)',
  'Traduire les nouveaux textes vers le français (API)': 'Translate new text to French (API)',
  'Traduction EN en cours...': 'EN translation in progress...',
  'Traduction FR en cours...': 'FR translation in progress...',
  'Aucun nouveau texte à traduire.': 'No new text to translate.',
  'Traduction EN terminée et mémorisée.': 'EN translation completed and saved.',
  'Traduction FR terminée et mémorisée.': 'FR translation completed and saved.',
  'Erreur de traduction EN': 'EN translation error',
  'Erreur de traduction FR': 'FR translation error',
  'Erreur de traduction': 'Translation error',
  'Clé API OpenAI manquante. Ajoute OPENAI_API_KEY dans .env.local puis redémarre le serveur.':
    'Missing OpenAI API key. Add OPENAI_API_KEY in .env.local then restart the server.',
  'Passe en FR avant de lancer la traduction automatique EN.': 'Switch to FR before running automatic EN translation.',
}

const FR_POLISH: Record<string, string> = {
  'AI crafted for premium marques': 'IA au service des marques premium',
  'AI crafted for premium brands': 'IA au service des marques premium',
  'brands premium': 'marques premium',
  'premium marques': 'marques premium',
  'Gen Ai': 'Créativité IA',
  'gen ai': 'créativité IA',
  'Socials sociaux': 'Réseaux sociaux',
  'socials sociaux': 'réseaux sociaux',
  'key visuals': 'visuels clés',
  'Key visuals': 'Visuels clés',
  'social media': 'réseaux sociaux',
  'Social media': 'Réseaux sociaux',
  'Art direction': 'Direction artistique',
  'Web design': 'Design web',
  'AI Creativity': 'Créativité IA',
  'Editing': 'Montage',
}

const EN_POLISH: Record<string, string> = {
  "AI dédiée aux brands d’exception": 'AI crafted for exceptional brands',
  "AI dédiée aux brands d'exception": 'AI crafted for exceptional brands',
  "AI dedicated to brands d’exception": 'AI crafted for exceptional brands',
  "AI dedicated to brands d'exception": 'AI crafted for exceptional brands',
  "AI for brands d’exception": 'AI for exceptional brands',
  "AI for brands d'exception": 'AI for exceptional brands',
  'brands d’exception': 'exceptional brands',
  "brands d'exception": 'exceptional brands',
  'brands premium': 'premium brands',
  'Direction artistique': 'Art direction',
  'Direction Artistique': 'Art direction',
  'DIRECTION ARTISTIQUE': 'ART DIRECTION',
  'direction Artistique': 'art direction',
  'Artistic direction': 'Art direction',
  'Artistic Direction': 'Art direction',
  'ARTISTIC DIRECTION': 'ART DIRECTION',
  'Créativité IA': 'AI creativity',
  'Réseaux sociaux': 'Social media',
}

const REVERSE_DICT: Record<string, string> = Object.entries(DICT).reduce<Record<string, string>>((acc, [fr, en]) => {
  if (!acc[en]) {
    acc[en] = fr
  }
  return acc
}, {})

const UI: Record<string, { fr: string; en: string }> = {
  'nav.projects': { fr: 'Projets', en: 'Projects' },
  'nav.services': { fr: 'Services', en: 'Services' },
  'nav.about': { fr: 'À propos', en: 'About' },
  'nav.contact': { fr: 'Contact', en: 'Contact' },
  'ui.references': { fr: 'références', en: 'references' },
  'ui.instagram.lastPosts': { fr: '@instories_ai — 6 dernières publications', en: '@instories_ai — latest 6 posts' },
  'ui.instagram.preview': { fr: '@instories_ai — aperçu du flux', en: '@instories_ai — feed preview' },
  'ui.instagram.addUrls': { fr: '@instories_ai — ajoute des URLs de publications dans /content', en: '@instories_ai — add post URLs in /content' },
  'contact.email': { fr: 'Email', en: 'Email' },
  'contact.phone': { fr: 'Téléphone', en: 'Phone' },
  'contact.studio': { fr: 'Studio', en: 'Studio' },
  'contact.socials': { fr: 'Réseaux', en: 'Socials' },
  'project.notFound': { fr: 'Projet introuvable', en: 'Project not found' },
  'project.back': { fr: 'Retour', en: 'Back' },
  'project.visualPending': { fr: 'Visuel à venir', en: 'Visual coming soon' },
  'project.section.project': { fr: 'Projet', en: 'Project' },
  'project.section.brief': { fr: 'Brief créatif', en: 'Creative brief' },
  'project.section.deliverables': { fr: 'Livrables', en: 'Deliverables' },
  'project.section.with': { fr: 'Avec', en: 'With' },
  'project.section.film': { fr: 'Film', en: 'Film' },
  'project.next': { fr: 'Projet suivant', en: 'Next project' },
  'project.cta.similar': { fr: 'Je veux un projet similaire', en: 'I want a similar project' },
  'project.cta.note': { fr: 'Décris ton besoin en 2 lignes et on te répond rapidement.', en: 'Describe your need in 2 lines and we will reply quickly.' },
  'project.cta.brief.title': { fr: 'Mini brief', en: 'Mini brief' },
  'project.cta.brief.need': { fr: 'Besoin', en: 'Need' },
  'project.cta.brief.budget': { fr: 'Budget', en: 'Budget' },
  'project.cta.brief.timeline': { fr: 'Délai', en: 'Timeline' },
  'project.cta.brief.send': { fr: 'Envoyer la demande', en: 'Send request' },
  'project.cta.brief.close': { fr: 'Fermer', en: 'Close' },
  'project.cta.brief.needPlaceholder': { fr: 'Ex: campagne social + 6 visuels + 1 reel', en: 'Ex: social campaign + 6 visuals + 1 reel' },
  'project.cta.brief.budget.tbd': { fr: 'À définir', en: 'To define' },
  'project.cta.brief.budget.1': { fr: '< 2k€', en: '< €2k' },
  'project.cta.brief.budget.2': { fr: '2k€ - 5k€', en: '€2k - €5k' },
  'project.cta.brief.budget.3': { fr: '5k€ - 10k€', en: '€5k - €10k' },
  'project.cta.brief.budget.4': { fr: '10k€+', en: '€10k+' },
  'project.cta.brief.timeline.1': { fr: 'Urgent (1-2 semaines)', en: 'Urgent (1-2 weeks)' },
  'project.cta.brief.timeline.2': { fr: 'Ce mois-ci', en: 'This month' },
  'project.cta.brief.timeline.3': { fr: '1-2 mois', en: '1-2 months' },
  'project.cta.brief.timeline.4': { fr: 'Flexible', en: 'Flexible' },
}

export function getStoredLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'fr'
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value === 'en' ? 'en' : 'fr'
}

export function setStoredLanguage(lang: LanguageCode) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, lang)
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: lang }))
}

export function listenLanguageChange(listener: (lang: LanguageCode) => void) {
  if (typeof window === 'undefined') return () => {}
  const onEvent = (event: Event) => {
    const detail = (event as CustomEvent<LanguageCode>).detail
    listener(detail === 'en' ? 'en' : 'fr')
  }
  window.addEventListener(EVENT_NAME, onEvent)
  return () => window.removeEventListener(EVENT_NAME, onEvent)
}

function normalizeDictValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function getCustomEnDict(): Record<string, string> {
  if (customDictCache) return customDictCache
  if (typeof window === 'undefined') {
    customDictCache = {}
    return customDictCache
  }

  try {
    const raw = window.localStorage.getItem(CUSTOM_DICT_KEY)
    if (!raw) {
      customDictCache = {}
      return customDictCache
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const next: Record<string, string> = {}
    Object.entries(parsed).forEach(([source, target]) => {
      const key = normalizeDictValue(source)
      const value = normalizeDictValue(target)
      if (!key || !value) return
      next[key] = value
    })
    customDictCache = next
    return customDictCache
  } catch {
    customDictCache = {}
    return customDictCache
  }
}

function getCustomFrDict(): Record<string, string> {
  const customEn = getCustomEnDict()
  const reversed: Record<string, string> = {}
  Object.entries(customEn).forEach(([fr, en]) => {
    if (!reversed[en]) reversed[en] = fr
  })
  return reversed
}

export function addCustomTranslations(pairs: Record<string, string>) {
  const current = getCustomEnDict()
  const next: Record<string, string> = { ...current }
  let changed = false

  Object.entries(pairs).forEach(([source, target]) => {
    const sourceValue = normalizeDictValue(source)
    const targetValue = normalizeDictValue(target)
    if (!sourceValue || !targetValue) return
    if (next[sourceValue] === targetValue) return
    next[sourceValue] = targetValue
    changed = true
  })

  if (!changed || typeof window === 'undefined') return

  customDictCache = next
  window.localStorage.setItem(CUSTOM_DICT_KEY, JSON.stringify(next))
  const currentLang = getStoredLanguage()
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: currentLang }))
}

function preserveCase(source: string, target: string): string {
  if (source.toUpperCase() === source) return target.toUpperCase()
  if (source[0] && source[0] === source[0].toUpperCase()) {
    return target.charAt(0).toUpperCase() + target.slice(1)
  }
  return target
}

const LETTER_CLASS = 'A-Za-zÀ-ÖØ-öø-ÿ'

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildPattern(source: string): RegExp {
  const escaped = escapeRegex(source).replace(/['’]/g, "['’]")
  const startsWithLetter = /^[A-Za-zÀ-ÖØ-öø-ÿ]/.test(source)
  const endsWithLetter = /[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(source)
  const prefix = startsWithLetter ? `(?<![${LETTER_CLASS}])` : ''
  const suffix = endsWithLetter ? `(?![${LETTER_CLASS}])` : ''
  return new RegExp(`${prefix}${escaped}${suffix}`, 'gi')
}

function applyDictionary(input: string, dict: Record<string, string>): string {
  const entries = Object.entries(dict).sort((a, b) => b[0].length - a[0].length)
  return entries.reduce((acc, [source, target]) => {
    const pattern = buildPattern(source)
    return acc.replace(pattern, match => preserveCase(match, target))
  }, input)
}

function enforceArtDirectionRule(input: string, lang: LanguageCode): string {
  if (lang !== 'en') return input
  let output = input
  output = output.replace(/direction\s+artistique/gi, match => preserveCase(match, 'Art direction'))
  output = output.replace(/artistic\s+direction/gi, match => preserveCase(match, 'Art direction'))
  return output
}

const TECHNICAL_LITERALS = new Set([
  'draft',
  'published',
  'system',
  'light',
  'night',
  'safe',
  'bold',
  'day',
  'default',
  'uppercase',
  'lowercase',
  'none',
  'important-italic',
  'bodoni',
  'gloock',
  'cormorant',
  'roboto',
  'a',
  'b',
  'c',
  'native',
  'embed',
  'full',
  'left',
  'right',
  'grid',
  '16 / 9',
  '4 / 5',
  '1 / 1',
  '9 / 16',
  'original',
])

export function autoTranslateText(value: string, lang: LanguageCode = 'en'): string {
  const text = value.trim()
  if (!text) return value
  if (TECHNICAL_LITERALS.has(text.toLowerCase())) return value
  if (/https?:\/\//i.test(text) || /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) {
    return value
  }

  const dict = lang === 'en'
    ? { ...DICT, ...getCustomEnDict() }
    : { ...REVERSE_DICT, ...getCustomFrDict() }
  let output = applyDictionary(value, dict)

  if (lang === 'fr') {
    output = applyDictionary(output, FR_POLISH)
  }
  if (lang === 'en') {
    output = applyDictionary(output, EN_POLISH)
  }
  return enforceArtDirectionRule(output, lang)
}

const NON_TRANSLATABLE_KEYS = new Set([
  'id',
  'status',
  'order',
  'year',
  'cover',
  'imageBlocks',
  'images',
  'imageAspectRatios',
  'videoUrl',
  'videoUrls',
  'videoAspectRatios',
  'videoAutoplay',
  'videoPlacements',
  'coverFocalPoint',
  'displayFont',
  'displayProfiles',
  'displayWeight',
  'displaySize',
  'displayLetterSpacing',
  'displayWordSpacing',
  'displayLineHeight',
  'displayCase',
  'displayEmphasis',
  'isEnabled',
  'triggerProjectViews',
  'pdfUrl',
  'colorModePreference',
  'colorMode',
  'nightStyle',
  'defaultVariant',
  'mode',
  'aspectRatio',
  'color',
  'href',
  'email',
  'phone',
  'autoplay',
  'minimal',
  'muted',
  'loop',
  'x',
  'y',
])

function isProjectTitlePath(path: Array<string | number>): boolean {
  return path.length >= 3
    && path[0] === 'projects'
    && typeof path[1] === 'number'
    && path[2] === 'title'
}

function translateUnknown(value: unknown, lang: LanguageCode, path: Array<string | number> = []): unknown {
  if (typeof value === 'string') {
    if (isProjectTitlePath(path)) return value
    const lastKey = path[path.length - 1]
    if (typeof lastKey === 'string' && NON_TRANSLATABLE_KEYS.has(lastKey)) return value
    return autoTranslateText(value, lang)
  }
  if (Array.isArray(value)) return value.map((item, index) => translateUnknown(item, lang, [...path, index]))
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {}
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      next[key] = translateUnknown(val, lang, [...path, key])
    })
    return next
  }
  return value
}

function polishLocalizedContent(content: SiteContent, lang: LanguageCode): SiteContent {
  const next: SiteContent = {
    ...content,
    home: { ...content.home },
  }

  const line1 = next.home.heroLine1.trim().toLowerCase()
  const line2 = next.home.heroLine2.trim().toLowerCase()

  if (
    lang === 'en'
    && (
      (line1 === 'direction' && (line2 === 'artistique' || line2 === 'artistic'))
      || ((line1 === 'artistique' || line1 === 'artistic') && line2 === 'direction')
    )
  ) {
    next.home.heroLine1 = 'Art'
    next.home.heroLine2 = 'Direction'
  }

  if (lang === 'fr' && line1 === 'art' && line2 === 'direction') {
    next.home.heroLine1 = 'Direction'
    next.home.heroLine2 = 'Artistique'
  }

  return next
}

export function localizeSiteContent(content: SiteContent, lang: LanguageCode): SiteContent {
  const translated = translateUnknown(content, lang) as SiteContent
  return polishLocalizedContent(translated, lang)
}

export function t(lang: LanguageCode, key: string): string {
  const entry = UI[key]
  if (!entry) return key
  return entry[lang]
}
