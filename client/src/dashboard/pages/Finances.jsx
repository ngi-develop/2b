import { useState } from 'react'
import { PageBar } from '../DashboardLayout.jsx'
import * as api from '../../api/dashboard.js'
import {
  Banner, Empty, Field, Loading, Modal, Panel, Tile,
  date, dateInput, money, useAsync,
} from '../ui.jsx'

const CHARGE_CATEGORIES = [
  'traite', 'assurance', 'entretien', 'reparation', 'pneus', 'carburant',
  'lavage', 'parking', 'gps', 'amendes', 'salaires', 'loyer', 'marketing',
  'frais_bancaires', 'autres',
]

const CATEGORY_LABELS = {
  traite: 'Traite / crédit', assurance: 'Assurance', entretien: 'Entretien',
  reparation: 'Réparation', pneus: 'Pneus', carburant: 'Carburant',
  lavage: 'Lavage', parking: 'Parking', gps: 'GPS', amendes: 'Amendes',
  salaires: 'Salaires', loyer: 'Loyer', marketing: 'Marketing',
  frais_bancaires: 'Frais bancaires', autres: 'Autres',
}

const TABS = [
  { value: 'overview', label: 'Vue d’ensemble' },
  { value: 'revenues', label: 'Revenus' },
  { value: 'charges', label: 'Charges' },
  { value: 'vehicles', label: 'Rentabilité par véhicule' },
]

/** Finances — one module, four tabs, no manual turnover entry anywhere. */
export default function Finances() {
  const monthStart = dateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [tab, setTab] = useState('overview')
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(dateInput(new Date()))
  const [adding, setAdding] = useState(false)

  const { data, loading, error, reload } = useAsync(
    () => api.getFinanceOverview({ from, to }),
    [from, to]
  )

  return (
    <>
      <PageBar title="Finances" crumb={`${date(from)} → ${date(to)}`}>
        <input type="date" className="dinput dinput--sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className="dinput dinput--sm" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className="dbtn dbtn--accent dbtn--sm" onClick={() => setAdding(true)}>
          + Ajouter une charge
        </button>
      </PageBar>

      <div className="dash__content">
        <Banner>{error}</Banner>
        {loading && <Loading />}

        {data && (
          <>
            <div className="tiles">
              <Tile label="Chiffre d’affaires" value={money(data.revenue)} variant="ink" note={`${data.rentals} location(s)`} />
              <Tile label="Encaissements" value={money(data.cashed)} />
              <Tile label="À recevoir" value={money(data.receivable)} />
              <Tile label="Charges" value={money(data.charges)} />
              <Tile
                label="Résultat de gestion"
                value={money(data.result)}
                variant={data.result >= 0 ? 'accent' : undefined}
              />
            </div>

            <section className="panel">
              <div className="tabs">
                {TABS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={`tab${tab === t.value ? ' is-on' : ''}`}
                    onClick={() => setTab(t.value)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'overview' && <Overview data={data} />}
              {tab === 'revenues' && <Revenues from={from} to={to} />}
              {tab === 'charges' && <Charges from={from} to={to} onChanged={reload} />}
              {tab === 'vehicles' && <ByVehicle rows={data.byVehicle} />}
            </section>
          </>
        )}
      </div>

      {adding && (
        <ChargeDialog
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false)
            reload()
          }}
        />
      )}
    </>
  )
}

/* ------------------------------------------------------------- overview -- */

