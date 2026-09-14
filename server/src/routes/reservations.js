import { Router } from 'express'
import { z } from 'zod'
import { Reservation } from '../models/Reservation.js'
import { Vehicle } from '../models/Vehicle.js'
import { Client } from '../models/Client.js'
import { Setting } from '../models/Setting.js'
import { recordAudit } from '../models/AuditLog.js'
import { PAYMENT_METHODS, RESERVATION_STATUS } from '../models/constants.js'
import { requireAuth, requireRole, isAdmin } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'
import { findConflicts } from '../services/availability.js'
import { nextReservationReference } from '../services/references.js'

const router = Router()
router.use(requireAuth)

const POPULATE = [
  { path: 'client', select: 'firstName lastName phone email cin status statusReason' },
  { path: 'vehicle', select: 'brand model plate category image pricePerDay kmIncluded extraKmPrice deposit mileage' },
]

const checkpointSchema = z.object({
  km: z.coerce.number().min(0),
  fuel: z.coerce.number().min(0).max(8).optional(),
  photos: z.array(z.string()).default([]),
  damages: z.array(z.string()).default([]),
  notes: z.string().trim().optional(),
  signature: z.string().optional(),
})

/** Refuses a window that clashes with an existing commitment, naming it. */
async function assertFree({ vehicleId, start, end, exceptId }) {
  const conflicts = await findConflicts({ vehicleId, start, end, exceptId })
  if (conflicts.length) {
    const c = conflicts[0]
    const who = c.client ? `${c.client.firstName} ${c.client.lastName}` : 'un autre dossier'
    throw new ApiError(
      409,
      `Ce véhicule est déjà engagé du ${new Date(c.startDate).toLocaleDateString('fr-FR')} au ` +
        `${new Date(c.endDate).toLocaleDateString('fr-FR')} (${c.reference} — ${who}).`
    )
  }
}

/* ------------------------------------------------------------------ list -- */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status, q, from, to, vehicle } = req.query

    const filter = {}
    if (status && RESERVATION_STATUS.includes(status)) filter.status = status
    if (vehicle) filter.vehicle = vehicle
    if (from || to) {
      filter.startDate = {}
      if (from) filter.startDate.$gte = new Date(from)
      if (to) filter.startDate.$lte = new Date(to)
    }

    if (q) {
      const rx = new RegExp(String(q).trim(), 'i')
      const [clients, vehicles] = await Promise.all([
        Client.find({ $or: [{ firstName: rx }, { lastName: rx }, { phone: rx }, { cin: rx }] })
          .select('_id')
          .lean(),
        Vehicle.find({ $or: [{ brand: rx }, { model: rx }, { plate: rx }] })
          .select('_id')
          .lean(),
      ])
      filter.$or = [
        { reference: rx },
        { 'requester.firstName': rx },
        { 'requester.lastName': rx },
        { 'requester.phone': rx },
        { client: { $in: clients.map((c) => c._id) } },
        { vehicle: { $in: vehicles.map((v) => v._id) } },
      ]
    }

    const rows = await Reservation.find(filter)
      .populate(POPULATE)
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()

    /* Counts for the filter tabs, computed on the unfiltered set so the tab
       labels don't change as you click between them. */
    const counts = await Reservation.aggregate([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ])

    res.json({
      rows: rows.map((r) => ({ ...r, id: String(r._id) })),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    })
  })
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const r = await Reservation.findById(req.params.id).populate(POPULATE).lean()
    if (!r) throw new ApiError(404, 'Réservation introuvable.')
    res.json({ ...r, id: String(r._id) })
  })
)

/* ---------------------------------------------------------------- create -- */

