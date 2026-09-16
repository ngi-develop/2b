import { Router } from 'express'
import { z } from 'zod'
import { Vehicle } from '../models/Vehicle.js'
import { Reservation } from '../models/Reservation.js'
import { Charge } from '../models/Charge.js'
import { Maintenance } from '../models/Maintenance.js'
import { recordAudit } from '../models/AuditLog.js'
import {
  CATEGORIES,
  FLEET_TYPES,
  FUELS,
  TRANSMISSIONS,
  VEHICLE_STATUS,
} from '../models/constants.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'
import { uniqueSlug } from '../services/references.js'
import { deriveVehicleStatus } from '../services/availability.js'
import { startOfMonth, endOfDay } from '../services/metrics.js'

const router = Router()
router.use(requireAuth)

const vehicleSchema = z.object({
  fleetType: z.enum(FLEET_TYPES).default('tourisme'),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  version: z.string().trim().optional(),
  category: z.enum(CATEGORIES),
  year: z.coerce.number().int().min(1990).max(2100).optional(),
  plate: z.string().trim().min(1),
  vin: z.string().trim().optional(),
  transmission: z.enum(TRANSMISSIONS),
  fuel: z.enum(FUELS),
  seats: z.coerce.number().int().min(1).max(9).default(5),
  doors: z.coerce.number().int().min(2).max(6).default(5),
  luggage: z.coerce.number().int().min(0).max(9).default(2),
  ac: z.coerce.boolean().default(true),
  mileage: z.coerce.number().min(0).default(0),
  status: z.enum(VEHICLE_STATUS).default('disponible'),
  statusReason: z.string().trim().optional(),
  pricePerDay: z.coerce.number().min(0),
  kmIncluded: z.coerce.number().min(0).default(200),
  extraKmPrice: z.coerce.number().min(0).default(3),
  deposit: z.coerce.number().min(0).default(8000),
  published: z.coerce.boolean().default(true),
  image: z.string().trim().optional(),
  gallery: z.array(z.string()).default([]),
  cities: z.array(z.string()).default([]),
  blurb: z.string().trim().optional(),
  highlights: z.array(z.string()).default([]),
  purchaseDate: z.coerce.date().optional(),
  financing: z
    .object({
      purchasePrice: z.coerce.number().optional(),
      downPayment: z.coerce.number().optional(),
      financedAmount: z.coerce.number().optional(),
      monthlyPayment: z.coerce.number().optional(),
      durationMonths: z.coerce.number().int().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .optional(),
  notes: z.string().trim().optional(),
})

/* ------------------------------------------------------------------ list -- */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { fleetType, status, category, q } = req.query

    const filter = {}
    if (fleetType) filter.fleetType = fleetType
    if (status) filter.status = status
    if (category) filter.category = category
    if (q) {
      const rx = new RegExp(String(q).trim(), 'i')
      filter.$or = [{ brand: rx }, { model: rx }, { plate: rx }]
    }

    const vehicles = await Vehicle.find(filter).sort({ brand: 1, model: 1 }).lean()
    const ids = vehicles.map((v) => v._id)
    const now = new Date()
    const monthStart = startOfMonth(now)

    /* Each row carries its current rental, next return, next booking and
       month-to-date turnover — the columns the Flotte table asks for. */
    const [live, revenueRows, everRented] = await Promise.all([
      Reservation.find({
        vehicle: { $in: ids },
        status: { $in: ['confirmee', 'en_cours'] },
        endDate: { $gte: now },
      })
        .populate('client', 'firstName lastName')
        .select('vehicle client requester startDate endDate status reference')
        .sort({ startDate: 1 })
        .lean(),
      Reservation.aggregate([
        {
          $match: {
            vehicle: { $in: ids },
            status: { $ne: 'annulee' },
            startDate: { $gte: monthStart, $lte: endOfDay(now) },
          },
        },
        { $group: { _id: '$vehicle', revenue: { $sum: '$totals.total' } } },
      ]),
      /* Which vehicles have ever been rented. The list uses it to show the
         delete action only where it can actually succeed — the server refuses
         to delete a vehicle with history, and offering a button that can only
         fail is worse than offering none. */
      Reservation.distinct('vehicle', { vehicle: { $in: ids } }),
    ])

    const rented = new Set(everRented.map(String))

    const byVehicle = new Map()
    for (const r of live) {
      const key = String(r.vehicle)
      if (!byVehicle.has(key)) byVehicle.set(key, [])
      byVehicle.get(key).push(r)
    }
    const revenueBy = new Map(revenueRows.map((r) => [String(r._id), r.revenue]))

    res.json(
      vehicles.map((v) => {
        const rows = byVehicle.get(String(v._id)) || []
        const current = rows.find((r) => r.startDate <= now && r.endDate >= now)
        const next = rows.find((r) => r.startDate > now)
        const clientName = (r) =>
          r?.client
            ? `${r.client.firstName} ${r.client.lastName}`
            : `${r?.requester?.firstName || ''} ${r?.requester?.lastName || ''}`.trim() || null

        return {
          ...v,
          id: String(v._id),
          derivedStatus: deriveVehicleStatus(v, rows, now),
          deletable: !rented.has(String(v._id)),
          currentRental: current
            ? { id: String(current._id), reference: current.reference, client: clientName(current) }
            : null,
          nextReturn: current?.endDate || null,
          nextReservation: next
            ? { id: String(next._id), reference: next.reference, startDate: next.startDate }
            : null,
          monthRevenue: revenueBy.get(String(v._id)) || 0,
        }
      })
    )
  })
)

