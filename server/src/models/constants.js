/** Vocabulary shared by the models, the API and the dashboard.
 *  Values are stored as slugs; labels are what the dashboard renders. */

export const FLEET_TYPES = ['tourisme', 'carwash']

export const VEHICLE_STATUS = [
  'disponible',
  'reserve',
  'loue',
  'maintenance',
  'immobilise',
  'bloque',
]

export const VEHICLE_STATUS_LABELS = {
  disponible: 'Disponible',
  reserve: 'Réservé',
  loue: 'Loué',
  maintenance: 'Maintenance',
  immobilise: 'Immobilisé',
  bloque: 'Bloqué',
}

export const CATEGORIES = [
  'Citadine',
  'Compacte',
  'Berline',
  'SUV',
  '4x4',
  'Familiale',
  'Premium',
  'Utilitaire',
]

export const TRANSMISSIONS = ['Automatique', 'Manuelle']
export const FUELS = ['Diesel', 'Essence', 'Hybride', 'Électrique']

export const CLIENT_STATUS = ['nouveau', 'bon', 'vip', 'a_surveiller', 'blackliste', 'entreprise']

export const CLIENT_STATUS_LABELS = {
  nouveau: 'Nouveau client',
  bon: 'Bon client',
  vip: 'VIP',
  a_surveiller: 'À surveiller',
  blackliste: 'Blacklisté',
  entreprise: 'Entreprise',
}

/** Statuses that require a written reason before they can be saved. */
export const CLIENT_STATUS_NEEDING_REASON = ['a_surveiller', 'blackliste']

export const RESERVATION_STATUS = ['demande', 'confirmee', 'en_cours', 'terminee', 'annulee']

export const RESERVATION_STATUS_LABELS = {
  demande: 'Demande',
  confirmee: 'Confirmée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  annulee: 'Annulée',
}

/** The four visible stages of a confirmed rental file. */
export const RESERVATION_STAGES = ['reservation', 'depart', 'en_cours', 'retour']

/** Statuses that occupy a vehicle on the planning and block an overlap. */
export const BLOCKING_STATUSES = ['confirmee', 'en_cours']

export const PAYMENT_METHODS = ['especes', 'carte', 'virement', 'cheque', 'autre']

export const PAYMENT_METHOD_LABELS = {
  especes: 'Espèces',
  carte: 'Carte',
  virement: 'Virement',
  cheque: 'Chèque',
  autre: 'Autre',
}

export const CHARGE_CATEGORIES = [
  'traite',
  'assurance',
  'entretien',
  'reparation',
  'pneus',
  'carburant',
  'lavage',
  'parking',
  'gps',
  'amendes',
  'salaires',
  'loyer',
  'marketing',
  'frais_bancaires',
  'autres',
]

export const CHARGE_CATEGORY_LABELS = {
  traite: 'Traite / crédit',
  assurance: 'Assurance',
  entretien: 'Entretien',
  reparation: 'Réparation',
  pneus: 'Pneus',
  carburant: 'Carburant',
  lavage: 'Lavage',
  parking: 'Parking',
  gps: 'GPS',
  amendes: 'Amendes',
  salaires: 'Salaires',
  loyer: 'Loyer',
  marketing: 'Marketing',
  frais_bancaires: 'Frais bancaires',
  autres: 'Autres',
}

export const MAINTENANCE_TYPES = [
  'entretien',
  'vidange',
  'pneus',
  'reparation',
  'assurance',
  'visite_technique',
  'document',
  'traite',
]

export const MAINTENANCE_TYPE_LABELS = {
  entretien: 'Entretien',
  vidange: 'Vidange',
  pneus: 'Pneus',
  reparation: 'Réparation',
  assurance: 'Assurance',
  visite_technique: 'Visite technique',
  document: 'Document',
  traite: 'Traite',
}

export const MAINTENANCE_STATUS = ['a_prevoir', 'planifiee', 'urgent', 'faite', 'en_retard']

export const MAINTENANCE_STATUS_LABELS = {
  a_prevoir: 'À prévoir',
  planifiee: 'Planifiée',
  urgent: 'Urgent',
  faite: 'Faite',
  en_retard: 'En retard',
}

export const QUOTE_STATUS = ['nouveau', 'en_analyse', 'devis_envoye', 'accepte', 'refuse']

export const QUOTE_STATUS_LABELS = {
  nouveau: 'Nouveau',
  en_analyse: 'En analyse',
  devis_envoye: 'Devis envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
}

export const ROLES = ['admin', 'manager', 'agent']

export const ROLE_LABELS = {
  admin: 'Administrateur',
  manager: 'Responsable',
  agent: 'Agent',
}
