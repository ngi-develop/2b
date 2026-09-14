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
| `/dashboard/*` | Company dashboard (authenticated, lazily loaded) |

## Structure

```
src/
  api/                 http wrapper + public and dashboard clients
  components/          Header, Footer, cards, form primitives, icons
  dashboard/           dashboard shell, auth context, module pages
  data/                Site copy and verified photo ids
  lib/rental.js        Dates and pricing helpers
  pages/               One file per public route
  styles/              tokens → base → layout → ui → pages → overrides → dashboard
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
being committed. Vehicle photos now live on the fleet documents served by the
API; the editorial shots stay here.

## The back end

Both the public site and the dashboard talk to the Express API in `../server`.
Start it first (see the root README) — Vite proxies `/api` to
`http://localhost:5000` in both `dev` and `preview`.

- `src/api/http.js` — fetch wrapper, bearer token, 401 handling
- `src/api/client.js` — public endpoints, no authentication
- `src/api/dashboard.js` — everything behind `/dashboard`

Nothing is mocked any more; `src/data/` now only holds static site copy and
the photo ids.

## Dashboard

`/dashboard/*`, lazily loaded so a visitor to the marketing site never
downloads it. `src/dashboard/` holds the shell, the auth context and one page
per module. It reuses the same design tokens at a higher density — see the
root README for the module list and the rules the server enforces.
