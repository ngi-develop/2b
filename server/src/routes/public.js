import { Router } from 'express'
import { z } from 'zod'
import { Vehicle } from '../models/Vehicle.js'
import { Reservation } from '../models/Reservation.js'
import { QuoteRequest } from '../models/QuoteRequest.js'
import { ContactMessage } from '../models/ContactMessage.js'
import { Setting } from '../models/Setting.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'
import { busyVehicleIds, isVehicleFree } from '../services/availability.js'
import { nextQuoteReference, nextReservationReference } from '../services/references.js'
import { handleUpload, uploadSingle } from '../middleware/upload.js'
import { publicUrl } from '../services/storage.js'
import { rateLimit } from '../middleware/rateLimit.js'

const router = Router()

/* Only ever the tourism fleet. The Car Wash track has no public catalogue,
   no published price and no availability — enforced by this filter, which
   every public vehicle query starts from. */
const PUBLIC_FILTER = { fleetType: 'tourisme', published: true }

const PUBLIC_FIELDS =
  'slug brand model version category year transmission fuel seats doors luggage ac ' +
  'pricePerDay kmIncluded extraKmPrice deposit image gallery cities blurb highlights'

const dateish = z.coerce.date()

/* ------------------------------------------------------------ catalogue -- */

const listQuery = z.object({
  city: z.string().trim().optional(),
  start: dateish.optional(),
  end: dateish.optional(),
  category: z.string().trim().optional(),
  transmission: z.string().trim().optional(),
  fuel: z.string().trim().optional(),
  seats: z.coerce.number().int().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
})

router.get(
  '/vehicles',
  validate(listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { city, start, end, category, transmission, fuel, seats, maxPrice } = req.query

    const filter = { ...PUBLIC_FILTER }
    if (city) filter.cities = city
    if (category) filter.category = category
    if (transmission) filter.transmission = transmission
    if (fuel) filter.fuel = fuel
    if (seats) filter.seats = { $gte: seats }
    if (maxPrice) filter.pricePerDay = { $lte: maxPrice }

    const vehicles = await Vehicle.find(filter).select(PUBLIC_FIELDS).sort({ pricePerDay: 1 }).lean()

    /* Unavailable vehicles stay in the list, flagged — the brief is explicit
       that they remain visible rather than disappearing. */
    let busy = new Set()
    if (start && end && end > start) busy = await busyVehicleIds(start, end)

    res.json(
      vehicles.map((v) => ({
        ...v,
        id: String(v._id),
        available: !busy.has(String(v._id)),
      }))
    )
  })
)

router.get(
  '/vehicles/:slug',
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findOne({ ...PUBLIC_FILTER, slug: req.params.slug })
      .select(PUBLIC_FIELDS)
      .lean()
    if (!vehicle) throw new ApiError(404, 'Véhicule introuvable.')

    const { start, end } = req.query
    let available = true
    if (start && end) {
      available = await isVehicleFree({
        vehicleId: vehicle._id,
        start: new Date(start),
        end: new Date(end),
      })
    }

    res.json({ ...vehicle, id: String(vehicle._id), available })
  })
)

router.get(
  '/options',
  asyncHandler(async (_req, res) => {
    const settings = await Setting.load()
    res.json(
      (settings.rentalOptions || [])
        .filter((o) => o.active !== false)
        .map((o) => ({ id: o.code, name: o.name, note: o.note, price: o.price, unit: o.unit }))
    )
  })
)

router.get(
  '/site-config',
  asyncHandler(async (_req, res) => {
    const s = await Setting.load()
    res.json({
      company: s.company,
      cities: s.lists?.cities || [],
      pickupPoints: s.lists?.pickupPoints || [],
      rules: s.rules,
    })
  })
)

/* -------------------------------------------------- reservation request -- */

const reservationRequestSchema = z
  .object({
    vehicleSlug: z.string().min(1),
    start: dateish,
    end: dateish,
    pickup: z.string().min(1),
    dropoff: z.string().min(1),
    firstName: z.string().trim().min(1, 'Prénom requis'),
    lastName: z.string().trim().min(1, 'Nom requis'),
    email: z.string().trim().email('Adresse e-mail invalide'),
    phone: z.string().trim().min(8, 'Numéro de téléphone invalide'),
    country: z.string().trim().min(1, 'Pays requis'),
    licenceYears: z.string().optional(),
    flight: z.string().optional(),
    message: z.string().max(2000).optional(),
    options: z.array(z.string()).default([]),
  })
  .refine((d) => d.end > d.start, {
    message: 'La restitution doit suivre le départ',
    path: ['end'],
  })

