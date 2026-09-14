import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import * as api from '../../api/dashboard.js'
import {
  Banner, Empty, Field, Loading, Modal, Pill,
  date, money, useAsync, useDebounced,
} from '../ui.jsx'

const STATUS_LABELS = {
  nouveau: 'Nouveau',
  bon: 'Bon client',
  vip: 'VIP',
  a_surveiller: 'À surveiller',
  blackliste: 'Blacklisté',
  entreprise: 'Entreprise',
}

/** Clients — the whole customer base, with standing visible at a glance. */
export default function Clients() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const q = useDebounced(query, 300)
  const [creating, setCreating] = useState(false)

  const { data, loading, error, reload } = useAsync(() => api.listClients({ status, q }), [status, q])
  const rows = data || []

  return (
    <>
      <PageBar title="Clients" crumb={loading ? '' : `${rows.length} fiche${rows.length > 1 ? 's' : ''}`}>
        <button type="button" className="dbtn dbtn--clay dbtn--sm" onClick={() => setCreating(true)}>
          + Nouveau client
        </button>
      </PageBar>

      <div className="dash__content">
        <Banner>{error}</Banner>

        <section className="panel">
          <div className="tabs">
            <button type="button" className={`tab${status === '' ? ' is-on' : ''}`} onClick={() => setStatus('')}>
              Tous
            </button>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <button
                key={k}
                type="button"
                className={`tab${status === k ? ' is-on' : ''}`}
                onClick={() => setStatus(k)}
              >
                {v}
              </button>
            ))}
          </div>

          <div className="toolbar">
            <input
              className="dinput dinput--search"
              placeholder="Nom, prénom, téléphone, CIN ou e-mail…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {loading && <Loading />}
          {!loading && rows.length === 0 && <Empty>Aucun client ne correspond.</Empty>}

          {!loading && rows.length > 0 && (
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Téléphone</th>
                    <th className="num">Locations</th>
                    <th className="num">CA généré</th>
                    <th className="num">Impayé</th>
                    <th>Dernière location</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr
                      key={c.id}
                      className="is-clickable"
                      onClick={() => navigate(`/dashboard/clients/${c.id}`)}
                    >
                      <td>
                        <span className="table__strong">{c.fullName}</span>
                        <span className="table__sub">{c.email || c.cin || '—'}</span>
                      </td>
                      <td className="table__muted">{c.phone}</td>
                      <td className="num">{c.rentals}</td>
                      <td className="num">{money(c.revenue)}</td>
                      <td className="num" style={{ color: c.outstanding > 0 ? 'var(--clay)' : 'var(--ink-45)' }}>
                        {c.outstanding > 0 ? money(c.outstanding) : '—'}
                      </td>
                      <td className="table__muted">{c.lastRental ? date(c.lastRental) : '—'}</td>
                      <td><Pill status={c.status} label={STATUS_LABELS[c.status]} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {creating && (
        <NewClientDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            reload()
            navigate(`/dashboard/clients/${id}`)
          }}
        />
      )}
    </>
  )
}

function NewClientDialog({ onClose, onCreated }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', whatsapp: '', email: '',
    cin: '', nationality: '', address: '', city: '', country: 'Maroc',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  async function submit() {
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      const created = await api.createClient(form)
      onCreated(created.id)
    } catch (err) {
      setError(err.message)
      if (err.details) setFieldErrors(err.details)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Nouveau client"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>Annuler</button>
          <button
            type="button"
            className="dbtn dbtn--clay"
            onClick={submit}
            disabled={busy || !form.firstName || !form.lastName || !form.phone}
          >
            {busy ? 'Enregistrement…' : 'Créer le client'}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>
      <div className="dgrid">
        <Field label="Prénom" name="firstName" value={form.firstName} onChange={set} error={fieldErrors.firstName} />
        <Field label="Nom" name="lastName" value={form.lastName} onChange={set} error={fieldErrors.lastName} />
        <Field label="Téléphone" name="phone" value={form.phone} onChange={set} error={fieldErrors.phone} />
        <Field label="WhatsApp" name="whatsapp" value={form.whatsapp} onChange={set} />
        <Field label="E-mail" name="email" type="email" value={form.email} onChange={set} error={fieldErrors.email} />
        <Field label="CIN / passeport" name="cin" value={form.cin} onChange={set} />
        <Field label="Nationalité" name="nationality" value={form.nationality} onChange={set} />
        <Field label="Ville" name="city" value={form.city} onChange={set} />
        <Field label="Adresse" name="address" value={form.address} onChange={set} full />
      </div>
    </Modal>
  )
}
