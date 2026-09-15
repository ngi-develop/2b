import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import ScrollExpand from '../vendor/reactbits/ScrollExpand.jsx'
import SearchBar from '../components/SearchBar.jsx'
import Marquee from '../components/Marquee.jsx'
import SectionHead from '../components/SectionHead.jsx'
import VehicleCard from '../components/VehicleCard.jsx'
import Reveal from '../components/Reveal.jsx'
import { Arrow, ArrowDown, Headset, Shield, Tag, Truck } from '../components/Icons.jsx'
import { img, shots } from '../data/images.js'
import { fetchVehicles } from '../api/client.js'
import { formatDH } from '../lib/rental.js'
import {
  cities,
  bookingSteps,
  aboutStats,
  company,
  trustPoints,
  proPitch,
} from '../data/site.js'
import useMediaQuery from '../lib/useMediaQuery.js'

/** How many vehicles and categories the landing page previews. */
const PREVIEW_COUNT = 4

/* Which categories to surface, in order of preference. Only those the fleet
   actually contains are shown, so the row never advertises an empty shelf. */
const CATEGORY_ORDER = ['Citadine', 'SUV', 'Berline', 'Premium', '4x4', 'Compacte', 'Familiale']

const TRUST_ICONS = { shield: Shield, headset: Headset, tag: Tag, truck: Truck }

