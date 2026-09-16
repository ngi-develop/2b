import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import { useAuth } from '../AuthContext.jsx'
import VehicleForm from '../VehicleForm.jsx'
import * as api from '../../api/dashboard.js'
import { img } from '../../data/images.js'
import {
  Banner, Empty, Modal, Panel, Pill, Tile,
  date, money, num, useAsync,
} from '../ui.jsx'

const STATUS_LABELS = {
  disponible: 'Disponible', reserve: 'Réservé', loue: 'Loué',
  maintenance: 'Maintenance', immobilise: 'Immobilisé', bloque: 'Bloqué',
}

/** Fiche véhicule: informations, activité, historique, financement, coûts, rentabilité. */
export default function VehicleFile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isManager, isAdmin } = useAuth()
  const { data: v, loading, error, reload } = useAsync(() => api.getVehicle(id), [id])

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  async function remove() {
    setBusy(true)
    setActionError('')
    try {
      await api.deleteVehicle(id)
      navigate('/dashboard/flotte')
    } catch (err) {
      /* The server refuses to delete a vehicle with rental history — it would
         orphan contracts and rewrite past turnover. Surface that verbatim. */
      setActionError(err.message)
      setConfirmDelete(false)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <><PageBar title="Véhicule" /><div className="dash__content"><p className="loading">Chargement…</p></div></>
  }
  if (error || !v) {
    return <><PageBar title="Véhicule" /><div className="dash__content"><Banner>{error || 'Introuvable.'}</Banner></div></>
  }

  const f = v.financing || {}

  return (
    <>
      <PageBar
        title={`${v.brand} ${v.model}`}
        crumb={<Link to="/dashboard/flotte">Flotte</Link>}
      >
        <Pill status={v.status} label={STATUS_LABELS[v.status]} />
        {isManager && (
          <button type="button" className="dbtn dbtn--sm" onClick={() => setEditing(true)}>
            Modifier
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            className="dbtn dbtn--ghost dbtn--sm dbtn--danger"
            onClick={() => setConfirmDelete(true)}
          >
            Supprimer
          </button>
        )}
      </PageBar>

      <div className="dash__content">
        <Banner>{actionError}</Banner>
        {v.fleetType === 'carwash' && (
          <Banner tone="warn">
            Véhicule Car Wash — hors catalogue public, sans tarif affiché et sans réservation en ligne.
          </Banner>
        )}

        <div className="tiles">
          <Tile label="Kilométrage" value={num(v.mileage)} unit="km" />
          <Tile label="Locations" value={num(v.activity.rentals)} />
          <Tile label="Jours loués" value={num(v.activity.rentedDays)} />
          <Tile label="Taux d’occupation" value={v.activity.occupancy} unit="%" variant="ink" />
          <Tile
            label="Résultat depuis acquisition"
            value={money(v.profitability.result)}
            variant={v.profitability.result >= 0 ? 'accent' : undefined}
            note={`${money(v.profitability.revenue)} de CA − ${money(v.profitability.charges)} de coûts`}
          />
        </div>

        <div className="cols cols--wide-left">
          <div>
            <Panel title="Informations">
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {v.image && (
                  <img
                    src={img(v.image, 420, 300)}
                    alt={`${v.brand} ${v.model}`}
                    style={{ width: 210, height: 150, objectFit: 'cover', flex: '0 0 auto' }}
                  />
                )}
                <dl className="drows" style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <Row k="Marque / modèle" v={`${v.brand} ${v.model}`} />
                  <Row k="Version" v={v.version || '—'} />
                  <Row k="Catégorie" v={v.category} />
                  <Row k="Année" v={v.year || '—'} />
                  <Row k="Immatriculation" v={v.plate} />
                  <Row k="Carburant / boîte" v={`${v.fuel} · ${v.transmission}`} />
                  <Row k="Places / portes" v={`${v.seats} · ${v.doors}`} />
                </dl>
              </div>
            </Panel>

            <Panel title="Historique des locations" sub={`${v.history.length}`} flush>
              {v.history.length === 0 ? (
                <Empty>Aucune location enregistrée.</Empty>
              ) : (
                <div className="tablewrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>N°</th><th>Client</th><th>Période</th>
                        <th className="num">Km</th><th className="num">Total</th><th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.history.slice(0, 25).map((r) => (
                        <tr key={r._id}>
                          <td className="table__ref">
                            <Link to={`/dashboard/reservations/${r._id}`}>{r.reference}</Link>
                          </td>
                          <td>{r.client ? `${r.client.firstName} ${r.client.lastName}` : '—'}</td>
                          <td className="table__muted">{date(r.startDate)} → {date(r.endDate)}</td>
                          <td className="num table__muted">{r.totals?.kmDriven ? num(r.totals.kmDriven) : '—'}</td>
                          <td className="num">{money(r.totals?.total)}</td>
                          <td><Pill status={r.status} label={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Coûts" sub={`${v.charges.length} ligne(s)`} flush>
              {v.charges.length === 0 ? (
                <Empty>Aucune charge affectée à ce véhicule.</Empty>
              ) : (
                <div className="tablewrap">
                  <table className="table">
                    <thead>
                      <tr><th>Date</th><th>Catégorie</th><th>Fournisseur</th><th className="num">Montant</th></tr>
                    </thead>
                    <tbody>
                      {v.charges.slice(0, 20).map((c) => (
                        <tr key={c._id}>
                          <td className="table__muted">{date(c.date)}</td>
                          <td>{c.category}</td>
                          <td className="table__muted">{c.supplier || '—'}</td>
                          <td className="num">{money(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>

          <div>
            <Panel title="Activité">
              <dl className="drows">
                <Row
                  k="Location actuelle"
                  v={
                    v.activity.currentRental ? (
                      <Link to={`/dashboard/reservations/${v.activity.currentRental._id}`}>
                        {v.activity.currentRental.reference}
                      </Link>
                    ) : '—'
                  }
                />
                <Row
                  k="Prochaine réservation"
                  v={v.activity.nextReservation ? date(v.activity.nextReservation.startDate) : '—'}
                />
                <Row k="Jours disponibles" v={num(v.activity.availableDays)} />
              </dl>
            </Panel>

            <Panel title="Financement">
              {f.purchasePrice ? (
                <dl className="drows">
                  <Row k="Prix d’achat" v={money(f.purchasePrice)} />
                  <Row k="Apport" v={money(f.downPayment)} />
                  <Row k="Montant financé" v={money(f.financedAmount)} />
                  <Row k="Mensualité" v={money(f.monthlyPayment)} />
                  <Row k="Durée" v={`${f.durationMonths || '—'} mois`} />
                  <Row k="Fin de financement" v={date(f.endDate)} />
                  {v.remainingInstalments && (
                    <div className="drow drow--total">
                      <span>Échéances restantes</span>
                      <span>
                        {v.remainingInstalments.months} × {money(f.monthlyPayment)}
                      </span>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="table__muted" style={{ fontSize: '0.8125rem' }}>Aucun financement enregistré.</p>
              )}
            </Panel>

            <Panel title="Rentabilité" sub="depuis acquisition">
              <dl className="drows">
                <Row k="CA généré" v={money(v.profitability.revenue)} />
                <Row k="Coûts" v={`− ${money(v.profitability.charges)}`} />
                <div className="drow drow--total">
                  <span>Résultat</span>
                  <span style={{ color: v.profitability.result >= 0 ? 'var(--ink)' : 'var(--danger-deep)' }}>
                    {v.profitability.result >= 0 ? '+' : ''}{money(v.profitability.result)}
                  </span>
                </div>
              </dl>
            </Panel>

            <Panel title="Échéances" sub={`${v.maintenance.length}`} flush>
              {v.maintenance.length === 0 ? (
                <Empty>Aucune échéance planifiée.</Empty>
              ) : (
                <div className="tablewrap">
                  <table className="table">
                    <tbody>
                      {v.maintenance.map((m) => (
                        <tr key={m._id}>
                          <td>
                            <span className="table__strong">{m.label}</span>
                            <span className="table__sub">{m.type}</span>
                          </td>
                          <td className="num table__muted">
                            {m.dueDate ? date(m.dueDate) : `${num(m.dueMileage)} km`}
                          </td>
                          <td><Pill status={m.status} label={m.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>

      {editing && (
        <VehicleForm
          vehicle={v}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            reload()
          }}
        />
      )}

      {confirmDelete && (
        <Modal
          title={`Supprimer ${v.brand} ${v.model} ?`}
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <button type="button" className="dbtn dbtn--ghost" onClick={() => setConfirmDelete(false)}>
                Annuler
              </button>
              <button type="button" className="dbtn dbtn--danger" onClick={remove} disabled={busy}>
                {busy ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: '0.875rem', marginBottom: 12 }}>
            {v.brand} {v.model} — {v.plate}
          </p>
          <div className="banner banner--warn">
            Un véhicule ayant un historique de locations ne peut pas être supprimé : passez-le
            en « Immobilisé » à la place. La suppression n’est possible que pour un véhicule
            jamais loué.
          </div>
        </Modal>
      )}
    </>
  )
}

function Row({ k, v }) {
  return (
    <div className="drow">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  )
}
