import { useState } from 'react'
import { testimonials } from '../data/site.js'
import { img, shots } from '../data/images.js'
import { Arrow, ArrowLeft } from './Icons.jsx'

export default function Testimonials() {
  const [i, setI] = useState(0)
  const t = testimonials[i]

  const go = (step) =>
    setI((v) => (v + step + testimonials.length) % testimonials.length)

  return (
    <section className="ink-block sec--lopsided">
      <div className="shell">
        <div className="quoteblock">
          <div className="quote">
            <p className="eyebrow" style={{ display: 'flex', gap: 14 }}>
              <span className="index-mark">07</span> Ils ont loué chez nous
            </p>
            <blockquote className="quote__text">« {t.quote} »</blockquote>
            <div className="quote__by">
              <strong>{t.author}</strong>
              <span>{t.role}</span>
            </div>
            <div className="quote-nav">
              <button type="button" onClick={() => go(-1)} aria-label="Témoignage précédent">
                <ArrowLeft />
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Témoignage suivant">
                <Arrow className="" />
              </button>
              <span className="quote-count">
                {String(i + 1).padStart(2, '0')} / {String(testimonials.length).padStart(2, '0')}
              </span>
            </div>
          </div>

          <figure className="quoteblock__media">
            <img
              src={img(shots.forestLights, 1000, 1180)}
              alt="Une voiture phares allumés sur une route bordée d’arbres"
              loading="lazy"
            />
          </figure>
        </div>
      </div>
    </section>
  )
}
