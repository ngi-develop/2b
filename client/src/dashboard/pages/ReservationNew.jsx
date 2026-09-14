import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import { useAuth } from '../AuthContext.jsx'
import * as api from '../../api/dashboard.js'
import {
  Banner, Field, Panel, Pill,
  dateInput, money, useAsync, useDebounced,
} from '../ui.jsx'

const DAY = 86400000

/**
 * + Nouvelle réservation.
 *
 * Implements the shortcut the brief asks for: pick an existing client or
 * create one without leaving the form, and see their standing immediately —
 * a blacklisted client cannot be confirmed here at all.
 */
export default function ReservationNew() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [params] = useSearchParams()

  const [client, setClient] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newClient, setNewClient] = useState({
    firstName: '', lastName: '', phone: '', whatsapp: '', email: '', cin: '', nationality: '', address: '',
  })

  const [form, setForm] = useState({
    vehicleId: params.get('vehicle') || '',
    startDate: dateInput(new Date(Date.now() + DAY)),
    endDate: dateInput(new Date(Date.now() + 5 * DAY)),
    pickupLocation: '',
    dropoffLocation: '',
    discount: 0,
    deliveryFee: 0,
    notes: '',
  })
  const [optionCodes, setOptionCodes] = useState([])
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))
  const setNew = (name, value) => setNewClient((c) => ({ ...c, [name]: value }))

  const { data: vehicles } = useAsync(() => api.listVehicles({ fleetType: 'tourisme' }), [])
  const { data: settings } = useAsync(() => api.getSettings(), [])

  const options = settings?.rentalOptions?.filter((o) => o.active !== false) || []
  const pickupPoints = settings?.lists?.pickupPoints || []

  useEffect(() => {
    if (pickupPoints.length && !form.pickupLocation) {
      setForm((f) => ({ ...f, pickupLocation: pickupPoints[0], dropoffLocation: pickupPoints[0] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const vehicle = vehicles?.find((v) => v.id === form.vehicleId)

  const quote = useMemo(() => {
    if (!vehicle) return null
    const days = Math.max(
      Math.round((new Date(form.endDate) - new Date(form.startDate)) / DAY),
      1
    )
    const base = Math.max(vehicle.pricePerDay * days - Number(form.discount || 0), 0)
    const opts = options
      .filter((o) => optionCodes.includes(o.code))
      .reduce((s, o) => s + (o.unit === 'jour' ? o.price * days : o.price), 0)
    const total = base + opts + Number(form.deliveryFee || 0)
    return { days, base, opts, total, kmAllowed: vehicle.kmIncluded * days }
  }, [vehicle, form.startDate, form.endDate, form.discount, form.deliveryFee, optionCodes, options])

  const blocked = client?.status === 'blackliste' && !isAdmin

  async function submit(confirm) {
    setError('')
    setFieldErrors({})

    if (!client && !creating) return setError('Sélectionnez un client ou créez-en un.')
    if (!form.vehicleId) return setError('Sélectionnez un véhicule.')

    setBusy(true)
    try {
      const payload = {
        ...form,
        discount: Number(form.discount || 0),
        deliveryFee: Number(form.deliveryFee || 0),
        optionCodes,
        confirm,
        ...(client ? { clientId: client.id } : { newClient }),
      }
      const created = await api.createReservation(payload)
      navigate(`/dashboard/reservations/${created.id}`)
    } catch (err) {
      setError(err.message)
      if (err.details) setFieldErrors(err.details)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageBar title="Nouvelle réservation" crumb={<Link to="/dashboard/reservations">Réservations</Link>} />

      <div className="dash__content">
        <Banner>{error}</Banner>

        <div className="cols cols--wide-left">
          <div>
            {/* --- 1. client --- */}
            <Panel
              title="1 — Client"
              actions={
                client || creating ? (
                  <button
                    type="button"
                    className="dbtn dbtn--ghost dbtn--sm"
                    onClick={() => {
                      setClient(null)
                      setCreating(false)
                    }}
                  >
                    Changer
                  </button>
                ) : null
              }
            >
              {client ? (
                <ClientSummary client={client} blocked={blocked} isAdmin={isAdmin} />
              ) : creating ? (
                <div className="dgrid">
                  <Field label="Prénom" name="firstName" value={newClient.firstName} onChange={setNew} error={fieldErrors['newClient.firstName']} />
                  <Field label="Nom" name="lastName" value={newClient.lastName} onChange={setNew} error={fieldErrors['newClient.lastName']} />
                  <Field label="Téléphone" name="phone" value={newClient.phone} onChange={setNew} error={fieldErrors['newClient.phone']} />
                  <Field label="WhatsApp" name="whatsapp" value={newClient.whatsapp} onChange={setNew} />
                  <Field label="E-mail" name="email" type="email" value={newClient.email} onChange={setNew} />
                  <Field label="CIN / passeport" name="cin" value={newClient.cin} onChange={setNew} />
                  <Field label="Nationalité" name="nationality" value={newClient.nationality} onChange={setNew} />
                  <Field label="Adresse" name="address" value={newClient.address} onChange={setNew} />
                </div>
              ) : (
                <ClientPicker onPick={setClient} onCreate={() => setCreating(true)} />
              )}
            </Panel>

            {/* --- 2. vehicle + period --- */}
            <Panel title="2 — Véhicule et période">
              <div className="dgrid">
                <Field
                  label="Véhicule"
                  name="vehicleId"
                  value={form.vehicleId}
                  onChange={set}
                  error={fieldErrors.vehicleId}
                  full
                  options={[
                    { value: '', label: '— Sélectionner —' },
                    ...(vehicles || []).map((v) => ({
                      value: v.id,
                      label: `${v.brand} ${v.model} — ${v.plate} (${money(v.pricePerDay)}/j, ${statusLabel(v.derivedStatus)})`,
                    })),
                  ]}
                />
                <Field label="Date de départ" name="startDate" type="date" value={form.startDate} onChange={set} />
                <Field label="Date de retour" name="endDate" type="date" value={form.endDate} onChange={set} error={fieldErrors.endDate} />
                <Field
                  label="Lieu de départ"
                  name="pickupLocation"
                  value={form.pickupLocation}
                  onChange={set}
                  options={pickupPoints.length ? pickupPoints : undefined}
                />
                <Field
                  label="Lieu de retour"
                  name="dropoffLocation"
                  value={form.dropoffLocation}
                  onChange={set}
                  options={pickupPoints.length ? pickupPoints : undefined}
                />
              </div>
            </Panel>

            {/* --- 3. pricing --- */}
            <Panel title="3 — Tarification">
              <div className="dgrid">
                <Field label="Remise (DH)" name="discount" type="number" value={form.discount} onChange={set} />
                <Field label="Livraison (DH)" name="deliveryFee" type="number" value={form.deliveryFee} onChange={set} />
              </div>

              <p className="panel__sub" style={{ margin: '18px 0 10px' }}>Options</p>
              <div style={{ display: 'grid', gap: 0 }}>
                {options.map((o) => (
                  <label
                    key={o.code}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: 10,
                      alignItems: 'center',
                      padding: '9px 0',
                      borderBottom: '1px solid var(--line-soft)',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={optionCodes.includes(o.code)}
                      onChange={() =>
                        setOptionCodes((prev) =>
                          prev.includes(o.code) ? prev.filter((c) => c !== o.code) : [...prev, o.code]
                        )
                      }
                    />
                    <span>
                      {o.name}
                      <span className="table__sub">{o.note}</span>
                    </span>
                    <span className="table__strong">
                      {money(o.price)} <span className="table__muted">/ {o.unit}</span>
                    </span>
                  </label>
                ))}
              </div>

              <div style={{ marginTop: 18 }}>
                <Field label="Notes internes" name="notes" type="textarea" value={form.notes} onChange={set} full />
              </div>
            </Panel>
          </div>

          {/* --- summary --- */}
          <div>
            <Panel title="Récapitulatif">
              {!vehicle || !quote ? (
                <p className="table__muted" style={{ fontSize: '0.8125rem' }}>
                  Sélectionnez un véhicule pour voir le devis.
                </p>
              ) : (
                <dl className="drows">
                  <div className="drow">
                    <span>Véhicule</span>
                    <span>{vehicle.brand} {vehicle.model}</span>
                  </div>
                  <div className="drow">
                    <span>{money(vehicle.pricePerDay)} × {quote.days} j</span>
                    <span>{money(quote.base)}</span>
                  </div>
                  {quote.opts > 0 && (
                    <div className="drow"><span>Options</span><span>{money(quote.opts)}</span></div>
                  )}
                  {Number(form.deliveryFee) > 0 && (
                    <div className="drow"><span>Livraison</span><span>{money(form.deliveryFee)}</span></div>
                  )}
                  <div className="drow drow--total">
                    <span>Total</span>
                    <span>{money(quote.total)}</span>
                  </div>
                  <div className="drow"><span>Kilométrage inclus</span><span>{quote.kmAllowed} km</span></div>
                  <div className="drow"><span>Caution prévue</span><span>{money(vehicle.deposit)}</span></div>
                </dl>
              )}

              <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
                <button
                  type="button"
                  className="dbtn dbtn--accent"
                  disabled={busy || blocked}
                  onClick={() => submit(true)}
                >
                  {busy ? 'Enregistrement…' : 'Créer et confirmer'}
                </button>
                <button type="button" className="dbtn dbtn--ghost" disabled={busy} onClick={() => submit(false)}>
                  Enregistrer comme demande
                </button>
                {blocked && (
                  <p className="dfield__err">
                    Client blacklisté — seul un administrateur peut confirmer.
                  </p>
                )}
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  )
}

function ClientPicker({ onPick, onCreate }) {
  const [query, setQuery] = useState('')
  const q = useDebounced(query, 250)
  const { data: results } = useAsync(
    () => (q.length >= 2 ? api.searchClients(q) : Promise.resolve([])),
    [q]
  )

  return (
    <>
      <div className="dfield" style={{ marginBottom: 10 }}>
        <label htmlFor="client-q">Rechercher un client existant</label>
        <input
          id="client-q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, prénom, téléphone ou CIN"
        />
      </div>

      {(results || []).map((c) => (
        <button type="button" key={c.id} className="mini-search__row" onClick={() => onPick(c)}>
          <span style={{ flex: 1 }}>
            <span className="table__strong">{c.fullName}</span>
            <span className="table__sub">
              {c.phone} · {c.rentals} location{c.rentals > 1 ? 's' : ''}
            </span>
          </span>
          <Pill status={c.status} label={c.status} />
        </button>
      ))}

      {q.length >= 2 && results?.length === 0 && (
        <p className="panel__empty">Aucun client trouvé pour « {q} ».</p>
      )}

      <button type="button" className="dbtn dbtn--ghost dbtn--sm" style={{ marginTop: 12 }} onClick={onCreate}>
        + Créer un nouveau client
      </button>
    </>
  )
}

/** The standing badge the brief wants visible the moment a client is chosen. */
function ClientSummary({ client, blocked, isAdmin }) {
  const headline = {
    bon: 'BON CLIENT',
    vip: 'CLIENT VIP',
    nouveau: 'NOUVEAU CLIENT',
    a_surveiller: 'À SURVEILLER',
    blackliste: 'BLACKLISTÉ',
    entreprise: 'CLIENT ENTREPRISE',
  }[client.status]

  return (
    <>
      <p style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 6 }}>{client.fullName}</p>
      <p style={{ marginBottom: 10 }}>
        <Pill status={client.status} label={headline} />
      </p>
      <p className="table__muted" style={{ fontSize: '0.8125rem', marginBottom: 10 }}>
        {client.rentals === 0
          ? 'Première location'
          : `${client.rentals} location${client.rentals > 1 ? 's' : ''} — ${money(client.revenue)} de CA`}
        {client.outstanding > 0 && ` — ${money(client.outstanding)} d’impayé`}
      </p>
      {client.statusReason && (
        <div className={`banner ${client.status === 'blackliste' ? 'banner--error' : 'banner--warn'}`}>
          {client.statusReason}
        </div>
      )}
      {blocked && (
        <div className="banner banner--error">
          Réservation bloquée : seul un administrateur peut confirmer une location pour ce client.
        </div>
      )}
      {client.status === 'blackliste' && isAdmin && (
        <div className="banner banner--warn">
          Client blacklisté. Vous pouvez confirmer en tant qu’administrateur — l’action sera journalisée.
        </div>
      )}
      <dl className="drows">
        <div className="drow"><span>Téléphone</span><span>{client.phone}</span></div>
        <div className="drow"><span>E-mail</span><span>{client.email || '—'}</span></div>
        <div className="drow"><span>CIN</span><span>{client.cin || '—'}</span></div>
      </dl>
    </>
  )
}

function statusLabel(s) {
  return { disponible: 'disponible', reserve: 'réservé', loue: 'loué', maintenance: 'maintenance', immobilise: 'immobilisé', bloque: 'bloqué' }[s] || s
}
