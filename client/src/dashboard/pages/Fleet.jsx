import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import { useAuth } from '../AuthContext.jsx'
import VehicleForm from '../VehicleForm.jsx'
import * as api from '../../api/dashboard.js'
import { img } from '../../data/images.js'
import {
  Banner, Empty, Loading, Modal, Pill, date, money, num, useAsync, useDebounced,
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
  const { isManager, isAdmin } = useAuth()
  const [creating, setCreating] = useState(false)
  /* Editing and deleting live on the row, not behind a drill-in: the list is
     where you are when you decide a car needs changing. */
  const [editing, setEditing] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [fleetType, setFleetType] = useState('tourisme')
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const q = useDebounced(query, 300)

  const { data, loading, error, reload } = useAsync(
    () => api.listVehicles({ fleetType, status, q }),
    [fleetType, status, q]
  )

  async function remove() {
    setBusy(true)
    setActionError('')
    try {
      await api.deleteVehicle(confirmDelete.id)
      setConfirmDelete(null)
      reload()
    } catch (err) {
      /* The server refuses to delete a vehicle with rental history — it would
         orphan contracts and rewrite past turnover. Surface that verbatim. */
      setActionError(err.message)
      setConfirmDelete(null)
    } finally {
      setBusy(false)
    }
  }

  const rows = data || []
  const totalRevenue = rows.reduce((s, v) => s + (v.monthRevenue || 0), 0)

  return (
    <>
      <PageBar
        title="Flotte"
        crumb={loading ? '' : `${rows.length} véhicule${rows.length > 1 ? 's' : ''} · ${money(totalRevenue)} ce mois`}
      >
        {isManager && (
          <button type="button" className="dbtn dbtn--accent dbtn--sm" onClick={() => setCreating(true)}>
            + Ajouter un véhicule
          </button>
        )}
      </PageBar>

      <div className="dash__content">
        <Banner>{error || actionError}</Banner>

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
          {!loading && rows.length === 0 && (
            <Empty>
              Aucun véhicule ne correspond.
              {isManager && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="dbtn dbtn--ghost dbtn--sm"
                    style={{ marginTop: 12 }}
                    onClick={() => setCreating(true)}
                  >
                    + Ajouter un véhicule
                  </button>
                </>
              )}
            </Empty>
          )}

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
                    {isManager && <th className="acts">Actions</th>}
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
                      {isManager && (
                        <td className="acts" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="dbtn dbtn--ghost dbtn--sm"
                            onClick={() => setEditing(v)}
                          >
                            Modifier
                          </button>
                          {/* Only where it can succeed. A vehicle that has
                              been rented is immobilised from its file, never
                              deleted — the server enforces that, and a button
                              that can only refuse is worse than none. */}
                          {isAdmin && v.deletable && (
                            <button
                              type="button"
                              className="dbtn dbtn--ghost dbtn--sm dbtn--danger"
                              onClick={() => setConfirmDelete(v)}
                            >
                              Supprimer
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {creating && (
        <VehicleForm
          onClose={() => setCreating(false)}
          onSaved={(v) => {
            setCreating(false)
            reload()
            navigate(`/dashboard/flotte/${v.id || v._id}`)
          }}
        />
      )}

      {/* Editing from the list stays on the list — the row updates in place
          rather than throwing you into the vehicle file. */}
      {editing && (
        <VehicleForm
          vehicle={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      {confirmDelete && (
        <Modal
          title={`Supprimer ${confirmDelete.brand} ${confirmDelete.model} ?`}
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button type="button" className="dbtn dbtn--ghost" onClick={() => setConfirmDelete(null)}>
                Annuler
              </button>
              <button type="button" className="dbtn dbtn--danger" onClick={remove} disabled={busy}>
                {busy ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: '0.875rem', marginBottom: 12 }}>
            {confirmDelete.brand} {confirmDelete.model} — {confirmDelete.plate}
          </p>
          <div className="banner banner--warn">
            Ce véhicule n’a jamais été loué : sa suppression est définitive et n’affecte
            aucun contrat. Pour retirer un véhicule qui a un historique, passez-le en
            « Immobilisé » depuis sa fiche.
          </div>
        </Modal>
      )}
    </>
  )
}
