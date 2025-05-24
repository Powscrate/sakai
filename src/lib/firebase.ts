
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
  apiKey: "VOTRE_CLE_API_FIREBASE_ICI", // <- REMPLACEZ PAR VOTRE VRAIE CLÉ API
  authDomain: "VOTRE_AUTH_DOMAIN_FIREBASE_ICI", // <- REMPLACEZ (ex: monprojet.firebaseapp.com)
  projectId: "VOTRE_ID_DE_PROJET_FIREBASE_ICI", // <- REMPLACEZ (ex: monprojet-12345)
  storageBucket: "VOTRE_STORAGE_BUCKET_FIREBASE_ICI", // <- REMPLACEZ (ex: monprojet.appspot.com)
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID_FIREBASE_ICI", // <- REMPLACEZ (ex: 123456789012)
  appId: "VOTRE_APP_ID_FIREBASE_ICI", // <- REMPLACEZ (ex: 1:123456789012:web:abcdef123456abcdef)
  // measurementId: "VOTRE_MEASUREMENT_ID_FIREBASE_ICI" // Optionnel, mais incluez-le si présent dans votre config Firebase
};

// Initialiser Firebase
let app: FirebaseApp;
if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully with Project ID:", firebaseConfig.projectId);
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Vérifiez si les champs essentiels sont des placeholders
    if (firebaseConfig.apiKey.startsWith("VOTRE_") || firebaseConfig.projectId.startsWith("VOTRE_")) {
        console.error("CRITICAL: Firebase configuration appears to be using placeholder values. Please update src/lib/firebase.ts with your actual project credentials.");
        alert("Erreur de configuration Firebase : Veuillez vérifier vos identifiants Firebase dans src/lib/firebase.ts.");
    }
    throw new Error("Firebase configuration is likely missing or incomplete. Please check src/lib/firebase.ts and ensure all placeholder values are replaced with your actual Firebase project credentials.");
  }
  
} else {
  app = getApp();
  if (app.options.projectId !== firebaseConfig.projectId) {
    console.warn("Firebase app already initialized with a different Project ID. This might lead to unexpected behavior if multiple Firebase projects are intended.");
  }
}

const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider(); 

export { app, auth, db, googleProvider };
