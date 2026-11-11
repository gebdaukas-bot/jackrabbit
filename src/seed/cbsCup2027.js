/**
 * SEED: CBS Ryder Cup 2027 — Sea Pines, Hilton Head, Feb 26–28 2027
 *
 * Builds the cup from cbsCup2027.json (the trip sheet export), as a four-team cup:
 * White / Blue / Grey / Black. Run from /seed as the admin.
 *
 * The draft hasn't happened yet, so only the captains are on a team and most
 * player slots are empty. After the draft, fill in the players (and `team` on
 * each guest) in the JSON and run the seed again: a re-run rewrites players +
 * matches only, keeping meta and days (so course edits made in the app
 * survive), and refuses once any score has been entered.
 *
 * Match IDs follow the app scheme m${(dayIdx+1)*1000 + (roundIdx+1)*100 + n}:
 *   Fri          m1101–m1112  (best ball, sheet matches 1–12)
 *   Sat AM       m2101–m2106  (best ball, 13–18: every team plays each other once)
 *   Sat PM       m2201–m2212  (best ball, 19–30)
 *   Sun          m3101–m3124  (singles, 31–54; each tee time's two share a group)
 */

import { db, ref, set, get, update } from "../firebase";
import { teamsToMeta } from "../utils/teams";
import { matchStrokes } from "../utils/scoring";
import sheet from "./cbsCup2027.json";

export const CBS_2027_CUP_ID = "cbs-ryder-cup-2027";
export const CBS_2027_INVITE_CODE = "RYDERC27";

// Par and stroke index aren't in the sheet — load each course via Admin → Courses.
const placeholderCourse = name => ({ name, par: Array(18).fill(4), hcp: Array.from({ length: 18 }, (_, i) => i + 1) });

const roundById = id => sheet.rounds.find(r => r.id === id);
const fri = roundById("fri"), satAm = roundById("sat_am"), satPm = roundById("sat_pm"), sun = roundById("sun");

const days = [
  { label: "Friday — Fourballs", rounds: [{ format: "2v2 Best Ball", course: placeholderCourse(fri.course) }] },
  { label: "Saturday — 36 Holes", rounds: [
    { format: "2v2 Best Ball", course: placeholderCourse(satAm.course) },
    { format: "2v2 Best Ball", course: placeholderCourse(satPm.course) },
  ] },
  { label: "Sunday — Singles", rounds: [{ format: "Singles", course: placeholderCourse(sun.course) }] },
];

const captainTeam = Object.fromEntries(sheet.teams.map(t => [t.captain, t.id]));
const hcpOf = name => sheet.guests.find(g => g.name === name)?.handicap_value ?? 0;

