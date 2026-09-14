import { Link } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import { getSummary } from '../../api/dashboard.js'
import {
  Banner, Empty, Loading, Panel, Pill, Tile,
  money, num, date, dateTime, useAsync,
} from '../ui.jsx'

/**
 * Tableau de bord — the direction page.
 *
 * Everything here is read-only and aggregated server-side: it must summarise
 * the whole business without forcing anyone to navigate elsewhere.
 */
export default function Overview() {
  const { data, loading, error } = useAsync(getSummary, [])

  return (
    <>
      <PageBar title="Tableau de bord" crumb={data ? `au ${dateTime(data.generatedAt)}` : ''} />

      <div className="dash__content">
        <Banner>{error}</Banner>
        {loading && <Loading />}

        {data && (
          <>
            {/* --- money ------------------------------------------------ */}
            <div className="tiles">
              <Tile label="CA du jour" value={money(data.revenue.day)} />
              <Tile label="CA de la semaine" value={money(data.revenue.week)} />
              <Tile label="CA du mois" value={money(data.revenue.month)} variant="ink" />
              <Tile label="Charges du mois" value={money(data.charges.month)} />
              <Tile
                label="Résultat estimé"
                value={money(data.result.month)}
                variant={data.result.month >= 0 ? 'clay' : undefined}
                note="CA du mois moins charges du mois"
              />
            </div>

            <div className="tiles">
              <Tile label="CA de l’année" value={money(data.revenue.year)} />
              <Tile
                label="CA déjà réservé"
                value={money(data.futureBooked.total)}
                note={`${data.futureBooked.count} départ${data.futureBooked.count > 1 ? 's' : ''} à venir`}
              />
              <Tile label="Encaissé ce mois" value={money(data.revenue.cashedThisMonth)} />
              <Tile label="Reste à recevoir" value={money(data.receivable)} />
              <Tile label="Taux d’occupation" value={`${data.occupancy}`} unit="%" note="Sur le mois en cours" />
            </div>

            {/* --- fleet ------------------------------------------------ */}
            <Panel title="Flotte" sub={`${data.fleet.total} véhicules tourisme`}>
              <div className="tiles" style={{ margin: 0, border: 0, background: 'transparent', gap: 12 }}>
                {[
                  ['Disponibles', data.fleet.disponible, 'disponible'],
                  ['Loués', data.fleet.loue, 'loue'],
                  ['Réservés', data.fleet.reserve, 'reserve'],
                  ['Maintenance', data.fleet.maintenance, 'maintenance'],
                  ['Immobilisés', data.fleet.immobilise, 'immobilise'],
                ].map(([label, value, status]) => (
                  <div key={label} className="tile" style={{ border: '1px solid var(--line-soft)' }}>
                    <p className="tile__k">
                      <Pill status={status} label={label} />
                    </p>
                    <p className="tile__v">{num(value)}</p>
                  </div>
                ))}
              </div>
            </Panel>

            {/* --- alerts + today -------------------------------------- */}
            <div className="cols cols--wide-left">
              <Panel
                title="Alertes prioritaires"
                sub={`${data.alerts.length} à traiter`}
                flush
              >
                {data.alerts.length === 0 ? (
                  <Empty>Rien d’urgent. Tout est à jour.</Empty>
                ) : (
                  data.alerts.map((a, i) => (
                    <div className={`alertrow alertrow--${a.severity}`} key={`${a.kind}-${a.entityId}-${i}`}>
                      <span className="alertrow__bar" />
                      <div>
                        <Link to={a.link} className="alertrow__title">
                          {a.title}
                        </Link>
                        <p className="alertrow__detail">{a.detail}</p>
                      </div>
                      <Pill status={a.kind} label={a.kind} tone={a.severity === 'high' ? 'bad' : 'warn'} />
                    </div>
                  ))
                )}
              </Panel>

              <div>
                <Panel title="Départs du jour" sub={`${data.today.departures.length}`} flush>
                  {data.today.departures.length === 0 ? (
                    <Empty>Aucun départ prévu aujourd’hui.</Empty>
                  ) : (
                    <MiniList rows={data.today.departures} field="startDate" />
                  )}
                </Panel>

                <Panel title="Retours du jour" sub={`${data.today.returns.length}`} flush>
                  {data.today.returns.length === 0 ? (
                    <Empty>Aucun retour prévu aujourd’hui.</Empty>
                  ) : (
                    <MiniList rows={data.today.returns} field="endDate" />
                  )}
                </Panel>
              </div>
            </div>

            {/* --- queues ---------------------------------------------- */}
            <div className="cols">
              <Panel
                title="Réservations à confirmer"
                sub={`${data.queues.requests.length}`}
                actions={
                  <Link to="/dashboard/reservations?status=demande" className="dbtn dbtn--ghost dbtn--sm">
                    Tout voir
                  </Link>
                }
                flush
              >
                {data.queues.requests.length === 0 ? (
                  <Empty>Aucune demande en attente.</Empty>
                ) : (
                  <div className="tablewrap">
                    <table className="table">
                      <tbody>
                        {data.queues.requests.slice(0, 6).map((r) => (
                          <tr key={r._id}>
                            <td className="table__ref">
                              <Link to={`/dashboard/reservations/${r._id}`}>{r.reference}</Link>
                            </td>
                            <td>
                              {r.client
                                ? `${r.client.firstName} ${r.client.lastName}`
                                : `${r.requester?.firstName || ''} ${r.requester?.lastName || ''}`}
                              <span className="table__sub">
                                {r.vehicle?.brand} {r.vehicle?.model}
                              </span>
                            </td>
                            <td className="num table__muted">
                              {date(r.startDate)} → {date(r.endDate)}
                            </td>
                            <td className="num">{money(r.totals?.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <Panel title="Paiements en attente" sub={`${data.queues.unpaid.length}`} flush>
                {data.queues.unpaid.length === 0 ? (
                  <Empty>Aucun impayé.</Empty>
                ) : (
                  <div className="tablewrap">
                    <table className="table">
                      <tbody>
                        {data.queues.unpaid.slice(0, 6).map((r) => (
                          <tr key={r._id}>
                            <td className="table__ref">
                              <Link to={`/dashboard/reservations/${r._id}`}>{r.reference}</Link>
                            </td>
                            <td>
                              {r.client?.firstName} {r.client?.lastName}
                              <span className="table__sub">
                                {r.vehicle?.brand} {r.vehicle?.model}
                              </span>
                            </td>
                            <td className="num" style={{ color: 'var(--clay)', fontWeight: 600 }}>
                              {money(r.totals.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>

            <div className="cols">
              <Panel title="Cautions à restituer" sub={`${data.queues.deposits.length}`} flush>
                {data.queues.deposits.length === 0 ? (
                  <Empty>Aucune caution en attente.</Empty>
                ) : (
                  <div className="tablewrap">
                    <table className="table">
                      <tbody>
                        {data.queues.deposits.map((r) => (
                          <tr key={r._id}>
                            <td className="table__ref">
                              <Link to={`/dashboard/reservations/${r._id}`}>{r.reference}</Link>
                            </td>
                            <td>
                              {r.client?.firstName} {r.client?.lastName}
                            </td>
                            <td className="num">{money(r.depositReceived)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              <Panel title="Rentabilité du mois" sub="CA − charges par véhicule" flush>
                <div className="tablewrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Véhicule</th>
                        <th className="num">CA</th>
                        <th className="num">Charges</th>
                        <th className="num">Résultat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topVehicles.map((v) => (
                        <tr key={v._id}>
                          <td className="table__strong">
                            {v.brand} {v.model}
                            <span className="table__sub">{v.plate}</span>
                          </td>
                          <td className="num">{money(v.revenue)}</td>
                          <td className="num table__muted">{money(v.charges)}</td>
                          <td
                            className="num table__strong"
                            style={{ color: v.result >= 0 ? 'var(--ink)' : '#8a1d0c' }}
                          >
                            {v.result >= 0 ? '+' : ''}
                            {money(v.result)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function MiniList({ rows, field }) {
  return (
    <div className="tablewrap">
      <table className="table">
        <tbody>
          {rows.map((r) => (
            <tr key={r._id}>
              <td className="num table__muted" style={{ width: 60 }}>
                {new Date(r[field]).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td>
                <Link to={`/dashboard/reservations/${r._id}`} className="table__strong">
                  {r.vehicle?.brand} {r.vehicle?.model}
                </Link>
                <span className="table__sub">
                  {r.client ? `${r.client.firstName} ${r.client.lastName}` : 'Client à rattacher'}
                </span>
              </td>
              <td>
                <Pill status={r.status} label={r.status === 'en_cours' ? 'En cours' : 'Confirmée'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