const createSchema = z
  .object({
    clientId: z.string().optional(),
    /* Or create the client inline — "sans quitter la réservation". */
    newClient: z
      .object({
        firstName: z.string().trim().min(1),
        lastName: z.string().trim().min(1),
        phone: z.string().trim().min(8),
        whatsapp: z.string().trim().optional(),
        email: z.string().trim().email().optional().or(z.literal('')),
        cin: z.string().trim().optional(),
        birthDate: z.coerce.date().optional(),
        nationality: z.string().trim().optional(),
        address: z.string().trim().optional(),
        licence: z
          .object({
            number: z.string().trim().optional(),
            issuedAt: z.coerce.date().optional(),
            expiresAt: z.coerce.date().optional(),
          })
          .optional(),
      })
      .optional(),
    vehicleId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    pickupLocation: z.string().trim().optional(),
    dropoffLocation: z.string().trim().optional(),
    pricePerDay: z.coerce.number().min(0).optional(),
    kmIncluded: z.coerce.number().min(0).optional(),
    extraKmPrice: z.coerce.number().min(0).optional(),
    deposit: z.coerce.number().min(0).optional(),
    discount: z.coerce.number().min(0).default(0),
    deliveryFee: z.coerce.number().min(0).default(0),
    optionCodes: z.array(z.string()).default([]),
    notes: z.string().trim().optional(),
    confirm: z.coerce.boolean().default(false),
  })
  .refine((d) => d.endDate > d.startDate, {
    message: 'La restitution doit suivre le départ',
    path: ['endDate'],
  })
  .refine((d) => d.clientId || d.newClient, {
    message: 'Sélectionnez un client existant ou créez-en un',
    path: ['clientId'],
  })

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const body = req.body

    const vehicle = await Vehicle.findById(body.vehicleId)
    if (!vehicle) throw new ApiError(404, 'Véhicule introuvable.')

    let client
    if (body.clientId) {
      client = await Client.findById(body.clientId)
      if (!client) throw new ApiError(404, 'Client introuvable.')
    } else {
      /* Created here, and it lands in the Clients base at the same time —
         no double entry. */
      client = await Client.create({ ...body.newClient, createdBy: req.user._id })
      await recordAudit({
        user: req.user._id,
        action: 'client.create',
        entity: 'Client',
        entityId: String(client._id),
        summary: `Client créé depuis une réservation : ${client.firstName} ${client.lastName}`,
      })
    }

    /* A blacklisted client cannot hold a confirmed booking. The demande can
       still be recorded so there is a trace, but only an administrator can
       confirm it. */
    if (client.status === 'blackliste' && body.confirm && !isAdmin(req.user)) {
      throw new ApiError(
        403,
        `${client.firstName} ${client.lastName} est blacklisté (${
          client.statusReason || 'motif non renseigné'
        }). Seul un administrateur peut confirmer cette réservation.`
      )
    }

    if (body.confirm) {
      await assertFree({ vehicleId: vehicle._id, start: body.startDate, end: body.endDate })
    }

    const settings = await Setting.load()
    const options = (settings.rentalOptions || [])
      .filter((o) => body.optionCodes.includes(o.code))
      .map((o) => ({ code: o.code, name: o.name, price: o.price, unit: o.unit }))

    const reservation = new Reservation({
      reference: await nextReservationReference(),
      client: client._id,
      vehicle: vehicle._id,
      startDate: body.startDate,
      endDate: body.endDate,
      pickupLocation: body.pickupLocation,
      dropoffLocation: body.dropoffLocation,
      status: body.confirm ? 'confirmee' : 'demande',
      stage: 'reservation',
      pricePerDay: body.pricePerDay ?? vehicle.pricePerDay,
      kmIncluded: body.kmIncluded ?? vehicle.kmIncluded,
      extraKmPrice: body.extraKmPrice ?? vehicle.extraKmPrice,
      deposit: body.deposit ?? vehicle.deposit,
      discount: body.discount,
      deliveryFee: body.deliveryFee,
      options,
      notes: body.notes,
      source: 'dashboard',
      createdBy: req.user._id,
      confirmedBy: body.confirm ? req.user._id : undefined,
    })

    await reservation.save()

    if (body.confirm && vehicle.status === 'disponible') {
      vehicle.status = 'reserve'
      await vehicle.save()
    }

    await recordAudit({
      user: req.user._id,
      action: 'reservation.create',
      entity: 'Reservation',
      entityId: String(reservation._id),
      summary: `${reservation.reference} — ${client.firstName} ${client.lastName} / ${vehicle.brand} ${vehicle.model}`,
    })

    const populated = await Reservation.findById(reservation._id).populate(POPULATE).lean()
    res.status(201).json({ ...populated, id: String(populated._id) })
  })
)

/* ---------------------------------------------------------------- update -- */

const updateSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  pickupLocation: z.string().trim().optional(),
  dropoffLocation: z.string().trim().optional(),
  pricePerDay: z.coerce.number().min(0).optional(),
  kmIncluded: z.coerce.number().min(0).optional(),
  extraKmPrice: z.coerce.number().min(0).optional(),
  deposit: z.coerce.number().min(0).optional(),
  depositReceived: z.coerce.number().min(0).optional(),
  discount: z.coerce.number().min(0).optional(),
  deliveryFee: z.coerce.number().min(0).optional(),
  extraFees: z.array(z.object({ label: z.string(), amount: z.coerce.number() })).optional(),
  notes: z.string().trim().optional(),
})

