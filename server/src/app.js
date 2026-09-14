import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
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

  app.use(notFound)
  app.use(errorHandler)

  return app
}
