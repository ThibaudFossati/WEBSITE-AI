import { useEffect } from 'react'
import TextReveal from '../components/TextReveal'
import { useSiteContent } from '../hooks/useSiteContent'

export default function Contact() {
  const content = useSiteContent()
  const { contact } = content
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
            {contact.title}
          </span>
        </TextReveal>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'start' }}>
          {/* Left info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
                Email
              </div>
              <a href={`mailto:${contact.email}`} style={{
                fontFamily: 'Bodoni Moda, serif',
                fontSize: '28px',
                fontWeight: 300,
                color: '#0a0a0a',
                textDecoration: 'none',
                borderBottom: '1px solid rgba(10,10,10,0.15)',
                paddingBottom: '4px',
                fontStyle: 'italic',
              }}>
                {contact.email}
              </a>
            </div>

            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
                Téléphone
              </div>
              <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} style={{
                fontFamily: 'Bodoni Moda, serif',
                fontSize: '28px',
                fontWeight: 300,
                color: '#0a0a0a',
                textDecoration: 'none',
                fontStyle: 'italic',
              }}>
                {contact.phone}
              </a>
            </div>

            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '12px' }}>
                Studio
              </div>
              <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(10,10,10,0.6)', fontWeight: 300 }}>
                {contact.addressLines.map((line, index) => (
                  <span key={`${line}-${index}`}>
                    {line}
                    {index < contact.addressLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            </div>

            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.3)', marginBottom: '16px' }}>
                Réseaux
              </div>
              <div style={{ display: 'flex', gap: '20px' }}>
                {contact.socials.map(({ label, href }) => (
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
                {contact.availabilityLabel}
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
              {contact.availabilityText}
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
