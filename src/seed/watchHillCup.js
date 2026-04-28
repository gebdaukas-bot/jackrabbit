/**
 * ONE-TIME SEED: Watch Hill Ryder Cup 2026
 *
 * Sets up days, rounds, and matchups for cup_1777401594234_fc4xm.
 * Run from browser console after logging in as admin:
 *   import('/src/seed/watchHillCup.js').then(m => m.seedWatchHill())
 *
 * Does NOT overwrite players or meta — run this after setting those up.
 */

import { db, ref, set } from "../firebase";

const CUP_ID = "cup_1777401594234_fc4xm";

// Placeholder course — update each day's course via Admin → Courses after seeding
const blankCourse = { name: "TBD", par: Array(18).fill(4), hcp: Array.from({length:18},(_,i)=>i+1) };

const days = [
  {
    label: "Wednesday PM — Fourballs",
    rounds: [{ format: "2v2 Best Ball", course: blankCourse }],
  },
  {
    label: "Thursday AM — Fourballs",
    rounds: [{ format: "2v2 Best Ball", course: blankCourse }],
  },
  {
    label: "Thursday PM — Scramble",
    rounds: [{ format: "Scramble", course: blankCourse }],
  },
  {
    label: "Friday AM — Singles",
    rounds: [{ format: "Singles", course: blankCourse }],
  },
];

// Match IDs: m${(dayIdx+1)*1000 + (roundIdx+1)*100 + matchNum}
// All single-round days → roundIdx=0 → prefix *1100 + matchNum
// Day 0 → m1101..  Day 1 → m2101..  Day 2 → m3101..  Day 3 → m4101..
const matches = {
  // ── Wednesday PM: Fourballs ─────────────────────────────────────────────
  m1101: { teeTime:"", format:"2v2 Best Ball",
    player1a:"Gabe Tishman",     hcp1a:5,  player1b:"Tyler Tam",           hcp1b:7,
    player2a:"Tony Reiser",      hcp2a:14, player2b:"Russell Seeger",      hcp2b:30, companionId:null },
  m1102: { teeTime:"", format:"2v2 Best Ball",
    player1a:"Raman Ananthanpillai", hcp1a:22, player1b:"Clark Sammartino",hcp1b:25,
    player2a:"Trent Wong",       hcp2a:13, player2b:"Geb Daukas",          hcp2b:10, companionId:null },
  m1103: { teeTime:"", format:"2v2 Best Ball",
    player1a:"Hunter Roggekamp", hcp1a:11, player1b:"Sushil Bhandaru",     hcp1b:19,
    player2a:"Colin Bailey",     hcp2a:7,  player2b:"Jake Coran",          hcp2b:18, companionId:null },

  // ── Thursday AM: Fourballs ──────────────────────────────────────────────
  m2101: { teeTime:"", format:"2v2 Best Ball",
    player1a:"Raman Ananthanpillai", hcp1a:22, player1b:"Clark Sammartino",hcp1b:25,
    player2a:"Colin Bailey",     hcp2a:7,  player2b:"Tony Reiser",         hcp2b:14, companionId:null },
  m2102: { teeTime:"", format:"2v2 Best Ball",
    player1a:"Gabe Tishman",     hcp1a:5,  player1b:"Tyler Tam",           hcp1b:7,
    player2a:"Trent Wong",       hcp2a:13, player2b:"Jake Coran",          hcp2b:18, companionId:null },
  m2103: { teeTime:"", format:"2v2 Best Ball",
    player1a:"Hunter Roggekamp", hcp1a:11, player1b:"Sushil Bhandaru",     hcp1b:19,
    player2a:"Geb Daukas",       hcp2a:10, player2b:"Russell Seeger",      hcp2b:30, companionId:null },

  // ── Thursday PM: Scramble ───────────────────────────────────────────────
  m3101: { teeTime:"", format:"Scramble",
    player1a:"Gabe Tishman",     hcp1a:5,  player1b:"Tyler Tam",           hcp1b:7,
    player2a:"Geb Daukas",       hcp2a:10, player2b:"Colin Bailey",        hcp2b:7,  companionId:null },
  m3102: { teeTime:"", format:"Scramble",
    player1a:"Hunter Roggekamp", hcp1a:11, player1b:"Sushil Bhandaru",     hcp1b:19,
    player2a:"Tony Reiser",      hcp2a:14, player2b:"Trent Wong",          hcp2b:13, companionId:null },
  m3103: { teeTime:"", format:"Scramble",
    player1a:"Raman Ananthanpillai", hcp1a:22, player1b:"Clark Sammartino",hcp1b:25,
    player2a:"Jake Coran",       hcp2a:18, player2b:"Russell Seeger",      hcp2b:30, companionId:null },

  // ── Friday AM: Singles (companion pairs share a tee time) ───────────────
  // Group 1
  m4101: { teeTime:"", format:"Singles",
    player1a:"Tyler Tam",        hcp1a:7,  player1b:null, hcp1b:0,
    player2a:"Geb Daukas",       hcp2a:10, player2b:null, hcp2b:0, companionId:4102 },
  m4102: { teeTime:"", format:"Singles",
    player1a:"Hunter Roggekamp", hcp1a:11, player1b:null, hcp1b:0,
    player2a:"Tony Reiser",      hcp2a:14, player2b:null, hcp2b:0, companionId:4101 },
  // Group 2
  m4103: { teeTime:"", format:"Singles",
    player1a:"Gabe Tishman",     hcp1a:5,  player1b:null, hcp1b:0,
    player2a:"Colin Bailey",     hcp2a:7,  player2b:null, hcp2b:0, companionId:4104 },
  m4104: { teeTime:"", format:"Singles",
    player1a:"Sushil Bhandaru",  hcp1a:19, player1b:null, hcp1b:0,
    player2a:"Trent Wong",       hcp2a:13, player2b:null, hcp2b:0, companionId:4103 },
  // Group 3
  m4105: { teeTime:"", format:"Singles",
    player1a:"Raman Ananthanpillai", hcp1a:22, player1b:null, hcp1b:0,
    player2a:"Jake Coran",       hcp2a:18, player2b:null, hcp2b:0, companionId:4106 },
  m4106: { teeTime:"", format:"Singles",
    player1a:"Clark Sammartino", hcp1a:25, player1b:null, hcp1b:0,
    player2a:"Russell Seeger",   hcp2a:30, player2b:null, hcp2b:0, companionId:4105 },
};

export async function seedWatchHill() {
  console.log("Writing days...");
  for (let i = 0; i < days.length; i++) {
    await set(ref(db, `cups/${CUP_ID}/days/${i}`), days[i]);
    console.log(`  Day ${i}: ${days[i].label}`);
  }

  console.log("Writing matches...");
  for (const [key, val] of Object.entries(matches)) {
    await set(ref(db, `cups/${CUP_ID}/matches/${key}`), val);
    console.log(`  ${key}: ${val.player1a} & ${val.player1b||"-"} vs ${val.player2a} & ${val.player2b||"-"}`);
  }

  console.log("Done! Update each day's course via Admin → Courses.");
}
