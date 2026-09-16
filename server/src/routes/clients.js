import { Router } from 'express'
import { z } from 'zod'
import { Client } from '../models/Client.js'
import { Reservation } from '../models/Reservation.js'
import { recordAudit } from '../models/AuditLog.js'
import { CLIENT_STATUS, CLIENT_STATUS_NEEDING_REASON } from '../models/constants.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'
import { removeFile } from '../services/storage.js'

const router = Router()
router.use(requireAuth)

const clientSchema = z.object({
  firstName: z.string().trim().min(1, 'Prénom requis'),
  lastName: z.string().trim().min(1, 'Nom requis'),
  phone: z.string().trim().min(8, 'Téléphone requis'),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().email('Adresse e-mail invalide').optional().or(z.literal('')),
  cin: z.string().trim().optional(),
  birthDate: z.coerce.date().optional(),
  nationality: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  licence: z
    .object({
      number: z.string().trim().optional(),
      issuedAt: z.coerce.date().optional(),
      expiresAt: z.coerce.date().optional(),
    })
    .optional(),
  status: z.enum(CLIENT_STATUS).default('nouveau'),
  statusReason: z.string().trim().optional(),
})

/** Rental totals per client — the Locations / CA généré columns. */
async function statsFor(clientIds) {
  const rows = await Reservation.aggregate([
    { $match: { client: { $in: clientIds }, status: { $ne: 'annulee' } } },
    {
      $group: {
        _id: '$client',
        rentals: { $sum: 1 },
        revenue: { $sum: '$totals.total' },
        outstanding: { $sum: '$totals.balance' },
        lastRental: { $max: '$startDate' },
      },
    },
  ])
  return new Map(rows.map((r) => [String(r._id), r]))
}

/* ------------------------------------------------------------------ list -- */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, status } = req.query

    const filter = {}
    if (status) filter.status = status
    if (q) {
      const rx = new RegExp(String(q).trim(), 'i')
      filter.$or = [{ firstName: rx }, { lastName: rx }, { phone: rx }, { cin: rx }, { email: rx }]
    }

    const clients = await Client.find(filter).sort({ lastName: 1, firstName: 1 }).limit(500).lean()
    const stats = await statsFor(clients.map((c) => c._id))

    res.json(
      clients.map((c) => {
        const s = stats.get(String(c._id))
        return {
          ...c,
          id: String(c._id),
          fullName: `${c.firstName} ${c.lastName}`,
          rentals: s?.rentals || 0,
          revenue: s?.revenue || 0,
          outstanding: Math.max(s?.outstanding || 0, 0),
          lastRental: s?.lastRental || null,
        }
      })
    )
  })
)

/* ---------------------------------------------------------------- lookup -- */

/**
 * Quick search used inside the reservation form. Returns the status badge
 * with the record so an agent sees "BON CLIENT" or "BLACKLISTÉ" the moment
 * they pick someone, without a second round trip.
 */
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const term = String(req.query.q || '').trim()
    if (term.length < 2) return res.json([])

    const rx = new RegExp(term, 'i')
    const clients = await Client.find({
      $or: [{ firstName: rx }, { lastName: rx }, { phone: rx }, { cin: rx }],
    })
      .limit(12)
      .lean()

    const stats = await statsFor(clients.map((c) => c._id))

    res.json(
      clients.map((c) => {
        const s = stats.get(String(c._id))
        return {
          id: String(c._id),
          fullName: `${c.firstName} ${c.lastName}`,
          phone: c.phone,
          cin: c.cin,
          email: c.email,
          status: c.status,
          statusReason: c.statusReason,
          rentals: s?.rentals || 0,
          revenue: s?.revenue || 0,
          outstanding: Math.max(s?.outstanding || 0, 0),
          blocked: c.status === 'blackliste',
        }
      })
    )
  })
)

/* ------------------------------------------------------------------ read -- */

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id)
      .populate('internalNotes.author', 'firstName lastName')
      .lean()
    if (!client) throw new ApiError(404, 'Client introuvable.')

    const history = await Reservation.find({ client: client._id })
      .populate('vehicle', 'brand model plate')
      .select('reference vehicle startDate endDate status totals departure return')
      .sort({ startDate: -1 })
      .lean()

    const billable = history.filter((r) => r.status !== 'annulee')
    const lateReturns = billable.filter((r) => r.return?.at && r.return.at > r.endDate).length
    const damages = billable.filter((r) => (r.return?.damages || []).length > 0).length

    res.json({
      ...client,
      id: String(client._id),
      fullName: `${client.firstName} ${client.lastName}`,
      history,
      summary: {
        rentals: billable.length,
        revenue: billable.reduce((s, r) => s + (r.totals?.total || 0), 0),
        outstanding: Math.max(
          billable.reduce((s, r) => s + (r.totals?.balance || 0), 0),
          0
        ),
        kmDriven: billable.reduce((s, r) => s + (r.totals?.kmDriven || 0), 0),
        lateReturns,
        damages,
      },
    })
  })
)

