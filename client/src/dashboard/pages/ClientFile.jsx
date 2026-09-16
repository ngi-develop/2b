import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageBar } from '../DashboardLayout.jsx'
import { useAuth } from '../AuthContext.jsx'
import * as api from '../../api/dashboard.js'
import {
  Banner, Empty, Field, Modal, Panel, Pill, Tile,
  date, dateTime, money, num, useAsync,
} from '../ui.jsx'

const STATUS_LABELS = {
  nouveau: 'Nouveau client',
  bon: 'Bon client',
  vip: 'VIP',
  a_surveiller: 'À surveiller',
  blackliste: 'Blacklisté',
  entreprise: 'Entreprise',
}

const NEEDS_REASON = ['a_surveiller', 'blackliste']

const DOC_KINDS = {
  cin: 'CIN',
  passeport: 'Passeport',
  permis: 'Permis de conduire',
  autre: 'Autre pièce',
}

/** Fiche client: identité, documents, historique, synthèse, notes internes. */
export default function ClientFile() {
  const { id } = useParams()
  const { isManager } = useAuth()
  const { data: c, loading, error, reload } = useAsync(() => api.getClient(id), [id])

  const [dialog, setDialog] = useState(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const fileInput = useRef(null)
  const [docKind, setDocKind] = useState('cin')
  const [docBusy, setDocBusy] = useState(false)

  /* Two steps on purpose: the bytes go up first and come back as a URL, which
     is then attached to the client. If the attach fails the file is orphaned,
     which is the harmless way round. */
  async function addDocument(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setDocBusy(true)
    setActionError('')
    try {
      const { url, name } = await api.uploadFile(file)
      await api.addClientDocument(id, { kind: docKind, label: name, url })
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setDocBusy(false)
    }
  }

  async function removeDocument(docId) {
    setDocBusy(true)
    setActionError('')
    try {
      await api.deleteClientDocument(id, docId)
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setDocBusy(false)
    }
  }

  async function addNote() {
    if (!note.trim()) return
    setBusy(true)
    try {
      await api.addClientNote(id, note.trim())
      setNote('')
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <><PageBar title="Client" /><div className="dash__content"><p className="loading">Chargement…</p></div></>
  }
  if (error || !c) {
    return <><PageBar title="Client" /><div className="dash__content"><Banner>{error || 'Introuvable.'}</Banner></div></>
  }

  return (
    <>
      <PageBar title={c.fullName} crumb={<Link to="/dashboard/clients">Clients</Link>}>
        <Pill status={c.status} label={STATUS_LABELS[c.status]} />
        {isManager && (
          <button type="button" className="dbtn dbtn--ghost dbtn--sm" onClick={() => setDialog('status')}>
            Modifier le statut
          </button>
        )}
      </PageBar>

      <div className="dash__content">
        <Banner>{actionError}</Banner>

        {c.statusReason && NEEDS_REASON.includes(c.status) && (
          <Banner tone={c.status === 'blackliste' ? 'error' : 'warn'}>
            <strong>{STATUS_LABELS[c.status]}</strong> — {c.statusReason}
          </Banner>
        )}

        <div className="tiles">
          <Tile label="Locations" value={num(c.summary.rentals)} />
          <Tile label="CA généré" value={money(c.summary.revenue)} variant="ink" />
          <Tile
            label="Impayé"
            value={money(c.summary.outstanding)}
            variant={c.summary.outstanding > 0 ? 'accent' : undefined}
          />
          <Tile label="Km parcourus" value={num(c.summary.kmDriven)} unit="km" />
          <Tile label="Retards" value={num(c.summary.lateReturns)} />
          <Tile label="Sinistres" value={num(c.summary.damages)} />
        </div>

        <div className="cols cols--wide-left">
          <div>
            <Panel title="Historique des locations" sub={`${c.history.length}`} flush>
              {c.history.length === 0 ? (
                <Empty>Aucune location enregistrée.</Empty>
              ) : (
                <div className="tablewrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>N°</th><th>Véhicule</th><th>Période</th>
                        <th className="num">Km</th><th className="num">Montant</th>
                        <th className="num">Reste</th><th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.history.map((r) => (
                        <tr key={r._id}>
                          <td className="table__ref">
                            <Link to={`/dashboard/reservations/${r._id}`}>{r.reference}</Link>
                          </td>
                          <td>
                            {r.vehicle?.brand} {r.vehicle?.model}
                            <span className="table__sub">{r.vehicle?.plate}</span>
                          </td>
                          <td className="table__muted">{date(r.startDate)} → {date(r.endDate)}</td>
                          <td className="num table__muted">
                            {r.totals?.kmDriven ? num(r.totals.kmDriven) : '—'}
                          </td>
                          <td className="num">{money(r.totals?.total)}</td>
                          <td
                            className="num"
                            style={{ color: r.totals?.balance > 0 ? 'var(--accent)' : 'var(--ink-45)' }}
                          >
                            {r.totals?.balance > 0 ? money(r.totals.balance) : '—'}
                          </td>
                          <td><Pill status={r.status} label={r.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel title="Notes internes" sub="jamais visibles par le client">
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input
                  className="dinput"
                  style={{ flex: 1 }}
                  placeholder="Ajouter une note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                />
                <button type="button" className="dbtn dbtn--sm" onClick={addNote} disabled={busy || !note.trim()}>
                  Ajouter
                </button>
              </div>
              {c.internalNotes?.length ? (
                <div className="drows">
                  {[...c.internalNotes].reverse().map((n, i) => (
                    <div className="drow" key={n._id || i} style={{ alignItems: 'flex-start' }}>
                      <span style={{ flex: 1, color: 'var(--ink)', textAlign: 'left' }}>{n.body}</span>
                      <span className="table__muted" style={{ whiteSpace: 'nowrap' }}>
                        {n.author ? `${n.author.firstName} ${n.author.lastName}` : ''} · {date(n.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="table__muted" style={{ fontSize: '0.8125rem' }}>Aucune note.</p>
              )}
            </Panel>
          </div>

          <div>
            <Panel title="Identité">
              <dl className="drows">
                <Row k="Nom complet" v={c.fullName} />
                <Row k="Téléphone" v={c.phone} />
                <Row k="WhatsApp" v={c.whatsapp || '—'} />
                <Row k="E-mail" v={c.email || '—'} />
                <Row k="CIN / passeport" v={c.cin || '—'} />
                <Row k="Date de naissance" v={c.birthDate ? date(c.birthDate) : '—'} />
                <Row k="Nationalité" v={c.nationality || '—'} />
                <Row k="Ville" v={c.city || '—'} />
                <Row k="Adresse" v={c.address || '—'} />
              </dl>
            </Panel>

            <Panel title="Permis de conduire">
              <dl className="drows">
                <Row k="Numéro" v={c.licence?.number || '—'} />
                <Row k="Obtenu le" v={c.licence?.issuedAt ? date(c.licence.issuedAt) : '—'} />
                <Row k="Expire le" v={c.licence?.expiresAt ? date(c.licence.expiresAt) : '—'} />
              </dl>
            </Panel>

            <Panel title="Documents" sub={`${c.documents?.length || 0}`}>
              {c.documents?.length ? (
                <ul className="docs">
                  {c.documents.map((d) => (
                    <li key={d._id} className="docs__row">
                      <a
                        className="docs__link"
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <strong>{DOC_KINDS[d.kind] || d.kind}</strong>
                        <span>{d.label || 'Fichier'}</span>
                      </a>
                      <span className="docs__meta">
                        {d.expiresAt ? `exp. ${date(d.expiresAt)}` : ''}
                      </span>
                      {isManager && (
                        <button
                          type="button"
                          className="docs__x"
                          aria-label="Supprimer ce document"
                          onClick={() => removeDocument(d._id)}
                          disabled={docBusy}
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="table__muted" style={{ fontSize: '0.8125rem' }}>
                  Aucun document enregistré (CIN, passeport, permis).
                </p>
              )}

              <div className="docs__add">
                <select
                  value={docKind}
                  onChange={(e) => setDocKind(e.target.value)}
                  aria-label="Type de document"
                >
                  {Object.entries(DOC_KINDS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="dbtn dbtn--sm"
                  onClick={() => fileInput.current?.click()}
                  disabled={docBusy}
                >
                  {docBusy ? 'Envoi…' : 'Joindre'}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,application/pdf"
                  hidden
                  onChange={addDocument}
                />
              </div>
            </Panel>

            <Panel title="Fiche">
              <dl className="drows">
                <Row k="Créée le" v={dateTime(c.createdAt)} />
                <Row k="Dernière modification" v={dateTime(c.updatedAt)} />
              </dl>
            </Panel>
          </div>
        </div>
      </div>

      {dialog === 'status' && (
        <StatusDialog
          client={c}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null)
            reload()
          }}
        />
      )}
    </>
  )
}

function Row({ k, v }) {
  return <div className="drow"><span>{k}</span><span>{v}</span></div>
}

function StatusDialog({ client, onClose, onSaved }) {
  const [status, setStatus] = useState(client.status)
  const [reason, setReason] = useState(client.statusReason || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const needsReason = NEEDS_REASON.includes(status)

  async function save() {
    setBusy(true)
    setError('')
    try {
      await api.updateClient(client.id, { status, statusReason: reason })
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Statut du client"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>Annuler</button>
          <button
            type="button"
            className="dbtn dbtn--accent"
            onClick={save}
            disabled={busy || (needsReason && !reason.trim())}
          >
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>
      <div className="dgrid dgrid--1">
        <Field
          label="Statut"
          name="status"
          value={status}
          onChange={(_, v) => setStatus(v)}
          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <div className={`dfield${needsReason && !reason.trim() ? ' has-error' : ''}`}>
          <label htmlFor="reason">
            Motif {needsReason ? '(obligatoire)' : '(facultatif)'}
          </label>
          <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          {needsReason && (
            <span className="dfield__err">
              Un motif est obligatoire pour « À surveiller » et « Blacklisté ».
            </span>
          )}
        </div>
      </div>
      {status === 'blackliste' && (
        <div className="banner banner--error" style={{ marginTop: 14 }}>
          Un client blacklisté ne peut plus avoir de réservation confirmée, sauf par un administrateur.
        </div>
      )}
    </Modal>
  )
}
