export default function SectionHead({ index, eyebrow, title, meta, action }) {
  return (
    <header className="sechead">
      <div>
        {(index || eyebrow) && (
          <p
            className="eyebrow"
            style={{ marginBottom: 18, display: 'flex', gap: 14, alignItems: 'baseline' }}
          >
            {index && <span className="index-mark">{index}</span>}
            {eyebrow}
          </p>
        )}
        <h2 className="h2 sechead__lead">{title}</h2>
      </div>
      <div className="sechead__meta">
        {meta && <p className="body-muted">{meta}</p>}
        {action}
      </div>
    </header>
  )
}
