import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import { getPlanning } from '../../api/dashboard.js'
import { Banner, Loading, Panel, Pill, date, dateInput, useAsync } from '../ui.jsx'

const DAY = 86400000
const RANGES = [
  { value: '14', label: '2 semaines' },
  { value: '30', label: '1 mois' },
  { value: '60', label: '2 mois' },
]

/**
 * Planning — which vehicle is free, and when.
 *
 * Calendar view: vehicles as rows, days as columns, bookings drawn across the
 * dates they span. List view answers the same question as a table.
 */
export default function Planning() {
  const navigate = useNavigate()
  const [view, setView] = useState('calendar')
  const [days, setDays] = useState('30')
  const [from, setFrom] = useState(() => dateInput(new Date()))
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')

  const to = useMemo(
    () => dateInput(new Date(new Date(from).getTime() + Number(days) * DAY)),
    [from, days]
  )

  const { data, loading, error } = useAsync(
    () => getPlanning({ from, to, category, status }),
    [from, to, category, status]
  )

  /* One column per day across the window. */
  const columns = useMemo(() => {
    const start = new Date(from)
    start.setHours(0, 0, 0, 0)
    return Array.from({ length: Number(days) }, (_, i) => {
      const d = new Date(start.getTime() + i * DAY)
      return { date: d, weekend: [0, 6].includes(d.getDay()) }
    })
  }, [from, days])

  /** Places a booking on the lane as a percentage offset and width. */
  const spanStyle = (span) => {
    const start = new Date(from)
    start.setHours(0, 0, 0, 0)
    const total = columns.length
    const s = Math.max((new Date(span.start) - start) / DAY, 0)
    const e = Math.min((new Date(span.end) - start) / DAY, total)
    const width = Math.max(e - s, 0.5)
    return { left: `${(s / total) * 100}%`, width: `${(width / total) * 100}%` }
  }

  return (
    <>
      <PageBar title="Planning" crumb={`${date(from)} → ${date(to)}`}>
        <button
          type="button"
          className={`dbtn dbtn--sm ${view === 'calendar' ? '' : 'dbtn--ghost'}`}
          onClick={() => setView('calendar')}
        >
          Calendrier
        </button>
        <button
          type="button"
          className={`dbtn dbtn--sm ${view === 'list' ? '' : 'dbtn--ghost'}`}
          onClick={() => setView('list')}
        >
          Liste
        </button>
      </PageBar>

      <div className="dash__content">
        <Banner>{error}</Banner>

        <section className="panel">
          <div className="toolbar">
            <input
              type="date"
              className="dinput"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Début de la période"
            />
            <select className="dselect" value={days} onChange={(e) => setDays(e.target.value)}>
              {RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <select className="dselect" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Toutes catégories</option>
              {['Citadine', 'Compacte', 'Berline', 'SUV', '4x4', 'Familiale', 'Premium', 'Utilitaire'].map(
                (c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                )
              )}
            </select>
            <select className="dselect" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              <option value="disponible">Disponible</option>
              <option value="reserve">Réservé</option>
              <option value="loue">Loué</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <Link to="/dashboard/reservations/nouvelle" className="dbtn dbtn--clay dbtn--sm spacer">
              + Nouvelle réservation
            </Link>
          </div>

          {loading && <Loading />}

          {data && view === 'calendar' && (
            <>
              <div className="planning">
                <div className="planning__grid">
                  <div className="planning__head">
                    <div className="planning__veh">
                      <span className="panel__sub">Véhicule</span>
                    </div>
                    <div
                      className="planning__days"
                      style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}
                    >
                      {columns.map((c, i) => (
                        <div
                          key={i}
                          className={`planning__day${c.weekend ? ' planning__day--weekend' : ''}`}
                        >
                          {c.date.getDate()}
                          <span>
                            {c.date.toLocaleDateString('fr-FR', { weekday: 'narrow' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {data.vehicles.map((v) => (
                    <div className="planning__row" key={v.id}>
                      <div className="planning__veh">
                        <div className="planning__vehName">
                          {v.brand} {v.model}
                          <span>{v.plate}</span>
                        </div>
                      </div>
                      <div className="planning__lane">
                        <div
                          className="planning__days"
                          style={{
                            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
                            position: 'absolute',
                            inset: 0,
                          }}
                        >
                          {columns.map((c, i) => (
                            <div
                              key={i}
                              className={`planning__cell${c.weekend ? ' planning__cell--weekend' : ''}`}
                            />
                          ))}
                        </div>
                        {v.spans.map((span) => (
                          <button
                            type="button"
                            key={`${span.kind}-${span.id}`}
                            className={`planning__span planning__span--${span.status}`}
                            style={spanStyle(span)}
                            title={`${span.reference} — ${span.client}`}
                            onClick={() =>
                              span.kind === 'reservation'
                                ? navigate(`/dashboard/reservations/${span.id}`)
                                : navigate('/dashboard/echeances')
                            }
                          >
                            {span.client}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="legend">
                <span>
                  <i style={{ background: 'var(--ink)' }} /> Réservé
                </span>
                <span>
                  <i style={{ background: 'var(--clay)' }} /> Loué / en cours
                </span>
                <span>
                  <i style={{ background: 'var(--ink-45)' }} /> Demande à confirmer
                </span>
                <span>
                  <i style={{ background: '#5c3a06' }} /> Maintenance
                </span>
              </div>
            </>
          )}

          {data && view === 'list' && (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Véhicule</th>
                    <th>Statut</th>
                    <th>Client actuel</th>
                    <th>Départ</th>
                    <th>Retour</th>
                    <th>Prochaine réservation</th>
                  </tr>
                </thead>
                <tbody>
                  {data.vehicles.map((v) => (
                    <tr key={v.id}>
                      <td className="table__strong">
                        {v.brand} {v.model}
                        <span className="table__sub">{v.plate}</span>
                      </td>
                      <td>
                        <Pill status={v.derivedStatus} label={statusLabel(v.derivedStatus)} />
                      </td>
                      <td>{v.currentClient || <span className="table__muted">—</span>}</td>
                      <td className="table__muted">{v.currentStart ? date(v.currentStart) : '—'}</td>
                      <td className="table__muted">{v.currentEnd ? date(v.currentEnd) : '—'}</td>
                      <td className="table__muted">{v.nextStart ? date(v.nextStart) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Panel title="Règle" sub="Anti-chevauchement">
          <p style={{ fontSize: '0.8125rem', color: 'var(--ink-70)', maxWidth: '70ch' }}>
            Deux locations confirmées ne peuvent pas se chevaucher sur le même véhicule — le serveur
            refuse la confirmation et nomme le dossier en conflit. Une réservation qui commence le
            jour du retour d’une autre reste autorisée.
          </p>
        </Panel>
      </div>
    </>
  )
}

function statusLabel(s) {
  return (
    {
      disponible: 'Disponible',
      reserve: 'Réservé',
      loue: 'Loué',
      maintenance: 'Maintenance',
      immobilise: 'Immobilisé',
      bloque: 'Bloqué',
    }[s] || s
  )
}
