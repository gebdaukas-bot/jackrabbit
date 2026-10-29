/**
 * SEED: CBS Ryder Cup 2027 — Sea Pines, Hilton Head, Feb 26–28 2027
 *
 * Builds the cup from cbsCup2027.json (the trip sheet export), as a four-team cup:
 * White / Blue / Grey / Black. Run from /seed as the admin.
 *
 * The draft hasn't happened yet, so only the captains are on a team and every
 * group's player slots come from the sheet (null → empty slot). After the draft,
 * fill in `players` (and team on each guest) in the JSON and run the seed again:
 * a re-run rewrites players + matches only, keeping meta and days (so course
 * edits made in the app survive), and refuses once any score has been entered.
 *
 * Match IDs follow the app scheme m${(dayIdx+1)*1000 + (roundIdx+1)*100 + n}:
 *   Fri          m1101–m1112  (best ball)
 *   Sat AM       m2101–m2104  (best ball) + m2105/m2106 (group 5: two singles)
 *   Sat PM       m2201–m2212  (best ball)
 *   Sun          m3101–m3124  (two singles per group, paired as companions)
 */

import { db, ref, set, get } from "../firebase";
import { teamsToMeta } from "../utils/teams";
import sheet from "./cbsCup2027.json";

export const CBS_2027_CUP_ID = "cbs-ryder-cup-2027";
export const CBS_2027_INVITE_CODE = "RYDERC27";

// Par and stroke index aren't in the sheet — load each course via Admin → Courses.
const placeholderCourse = name => ({ name, par: Array(18).fill(4), hcp: Array.from({ length: 18 }, (_, i) => i + 1) });

const roundById = id => sheet.rounds.find(r => r.id === id);
const fri = roundById("friday"), satAm = roundById("saturday_am"), satPm = roundById("saturday_pm"), sun = roundById("sunday");

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

// Slot i of a group: the drafted player, else the tracker's prefill (slot 0 only).
const slot = (g, i) => g.players[i] || (i === 0 ? g.prefilled_in_tracker?.player1 : null) || null;

function bestBall(g) {
  const [p1a, p1b, p2a, p2b] = [0, 1, 2, 3].map(i => slot(g, i));
  return {
    teeTime: g.tee_time, format: "2v2 Best Ball",
    teamA: g.slot_teams[0], teamB: g.slot_teams[2],
    player1a: p1a || "", hcp1a: p1a ? hcpOf(p1a) : 0,
    player1b: p1b || "", hcp1b: p1b ? hcpOf(p1b) : 0,
    player2a: p2a || "", hcp2a: p2a ? hcpOf(p2a) : 0,
    player2b: p2b || "", hcp2b: p2b ? hcpOf(p2b) : 0,
    companionId: null,
  };
}

// Slots i and i+1 of a group as one singles match.
function single(g, i, companionId) {
  const a = slot(g, i), b = slot(g, i + 1);
  return {
    teeTime: g.tee_time, format: "Singles",
    teamA: g.slot_teams[i], teamB: g.slot_teams[i + 1],
    player1a: a || "", hcp1a: a ? hcpOf(a) : 0, player1b: null, hcp1b: 0,
    player2a: b || "", hcp2a: b ? hcpOf(b) : 0, player2b: null, hcp2b: 0,
    companionId,
  };
}

function buildMatches() {
  const matches = {};
  fri.groups.forEach((g, i) => { matches[`m${1101 + i}`] = bestBall(g); });
  satAm.groups.forEach((g, i) => {
    if (g.slot_teams[0] === g.slot_teams[1]) matches[`m${2101 + i}`] = bestBall(g);
    else { // the 1v1 group: two singles sharing a tee time
      const id = 2101 + i;
      matches[`m${id}`] = single(g, 0, id + 1);
      matches[`m${id + 1}`] = single(g, 2, id);
    }
  });
  satPm.groups.forEach((g, i) => { matches[`m${2201 + i}`] = bestBall(g); });
  sun.groups.forEach((g, i) => {
    const id = 3101 + i * 2;
    matches[`m${id}`] = single(g, 0, id + 1);
    matches[`m${id + 1}`] = single(g, 2, id);
  });
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
    console.log("Cup exists — updating players and matches only...");
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
