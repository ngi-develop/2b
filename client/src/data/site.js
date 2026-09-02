/** Static site content: navigation, zones, FAQ, testimonials, company facts. */

export const company = {
  name: '2B Location',
  legal: '2B LOCATION SARL',
  tagline: 'Location de véhicules — Maroc',
  phone: '+212 5 22 00 00 00',
  whatsapp: '+212 6 61 00 00 00',
  email: 'contact@2blocation.ma',
  address: '112, boulevard Zerktouni — Casablanca 20250, Maroc',
  hours: 'Lundi — samedi, 08h00 à 20h00. Livraison aéroport 24h/24.',
  founded: 2016,
}

export const navLinks = [
  { to: '/', label: 'Accueil' },
  { to: '/flotte', label: 'Notre flotte' },
  { to: '/professionnel', label: 'Véhicules Professionnel' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/zones', label: 'Nos zones de livraison' },
  { to: '/faq', label: 'FAQ' },
  { to: '/contact', label: 'Contact' },
]

export const cities = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Agadir',
  'Tanger',
  'Fès',
  'Ouarzazate',
  'Essaouira',
]

export const pickupPoints = [
  'Aéroport Mohammed V (CMN)',
  'Aéroport Marrakech-Ménara (RAK)',
  'Aéroport Agadir Al Massira (AGA)',
  'Aéroport Tanger Ibn Battouta (TNG)',
  'Gare Casa-Voyageurs',
  'Agence Casablanca — Zerktouni',
  'Agence Marrakech — Guéliz',
  'Hôtel ou riad (adresse libre)',
]

export const zones = [
  {
    city: 'Casablanca',
    region: 'Casablanca-Settat',
    note: 'Agence principale, aéroport Mohammed V, gare Casa-Voyageurs',
    delay: 'Sous 2 h',
    fee: 'Livraison offerte',
  },
  {
    city: 'Rabat',
    region: 'Rabat-Salé-Kénitra',
    note: 'Agdal, Hay Riad, gare Rabat-Ville',
    delay: 'Sous 3 h',
    fee: 'Livraison offerte',
  },
  {
    city: 'Marrakech',
    region: 'Marrakech-Safi',
    note: 'Guéliz, Hivernage, riads médina, aéroport Ménara',
    delay: 'Sous 2 h',
    fee: 'Livraison offerte',
  },
  {
    city: 'Agadir',
    region: 'Souss-Massa',
    note: 'Aéroport Al Massira, front de mer, Taghazout',
    delay: 'Sous 4 h',
    fee: '150 DH',
  },
  {
    city: 'Tanger',
    region: 'Tanger-Tétouan-Al Hoceïma',
    note: 'Port Tanger Ville, aéroport Ibn Battouta, Malabata',
    delay: 'Sous 4 h',
    fee: '150 DH',
  },
  {
    city: 'Fès',
    region: 'Fès-Meknès',
    note: 'Ville nouvelle, aéroport Saïss, accès médina',
    delay: 'Sous 5 h',
    fee: '200 DH',
  },
  {
    city: 'Ouarzazate',
    region: 'Drâa-Tafilalet',
    note: 'Départs désert, Dadès, Merzouga — 4x4 uniquement',
    delay: 'Sur rendez-vous',
    fee: '350 DH',
  },
  {
    city: 'Essaouira',
    region: 'Marrakech-Safi',
    note: 'Médina, port, liaison depuis Marrakech',
    delay: 'Sous 5 h',
    fee: '250 DH',
  },
]

export const guarantees = [
  {
    n: '01',
    title: 'Véhicules révisés avant chaque départ',
    body: "Contrôle en 42 points, pneus, freins et niveaux vérifiés, état des lieux photographié et contresigné au départ comme au retour.",
  },
  {
    n: '02',
    title: 'Assistance 24h/24 partout au Maroc',
    body: "Une panne, une crevaison dans le Haut Atlas, un incident à 300 km de l'agence : un numéro unique, un véhicule de remplacement dépêché.",
  },
  {
    n: '03',
    title: 'Tarif annoncé, tarif facturé',
    body: "Kilométrage inclus, franchise et caution écrits noir sur blanc avant la réservation. Aucun supplément découvert au comptoir.",
  },
  {
    n: '04',
    title: 'Livraison où vous êtes',
    body: "Aéroport, hôtel, riad, gare ou domicile. Le véhicule vous attend à l'heure convenue, plein fait et papiers en règle.",
  },
]

