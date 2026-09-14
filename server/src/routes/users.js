import { Router } from 'express'
import { z } from 'zod'
import { User } from '../models/User.js'
import { recordAudit } from '../models/AuditLog.js'
import { ROLES } from '../models/constants.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { validate } from '../middleware/validate.js'

const router = Router()
router.use(requireAuth, requireRole('admin'))

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await User.find().sort({ lastName: 1 }).lean()
    res.json(users.map((u) => ({ ...u, id: String(u._id), fullName: `${u.firstName} ${u.lastName}` })))
  })
)

const createSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.string().trim().email('Adresse e-mail invalide'),
  password: z.string().min(8, 'Au moins 8 caractères'),
  role: z.enum(ROLES).default('agent'),
  phone: z.string().trim().optional(),
})

router.post(
  '/',
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const { password, ...rest } = req.body
    const user = new User(rest)
    await user.setPassword(password)
    await user.save()

    await recordAudit({
      user: req.user._id,
      action: 'user.create',
      entity: 'User',
      entityId: String(user._id),
      summary: `Utilisateur créé : ${user.firstName} ${user.lastName} (${user.role})`,
    })

    res.status(201).json(user.toJSON())
  })
)

router.patch(
  '/:id',
  validate(
    z.object({
      firstName: z.string().trim().min(1).optional(),
      lastName: z.string().trim().min(1).optional(),
      email: z.string().trim().email().optional(),
      role: z.enum(ROLES).optional(),
      phone: z.string().trim().optional(),
      active: z.coerce.boolean().optional(),
      password: z.string().min(8).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('+passwordHash')
    if (!user) throw new ApiError(404, 'Utilisateur introuvable.')

    /* An administrator must not be able to lock themselves out, or demote
       the last remaining administrator. */
    const selfEdit = String(user._id) === String(req.user._id)
    if (selfEdit && (req.body.active === false || (req.body.role && req.body.role !== 'admin'))) {
      throw new ApiError(400, 'Vous ne pouvez pas retirer votre propre accès administrateur.')
    }
    if (user.role === 'admin' && (req.body.role && req.body.role !== 'admin')) {
      const admins = await User.countDocuments({ role: 'admin', active: true })
      if (admins <= 1) throw new ApiError(400, 'Il doit rester au moins un administrateur actif.')
    }

    const { password, ...rest } = req.body
    Object.assign(user, rest)
    if (password) await user.setPassword(password)
    await user.save()

    await recordAudit({
      user: req.user._id,
      action: 'user.update',
      entity: 'User',
      entityId: String(user._id),
      summary: `Utilisateur modifié : ${user.firstName} ${user.lastName}`,
      meta: Object.keys(req.body).filter((k) => k !== 'password'),
    })

    res.json(user.toJSON())
  })
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (String(req.params.id) === String(req.user._id)) {
      throw new ApiError(400, 'Vous ne pouvez pas supprimer votre propre compte.')
    }
    const user = await User.findById(req.params.id)
    if (!user) throw new ApiError(404, 'Utilisateur introuvable.')

    /* Deactivate rather than delete: audit rows reference this user. */
    user.active = false
    await user.save()

    await recordAudit({
      user: req.user._id,
      action: 'user.deactivate',
      entity: 'User',
      entityId: String(user._id),
      summary: `Accès désactivé : ${user.firstName} ${user.lastName}`,
    })

    res.json({ ok: true, deactivated: true })
  })
)

export default router
