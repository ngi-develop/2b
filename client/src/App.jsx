import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

/* --- public site (eager: this is what visitors come for) --- */
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Fleet from './pages/Fleet.jsx'
import VehicleDetail from './pages/VehicleDetail.jsx'
import Reservation from './pages/Reservation.jsx'
import Pro from './pages/Pro.jsx'
import About from './pages/About.jsx'
import Zones from './pages/Zones.jsx'
import Faq from './pages/Faq.jsx'
import Contact from './pages/Contact.jsx'
import DashboardLogin from './pages/DashboardLogin.jsx'
import NotFound from './pages/NotFound.jsx'

import RequireAuth from './dashboard/RequireAuth.jsx'

/* --- dashboard (lazy: an internal tool no visitor should have to download) --- */
const DashboardLayout = lazy(() => import('./dashboard/DashboardLayout.jsx'))
const Overview = lazy(() => import('./dashboard/pages/Overview.jsx'))
const Planning = lazy(() => import('./dashboard/pages/Planning.jsx'))
const Reservations = lazy(() => import('./dashboard/pages/Reservations.jsx'))
const ReservationDetail = lazy(() => import('./dashboard/pages/ReservationDetail.jsx'))
const ReservationNew = lazy(() => import('./dashboard/pages/ReservationNew.jsx'))
const DashFleet = lazy(() => import('./dashboard/pages/Fleet.jsx'))
const VehicleFile = lazy(() => import('./dashboard/pages/VehicleFile.jsx'))
const Clients = lazy(() => import('./dashboard/pages/Clients.jsx'))
const ClientFile = lazy(() => import('./dashboard/pages/ClientFile.jsx'))
const Finances = lazy(() => import('./dashboard/pages/Finances.jsx'))
const Maintenance = lazy(() => import('./dashboard/pages/Maintenance.jsx'))
const QuoteRequests = lazy(() => import('./dashboard/pages/QuoteRequests.jsx'))
const Settings = lazy(() => import('./dashboard/pages/Settings.jsx'))

function DashFallback() {
  return (
    <div className="dash" style={{ padding: 34 }}>
      <p className="loading">Chargement du tableau de bord…</p>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing site */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="flotte" element={<Fleet />} />
        <Route path="flotte/:slug" element={<VehicleDetail />} />
        <Route path="reservation/:slug" element={<Reservation />} />
        <Route path="professionnel" element={<Pro />} />
        <Route path="a-propos" element={<About />} />
        <Route path="zones" element={<Zones />} />
        <Route path="faq" element={<Faq />} />
        <Route path="contact" element={<Contact />} />
        <Route path="dashboard/connexion" element={<DashboardLogin />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Company dashboard — its own shell, behind authentication */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Suspense fallback={<DashFallback />}>
              <DashboardLayout />
            </Suspense>
          </RequireAuth>
        }
      >
        <Route index element={<Lazy><Overview /></Lazy>} />
        <Route path="planning" element={<Lazy><Planning /></Lazy>} />
        <Route path="reservations" element={<Lazy><Reservations /></Lazy>} />
        <Route path="reservations/nouvelle" element={<Lazy><ReservationNew /></Lazy>} />
        <Route path="reservations/:id" element={<Lazy><ReservationDetail /></Lazy>} />
        <Route path="flotte" element={<Lazy><DashFleet /></Lazy>} />
        <Route path="flotte/:id" element={<Lazy><VehicleFile /></Lazy>} />
        <Route path="clients" element={<Lazy><Clients /></Lazy>} />
        <Route path="clients/:id" element={<Lazy><ClientFile /></Lazy>} />
        <Route path="finances" element={<Lazy><Finances /></Lazy>} />
        <Route path="echeances" element={<Lazy><Maintenance /></Lazy>} />
        <Route path="devis" element={<Lazy><QuoteRequests /></Lazy>} />
        <Route path="parametres" element={<Lazy><Settings /></Lazy>} />
      </Route>
    </Routes>
  )
}

function Lazy({ children }) {
  return <Suspense fallback={<p className="loading">Chargement…</p>}>{children}</Suspense>
}
