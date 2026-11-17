// Connexion Google + contrôle de la liste d'accès.
// La vraie sécurité est dans les règles RTDB : ici on ne fait qu'adapter l'affichage.

import { ADMIN_EMAIL } from './config.js?v=3';
import { lireAcces, definirUtilisateur } from './donnees.js?v=3';

/* global firebase */
const auth = firebase.auth();
const fournisseur = new firebase.auth.GoogleAuthProvider();

export function seConnecter() {
  return auth.signInWithPopup(fournisseur);
}

export function seDeconnecter() {
  definirUtilisateur(null);
  return auth.signOut();
}

// callback({ etat: 'deconnecte' | 'refuse' | 'autorise' | 'erreur', utilisateur, estAdmin, message })
export function surChangementSession(callback) {
  return auth.onAuthStateChanged(async (u) => {
    if (!u) {
      definirUtilisateur(null);
      callback({ etat: 'deconnecte' });
      return;
    }
    try {
      const acces = await lireAcces(u.uid);
      const adminParEmail = u.email === ADMIN_EMAIL && u.emailVerified === true;
      if (!acces && !adminParEmail) {
        await auth.signOut();
        callback({ etat: 'refuse', email: u.email });
        return;
      }
      definirUtilisateur(u.uid);
      callback({
        etat: 'autorise',
        utilisateur: { uid: u.uid, nom: u.displayName || u.email, email: u.email },
        estAdmin: adminParEmail || (acces && acces.role === 'admin'),
      });
    } catch (e) {
      callback({ etat: 'erreur', message: messageErreur(e) });
    }
  });
}

function messageErreur(e) {
  if (e && e.code === 'PERMISSION_DENIED') return "Accès refusé par la base de données.";
  return (e && e.message) || 'Erreur inconnue.';
}
