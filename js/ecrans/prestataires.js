// Écran Prestataires : tableau + fiche (statut, onglets Factures et Notes).
import { el, vider, bouton, pastille, enTete, etatVide, etatChargement, etatErreur, fenetre, champ, versMs, versChamp, dateCourte, lienSur, euros } from '../ui.js?v=10';
import { ecouter, creer, modifier, ajouterFacture, supprimerFacture, ajouterContrat, supprimerContrat, ajouterNotePrestataire, supprimerPrestataire } from '../donnees.js?v=10';
import { STATUTS_PRESTATAIRE, libelle } from '../constantes.js?v=10';
import { icone } from '../icones.js?v=10';

const FILTRES = [
  { id: 'tous', label: 'Tous', garde: () => true },
  { id: 'en_cours', label: 'En cours', garde: (p) => p.statut === 'en_cours' },
  { id: 'arrete', label: 'Arrêtés', garde: (p) => p.statut === 'arrete' },
];
let filtre = 'tous';
let selection = null;
let onglet = 'factures';

const liste = (o) => Object.entries(o || {}).map(([id, x]) => ({ id, ...x }));

export function afficher(conteneur) {
  const etat = { prestataires: null };
  const entete = enTete('Prestataires', ' ', [bouton('Nouveau prestataire', { variante: 'principal', onclick: () => ouvrirFormulaire(null) })]);
  const sous = entete.querySelector('.entete-sous');
  const barreFiltres = el('div', { class: 'filtres', role: 'group', 'aria-label': 'Filtrer' });
  const zone = el('div', { class: 'clients-zone' }, [etatChargement(3)]);
  conteneur.append(entete, barreFiltres, zone);

  const rendre = () => {
    vider(barreFiltres);
    for (const f of FILTRES) {
      barreFiltres.appendChild(el('button', { type: 'button', class: 'filtre', 'aria-pressed': String(filtre === f.id), texte: f.label, onclick: () => { filtre = f.id; rendre(); } }));
    }
    if (!etat.prestataires) return;
    const enCours = etat.prestataires.filter((p) => p.statut === 'en_cours').length;
    sous.textContent = `${enCours} en cours`;
    const garde = FILTRES.find((f) => f.id === filtre).garde;
    const visibles = etat.prestataires.filter(garde).sort((a, b) => (a.statut === b.statut ? a.nom.localeCompare(b.nom) : a.statut === 'en_cours' ? -1 : 1));
    vider(zone);
    if (!etat.prestataires.length) {
      zone.appendChild(el('section', { class: 'carte' }, [etatVide('Aucun prestataire', 'Ajoute les personnes ou agences qui travaillent pour toi.', bouton('Nouveau prestataire', { onclick: () => ouvrirFormulaire(null) }))]));
      return;
    }
    if (selection && !etat.prestataires.some((p) => p.id === selection)) selection = null;
    if (!selection && visibles.length) selection = visibles[0].id;
    zone.appendChild(tableau(visibles, rendre));
    const p = etat.prestataires.find((x) => x.id === selection);
    if (p) zone.appendChild(fiche(p, rendre));
  };

  let arret = null;
  const brancher = () => {
    if (arret) arret();
    vider(zone).appendChild(etatChargement(3));
    arret = ecouter('prestataires', (x) => { etat.prestataires = x; rendre(); }, (e) => vider(zone).appendChild(etatErreur(e.message, brancher)));
  };
  brancher();
  rendre();
  return () => { if (arret) arret(); };
}

function totalFactures(p) {
  return liste(p.factures).reduce((s, f) => s + (typeof f.montant === 'number' ? f.montant : 0), 0);
}

function tableau(items, rendre) {
  const corps = el('tbody');
  if (!items.length) corps.appendChild(el('tr', {}, [el('td', { colspan: '4', class: 'cellule-vide', texte: 'Aucun prestataire dans ce filtre.' })]));
  for (const p of items) {
    const nbF = liste(p.factures).length;
    const choisir = () => { selection = p.id; rendre(); };
    corps.appendChild(el('tr', { class: p.id === selection ? 'ligne ligne-active' : 'ligne', onclick: choisir }, [
      el('td', {}, [el('button', { type: 'button', class: 'ligne-nom', texte: p.nom, onclick: (e) => { e.stopPropagation(); choisir(); } })]),
      el('td', { class: 'texte-2', texte: p.localisation || '-' }),
      el('td', {}, [pastille(libelle(STATUTS_PRESTATAIRE, p.statut), { or: p.statut === 'en_cours' })]),
      el('td', { class: 'nombre', texte: nbF ? `${nbF} · ${euros(totalFactures(p))}` : '-' }),
    ]));
  }
  return el('div', { class: 'carte tableau-boite' }, [
    el('table', { class: 'tableau' }, [
      el('thead', {}, [el('tr', {}, [el('th', { texte: 'Nom' }), el('th', { texte: 'Localisation' }), el('th', { texte: 'Statut' }), el('th', { class: 'nombre', texte: 'Factures' })])]),
      corps,
    ]),
  ]);
}

