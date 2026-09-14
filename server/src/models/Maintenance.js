import mongoose from 'mongoose'
import { MAINTENANCE_STATUS, MAINTENANCE_TYPES } from './constants.js'

/**
 * Échéances & Maintenance.
 *
 * This collection only ever holds *upcoming actions*. Financing details stay
 * on the Vehicle and money stays in Charge — completing a job here creates the
 * Charge rather than storing an amount in two places.
 */
const maintenanceSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, index: true },
    type: { type: String, enum: MAINTENANCE_TYPES, required: true, index: true },
    label: { type: String, required: true },

    /* Due either on a date, at a mileage, or both. */
    dueDate: { type: Date, index: true },
    dueMileage: Number,

    garage: String,
    note: String,

    status: { type: String, enum: MAINTENANCE_STATUS, default: 'a_prevoir', index: true },
    completedAt: Date,
    cost: Number,
    charge: { type: mongoose.Schema.Types.ObjectId, ref: 'Charge' },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

/** Distance still to run before the job is due, given the vehicle's odometer. */
maintenanceSchema.methods.kmRemaining = function (currentMileage) {
  if (typeof this.dueMileage !== 'number' || typeof currentMileage !== 'number') return null
  return this.dueMileage - currentMileage
}

maintenanceSchema.methods.daysRemaining = function (from = new Date()) {
  if (!this.dueDate) return null
  return Math.ceil((this.dueDate - from) / 86400000)
}

export const Maintenance = mongoose.model('Maintenance', maintenanceSchema)
