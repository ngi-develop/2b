import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { fetchVehicle } from '../api/client.js'
import { img } from '../data/images.js'
import { Arrow, Check } from '../components/Icons.jsx'
import { addDays, countDays, formatDH, formatDate, today } from '../lib/rental.js'

export default function VehicleDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shot, setShot] = useState(0)

  const [start, setStart] = useState(params.get('start') || addDays(today(), 1))
  const [end, setEnd] = useState(params.get('end') || addDays(today(), 5))

  /* Availability is decided by the server against live reservations, so the
     dates are part of the request rather than something we evaluate here. */
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchVehicle(slug, { start, end })
      .then((v) => {
        if (!alive) return
        setVehicle(v)
        setLoading(false)
      })
      .catch(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [slug, start, end])

  useEffect(() => setShot(0), [slug])

  if (loading) {
    return (
      <div className="shell" style={{ paddingBlock: 'var(--s-4)' }}>
        <p className="mono-note">Chargement du véhicule…</p>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="shell" style={{ paddingBlock: 'var(--s-4)' }}>
        <div className="emptystate">
          <h1 className="h2">Ce véhicule n’existe pas ou n’est plus au catalogue.</h1>
          <Link to="/flotte" className="btn">
            Retour à la flotte <Arrow />
          </Link>
        </div>
      </div>
    )
  }

  const days = Math.max(countDays(start, end), 1)
  const available = vehicle.available !== false
  const subtotal = vehicle.pricePerDay * days

  const specs = [
    ['Catégorie', vehicle.category],
    ['Année', vehicle.year],
    ['Boîte de vitesses', vehicle.transmission],
    ['Motorisation', vehicle.fuel],
    ['Places', `${vehicle.seats}`],
    ['Portes', `${vehicle.doors}`],
    ['Bagages', `${vehicle.luggage} valises`],
    ['Climatisation', vehicle.ac ? 'Oui' : 'Non'],
    ['Kilométrage inclus', `${vehicle.kmIncluded} km / jour`],
    ['Km supplémentaire', `${vehicle.extraKmPrice} DH`],
    ['Caution', formatDH(vehicle.deposit)],
  ]

  function goToReservation() {
    const qs = new URLSearchParams({ start, end })
    navigate(`/reservation/${vehicle.slug}?${qs.toString()}`)
  }

  return (
    <>
      <section className="pagehead">
        <div className="shell">
          <nav className="crumbs" aria-label="Fil d’ariane">
            <Link to="/">Accueil</Link>
            <span aria-hidden="true">/</span>
            <Link to="/flotte">Notre flotte</Link>
            <span aria-hidden="true">/</span>
            <span>
              {vehicle.brand} {vehicle.model}
            </span>
          </nav>
          <div className="pagehead__inner">
            <div>
              <span className="eyebrow" style={{ color: 'var(--clay)', marginBottom: 20 }}>
                {vehicle.category} — {vehicle.year}
              </span>
              <h1 className="pagehead__title">
                {vehicle.brand} {vehicle.model}
              </h1>
            </div>
            <div className="pagehead__aside">
              <p>{vehicle.blurb}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec--2" style={{ paddingBottom: 'var(--s-4)' }}>
        <div className="shell">
          <div className="vdetail">
            {/* -------- gallery + specs -------- */}
            <div>
              <div className="vgallery">
                <div className="vgallery__main">
                  <img
                    src={img(vehicle.gallery[shot], 1400, 900)}
                    alt={`${vehicle.brand} ${vehicle.model} — vue ${shot + 1}`}
                  />
                </div>
                <div className="vgallery__thumbs">
                  {vehicle.gallery.map((g, i) => (
                    <button
                      type="button"
                      key={g + i}
                      className={`vthumb${i === shot ? ' is-on' : ''}`}
                      onClick={() => setShot(i)}
                      aria-label={`Voir la photo ${i + 1}`}
                      aria-pressed={i === shot}
                    >
                      <img src={img(g, 320, 240)} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 'clamp(34px, 4vw, 56px)' }}>
                <p className="eyebrow" style={{ marginBottom: 20 }}>
                  <span className="index-mark">01</span>&nbsp;&nbsp;Points forts
                </p>
                <ul className="ticklist" style={{ marginBottom: 40 }}>
                  {vehicle.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>

                <p className="eyebrow" style={{ marginBottom: 20 }}>
                  <span className="index-mark">02</span>&nbsp;&nbsp;Fiche technique
                </p>
                <dl className="specsheet">
                  {specs.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>

                <p className="eyebrow" style={{ margin: '40px 0 20px' }}>
                  <span className="index-mark">03</span>&nbsp;&nbsp;Villes de mise à disposition
                </p>
                <ul className="specs">
                  {vehicle.cities.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* -------- booking box -------- */}
            <aside className="bookbox">
              <div className="bookbox__head">
                <p className="price">
                  <span className="price__from">Dès</span>
                  <span className="price__val">{formatDH(vehicle.pricePerDay)}</span>
                  <span className="price__unit">/ jour</span>
                </p>
                <p className="mono-note" style={{ marginTop: 8 }}>
                  {vehicle.kmIncluded} km inclus par jour · caution{' '}
                  {formatDH(vehicle.deposit)}
                </p>
              </div>

              <div className="bookbox__body">
                <div className="form-grid" style={{ borderLeft: 0, borderTop: 0 }}>
                  <div className="field" style={{ borderRight: 0 }}>
                    <label htmlFor="vd-start">Départ</label>
                    <input
                      id="vd-start"
                      type="date"
                      value={start}
                      min={today()}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </div>
                  <div className="field" style={{ borderRight: 0 }}>
                    <label htmlFor="vd-end">Retour</label>
                    <input
                      id="vd-end"
                      type="date"
                      value={end}
                      min={addDays(start, 1)}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </div>
                </div>

                {available ? (
                  <>
                    <div className="bookbox__row">
                      <span>
                        {formatDH(vehicle.pricePerDay)} × {days} jour{days > 1 ? 's' : ''}
                      </span>
                      <span>{formatDH(subtotal)}</span>
                    </div>
                    <div className="bookbox__row">
                      <span>Kilométrage inclus</span>
                      <span>{vehicle.kmIncluded * days} km</span>
                    </div>
                    <div className="bookbox__row bookbox__row--total">
                      <span>Sous-total</span>
                      <span>{formatDH(subtotal)}</span>
                    </div>

                    <p className="badge badge--ok" style={{ justifySelf: 'start' }}>
                      <span className="dot" />
                      Disponible du {formatDate(start)} au {formatDate(end)}
                    </p>

                    <button type="button" className="btn btn--clay btn--wide" onClick={goToReservation}>
                      Poursuivre la demande <Arrow />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="notice">
                      <strong>Indisponible pour ces dates.</strong> Modifiez la période, ou
                      consultez le reste de la flotte.
                    </p>
                    <button type="button" className="btn btn--wide" disabled>
                      Poursuivre la demande
                    </button>
                    <Link to="/flotte" className="textlink" style={{ justifySelf: 'start' }}>
                      Voir les véhicules libres <Arrow />
                    </Link>
                  </>
                )}

                <p className="mono-note" style={{ display: 'flex', gap: 10 }}>
                  <Check size={15} />
                  Aucun paiement à cette étape. La réservation devient ferme après
                  validation par nos équipes.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
