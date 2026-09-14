import { Router } from 'express'
import { z } from 'zod'
import { Charge } from '../models/Charge.js'
import { Reservation } from '../models/Reservation.js'
import { recordAudit } from '../models/AuditLog.js'
import { CHARGE_CATEGORIES, PAYMENT_METHODS } from '../models/constants.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'
import {
  chargesBetween,
  endOfDay,
  receivableTotal,
  revenueBetween,
  startOfDay,
  startOfMonth,
  startOfYear,
  vehicleProfitability,
} from '../services/metrics.js'

const router = Router()
router.use(requireAuth)

/** Period from the query string, defaulting to the current month. */
function period(req) {
  const from = req.query.from ? startOfDay(new Date(req.query.from)) : startOfMonth(new Date())
  const to = req.query.to ? endOfDay(new Date(req.query.to)) : endOfDay(new Date())
  return { from, to }
}

/* -------------------------------------------------------------- overview -- */

router.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const { from, to } = period(req)

    const [rev, charges, receivable, profitability] = await Promise.all([
      revenueBetween(from, to),
      chargesBetween(from, to),
      receivableTotal(),
      vehicleProfitability(from, to),
    ])

    /* Month-by-month series for the charts, across the last 12 months. */
    const seriesStart = startOfYear(new Date())
    const [revSeries, chargeSeries] = await Promise.all([
      Reservation.aggregate([
        { $match: { status: { $ne: 'annulee' }, startDate: { $gte: seriesStart } } },
        {
          $group: {
            _id: { y: { $year: '$startDate' }, m: { $month: '$startDate' } },
            total: { $sum: '$totals.total' },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      Charge.aggregate([
        { $match: { date: { $gte: seriesStart } } },
        {
          $group: {
            _id: { y: { $year: '$date' }, m: { $month: '$date' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
    ])

    const key = (r) => `${r._id.y}-${String(r._id.m).padStart(2, '0')}`
    const months = [...new Set([...revSeries.map(key), ...chargeSeries.map(key)])].sort()
    const revBy = new Map(revSeries.map((r) => [key(r), r.total]))
    const chgBy = new Map(chargeSeries.map((r) => [key(r), r.total]))

    const byCategory = await Charge.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ])

    res.json({
      period: { from, to },
      revenue: rev.revenue,
      cashed: rev.cashed,
      receivable,
      charges,
      result: rev.revenue - charges,
      rentals: rev.rentals,
      series: months.map((m) => ({
        month: m,
        revenue: revBy.get(m) || 0,
        charges: chgBy.get(m) || 0,
        result: (revBy.get(m) || 0) - (chgBy.get(m) || 0),
      })),
      byCategory: byCategory.map((c) => ({ category: c._id, total: c.total })),
      byVehicle: profitability,
    })
  })
)

/* -------------------------------------------------------------- revenues -- */

/** Revenue always comes from reservations — never keyed in by hand. */
router.get(
  '/revenues',
  asyncHandler(async (req, res) => {
    const { from, to } = period(req)
    const filter = { status: { $ne: 'annulee' }, startDate: { $gte: from, $lte: to } }
    if (req.query.vehicle) filter.vehicle = req.query.vehicle
    if (req.query.client) filter.client = req.query.client

    const rows = await Reservation.find(filter)
      .populate('client', 'firstName lastName')
      .populate('vehicle', 'brand model plate')
      .select('reference client vehicle startDate endDate totals payments status')
      .sort({ startDate: -1 })
      .limit(500)
      .lean()

    res.json(
      rows.map((r) => ({
        ...r,
        id: String(r._id),
        paidMethods: [...new Set((r.payments || []).map((p) => p.method))],
      }))
    )
  })
)

/* --------------------------------------------------------------- charges -- */

/* Base shape kept separate from the refinement: zod v4 refuses .partial()
   on a refined schema, and the PATCH route needs a partial. */
const chargeFields = z
  .object({
    amount: z.coerce.number().positive('Montant requis'),
    date: z.coerce.date().default(() => new Date()),
    category: z.enum(CHARGE_CATEGORIES),
    supplier: z.string().trim().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).default('especes'),
    receiptUrl: z.string().trim().optional(),
    comment: z.string().trim().optional(),
    scope: z.enum(['vehicle', 'company']),
    vehicle: z.string().optional(),
  })

const requireVehicleWhenScoped = (d) => d.scope !== 'vehicle' || Boolean(d.vehicle)

const chargeSchema = chargeFields.refine(requireVehicleWhenScoped, {
  message: 'Sélectionnez le véhicule concerné',
  path: ['vehicle'],
})

const chargePatchSchema = chargeFields.partial().refine(
  (d) => d.scope !== 'vehicle' || Boolean(d.vehicle),
  { message: 'Sélectionnez le véhicule concerné', path: ['vehicle'] }
)

router.get(
  '/charges',
  asyncHandler(async (req, res) => {
    const { from, to } = period(req)
    const filter = { date: { $gte: from, $lte: to } }
    if (req.query.category) filter.category = req.query.category
    if (req.query.scope) filter.scope = req.query.scope
    if (req.query.vehicle) filter.vehicle = req.query.vehicle

    const rows = await Charge.find(filter)
      .populate('vehicle', 'brand model plate')
      .sort({ date: -1 })
      .limit(500)
      .lean()

    res.json(rows.map((c) => ({ ...c, id: String(c._id) })))
  })
)

router.post(
  '/charges',
  validate(chargeSchema),
  asyncHandler(async (req, res) => {
    const charge = await Charge.create({ ...req.body, createdBy: req.user._id })

    await recordAudit({
      user: req.user._id,
      action: 'charge.create',
      entity: 'Charge',
      entityId: String(charge._id),
      summary: `Charge ${charge.category} — ${charge.amount} DH`,
    })

    res.status(201).json({ ...charge.toJSON(), id: String(charge._id) })
  })
)

router.patch(
  '/charges/:id',
  validate(chargePatchSchema),
  asyncHandler(async (req, res) => {
    const charge = await Charge.findById(req.params.id)
    if (!charge) throw new ApiError(404, 'Charge introuvable.')
    Object.assign(charge, req.body)
    await charge.save()
    res.json({ ...charge.toJSON(), id: String(charge._id) })
  })
)

router.delete(
  '/charges/:id',
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const charge = await Charge.findByIdAndDelete(req.params.id)
    if (!charge) throw new ApiError(404, 'Charge introuvable.')

    await recordAudit({
      user: req.user._id,
      action: 'charge.delete',
      entity: 'Charge',
      entityId: String(charge._id),
      summary: `Charge supprimée — ${charge.amount} DH`,
    })

    res.json({ ok: true })
  })
)

export default router