function fiche(p, rendre) {
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;
  const signaler = (e) => { erreur.textContent = e.message; erreur.hidden = false; };

  const segStatut = el('div', { class: 'segment', role: 'group', 'aria-label': 'Statut' }, STATUTS_PRESTATAIRE.map((s) => el('button', {
    type: 'button', 'aria-pressed': String(p.statut === s.id), texte: s.label,
    onclick: () => { if (p.statut !== s.id) modifier('prestataires', p.id, { statut: s.id }).catch(signaler); },
  })));

  const onglets = el('div', { class: 'onglets', role: 'tablist' }, [
    ['factures', `Factures (${liste(p.factures).length})`],
    ['contrats', `Contrats (${liste(p.contrats).length})`],
    ['notes', `Notes (${liste(p.notes).length})`],
  ].map(([id, t]) => el('button', { type: 'button', role: 'tab', class: 'onglet', 'aria-selected': String(onglet === id), texte: t, onclick: () => { onglet = id; rendre(); } })));

  return el('aside', { class: 'carte fiche', 'aria-label': `Fiche ${p.nom}` }, [
    el('div', { class: 'fiche-haut' }, [
      el('div', { class: 'fiche-ident' }, [
        el('h2', { class: 'fiche-nom', texte: p.nom }),
        el('span', { class: p.localisation ? 'texte-2' : 'texte-3', texte: p.localisation || 'Localisation non renseignée' }),
      ]),
      segStatut,
    ]),
    onglets,
    onglet === 'factures' ? panneauFactures(p, signaler) : onglet === 'contrats' ? panneauContrats(p, signaler) : panneauNotes(p, signaler),
    erreur,
    el('div', { class: 'fiche-bas' }, [
      bouton('Modifier', { onclick: () => ouvrirFormulaire(p) }),
      bouton('Supprimer', { variante: 'discret', class: 'btn btn-discret btn-danger', onclick: () => confirmerSuppression(p) }),
    ]),
  ]);
}

function panneauFactures(p, signaler) {
  const factures = liste(p.factures).sort((a, b) => (b.date || 0) - (a.date || 0));
  const total = totalFactures(p);
  return el('div', { class: 'bloc-fiche', role: 'tabpanel' }, [
    el('div', { class: 'carte-entete' }, [
      el('span', { class: 'texte-2', texte: factures.length ? `Total : ${euros(total)}` : '' }),
      bouton('+ Facture', { class: 'btn btn-secondaire btn-mini', onclick: () => ouvrirFormulaireFacture(p) }),
    ]),
    ...(factures.length ? factures.map((f) => {
      const url = lienSur(f.lien);
      return el('div', { class: 'facture' }, [
        el('div', { class: 'facture-texte' }, [
          el('span', { class: 'facture-libelle', texte: f.libelle || 'Facture' }),
          el('span', { class: 'texte-3', texte: [f.date ? dateCourte(f.date) : null, typeof f.montant === 'number' ? euros(f.montant) : null].filter(Boolean).join(' · ') }),
        ]),
        el('div', { class: 'tache-meta' }, [
          url ? el('a', { class: 'lien-fiche', href: url, target: '_blank', rel: 'noopener noreferrer' }, [icone('lien', 16), 'Ouvrir']) : el('span', { class: 'texte-3', texte: 'Lien invalide' }),
          el('button', { type: 'button', class: 'btn btn-discret btn-mini', 'aria-label': `Retirer la facture ${f.libelle || ''}`, texte: 'Retirer', onclick: () => supprimerFacture(p.id, f.id).catch(signaler) }),
        ]),
      ]);
    }) : [el('p', { class: 'note-bas', texte: 'Aucune facture.' })]),
  ]);
}

