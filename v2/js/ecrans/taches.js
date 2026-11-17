// Écran Tâches : matrice d'Eisenhower ou liste triée par quadrant.
import { el, vider, bouton, pastille, enTete, etatVide, etatChargement, etatErreur, fenetre, champ, versMs, versChamp, libelleEcheance, dateCourte } from '../ui.js?v=6';
import { ecouter, creer, modifier } from '../donnees.js?v=6';
import { QUADRANTS, LIMITE_LISTE_DU_JOUR } from '../constantes.js?v=6';

const DEUX_JOURS = 48 * 3600 * 1000;
let vue = 'matrice'; // gardée pendant la session

export function afficher(conteneur) {
  const segMatrice = el('button', { type: 'button', 'aria-pressed': 'true', texte: 'Matrice' });
  const segListe = el('button', { type: 'button', 'aria-pressed': 'false', texte: 'Liste' });
  const segment = el('div', { class: 'segment', role: 'group', 'aria-label': 'Affichage' }, [segMatrice, segListe]);
  const etat = { taches: null, clients: [] };

  const entete = enTete('Tâches', ' ', [segment, bouton('Nouvelle tâche', { variante: 'principal', onclick: () => ouvrirFormulaireTache(null, etat) })]);
  const sous = entete.querySelector('.entete-sous');
  const zone = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '16px' } }, [etatChargement(4)]);
  conteneur.append(entete, zone);

  const rendre = () => {
    segMatrice.setAttribute('aria-pressed', String(vue === 'matrice'));
    segListe.setAttribute('aria-pressed', String(vue === 'liste'));
    if (!etat.taches) return;
    const actives = etat.taches.filter((t) => t.statut !== 'fait');
    const s = actives.length > 1 ? 's' : '';
    sous.textContent = `${actives.length} tâche${s} active${s}`;
    remonterUrgentes(actives);
    vider(zone);
    if (!etat.taches.length) {
      zone.appendChild(el('section', { class: 'carte' }, [etatVide('Aucune tâche', "Crée ta première tâche, ou transforme une capture de l'Inbox.", bouton('Nouvelle tâche', { onclick: () => ouvrirFormulaireTache(null, etat) }))]));
      return;
    }
    zone.appendChild(vue === 'matrice' ? matrice(actives, etat) : liste(actives, etat));
    const faites = etat.taches.filter((t) => t.statut === 'fait').sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 15);
    if (faites.length) {
      zone.appendChild(el('details', { class: 'carte faites' }, [
        el('summary', { texte: `Faites récemment (${faites.length})` }),
        ...faites.map((t) => el('div', { class: 'faite', texte: `${t.titre}${t.doneAt ? ' · ' + dateCourte(t.doneAt) : ''}` })),
      ]));
    }
  };
  segMatrice.addEventListener('click', () => { vue = 'matrice'; rendre(); });
  segListe.addEventListener('click', () => { vue = 'liste'; rendre(); });

  const arrets = [];
  const brancher = () => {
    arrets.splice(0).forEach((f) => f());
    vider(zone).appendChild(etatChargement(4));
    const erreur = (e) => vider(zone).appendChild(etatErreur(e.message, brancher));
    arrets.push(ecouter('taches', (t) => { etat.taches = t; rendre(); }, erreur));
    arrets.push(ecouter('clients', (c) => { etat.clients = c; rendre(); }, erreur));
  };
  brancher();
  return () => arrets.forEach((f) => f());
}

// Échéance à moins de 48 h : la tâche passe en Q1 (une seule écriture, ensuite elle y est).
const dejaRemontees = new Set();
function remonterUrgentes(actives) {
  const limite = Date.now() + DEUX_JOURS;
  for (const t of actives) {
    if (t.quadrant !== 'Q1' && t.echeance && t.echeance <= limite && !dejaRemontees.has(t.id)) {
      dejaRemontees.add(t.id);
      modifier('taches', t.id, { quadrant: 'Q1' }).catch(() => dejaRemontees.delete(t.id));
    }
  }
}

function trier(taches) {
  return [...taches].sort((a, b) => (a.echeance || Infinity) - (b.echeance || Infinity) || (a.createdAt || 0) - (b.createdAt || 0));
}

function matrice(actives, etat) {
  return el('div', { class: 'matrice' }, QUADRANTS.map((q) => {
    const items = trier(actives.filter((t) => t.quadrant === q.id));
    const indice = el('span', { class: 'texte-3', texte: q.id === 'Q4' && items.length ? 'À archiver ?' : String(items.length) });
    return el('section', { class: `carte quadrant${q.id === 'Q1' ? ' quadrant-q1' : ''}`, 'aria-label': `${q.id} ${q.label}` }, [
      el('div', { class: 'quadrant-entete' }, [el('div', { class: 'quadrant-nom' }, [pastille(q.id, { or: q.id === 'Q1' }), el('h2', { texte: q.label })]), indice]),
      ...(items.length ? items.map((t) => carteTache(t, etat)) : [el('p', { class: 'note-bas', texte: 'Rien ici.' })]),
    ]);
  }));
}

function liste(actives, etat) {
  const ordre = QUADRANTS.map((q) => q.id);
  const tri = trier(actives).sort((a, b) => ordre.indexOf(a.quadrant) - ordre.indexOf(b.quadrant));
  return el('section', { class: 'carte liste-taches' }, tri.map((t) => carteTache(t, etat, true)));
}

