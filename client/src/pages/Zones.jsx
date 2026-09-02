import { Link } from 'react-router-dom'
import PageHead from '../components/PageHead.jsx'
import SectionHead from '../components/SectionHead.jsx'
import Reveal from '../components/Reveal.jsx'
import { Arrow, Pin } from '../components/Icons.jsx'
import { img, shots } from '../data/images.js'
import { zones, pickupPoints } from '../data/site.js'

export default function Zones() {
  return (
    <>
      <PageHead
        eyebrow="Nos zones de livraison"
        title="Nous venons à vous, pas l’inverse."
        intro="Huit villes couvertes en propre, et une livraison possible partout ailleurs sur devis. Aéroport, gare, hôtel, riad ou domicile — vous donnez l’adresse et l’heure."
        media={shots.desertRoad}
        crumbs={[{ label: 'Nos zones de livraison' }]}
      />

      {/* ---------- ZONE TABLE ------------------------------------------ */}
      <section className="sec--2" style={{ paddingBottom: 'var(--s-3)' }}>
        <div className="shell">
          <SectionHead
            index="01"
            eyebrow="Couverture"
            title="Huit villes, trois régimes de livraison."
            meta="Les délais indiqués courent à partir de la validation de votre demande, pendant les heures d’ouverture."
          />

          <div className="zonelist">
            {zones.map((z, i) => (
              <Reveal className="zonerow" key={z.city} delay={i * 40}>
                <span className="zonerow__n">{String(i + 1).padStart(2, '0')}</span>
                <span className="zonerow__city">{z.city}</span>
                <span className="zonerow__meta">
                  {z.note}
                  <br />
                  <span className="mono-note">{z.region}</span>
                </span>
                <span className="zonerow__tag">
                  {z.delay} · {z.fee}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PICKUP POINTS --------------------------------------- */}
      <section className="ink-block sec--lopsided-alt">
        <div className="shell">
          <div className="split">
            <div className="split__body">
              <p className="eyebrow" style={{ marginBottom: 18 }}>
                <span className="index-mark">02</span>&nbsp;&nbsp;Points de retrait
              </p>
              <h2 className="h2" style={{ marginBottom: 26 }}>
                Quatre aéroports, deux agences, et votre adresse.
              </h2>
              <p className="body-muted" style={{ marginBottom: 30 }}>
                Les livraisons aéroport sont assurées 24h/24, vol de nuit compris :
                indiquez votre numéro de vol dans la demande et nous suivons les retards.
              </p>
              <ul className="ticklist ticklist--ink">
                {pickupPoints.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            <figure className="split__media split__media--bleedRight">
              <img
                src={img(shots.roadPov, 1200, 930)}
                alt="Vue depuis l’habitacle sur une route droite du désert"
                loading="lazy"
              />
              <figcaption className="split__caption">Livraison Ouarzazate — sur rendez-vous</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------- OUT OF ZONE ----------------------------------------- */}
      <section className="sec">
        <div className="shell">
          <div className="split split--textRight">
            <figure className="split__media split__media--bleedLeft">
              <img
                src={img(shots.sunsetRoad, 1200, 930)}
                alt="Route au coucher du soleil"
                loading="lazy"
              />
            </figure>
            <div className="split__body">
              <p className="eyebrow" style={{ marginBottom: 18 }}>
                <span className="index-mark">03</span>&nbsp;&nbsp;Hors zone
              </p>
              <h2 className="h2" style={{ marginBottom: 24 }}>
                Merzouga, Dakhla, Chefchaouen ?
              </h2>
              <p className="body-muted" style={{ marginBottom: 22 }}>
                Nous livrons hors des huit villes desservies, sur devis et sous réserve de
                disponibilité. Comptez 48 heures de préavis et un forfait d’acheminement
                calculé à la distance.
              </p>
              <p className="notice" style={{ marginBottom: 30 }}>
                Pour les départs désert, seuls les 4x4 sont autorisés, et un contrôle
                mécanique supplémentaire est réalisé avant la remise des clés.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0 }}>
                <Link to="/contact" className="btn">
                  <Pin /> Demander une livraison hors zone
                </Link>
                <Link to="/flotte" className="btn btn--ghost" style={{ marginLeft: -1 }}>
                  Voir la flotte <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
