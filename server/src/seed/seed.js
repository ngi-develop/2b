/**
 * Populates a database with a realistic working state: a fleet, staff,
 * clients across every status, rentals in the past, in progress and booked
 * ahead, charges, upcoming deadlines and Car Wash enquiries.
 *
 *   npm run seed                  # wipes everything and reseeds a demo company
 *   npm run seed -- --catalogue   # admin + settings + the fleet, nothing else
 *   npm run seed -- --keep        # admin + settings only
 *
 * --catalogue is the one a real deployment wants: a fleet to sell, with no
 * invented clients, reservations or accounting entries. It is idempotent.
 *
 * Refuses to wipe a production database.
 */

import mongoose from 'mongoose'
import { pathToFileURL } from 'node:url'
import { connectDB, disconnectDB } from '../config/db.js'
import { env, isProd } from '../config/env.js'
import { User } from '../models/User.js'
import { Vehicle } from '../models/Vehicle.js'
import { Client } from '../models/Client.js'
import { Reservation } from '../models/Reservation.js'
import { Charge } from '../models/Charge.js'
import { Maintenance } from '../models/Maintenance.js'
import { QuoteRequest } from '../models/QuoteRequest.js'
import { ContactMessage } from '../models/ContactMessage.js'
import { Setting } from '../models/Setting.js'
import { AuditLog } from '../models/AuditLog.js'
import { slugify } from '../services/references.js'
import { fleet, carwashFleet, rentalOptions, cities, pickupPoints } from './fleet.js'

const DAY = 86400000
void DAY

const day = (offset, hour = 10) => {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  return d
}

const pick = (arr, i) => arr[i % arr.length]

/**
 * Seeds an already-connected database. Exported so the dev server can call it
 * directly — with the in-memory fallback, a separate `npm run seed` process
 * would populate a database that dies with it.
 */
