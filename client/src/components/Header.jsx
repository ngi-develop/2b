import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import StaggeredMenu from '../vendor/reactbits/StaggeredMenu.jsx'
import { navLinks, company } from '../data/site.js'
import { Arrow } from './Icons.jsx'

/**
 * Site header.
 *
 * The bar itself is StaggeredMenu's own header — we fill its logo slot with
 * the 2B wordmark and its action slot with the two controls the brief calls
 * for by name: "Connexion au Dashboard" and a visible "Demander une
 * réservation" button. Navigation lives entirely in the staggered panel.
 */

const socialItems = [
  { label: 'Louer une voiture', link: '/flotte' },
  { label: 'Louer un véhicule Car Wash', link: '/professionnel' },
  { label: 'Connexion Dashboard', link: '/dashboard/connexion' },
]

export default function Header() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // Lock the page behind the panel while it is open.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const items = navLinks.map((l) => ({
    label: l.label,
    link: l.to,
    ariaLabel: `Aller à ${l.label}`,
  }))

  return (
    <StaggeredMenu
      isFixed
      position="right"
      items={items}
      socialItems={socialItems}
      displaySocials
      displayItemNumbering
      socialsTitle="Accès direct"
      toggleLabels={['Menu', 'Fermer']}
      /* flat accent-to-ink prelayers; the panel itself lands on paper */
      colors={['#376bf0', '#1c1c1a']}
      accentColor="#376bf0"
      menuButtonColor="#fcfcfd"
      openMenuButtonColor="#376bf0"
      changeMenuColorOnOpen
      onMenuOpen={() => setOpen(true)}
      onMenuClose={() => setOpen(false)}
      onItemNavigate={(link) => navigate(link)}
      logo={
        <Link to="/" className="sm-brand" aria-label="2B Location, accueil">
          <span className="brandmark">
            <span className="brandmark__b">2B</span> Location
          </span>
          <span className="brandmark__sub">Maroc</span>
        </Link>
      }
      headerExtras={
        <>
          <Link
            to="/dashboard/connexion"
            className="sm-dash"
            aria-current={pathname.startsWith('/dashboard') ? 'page' : undefined}
          >
            Connexion Dashboard
          </Link>
          <Link to="/flotte" className="sm-cta">
            <span>
              Demander <span className="sm-cta-long">une réservation</span>
            </span>
            <Arrow />
          </Link>
        </>
      }
    />
  )
}

/** Exported for the footer's "appelez-nous" line to stay in one place. */
export const headerPhone = company.phone
