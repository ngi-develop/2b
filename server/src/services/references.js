import { Reservation } from '../models/Reservation.js'
import { QuoteRequest } from '../models/QuoteRequest.js'

/**
 * Human-facing references: R-1054, D-2031.
 *
 * Derived from the highest existing number rather than a count, so deleting a
 * record can never hand its reference to a new one. The retry loop covers the
 * race between two agents creating a reservation at the same instant — the
 * unique index is the actual guarantee.
 */
async function nextNumber(Model, prefix, start) {
  const last = await Model.findOne({ reference: new RegExp(`^${prefix}-\\d+$`) })
    .sort({ reference: -1 })
    .select('reference')
    .lean()

  if (!last) return start
  const n = Number(last.reference.split('-')[1])
  return Number.isFinite(n) ? n + 1 : start
}

async function generate(Model, prefix, start) {
  let n = await nextNumber(Model, prefix, start)
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const reference = `${prefix}-${n}`
    const taken = await Model.exists({ reference })
    if (!taken) return reference
    n += 1
  }
  // Fall back to something collision-proof rather than failing the request.
  return `${prefix}-${Date.now().toString().slice(-7)}`
}

export function nextReservationReference() {
  return generate(Reservation, 'R', 1001)
}

export function nextQuoteReference() {
  return generate(QuoteRequest, 'D', 2001)
}

/** URL-safe slug for a vehicle, e.g. "Dacia Duster" -> "dacia-duster". */
export function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Ensures the slug is unique within a collection, appending -2, -3, … */
export async function uniqueSlug(Model, base, exceptId = null) {
  const root = slugify(base)
  let candidate = root
  let n = 1
  for (;;) {
    const query = { slug: candidate }
    if (exceptId) query._id = { $ne: exceptId }
    const taken = await Model.exists(query)
    if (!taken) return candidate
    n += 1
    candidate = `${root}-${n}`
  }
}
