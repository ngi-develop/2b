import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { asyncHandler, ApiError } from '../middleware/error.js'
import { handleUpload, uploadSingle, uploadMany } from '../middleware/upload.js'
import { publicUrl, removeFile } from '../services/storage.js'
import { recordAudit } from '../models/AuditLog.js'

const router = Router()

const describe = (f) => ({
  url: publicUrl(f.filename),
  name: f.originalname,
  size: f.size,
  mimetype: f.mimetype,
})

/* Everything here is staff-only. The one public upload — a professional
   attaching a cahier des charges to a quote request — lives in routes/public.js
   with its own, tighter limits. */
router.use(requireAuth)

router.post(
  '/',
  handleUpload(uploadSingle),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'Aucun fichier reçu.')
    res.status(201).json(describe(req.file))
  })
)

router.post(
  '/batch',
  handleUpload(uploadMany),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new ApiError(400, 'Aucun fichier reçu.')
    res.status(201).json(req.files.map(describe))
  })
)

/**
 * Removing the file itself. Callers are expected to have already detached it
 * from whatever document referenced it — this does not go hunting for
 * references, so an orphaned URL is preferable to a dangling one.
 */
router.delete(
  '/',
  requireRole('admin', 'manager'),
  asyncHandler(async (req, res) => {
    const { url } = req.body || {}
    if (!url) throw new ApiError(400, 'URL du fichier manquante.')

    const removed = await removeFile(url)
    if (removed) {
      await recordAudit({
        user: req.user._id,
        action: 'upload.delete',
        entity: 'Upload',
        entityId: String(url),
        summary: `Fichier supprimé : ${url}`,
      })
    }
    res.json({ ok: true, removed })
  })
)

export default router
