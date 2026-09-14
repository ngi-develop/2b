import { useEffect, useState } from 'react'

/* ---------------------------------------------------------------- format -- */

const dh = new Intl.NumberFormat('fr-MA', { maximumFractionDigits: 0 })

export function money(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—'
  return `${dh.format(Math.round(Number(n)))} DH`
}

export function num(n) {
  if (n === null || n === undefined) return '—'
  return dh.format(Math.round(Number(n)))
}

export function date(iso, opts = {}) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: opts.year === false ? undefined : '2-digit',
  })
}

export function dateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function dateInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/* ------------------------------------------------------------------ pills -- */

/** Maps a status slug to the flat colour class it should wear. */
const TONE = {
  // vehicles
  disponible: 'ok', reserve: 'soon', loue: 'live',
  maintenance: 'warn', immobilise: 'off', bloque: 'bad',
  // reservations
  demande: 'soon', confirmee: 'ok', en_cours: 'live',
  terminee: 'off', annulee: 'bad',
  // clients
  nouveau: 'soon', bon: 'ok', vip: 'vip',
  a_surveiller: 'warn', blackliste: 'bad', entreprise: 'live',
  // maintenance
  a_prevoir: 'off', planifiee: 'soon', urgent: 'warn', faite: 'ok', en_retard: 'bad',
  // quotes
  en_analyse: 'soon', devis_envoye: 'live', accepte: 'ok', refuse: 'bad',
}

export function Pill({ status, label, tone }) {
  const t = tone || TONE[status] || 'off'
  return (
    <span className={`pill pill--${t}`}>
      <i />
      {label ?? status ?? '—'}
    </span>
  )
}

/* ------------------------------------------------------------------ misc -- */

export function Tile({ label, value, unit, note, variant }) {
  return (
    <div className={`tile${variant ? ` tile--${variant}` : ''}`}>
      <p className="tile__k">{label}</p>
      <p className="tile__v">
        {value}
        {unit && <small>{unit}</small>}
      </p>
      {note && <p className="tile__note">{note}</p>}
    </div>
  )
}

export function Panel({ title, sub, actions, children, flush }) {
  return (
    <section className="panel">
      {(title || actions) && (
        <header className="panel__head">
          {title && <h2 className="panel__title">{title}</h2>}
          {sub && <span className="panel__sub">{sub}</span>}
          {actions && <div className="panel__actions">{actions}</div>}
        </header>
      )}
      <div className={`panel__body${flush ? ' panel__body--flush' : ''}`}>{children}</div>
    </section>
  )
}

export function Empty({ children }) {
  return <p className="panel__empty">{children}</p>
}

export function Loading({ children = 'Chargement…' }) {
  return <p className="loading">{children}</p>
}

export function Banner({ tone = 'error', children }) {
  if (!children) return null
  return <div className={`banner banner--${tone}`}>{children}</div>
}

/** A form field wired to a flat state object. */
export function Field({ label, name, value, onChange, error, type = 'text', full, options, ...rest }) {
  const id = `f-${name}`
  return (
    <div className={`dfield${full ? ' dfield--full' : ''}${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {options ? (
        <select id={id} value={value ?? ''} onChange={(e) => onChange(name, e.target.value)} {...rest}>
          {options.map((o) => {
            const val = typeof o === 'string' ? o : o.value
            const lab = typeof o === 'string' ? o : o.label
            return (
              <option key={val} value={val}>
                {lab}
              </option>
            )
          })}
        </select>
      ) : type === 'textarea' ? (
        <textarea id={id} value={value ?? ''} onChange={(e) => onChange(name, e.target.value)} {...rest} />
      ) : (
        <input
          id={id}
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
          {...rest}
        />
      )}
      {error && <span className="dfield__err">{error}</span>}
    </div>
  )
}

/** Modal with escape-to-close and a scroll lock. */
export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal__head">
          <h2 className="modal__title">{title}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__foot">{footer}</footer>}
      </div>
    </div>
  )
}

/** Debounces a value — used by the search inputs so every keystroke isn't a request. */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

/**
 * Loads data on mount and whenever `deps` change, with loading and error
 * state and a `reload` handle. Ignores responses from superseded requests.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.resolve(fn())
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((err) => alive && setState({ data: null, loading: false, error: err.message }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { ...state, reload: () => setNonce((n) => n + 1) }
}
