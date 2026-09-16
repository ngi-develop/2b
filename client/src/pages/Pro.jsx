import { useState } from 'react'
import { Link } from 'react-router-dom'
import PageHead from '../components/PageHead.jsx'
import SectionHead from '../components/SectionHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { Arrow, Check, Doc } from '../components/Icons.jsx'
import { TextField, SelectField, TextArea, RadioGroup, CheckGroup } from '../components/Field.jsx'
import { submitQuoteRequest, uploadQuoteAttachment } from '../api/client.js'
import { img, shots } from '../data/images.js'
import { proAdvantages, proSteps, company } from '../data/site.js'

/**
 * Professional Car Wash landing page.
 *
 * The brief is strict about what this page must NOT contain: no catalogue,
 * no published price, no availability calendar, no direct booking, and no
 * mixing with the tourist fleet. Its single job is to capture a qualified
 * request that lands in the company dashboard for a manual quote.
 */

const DURATIONS = [
  'Moins d’un mois',
  '1 à 3 mois',
  '3 à 6 mois',
  '6 à 12 mois',
  'Plus de 12 mois',
  'Je ne sais pas encore',
]

const PRODUCTS = [
  'Shampooing carrosserie',
  'Lavage sans eau',
  'Nettoyant jantes',
  'Intérieur / plastiques',
  'Cire de finition',
  'Microfibres et accessoires',
]

