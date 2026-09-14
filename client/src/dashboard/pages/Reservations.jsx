import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import { listReservations } from '../../api/dashboard.js'
import {
  Banner, Empty, Loading, Pill, date, money, useAsync, useDebounced,
} from '../ui.jsx'

const TABS = [
  { value: '', label: 'Toutes' },
  { value: 'demande', label: 'Demandes' },
  { value: 'confirmee', label: 'Confirmées' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'terminee', label: 'Terminées' },
  { value: 'annulee', label: 'Annulées' },
]

const LABELS = {
  demande: 'Demande',
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
}

/** Réservations — the operational centre of the company. */
export default function Reservations() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') || ''

  const [query, setQuery] = useState('')
  const q = useDebounced(query, 300)

  const { data, loading, error } = useAsync(() => listReservations({ status, q }), [status, q])

  const setStatus = (value) => {
    const next = new URLSearchParams(params)
    if (value) next.set('status', value)
    else next.delete('status')
    setParams(next, { replace: true })
  }

  const rows = data?.rows || []
  const counts = data?.counts || {}

  return (
    <>
      <PageBar title="Réservations" crumb={loading ? '' : `${rows.length} dossier${rows.length > 1 ? 's' : ''}`}>
        <Link to="/dashboard/reservations/nouvelle" className="dbtn dbtn--clay dbtn--sm">
          + Nouvelle réservation
        </Link>
      </PageBar>

      <div className="dash__content">
        <Banner>{error}</Banner>

        <section className="panel">
          <div className="tabs">
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`tab${status === t.value ? ' is-on' : ''}`}
                onClick={() => setStatus(t.value)}
              >
                {t.label}
                {t.value && counts[t.value] ? <span className="tab__n">{counts[t.value]}</span> : null}
              </button>
            ))}
          </div>

          <div className="toolbar">
            <input
              className="dinput dinput--search"
              placeholder="Client, téléphone, immatriculation, n° de réservation…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading && <Loading />}
          {!loading && rows.length === 0 && <Empty>Aucune réservation ne correspond.</Empty>}

          {!loading && rows.length > 0 && (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Client</th>
                    <th>Véhicule</th>
                    <th>Départ</th>
                    <th>Retour</th>
                    <th className="num">Total</th>
                    <th className="num">Reste</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const client = r.client
                      ? `${r.client.firstName} ${r.client.lastName}`
                      : `${r.requester?.firstName || ''} ${r.requester?.lastName || ''}`.trim()
                    return (
                      <tr
                        key={r.id}
                        className="is-clickable"
                        onClick={() => navigate(`/dashboard/reservations/${r.id}`)}
                      >
                        <td className="table__ref">{r.reference}</td>
                        <td>
                          <span className="table__strong">{client || 'Sans client'}</span>
                          <span className="table__sub">
                            {r.client?.phone || r.requester?.phone || '—'}
                            {r.client?.status === 'blackliste' && ' · blacklisté'}
                          </span>
                        </td>
                        <td>
                          {r.vehicle?.brand} {r.vehicle?.model}
                          <span className="table__sub">{r.vehicle?.plate}</span>
                        </td>
                        <td className="table__muted">{date(r.startDate)}</td>
                        <td className="table__muted">{date(r.endDate)}</td>
                        <td className="num">{money(r.totals?.total)}</td>
                        <td
                          className="num"
                          style={{
                            color: r.totals?.balance > 0 ? 'var(--clay)' : 'var(--ink-45)',
                            fontWeight: r.totals?.balance > 0 ? 600 : 400,
                          }}
                        >
                          {r.totals?.balance > 0 ? money(r.totals.balance) : '—'}
                        </td>
                        <td>
                          <Pill status={r.status} label={LABELS[r.status]} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