router.post(
  '/reservations',
  validate(reservationRequestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body

    const vehicle = await Vehicle.findOne({ ...PUBLIC_FILTER, slug: body.vehicleSlug })
    if (!vehicle) throw new ApiError(404, 'Véhicule introuvable.')

    /* Re-check here: the catalogue may have been rendered minutes ago. This
       is only a soft check — the request is a demande, and the binding
       overlap guard runs again when an agent confirms it. */
    const free = await isVehicleFree({
      vehicleId: vehicle._id,
      start: body.start,
      end: body.end,
    })
    if (!free) {
      throw new ApiError(409, 'Ce véhicule vient d’être réservé sur ces dates.')
    }

    const settings = await Setting.load()
    const chosen = (settings.rentalOptions || [])
      .filter((o) => body.options.includes(o.code))
      .map((o) => ({ code: o.code, name: o.name, price: o.price, unit: o.unit }))

    const reservation = new Reservation({
      reference: await nextReservationReference(),
      vehicle: vehicle._id,
      requester: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        country: body.country,
        licenceYears: body.licenceYears,
        flight: body.flight,
        message: body.message,
      },
      startDate: body.start,
      endDate: body.end,
      pickupLocation: body.pickup,
      dropoffLocation: body.dropoff,
      status: 'demande',
      source: 'site',
      pricePerDay: vehicle.pricePerDay,
      kmIncluded: vehicle.kmIncluded,
      extraKmPrice: vehicle.extraKmPrice,
      deposit: vehicle.deposit,
      options: chosen,
    })

    await reservation.save()

    res.status(201).json({
      ok: true,
      reference: reservation.reference,
      status: 'en attente de validation',
      totals: reservation.totals,
    })
  })
)

/* ------------------------------------------------------- car wash quote -- */

const quoteSchema = z.object({
  fullName: z.string().trim().min(1, 'Nom et prénom requis'),
  companyName: z.string().trim().optional(),
  city: z.string().trim().min(1, 'Ville requise'),
  country: z.string().trim().default('Maroc'),
  phone: z.string().trim().min(8, 'Numéro de téléphone invalide'),
  email: z.string().trim().email('Adresse e-mail invalide'),
  vehicleCount: z.coerce.number().int().min(1, 'Indiquez au moins un véhicule'),
  duration: z.string().optional(),
  startDate: dateish.optional(),
  zone: z.string().trim().min(1, 'Zone d’utilisation requise'),
  equipped: z.string().optional(),
  products: z.array(z.string()).default([]),
  delivery: z.string().optional(),
  training: z.string().optional(),
  message: z.string().max(4000).optional(),
  attachmentName: z.string().optional(),
  attachmentUrl: z.string().optional(),
})

router.post(
  '/quote-requests',
  validate(quoteSchema),
  asyncHandler(async (req, res) => {
    const quote = await QuoteRequest.create({
      ...req.body,
      reference: await nextQuoteReference(),
      status: 'nouveau',
    })

    /* No price is returned. Ever. The tariff depends on volume, duration,
       zone, equipment and services, and is written by hand. */
    res.status(201).json({
      ok: true,
      reference: quote.reference,
      status: 'en cours d’analyse',
    })
  })
)

/**
 * The one unauthenticated upload: a professional attaching a cahier des
 * charges to a quote request, which the brief asks for by name.
 *
 * Rate-limited per IP because it writes to disk without a login. The type
 * allowlist and size cap come from the shared upload middleware.
 */
router.post(
  '/quote-attachments',
  rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: 'Trop d’envois de fichiers. Réessayez dans quelques minutes.',
  }),
  handleUpload(uploadSingle),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'Aucun fichier reçu.')
    res.status(201).json({
      url: publicUrl(req.file.filename),
      name: req.file.originalname,
      size: req.file.size,
    })
  })
)

/* ---------------------------------------------------------------- contact -- */

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis'),
  email: z.string().trim().email('Adresse e-mail invalide'),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  subject: z.string().trim().optional(),
  message: z.string().trim().min(10, 'Merci de détailler un peu votre demande'),
})

router.post(
  '/contact',
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    await ContactMessage.create(req.body)
    res.status(201).json({ ok: true })
  })
)

export default router
