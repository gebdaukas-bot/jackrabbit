// Push notifications for a cup (iOS app only): signing this phone up or off, and
// asking the server to send whatever a new result calls for (see api/notify.js).
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { db, ref, set, auth, isNative, apiUrl } from "../firebase";
import { remove } from "firebase/database";

export const pushSupported = isNative;

// Whether this phone wants a cup's notifications: "on", "off", or null if the
// member hasn't been asked yet. Kept per phone, since sign-ups are per phone.
const prefKey = cupId => `jr_push_${cupId}`;
export function pushPref(cupId) {
  try { return localStorage.getItem(prefKey(cupId)); } catch { return null; }
}
function setPushPref(cupId, v) {
  try { localStorage.setItem(prefKey(cupId), v); } catch {}
}

async function currentToken() {
  const { token } = await FirebaseMessaging.getToken();
  return token;
}

// Ask for permission if needed and sign this phone up. Returns false if the
// member declined (or has notifications off for Dormie in Settings).
export async function enablePush(uid, cupId) {
  let { receive } = await FirebaseMessaging.checkPermissions();
  if (receive === "prompt" || receive === "prompt-with-rationale") ({ receive } = await FirebaseMessaging.requestPermissions());
  if (receive !== "granted") { setPushPref(cupId, "off"); return false; }
  await set(ref(db, `pushSubs/${cupId}/${uid}/${await currentToken()}`), true);
  setPushPref(cupId, "on");
  return true;
}

export async function disablePush(uid, cupId) {
  setPushPref(cupId, "off");
  try { await remove(ref(db, `pushSubs/${cupId}/${uid}/${await currentToken()}`)); } catch {}
}

// On opening a cup this phone is signed up for, re-save its token: iOS can
// issue a new one (after a restore, say), and this keeps the sign-up current.
export async function refreshPush(uid, cupId) {
  if (!pushSupported || pushPref(cupId) !== "on") return;
  try {
    const { receive } = await FirebaseMessaging.checkPermissions();
    if (receive === "granted") await set(ref(db, `pushSubs/${cupId}/${uid}/${await currentToken()}`), true);
  } catch {}
}

// Ask the server to send any notifications the cup's results now call for.
// Safe to call any number of times — each notification only ever goes out once.
export async function notifyCup(cupId) {
  try {
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken) return;
    await fetch(apiUrl("/api/notify"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ cupId }),
    });
  } catch {}
}

// Tapping a notification opens its cup.
export function onPushTapped(go) {
  if (!pushSupported) return () => {};
  const sub = FirebaseMessaging.addListener("notificationActionPerformed", e => {
    const cupId = e.notification?.data?.cupId;
    if (cupId) go(`/cup/${cupId}`);
  });
  return () => { sub.then(h => h.remove()); };
}
