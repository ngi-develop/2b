import { useEffect, useState } from 'react'
import { PageBar } from '../DashboardLayout.jsx'
import { useAuth } from '../AuthContext.jsx'
import * as api from '../../api/dashboard.js'
import {
  Banner, Empty, Field, Loading, Modal, Panel, Pill,
  dateTime, money, useAsync,
} from '../ui.jsx'

const TABS = [
  { value: 'company', label: 'Entreprise' },
  { value: 'users', label: 'Utilisateurs & accès' },
  { value: 'agencies', label: 'Agences' },
  { value: 'rules', label: 'Règles générales' },
  { value: 'options', label: 'Options de location' },
  { value: 'lists', label: 'Listes' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'security', label: 'Sécurité' },
]

/** Paramètres — configuration only, no day-to-day business data. */
export default function Settings() {
  const { isManager, isAdmin } = useAuth()
  const [tab, setTab] = useState('company')
  const { data, loading, error, reload } = useAsync(() => api.getSettings(), [])

  return (
    <>
      <PageBar title="Paramètres" />
      <div className="dash__content">
        <Banner>{error}</Banner>
        {loading && <Loading />}

        {data && (
          <section className="panel">
            <div className="tabs">
              {TABS.filter((t) => t.value !== 'users' || isAdmin).map((t) => (
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

            <div className="panel__body">
              {tab === 'company' && <CompanyTab settings={data} onSaved={reload} canEdit={isManager} />}
              {tab === 'users' && <UsersTab />}
              {tab === 'agencies' && <AgenciesTab settings={data} onSaved={reload} canEdit={isManager} />}
              {tab === 'rules' && <RulesTab settings={data} onSaved={reload} canEdit={isManager} />}
              {tab === 'options' && <OptionsTab settings={data} onSaved={reload} canEdit={isManager} />}
              {tab === 'lists' && <ListsTab settings={data} />}
              {tab === 'notifications' && <NotificationsTab settings={data} onSaved={reload} canEdit={isManager} />}
              {tab === 'security' && <SecurityTab />}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

/** Shared save behaviour for the settings forms. */
function useSaver(onSaved) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  const save = async (patch) => {
    setBusy(true)
    setError('')
    setOk(false)
    try {
      await api.updateSettings(patch)
      setOk(true)
      onSaved?.()
      setTimeout(() => setOk(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return { save, busy, error, ok }
}

function CompanyTab({ settings, onSaved, canEdit }) {
  const [form, setForm] = useState(settings.company || {})
  const { save, busy, error, ok } = useSaver(onSaved)
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  return (
    <>
      <Banner>{error}</Banner>
      {ok && <Banner tone="ok">Enregistré.</Banner>}
      <div className="dgrid">
        <Field label="Nom commercial" name="name" value={form.name} onChange={set} />
        <Field label="Raison sociale" name="legal" value={form.legal} onChange={set} />
        <Field label="Téléphone" name="phone" value={form.phone} onChange={set} />
        <Field label="E-mail" name="email" value={form.email} onChange={set} />
        <Field label="ICE" name="ice" value={form.ice} onChange={set} />
        <Field label="Registre de commerce" name="rc" value={form.rc} onChange={set} />
        <Field label="Devise" name="currency" value={form.currency} onChange={set} />
        <Field label="Adresse" name="address" value={form.address} onChange={set} full />
      </div>
      {canEdit && (
        <button type="button" className="dbtn dbtn--clay" style={{ marginTop: 16 }} disabled={busy}
          onClick={() => save({ company: form })}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      )}
    </>
  )
}

function RulesTab({ settings, onSaved, canEdit }) {
  const [form, setForm] = useState(settings.rules || {})
  const { save, busy, error, ok } = useSaver(onSaved)
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  return (
    <>
      <Banner>{error}</Banner>
      {ok && <Banner tone="ok">Enregistré.</Banner>}
      <p className="banner">
        Ces valeurs servent de défaut à chaque nouvelle réservation et restent modifiables dossier
        par dossier.
      </p>
      <div className="dgrid dgrid--3">
        <Field label="Km inclus / jour" name="kmIncludedPerDay" type="number" value={form.kmIncludedPerDay} onChange={set} />
        <Field label="Prix du km supplémentaire" name="extraKmPrice" type="number" value={form.extraKmPrice} onChange={set} />
        <Field label="Caution par défaut" name="defaultDeposit" type="number" value={form.defaultDeposit} onChange={set} />
        <Field label="Durée minimale (jours)" name="minimumDays" type="number" value={form.minimumDays} onChange={set} />
        <Field label="Tolérance de retard (h)" name="lateGraceHours" type="number" value={form.lateGraceHours} onChange={set} />
        <Field label="Pénalité de retard / h" name="lateHourFee" type="number" value={form.lateHourFee} onChange={set} />
        <Field label="Annulation gratuite (h avant)" name="freeCancellationHours" type="number" value={form.freeCancellationHours} onChange={set} />
        <Field label="Modification possible (h avant)" name="modificationHours" type="number" value={form.modificationHours} onChange={set} />
      </div>
      {canEdit && (
        <button type="button" className="dbtn dbtn--clay" style={{ marginTop: 16 }} disabled={busy}
          onClick={() => save({ rules: form })}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      )}
    </>
  )
}

function OptionsTab({ settings, onSaved, canEdit }) {
  const [rows, setRows] = useState(settings.rentalOptions || [])
  const { save, busy, error, ok } = useSaver(onSaved)

  const update = (i, key, value) => setRows(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))

  return (
    <>
      <Banner>{error}</Banner>
      {ok && <Banner tone="ok">Enregistré.</Banner>}
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr><th>Code</th><th>Nom</th><th>Note</th><th className="num">Prix</th><th>Unité</th><th>Active</th></tr>
          </thead>
          <tbody>
            {rows.map((o, i) => (
              <tr key={o.code || i}>
                <td className="table__muted">{o.code}</td>
                <td><input className="dinput dinput--sm" style={{ width: '100%' }} value={o.name || ''} onChange={(e) => update(i, 'name', e.target.value)} /></td>
                <td><input className="dinput dinput--sm" style={{ width: '100%' }} value={o.note || ''} onChange={(e) => update(i, 'note', e.target.value)} /></td>
                <td className="num"><input className="dinput dinput--sm" type="number" style={{ width: 90 }} value={o.price ?? 0} onChange={(e) => update(i, 'price', Number(e.target.value))} /></td>
                <td>
                  <select className="dselect" value={o.unit || 'jour'} onChange={(e) => update(i, 'unit', e.target.value)}>
                    <option value="jour">/ jour</option>
                    <option value="forfait">forfait</option>
                  </select>
                </td>
                <td>
                  <input type="checkbox" checked={o.active !== false} onChange={(e) => update(i, 'active', e.target.checked)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <button type="button" className="dbtn dbtn--clay" style={{ marginTop: 16 }} disabled={busy}
          onClick={() => save({ rentalOptions: rows })}>
          {busy ? 'Enregistrement…' : 'Enregistrer les options'}
        </button>
      )}
    </>
  )
}

function AgenciesTab({ settings, onSaved, canEdit }) {
  const [rows, setRows] = useState(settings.agencies || [])
  const { save, busy, error, ok } = useSaver(onSaved)
  const update = (i, key, value) => setRows(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)))

  return (
    <>
      <Banner>{error}</Banner>
      {ok && <Banner tone="ok">Enregistré.</Banner>}
      {rows.length === 0 && <Empty>Aucune agence enregistrée.</Empty>}
      {rows.map((a, i) => (
        <div className="dgrid" key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line-soft)' }}>
          <div className="dfield"><label>Nom</label><input value={a.name || ''} onChange={(e) => update(i, 'name', e.target.value)} /></div>
          <div className="dfield"><label>Ville</label><input value={a.city || ''} onChange={(e) => update(i, 'city', e.target.value)} /></div>
          <div className="dfield"><label>Téléphone</label><input value={a.phone || ''} onChange={(e) => update(i, 'phone', e.target.value)} /></div>
          <div className="dfield"><label>Adresse</label><input value={a.address || ''} onChange={(e) => update(i, 'address', e.target.value)} /></div>
        </div>
      ))}
      {canEdit && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="dbtn dbtn--ghost"
            onClick={() => setRows([...rows, { name: '', city: '', active: true }])}>
            + Ajouter une agence
          </button>
          <button type="button" className="dbtn dbtn--clay" disabled={busy} onClick={() => save({ agencies: rows })}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}
    </>
  )
}

function ListsTab({ settings }) {
  const lists = settings.lists || {}
  const entries = [
    ['Catégories de charges', lists.chargeCategories],
    ['Modes de paiement', lists.paymentMethods],
    ['Types d’entretien', lists.maintenanceTypes],
    ['Catégories de véhicules', lists.vehicleCategories],
    ['Motifs d’indisponibilité', lists.unavailabilityReasons],
    ['Points de retrait', lists.pickupPoints],
    ['Villes desservies', lists.cities],
  ]

  return (
    <div className="cols">
      {entries.map(([label, values]) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <p className="panel__sub" style={{ marginBottom: 8 }}>{label}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(values || []).map((v) => (
              <span key={v} className="pill pill--off">{v}</span>
            ))}
            {!values?.length && <span className="table__muted">—</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function NotificationsTab({ settings, onSaved, canEdit }) {
  const [form, setForm] = useState(settings.notifications || {})
  const { save, busy, error, ok } = useSaver(onSaved)
  const toggle = (name) => setForm((f) => ({ ...f, [name]: !f[name] }))

  return (
    <>
      <Banner>{error}</Banner>
      {ok && <Banner tone="ok">Enregistré.</Banner>}
      <div className="drows" style={{ maxWidth: 560 }}>
        {[
          ['returnToday', 'Prévenir des retours du jour'],
          ['latePayment', 'Prévenir des paiements en retard'],
          ['newRequest', 'Prévenir à chaque nouvelle demande du site'],
        ].map(([key, label]) => (
          <label className="drow" key={key} style={{ cursor: 'pointer' }}>
            <span style={{ color: 'var(--ink)' }}>{label}</span>
            <input type="checkbox" checked={Boolean(form[key])} onChange={() => toggle(key)} />
          </label>
        ))}
      </div>
      <div className="dgrid" style={{ marginTop: 16, maxWidth: 560 }}>
        <Field
          label="Alerte assurance (jours avant)"
          name="insuranceDaysBefore"
          value={(form.insuranceDaysBefore || []).join(', ')}
          onChange={(_, v) => setForm((f) => ({ ...f, insuranceDaysBefore: v.split(',').map((n) => Number(n.trim())).filter(Boolean) }))}
        />
        <Field
          label="Alerte entretien (km avant)"
          name="serviceKmBefore"
          type="number"
          value={form.serviceKmBefore}
          onChange={(n, v) => setForm((f) => ({ ...f, [n]: Number(v) }))}
        />
      </div>
      {canEdit && (
        <button type="button" className="dbtn dbtn--clay" style={{ marginTop: 16 }} disabled={busy}
          onClick={() => save({ notifications: form })}>
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      )}
    </>
  )
}

function UsersTab() {
  const { data, loading, error, reload } = useAsync(() => api.listUsers(), [])
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Banner>{error}</Banner>
      <div style={{ display: 'flex', marginBottom: 14 }}>
        <button type="button" className="dbtn dbtn--clay dbtn--sm" onClick={() => setCreating(true)}>
          + Nouvel utilisateur
        </button>
      </div>
      {loading && <Loading />}
      {data && (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr><th>Nom</th><th>E-mail</th><th>Rôle</th><th>Dernière connexion</th><th>Actif</th><th /></tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
                  <td className="table__strong">{u.fullName}</td>
                  <td className="table__muted">{u.email}</td>
                  <td><Pill status={u.role === 'admin' ? 'vip' : u.role === 'manager' ? 'live' : 'off'} label={u.role} /></td>
                  <td className="table__muted">{u.lastLoginAt ? dateTime(u.lastLoginAt) : 'jamais'}</td>
                  <td>{u.active ? 'Oui' : 'Non'}</td>
                  <td className="num">
                    {u.active && (
                      <button type="button" className="dbtn dbtn--ghost dbtn--sm dbtn--danger"
                        onClick={async () => { await api.deactivateUser(u.id); reload() }}>
                        Désactiver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <NewUserDialog onClose={() => setCreating(false)} onSaved={() => { setCreating(false); reload() }} />}
    </>
  )
}

function NewUserDialog({ onClose, onSaved }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'agent' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  return (
    <Modal
      title="Nouvel utilisateur"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="dbtn dbtn--clay" disabled={busy}
            onClick={async () => {
              setBusy(true); setError('')
              try { await api.createUser(form); onSaved() }
              catch (err) { setError(err.message) }
              finally { setBusy(false) }
            }}>
            {busy ? 'Création…' : 'Créer'}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>
      <div className="dgrid">
        <Field label="Prénom" name="firstName" value={form.firstName} onChange={set} />
        <Field label="Nom" name="lastName" value={form.lastName} onChange={set} />
        <Field label="E-mail" name="email" type="email" value={form.email} onChange={set} full />
        <Field label="Mot de passe" name="password" type="password" value={form.password} onChange={set} />
        <Field
          label="Rôle"
          name="role"
          value={form.role}
          onChange={set}
          options={[
            { value: 'agent', label: 'Agent' },
            { value: 'manager', label: 'Responsable' },
            { value: 'admin', label: 'Administrateur' },
          ]}
        />
      </div>
    </Modal>
  )
}

function SecurityTab() {
  const { data, loading, error } = useAsync(() => api.getAudit({ limit: 120 }), [])

  return (
    <>
      <Banner>{error}</Banner>
      <p className="banner">Historique des actions — toute opération sensible est journalisée.</p>
      {loading && <Loading />}
      {data && (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr><th>Quand</th><th>Utilisateur</th><th>Action</th><th>Détail</th></tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id}>
                  <td className="table__muted">{dateTime(a.createdAt)}</td>
                  <td>{a.user ? `${a.user.firstName} ${a.user.lastName}` : '—'}</td>
                  <td className="table__muted">{a.action}</td>
                  <td>{a.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
