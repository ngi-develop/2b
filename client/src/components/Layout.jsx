import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header.jsx'
import Footer from './Footer.jsx'

export default function Layout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  const flush = pathname === '/'

  return (
    <>
      <a className="skip-link" href="#main">
        Aller au contenu principal
      </a>
      {/* Fixed bar + staggered panel; it takes no space in the flow, so
          <main> reserves the bar's height itself — except on the home page,
          where the ink hero runs underneath the (also ink) bar to give the
          ScrollExpand stage a full viewport height to work with. */}
      <Header />
      <main id="main" className={`page-main${flush ? ' page-main--flush' : ''}`}>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}
