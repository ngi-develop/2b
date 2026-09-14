import mongoose from 'mongoose'

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: String,
    city: String,
    subject: String,
    message: { type: String, required: true },
    handled: { type: Boolean, default: false, index: true },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

export const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema)
