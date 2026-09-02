/**
 * Form primitives. Fields are cells in a hairline grid rather than boxed
 * inputs — no radius, no shadow, so the structure has to come from rules.
 */

export function Field({ label, name, required, error, full, hint, children }) {
  return (
    <div
      className={`field${full ? ' field--full' : ''}${error ? ' field--error' : ''}${
        children?.type === 'select' ? ' field--select' : ''
      }`}
    >
      <label htmlFor={name}>
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <span className="field__err" style={{ color: 'var(--ink-45)' }}>{hint}</span>}
      {error && <span className="field__err">{error}</span>}
    </div>
  )
}

export function TextField({ label, name, value, onChange, error, required, full, type = 'text', ...rest }) {
  return (
    <Field label={label} name={name} required={required} error={error} full={full}>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        onChange={(e) => onChange(name, e.target.value)}
        {...rest}
      />
    </Field>
  )
}

export function SelectField({ label, name, value, onChange, options, error, required, full, placeholder }) {
  return (
    <div className={`field field--select${full ? ' field--full' : ''}${error ? ' field--error' : ''}`}>
      <label htmlFor={name}>
        {label}
        {required && <span aria-hidden="true">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        onChange={(e) => onChange(name, e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const val = typeof o === 'string' ? o : o.value
          const lab = typeof o === 'string' ? o : o.label
          return (
            <option key={val} value={val}>
              {lab}
            </option>
          )
        })}
      </select>
      {error && <span className="field__err">{error}</span>}
    </div>
  )
}

export function TextArea({ label, name, value, onChange, error, required, rows = 4, ...rest }) {
  return (
    <Field label={label} name={name} required={required} error={error} full>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={value}
        required={required}
        onChange={(e) => onChange(name, e.target.value)}
        {...rest}
      />
    </Field>
  )
}

export function CheckGroup({ legend, name, options, values, onToggle, full }) {
  return (
    <div className={`field${full ? ' field--full' : ''}`}>
      <span className="field__legend eyebrow" style={{ marginBottom: 4 }}>
        {legend}
      </span>
      <div className="checkrow" role="group" aria-label={legend}>
        {options.map((o) => (
          <label className="checkopt" key={o}>
            <input
              type="checkbox"
              name={name}
              value={o}
              checked={values.includes(o)}
              onChange={() => onToggle(o)}
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  )
}

export function RadioGroup({ legend, name, options, value, onChange, full }) {
  return (
    <div className={`field${full ? ' field--full' : ''}`}>
      <span className="field__legend eyebrow" style={{ marginBottom: 4 }}>
        {legend}
      </span>
      <div className="checkrow" role="radiogroup" aria-label={legend}>
        {options.map((o) => (
          <label className="checkopt" key={o}>
            <input
              type="radio"
              name={name}
              value={o}
              checked={value === o}
              onChange={() => onChange(name, o)}
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  )
}