function carteTache(t, etat, avecQuadrant = false) {
  const client = t.clientId ? etat.clients.find((c) => c.id === t.clientId) : null;
  const ech = libelleEcheance(t.echeance);
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;
  const btnJour = el('button', {
    type: 'button',
    class: `btn btn-secondaire btn-mini${t.aujourdhui ? ' btn-actif' : ''}`,
    'aria-pressed': String(!!t.aujourdhui),
    texte: t.aujourdhui ? "Dans Aujourd'hui" : "+ Aujourd'hui",
  });
  btnJour.addEventListener('click', async () => {
    erreur.hidden = true;
    if (!t.aujourdhui) {
      const nb = (etat.taches || []).filter((x) => x.aujourdhui && x.statut !== 'fait').length;
      if (nb >= LIMITE_LISTE_DU_JOUR) { erreur.textContent = `La liste du jour est pleine (${LIMITE_LISTE_DU_JOUR} max).`; erreur.hidden = false; return; }
    }
    btnJour.disabled = true;
    try { await modifier('taches', t.id, { aujourdhui: !t.aujourdhui }); } catch (e) { erreur.textContent = e.message; erreur.hidden = false; btnJour.disabled = false; }
  });

  return el('article', { class: 'tache' }, [
    el('button', { class: 'tache-titre', type: 'button', texte: t.titre, onclick: () => ouvrirFormulaireTache(t, etat) }),
    el('div', { class: 'tache-bas' }, [
      el('div', { class: 'tache-meta' }, [
        avecQuadrant ? pastille(t.quadrant, { or: t.quadrant === 'Q1' }) : null,
        client ? pastille(client.nom) : null,
        t.statut === 'en_cours' ? pastille('En mission', { or: true }) : null,
      ]),
      el('div', { class: 'tache-meta' }, [
        ech ? el('span', { class: `echeance${ech.retard ? ' echeance-retard' : ''}`, texte: ech.texte }) : null,
        btnJour,
      ]),
    ]),
    erreur,
  ]);
}

// Formulaire de création / modification. tache = null pour créer.
export function ouvrirFormulaireTache(tache, etat) {
  const titre = el('input', { class: 'champ', type: 'text', maxlength: '300', value: tache ? tache.titre : '' });
  const quadrant = el('select', { class: 'champ' }, QUADRANTS.map((q) => el('option', { value: q.id, texte: `${q.id} · ${q.label}`, selected: (tache ? tache.quadrant : 'Q2') === q.id })));
  const echeance = el('input', { class: 'champ', type: 'date', value: tache ? versChamp(tache.echeance) : '' });
  const clientsActifs = (etat.clients || []).filter((c) => !c.archive).sort((a, b) => a.nom.localeCompare(b.nom));
  const client = el('select', { class: 'champ' }, [
    el('option', { value: '', texte: 'Aucun' }),
    ...clientsActifs.map((c) => el('option', { value: c.id, texte: c.nom, selected: !!(tache && tache.clientId === c.id) })),
  ]);
  const note = el('textarea', { class: 'champ', maxlength: '2000' });
  note.value = tache && tache.note ? tache.note : '';
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;

  const corps = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '14px' } }, [
    champ('Titre', titre),
    el('div', { class: 'groupes-ligne' }, [champ('Quadrant', quadrant), champ('Échéance', echeance)]),
    champ('Client ou projet', client),
    champ('Note', note),
    erreur,
  ]);

  const enregistrer = bouton(tache ? 'Enregistrer' : 'Créer', { variante: 'principal' });
  const annuler = bouton('Annuler');
  const actions = [];
  let marquerFaite = null;
  if (tache && tache.statut === 'a_faire') {
    marquerFaite = el('button', { type: 'button', class: 'btn btn-discret pousse', texte: 'Marquer comme faite' });
    actions.push(marquerFaite);
  }
  actions.push(annuler, enregistrer);
  const { fermer } = fenetre(tache ? 'Modifier la tâche' : 'Nouvelle tâche', corps, actions);
  annuler.addEventListener('click', fermer);
  titre.focus();

  const occupe = (oui) => [enregistrer, annuler, marquerFaite].forEach((b) => { if (b) b.disabled = oui; });
  const echec = (e) => { erreur.textContent = e.message; erreur.hidden = false; occupe(false); };

  enregistrer.addEventListener('click', async () => {
    erreur.hidden = true;
    const champs = {
      titre: titre.value.trim(),
      quadrant: quadrant.value,
      echeance: versMs(echeance.value),
      clientId: client.value || null,
      note: note.value.trim() || null,
    };
    if (!champs.titre) { erreur.textContent = 'Le titre est obligatoire.'; erreur.hidden = false; titre.focus(); return; }
    occupe(true);
    try {
      if (tache) await modifier('taches', tache.id, champs);
      else await creer('taches', { ...champs, statut: 'a_faire', aujourdhui: false });
      fermer();
    } catch (e) { echec(e); }
  });
  if (marquerFaite) {
    marquerFaite.addEventListener('click', async () => {
      occupe(true);
      try { await modifier('taches', tache.id, { statut: 'fait', doneAt: Date.now(), aujourdhui: false }); fermer(); } catch (e) { echec(e); }
    });
  }
  titre.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); enregistrer.click(); } });
}
