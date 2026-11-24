// Écran Aujourd'hui : mission en cours, liste du jour, relances dues, Inbox.
import { el, vider, bouton, pastille, enTete, etatVide, etatChargement, etatErreur, dateLongue, fenetre, libelleEcheance, debutJour } from '../ui.js?v=9';
import { ecouter, ecouterMission, creer, modifier, supprimerInbox, demarrerMission, terminerMission, abandonnerMission } from '../donnees.js?v=9';
import { QUADRANTS, LIMITE_LISTE_DU_JOUR } from '../constantes.js?v=9';
import { ouvrir as ouvrirCapture } from './capture.js?v=9';
import { ouvrirFormulaireTache } from './taches.js?v=9';
import { selectionner as selectionnerClient } from './clients.js?v=9';
import { allerA } from '../navigation.js?v=9';

const fmtHeure = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const UN_JOUR = 24 * 3600 * 1000;

export function afficher(conteneur) {
  const etat = { taches: null, clients: null, inbox: null, mission: undefined };
  conteneur.appendChild(enTete("Aujourd'hui", dateLongue()));

  const zoneMission = el('div', {}, [etatChargement(1)]);
  const zoneJour = el('section', { class: 'carte', 'aria-labelledby': 'titre-jour' }, [etatChargement(3)]);
  const zoneRelances = el('section', { class: 'carte', 'aria-labelledby': 'titre-relances' }, [etatChargement(2)]);
  const zoneInbox = el('div', { class: 'inbox-liste' }, [etatChargement(2)]);
  const compteurInbox = el('span', { class: 'carte-compteur' });
  const carteInbox = el('section', { class: 'carte', 'aria-labelledby': 'titre-inbox' }, [
    el('div', { class: 'carte-entete' }, [el('h2', { id: 'titre-inbox', class: 'carte-titre', texte: 'Inbox' }), compteurInbox]),
    zoneInbox,
  ]);
  conteneur.append(
    zoneMission,
    el('div', { class: 'grille-jour' }, [zoneJour, el('div', { class: 'colonne-droite' }, [zoneRelances, carteInbox])]),
  );

  let minuterie = null;
  const rendre = () => {
    if (minuterie) { clearInterval(minuterie); minuterie = null; }
    if (etat.taches && etat.mission !== undefined) {
      const tacheMission = etat.mission ? etat.taches.find((t) => t.id === etat.mission.tacheId && t.statut !== 'fait') : null;
      vider(zoneMission).appendChild(carteMission(tacheMission, etat, (f) => { minuterie = f; }));
      vider(zoneJour);
      for (const n of listeDuJour(etat, tacheMission)) zoneJour.appendChild(n);
    }
    if (etat.clients) { vider(zoneRelances); for (const n of relances(etat.clients)) zoneRelances.appendChild(n); }
    if (etat.inbox) rendreInbox(zoneInbox, compteurInbox, etat.inbox);
  };

  const arrets = [];
  const brancher = () => {
    arrets.splice(0).forEach((f) => f());
    const erreur = (e) => vider(zoneMission).appendChild(etatErreur(e.message, brancher));
    arrets.push(ecouter('taches', (x) => { etat.taches = x; rendre(); }, erreur));
    arrets.push(ecouter('clients', (x) => { etat.clients = x; rendre(); }, erreur));
    arrets.push(ecouter('inbox', (x) => { etat.inbox = x; rendre(); }, erreur));
    arrets.push(ecouterMission((m) => { etat.mission = m; rendre(); }, erreur));
  };
  brancher();
  return () => { arrets.forEach((f) => f()); if (minuterie) clearInterval(minuterie); };
}

// ---------------------------------------------------------------- Mission

function duree(ms) {
  const min = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(min / 60);
  return h ? `${h} h ${String(min % 60).padStart(2, '0')}` : `${min} min`;
}

function carteMission(t, etat, garderMinuterie) {
  if (!t) {
    return el('section', { class: 'carte mission mission-vide', 'aria-label': 'Mission en cours' }, [
      el('span', { class: 'mission-label', texte: 'Aucune mission en cours' }),
      el('p', { class: 'texte-2 sans-marge', texte: 'Choisis une tâche de ta liste du jour et clique sur Lancer.' }),
    ]);
  }
  const client = t.clientId && etat.clients ? etat.clients.find((c) => c.id === t.clientId) : null;
  const chrono = el('span', { class: 'texte-3', texte: '' });
  const maj = () => { chrono.textContent = etat.mission.startedAt ? `En cours depuis ${duree(Date.now() - etat.mission.startedAt)}` : ''; };
  maj();
  garderMinuterie(setInterval(maj, 30000));

  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;
  const terminer = bouton('Terminer', { variante: 'principal' });
  terminer.addEventListener('click', async () => {
    terminer.disabled = true;
    try { await terminerMission(t.id); } catch (e) { erreur.textContent = e.message; erreur.hidden = false; terminer.disabled = false; }
  });
  const abandonner = bouton('Abandonner', { onclick: () => confirmerAbandon(t) });

  return el('section', { class: 'carte mission', 'aria-label': 'Mission en cours' }, [
    el('div', { class: 'mission-texte' }, [
      el('span', { class: 'mission-label', texte: 'Mission en cours' }),
      el('span', { class: 'mission-titre', texte: t.titre }),
      el('div', { class: 'tache-meta' }, [pastille(t.quadrant, { or: t.quadrant === 'Q1' }), client ? pastille(client.nom) : null, chrono]),
      erreur,
    ]),
    el('div', { class: 'mission-actions' }, [abandonner, terminer]),
  ]);
}