/* ----------------------------------------------------------------- write -- */

router.post(
  '/',
  validate(clientSchema),
  asyncHandler(async (req, res) => {
    const client = await Client.create({ ...req.body, createdBy: req.user._id })

    await recordAudit({
      user: req.user._id,
      action: 'client.create',
      entity: 'Client',
      entityId: String(client._id),
      summary: `Client créé : ${client.firstName} ${client.lastName}`,
    })

    res.status(201).json({ ...client.toJSON(), id: String(client._id) })
  })
)

router.patch(
  '/:id',
  validate(clientSchema.partial()),
  asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id)
    if (!client) throw new ApiError(404, 'Client introuvable.')

    /* Only a responsable changes a client's standing, and the two adverse
       statuses cannot be set without a written reason. */
    const changingStatus = req.body.status && req.body.status !== client.status
    if (changingStatus && !['admin', 'manager'].includes(req.user.role)) {
      throw new ApiError(403, 'Seul un responsable peut modifier le statut d’un client.')
    }
    if (
      changingStatus &&
      CLIENT_STATUS_NEEDING_REASON.includes(req.body.status) &&
      !(req.body.statusReason || client.statusReason || '').trim()
    ) {
      throw new ApiError(422, 'Un motif est obligatoire pour ce statut.', {
        statusReason: 'Motif requis',
      })
    }

    Object.assign(client, req.body)
    await client.save()

    if (changingStatus) {
      await recordAudit({
        user: req.user._id,
        action: 'client.status_change',
        entity: 'Client',
        entityId: String(client._id),
        summary: `Statut de ${client.firstName} ${client.lastName} → ${client.status}`,
        meta: { reason: client.statusReason },
      })
    }

    res.json({ ...client.toJSON(), id: String(client._id) })
  })
)

/* ------------------------------------------------------------- documents -- */

/**
 * Pièces jointes du dossier client — CIN, passeport, permis.
 *
 * The bytes are uploaded first through /api/uploads, which returns a URL;
 * this only attaches that URL to the client. Keeping the two apart means a
 * failed attach leaves an orphaned file rather than a client row pointing at
 * nothing.
 */
const documentSchema = z.object({
  kind: z.enum(['cin', 'passeport', 'permis', 'autre']).default('autre'),
  label: z.string().trim().optional(),
  url: z.string().trim().min(1, 'Fichier manquant'),
  expiresAt: z.coerce.date().optional(),
})

router.post(
  '/:id/documents',
  validate(documentSchema),
  asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id)
    if (!client) throw new ApiError(404, 'Client introuvable.')

    client.documents.push(req.body)
    await client.save()

    await recordAudit({
      user: req.user._id,
      action: 'client.document.add',
      entity: 'Client',
      entityId: String(client._id),
      summary: `Document ajouté (${req.body.kind}) : ${client.firstName} ${client.lastName}`,
    })

    res.status(201).json({ ok: true, documents: client.documents })
  })
)

router.delete(
  '/:id/documents/:docId',
  asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id)
    if (!client) throw new ApiError(404, 'Client introuvable.')

    const doc = client.documents.id(req.params.docId)
    if (!doc) throw new ApiError(404, 'Document introuvable.')

    const { url } = doc
    doc.deleteOne()
    await client.save()

    /* Detach first, then delete the bytes: if the unlink fails the record is
       already gone, which is the harmless direction to fail in. */
    await removeFile(url)

    await recordAudit({
      user: req.user._id,
      action: 'client.document.delete',
      entity: 'Client',
      entityId: String(client._id),
      summary: `Document supprimé : ${client.firstName} ${client.lastName}`,
    })

    res.json({ ok: true, documents: client.documents })
  })
)

/** Internal note — never visible to the client. */
router.post(
  '/:id/notes',
  validate(z.object({ body: z.string().trim().min(1, 'Note vide') })),
  asyncHandler(async (req, res) => {
    const client = await Client.findById(req.params.id)
    if (!client) throw new ApiError(404, 'Client introuvable.')

    client.internalNotes.push({ body: req.body.body, author: req.user._id })
    await client.save()

    res.status(201).json({ ok: true, notes: client.internalNotes })
  })
)

router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const used = await Reservation.exists({ client: req.params.id })
    if (used) {
      throw new ApiError(409, 'Ce client a un historique de locations et ne peut pas être supprimé.')
    }
    const client = await Client.findByIdAndDelete(req.params.id)
    if (!client) throw new ApiError(404, 'Client introuvable.')

    await recordAudit({
      user: req.user._id,
      action: 'client.delete',
      entity: 'Client',
      entityId: String(client._id),
      summary: `Client supprimé : ${client.firstName} ${client.lastName}`,
    })

    res.json({ ok: true })
  })
)

export default router
