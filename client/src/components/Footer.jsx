import { useState } from 'react'
import { Link } from 'react-router-dom'
import { company, cities, navLinks } from '../data/site.js'
import { Arrow } from './Icons.jsx'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)

  function subscribe(e) {
    e.preventDefault()
    if (!email.trim()) return
    setDone(true)
    setEmail('')
  }

  return (
    <footer className="ftr">
      <div className="shell">
        <div className="ftr__top">
          <div className="ftr__col ftr__brandCol">
            <p className="ftr__wordmark">
              <em>2B</em>
              <br />
              Location
            </p>
            <p className="mono-note" style={{ maxWidth: '30ch' }}>
              {company.address}
            </p>
            <p className="mono-note" style={{ marginTop: 14, maxWidth: '30ch' }}>
              {company.hours}
            </p>
          </div>

          <div className="ftr__col">
            <h4>Navigation</h4>
            <ul>
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
              <li>
                <Link to="/dashboard/connexion">Connexion Dashboard</Link>
              </li>
            </ul>
          </div>

          <div className="ftr__col">
            <h4>Zones de livraison</h4>
            <ul>
              {cities.map((c) => (
                <li key={c}>
                  <Link to="/zones">{c}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="ftr__col">
            <h4>Contact</h4>
            <ul>
              <li>
                <a href={`tel:${company.phone.replace(/\s/g, '')}`}>{company.phone}</a>
              </li>
              <li>
                <a href={`https://wa.me/${company.whatsapp.replace(/[^0-9]/g, '')}`}>
                  WhatsApp {company.whatsapp}
                </a>
              </li>
              <li>
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </li>
            </ul>
            <h4 style={{ marginTop: 30 }}>Deux parcours</h4>
            <ul>
              <li>
                <Link to="/flotte">Louer une voiture</Link>
              </li>
              <li>
                <Link to="/professionnel">Louer un véhicule Car Wash</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="ftr__news">
          <div>
            <h3 className="h3">Disponibilités, nouveaux véhicules et tarifs saisonniers.</h3>
            <p className="mono-note" style={{ marginTop: 12 }}>
              Une lettre courte, une fois par mois. Aucune revente de données.
            </p>
          </div>
          {done ? (
            <p className="mono-note" style={{ color: 'var(--clay)' }}>
              Inscription enregistrée. À très vite.
            </p>
          ) : (
            <form onSubmit={subscribe} style={{ display: 'flex' }}>
              <label htmlFor="ftr-email" className="sr-only">
                Votre adresse e-mail
              </label>
              <input
                id="ftr-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom@exemple.ma"
                style={{
                  flex: '1 1 auto',
                  background: 'transparent',
                  border: '1px solid var(--line-dark)',
                  borderRight: 0,
                  color: 'var(--paper)',
                  padding: '16px 18px',
                  minWidth: 0,
                }}
              />
              <button type="submit" className="btn btn--clay">
                S’inscrire <Arrow />
              </button>
            </form>
          )}
        </div>

        <div className="ftr__bottom">
          <span>
            © {new Date().getFullYear()} {company.legal}. Tous droits réservés.
          </span>
          <div className="ftr__legal">
            <Link to="/faq">Conditions de location</Link>
            <Link to="/faq">Politique de confidentialité</Link>
            <Link to="/contact">Mentions légales</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