/* ------------------------------------------------------------------ read -- */

/** Full vehicle file: informations, activité, historique, coûts, rentabilité. */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id).lean()
    if (!vehicle) throw new ApiError(404, 'Véhicule introuvable.')

    const now = new Date()
    const [history, charges, maintenance] = await Promise.all([
      Reservation.find({ vehicle: vehicle._id })
        .populate('client', 'firstName lastName phone')
        .select('reference client requester startDate endDate status totals')
        .sort({ startDate: -1 })
        .limit(100)
        .lean(),
      Charge.find({ vehicle: vehicle._id }).sort({ date: -1 }).limit(200).lean(),
      Maintenance.find({ vehicle: vehicle._id }).sort({ dueDate: 1 }).lean(),
    ])

    const billable = history.filter((r) => r.status !== 'annulee')
    const revenue = billable.reduce((s, r) => s + (r.totals?.total || 0), 0)
    const chargesTotal = charges.reduce((s, c) => s + c.amount, 0)
    const rentedDays = billable.reduce((s, r) => s + (r.totals?.days || 0), 0)

    /* Occupancy since acquisition — falls back to the record's own age when
       no purchase date was entered. */
    const since = vehicle.purchaseDate || vehicle.createdAt
    const ownedDays = Math.max(Math.round((now - new Date(since)) / 86400000), 1)

    const financing = vehicle.financing || {}
    let remainingInstalments = null
    if (financing.endDate && financing.monthlyPayment) {
      const monthsLeft = Math.max(
        Math.ceil((new Date(financing.endDate) - now) / (30.44 * 86400000)),
        0
      )
      remainingInstalments = { months: monthsLeft, amount: monthsLeft * financing.monthlyPayment }
    }

    res.json({
      ...vehicle,
      id: String(vehicle._id),
      activity: {
        rentals: billable.length,
        rentedDays,
        availableDays: Math.max(ownedDays - rentedDays, 0),
        occupancy: Math.min(Math.round((rentedDays / ownedDays) * 100), 100),
        currentRental: billable.find((r) => r.startDate <= now && r.endDate >= now) || null,
        nextReservation: billable.find((r) => r.startDate > now && r.status === 'confirmee') || null,
      },
      history,
      charges,
      maintenance,
      profitability: {
        revenue,
        charges: chargesTotal,
        result: revenue - chargesTotal,
        sinceAcquisition: true,
      },
      remainingInstalments,
    })
  })
)

/* ----------------------------------------------------------------- write -- */

router.post(
  '/',
  requireRole('admin', 'manager'),
  validate(vehicleSchema),
  asyncHandler(async (req, res) => {
    const slug = await uniqueSlug(Vehicle, `${req.body.brand} ${req.body.model}`)
    const vehicle = await Vehicle.create({ ...req.body, slug })

    await recordAudit({
      user: req.user._id,
      action: 'vehicle.create',
      entity: 'Vehicle',
      entityId: String(vehicle._id),
      summary: `Véhicule ajouté : ${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
    })

    res.status(201).json(vehicle)
  })
)

router.patch(
  '/:id',
  requireRole('admin', 'manager'),
  validate(vehicleSchema.partial()),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id)
    if (!vehicle) throw new ApiError(404, 'Véhicule introuvable.')

    Object.assign(vehicle, req.body)
    if (req.body.brand || req.body.model) {
      vehicle.slug = await uniqueSlug(Vehicle, `${vehicle.brand} ${vehicle.model}`, vehicle._id)
    }
    await vehicle.save()

    await recordAudit({
      user: req.user._id,
      action: 'vehicle.update',
      entity: 'Vehicle',
      entityId: String(vehicle._id),
      summary: `Véhicule modifié : ${vehicle.brand} ${vehicle.model}`,
      meta: Object.keys(req.body),
    })

    res.json(vehicle)
  })
)

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id)
    if (!vehicle) throw new ApiError(404, 'Véhicule introuvable.')

    /* A vehicle with history is never deleted — that would orphan contracts
       and silently rewrite past turnover. It is immobilised instead. */
    const used = await Reservation.exists({ vehicle: vehicle._id })
    if (used) {
      throw new ApiError(
        409,
        'Ce véhicule a un historique de locations : passez-le en « Immobilisé » plutôt que de le supprimer.'
      )
    }

    await vehicle.deleteOne()
    await recordAudit({
      user: req.user._id,
      action: 'vehicle.delete',
      entity: 'Vehicle',
      entityId: String(vehicle._id),
      summary: `Véhicule supprimé : ${vehicle.brand} ${vehicle.model} (${vehicle.plate})`,
    })

    res.json({ ok: true })
  })
)

export default router
