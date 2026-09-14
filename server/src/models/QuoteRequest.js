import mongoose from 'mongoose'
import { QUOTE_STATUS } from './constants.js'

/**
 * Car Wash professional enquiry — the only output of the /professionnel page.
 *
 * No price is ever published for this track, so nothing here is a catalogue
 * line: the quote is written by hand after the team reviews the dossier.
 */
const quoteRequestSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true, index: true },

    fullName: { type: String, required: true },
    companyName: String,
    city: { type: String, required: true },
    country: { type: String, default: 'Maroc' },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },

    vehicleCount: { type: Number, required: true, min: 1 },
    duration: String,
    startDate: Date,
    zone: String,
    equipped: String,
    products: [String],
    delivery: String,
    training: String,
    message: String,
    attachmentUrl: String,
    attachmentName: String,

    status: { type: String, enum: QUOTE_STATUS, default: 'nouveau', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    /* Written by the team, sent to the client, accepted or refused by them. */
    quote: {
      lines: [{ label: String, quantity: Number, unitPrice: Number }],
      total: Number,
      validUntil: Date,
      sentAt: Date,
      respondedAt: Date,
    },

    internalNotes: String,
  },
  { timestamps: true }
)

quoteRequestSchema.methods.quoteTotal = function () {
  return (this.quote?.lines || []).reduce(
    (sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0),
    0
  )
}

export const QuoteRequest = mongoose.model('QuoteRequest', quoteRequestSchema)