export default function Home() {
  const narrow = useMediaQuery('(max-width: 900px)')
  const [fleet, setFleet] = useState(null)

  useEffect(() => {
    let alive = true
    fetchVehicles()
      .then((rows) => alive && setFleet(rows || []))
      .catch(() => alive && setFleet([]))
    return () => {
      alive = false
    }
  }, [])

  /* `null` until the fetch settles, then an array. The catalogue sections are
     rendered whole or not at all — a heading standing over an empty shelf is
     worse than no section, and that is exactly what a deployment with no
     fleet yet used to show. */
  const hasFleet = Array.isArray(fleet) && fleet.length > 0

  /* Category tiles are derived from the live fleet rather than hard-coded:
     each carries its real "from" price and model count, and a representative
     photograph taken from the dearest car in that category. */
  const categories = useMemo(() => {
    const byCategory = new Map()
    for (const v of fleet || []) {
      if (!byCategory.has(v.category)) byCategory.set(v.category, [])
      byCategory.get(v.category).push(v)
    }
    return CATEGORY_ORDER.filter((c) => byCategory.has(c))
      .slice(0, PREVIEW_COUNT)
      .map((name) => {
        const rows = byCategory.get(name).slice().sort((a, b) => b.pricePerDay - a.pricePerDay)
        return {
          name,
          count: rows.length,
          from: Math.min(...rows.map((v) => v.pricePerDay)),
          image: rows[0].image,
        }
      })
  }, [fleet])

  /* One vehicle spread across the price range rather than the four cheapest,
     so the preview reads as a fleet and not as a discount rack. */
  const preview = useMemo(() => {
    if (!fleet?.length) return []
    const step = Math.max(Math.floor(fleet.length / PREVIEW_COUNT), 1)
    const out = []
    for (let i = 0; i < fleet.length && out.length < PREVIEW_COUNT; i += step) out.push(fleet[i])
    return out
  }, [fleet])

  /* Resting geometry of the hero frame.
     Wide: a full-height column flush to the right edge, headline on the left.
     Narrow: a band across the top, headline stacked underneath. */
  const frame = narrow
    ? { startWidth: 100, startHeight: 42, anchorX: 0.5, anchorY: 0 }
    : { startWidth: 46, startHeight: 100, anchorX: 1, anchorY: 0.5 }

  return (
    <>
      {/* ---------- HERO — ScrollExpand --------------------------------- */}
      <ScrollExpand
        className="hero-expand"
        useWindowScroll
        src={img(shots.heroDefender, 2000)}
        alt="Un 4x4 gris photographié de trois quarts avant, prêt au départ"
        {...frame}
        startRadius={0}
        endRadius={0}
        mediaZoom={1.2}
        scrollDistance={1}
        holdDistance={0.3}
        smoothing={0.09}
        overlayScrim={0.58}
        scrollHint="Défiler"
        title={
          <div className="hero-rest">
            <p className="hero-rest__kicker">
              <span className="eyebrow" style={{ color: 'rgba(252,252,253,.55)' }}>
                Depuis {company.founded} — Casablanca
              </span>
            </p>

            <h1 className="hero-rest__title">
              <span className="line">Louez la</span>
              <span className="line line--indent">
                route, <em>pas</em>
              </span>
              <span className="line">la voiture.</span>
            </h1>

            <p className="hero-rest__lead">
              Une flotte entretenue, livrée là où vous êtes, dans huit villes du Maroc.
              Et, pour les professionnels du lavage, des véhicules déjà équipés pour
              produire dès le premier jour.
            </p>

            <div className="hero-rest__actions">
              <Link to="/flotte" className="btn btn--accent">
                Louer une voiture <Arrow />
              </Link>
              <Link to="/professionnel" className="btn btn--onInk">
                Louer un véhicule Car Wash <Arrow />
              </Link>
            </div>
          </div>
        }
      >
        {/* Fades in once the photograph has taken the whole stage. */}
        <div className="hero-over">
          <p className="hero-over__title">
            62 véhicules, 8 villes, un seul numéro d’assistance.
          </p>
          <dl className="hero-over__stats">
            {aboutStats.map((s) => (
              <div key={s.k}>
                <dt>{s.k}</dt>
                <dd>
                  {s.v}
                  {s.unit}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </ScrollExpand>

      {/* ---------- SEARCH ---------------------------------------------- */}
      <section className="ink-block" style={{ paddingBlock: 'var(--s-1)' }}>
        <div className="shell">
          <div className="searchrow">
            <p className="eyebrow" style={{ color: 'rgba(252,252,253,.55)' }}>
              Vérifier les disponibilités
            </p>
            <p className="mono-note" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <ArrowDown /> Seuls les véhicules réellement libres s’affichent
            </p>
          </div>
          <SearchBar />
        </div>
      </section>

      <Marquee
        items={[...cities, 'Livraison aéroport 24h/24', 'Assistance nationale', 'Sans frais cachés']}
      />

      {/* ---------- 01 · CATEGORIES ------------------------------------- */}
      {hasFleet && (
      <section className="sec sec--lopsided">
        <div className="shell">
          <SectionHead
            index="01"
            eyebrow="Par catégorie"
            title="Choisissez votre catégorie."
            meta="De la citadine à 280 DH la journée au 4x4 sept places préparé pour le désert."
            action={
              <Link to="/flotte" className="textlink" style={{ marginTop: 18 }}>
                Toutes les catégories <Arrow />
              </Link>
            }
          />

          <div className="catgrid">
              {categories.map((c, i) => (
                <Reveal key={c.name} delay={i * 60}>
                  <Link
                    to={`/flotte?category=${encodeURIComponent(c.name)}`}
                    className="catcard"
                    aria-label={`Voir les véhicules de catégorie ${c.name}`}
                  >
                    <img src={img(c.image, 640, 760)} alt="" loading="lazy" />
                    <span className="catcard__veil" />
                    <span className="catcard__label">{c.name}</span>
                    <span className="catcard__meta">
                      {c.count} modèle{c.count > 1 ? 's' : ''}
                      <span>Dès {formatDH(c.from)} / jour</span>
                    </span>
                    <span className="catcard__go">
                      <Arrow />
                    </span>
                  </Link>
                </Reveal>
              ))}
          </div>
        </div>
      </section>
      )}

      {/* ---------- 02 · POPULAR VEHICLES ------------------------------- */}
      {hasFleet && (
      <section className="sec--2" style={{ paddingBottom: 'var(--s-3)' }}>
        <div className="shell">
          <SectionHead
            index="02"
            eyebrow="Les plus demandés"
            title="Véhicules populaires."
            meta="Prix à la journée, kilométrage inclus et caution connus avant la réservation."
            action={
              <Link to="/flotte" className="textlink" style={{ marginTop: 18 }}>
                Tous les véhicules <Arrow />
              </Link>
            }
          />

          <div className="fleet-grid">
            {preview.map((v) => (
              <VehicleCard key={v.id} vehicle={v} cta />
            ))}
          </div>
        </div>
      </section>
      )}

      {/* ---------- TRUST BAND ------------------------------------------ */}
      <section className="ink-block" style={{ paddingBlock: 'var(--s-1)' }}>
        <div className="shell">
          <div className="trustband">
            {trustPoints.map((t) => {
              const Icon = TRUST_ICONS[t.icon]
              return (
                <div className="trustband__cell" key={t.title}>
                  <span className="trustband__icon">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="trustband__title">{t.title}</p>
                    <p className="trustband__note">{t.note}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ---------- 03 · EDITORIAL SPLIT — bleed right ------------------ */}
      <section className="sec--lopsided-alt">
        <div className="shell">
          <div className="split">
            <div className="split__body">
              <p className="eyebrow" style={{ marginBottom: 18 }}>
                <span className="index-mark">03</span>&nbsp;&nbsp;Ce que vous ne verrez pas
              </p>
              <h2 className="h2" style={{ marginBottom: 26 }}>
                Aucun supplément découvert au comptoir.
              </h2>
              <p className="body-muted" style={{ marginBottom: 22 }}>
                Le tarif affiché sur la fiche est celui du contrat. Le kilométrage
                inclus, le prix du kilomètre supplémentaire, la franchise et le montant
                de la caution sont écrits avant que vous n’envoyiez la demande — pas au
                moment de récupérer les clés.
              </p>
              <p className="body-muted" style={{ marginBottom: 30 }}>
                Chaque véhicule part avec un état des lieux photographié et contresigné.
                Le même protocole s’applique au retour, compteur à l’appui.
              </p>
              <Link to="/faq" className="textlink">
                Lire les conditions de location <Arrow />
              </Link>
            </div>

            <figure className="split__media split__media--bleedRight">
              <img
                src={img(shots.cabinLeather, 1200, 930)}
                alt="Intérieur cuir clair d’une berline, places arrière"
                loading="lazy"
              />
              <figcaption className="split__caption">
                État des lieux — contrôle en 42 points
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------- 04 · HOW IT WORKS ----------------------------------- */}
      <section className="sec--2" style={{ paddingBottom: 'var(--s-4)' }}>
        <div className="shell">
          <SectionHead
            index="04"
            eyebrow="Comment ça marche"
            title="Réservez en toute simplicité."
            meta="Une demande envoyée n’est pas encore une réservation. Nos équipes vérifient la disponibilité réelle avant de confirmer."
          />
          <div className="steps">
            {bookingSteps.map((s) => (
              <div className="step" key={s.n}>
                <span className="step__n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 05 · PROFESSIONALS ---------------------------------- */}
      <section className="ink-block sec--lopsided">
        <div className="shell">
          <div className="propitch">
            <div className="propitch__body">
              <p className="eyebrow" style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
                <span className="index-mark">05</span>
                {proPitch.eyebrow}
              </p>
              <h2 className="h2 propitch__title">{proPitch.title}</h2>
              <p className="body-muted" style={{ marginBottom: 26 }}>
                {proPitch.body}
              </p>
              <ul className="ticklist ticklist--ink" style={{ marginBottom: 32 }}>
                {proPitch.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <Link to="/professionnel" className="btn btn--accent">
                Demander un devis <Arrow />
              </Link>
            </div>

            <figure className="propitch__media">
              <img
                src={img(shots.vanNight, 1200, 900)}
                alt="Un utilitaire de lavage aménagé, stationné de nuit"
                loading="lazy"
              />
              <figcaption className="propitch__tag">Véhicules Car Wash</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------- FINAL CTA ------------------------------------------- */}
      <section className="accent-block sec--2">
        <div className="shell">
          <div className="finalcta">
            <div>
              <h2 className="h2" style={{ maxWidth: '16ch' }}>
                Dites-nous vos dates. Nous nous occupons du reste.
              </h2>
            </div>
            <div className="finalcta__actions">
              <Link to="/flotte" className="btn btn--onInk">
                Louer une voiture <Arrow />
              </Link>
              <Link to="/zones" className="btn btn--onInk" style={{ marginLeft: -1 }}>
                Nos zones de livraison <Arrow />
              </Link>
              <p className="mono-note" style={{ color: 'rgba(252,252,253,.72)' }}>
                Ou appelez-nous : {company.phone}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
