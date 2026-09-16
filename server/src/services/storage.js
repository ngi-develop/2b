import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { env } from '../config/env.js'

/**
 * File storage.
 *
 * Files go to a directory on disk, outside the code tree, mounted on a Docker
 * volume so they survive a redeploy. This module is the only place that knows
 * that: routes deal in public URLs and opaque keys, so moving to S3 later
 * means rewriting this file and nothing above it.
 */

const here = path.dirname(fileURLToPath(import.meta.url))

/** Absolute path of the upload root. Created on first use. */
export const uploadRoot = env.uploadDir
  ? path.resolve(env.uploadDir)
  : path.resolve(here, '../../uploads')

/** The URL prefix the files are served under. */
export const PUBLIC_PREFIX = '/uploads'

/* What we accept, and the extension each type is stored with. Storing the
   extension we chose — never the one the client sent — is what stops a file
   called "x.php" or "x.svg" being served back as something executable. */
const ACCEPTED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'application/pdf': '.pdf',
}

export const ACCEPTED_MIME = Object.keys(ACCEPTED)
export const ACCEPTED_LABEL = 'JPEG, PNG, WebP, AVIF ou PDF'

export function isAccepted(mimetype) {
  return Object.prototype.hasOwnProperty.call(ACCEPTED, mimetype)
}

export function extensionFor(mimetype) {
  return ACCEPTED[mimetype] || ''
}

export function ensureRoot() {
  fs.mkdirSync(uploadRoot, { recursive: true })
  return uploadRoot
}

/** Opaque, unguessable name. The original filename is never trusted or used. */
export function newKey(mimetype) {
  return crypto.randomBytes(16).toString('hex') + extensionFor(mimetype)
}

export function publicUrl(key) {
  return `${PUBLIC_PREFIX}/${key}`
}

/**
 * Turns a stored public URL back into a key, refusing anything that is not a
 * plain filename in our own namespace. Path traversal, absolute paths and
 * foreign URLs all resolve to null rather than to a file on disk.
 */
export function keyFromUrl(url) {
  if (typeof url !== 'string') return null
  const value = url.startsWith(`${PUBLIC_PREFIX}/`) ? url.slice(PUBLIC_PREFIX.length + 1) : url
  if (!/^[a-f0-9]{32}\.[a-z0-9]{2,5}$/i.test(value)) return null
  return value
}

export function absolutePath(key) {
  const safe = keyFromUrl(key)
  if (!safe) return null
  const full = path.join(uploadRoot, safe)
  // Belt and braces: the resolved path must still be inside the root.
  if (!full.startsWith(uploadRoot + path.sep)) return null
  return full
}

export async function removeFile(url) {
  const full = absolutePath(url)
  if (!full) return false
  try {
    await fs.promises.unlink(full)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') return false
    throw err
  }
}

export async function storedFiles() {
  try {
    return await fs.promises.readdir(uploadRoot)
  } catch {
    return []
  }
}
