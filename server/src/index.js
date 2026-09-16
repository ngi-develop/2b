import mongoose from 'mongoose'
import { createApp } from './app.js'
import { connectDB, disconnectDB, isMemoryDB } from './config/db.js'
import { env } from './config/env.js'

async function main() {
  await connectDB()

  /* The in-memory database starts empty and dies with the process, so a
     separate `npm run seed` run would have nothing to seed. Populate it here
     instead — `npm run dev` then works with no MongoDB and no Docker. */
  if (isMemoryDB()) {
    const { seedDatabase } = await import('./seed/seed.js')
    await seedDatabase()
  } else if (env.autoSeed) {
    /* First boot against a real database: create the administrator, the
       settings document and the catalogue if they are not there yet.
       --catalogue mode is idempotent and never touches clients, reservations
       or accounting, so this is safe to run on every start — and it means a
       fresh deployment comes up with a site that has cars on it instead of an
       empty one waiting for someone to remember the seed command. */
    const { seedDatabase } = await import('./seed/seed.js')
    try {
      const result = await seedDatabase({ catalogueOnly: true })
      if (result.unchanged) console.log('[api] catalogue already present — nothing seeded')
      else console.log(`[api] catalogue seeded (${result.vehicles} véhicules)`)
    } catch (err) {
      /* A seed failure must not stop an otherwise healthy API from serving. */
      console.error('[api] bootstrap seed failed:', err.message)
    }
  }

  /* Housekeeping for the file store. The public quote form can write bytes
     without a login, so unattached files are swept once a day — see
     services/sweepUploads.js for why the grace period matters. */
  const { startUploadSweeper } = await import('./services/sweepUploads.js')
  startUploadSweeper()

  const app = createApp()
  const server = app.listen(env.port, () => {
    console.log(`[api] http://localhost:${env.port} (${env.nodeEnv})`)
    if (isMemoryDB()) {
      console.log('[api] in-memory database, seeded — set MONGODB_URI to persist data')
    }
  })

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} — shutting down`)
    server.close(async () => {
      await disconnectDB()
      process.exit(0)
    })
    // Don't hang forever on a stuck connection.
    setTimeout(() => process.exit(1), 8000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main().catch(async (err) => {
  console.error('[api] failed to start:', err)
  await mongoose.connection.close().catch(() => {})
  process.exit(1)
})
