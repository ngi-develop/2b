import { Link } from 'react-router-dom'
import PageHead from '../components/PageHead.jsx'
import SectionHead from '../components/SectionHead.jsx'
import Marquee from '../components/Marquee.jsx'
import Reveal from '../components/Reveal.jsx'
import { Arrow } from '../components/Icons.jsx'
import { img, shots } from '../data/images.js'
import { aboutStats, guarantees, cities, company } from '../data/site.js'

const timeline = [
  {
    year: '2016',
    title: 'Quatre voitures et un garage à Aïn Sebaâ',
    body: "2B Location démarre avec quatre citadines et une clientèle de bouche-à-oreille : familles marocaines de l'étranger revenant l'été, premiers touristes envoyés par deux riads de la médina.",
  },
  {
    year: '2019',
    title: 'Marrakech, et le passage aux longues durées',
    body: "Ouverture d'un point de retrait à Guéliz. Les séjours s'allongent, les demandes de 4x4 pour le Sud se multiplient : la flotte se structure par catégorie plutôt que par opportunité d'achat.",
  },
  {
    year: '2022',
    title: 'La branche Car Wash professionnelle',
    body: "Un client nous demande un utilitaire équipé pour laver des flottes d'entreprise. Nous en aménageons un, puis six. La location de véhicules Car Wash devient une activité à part entière.",
  },
  {
    year: '2024',
    title: 'Un tableau de bord unique',
    body: "Planning, réservations, flotte, clients, finances et échéances passent sur un seul outil interne. Une donnée saisie une fois alimente tous les modules — c'est ce qui rend la validation manuelle rapide.",
  },
  {
    year: '2026',
    title: '62 véhicules, huit villes',
    body: "Casablanca, Rabat, Marrakech, Agadir, Tanger, Fès, Ouarzazate, Essaouira. Même protocole d'état des lieux partout, même numéro d'assistance.",
  },
]

export default function About() {
  return (
    <>
      <PageHead
        eyebrow="À propos"
        title="Une société de location, pas un comparateur."
        intro="Nous possédons nos véhicules, nous les entretenons, et nous répondons nous-mêmes au téléphone. C’est la seule façon que nous connaissons de tenir un engagement."
        media={shots.sClassStreet}
        crumbs={[{ label: 'À propos' }]}
      />

      {/* ---------- STATS ----------------------------------------------- */}
      <section className="ink-block">
        <div className="statband">
          {aboutStats.map((s) => (
            <div className="statband__cell" key={s.k}>
              <p className="statband__v">
                {s.v}
                {s.unit && <em>{s.unit}</em>}
              </p>
              <p className="statband__k">{s.k}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- STORY ----------------------------------------------- */}
      <section className="sec--lopsided">
        <div className="shell">
          <div className="split">
            <div className="split__body">
              <p className="eyebrow" style={{ marginBottom: 18 }}>
                <span className="index-mark">01</span>&nbsp;&nbsp;Notre histoire
              </p>
              <h2 className="h2" style={{ marginBottom: 26 }}>
                Commencée avec quatre voitures et un téléphone.
              </h2>
              <div className="body-muted" style={{ display: 'grid', gap: '1em' }}>
                <p>
                  {company.legal} est née à Casablanca en {company.founded}, d’un constat
                  simple : entre les grandes enseignes internationales et les loueurs
                  informels, il manquait un opérateur marocain qui affiche ses prix,
                  entretienne réellement ses véhicules et décroche quand on l’appelle.
                </p>
                <p>
                  Dix ans plus tard, la méthode n’a pas changé. Chaque véhicule est à nous.
                  Chaque état des lieux est photographié. Chaque demande de réservation est
                  relue par une personne avant d’être confirmée — c’est plus lent qu’un
                  bouton « réserver », et c’est volontaire.
                </p>
              </div>
            </div>

            <div className="photostack">
              <figure>
                <img
                  src={img(shots.cabinAmg, 600, 800)}
                  alt="Poste de conduite d’une berline premium"
                  loading="lazy"
                />
              </figure>
              <figure>
                <img
                  src={img(shots.desertPickup, 600, 900)}
                  alt="Un véhicule sur une piste du Sud marocain"
                  loading="lazy"
                />
              </figure>
              <figure>
                <img
                  src={img(shots.cabinLeather, 600, 680)}
                  alt="Places arrière en cuir clair"
                  loading="lazy"
                />
              </figure>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={cities} />

      {/* ---------- TIMELINE -------------------------------------------- */}
      <section className="sec">
        <div className="shell">
          <SectionHead
            index="02"
            eyebrow="Repères"
            title="Dix ans, cinq bascules."
            meta="Chaque étape a été décidée par la demande des clients, jamais par un plan de croissance."
          />
          <ul className="timeline">
            {timeline.map((t) => (
              <Reveal as="li" key={t.year}>
                <span className="timeline__year">{t.year}</span>
                <div>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- GUARANTEES ------------------------------------------ */}
      <section className="ink-block sec--lopsided-alt">
        <div className="shell">
          <SectionHead
            index="03"
            eyebrow="Nos engagements"
            title="Sécurité, entretien, assistance."
            meta="Ce ne sont pas des arguments commerciaux : ils sont écrits au contrat, et opposables."
          />
          <div className="steps">
            {guarantees.map((g) => (
              <div className="step" key={g.n}>
                <span className="step__n">{g.n}</span>
                <h3>{g.title}</h3>
                <p>{g.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA -------------------------------------------------- */}
      <section className="sec--2">
        <div className="shell">
          <div className="split split--textRight">
            <figure className="split__media split__media--bleedLeft">
              <img
                src={img(shots.atlasTruck, 1200, 930)}
                alt="Route de montagne marocaine avec un cycliste et un camion"
                loading="lazy"
              />
              <figcaption className="split__caption">Entre Marrakech et Ouarzazate</figcaption>
            </figure>
            <div className="split__body">
              <h2 className="h2" style={{ marginBottom: 24 }}>
                Une question avant de réserver ?
              </h2>
              <p className="body-muted" style={{ marginBottom: 28 }}>
                Nos conseillers répondent en français, en arabe et en anglais, du lundi au
                samedi. La livraison aéroport, elle, tourne 24h/24.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                <Link to="/contact" className="btn">
                  Nous contacter <Arrow />
                </Link>
                <Link to="/faq" className="btn btn--ghost" style={{ marginLeft: -1 }}>
                  Lire la FAQ <Arrow />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
