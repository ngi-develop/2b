import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

/**
 * Dashboard shell.
 *
 * The rail follows the eight sections of the brief, in its order:
 * tableau de bord, planning, réservations, flotte, clients, finances,
 * échéances, paramètres — plus the Car Wash enquiry inbox, which is the
 * only place the professional track surfaces internally.
 */

const NAV = [
  {
    section: 'Exploitation',
    items: [
      { to: '/dashboard', end: true, label: 'Tableau de bord' },
      { to: '/dashboard/planning', label: 'Planning' },
      { to: '/dashboard/reservations', label: 'Réservations' },
      { to: '/dashboard/flotte', label: 'Flotte' },
      { to: '/dashboard/clients', label: 'Clients' },
    ],
  },
  {
    section: 'Gestion',
    items: [
      { to: '/dashboard/finances', label: 'Finances' },
      { to: '/dashboard/echeances', label: 'Échéances & maintenance' },
      { to: '/dashboard/devis', label: 'Demandes Car Wash' },
    ],
  },
  {
    section: 'Configuration',
    items: [{ to: '/dashboard/parametres', label: 'Paramètres' }],
  },
]

export default function DashboardLayout() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [railOpen, setRailOpen] = useState(false)

  useEffect(() => setRailOpen(false), [pathname])

  return (
    <div className="dash">
      <div className="dash__body">
        {railOpen && <div className="dash__scrim" onClick={() => setRailOpen(false)} />}

        <aside className={`rail${railOpen ? ' is-open' : ''}`}>
          <div className="rail__brand">
            <span className="brandmark">
              <span className="brandmark__b">2B</span> Location
            </span>
            <span className="rail__tag">Admin</span>
          </div>

          <nav className="rail__nav" aria-label="Navigation du tableau de bord">
            {NAV.map((group) => (
              <div key={group.section}>
                <p className="rail__section">{group.section}</p>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `rail__link${isActive ? ' is-active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="rail__foot">
            <p className="rail__user">
              <strong>
                {user?.firstName} {user?.lastName}
              </strong>
              <span>{user?.role}</span>
            </p>
            <Link to="/" className="rail__signout" style={{ textDecoration: 'none' }}>
              Voir le site public
            </Link>
            <button type="button" className="rail__signout" onClick={signOut}>
              Se déconnecter
            </button>
          </div>
        </aside>

        <div className="dash__main">
          <Outlet context={{ openRail: () => setRailOpen(true) }} />
        </div>
      </div>
    </div>
  )
}

/** Sticky page header used by every dashboard screen. */
export function PageBar({ title, crumb, children }) {
  return (
    <header className="dash__bar">
      <button
        type="button"
        className="dash__burger"
        aria-label="Ouvrir le menu"
        onClick={() => document.querySelector('.rail')?.classList.add('is-open')}
      >
        <span style={{ display: 'grid', gap: 3 }}>
          <i style={{ display: 'block', width: 16, height: 1.5, background: 'currentColor' }} />
          <i style={{ display: 'block', width: 16, height: 1.5, background: 'currentColor' }} />
          <i style={{ display: 'block', width: 16, height: 1.5, background: 'currentColor' }} />
        </span>
      </button>
      <h1 className="dash__title">{title}</h1>
      {crumb && <span className="dash__breadcrumb">{crumb}</span>}
      <div className="dash__barRight">{children}</div>
    </header>
  )
}
