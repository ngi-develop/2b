import { Link } from 'react-router-dom'
import { Arrow } from '../components/Icons.jsx'

export default function NotFound() {
  return (
    <section className="shell notfound">
      <p className="notfound__code">404</p>
      <h1 className="h2" style={{ maxWidth: '20ch' }}>
        Cette page a pris la route sans nous.
      </h1>
      <p className="body-muted">
        Le lien est peut-être ancien, ou le véhicule que vous cherchiez n’est plus au
        catalogue. Reprenons depuis la flotte.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        <Link to="/flotte" className="btn btn--clay">
          Voir la flotte <Arrow />
        </Link>
        <Link to="/" className="btn btn--ghost" style={{ marginLeft: -1 }}>
          Accueil <Arrow />
        </Link>
      </div>
    </section>
  )
}
