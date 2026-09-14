import mongoose from 'mongoose'
import {
  CATEGORIES,
  FLEET_TYPES,
  FUELS,
  TRANSMISSIONS,
  VEHICLE_STATUS,
} from './constants.js'

/** Purchase financing — feeds the Flotte "Financement" panel and produces
 *  the monthly traite échéances. */
const financingSchema = new mongoose.Schema(
  {
    purchasePrice: Number,
    downPayment: Number,
    financedAmount: Number,
    monthlyPayment: Number,
    durationMonths: Number,
    startDate: Date,
    endDate: Date,
  },
  { _id: false }
)

const vehicleSchema = new mongoose.Schema(
  {
    /* Which track this vehicle belongs to. Car Wash vehicles are never
       exposed by the public API — the brief is explicit that the two
       fleets never mix. */
    fleetType: { type: String, enum: FLEET_TYPES, default: 'tourisme', index: true },

    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    version: String,
    slug: { type: String, required: true, unique: true, index: true },

    category: { type: String, enum: CATEGORIES, required: true },
    year: Number,
    plate: { type: String, required: true, unique: true, trim: true, uppercase: true },
    vin: String,

    transmission: { type: String, enum: TRANSMISSIONS, required: true },
    fuel: { type: String, enum: FUELS, required: true },
    seats: { type: Number, default: 5 },
    doors: { type: Number, default: 5 },
    luggage: { type: Number, default: 2 },
    ac: { type: Boolean, default: true },

    mileage: { type: Number, default: 0 },
    status: { type: String, enum: VEHICLE_STATUS, default: 'disponible', index: true },
    statusReason: String,

    /* Commercial terms — the public site reads these directly. */
    pricePerDay: { type: Number, required: true },
    kmIncluded: { type: Number, default: 200 },
    extraKmPrice: { type: Number, default: 3 },
    deposit: { type: Number, default: 8000 },

    /* Whether the vehicle appears in the public catalogue at all. A tourisme
       vehicle can be temporarily delisted without changing its fleetType. */
    published: { type: Boolean, default: true },

    image: String,
    gallery: [String],
    cities: [String],
    blurb: String,
    highlights: [String],

    purchaseDate: Date,
    financing: financingSchema,

    notes: String,
  },
  { timestamps: true }
)

vehicleSchema.virtual('label').get(function () {
  return `${this.brand} ${this.model}`
})

vehicleSchema.index({ brand: 'text', model: 'text', plate: 'text' })

vehicleSchema.set('toJSON', { virtuals: true })

export const Vehicle = mongoose.model('Vehicle', vehicleSchema)
