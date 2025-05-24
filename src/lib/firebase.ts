
// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// ========================================================================= //
// !! CONFIGURATION FIREBASE MISE À JOUR AVEC VOS IDENTIFIANTS !!
// ========================================================================= //
const firebaseConfig = {
  apiKey: "AIzaSyBaIqMl3x5Y2DcHn-9xsZLhSS3jOG_oVP8",
  authDomain: "life-insights-gv75d.firebaseapp.com",
  projectId: "life-insights-gv75d",
  storageBucket: "life-insights-gv75d.appspot.com", // Correction: .appspot.com est plus courant pour storageBucket
  messagingSenderId: "1093739890237",
  appId: "1:1093739890237:web:7d353c8d933ffeb7468c54"
  // measurementId: "VOTRE_MEASUREMENT_ID_FIREBASE_ICI" // measurementId est optionnel
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
    // throw new Error("Firebase configuration is likely missing or incomplete. Please check src/lib/firebase.ts and ensure all placeholder values are replaced with your actual Firebase project credentials.");
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