function panneauContrats(p, signaler) {
  const contrats = liste(p.contrats).sort((a, b) => (b.dateDebut || 0) - (a.dateDebut || 0));
  const maintenant = Date.now();
  return el('div', { class: 'bloc-fiche', role: 'tabpanel' }, [
    el('div', { class: 'carte-entete' }, [
      el('span', { class: 'texte-2', texte: '' }),
      bouton('+ Contrat', { class: 'btn btn-secondaire btn-mini', onclick: () => ouvrirFormulaireContrat(p) }),
    ]),
    ...(contrats.length ? contrats.map((c) => {
      const url = lienSur(c.lien);
      const enCours = c.dateDebut <= maintenant && (!c.dateFin || c.dateFin >= maintenant);
      const periode = c.dateFin ? `${dateCourte(c.dateDebut)} → ${dateCourte(c.dateFin)}` : `Depuis le ${dateCourte(c.dateDebut)}`;
      return el('div', { class: 'facture' }, [
        el('div', { class: 'facture-texte' }, [
          el('span', { class: 'facture-libelle', texte: c.libelle || 'Contrat' }),
          el('span', { class: 'texte-3', texte: periode }),
        ]),
        el('div', { class: 'tache-meta' }, [
          enCours ? pastille('En vigueur', { or: true }) : pastille(c.dateDebut > maintenant ? 'À venir' : 'Terminé'),
          url ? el('a', { class: 'lien-fiche', href: url, target: '_blank', rel: 'noopener noreferrer' }, [icone('lien', 16), 'Ouvrir']) : el('span', { class: 'texte-3', texte: 'Lien invalide' }),
          el('button', { type: 'button', class: 'btn btn-discret btn-mini', 'aria-label': `Retirer le contrat ${c.libelle || ''}`, texte: 'Retirer', onclick: () => supprimerContrat(p.id, c.id).catch(signaler) }),
        ]),
      ]);
    }) : [el('p', { class: 'note-bas', texte: 'Aucun contrat.' })]),
  ]);
}

function ouvrirFormulaireContrat(p) {
  const lien = el('input', { class: 'champ', type: 'url', placeholder: 'https://' });
  const debut = el('input', { class: 'champ', type: 'date', value: versChamp(Date.now()) });
  const fin = el('input', { class: 'champ', type: 'date' });
  const lib = el('input', { class: 'champ', type: 'text', maxlength: '200', placeholder: 'Ex : Contrat de prospection' });
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;
  const ok = bouton('Ajouter', { variante: 'principal' });
  const annuler = bouton('Annuler');
  const { fermer } = fenetre(`Contrat avec ${p.nom}`, el('div', { class: 'formulaire' }, [
    champ('Lien vers le contrat', lien),
    el('div', { class: 'groupes-ligne' }, [champ('Début', debut), champ('Fin (facultatif)', fin)]),
    champ('Libellé', lib),
    erreur,
  ]), [annuler, ok]);
  annuler.addEventListener('click', fermer);
  lien.focus();
  ok.addEventListener('click', async () => {
    erreur.hidden = true;
    if (!lienSur(lien.value)) { erreur.textContent = 'Le lien doit commencer par https://'; erreur.hidden = false; return; }
    if (!debut.value) { erreur.textContent = 'La date de début est obligatoire.'; erreur.hidden = false; return; }
    ok.disabled = true;
    try {
      await ajouterContrat(p.id, { libelle: lib.value.trim(), dateDebut: versMs(debut.value), dateFin: versMs(fin.value), lien: lien.value });
      fermer();
    } catch (e) { erreur.textContent = e.message; erreur.hidden = false; ok.disabled = false; }
  });
}

function panneauNotes(p, signaler) {
  const notes = liste(p.notes).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const saisie = el('textarea', { class: 'champ', maxlength: '5000', rows: '3', placeholder: 'Ajouter une note...', 'aria-label': 'Nouvelle note' });
  const ajouter = bouton('Ajouter la note', { class: 'btn btn-secondaire btn-mini' });
  ajouter.addEventListener('click', async () => {
    if (!saisie.value.trim()) { saisie.focus(); return; }
    ajouter.disabled = true;
    try { await ajouterNotePrestataire(p.id, saisie.value); } catch (e) { signaler(e); ajouter.disabled = false; }
  });
  return el('div', { class: 'bloc-fiche', role: 'tabpanel' }, [
    saisie,
    el('div', {}, [ajouter]),
    ...(notes.length ? notes.map((n) => el('div', { class: 'note' }, [
      el('span', { class: 'texte-3', texte: `${n.createdAt ? dateCourte(n.createdAt) : ''} · ${n.auteur === 'antoine' ? 'Antoine' : n.auteur || ''}` }),
      el('p', { class: 'note-texte', texte: n.texte }),
    ])) : [el('p', { class: 'note-bas', texte: 'Aucune note.' })]),
  ]);
}

