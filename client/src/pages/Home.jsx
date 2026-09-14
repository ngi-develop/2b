import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ScrollExpand from '../vendor/reactbits/ScrollExpand.jsx'
import SearchBar from '../components/SearchBar.jsx'
import Marquee from '../components/Marquee.jsx'
import SectionHead from '../components/SectionHead.jsx'
import VehicleCard from '../components/VehicleCard.jsx'
import Reveal from '../components/Reveal.jsx'
import Testimonials from '../components/Testimonials.jsx'
import { Arrow, ArrowDown } from '../components/Icons.jsx'
import { img, shots } from '../data/images.js'
import { fetchVehicles } from '../api/client.js'
import { cities, guarantees, bookingSteps, zones, aboutStats, company } from '../data/site.js'
import useMediaQuery from '../lib/useMediaQuery.js'

/** How many vehicles the home page previews before sending you to /flotte. */
const PREVIEW_COUNT = 4

export default function Home() {
  const narrow = useMediaQuery('(max-width: 900px)')
  const [preview, setPreview] = useState([])

  /* One spread across the price range rather than the four cheapest, so the
     preview reads as a fleet and not as a discount rack. */
  useEffect(() => {
    let alive = true
    fetchVehicles()
      .then((rows) => {
        if (!alive || !rows?.length) return
        const step = Math.max(Math.floor(rows.length / PREVIEW_COUNT), 1)
        const spread = []
        for (let i = 0; i < rows.length && spread.length < PREVIEW_COUNT; i += step) {
          spread.push(rows[i])
        }
        setPreview(spread)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

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

      {/* ---------- TWO TRACKS ------------------------------------------ */}
      <section className="sec sec--lopsided">
        <div className="shell">
          <SectionHead
            index="01"
            eyebrow="Deux parcours, séparés"
            title="Vous partez en vacances, ou vous montez une activité."
            meta="Les deux offres ne se mélangent jamais : la flotte tourisme a ses prix et son calendrier, les véhicules Car Wash se chiffrent au cas par cas."
          />

          <div className="pathways">
            <Reveal className="pathway">
              <div className="pathway__media">
                <img
                  src={img(shots.sunsetRoad, 900, 620)}
                  alt="Une route de campagne marocaine au coucher du soleil"
                  loading="lazy"
                />
                <span className="pathway__idx">A</span>
              </div>
              <div className="pathway__body">
                <h3 className="h3">Particuliers &amp; touristes</h3>
                <p className="body-muted">
                  Choisissez vos dates et votre ville, comparez les véhicules réellement
                  disponibles, ajoutez vos options et envoyez votre demande. Prix
                  affichés, kilométrage inclus, caution connue à l’avance.
                </p>
                <ul className="ticklist">
                  <li>Tarifs publics, à la journée</li>
                  <li>Disponibilité en temps réel</li>
                  <li>Livraison hôtel, riad ou aéroport</li>
                </ul>
                <Link to="/flotte" className="textlink">
                  Voir la flotte <Arrow />
                </Link>
              </div>
            </Reveal>

            <Reveal className="pathway pathway--ink" delay={90}>
              <div className="pathway__media">
                <img
                  src={img(shots.washFoamHand, 900, 620)}
                  alt="Un opérateur lave une carrosserie couverte de mousse"
                  loading="lazy"
                />
                <span className="pathway__idx">B</span>
              </div>
              <div className="pathway__body">
                <h3 className="h3">Professionnels — Car Wash</h3>
                <p className="body-muted">
                  Des véhicules aménagés pour le lavage automobile mobile. Aucun prix
                  n’est affiché : il dépend du nombre de véhicules, de la durée, de la
                  zone, des équipements et des services inclus.
                </p>
                <ul className="ticklist ticklist--ink">
                  <li>Devis personnalisé sous 48 h</li>
                  <li>Entretien et remplacement inclus</li>
                  <li>Formation des opérateurs sur site</li>
                </ul>
                <Link to="/professionnel" className="textlink">
                  Demander un devis <Arrow />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- FLEET PREVIEW --------------------------------------- */}
      <section className="sec--2" style={{ paddingBottom: 'var(--s-4)' }}>
        <div className="shell">
          <SectionHead
            index="02"
            eyebrow="Notre flotte"
            title="Quatre véhicules sur soixante-deux."
            meta="De la citadine à 280 DH la journée au 4x4 sept places préparé pour le désert."
            action={
              <Link to="/flotte" className="textlink" style={{ marginTop: 18 }}>
                Toute la flotte <Arrow />
              </Link>
            }
          />
          {preview.length > 0 && (
            <div className="fleet-grid">
              {preview.map((v) => (
                <VehicleCard key={v.id} vehicle={v} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ---------- EDITORIAL SPLIT — bleed right ----------------------- */}
      <section className="sec--1" style={{ paddingBottom: 'var(--s-3)' }}>
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

      {/* ---------- GUARANTEES (ink) ------------------------------------ */}
      <section className="ink-block sec--lopsided-alt">
        <div className="shell">
          <SectionHead
            index="04"
            eyebrow="Nos engagements"
            title="Quatre garanties, écrites."
            meta="Elles figurent au contrat. Si nous ne les tenons pas, vous ne payez pas la journée concernée."
          />
          <div className="steps">
            {guarantees.map((g) => (
              <Reveal className="step" key={g.n} delay={Number(g.n) * 60}>
                <span className="step__n">{g.n}</span>
                <h3>{g.title}</h3>
                <p>{g.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------------------------------------- */}
      <section className="sec">
        <div className="shell">
          <SectionHead
            index="05"
            eyebrow="Comment ça marche"
            title="Quatre étapes, une validation humaine."
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

      {/* ---------- ZONES — bleed left ---------------------------------- */}
      <section className="sec--2" style={{ paddingBottom: 'var(--s-4)' }}>
        <div className="shell">
          <div className="split split--textRight">
            <figure className="split__media split__media--bleedLeft">
              <img
                src={img(shots.roadGate, 1200, 930)}
                alt="Route rectiligne vers une porte monumentale, montagnes en arrière-plan"
                loading="lazy"
              />
              <figcaption className="split__caption">
                Drâa-Tafilalet — livraison sur rendez-vous
              </figcaption>
            </figure>

            <div className="split__body">
              <p className="eyebrow" style={{ marginBottom: 18 }}>
                <span className="index-mark">06</span>&nbsp;&nbsp;Zones de livraison
              </p>
              <h2 className="h2" style={{ marginBottom: 26 }}>
                Huit villes. Et tout ce qu’il y a entre.
              </h2>
              <ul className="minizones">
                {zones.slice(0, 5).map((z) => (
                  <li key={z.city}>
                    <span>{z.city}</span>
                    <span className="mono-note">{z.delay}</span>
                    <span className="mono-note">{z.fee}</span>
                  </li>
                ))}
              </ul>
              <Link to="/zones" className="textlink" style={{ marginTop: 28 }}>
                Toutes les zones et délais <Arrow />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- TESTIMONIALS ---------------------------------------- */}
      <Testimonials />

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
              <Link to="/professionnel" className="btn btn--onInk">
                Louer un véhicule Car Wash <Arrow />
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