export const proAdvantages = [
  {
    n: '01',
    title: 'Véhicule prêt à produire',
    body: "Cuve, groupe haute pression, enrouleur, onduleur et rangements. Le véhicule sort de notre atelier opérationnel, pas à équiper.",
  },
  {
    n: '02',
    title: 'Aucun capital immobilisé',
    body: "Pas d'achat, pas de crédit, pas de revente. Un loyer mensuel, et la flotte s'ajuste à votre carnet de commandes.",
  },
  {
    n: '03',
    title: 'Entretien et pannes à notre charge',
    body: "Révisions, consommables du groupe de lavage, immobilisation : nous remplaçons le véhicule pour que votre activité continue.",
  },
  {
    n: '04',
    title: 'Formation et lancement',
    body: "Prise en main du matériel, dosage des produits, protocole de lavage sans eau. Une journée sur site avec vos opérateurs.",
  },
]

export const proSteps = [
  {
    n: '1',
    title: 'Vous décrivez le besoin',
    body: "Nombre de véhicules, durée, zone d'exploitation, équipements et produits souhaités.",
  },
  {
    n: '2',
    title: 'Nous analysons le dossier',
    body: "Notre équipe étudie la faisabilité, la disponibilité du parc et les contraintes logistiques de votre zone.",
  },
  {
    n: '3',
    title: 'Vous recevez un devis chiffré',
    body: 'Un devis personnalisé, détaillé ligne par ligne, transmis par e-mail sous 48 heures ouvrées.',
  },
  {
    n: '4',
    title: 'Vous acceptez ou ajustez',
    body: 'Vous validez le devis, ou vous nous demandez de le réviser. La mise à disposition suit sous 7 à 15 jours.',
  },
]

export const bookingSteps = [
  {
    n: '1',
    title: 'Dates et lieu',
    body: "Choisissez vos dates et le lieu de prise en charge. Seuls les véhicules réellement libres sur la période s'affichent.",
  },
  {
    n: '2',
    title: 'Véhicule et options',
    body: 'Comparez les fiches, ajoutez conducteur additionnel, siège enfant, GPS ou rachat de franchise.',
  },
  {
    n: '3',
    title: 'Demande envoyée',
    body: "Votre demande part directement dans notre tableau de bord. Elle n'est pas encore une réservation ferme.",
  },
  {
    n: '4',
    title: 'Validation par nos équipes',
    body: "Nous confirmons la disponibilité et vous recevez la confirmation définitive avec le contrat.",
  },
]

export const testimonials = [
  {
    quote:
      "Le Duster nous attendait à Ménara à 23h40, plein fait et papiers prêts. Dix jours dans l'Atlas sans une seule mauvaise surprise.",
    author: 'Claire Mercier',
    role: 'Touriste — Lyon, France',
  },
  {
    quote:
      "Je rentre chaque été et je loue chez eux depuis 2019. Le prix annoncé est celui que je paie, à zéro dirham près.",
    author: 'Youssef Bennani',
    role: 'MRE — Bruxelles, Belgique',
  },
  {
    quote:
      "Quatre véhicules Car Wash sur Casablanca depuis dix-huit mois. Un véhicule en panne a été remplacé le lendemain matin.",
    author: 'Reda El Amrani',
    role: 'Gérant — Shine Mobile Services',
  },
  {
    quote:
      "Nous immobilisions du capital dans nos propres camionnettes. Passer en location a libéré la trésorerie sans réduire la couverture terrain.",
    author: 'Salma Idrissi',
    role: 'Directrice des opérations — CleanTrack',
  },
]

