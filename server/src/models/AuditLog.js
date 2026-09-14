import mongoose from 'mongoose'

/** Paramètres → Sécurité → "historique des actions". */
const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    entity: String,
    entityId: String,
    summary: String,
    meta: mongoose.Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)

/** Never let logging break the request that triggered it. */
export async function recordAudit(entry) {
  try {
    await AuditLog.create(entry)
  } catch (err) {
    console.error('[audit] failed to record', err.message)
  }
}
