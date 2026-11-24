// Migration ponctuelle : données financières de l'ancienne appli (users/{uid}) vers v2/users/{uid}/finances/legacy.
// Exception à la règle "seul donnees.js touche Firebase" : ce fichier est temporaire, à retirer une fois la migration faite.
import { el, vider, bouton, enTete, euros, etatErreur } from './ui.js?v=8';
import { RACINE_V2 } from './config.js?v=8';

/* global firebase */

const NOMS_SECTEURS = { marketing: 'Marketing & Media Buying', agents: 'Agents IA', side: 'Side Business (compléments)' };

function enListe(v) {
  if (!v) return [];
  return Array.isArray(v) ? v.filter(Boolean) : Object.values(v).filter(Boolean);
}

async function lireAncien(uid) {
  const db = firebase.database();
  const [secteurs, objectif] = await Promise.all([
    db.ref(`users/${uid}/sectors`).once('value'),
    db.ref(`users/${uid}/caTarget`).once('value'),
  ]);
  const revenus = {};
  const totaux = {};
  for (const [sid, s] of Object.entries(secteurs.val() || {})) {
    let total = 0;
    for (const r of enListe(s && s.revenues)) {
      const montant = Number(r.amount) || 0;
      const id = r.id || `r_${Object.keys(revenus).length}`;
      revenus[id] = { montant, date: r.date || null, libelle: r.label || '', secteur: sid, createdAt: r.createdAt || null };
      total += montant;
    }
    totaux[sid] = Math.round(total * 100) / 100;
  }
  return { revenus, totaux, caTarget: typeof objectif.val() === 'number' ? objectif.val() : null };
}

async function ecrire(uid, donnees) {
  const ref = firebase.database().ref(`${RACINE_V2}/${uid}/finances/legacy`);
  await ref.set({ ...donnees, migreLe: firebase.database.ServerValue.TIMESTAMP });
  const relu = (await ref.once('value')).val() || {};
  return relu;
}

export function afficher(conteneur) {
  conteneur.appendChild(enTete('Migration des données financières', 'Étape ponctuelle'));
  const zone = el('section', { class: 'carte formulaire' });
  conteneur.appendChild(zone);

  const etape1 = () => {
    vider(zone).append(
      el('p', { class: 'sans-marge', texte: "Copie tes revenus et ton objectif de CA de l'ancienne appli vers la V2. L'ancienne base n'est pas modifiée." }),
      bouton('Lire les anciennes données', { variante: 'principal', onclick: lire }),
    );
  };

  const lire = async () => {
    const u = firebase.auth().currentUser;
    if (!u) return;
    vider(zone).append(el('p', { class: 'texte-2 sans-marge', texte: 'Lecture...' }));
    try {
      const d = await lireAncien(u.uid);
      const nb = Object.keys(d.revenus).length;
      const total = Object.values(d.totaux).reduce((a, b) => a + b, 0);
      vider(zone).append(
        el('p', { class: 'sans-marge', texte: `${nb} revenu${nb > 1 ? 's' : ''} trouvé${nb > 1 ? 's' : ''}, ${euros(total)} au total. Objectif CA : ${d.caTarget !== null ? euros(d.caTarget) : 'aucun'}.` }),
        tableauTotaux(d.totaux),
        nb || d.caTarget !== null
          ? bouton('Copier dans la V2', { variante: 'principal', onclick: () => copier(u.uid, d) })
          : el('p', { class: 'texte-2 sans-marge', texte: 'Rien à migrer.' }),
      );
    } catch (e) {
      vider(zone).append(etatErreur(e.message || String(e), etape1));
    }
  };

  const copier = async (uid, d) => {
    vider(zone).append(el('p', { class: 'texte-2 sans-marge', texte: 'Copie...' }));
    try {
      const relu = await ecrire(uid, d);
      const ok = Object.keys(relu.revenus || {}).length === Object.keys(d.revenus).length
        && Object.entries(d.totaux).every(([k, v]) => (relu.totaux || {})[k] === v);
      vider(zone).append(
        el('p', { class: ok ? 'sans-marge' : 'form-erreur', texte: ok ? 'Migration réussie : les totaux relus dans la V2 sont identiques.' : 'Attention : les données relues ne correspondent pas. Ne coupe pas l\'ancienne base et préviens Claude.' }),
        tableauTotaux(relu.totaux || {}),
      );
    } catch (e) {
      vider(zone).append(etatErreur(e.message || String(e), etape1));
    }
  };

  etape1();
}

function tableauTotaux(totaux) {
  const lignes = Object.entries(totaux);
  if (!lignes.length) return el('p', { class: 'texte-3 sans-marge', texte: 'Aucun secteur.' });
  return el('table', { class: 'tableau' }, [
    el('thead', {}, [el('tr', {}, [el('th', { texte: 'Secteur' }), el('th', { class: 'nombre', texte: 'Total' })])]),
    el('tbody', {}, lignes.map(([k, v]) => el('tr', {}, [el('td', { texte: NOMS_SECTEURS[k] || k }), el('td', { class: 'nombre', texte: euros(v) })]))),
  ]);
}
