import { db, ref, get, set } from "../firebase";
import { getTeams } from "./teams";

// Join a cup by its invite code: adds it to the user's cup list. The database
// rules only let a cup's members change it, and only accept a membership that
// carries the cup's invite code, so the code is stored on the membership.
// Resolves to the cup id; rejects with a user-facing message.
export async function joinCup(user, rawCode, expectedCupId = null) {
  const code = String(rawCode || "").trim().toUpperCase();
  if (!code) throw new Error("Enter the invite code.");
  const codeSnap = await get(ref(db, `inviteCodes/${code}`));
  if (!codeSnap.exists()) throw new Error("That invite code wasn't found. Check it with the organiser.");
  const cupId = codeSnap.val();
  if (expectedCupId && cupId !== expectedCupId) throw new Error("That code is for a different cup.");
  const metaSnap = await get(ref(db, `cups/${cupId}/meta`));
  if (!metaSnap.exists()) throw new Error("That cup no longer exists.");
  const meta = metaSnap.val();
  await set(ref(db, `users/${user.uid}/cups/${cupId}`), {
    name: meta.name,
    teams: getTeams(meta).map(t => ({ id: t.id, name: t.name, short: t.short, color: t.color })),
    teamAName: meta.teamAName || null, teamBName: meta.teamBName || null,
    createdAt: meta.createdAt,
    inviteCode: meta.inviteCode,
  });
  return cupId;
}