router.patch(
  '/:id',
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) throw new ApiError(404, 'Réservation introuvable.')
    if (['terminee', 'annulee'].includes(reservation.status)) {
      throw new ApiError(409, 'Un dossier terminé ou annulé ne peut plus être modifié.')
    }

    const start = req.body.startDate ?? reservation.startDate
    const end = req.body.endDate ?? reservation.endDate
    if (end <= start) throw new ApiError(422, 'La restitution doit suivre le départ.')

    const datesChanged = req.body.startDate || req.body.endDate
    if (datesChanged && ['confirmee', 'en_cours'].includes(reservation.status)) {
      await assertFree({
        vehicleId: reservation.vehicle,
        start,
        end,
        exceptId: reservation._id,
      })
    }

    Object.assign(reservation, req.body)
    await reservation.save()

    const populated = await Reservation.findById(reservation._id).populate(POPULATE).lean()
    res.json({ ...populated, id: String(populated._id) })
  })
)

/* ------------------------------------------------------------ transitions -- */

router.post(
  '/:id/confirm',
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id).populate('client')
    if (!reservation) throw new ApiError(404, 'Réservation introuvable.')
    if (reservation.status !== 'demande') {
      throw new ApiError(409, 'Seule une demande peut être confirmée.')
    }

    if (!reservation.client) {
      throw new ApiError(
        422,
        'Rattachez cette demande à un client avant de la confirmer.'
      )
    }

    if (reservation.client.status === 'blackliste' && !isAdmin(req.user)) {
      throw new ApiError(
        403,
        `Client blacklisté (${
          reservation.client.statusReason || 'motif non renseigné'
        }). Seul un administrateur peut confirmer.`
      )
    }

    await assertFree({
      vehicleId: reservation.vehicle,
      start: reservation.startDate,
      end: reservation.endDate,
      exceptId: reservation._id,
    })

    reservation.status = 'confirmee'
    reservation.confirmedBy = req.user._id
    await reservation.save()

    await Vehicle.updateOne(
      { _id: reservation.vehicle, status: 'disponible' },
      { status: 'reserve' }
    )

    await recordAudit({
      user: req.user._id,
      action: 'reservation.confirm',
      entity: 'Reservation',
      entityId: String(reservation._id),
      summary: `${reservation.reference} confirmée`,
    })

    res.json({ ok: true, status: reservation.status })
  })
)

/** Attach a demande coming from the public site to a client record. */
router.post(
  '/:id/attach-client',
  validate(z.object({ clientId: z.string().min(1) })),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) throw new ApiError(404, 'Réservation introuvable.')

    const client = await Client.findById(req.body.clientId)
    if (!client) throw new ApiError(404, 'Client introuvable.')

    reservation.client = client._id
    await reservation.save()

    res.json({ ok: true })
  })
)

/** Départ: odometer, fuel, condition, deposit taken, signature. */
router.post(
  '/:id/departure',
  validate(checkpointSchema.extend({ depositReceived: z.coerce.number().min(0).optional() })),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) throw new ApiError(404, 'Réservation introuvable.')
    if (reservation.status !== 'confirmee') {
      throw new ApiError(409, 'Le départ ne peut être enregistré que sur un dossier confirmé.')
    }

    const { depositReceived, ...checkpoint } = req.body
    reservation.departure = { ...checkpoint, at: new Date(), by: req.user._id }
    if (typeof depositReceived === 'number') reservation.depositReceived = depositReceived
    reservation.status = 'en_cours'
    reservation.stage = 'en_cours'
    await reservation.save()

    /* The odometer reading is the vehicle's mileage from now on. */
    await Vehicle.updateOne(
      { _id: reservation.vehicle },
      { status: 'loue', mileage: checkpoint.km }
    )

    await recordAudit({
      user: req.user._id,
      action: 'reservation.departure',
      entity: 'Reservation',
      entityId: String(reservation._id),
      summary: `${reservation.reference} — départ à ${checkpoint.km} km`,
    })

    res.json({ ok: true, totals: reservation.totals })
  })
)

/**
 * Retour: closes the file. Mileage overage and lateness are turned into
 * charges here, the balance is recomputed, and the vehicle's odometer and
 * status follow automatically.
 */
