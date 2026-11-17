// Écran Aujourd'hui.
// Étape 3 : bloc Inbox (liste des captures à trier). Mission, liste du jour et relances en étape 6.
import { el, vider, bouton, enTete, etatVide, etatChargement, etatErreur, dateLongue } from '../ui.js?v=5';
import { ecouter, creer, modifier, supprimerInbox } from '../donnees.js?v=5';
import { QUADRANTS } from '../constantes.js?v=5';
import { ouvrir as ouvrirCapture } from './capture.js?v=5';

const fmtHeure = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function afficher(conteneur) {
  conteneur.appendChild(enTete("Aujourd'hui", dateLongue()));

  const grille = el('div', { class: 'grille-jour' });
  const colGauche = el('section', { class: 'carte' }, [
    el('h2', { class: 'carte-titre', texte: 'Mission et liste du jour' }),
    etatVide('Bientôt', 'La mission en cours et la liste du jour arrivent à une prochaine étape.'),
  ]);
  const zoneInbox = el('div', { class: 'inbox-liste' }, [etatChargement(2)]);
  const compteur = el('span', { class: 'carte-compteur', texte: '' });
  const carteInbox = el('section', { class: 'carte', 'aria-labelledby': 'titre-inbox' }, [
    el('div', { class: 'carte-entete' }, [el('h2', { id: 'titre-inbox', class: 'carte-titre', texte: 'Inbox' }), compteur]),
    zoneInbox,
  ]);
  grille.append(colGauche, carteInbox);
  conteneur.appendChild(grille);

  let arret = null;
  const brancher = () => {
    if (arret) arret();
    vider(zoneInbox).appendChild(etatChargement(2));
    arret = ecouter('inbox', (items) => rendreInbox(zoneInbox, compteur, items), (e) => {
      vider(zoneInbox).appendChild(etatErreur(e.message, brancher));
    });
  };
  brancher();
  return () => { if (arret) arret(); };
}

function rendreInbox(zone, compteur, items) {
  const aTrier = items.filter((x) => !x.traite).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  compteur.textContent = aTrier.length ? `${aTrier.length} à trier` : '';
  vider(zone);
  if (!aTrier.length) {
    zone.appendChild(etatVide('Inbox vide', 'Capture une idée avec le bouton or ou la touche C.', bouton('Capturer', { variante: 'secondaire', onclick: ouvrirCapture })));
    return;
  }
  for (const item of aTrier) zone.appendChild(ligneInbox(item));
}

function ligneInbox(item) {
  const erreur = el('p', { class: 'ligne-erreur', role: 'alert' });
  erreur.hidden = true;
  const choixQuadrant = el('select', { class: 'champ champ-petit', 'aria-label': 'Quadrant de la tâche' },
    QUADRANTS.map((q) => el('option', { value: q.id, texte: `${q.id} · ${q.label}`, selected: q.id === 'Q2' })));
  const actions = el('div', { class: 'inbox-actions' });
  const occupe = (oui) => actions.querySelectorAll('button, select').forEach((b) => { b.disabled = oui; });

  const enTache = async () => {
    occupe(true); erreur.hidden = true;
    try {
      await creer('taches', { titre: item.texte.slice(0, 300), quadrant: choixQuadrant.value, statut: 'a_faire', aujourdhui: false });
      await modifier('inbox', item.id, { traite: true });
    } catch (e) {
      erreur.textContent = e.message; erreur.hidden = false; occupe(false);
    }
  };
  const supprimer = async () => {
    occupe(true); erreur.hidden = true;
    try { await supprimerInbox(item.id); } catch (e) { erreur.textContent = e.message; erreur.hidden = false; occupe(false); }
  };

  actions.append(choixQuadrant, bouton('En faire une tâche', { variante: 'secondaire', onclick: enTache }), bouton('Supprimer', { variante: 'discret', onclick: supprimer }));

  return el('div', { class: 'inbox-ligne' }, [
    el('p', { class: 'inbox-texte', texte: item.texte }),
    el('span', { class: 'texte-3', texte: item.createdAt ? fmtHeure.format(new Date(item.createdAt)) : '' }),
    actions,
    erreur,
  ]);
}
