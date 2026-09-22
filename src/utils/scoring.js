export const GOLD = "#C4A44A";

export function netScore(gross, playerHcp, holeHcpIndex) {
  return gross - (holeHcpIndex <= playerHcp ? 1 : 0)
               - (playerHcp > 18 && holeHcpIndex <= playerHcp - 18 ? 1 : 0);
}

export function computeMatchStatus(scores, teamAShort = "TEAM A", teamBShort = "TEAM B", startHole = 0, totalHoles = 18, pointValue = 1, allowExtraHoles = false, extraHoles = []) {
  let lead = 0, holesPlayed = 0;
  let closingLead = null, closingHolesPlayed = null;
  let gapHole = null;
  // Play order runs startHole, startHole+1, ... wrapping back to startHole-1 (shotgun/split
  // starts don't necessarily tee off on hole 1), for totalHoles holes (9-hole rounds don't
  // play all 18) — walk holes in that order, not raw array index order.
  for (let k = 0; k < totalHoles; k++) {
    const i = (startHole + k) % 18;
    const s = scores[i];
    if (s === null || s === undefined) {
      for (let j = k + 1; j < totalHoles; j++) {
        const ij = (startHole + j) % 18;
        if (scores[ij] !== null && scores[ij] !== undefined) { gapHole = i; break; }
      }
      break;
    }
    holesPlayed++;
    if (s === "A") lead++; else if (s === "B") lead--;
    // Only an early clinch if holes genuinely remain after this one — finishing
    // dead level-or-not on the very last hole of regulation is a normal finish
    // (reported as "X UP"), not a dormie-style close-out ("X & Y").
    const remaining = totalHoles - holesPlayed;
    if (closingLead === null && remaining > 0 && Math.abs(lead) > remaining) {
      closingLead = lead;
      closingHolesPlayed = holesPlayed;
    }
  }
  const abs = Math.abs(lead);
  const leader = lead > 0 ? "A" : lead < 0 ? "B" : null;
  const lName  = leader === "A" ? teamAShort : leader === "B" ? teamBShort : null;
  const ptLabel = pointValue === 1 ? "1 point" : `${pointValue} point${pointValue === 1 ? "" : "s"}`;
  const halvedLabel = pointValue === 1 ? "½ pt each" : `${pointValue / 2} pt each`;
  if (holesPlayed === 0 && gapHole === null) return { shortLabel:"—", longLabel:"Not Started", sublabel:"", state:"pending", leader:null, up:0, holesPlayed, lead };
  if (gapHole !== null) return { shortLabel:"⚠", longLabel:"Missing Score", sublabel:`Hole ${gapHole+1} not recorded`, state:"gap", leader, up:abs, holesPlayed, lead };
  if (closingLead !== null) {
    const cAbs = Math.abs(closingLead);
    const cRem = totalHoles - closingHolesPlayed;
    const cLeader = closingLead > 0 ? "A" : "B";
    const cLName  = cLeader === "A" ? teamAShort : teamBShort;
    return { shortLabel:`${cAbs}&${cRem}`, longLabel:`${cLName} WIN`, sublabel:`${cAbs}&${cRem}`, state:"complete", leader:cLeader, up:cAbs, holesPlayed, lead };
  }
  if (holesPlayed === totalHoles) {
    if (!leader) {
      // Regulation ends all square — if this match allows sudden death, keep going
      // through extraHoles (each entry "A"/"B"/"H") until someone wins a hole outright.
      if (allowExtraHoles) {
        let ePlayed = 0;
        for (const es of extraHoles) {
          ePlayed++;
          if (es === "A" || es === "B") {
            const eName = es === "A" ? teamAShort : teamBShort;
            return { shortLabel:"1UP", longLabel:`${eName} WIN`, sublabel:`1 UP (${totalHoles + ePlayed} holes)`, state:"complete", leader:es, up:1, holesPlayed:totalHoles + ePlayed, lead:es === "A" ? 1 : -1 };
          }
        }
        return { shortLabel:"AS", longLabel:"PLAYOFF", sublabel:`Extra hole ${ePlayed + 1}`, state:"extra", leader:null, up:0, holesPlayed:totalHoles + ePlayed, lead:0 };
      }
      return { shortLabel:"AS", longLabel:"HALVED", sublabel:halvedLabel, state:"halved", leader:null, up:0, holesPlayed, lead:0 };
    }
    return { shortLabel:`${abs}UP`, longLabel:`${lName} WIN`, sublabel:`${abs} UP`, state:"complete", leader, up:0, holesPlayed, lead };
  }
  if (!leader) return    { shortLabel:"AS", longLabel:"ALL SQUARE", sublabel:`Thru ${holesPlayed}`, state:"live", leader:null, up:0, holesPlayed, lead:0 };
  return                 { shortLabel:`${abs}UP`, longLabel:lName, sublabel:`${abs} UP • Thru ${holesPlayed}`, state:"live", leader, up:abs, holesPlayed, lead };
}

