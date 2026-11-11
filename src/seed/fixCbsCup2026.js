/**
 * ONE-TIME FIX: CBS Ryder Cup 2026 (Wild Dunes) — correct player names.
 *
 * Every result and margin on the board was right, but Saturday's five
 * fourballs had the wrong players on them (checked against the original
 * pairing sheet), and Sunday's last singles named Hunter's opponent "Kimball",
 * a duplicate of Ryan. Only names change: each tee time keeps its hole-by-hole
 * scores, so the 13½–5½ final is untouched.
 *
 * Refuses unless the cup still has the old names, so it's safe to press twice.
 */

import { db, ref, get, update } from "../firebase";

const CUP = "cups/cbs-ryder-cup-2026";

// [current names] → [correct names], as [player1a, player1b, player2a, player2b];
// side 1 is Gabby's Interns, side 2 Tiger's DDs.
const FIXES = {
  m201: [["Ian", "Hunter", "Henry", "Russell"], ["Ian", "Clark", "Sam", "Russell"]],
  m202: [["Gabe", "Tim", "Geb", "Ryan"], ["Sushil", "Tyler T.", "Geb", "Ryan"]],
  m203: [["Naman", "Sushil", "Tony", "Jake"], ["Gabe", "Hunter", "Henry", "Destin"]],
  m204: [["Logan", "Clark", "Sam", "Destin"], ["Colin", "Logan", "Spencer", "Jake"]],
  m205: [["Tyler T.", "Colin", "Tyler S.", "Spencer"], ["Naman", "Tim", "Tony", "Tyler S."]],
  m309: [["Hunter", null, "Kimball", null], ["Hunter", null, "Ryan", null]],
};
const SLOTS = ["player1a", "player1b", "player2a", "player2b"];

export async function fixCBSCup2026() {
  const matches = (await get(ref(db, `${CUP}/matches`))).val() || {};
  const wrong = Object.entries(FIXES).filter(([id, [from]]) =>
    SLOTS.some((s, i) => (matches[id]?.[s] ?? null) !== from[i]));
  if (wrong.length) throw new Error(`Already fixed or changed since: ${wrong.map(([id]) => id).join(", ")}`);

  const changes = {};
  for (const [id, [, to]] of Object.entries(FIXES)) SLOTS.forEach((s, i) => { changes[`matches/${id}/${s}`] = to[i]; });
  changes["players/kimball"] = null; // the duplicate; Ryan is already on the roster
  await update(ref(db, CUP), changes);
  console.log("Fixed Saturday's five pairings and Sunday's Hunter v Ryan.");
}