export const faq = [
  {
    q: 'Ma réservation est-elle confirmée dès que je valide le formulaire ?',
    a: "Non. Le formulaire envoie une demande de réservation, pas une réservation ferme. Elle arrive dans notre tableau de bord, un conseiller vérifie la disponibilité réelle du véhicule et vous adresse la confirmation définitive, généralement en moins de deux heures ouvrées.",
    cat: 'Réservation',
  },
  {
    q: 'Quels documents dois-je présenter à la prise en charge ?',
    a: "Un permis de conduire valide depuis au moins deux ans, une pièce d'identité ou un passeport, et la carte bancaire au nom du conducteur principal pour la caution. Pour les permis délivrés hors alphabet latin, un permis international est demandé.",
    cat: 'Conditions',
  },
  {
    q: 'Comment fonctionne la caution ?',
    a: "Le montant figure sur chaque fiche véhicule, de 5 000 à 50 000 DH selon la catégorie. Elle est pré-autorisée sur votre carte au départ, jamais débitée, et libérée sous 7 jours ouvrés après le retour si l'état des lieux ne relève rien.",
    cat: 'Paiement',
  },
  {
    q: 'Que se passe-t-il si je dépasse le kilométrage inclus ?',
    a: "Chaque location inclut un forfait journalier — 200 km par jour sur la plupart des véhicules. Au-delà, le kilomètre supplémentaire est facturé au tarif indiqué sur la fiche, entre 2,50 et 12 DH. Le calcul se fait au retour, sur relevé du compteur.",
    cat: 'Conditions',
  },
  {
    q: 'Puis-je être livré à l’aéroport ou à mon hôtel ?',
    a: "Oui. La livraison est offerte à Casablanca, Rabat et Marrakech, y compris à l'aéroport et de nuit. Elle est facturée de 150 à 350 DH sur les autres villes. Indiquez simplement l'adresse et l'horaire dans votre demande.",
    cat: 'Livraison',
  },
  {
    q: 'Puis-je sortir du territoire marocain avec le véhicule ?',
    a: "Uniquement avec une autorisation écrite préparée par nos soins, à demander au moins 72 heures avant le départ. Elle s'ajoute au contrat et fait l'objet d'un supplément. Sans ce document, le passage en douane sera refusé.",
    cat: 'Conditions',
  },
  {
    q: 'Comment sont fixés les tarifs des véhicules Car Wash professionnels ?',
    a: "Ils ne sont pas publiés, parce qu'ils dépendent du nombre de véhicules, de la durée, de la zone d'exploitation, des équipements et produits inclus, et des besoins de livraison, de formation ou d'assistance. Chaque demande donne lieu à un devis chiffré individuellement.",
    cat: 'Professionnel',
  },
  {
    q: 'Quel délai pour recevoir un devis professionnel ?',
    a: 'Sous 48 heures ouvrées après réception du formulaire. Si vous joignez un cahier des charges, comptez jusqu’à 72 heures pour une étude complète.',
    cat: 'Professionnel',
  },
  {
    q: 'Puis-je annuler ou modifier ma réservation ?',
    a: "La modification est gratuite jusqu'à 48 heures avant le départ, sous réserve de disponibilité. L'annulation est sans frais jusqu'à 72 heures avant ; en deçà, une indemnité correspondant à une journée de location est retenue.",
    cat: 'Réservation',
  },
  {
    q: 'Le véhicule est-il assuré ?',
    a: "Tous nos véhicules sont assurés tous risques avec franchise. Le montant de la franchise est indiqué au contrat et peut être ramené à zéro via l'option rachat total, à 120 DH par jour.",
    cat: 'Conditions',
  },
]

export const aboutStats = [
  { v: '62', unit: '', k: 'Véhicules en parc' },
  { v: '8', unit: '', k: 'Villes desservies' },
  { v: '2016', unit: '', k: 'Année de création' },
  { v: '4 300', unit: '+', k: 'Locations conclues' },
]
