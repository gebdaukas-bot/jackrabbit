import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, get, push, update } from "firebase/database";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

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
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, ref, onValue, set, get, push, update, auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged };
