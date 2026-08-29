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

export function computeAllPoints(days, teamAShort, teamBShort) {
  let aA=0, aB=0, pA=0, pB=0;
  for (const day of days) for (const m of day.matches) {
    const round = day.rounds?.[m.roundIdx ?? 0] || {};
    const pv = round.pointValue ?? 1;
    const s = computeMatchStatus(m.scores, teamAShort, teamBShort, m.startHole || 0, round.totalHoles || 18);
    if (s.state==="complete")    { s.leader==="A"?(aA+=pv,pA+=pv):(aB+=pv,pB+=pv); }
    else if (s.state==="halved") { aA+=pv/2; aB+=pv/2; pA+=pv/2; pB+=pv/2; }
    else if (s.state==="live"||s.state==="gap") {
      s.leader==="A" ? pA+=pv : s.leader==="B" ? pB+=pv : (pA+=pv/2, pB+=pv/2);
    }
  }
  return { actualA:aA, actualB:aB, projA:pA, projB:pB };
}
