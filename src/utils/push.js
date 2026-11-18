// Push notifications for a cup (iOS app only): signing this phone up or off, and
// asking the server to send whatever a new result calls for (see api/notify.js).
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { db, ref, set, get, auth, isNative, apiUrl } from "../firebase";
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

// Whether this phone said yes to notifications for all its cups when asked after
// signing in: "on", "off", or null if it hasn't been asked. With "on", each cup is
// signed up when it's opened, unless the member turned that cup off.
const ALL_KEY = "jr_push_all";
export function pushAllPref() {
  try { return localStorage.getItem(ALL_KEY); } catch { return null; }
}
function setPushAllPref(v) {
  try { localStorage.setItem(ALL_KEY, v); } catch {}
}

// Ask after sign-in only if this phone hasn't been asked and iOS would still show
// its permission prompt. A phone that already allowed or refused notifications keeps
// deciding per cup with the bell.
export async function shouldAskPush() {
  if (!pushSupported || pushAllPref() != null) return false;
  try {
    const { receive } = await FirebaseMessaging.checkPermissions();
    return receive === "prompt" || receive === "prompt-with-rationale";
  } catch { return false; }
}

// Yes to the after-sign-in question: ask iOS, then sign this phone up for every cup
// the member is in. Returns false if they declined in the iOS prompt.
export async function enablePushEverywhere(uid) {
  let { receive } = await FirebaseMessaging.requestPermissions();
  if (receive !== "granted") { setPushAllPref("off"); return false; }
  setPushAllPref("on");
  const cups = Object.keys((await get(ref(db, `users/${uid}/cups`))).val() || {});
  const token = await currentToken();
  await Promise.all(cups.filter(id => pushPref(id) !== "off").map(async id => {
    await set(ref(db, `pushSubs/${id}/${uid}/${token}`), true);
    setPushPref(id, "on");
  }));
  return true;
}

export function declinePushEverywhere() {
  setPushAllPref("off");
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
