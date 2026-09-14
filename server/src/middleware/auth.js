import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { ApiError } from './error.js'

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  })
}

/** Verifies the bearer token and loads the user. Rejects deactivated accounts. */
export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null
    if (!token) throw new ApiError(401, 'Authentification requise.')

    let payload
    try {
      payload = jwt.verify(token, env.jwtSecret)
    } catch {
      throw new ApiError(401, 'Session expirée ou invalide.')
    }

    const user = await User.findById(payload.sub)
    if (!user || !user.active) throw new ApiError(401, 'Compte introuvable ou désactivé.')

    req.user = user
    next()
  } catch (err) {
    next(err)
  }
}

/** Route guard: requireRole('admin') or requireRole('admin', 'manager'). */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentification requise.'))
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Votre rôle ne permet pas cette action.'))
    }
    next()
  }
}

export const isAdmin = (user) => user?.role === 'admin'
