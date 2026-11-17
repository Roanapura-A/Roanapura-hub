// Écran Tâches. Étape 1 : coquille. Contenu réel en étape 4.
import { el, enTete, etatVide } from '../ui.js';

export function afficher(conteneur) {
  conteneur.appendChild(enTete('Tâches', 'Matrice d\'Eisenhower'));
  conteneur.appendChild(el('section', { class: 'carte' }, [
    etatVide('Écran en construction', 'La matrice et la liste des tâches arriveront ici.'),
  ]));
}
