// Écran Clients : tableau des fiches + fiche ouverte (statut, prochaine action, tâches, notes, liens).
import { el, vider, bouton, pastille, enTete, etatVide, etatChargement, etatErreur, fenetre, champ, versMs, versChamp, libelleEcheance, dateCourte, lienSur, euros } from '../ui.js?v=10';
import { ecouter, creer, modifier, archiverClient, supprimerClient, auteurCourant } from '../donnees.js?v=10';
import { STATUTS_CLIENT, TYPES_CLIENT, TYPES_NOTE, libelle } from '../constantes.js?v=10';
import { icone } from '../icones.js?v=10';

const FILTRES = [
  { id: 'tous', label: 'Tous', garde: (c) => !c.archive },
  { id: 'client', label: 'Clients', garde: (c) => !c.archive && c.type === 'client' },
  { id: 'interne', label: 'Internes', garde: (c) => !c.archive && c.type === 'interne' },
  { id: 'archive', label: 'Archivés', garde: (c) => !!c.archive },
];
let filtre = 'tous';
let selection = null;

// Ouvre une fiche précise à l'arrivée sur l'écran (utilisé par Aujourd'hui > Relances).
export function selectionner(id) {
  selection = id;
  filtre = 'tous';
}

export function afficher(conteneur) {
  const etat = { clients: null, taches: [], notes: [] };
  const entete = enTete('Clients', ' ', [bouton('Nouvelle fiche', { variante: 'principal', onclick: () => ouvrirFormulaireClient(null) })]);
  const sous = entete.querySelector('.entete-sous');
  const barreFiltres = el('div', { class: 'filtres', role: 'group', 'aria-label': 'Filtrer' });
  const zone = el('div', { class: 'clients-zone' }, [etatChargement(4)]);
  conteneur.append(entete, barreFiltres, zone);

  const rendre = () => {
    vider(barreFiltres);
    for (const f of FILTRES) {
      barreFiltres.appendChild(el('button', { type: 'button', class: 'filtre', 'aria-pressed': String(filtre === f.id), texte: f.label, onclick: () => { filtre = f.id; rendre(); } }));
    }
    if (!etat.clients) return;
    const actifs = etat.clients.filter((c) => !c.archive);
    sous.textContent = `${actifs.length} fiche${actifs.length > 1 ? 's' : ''} active${actifs.length > 1 ? 's' : ''}`;
    const garde = FILTRES.find((f) => f.id === filtre).garde;
    const visibles = etat.clients.filter(garde).sort((a, b) => ((a.prochaineAction || {}).date || Infinity) - ((b.prochaineAction || {}).date || Infinity));
    vider(zone);
    if (!etat.clients.length) {
      zone.appendChild(el('section', { class: 'carte' }, [etatVide('Aucune fiche', 'Ajoute ton premier client ou projet interne.', bouton('Nouvelle fiche', { onclick: () => ouvrirFormulaireClient(null) }))]));
      return;
    }
    if (selection && !etat.clients.some((c) => c.id === selection)) selection = null;
    if (!selection && visibles.length) selection = visibles[0].id;
    zone.appendChild(tableau(visibles, rendre));
    const fiche = etat.clients.find((c) => c.id === selection);
    if (fiche) zone.appendChild(panneauFiche(fiche, etat));
  };

  const arrets = [];
  const brancher = () => {
    arrets.splice(0).forEach((f) => f());
    vider(zone).appendChild(etatChargement(4));
    const erreur = (e) => vider(zone).appendChild(etatErreur(e.message, brancher));
    arrets.push(ecouter('clients', (c) => { etat.clients = c; rendre(); }, erreur));
    arrets.push(ecouter('taches', (t) => { etat.taches = t; rendre(); }, erreur));
    arrets.push(ecouter('notes', (n) => { etat.notes = n; rendre(); }, erreur));
  };
  brancher();
  rendre();
  return () => arrets.forEach((f) => f());
}

function tableau(clients, rendre) {
  const entetes = ['Nom', 'Statut', 'Prochaine action', 'Date', 'Montant'];
  const corps = el('tbody');
  if (!clients.length) {
    corps.appendChild(el('tr', {}, [el('td', { colspan: '5', class: 'cellule-vide', texte: 'Aucune fiche dans ce filtre.' })]));
  }
  for (const c of clients) {
    const pa = c.prochaineAction || {};
    const ech = libelleEcheance(pa.date);
    const choisir = () => { selection = c.id; rendre(); };
    corps.appendChild(el('tr', { class: c.id === selection ? 'ligne ligne-active' : 'ligne', onclick: choisir }, [
      el('td', {}, [
        el('button', { type: 'button', class: 'ligne-nom', texte: c.nom, onclick: (e) => { e.stopPropagation(); choisir(); } }),
        el('span', { class: 'texte-3 bloc', texte: libelle(TYPES_CLIENT, c.type) }),
      ]),
      el('td', {}, [pastille(libelle(STATUTS_CLIENT, c.statut), { or: c.id === selection })]),
      el('td', { class: 'texte-2', texte: pa.texte || '' }),
      el('td', { class: ech && ech.retard ? 'echeance-retard' : 'texte-2', texte: ech ? ech.texte : '' }),
      el('td', { class: 'nombre', texte: euros(c.montant) || '-' }),
    ]));
  }
  return el('div', { class: 'carte tableau-boite' }, [
    el('table', { class: 'tableau' }, [el('thead', {}, [el('tr', {}, entetes.map((t, i) => el('th', { class: i === 4 ? 'nombre' : '', texte: t })))]), corps]),
  ]);
}

