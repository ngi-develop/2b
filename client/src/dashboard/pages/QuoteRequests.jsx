import { useState } from 'react'
import { PageBar } from '../DashboardLayout.jsx'
import * as api from '../../api/dashboard.js'
import {
  Banner, Empty, Field, Loading, Modal, Panel, Pill,
  date, dateTime, money, useAsync,
} from '../ui.jsx'

const STATUS_LABELS = {
  nouveau: 'Nouveau',
  en_analyse: 'En analyse',
  devis_envoye: 'Devis envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
}

const TABS = [{ value: '', label: 'Toutes' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))]

/**
 * Demandes Car Wash — the only internal surface of the professional track.
 *
 * Nothing here is a catalogue: each dossier is priced by hand, sent, then
 * accepted or refused by the client.
 */
export default function QuoteRequests() {
  const [status, setStatus] = useState('')
  const [open, setOpen] = useState(null)
  const [tab, setTab] = useState('quotes')

  const { data, loading, error, reload } = useAsync(() => api.listQuoteRequests({ status }), [status])
  const rows = data?.rows || []
  const counts = data?.counts || {}

  return (
    <>
      <PageBar title="Demandes Car Wash" crumb={loading ? '' : `${rows.length} dossier(s)`}>
        <button
          type="button"
          className={`dbtn dbtn--sm ${tab === 'quotes' ? '' : 'dbtn--ghost'}`}
          onClick={() => setTab('quotes')}
        >
          Devis
        </button>
        <button
          type="button"
          className={`dbtn dbtn--sm ${tab === 'inbox' ? '' : 'dbtn--ghost'}`}
          onClick={() => setTab('inbox')}
        >
          Messages du site
        </button>
      </PageBar>

      <div className="dash__content">
        <Banner>{error}</Banner>

        {tab === 'inbox' ? (
          <Inbox />
        ) : (
          <section className="panel">
            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`tab${status === t.value ? ' is-on' : ''}`}
                  onClick={() => setStatus(t.value)}
                >
                  {t.label}
                  {t.value && counts[t.value] ? <span className="tab__n">{counts[t.value]}</span> : null}
                </button>
              ))}
            </div>

            {loading && <Loading />}
            {!loading && rows.length === 0 && <Empty>Aucune demande.</Empty>}

            {!loading && rows.length > 0 && (
              <div className="tablewrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Réf.</th><th>Demandeur</th><th>Ville / zone</th>
                      <th className="num">Véhicules</th><th>Durée</th>
                      <th>Reçue le</th><th className="num">Devis</th><th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((q) => (
                      <tr key={q.id} className="is-clickable" onClick={() => setOpen(q)}>
                        <td className="table__ref">{q.reference}</td>
                        <td>
                          <span className="table__strong">{q.fullName}</span>
                          <span className="table__sub">{q.companyName || q.email}</span>
                        </td>
                        <td>
                          {q.city}
                          <span className="table__sub">{q.zone}</span>
                        </td>
                        <td className="num">{q.vehicleCount}</td>
                        <td className="table__muted">{q.duration || '—'}</td>
                        <td className="table__muted">{date(q.createdAt)}</td>
                        <td className="num">{q.quote?.total ? money(q.quote.total) : '—'}</td>
                        <td><Pill status={q.status} label={STATUS_LABELS[q.status]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {open && (
        <QuoteDialog
          request={open}
          onClose={() => setOpen(null)}
          onSaved={() => { setOpen(null); reload() }}
        />
      )}
    </>
  )
}

function QuoteDialog({ request, onClose, onSaved }) {
  const { data: full, loading } = useAsync(() => api.getQuoteRequest(request.id), [request.id])
  const [lines, setLines] = useState(null)
  const [status, setStatus] = useState(request.status)
  const [notes, setNotes] = useState(request.internalNotes || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const rows = lines ?? full?.quote?.lines ?? []
  const total = rows.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)

  const updateLine = (i, key, value) => {
    const next = rows.map((l, idx) => (idx === i ? { ...l, [key]: value } : l))
    setLines(next)
  }

  async function save(send) {
    setBusy(true)
    setError('')
    try {
      await api.updateQuoteRequest(request.id, {
        status,
        internalNotes: notes,
        quote: { lines: rows.map((l) => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })) },
      })
      if (send) await api.sendQuote(request.id)
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={`${request.reference} — ${request.fullName}`}
      wide
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>Fermer</button>
          <button type="button" className="dbtn dbtn--ghost" onClick={() => save(false)} disabled={busy}>
            Enregistrer
          </button>
          <button type="button" className="dbtn dbtn--accent" onClick={() => save(true)} disabled={busy || rows.length === 0}>
            {busy ? 'En cours…' : 'Envoyer le devis'}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>
      {loading && <Loading />}

      {full && (
        <>
          <div className="cols">
            <dl className="drows">
              <Row k="Entreprise" v={full.companyName || '—'} />
              <Row k="Téléphone" v={full.phone} />
              <Row k="E-mail" v={full.email} />
              <Row k="Ville / pays" v={`${full.city}, ${full.country}`} />
              <Row k="Zone d’exploitation" v={full.zone || '—'} />
            </dl>
            <dl className="drows">
              <Row k="Véhicules demandés" v={full.vehicleCount} />
              <Row k="Durée" v={full.duration || '—'} />
              <Row k="Début souhaité" v={full.startDate ? date(full.startDate) : '—'} />
              <Row k="Équipements" v={full.equipped || '—'} />
              <Row k="Livraison / formation" v={`${full.delivery || '—'} / ${full.training || '—'}`} />
            </dl>
          </div>

          {full.products?.length > 0 && (
            <p style={{ fontSize: '0.8125rem', margin: '10px 0' }}>
              <span className="panel__sub">Produits : </span>
              {full.products.join(', ')}
            </p>
          )}

          {full.message && (
            <div className="banner" style={{ marginTop: 12 }}>{full.message}</div>
          )}

          <p className="panel__sub" style={{ margin: '20px 0 8px' }}>Lignes du devis</p>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Désignation</th><th className="num" style={{ width: 90 }}>Qté</th>
                  <th className="num" style={{ width: 130 }}>P.U. (DH)</th>
                  <th className="num" style={{ width: 120 }}>Total</th><th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((l, i) => (
                  <tr key={i}>
                    <td>
                      <input className="dinput dinput--sm" style={{ width: '100%' }} value={l.label}
                        onChange={(e) => updateLine(i, 'label', e.target.value)} />
                    </td>
                    <td className="num">
                      <input className="dinput dinput--sm" type="number" style={{ width: 70 }} value={l.quantity}
                        onChange={(e) => updateLine(i, 'quantity', e.target.value)} />
                    </td>
                    <td className="num">
                      <input className="dinput dinput--sm" type="number" style={{ width: 110 }} value={l.unitPrice}
                        onChange={(e) => updateLine(i, 'unitPrice', e.target.value)} />
                    </td>
                    <td className="num table__strong">
                      {money((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}
                    </td>
                    <td className="num">
                      <button type="button" className="dbtn dbtn--ghost dbtn--sm"
                        onClick={() => setLines(rows.filter((_, idx) => idx !== i))}>×</button>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={3}>
                    <button type="button" className="dbtn dbtn--ghost dbtn--sm"
                      onClick={() => setLines([...rows, { label: '', quantity: 1, unitPrice: 0 }])}>
                      + Ajouter une ligne
                    </button>
                  </td>
                  <td className="num table__strong" style={{ fontSize: '0.9375rem' }}>{money(total)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          <div className="dgrid" style={{ marginTop: 18 }}>
            <Field
              label="Statut du dossier"
              name="status"
              value={status}
              onChange={(_, v) => setStatus(v)}
              options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Field label="Notes internes" name="notes" type="textarea" value={notes} onChange={(_, v) => setNotes(v)} />
          </div>

          {full.quote?.sentAt && (
            <p className="table__muted" style={{ fontSize: '0.75rem', marginTop: 12 }}>
              Devis envoyé le {dateTime(full.quote.sentAt)}
              {full.quote.respondedAt && ` — réponse le ${dateTime(full.quote.respondedAt)}`}
            </p>
          )}
        </>
      )}
    </Modal>
  )
}

function Inbox() {
  const { data, loading, error, reload } = useAsync(() => api.listMessages({}), [])

  return (
    <Panel title="Messages reçus depuis le site" sub={`${data?.length || 0}`} flush>
      {loading && <Loading />}
      {error && <Banner>{error}</Banner>}
      {!loading && !data?.length && <Empty>Aucun message.</Empty>}
      {!loading && data?.length > 0 && (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr><th>Reçu</th><th>Expéditeur</th><th>Sujet</th><th>Message</th><th /></tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id} style={{ opacity: m.handled ? 0.55 : 1 }}>
                  <td className="table__muted">{date(m.createdAt)}</td>
                  <td>
                    <span className="table__strong">{m.name}</span>
                    <span className="table__sub">{m.email}{m.phone ? ` · ${m.phone}` : ''}</span>
                  </td>
                  <td className="table__muted">{m.subject || '—'}</td>
                  <td style={{ maxWidth: 420 }}>{m.message}</td>
                  <td className="num">
                    <button
                      type="button"
                      className="dbtn dbtn--ghost dbtn--sm"
                      onClick={async () => { await api.markMessage(m.id, !m.handled); reload() }}
                    >
                      {m.handled ? 'Rouvrir' : 'Traité'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

function Row({ k, v }) {
  return <div className="drow"><span>{k}</span><span>{v}</span></div>
}
