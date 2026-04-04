import ResolvedImage from './ResolvedImage'
import ArrowIcon from './ArrowIcon'
import { autoTranslateText, getStoredLanguage } from '../lib/i18n'
import DisplayText from './DisplayText'
import type { DisplayCaseMode, DisplayEmphasisMode } from '../lib/typography'

type InstagramItem = {
  id: string
  title: string
  label?: string
  image?: string
  href?: string
  embedUrl?: string
}

type InstagramPreviewProps = {
  title?: string
  subtitle?: string
  instagramUrl: string
  items: InstagramItem[]
  displayCase?: DisplayCaseMode
  displayEmphasis?: DisplayEmphasisMode
  compact?: boolean
}

export default function InstagramPreview({
  title = 'Instagram',
  subtitle = 'Aperçu visuel',
  instagramUrl,
  items,
  displayCase = 'default',
  displayEmphasis = 'none',
  compact = false,
}: InstagramPreviewProps) {
  const lang = getStoredLanguage()
  const visibleItems = items.slice(0, compact ? 3 : 6)

  return (
    <section className={`ig-preview${compact ? ' compact' : ''}`}>
      <div className="ig-preview-head">
        <div>
          <p className="ig-kicker">{title}</p>
          <h3>
            <DisplayText text={subtitle} caseMode={displayCase} emphasisMode={displayEmphasis} />
          </h3>
        </div>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="ig-cta"
          data-cursor="hover"
        >
          {autoTranslateText('Voir Instagram', lang)}
          <ArrowIcon direction="right" size={11} strokeWidth={1.8} />
        </a>
      </div>

      <div className="ig-grid">
        {visibleItems.map(item => (
          <a
            key={item.id}
            href={item.href || instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="ig-card"
            data-cursor="hover"
            aria-label={`${autoTranslateText('Voir', lang)} ${item.title} ${autoTranslateText('sur Instagram', lang)}`}
          >
            {item.embedUrl ? (
              <iframe
                src={item.embedUrl}
                title={item.title}
                loading="lazy"
                allow="encrypted-media; picture-in-picture"
              />
            ) : item.image ? (
              <ResolvedImage
                src={item.image}
                alt={item.title}
                loading="lazy"
                onError={e => {
                  const img = e.currentTarget
                  img.style.display = 'none'
                }}
              />
            ) : null}
            <span>{item.label?.trim() || autoTranslateText('Voir le post', lang)}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
