import { Router } from 'express'
import { z } from 'zod'
import { QuoteRequest } from '../models/QuoteRequest.js'
import { ContactMessage } from '../models/ContactMessage.js'
import { recordAudit } from '../models/AuditLog.js'
import { QUOTE_STATUS } from '../models/constants.js'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'

const router = Router()
router.use(requireAuth)

/* ---------------------------------------------------- car wash enquiries -- */

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.status) filter.status = req.query.status

    const rows = await QuoteRequest.find(filter)
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()

    const counts = await QuoteRequest.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }])

    res.json({
      rows: rows.map((r) => ({ ...r, id: String(r._id) })),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    })
  })
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const row = await QuoteRequest.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName')
      .lean()
    if (!row) throw new ApiError(404, 'Demande introuvable.')
    res.json({ ...row, id: String(row._id) })
  })
)

const quoteLineSchema = z.object({
  label: z.string().trim().min(1),
  quantity: z.coerce.number().min(0).default(1),
  unitPrice: z.coerce.number().min(0).default(0),
})

router.patch(
  '/:id',
  validate(
    z.object({
      status: z.enum(QUOTE_STATUS).optional(),
      assignedTo: z.string().optional(),
      internalNotes: z.string().trim().optional(),
      quote: z
        .object({
          lines: z.array(quoteLineSchema).optional(),
          validUntil: z.coerce.date().optional(),
        })
        .optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const row = await QuoteRequest.findById(req.params.id)
    if (!row) throw new ApiError(404, 'Demande introuvable.')

    if (req.body.status) row.status = req.body.status
    if (req.body.assignedTo) row.assignedTo = req.body.assignedTo
    if (req.body.internalNotes !== undefined) row.internalNotes = req.body.internalNotes

    if (req.body.quote) {
      row.quote = { ...(row.quote?.toObject?.() || row.quote || {}), ...req.body.quote }
      row.quote.total = row.quoteTotal()
    }

    await row.save()
    res.json({ ...row.toJSON(), id: String(row._id) })
  })
)

/** Marks the quote as sent. Emailing it is the notification layer's job. */
router.post(
  '/:id/send',
  asyncHandler(async (req, res) => {
    const row = await QuoteRequest.findById(req.params.id)
    if (!row) throw new ApiError(404, 'Demande introuvable.')
    if (!row.quote?.lines?.length) {
      throw new ApiError(422, 'Ajoutez au moins une ligne au devis avant de l’envoyer.')
    }

    row.quote.total = row.quoteTotal()
    row.quote.sentAt = new Date()
    row.status = 'devis_envoye'
    await row.save()

    await recordAudit({
      user: req.user._id,
      action: 'quote.send',
      entity: 'QuoteRequest',
      entityId: String(row._id),
      summary: `Devis ${row.reference} envoyé — ${row.quote.total} DH`,
    })

    res.json({ ok: true, total: row.quote.total })
  })
)

router.post(
  '/:id/respond',
  validate(z.object({ accepted: z.coerce.boolean() })),
  asyncHandler(async (req, res) => {
    const row = await QuoteRequest.findById(req.params.id)
    if (!row) throw new ApiError(404, 'Demande introuvable.')

    row.status = req.body.accepted ? 'accepte' : 'refuse'
    row.quote = row.quote || {}
    row.quote.respondedAt = new Date()
    await row.save()

    res.json({ ok: true, status: row.status })
  })
)

/* -------------------------------------------------------- contact inbox -- */

router.get(
  '/inbox/messages',
  asyncHandler(async (req, res) => {
    const filter = {}
    if (req.query.handled !== undefined) filter.handled = req.query.handled === 'true'

    const rows = await ContactMessage.find(filter).sort({ createdAt: -1 }).limit(200).lean()
    res.json(rows.map((r) => ({ ...r, id: String(r._id) })))
  })
)

router.patch(
  '/inbox/messages/:id',
  validate(z.object({ handled: z.coerce.boolean() })),
  asyncHandler(async (req, res) => {
    const row = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { handled: req.body.handled, handledBy: req.user._id },
      { new: true }
    )
    if (!row) throw new ApiError(404, 'Message introuvable.')
    res.json({ ...row.toJSON(), id: String(row._id) })
  })
)

export default router
