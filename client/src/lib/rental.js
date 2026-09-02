/** Date, pricing and availability helpers shared by fleet, detail and booking. */

export function toISODate(d) {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  return x.toISOString().slice(0, 10)
}

export function today() {
  return toISODate(new Date())
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

/** Rental days, billed inclusively of the departure day. Minimum of one. */
export function countDays(start, end) {
  if (!start || !end) return 0
  const a = new Date(`${start}T12:00:00`)
  const b = new Date(`${end}T12:00:00`)
  const diff = Math.round((b - a) / 86400000)
  return diff > 0 ? diff : 0
}

/** True when the requested window overlaps none of the vehicle's blocked ranges. */
export function isAvailable(vehicle, start, end) {
  if (!start || !end) return true
  if (!vehicle.unavailable?.length) return true
  return !vehicle.unavailable.some((r) => start <= r.to && end >= r.from)
}

/** Next date the vehicle frees up, for the "indisponible" message. */
export function nextFreeDate(vehicle, start) {
  if (!vehicle.unavailable?.length) return null
  const blocking = vehicle.unavailable
    .filter((r) => r.to >= (start || today()))
    .sort((a, b) => a.from.localeCompare(b.from))[0]
  return blocking ? addDays(blocking.to, 1) : null
}

const dh = new Intl.NumberFormat('fr-MA', {
  maximumFractionDigits: 0,
})

export function formatDH(n) {
  return `${dh.format(Math.round(n))} DH`
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Quote for a booking request. Mirrors the pricing rules in the dashboard
 * spec: price/day x days, plus per-day and flat options, minus discount.
 */
export function quote({ vehicle, start, end, options = [], optionCatalog = [] }) {
  const days = Math.max(countDays(start, end), 1)
  const base = vehicle ? vehicle.pricePerDay * days : 0

  const chosen = optionCatalog.filter((o) => options.includes(o.id))
  const optionsTotal = chosen.reduce(
    (sum, o) => sum + (o.unit === 'jour' ? o.price * days : o.price),
    0
  )

  const total = base + optionsTotal
  return {
    days,
    base,
    chosen,
    optionsTotal,
    total,
    deposit: vehicle?.deposit ?? 0,
    kmIncluded: vehicle ? vehicle.kmIncluded * days : 0,
  }
}