// Cup standings across any number of teams.
//
// Each match is A-vs-B between two of the cup's teams (see utils/teams.js), so a
// side's result is credited to whichever team holds that side in that match.
// Returns point totals keyed by team id: `actual` counts only finished matches,
// `proj` also credits the current leader of every match still in progress.
export function computeAllPoints(days, teams) {
  const ids = teams.map(t => t.id);
  const actual = Object.fromEntries(ids.map(id => [id, 0]));
  const proj   = Object.fromEntries(ids.map(id => [id, 0]));
  // Points still on the table for each team — what it could add if it won every
  // one of its matches that hasn't finished yet.
  const remaining = Object.fromEntries(ids.map(id => [id, 0]));
  let totalPoints = 0;

  for (const day of days) for (const m of day.matches) {
    const round = day.rounds?.[m.roundIdx ?? 0] || {};
    const pv = round.pointValue ?? 1;
    // Fall back to the first two teams for matches with no explicit assignment
    // (every match in a legacy two-team cup).
    const aId = ids.includes(m.teamA) ? m.teamA : ids[0];
    const bId = ids.includes(m.teamB) ? m.teamB : ids[1] ?? ids[0];
    const aShort = teams.find(t => t.id === aId)?.short;
    const bShort = teams.find(t => t.id === bId)?.short;
    totalPoints += pv;

    const s = computeMatchStatus(m.scores, aShort, bShort, m.startHole || 0, round.totalHoles || 18);
    const credit = (bucket, id, v) => { bucket[id] += v; };
    if (s.state === "complete") {
      const w = s.leader === "A" ? aId : bId;
      credit(actual, w, pv); credit(proj, w, pv);
    } else if (s.state === "halved") {
      credit(actual, aId, pv/2); credit(actual, bId, pv/2);
      credit(proj,   aId, pv/2); credit(proj,   bId, pv/2);
    } else {
      credit(remaining, aId, pv); credit(remaining, bId, pv);
      if (s.state === "live" || s.state === "gap") {
        if (s.leader === "A")      credit(proj, aId, pv);
        else if (s.leader === "B") credit(proj, bId, pv);
        else { credit(proj, aId, pv/2); credit(proj, bId, pv/2); }
      }
    }
  }
  return { actual, proj, remaining, totalPoints };
}

// Teams ordered for the standings board: most points first, then projected, then
// cup order so the list never jitters between equal teams.
export function standings(days, teams) {
  const { actual, proj, remaining, totalPoints } = computeAllPoints(days, teams);
  const rows = teams.map((t, i) => ({
    team: t, actual: actual[t.id] || 0, proj: proj[t.id] || 0,
    // The most this team can still finish on.
    ceiling: (actual[t.id] || 0) + (remaining[t.id] || 0),
    order: i,
  }));
  rows.sort((x, y) => y.actual - x.actual || y.proj - x.proj || x.order - y.order);

  // A team has won the cup once it is clear of every rival's best possible
  // finish. With two teams that is exactly the familiar "more than half the
  // points" rule; with three or four it is the same idea generalized.
  const winner = rows.find(r => rows.every(o => o.team.id === r.team.id || r.actual > o.ceiling))?.team || null;
  // Otherwise, who the current projection has winning — only called out when one
  // team is projected clear of the rest.
  const byProj = [...rows].sort((x, y) => y.proj - x.proj || x.order - y.order);
  const projWinner = winner ? null
    : byProj.length > 1 && byProj[0].proj > byProj[1].proj ? byProj[0].team : null;

  // The classic "WIN: 14.5" target is only meaningful head-to-head, where half
  // the points plus a half wins it. With three or four teams what it takes to
  // clinch depends on who still plays whom, so the board just omits the target
  // and relies on `winner` above.
  const winTarget = teams.length === 2 ? totalPoints / 2 + 0.5 : null;

  return { rows, totalPoints, winner, projWinner, winTarget };
}
