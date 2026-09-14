import mongoose from 'mongoose'
import {
  CHARGE_CATEGORIES,
  CATEGORIES,
  MAINTENANCE_TYPES,
  PAYMENT_METHODS,
} from './constants.js'

/**
 * Paramètres — a single document. Holds configuration only; no day-to-day
 * business data lives here.
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },

    company: {
      name: { type: String, default: '2B Location' },
      legal: { type: String, default: '2B LOCATION SARL' },
      address: String,
      phone: String,
      email: String,
      ice: String,
      rc: String,
      currency: { type: String, default: 'MAD' },
      logoUrl: String,
    },

    agencies: [
      {
        name: String,
        city: String,
        address: String,
        phone: String,
        active: { type: Boolean, default: true },
      },
    ],

    /* Defaults applied to a new reservation; each can be overridden on the
       reservation itself. */
    rules: {
      kmIncludedPerDay: { type: Number, default: 200 },
      extraKmPrice: { type: Number, default: 3 },
      defaultDeposit: { type: Number, default: 8000 },
      minimumDays: { type: Number, default: 1 },
      lateGraceHours: { type: Number, default: 2 },
      lateHourFee: { type: Number, default: 100 },
      freeCancellationHours: { type: Number, default: 72 },
      modificationHours: { type: Number, default: 48 },
    },

    notifications: {
      insuranceDaysBefore: { type: [Number], default: [30, 15, 7] },
      serviceKmBefore: { type: Number, default: 1000 },
      returnToday: { type: Boolean, default: true },
      latePayment: { type: Boolean, default: true },
      newRequest: { type: Boolean, default: true },
    },

    /* "Listes personnalisables" — seeded from the shared vocabulary, then
       editable by a responsable without a deploy. */
    lists: {
      chargeCategories: { type: [String], default: () => [...CHARGE_CATEGORIES] },
      paymentMethods: { type: [String], default: () => [...PAYMENT_METHODS] },
      maintenanceTypes: { type: [String], default: () => [...MAINTENANCE_TYPES] },
      vehicleCategories: { type: [String], default: () => [...CATEGORIES] },
      unavailabilityReasons: {
        type: [String],
        default: ['Maintenance', 'Sinistre', 'Réservé direction', 'Administratif', 'Autre'],
      },
      pickupPoints: { type: [String], default: [] },
      cities: { type: [String], default: [] },
    },

    /* Add-ons offered at reservation time. Priced here so a responsable can
       change them in Paramètres without a deploy; the chosen lines are then
       copied onto each reservation. */
    rentalOptions: [
      {
        code: String,
        name: String,
        note: String,
        price: Number,
        unit: { type: String, enum: ['jour', 'forfait'], default: 'jour' },
        active: { type: Boolean, default: true },
      },
    ],

    documents: {
      contractTemplate: String,
      checkoutTemplate: String,
      invoiceTemplate: String,
      receiptTemplate: String,
    },
  },
  { timestamps: true }
)

/** There is exactly one settings document; create it on first read. */
settingSchema.statics.load = async function () {
  const existing = await this.findOne({ key: 'global' })
  if (existing) return existing
  return this.create({ key: 'global' })
}

export const Setting = mongoose.model('Setting', settingSchema)
