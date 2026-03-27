import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import DisplayText from '../components/DisplayText'
import TextReveal from '../components/TextReveal'
import { useSiteContent } from '../hooks/useSiteContent'
import { getDisplayFontFamily } from '../lib/typography'

export default function Project() {
  const { id } = useParams<{ id: string }>()
  const content = useSiteContent()
  const { projects } = content
  const displayFont = getDisplayFontFamily(content.design.displayFont)
  const displayCase = content.design.displayCase
  const displayEmphasis = content.design.displayEmphasis
  const publishedProjects = projects
    .filter(project => project.status === 'published')
    .sort((a, b) => a.order - b.order)
  const project = publishedProjects.find(p => p.id === id)
  const projectIndex = publishedProjects.findIndex(p => p.id === id)
  const nextProject = projectIndex >= 0 ? publishedProjects[(projectIndex + 1) % publishedProjects.length] : null

  useEffect(() => { window.scrollTo(0, 0) }, [id])

  if (!project) {
    return (
      <main style={{ paddingTop: '120px', textAlign: 'center', padding: '200px 48px' }}>
        <p>Projet introuvable</p>
        <Link to="/">← Retour</Link>
      </main>
    )
  }

  return (
    <main style={{ paddingTop: '120px', ['--display-font' as string]: displayFont }}>
      {/* Hero */}
      <section style={{ padding: '80px 48px 60px', background: project.color }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>
            {project.client} · {project.year}
          </span>
        </div>
        <TextReveal as="h1" delay={100}>
          <span style={{
            fontFamily: 'var(--display-font)',
            fontSize: 'clamp(48px, 8vw, 120px)',
            fontWeight: 300,
            letterSpacing: '-0.03em',
            lineHeight: 0.9,
            display: 'block',
          }}>
            <DisplayText text={project.title} caseMode={displayCase} emphasisMode={displayEmphasis} />
          </span>
        </TextReveal>
        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
          {project.category.map(cat => (
            <span key={cat} style={{
              fontSize: '10px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(10,10,10,0.45)',
              padding: '4px 12px',
              border: '1px solid rgba(10,10,10,0.15)',
              borderRadius: '2px',
            }}>{cat}</span>
          ))}
        </div>
      </section>

      {/* Cover placeholder */}
      <div style={{ height: '60vh', background: project.color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {project.cover ? (
          <img
            src={project.cover}
            alt={project.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.25)' }}>
            Visuel à venir
          </span>
        )}
      </div>

      {/* Content */}
      <section style={{ padding: '80px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '20px' }}>
            Projet
          </div>
          <p data-cursor="quiet" style={{ fontSize: '18px', lineHeight: 1.8, color: 'rgba(10,10,10,0.7)', fontWeight: 300 }}>
            {project.description}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Brief */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
              Brief
            </div>
            <p data-cursor="quiet" style={{ fontSize: '14px', lineHeight: 1.8, color: 'rgba(10,10,10,0.55)', fontWeight: 300 }}>
              {project.brief}
            </p>
          </div>

          {/* Deliverables */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
              Livrables
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {project.deliverables.map(d => (
                <span key={d} style={{
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  color: 'rgba(10,10,10,0.5)',
                  padding: '5px 12px',
                  border: '1px solid rgba(10,10,10,0.1)',
                  borderRadius: '2px',
                }}>{d}</span>
              ))}
            </div>
          </div>

          {/* Agencies */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
              Avec
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {project.agencies.map(a => (
                <span key={a} style={{ fontSize: '14px', color: 'rgba(10,10,10,0.6)', fontWeight: 300 }}>{a}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {project.images.length > 0 && (
        <section style={{ padding: '0 48px 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {project.images.map((image, index) => (
            <div key={`${image}-${index}`} style={{ aspectRatio: '4 / 5', background: project.color, overflow: 'hidden' }}>
              <img
                src={image}
                alt={`${project.title} ${index + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
        </section>
      )}

      {/* Next project */}
      {project.videoUrl && (
        <section style={{ padding: '0 48px 80px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '16px' }}>
            Film
          </div>
          <div style={{ aspectRatio: '16 / 9', background: '#0a0a0a', overflow: 'hidden' }}>
            <iframe
              src={project.videoUrl}
              title={`${project.title} video`}
              style={{ width: '100%', height: '100%', border: 0 }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      )}

      {nextProject && (
        <Link to={`/projects/${nextProject.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          <section style={{
            padding: '80px 48px',
            background: '#f8f6f2',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
                Projet suivant
              </div>
              <span style={{
                fontFamily: 'var(--display-font)',
                fontSize: 'clamp(28px, 4vw, 56px)',
                fontWeight: 300,
                letterSpacing: '-0.02em',
              }}>
                <DisplayText
                  text={`${nextProject.client} — ${nextProject.title}`}
                  caseMode={displayCase}
                  emphasisMode={displayEmphasis}
                />
              </span>
            </div>
            <span style={{ fontSize: '32px', color: 'rgba(10,10,10,0.3)' }}>→</span>
          </section>
        </Link>
      )}
    </main>
  )
}
