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
  }

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