// "2027-02-26T13:03" → "1:03 PM"; a TBD tee time stays blank.
function teeTime(iso) {
  if (!iso) return "";
  const [h, m] = iso.slice(11, 16).split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const slot = name => ({ name: name || "", hcp: name ? hcpOf(name) : 0 });

function bestBall(g) {
  const m = g.matches[0];
  const [a1, a2] = [0, 1].map(i => slot(m.team1_players[i]));
  const [b1, b2] = [0, 1].map(i => slot(m.team2_players[i]));
  return {
    teeTime: teeTime(g.tee_time), format: "2v2 Best Ball",
    teamA: m.team1, teamB: m.team2,
    player1a: a1.name, hcp1a: a1.hcp, player1b: a2.name, hcp1b: a2.hcp,
    player2a: b1.name, hcp2a: b1.hcp, player2b: b2.name, hcp2b: b2.hcp,
    companionId: null,
  };
}

function single(g, m, companionId) {
  const a = slot(m.player1), b = slot(m.player2);
  return {
    teeTime: teeTime(g.tee_time), format: "Singles",
    teamA: m.team1, teamB: m.team2,
    player1a: a.name, hcp1a: a.hcp, player1b: null, hcp1b: 0,
    player2a: b.name, hcp2a: b.hcp, player2b: null, hcp2b: 0,
    companionId,
  };
}

// Strokes off the low man in each match. With the placeholder courses that's
// just the rounded indexes; loading the real tees in Admin → Courses re-strokes
// every match that hasn't started, from slope and rating.
const stroked = (m, round) => (m.player1a && m.player2a
  ? { ...m, ...matchStrokes(m, hcpOf, round.course, m.format) } : m);

function buildMatches() {
  const matches = {};
  fri.groups.forEach((g, i) => { matches[`m${1101 + i}`] = bestBall(g); });
  satAm.groups.forEach((g, i) => { matches[`m${2101 + i}`] = bestBall(g); });
  satPm.groups.forEach((g, i) => { matches[`m${2201 + i}`] = bestBall(g); });
  sun.groups.forEach((g, i) => {
    const id = 3101 + i * 2;
    matches[`m${id}`] = single(g, g.matches[0], id + 1);
    matches[`m${id + 1}`] = single(g, g.matches[1], id);
  });
  const roundOf = id => { const n = parseInt(id.slice(1)); return days[Math.floor(n / 1000) - 1].rounds[Math.floor((n % 1000) / 100) - 1]; };
  for (const id of Object.keys(matches)) matches[id] = stroked(matches[id], roundOf(id));
  return matches;
}

// Everyone on the sheet. Team comes from an explicit `team` (post-draft) or the
// captain list; undrafted players have none yet.
function buildPlayers() {
  const players = {};
  for (const g of sheet.guests) {
    players[g.name.toLowerCase().replace(/\s+/g, "_")] = {
      name: g.name,
      team: g.team || captainTeam[g.name] || null,
      hcp: g.handicap_value ?? 0,
    };
  }
  return players;
}

const meta = {
  name: sheet.event,
  // Explicit shorts: initials would give TW/TB/TG and a collision for Black.
  ...teamsToMeta(sheet.teams.map(({ id, name, color }) => ({ id, name, color, short: id.toUpperCase() }))),
  inviteCode: CBS_2027_INVITE_CODE,
  status: "active",
  adminPlayers: ["Geb Daukas"],
};

export async function seedCBSCup2027(adminUid) {
  const base = `cups/${CBS_2027_CUP_ID}`;
  const players = buildPlayers(), matches = buildMatches();

  const existing = await get(ref(db, `${base}/meta`));
  if (existing.exists()) {
    const scores = await get(ref(db, `${base}/scores`));
    if (scores.exists()) throw new Error("Scores already entered — refusing to overwrite matches.");
    console.log("Cup exists — updating teams, players and matches...");
    // Team names and colors follow the sheet too (Team White is white).
    const t = teamsToMeta(sheet.teams.map(({ id, name, color }) => ({ id, name, color, short: id.toUpperCase() })));
    await update(ref(db, `${base}/meta`), t);
    await set(ref(db, `${base}/players`), players);
    await set(ref(db, `${base}/matches`), matches);
    console.log(`Updated ${Object.keys(players).length} players, ${Object.keys(matches).length} matches.`);
    return { cupId: CBS_2027_CUP_ID, inviteCode: CBS_2027_INVITE_CODE };
  }

  const codeOwner = await get(ref(db, `inviteCodes/${CBS_2027_INVITE_CODE}`));
  if (codeOwner.exists() && codeOwner.val() !== CBS_2027_CUP_ID) throw new Error(`Invite code ${CBS_2027_INVITE_CODE} is already taken.`);

  const createdAt = Date.now();
  console.log("Seeding CBS Ryder Cup 2027...");
  await set(ref(db, `${base}/meta`), { ...meta, createdBy: adminUid, createdAt });
  await set(ref(db, `${base}/players`), players);
  for (let i = 0; i < days.length; i++) await set(ref(db, `${base}/days/${i}`), days[i]);
  await set(ref(db, `${base}/matches`), matches);
  await set(ref(db, `inviteCodes/${CBS_2027_INVITE_CODE}`), CBS_2027_CUP_ID);
  await set(ref(db, `users/${adminUid}/cups/${CBS_2027_CUP_ID}`), {
    name: meta.name, teams: meta.teams, teamAName: meta.teamAName, teamBName: meta.teamBName, createdAt,
  });
  console.log(`Seeded ${Object.keys(players).length} players, ${Object.keys(matches).length} matches.`);
  return { cupId: CBS_2027_CUP_ID, inviteCode: CBS_2027_INVITE_CODE };
}

// Exposed for a dry run: inspect what would be written without touching Firebase.
export const preview2027 = () => ({ meta, days, players: buildPlayers(), matches: buildMatches() });
