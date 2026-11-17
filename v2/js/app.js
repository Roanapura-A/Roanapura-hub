// Point d'entrée : affiche connexion / refus / appli selon la session.

import { surChangementSession, seConnecter, seDeconnecter } from './auth.js?v=5';
import { ecouterConnexionReseau } from './donnees.js?v=5';
import { demarrer, arreter, ECRANS } from './navigation.js?v=5';
import { ouvrir as ouvrirCapture } from './ecrans/capture.js?v=5';
import { el, vider, bouton, afficherHorsLigne } from './ui.js?v=5';
import { icone } from './icones.js?v=5';

const racine = document.getElementById('app');
let stopReseau = null;

function ecranConnexion({ titre, texte, erreur } = {}) {
  arreter();
  if (stopReseau) { stopReseau(); stopReseau = null; }
  afficherHorsLigne(false);
  const msg = el('p', { class: 'connexion-erreur', role: 'alert', texte: erreur || '' });
  msg.hidden = !erreur;
  const btn = bouton('Se connecter avec Google', { variante: 'principal' });
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    msg.hidden = true;
    try {
      await seConnecter();
    } catch (e) {
      if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        msg.textContent = 'Connexion impossible : ' + (e.message || e.code);
        msg.hidden = false;
      }
    } finally {
      btn.disabled = false;
    }
  });
  vider(racine).appendChild(el('main', { class: 'connexion' }, [
    el('div', { class: 'connexion-carte' }, [
      el('span', { class: 'logo', 'aria-hidden': 'true', texte: 'R' }),
      el('h1', { class: 'connexion-titre', texte: titre || 'Roanapura Hub' }),
      el('p', { class: 'connexion-texte', texte: texte || 'Connecte-toi pour accéder à ton QG.' }),
      btn,
      msg,
    ]),
  ]));
}

function coquille(session) {
  const boutonsNav = {};
  const nav = el('nav', { class: 'rail', 'aria-label': 'Navigation principale' }, [
    el('span', { class: 'logo rail-logo', 'aria-hidden': 'true', texte: 'R' }),
    ...ECRANS.map((e) => {
      const a = el('a', { class: 'rail-lien', href: `#${e.id}` }, [icone(e.icone), el('span', { texte: e.label })]);
      boutonsNav[e.id] = a;
      return a;
    }),
    el('button', { class: 'rail-capture', type: 'button', 'aria-label': 'Capturer', title: 'Capturer', onclick: ouvrirCapture }, [icone('plus')]),
  ]);

  const contenu = el('main', { id: 'contenu', class: 'contenu', tabindex: '-1' });
  const barre = el('header', { class: 'barre' }, [
    el('span', { class: 'barre-titre', texte: 'Roanapura Hub' }),
    el('div', { class: 'barre-droite' }, [
      el('span', { class: 'barre-utilisateur', texte: session.utilisateur.nom }),
      bouton('Déconnexion', { variante: 'discret', icone: 'sortie', onclick: () => seDeconnecter() }),
    ]),
  ]);

  vider(racine).appendChild(el('div', { class: 'appli' }, [nav, el('div', { class: 'colonne' }, [barre, contenu])]));

  demarrer(contenu, (id) => {
    for (const [k, a] of Object.entries(boutonsNav)) {
      if (k === id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    }
  });

  if (stopReseau) stopReseau();
  stopReseau = ecouterConnexionReseau((connecte) => afficherHorsLigne(!connecte));
}

// Raccourci clavier global : C ouvre la capture (hors champ de saisie).
document.addEventListener('keydown', (e) => {
  if (e.key !== 'c' && e.key !== 'C') return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (!document.querySelector('.appli')) return;
  e.preventDefault();
  ouvrirCapture();
});

surChangementSession((s) => {
  if (s.etat === 'autorise') coquille(s);
  else if (s.etat === 'refuse') ecranConnexion({ titre: 'Accès refusé', texte: `Le compte ${s.email || ''} n'a pas accès à ce hub.` });
  else if (s.etat === 'erreur') ecranConnexion({ erreur: s.message });
  else ecranConnexion();
});