// Friction : abandonner demande une confirmation avec 5 secondes d'attente.
function confirmerAbandon(t) {
  let reste = 5;
  const confirmer = bouton(`Abandonner (${reste})`, { variante: 'secondaire', disabled: true });
  const garder = bouton('Je continue', { variante: 'principal' });
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;
  const { dialogue, fermer } = fenetre('Abandonner la mission ?', el('div', { class: 'formulaire' }, [
    el('p', { class: 'sans-marge', texte: `« ${t.titre} »` }),
    el('p', { class: 'texte-2 sans-marge', texte: 'La tâche reviendra dans ta liste. Finir ce que tu as commencé, c\'est le but du jeu.' }),
    erreur,
  ]), [confirmer, garder]);
  garder.addEventListener('click', fermer);
  garder.focus();
  const tic = setInterval(() => {
    reste -= 1;
    if (reste <= 0) { clearInterval(tic); confirmer.disabled = false; confirmer.lastChild.textContent = 'Abandonner'; }
    else confirmer.lastChild.textContent = `Abandonner (${reste})`;
  }, 1000);
  dialogue.addEventListener('close', () => clearInterval(tic));
  confirmer.addEventListener('click', async () => {
    confirmer.disabled = true;
    try { await abandonnerMission(t.id); fermer(); } catch (e) { erreur.textContent = e.message; erreur.hidden = false; confirmer.disabled = false; }
  });
}

// ---------------------------------------------------------------- Liste du jour

function listeDuJour(etat, tacheMission) {
  const ordre = QUADRANTS.map((q) => q.id);
  const items = etat.taches.filter((t) => t.aujourdhui && t.statut !== 'fait')
    .sort((a, b) => ordre.indexOf(a.quadrant) - ordre.indexOf(b.quadrant) || (a.echeance || Infinity) - (b.echeance || Infinity));
  const enMission = !!tacheMission;
  const noeuds = [el('div', { class: 'carte-entete' }, [
    el('h2', { id: 'titre-jour', class: 'carte-titre', texte: 'Liste du jour' }),
    el('span', { class: 'texte-3', texte: `${items.length} / ${LIMITE_LISTE_DU_JOUR}` }),
  ])];
  if (!items.length) {
    noeuds.push(etatVide("Rien de prévu aujourd'hui", "Ajoute jusqu'à 5 tâches depuis l'écran Tâches.", el('a', { class: 'btn btn-secondaire', href: '#taches', texte: 'Choisir mes tâches' })));
    return noeuds;
  }
  for (const t of items) {
    const estMission = tacheMission && tacheMission.id === t.id;
    const client = t.clientId && etat.clients ? etat.clients.find((c) => c.id === t.clientId) : null;
    const ech = libelleEcheance(t.echeance);
    const cb = el('input', { type: 'checkbox', class: 'case', 'aria-label': `Marquer « ${t.titre} » comme faite`, disabled: estMission });
    cb.addEventListener('change', () => {
      cb.disabled = true;
      modifier('taches', t.id, { statut: 'fait', doneAt: Date.now(), aujourdhui: false }).catch(() => { cb.checked = false; cb.disabled = false; });
    });
    const lancer = bouton(estMission ? 'En cours' : 'Lancer', { class: `btn btn-secondaire btn-mini${estMission ? ' btn-actif' : ''}`, disabled: enMission });
    lancer.addEventListener('click', () => { lancer.disabled = true; demarrerMission(t.id).catch(() => { lancer.disabled = false; }); });
    noeuds.push(el('div', { class: `jour-ligne${enMission && !estMission ? ' grisee' : ''}` }, [
      cb,
      el('button', { type: 'button', class: 'tache-titre jour-titre', texte: t.titre, onclick: () => ouvrirFormulaireTache(t, { taches: etat.taches, clients: etat.clients || [] }) }),
      el('div', { class: 'tache-meta' }, [
        client ? pastille(client.nom) : null,
        ech ? el('span', { class: `echeance${ech.retard ? ' echeance-retard' : ''}`, texte: ech.texte }) : null,
        pastille(t.quadrant, { or: t.quadrant === 'Q1' }),
        lancer,
      ]),
    ]));
  }
  if (items.length < LIMITE_LISTE_DU_JOUR) noeuds.push(el('a', { class: 'lien-discret', href: '#taches', texte: '+ Ajouter depuis Tâches' }));
  return noeuds;
}

// ---------------------------------------------------------------- Relances dues

function relances(clients) {
  const finJour = debutJour() + UN_JOUR;
  const dues = clients.filter((c) => !c.archive && c.prochaineAction && c.prochaineAction.date < finJour)
    .sort((a, b) => a.prochaineAction.date - b.prochaineAction.date);
  const noeuds = [el('h2', { id: 'titre-relances', class: 'carte-titre', texte: 'Relances dues' })];
  if (!dues.length) { noeuds.push(el('p', { class: 'note-bas', texte: 'Rien à relancer.' })); return noeuds; }
  for (const c of dues) {
    const ech = libelleEcheance(c.prochaineAction.date);
    noeuds.push(el('button', { type: 'button', class: 'relance', onclick: () => { selectionnerClient(c.id); allerA('clients'); } }, [
      el('span', { class: 'relance-texte' }, [el('span', { class: 'relance-nom', texte: c.nom }), el('span', { class: 'texte-2', texte: c.prochaineAction.texte })]),
      el('span', { class: ech.retard ? 'echeance echeance-retard' : 'echeance', texte: ech.retard ? `En retard · ${Math.max(1, Math.round((debutJour() - debutJour(c.prochaineAction.date)) / UN_JOUR))} j` : ech.texte }),
    ]));
  }
  return noeuds;
}

// ---------------------------------------------------------------- Inbox

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
