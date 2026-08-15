export const GOLD = "#C4A44A";

export function netScore(gross, playerHcp, holeHcpIndex) {
  return gross - (holeHcpIndex <= playerHcp ? 1 : 0)
               - (playerHcp > 18 && holeHcpIndex <= playerHcp - 18 ? 1 : 0);
}

export function computeMatchStatus(scores, teamAShort = "TEAM A", teamBShort = "TEAM B", startHole = 0) {
  let lead = 0, holesPlayed = 0;
  let closingLead = null, closingHolesPlayed = null;
  let gapHole = null;
  // Play order runs startHole, startHole+1, ... 17, 0, 1, ... startHole-1 (shotgun/split starts
  // don't necessarily tee off on hole 1) — walk holes in that order, not raw array index order.
  for (let k = 0; k < 18; k++) {
    const i = (startHole + k) % 18;
    const s = scores[i];
    if (s === null || s === undefined) {
      for (let j = k + 1; j < 18; j++) {
        const ij = (startHole + j) % 18;
        if (scores[ij] !== null && scores[ij] !== undefined) { gapHole = i; break; }
      }
      break;
    }
    holesPlayed++;
    if (s === "A") lead++; else if (s === "B") lead--;
    if (closingLead === null && Math.abs(lead) > (18 - holesPlayed)) {
      closingLead = lead;
      closingHolesPlayed = holesPlayed;
    }
  }
  const rem = 18 - holesPlayed;
  const abs = Math.abs(lead);
  const leader = lead > 0 ? "A" : lead < 0 ? "B" : null;
  const lName  = leader === "A" ? teamAShort : leader === "B" ? teamBShort : null;
  if (holesPlayed === 0 && gapHole === null) return { shortLabel:"—", longLabel:"Not Started", sublabel:"", state:"pending", leader:null, up:0, holesPlayed, lead };
  if (gapHole !== null) return { shortLabel:"⚠", longLabel:"Missing Score", sublabel:`Hole ${gapHole+1} not recorded`, state:"gap", leader, up:abs, holesPlayed, lead };
  if (closingLead !== null) {
    const cAbs = Math.abs(closingLead);
    const cRem = 18 - closingHolesPlayed;
    const cLeader = closingLead > 0 ? "A" : "B";
    const cLName  = cLeader === "A" ? teamAShort : teamBShort;
    return { shortLabel:`${cAbs}&${cRem}`, longLabel:`${cLName} WIN`, sublabel:`${cAbs}&${cRem}`, state:"complete", leader:cLeader, up:cAbs, holesPlayed, lead };
  }
  if (holesPlayed === 18) {
    if (!leader) return { shortLabel:"AS", longLabel:"HALVED", sublabel:"½ pt each", state:"halved", leader:null, up:0, holesPlayed, lead:0 };
    return               { shortLabel:"WIN", longLabel:`${lName} WIN`, sublabel:"1 point", state:"complete", leader, up:0, holesPlayed, lead };
  }
  if (!leader) return    { shortLabel:"AS", longLabel:"ALL SQUARE", sublabel:`Thru ${holesPlayed}`, state:"live", leader:null, up:0, holesPlayed, lead:0 };
  return                 { shortLabel:`${abs}UP`, longLabel:lName, sublabel:`${abs} UP • Thru ${holesPlayed}`, state:"live", leader, up:abs, holesPlayed, lead };
}

export function computeAllPoints(days, teamAShort, teamBShort) {
  let aA=0, aB=0, pA=0, pB=0;
  for (const day of days) for (const m of day.matches) {
    const s = computeMatchStatus(m.scores, teamAShort, teamBShort, m.startHole || 0);
    if (s.state==="complete")    { s.leader==="A"?(aA++,pA++):(aB++,pB++); }
    else if (s.state==="halved") { aA+=.5; aB+=.5; pA+=.5; pB+=.5; }
    else if (s.state==="live"||s.state==="gap") {
      s.leader==="A" ? pA++ : s.leader==="B" ? pB++ : (pA+=.5, pB+=.5);
    }
  }
  return { actualA:aA, actualB:aB, projA:pA, projB:pB };
}
