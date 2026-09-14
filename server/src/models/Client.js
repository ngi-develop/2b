import mongoose from 'mongoose'
import { CLIENT_STATUS, CLIENT_STATUS_NEEDING_REASON } from './constants.js'

const documentSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['cin', 'passeport', 'permis', 'autre'], default: 'autre' },
    label: String,
    url: String,
    expiresAt: Date,
  },
  { timestamps: true }
)

const noteSchema = new mongoose.Schema(
  {
    body: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

const clientSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true, index: true },
    whatsapp: String,
    email: { type: String, lowercase: true, trim: true },
    cin: { type: String, trim: true, index: true },
    birthDate: Date,
    nationality: String,
    address: String,
    city: String,
    country: String,

    licence: {
      number: String,
      issuedAt: Date,
      expiresAt: Date,
    },

    documents: [documentSchema],

    status: { type: String, enum: CLIENT_STATUS, default: 'nouveau', index: true },
    /* Mandatory for à_surveiller and blacklisté — enforced below. */
    statusReason: String,

    /* Never shown to the client. */
    internalNotes: [noteSchema],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

clientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim()
})

/** The brief: "Pour À surveiller et Blacklisté, un motif doit obligatoirement
 *  être renseigné." Enforced at the model so no route can skip it. */
clientSchema.pre('validate', function (next) {
  if (CLIENT_STATUS_NEEDING_REASON.includes(this.status) && !this.statusReason?.trim()) {
    return next(
      new Error('Un motif est obligatoire pour les statuts « À surveiller » et « Blacklisté ».')
    )
  }
  next()
})

clientSchema.index({ firstName: 'text', lastName: 'text', phone: 'text', cin: 'text' })

clientSchema.set('toJSON', { virtuals: true })

export const Client = mongoose.model('Client', clientSchema)
