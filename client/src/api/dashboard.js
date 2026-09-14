/** Dashboard API. Every call carries the bearer token. */

import { request, qs } from './http.js'

const get = (path) => request(path, { auth: true })
const post = (path, body) => request(path, { method: 'POST', body, auth: true })
const patch = (path, body) => request(path, { method: 'PATCH', body, auth: true })
const del = (path) => request(path, { method: 'DELETE', auth: true })

/* ----------------------------------------------------------------- auth -- */

export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password } })

export const me = () => get('/auth/me')
export const changePassword = (currentPassword, newPassword) =>
  post('/auth/change-password', { currentPassword, newPassword })

/* ------------------------------------------------------------ dashboard -- */

export const getSummary = () => get('/dashboard/summary')

/* -------------------------------------------------------------- planning -- */

export const getPlanning = (params) => get(`/planning${qs(params)}`)

/* ---------------------------------------------------------- reservations -- */

export const listReservations = (params) => get(`/reservations-admin${qs(params)}`)
export const getReservation = (id) => get(`/reservations-admin/${id}`)
export const createReservation = (body) => post('/reservations-admin', body)
export const updateReservation = (id, body) => patch(`/reservations-admin/${id}`, body)
export const confirmReservation = (id) => post(`/reservations-admin/${id}/confirm`)
export const attachClient = (id, clientId) =>
  post(`/reservations-admin/${id}/attach-client`, { clientId })
export const recordDeparture = (id, body) => post(`/reservations-admin/${id}/departure`, body)
export const recordReturn = (id, body) => post(`/reservations-admin/${id}/return`, body)
export const extendReservation = (id, endDate) =>
  post(`/reservations-admin/${id}/extend`, { endDate })
export const addPayment = (id, body) => post(`/reservations-admin/${id}/payments`, body)
export const returnDeposit = (id) => post(`/reservations-admin/${id}/return-deposit`)
export const cancelReservation = (id, reason) =>
  post(`/reservations-admin/${id}/cancel`, { reason })

/* ---------------------------------------------------------------- fleet -- */

export const listVehicles = (params) => get(`/vehicles-admin${qs(params)}`)
export const getVehicle = (id) => get(`/vehicles-admin/${id}`)
export const createVehicle = (body) => post('/vehicles-admin', body)
export const updateVehicle = (id, body) => patch(`/vehicles-admin/${id}`, body)
export const deleteVehicle = (id) => del(`/vehicles-admin/${id}`)

/* -------------------------------------------------------------- clients -- */

export const listClients = (params) => get(`/clients${qs(params)}`)
export const searchClients = (q) => get(`/clients/search${qs({ q })}`)
export const getClient = (id) => get(`/clients/${id}`)
export const createClient = (body) => post('/clients', body)
export const updateClient = (id, body) => patch(`/clients/${id}`, body)
export const addClientNote = (id, body) => post(`/clients/${id}/notes`, { body })

/* -------------------------------------------------------------- finance -- */

export const getFinanceOverview = (params) => get(`/finance/overview${qs(params)}`)
export const listRevenues = (params) => get(`/finance/revenues${qs(params)}`)
export const listCharges = (params) => get(`/finance/charges${qs(params)}`)
export const createCharge = (body) => post('/finance/charges', body)
export const deleteCharge = (id) => del(`/finance/charges/${id}`)

/* ---------------------------------------------------------- maintenance -- */

export const listMaintenance = (params) => get(`/maintenance${qs(params)}`)
export const createMaintenance = (body) => post('/maintenance', body)
export const completeMaintenance = (id, body) => post(`/maintenance/${id}/complete`, body)
export const deleteMaintenance = (id) => del(`/maintenance/${id}`)

/* --------------------------------------------------------------- quotes -- */

export const listQuoteRequests = (params) => get(`/quote-requests-admin${qs(params)}`)
export const getQuoteRequest = (id) => get(`/quote-requests-admin/${id}`)
export const updateQuoteRequest = (id, body) => patch(`/quote-requests-admin/${id}`, body)
export const sendQuote = (id) => post(`/quote-requests-admin/${id}/send`)
export const listMessages = (params) => get(`/quote-requests-admin/inbox/messages${qs(params)}`)
export const markMessage = (id, handled) =>
  patch(`/quote-requests-admin/inbox/messages/${id}`, { handled })

/* ------------------------------------------------------------- settings -- */

export const getSettings = () => get('/settings')
export const updateSettings = (body) => patch('/settings', body)
export const getVocabulary = () => get('/settings/vocabulary')
export const getAudit = (params) => get(`/settings/audit${qs(params)}`)

/* ---------------------------------------------------------------- users -- */

export const listUsers = () => get('/users')
export const createUser = (body) => post('/users', body)
export const updateUser = (id, body) => patch(`/users/${id}`, body)
export const deactivateUser = (id) => del(`/users/${id}`)
