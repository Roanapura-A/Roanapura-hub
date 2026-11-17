// Fenêtre Capture. Étape 1 : ouverture/fermeture. Enregistrement dans l'Inbox en étape 3.
import { el, bouton } from '../ui.js';

let dialogue = null;

function construire() {
  const champ = el('input', { id: 'capture-champ', class: 'champ champ-grand', type: 'text', autocomplete: 'off', placeholder: 'Une idée, une tâche, un truc à rappeler...', disabled: true });
  dialogue = el('dialog', { class: 'capture', 'aria-labelledby': 'capture-titre' }, [
    el('div', { class: 'capture-haut' }, [
      el('label', { id: 'capture-titre', for: 'capture-champ', class: 'capture-titre', texte: 'Capturer' }),
      el('span', { class: 'texte-3', texte: 'Échap pour fermer' }),
    ]),
    champ,
    el('div', { class: 'capture-bas' }, [
      el('span', { class: 'texte-3', texte: "Disponible à l'étape 3 : Entrée rangera la note dans l'Inbox." }),
      bouton('Fermer', { onclick: fermer }),
    ]),
  ]);
  dialogue.addEventListener('click', (e) => { if (e.target === dialogue) fermer(); });
  document.body.appendChild(dialogue);
}

export function ouvrir() {
  if (!dialogue) construire();
  if (!dialogue.open) dialogue.showModal();
}

export function fermer() {
  if (dialogue && dialogue.open) dialogue.close();
}
