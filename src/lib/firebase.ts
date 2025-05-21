
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// IMPORTANT: Remplacez ceci par la configuration réelle de votre projet Firebase
// Vous trouverez ces informations dans la console Firebase :
// Paramètres du projet > Général > Vos applications > Application Web > SDK setup & configuration
const firebaseConfig = {
  apiKey: "VOTRE_VRAIE_API_KEY_ICI",
  authDomain: "VOTRE_VRAI_AUTH_DOMAIN_ICI.firebaseapp.com",
  projectId: "VOTRE_VRAI_PROJECT_ID_ICI",
  storageBucket: "VOTRE_VRAI_STORAGE_BUCKET_ICI.appspot.com",
  messagingSenderId: "VOTRE_VRAI_MESSAGING_SENDER_ID_ICI",
  appId: "VOTRE_VRAIE_APP_ID_ICI",
  // measurementId est optionnel, mais si vous l'avez, incluez-le.
  // measurementId: "G-VOTRE_MEASUREMENT_ID_ICI"
};

// Initialiser Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

export { app, auth, db };
