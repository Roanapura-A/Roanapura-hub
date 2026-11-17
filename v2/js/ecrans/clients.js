// Écran Clients. Étape 1 : coquille. Contenu réel en étape 5.
import { el, enTete, etatVide } from '../ui.js?v=3';

export function afficher(conteneur) {
  conteneur.appendChild(enTete('Clients', 'Fiches clients et projets internes'));
  conteneur.appendChild(el('section', { class: 'carte' }, [
    etatVide('Écran en construction', 'Le tableau des fiches et la fiche ouverte arriveront ici.'),
  ]));
}
