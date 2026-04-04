import { useEffect } from 'react'
import DisplayText from '../components/DisplayText'
import TextReveal from '../components/TextReveal'
import Seo from '../components/Seo'
import InstagramPreview from '../components/InstagramPreview'
import { useSiteContent } from '../hooks/useSiteContent'
import { useIsMobile } from '../hooks/useIsMobile'
import { getDisplayFontFamily, getDisplayFontWeight, getDisplayLetterSpacing, getDisplayLineHeight, getDisplaySizeScale, getDisplayWordSpacing } from '../lib/typography'
import { getStoredLanguage, t } from '../lib/i18n'

export default function Contact() {
  const INSTAGRAM_PROFILE_URL = 'https://www.instagram.com/instories_ai'
  const content = useSiteContent()
  const lang = getStoredLanguage()
  const isMobile = useIsMobile()
  const { contact } = content
  const projects = content.projects
    .filter(project => project.status === 'published')
    .sort((a, b) => a.order - b.order)
  const instagramSocial = contact.socials.find(
    social => social.label.toLowerCase().includes('instagram') || social.href.includes('instagram.com')
  )
  const instagramUrl = instagramSocial?.href?.startsWith('http')
    ? instagramSocial.href
    : INSTAGRAM_PROFILE_URL
  const displayFont = getDisplayFontFamily(content.design.displayFont)
  const displayWeight = getDisplayFontWeight(content.design.displayFont, content.design.displayWeight)
  const displaySizeScale = getDisplaySizeScale(content.design.displaySize)
  const displayLetterSpacing = `${getDisplayLetterSpacing(content.design.displayLetterSpacing)}em`
  const displayWordSpacing = `${getDisplayWordSpacing(content.design.displayWordSpacing)}em`
  const displayLineHeight = getDisplayLineHeight(content.design.displayLineHeight)
  const displayCase = content.design.displayCase
  const displayEmphasis = content.design.displayEmphasis
  useEffect(() => { window.scrollTo(0, 0) }, [])

  return (
    <main
      className="site-themed"
      style={{
        paddingTop: '120px',
        minHeight: '100svh',
        ['--display-font' as string]: displayFont,
        ['--display-weight' as string]: displayWeight,
        ['--display-size-scale' as string]: displaySizeScale,
        ['--display-letter-spacing' as string]: displayLetterSpacing,
        ['--display-word-spacing' as string]: displayWordSpacing,
        ['--display-line-height' as string]: displayLineHeight,
      }}
    >
      <Seo
        title={lang === 'en' ? 'Contact — InStories' : 'Contact — InStories'}
        description={contact.availabilityText}
        path="/contact"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'ContactPage',
          name: 'Contact InStories',
          url: 'https://instories.fr/contact',
          mainEntity: {
            '@type': 'Organization',
            name: 'InStories',
            email: contact.email,
            telephone: contact.phone,
          },
        }}
      />
      <section className="night-surface" style={{ padding: isMobile ? '56px 20px' : '80px 48px' }}>
        <TextReveal as="h1" delay={100}>
          <span style={{
            fontFamily: 'var(--display-font)',
            fontSize: 'calc(clamp(56px, 9vw, 130px) * var(--display-size-scale))',
            fontWeight: 'var(--display-weight)',
            letterSpacing: 'var(--display-letter-spacing)',
            wordSpacing: 'var(--display-word-spacing)',
            lineHeight: 'var(--display-line-height)',
            display: 'block',
            marginBottom: isMobile ? '40px' : '80px',
          }}>
            <DisplayText text={contact.title} caseMode={displayCase} emphasisMode={displayEmphasis} />
          </span>
        </TextReveal>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '36px' : '80px', alignItems: 'start' }}>
          {/* Left info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: '12px' }}>
                {t(lang, 'contact.email')}
              </div>
              <a href={`mailto:${contact.email}`} className="contact-link" style={{
                fontFamily: 'var(--display-font)',
                fontSize: 'calc(28px * var(--display-size-scale))',
                fontWeight: 'var(--display-weight)',
                letterSpacing: 'var(--display-letter-spacing)',
                wordSpacing: 'var(--display-word-spacing)',
                lineHeight: 'var(--display-line-height)',
                color: 'var(--text-ink)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--border-mid)',
                paddingBottom: '4px',
                fontStyle: 'italic',
              }}>
                {contact.email}
              </a>
            </div>

            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: '12px' }}>
                {t(lang, 'contact.phone')}
              </div>
              <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className="contact-link" style={{
                fontFamily: 'var(--display-font)',
                fontSize: 'calc(28px * var(--display-size-scale))',
                fontWeight: 'var(--display-weight)',
                letterSpacing: 'var(--display-letter-spacing)',
                wordSpacing: 'var(--display-word-spacing)',
                lineHeight: 'var(--display-line-height)',
                color: 'var(--text-ink)',
                textDecoration: 'none',
                fontStyle: 'italic',
              }}>
                {contact.phone}
              </a>
            </div>

            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: '12px' }}>
                {t(lang, 'contact.studio')}
              </div>
              <p data-cursor="quiet" style={{ fontSize: '15px', lineHeight: 1.7, color: 'var(--text-body)', fontWeight: 300 }}>
                {contact.addressLines.map((line, index) => (
                  <span key={`${line}-${index}`}>
                    {line}
                    {index < contact.addressLines.length - 1 ? <br /> : null}
                  </span>
                ))}
              </p>
            </div>

            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-label)', marginBottom: '16px' }}>
                {t(lang, 'contact.socials')}
              </div>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {contact.socials.map(({ label, href }) => (
                  <a key={label} href={href} target="_blank" rel="noreferrer" className="contact-social" style={{
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    textDecoration: 'none',
                    borderBottom: '1px solid var(--border-ui)',
                    paddingBottom: '2px',
                    display: 'inline-block',
                  }}>
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right — availability */}
          <div className="night-surface-soft" style={{
            padding: isMobile ? '28px' : '48px',
            background: 'var(--bg-alt)',
            borderRadius: '2px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
              <span style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(10,10,10,0.4)' }}>
                {contact.availabilityLabel}
              </span>
            </div>
            <p data-cursor="quiet" style={{
              fontFamily: 'var(--display-font)',
              fontSize: 'calc(24px * var(--display-size-scale))',
              fontWeight: 'var(--display-weight)',
              lineHeight: 'var(--display-line-height)',
              letterSpacing: 'var(--display-letter-spacing)',
              wordSpacing: 'var(--display-word-spacing)',
              color: 'var(--text-ink)',
              fontStyle: 'italic',
            }}>
              {contact.availabilityText}
            </p>
          </div>
        </div>
      </section>

      <section className="night-surface" style={{ padding: isMobile ? '0 20px 64px' : '0 48px 88px' }}>
        <InstagramPreview
          title="Instagram"
          subtitle={t(lang, 'ui.instagram.preview')}
          instagramUrl={instagramUrl}
          items={projects.map(project => ({
            id: project.id,
            title: `${project.client} — ${project.title}`,
            image: project.cover,
          }))}
        />
      </section>
    </main>
  )
}
