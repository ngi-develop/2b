import mongoose from 'mongoose'
import { env, isProd } from './env.js'

let memoryServer = null

/**
 * Connects to MongoDB.
 *
 * With MONGODB_URI set, that is used. Without it — development only — an
 * in-memory MongoDB is started so the API runs with no local install and no
 * Docker. That database is wiped on every restart, which is why production
 * refuses to boot without a real URI (see config/env.js).
 */
export async function connectDB() {
  mongoose.set('strictQuery', true)

  let uri = env.mongoUri

  if (!uri) {
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memoryServer = await MongoMemoryServer.create()
    uri = memoryServer.getUri('2b_location')
    console.warn('[db] no MONGODB_URI — started an in-memory MongoDB (data is not persisted)')
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  console.log(`[db] connected: ${mongoose.connection.name}`)
  return mongoose.connection
}

export async function disconnectDB() {
  await mongoose.connection.close()
  if (memoryServer) await memoryServer.stop()
}

export function isMemoryDB() {
  return Boolean(memoryServer)
}

export { isProd }
