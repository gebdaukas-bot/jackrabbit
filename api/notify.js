import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "firebase-admin/database";
import { getMessaging } from "firebase-admin/messaging";
import { assembleDays, cupEvents } from "../src/utils/cupEvents.js";
import { admin } from "./_admin.js";

// Sends a cup's push notifications: a match finishing, a day wrapping up, the
// cup being won. Any member's app calls this after a match ends (and whenever it
// opens the cup, to catch anything missed while a phone was offline); the result
// is worked out here from the database, never taken from the caller, and
// pushSent/{cupId} records what's gone out so each one is sent exactly once.

// Cups created from here on announce everything from their first result.
const PUSH_LAUNCH = Date.UTC(2026, 10, 9);

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end(); // CORS preflight from the iOS app
  if (req.method !== "POST") return res.status(405).end();

  const { cupId } = req.body || {};
  const idToken = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (typeof cupId !== "string" || !cupId || /[.#$[\]/]/.test(cupId)) return res.status(400).json({ error: "Bad cup" });

  try {
    admin();
    const uid = (await getAuth().verifyIdToken(idToken)).uid;
    const db = getDatabase();
    const [cupSnap, memberSnap] = await Promise.all([db.ref(`cups/${cupId}`).get(), db.ref(`users/${uid}/cups/${cupId}`).get()]);
    const cup = cupSnap.val();
    if (!cup?.meta) return res.status(404).json({ error: "No such cup" });
    if (!memberSnap.exists() && cup.meta.createdBy !== uid) return res.status(403).json({ error: "Not a member" });

    const events = cupEvents(cup.meta, assembleDays(cup.days, cup.matches, cup.scores));
    const sentRef = db.ref(`pushSent/${cupId}`);

    // The first call for a cup that predates notifications only records what
    // has already happened, so turning this on doesn't replay its history.
    if (!(cup.meta.createdAt >= PUSH_LAUNCH) && !(await sentRef.get()).exists()) {
      await sentRef.set({ _start: Date.now(), ...Object.fromEntries(events.map(e => [e.key, true])) });
      return res.status(200).json({ sent: 0 });
    }

    // Claim each event before sending it; a transaction means two phones
    // calling at once can't both send the same one.
    const fresh = [];
    for (const e of events) {
      const { committed } = await sentRef.child(e.key).transaction(cur => (cur ? undefined : true));
      if (committed) fresh.push(e);
    }
    if (!fresh.length) return res.status(200).json({ sent: 0 });

    const subs = (await db.ref(`pushSubs/${cupId}`).get()).val() || {};
    const tokens = Object.entries(subs).flatMap(([u, ts]) => Object.keys(ts || {}).map(t => ({ u, t })));
    if (!tokens.length) return res.status(200).json({ sent: 0 });

    let sent = 0;
    for (const e of fresh) {
      const result = await getMessaging().sendEach(tokens.map(({ t }) => ({
        token: t,
        notification: { title: e.title, body: e.body },
        data: { cupId },
        apns: { payload: { aps: { sound: "default" } } },
      })));
      sent += result.successCount;
      // Drop tokens for phones that uninstalled the app or turned notifications off.
      await Promise.all(result.responses.map((r, i) =>
        r.error?.code === "messaging/registration-token-not-registered" || r.error?.code === "messaging/invalid-registration-token"
          ? db.ref(`pushSubs/${cupId}/${tokens[i].u}/${tokens[i].t}`).remove()
          : null));
    }
    return res.status(200).json({ sent });
  } catch (err) {
    console.error("notify failed:", err);
    return res.status(err.code?.startsWith?.("auth/") ? 401 : 500).json({ error: "Notify failed" });
  }
}
