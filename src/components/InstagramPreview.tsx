type InstagramItem = {
  id: string
  title: string
  image?: string
}

type InstagramPreviewProps = {
  title?: string
  subtitle?: string
  instagramUrl: string
  items: InstagramItem[]
  compact?: boolean
}

export default function InstagramPreview({
  title = 'Instagram',
  subtitle = 'Aperçu visuel',
  instagramUrl,
  items,
  compact = false,
}: InstagramPreviewProps) {
  const visibleItems = items.slice(0, compact ? 3 : 6)

  return (
    <section className={`ig-preview${compact ? ' compact' : ''}`}>
      <div className="ig-preview-head">
        <div>
          <p className="ig-kicker">{title}</p>
          <h3>{subtitle}</h3>
        </div>
        <a
          href={instagramUrl}
          target="_blank"
          rel="noreferrer"
          className="ig-cta"
          data-cursor="hover"
        >
          Voir Instagram →
        </a>
      </div>

      <div className="ig-grid">
        {visibleItems.map(item => (
          <a
            key={item.id}
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            className="ig-card"
            data-cursor="hover"
            aria-label={`Voir ${item.title} sur Instagram`}
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                onError={e => {
                  const img = e.currentTarget
                  img.style.display = 'none'
                }}
              />
            ) : null}
            <span>{item.title}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
