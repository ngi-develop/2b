import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env, isProd } from './config/env.js'
import { errorHandler, notFound } from './middleware/error.js'

import publicRoutes from './routes/public.js'
import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
import vehicleRoutes from './routes/vehicles.js'
import clientRoutes from './routes/clients.js'
import reservationRoutes from './routes/reservations.js'
import planningRoutes from './routes/planning.js'
import financeRoutes from './routes/finance.js'
import maintenanceRoutes from './routes/maintenance.js'
import quoteRoutes from './routes/quoteRequests.js'
import settingsRoutes from './routes/settings.js'
import userRoutes from './routes/users.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)
  app.use(express.json({ limit: '2mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(morgan(isProd ? 'combined' : 'dev'))

  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin and tooling requests arrive without an Origin header.
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true)
        cb(new Error(`Origin non autorisée : ${origin}`))
      },
      credentials: true,
    })
  )

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, env: env.nodeEnv, time: new Date().toISOString() })
  })

  /* Public site — no authentication. Never exposes the Car Wash fleet. */
  app.use('/api', publicRoutes)

  /* Dashboard. */
  app.use('/api/auth', authRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use('/api/vehicles-admin', vehicleRoutes)
  app.use('/api/clients', clientRoutes)
  app.use('/api/reservations-admin', reservationRoutes)
  app.use('/api/planning', planningRoutes)
  app.use('/api/finance', financeRoutes)
  app.use('/api/maintenance', maintenanceRoutes)
  app.use('/api/quote-requests-admin', quoteRoutes)
  app.use('/api/settings', settingsRoutes)
  app.use('/api/users', userRoutes)

  /* ---------------------------------------------------------------
     Serve the built front end, when there is one.

     Keyed on the build existing rather than on NODE_ENV, so a local
     `npm run build` is exercised the same way production is. In dev the
     Vite server on :5173 is what you hit, and this simply does nothing.
  ---------------------------------------------------------------- */
  const here = path.dirname(fileURLToPath(import.meta.url))
  const clientDist = path.resolve(here, '../../client/dist')
  const indexHtml = path.join(clientDist, 'index.html')

  if (fs.existsSync(indexHtml)) {
    app.use(
      express.static(clientDist, {
        index: false,
        // Vite fingerprints everything under /assets, so it can be cached
        // hard; index.html must never be, or a deploy goes unnoticed.
        setHeaders(res, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          } else {
            res.setHeader('Cache-Control', 'no-cache')
          }
        },
      })
    )

    /* SPA fallback: any GET that is not an API call and not a real file
       gets index.html, so deep links like /dashboard/flotte work on a
       hard refresh. Written as middleware rather than a wildcard route —
       Express 5 routes go through path-to-regexp v8, where a bare '*' is
       no longer a valid pattern. */
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
      // Explicit: sendFile would otherwise default to max-age=0, and this
      // header is the whole reason a redeploy is picked up rather than
      // people sitting on a stale index that points at old asset hashes.
      res.sendFile(indexHtml, { headers: { 'Cache-Control': 'no-cache' } })
    })

    console.log(`[api] serving the built client from ${clientDist}`)
  } else {
    console.log('[api] no client build found — API only (run `npm run build` in client/)')
  }

  app.use(notFound)
  app.use(errorHandler)

  return app
}
