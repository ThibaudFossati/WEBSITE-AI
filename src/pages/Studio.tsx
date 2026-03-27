import { useEffect, useMemo, useState } from 'react'
import type { Project } from '../data/projects'
import { type SiteContent, type SocialLink } from '../data/defaultSiteContent'
import { cloneDefaultSiteContent, loadSiteContent, resetSiteContent, saveSiteContent } from '../lib/siteContent'

type StudioSection = 'home' | 'about' | 'contact' | 'projects' | 'settings'

const sections: { id: StudioSection; label: string; desc: string }[] = [
  { id: 'home', label: 'Accueil', desc: 'Hero, services, CTA' },
  { id: 'about', label: 'About', desc: 'Variantes et manifeste' },
  { id: 'contact', label: 'Contact', desc: 'Coordonnées et réseaux' },
  { id: 'projects', label: 'Projets', desc: 'Portfolio et détails' },
  { id: 'settings', label: 'Réglages', desc: 'Footer et sauvegarde' },
]

const createEmptyProject = (): Project => ({
  id: `project-${Date.now()}`,
  client: 'Nouveau client',
  title: 'Nouveau projet',
  tagline: '',
  category: ['Art direction'],
  year: new Date().getFullYear().toString(),
  agencies: ['Agence'],
  description: '',
  brief: '',
  deliverables: [''],
  tools: [''],
  cover: '',
  images: [],
  color: '#f3efe7',
})

function StudioInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, ...rest } = props
  return (
    <label className="studio-field">
      <span>{label}</span>
      <input {...rest} />
    </label>
  )
}

function StudioTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, ...rest } = props
  return (
    <label className="studio-field">
      <span>{label}</span>
      <textarea {...rest} />
    </label>
  )
}

function StudioCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="studio-card">
      <div className="studio-card-head">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function SocialLinksEditor({
  links,
  onChange,
}: {
  links: SocialLink[]
  onChange: (next: SocialLink[]) => void
}) {
  return (
    <div className="studio-stack">
      {links.map((link, index) => (
        <div key={`${link.label}-${index}`} className="studio-inline-grid">
          <StudioInput
            label="Nom"
            value={link.label}
            onChange={e => {
              const next = [...links]
              next[index] = { ...link, label: e.target.value }
              onChange(next)
            }}
          />
          <StudioInput
            label="URL"
            value={link.href}
            onChange={e => {
              const next = [...links]
              next[index] = { ...link, href: e.target.value }
              onChange(next)
            }}
          />
          <button
            type="button"
            className="studio-remove"
            onClick={() => onChange(links.filter((_, i) => i !== index))}
          >
            Supprimer
          </button>
        </div>
      ))}
      <button
        type="button"
        className="studio-secondary"
        onClick={() => onChange([...links, { label: 'Nouveau réseau', href: 'https://' }])}
      >
        Ajouter un lien
      </button>
    </div>
  )
}

