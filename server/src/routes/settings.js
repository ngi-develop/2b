import { Router } from 'express'
import { z } from 'zod'
import { Setting } from '../models/Setting.js'
import { AuditLog } from '../models/AuditLog.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'
import * as vocab from '../models/constants.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = await Setting.load()
    res.json(settings)
  })
)

/** The shared vocabulary, so the dashboard renders labels without hard-coding them. */
router.get('/vocabulary', (_req, res) => {
  res.json({
    vehicleStatus: vocab.VEHICLE_STATUS_LABELS,
    clientStatus: vocab.CLIENT_STATUS_LABELS,
    reservationStatus: vocab.RESERVATION_STATUS_LABELS,
    chargeCategories: vocab.CHARGE_CATEGORY_LABELS,
    maintenanceTypes: vocab.MAINTENANCE_TYPE_LABELS,
    maintenanceStatus: vocab.MAINTENANCE_STATUS_LABELS,
    paymentMethods: vocab.PAYMENT_METHOD_LABELS,
    quoteStatus: vocab.QUOTE_STATUS_LABELS,
    roles: vocab.ROLE_LABELS,
    categories: vocab.CATEGORIES,
    transmissions: vocab.TRANSMISSIONS,
    fuels: vocab.FUELS,
    stages: vocab.RESERVATION_STAGES,
  })
})

const settingsSchema = z.object({
  company: z
    .object({
      name: z.string().trim().optional(),
      legal: z.string().trim().optional(),
      address: z.string().trim().optional(),
      phone: z.string().trim().optional(),
      email: z.string().trim().optional(),
      ice: z.string().trim().optional(),
      rc: z.string().trim().optional(),
      currency: z.string().trim().optional(),
      logoUrl: z.string().trim().optional(),
    })
    .optional(),
  agencies: z
    .array(
      z.object({
        name: z.string().trim(),
        city: z.string().trim().optional(),
        address: z.string().trim().optional(),
        phone: z.string().trim().optional(),
        active: z.coerce.boolean().default(true),
      })
    )
    .optional(),
  rules: z
    .object({
      kmIncludedPerDay: z.coerce.number().min(0).optional(),
      extraKmPrice: z.coerce.number().min(0).optional(),
      defaultDeposit: z.coerce.number().min(0).optional(),
      minimumDays: z.coerce.number().min(1).optional(),
      lateGraceHours: z.coerce.number().min(0).optional(),
      lateHourFee: z.coerce.number().min(0).optional(),
      freeCancellationHours: z.coerce.number().min(0).optional(),
      modificationHours: z.coerce.number().min(0).optional(),
    })
    .optional(),
  notifications: z
    .object({
      insuranceDaysBefore: z.array(z.coerce.number()).optional(),
      serviceKmBefore: z.coerce.number().optional(),
      returnToday: z.coerce.boolean().optional(),
      latePayment: z.coerce.boolean().optional(),
      newRequest: z.coerce.boolean().optional(),
    })
    .optional(),
  lists: z
    .object({
      chargeCategories: z.array(z.string()).optional(),
      paymentMethods: z.array(z.string()).optional(),
      maintenanceTypes: z.array(z.string()).optional(),
      vehicleCategories: z.array(z.string()).optional(),
      unavailabilityReasons: z.array(z.string()).optional(),
      pickupPoints: z.array(z.string()).optional(),
      cities: z.array(z.string()).optional(),
    })
    .optional(),
  rentalOptions: z
    .array(
      z.object({
        code: z.string().trim(),
        name: z.string().trim(),
        note: z.string().trim().optional(),
        price: z.coerce.number().min(0),
        unit: z.enum(['jour', 'forfait']).default('jour'),
        active: z.coerce.boolean().default(true),
      })
    )
    .optional(),
  documents: z
    .object({
      contractTemplate: z.string().optional(),
      checkoutTemplate: z.string().optional(),
      invoiceTemplate: z.string().optional(),
      receiptTemplate: z.string().optional(),
    })
    .optional(),
})

router.patch(
  '/',
  requireRole('admin', 'manager'),
  validate(settingsSchema),
  asyncHandler(async (req, res) => {
    const settings = await Setting.load()

    /* Merge one level down so patching `rules` doesn't wipe `company`. */
    for (const [key, value] of Object.entries(req.body)) {
      if (Array.isArray(value)) settings[key] = value
      else if (value && typeof value === 'object') {
        settings[key] = { ...(settings[key]?.toObject?.() ?? settings[key] ?? {}), ...value }
      } else settings[key] = value
    }

    await settings.save()
    res.json(settings)
  })
)

/** Paramètres → Sécurité → historique des actions. */
router.get(
  '/audit',
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const rows = await AuditLog.find()
      .populate('user', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 200)
      .lean()
    res.json(rows.map((r) => ({ ...r, id: String(r._id) })))
  })
)

export default router
