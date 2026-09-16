import { useRef, useState } from 'react'
import * as api from '../api/dashboard.js'
import { img } from '../data/images.js'

/**
 * File pickers for the dashboard.
 *
 * Both components below do the same two steps in the same order: send the
 * bytes to /api/uploads, then hand the returned URL back to the caller, which
 * saves it onto whatever record needed it. They never write to a record
 * themselves — that keeps a failed save from leaving a half-attached file.
 *
 * Deleting the stored bytes is deliberately *not* done here either. Removing a
 * photo from this list only detaches it; the file is swept when the record
 * that owns it is saved, so an aborted edit cannot destroy the live photo.
 */

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

function messageFor(err) {
  if (err.status === 413) return err.message
  if (err.status === 415) return err.message
  return err.message || 'Envoi impossible.'
}

/* --------------------------------------------------------------- single -- */

/** One photo: pick, preview, replace, remove. */
export function PhotoField({ label, value, onChange, hint }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pick(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // so re-picking the same file still fires
    if (!file) return

    setBusy(true)
    setError('')
    try {
      const { url } = await api.uploadFile(file)
      onChange(url)
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="upl">
      <span className="upl__label">{label}</span>

      {value ? (
        <div className="upl__one">
          <img className="upl__thumb" src={img(value, 480, 300)} alt="" />
          <div className="upl__acts">
            <button
              type="button"
              className="dbtn dbtn--ghost"
              onClick={() => input.current?.click()}
              disabled={busy}
            >
              Remplacer
            </button>
            <button type="button" className="dbtn dbtn--ghost" onClick={() => onChange('')}>
              Retirer
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="upl__drop"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          {busy ? 'Envoi en cours…' : 'Choisir une photo'}
        </button>
      )}

      {hint && !error && <span className="upl__hint">{hint}</span>}
      {error && <span className="upl__err">{error}</span>}

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={pick}
      />
    </div>
  )
}

/* ---------------------------------------------------------------- many -- */

/** A gallery: add several at once, remove one at a time. */
export function PhotoList({ label, value = [], onChange, max = 8, hint }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const full = value.length >= max

  async function pick(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return

    const room = max - value.length
    if (files.length > room) {
      setError(`${max} photos au maximum — seules les ${room} premières seront envoyées.`)
    } else {
      setError('')
    }

    setBusy(true)
    try {
      const uploaded = await api.uploadFiles(files.slice(0, room))
      onChange([...value, ...uploaded.map((f) => f.url)])
    } catch (err) {
      setError(messageFor(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="upl">
      <span className="upl__label">
        {label}
        <em className="upl__count">
          {value.length}/{max}
        </em>
      </span>

      {value.length > 0 && (
        <ul className="upl__grid">
          {value.map((url) => (
            <li key={url} className="upl__cell">
              <img className="upl__thumb" src={img(url, 320, 200)} alt="" />
              <button
                type="button"
                className="upl__x"
                aria-label="Retirer cette photo"
                onClick={() => onChange(value.filter((u) => u !== url))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="upl__drop upl__drop--slim"
        onClick={() => input.current?.click()}
        disabled={busy || full}
      >
        {busy ? 'Envoi en cours…' : full ? 'Galerie complète' : 'Ajouter des photos'}
      </button>

      {hint && !error && <span className="upl__hint">{hint}</span>}
      {error && <span className="upl__err">{error}</span>}

      <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={pick} />
    </div>
  )
}
