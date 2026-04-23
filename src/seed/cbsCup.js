/**
 * ONE-TIME MIGRATION: CBS Ryder Cup 2026
 *
 * This seeds the existing CBS Ryder Cup trip into the new multi-tenant structure.
 * Run this once from the browser console after logging in as the admin (Geb).
 * It copies data from the old Firebase paths (matches/m*) to cups/cbs-ryder-cup-2026/
 *
 * Usage: import and call seedCBSCup(user) from the browser console.
 */

import { db, ref, set, get } from "../firebase";

const CBS_CUP_ID = "cbs-ryder-cup-2026";
const INVITE_CODE = "RYDERC26";

const meta = {
  name: "CBS Ryder Cup 2026",
  teamAName: "GABBY'S INTERNS",
  teamBName: "TIGER'S DDs",
  teamAColor: "#C8102E",
  teamBColor: "#003087",
  inviteCode: INVITE_CODE,
  status: "complete",
};

const days = [
  {
    label: "Friday — Fourballs",
    format: "Fourballs",
    course: {
      name: "Wild Dunes — Links Course",
      par: [5,4,4,3,5,4,4,3,4, 4,4,3,4,5,4,3,4,3],
      hcp: [11,13,5,17,7,3,9,15,1, 12,10,16,2,14,8,18,6,4],
    },
  },
  {
    label: "Saturday — Fourballs",
    format: "Fourballs",
    course: {
      name: "Wild Dunes — Harbor Course",
      par: [5,4,3,4,3,4,3,5,5, 4,3,4,3,5,4,3,4,4],
      hcp: [5,3,17,1,13,11,15,7,9, 10,18,6,14,12,8,16,2,4],
    },
  },
  {
    label: "Sunday — Singles",
    format: "Singles",
    course: {
      name: "Charleston National",
      par: [4,3,4,4,5,4,3,4,5, 5,4,5,4,3,4,3,4,3],
      hcp: [3,17,5,11,13,15,9,1,7, 10,2,12,4,14,8,18,6,16],
    },
  },
];

const matches = {
  // Friday
  m101: { teeTime:"11:10", player1a:"Gabe",   hcp1a:0, player1b:"Naman",    hcp1b:0, player2a:"Henry",   hcp2a:0, player2b:"Spencer",  hcp2b:0, companionId:null },
  m102: { teeTime:"11:15", player1a:"Logan",  hcp1a:0, player1b:"Tyler T.", hcp1b:0, player2a:"Geb",     hcp2a:0, player2b:"Tony",     hcp2b:0, companionId:null },
  m103: { teeTime:"11:20", player1a:"Colin",  hcp1a:0, player1b:"Ian",      hcp1b:0, player2a:"Sam",     hcp2a:0, player2b:"Ryan",     hcp2b:0, companionId:null },
  m104: { teeTime:"11:30", player1a:"Hunter", hcp1a:0, player1b:"Tim",      hcp1b:0, player2a:"Jake",    hcp2a:0, player2b:"Destin",   hcp2b:0, companionId:null },
  m105: { teeTime:"11:40", player1a:"Clark",  hcp1a:0, player1b:"Sushil",   hcp1b:0, player2a:"Russell", hcp2a:0, player2b:"Tyler S.", hcp2b:0, companionId:null },
  // Saturday
  m201: { teeTime:"11:10", player1a:"Ian",     hcp1a:0, player1b:"Hunter",  hcp1b:0, player2a:"Henry",    hcp2a:0, player2b:"Russell",  hcp2b:0, companionId:null },
  m202: { teeTime:"11:20", player1a:"Gabe",    hcp1a:0, player1b:"Tim",     hcp1b:0, player2a:"Geb",      hcp2a:0, player2b:"Ryan",     hcp2b:0, companionId:null },
  m203: { teeTime:"11:30", player1a:"Naman",   hcp1a:0, player1b:"Sushil",  hcp1b:0, player2a:"Tony",     hcp2a:0, player2b:"Jake",     hcp2b:0, companionId:null },
  m204: { teeTime:"11:40", player1a:"Logan",   hcp1a:0, player1b:"Clark",   hcp1b:0, player2a:"Sam",      hcp2a:0, player2b:"Destin",   hcp2b:0, companionId:null },
  m205: { teeTime:"11:50", player1a:"Tyler T.",hcp1a:0, player1b:"Colin",   hcp1b:0, player2a:"Tyler S.", hcp2a:0, player2b:"Spencer",  hcp2b:0, companionId:null },
  // Sunday singles
  m301: { teeTime:"10:40", player1a:"Clark",    hcp1a:8, player1b:null, hcp1b:0, player2a:"Tyler S.", hcp2a:0, player2b:null, hcp2b:0, companionId:null },
  m302: { teeTime:"10:48", player1a:"Sushil",   hcp1a:0, player1b:null, hcp1b:0, player2a:"Destin",   hcp2a:5, player2b:null, hcp2b:0, companionId:303 },
  m303: { teeTime:"10:48", player1a:"Tim",      hcp1a:2, player1b:null, hcp1b:0, player2a:"Jake",     hcp2a:0, player2b:null, hcp2b:0, companionId:302 },
  m304: { teeTime:"10:56", player1a:"Logan",    hcp1a:0, player1b:null, hcp1b:0, player2a:"Geb",      hcp2a:4, player2b:null, hcp2b:0, companionId:305 },
  m305: { teeTime:"10:56", player1a:"Gabe",     hcp1a:0, player1b:null, hcp1b:0, player2a:"Spencer",  hcp2a:0, player2b:null, hcp2b:0, companionId:304 },
  m306: { teeTime:"11:04", player1a:"Tyler T.", hcp1a:0, player1b:null, hcp1b:0, player2a:"Sam",      hcp2a:3, player2b:null, hcp2b:0, companionId:307 },
  m307: { teeTime:"11:04", player1a:"Naman",    hcp1a:2, player1b:null, hcp1b:0, player2a:"Henry",    hcp2a:0, player2b:null, hcp2b:0, companionId:306 },
  m308: { teeTime:"11:12", player1a:"Ian",      hcp1a:0, player1b:null, hcp1b:0, player2a:"Tony",     hcp2a:1, player2b:null, hcp2b:0, companionId:309 },
  m309: { teeTime:"11:12", player1a:"Hunter",   hcp1a:0, player1b:null, hcp1b:0, player2a:"Kimball",  hcp2a:2, player2b:null, hcp2b:0, companionId:308 },
};

