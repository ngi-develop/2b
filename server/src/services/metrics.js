import { Reservation } from '../models/Reservation.js'
import { Vehicle } from '../models/Vehicle.js'
import { Charge } from '../models/Charge.js'
import { Maintenance } from '../models/Maintenance.js'
import { VEHICLE_STATUS } from '../models/constants.js'

const DAY_MS = 86400000

/* ---------------------------------------------------------------- dates -- */

export function startOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfDay(d = new Date()) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function startOfWeek(d = new Date()) {
  const x = startOfDay(d)
  const day = (x.getDay() + 6) % 7 // Monday-first
  x.setDate(x.getDate() - day)
  return x
}

export function startOfMonth(d = new Date()) {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

export function startOfYear(d = new Date()) {
  const x = startOfMonth(d)
  x.setMonth(0)
  return x
}

export function addMonths(d, n) {
  const x = new Date(d)
  x.setMonth(x.getMonth() + n)
  return x
}

/* ------------------------------------------------------------- revenue --- */

/**
 * Turnover for a window.
 *
 * A rental is counted on its departure date — the moment the contract is
 * committed — and cancellations never count. `encaissements` is separate
 * because money booked and money received are different questions, and the
 * brief asks for both.
 */
export async function revenueBetween(from, to) {
  const [booked] = await Reservation.aggregate([
    {
      $match: {
        status: { $ne: 'annulee' },
        startDate: { $gte: from, $lte: to },
      },
    },
    { $group: { _id: null, total: { $sum: '$totals.total' }, count: { $sum: 1 } } },
  ])

  const [cashed] = await Reservation.aggregate([
    { $match: { status: { $ne: 'annulee' } } },
    { $unwind: '$payments' },
    { $match: { 'payments.date': { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: '$payments.amount' } } },
  ])

  return {
    revenue: booked?.total || 0,
    rentals: booked?.count || 0,
    cashed: cashed?.total || 0,
  }
}

export async function chargesBetween(from, to) {
  const [row] = await Charge.aggregate([
    { $match: { date: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ])
  return row?.total || 0
}

/**
 * Money actually owed to the company.
 *
 * Only rentals that have started count: the balance on a booking that departs
 * next month is not a receivable, it is unearned revenue, and folding it in
 * here would inflate "à recevoir" well past the turnover that produced it.
 */
export async function receivableTotal() {
  const [row] = await Reservation.aggregate([
    { $match: { status: { $in: ['en_cours', 'terminee'] } } },
    { $group: { _id: null, total: { $sum: '$totals.balance' } } },
  ])
  return Math.max(row?.total || 0, 0)
}

/** Turnover already committed for future departures. */
export async function futureBookedRevenue(from = new Date()) {
  const [row] = await Reservation.aggregate([
    { $match: { status: 'confirmee', startDate: { $gt: from } } },
    { $group: { _id: null, total: { $sum: '$totals.total' }, count: { $sum: 1 } } },
  ])
  return { total: row?.total || 0, count: row?.count || 0 }
}

/* ----------------------------------------------------------------- fleet -- */

export async function fleetCounts() {
  const rows = await Vehicle.aggregate([
    { $match: { fleetType: 'tourisme' } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const byStatus = Object.fromEntries(VEHICLE_STATUS.map((s) => [s, 0]))
  let total = 0
  for (const r of rows) {
    byStatus[r._id] = r.count
    total += r.count
  }
  return { total, ...byStatus }
}

/**
 * Occupancy = rented vehicle-days ÷ available vehicle-days over the window.
 * Rental days are clipped to the window so a long rental spanning the edge
 * only contributes the part that falls inside it.
 */
export async function occupancyRate(from, to) {
  const fleetSize = await Vehicle.countDocuments({
    fleetType: 'tourisme',
    status: { $nin: ['immobilise'] },
  })
  if (!fleetSize) return 0

  const windowDays = Math.max(Math.round((to - from) / DAY_MS), 1)

  const rentals = await Reservation.find({
    status: { $in: ['confirmee', 'en_cours', 'terminee'] },
    startDate: { $lt: to },
    endDate: { $gt: from },
  })
    .select('startDate endDate')
    .lean()

  const rentedDays = rentals.reduce((sum, r) => {
    const s = r.startDate < from ? from : r.startDate
    const e = r.endDate > to ? to : r.endDate
    return sum + Math.max(Math.round((e - s) / DAY_MS), 0)
  }, 0)

  return Math.min(Math.round((rentedDays / (fleetSize * windowDays)) * 100), 100)
}

/* --------------------------------------------------------- profitability -- */

/**
 * Per-vehicle P&L: turnover from its rentals minus charges booked against it.
 * This is the comparison table in Finances → Rentabilité par véhicule.
 */
export async function vehicleProfitability(from, to) {
  const [vehicles, revenueRows, chargeRows] = await Promise.all([
    Vehicle.find({ fleetType: 'tourisme' })
      .select('brand model plate status mileage image category pricePerDay')
      .lean(),
    Reservation.aggregate([
      { $match: { status: { $ne: 'annulee' }, startDate: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: '$vehicle',
          revenue: { $sum: '$totals.total' },
          rentals: { $sum: 1 },
          days: { $sum: '$totals.days' },
        },
      },
    ]),
    Charge.aggregate([
      { $match: { scope: 'vehicle', date: { $gte: from, $lte: to } } },
      { $group: { _id: '$vehicle', charges: { $sum: '$amount' } } },
    ]),
  ])

  const revenueBy = new Map(revenueRows.map((r) => [String(r._id), r]))
  const chargesBy = new Map(chargeRows.map((r) => [String(r._id), r.charges]))
  const windowDays = Math.max(Math.round((to - from) / DAY_MS), 1)

  return vehicles
    .map((v) => {
      const rev = revenueBy.get(String(v._id))
      const revenue = rev?.revenue || 0
      const charges = chargesBy.get(String(v._id)) || 0
      const days = rev?.days || 0
      return {
        ...v,
        revenue,
        charges,
        result: revenue - charges,
        rentals: rev?.rentals || 0,
        rentedDays: days,
        occupancy: Math.min(Math.round((days / windowDays) * 100), 100),
      }
    })
    .sort((a, b) => b.result - a.result)
}

/* ------------------------------------------------------------ operations -- */

export async function departuresOn(day = new Date()) {
  return Reservation.find({
    status: { $in: ['confirmee', 'en_cours'] },
    startDate: { $gte: startOfDay(day), $lte: endOfDay(day) },
  })
    .populate('client', 'firstName lastName phone status')
    .populate('vehicle', 'brand model plate')
    .sort({ startDate: 1 })
    .lean()
}

export async function returnsOn(day = new Date()) {
  return Reservation.find({
    status: { $in: ['confirmee', 'en_cours'] },
    endDate: { $gte: startOfDay(day), $lte: endOfDay(day) },
  })
    .populate('client', 'firstName lastName phone status')
    .populate('vehicle', 'brand model plate')
    .sort({ endDate: 1 })
    .lean()
}

export async function pendingRequests() {
  return Reservation.find({ status: 'demande' })
    .populate('client', 'firstName lastName phone status')
    .populate('vehicle', 'brand model plate')
    .sort({ createdAt: -1 })
    .lean()
}

export async function unpaidReservations() {
  return Reservation.find({
    status: { $in: ['en_cours', 'terminee'] },
    'totals.balance': { $gt: 0 },
  })
    .populate('client', 'firstName lastName phone')
    .populate('vehicle', 'brand model plate')
    .sort({ 'totals.balance': -1 })
    .limit(20)
    .lean()
}

/** Finished rentals whose deposit has not been handed back yet. */
export async function depositsToReturn() {
  return Reservation.find({
    status: 'terminee',
    depositReceived: { $gt: 0 },
    depositReturnedAt: { $exists: false },
  })
    .populate('client', 'firstName lastName phone')
    .populate('vehicle', 'brand model plate')
    .sort({ updatedAt: 1 })
    .lean()
}

/* ---------------------------------------------------------------- alerts -- */

/**
 * The "Alertes prioritaires" block: everything needing attention, from any
 * module, ranked by urgency. Each row carries the link target so a click
 * opens the right file.
 */
export async function priorityAlerts({ withinDays = 30 } = {}) {
  const now = new Date()
  const horizon = new Date(now.getTime() + withinDays * DAY_MS)

  const [due, vehicles, returnsToday, unpaid] = await Promise.all([
    Maintenance.find({
      status: { $nin: ['faite'] },
      $or: [{ dueDate: { $lte: horizon } }, { dueMileage: { $exists: true } }],
    })
      .populate('vehicle', 'brand model plate mileage')
      .lean(),
    Vehicle.find({ fleetType: 'tourisme' }).select('mileage').lean(),
    returnsOn(now),
    unpaidReservations(),
  ])

  const mileageBy = new Map(vehicles.map((v) => [String(v._id), v.mileage]))
  const alerts = []

  for (const m of due) {
    if (!m.vehicle) continue
    const label = `${m.vehicle.brand} ${m.vehicle.model}`
    const days = m.dueDate ? Math.ceil((new Date(m.dueDate) - now) / DAY_MS) : null
    const km =
      typeof m.dueMileage === 'number'
        ? m.dueMileage - (mileageBy.get(String(m.vehicle._id)) ?? m.vehicle.mileage ?? 0)
        : null

    // Only surface a mileage-based job once it is close enough to matter.
    if (days === null && (km === null || km > 2000)) continue
    if (days !== null && days > withinDays) continue

    const severity = (days !== null && days <= 7) || (km !== null && km <= 500) ? 'high' : 'medium'
    const when =
      days !== null
        ? days < 0
          ? `en retard de ${Math.abs(days)} j`
          : `dans ${days} j`
        : `dans ${km} km`

    alerts.push({
      kind: 'maintenance',
      severity: days !== null && days < 0 ? 'high' : severity,
      title: `${m.label} ${label}`,
      detail: when,
      link: `/dashboard/echeances`,
      entityId: String(m._id),
    })
  }

  for (const r of returnsToday) {
    alerts.push({
      kind: 'retour',
      severity: 'medium',
      title: `Retour ${r.vehicle?.brand} ${r.vehicle?.model}`,
      detail: `prévu aujourd’hui — ${r.client?.firstName || r.requester?.firstName || ''} ${
        r.client?.lastName || r.requester?.lastName || ''
      }`.trim(),
      link: `/dashboard/reservations/${r._id}`,
      entityId: String(r._id),
    })
  }

  for (const r of unpaid.slice(0, 6)) {
    alerts.push({
      kind: 'paiement',
      severity: r.totals.balance > 3000 ? 'high' : 'medium',
      title: `${r.client?.firstName || ''} ${r.client?.lastName || ''}`.trim() || r.reference,
      detail: `${Math.round(r.totals.balance)} DH restant à payer`,
      link: `/dashboard/reservations/${r._id}`,
      entityId: String(r._id),
    })
  }

  const rank = { high: 0, medium: 1, low: 2 }
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 12)
}

/* ------------------------------------------------------------- dashboard -- */

/** Everything the Tableau de bord needs, in one round trip. */
export async function dashboardSummary() {
  const now = new Date()
  const today = { from: startOfDay(now), to: endOfDay(now) }
  const week = { from: startOfWeek(now), to: endOfDay(now) }
  const month = { from: startOfMonth(now), to: endOfDay(now) }
  const year = { from: startOfYear(now), to: endOfDay(now) }

  const [
    dayRev,
    weekRev,
    monthRev,
    yearRev,
    monthCharges,
    receivable,
    future,
    fleet,
    occupancy,
    departures,
    returns,
    requests,
    unpaid,
    deposits,
    alerts,
    profitability,
  ] = await Promise.all([
    revenueBetween(today.from, today.to),
    revenueBetween(week.from, week.to),
    revenueBetween(month.from, month.to),
    revenueBetween(year.from, year.to),
    chargesBetween(month.from, month.to),
    receivableTotal(),
    futureBookedRevenue(now),
    fleetCounts(),
    occupancyRate(month.from, endOfDay(now)),
    departuresOn(now),
    returnsOn(now),
    pendingRequests(),
    unpaidReservations(),
    depositsToReturn(),
    priorityAlerts(),
    vehicleProfitability(month.from, month.to),
  ])

  return {
    generatedAt: now,
    revenue: {
      day: dayRev.revenue,
      week: weekRev.revenue,
      month: monthRev.revenue,
      year: yearRev.revenue,
      cashedThisMonth: monthRev.cashed,
    },
    charges: { month: monthCharges },
    result: { month: monthRev.revenue - monthCharges },
    receivable,
    futureBooked: future,
    fleet,
    occupancy,
    today: {
      departures,
      returns,
    },
    queues: {
      requests,
      unpaid,
      deposits,
    },
    alerts,
    topVehicles: profitability.slice(0, 5),
    bottomVehicles: profitability.slice(-5).reverse(),
  }
}
