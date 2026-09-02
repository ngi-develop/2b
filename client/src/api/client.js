/**
 * API seam.
 *
 * Every screen reads through these functions, so wiring the Express + Mongo
 * backend later means replacing the bodies here — not touching components.
 * Today they resolve from the mock dataset after a short delay so loading
 * states are real and not decorative.
 */

import { vehicles, rentalOptions } from '../data/vehicles.js'
import { isAvailable } from '../lib/rental.js'

const LATENCY = 260

function settle(value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY))
}

export async function fetchVehicles(params = {}) {
  const { city, start, end, categories = [], transmission, fuel, seats, maxPrice } = params

  let list = vehicles.slice()

  if (city) list = list.filter((v) => v.cities.includes(city))
  if (categories.length) list = list.filter((v) => categories.includes(v.category))
  if (transmission) list = list.filter((v) => v.transmission === transmission)
  if (fuel) list = list.filter((v) => v.fuel === fuel)
  if (seats) list = list.filter((v) => v.seats >= Number(seats))
  if (maxPrice) list = list.filter((v) => v.pricePerDay <= Number(maxPrice))

  // Unavailable vehicles stay visible but flagged, per the brief.
  list = list.map((v) => ({ ...v, available: isAvailable(v, start, end) }))

  return settle(list)
}

export async function fetchVehicle(slug) {
  const found = vehicles.find((v) => v.slug === slug)
  if (!found) return settle(null)
  return settle({ ...found })
}

export async function fetchOptions() {
  return settle(rentalOptions)
}

/** Reservation request — becomes a "demande" in the company dashboard. */
export async function submitReservation(payload) {
  console.info('[2B] demande de réservation', payload)
  return settle({
    ok: true,
    reference: `R-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'en attente de validation',
  })
}

/** Professional Car Wash quote request. No price is ever returned here. */
export async function submitQuoteRequest(payload) {
  console.info('[2B] demande de devis professionnel', payload)
  return settle({
    ok: true,
    reference: `D-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'en cours d’analyse',
  })
}

export async function submitContact(payload) {
  console.info('[2B] message contact', payload)
  return settle({ ok: true })
}
