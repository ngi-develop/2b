import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import * as api from '../../api/dashboard.js'
import {
  Banner, Empty, Field, Loading, Modal, Panel, Pill,
  date, dateInput, money, num, useAsync,
} from '../ui.jsx'

const TYPES = [
  'entretien', 'vidange', 'pneus', 'reparation',
  'assurance', 'visite_technique', 'document', 'traite',
]

const TYPE_LABELS = {
  entretien: 'Entretien', vidange: 'Vidange', pneus: 'Pneus',
  reparation: 'Réparation', assurance: 'Assurance',
  visite_technique: 'Visite technique', document: 'Document', traite: 'Traite',
}

const STATUS_LABELS = {
  a_prevoir: 'À prévoir', planifiee: 'Planifiée', urgent: 'Urgent',
  faite: 'Faite', en_retard: 'En retard',
}

/**
 * Échéances & Maintenance — what has to be done next, and nothing else.
 * Financing details stay in Flotte, money stays in Finances.
 */
export default function Maintenance() {
  const [type, setType] = useState('')
  const [planning, setPlanning] = useState(false)
  const [completing, setCompleting] = useState(null)

  const { data, loading, error, reload } = useAsync(() => api.listMaintenance({ type }), [type])
  const rows = data?.rows || []
  const inGarage = data?.inGarage || []

  const overdue = rows.filter((r) => r.computedStatus === 'en_retard').length
  const urgent = rows.filter((r) => r.computedStatus === 'urgent').length

  return (
    <>
      <PageBar
        title="Échéances & maintenance"
        crumb={loading ? '' : `${rows.length} à venir · ${overdue} en retard`}
      >
        <button type="button" className="dbtn dbtn--clay dbtn--sm" onClick={() => setPlanning(true)}>
          + Planifier une maintenance
        </button>
      </PageBar>

      <div className="dash__content">
        <Banner>{error}</Banner>

        {overdue > 0 && (
          <Banner tone="error">
            {overdue} échéance{overdue > 1 ? 's' : ''} en retard — à traiter en priorité.
          </Banner>
        )}
        {urgent > 0 && (
          <Banner tone="warn">
            {urgent} échéance{urgent > 1 ? 's' : ''} arrive{urgent > 1 ? 'nt' : ''} à terme sous 7 jours
            ou 500 km.
          </Banner>
        )}

        <section className="panel">
          <div className="toolbar">
            <select className="dselect" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Tous types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          {loading && <Loading />}
          {!loading && rows.length === 0 && <Empty>Aucune échéance à venir.</Empty>}

          {!loading && rows.length > 0 && (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Véhicule</th><th>À faire</th><th>Type</th>
                    <th>Échéance</th><th>Statut</th><th>Garage</th><th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <Link to={`/dashboard/flotte/${m.vehicle?._id}`} className="table__strong">
                          {m.vehicle?.brand} {m.vehicle?.model}
                        </Link>
                        <span className="table__sub">{m.vehicle?.plate}</span>
                      </td>
                      <td className="table__strong">{m.label}</td>
                      <td className="table__muted">{TYPE_LABELS[m.type] || m.type}</td>
                      <td>
                        {m.dueDate && (
                          <>
                            {date(m.dueDate)}
                            <span className="table__sub">
                              {m.daysRemaining < 0
                                ? `en retard de ${Math.abs(m.daysRemaining)} j`
                                : `dans ${m.daysRemaining} j`}
                            </span>
                          </>
                        )}
                        {!m.dueDate && m.kmRemaining !== null && (
                          <>
                            {num(m.dueMileage)} km
                            <span className="table__sub">
                              {m.kmRemaining < 0
                                ? `dépassé de ${num(Math.abs(m.kmRemaining))} km`
                                : `dans ${num(m.kmRemaining)} km`}
                            </span>
                          </>
                        )}
                      </td>
                      <td><Pill status={m.computedStatus} label={STATUS_LABELS[m.computedStatus]} /></td>
                      <td className="table__muted">{m.garage || '—'}</td>
                      <td className="num">
                        <button
                          type="button"
                          className="dbtn dbtn--ghost dbtn--sm"
                          onClick={() => setCompleting(m)}
                        >
                          Clôturer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Panel title="Véhicules en maintenance" sub={`${inGarage.length}`} flush>
          {inGarage.length === 0 ? (
            <Empty>Aucun véhicule immobilisé à l’atelier.</Empty>
          ) : (
            <div className="tablewrap">
              <table className="table">
                <tbody>
                  {inGarage.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <Link to={`/dashboard/flotte/${v._id}`} className="table__strong">
                          {v.brand} {v.model}
                        </Link>
                        <span className="table__sub">{v.plate}</span>
                      </td>
                      <td className="table__muted">{v.statusReason || 'Motif non renseigné'}</td>
                      <td className="num table__muted">{num(v.mileage)} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {planning && (
        <PlanDialog onClose={() => setPlanning(false)} onSaved={() => { setPlanning(false); reload() }} />
      )}
      {completing && (
        <CompleteDialog
          job={completing}
          onClose={() => setCompleting(null)}
          onSaved={() => { setCompleting(null); reload() }}
        />
      )}
    </>
  )
}

function PlanDialog({ onClose, onSaved }) {
  const { data: vehicles } = useAsync(() => api.listVehicles({}), [])
  const [form, setForm] = useState({
    vehicle: '', type: 'entretien', label: '', dueDate: '', dueMileage: '', garage: '', note: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  async function save() {
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      await api.createMaintenance({
        ...form,
        dueDate: form.dueDate || undefined,
        dueMileage: form.dueMileage ? Number(form.dueMileage) : undefined,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
      if (err.details) setFieldErrors(err.details)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Planifier une maintenance"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>Annuler</button>
          <button
            type="button"
            className="dbtn dbtn--clay"
            onClick={save}
            disabled={busy || !form.vehicle || !form.label}
          >
            {busy ? 'Enregistrement…' : 'Planifier'}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>
      <div className="dgrid">
        <Field
          label="Véhicule"
          name="vehicle"
          value={form.vehicle}
          onChange={set}
          error={fieldErrors.vehicle}
          full
          options={[
            { value: '', label: '— Sélectionner —' },
            ...(vehicles || []).map((v) => ({
              value: v.id,
              label: `${v.brand} ${v.model} — ${v.plate} (${num(v.mileage)} km)`,
            })),
          ]}
        />
        <Field
          label="Type"
          name="type"
          value={form.type}
          onChange={set}
          options={TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
        />
        <Field label="Intervention" name="label" value={form.label} onChange={set} placeholder="Vidange + filtres" />
        <Field label="Date prévue" name="dueDate" type="date" value={form.dueDate} onChange={set} error={fieldErrors.dueDate} />
        <Field label="Kilométrage prévu" name="dueMileage" type="number" value={form.dueMileage} onChange={set} />
        <Field label="Garage" name="garage" value={form.garage} onChange={set} />
        <Field label="Note" name="note" type="textarea" value={form.note} onChange={set} full />
      </div>
      <p className="banner" style={{ marginTop: 14 }}>
        Indiquez une date, un kilométrage, ou les deux.
      </p>
    </Modal>
  )
}

function CompleteDialog({ job, onClose, onSaved }) {
  const [form, setForm] = useState({
    cost: '', completedAt: dateInput(new Date()), mileage: job.vehicle?.mileage ?? '', supplier: job.garage || '', note: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  async function save() {
    setBusy(true)
    setError('')
    try {
      await api.completeMaintenance(job.id, {
        ...form,
        cost: Number(form.cost || 0),
        mileage: form.mileage ? Number(form.mileage) : undefined,
      })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`Clôturer — ${job.label}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="dbtn dbtn--clay" onClick={save} disabled={busy}>
            {busy ? 'Enregistrement…' : 'Clôturer l’intervention'}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>
      <p className="banner">
        Le coût saisi est enregistré comme charge du véhicule {job.vehicle?.brand} {job.vehicle?.model} et
        remonte automatiquement dans Finances.
      </p>
      <div className="dgrid">
        <Field label="Coût (DH)" name="cost" type="number" value={form.cost} onChange={set} />
        <Field label="Date de réalisation" name="completedAt" type="date" value={form.completedAt} onChange={set} />
        <Field label="Kilométrage relevé" name="mileage" type="number" value={form.mileage} onChange={set} />
        <Field label="Fournisseur / garage" name="supplier" value={form.supplier} onChange={set} />
        <Field label="Note" name="note" type="textarea" value={form.note} onChange={set} full />
      </div>
    </Modal>
  )
}
