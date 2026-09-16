# 2B Location

Vehicle rental platform for a Moroccan company, built from the two
specification PDFs at the root of this repository:

- `2B LOCATION SITEWEB.pdf` — the public website
- `Dashboard 2B Location .pdf` — the internal management software

MERN: MongoDB + Express + React + Node.

```
2b/
  client/     React 19 + Vite — public site and dashboard
  server/     Express 5 + Mongoose — API
```

## Running it

```bash
# 1. API  (http://localhost:5000)
cd server
cp .env.example .env
npm install
npm start

# 2. Front end  (http://localhost:5173)
cd ../client
npm install
npm run dev
```

With `MONGODB_URI` left empty the server boots an **in-memory MongoDB and
seeds it automatically**, so the whole stack runs with no database installed.
That data is wiped on restart. To persist it:

```bash
docker compose up -d mongo                 # mongo:7 only, for local dev
# then in server/.env
MONGODB_URI=mongodb://127.0.0.1:27017/2b_location
npm run seed                               # populate it once
```

For a real deployment see [Deploying](#deploying) — `docker compose up -d
--build` runs the whole stack, front end included.

Seeded administrator: `admin@2blocation.ma` / `Change-me-2026`
(also `nadia@…` as responsable and `yassine@…` as agent, same password).

## Deploying

The site is a Vite SPA: `git pull` brings **source only**, never the built
bundle (`dist/` is gitignored). Pulling on a server changes nothing visible
until something rebuilds it. That is what this section is for.

```bash
cp .env.example .env          # set JWT_SECRET and SEED_ADMIN_PASSWORD
docker compose up -d --build
docker compose exec app npm run seed:catalogue   # first deploy
```

`seed:catalogue` creates the administrator, the settings **and the fleet** —
the catalogue the public site sells. It invents no clients, no reservations
and no accounting entries, and it is safe to re-run: if vehicles already
exist it does nothing.

Do not use `npm run seed -- --keep` to stand a site up. It stops after the
admin and settings, so the database has no vehicles and the home page shows
no cars at all.

The site is then on `http://<host>:8080` (`APP_PORT` in `.env`). One image
builds the front end and serves it from the API on a single origin, so there
is no CORS and no nginx vhost to keep in sync — put your own proxy in front
for TLS if you want one.

### Redeploying

```bash
git pull && docker compose up -d --build
```

**`--build` is the important part.** Without it Docker reuses the existing
image, the front end is never rebuilt, and the site does not change.

Seeding is not part of a redeploy — the database persists in its own volume.

| command | creates |
|---|---|
| `npm run seed:catalogue` | admin, settings, fleet — the production bootstrap |
| `npm run seed -- --keep` | admin and settings only, no vehicles |
| `npm run seed` | a full demo company; **refuses to run in production** |

### Without Docker

```bash
git pull
cd client && npm ci && npm run build     # <- the step that is easy to forget
cd ../server && npm ci --omit=dev
NODE_ENV=production MONGODB_URI=... JWT_SECRET=... node src/index.js
```

Express serves `client/dist` whenever that build exists, so the API and the
site come from the same process. Use a process manager (systemd, pm2) to
keep it up.

### If a deploy does not show up

- `docker compose ps` — is `2b-app` running, and is it `healthy`?
- `docker compose logs app --tail=50` — in production the server **refuses to
  boot** without `JWT_SECRET` and `MONGODB_URI`, and says so.
- `curl -I https://<host>/` — `index.html` must come back `Cache-Control:
  no-cache`. Asset filenames are content-hashed and served `immutable`, so a
  real rebuild always produces new URLs; if the HTML still references the old
  hashes, the image was not rebuilt.

### If the home page shows no cars

`curl https://<host>/api/vehicles` — an empty `[]` means the database has no
fleet, which is what `seed -- --keep` leaves behind. Run:

```bash
docker compose exec app npm run seed:catalogue
```

The catalogue sections hide themselves when there is no fleet, so an empty
database shows a shorter page rather than headings over empty space.

## Checks

```bash
cd server
npm run test:api      # 76 end-to-end API assertions against a throwaway DB
node scripts/check-seed.js   # the seeded data has to describe a real business
```

`test:api` covers the rules that actually matter: no double-booking, no
confirming a blacklisted client without an administrator, no Car Wash vehicle
in the public catalogue, no price in a quote response, and a return that
recalculates the balance from the odometer.

## The two tracks

The brief is built on two customer journeys that must never mix, and the code
keeps them apart at the data layer — `Vehicle.fleetType` — not just in the UI.

| | Particuliers / touristes | Professionnels — Car Wash |
|---|---|---|
| Public route | `/flotte` | `/professionnel` |
| Catalogue | public, filterable | none |
| Prices | per day, published | never published |
| Availability | live, date-driven | none |
| Outcome | reservation **request** | quote **request** |

Every public vehicle query starts from `{ fleetType: 'tourisme', published: true }`.
A reservation request is a *demande*, not a booking: it waits for a human in
the dashboard, and every screen says so.

## Dashboard

Behind `/dashboard`, JWT-authenticated, following the eight sections of the
brief in its order.

| Module | What it answers |
|---|---|
| Tableau de bord | How is the business doing? |
| Planning | Which vehicles are free, and when? |
| Réservations | Which rentals do I have to handle? |
| Flotte | How is each vehicle performing? Add, edit and retire vehicles. |
| Clients | Who are my customers? |
| Finances | What do I earn and what do I spend? |
| Échéances & maintenance | What must I do next? |
| Paramètres | How is the software configured? |

Plus **Demandes Car Wash** — the only internal surface of the professional
track — and the contact inbox from the public site.

### The design rule

> Toute donnée saisie à un endroit doit alimenter automatiquement les autres
> modules concernés.

Implemented rather than restated:

- A client created inside a reservation lands in **Clients** in the same write.
- Confirming a reservation puts it on the **Planning** — same collection, queried.
- Recording a **départ** sets the vehicle to *loué* and writes its odometer.
- Recording a **retour** reads the odometer back, bills the mileage overage
  (`350 km × 3 DH = 1 050 DH`), recomputes the balance, frees the vehicle.
- Completing a **maintenance** job creates the vehicle **Charge** — the cost is
  never keyed twice, and it appears in Finances and in that vehicle's P&L.
- Revenue is never entered by hand: it is aggregated from reservations.

Money lives in exactly one place. `Reservation.recalculate()` is the only
thing that computes a total, and it runs on every save.

## Architecture

```
server/src/
  models/        Mongoose schemas + the shared vocabulary (constants.js)
  services/      availability, pricing/metrics, reference numbers
  routes/        one router per module
  middleware/    auth (JWT + roles), zod validation, error shaping
  seed/          a realistic six-month operating history

client/src/
  api/           http.js (fetch + token) · client.js (public) · dashboard.js
  pages/         public site
  dashboard/     shell, auth context, one page per module
  styles/        tokens → base → layout → ui → pages → overrides → dashboard
  vendor/        React Bits components, kept diffable against upstream
```

### Rules enforced server-side

- **No overlapping rentals.** Derived from reservations, never stored. Two
  windows overlap when each starts before the other ends, so a booking may
  start on the day another ends. `POST /confirm` refuses and names the clash.
- **Blacklisted clients** cannot hold a confirmed reservation; only an
  administrator can override, and the override is written to the audit log.
- **Adverse client statuses** (`à surveiller`, `blacklisté`) cannot be saved
  without a written reason — enforced in the model, so no route can skip it.
- **Vehicles with history are never deleted**, only immobilised.
- **Roles**: agent (operations), responsable (+ cancellations, settings, client
  standing), administrateur (+ users). An admin cannot demote or lock out
  themselves, and the last active admin cannot be demoted.
- Every sensitive action is written to `AuditLog` → Paramètres → Sécurité.

### Art direction

The dashboard shares the public site's tokens and its hard rules — **no
border-radius, no box-shadow, no gradient, no emoji** — but is tuned for
density: smaller type, hairline tables, flat status fills. Bricolage Grotesque
for headings, Switzer for body.

## Connecting a real deployment

`NODE_ENV=production` refuses to boot without `JWT_SECRET` and `MONGODB_URI`,
and `npm run seed` refuses to wipe a production database (use `-- --keep`,
which only ensures the admin and settings exist).

### Managing the fleet

**Flotte → + Ajouter un véhicule** creates one; the vehicle's own file has
**Modifier** and **Supprimer**. Adding, editing and retiring vehicles needs
the *responsable* role; deleting needs *administrateur*, and the server
refuses to delete a vehicle that has rental history — immobilise it instead,
so past contracts and turnover stay intact.

A vehicle marked *Tourisme* and *publié* appears in the public catalogue
immediately. A *Car Wash* vehicle never does, whatever its publication flag
says.

Photos are Unsplash identifiers for now (`photo-1629005559534-…`), pasted into
the form. Uploading real files needs the storage layer below.

Not yet built: file upload for documents and photos (the fields and URLs
exist, the storage does not), e-mail/WhatsApp notifications, and PDF contract
and invoice generation from the templates in Paramètres.
