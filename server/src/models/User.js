import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { ROLES } from './constants.js'

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // select:false so the hash never rides along on an ordinary query.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'agent' },
    phone: String,
    active: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
)

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim()
})

userSchema.methods.setPassword = async function (plain) {
  this.passwordHash = await bcrypt.hash(plain, 12)
}

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

userSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash
    return ret
  },
})

export const User = mongoose.model('User', userSchema)
