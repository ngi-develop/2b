import mongoose from 'mongoose'
import {
  PAYMENT_METHODS,
  RESERVATION_STAGES,
  RESERVATION_STATUS,
} from './constants.js'

const DAY_MS = 86400000

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    method: { type: String, enum: PAYMENT_METHODS, default: 'especes' },
    reference: String,
    note: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

const optionSchema = new mongoose.Schema(
  {
    code: String,
    name: { type: String, required: true },
    price: { type: Number, required: true },
    unit: { type: String, enum: ['jour', 'forfait'], default: 'jour' },
  },
  { _id: false }
)

/** Condition report, filled at départure and again at retour. */
const checkpointSchema = new mongoose.Schema(
  {
    at: Date,
    km: Number,
    fuel: { type: Number, min: 0, max: 8 }, // eighths of a tank
    photos: [String],
    damages: [String],
    notes: String,
    signature: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
)

const reservationSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },

    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', index: true },

    /* A public request arrives before a Client record exists — the contact
       details are kept here until an agent converts the demande. */
    requester: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      country: String,
      licenceYears: String,
      flight: String,
      message: String,
    },

    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true, index: true },
    pickupLocation: String,
    dropoffLocation: String,

    status: { type: String, enum: RESERVATION_STATUS, default: 'demande', index: true },
    stage: { type: String, enum: RESERVATION_STAGES, default: 'reservation' },

    /* Terms are copied onto the reservation at creation: changing a
       vehicle's price later must not rewrite historic contracts. */
    pricePerDay: { type: Number, required: true },
    kmIncluded: { type: Number, default: 200 },
    extraKmPrice: { type: Number, default: 3 },
    deposit: { type: Number, default: 0 },
    depositReceived: { type: Number, default: 0 },
    depositReturnedAt: Date,

    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    options: [optionSchema],
    extraFees: [{ label: String, amount: Number }],

    payments: [paymentSchema],

    departure: checkpointSchema,
    return: checkpointSchema,

    /* Derived — recomputed by recalculate() on every save. Stored so the
       list views and finance aggregations do not have to recompute. */
    totals: {
      days: Number,
      base: Number,
      optionsTotal: Number,
      extraFeesTotal: Number,
      kmAllowed: Number,
      kmDriven: Number,
      kmOverage: Number,
      kmOverageAmount: Number,
      total: Number,
      paid: Number,
      balance: Number,
    },

    cancelledAt: Date,
    cancelReason: String,
    source: { type: String, enum: ['site', 'dashboard', 'telephone'], default: 'dashboard' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
  },
  { timestamps: true }
)

/** Billed days, inclusive of the departure day; a same-day rental is one day. */
reservationSchema.methods.countDays = function () {
  const diff = Math.round((this.endDate - this.startDate) / DAY_MS)
  return Math.max(diff, 1)
}

/**
 * Single source of truth for the money on a reservation.
 *
 * Mileage overage is only charged once both odometer readings exist, which
 * is what makes the retour step recalculate the balance automatically:
 *   départ 40 000, retour 41 350, 1 000 inclus -> 350 x 3 DH = 1 050 DH.
 */
reservationSchema.methods.recalculate = function () {
  const days = this.countDays()

  const base = Math.max(this.pricePerDay * days - (this.discount || 0), 0)

  const optionsTotal = (this.options || []).reduce(
    (sum, o) => sum + (o.unit === 'jour' ? o.price * days : o.price),
    0
  )

  const extraFeesTotal = (this.extraFees || []).reduce((sum, f) => sum + (f.amount || 0), 0)

  const kmAllowed = (this.kmIncluded || 0) * days
  const hasBothReadings =
    typeof this.departure?.km === 'number' && typeof this.return?.km === 'number'
  const kmDriven = hasBothReadings ? Math.max(this.return.km - this.departure.km, 0) : 0
  const kmOverage = hasBothReadings ? Math.max(kmDriven - kmAllowed, 0) : 0
  const kmOverageAmount = kmOverage * (this.extraKmPrice || 0)

  const total =
    base + optionsTotal + (this.deliveryFee || 0) + extraFeesTotal + kmOverageAmount

  const paid = (this.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0)

  this.totals = {
    days,
    base,
    optionsTotal,
    extraFeesTotal,
    kmAllowed,
    kmDriven,
    kmOverage,
    kmOverageAmount,
    total,
    paid,
    balance: total - paid,
  }

  return this.totals
}

reservationSchema.pre('save', function (next) {
  this.recalculate()
  next()
})

reservationSchema.set('toJSON', { virtuals: true })

export const Reservation = mongoose.model('Reservation', reservationSchema)
