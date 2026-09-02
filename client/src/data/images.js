/**
 * Photography.
 *
 * All ids are Unsplash photo ids that were checked to resolve before being
 * committed here. `img()` builds a sized, cropped delivery URL so cards and
 * hero frames never download a 3000px original.
 *
 * When the Express/Mongo backend lands, vehicle photos come from the fleet
 * documents instead and only the editorial shots below stay hard-coded.
 */

const BASE = 'https://images.unsplash.com/'

export function img(id, w = 1200, h) {
  const params = new URLSearchParams({
    auto: 'format',
    fit: 'crop',
    w: String(w),
    q: '78',
  })
  if (h) params.set('h', String(h))
  return `${BASE}${id}?${params.toString()}`
}

/* Editorial / brand photography (not tied to a specific vehicle record) */
export const shots = {
  heroDefender: 'photo-1612563893490-d86ed296e5e6',
  sClassStreet: 'photo-1610099610040-ab19f3a5ec35',
  forestLights: 'photo-1541348263662-e068662d82af',
  cabinLeather: 'photo-1547731269-e4073e054f12',
  cabinAmg: 'photo-1625690180114-5530b1304127',
  cabinCarbon: 'photo-1629280878139-038999084e23',
  cabinWheel: 'photo-1471174617910-3e9c04f58ff5',
  cabinConsole: 'photo-1549064233-945d7063292f',
  cabinDash: 'photo-1533630217389-3a5e4dff5683',

  /* Morocco — delivery zones */
  roadGate: 'photo-1630107531564-8aef06219c86',
  desertRoad: 'photo-1729442045650-8753bd2e6d93',
  atlasTruck: 'photo-1627895455370-41133db7fd9c',
  roadPov: 'photo-1675793199343-82538d6a5a03',
  desertPickup: 'photo-1533473359331-0135ef1b58bf',
  sunsetRoad: 'photo-1641687157261-f6434f15f6de',

  /* Car Wash — professional track */
  washFoamHand: 'photo-1607860108855-64acf2078ed9',
  washFoamCar: 'photo-1633014041037-f5446fb4ce99',
  washWheel: 'photo-1608506375591-b90e1f955e4b',
  washTunnel: 'photo-1605164598708-25701594473e',
  washWhiteCar: 'photo-1575844611398-2a68400b437c',
  vanMountains: 'photo-1549194898-60fd030ecc0f',
  vanNight: 'photo-1671281367997-29a7e3df7d99',
  detailInterior: 'photo-1608259243654-70c070e0f6ed',
}
