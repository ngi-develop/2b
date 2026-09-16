import { useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import * as api from '../api/dashboard.js'
import { Banner, Field, Modal, useAsync } from './ui.jsx'
import { PhotoField, PhotoList } from './Uploader.jsx'

/**
 * Create or edit a vehicle.
 *
 * One form for both: `vehicle` absent means create. The field set mirrors the
 * zod schema on POST/PATCH /api/vehicles-admin, so anything the API accepts
 * can be set here and nothing else is sent.
 */

const EMPTY = {
  fleetType: 'tourisme',
  brand: '',
  model: '',
  version: '',
  category: 'Citadine',
  year: String(new Date().getFullYear()),
  plate: '',
  vin: '',
  transmission: 'Manuelle',
  fuel: 'Diesel',
  seats: 5,
  doors: 5,
  luggage: 2,
  ac: true,
  mileage: 0,
  status: 'disponible',
  statusReason: '',
  pricePerDay: '',
  kmIncluded: 200,
  extraKmPrice: 3,
  deposit: 8000,
  published: true,
  image: '',
  gallery: [],
  cities: [],
  blurb: '',
  highlights: '',
  notes: '',
  purchasePrice: '',
  monthlyPayment: '',
  durationMonths: '',
}

/** The document shape the API returns, flattened into form fields. */
function toForm(v) {
  if (!v) return { ...EMPTY }
  return {
    ...EMPTY,
    ...v,
    year: v.year ?? '',
    gallery: v.gallery || [],
    highlights: (v.highlights || []).join(', '),
    cities: v.cities || [],
    statusReason: v.statusReason || '',
    purchasePrice: v.financing?.purchasePrice ?? '',
    monthlyPayment: v.financing?.monthlyPayment ?? '',
    durationMonths: v.financing?.durationMonths ?? '',
  }
}

const list = (s) =>
  String(s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

/** Only send what the API's schema declares, coerced to the right types. */
function toPayload(f) {
  const financing = {}
  if (f.purchasePrice !== '') financing.purchasePrice = Number(f.purchasePrice)
  if (f.monthlyPayment !== '') financing.monthlyPayment = Number(f.monthlyPayment)
  if (f.durationMonths !== '') financing.durationMonths = Number(f.durationMonths)

  return {
    fleetType: f.fleetType,
    brand: f.brand.trim(),
    model: f.model.trim(),
    version: f.version?.trim() || undefined,
    category: f.category,
    year: f.year === '' ? undefined : Number(f.year),
    plate: f.plate.trim(),
    vin: f.vin?.trim() || undefined,
    transmission: f.transmission,
    fuel: f.fuel,
    seats: Number(f.seats),
    doors: Number(f.doors),
    luggage: Number(f.luggage),
    ac: Boolean(f.ac),
    mileage: Number(f.mileage || 0),
    status: f.status,
    statusReason: f.statusReason?.trim() || undefined,
    pricePerDay: Number(f.pricePerDay || 0),
    kmIncluded: Number(f.kmIncluded || 0),
    extraKmPrice: Number(f.extraKmPrice || 0),
    deposit: Number(f.deposit || 0),
    published: Boolean(f.published),
    image: f.image?.trim() || undefined,
    gallery: f.gallery,
    cities: f.cities,
    blurb: f.blurb?.trim() || undefined,
    highlights: list(f.highlights),
    notes: f.notes?.trim() || undefined,
    ...(Object.keys(financing).length ? { financing } : {}),
  }
}

/**
 * Files that were attached to the vehicle before this edit and are no longer
 * referenced after it. Swept only once the save has succeeded, so abandoning
 * the form leaves the live photos intact. Seeded Unsplash ids are not ours to
 * delete, hence the /uploads/ test.
 */
function orphanedUploads(before, after) {
  const kept = new Set([after.image, ...(after.gallery || [])].filter(Boolean))
  return [before?.image, ...(before?.gallery || [])]
    .filter((url) => url && url.startsWith('/uploads/') && !kept.has(url))
}

export default function VehicleForm({ vehicle, onClose, onSaved }) {
  const { vocabulary } = useAuth()
  const { data: settings } = useAsync(() => api.getSettings(), [])

  const [form, setForm] = useState(() => toForm(vehicle))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }))
  const toggleCity = (c) =>
    setForm((f) => ({
      ...f,
      cities: f.cities.includes(c) ? f.cities.filter((x) => x !== c) : [...f.cities, c],
    }))

  const editing = Boolean(vehicle)
  const isCarWash = form.fleetType === 'carwash'

  const categories = vocabulary?.categories || ['Citadine']
  const transmissions = vocabulary?.transmissions || ['Manuelle', 'Automatique']
  const fuels = vocabulary?.fuels || ['Diesel', 'Essence']
  const statuses = Object.entries(vocabulary?.vehicleStatus || { disponible: 'Disponible' })
  const cityList = settings?.lists?.cities || []

  async function save() {
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      const payload = toPayload(form)
      const saved = editing
        ? await api.updateVehicle(vehicle.id || vehicle._id, payload)
        : await api.createVehicle(payload)

      /* Best-effort clean-up. A failure here leaves an unreferenced file on
         disk, which is harmless; failing the save over it would not be. */
      for (const url of orphanedUploads(vehicle, payload)) {
        api.deleteUpload(url).catch(() => {})
      }

      onSaved(saved)
    } catch (err) {
      setError(err.message)
      if (err.details) setFieldErrors(err.details)
    } finally {
      setBusy(false)
    }
  }

  const canSave = form.brand.trim() && form.model.trim() && form.plate.trim() && !busy

  return (
    <Modal
      wide
      title={editing ? `Modifier — ${vehicle.brand} ${vehicle.model}` : 'Ajouter un véhicule'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="dbtn dbtn--ghost" onClick={onClose}>
            Annuler
          </button>
          {!canSave && !busy && (
            <span className="panel__sub" style={{ alignSelf: 'center' }}>
              Marque, modèle et immatriculation sont obligatoires
            </span>
          )}
          <button type="button" className="dbtn dbtn--accent" onClick={save} disabled={!canSave}>
            {busy ? 'Enregistrement…' : editing ? 'Enregistrer' : 'Créer le véhicule'}
          </button>
        </>
      }
    >
      <Banner>{error}</Banner>

      {/* ---- identity ---- */}
      <p className="panel__sub" style={{ marginBottom: 10 }}>Identité</p>
      <div className="dgrid">
        <Field
          label="Type de flotte"
          name="fleetType"
          value={form.fleetType}
          onChange={set}
          options={[
            { value: 'tourisme', label: 'Tourisme — catalogue public' },
            { value: 'carwash', label: 'Car Wash — jamais publié' },
          ]}
        />
        <Field
          label="Catégorie"
          name="category"
          value={form.category}
          onChange={set}
          options={categories}
          error={fieldErrors.category}
        />
        <Field label="Marque" name="brand" value={form.brand} onChange={set} error={fieldErrors.brand} required />
        <Field label="Modèle" name="model" value={form.model} onChange={set} error={fieldErrors.model} required />
        <Field label="Version" name="version" value={form.version} onChange={set} placeholder="Prestige 1.5 Blue dCi" />
        <Field label="Année" name="year" type="number" value={form.year} onChange={set} />
        <Field label="Immatriculation" name="plate" value={form.plate} onChange={set} error={fieldErrors.plate} required placeholder="12345-A-6" />
        <Field label="N° de châssis (VIN)" name="vin" value={form.vin} onChange={set} />
      </div>

      {/* ---- specs ---- */}
      <p className="panel__sub" style={{ margin: '22px 0 10px' }}>Caractéristiques</p>
      <div className="dgrid dgrid--3">
        <Field label="Boîte de vitesses" name="transmission" value={form.transmission} onChange={set} options={transmissions} />
        <Field label="Motorisation" name="fuel" value={form.fuel} onChange={set} options={fuels} />
        <Field label="Kilométrage" name="mileage" type="number" value={form.mileage} onChange={set} />
        <Field label="Places" name="seats" type="number" min="1" max="9" value={form.seats} onChange={set} />
        <Field label="Portes" name="doors" type="number" min="2" max="6" value={form.doors} onChange={set} />
        <Field label="Bagages" name="luggage" type="number" min="0" max="9" value={form.luggage} onChange={set} />
      </div>
      <label className="checkopt" style={{ marginTop: 12 }}>
        <input type="checkbox" checked={Boolean(form.ac)} onChange={() => set('ac', !form.ac)} />
        Climatisation
      </label>

      {/* ---- commercial terms ---- */}
      <p className="panel__sub" style={{ margin: '22px 0 10px' }}>
        Tarification {isCarWash && '— sans objet pour un véhicule Car Wash'}
      </p>
      {isCarWash && (
        <div className="banner">
          Les véhicules Car Wash ne sont jamais tarifés publiquement : chaque demande donne
          lieu à un devis. Ces champs peuvent rester à zéro.
        </div>
      )}
      <div className="dgrid dgrid--3">
        <Field label="Prix / jour (DH)" name="pricePerDay" type="number" value={form.pricePerDay} onChange={set} error={fieldErrors.pricePerDay} required />
        <Field label="Km inclus / jour" name="kmIncluded" type="number" value={form.kmIncluded} onChange={set} />
        <Field label="Prix du km supp. (DH)" name="extraKmPrice" type="number" step="0.5" value={form.extraKmPrice} onChange={set} />
        <Field label="Caution (DH)" name="deposit" type="number" value={form.deposit} onChange={set} />
        <Field
          label="Statut"
          name="status"
          value={form.status}
          onChange={set}
          options={statuses.map(([value, label]) => ({ value, label }))}
        />
        <Field label="Motif (si immobilisé)" name="statusReason" value={form.statusReason} onChange={set} />
      </div>

      {/* ---- publication ---- */}
      <p className="panel__sub" style={{ margin: '22px 0 10px' }}>Publication</p>
      <label className="checkopt">
        <input
          type="checkbox"
          checked={Boolean(form.published) && !isCarWash}
          disabled={isCarWash}
          onChange={() => set('published', !form.published)}
        />
        Visible dans le catalogue public
      </label>
      {isCarWash && (
        <p className="dfield__err" style={{ marginTop: 8 }}>
          Un véhicule Car Wash n’apparaît jamais sur le site public, quel que soit ce réglage.
        </p>
      )}

      {cityList.length > 0 && (
        <>
          <p className="panel__sub" style={{ margin: '18px 0 8px' }}>Villes de mise à disposition</p>
          <div className="checkrow">
            {cityList.map((c) => (
              <label className="checkopt" key={c}>
                <input type="checkbox" checked={form.cities.includes(c)} onChange={() => toggleCity(c)} />
                {c}
              </label>
            ))}
          </div>
        </>
      )}

      {/* ---- content ---- */}
      <p className="panel__sub" style={{ margin: '22px 0 10px' }}>Photos et description</p>
      <div className="dgrid dgrid--1">
        <PhotoField
          label="Photo principale"
          value={form.image}
          onChange={(url) => set('image', url)}
          hint="JPEG, PNG, WebP ou AVIF. Format paysage recommandé."
        />
        <PhotoList
          label="Galerie"
          value={form.gallery}
          onChange={(urls) => set('gallery', urls)}
          hint="Intérieur, coffre, trois-quarts arrière."
        />
        <Field label="Accroche" name="blurb" type="textarea" value={form.blurb} onChange={set} />
        <Field
          label="Points forts (séparés par des virgules)"
          name="highlights"
          value={form.highlights}
          onChange={set}
          placeholder="7 places, 4x4 permanent, Kit désert sur demande"
        />
        <Field label="Notes internes" name="notes" type="textarea" value={form.notes} onChange={set} />
      </div>

      {/* ---- financing ---- */}
      <p className="panel__sub" style={{ margin: '22px 0 10px' }}>Financement</p>
      <div className="dgrid dgrid--3">
        <Field label="Prix d’achat (DH)" name="purchasePrice" type="number" value={form.purchasePrice} onChange={set} />
        <Field label="Mensualité (DH)" name="monthlyPayment" type="number" value={form.monthlyPayment} onChange={set} />
        <Field label="Durée (mois)" name="durationMonths" type="number" value={form.durationMonths} onChange={set} />
      </div>
      <p className="dfield__err" style={{ marginTop: 8, color: 'var(--ink-45)' }}>
        Laissez la mensualité vide ou à zéro pour un véhicule acheté comptant : aucune traite
        ne sera générée dans les échéances.
      </p>
    </Modal>
  )
}
