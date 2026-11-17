// SEULE couche qui touche à firebase.database(). Les écrans passent par ici.
// Étape 1 : initialisation, lecture des droits d'accès, état de connexion réseau.
// Étape 2 : collections (clients, tâches, notes, inbox, mission).

import { firebaseConfig, RACINE_V2 } from './config.js';

/* global firebase */
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let uidDonnees = null; // l'utilisateur dont on lit/écrit les données (soi-même par défaut)

export function definirUtilisateur(uid) {
  uidDonnees = uid;
}

export function cheminUtilisateur() {
  if (!uidDonnees) throw new Error('Aucun utilisateur connecté.');
  return `${RACINE_V2}/${uidDonnees}`;
}

// Entrée de la liste d'accès pour cet utilisateur, ou null s'il n'y figure pas.
export async function lireAcces(uid) {
  const snap = await db.ref(`meta/whitelist/${uid}`).once('value');
  return snap.val();
}

// Appelle callback(true|false) à chaque changement de connexion au serveur.
// Renvoie la fonction de désabonnement.
export function ecouterConnexionReseau(callback) {
  const ref = db.ref('.info/connected');
  let premier = true;
  const h = (snap) => {
    const connecte = snap.val() === true;
    // Au démarrage la valeur vaut false un court instant : on ne signale pas ce faux "hors ligne".
    if (premier && !connecte) { premier = false; return; }
    premier = false;
    callback(connecte);
  };
  ref.on('value', h);
  return () => ref.off('value', h);
}
