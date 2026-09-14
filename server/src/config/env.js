import dotenv from 'dotenv'

dotenv.config()

const DEV_SECRET = 'dev-only-insecure-secret'

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || DEV_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@2blocation.ma',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'Change-me-2026',
}

export const isProd = env.nodeEnv === 'production'

/** A deployment that signs tokens with the shipped dev secret is not a
 *  deployment. Fail at boot rather than quietly issuing forgeable tokens. */
if (isProd && env.jwtSecret === DEV_SECRET) {
  throw new Error('JWT_SECRET must be set when NODE_ENV=production')
}
if (isProd && !env.mongoUri) {
  throw new Error('MONGODB_URI must be set when NODE_ENV=production')
}