function Overview({ data }) {
  const max = Math.max(...data.series.map((s) => Math.max(s.revenue, s.charges)), 1)
  const catMax = Math.max(...data.byCategory.map((c) => c.total), 1)

  return (
    <div className="cols">
      <div>
        <p className="panel__sub" style={{ padding: '14px 16px 0' }}>
          Évolution CA / charges — année en cours
        </p>
        <div className="chart">
          {data.series.map((s) => (
            <div className="chart__col" key={s.month}>
              <div className="chart__bars">
                <div
                  className="chart__bar chart__bar--rev"
                  style={{ height: `${(s.revenue / max) * 100}%` }}
                  title={`CA ${money(s.revenue)}`}
                />
                <div
                  className="chart__bar chart__bar--chg"
                  style={{ height: `${(s.charges / max) * 100}%` }}
                  title={`Charges ${money(s.charges)}`}
                />
              </div>
              <span className="chart__label">{s.month.slice(5)}</span>
            </div>
          ))}
        </div>
        <div className="legend">
          <span><i style={{ background: 'var(--ink)' }} /> Chiffre d’affaires</span>
          <span><i style={{ background: 'var(--accent)' }} /> Charges</span>
        </div>
      </div>

      <div>
        <p className="panel__sub" style={{ padding: '14px 16px 0' }}>Charges par catégorie</p>
        {data.byCategory.length === 0 ? (
          <Empty>Aucune charge sur la période.</Empty>
        ) : (
          <div className="barlist">
            {data.byCategory.map((c) => (
              <div key={c.category}>
                <div className="barlist__row">
                  <span>{CATEGORY_LABELS[c.category] || c.category}</span>
                  <span className="table__strong">{money(c.total)}</span>
                </div>
                <div className="barlist__track">
                  <div className="barlist__fill barlist__fill--accent" style={{ width: `${(c.total / catMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- revenues -- */

function Revenues({ from, to }) {
  const { data, loading, error } = useAsync(() => api.listRevenues({ from, to }), [from, to])

  if (loading) return <Loading />
  if (error) return <Banner>{error}</Banner>
  if (!data?.length) return <Empty>Aucun revenu sur la période.</Empty>

  return (
    <>
      <p className="banner" style={{ margin: 16 }}>
        Les revenus proviennent automatiquement des réservations — aucune saisie manuelle de CA.
      </p>
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>N°</th><th>Client</th><th>Véhicule</th><th>Période</th>
              <th className="num">Total</th><th className="num">Encaissé</th><th className="num">Reste</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td className="table__ref">{r.reference}</td>
                <td>{r.client ? `${r.client.firstName} ${r.client.lastName}` : '—'}</td>
                <td>{r.vehicle?.brand} {r.vehicle?.model}</td>
                <td className="table__muted">{date(r.startDate)} → {date(r.endDate)}</td>
                <td className="num">{money(r.totals?.total)}</td>
                <td className="num table__muted">{money(r.totals?.paid)}</td>
                <td className="num" style={{ color: r.totals?.balance > 0 ? 'var(--accent)' : 'var(--ink-45)' }}>
                  {r.totals?.balance > 0 ? money(r.totals.balance) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* -------------------------------------------------------------- charges -- */

function Charges({ from, to, onChanged }) {
  const [category, setCategory] = useState('')
  const [scope, setScope] = useState('')
  const { data, loading, error, reload } = useAsync(
    () => api.listCharges({ from, to, category, scope }),
    [from, to, category, scope]
  )

  async function remove(id) {
    await api.deleteCharge(id)
    reload()
    onChanged?.()
  }

  return (
    <>
      <div className="toolbar">
        <select className="dselect" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Toutes catégories</option>
          {CHARGE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <select className="dselect" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="">Véhicule et société</option>
          <option value="vehicle">Liées à un véhicule</option>
          <option value="company">Charges générales</option>
        </select>
      </div>

      {loading && <Loading />}
      {error && <Banner>{error}</Banner>}
      {!loading && !data?.length && <Empty>Aucune charge sur la période.</Empty>}

      {!loading && data?.length > 0 && (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th><th>Catégorie</th><th>Concerne</th><th>Fournisseur</th>
                <th className="num">Montant</th><th />
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id}>
                  <td className="table__muted">{date(c.date)}</td>
                  <td className="table__strong">{CATEGORY_LABELS[c.category] || c.category}</td>
                  <td>
                    {c.scope === 'vehicle' && c.vehicle
                      ? `${c.vehicle.brand} ${c.vehicle.model}`
                      : 'Société'}
                    {c.comment && <span className="table__sub">{c.comment}</span>}
                  </td>
                  <td className="table__muted">{c.supplier || '—'}</td>
                  <td className="num table__strong">{money(c.amount)}</td>
                  <td className="num">
                    <button type="button" className="dbtn dbtn--ghost dbtn--sm dbtn--danger" onClick={() => remove(c.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------- per-vehicle P&L -- */

function ByVehicle({ rows }) {
  if (!rows?.length) return <Empty>Aucun véhicule.</Empty>
  const max = Math.max(...rows.map((r) => Math.abs(r.result)), 1)

  return (
    <div className="tablewrap">
      <table className="table">
        <thead>
          <tr>
            <th>Véhicule</th>
            <th className="num">CA</th>
            <th className="num">Charges</th>
            <th className="num">Résultat</th>
            <th className="num">Occupation</th>
            <th style={{ width: 160 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr key={v._id}>
              <td>
                <span className="table__strong">{v.brand} {v.model}</span>
                <span className="table__sub">{v.plate} · {v.rentals} location(s)</span>
              </td>
              <td className="num">{money(v.revenue)}</td>
              <td className="num table__muted">{money(v.charges)}</td>
              <td className="num table__strong" style={{ color: v.result >= 0 ? 'var(--ink)' : 'var(--danger-deep)' }}>
                {v.result >= 0 ? '+' : ''}{money(v.result)}
              </td>
              <td className="num">{v.occupancy}%</td>
              <td>
                <div className="barlist__track">
                  <div
                    className={`barlist__fill${v.result < 0 ? ' barlist__fill--accent' : ''}`}
                    style={{ width: `${(Math.abs(v.result) / max) * 100}%` }}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* --------------------------------------------------------------- dialog -- */

function ChargeDialog({ onClose, onSaved }) {
  const { data: vehicles } = useAsync(() => api.listVehicles({}), [])
  const [form, setForm] = useState({
    amount: '', date: dateInput(new Date()), category: 'entretien',
    supplier: '', paymentMethod: 'especes', comment: '', scope: 'vehicle', vehicle: '',
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
      await api.createCharge({ ...form, amount: Number(form.amount) })
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
      title="Ajouter une charge"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="dbtn dbtn--accent" onClick={save} disabled={busy || !form.amount}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>
      <div className="dgrid">
        <Field label="Montant (DH)" name="amount" type="number" value={form.amount} onChange={set} error={fieldErrors.amount} />
        <Field label="Date" name="date" type="date" value={form.date} onChange={set} />
        <Field
          label="Catégorie"
          name="category"
          value={form.category}
          onChange={set}
          options={CHARGE_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))}
        />
        <Field label="Fournisseur" name="supplier" value={form.supplier} onChange={set} />
        <Field
          label="Mode de paiement"
          name="paymentMethod"
          value={form.paymentMethod}
          onChange={set}
          options={[
            { value: 'especes', label: 'Espèces' }, { value: 'carte', label: 'Carte' },
            { value: 'virement', label: 'Virement' }, { value: 'cheque', label: 'Chèque' },
            { value: 'autre', label: 'Autre' },
          ]}
        />
        <Field
          label="Cette charge concerne"
          name="scope"
          value={form.scope}
          onChange={set}
          options={[
            { value: 'vehicle', label: 'Un véhicule' },
            { value: 'company', label: 'La société' },
          ]}
        />
        {form.scope === 'vehicle' && (
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
                label: `${v.brand} ${v.model} — ${v.plate}`,
              })),
            ]}
          />
        )}
        <Field label="Commentaire" name="comment" type="textarea" value={form.comment} onChange={set} full />
      </div>
    </Modal>
  )
}
