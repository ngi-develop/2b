import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pickupPoints } from '../data/site.js'
import { categories } from '../data/vocabulary.js'
import { addDays, today } from '../lib/rental.js'
import { Search } from './Icons.jsx'

/**
 * Availability search. Submitting routes to /flotte with the criteria in the
 * query string, so a search is shareable and survives a reload.
 */
export default function SearchBar({ initial = {}, onSubmit, onPaper = false }) {
  const navigate = useNavigate()
  const [place, setPlace] = useState(initial.place || pickupPoints[0])
  const [start, setStart] = useState(initial.start || addDays(today(), 1))
  const [end, setEnd] = useState(initial.end || addDays(today(), 5))
  const [category, setCategory] = useState(initial.category || '')

  function handleSubmit(e) {
    e.preventDefault()
    // Keep the window coherent if the visitor picks a return before departure.
    const safeEnd = end <= start ? addDays(start, 1) : end
    const params = { place, start, end: safeEnd, category }
    if (onSubmit) onSubmit(params)
    else {
      const qs = new URLSearchParams(
        Object.fromEntries(Object.entries(params).filter(([, v]) => v))
      )
      navigate(`/flotte?${qs.toString()}`)
    }
  }

  return (
    <form
      className={`searchbar${onPaper ? ' searchbar--onPaper' : ''}`}
      onSubmit={handleSubmit}
      aria-label="Rechercher un véhicule disponible"
    >
      <div className="sfield">
        <label htmlFor="sb-place">Lieu de prise en charge</label>
        <select id="sb-place" value={place} onChange={(e) => setPlace(e.target.value)}>
          {pickupPoints.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="sfield">
        <label htmlFor="sb-start">Date de départ</label>
        <input
          id="sb-start"
          type="date"
          value={start}
          min={today()}
          onChange={(e) => setStart(e.target.value)}
        />
      </div>

      <div className="sfield">
        <label htmlFor="sb-end">Date de restitution</label>
        <input
          id="sb-end"
          type="date"
          value={end}
          min={addDays(start, 1)}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>

      <div className="sfield">
        <label htmlFor="sb-cat">Catégorie</label>
        <select id="sb-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="searchbar__submit">
        <Search />
        Voir les véhicules
      </button>
    </form>
  )
}
