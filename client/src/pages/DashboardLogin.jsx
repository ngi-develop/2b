import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Arrow, Shield } from '../components/Icons.jsx'
import { img, shots } from '../data/images.js'
import { company } from '../data/site.js'

/**
 * Dashboard sign-in.
 *
 * Front end only for now — it validates the fields and shows what the server
 * will answer. Authentication itself belongs to the Express/JWT layer, which
 * is why nothing here pretends to check a credential.
 */
export default function DashboardLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function onSubmit(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      setError('Identifiants incomplets. Vérifiez l’adresse e-mail et le mot de passe.')
      return
    }
    setError('')
    setBusy(true)
    // Placeholder for POST /api/auth/login
    setTimeout(() => {
      setBusy(false)
      setError(
        'Authentification indisponible : le service back-end n’est pas encore connecté.'
      )
    }, 700)
  }

  return (
    <div className="login">
      <div className="login__panel">
        <p className="eyebrow" style={{ marginBottom: 20 }}>
          <span className="index-mark">2B</span>&nbsp;&nbsp;Espace entreprise
        </p>
        <h1 className="h1" style={{ marginBottom: 22, maxWidth: '14ch' }}>
          Connexion au tableau de bord.
        </h1>
        <p className="body-muted" style={{ marginBottom: 36, maxWidth: '44ch' }}>
          Réservé aux équipes {company.legal}. Planning, réservations, flotte, clients,
          finances et échéances.
        </p>

        <form onSubmit={onSubmit} noValidate>
          <div className="form-grid">
            <div className="field field--full">
              <label htmlFor="login-email">
                Adresse e-mail<span aria-hidden="true">*</span>
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                placeholder="prenom@2blocation.ma"
                required
              />
            </div>
            <div className="field field--full">
              <label htmlFor="login-password">
                Mot de passe<span aria-hidden="true">*</span>
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {error && (
            <p className="notice" style={{ marginTop: 22 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn--clay btn--wide"
            style={{ marginTop: 26 }}
            disabled={busy}
          >
            {busy ? 'Connexion…' : 'Se connecter'} <Arrow />
          </button>
        </form>

        <p
          className="mono-note"
          style={{ marginTop: 26, display: 'flex', gap: 10, alignItems: 'flex-start' }}
        >
          <span style={{ paddingTop: 2 }}>
            <Shield />
          </span>
          Toutes les actions sont journalisées. Un accès oublié se réinitialise auprès de
          l’administrateur, jamais par e-mail automatique.
        </p>

        <Link to="/" className="textlink" style={{ marginTop: 34, alignSelf: 'flex-start' }}>
          Retour au site public <Arrow />
        </Link>
      </div>

      <div className="login__media">
        <img
          src={img(shots.sClassStreet, 1200, 1400)}
          alt="Berline sombre photographiée en ville"
        />
        <div className="login__mediaText">
          <p className="h3" style={{ maxWidth: '18ch' }}>
            Une donnée saisie une fois alimente tous les modules.
          </p>
          <p className="mono-note" style={{ color: 'rgba(239,237,231,.7)', marginTop: 14 }}>
            Tableau de bord — Planning — Réservations — Flotte — Clients — Finances —
            Échéances
          </p>
        </div>
      </div>
    </div>
  )
}
