import { useEffect } from 'react'
import TextReveal from '../components/TextReveal'

export default function Contact() {
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <main style={{ paddingTop: '120px', minHeight: '100svh', background: '#fff' }}>
      <section style={{ padding: '80px 48px' }}>
        <TextReveal as="h1" delay={100}>
          <span style={{
            fontFamily: 'Bodoni Moda, serif',
            fontSize: 'clamp(56px, 9vw, 130px)',
            fontWeight: 300,
            letterSpacing: '-0.03em',
            lineHeight: 0.9,
            fontStyle: 'italic',
            display: 'block',
            marginBottom: '80px',
          }}>
            Contact
          </span>
        </TextReveal>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>
          {/* Left info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
                Email
              </div>
              <a href="mailto:contact@instories.fr" style={{
                fontFamily: 'Bodoni Moda, serif',
                fontSize: '28px',
                fontWeight: 300,
                color: '#0a0a0a',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(10,10,10,0.15)',
                paddingBottom: '4px',
                fontStyle: 'italic',
              }}>
                contact@instories.fr
              </a>
            </div>

            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
                Téléphone
              </div>
              <a href="tel:+33603361836" style={{
                fontFamily: 'Bodoni Moda, serif',
                fontSize: '28px',
                fontWeight: 300,
                color: '#0a0a0a',
                textDecoration: 'none',
                fontStyle: 'italic',
              }}>
                06 03 36 18 36
              </a>
            </div>

            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
                Studio
              </div>
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(10,10,10,0.6)', fontWeight: 300 }}>
                72, rue des Archives<br />
                75003 Paris, France
              </p>
            </div>

            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '16px' }}>
                Réseaux
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                {[
                  { label: 'Instagram', href: 'https://instagram.com/instories_ai' },
                  { label: 'Behance', href: '#' },
                  { label: 'TikTok', href: 'https://tiktok.com/@ghost.in.gloss' },
                  { label: 'LinkedIn', href: '#' },
                ].map(({ label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" style={{
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'rgba(10,10,10,0.4)',
                    textDecoration: 'none',
                    borderBottom: '1px solid rgba(10,10,10,0.1)',
                    paddingBottom: '2px',
                    transition: 'color 0.3s ease',
                  }}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right — availability */}
          <div style={{
            padding: '48px',
            background: '#f8f6f2',
            borderRadius: '2px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
              <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>
                Disponible pour de nouveaux projets
              </span>
            </div>
            <p style={{
              fontFamily: 'Bodoni Moda, serif',
              fontSize: '24px',
              fontWeight: 300,
              lineHeight: 1.5,
              color: '#0a0a0a',
              fontStyle: 'italic',
            }}>
              Parlez-moi de votre projet, et créons ensemble quelque chose de remarquable.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
