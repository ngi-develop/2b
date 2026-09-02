import { useState } from 'react'

export default function Accordion({ items, startOpen = 0 }) {
  const [open, setOpen] = useState(startOpen)

  return (
    <div className="acc">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div className={`acc__item${isOpen ? ' is-open' : ''}`} key={item.q}>
            <h3>
              <button
                type="button"
                className="acc__btn"
                aria-expanded={isOpen}
                aria-controls={`acc-panel-${i}`}
                id={`acc-btn-${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                <span className="acc__num">{String(i + 1).padStart(2, '0')}</span>
                <span className="acc__q">{item.q}</span>
                <span className="acc__sign" aria-hidden="true" />
              </button>
            </h3>
            <div
              className="acc__panel"
              id={`acc-panel-${i}`}
              role="region"
              aria-labelledby={`acc-btn-${i}`}
            >
              <div className="acc__panelInner">
                <div>{item.a}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
