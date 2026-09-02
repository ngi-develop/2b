import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHead from '../components/PageHead.jsx'
import Accordion from '../components/Accordion.jsx'
import { Arrow, Phone } from '../components/Icons.jsx'
import { faq, company } from '../data/site.js'
import { shots } from '../data/images.js'

export default function Faq() {
  const cats = useMemo(() => ['Toutes', ...new Set(faq.map((f) => f.cat))], [])
  const [cat, setCat] = useState('Toutes')

  const items = cat === 'Toutes' ? faq : faq.filter((f) => f.cat === cat)

  return (
    <>
      <PageHead
        eyebrow="FAQ"
        title="Les questions qu’on nous pose vraiment."
        intro="Conditions, caution, kilométrage, livraison, devis professionnel. Si votre question n’y est pas, un conseiller y répond en direct."
        media={shots.cabinConsole}
        crumbs={[{ label: 'FAQ' }]}
      />

      <section className="sec--2" style={{ paddingBottom: 'var(--s-4)' }}>
        <div className="shell">
          <div className="faqlayout">
            <nav className="faqnav" aria-label="Filtrer par thème">
              {cats.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={cat === c ? 'is-on' : ''}
                  aria-pressed={cat === c}
                  onClick={() => setCat(c)}
                >
                  {c}
                </button>
              ))}
            </nav>

            <div>
              {/* keyed on the filter so the accordion resets its open row */}
              <Accordion key={cat} items={items} startOpen={0} />

              <div
                className="notice"
                style={{
                  marginTop: 'clamp(32px, 4vw, 52px)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 18,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>
                  Votre question n’est pas là ? Nous répondons du lundi au samedi, de 08h00
                  à 20h00.
                </span>
                <span style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
                  <a href={`tel:${company.phone.replace(/\s/g, '')}`} className="btn btn--sm">
                    <Phone /> {company.phone}
                  </a>
                  <Link
                    to="/contact"
                    className="btn btn--sm btn--ghost"
                    style={{ marginLeft: -1 }}
                  >
                    Écrire <Arrow />
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
