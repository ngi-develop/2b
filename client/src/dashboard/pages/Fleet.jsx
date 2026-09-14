import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import * as api from '../../api/dashboard.js'
import { img } from '../../data/images.js'
import {
  Banner, Empty, Loading, Pill, date, money, num, useAsync, useDebounced,
} from '../ui.jsx'

const STATUS_LABELS = {
  disponible: 'Disponible',
  reserve: 'Réservé',
  loue: 'Loué',
  maintenance: 'Maintenance',
  immobilise: 'Immobilisé',
  bloque: 'Bloqué',
}

/** Flotte — every vehicle, its state, and how it is performing. */
export default function Fleet() {
  const navigate = useNavigate()
  const [fleetType, setFleetType] = useState('tourisme')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const q = useDebounced(query, 300)

  const { data, loading, error } = useAsync(
    () => api.listVehicles({ fleetType, status, q }),
    [fleetType, status, q]
  )

  const rows = data || []
  const totalRevenue = rows.reduce((s, v) => s + (v.monthRevenue || 0), 0)

  return (
    <>
      <PageBar
        title="Flotte"
        crumb={loading ? '' : `${rows.length} véhicule${rows.length > 1 ? 's' : ''} · ${money(totalRevenue)} ce mois`}
      />

      <div className="dash__content">
        <Banner>{error}</Banner>

        <section className="panel">
          <div className="tabs">
            <button
              type="button"
              className={`tab${fleetType === 'tourisme' ? ' is-on' : ''}`}
              onClick={() => setFleetType('tourisme')}
            >
              Flotte tourisme
            </button>
            <button
              type="button"
              className={`tab${fleetType === 'carwash' ? ' is-on' : ''}`}
              onClick={() => setFleetType('carwash')}
            >
              Véhicules Car Wash
            </button>
          </div>

          <div className="toolbar">
            <input
              className="dinput dinput--search"
              placeholder="Marque, modèle ou immatriculation…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select className="dselect" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Tous statuts</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {fleetType === 'carwash' && (
              <span className="panel__sub spacer">Jamais publiés sur le site</span>
            )}
          </div>

          {loading && <Loading />}
          {!loading && rows.length === 0 && <Empty>Aucun véhicule ne correspond.</Empty>}

          {!loading && rows.length > 0 && (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Véhicule</th>
                    <th>Immatriculation</th>
                    <th className="num">Km</th>
                    <th>Statut</th>
                    <th>Location actuelle</th>
                    <th>Prochain retour</th>
                    <th>Prochaine résa.</th>
                    <th className="num">CA du mois</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr
                      key={v.id}
                      className="is-clickable"
                      onClick={() => navigate(`/dashboard/flotte/${v.id}`)}
                    >
                      <td>
                        <span className="cellflex">
                          {v.image && (
                            <img className="table__thumb" src={img(v.image, 140, 100)} alt="" loading="lazy" />
                          )}
                          <span>
                            <span className="table__strong">{v.brand} {v.model}</span>
                            <span className="table__sub">{v.category} · {v.year}</span>
                          </span>
                        </span>
                      </td>
                      <td className="table__muted">{v.plate}</td>
                      <td className="num">{num(v.mileage)}</td>
                      <td><Pill status={v.derivedStatus} label={STATUS_LABELS[v.derivedStatus]} /></td>
                      <td>
                        {v.currentRental ? (
                          <>
                            {v.currentRental.client}
                            <span className="table__sub">{v.currentRental.reference}</span>
                          </>
                        ) : (
                          <span className="table__muted">—</span>
                        )}
                      </td>
                      <td className="table__muted">{v.nextReturn ? date(v.nextReturn) : '—'}</td>
                      <td className="table__muted">
                        {v.nextReservation ? date(v.nextReservation.startDate) : '—'}
                      </td>
                      <td className="num table__strong">{money(v.monthRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
