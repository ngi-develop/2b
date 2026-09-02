import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fetchVehicle, submitReservation } from '../api/client.js'
import { rentalOptions } from '../data/vehicles.js'
import { pickupPoints } from '../data/site.js'
import { img } from '../data/images.js'
import { Arrow, Check } from '../components/Icons.jsx'
import { TextField, SelectField, TextArea } from '../components/Field.jsx'
import { addDays, formatDH, formatDate, quote, today } from '../lib/rental.js'

const STEPS = ['Dates et lieu', 'Véhicule et options', 'Vos coordonnées', 'Envoi']

export default function Reservation() {
  const { slug } = useParams()
  const [params] = useSearchParams()

  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [options, setOptions] = useState([])
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const [form, setForm] = useState({
    start: params.get('start') || addDays(today(), 1),
    end: params.get('end') || addDays(today(), 5),
    pickup: pickupPoints[0],
    dropoff: pickupPoints[0],
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    licenceYears: '2 ans et plus',
    flight: '',
    message: '',
  })

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  useEffect(() => {
    let alive = true
    fetchVehicle(slug).then((v) => {
      if (!alive) return
      setVehicle(v)
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [slug])

  const q = useMemo(
    () =>
      quote({
        vehicle,
        start: form.start,
        end: form.end,
        options,
        optionCatalog: rentalOptions,
      }),
    [vehicle, form.start, form.end, options]
  )

  function toggleOption(id) {
    setOptions((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function validate() {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Prénom requis'
    if (!form.lastName.trim()) e.lastName = 'Nom requis'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Adresse e-mail invalide'
    if (form.phone.replace(/[^0-9]/g, '').length < 8) e.phone = 'Numéro de téléphone invalide'
    if (!form.country.trim()) e.country = 'Pays de résidence requis'
    if (form.end <= form.start) e.end = 'La restitution doit suivre le départ'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!validate()) {
      document.querySelector('.field--error')?.scrollIntoView({ block: 'center' })
      return
    }
    setSending(true)
    const res = await submitReservation({
      vehicleId: vehicle.id,
      vehicleSlug: vehicle.slug,
      ...form,
      options,
      quote: { days: q.days, total: q.total, deposit: q.deposit },
    })
    setSending(false)
    setResult(res)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="shell" style={{ paddingBlock: 'var(--s-4)' }}>
        <p className="mono-note">Chargement…</p>
      </div>
    )
  }

  if (!vehicle) {
    return (
      <div className="shell" style={{ paddingBlock: 'var(--s-4)' }}>
        <div className="emptystate">
          <h1 className="h2">Véhicule introuvable.</h1>
          <Link to="/flotte" className="btn">
            Retour à la flotte <Arrow />
          </Link>
        </div>
      </div>
    )
  }

  /* ---------- confirmation ---------- */
  if (result) {
    return (
      <section className="sec--4">
        <div className="shell">
          <div className="sent">
            <span className="sent__mark">
              <Check />
            </span>
            <h1 className="h2">Demande envoyée. Référence {result.reference}.</h1>
            <p className="body-muted">
              Votre demande porte sur un <strong>{vehicle.brand} {vehicle.model}</strong>, du{' '}
              {formatDate(form.start)} au {formatDate(form.end)}. Elle est arrivée dans notre
              tableau de bord avec le statut « {result.status} ».
            </p>
            <p className="notice">
              Ceci n’est pas encore une réservation ferme. Un conseiller vérifie la
              disponibilité réelle du véhicule et vous adresse la confirmation définitive,
              généralement en moins de deux heures ouvrées.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, marginTop: 10 }}>
              <Link to="/flotte" className="btn btn--ghost">
                Retour à la flotte <Arrow />
              </Link>
              <Link to="/" className="btn btn--ghost" style={{ marginLeft: -1 }}>
                Accueil <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  }

  /* ---------- form ---------- */
  return (
    <>
      <section className="pagehead">
        <div className="shell">
          <nav className="crumbs" aria-label="Fil d’ariane">
            <Link to="/">Accueil</Link>
            <span aria-hidden="true">/</span>
            <Link to="/flotte">Notre flotte</Link>
            <span aria-hidden="true">/</span>
            <Link to={`/flotte/${vehicle.slug}`}>
              {vehicle.brand} {vehicle.model}
            </Link>
            <span aria-hidden="true">/</span>
            <span>Demande</span>
          </nav>
          <div className="pagehead__inner">
            <div>
              <span className="eyebrow" style={{ color: 'var(--clay)', marginBottom: 20 }}>
                Demande de réservation
              </span>
              <h1 className="pagehead__title">
                {vehicle.brand} {vehicle.model}
              </h1>
            </div>
            <div className="pagehead__aside">
              <p>
                Aucun paiement en ligne. Vous envoyez une demande ; nous la validons
                manuellement avant qu’elle ne devienne une réservation ferme.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec--2" style={{ paddingBottom: 'var(--s-4)' }}>
        <div className="shell">
          <ol className="steprail">
            {STEPS.map((s, i) => (
              <li className={`steprail__item${i < 3 ? ' is-on' : ''}`} key={s}>
                <span className="steprail__n">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>

          <div className="resvlayout">
            <form onSubmit={onSubmit} noValidate>
              <p className="eyebrow" style={{ marginBottom: 18 }}>
                <span className="index-mark">01</span>&nbsp;&nbsp;Dates et lieu
              </p>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="rs-start">
                    Date de départ<span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="rs-start"
                    type="date"
                    value={form.start}
                    min={today()}
                    onChange={(e) => set('start', e.target.value)}
                  />
                </div>
                <div className={`field${errors.end ? ' field--error' : ''}`}>
                  <label htmlFor="rs-end">
                    Date de restitution<span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="rs-end"
                    type="date"
                    value={form.end}
                    min={addDays(form.start, 1)}
                    onChange={(e) => set('end', e.target.value)}
                  />
                  {errors.end && <span className="field__err">{errors.end}</span>}
                </div>
                <SelectField
                  label="Lieu de prise en charge"
                  name="pickup"
                  value={form.pickup}
                  onChange={set}
                  options={pickupPoints}
                  required
                />
                <SelectField
                  label="Lieu de restitution"
                  name="dropoff"
                  value={form.dropoff}
                  onChange={set}
                  options={pickupPoints}
                  required
                />
              </div>

              <p className="eyebrow" style={{ margin: '38px 0 18px' }}>
                <span className="index-mark">02</span>&nbsp;&nbsp;Options
              </p>
              <div className="optlist">
                {rentalOptions.map((o) => (
                  <label className="optrow" key={o.id}>
                    <input
                      type="checkbox"
                      checked={options.includes(o.id)}
                      onChange={() => toggleOption(o.id)}
                    />
                    <span className="optrow__name">
                      {o.name}
                      <small>{o.note}</small>
                    </span>
                    <span className="optrow__price">
                      {formatDH(o.price)}
                      <span
                        style={{
                          fontFamily: 'var(--f-body)',
                          fontWeight: 400,
                          fontSize: '0.8125rem',
                          color: 'var(--ink-45)',
                        }}
                      >
                        {o.unit === 'jour' ? ' / jour' : ' forfait'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>

              <p className="eyebrow" style={{ margin: '38px 0 18px' }}>
                <span className="index-mark">03</span>&nbsp;&nbsp;Vos coordonnées
              </p>
              <div className="form-grid">
                <TextField
                  label="Prénom"
                  name="firstName"
                  value={form.firstName}
                  onChange={set}
                  error={errors.firstName}
                  required
                  autoComplete="given-name"
                />
                <TextField
                  label="Nom"
                  name="lastName"
                  value={form.lastName}
                  onChange={set}
                  error={errors.lastName}
                  required
                  autoComplete="family-name"
                />
                <TextField
                  label="Adresse e-mail"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={set}
                  error={errors.email}
                  required
                  autoComplete="email"
                  placeholder="prenom@exemple.com"
                />
                <TextField
                  label="Téléphone / WhatsApp"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={set}
                  error={errors.phone}
                  required
                  autoComplete="tel"
                  placeholder="+212 6 …"
                />
                <TextField
                  label="Pays de résidence"
                  name="country"
                  value={form.country}
                  onChange={set}
                  error={errors.country}
                  required
                  autoComplete="country-name"
                />
                <SelectField
                  label="Permis obtenu depuis"
                  name="licenceYears"
                  value={form.licenceYears}
                  onChange={set}
                  options={['Moins de 2 ans', '2 ans et plus', '5 ans et plus']}
                />
                <TextField
                  label="N° de vol (si livraison aéroport)"
                  name="flight"
                  value={form.flight}
                  onChange={set}
                  placeholder="Facultatif"
                  full
                />
                <TextArea
                  label="Précisions"
                  name="message"
                  value={form.message}
                  onChange={set}
                  placeholder="Heure d’arrivée, adresse de livraison, siège enfant, itinéraire prévu…"
                />
              </div>

              <div className="form-foot">
                <p className="form-note">
                  En envoyant ce formulaire, vous acceptez que 2B Location vous contacte
                  au sujet de cette demande. Aucune donnée n’est revendue.
                </p>
                <button type="submit" className="btn btn--clay" disabled={sending}>
                  {sending ? 'Envoi en cours…' : 'Envoyer la demande'} <Arrow />
                </button>
              </div>
            </form>

            {/* -------- running summary -------- */}
            <aside className="resvsummary">
              <div className="resvsummary__media">
                <img
                  src={img(vehicle.image, 700, 440)}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                />
              </div>
              <div className="resvsummary__body">
                <h2 className="h3">
                  {vehicle.brand} {vehicle.model}
                </h2>
                <p className="mono-note">{vehicle.version}</p>

                <div className="bookbox__row">
                  <span>Du</span>
                  <span>{formatDate(form.start)}</span>
                </div>
                <div className="bookbox__row">
                  <span>Au</span>
                  <span>{formatDate(form.end)}</span>
                </div>
                <div className="bookbox__row">
                  <span>
                    {formatDH(vehicle.pricePerDay)} × {q.days} jour{q.days > 1 ? 's' : ''}
                  </span>
                  <span>{formatDH(q.base)}</span>
                </div>

                {q.chosen.map((o) => (
                  <div className="bookbox__row" key={o.id}>
                    <span style={{ color: 'var(--ink-45)' }}>{o.name}</span>
                    <span>
                      {formatDH(o.unit === 'jour' ? o.price * q.days : o.price)}
                    </span>
                  </div>
                ))}

                <div className="bookbox__row bookbox__row--total">
                  <span>Total estimé</span>
                  <span>{formatDH(q.total)}</span>
                </div>

                <p className="mono-note">
                  Caution à prévoir : {formatDH(q.deposit)} — pré-autorisée, jamais
                  débitée. Kilométrage inclus : {q.kmIncluded} km.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
