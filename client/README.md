# 2B Location — front end

Public website for a Moroccan vehicle rental company, built from the two
specification PDFs at the repository root. React 19 + Vite + React Router,
plain CSS (no utility framework — the art direction needs precise control).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## The two tracks

The brief is built around two deliberately separate customer journeys, and the
code keeps them separate:

| | Particuliers / touristes | Professionnels — Car Wash |
|---|---|---|
| Route | `/flotte` | `/professionnel` |
| Catalogue | public, filterable | none |
| Prices | shown per day | never shown |
| Availability | live, date-driven | none |
| Outcome | reservation **request** | quote **request** |

Neither ever lists the other's vehicles. A reservation request is not a
confirmed booking: it becomes a *demande* awaiting manual validation in the
company dashboard, and every screen says so.

## Routes

| Path | Page |
|---|---|
| `/` | Home |
| `/flotte` | Fleet, search + filters |
| `/flotte/:slug` | Vehicle detail |
| `/reservation/:slug` | Reservation request |
| `/professionnel` | Car Wash landing + quote form |
| `/a-propos` | About |
| `/zones` | Delivery zones |
| `/faq` | FAQ |
| `/contact` | Contact |
| `/dashboard/connexion` | Dashboard sign-in |

## Structure

```
src/
  api/client.js        API seam — mock now, Express later (see below)
  components/          Header, Footer, cards, form primitives, icons
  data/                Fleet, site copy, verified photo ids
  lib/rental.js        Dates, availability, pricing
  pages/               One file per route
  styles/              tokens → base → layout → ui → pages → overrides
  vendor/reactbits/    Vendored third-party components
```

### Art direction

Bricolage Grotesque 700 for headings, Switzer for body. Hero headline at
`clamp(3rem, 9vw, 8rem)` with `-0.03em` tracking. Asymmetric layouts with copy
held left of centre and imagery bleeding past the right edge. Section spacing
is drawn from an irregular scale (`--s-1` … `--s-5`) so the rhythm never
repeats.

Hard rules, enforced globally in `base.css` and re-enforced over the vendored
components: **no border-radius, no box-shadow, no gradient, no emoji.** Depth
comes from hairline rules, flat colour blocks and scale contrast. Icons are
inline SVG with square caps.

### Vendored components

`src/vendor/reactbits/` holds two React Bits components, kept as close to
upstream as possible so they stay diffable. Their local modifications are
listed in a header comment in each file:

- **ScrollExpand** — the home hero. Added `anchorX`/`anchorY` so the resting
  frame can be pinned to the right edge instead of centred, plus pointer-event
  gating so faded controls go inert.
- **StaggeredMenu** — the site menu (requires `gsap`). Added a `logo` node slot
  and `headerExtras` so the bar can carry the typographic wordmark, the
  dashboard link and the reservation CTA; `onItemNavigate` so links route
  through React Router instead of reloading; French toggle labels.

All restyling lives in `styles/reactbits-overrides.css`, imported last.

### Photography

Unsplash, referenced by photo id in `data/images.js` and sized through `img()`
so cards never pull a 3000px original. Every id was checked to resolve before
being committed. Vehicle photos move to the fleet documents once the API
exists; the editorial shots stay.

## Connecting the back end

Every screen reads through `src/api/client.js`, which currently resolves from
the mock dataset after a short delay. Wiring Express + MongoDB means replacing
the function bodies there — components do not change. Vite already proxies
`/api` to `http://localhost:5000` (see `vite.config.js`).

Endpoints the front end expects:

| Function | Method | Path |
|---|---|---|
| `fetchVehicles` | GET | `/api/vehicles` (filters as query params) |
| `fetchVehicle` | GET | `/api/vehicles/:slug` |
| `fetchOptions` | GET | `/api/options` |
| `submitReservation` | POST | `/api/reservations` |
| `submitQuoteRequest` | POST | `/api/quote-requests` |
| `submitContact` | POST | `/api/contact` |

Still to build: the Express/Mongoose API, and the dashboard itself — tableau de
bord, planning, réservations, flotte, clients, finances, échéances, paramètres —
per `Dashboard 2B Location.pdf`. `/dashboard/connexion` is the entry point and
does not yet authenticate.
