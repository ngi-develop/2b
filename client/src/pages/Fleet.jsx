import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHead from '../components/PageHead.jsx'
import SearchBar from '../components/SearchBar.jsx'
import VehicleCard from '../components/VehicleCard.jsx'
import { Arrow } from '../components/Icons.jsx'
import { fetchVehicles } from '../api/client.js'
import { categories, transmissions, fuels } from '../data/vehicles.js'
import { shots } from '../data/images.js'
import { formatDate, formatDH } from '../lib/rental.js'

const SEAT_OPTIONS = ['2', '4', '5', '7']
const PRICE_MAX = 2800

export default function Fleet() {
  const [params, setParams] = useSearchParams()

  const start = params.get('start') || ''
  const end = params.get('end') || ''
  const place = params.get('place') || ''
  const cityFromPlace = useMemo(() => extractCity(place), [place])

  const [cats, setCats] = useState(() =>
    params.get('category') ? [params.get('category')] : []
  )
  const [transmission, setTransmission] = useState('')
  const [fuel, setFuel] = useState('')
  const [seats, setSeats] = useState('')
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX)
  const [sort, setSort] = useState('recommended')
  const [showFilters, setShowFilters] = useState(false)

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchVehicles({
      city: cityFromPlace,
      start,
      end,
      categories: cats,
      transmission,
      fuel,
      seats,
      maxPrice: maxPrice < PRICE_MAX ? maxPrice : undefined,
    }).then((res) => {
      if (alive) {
        setList(res)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [cityFromPlace, start, end, cats, transmission, fuel, seats, maxPrice])

  const sorted = useMemo(() => {
    const copy = list.slice()
    if (sort === 'price-asc') copy.sort((a, b) => a.pricePerDay - b.pricePerDay)
    if (sort === 'price-desc') copy.sort((a, b) => b.pricePerDay - a.pricePerDay)
    if (sort === 'seats') copy.sort((a, b) => b.seats - a.seats)
    // Recommended keeps available vehicles first — unavailable ones stay
    // visible at the end of the grid rather than disappearing.
    if (sort === 'recommended') copy.sort((a, b) => Number(b.available) - Number(a.available))
    return copy
  }, [list, sort])

  const availableCount = sorted.filter((v) => v.available).length

  function toggleCat(c) {
    setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
  }

  function resetAll() {
    setCats([])
    setTransmission('')
    setFuel('')
    setSeats('')
    setMaxPrice(PRICE_MAX)
  }

  const hasFilters =
    cats.length || transmission || fuel || seats || maxPrice < PRICE_MAX

  return (
    <>
      <PageHead
        eyebrow="Particuliers & touristes"
        title="Notre flotte, telle qu’elle est aujourd’hui."
        intro="Renseignez vos dates : la grille se met à jour et les véhicules déjà engagés apparaissent barrés plutôt que masqués. Les véhicules Car Wash professionnels ne figurent pas ici."
        media={shots.sClassStreet}
        crumbs={[{ label: 'Notre flotte' }]}
      />

      <section className="ink-block" style={{ paddingBottom: 'var(--s-1)' }}>
        <div className="shell">
          <SearchBar
            initial={{ place, start, end, category: cats[0] || '' }}
            onSubmit={(p) => {
              setParams(
                new URLSearchParams(
                  Object.fromEntries(Object.entries(p).filter(([, v]) => v))
                ),
                { replace: true }
              )
              if (p.category && !cats.includes(p.category)) setCats([p.category])
            }}
          />
        </div>
      </section>

      <section className="sec--2" style={{ paddingBottom: 'var(--s-4)' }}>
        <div className="shell">
          <div className="fleet-layout">
            {/* ---------------- filter rail ---------------- */}
            <aside>
              <button
                type="button"
                className="btn btn--ghost btn--sm frail-toggle"
                style={{ marginBottom: 18 }}
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
              >
                {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
              </button>

              <div className={`frail frail__panel${showFilters ? ' is-shown' : ''}`}>
                <div className="fgroup">
                  <p className="fgroup__title">Catégorie</p>
                  <div className="fopts">
                    {categories.map((c) => (
                      <button
                        type="button"
                        key={c}
                        className={`chip${cats.includes(c) ? ' is-on' : ''}`}
                        aria-pressed={cats.includes(c)}
                        onClick={() => toggleCat(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fgroup">
                  <p className="fgroup__title">Boîte de vitesses</p>
                  <div className="fopts">
                    {transmissions.map((t) => (
                      <button
                        type="button"
                        key={t}
                        className={`chip${transmission === t ? ' is-on' : ''}`}
                        aria-pressed={transmission === t}
                        onClick={() => setTransmission(transmission === t ? '' : t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fgroup">
                  <p className="fgroup__title">Motorisation</p>
                  <div className="fopts">
                    {fuels.map((f) => (
                      <button
                        type="button"
                        key={f}
                        className={`chip${fuel === f ? ' is-on' : ''}`}
                        aria-pressed={fuel === f}
                        onClick={() => setFuel(fuel === f ? '' : f)}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fgroup">
                  <p className="fgroup__title">Nombre de places (minimum)</p>
                  <div className="fopts">
                    {SEAT_OPTIONS.map((s) => (
                      <button
                        type="button"
                        key={s}
                        className={`chip${seats === s ? ' is-on' : ''}`}
                        aria-pressed={seats === s}
                        onClick={() => setSeats(seats === s ? '' : s)}
                      >
                        {s}+
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fgroup">
                  <p className="fgroup__title">Budget par jour</p>
                  <div className="range-row">
                    <span>Jusqu’à</span>
                    <strong>
                      {maxPrice >= PRICE_MAX ? 'Sans limite' : formatDH(maxPrice)}
                    </strong>
                  </div>
                  <label htmlFor="price-range" className="sr-only">
                    Budget maximum par jour
                  </label>
                  <input
                    id="price-range"
                    type="range"
                    min="250"
                    max={PRICE_MAX}
                    step="50"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                  />
                </div>

                {hasFilters ? (
                  <button
                    type="button"
                    className="textlink"
                    style={{ marginTop: 22, background: 'none', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', padding: '0 0 7px' }}
                    onClick={resetAll}
                  >
                    Réinitialiser les filtres
                  </button>
                ) : null}
              </div>
            </aside>

            {/* ---------------- results ---------------- */}
            <div>
              <div className="fleet-toolbar">
                <div className="fleet-count">
                  <strong>{loading ? '—' : String(availableCount).padStart(2, '0')}</strong>{' '}
                  véhicule{availableCount > 1 ? 's' : ''} disponible
                  {availableCount > 1 ? 's' : ''}
                  {start && end ? (
                    <span className="mono-note" style={{ display: 'block', marginTop: 6 }}>
                      Du {formatDate(start)} au {formatDate(end)}
                      {cityFromPlace ? ` — ${cityFromPlace}` : ''}
                    </span>
                  ) : (
                    <span className="mono-note" style={{ display: 'block', marginTop: 6 }}>
                      Renseignez vos dates pour filtrer sur la disponibilité réelle
                    </span>
                  )}
                </div>

                <label>
                  <span className="sr-only">Trier les résultats</span>
                  <select
                    className="sortsel"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="recommended">Tri : recommandé</option>
                    <option value="price-asc">Prix croissant</option>
                    <option value="price-desc">Prix décroissant</option>
                    <option value="seats">Nombre de places</option>
                  </select>
                </label>
              </div>

              {loading ? (
                <p className="mono-note">Chargement de la flotte…</p>
              ) : sorted.length === 0 ? (
                <div className="emptystate">
                  <h3 className="h3">Aucun véhicule ne correspond à ces critères.</h3>
                  <p className="body-muted">
                    Élargissez la fourchette de prix, retirez un filtre, ou
                    contactez-nous : nous pouvons faire venir un véhicule d’une
                    autre agence.
                  </p>
                  <button type="button" className="btn btn--ghost" onClick={resetAll}>
                    Réinitialiser les filtres <Arrow />
                  </button>
                </div>
              ) : (
                <div className="fleet-grid">
                  {sorted.map((v) => (
                    <VehicleCard key={v.id} vehicle={v} start={start} end={end} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

/** Pickup points are labelled strings; pull the city out to filter on it. */
function extractCity(place) {
  if (!place) return ''
  const known = ['Casablanca', 'Marrakech', 'Agadir', 'Tanger', 'Rabat', 'Fès', 'Ouarzazate', 'Essaouira']
  return known.find((c) => place.includes(c)) || ''
}
