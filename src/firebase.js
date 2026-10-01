import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get, push, update } from "firebase/database";
import { getAuth, initializeAuth, indexedDBLocalPersistence, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { Capacitor } from "@capacitor/core";

const firebaseConfig = {
  apiKey: "AIzaSyDTzfm5qck08_2I_zNF9pU_WwHXzuo-k7s",
  authDomain: "cbs-ryder-cup.firebaseapp.com",
  databaseURL: "https://cbs-ryder-cup-default-rtdb.firebaseio.com",
  projectId: "cbs-ryder-cup",
  storageBucket: "cbs-ryder-cup.firebasestorage.app",
  messagingSenderId: "560716965486",
  appId: "1:560716965486:web:fef90182c6c9ba508c687f",
  measurementId: "G-93S5XFF26J"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);
// Inside the iOS app the web SDK's default popup/redirect resolver can't run, so skip it and
// sign in via the native plugin (see Login.jsx) instead.
const isNative = Capacitor.isNativePlatform();
const auth = isNative ? initializeAuth(app, { persistence: indexedDBLocalPersistence }) : getAuth(app);

// The native app serves its pages from capacitor://localhost, so relative /api calls must go to the live site.
const apiUrl = (path) => (isNative ? "https://dormie-golf.vercel.app" : "") + path;
const googleProvider = new GoogleAuthProvider();

export { isNative, apiUrl, db, ref, onValue, set, get, push, update, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged };
