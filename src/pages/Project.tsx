import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { projects } from '../data/projects'
import TextReveal from '../components/TextReveal'

export default function Project() {
  const { id } = useParams<{ id: string }>()
  const project = projects.find(p => p.id === id)
  const nextProject = projects[(projects.findIndex(p => p.id === id) + 1) % projects.length]

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
    <main style={{ paddingTop: '120px' }}>
      {/* Hero */}
      <section style={{ padding: '80px 48px 60px', background: project.color }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>
            {project.client} · {project.year}
          </span>
        </div>
        <TextReveal as="h1" delay={100}>
          <span style={{
            fontFamily: 'Bodoni Moda, serif',
            fontSize: 'clamp(48px, 8vw, 120px)',
            fontWeight: 300,
            letterSpacing: '-0.03em',
            lineHeight: 0.9,
            fontStyle: 'italic',
            display: 'block',
          }}>
            {project.title}
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
      <div style={{ height: '60vh', background: project.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.25)' }}>
          Visuel à venir
        </span>
      </div>

      {/* Content */}
      <section style={{ padding: '80px 48px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '20px' }}>
            Projet
          </div>
          <p style={{ fontSize: '18px', lineHeight: 1.8, color: 'rgba(10,10,10,0.7)', fontWeight: 300 }}>
            {project.description}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Brief */}
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
              Brief
            </div>
            <p style={{ fontSize: '14px', lineHeight: 1.8, color: 'rgba(10,10,10,0.55)', fontWeight: 300 }}>
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

      {/* Next project */}
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
              fontFamily: 'Bodoni Moda, serif',
              fontSize: 'clamp(28px, 4vw, 56px)',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              fontStyle: 'italic',
            }}>
              {nextProject.client} — {nextProject.title}
            </span>
          </div>
          <span style={{ fontSize: '32px', color: 'rgba(10,10,10,0.3)' }}>→</span>
        </section>
      </Link>
    </main>
  )
}
