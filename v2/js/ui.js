// Éléments d'interface communs. Règle : aucune donnée n'est injectée par innerHTML.
// Le texte passe toujours par textContent (via el()).

import { icone } from './icones.js';

// el('div', { class: 'carte', onclick: fn }, [enfant, 'texte', ...])
export function el(tag, attrs = {}, enfants = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'texte') n.textContent = String(v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const e of [].concat(enfants)) {
    if (e === null || e === undefined || e === false) continue;
    n.appendChild(typeof e === 'string' || typeof e === 'number' ? document.createTextNode(String(e)) : e);
  }
  return n;
}

export function vider(n) {
  while (n.firstChild) n.removeChild(n.firstChild);
  return n;
}

export function bouton(texte, { variante = 'secondaire', onclick, type = 'button', icone: ic, ...reste } = {}) {
  return el('button', { class: `btn btn-${variante}`, type, onclick, ...reste }, [ic ? icone(ic, 18) : null, texte]);
}

export function pastille(texte, { or = false } = {}) {
  return el('span', { class: or ? 'pastille pastille-or' : 'pastille', texte });
}

export function enTete(titre, sousTitre, actions = []) {
  return el('header', { class: 'entete' }, [
    el('div', { class: 'entete-textes' }, [
      sousTitre ? el('span', { class: 'entete-sous', texte: sousTitre }) : null,
      el('h1', { class: 'entete-titre', texte: titre }),
    ]),
    actions.length ? el('div', { class: 'entete-actions' }, actions) : null,
  ]);
}

// --- États d'écran : chargement, vide, erreur ---

export function etatChargement(lignes = 3) {
  const z = el('div', { class: 'etat-chargement', 'aria-busy': 'true', 'aria-label': 'Chargement' });
  for (let i = 0; i < lignes; i++) z.appendChild(el('div', { class: 'squelette' }));
  return z;
}

export function etatVide(titre, texte, action) {
  return el('div', { class: 'etat-vide' }, [
    el('p', { class: 'etat-titre', texte: titre }),
    texte ? el('p', { class: 'etat-texte', texte }) : null,
    action || null,
  ]);
}

export function etatErreur(message, reessayer) {
  return el('div', { class: 'etat-erreur', role: 'alert' }, [
    el('p', { class: 'etat-titre', texte: 'Un problème est survenu' }),
    el('p', { class: 'etat-texte', texte: message }),
    reessayer ? bouton('Réessayer', { onclick: reessayer }) : null,
  ]);
}

// --- Bandeau hors connexion ---

let bandeau = null;
export function afficherHorsLigne(horsLigne) {
  if (!bandeau) {
    bandeau = el('div', { class: 'bandeau-hors-ligne', role: 'status', texte: 'Hors ligne, synchronisé au retour du réseau' });
    document.body.appendChild(bandeau);
  }
  bandeau.hidden = !horsLigne;
}

// --- Dates (affichage Europe/Paris) ---

const fmtJour = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' });
export function dateLongue(ms = Date.now()) {
  const s = fmtJour.format(new Date(ms));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
