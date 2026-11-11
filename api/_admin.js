import { initializeApp, cert, getApps } from "firebase-admin/app";

// Firebase Admin, shared by the server functions. (Files starting with _ in
// api/ aren't routes of their own.)
export function admin() {
  if (!getApps().length) initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: "https://cbs-ryder-cup-default-rtdb.firebaseio.com",
  });
}