function panneauFiche(c, etat) {
  const pa = c.prochaineAction || {};
  const contact = c.contact || {};
  const ligneContact = [contact.nom, contact.telephone, contact.email].filter(Boolean).join(' · ');

  // Frise de statut : cliquer une étape change le statut.
  const idxCourant = STATUTS_CLIENT.findIndex((s) => s.id === c.statut);
  const frise = el('div', { class: 'frise', role: 'group', 'aria-label': 'Statut' }, STATUTS_CLIENT.map((s, i) => el('button', {
    type: 'button',
    class: i === idxCourant ? 'etape etape-courante' : i < idxCourant ? 'etape etape-passee' : 'etape',
    'aria-pressed': String(i === idxCourant),
    texte: s.label,
    onclick: () => { if (s.id !== c.statut) modifier('clients', c.id, { statut: s.id }).catch((e) => signaler(e)); },
  })));

  // Prochaine action (obligatoire)
  const paTexte = el('input', { class: 'champ', type: 'text', maxlength: '300', value: pa.texte || '', 'aria-label': 'Prochaine action' });
  const paDate = el('input', { class: 'champ champ-date', type: 'date', value: versChamp(pa.date), 'aria-label': 'Date de la prochaine action' });
  const ech = libelleEcheance(pa.date);
  if (ech && ech.retard) paDate.classList.add('champ-retard');
  const paErreur = el('p', { class: 'form-erreur', role: 'alert' });
  paErreur.hidden = true;
  const signaler = (e) => { paErreur.textContent = e.message; paErreur.hidden = false; };
  const paOk = bouton('Enregistrer', { variante: 'principal', class: 'btn btn-principal btn-mini' });
  paOk.addEventListener('click', async () => {
    paErreur.hidden = true;
    const texte = paTexte.value.trim();
    const date = versMs(paDate.value);
    if (!texte || !date) { signaler(new Error('La prochaine action et sa date sont obligatoires.')); return; }
    paOk.disabled = true;
    try { await modifier('clients', c.id, { prochaineAction: { texte, date } }); } catch (e) { signaler(e); paOk.disabled = false; }
  });

  // Tâches liées
  const taches = etat.taches.filter((t) => t.clientId === c.id && t.statut !== 'fait');
  const blocTaches = el('div', { class: 'bloc-fiche' }, [
    el('h2', { class: 'carte-titre', texte: 'Tâches liées' }),
    ...(taches.length ? taches.map((t) => {
      const cb = el('input', { type: 'checkbox', class: 'case', id: `tl-${t.id}` });
      cb.addEventListener('change', () => { cb.disabled = true; modifier('taches', t.id, { statut: 'fait', doneAt: Date.now(), aujourdhui: false }).catch((e) => { signaler(e); cb.checked = false; cb.disabled = false; }); });
      return el('div', { class: 'ligne-case' }, [cb, el('label', { for: `tl-${t.id}`, texte: t.titre }), pastille(t.quadrant, { or: t.quadrant === 'Q1' })]);
    }) : [el('p', { class: 'note-bas', texte: 'Aucune tâche liée. Rattache une tâche depuis son formulaire.' })]),
  ]);

  // Notes
  const notes = etat.notes.filter((n) => n.clientId === c.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const blocNotes = el('div', { class: 'bloc-fiche' }, [
    el('div', { class: 'carte-entete' }, [el('h2', { class: 'carte-titre', texte: 'Notes' }), bouton('+ Note', { class: 'btn btn-secondaire btn-mini', onclick: () => ouvrirFormulaireNote(c) })]),
    ...(notes.length ? notes.map((n) => el('div', { class: 'note' }, [
      el('span', { class: 'texte-3', texte: `${n.createdAt ? dateCourte(n.createdAt) : ''} · ${libelle(TYPES_NOTE, n.type)} · ${n.auteur === 'antoine' ? 'Antoine' : n.auteur}` }),
      el('p', { class: 'note-texte', texte: n.texte }),
    ])) : [el('p', { class: 'note-bas', texte: 'Aucune note.' })]),
  ]);

  // Liens (http/https uniquement)
  const liens = [['Dossier Drive', (c.liens || {}).drive], ['Workflow n8n', (c.liens || {}).n8n]]
    .map(([t, u]) => [t, lienSur(u)]).filter(([, u]) => u)
    .map(([t, u]) => el('a', { class: 'lien-fiche', href: u, target: '_blank', rel: 'noopener noreferrer' }, [icone('lien', 16), t]));

  return el('aside', { class: 'carte fiche', 'aria-label': `Fiche ${c.nom}` }, [
    el('div', { class: 'fiche-haut' }, [
      el('div', { class: 'fiche-ident' }, [
        el('h2', { class: 'fiche-nom', texte: c.nom }),
        ligneContact ? el('span', { class: 'texte-2', texte: ligneContact }) : el('span', { class: 'texte-3', texte: 'Pas de contact renseigné' }),
      ]),
      el('div', { class: 'fiche-boutons' }, [pastille(libelle(TYPES_CLIENT, c.type)), c.montant ? pastille(euros(c.montant), { or: true }) : null]),
    ]),
    frise,
    el('div', { class: 'prochaine-action' }, [
      el('span', { class: 'prochaine-titre', texte: 'Prochaine action' }),
      el('div', { class: 'prochaine-ligne' }, [paTexte, paDate, paOk]),
      el('span', { class: 'texte-3', texte: 'Obligatoire : chaque fiche a toujours une prochaine action datée.' }),
      paErreur,
    ]),
    blocTaches,
    blocNotes,
    liens.length ? el('div', { class: 'liens-fiche' }, liens) : null,
    el('div', { class: 'fiche-bas' }, [
      bouton('Modifier la fiche', { onclick: () => ouvrirFormulaireClient(c) }),
      c.archive
        ? bouton('Désarchiver', { variante: 'discret', onclick: () => modifier('clients', c.id, { archive: false }).catch(signaler) })
        : bouton('Archiver', { variante: 'discret', onclick: () => archiverClient(c.id).catch(signaler) }),
      bouton('Supprimer', { variante: 'discret', class: 'btn btn-discret btn-danger', onclick: () => confirmerSuppression(c, etat) }),
    ]),
  ]);
}

// Suppression définitive, avec confirmation : on tape le nom de la fiche pour valider.
function confirmerSuppression(c, etat) {
  const nbNotes = etat.notes.filter((n) => n.clientId === c.id).length;
  const nbTaches = etat.taches.filter((t) => t.clientId === c.id).length;
  const saisie = el('input', { class: 'champ', type: 'text', autocomplete: 'off', placeholder: c.nom });
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;
  const supprimer = bouton('Supprimer définitivement', { class: 'btn btn-danger-plein', disabled: true });
  const annuler = bouton('Annuler', { variante: 'principal' });
  const details = [
    nbNotes ? `${nbNotes} note${nbNotes > 1 ? 's' : ''} supprimée${nbNotes > 1 ? 's' : ''}` : null,
    nbTaches ? `${nbTaches} tâche${nbTaches > 1 ? 's' : ''} conservée${nbTaches > 1 ? 's' : ''} mais détachée${nbTaches > 1 ? 's' : ''} de la fiche` : null,
  ].filter(Boolean).join(', ');
  const { fermer } = fenetre('Supprimer la fiche ?', el('div', { class: 'formulaire' }, [
    el('p', { class: 'sans-marge', texte: `« ${c.nom} » sera supprimée définitivement, sans retour possible.${details ? ' ' + details + '.' : ''}` }),
    el('p', { class: 'texte-2 sans-marge', texte: "Pour garder l'historique sans l'afficher, utilise plutôt Archiver." }),
    champ('Tape le nom de la fiche pour confirmer', saisie),
    erreur,
  ]), [supprimer, annuler]);
  annuler.addEventListener('click', fermer);
  saisie.focus();
  saisie.addEventListener('input', () => { supprimer.disabled = saisie.value.trim() !== c.nom.trim(); });
  supprimer.addEventListener('click', async () => {
    supprimer.disabled = true;
    try {
      await supprimerClient(c.id);
      if (selection === c.id) selection = null;
      fermer();
    } catch (e) { erreur.textContent = e.message; erreur.hidden = false; supprimer.disabled = false; }
  });
}

function ouvrirFormulaireNote(c) {
  const type = el('select', { class: 'champ' }, TYPES_NOTE.map((t) => el('option', { value: t.id, texte: t.label, selected: t.id === 'call' })));
  const texte = el('textarea', { class: 'champ', maxlength: '5000', rows: '6' });
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;
  const ok = bouton('Ajouter', { variante: 'principal' });
  const annuler = bouton('Annuler');
  const { fermer } = fenetre(`Note sur ${c.nom}`, el('div', { class: 'formulaire' }, [champ('Type', type), champ('Note', texte), erreur]), [annuler, ok]);
  annuler.addEventListener('click', fermer);
  texte.focus();
  ok.addEventListener('click', async () => {
    erreur.hidden = true;
    if (!texte.value.trim()) { erreur.textContent = 'La note est vide.'; erreur.hidden = false; return; }
    ok.disabled = true;
    try {
      await creer('notes', { clientId: c.id, type: type.value, texte: texte.value.trim(), auteur: auteurCourant() });
      fermer();
    } catch (e) { erreur.textContent = e.message; erreur.hidden = false; ok.disabled = false; }
  });
}

// Création / modification d'une fiche. c = null pour créer.
export function ouvrirFormulaireClient(c) {
  const v = c || {};
  const ct = v.contact || {};
  const li = v.liens || {};
  const nom = el('input', { class: 'champ', type: 'text', maxlength: '200', value: v.nom || '' });
  const type = el('select', { class: 'champ' }, TYPES_CLIENT.map((t) => el('option', { value: t.id, texte: t.label, selected: (v.type || 'client') === t.id })));
  const statut = el('select', { class: 'champ' }, STATUTS_CLIENT.map((s) => el('option', { value: s.id, texte: s.label, selected: (v.statut || 'prospect') === s.id })));
  const cNom = el('input', { class: 'champ', type: 'text', maxlength: '120', value: ct.nom || '' });
  const cTel = el('input', { class: 'champ', type: 'tel', maxlength: '40', value: ct.telephone || '' });
  const cMail = el('input', { class: 'champ', type: 'email', maxlength: '160', value: ct.email || '' });
  const montant = el('input', { class: 'champ', type: 'number', min: '0', step: '1', value: typeof v.montant === 'number' ? String(v.montant) : '' });
  const drive = el('input', { class: 'champ', type: 'url', placeholder: 'https://', value: li.drive || '' });
  const n8n = el('input', { class: 'champ', type: 'url', placeholder: 'https://', value: li.n8n || '' });
  const pa = v.prochaineAction || {};
  const paTexte = el('input', { class: 'champ', type: 'text', maxlength: '300', value: pa.texte || '' });
  const paDate = el('input', { class: 'champ', type: 'date', value: versChamp(pa.date) });
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;

  const corps = el('div', { class: 'formulaire' }, [
    champ('Nom', nom),
    el('div', { class: 'groupes-ligne' }, [champ('Type', type), champ('Statut', statut)]),
    el('div', { class: 'groupes-ligne' }, [champ('Prochaine action', paTexte), champ('Date', paDate)]),
    el('div', { class: 'groupes-ligne' }, [champ('Contact', cNom), champ('Téléphone', cTel)]),
    el('div', { class: 'groupes-ligne' }, [champ('Email', cMail), champ('Montant (€)', montant)]),
    el('div', { class: 'groupes-ligne' }, [champ('Lien Drive', drive), champ('Lien workflow n8n', n8n)]),
    erreur,
  ]);
  const ok = bouton(c ? 'Enregistrer' : 'Créer la fiche', { variante: 'principal' });
  const annuler = bouton('Annuler');
  const { fermer } = fenetre(c ? 'Modifier la fiche' : 'Nouvelle fiche', corps, [annuler, ok]);
  annuler.addEventListener('click', fermer);
  nom.focus();

  ok.addEventListener('click', async () => {
    erreur.hidden = true;
    const contact = { nom: cNom.value.trim() || null, telephone: cTel.value.trim() || null, email: cMail.value.trim() || null };
    const liens = { drive: drive.value.trim() || null, n8n: n8n.value.trim() || null };
    for (const u of Object.values(liens)) {
      if (u && !lienSur(u)) { erreur.textContent = 'Les liens doivent commencer par https://'; erreur.hidden = false; return; }
    }
    const champs = {
      nom: nom.value.trim(),
      type: type.value,
      statut: statut.value,
      prochaineAction: { texte: paTexte.value.trim(), date: versMs(paDate.value) },
      contact: Object.values(contact).some(Boolean) ? contact : null,
      montant: montant.value === '' ? null : Math.max(0, Number(montant.value)),
      liens: Object.values(liens).some(Boolean) ? liens : null,
    };
    if (!champs.nom) { erreur.textContent = 'Le nom est obligatoire.'; erreur.hidden = false; nom.focus(); return; }
    if (!champs.prochaineAction.texte || !champs.prochaineAction.date) { erreur.textContent = 'La prochaine action et sa date sont obligatoires.'; erreur.hidden = false; return; }
    ok.disabled = true;
    try {
      if (c) await modifier('clients', c.id, champs);
      else selection = await creer('clients', champs);
      fermer();
    } catch (e) { erreur.textContent = e.message; erreur.hidden = false; ok.disabled = false; }
  });
}
