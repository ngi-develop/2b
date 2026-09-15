import { Link } from 'react-router-dom'
import { img } from '../data/images.js'
import { formatDH, formatDate, nextFreeDate } from '../lib/rental.js'
import { Arrow } from './Icons.jsx'

/**
 * Fleet card. Unavailable vehicles stay in the grid — the brief is explicit
 * that they remain visible, greyed, labelled and not selectable.
 *
 * `cta` swaps the small arrow for a full-width button. The catalogue keeps
 * the arrow (the whole row is already a click target); the home page uses the
 * button, where a visitor is being invited rather than browsing.
 */
export default function VehicleCard({ vehicle, start, end, cta = false }) {
  const available = vehicle.available !== false
  const free = available ? null : nextFreeDate(vehicle, start)

  const search = new URLSearchParams()
  if (start) search.set('start', start)
  if (end) search.set('end', end)
  const href = `/flotte/${vehicle.slug}${search.toString() ? `?${search}` : ''}`

  return (
    <article className={`vcard${available ? '' : ' vcard--off'}`}>
      <div className="vcard__media">
        <img
          src={img(vehicle.image, 720, 540)}
          alt={`${vehicle.brand} ${vehicle.model}`}
          loading="lazy"
        />
        <span className={`badge vcard__status ${available ? 'badge--ok' : 'badge--off'}`}>
          <span className="dot" />
          {available ? 'Disponible' : 'Indisponible'}
        </span>
        <span className="vcard__cat">{vehicle.category}</span>
      </div>

      <div className="vcard__body">
        <h3 className="vcard__name">
          {available ? (
            <Link to={href} className="vcard__link">
              {vehicle.brand} {vehicle.model}
            </Link>
          ) : (
            <>
              {vehicle.brand} {vehicle.model}
            </>
          )}
          <small>{vehicle.version}</small>
        </h3>

        <ul className="specs">
          <li>{vehicle.transmission}</li>
          <li>{vehicle.fuel}</li>
          <li>{vehicle.seats} places</li>
          <li>{vehicle.doors} portes</li>
        </ul>

        {!available && (
          <p className="mono-note" style={{ color: 'var(--accent-on)' }}>
            Indisponible pour ces dates
            {free ? ` — libre à partir du ${formatDate(free)}` : ''}
          </p>
        )}

        <div className="vcard__foot">
          <p className="price">
            <span className="price__from">Dès</span>
            <span className="price__val">{formatDH(vehicle.pricePerDay)}</span>
            <span className="price__unit">/ jour</span>
          </p>
          {!cta &&
            (available ? (
              <Link to={href} className="vcard__go" aria-label={`Voir ${vehicle.brand} ${vehicle.model}`}>
                <Arrow />
              </Link>
            ) : (
              <span className="vcard__go" aria-disabled="true">
                <Arrow />
              </span>
            ))}
        </div>

        {cta &&
          (available ? (
            <Link to={href} className="btn btn--accent btn--sm btn--wide vcard__cta">
              Voir le véhicule <Arrow />
            </Link>
          ) : (
            <span className="btn btn--sm btn--wide vcard__cta" aria-disabled="true">
              Indisponible
            </span>
          ))}
      </div>
    </article>
  )
}
