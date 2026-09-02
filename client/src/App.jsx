import { Route, Routes } from 'react-router-dom'
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

export default function App() {
  return (
    <Routes>
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
    </Routes>
  )
}