router.post(
  '/:id/return',
  validate(
    checkpointSchema.extend({
      lateHours: z.coerce.number().min(0).default(0),
      extraFees: z.array(z.object({ label: z.string(), amount: z.coerce.number() })).default([]),
    })
  ),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) throw new ApiError(404, 'Réservation introuvable.')
    if (reservation.status !== 'en_cours') {
      throw new ApiError(409, 'Le retour ne peut être enregistré que sur une location en cours.')
    }

    const { lateHours, extraFees, ...checkpoint } = req.body

    if (reservation.departure?.km != null && checkpoint.km < reservation.departure.km) {
      throw new ApiError(422, 'Le kilométrage de retour est inférieur à celui du départ.', {
        km: `Départ enregistré à ${reservation.departure.km} km`,
      })
    }

    reservation.return = { ...checkpoint, at: new Date(), by: req.user._id }

    const fees = [...extraFees]
    if (lateHours > 0) {
      const settings = await Setting.load()
      const grace = settings.rules?.lateGraceHours ?? 0
      const billable = Math.max(lateHours - grace, 0)
      if (billable > 0) {
        fees.push({
          label: `Retard ${billable} h`,
          amount: billable * (settings.rules?.lateHourFee ?? 100),
        })
      }
    }
    reservation.extraFees = [...(reservation.extraFees || []), ...fees]

    reservation.status = 'terminee'
    reservation.stage = 'retour'
    await reservation.save() // recalculate() applies the km overage

    await Vehicle.updateOne(
      { _id: reservation.vehicle },
      { status: 'disponible', mileage: checkpoint.km }
    )

    await recordAudit({
      user: req.user._id,
      action: 'reservation.return',
      entity: 'Reservation',
      entityId: String(reservation._id),
      summary:
        `${reservation.reference} — retour à ${checkpoint.km} km, ` +
        `${reservation.totals.kmOverage} km de dépassement`,
    })

    res.json({ ok: true, totals: reservation.totals })
  })
)

/** En cours: extend the rental, re-checking the vehicle is still free. */
router.post(
  '/:id/extend',
  validate(z.object({ endDate: z.coerce.date() })),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) throw new ApiError(404, 'Réservation introuvable.')
    if (!['confirmee', 'en_cours'].includes(reservation.status)) {
      throw new ApiError(409, 'Seul un dossier confirmé ou en cours peut être prolongé.')
    }
    if (req.body.endDate <= reservation.endDate) {
      throw new ApiError(422, 'La nouvelle date doit être postérieure à la date de retour actuelle.')
    }

    await assertFree({
      vehicleId: reservation.vehicle,
      start: reservation.startDate,
      end: req.body.endDate,
      exceptId: reservation._id,
    })

    reservation.endDate = req.body.endDate
    await reservation.save()

    await recordAudit({
      user: req.user._id,
      action: 'reservation.extend',
      entity: 'Reservation',
      entityId: String(reservation._id),
      summary: `${reservation.reference} prolongée au ${req.body.endDate.toLocaleDateString('fr-FR')}`,
    })

    res.json({ ok: true, totals: reservation.totals })
  })
)

router.post(
  '/:id/payments',
  validate(
    z.object({
      amount: z.coerce.number().positive('Montant requis'),
      method: z.enum(PAYMENT_METHODS).default('especes'),
      date: z.coerce.date().optional(),
      reference: z.string().trim().optional(),
      note: z.string().trim().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) throw new ApiError(404, 'Réservation introuvable.')

    reservation.payments.push({ ...req.body, recordedBy: req.user._id })
    await reservation.save()

    await recordAudit({
      user: req.user._id,
      action: 'reservation.payment',
      entity: 'Reservation',
      entityId: String(reservation._id),
      summary: `${reservation.reference} — encaissement ${req.body.amount} DH`,
    })

    res.status(201).json({ ok: true, totals: reservation.totals, payments: reservation.payments })
  })
)

router.post(
  '/:id/return-deposit',
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) throw new ApiError(404, 'Réservation introuvable.')
    if (reservation.status !== 'terminee') {
      throw new ApiError(409, 'La caution se restitue après le retour du véhicule.')
    }

    reservation.depositReturnedAt = new Date()
    await reservation.save()

    await recordAudit({
      user: req.user._id,
      action: 'reservation.deposit_returned',
      entity: 'Reservation',
      entityId: String(reservation._id),
      summary: `${reservation.reference} — caution restituée`,
    })

    res.json({ ok: true })
  })
)

router.post(
  '/:id/cancel',
  requireRole('admin', 'manager'),
  validate(z.object({ reason: z.string().trim().min(1, 'Motif requis') })),
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id)
    if (!reservation) throw new ApiError(404, 'Réservation introuvable.')
    if (reservation.status === 'terminee') {
      throw new ApiError(409, 'Un dossier terminé ne peut pas être annulé.')
    }

    reservation.status = 'annulee'
    reservation.cancelledAt = new Date()
    reservation.cancelReason = req.body.reason
    await reservation.save()

    /* Free the vehicle unless another live file still holds it. */
    const stillBusy = await Reservation.exists({
      vehicle: reservation.vehicle,
      status: { $in: ['confirmee', 'en_cours'] },
    })
    if (!stillBusy) {
      await Vehicle.updateOne(
        { _id: reservation.vehicle, status: { $in: ['reserve', 'loue'] } },
        { status: 'disponible' }
      )
    }

    await recordAudit({
      user: req.user._id,
      action: 'reservation.cancel',
      entity: 'Reservation',
      entityId: String(reservation._id),
      summary: `${reservation.reference} annulée — ${req.body.reason}`,
    })

    res.json({ ok: true })
  })
)

export default router
