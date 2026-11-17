// Fenêtre Capture : une note en vrac, Entrée = rangée dans l'Inbox.
import { el, bouton } from '../ui.js?v=7';
import { creer } from '../donnees.js?v=7';

let dialogue = null;
let champ = null;
let message = null;
let btnCapturer = null;
let enCours = false;

function construire() {
  champ = el('input', { id: 'capture-champ', class: 'champ champ-grand', type: 'text', autocomplete: 'off', maxlength: '2000', placeholder: 'Une idée, une tâche, un truc à rappeler...' });
  message = el('p', { class: 'capture-message', role: 'status' });
  message.hidden = true;
  btnCapturer = bouton('Capturer', { variante: 'principal', onclick: enregistrer });

  dialogue = el('dialog', { class: 'capture', 'aria-labelledby': 'capture-titre' }, [
    el('div', { class: 'capture-haut' }, [
      el('label', { id: 'capture-titre', for: 'capture-champ', class: 'capture-titre', texte: 'Capturer' }),
      el('span', { class: 'texte-3', texte: 'Échap pour fermer' }),
    ]),
    champ,
    message,
    el('div', { class: 'capture-bas' }, [
      el('span', { class: 'texte-3', texte: "Entrée : rangé dans l'Inbox" }),
      btnCapturer,
    ]),
  ]);
  champ.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); enregistrer(); }
  });
  champ.addEventListener('input', () => { message.hidden = true; });
  dialogue.addEventListener('click', (e) => { if (e.target === dialogue) fermer(); });
  document.body.appendChild(dialogue);
}

async function enregistrer() {
  if (enCours) return;
  const texte = champ.value.trim();
  if (!texte) { champ.focus(); return; }
  enCours = true;
  btnCapturer.disabled = true;
  try {
    await creer('inbox', { texte, source: 'texte', traite: false });
    champ.value = '';
    fermer();
  } catch (e) {
    // Le texte reste dans le champ pour ne rien perdre.
    message.textContent = 'Pas enregistré : ' + e.message + ' Réessaie.';
    message.hidden = false;
  } finally {
    enCours = false;
    btnCapturer.disabled = false;
  }
}

export function ouvrir() {
  if (!dialogue) construire();
  message.hidden = true;
  if (!dialogue.open) dialogue.showModal();
  champ.focus();
}

export function fermer() {
  if (dialogue && dialogue.open) dialogue.close();
}
