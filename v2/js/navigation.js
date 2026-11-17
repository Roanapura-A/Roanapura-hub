// Routage par hash : #aujourdhui, #taches, #clients.
// Chaque écran exporte afficher(conteneur) qui peut renvoyer une fonction de nettoyage
// (désabonnement des écouteurs Firebase quand on quitte l'écran).

import { ECRANS } from './constantes.js?v=6';
import * as aujourdhui from './ecrans/aujourdhui.js?v=6';
import * as taches from './ecrans/taches.js?v=6';
import * as clients from './ecrans/clients.js?v=6';

const MODULES = { aujourdhui, taches, clients };
const PAR_DEFAUT = 'aujourdhui';

let nettoyage = null;
let conteneur = null;
let surChangement = () => {};

export function ecranCourant() {
  const id = (location.hash || '').replace('#', '');
  return MODULES[id] ? id : PAR_DEFAUT;
}

function rendre() {
  if (!conteneur) return;
  if (typeof nettoyage === 'function') nettoyage();
  nettoyage = null;
  while (conteneur.firstChild) conteneur.removeChild(conteneur.firstChild);
  const id = ecranCourant();
  surChangement(id);
  try {
    nettoyage = MODULES[id].afficher(conteneur) || null;
  } catch (e) {
    console.error('[navigation]', e);
  }
  conteneur.focus({ preventScroll: true });
}

export function demarrer(zone, onChangement) {
  conteneur = zone;
  surChangement = onChangement || surChangement;
  window.addEventListener('hashchange', rendre);
  rendre();
}

export function arreter() {
  window.removeEventListener('hashchange', rendre);
  if (typeof nettoyage === 'function') nettoyage();
  nettoyage = null;
  conteneur = null;
}

export function allerA(id) {
  if (location.hash === `#${id}`) rendre();
  else location.hash = id;
}

export { ECRANS };
