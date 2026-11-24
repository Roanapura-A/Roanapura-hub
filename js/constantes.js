// Listes fixes de l'appli. Une valeur ajoutée ici doit aussi l'être dans database.rules.json.

export const STATUTS_CLIENT = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'rdv', label: 'RDV' },
  { id: 'devis', label: 'Devis' },
  { id: 'signe', label: 'Signé' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'livre', label: 'Livré' },
  { id: 'facture', label: 'Facturé' },
  { id: 'paye', label: 'Payé' },
];

export const TYPES_CLIENT = [
  { id: 'client', label: 'Client' },
  { id: 'interne', label: 'Interne' },
];

export const STATUTS_TACHE = [
  { id: 'a_faire', label: 'À faire' },
  { id: 'en_cours', label: 'En cours' },
  { id: 'fait', label: 'Fait' },
];

export const QUADRANTS = [
  { id: 'Q1', label: 'Urgent et important' },
  { id: 'Q2', label: 'Important, pas urgent' },
  { id: 'Q3', label: 'Urgent, pas important' },
  { id: 'Q4', label: "Ni l'un ni l'autre" },
];

export const TYPES_NOTE = [
  { id: 'call', label: 'Call' },
  { id: 'rdv', label: 'RDV' },
  { id: 'libre', label: 'Note' },
];

export const SOURCES_INBOX = [
  { id: 'texte', label: 'Texte' },
  { id: 'vocal', label: 'Vocal' },
];

export const STATUTS_PRESTATAIRE = [
  { id: 'en_cours', label: 'En cours' },
  { id: 'arrete', label: 'Arrêté' },
];

export const LIMITE_LISTE_DU_JOUR = 5;

export const FUSEAU = 'Europe/Paris';

export const ECRANS = [
  { id: 'aujourdhui', label: "Aujourd'hui", icone: 'accueil' },
  { id: 'taches', label: 'Tâches', icone: 'liste' },
  { id: 'clients', label: 'Clients', icone: 'personnes' },
  { id: 'prestataires', label: 'Prestataires', icone: 'mallette' },
];

export const ids = (liste) => liste.map((x) => x.id);
export const libelle = (liste, id) => (liste.find((x) => x.id === id) || {}).label || id;
