import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

/** Gate for every /dashboard route except the login screen. */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="dash-login">
        <p style={{ color: 'var(--paper)', fontSize: '0.875rem' }}>Vérification de la session…</p>
      </div>
    )
  }

  if (!user) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/dashboard/connexion" state={{ from: location.pathname }} replace />
  }

  return children
}
