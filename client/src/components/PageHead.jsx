import { Link } from 'react-router-dom'
import { img } from '../data/images.js'

/**
 * Interior-page masthead. Keeps the home page's asymmetry: title block left
 * of centre, photograph bleeding off the right edge behind it.
 */
export default function PageHead({ eyebrow, title, intro, media, crumbs = [], aside }) {
  return (
    <section className="pagehead">
      {media && (
        <div className="pagehead__media" aria-hidden="true">
          <img src={img(media, 1000)} alt="" loading="eager" />
        </div>
      )}
      <div className="shell">
        {crumbs.length > 0 && (
          <nav className="crumbs" aria-label="Fil d’ariane">
            <Link to="/">Accueil</Link>
            {crumbs.map((c) => (
              <span key={c.label} style={{ display: 'contents' }}>
                <span aria-hidden="true">/</span>
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              </span>
            ))}
          </nav>
        )}
        <div className="pagehead__inner">
          <div>
            {eyebrow && (
              <span className="eyebrow" style={{ color: 'var(--accent-on)', marginBottom: 20 }}>
                {eyebrow}
              </span>
            )}
            <h1 className="pagehead__title">{title}</h1>
          </div>
          <div className="pagehead__aside">
            {intro && <p>{intro}</p>}
            {aside}
          </div>
        </div>
      </div>
    </section>
  )
}
