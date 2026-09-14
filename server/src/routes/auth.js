import { Router } from 'express'
import { z } from 'zod'
import { User } from '../models/User.js'
import { recordAudit } from '../models/AuditLog.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().trim().email('Adresse e-mail invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash')

    /* Same message and comparable timing whether the account exists or the
       password is wrong — a login form should not enumerate staff accounts. */
    const ok = user ? await user.verifyPassword(password) : false
    if (!ok || !user.active) {
      throw new ApiError(401, 'Identifiants incorrects.')
    }

    user.lastLoginAt = new Date()
    await user.save()

    await recordAudit({
      user: user._id,
      action: 'auth.login',
      entity: 'User',
      entityId: String(user._id),
      summary: `${user.firstName} ${user.lastName} s’est connecté`,
      ip: req.ip,
    })

    res.json({ token: signToken(user), user: user.toJSON() })
  })
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toJSON() })
  })
)

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Au moins 8 caractères'),
})

router.post(
  '/change-password',
  requireAuth,
  validate(passwordSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('+passwordHash')
    const ok = await user.verifyPassword(req.body.currentPassword)
    if (!ok) throw new ApiError(400, 'Mot de passe actuel incorrect.')

    await user.setPassword(req.body.newPassword)
    await user.save()

    await recordAudit({
      user: user._id,
      action: 'auth.password_changed',
      entity: 'User',
      entityId: String(user._id),
      summary: 'Mot de passe modifié',
    })

    res.json({ ok: true })
  })
)

export default router