export default function Studio() {
  const [section, setSection] = useState<StudioSection>('home')
  const [content, setContent] = useState<SiteContent>(() => loadSiteContent())
  const [selectedProjectId, setSelectedProjectId] = useState(content.projects[0]?.id ?? '')
  const [saveLabel, setSaveLabel] = useState('Sauvegarde locale active')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    saveSiteContent(content)
    setSaveLabel(`Sauvegardé localement à ${new Date().toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`)
  }, [content])

  useEffect(() => {
    if (!content.projects.some(project => project.id === selectedProjectId)) {
      setSelectedProjectId(content.projects[0]?.id ?? '')
    }
  }, [content.projects, selectedProjectId])

  const selectedProject = useMemo(
    () => content.projects.find(project => project.id === selectedProjectId) ?? content.projects[0],
    [content.projects, selectedProjectId]
  )

  const setProject = (updater: (project: Project) => Project) => {
    if (!selectedProject) return
    setContent(current => ({
      ...current,
      projects: current.projects.map(project => (
        project.id === selectedProject.id ? updater(project) : project
      )),
    }))
  }

  return (
    <main className="studio-shell">
      <aside className="studio-sidebar">
        <div>
          <p className="studio-kicker">Studio local</p>
          <h1>InStories Content Studio</h1>
          <p className="studio-muted">
            Édite les pages en direct, sauvegardées dans ce navigateur uniquement.
          </p>
        </div>

        <nav className="studio-nav">
          {sections.map(item => (
            <button
              key={item.id}
              type="button"
              className={`studio-nav-item${section === item.id ? ' active' : ''}`}
              onClick={() => setSection(item.id)}
            >
              <strong>{item.label}</strong>
              <span>{item.desc}</span>
            </button>
          ))}
        </nav>

        <div className="studio-sidebar-footer">
          <p>{saveLabel}</p>
          <a href="/" className="studio-link">
            Ouvrir le site
          </a>
        </div>
      </aside>

      <section className="studio-main">
        {section === 'home' && (
          <>
            <StudioCard title="Hero">
              <div className="studio-grid">
                <StudioInput
                  label="Ligne 1"
                  value={content.home.heroLine1}
                  onChange={e => setContent({ ...content, home: { ...content.home, heroLine1: e.target.value } })}
                />
                <StudioInput
                  label="Ligne 2"
                  value={content.home.heroLine2}
                  onChange={e => setContent({ ...content, home: { ...content.home, heroLine2: e.target.value } })}
                />
              </div>
              <StudioInput
                label="Tagline"
                value={content.home.heroTagline}
                onChange={e => setContent({ ...content, home: { ...content.home, heroTagline: e.target.value } })}
              />
              <StudioInput
                label="Ligne de localisation"
                value={content.home.heroLocation}
                onChange={e => setContent({ ...content, home: { ...content.home, heroLocation: e.target.value } })}
              />
            </StudioCard>

            <StudioCard title="Sections Home">
              <div className="studio-grid">
                <StudioInput
                  label="Titre projets"
                  value={content.home.projectsTitle}
                  onChange={e => setContent({ ...content, home: { ...content.home, projectsTitle: e.target.value } })}
                />
                <StudioInput
                  label="Titre services"
                  value={content.home.servicesTitle}
                  onChange={e => setContent({ ...content, home: { ...content.home, servicesTitle: e.target.value } })}
                />
              </div>
              <StudioTextarea
                label="Intro services"
                rows={4}
                value={content.home.servicesIntro}
                onChange={e => setContent({ ...content, home: { ...content.home, servicesIntro: e.target.value } })}
              />
              <StudioInput
                label="Eyebrow about"
                value={content.home.aboutEyebrow}
                onChange={e => setContent({ ...content, home: { ...content.home, aboutEyebrow: e.target.value } })}
              />
              <StudioTextarea
                label="Citation about"
                rows={3}
                value={content.home.aboutQuote}
                onChange={e => setContent({ ...content, home: { ...content.home, aboutQuote: e.target.value } })}
              />
              <div className="studio-grid">
                <StudioInput
                  label="Label bouton about"
                  value={content.home.aboutCtaLabel}
                  onChange={e => setContent({ ...content, home: { ...content.home, aboutCtaLabel: e.target.value } })}
                />
                <StudioInput
                  label="Bouton contact"
                  value={content.home.contactCtaButton}
                  onChange={e => setContent({ ...content, home: { ...content.home, contactCtaButton: e.target.value } })}
                />
              </div>
              <StudioTextarea
                label="Titre grand CTA"
                rows={3}
                value={content.home.contactCtaTitle}
                onChange={e => setContent({ ...content, home: { ...content.home, contactCtaTitle: e.target.value } })}
              />
            </StudioCard>

            <StudioCard title="Liste des services">
              <div className="studio-stack">
                {content.home.services.map((service, index) => (
                  <div key={`${service.name}-${index}`} className="studio-inline-grid">
                    <StudioInput
                      label="Service"
                      value={service.name}
                      onChange={e => {
                        const next = [...content.home.services]
                        next[index] = { ...service, name: e.target.value }
                        setContent({ ...content, home: { ...content.home, services: next } })
                      }}
                    />
                    <StudioInput
                      label="Description"
                      value={service.desc}
                      onChange={e => {
                        const next = [...content.home.services]
                        next[index] = { ...service, desc: e.target.value }
                        setContent({ ...content, home: { ...content.home, services: next } })
                      }}
                    />
                    <button
                      type="button"
                      className="studio-remove"
                      onClick={() => {
                        const next = content.home.services.filter((_, i) => i !== index)
                        setContent({ ...content, home: { ...content.home, services: next } })
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => {
                    setContent({
                      ...content,
                      home: {
                        ...content.home,
                        services: [...content.home.services, { name: 'Nouveau service', desc: 'Description' }],
                      },
                    })
                  }}
                >
                  Ajouter un service
                </button>
              </div>
            </StudioCard>
          </>
        )}

        {section === 'about' && (
          <>
            <StudioCard title="Direction éditoriale">
              <div className="studio-grid">
                <label className="studio-field">
                  <span>Variante par défaut</span>
                  <select
                    value={content.about.defaultVariant}
                    onChange={e => setContent({
                      ...content,
                      about: { ...content.about, defaultVariant: e.target.value as 'A' | 'B' | 'C' },
                    })}
                  >
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                </label>
                <StudioInput
                  label="Est."
                  value={content.about.estLabel}
                  onChange={e => setContent({ ...content, about: { ...content.about, estLabel: e.target.value } })}
                />
              </div>
              <StudioTextarea
                label="Nom affiché"
                rows={2}
                value={content.about.name}
                onChange={e => setContent({ ...content, about: { ...content.about, name: e.target.value } })}
              />
              <StudioInput
                label="Ligne rôle"
                value={content.about.roleLine}
                onChange={e => setContent({ ...content, about: { ...content.about, roleLine: e.target.value } })}
              />
              <StudioInput
                label="Label fond sombre"
                value={content.about.splitDarkLabel}
                onChange={e => setContent({ ...content, about: { ...content.about, splitDarkLabel: e.target.value } })}
              />
              <StudioTextarea
                label="Intro variante B"
                rows={4}
                value={content.about.splitIntro}
                onChange={e => setContent({ ...content, about: { ...content.about, splitIntro: e.target.value } })}
              />
              <StudioTextarea
                label="Citation manifeste"
                rows={3}
                value={content.about.manifestoQuote}
                onChange={e => setContent({ ...content, about: { ...content.about, manifestoQuote: e.target.value } })}
              />
            </StudioCard>

            <StudioCard title="Compétences, stats, agences">
              <StudioInput
                label="Compétences (séparées par des virgules)"
                value={content.about.skills.join(', ')}
                onChange={e => setContent({
                  ...content,
                  about: {
                    ...content.about,
                    skills: e.target.value.split(',').map(item => item.trim()).filter(Boolean),
                  },
                })}
              />
              <StudioInput
                label="Agences (séparées par des virgules)"
                value={content.about.agencies.join(', ')}
                onChange={e => setContent({
                  ...content,
                  about: {
                    ...content.about,
                    agencies: e.target.value.split(',').map(item => item.trim()).filter(Boolean),
                  },
                })}
              />
              <div className="studio-stack">
                {content.about.stats.map((stat, index) => (
                  <div key={`${stat.value}-${index}`} className="studio-inline-grid studio-inline-grid--stats">
                    <StudioInput
                      label="Valeur"
                      value={stat.value}
                      onChange={e => {
                        const next = [...content.about.stats]
                        next[index] = { ...stat, value: e.target.value }
                        setContent({ ...content, about: { ...content.about, stats: next } })
                      }}
                    />
                    <StudioInput
                      label="Label"
                      value={stat.label}
                      onChange={e => {
                        const next = [...content.about.stats]
                        next[index] = { ...stat, label: e.target.value }
                        setContent({ ...content, about: { ...content.about, stats: next } })
                      }}
                    />
                    <button
                      type="button"
                      className="studio-remove"
                      onClick={() => {
                        const next = content.about.stats.filter((_, i) => i !== index)
                        setContent({ ...content, about: { ...content.about, stats: next } })
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => {
                    setContent({
                      ...content,
                      about: {
                        ...content.about,
                        stats: [...content.about.stats, { value: '0', label: 'Nouveau' }],
                      },
                    })
                  }}
                >
                  Ajouter une stat
                </button>
              </div>
              <div className="studio-grid">
                <StudioInput
                  label="Titre CTA"
                  value={content.about.ctaTitle}
                  onChange={e => setContent({ ...content, about: { ...content.about, ctaTitle: e.target.value } })}
                />
                <StudioInput
                  label="Label CTA"
                  value={content.about.ctaLabel}
                  onChange={e => setContent({ ...content, about: { ...content.about, ctaLabel: e.target.value } })}
                />
              </div>
            </StudioCard>
          </>
        )}

        {section === 'contact' && (
          <>
            <StudioCard title="Coordonnées">
              <StudioInput
                label="Titre"
                value={content.contact.title}
                onChange={e => setContent({ ...content, contact: { ...content.contact, title: e.target.value } })}
              />
              <div className="studio-grid">
                <StudioInput
                  label="Email"
                  value={content.contact.email}
                  onChange={e => setContent({ ...content, contact: { ...content.contact, email: e.target.value } })}
                />
                <StudioInput
                  label="Téléphone"
                  value={content.contact.phone}
                  onChange={e => setContent({ ...content, contact: { ...content.contact, phone: e.target.value } })}
                />
              </div>
              <StudioTextarea
                label="Adresse (une ligne par entrée)"
                rows={3}
                value={content.contact.addressLines.join('\n')}
                onChange={e => setContent({
                  ...content,
                  contact: {
                    ...content.contact,
                    addressLines: e.target.value.split('\n').map(item => item.trim()).filter(Boolean),
                  },
                })}
              />
            </StudioCard>

            <StudioCard title="Disponibilité et réseaux">
              <StudioInput
                label="Badge disponibilité"
                value={content.contact.availabilityLabel}
                onChange={e => setContent({
                  ...content,
                  contact: { ...content.contact, availabilityLabel: e.target.value },
                })}
              />
              <StudioTextarea
                label="Texte disponibilité"
                rows={3}
                value={content.contact.availabilityText}
                onChange={e => setContent({
                  ...content,
                  contact: { ...content.contact, availabilityText: e.target.value },
                })}
              />
              <SocialLinksEditor
                links={content.contact.socials}
                onChange={next => setContent({ ...content, contact: { ...content.contact, socials: next } })}
              />
            </StudioCard>
          </>
        )}

        {section === 'projects' && (
          <div className="studio-projects-layout">
            <StudioCard title="Liste des projets">
              <div className="studio-project-list">
                {content.projects.map(project => (
                  <button
                    key={project.id}
                    type="button"
                    className={`studio-project-item${selectedProject?.id === project.id ? ' active' : ''}`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <strong>{project.client}</strong>
                    <span>{project.title}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="studio-secondary"
                onClick={() => {
                  const nextProject = createEmptyProject()
                  setContent({ ...content, projects: [...content.projects, nextProject] })
                  setSelectedProjectId(nextProject.id)
                }}
              >
                Ajouter un projet
              </button>
            </StudioCard>

            {selectedProject && (
              <StudioCard title="Édition du projet">
                <div className="studio-grid">
                  <StudioInput
                    label="Client"
                    value={selectedProject.client}
                    onChange={e => setProject(project => ({ ...project, client: e.target.value }))}
                  />
                  <StudioInput
                    label="Titre"
                    value={selectedProject.title}
                    onChange={e => setProject(project => ({ ...project, title: e.target.value }))}
                  />
                </div>
                <div className="studio-grid">
                  <StudioInput
                    label="Slug"
                    value={selectedProject.id}
                    onChange={e => setProject(project => ({ ...project, id: e.target.value }))}
                  />
                  <StudioInput
                    label="Année"
                    value={selectedProject.year}
                    onChange={e => setProject(project => ({ ...project, year: e.target.value }))}
                  />
                </div>
                <div className="studio-grid">
                  <StudioInput
                    label="Tagline"
                    value={selectedProject.tagline}
                    onChange={e => setProject(project => ({ ...project, tagline: e.target.value }))}
                  />
                  <StudioInput
                    label="Couleur de fond"
                    value={selectedProject.color}
                    onChange={e => setProject(project => ({ ...project, color: e.target.value }))}
                  />
                </div>
                <StudioInput
                  label="Catégories (séparées par des virgules)"
                  value={selectedProject.category.join(', ')}
                  onChange={e => setProject(project => ({
                    ...project,
                    category: e.target.value.split(',').map(item => item.trim()).filter(Boolean),
                  }))}
                />
                <StudioInput
                  label="Agences (séparées par des virgules)"
                  value={selectedProject.agencies.join(', ')}
                  onChange={e => setProject(project => ({
                    ...project,
                    agencies: e.target.value.split(',').map(item => item.trim()).filter(Boolean),
                  }))}
                />
                <StudioInput
                  label="Livrables (séparés par des virgules)"
                  value={selectedProject.deliverables.join(', ')}
                  onChange={e => setProject(project => ({
                    ...project,
                    deliverables: e.target.value.split(',').map(item => item.trim()).filter(Boolean),
                  }))}
                />
                <StudioInput
                  label="Outils (séparés par des virgules)"
                  value={selectedProject.tools.join(', ')}
                  onChange={e => setProject(project => ({
                    ...project,
                    tools: e.target.value.split(',').map(item => item.trim()).filter(Boolean),
                  }))}
                />
                <StudioInput
                  label="Cover image URL"
                  value={selectedProject.cover}
                  onChange={e => setProject(project => ({ ...project, cover: e.target.value }))}
                />
                <StudioTextarea
                  label="Gallery URLs (une URL par ligne)"
                  rows={4}
                  value={selectedProject.images.join('\n')}
                  onChange={e => setProject(project => ({
                    ...project,
                    images: e.target.value.split('\n').map(item => item.trim()).filter(Boolean),
                  }))}
                />
                <StudioTextarea
                  label="Description"
                  rows={4}
                  value={selectedProject.description}
                  onChange={e => setProject(project => ({ ...project, description: e.target.value }))}
                />
                <StudioTextarea
                  label="Brief"
                  rows={4}
                  value={selectedProject.brief}
                  onChange={e => setProject(project => ({ ...project, brief: e.target.value }))}
                />
                <button
                  type="button"
                  className="studio-danger"
                  onClick={() => {
                    setContent(current => ({
                      ...current,
                      projects: current.projects.filter(project => project.id !== selectedProject.id),
                    }))
                  }}
                >
                  Supprimer ce projet
                </button>
              </StudioCard>
            )}
          </div>
        )}

        {section === 'settings' && (
          <>
            <StudioCard title="Footer">
              <div className="studio-grid">
                <StudioInput
                  label="Copyright"
                  value={content.footer.copyright}
                  onChange={e => setContent({ ...content, footer: { ...content.footer, copyright: e.target.value } })}
                />
                <StudioInput
                  label="Mentions"
                  value={content.footer.registration}
                  onChange={e => setContent({ ...content, footer: { ...content.footer, registration: e.target.value } })}
                />
              </div>
              <SocialLinksEditor
                links={content.footer.socials}
                onChange={next => setContent({ ...content, footer: { ...content.footer, socials: next } })}
              />
            </StudioCard>

            <StudioCard title="Actions">
              <div className="studio-actions">
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => {
                    const latest = loadSiteContent()
                    setContent(latest)
                    setSaveLabel('Contenu relu depuis le stockage local')
                  }}
                >
                  Recharger depuis le local
                </button>
                <button
                  type="button"
                  className="studio-secondary"
                  onClick={() => {
                    const defaults = cloneDefaultSiteContent()
                    setContent(defaults)
                    saveSiteContent(defaults)
                    setSelectedProjectId(defaults.projects[0]?.id ?? '')
                    setSaveLabel('Contenu réinitialisé aux valeurs par défaut')
                  }}
                >
                  Restaurer les valeurs par défaut
                </button>
                <button
                  type="button"
                  className="studio-danger"
                  onClick={() => {
                    resetSiteContent()
                    const defaults = cloneDefaultSiteContent()
                    setContent(defaults)
                    setSelectedProjectId(defaults.projects[0]?.id ?? '')
                    setSaveLabel('Stockage local vidé')
                  }}
                >
                  Vider le stockage local
                </button>
              </div>
            </StudioCard>
          </>
        )}
      </section>
    </main>
  )
}