export async function seedDatabase({ keepOnly = false, catalogueOnly = false } = {}) {
  if (isProd && !keepOnly && !catalogueOnly) {
    throw new Error(
      'Refus de réinitialiser une base de production. Utilisez --catalogue (flotte) ou --keep (admin seul).'
    )
  }

  if (!keepOnly && !catalogueOnly) {
    console.log('[seed] clearing collections…')
    await Promise.all([
      Vehicle.deleteMany({}),
      Client.deleteMany({}),
      Reservation.deleteMany({}),
      Charge.deleteMany({}),
      Maintenance.deleteMany({}),
      QuoteRequest.deleteMany({}),
      ContactMessage.deleteMany({}),
      AuditLog.deleteMany({}),
    ])
  }

  /* ------------------------------------------------------------ settings -- */
  const settings = await Setting.load()
  settings.company = {
    name: '2B Location',
    legal: '2B LOCATION SARL',
    address: '112, boulevard Zerktouni — Casablanca 20250, Maroc',
    phone: '+212 5 22 00 00 00',
    email: 'contact@2blocation.ma',
    ice: '002192016000042',
    rc: 'RC Casablanca 345871',
    currency: 'MAD',
  }
  settings.agencies = [
    { name: 'Casablanca — Zerktouni', city: 'Casablanca', phone: '+212 5 22 00 00 00', active: true },
    { name: 'Marrakech — Guéliz', city: 'Marrakech', phone: '+212 5 24 00 00 00', active: true },
  ]
  settings.rentalOptions = rentalOptions
  settings.lists.cities = cities
  settings.lists.pickupPoints = pickupPoints
  await settings.save()

  /* --------------------------------------------------------------- users -- */
  let admin = await User.findOne({ email: env.seedAdminEmail })
  if (!admin) {
    admin = new User({
      firstName: 'Bilal',
      lastName: 'Benali',
      email: env.seedAdminEmail,
      role: 'admin',
      phone: '+212 6 61 00 00 00',
    })
    await admin.setPassword(env.seedAdminPassword)
    await admin.save()
  }

  /* Demo colleagues share the seed admin password, which is fine for a demo
     and not fine on a real deployment — there, the administrator creates the
     rest of the team from Réglages with passwords of their own. */
  const staffSpec = isProd
    ? []
    : [
        ['Nadia', 'Cherkaoui', 'nadia@2blocation.ma', 'manager'],
        ['Yassine', 'Oubella', 'yassine@2blocation.ma', 'agent'],
      ]
  const staff = [admin]
  for (const [firstName, lastName, email, role] of staffSpec) {
    let u = await User.findOne({ email })
    if (!u) {
      u = new User({ firstName, lastName, email, role })
      await u.setPassword(env.seedAdminPassword)
      await u.save()
    }
    staff.push(u)
  }

  if (keepOnly) {
    console.log('[seed] --keep: administrateur et paramètres vérifiés, rien d’autre touché.')
    return { kept: true }
  }

  /* ------------------------------------------------------------ vehicles -- */
  console.log('[seed] fleet…')

  /* --catalogue re-runs safely: it tops up a fleet rather than duplicating
     one, so a deployment can call it without checking first. */
  if (catalogueOnly && (await Vehicle.countDocuments()) > 0) {
    const have = await Vehicle.countDocuments()
    console.log(`[seed] --catalogue: ${have} véhicule(s) déjà en base, rien à faire.`)
    return { vehicles: have, unchanged: true }
  }

  const vehicles = []
  for (const spec of [...fleet, ...carwashFleet]) {
    const { purchasePrice, monthlyPayment, statusReady, ...rest } = spec
    const v = await Vehicle.create({
      ...rest,
      slug: slugify(`${spec.brand} ${spec.model} ${spec.plate.slice(0, 5)}`),
      purchaseDate: day(-(400 + vehicles.length * 45)),
      /* monthlyPayment 0 means the vehicle was bought outright — it gets a
         purchase price but no instalment schedule and no traite charges. */
      financing: monthlyPayment
        ? {
            purchasePrice,
            downPayment: Math.round(purchasePrice * 0.2),
            financedAmount: Math.round(purchasePrice * 0.8),
            monthlyPayment,
            durationMonths: 60,
            startDate: day(-(400 + vehicles.length * 45)),
            endDate: day(1400 - vehicles.length * 45),
          }
        : { purchasePrice },
    })
    vehicles.push(v)
  }
  const tourism = vehicles.filter((v) => v.fleetType === 'tourisme')

  /* A real deployment wants a catalogue to sell, not invented customers and
     bookings in its production database. Stop here for --catalogue. */
  if (catalogueOnly) {
    console.log(
      `[seed] --catalogue: ${vehicles.length} véhicules créés ` +
        `(${tourism.length} tourisme, ${vehicles.length - tourism.length} Car Wash). ` +
        'Aucun client, aucune réservation, aucune écriture comptable.'
    )
    return { vehicles: vehicles.length, tourism: tourism.length }
  }

  /* ------------------------------------------------------------- clients -- */
  console.log('[seed] clients…')
  const clientSpec = [
    ['Karim', 'Bensaid', '+212 6 61 23 45 67', 'bon', null, 'Client régulier, toujours ponctuel.'],
    ['Youssef', 'Amrani', '+212 6 62 34 56 78', 'nouveau', null, null],
    ['Claire', 'Mercier', '+212 6 63 45 67 89', 'bon', null, 'Touriste française, 3e location.'],
    ['Salma', 'Idrissi', '+212 6 64 56 78 90', 'vip', null, 'Cliente entreprise, facturation mensuelle.'],
    ['Mehdi', 'Tazi', '+212 6 65 67 89 01', 'a_surveiller', '2 retards de restitution en 2025.', null],
    ['Omar', 'Fassi', '+212 6 66 78 90 12', 'blackliste', 'Impayé de 4 200 DH sur la location R-1009.', null],
    ['Leila', 'Haddad', '+212 6 67 89 01 23', 'bon', null, null],
    ['Reda', 'El Amrani', '+212 6 68 90 12 34', 'entreprise', null, 'Shine Mobile Services — flotte Car Wash.'],
    ['Hicham', 'Bourkia', '+212 6 69 01 23 45', 'nouveau', null, null],
    ['Sofia', 'Naciri', '+212 6 60 12 34 56', 'vip', null, 'Transferts aéroport réguliers.'],
  ]

  const clients = []
  for (const [i, [firstName, lastName, phone, status, reason, note]] of clientSpec.entries()) {
    const c = await Client.create({
      firstName,
      lastName,
      phone,
      whatsapp: phone,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g, '')}@example.com`,
      cin: `AB${100000 + i * 4321}`,
      birthDate: day(-(9000 + i * 300)),
      nationality: i % 3 === 0 ? 'Française' : 'Marocaine',
      city: pick(cities, i),
      country: i % 3 === 0 ? 'France' : 'Maroc',
      address: `${10 + i} rue des Orangers, ${pick(cities, i)}`,
      licence: {
        number: `P${480000 + i * 137}`,
        issuedAt: day(-(3000 + i * 120)),
        expiresAt: day(900 + i * 60),
      },
      status,
      statusReason: reason || undefined,
      internalNotes: note ? [{ body: note, author: admin._id }] : [],
      createdBy: admin._id,
    })
    clients.push(c)
  }

  /* -------------------------------------------------------- reservations -- */
  console.log('[seed] reservations…')
  let counter = 1001
  const makeRef = () => `R-${counter++}`

  async function makeReservation(spec) {
    const r = new Reservation({
      reference: makeRef(),
      client: spec.client._id,
      vehicle: spec.vehicle._id,
      startDate: spec.start,
      endDate: spec.end,
      pickupLocation: pick(pickupPoints, spec.i ?? 0),
      dropoffLocation: pick(pickupPoints, spec.i ?? 0),
      status: spec.status,
      stage: spec.stage || 'reservation',
      pricePerDay: spec.vehicle.pricePerDay,
      kmIncluded: spec.vehicle.kmIncluded,
      extraKmPrice: spec.vehicle.extraKmPrice,
      deposit: spec.vehicle.deposit,
      depositReceived: spec.depositReceived || 0,
      depositReturnedAt: spec.depositReturnedAt,
      discount: spec.discount || 0,
      deliveryFee: spec.deliveryFee || 0,
      options: spec.options || [],
      departure: spec.departure,
      return: spec.return,
      payments: spec.payments || [],
      source: spec.source || 'dashboard',
      createdBy: admin._id,
      confirmedBy: spec.status !== 'demande' ? admin._id : undefined,
      requester: spec.requester,
    })
    await r.save()
    return r
  }

  /*
   * Rentals are generated per vehicle, walking a cursor forward, so two
   * bookings on the same vehicle can never overlap — the seed must not be
   * able to produce data that the API's own anti-overlap rule would reject.
   *
   * The gap between rentals scales with the daily price: a citadine turns
   * over almost continuously, a Classe S or a Porsche sits far more. That
   * spread is what makes the profitability ranking say something.
   */
  const rentable = clients.filter((c) => c.status !== 'blackliste')
  let clientCursor = 0
  let n = 0

  for (const [vIndex, vehicle] of tourism.entries()) {
    const gapMax = vehicle.pricePerDay < 600 ? 3 : vehicle.pricePerDay < 1200 ? 6 : 12
    let mileage = vehicle.mileage
    let offset = -182
    let prevEnd = -182
    let snapped = false

    for (;;) {
      const gap = 1 + ((n * 7 + vIndex * 3) % gapMax)
      let startOffset = offset + gap
      const days = 2 + ((n * 5 + vehicle.seats) % 8)

      /* Give the dashboard a couple of real departures today. Only safe when
         the previous rental on this vehicle has already ended. */
      if (!snapped && vIndex < 2 && startOffset > 0 && startOffset <= 8 && prevEnd <= 0) {
        startOffset = 0
        snapped = true
      }

      const endOffset = startOffset + days
      if (startOffset > 40) break

      const start = day(startOffset, 9 + (n % 8))
      const end = day(endOffset, 10 + (n % 6))
      offset = endOffset
      prevEnd = endOffset
      n += 1

      const client = rentable[clientCursor++ % rentable.length]
      const total = vehicle.pricePerDay * days
      const withOptions = n % 3 === 0
      const options = withOptions
        ? [{ code: 'opt-gps', name: 'GPS + forfait data', price: 40, unit: 'jour' }]
        : []
      const optionsTotal = withOptions ? 40 * days : 0

      /* ---- finished ---- */
      if (endOffset < 0) {
        const overage = n % 6 === 0 ? 120 + (n % 5) * 60 : 0
        const driven = vehicle.kmIncluded * days + overage
        const departureKm = mileage
        const returnKm = mileage + driven
        mileage = returnKm

        const due = total + optionsTotal + overage * vehicle.extraKmPrice
        const leaveUnpaid = n % 9 === 0

        await makeReservation({
          i: n,
          client,
          vehicle,
          start,
          end,
          status: 'terminee',
          stage: 'retour',
          options,
          depositReceived: vehicle.deposit,
          depositReturnedAt: n % 8 === 0 ? undefined : day(endOffset + 3),
          departure: { at: start, km: departureKm, fuel: 8, by: admin._id, photos: [], damages: [] },
          return: {
            at: end,
            km: returnKm,
            fuel: 7 + (n % 2),
            by: admin._id,
            photos: [],
            damages: n % 11 === 0 ? ['Rayure pare-chocs arrière'] : [],
          },
          payments: leaveUnpaid
            ? [{ amount: Math.round(due * 0.4), date: start, method: 'especes', recordedBy: admin._id }]
            : [
                { amount: Math.round(due * 0.4), date: start, method: 'especes', recordedBy: admin._id },
                { amount: due - Math.round(due * 0.4), date: end, method: 'carte', recordedBy: admin._id },
              ],
        })
        continue
      }

      /* ---- out on the road right now ---- */
      if (startOffset <= 0 && endOffset >= 0) {
        await makeReservation({
          i: n,
          client,
          vehicle,
          start,
          end,
          status: 'en_cours',
          stage: 'en_cours',
          options,
          depositReceived: vehicle.deposit,
          departure: { at: start, km: mileage, fuel: 8, by: admin._id, photos: [], damages: [] },
          payments: [
            { amount: Math.round(total * 0.4), date: start, method: 'carte', recordedBy: admin._id },
          ],
        })
        continue
      }

      /* ---- booked ahead ---- */
      await makeReservation({
        i: n,
        client,
        vehicle,
        start,
        end,
        status: 'confirmee',
        options,
        deliveryFee: n % 4 === 0 ? 200 : 0,
        payments:
          n % 3 === 0
            ? []
            : [
                {
                  amount: Math.round(total * 0.3),
                  date: day(Math.max(startOffset - 6, -1)),
                  method: 'virement',
                  recordedBy: admin._id,
                },
              ],
      })
    }

    /* The odometer ends where the last completed rental left it. The local
       doc is updated too, so anything seeded afterwards — the maintenance
       thresholds in particular — reads the mileage the vehicle actually has
       rather than the one it started the history with. */
    vehicle.mileage = mileage
    await Vehicle.updateOne({ _id: vehicle._id }, { mileage })
  }

  /* Requests from the public site, waiting for a human to validate them. */
  const requestSpec = [
    ['Thomas', 'Laurent', 'thomas.laurent@example.fr', '+33 6 12 34 56 78', 'France'],
    ['Amina', 'Zouhair', 'amina.zouhair@example.com', '+212 6 11 22 33 44', 'Maroc'],
    ['Marco', 'Rossi', 'marco.rossi@example.it', '+39 320 111 2233', 'Italie'],
    ['Fatima', 'Berrada', 'fatima.berrada@example.com', '+212 6 55 44 33 22', 'Maroc'],
  ]
  for (const [i, [firstName, lastName, email, phone, country]] of requestSpec.entries()) {
    const vehicle = pick(tourism, i + 7)
    await makeReservation({
      i,
      client: { _id: undefined },
      vehicle,
      start: day(9 + i * 3),
      end: day(14 + i * 3),
      status: 'demande',
      source: 'site',
      requester: {
        firstName,
        lastName,
        email,
        phone,
        country,
        licenceYears: '2 ans et plus',
        message: i === 0 ? 'Arrivée vol AT785 à 23h40, livraison aéroport souhaitée.' : undefined,
      },
    })
  }

  /* ------------------------------------------------------------- charges -- */
  console.log('[seed] charges…')
  const chargePlan = [
    ['assurance', 650, 'Wafa Assurance'],
    ['entretien', 1400, 'Garage Atlas'],
    ['pneus', 3200, 'Pneus Express'],
    ['lavage', 300, 'Shine Mobile'],
    ['carburant', 900, 'Shell Zerktouni'],
    ['reparation', 2100, 'Garage Atlas'],
  ]
  for (let m = 0; m < 6; m += 1) {
    for (const [i, v] of tourism.entries()) {
      // monthly traite
      if (v.financing?.monthlyPayment) {
        await Charge.create({
          amount: v.financing.monthlyPayment,
          date: day(-(m * 30 + 5)),
          category: 'traite',
          supplier: 'Banque Populaire',
          scope: 'vehicle',
          vehicle: v._id,
          comment: `Mensualité ${v.brand} ${v.model}`,
          createdBy: admin._id,
        })
      }
      if ((i + m) % 3 === 0) {
        const [category, amount, supplier] = pick(chargePlan, i + m)
        await Charge.create({
          amount,
          date: day(-(m * 30 + 12)),
          category,
          supplier,
          scope: 'vehicle',
          vehicle: v._id,
          createdBy: admin._id,
        })
      }
    }
    for (const [category, amount, supplier] of [
      ['salaires', 32000, 'Paie mensuelle'],
      ['loyer', 9000, 'SCI Zerktouni'],
      ['marketing', 4500, 'Agence Meta Ads'],
      ['frais_bancaires', 650, 'Banque Populaire'],
    ]) {
      await Charge.create({
        amount,
        date: day(-(m * 30 + 2)),
        category,
        supplier,
        scope: 'company',
        createdBy: admin._id,
      })
    }
  }

  /* --------------------------------------------------------- maintenance -- */
  console.log('[seed] échéances…')
  const maint = [
    [0, 'vidange', 'Vidange + filtres', null, tourism[0].mileage + 650],
    [1, 'assurance', 'Renouvellement assurance', day(8), null],
    [2, 'traite', 'Échéance financement', day(3), null],
    [3, 'entretien', 'Révision 30 000 km', day(14), null],
    [4, 'visite_technique', 'Visite technique annuelle', day(26), null],
    [5, 'pneus', 'Remplacement train avant', null, tourism[5].mileage + 1800],
    [6, 'reparation', 'Climatisation — recharge', day(-3), null],
    [7, 'document', 'Carte grise — renouvellement', day(45), null],
  ]
  for (const [idx, type, label, dueDate, dueMileage] of maint) {
    await Maintenance.create({
      vehicle: tourism[idx]._id,
      type,
      label,
      dueDate: dueDate || undefined,
      dueMileage: dueMileage || undefined,
      garage: 'Garage Atlas — Casablanca',
      status: dueDate && dueDate < new Date() ? 'urgent' : 'a_prevoir',
      createdBy: admin._id,
    })
  }
  await Vehicle.updateOne({ plate: '66789-O-6' }, { status: 'maintenance', statusReason: 'Révision groupe HP' })

  /* ------------------------------------------------------ quote requests -- */
  console.log('[seed] demandes Car Wash…')
  const quotes = [
    ['Reda El Amrani', 'Shine Mobile Services', 'Casablanca', 4, '6 à 12 mois', 'nouveau'],
    ['Salma Idrissi', 'CleanTrack', 'Rabat', 2, '3 à 6 mois', 'en_analyse'],
    ['Hicham Bourkia', null, 'Marrakech', 1, 'Moins d’un mois', 'devis_envoye'],
    ['Nabil Sekkat', 'AutoCare Pro', 'Tanger', 6, 'Plus de 12 mois', 'accepte'],
  ]
  for (const [i, [fullName, companyName, city, vehicleCount, duration, status]] of quotes.entries()) {
    const q = await QuoteRequest.create({
      reference: `D-${2001 + i}`,
      fullName,
      companyName: companyName || undefined,
      city,
      country: 'Maroc',
      phone: `+212 6 7${i} 11 22 33`,
      email: `${fullName.split(' ')[0].toLowerCase()}@example.com`,
      vehicleCount,
      duration,
      startDate: day(20 + i * 10),
      zone: `Grand ${city}`,
      equipped: 'Avec équipements',
      products: ['Shampooing carrosserie', 'Lavage sans eau'],
      delivery: 'Oui',
      training: i % 2 === 0 ? 'Oui' : 'À étudier',
      message: 'Nous ciblons les flottes d’entreprise et les parkings de bureaux.',
      status,
      assignedTo: staff[1]._id,
    })
    if (['devis_envoye', 'accepte'].includes(status)) {
      q.quote = {
        lines: [
          { label: 'Location véhicule aménagé', quantity: vehicleCount, unitPrice: 7800 },
          { label: 'Produits de lavage (mensuel)', quantity: vehicleCount, unitPrice: 900 },
          { label: 'Formation opérateurs', quantity: 1, unitPrice: 3500 },
        ],
        validUntil: day(30),
        sentAt: day(-4),
      }
      q.quote.total = q.quoteTotal()
      await q.save()
    }
  }

  await ContactMessage.create([
    {
      name: 'Julie Fontaine',
      email: 'julie.fontaine@example.fr',
      phone: '+33 6 98 76 54 32',
      city: 'Marrakech',
      subject: 'Une location pour particulier',
      message:
        'Bonjour, nous arrivons le 12 à Ménara pour 10 jours, un 4x4 7 places serait-il disponible ?',
    },
    {
      name: 'Anass Berrada',
      email: 'anass@example.ma',
      city: 'Casablanca',
      subject: 'Une livraison hors zone',
      message: 'Est-il possible de livrer un véhicule à Dakhla la semaine du 20 ?',
      handled: true,
    },
  ])

  /* Align vehicle statuses with what the reservations actually say. */
  const now = new Date()
  for (const v of tourism) {
    if (v.status === 'maintenance') continue
    const live = await Reservation.findOne({
      vehicle: v._id,
      status: { $in: ['confirmee', 'en_cours'] },
      endDate: { $gte: now },
    }).sort({ startDate: 1 })

    let status = 'disponible'
    if (live) status = live.startDate <= now && live.endDate >= now ? 'loue' : 'reserve'
    await Vehicle.updateOne({ _id: v._id }, { status })
  }

  const counts = {
    vehicles: await Vehicle.countDocuments(),
    clients: await Client.countDocuments(),
    reservations: await Reservation.countDocuments(),
    charges: await Charge.countDocuments(),
    maintenance: await Maintenance.countDocuments(),
    quotes: await QuoteRequest.countDocuments(),
    users: await User.countDocuments(),
  }

  console.log('\n[seed] done:', counts)
  console.log(`[seed] admin: ${env.seedAdminEmail} / ${env.seedAdminPassword}\n`)

  return counts
}

/* CLI entry: `npm run seed [-- --keep]`. Importing this module (the dev
   server does, for the in-memory database) must not trigger a reseed. */
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  const keepOnly = process.argv.includes('--keep')
  const catalogueOnly = process.argv.includes('--catalogue')
  connectDB()
    .then(() => seedDatabase({ keepOnly, catalogueOnly }))
    .then(() => disconnectDB())
    .catch(async (err) => {
      console.error('[seed] failed:', err)
      await mongoose.connection.close().catch(() => {})
      process.exit(1)
    })
}
