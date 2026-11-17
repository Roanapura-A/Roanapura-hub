// Écran Aujourd'hui. Étape 1 : coquille. Contenu réel en étape 6.
import { el, enTete, etatVide, dateLongue } from '../ui.js';

export function afficher(conteneur) {
  conteneur.appendChild(enTete("Aujourd'hui", dateLongue()));
  conteneur.appendChild(el('section', { class: 'carte' }, [
    etatVide('Écran en construction', "La mission, la liste du jour et les relances arriveront ici."),
  ]));
}
