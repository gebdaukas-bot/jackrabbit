import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { netScore, strokesOnHole, computeMatchStatus, GOLD } from "../utils/scoring";
import { contrastText } from "../utils/color";

// Text on a button filled with a team color or gold, readable in either theme.
const onFill = c => c === GOLD ? "var(--on-gold)" : contrastText(c);
import ScoreInput from "./ScoreInput";
import { confirmTap } from "../utils/haptics";
import TeamChip from "./TeamChip";
import HcpModal from "./HcpModal";

export default function HoleEntry({ match, isSingles, course, cup, onSave, onClose, onHoleConfirmed }) {
  const { BG, CARD, CARD2, BORDER, TEXT, MUTED } = useTheme();
  const { teamAColor, teamAColorDisp, teamAShort, teamBColor, teamBColorDisp, teamBShort } = cup;

  const startHole = match.startHole || 0; // 0-indexed hole this match tees off on (shotgun/split starts)
  const totalHoles = match.totalHoles || 18; // 9 for a partial (e.g. twilight nine) round
  const playHoles = Array.from({ length: totalHoles }, (_, k) => (startHole + k) % 18); // physical hole indices, in play order
  const status = computeMatchStatus(match.scores, teamAShort, teamBShort, startHole, totalHoles);
  const [hole, setHole] = useState(status.holesPlayed < totalHoles ? (startHole + status.holesPlayed) % 18 : (startHole + totalHoles - 1) % 18);
  const [showHcp, setShowHcp] = useState(false);
  const [showEndEarly, setShowEndEarly] = useState(false);
  const [extraGross, setExtraGross] = useState({ a: course.par[0], b: course.par[0] });
  const [grossScores, setGrossScores] = useState(() =>
    Array.from({ length: 18 }, (_, i) => {
      const parVal = course.par[i];
      const g1a = Array.isArray(match.grossP1a) ? match.grossP1a[i] : null;
      const g1b = Array.isArray(match.grossP1b) ? match.grossP1b[i] : null;
      const g2a = Array.isArray(match.grossP2a) ? match.grossP2a[i] : null;
      const g2b = Array.isArray(match.grossP2b) ? match.grossP2b[i] : null;
      return {
        p1a: g1a != null ? g1a : parVal,
        p1b: g1b != null ? g1b : parVal,
        p2a: g2a != null ? g2a : parVal,
        p2b: g2b != null ? g2b : parVal,
      };
    })
  );

  const sc = grossScores[hole];
  const setSc = (updater) => setGrossScores(prev => {
    const next = [...prev];
    next[hole] = typeof updater === "function" ? updater(prev[hole]) : updater;
    return next;
  });

  const holeHcp = course.hcp[hole], holePar = course.par[hole];
  const holeYardage = course.yardage?.[hole] || null;
  // Scramble: one score per team; hcp1a/hcp2a store the manually-set team handicaps
  const isScramble = match.format === "Scramble";
  const oneScorePerSide = isSingles || isScramble;
  // Strokes are always taken off the low man: whatever the match stores (strokes
  // off the low man, or a bare index on matches set up before that), the lowest
  // in the match plays off zero and everyone else gets the difference.
  const sides = oneScorePerSide ? [match.hcp1a, match.hcp2a] : [match.hcp1a, match.hcp1b, match.hcp2a, match.hcp2b];
  const lowHcp = Math.min(...sides.map(h => Math.round(Number(h) || 0)));
  const rel = h => Math.round(Number(h) || 0) - lowHcp;
  const hcpA = rel(match.hcp1a), hcpB = rel(match.hcp2a);
  const hcp1b = rel(match.hcp1b), hcp2b = rel(match.hcp2b);
  // Strokes on this hole, allocated over the holes this match actually plays.
  const str = hcp => strokesOnHole(hcp, hole, course, startHole, totalHoles);
  const net1a = netScore(sc.p1a, str(hcpA));
  const net1b = oneScorePerSide ? 99 : netScore(sc.p1b, str(hcp1b));
  const net2a = netScore(sc.p2a, str(hcpB));
  const net2b = oneScorePerSide ? 99 : netScore(sc.p2b, str(hcp2b));
  const teamANet = oneScorePerSide ? net1a : Math.min(net1a, net1b);
  const teamBNet = oneScorePerSide ? net2a : Math.min(net2a, net2b);
  const hw = teamANet < teamBNet ? "A" : teamBNet < teamANet ? "B" : "H";
  const hwColor = hw === "A" ? teamAColor : hw === "B" ? teamBColor : GOLD;
  const hwLabel = hw === "A" ? `${teamAShort} wins · net ${teamANet} vs ${teamBNet}` :
                  hw === "B" ? `${teamBShort} wins · net ${teamBNet} vs ${teamANet}` :
                  `Halved · both net ${teamANet}`;

  const handleConfirm = () => {
    confirmTap();
    // Lets the cup ask about a longest-drive / closest-to-the-pin hole once it's scored.
    const confirmedHole = hole;
    setTimeout(() => onHoleConfirmed?.(confirmedHole), 0);
    const ns = [...match.scores]; ns[hole] = hw;
    const toArr = (existing, newVal) => {
      const arr = Array.isArray(existing) ? [...existing] : Array(18).fill(null);
      arr[hole] = newVal;
      return arr;
    };
    onSave({
      ...match, scores: ns,
      grossP1a: toArr(match.grossP1a, sc.p1a),
      grossP1b: isSingles ? match.grossP1b : toArr(match.grossP1b, sc.p1b),
      grossP2a: toArr(match.grossP2a, sc.p2a),
      grossP2b: isSingles ? match.grossP2b : toArr(match.grossP2b, sc.p2b),
    });
    const posInRotation = (hole - startHole + 18) % 18;
    if (posInRotation < totalHoles - 1) {
      const nextHole = (hole + 1) % 18;
      const nextPar = course.par[nextHole];
      setHole(nextHole);
      setGrossScores(prev => { const next = [...prev]; next[nextHole] = { p1a: nextPar, p1b: nextPar, p2a: nextPar, p2b: nextPar }; return next; });
    }
  };

  const handleUndo = () => {
    const posInRotation = (hole - startHole + 18) % 18;
    if (posInRotation === 0) return;
    const undoHole = (hole - 1 + 18) % 18;
    const ns = [...match.scores]; ns[undoHole] = null;
    const clearArr = (arr) => { const a = Array.isArray(arr) ? [...arr] : Array(18).fill(null); a[undoHole] = null; return a; };
    onSave({ ...match, scores: ns, grossP1a: clearArr(match.grossP1a), grossP1b: clearArr(match.grossP1b), grossP2a: clearArr(match.grossP2a), grossP2b: clearArr(match.grossP2b) });
    setHole(undoHole);
    const prevPar = course.par[undoHole];
    setGrossScores(prev => { const next = [...prev]; next[undoHole] = { p1a: prevPar, p1b: prevPar, p2a: prevPar, p2b: prevPar }; return next; });
  };

  const cur = computeMatchStatus(match.scores, teamAShort, teamBShort, startHole, totalHoles, 1, match.allowExtraHoles || false, match.extra || []);
  const isComplete = cur.state === "complete" || cur.state === "halved";
  const posInRotation = (hole - startHole + 18) % 18; // count of holes completed before the current one, in this match's play order
  const prevHole = (hole - 1 + 18) % 18;
  const nextNeededHole = (startHole + cur.holesPlayed) % 18; // physical hole still needed to clear a "gap" state
  let runLead = 0;
  for (let k = 0; k < posInRotation; k++) { const i = (startHole + k) % 18; if (match.scores[i] === "A") runLead++; else if (match.scores[i] === "B") runLead--; }
  const runAbs = Math.abs(runLead);
  const runLeader = runLead > 0 ? "A" : runLead < 0 ? "B" : null;

  const strokeEntries = isScramble
    ? [
        ...((() => { const s = str(hcpA); return s > 0 ? [{ name: match.player1b ? `${match.player1a} & ${match.player1b}` : match.player1a, hcp: hcpA, strokes: s }] : []; })()),
        ...((() => { const s = str(hcpB); return s > 0 ? [{ name: match.player2b ? `${match.player2a} & ${match.player2b}` : match.player2a, hcp: hcpB, strokes: s }] : []; })()),
      ]
    : [
        { name: match.player1a, hcp: hcpA },
        ...(!isSingles ? [{ name: match.player1b, hcp: hcp1b }] : []),
        { name: match.player2a, hcp: hcpB },
        ...(!isSingles ? [{ name: match.player2b, hcp: hcp2b }] : []),
      ].map(p => ({ ...p, strokes: str(p.hcp) })).filter(e => e.strokes > 0);

  return (
    <div style={{ position: "fixed", inset: 0, top: "env(safe-area-inset-top)", bottom: "env(safe-area-inset-bottom)", background: BG, zIndex: 200, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {showHcp && (
        <HcpModal match={match} isSingles={isSingles} teamAColor={teamAColor} teamBColor={teamBColor}
          onSave={v => { onSave({ ...match, ...v }); setShowHcp(false); }} onClose={() => setShowHcp(false)} />
      )}
      {showEndEarly && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: "var(--gold-text)", marginBottom: 6, fontFamily: "var(--mono)" }}>END MATCH EARLY?</div>
            <div style={{ fontSize: 11, color: TEXT, marginBottom: 6 }}>
              {cur.state === "pending" ? "Match is all square — result will be HALVED." :
               cur.leader ? `${cur.leader === "A" ? teamAShort : teamBShort} leads ${cur.up}UP after ${cur.holesPlayed} holes.` :
               "All square after " + cur.holesPlayed + " holes — result will be HALVED."}
            </div>
            <div style={{ fontSize: 10, color: MUTED, marginBottom: 20 }}>Remaining holes will be recorded as halved.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowEndEarly(false)} style={{ flex: 1, padding: "10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, color: MUTED, fontSize: 12, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                const ns = [...match.scores];
                for (const i of playHoles) { if (ns[i] === null || ns[i] === undefined) ns[i] = "H"; }
                onSave({ ...match, scores: ns });
                setShowEndEarly(false); onClose();
              }} style={{ flex: 1, padding: "10px", background: `linear-gradient(135deg,${teamBColor},${teamBColorDisp}66)`, border: `1px solid ${teamBColor}`, borderRadius: 10, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky header */}
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "10px 12px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, color: "var(--muted2)", padding: "5px 10px", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>← Back</button>
          <button onClick={() => setShowHcp(true)} style={{ fontSize: 10, padding: "4px 10px", background: `${GOLD}22`, border: `1px solid ${GOLD}55`, borderRadius: 6, color: "var(--gold-text)", cursor: "pointer", fontFamily: "var(--mono)", flexShrink: 0 }}>HCP ✏</button>
        </div>
        <div style={{ display: "flex", alignItems: "stretch", borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          <div style={{ flex: 1, background: runLeader === "A" ? teamAColor : "var(--panel-f)", padding: "8px 10px", minWidth: 0 }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: runLeader === "A" ? contrastText(teamAColor) : teamAColorDisp, letterSpacing: 1, fontFamily: "var(--mono)", marginBottom: 2 }}>{teamAShort}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: runLeader === "A" ? contrastText(teamAColor) : "var(--text-b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.player1a}</div>
            {match.player1b && <div style={{ fontSize: 12, fontWeight: 700, color: runLeader === "A" ? contrastText(teamAColor) : "var(--text-b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.player1b}</div>}
          </div>
          <div style={{ background: runLeader === "A" ? teamAColor : runLeader === "B" ? teamBColor : "#1a2a44", minWidth: 68, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 4px", borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, flexShrink: 0 }}>
            {cur.state === "pending" ? <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)" }}>—</div>
            : cur.state === "complete" || cur.state === "halved" ? <><div style={{ fontSize: 8, color: "#FFD700", fontFamily: "var(--mono)", fontWeight: 800, letterSpacing: 1 }}>FINAL</div><div style={{ fontSize: 12, fontWeight: 900, color: runLeader ? contrastText(runLeader === "A" ? teamAColor : teamBColor) : "#fff", fontFamily: "var(--mono)" }}>{cur.sublabel || "HALVED"}</div></>
            : <><div style={{ fontSize: 17, fontWeight: 900, color: runLeader ? contrastText(runLeader === "A" ? teamAColor : teamBColor) : "#fff", fontFamily: "var(--mono)", lineHeight: 1 }}>{runLeader ? runAbs : "AS"}</div><div style={{ fontSize: 8, color: runLeader ? `${contrastText(runLeader === "A" ? teamAColor : teamBColor)}aa` : "#88aacc", fontFamily: "var(--mono)", marginTop: 1 }}>{runLeader ? "UP" : "ALL SQ"}</div><div style={{ fontSize: 8, color: runLeader ? `${contrastText(runLeader === "A" ? teamAColor : teamBColor)}88` : "var(--muted)", fontFamily: "var(--mono)", marginTop: 2 }}>THRU {posInRotation}</div></>}
          </div>
          <div style={{ flex: 1, background: runLeader === "B" ? teamBColor : "var(--panel-f)", padding: "8px 10px", display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 0 }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: runLeader === "B" ? contrastText(teamBColor) : teamBColorDisp, letterSpacing: 1, fontFamily: "var(--mono)", marginBottom: 2 }}>{teamBShort}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: runLeader === "B" ? contrastText(teamBColor) : "var(--text-b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right", width: "100%" }}>{match.player2a}</div>
            {match.player2b && <div style={{ fontSize: 12, fontWeight: 700, color: runLeader === "B" ? contrastText(teamBColor) : "var(--text-b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right", width: "100%" }}>{match.player2b}</div>}
          </div>
        </div>
      </div>

      {/* Hole strip: two rows of nine so each hole is a real tap target. A played
          hole is filled with the winning side's color (grey if halved) and ticked. */}
      <div style={{ padding: "8px 10px 16px", display: "grid", gridTemplateColumns: `repeat(${Math.min(9, playHoles.length)}, 1fr)`, gap: "11px 4px" }}>
        {playHoles.map((i) => {
          const s = match.scores[i];
          const isDisputed = (match.disputes || []).includes(i);
          const bg = s === "A" ? teamAColor : s === "B" ? teamBColor : s === "H" ? "#556677" : CARD2;
          const isAct = i === hole;
          return (
            <div key={i} style={{ position: "relative" }}>
              <div onClick={() => setHole(i)} style={{ height: 30, boxSizing: "border-box", background: bg, borderRadius: 6, cursor: "pointer", border: isAct ? `2px solid ${GOLD}` : s == null ? `1px solid ${BORDER}` : "2px solid transparent", boxShadow: isAct ? `0 0 0 2px ${GOLD}44` : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 12, lineHeight: 1, color: s != null ? contrastText(s === "H" ? "#556677" : bg) : isAct ? "var(--strong)" : "var(--muted2)", fontFamily: "var(--mono)", fontWeight: 800 }}>
                {i + 1}
                {s != null && <span style={{ fontSize: 8, marginTop: 1, opacity: 0.85 }}>✓</span>}
              </div>
              {s != null && (
                <div onClick={e => { e.stopPropagation(); const cur = match.disputes || []; const nd = cur.includes(i) ? cur.filter(h => h !== i) : [...cur, i]; onSave({ ...match, disputes: nd }); }}
                  style={{ position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)", fontSize: 9, cursor: "pointer", opacity: isDisputed ? 1 : 0.15, lineHeight: 1, userSelect: "none" }}>🚩</div>
              )}
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div style={{ margin: "10px 12px 0", background: `${cur.leader === "A" ? teamAColor : cur.state === "halved" ? "var(--faint-c)" : teamBColor}33`, border: `1px solid ${cur.leader === "A" ? teamAColor : cur.state === "halved" ? "#556677" : teamBColor}66`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "var(--muted2)", fontFamily: "var(--mono)", letterSpacing: 1 }}>MATCH RESULT</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "var(--gold-text)", letterSpacing: 1 }}>{cur.longLabel}</div>
            <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 2 }}>{cur.sublabel}</div>
          </div>
          <div style={{ fontSize: 28 }}>🏆</div>
        </div>
      )}
      {cur.state === "gap" && (
        <div style={{ margin: "8px 12px 0", background: "#e67e2222", border: "1px solid #e67e2299", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 18 }}>⚠</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#e67e22", fontFamily: "var(--mono)", letterSpacing: 1 }}>MISSING SCORE</div>
            <div style={{ fontSize: 10, color: "#e67e22bb", marginTop: 2 }}>Score from hole {nextNeededHole + 1} has not been recorded</div>
          </div>
          <button onClick={() => setHole(nextNeededHole)} style={{ flexShrink: 0, padding: "5px 10px", background: "#e67e2233", border: "1px solid #e67e22", borderRadius: 7, color: "#e67e22", fontSize: 10, cursor: "pointer", fontWeight: 800, fontFamily: "var(--mono)" }}>GO →</button>
        </div>
      )}
      {cur.state === "extra" && (() => {
        const extraNum = (match.extra?.length || 0) + 1;
        const pPar = course.par[0];
        // Playoff holes are played from hole 1, with strokes as over a full 18.
        const netA = netScore(extraGross.a, strokesOnHole(hcpA, 0, course));
        const netB = netScore(extraGross.b, strokesOnHole(hcpB, 0, course));
        const pw = netA < netB ? "A" : netB < netA ? "B" : "H";
        const pwColor = pw === "A" ? teamAColor : pw === "B" ? teamBColor : GOLD;
        const confirmExtra = () => {
          onSave({
            ...match,
            extra: [...(match.extra || []), pw],
            extraGrossA: [...(match.extraGrossA || []), extraGross.a],
            extraGrossB: [...(match.extraGrossB || []), extraGross.b],
          });
          setExtraGross({ a: pPar, b: pPar });
        };
        const undoExtra = () => onSave({
          ...match,
          extra: (match.extra || []).slice(0, -1),
          extraGrossA: (match.extraGrossA || []).slice(0, -1),
          extraGrossB: (match.extraGrossB || []).slice(0, -1),
        });
        return (
          <div style={{ margin: "10px 12px 0", background: `${GOLD}18`, border: `1px solid ${GOLD}55`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "var(--gold-text)", fontFamily: "var(--mono)", letterSpacing: 1, marginBottom: 4 }}>PLAYOFF — HOLE {extraNum}</div>
            <div style={{ fontSize: 10, color: MUTED, marginBottom: 10 }}>All square through {totalHoles} — sudden death, replaying Hole 1 (par {pPar})</div>
            <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 10 }}>
              <ScoreInput label={match.player1a} hcp={hcpA} value={extraGross.a} onChange={v => setExtraGross(s => ({ ...s, a: v }))} color={teamAColorDisp} par={pPar} />
              <ScoreInput label={match.player2a} hcp={hcpB} value={extraGross.b} onChange={v => setExtraGross(s => ({ ...s, b: v }))} color={teamBColor} par={pPar} />
            </div>
            <button onClick={confirmExtra} style={{ width: "100%", padding: "13px", background: `linear-gradient(135deg,${pwColor},${pwColor}aa)`, border: "none", borderRadius: 12, color: onFill(pwColor), fontWeight: 900, fontSize: 13, cursor: "pointer", fontFamily: "var(--mono)" }}>
              CONFIRM PLAYOFF HOLE {extraNum} →
            </button>
            {match.extra?.length > 0 && (
              <button onClick={undoExtra} style={{ width: "100%", marginTop: 8, padding: "9px", background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, color: "var(--muted)", fontSize: 11, cursor: "pointer", fontFamily: "var(--mono)" }}>
                ↩ UNDO PLAYOFF HOLE {extraNum - 1}
              </button>
            )}
          </div>
        );
      })()}

      <div style={{ flex: 1, padding: "12px 12px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 8, padding: "6px 10px", background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 8, color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing:1 }}>HOLE</div><div style={{ fontSize: 22, fontWeight: 900, color: "var(--gold-text)", fontFamily: "var(--mono)", lineHeight: 1 }}>{hole + 1}</div></div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 8, color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing:1 }}>PAR</div><div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", fontFamily: "var(--mono)", lineHeight: 1 }}>{holePar}</div></div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 8, color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing:1 }}>HCP IDX</div><div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", fontFamily: "var(--mono)", lineHeight: 1 }}>{holeHcp}</div></div>
          <div style={{ width: 1, background: BORDER }} /><div style={{ textAlign: "center" }}><div style={{ fontSize: 8, color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing:1 }}>YDS</div><div style={{ fontSize: 22, fontWeight: 900, color: holeYardage ? "var(--text)" : "var(--muted)", fontFamily: "var(--mono)", lineHeight: 1 }}>{holeYardage || "—"}</div></div>
          {strokeEntries.length > 0 && <><div style={{ width: 1, background: BORDER }} /><div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}><div style={{ fontSize: 8, color: "var(--gold-text)", fontFamily: "var(--mono)", letterSpacing: 1 }}>STROKE</div><div style={{ fontSize: 9, color: "var(--gold-text)", marginTop: 1 }}>{strokeEntries.map(e => `${e.name}${e.strokes > 1 ? ` ×${e.strokes}` : ""}`).join(", ")}</div></div></>}
        </div>

        <div style={{ background: `${teamAColor}18`, border: `1px solid ${teamAColor}44`, borderRadius: 12, padding: "8px 10px 10px", marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: teamAColorDisp, fontWeight: 800, letterSpacing:1, fontFamily: "var(--mono)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><TeamChip color={teamAColor} />{teamAShort}{!oneScorePerSide && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)", fontWeight: 600, letterSpacing: 0, fontFamily: "var(--sans)" }}>best net <span style={{ color: "var(--strong)", fontWeight: 800 }}>{teamANet}</span></span>}</div>
          <div style={{ display: "flex", justifyContent: oneScorePerSide ? "center" : "space-around" }}>
            <ScoreInput label={isScramble && match.player1b ? `${match.player1a} / ${match.player1b}` : match.player1a} hcp={hcpA} value={sc.p1a} onChange={v => setSc(s => ({ ...s, p1a: v }))} color={teamAColorDisp} labelColor={strokeEntries.find(e => e.name?.startsWith(match.player1a))?.strokes > 0 ? GOLD : null} strokes={strokeEntries.find(e => e.name?.startsWith(match.player1a))?.strokes || 1} par={holePar} />
            {!oneScorePerSide && <ScoreInput label={match.player1b} hcp={hcp1b} value={sc.p1b} onChange={v => setSc(s => ({ ...s, p1b: v }))} color={teamAColorDisp} labelColor={strokeEntries.find(e => e.name === match.player1b)?.strokes > 0 ? GOLD : null} strokes={strokeEntries.find(e => e.name === match.player1b)?.strokes || 1} par={holePar} />}
          </div>
        </div>

        <div style={{ background: `${teamBColor}33`, border: `1px solid ${teamBColor}66`, borderRadius: 12, padding: "8px 10px 10px", marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: teamBColorDisp, fontWeight: 800, letterSpacing:1, fontFamily: "var(--mono)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}><TeamChip color={teamBColor} />{teamBShort}{!oneScorePerSide && <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted)", fontWeight: 600, letterSpacing: 0, fontFamily: "var(--sans)" }}>best net <span style={{ color: "var(--strong)", fontWeight: 800 }}>{teamBNet}</span></span>}</div>
          <div style={{ display: "flex", justifyContent: oneScorePerSide ? "center" : "space-around" }}>
            <ScoreInput label={isScramble && match.player2b ? `${match.player2a} / ${match.player2b}` : match.player2a} hcp={hcpB} value={sc.p2a} onChange={v => setSc(s => ({ ...s, p2a: v }))} color={teamBColorDisp} labelColor={strokeEntries.find(e => e.name?.startsWith(match.player2a))?.strokes > 0 ? GOLD : null} strokes={strokeEntries.find(e => e.name?.startsWith(match.player2a))?.strokes || 1} par={holePar} />
            {!oneScorePerSide && <ScoreInput label={match.player2b} hcp={hcp2b} value={sc.p2b} onChange={v => setSc(s => ({ ...s, p2b: v }))} color={teamBColorDisp} labelColor={strokeEntries.find(e => e.name === match.player2b)?.strokes > 0 ? GOLD : null} strokes={strokeEntries.find(e => e.name === match.player2b)?.strokes || 1} par={holePar} />}
          </div>
        </div>

        <div style={{ background: `${hwColor}22`, border: `1px solid ${hwColor}55`, borderRadius: 10, padding: "7px 12px", marginBottom: 4, textAlign: "center", fontSize: 13, fontWeight: 800, color: hw === "A" ? teamAColorDisp : hw === "B" ? teamBColorDisp : "var(--gold-text)" }}>
          <span style={{ fontSize: 9, color: "var(--muted)", fontFamily: "var(--mono)", fontWeight: 700, marginRight: 8 }}>HOLE RESULT</span>{hwLabel}
        </div>

        {/* Confirm stays pinned to the bottom of the screen until you scroll down to it,
            so it's never hidden below the fold on a short phone. */}
        <div style={{ position: "sticky", bottom: 0, zIndex: 5, padding: "12px 0 4px", margin: "0 -4px", paddingLeft: 4, paddingRight: 4, background: `linear-gradient(to bottom, transparent, ${BG} 18px)` }}>
        {cur.state === "gap" && hole !== nextNeededHole
          ? <div style={{ width: "100%", padding: "15px", background: "#e67e2222", border: "1px solid #e67e2266", borderRadius: 14, color: "#e67e22", fontWeight: 900, fontSize: 13, textAlign: "center", fontFamily: "var(--mono)", marginBottom: 8, letterSpacing: 1 }}>⚠ ENTER HOLE {nextNeededHole + 1} FIRST</div>
          : <button onClick={handleConfirm} style={{ width: "100%", padding: "15px", background: `linear-gradient(135deg,${hwColor},${hwColor}aa)`, border: "none", borderRadius: 14, color: onFill(hwColor), fontWeight: 900, fontSize: 15, cursor: "pointer", letterSpacing: 1, fontFamily: "var(--mono)", boxShadow: `0 4px 18px ${hwColor}44`, marginBottom: 8 }}>CONFIRM HOLE {hole + 1} →</button>
        }
        </div>
        {posInRotation > 0 && <button onClick={handleUndo} style={{ width: "100%", padding: "9px", background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, color: "var(--muted)", fontSize: 11, cursor: "pointer", fontFamily: "var(--mono)", letterSpacing: 1, marginBottom: 8 }}>↩ UNDO HOLE {prevHole + 1}</button>}
        {!isComplete && <button onClick={() => setShowEndEarly(true)} style={{ width: "100%", padding: "7px", background: "none", border: `1px solid var(--faint)`, borderRadius: 10, color: "var(--muted)", fontSize: 10, cursor: "pointer", fontFamily: "var(--mono)", letterSpacing: 1, marginBottom: 20 }}>End Match Early</button>}
      </div>
    </div>
  );
}
