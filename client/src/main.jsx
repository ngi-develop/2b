import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

/* Import order matters, and ES imports evaluate top to bottom — so the
   stylesheets are pulled in before App, whose module graph would otherwise
   drag the vendored CSS in first. Order: tokens, base layer, components,
   vendored React Bits, then our overrides, which must win over the vendor
   defaults (radius, gradients, centred type). */
import './styles/tokens.css'
import './styles/base.css'
import './styles/layout.css'
import './styles/ui.css'
import './styles/pages.css'
import './vendor/reactbits/ScrollExpand.css'
import './vendor/reactbits/StaggeredMenu.css'
import './styles/reactbits-overrides.css'
import './styles/dashboard.css'

import App from './App.jsx'
import { AuthProvider } from './dashboard/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
