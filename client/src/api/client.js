/**
 * Public site API.
 *
 * These are the only calls the marketing site makes. None of them require a
 * token, and none of them can reach the Car Wash fleet — that filtering is
 * enforced server-side, not here.
 */

import { request, qs } from './http.js'

export function fetchVehicles(params = {}) {
  const { city, start, end, categories = [], transmission, fuel, seats, maxPrice } = params
  return request(
    `/vehicles${qs({
      city,
      start: start || undefined,
      end: end || undefined,
      // The public endpoint filters on a single category; the rail's
      // multi-select is applied client-side over the result.
      category: categories.length === 1 ? categories[0] : undefined,
      transmission,
      fuel,
      seats,
      maxPrice,
    })}`
  ).then((rows) =>
    categories.length > 1 ? rows.filter((v) => categories.includes(v.category)) : rows
  )
}

export function fetchVehicle(slug, { start, end } = {}) {
  return request(`/vehicles/${encodeURIComponent(slug)}${qs({ start, end })}`).catch((err) => {
    if (err.status === 404) return null
    throw err
  })
}

export function fetchOptions() {
  return request('/options')
}

export function fetchSiteConfig() {
  return request('/site-config')
}

/** Becomes a "demande" awaiting manual validation — never a firm booking. */
export function submitReservation(payload) {
  return request('/reservations', { method: 'POST', body: payload })
}

/** Car Wash enquiry. The response never carries a price. */
export function submitQuoteRequest(payload) {
  return request('/quote-requests', { method: 'POST', body: payload })
}

export function submitContact(payload) {
  return request('/contact', { method: 'POST', body: payload })
}
