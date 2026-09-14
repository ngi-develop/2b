import { Reservation } from '../models/Reservation.js'
import { Maintenance } from '../models/Maintenance.js'
import { BLOCKING_STATUSES } from '../models/constants.js'

/**
 * Availability is derived, never stored.
 *
 * Two windows overlap when each starts before the other ends. A vehicle
 * returned on the 23rd can go out again on the 23rd, so the comparison is
 * strict at the touching edges.
 */
export function overlapQuery(start, end) {
  return { startDate: { $lt: end }, endDate: { $gt: start } }
}

/**
 * Reservations that would clash with the given window.
 * `exceptId` lets a reservation be edited without colliding with itself.
 */
export async function findConflicts({ vehicleId, start, end, exceptId = null }) {
  const query = {
    vehicle: vehicleId,
    status: { $in: BLOCKING_STATUSES },
    ...overlapQuery(start, end),
  }
  if (exceptId) query._id = { $ne: exceptId }

  return Reservation.find(query).populate('client', 'firstName lastName phone').lean()
}

export async function isVehicleFree({ vehicleId, start, end, exceptId = null }) {
  const conflicts = await findConflicts({ vehicleId, start, end, exceptId })
  return conflicts.length === 0
}

/**
 * Ids of every vehicle already committed during the window — used by the
 * public catalogue to flag (not hide) unavailable vehicles.
 */
export async function busyVehicleIds(start, end) {
  const rows = await Reservation.find({
    status: { $in: BLOCKING_STATUSES },
    ...overlapQuery(start, end),
  })
    .select('vehicle')
    .lean()

  return new Set(rows.map((r) => String(r.vehicle)))
}

/**
 * Planning rows: one entry per vehicle with everything occupying it over the
 * period — reservations and scheduled maintenance alike.
 */
export async function planningForPeriod({ start, end, vehicleIds = null }) {
  const reservationQuery = {
    status: { $in: [...BLOCKING_STATUSES, 'demande'] },
    ...overlapQuery(start, end),
  }
  const maintenanceQuery = {
    status: { $in: ['planifiee', 'urgent', 'a_prevoir'] },
    dueDate: { $gte: start, $lte: end },
  }
  if (vehicleIds) {
    reservationQuery.vehicle = { $in: vehicleIds }
    maintenanceQuery.vehicle = { $in: vehicleIds }
  }

  const [reservations, maintenance] = await Promise.all([
    Reservation.find(reservationQuery)
      .populate('client', 'firstName lastName phone status')
      .select('reference vehicle client startDate endDate status stage requester')
      .lean(),
    Maintenance.find(maintenanceQuery).select('vehicle label type dueDate status').lean(),
  ])

  return { reservations, maintenance }
}

/**
 * The status a vehicle should be showing right now, derived from its
 * reservations. Keeps Flotte honest without anyone setting a flag by hand —
 * an explicitly immobilised or blocked vehicle keeps its manual status.
 */
export function deriveVehicleStatus(vehicle, reservations, now = new Date()) {
  if (['maintenance', 'immobilise', 'bloque'].includes(vehicle.status)) return vehicle.status

  const active = reservations.find(
    (r) => r.status === 'en_cours' || (r.startDate <= now && r.endDate >= now && r.status === 'confirmee')
  )
  if (active) return 'loue'

  const upcoming = reservations.find((r) => r.status === 'confirmee' && r.startDate > now)
  if (upcoming) return 'reserve'

  return 'disponible'
}
