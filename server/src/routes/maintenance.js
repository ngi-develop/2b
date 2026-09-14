import { Router } from 'express'
import { z } from 'zod'
import { Maintenance } from '../models/Maintenance.js'
import { Vehicle } from '../models/Vehicle.js'
import { Charge } from '../models/Charge.js'
import { recordAudit } from '../models/AuditLog.js'
import {
  CHARGE_CATEGORIES,
  MAINTENANCE_STATUS,
  MAINTENANCE_TYPES,
} from '../models/constants.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'

const router = Router()
router.use(requireAuth)

const DAY_MS = 86400000

/* Same split as charges: the refinement lives outside the base object so the
   PATCH route can take a partial. */
const maintenanceFields = z
  .object({
    vehicle: z.string().min(1, 'Véhicule requis'),
    type: z.enum(MAINTENANCE_TYPES),
    label: z.string().trim().min(1, 'Intervention requise'),
    dueDate: z.coerce.date().optional(),
    dueMileage: z.coerce.number().min(0).optional(),
    garage: z.string().trim().optional(),
    note: z.string().trim().optional(),
    status: z.enum(MAINTENANCE_STATUS).default('a_prevoir'),
  })

const maintenanceSchema = maintenanceFields.refine(
  (d) => d.dueDate || typeof d.dueMileage === 'number',
  { message: 'Indiquez une date prévue ou un kilométrage', path: ['dueDate'] }
)

const maintenancePatchSchema = maintenanceFields.partial()

/**
 * Échéances & Maintenance lists only what is coming up.
 *
 * Each row is decorated with how far away it is — in days, in kilometres, or
 * both — and overdue rows are re-labelled so they sort to the top.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.status) filter.status = req.query.status
    else filter.status = { $ne: 'faite' }
    if (req.query.vehicle) filter.vehicle = req.query.vehicle
    if (req.query.type) filter.type = req.query.type

    const rows = await Maintenance.find(filter)
      .populate('vehicle', 'brand model plate mileage status')
      .sort({ dueDate: 1 })
      .lean()

    const now = new Date()

    const decorated = rows.map((m) => {
      const days = m.dueDate ? Math.ceil((new Date(m.dueDate) - now) / DAY_MS) : null
      const km =
        typeof m.dueMileage === 'number' && m.vehicle
          ? m.dueMileage - (m.vehicle.mileage || 0)
          : null

      const overdue = (days !== null && days < 0) || (km !== null && km < 0)
      const urgent = (days !== null && days <= 7) || (km !== null && km <= 500)

      return {
        ...m,
        id: String(m._id),
        daysRemaining: days,
        kmRemaining: km,
        computedStatus: overdue ? 'en_retard' : urgent ? 'urgent' : m.status,
      }
    })

    /* Overdue first, then by whichever deadline is nearest. */
    const weight = (m) =>
      m.computedStatus === 'en_retard' ? 0 : m.computedStatus === 'urgent' ? 1 : 2

    decorated.sort((a, b) => {
      const w = weight(a) - weight(b)
      if (w !== 0) return w
      const ad = a.daysRemaining ?? Math.round((a.kmRemaining ?? 9e9) / 50)
      const bd = b.daysRemaining ?? Math.round((b.kmRemaining ?? 9e9) / 50)
      return ad - bd
    })

    const inGarage = await Vehicle.find({ status: 'maintenance' })
      .select('brand model plate mileage statusReason')
      .lean()

    res.json({ rows: decorated, inGarage: inGarage.map((v) => ({ ...v, id: String(v._id) })) })
  })
)

router.post(
  '/',
  validate(maintenanceSchema),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.body.vehicle)
    if (!vehicle) throw new ApiError(404, 'Véhicule introuvable.')

    const job = await Maintenance.create({ ...req.body, createdBy: req.user._id })

    await recordAudit({
      user: req.user._id,
      action: 'maintenance.create',
      entity: 'Maintenance',
      entityId: String(job._id),
      summary: `${job.label} planifié — ${vehicle.brand} ${vehicle.model}`,
    })

    res.status(201).json({ ...job.toJSON(), id: String(job._id) })
  })
)

router.patch(
  '/:id',
  validate(maintenancePatchSchema),
  asyncHandler(async (req, res) => {
    const job = await Maintenance.findById(req.params.id)
    if (!job) throw new ApiError(404, 'Échéance introuvable.')
    Object.assign(job, req.body)
    await job.save()
    res.json({ ...job.toJSON(), id: String(job._id) })
  })
)

/**
 * Completing a job books its cost as a vehicle charge, so it shows up in
 * Finances and in the vehicle's profitability without anyone re-keying it.
 */
router.post(
  '/:id/complete',
  validate(
    z.object({
      cost: z.coerce.number().min(0).default(0),
      completedAt: z.coerce.date().default(() => new Date()),
      mileage: z.coerce.number().min(0).optional(),
      category: z.enum(CHARGE_CATEGORIES).optional(),
      supplier: z.string().trim().optional(),
      note: z.string().trim().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const job = await Maintenance.findById(req.params.id).populate('vehicle', 'brand model plate')
    if (!job) throw new ApiError(404, 'Échéance introuvable.')
    if (job.status === 'faite') throw new ApiError(409, 'Cette intervention est déjà clôturée.')

    const { cost, completedAt, mileage, category, supplier, note } = req.body

    let charge = null
    if (cost > 0) {
      charge = await Charge.create({
        amount: cost,
        date: completedAt,
        category: category || (MAINTENANCE_TYPES.includes(job.type) ? mapType(job.type) : 'entretien'),
        supplier: supplier || job.garage,
        scope: 'vehicle',
        vehicle: job.vehicle._id,
        comment: note || job.label,
        maintenance: job._id,
        createdBy: req.user._id,
      })
    }

    job.status = 'faite'
    job.completedAt = completedAt
    job.cost = cost
    job.charge = charge?._id
    await job.save()

    if (typeof mileage === 'number') {
      await Vehicle.updateOne({ _id: job.vehicle._id }, { mileage })
    }

    await recordAudit({
      user: req.user._id,
      action: 'maintenance.complete',
      entity: 'Maintenance',
      entityId: String(job._id),
      summary: `${job.label} terminé — ${job.vehicle.brand} ${job.vehicle.model}${
        cost ? ` (${cost} DH)` : ''
      }`,
    })

    res.json({ ok: true, chargeId: charge ? String(charge._id) : null })
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const job = await Maintenance.findByIdAndDelete(req.params.id)
    if (!job) throw new ApiError(404, 'Échéance introuvable.')
    res.json({ ok: true })
  })
)

/** Maintenance types map onto charge categories one-for-one where they exist. */
function mapType(type) {
  const direct = ['entretien', 'pneus', 'reparation', 'assurance', 'traite']
  if (direct.includes(type)) return type
  if (type === 'vidange') return 'entretien'
  return 'autres'
}

export default router
