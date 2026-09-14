/**
 * Sanity-checks the seeded dataset.
 *
 * Two things matter: the numbers have to describe a business that could
 * plausibly exist, and the data must obey the same rules the API enforces —
 * above all, no two blocking reservations on one vehicle may overlap.
 */

import { connectDB, disconnectDB } from '../src/config/db.js'
import { seedDatabase } from '../src/seed/seed.js'
import { Reservation } from '../src/models/Reservation.js'
import { Vehicle } from '../src/models/Vehicle.js'
import { BLOCKING_STATUSES } from '../src/models/constants.js'
import {
  chargesBetween, occupancyRate, revenueBetween, startOfMonth, endOfDay,
} from '../src/services/metrics.js'

const fmt = (n) => `${Math.round(n).toLocaleString('fr-FR')} DH`

await connectDB()
await seedDatabase()

let failures = 0
const check = (name, ok, detail = '') => {
  if (!ok) failures += 1
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}

/* ---- no overlapping bookings on a vehicle ---- */
const vehicles = await Vehicle.find({ fleetType: 'tourisme' }).lean()
let overlaps = 0
for (const v of vehicles) {
  const rows = await Reservation.find({ vehicle: v._id, status: { $in: BLOCKING_STATUSES } })
    .sort({ startDate: 1 })
    .select('reference startDate endDate')
    .lean()
  for (let i = 1; i < rows.length; i += 1) {
    if (rows[i].startDate < rows[i - 1].endDate) {
      overlaps += 1
      console.log(`     overlap on ${v.brand} ${v.model}: ${rows[i - 1].reference} / ${rows[i].reference}`)
    }
  }
}
check('no overlapping reservations on any vehicle', overlaps === 0, `${overlaps} overlap(s)`)

/* ---- the month has to make commercial sense ---- */
const from = startOfMonth(new Date())
const to = endOfDay(new Date())
const rev = await revenueBetween(from, to)
const charges = await chargesBetween(from, to)
const occ = await occupancyRate(from, to)

console.log(`\n  CA du mois       ${fmt(rev.revenue)}`)
console.log(`  Charges du mois  ${fmt(charges)}`)
console.log(`  Résultat         ${fmt(rev.revenue - charges)}`)
console.log(`  Occupation       ${occ}%`)
console.log(`  Locations        ${rev.rentals}\n`)

check('turnover covers the monthly charges', rev.revenue > charges, `${fmt(rev.revenue)} vs ${fmt(charges)}`)
check('occupancy is plausible (40–90%)', occ >= 40 && occ <= 90, `${occ}%`)
check('a realistic number of rentals started this month', rev.rentals >= 15, `${rev.rentals}`)

/* ---- the operational queues are not empty ---- */
const counts = Object.fromEntries(
  (await Reservation.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]))
    .map((r) => [r._id, r.n])
)
console.log('  par statut:', counts, '\n')

check('finished rentals exist', (counts.terminee || 0) > 50, `${counts.terminee}`)
check('rentals are out right now', (counts.en_cours || 0) >= 3, `${counts.en_cours}`)
check('bookings ahead exist', (counts.confirmee || 0) >= 5, `${counts.confirmee}`)
check('public requests await validation', (counts.demande || 0) >= 4, `${counts.demande}`)

/* ---- profitability must not be uniformly negative ---- */
const { vehicleProfitability } = await import('../src/services/metrics.js')
const prof = await vehicleProfitability(from, to)
const profitable = prof.filter((v) => v.result > 0).length
console.log(`  véhicules rentables ce mois: ${profitable}/${prof.length}`)
check('most vehicles are profitable', profitable >= prof.length / 2, `${profitable}/${prof.length}`)

await disconnectDB()
console.log(`\n${failures ? `${failures} check(s) failed` : 'all checks passed'}`)
process.exit(failures ? 1 : 0)
