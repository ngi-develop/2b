import { ApiError } from './error.js'

/**
 * A small fixed-window limiter, in memory.
 *
 * Enough for the single-instance deployment this ships as, and it exists for
 * one reason: the public quote form can upload a file without authenticating,
 * and an open write endpoint will eventually be found. Behind more than one
 * instance this needs to move to Redis — it counts per process.
 */
export function rateLimit({ windowMs = 60_000, max = 10, message } = {}) {
  const hits = new Map()

  // Drop expired buckets periodically so the map cannot grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of hits) {
      if (bucket.resetAt <= now) hits.delete(key)
    }
  }, windowMs)
  sweep.unref?.()

  return (req, _res, next) => {
    const key = req.ip || 'unknown'
    const now = Date.now()
    const bucket = hits.get(key)

    if (!bucket || bucket.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    bucket.count += 1
    if (bucket.count > max) {
      const seconds = Math.ceil((bucket.resetAt - now) / 1000)
      return next(
        new ApiError(429, message || `Trop de requêtes. Réessayez dans ${seconds} secondes.`)
      )
    }
    next()
  }
}
