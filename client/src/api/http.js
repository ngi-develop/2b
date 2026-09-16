/**
 * Thin fetch wrapper shared by the public site and the dashboard.
 *
 * Requests go to /api, which Vite proxies to the Express server in dev
 * (see vite.config.js) and which sits behind the same origin in production.
 */

const TOKEN_KEY = '2b.token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* private mode — the session simply won't survive a reload */
  }
}

/** Thrown for any non-2xx response; carries the server's message and field errors. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message)
    this.status = status
    this.details = details || null
  }
}

/** Called when the server rejects our token, so the app can send the user back to login. */
let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

export async function request(path, { method = 'GET', body, auth = false, signal } = {}) {
  /* FormData goes through untouched: the browser has to set Content-Type
     itself so it can append the multipart boundary. Setting it by hand here
     produces a boundary-less header and the server rejects the body. */
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData

  const headers = {}
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers,
      signal,
      ...(body !== undefined ? { body: isForm ? body : JSON.stringify(body) } : {}),
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new HttpError(0, 'Serveur injoignable. Vérifiez que l’API est démarrée.')
  }

  if (res.status === 204) return null

  let payload = null
  try {
    payload = await res.json()
  } catch {
    /* empty or non-JSON body */
  }

  if (!res.ok) {
    if (res.status === 401 && auth) onUnauthorized?.()
    throw new HttpError(
      res.status,
      payload?.error || `Erreur ${res.status}`,
      payload?.details
    )
  }

  return payload
}

/** Serialises a query object, dropping empty values. */
export function qs(params = {}) {
  const search = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue
    search.set(k, Array.isArray(v) ? v.join(',') : String(v))
  }
  const str = search.toString()
  return str ? `?${str}` : ''
}
