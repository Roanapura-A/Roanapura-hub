// Éléments d'interface communs. Règle : aucune donnée n'est injectée par innerHTML.
// Le texte passe toujours par textContent (via el()).

import { icone } from './icones.js?v=10';

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

const fmtCourt = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short' });
export function dateCourte(ms) {
  return fmtCourt.format(new Date(ms));
}

// Début du jour (heure de Paris) en ms, pour comparer des échéances.
export function debutJour(ms = Date.now()) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  const [a, m, j] = p.split('-').map(Number);
  return new Date(a, m - 1, j).getTime();
}

// 'AAAA-MM-JJ' (champ date) <-> ms (midi heure locale, évite les décalages de fuseau)
export function versMs(valeurChamp) {
  if (!valeurChamp) return null;
  const [a, m, j] = valeurChamp.split('-').map(Number);
  return new Date(a, m - 1, j, 12).getTime();
}
export function versChamp(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Échéance lisible + état : { texte, retard }
export function libelleEcheance(ms) {
  if (!ms) return null;
  const j = debutJour();
  const jEch = debutJour(ms);
  if (jEch < j) return { texte: 'En retard', retard: true };
  if (jEch === j) return { texte: "Aujourd'hui", retard: false };
  return { texte: dateCourte(ms), retard: false };
}

// Fenêtre modale réutilisable. Renvoie { dialogue, fermer }.
export function fenetre(titre, corps, actions) {
  const d = el('dialog', { class: 'fenetre', 'aria-label': titre }, [
    el('h2', { class: 'fenetre-titre', texte: titre }),
    corps,
    el('div', { class: 'fenetre-actions' }, actions),
  ]);
  const fermer = () => { if (d.open) d.close(); d.remove(); };
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', (e) => { if (e.target === d) fermer(); });
  document.body.appendChild(d);
  d.showModal();
  return { dialogue: d, fermer };
}

export function champ(label, controle) {
  const id = controle.id || `c-${Math.random().toString(36).slice(2, 9)}`;
  controle.id = id;
  return el('div', { class: 'groupe' }, [el('label', { class: 'groupe-label', for: id, texte: label }), controle]);
}

// N'accepte que les liens http(s) : bloque javascript:, data:, etc.
export function lienSur(url) {
  if (typeof url !== 'string' || !url.trim()) return null;
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch { return null; }
}

const fmtEuros = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export function euros(n) {
  return typeof n === 'number' ? fmtEuros.format(n) : '';
}
