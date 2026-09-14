import { isProd } from '../config/env.js'

export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message)
    this.status = status
    this.details = details
  }
}

export function notFound(_req, _res, next) {
  next(new ApiError(404, 'Ressource introuvable.'))
}

/** Single place where an exception becomes a response body. */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  let status = err.status || 500
  let message = err.message || 'Erreur serveur.'
  let details = err.details || null

  // Mongoose validation -> 422 with per-field messages.
  if (err.name === 'ValidationError') {
    status = 422
    details = Object.fromEntries(
      Object.entries(err.errors).map(([field, e]) => [field, e.message])
    )
    message = 'Certains champs sont invalides.'
  }

  // Duplicate key -> 409 naming the field that clashed.
  if (err.code === 11000) {
    status = 409
    const field = Object.keys(err.keyPattern || {})[0] || 'valeur'
    message = `Cette ${field} existe déjà.`
    details = err.keyValue || null
  }

  if (err.name === 'CastError') {
    status = 400
    message = 'Identifiant invalide.'
  }

  if (status >= 500) console.error('[error]', err)

  res.status(status).json({
    error: message,
    ...(details ? { details } : {}),
    ...(isProd || status < 500 ? {} : { stack: err.stack }),
  })
}

/** Wraps an async handler so a rejection reaches the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)
