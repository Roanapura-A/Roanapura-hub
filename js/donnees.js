// SEULE couche qui touche à firebase.database(). Les écrans passent par ici.
// Toutes les données V2 vivent sous v2/users/{uid}/. Écritures ciblées uniquement (jamais de set sur une collection).

import { firebaseConfig, RACINE_V2 } from './config.js?v=9';
import { STATUTS_CLIENT, TYPES_CLIENT, STATUTS_TACHE, QUADRANTS, TYPES_NOTE, SOURCES_INBOX, STATUTS_PRESTATAIRE, ids } from './constantes.js?v=9';

/* global firebase */
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const HORODATAGE = firebase.database.ServerValue.TIMESTAMP;

const COLLECTIONS = ['clients', 'taches', 'notes', 'inbox', 'prestataires'];

let uidDonnees = null; // l'utilisateur dont on lit/écrit les données (soi-même par défaut)
let auteur = 'antoine'; // signature des notes écrites depuis l'appli

export function definirUtilisateur(uid, signature) {
  uidDonnees = uid;
  if (signature) auteur = signature;
}

export function auteurCourant() {
  return auteur;
}

function chemin(...morceaux) {
  if (!uidDonnees) throw new ErreurDonnees('Aucun utilisateur connecté.');
  return [RACINE_V2, uidDonnees, ...morceaux].join('/');
}

export class ErreurDonnees extends Error {}

// ---------------------------------------------------------------- Accès

// Entrée de la liste d'accès pour cet utilisateur, ou null s'il n'y figure pas.
export async function lireAcces(uid) {
  const snap = await db.ref(`meta/whitelist/${uid}`).once('value');
  return snap.val();
}

// Appelle callback(true|false) à chaque changement de connexion au serveur.
export function ecouterConnexionReseau(callback) {
  const ref = db.ref('.info/connected');
  let premier = true;
  const h = (snap) => {
    const connecte = snap.val() === true;
    if (premier && !connecte) { premier = false; return; } // faux "hors ligne" au démarrage
    premier = false;
    callback(connecte);
  };
  ref.on('value', h);
  return () => ref.off('value', h);
}

// ---------------------------------------------------------------- Validation

const texte = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const dans = (liste, v) => ids(liste).includes(v);
const nombreOuVide = (v) => v === null || v === undefined || (typeof v === 'number' && Number.isFinite(v));

