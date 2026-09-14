import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'
import { dashboardSummary, priorityAlerts } from '../services/metrics.js'

const router = Router()

router.use(requireAuth)

/** Everything the Tableau de bord shows, in one request. */
router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    res.json(await dashboardSummary())
  })
)

router.get(
  '/alerts',
  asyncHandler(async (req, res) => {
    const withinDays = Number(req.query.days) || 30
    res.json(await priorityAlerts({ withinDays }))
  })
)

export default router