export default function Pro() {
  const [form, setForm] = useState({
    fullName: '',
    companyName: '',
    city: '',
    country: 'Maroc',
    phone: '',
    email: '',
    vehicleCount: '',
    duration: DURATIONS[1],
    startDate: '',
    zone: '',
    equipped: 'Avec équipements',
    delivery: 'Oui',
    training: 'Oui',
    message: '',
  })
  const [products, setProducts] = useState([PRODUCTS[0]])
  /* The document is uploaded the moment it is chosen, not on submit: the
     enquiry then carries a URL, and a file that is too large or of the wrong
     type is reported here rather than after a filled-in form is sent. */
  const [attachment, setAttachment] = useState(null)
  const [fileBusy, setFileBusy] = useState(false)
  const [fileError, setFileError] = useState('')
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setFileBusy(true)
    setFileError('')
    try {
      const { url, name } = await uploadQuoteAttachment(file)
      setAttachment({ url, name })
    } catch (err) {
      setFileError(err.message || 'Envoi impossible.')
      setAttachment(null)
    } finally {
      setFileBusy(false)
    }
  }

  const toggleProduct = (p) =>
    setProducts((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))

  function validate() {
    const e = {}
    if (!form.fullName.trim()) e.fullName = 'Nom et prénom requis'
    if (!form.city.trim()) e.city = 'Ville requise'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Adresse e-mail invalide'
    if (form.phone.replace(/[^0-9]/g, '').length < 8) e.phone = 'Numéro de téléphone invalide'
    if (!form.vehicleCount || Number(form.vehicleCount) < 1)
      e.vehicleCount = 'Indiquez au moins un véhicule'
    if (!form.zone.trim()) e.zone = 'Zone d’utilisation requise'
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
    const res = await submitQuoteRequest({
      ...form,
      // an empty date input is an empty string, which is not a date
      startDate: form.startDate || undefined,
      products,
      attachmentName: attachment?.name || undefined,
      attachmentUrl: attachment?.url || undefined,
    })
    setSending(false)
    setResult(res)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (result) {
    return (
      <section className="sec--4">
        <div className="shell">
          <div className="sent">
            <span className="sent__mark">
              <Check />
            </span>
            <h1 className="h2">Demande reçue. Référence {result.reference}.</h1>
            <p className="body-muted">
              Votre dossier est arrivé dans notre tableau de bord avec le statut «{' '}
              {result.status} ». Notre équipe analyse le besoin, vérifie la disponibilité du
              parc sur votre zone, puis établit un devis chiffré ligne par ligne.
            </p>
            <p className="notice">
              Délai de réponse : 48 heures ouvrées. Jusqu’à 72 heures si vous avez joint un
              cahier des charges. Vous pourrez ensuite accepter le devis ou demander une
              révision.
            </p>
            <Link to="/" className="btn btn--ghost" style={{ justifySelf: 'start' }}>
              Retour à l’accueil <Arrow />
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <PageHead
        eyebrow="Location professionnelle"
        title="Des véhicules Car Wash prêts à produire."
        intro="Vous exploitez, nous équipons et entretenons. Aucun prix n’est affiché sur cette page : chaque situation donne lieu à un devis chiffré individuellement."
        media={shots.washFoamCar}
        crumbs={[{ label: 'Véhicules Professionnel' }]}
      />

      {/* ---------- SHORT PRESENTATION ---------------------------------- */}
      <section className="sec--2" style={{ paddingBottom: 'var(--s-3)' }}>
        <div className="shell">
          <div className="split">
            <div className="split__body">
              <p className="eyebrow" style={{ marginBottom: 18 }}>
                <span className="index-mark">01</span>&nbsp;&nbsp;Le service
              </p>
              <h2 className="h2" style={{ marginBottom: 26 }}>
                Le lavage mobile, sans immobiliser un dirham de capital.
              </h2>
              <p className="body-muted" style={{ marginBottom: 22 }}>
                Nous louons aux professionnels des véhicules aménagés pour le lavage
                automobile mobile : cuve, groupe haute pression, enrouleur, onduleur,
                rangements et signalétique. Vous les recevez opérationnels, vous facturez
                dès la première tournée.
              </p>
              <p className="body-muted" style={{ marginBottom: 30 }}>
                Cette offre est entièrement distincte de notre flotte tourisme. Elle ne
                figure dans aucun catalogue public et ne se réserve pas en ligne.
              </p>
              <a href="#devis" className="textlink">
                Aller au formulaire de devis <Arrow />
              </a>
            </div>

            <figure className="split__media split__media--bleedRight">
              <img
                src={img(shots.vanMountains, 1200, 930)}
                alt="Un utilitaire blanc à l’arrêt sur une route de montagne"
                loading="lazy"
              />
              <figcaption className="split__caption">Flotte utilitaire aménagée</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------- ADVANTAGES ------------------------------------------ */}
      <section className="ink-block sec--lopsided-alt">
        <div className="shell">
          <SectionHead
            index="02"
            eyebrow="Les avantages"
            title="Ce que la location vous évite."
            meta="Quatre postes que vous ne portez plus : l’achat, l’équipement, l’entretien et l’immobilisation."
          />
          <div className="steps">
            {proAdvantages.map((a) => (
              <Reveal className="step" key={a.n} delay={Number(a.n) * 60}>
                <span className="step__n">{a.n}</span>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </Reveal>
            ))}
          </div>

          <ul className="exclusions" style={{ marginTop: 'clamp(40px, 5vw, 72px)' }}>
            <li>
              <strong>Pas de catalogue</strong>
              Les véhicules professionnels ne figurent pas dans « Notre flotte ».
            </li>
            <li>
              <strong>Pas de prix affiché</strong>
              Le tarif dépend du volume, de la durée, de la zone et des équipements.
            </li>
            <li>
              <strong>Pas de calendrier</strong>
              La mise à disposition se planifie avec vous, après acceptation du devis.
            </li>
            <li>
              <strong>Pas de réservation directe</strong>
              Ce parcours produit une demande qualifiée, pas une location instantanée.
            </li>
          </ul>
        </div>
      </section>

      {/* ---------- GALLERY --------------------------------------------- */}
      <section className="sec--2">
        <div className="shell">
          <SectionHead
            index="03"
            eyebrow="En exploitation"
            title="Le matériel, tel qu’il travaille."
            meta="Photos de nos véhicules et de nos équipes en intervention. Aucune mise en scène de studio."
          />
        </div>
        <div className="progallery">
          <figure>
            <img
              src={img(shots.washFoamHand, 1100, 1100)}
              alt="Un opérateur passe la mousse sur une carrosserie"
              loading="lazy"
            />
          </figure>
          <figure>
            <img
              src={img(shots.washWheel, 560, 560)}
              alt="Nettoyage détaillé d’une jante"
              loading="lazy"
            />
          </figure>
          <figure>
            <img
              src={img(shots.vanNight, 560, 560)}
              alt="Un utilitaire de service stationné de nuit"
              loading="lazy"
            />
          </figure>
          <figure>
            <img
              src={img(shots.detailInterior, 560, 560)}
              alt="Nettoyage de l’habitacle d’un véhicule"
              loading="lazy"
            />
          </figure>
          <figure>
            <img
              src={img(shots.washWhiteCar, 560, 560)}
              alt="Rinçage d’une voiture blanche"
              loading="lazy"
            />
          </figure>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------------------------------------- */}
      <section className="sec--lopsided">
        <div className="shell">
          <SectionHead
            index="04"
            eyebrow="Fonctionnement"
            title="De la demande au devis, en quatre temps."
            meta="Tout part de ce formulaire. Plus il est précis, plus le devis qui revient est juste."
          />
          <div className="steps">
            {proSteps.map((s) => (
              <div className="step" key={s.n}>
                <span className="step__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- QUOTE FORM ------------------------------------------ */}
      <section className="sec--2" id="devis" style={{ paddingBottom: 'var(--s-4)' }}>
        <div className="shell">
          <SectionHead
            index="05"
            eyebrow="Demande de devis"
            title="Décrivez votre besoin."
            meta="Aucun engagement. Le devis vous est adressé par e-mail ou depuis notre tableau de bord ; vous restez libre de l’accepter ou de le refuser."
          />

          <form onSubmit={onSubmit} noValidate style={{ maxWidth: '72rem' }}>
            <p className="eyebrow" style={{ marginBottom: 16 }}>
              Identité
            </p>
            <div className="form-grid">
              <TextField
                label="Nom et prénom"
                name="fullName"
                value={form.fullName}
                onChange={set}
                error={errors.fullName}
                required
                autoComplete="name"
              />
              <TextField
                label="Nom de l’entreprise"
                name="companyName"
                value={form.companyName}
                onChange={set}
                placeholder="Facultatif"
                autoComplete="organization"
              />
              <TextField
                label="Ville"
                name="city"
                value={form.city}
                onChange={set}
                error={errors.city}
                required
              />
              <TextField
                label="Pays"
                name="country"
                value={form.country}
                onChange={set}
                required
              />
              <TextField
                label="Téléphone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={set}
                error={errors.phone}
                required
                placeholder="+212 6 …"
                autoComplete="tel"
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
              />
            </div>

            <p className="eyebrow" style={{ margin: '38px 0 16px' }}>
              Le besoin
            </p>
            <div className="form-grid">
              <TextField
                label="Nombre de véhicules souhaité"
                name="vehicleCount"
                type="number"
                min="1"
                max="60"
                value={form.vehicleCount}
                onChange={set}
                error={errors.vehicleCount}
                required
                placeholder="Ex. 3"
              />
              <SelectField
                label="Durée de location"
                name="duration"
                value={form.duration}
                onChange={set}
                options={DURATIONS}
                required
              />
              <div className="field">
                <label htmlFor="startDate">Date de début souhaitée</label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => set('startDate', e.target.value)}
                />
              </div>
              <TextField
                label="Zone d’utilisation"
                name="zone"
                value={form.zone}
                onChange={set}
                error={errors.zone}
                required
                placeholder="Ex. Grand Casablanca, axe Rabat — Kénitra"
              />

              <RadioGroup
                legend="Véhicule avec ou sans équipements"
                name="equipped"
                value={form.equipped}
                onChange={set}
                options={['Avec équipements', 'Sans équipements', 'À définir ensemble']}
                full
              />

              <CheckGroup
                legend="Produits de lavage nécessaires"
                name="products"
                options={PRODUCTS}
                values={products}
                onToggle={toggleProduct}
                full
              />

              <RadioGroup
                legend="Besoin de livraison des véhicules"
                name="delivery"
                value={form.delivery}
                onChange={set}
                options={['Oui', 'Non', 'À étudier']}
              />
              <RadioGroup
                legend="Besoin de formation des opérateurs"
                name="training"
                value={form.training}
                onChange={set}
                options={['Oui', 'Non', 'À étudier']}
              />

              <TextArea
                label="Commentaires complémentaires"
                name="message"
                value={form.message}
                onChange={set}
                rows={5}
                placeholder="Volume de lavages visé, type de clientèle, contraintes de stationnement, services complémentaires attendus…"
              />

              <div className="field field--full">
                <label htmlFor="brief">Cahier des charges ou document</label>
                <label className="filedrop" htmlFor="brief">
                  <input
                    id="brief"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={onFile}
                    disabled={fileBusy}
                  />
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.9375rem',
                    }}
                  >
                    <Doc />
                    {fileBusy
                      ? 'Envoi en cours…'
                      : attachment?.name || 'Joindre un document — PDF ou image'}
                  </span>
                </label>
                {attachment && !fileBusy && (
                  <p className="filedrop__note">
                    Document reçu.{' '}
                    <button
                      type="button"
                      className="filedrop__remove"
                      onClick={() => setAttachment(null)}
                    >
                      Retirer
                    </button>
                  </p>
                )}
                {fileError && <p className="field__err" style={{ marginTop: 10, display: 'block' }}>{fileError}</p>}
              </div>
            </div>

            <div className="form-foot">
              <p className="form-note">
                Réponse sous 48 heures ouvrées. Pour un échange direct :{' '}
                <a href={`tel:${company.phone.replace(/\s/g, '')}`} style={{ color: 'var(--accent-on)' }}>
                  {company.phone}
                </a>
                .
              </p>
              <button type="submit" className="btn btn--accent" disabled={sending}>
                {sending ? 'Envoi en cours…' : 'Demander un devis'} <Arrow />
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}
