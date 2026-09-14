import { useState } from 'react'
import PageHead from '../components/PageHead.jsx'
import { Arrow, Check, Mail, Phone, Pin } from '../components/Icons.jsx'
import { TextField, SelectField, TextArea } from '../components/Field.jsx'
import { submitContact } from '../api/client.js'
import { company, cities } from '../data/site.js'
import { shots } from '../data/images.js'

const SUBJECTS = [
  'Une location pour particulier',
  'Un devis Car Wash professionnel',
  'Une réservation en cours',
  'Une livraison hors zone',
  'Autre demande',
]

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: cities[0],
    subject: SUBJECTS[0],
    message: '',
  })
  const [errors, setErrors] = useState({})
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  function validate() {
    const e = {}
    if (!form.name.trim()) e.name = 'Nom requis'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Adresse e-mail invalide'
    if (form.message.trim().length < 10) e.message = 'Merci de détailler un peu votre demande'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setSending(true)
    await submitContact(form)
    setSending(false)
    setSent(true)
  }

  return (
    <>
      <PageHead
        eyebrow="Contact"
        title="Une personne, pas un formulaire automatique."
        intro="Nos conseillers répondent en français, en arabe et en anglais. Pour une demande urgente, le téléphone reste le plus rapide."
        media={shots.forestLights}
        crumbs={[{ label: 'Contact' }]}
      />

      <section className="sec--2" style={{ paddingBottom: 'var(--s-4)' }}>
        <div className="shell">
          <div className="contactgrid">
            {/* -------- coordinates -------- */}
            <div>
              <div className="contactblock">
                <h3>Téléphone</h3>
                <a href={`tel:${company.phone.replace(/\s/g, '')}`}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <Phone /> {company.phone}
                  </span>
                </a>
                <a
                  href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`}
                  style={{ marginTop: 8 }}
                >
                  WhatsApp — {company.whatsapp}
                </a>
              </div>

              <div className="contactblock">
                <h3>E-mail</h3>
                <a href={`mailto:${company.email}`}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <Mail /> {company.email}
                  </span>
                </a>
              </div>

              <div className="contactblock">
                <h3>Agence principale</h3>
                <p>
                  <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ paddingTop: 3 }}>
                      <Pin />
                    </span>
                    {company.address}
                  </span>
                </p>
              </div>

              <div className="contactblock">
                <h3>Horaires</h3>
                <p>{company.hours}</p>
              </div>

              <div className="contactblock">
                <h3>Informations légales</h3>
                <p>{company.legal}</p>
                <p style={{ marginTop: 6 }}>RC Casablanca — ICE 00219{company.founded}0042</p>
              </div>
            </div>

            {/* -------- form -------- */}
            <div>
              {sent ? (
                <div className="sent">
                  <span className="sent__mark">
                    <Check />
                  </span>
                  <h2 className="h3">Message envoyé.</h2>
                  <p className="body-muted">
                    Nous revenons vers vous sous 24 heures ouvrées, à l’adresse{' '}
                    {form.email}. Pour une demande urgente, appelez le {company.phone}.
                  </p>
                </div>
              ) : (
                <form onSubmit={onSubmit} noValidate>
                  <p className="eyebrow" style={{ marginBottom: 18 }}>
                    Écrivez-nous
                  </p>
                  <div className="form-grid">
                    <TextField
                      label="Nom et prénom"
                      name="name"
                      value={form.name}
                      onChange={set}
                      error={errors.name}
                      required
                      autoComplete="name"
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
                    <TextField
                      label="Téléphone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={set}
                      placeholder="Facultatif"
                      autoComplete="tel"
                    />
                    <SelectField
                      label="Ville concernée"
                      name="city"
                      value={form.city}
                      onChange={set}
                      options={cities}
                    />
                    <SelectField
                      label="Votre demande porte sur"
                      name="subject"
                      value={form.subject}
                      onChange={set}
                      options={SUBJECTS}
                      full
                    />
                    <TextArea
                      label="Message"
                      name="message"
                      value={form.message}
                      onChange={set}
                      error={errors.message}
                      required
                      rows={6}
                      placeholder="Dates envisagées, ville, type de véhicule, ou toute autre précision utile."
                    />
                  </div>

                  <div className="form-foot">
                    <p className="form-note">
                      Vos données servent uniquement à traiter cette demande. Elles ne sont
                      ni revendues, ni utilisées à des fins publicitaires.
                    </p>
                    <button type="submit" className="btn btn--accent" disabled={sending}>
                      {sending ? 'Envoi…' : 'Envoyer le message'} <Arrow />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