// Règles par champ. `obligatoires` ne s'applique qu'à la création.
const SCHEMAS = {
  clients: {
    obligatoires: ['nom', 'type', 'statut', 'prochaineAction'],
    champs: {
      nom: (v) => texte(v, 200) || 'Le nom est obligatoire (200 caractères max).',
      type: (v) => dans(TYPES_CLIENT, v) || 'Type inconnu.',
      statut: (v) => dans(STATUTS_CLIENT, v) || 'Statut inconnu.',
      prochaineAction: (v) => (v && texte(v.texte, 300) && typeof v.date === 'number') || 'La prochaine action et sa date sont obligatoires.',
      contact: (v) => v === null || typeof v === 'object' || 'Contact invalide.',
      montant: (v) => (v === null || (typeof v === 'number' && v >= 0)) || 'Montant invalide.',
      liens: (v) => v === null || (typeof v === 'object' && Object.values(v).every((x) => x === null || (typeof x === 'string' && /^https?:\/\//i.test(x)))) || 'Les liens doivent commencer par https://',
      archive: (v) => typeof v === 'boolean' || 'Archive invalide.',
    },
  },
  taches: {
    obligatoires: ['titre', 'quadrant', 'statut', 'aujourdhui'],
    champs: {
      titre: (v) => texte(v, 300) || 'Le titre est obligatoire (300 caractères max).',
      quadrant: (v) => dans(QUADRANTS, v) || 'Quadrant inconnu.',
      statut: (v) => dans(STATUTS_TACHE, v) || 'Statut inconnu.',
      aujourdhui: (v) => typeof v === 'boolean' || 'Valeur invalide.',
      clientId: (v) => v === null || typeof v === 'string' || 'Client invalide.',
      echeance: (v) => nombreOuVide(v) || 'Échéance invalide.',
      note: (v) => v === null || typeof v === 'string' || 'Note invalide.',
      doneAt: (v) => nombreOuVide(v) || v === HORODATAGE || 'Date de fin invalide.',
    },
  },
  notes: {
    obligatoires: ['clientId', 'type', 'texte', 'auteur'],
    champs: {
      clientId: (v) => texte(v, 100) || 'Client obligatoire.',
      type: (v) => dans(TYPES_NOTE, v) || 'Type de note inconnu.',
      texte: (v) => texte(v, 5000) || 'Le texte est obligatoire.',
      auteur: (v) => (typeof v === 'string' && /^(antoine|jules|agent:[a-z0-9-]+)$/.test(v)) || 'Auteur invalide.',
    },
  },
  prestataires: {
    obligatoires: ['nom', 'statut'],
    champs: {
      nom: (v) => texte(v, 200) || 'Le nom est obligatoire (200 caractères max).',
      localisation: (v) => v === null || (typeof v === 'string' && v.length <= 200) || 'Localisation trop longue.',
      statut: (v) => dans(STATUTS_PRESTATAIRE, v) || 'Statut inconnu.',
    },
  },
  inbox: {
    obligatoires: ['texte', 'source', 'traite'],
    champs: {
      texte: (v) => texte(v, 2000) || 'La note est vide.',
      source: (v) => dans(SOURCES_INBOX, v) || 'Source inconnue.',
      traite: (v) => typeof v === 'boolean' || 'Valeur invalide.',
    },
  },
};

function valider(collection, objet, creation) {
  const schema = SCHEMAS[collection];
  if (!schema) throw new ErreurDonnees(`Collection inconnue : ${collection}`);
  if (creation) {
    for (const k of schema.obligatoires) {
      if (objet[k] === undefined) throw new ErreurDonnees(`Champ manquant : ${k}`);
    }
  }
  for (const [k, v] of Object.entries(objet)) {
    const regle = schema.champs[k];
    if (!regle) throw new ErreurDonnees(`Champ non prévu : ${k}`);
    const r = regle(v);
    if (r !== true) throw new ErreurDonnees(r);
  }
}

function traduire(e) {
  if (e instanceof ErreurDonnees) return e;
  if (e && /permission_denied/i.test(e.code || e.message || '')) return new ErreurDonnees("Écriture refusée par la base (droits ou donnée invalide).");
  return new ErreurDonnees((e && e.message) || 'Erreur inconnue.');
}

// ---------------------------------------------------------------- Lecture

// callback(liste) avec liste = [{ id, ...champs }], à chaque changement. Renvoie la fonction de désabonnement.
export function ecouter(collection, callback, surErreur) {
  if (!COLLECTIONS.includes(collection)) throw new ErreurDonnees(`Collection inconnue : ${collection}`);
  const ref = db.ref(chemin(collection));
  const h = (snap) => {
    const v = snap.val() || {};
    callback(Object.entries(v).map(([id, x]) => ({ id, ...x })));
  };
  const err = (e) => surErreur && surErreur(traduire(e));
  ref.on('value', h, err);
  return () => ref.off('value', h);
}

export function ecouterMission(callback, surErreur) {
  const ref = db.ref(chemin('mission'));
  const h = (snap) => callback(snap.val());
  ref.on('value', h, (e) => surErreur && surErreur(traduire(e)));
  return () => ref.off('value', h);
}

// ---------------------------------------------------------------- Écriture

export async function creer(collection, objet) {
  valider(collection, objet, true);
  const ref = db.ref(chemin(collection)).push();
  const donnees = { ...objet, createdAt: HORODATAGE };
  if (collection === 'clients' || collection === 'prestataires') donnees.updatedAt = HORODATAGE;
  if (collection === 'clients') {
    if (donnees.archive === undefined) donnees.archive = false;
  }
  try {
    await ref.set(donnees); // set sur l'élément neuf uniquement, jamais sur la collection
  } catch (e) { throw traduire(e); }
  return ref.key;
}

export async function modifier(collection, id, champs) {
  if (!id) throw new ErreurDonnees('Identifiant manquant.');
  valider(collection, champs, false);
  const maj = {};
  for (const [k, v] of Object.entries(champs)) maj[`${k}`] = v;
  if (collection === 'clients' || collection === 'prestataires') maj.updatedAt = HORODATAGE;
  try {
    await db.ref(chemin(collection, id)).update(maj);
  } catch (e) { throw traduire(e); }
}

// Seuls les éléments de l'Inbox peuvent être supprimés. Les fiches clients s'archivent.
export async function supprimerInbox(id) {
  if (!id) throw new ErreurDonnees('Identifiant manquant.');
  try {
    await db.ref(chemin('inbox', id)).remove();
  } catch (e) { throw traduire(e); }
}

// Suppression définitive d'une fiche : retire aussi ses notes et détache ses tâches (clientId vidé).
export async function supprimerClient(id) {
  if (!id) throw new ErreurDonnees('Identifiant manquant.');
  try {
    const [notes, taches] = await Promise.all([
      db.ref(chemin('notes')).once('value'),
      db.ref(chemin('taches')).once('value'),
    ]);
    const maj = {};
    maj[chemin('clients', id)] = null;
    for (const [nid, n] of Object.entries(notes.val() || {})) if (n && n.clientId === id) maj[chemin('notes', nid)] = null;
    for (const [tid, t] of Object.entries(taches.val() || {})) if (t && t.clientId === id) maj[chemin('taches', tid, 'clientId')] = null;
    await db.ref().update(maj);
  } catch (e) { throw traduire(e); }
}

// ---------------------------------------------------------------- Prestataires : factures et notes

const lienHttps = (v) => typeof v === 'string' && /^https?:\/\/\S+$/.test(v.trim()) && v.length <= 2000;

export async function ajouterFacture(prestataireId, { date, libelle, montant, lien }) {
  if (!prestataireId) throw new ErreurDonnees('Prestataire manquant.');
  if (typeof date !== 'number') throw new ErreurDonnees('La date est obligatoire.');
  if (!lienHttps(lien)) throw new ErreurDonnees('Le lien doit commencer par https://');
  if (montant !== null && !(typeof montant === 'number' && montant >= 0)) throw new ErreurDonnees('Montant invalide.');
  if (libelle && libelle.length > 200) throw new ErreurDonnees('Libellé trop long.');
  const ref = db.ref(chemin('prestataires', prestataireId, 'factures')).push();
  try {
    await ref.set({ date, libelle: libelle || null, montant, lien: lien.trim(), createdAt: HORODATAGE });
  } catch (e) { throw traduire(e); }
}

export async function supprimerFacture(prestataireId, factureId) {
  try { await db.ref(chemin('prestataires', prestataireId, 'factures', factureId)).remove(); } catch (e) { throw traduire(e); }
}

export async function ajouterNotePrestataire(prestataireId, texteNote) {
  if (!texte(texteNote, 5000)) throw new ErreurDonnees('La note est vide.');
  const ref = db.ref(chemin('prestataires', prestataireId, 'notes')).push();
  try { await ref.set({ texte: texteNote.trim(), auteur, createdAt: HORODATAGE }); } catch (e) { throw traduire(e); }
}

export async function supprimerPrestataire(id) {
  if (!id) throw new ErreurDonnees('Identifiant manquant.');
  try { await db.ref(chemin('prestataires', id)).remove(); } catch (e) { throw traduire(e); }
}

export function archiverClient(id) {
  return modifier('clients', id, { archive: true });
}

// ---------------------------------------------------------------- Mission (une seule tâche active)

export async function demarrerMission(tacheId) {
  const maj = {};
  maj[chemin('mission')] = { tacheId, startedAt: HORODATAGE };
  maj[chemin('taches', tacheId, 'statut')] = 'en_cours';
  try { await db.ref().update(maj); } catch (e) { throw traduire(e); }
}

export async function terminerMission(tacheId) {
  const maj = {};
  maj[chemin('mission')] = null;
  maj[chemin('taches', tacheId, 'statut')] = 'fait';
  maj[chemin('taches', tacheId, 'doneAt')] = HORODATAGE;
  maj[chemin('taches', tacheId, 'aujourdhui')] = false;
  try { await db.ref().update(maj); } catch (e) { throw traduire(e); }
}

export async function abandonnerMission(tacheId) {
  const maj = {};
  maj[chemin('mission')] = null;
  maj[chemin('taches', tacheId, 'statut')] = 'a_faire';
  try { await db.ref().update(maj); } catch (e) { throw traduire(e); }
}

// ---------------------------------------------------------------- Export

export async function exporterTout() {
  const snap = await db.ref(chemin()).once('value');
  return snap.val() || {};
}
