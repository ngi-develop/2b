/** Horizontal ticker. The list is rendered twice so the loop is seamless. */
export default function Marquee({ items, ink = false }) {
  const run = [...items, ...items]
  return (
    <div className={`marquee${ink ? ' marquee--ink' : ''}`} aria-hidden="true">
      <div className="marquee__track">
        {run.map((item, i) => (
          <span className="marquee__item" key={`${item}-${i}`}>
            <span className="marquee__dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