function ouvrirFormulaireFacture(p) {
  const date = el('input', { class: 'champ', type: 'date', value: versChamp(Date.now()) });
  const lib = el('input', { class: 'champ', type: 'text', maxlength: '200', placeholder: 'Ex : Prospection novembre' });
  const montant = el('input', { class: 'champ', type: 'number', min: '0', step: '0.01' });
  const lien = el('input', { class: 'champ', type: 'url', placeholder: 'https://' });
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;
  const ok = bouton('Ajouter', { variante: 'principal' });
  const annuler = bouton('Annuler');
  const { fermer } = fenetre(`Facture de ${p.nom}`, el('div', { class: 'formulaire' }, [
    champ('Lien vers la facture', lien),
    el('div', { class: 'groupes-ligne' }, [champ('Date', date), champ('Montant (€)', montant)]),
    champ('Libellé', lib),
    erreur,
  ]), [annuler, ok]);
  annuler.addEventListener('click', fermer);
  lien.focus();
  ok.addEventListener('click', async () => {
    erreur.hidden = true;
    if (!lienSur(lien.value)) { erreur.textContent = 'Le lien doit commencer par https://'; erreur.hidden = false; return; }
    if (!date.value) { erreur.textContent = 'La date est obligatoire.'; erreur.hidden = false; return; }
    ok.disabled = true;
    try {
      await ajouterFacture(p.id, { date: versMs(date.value), libelle: lib.value.trim(), montant: montant.value === '' ? null : Number(montant.value), lien: lien.value });
      fermer();
    } catch (e) { erreur.textContent = e.message; erreur.hidden = false; ok.disabled = false; }
  });
}

function ouvrirFormulaire(p) {
  const nom = el('input', { class: 'champ', type: 'text', maxlength: '200', value: p ? p.nom : '' });
  const loc = el('input', { class: 'champ', type: 'text', maxlength: '200', value: p && p.localisation ? p.localisation : '', placeholder: 'Ville, pays' });
  const statut = el('select', { class: 'champ' }, STATUTS_PRESTATAIRE.map((s) => el('option', { value: s.id, texte: s.label, selected: (p ? p.statut : 'en_cours') === s.id })));
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;
  const ok = bouton(p ? 'Enregistrer' : 'Créer', { variante: 'principal' });
  const annuler = bouton('Annuler');
  const { fermer } = fenetre(p ? 'Modifier le prestataire' : 'Nouveau prestataire', el('div', { class: 'formulaire' }, [
    champ('Nom', nom),
    el('div', { class: 'groupes-ligne' }, [champ('Localisation', loc), champ('Statut', statut)]),
    erreur,
  ]), [annuler, ok]);
  annuler.addEventListener('click', fermer);
  nom.focus();
  ok.addEventListener('click', async () => {
    erreur.hidden = true;
    const champs = { nom: nom.value.trim(), localisation: loc.value.trim() || null, statut: statut.value };
    if (!champs.nom) { erreur.textContent = 'Le nom est obligatoire.'; erreur.hidden = false; nom.focus(); return; }
    ok.disabled = true;
    try {
      if (p) await modifier('prestataires', p.id, champs);
      else selection = await creer('prestataires', champs);
      fermer();
    } catch (e) { erreur.textContent = e.message; erreur.hidden = false; ok.disabled = false; }
  });
}

function confirmerSuppression(p) {
  const nbF = liste(p.factures).length;
  const nbN = liste(p.notes).length;
  const nbC = liste(p.contrats).length;
  const saisie = el('input', { class: 'champ', type: 'text', autocomplete: 'off', placeholder: p.nom });
  const erreur = el('p', { class: 'form-erreur', role: 'alert' });
  erreur.hidden = true;
  const supprimer = bouton('Supprimer définitivement', { class: 'btn btn-danger-plein', disabled: true });
  const annuler = bouton('Annuler', { variante: 'principal' });
  const details = [nbF ? `${nbF} facture${nbF > 1 ? 's' : ''}` : null, nbC ? `${nbC} contrat${nbC > 1 ? 's' : ''}` : null, nbN ? `${nbN} note${nbN > 1 ? 's' : ''}` : null].filter(Boolean).join(', ');
  const { fermer } = fenetre('Supprimer le prestataire ?', el('div', { class: 'formulaire' }, [
    el('p', { class: 'sans-marge', texte: `« ${p.nom} » sera supprimé définitivement${details ? `, avec ses ${details}` : ''}. Les fichiers eux-mêmes (factures, contrats) ne sont pas touchés.` }),
    el('p', { class: 'texte-2 sans-marge', texte: 'Pour le garder sans le suivre, passe-le plutôt en Arrêté.' }),
    champ('Tape le nom pour confirmer', saisie),
    erreur,
  ]), [supprimer, annuler]);
  annuler.addEventListener('click', fermer);
  saisie.focus();
  saisie.addEventListener('input', () => { supprimer.disabled = saisie.value.trim() !== p.nom.trim(); });
  supprimer.addEventListener('click', async () => {
    supprimer.disabled = true;
    try { await supprimerPrestataire(p.id); selection = null; fermer(); } catch (e) { erreur.textContent = e.message; erreur.hidden = false; supprimer.disabled = false; }
  });
}