const players = {
  gabe:     { name:"Gabe",     team:"A", hcp:0 },
  naman:    { name:"Naman",    team:"A", hcp:0 },
  logan:    { name:"Logan",    team:"A", hcp:0 },
  tyler_t:  { name:"Tyler T.", team:"A", hcp:0 },
  colin:    { name:"Colin",    team:"A", hcp:0 },
  ian:      { name:"Ian",      team:"A", hcp:0 },
  hunter:   { name:"Hunter",   team:"A", hcp:0 },
  tim:      { name:"Tim",      team:"A", hcp:2 },
  clark:    { name:"Clark",    team:"A", hcp:8 },
  sushil:   { name:"Sushil",   team:"A", hcp:0 },
  henry:    { name:"Henry",    team:"B", hcp:0 },
  spencer:  { name:"Spencer",  team:"B", hcp:0 },
  geb:      { name:"Geb",      team:"B", hcp:4 },
  tony:     { name:"Tony",     team:"B", hcp:1 },
  sam:      { name:"Sam",      team:"B", hcp:3 },
  ryan:     { name:"Ryan",     team:"B", hcp:0 },
  jake:     { name:"Jake",     team:"B", hcp:0 },
  destin:   { name:"Destin",   team:"B", hcp:5 },
  russell:  { name:"Russell",  team:"B", hcp:0 },
  tyler_s:  { name:"Tyler S.", team:"B", hcp:0 },
  kimball:  { name:"Kimball",  team:"B", hcp:2 },
};

export async function seedCBSCup(adminUid) {
  console.log("Seeding CBS cup metadata...");
  await set(ref(db, `cups/${CBS_CUP_ID}/meta`), { ...meta, createdBy: adminUid, createdAt: 1744502400000 });
  await set(ref(db, `cups/${CBS_CUP_ID}/players`), players);
  await set(ref(db, `cups/${CBS_CUP_ID}/matches`), matches);
  for (let i = 0; i < days.length; i++) {
    await set(ref(db, `cups/${CBS_CUP_ID}/days/${i}`), days[i]);
  }
  await set(ref(db, `inviteCodes/${INVITE_CODE}`), CBS_CUP_ID);

  // Migrate existing scores from old paths (matches/m101 etc.) to new paths
  console.log("Migrating scores from old Firebase paths...");
  const oldScoresSnap = await get(ref(db, "matches"));
  if (oldScoresSnap.exists()) {
    const oldScores = oldScoresSnap.val();
    for (const [key, val] of Object.entries(oldScores)) {
      if (val) {
        await set(ref(db, `cups/${CBS_CUP_ID}/scores/${key}`), val);
        console.log(`Migrated ${key}`);
      }
    }
  }

  // Add cup to admin user's list
  await set(ref(db, `users/${adminUid}/cups/${CBS_CUP_ID}`), {
    name: meta.name,
    teamAName: meta.teamAName,
    teamBName: meta.teamBName,
    createdAt: 1744502400000,
  });

  console.log("CBS cup seeded! Cup ID:", CBS_CUP_ID, "Invite code:", INVITE_CODE);
  return { cupId: CBS_CUP_ID, inviteCode: INVITE_CODE };
}
