import fs from 'node:fs/promises'
import { Vehicle } from '../models/Vehicle.js'
import { Client } from '../models/Client.js'
import { Reservation } from '../models/Reservation.js'
import { QuoteRequest } from '../models/QuoteRequest.js'
import { uploadRoot, ensureRoot, publicUrl } from './storage.js'

/**
 * Removes stored files that nothing points at any more.
 *
 * Two things create them. A professional uploads a cahier des charges on the
 * public form and then closes the tab without sending — that endpoint is
 * unauthenticated, so without this the disk grows on its own. And a photo
 * swapped out in the dashboard whose delete call failed leaves its bytes
 * behind.
 *
 * The grace period is what makes this safe: a file is only a candidate once
 * it is older than `graceHours`, so one uploaded seconds ago and not yet
 * attached to its record is never taken out from under the form that is
 * still being filled in.
 */

/** Every upload URL referenced by any document, as a set of bare keys. */
async function referencedKeys() {
  const keys = new Set()
  const add = (url) => {
    if (typeof url === 'string' && url.startsWith('/uploads/')) {
      keys.add(url.slice('/uploads/'.length))
    }
  }

  const [vehicles, clients, reservations, quotes] = await Promise.all([
    Vehicle.find({}, 'image gallery').lean(),
    Client.find({}, 'documents.url').lean(),
    Reservation.find({}, 'departure.photos departure.signature return.photos return.signature').lean(),
    QuoteRequest.find({}, 'attachmentUrl').lean(),
  ])

  for (const v of vehicles) {
    add(v.image)
    for (const g of v.gallery || []) add(g)
  }
  for (const c of clients) {
    for (const d of c.documents || []) add(d.url)
  }
  for (const r of reservations) {
    for (const side of [r.departure, r.return]) {
      if (!side) continue
      for (const p of side.photos || []) add(p)
      add(side.signature)
    }
  }
  for (const q of quotes) add(q.attachmentUrl)

  return keys
}

export async function sweepUploads({ graceHours = 24, dryRun = false } = {}) {
  ensureRoot()

  const cutoff = Date.now() - graceHours * 3600_000
  const keys = await referencedKeys()

  let entries
  try {
    entries = await fs.readdir(uploadRoot)
  } catch {
    return { scanned: 0, removed: 0 }
  }

  let removed = 0
  for (const name of entries) {
    if (keys.has(name)) continue

    const full = `${uploadRoot}/${name}`
    let stat
    try {
      stat = await fs.stat(full)
    } catch {
      continue
    }
    if (!stat.isFile() || stat.mtimeMs > cutoff) continue

    if (!dryRun) {
      try {
        await fs.unlink(full)
      } catch {
        continue
      }
    }
    removed += 1
    console.log(`[sweep] orphelin supprimé : ${publicUrl(name)}`)
  }

  return { scanned: entries.length, removed }
}

/**
 * Runs the sweep now and once a day after that. Returns a stop function.
 * Failures are logged, never thrown — a full disk is a problem, a crashed
 * API because of housekeeping is a worse one.
 */
export function startUploadSweeper({ graceHours = 24, everyMs = 24 * 3600_000 } = {}) {
  const run = () =>
    sweepUploads({ graceHours })
      .then(({ scanned, removed }) => {
        if (removed) console.log(`[sweep] ${removed}/${scanned} fichier(s) orphelin(s) supprimé(s)`)
      })
      .catch((err) => console.error('[sweep] échec:', err.message))

  run()
  const timer = setInterval(run, everyMs)
  timer.unref?.()
  return () => clearInterval(timer)
}
