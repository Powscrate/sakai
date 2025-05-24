
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// ========================================================================= //
// !! IMPORTANT !! IMPORTANT !! IMPORTANT !! IMPORTANT !! IMPORTANT !!
//
// REMPLACEZ LES VALEURS CI-DESSOUS PAR VOTRE CONFIGURATION FIREBASE RÉELLE.
// Vous trouverez ces informations dans votre console Firebase :
// Projet -> Paramètres du projet (⚙️) -> Général -> Vos applications -> SDK setup & configuration.
//
// SI CES VALEURS SONT INCORRECTES, L'AUTHENTIFICATION ET FIRESTORE ÉCHOUERONT.
//
// ========================================================================= //
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE", // <- REMPLACEZ PAR VOTRE VRAIE CLÉ API
  authDomain: "YOUR_AUTH_DOMAIN_HERE", // <- REMPLACEZ
  projectId: "YOUR_PROJECT_ID_HERE", // <- REMPLACEZ
  storageBucket: "YOUR_STORAGE_BUCKET_HERE", // <- REMPLACEZ
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE", // <- REMPLACEZ
  appId: "YOUR_APP_ID_HERE", // <- REMPLACEZ
  // measurementId: "YOUR_MEASUREMENT_ID_OPTIONAL" // Optionnel, mais incluez-le si présent dans votre config Firebase
};

// Initialiser Firebase
let app: FirebaseApp;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Vous pourriez vouloir lancer une erreur ici ou gérer d'une autre manière
    // si l'initialisation échoue à cause d'une config manifestement invalide (ex: champs manquants)
    // Toutefois, l'erreur "API key not valid" se manifestera lors du premier appel API.
    throw new Error("Firebase configuration is likely missing or incomplete. Please check src/lib/firebase.ts");
  }
  
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider(); 

export { app, auth, db, googleProvider };
