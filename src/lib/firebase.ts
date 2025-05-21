// src/lib/firebase.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth, GoogleAuthProvider } from "firebase/auth"; // Added GoogleAuthProvider
import { getFirestore, type Firestore } from "firebase/firestore";

// IMPORTANT: Remplacez ceci par la configuration réelle de votre projet Firebase
// Vous trouverez ces informations dans la console Firebase :
// Paramètres du projet > Général > Vos applications > Application Web > SDK setup & configuration
const firebaseConfig = {
  apiKey: "AIzaSyBaIqMl3x5Y2DcHn-9xsZLhSS3jOG_oVP8",
  authDomain: "life-insights-gv75d.firebaseapp.com",
  projectId: "life-insights-gv75d",
  storageBucket: "life-insights-gv75d.firebasestorage.app",
  messagingSenderId: "1093739890237",
  appId: "1:1093739890237:web:7d353c8d933ffeb7468c54"
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
const googleProvider = new GoogleAuthProvider(); // Added GoogleAuthProvider instance

export { app, auth, db, googleProvider }; // Exported googleProvider
