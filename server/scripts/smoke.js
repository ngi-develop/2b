/**
 * End-to-end API check.
 *
 * Boots the app against a throwaway database, seeds it, then exercises the
 * routes the dashboard and the public site actually call — including the
 * rules that matter: no double-booking, no confirming a blacklisted client,
 * no Car Wash vehicle in the public catalogue, and a return that recalculates
 * the balance from the odometer.
 *
 *   npm run test:api
 */

import { createApp } from '../src/app.js'
import { connectDB, disconnectDB } from '../src/config/db.js'
import { seedDatabase } from '../src/seed/seed.js'
import { env } from '../src/config/env.js'
import { keyFromUrl } from '../src/services/storage.js'
import { sweepUploads } from '../src/services/sweepUploads.js'

let passed = 0
let failed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    passed += 1
    console.log(`  ok   ${name}`)
  } else {
    failed += 1
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`)
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

function section(title) {
  console.log(`\n${title}`)
}

async function main() {
  await connectDB()
  await seedDatabase()

  const app = createApp()
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })
  const base = `http://127.0.0.1:${server.address().port}`

  let token = null
  const call = async (method, path, body) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    let json = null
    try {
      json = await res.json()
    } catch {
      /* no body */
    }
    return { status: res.status, body: json }
  }

  /* ------------------------------------------------------------- public -- */
  section('Public API')

  const health = await call('GET', '/api/health')
  check('GET /api/health', health.status === 200 && health.body.ok)

  const cat = await call('GET', '/api/vehicles')
  check('GET /api/vehicles returns the catalogue', cat.status === 200 && cat.body.length === 12,
    `got ${cat.body?.length}`)
  check(
    'catalogue excludes the Car Wash fleet',
    Array.isArray(cat.body) && cat.body.every((v) => v.category !== 'Utilitaire')
  )
  check(
    'catalogue never exposes a Car Wash plate',
    JSON.stringify(cat.body || '').includes('44567-M-6') === false
  )

  const slug = cat.body?.[0]?.slug
  const detail = await call('GET', `/api/vehicles/${slug}`)
  check('GET /api/vehicles/:slug', detail.status === 200 && detail.body.slug === slug)

  const missing = await call('GET', '/api/vehicles/aston-martin-db11')
  check('unknown slug is a 404', missing.status === 404)

  const options = await call('GET', '/api/options')
  check('GET /api/options', options.status === 200 && options.body.length === 6,
    `got ${options.body?.length}`)

  // Availability: a vehicle that is out right now must be flagged.
  const busyFrom = new Date()
  const busyTo = new Date(Date.now() + 2 * 86400000)
  const availability = await call(
    'GET',
    `/api/vehicles?start=${busyFrom.toISOString()}&end=${busyTo.toISOString()}`
  )
  check(
    'availability flags at least one vehicle as taken',
    availability.body.some((v) => v.available === false)
  )
  check(
    'unavailable vehicles stay in the list',
    availability.body.length === cat.body.length
  )

  const badRequest = await call('POST', '/api/reservations', {
    vehicleSlug: slug,
    start: '2026-11-10',
    end: '2026-11-05',
    pickup: 'Agence Casablanca — Zerktouni',
    dropoff: 'Agence Casablanca — Zerktouni',
    firstName: 'Test',
    lastName: 'Visiteur',
    email: 'not-an-email',
    phone: '123',
    country: 'Maroc',
  })
  check('invalid reservation request is rejected', badRequest.status === 422,
    `status ${badRequest.status}`)

  const goodRequest = await call('POST', '/api/reservations', {
    vehicleSlug: slug,
    start: '2026-11-05',
    end: '2026-11-10',
    pickup: 'Agence Casablanca — Zerktouni',
    dropoff: 'Agence Casablanca — Zerktouni',
    firstName: 'Test',
    lastName: 'Visiteur',
    email: 'test.visiteur@example.com',
    phone: '+212600000000',
    country: 'Maroc',
    options: ['opt-gps'],
  })
  check('public reservation request creates a demande',
    goodRequest.status === 201 && /^R-\d+$/.test(goodRequest.body.reference || ''),
    JSON.stringify(goodRequest.body))

  const quote = await call('POST', '/api/quote-requests', {
    fullName: 'Test Pro',
    city: 'Casablanca',
    phone: '+212600000001',
    email: 'pro@example.com',
    vehicleCount: 3,
    zone: 'Grand Casablanca',
  })
  check('car wash quote request accepted', quote.status === 201 && quote.body.reference)
  check('quote response never contains a price',
    !JSON.stringify(quote.body).match(/price|total|DH/i), JSON.stringify(quote.body))

  /* --------------------------------------------------------------- auth -- */
  section('Authentication')

  const noAuth = await call('GET', '/api/dashboard/summary')
  check('dashboard requires a token', noAuth.status === 401)

  const badLogin = await call('POST', '/api/auth/login', {
    email: env.seedAdminEmail,
    password: 'wrong-password',
  })
  check('wrong password is rejected', badLogin.status === 401)

  const login = await call('POST', '/api/auth/login', {
    email: env.seedAdminEmail,
    password: env.seedAdminPassword,
  })
  check('login returns a token', login.status === 200 && Boolean(login.body.token))
  check('login never returns the password hash', !JSON.stringify(login.body).includes('passwordHash'))
  token = login.body.token

  const me = await call('GET', '/api/auth/me')
  check('GET /api/auth/me', me.status === 200 && me.body.user.role === 'admin')

  /* ---------------------------------------------------------- dashboard -- */
  section('Dashboard')

  const summary = await call('GET', '/api/dashboard/summary')
  check('GET /api/dashboard/summary', summary.status === 200)
  check('summary reports fleet counts', summary.body?.fleet?.total === 12,
    `total ${summary.body?.fleet?.total}`)
  check('summary reports month revenue', typeof summary.body?.revenue?.month === 'number' &&
    summary.body.revenue.month > 0, `${summary.body?.revenue?.month}`)
  check('summary reports charges', summary.body?.charges?.month > 0)
  check('summary lists pending requests', summary.body?.queues?.requests?.length >= 4,
    `${summary.body?.queues?.requests?.length}`)
  check('summary produces priority alerts', summary.body?.alerts?.length > 0)
  check('summary ranks vehicles by profitability',
    Array.isArray(summary.body?.topVehicles) && summary.body.topVehicles.length > 0)
  check('occupancy is a percentage',
    summary.body?.occupancy >= 0 && summary.body?.occupancy <= 100, `${summary.body?.occupancy}`)

  /* ------------------------------------------------------------ planning -- */
  section('Planning')

  const planning = await call('GET', '/api/planning')
  check('GET /api/planning', planning.status === 200 && planning.body.vehicles.length === 12)
  check('planning carries occupancy spans',
    planning.body.vehicles.some((v) => (v.spans || []).length > 0))

  /* -------------------------------------------------------------- fleet -- */
  section('Flotte')

  const fleetList = await call('GET', '/api/vehicles-admin')
  check('GET /api/vehicles-admin includes both fleets', fleetList.body.length === 15,
    `got ${fleetList.body.length}`)
  check('fleet rows carry month revenue',
    fleetList.body.some((v) => v.monthRevenue > 0))

  const carwash = await call('GET', '/api/vehicles-admin?fleetType=carwash')
  check('car wash fleet visible in the dashboard', carwash.body.length === 3,
    `got ${carwash.body.length}`)

  const vehicleId = fleetList.body.find((v) => v.fleetType === 'tourisme').id
  const vehicleFile = await call('GET', `/api/vehicles-admin/${vehicleId}`)
  check('vehicle file has activity + profitability',
    vehicleFile.status === 200 &&
      vehicleFile.body.activity &&
      typeof vehicleFile.body.profitability.result === 'number')

  /* ------------------------------------------------------------ clients -- */
  section('Clients')

  const clientList = await call('GET', '/api/clients')
  check('GET /api/clients', clientList.status === 200 && clientList.body.length === 10)
  check('client rows carry rental totals', clientList.body.some((c) => c.rentals > 0))

  const blacklisted = clientList.body.find((c) => c.status === 'blackliste')
  check('a blacklisted client exists with a reason',
    Boolean(blacklisted && blacklisted.statusReason))

  const noReason = await call('PATCH', `/api/clients/${clientList.body[1].id}`, {
    status: 'a_surveiller',
  })
  check('adverse status without a reason is refused', noReason.status === 422,
    `status ${noReason.status}`)

  const withReason = await call('PATCH', `/api/clients/${clientList.body[1].id}`, {
    status: 'a_surveiller',
    statusReason: 'Retard de restitution en août.',
  })
  check('adverse status with a reason is accepted', withReason.status === 200)

  const search = await call('GET', '/api/clients/search?q=Karim')
  check('client quick-search returns the status badge',
    search.status === 200 && search.body[0]?.status)

  /* ------------------------------------------------------- reservations -- */
  section('Réservations')

  const list = await call('GET', '/api/reservations-admin')
  check('GET /api/reservations-admin', list.status === 200 && list.body.rows.length > 0)
  check('list returns tab counts', typeof list.body.counts?.terminee === 'number')

  const filtered = await call('GET', '/api/reservations-admin?status=demande')
  check('status filter works',
    filtered.body.rows.every((r) => r.status === 'demande'))

  const searchRes = await call('GET', '/api/reservations-admin?q=Karim')
  check('reservation search by client name', searchRes.body.rows.length > 0)

  // --- double booking is refused ---
  /* The test windows are in 2027, past the end of the seeded horizon, so any
     tourism vehicle is free then — don't require one that happens to be idle
     today, because at a realistic occupancy rate none is. */
  const tourismVehicles = fleetList.body.filter((v) => v.fleetType === 'tourisme')
  const freeVehicle = tourismVehicles[0]
  const clientOk = clientList.body.find((c) => c.status === 'bon')

  const first = await call('POST', '/api/reservations-admin', {
    clientId: clientOk.id,
    vehicleId: freeVehicle.id,
    startDate: '2027-03-01',
    endDate: '2027-03-06',
    confirm: true,
  })
  check('confirmed reservation created', first.status === 201, JSON.stringify(first.body))

  const overlap = await call('POST', '/api/reservations-admin', {
    clientId: clientOk.id,
    vehicleId: freeVehicle.id,
    startDate: '2027-03-04',
    endDate: '2027-03-09',
    confirm: true,
  })
  check('overlapping confirmation is refused', overlap.status === 409,
    `status ${overlap.status}`)

  const adjacent = await call('POST', '/api/reservations-admin', {
    clientId: clientOk.id,
    vehicleId: freeVehicle.id,
    startDate: '2027-03-06',
    endDate: '2027-03-09',
    confirm: true,
  })
  check('a booking starting on the return day is allowed', adjacent.status === 201,
    `status ${adjacent.status}`)

  // --- blacklist guard ---
  const blocked = await call('POST', '/api/reservations-admin', {
    clientId: blacklisted.id,
    vehicleId: freeVehicle.id,
    startDate: '2027-05-01',
    endDate: '2027-05-04',
    confirm: false,
  })
  check('a demande for a blacklisted client is still recorded', blocked.status === 201)

  /* --- full rental cycle: départ -> retour, with a mileage overage --- */
  section('Cycle de location')

  const cycleVehicle = tourismVehicles.find((v) => v.id !== freeVehicle.id)
  const created = await call('POST', '/api/reservations-admin', {
    clientId: clientOk.id,
    vehicleId: cycleVehicle.id,
    startDate: '2027-08-01',
    endDate: '2027-08-06',
    confirm: true,
  })
  const resId = created.body.id
  const pricePerDay = created.body.pricePerDay
  const kmIncluded = created.body.kmIncluded
  const extraKmPrice = created.body.extraKmPrice

  check('totals computed on creation',
    created.body.totals.days === 5 && created.body.totals.total === pricePerDay * 5,
    `days ${created.body.totals.days}, total ${created.body.totals.total}`)

  const dep = await call('POST', `/api/reservations-admin/${resId}/departure`, {
    km: 40000,
    fuel: 8,
    depositReceived: created.body.deposit,
  })
  check('départ recorded', dep.status === 200)

  const afterDep = await call('GET', `/api/vehicles-admin/${cycleVehicle.id}`)
  check('départ sets the vehicle to loué and syncs the odometer',
    afterDep.body.status === 'loue' && afterDep.body.mileage === 40000,
    `${afterDep.body.status} / ${afterDep.body.mileage}`)

  const overKm = 350
  const ret = await call('POST', `/api/reservations-admin/${resId}/return`, {
    km: 40000 + kmIncluded * 5 + overKm,
    fuel: 7,
  })
  const expectedTotal = pricePerDay * 5 + overKm * extraKmPrice
  check('retour bills the mileage overage',
    ret.body.totals.kmOverage === overKm && ret.body.totals.total === expectedTotal,
    `overage ${ret.body.totals.kmOverage}, total ${ret.body.totals.total} (expected ${expectedTotal})`)

  const afterRet = await call('GET', `/api/vehicles-admin/${cycleVehicle.id}`)
  check('retour releases the vehicle and updates the odometer',
    afterRet.body.status !== 'loue' && afterRet.body.mileage === 40000 + kmIncluded * 5 + overKm,
    `${afterRet.body.status} / ${afterRet.body.mileage}`)

  const pay = await call('POST', `/api/reservations-admin/${resId}/payments`, {
    amount: expectedTotal,
    method: 'carte',
  })
  check('payment clears the balance', pay.body.totals.balance === 0,
    `balance ${pay.body.totals.balance}`)

  const badReturn = await call('POST', `/api/reservations-admin/${resId}/return`, { km: 10 })
  check('a second retour on a closed file is refused', badReturn.status === 409)

  /* ------------------------------------------------------------ finance -- */
  section('Finances')

  const overview = await call('GET', '/api/finance/overview')
  check('GET /api/finance/overview', overview.status === 200)
  check('overview has a monthly series', overview.body.series.length > 0)
  check('overview breaks charges down by category', overview.body.byCategory.length > 0)
  check('overview ranks vehicles', overview.body.byVehicle.length === 12)

  const chargeBad = await call('POST', '/api/finance/charges', {
    amount: 500,
    category: 'entretien',
    scope: 'vehicle',
  })
  check('a vehicle charge without a vehicle is refused', chargeBad.status === 422)

  const chargeOk = await call('POST', '/api/finance/charges', {
    amount: 500,
    category: 'entretien',
    scope: 'vehicle',
    vehicle: vehicleId,
  })
  check('charge created', chargeOk.status === 201)

  /* -------------------------------------------------------- maintenance -- */
  section('Échéances & maintenance')

  const maint = await call('GET', '/api/maintenance')
  check('GET /api/maintenance', maint.status === 200 && maint.body.rows.length === 8)
  check('rows carry a computed urgency',
    maint.body.rows.every((r) => r.computedStatus))
  check('overdue rows sort first', maint.body.rows[0].computedStatus === 'en_retard')
  check('vehicles in the garage are listed', maint.body.inGarage.length === 1)

  const job = maint.body.rows.find((r) => r.status !== 'faite')
  const completed = await call('POST', `/api/maintenance/${job.id}/complete`, {
    cost: 1250,
    supplier: 'Garage Atlas',
  })
  check('completing a job books a charge',
    completed.status === 200 && Boolean(completed.body.chargeId))

  const chargesAfter = await call('GET', '/api/finance/charges?scope=vehicle')
  check('the generated charge appears in Finances',
    chargesAfter.body.some((c) => c.id === completed.body.chargeId))

  /* ------------------------------------------------------------- quotes -- */
  section('Demandes Car Wash')

  const quotes = await call('GET', '/api/quote-requests-admin')
  check('GET /api/quote-requests-admin', quotes.status === 200 && quotes.body.rows.length === 5)

  const draft = quotes.body.rows.find((q) => q.status === 'nouveau')
  const priced = await call('PATCH', `/api/quote-requests-admin/${draft.id}`, {
    quote: { lines: [{ label: 'Location', quantity: 4, unitPrice: 7800 }] },
  })
  check('quote lines total up', priced.body.quote.total === 31200,
    `${priced.body.quote?.total}`)

  const sent = await call('POST', `/api/quote-requests-admin/${draft.id}/send`)
  check('quote can be sent', sent.status === 200 && sent.body.total === 31200)

  /* ----------------------------------------------------------- settings -- */
  section('Paramètres')

  const settings = await call('GET', '/api/settings')
  check('GET /api/settings', settings.status === 200 && settings.body.company.name === '2B Location')

  const vocab = await call('GET', '/api/settings/vocabulary')
  check('vocabulary exposes labels', vocab.body.reservationStatus?.confirmee === 'Confirmée')

  const patched = await call('PATCH', '/api/settings', { rules: { extraKmPrice: 4 } })
  check('settings patch merges without clobbering',
    patched.body.rules.extraKmPrice === 4 && patched.body.company.name === '2B Location')

  const audit = await call('GET', '/api/settings/audit')
  check('audit log records actions', audit.status === 200 && audit.body.length > 0)

  /* -------------------------------------------------------------- roles -- */
  section('Rôles')

  const agentLogin = await call('POST', '/api/auth/login', {
    email: 'yassine@2blocation.ma',
    password: env.seedAdminPassword,
  })
  const adminToken = token
  token = agentLogin.body.token

  const agentUsers = await call('GET', '/api/users')
  check('an agent cannot manage users', agentUsers.status === 403)

  const agentCancel = await call('POST', `/api/reservations-admin/${first.body.id}/cancel`, {
    reason: 'test',
  })
  check('an agent cannot cancel a reservation', agentCancel.status === 403)

  token = adminToken
  const adminUsers = await call('GET', '/api/users')
  check('an admin can list users', adminUsers.status === 200 && adminUsers.body.length === 3)

  const selfDemote = await call('PATCH', `/api/users/${me.body.user.id}`, { role: 'agent' })
  check('an admin cannot demote themselves', selfDemote.status === 400)

  /* ------------------------------------------------------------ uploads -- */
  section('Stockage de fichiers')

  /* A one-pixel PNG. Real bytes, so the type allowlist is exercised rather
     than mocked. */
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )

  const sendFile = async (path, { bytes, type, name, field = 'file', auth = true }) => {
    const form = new FormData()
    form.append(field, new Blob([bytes], { type }), name)
    const res = await fetch(base + path, {
      method: 'POST',
      headers: auth && token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    let json = null
    try {
      json = await res.json()
    } catch {
      /* no body */
    }
    return { status: res.status, body: json }
  }

  const noAuthUpload = await fetch(base + '/api/uploads', { method: 'POST' })
  check('uploading requires a login', noAuthUpload.status === 401)

  const photo = await sendFile('/api/uploads', {
    bytes: pngBytes,
    type: 'image/png',
    name: 'voiture.png',
  })
  check('a staff member can upload a photo', photo.status === 201, `status ${photo.status}`)
  check(
    'the stored name is generated, not the client’s',
    /^\/uploads\/[a-f0-9]{32}\.png$/.test(photo.body?.url || ''),
    photo.body?.url
  )

  const fetched = await fetch(base + photo.body.url)
  check('the uploaded file is served back', fetched.status === 200)
  check(
    'uploads are served with nosniff',
    fetched.headers.get('x-content-type-options') === 'nosniff'
  )
  check(
    'uploads are sandboxed by CSP',
    (fetched.headers.get('content-security-policy') || '').includes("default-src 'none'")
  )

  const script = await sendFile('/api/uploads', {
    bytes: Buffer.from('<svg onload="alert(1)"></svg>'),
    type: 'image/svg+xml',
    name: 'evil.svg',
  })
  check('an SVG is refused', script.status === 415, `status ${script.status}`)

  /* Percent-encoded so the client does not normalise the `..` away before the
     request is sent — otherwise this tests nothing. Whatever comes back, it
     must not be the file being reached for. */
  const traversal = await fetch(`${base}/uploads/%2e%2e%2f%2e%2e%2fpackage.json`)
  const traversalBody = await traversal.text()
  check(
    'path traversal under /uploads does not reach the source tree',
    !traversalBody.includes('"mongoose"'),
    `status ${traversal.status}`
  )
  check(
    'the storage layer rejects a key that is not one of ours',
    keyFromUrl('/uploads/../../package.json') === null &&
      keyFromUrl('/uploads/evil.php') === null &&
      keyFromUrl(photo.body.url) !== null
  )

  const absent = await fetch(base + '/uploads/' + 'a'.repeat(32) + '.png')
  check('an unknown upload 404s rather than falling through to the SPA', absent.status === 404)

  /* Attaching a photo to a vehicle and reading it back on the public site. */
  const someVehicle = (await call('GET', '/api/vehicles-admin?limit=1')).body
  const targetId = (someVehicle.rows || someVehicle)[0]?.id
  const attached = await call('PATCH', `/api/vehicles-admin/${targetId}`, {
    image: photo.body.url,
  })
  check('a vehicle accepts an uploaded photo URL', attached.status === 200 && attached.body.image === photo.body.url)

  /* The public quote attachment — the only unauthenticated write of bytes. */
  const brief = await sendFile('/api/quote-attachments', {
    bytes: Buffer.from('%PDF-1.4 cahier des charges'),
    type: 'application/pdf',
    name: 'cahier.pdf',
    auth: false,
  })
  check('a professional can attach a cahier des charges', brief.status === 201, `status ${brief.status}`)
  check(
    'the attachment keeps its original name in the response',
    brief.body?.name === 'cahier.pdf'
  )

  const withBrief = await call('POST', '/api/quote-requests', {
    fullName: 'Karim Tazi',
    city: 'Agadir',
    phone: '+212600112233',
    email: 'karim@flotte.ma',
    vehicleCount: 4,
    zone: 'Souss-Massa',
    attachmentName: brief.body.name,
    attachmentUrl: brief.body.url,
  })
  check('the enquiry carries the attachment URL', withBrief.status === 201)

  /* Client documents. */
  const aClient = (await call('GET', '/api/clients?limit=1')).body
  const clientId = (aClient.rows || aClient)[0]?.id
  const doc = await call('POST', `/api/clients/${clientId}/documents`, {
    kind: 'cin',
    label: 'CIN recto',
    url: photo.body.url,
  })
  check('a document can be attached to a client', doc.status === 201 && doc.body.documents.length >= 1)

  const docId = doc.body.documents.at(-1)._id
  const removed = await call('DELETE', `/api/clients/${clientId}/documents/${docId}`)
  check('a client document can be removed', removed.status === 200)

  const gone = await fetch(base + photo.body.url)
  check('removing the document deletes the stored file', gone.status === 404, `status ${gone.status}`)

  /* Housekeeping: unattached files are swept, attached ones are not. */
  const orphan = await sendFile('/api/uploads', {
    bytes: pngBytes,
    type: 'image/png',
    name: 'jamais-utilisee.png',
  })
  const attachedPhoto = await sendFile('/api/uploads', {
    bytes: pngBytes,
    type: 'image/png',
    name: 'gardee.png',
  })
  await call('PATCH', `/api/vehicles-admin/${targetId}`, { image: attachedPhoto.body.url })

  const untouched = await sweepUploads({ graceHours: 24 })
  check(
    'the sweep leaves files inside the grace period alone',
    untouched.removed === 0,
    `removed ${untouched.removed}`
  )

  await sweepUploads({ graceHours: 0 })
  check(
    'an unattached file is swept',
    (await fetch(base + orphan.body.url)).status === 404
  )
  check(
    'a file attached to a vehicle survives the sweep',
    (await fetch(base + attachedPhoto.body.url)).status === 200
  )

  /* ------------------------------------------------------------- report -- */
  server.close()
  await disconnectDB()

  console.log(`\n${'='.repeat(52)}`)
  console.log(`  ${passed} passed, ${failed} failed`)
  if (failures.length) {
    console.log('\nFailures:')
    for (const f of failures) console.log(`  - ${f}`)
  }
  console.log('='.repeat(52))

  process.exit(failed ? 1 : 0)
}

main().catch((err) => {
  console.error('\n[smoke] crashed:', err)
  process.exit(1)
})
