import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import { useAuth } from '../AuthContext.jsx'
import * as api from '../../api/dashboard.js'
import {
  Banner, Field, Modal, Panel, Pill,
  date, dateInput, dateTime, money, num, useAsync,
} from '../ui.jsx'

const STAGES = [
  { key: 'reservation', label: 'Réservation' },
  { key: 'depart', label: 'Départ' },
  { key: 'en_cours', label: 'En cours' },
  { key: 'retour', label: 'Retour' },
]

const STATUS_LABELS = {
  demande: 'Demande',
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
}

/**
 * A confirmed reservation is a rental file with four visible steps.
 * Each step writes back into the fleet and the finances: départ sets the
 * odometer and marks the vehicle loué, retour recomputes the balance from
 * the kilometres actually driven.
 */
export default function ReservationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isManager, isAdmin } = useAuth()
  const { data: r, loading, error, reload } = useAsync(() => api.getReservation(id), [id])

  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const act = async (fn) => {
    setBusy(true)
    setActionError('')
    try {
      await fn()
      setDialog(null)
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <><PageBar title="Réservation" /><div className="dash__content"><p className="loading">Chargement…</p></div></>
  if (error || !r) {
    return (
      <>
        <PageBar title="Réservation" />
        <div className="dash__content"><Banner>{error || 'Dossier introuvable.'}</Banner></div>
      </>
    )
  }

  const client = r.client
  const stageIndex = STAGES.findIndex((s) => s.key === (r.stage || 'reservation'))
  const currentIndex = r.status === 'terminee' ? 3 : stageIndex

  return (
    <>
      <PageBar
        title={r.reference}
        crumb={<Link to="/dashboard/reservations">Réservations</Link>}
      >
        <Pill status={r.status} label={STATUS_LABELS[r.status]} />
      </PageBar>

      <div className="dash__content">
        <Banner>{actionError}</Banner>

        {client?.status === 'blackliste' && (
          <Banner tone="error">
            Client blacklisté — {client.statusReason || 'motif non renseigné'}. Seul un
            administrateur peut confirmer ce dossier.
          </Banner>
        )}
        {!client && r.status === 'demande' && (
          <Banner tone="warn">
            Demande reçue depuis le site public. Rattachez-la à un client pour pouvoir la confirmer.
          </Banner>
        )}

        {/* --- stage rail --- */}
        <div className="stages">
          {STAGES.map((s, i) => (
            <div
              key={s.key}
              className={`stage${i < currentIndex ? ' is-done' : ''}${i === currentIndex ? ' is-current' : ''}`}
            >
              <span className="stage__n">{i + 1}</span>
              {s.label}
            </div>
          ))}
        </div>

        {/* --- actions --- */}
        <section className="panel">
          <div className="toolbar">
            {r.status === 'demande' && (
              <>
                {!client && (
                  <button type="button" className="dbtn dbtn--ghost dbtn--sm" onClick={() => setDialog('attach')}>
                    Rattacher un client
                  </button>
                )}
                <button
                  type="button"
                  className="dbtn dbtn--accent dbtn--sm"
                  disabled={!client || (client.status === 'blackliste' && !isAdmin)}
                  onClick={() => act(() => api.confirmReservation(id))}
                >
                  Confirmer la réservation
                </button>
              </>
            )}
            {r.status === 'confirmee' && (
              <button type="button" className="dbtn dbtn--accent dbtn--sm" onClick={() => setDialog('departure')}>
                Enregistrer le départ
              </button>
            )}
            {r.status === 'en_cours' && (
              <>
                <button type="button" className="dbtn dbtn--accent dbtn--sm" onClick={() => setDialog('return')}>
                  Enregistrer le retour
                </button>
                <button type="button" className="dbtn dbtn--ghost dbtn--sm" onClick={() => setDialog('extend')}>
                  Prolonger
                </button>
              </>
            )}
            {['confirmee', 'en_cours', 'terminee'].includes(r.status) && (
              <button type="button" className="dbtn dbtn--ghost dbtn--sm" onClick={() => setDialog('payment')}>
                + Ajouter un paiement
              </button>
            )}
            {r.status === 'terminee' && r.depositReceived > 0 && !r.depositReturnedAt && (
              <button
                type="button"
                className="dbtn dbtn--ghost dbtn--sm"
                onClick={() => act(() => api.returnDeposit(id))}
              >
                Restituer la caution ({money(r.depositReceived)})
              </button>
            )}
            {isManager && !['terminee', 'annulee'].includes(r.status) && (
              <button
                type="button"
                className="dbtn dbtn--ghost dbtn--sm dbtn--danger spacer"
                onClick={() => setDialog('cancel')}
              >
                Annuler le dossier
              </button>
            )}
          </div>
        </section>

        <div className="cols cols--wide-left">
          <div>
            {/* --- rental --- */}
            <Panel title="Location">
              <dl className="drows">
                <Row k="Véhicule" v={`${r.vehicle?.brand} ${r.vehicle?.model} — ${r.vehicle?.plate}`} />
                <Row k="Départ" v={`${dateTime(r.startDate)} · ${r.pickupLocation || '—'}`} />
                <Row k="Retour" v={`${dateTime(r.endDate)} · ${r.dropoffLocation || '—'}`} />
                <Row k="Durée" v={`${r.totals?.days} jour${r.totals?.days > 1 ? 's' : ''}`} />
                <Row k="Kilométrage inclus" v={`${num(r.totals?.kmAllowed)} km (${r.kmIncluded} km/jour)`} />
                <Row k="Km supplémentaire" v={`${r.extraKmPrice} DH`} />
              </dl>
            </Panel>

            {/* --- checkpoints --- */}
            <div className="cols">
              <Panel title="Départ" sub={r.departure?.at ? date(r.departure.at) : 'non enregistré'}>
                {r.departure?.at ? (
                  <dl className="drows">
                    <Row k="Kilométrage" v={`${num(r.departure.km)} km`} />
                    <Row k="Carburant" v={r.departure.fuel != null ? `${r.departure.fuel}/8` : '—'} />
                    <Row k="Caution reçue" v={money(r.depositReceived)} />
                    <Row
                      k="Dommages relevés"
                      v={r.departure.damages?.length ? r.departure.damages.join(', ') : 'Aucun'}
                    />
                  </dl>
                ) : (
                  <p className="table__muted" style={{ fontSize: '0.8125rem' }}>
                    L’état des lieux de départ n’a pas encore été saisi.
                  </p>
                )}
              </Panel>

              <Panel title="Retour" sub={r.return?.at ? date(r.return.at) : 'non enregistré'}>
                {r.return?.at ? (
                  <dl className="drows">
                    <Row k="Kilométrage" v={`${num(r.return.km)} km`} />
                    <Row k="Parcourus" v={`${num(r.totals.kmDriven)} km`} />
                    <Row k="Autorisés" v={`${num(r.totals.kmAllowed)} km`} />
                    <Row
                      k="Dépassement"
                      v={
                        r.totals.kmOverage > 0
                          ? `${num(r.totals.kmOverage)} km — ${money(r.totals.kmOverageAmount)}`
                          : 'Aucun'
                      }
                    />
                    <Row
                      k="Dommages relevés"
                      v={r.return.damages?.length ? r.return.damages.join(', ') : 'Aucun'}
                    />
                  </dl>
                ) : (
                  <p className="table__muted" style={{ fontSize: '0.8125rem' }}>
                    Le véhicule n’est pas encore rentré.
                  </p>
                )}
              </Panel>
            </div>

            {/* --- payments --- */}
            <Panel title="Paiements" sub={`${r.payments?.length || 0} encaissement(s)`} flush>
              {r.payments?.length ? (
                <div className="tablewrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Mode</th>
                        <th>Référence</th>
                        <th className="num">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.payments.map((p, i) => (
                        <tr key={p._id || i}>
                          <td className="table__muted">{date(p.date)}</td>
                          <td>{p.method}</td>
                          <td className="table__muted">{p.reference || '—'}</td>
                          <td className="num table__strong">{money(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="panel__empty">Aucun encaissement enregistré.</p>
              )}
            </Panel>
          </div>

          {/* --- side: client + money --- */}
          <div>
            <Panel title="Client">
              {client ? (
                <>
                  <p style={{ marginBottom: 10 }}>
                    <Link
                      to={`/dashboard/clients/${client._id || client.id}`}
                      className="table__strong"
                      style={{ fontSize: '0.9375rem' }}
                    >
                      {client.firstName} {client.lastName}
                    </Link>
                  </p>
                  <p style={{ marginBottom: 12 }}>
                    <Pill status={client.status} label={client.status} />
                  </p>
                  <dl className="drows">
                    <Row k="Téléphone" v={client.phone} />
                    <Row k="E-mail" v={client.email || '—'} />
                    <Row k="CIN / passeport" v={client.cin || '—'} />
                  </dl>
                </>
              ) : (
                <dl className="drows">
                  <Row k="Demandeur" v={`${r.requester?.firstName || ''} ${r.requester?.lastName || ''}`} />
                  <Row k="Téléphone" v={r.requester?.phone || '—'} />
                  <Row k="E-mail" v={r.requester?.email || '—'} />
                  <Row k="Pays" v={r.requester?.country || '—'} />
                  {r.requester?.message && <Row k="Message" v={r.requester.message} />}
                </dl>
              )}
            </Panel>

            <Panel title="Tarification">
              <dl className="drows">
                <Row k={`${money(r.pricePerDay)} × ${r.totals?.days} j`} v={money(r.totals?.base)} />
                {r.options?.map((o) => (
                  <Row
                    key={o.code || o.name}
                    k={o.name}
                    v={money(o.unit === 'jour' ? o.price * r.totals.days : o.price)}
                  />
                ))}
                {r.deliveryFee > 0 && <Row k="Livraison" v={money(r.deliveryFee)} />}
                {r.discount > 0 && <Row k="Remise" v={`− ${money(r.discount)}`} />}
                {r.totals?.kmOverageAmount > 0 && (
                  <Row k="Dépassement km" v={money(r.totals.kmOverageAmount)} />
                )}
                {r.extraFees?.map((f, i) => (
                  <Row key={i} k={f.label} v={money(f.amount)} />
                ))}
                <div className="drow drow--total">
                  <span>Total</span>
                  <span>{money(r.totals?.total)}</span>
                </div>
                <Row k="Encaissé" v={money(r.totals?.paid)} />
                <div className="drow drow--total">
                  <span>Reste à payer</span>
                  <span style={{ color: r.totals?.balance > 0 ? 'var(--accent)' : 'inherit' }}>
                    {money(r.totals?.balance)}
                  </span>
                </div>
              </dl>
            </Panel>

            <Panel title="Caution">
              <dl className="drows">
                <Row k="Prévue" v={money(r.deposit)} />
                <Row k="Reçue" v={r.depositReceived ? money(r.depositReceived) : '—'} />
                <Row k="Restituée" v={r.depositReturnedAt ? date(r.depositReturnedAt) : 'Non'} />
              </dl>
            </Panel>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- dialogs -- */}
      {dialog === 'departure' && (
        <CheckpointDialog
          title="Enregistrer le départ"
          confirmLabel="Enregistrer le départ"
          busy={busy}
          error={actionError}
          defaultKm={r.vehicle?.mileage}
          extraFields={[{ name: 'depositReceived', label: 'Caution reçue (DH)', type: 'number', defaultValue: r.deposit }]}
          onClose={() => setDialog(null)}
          onSubmit={(values) => act(() => api.recordDeparture(id, values))}
        />
      )}

      {dialog === 'return' && (
        <CheckpointDialog
          title="Enregistrer le retour"
          confirmLabel="Clôturer le dossier"
          busy={busy}
          error={actionError}
          defaultKm={r.departure?.km}
          hint={`Départ enregistré à ${num(r.departure?.km)} km — ${num(r.totals?.kmAllowed)} km inclus.`}
          extraFields={[{ name: 'lateHours', label: 'Heures de retard', type: 'number', defaultValue: 0 }]}
          onClose={() => setDialog(null)}
          onSubmit={(values) => act(() => api.recordReturn(id, values))}
        />
      )}

      {dialog === 'payment' && (
        <PaymentDialog
          busy={busy}
          error={actionError}
          balance={r.totals?.balance}
          onClose={() => setDialog(null)}
          onSubmit={(values) => act(() => api.addPayment(id, values))}
        />
      )}

      {dialog === 'extend' && (
        <SimpleDialog
          title="Prolonger la location"
          label="Nouvelle date de retour"
          type="date"
          defaultValue={dateInput(r.endDate)}
          busy={busy}
          error={actionError}
          onClose={() => setDialog(null)}
          onSubmit={(value) => act(() => api.extendReservation(id, value))}
        />
      )}

      {dialog === 'cancel' && (
        <SimpleDialog
          title="Annuler le dossier"
          label="Motif de l’annulation"
          type="text"
          busy={busy}
          error={actionError}
          danger
          onClose={() => setDialog(null)}
          onSubmit={(value) =>
            act(async () => {
              await api.cancelReservation(id, value)
              navigate('/dashboard/reservations')
            })
          }
        />
      )}

      {dialog === 'attach' && (
        <AttachClientDialog
          busy={busy}
          error={actionError}
          requester={r.requester}
          onClose={() => setDialog(null)}
          onPick={(clientId) => act(() => api.attachClient(id, clientId))}
        />
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

/* ------------------------------------------------------------- dialogs --- */

function CheckpointDialog({ title, confirmLabel, defaultKm, hint, extraFields = [], onSubmit, onClose, busy, error }) {
  const [form, setForm] = useState(() => ({
    km: defaultKm ?? '',
    fuel: 8,
    damages: '',
    notes: '',
    ...Object.fromEntries(extraFields.map((f) => [f.name, f.defaultValue ?? ''])),
  }))
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  const submit = () => {
    const { damages, ...rest } = form
    onSubmit({
      ...rest,
      km: Number(rest.km),
      fuel: Number(rest.fuel),
      damages: damages ? damages.split(',').map((s) => s.trim()).filter(Boolean) : [],
    })
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>Annuler</button>
          <button type="button" className="dbtn dbtn--accent" onClick={submit} disabled={busy || !form.km}>
            {busy ? 'Enregistrement…' : confirmLabel}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>
      {hint && <p className="banner">{hint}</p>}
      <div className="dgrid">
        <Field label="Kilométrage au compteur" name="km" type="number" value={form.km} onChange={set} />
        <Field label="Carburant (sur 8)" name="fuel" type="number" min="0" max="8" value={form.fuel} onChange={set} />
        {extraFields.map((f) => (
          <Field key={f.name} label={f.label} name={f.name} type={f.type} value={form[f.name]} onChange={set} />
        ))}
        <Field
          label="Dommages (séparés par des virgules)"
          name="damages"
          value={form.damages}
          onChange={set}
          full
          placeholder="Rayure aile avant droite, jante arrière gauche"
        />
        <Field label="Notes" name="notes" type="textarea" value={form.notes} onChange={set} full />
      </div>
    </Modal>
  )
}

function PaymentDialog({ balance, onSubmit, onClose, busy, error }) {
  const [form, setForm] = useState({ amount: balance > 0 ? balance : '', method: 'especes', reference: '' })
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))

  return (
    <Modal
      title="Ajouter un paiement"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>Annuler</button>
          <button
            type="button"
            className="dbtn dbtn--accent"
            onClick={() => onSubmit({ ...form, amount: Number(form.amount) })}
            disabled={busy || !form.amount}
          >
            {busy ? 'Enregistrement…' : 'Encaisser'}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>
      {balance > 0 && <p className="banner">Reste à payer : {money(balance)}</p>}
      <div className="dgrid">
        <Field label="Montant (DH)" name="amount" type="number" value={form.amount} onChange={set} />
        <Field
          label="Mode de paiement"
          name="method"
          value={form.method}
          onChange={set}
          options={[
            { value: 'especes', label: 'Espèces' },
            { value: 'carte', label: 'Carte' },
            { value: 'virement', label: 'Virement' },
            { value: 'cheque', label: 'Chèque' },
            { value: 'autre', label: 'Autre' },
          ]}
        />
        <Field label="Référence" name="reference" value={form.reference} onChange={set} full />
      </div>
    </Modal>
  )
}

function SimpleDialog({ title, label, type, defaultValue = '', onSubmit, onClose, busy, error, danger }) {
  const [value, setValue] = useState(defaultValue)
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>Fermer</button>
          <button
            type="button"
            className={`dbtn ${danger ? 'dbtn--danger' : 'dbtn--accent'}`}
            onClick={() => onSubmit(value)}
            disabled={busy || !value}
          >
            {busy ? 'En cours…' : 'Valider'}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>
      <div className="dfield">
        <label htmlFor="simple-value">{label}</label>
        <input id="simple-value" type={type} value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
    </Modal>
  )
}

function AttachClientDialog({ requester, onPick, onClose, busy, error }) {
  const [query, setQuery] = useState(
    `${requester?.lastName || ''}`.trim() || `${requester?.phone || ''}`
  )
  const { data: results } = useAsync(
    () => (query.length >= 2 ? api.searchClients(query) : Promise.resolve([])),
    [query]
  )
  const [creating, setCreating] = useState(false)
  const [newClient, setNewClient] = useState({
    firstName: requester?.firstName || '',
    lastName: requester?.lastName || '',
    phone: requester?.phone || '',
    email: requester?.email || '',
    country: requester?.country || '',
  })
  const set = (name, value) => setNewClient((c) => ({ ...c, [name]: value }))

  return (
    <Modal
      title="Rattacher un client"
      onClose={onClose}
      footer={
        creating ? (
          <>
            <button type="button" className="dbtn dbtn--ghost" onClick={() => setCreating(false)}>
              Retour à la recherche
            </button>
            <button
              type="button"
              className="dbtn dbtn--accent"
              disabled={busy || !newClient.firstName || !newClient.lastName || !newClient.phone}
              onClick={async () => {
                const created = await api.createClient(newClient)
                onPick(created.id)
              }}
            >
              Créer et rattacher
            </button>
          </>
        ) : (
          <button type="button" className="dbtn dbtn--ghost" onClick={() => setCreating(true)}>
            + Créer un nouveau client
          </button>
        )
      }
    >
      <Banner>{error}</Banner>

      {creating ? (
        <div className="dgrid">
          <Field label="Prénom" name="firstName" value={newClient.firstName} onChange={set} />
          <Field label="Nom" name="lastName" value={newClient.lastName} onChange={set} />
          <Field label="Téléphone" name="phone" value={newClient.phone} onChange={set} />
          <Field label="E-mail" name="email" type="email" value={newClient.email} onChange={set} />
        </div>
      ) : (
        <>
          <div className="dfield" style={{ marginBottom: 12 }}>
            <label htmlFor="attach-q">Rechercher un client existant</label>
            <input
              id="attach-q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, téléphone ou CIN"
            />
          </div>
          {(results || []).map((c) => (
            <button
              type="button"
              key={c.id}
              className="mini-search__row"
              onClick={() => onPick(c.id)}
              disabled={busy}
            >
              <span className="table__strong" style={{ flex: 1 }}>
                {c.fullName}
                <span className="table__sub">{c.phone}</span>
              </span>
              <Pill status={c.status} label={c.status} />
            </button>
          ))}
          {query.length >= 2 && results?.length === 0 && (
            <p className="panel__empty">Aucun client trouvé.</p>
          )}
        </>
      )}
    </Modal>
  )
}
