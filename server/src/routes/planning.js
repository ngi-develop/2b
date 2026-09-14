import { Router } from 'express'
import { Vehicle } from '../models/Vehicle.js'
import { Reservation } from '../models/Reservation.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { planningForPeriod, deriveVehicleStatus } from '../services/availability.js'
import { startOfDay, endOfDay } from '../services/metrics.js'

const router = Router()
router.use(requireAuth)

/**
 * Planning answers one question: which vehicle is free, and when.
 *
 * Returns vehicles as rows and everything occupying them as spans, so the
 * calendar view can lay them out directly and the list view can read the
 * same payload.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const from = req.query.from ? startOfDay(new Date(req.query.from)) : startOfDay(new Date())
    const to = req.query.to
      ? endOfDay(new Date(req.query.to))
      : endOfDay(new Date(Date.now() + 29 * 86400000))

    const vehicleFilter = { fleetType: req.query.fleetType || 'tourisme' }
    if (req.query.category) vehicleFilter.category = req.query.category
    if (req.query.status) vehicleFilter.status = req.query.status

    const vehicles = await Vehicle.find(vehicleFilter)
      .select('brand model plate category status image mileage')
      .sort({ brand: 1, model: 1 })
      .lean()

    const ids = vehicles.map((v) => v._id)
    const { reservations, maintenance } = await planningForPeriod({
      start: from,
      end: to,
      vehicleIds: ids,
    })

    /* Current and next booking per vehicle, for the list view columns. */
    const now = new Date()
    const live = await Reservation.find({
      vehicle: { $in: ids },
      status: { $in: ['confirmee', 'en_cours'] },
      endDate: { $gte: now },
    })
      .populate('client', 'firstName lastName phone')
      .select('vehicle client requester startDate endDate status reference')
      .sort({ startDate: 1 })
      .lean()

    const liveBy = new Map()
    for (const r of live) {
      const k = String(r.vehicle)
      if (!liveBy.has(k)) liveBy.set(k, [])
      liveBy.get(k).push(r)
    }

    const spansBy = new Map()
    for (const r of reservations) {
      const k = String(r.vehicle)
      if (!spansBy.has(k)) spansBy.set(k, [])
      spansBy.get(k).push({
        kind: 'reservation',
        id: String(r._id),
        reference: r.reference,
        start: r.startDate,
        end: r.endDate,
        status: r.status,
        client: r.client
          ? `${r.client.firstName} ${r.client.lastName}`
          : `${r.requester?.firstName || ''} ${r.requester?.lastName || ''}`.trim() || 'Demande',
      })
    }
    for (const m of maintenance) {
      const k = String(m.vehicle)
      if (!spansBy.has(k)) spansBy.set(k, [])
      spansBy.get(k).push({
        kind: 'maintenance',
        id: String(m._id),
        reference: m.label,
        start: m.dueDate,
        end: m.dueDate,
        status: 'maintenance',
        client: m.label,
      })
    }

    res.json({
      from,
      to,
      vehicles: vehicles.map((v) => {
        const rows = liveBy.get(String(v._id)) || []
        const current = rows.find((r) => r.startDate <= now && r.endDate >= now)
        const next = rows.find((r) => r.startDate > now)
        return {
          ...v,
          id: String(v._id),
          derivedStatus: deriveVehicleStatus(v, rows, now),
          currentClient: current
            ? current.client
              ? `${current.client.firstName} ${current.client.lastName}`
              : 'Client'
            : null,
          currentStart: current?.startDate || null,
          currentEnd: current?.endDate || null,
          nextStart: next?.startDate || null,
          spans: spansBy.get(String(v._id)) || [],
        }
      }),
    })
  })
)

export default router
