import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { netScore, computeMatchStatus, GOLD } from "../utils/scoring";
import ScoreInput from "./ScoreInput";
import HcpModal from "./HcpModal";

export default function HoleEntry({ match, isSingles, course, cup, onSave, onClose }) {
  const { BG, CARD, CARD2, BORDER, TEXT, MUTED } = useTheme();
  const { teamAColor, teamAShort, teamBColor, teamBColorDisp, teamBShort } = cup;

  const status = computeMatchStatus(match.scores, teamAShort, teamBShort);
  const [hole, setHole] = useState(status.holesPlayed < 18 ? status.holesPlayed : 17);
  const [showHcp, setShowHcp] = useState(false);
  const [showEndEarly, setShowEndEarly] = useState(false);
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
  // For scramble with 2-person teams, use USGA team handicap: lower×0.35 + higher×0.15
  const isScramble = match.format === "Scramble";
  const scrambleTeamHcp = (ha, hb) => Math.round(Math.min(ha,hb) * 0.35 + Math.max(ha,hb) * 0.15);
  const hcpA = isScramble && match.player1b ? scrambleTeamHcp(match.hcp1a||0, match.hcp1b||0) : match.hcp1a||0;
  const hcpB = isScramble && match.player2b ? scrambleTeamHcp(match.hcp2a||0, match.hcp2b||0) : match.hcp2a||0;
  const net1a = netScore(sc.p1a, hcpA, holeHcp);
  const net1b = isSingles ? 99 : netScore(sc.p1b, match.hcp1b || 0, holeHcp);
  const net2a = netScore(sc.p2a, hcpB, holeHcp);
  const net2b = isSingles ? 99 : netScore(sc.p2b, match.hcp2b || 0, holeHcp);
  const teamANet = isSingles ? net1a : Math.min(net1a, net1b);
  const teamBNet = isSingles ? net2a : Math.min(net2a, net2b);
  const hw = teamANet < teamBNet ? "A" : teamBNet < teamANet ? "B" : "H";
  const hwColor = hw === "A" ? teamAColor : hw === "B" ? teamBColor : GOLD;
  const hwLabel = hw === "A" ? `${teamAShort} wins · net ${teamANet} vs ${teamBNet}` :
                  hw === "B" ? `${teamBShort} wins · net ${teamBNet} vs ${teamANet}` :
                  `Halved · both net ${teamANet}`;

  const handleConfirm = () => {
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
    if (hole < 17) {
      const nextPar = course.par[hole + 1];
      setHole(h => h + 1);
      setGrossScores(prev => { const next = [...prev]; next[hole + 1] = { p1a: nextPar, p1b: nextPar, p2a: nextPar, p2b: nextPar }; return next; });
    }
  };

  const handleUndo = () => {
    if (hole === 0) return;
    const undoHole = hole - 1;
    const ns = [...match.scores]; ns[undoHole] = null;
    const clearArr = (arr) => { const a = Array.isArray(arr) ? [...arr] : Array(18).fill(null); a[undoHole] = null; return a; };
    onSave({ ...match, scores: ns, grossP1a: clearArr(match.grossP1a), grossP1b: clearArr(match.grossP1b), grossP2a: clearArr(match.grossP2a), grossP2b: clearArr(match.grossP2b) });
    setHole(h => h - 1);
    const prevPar = course.par[undoHole];
    setGrossScores(prev => { const next = [...prev]; next[undoHole] = { p1a: prevPar, p1b: prevPar, p2a: prevPar, p2b: prevPar }; return next; });
  };

  const cur = computeMatchStatus(match.scores, teamAShort, teamBShort);
  const isComplete = cur.state === "complete" || cur.state === "halved";
  let runLead = 0;
  for (let i = 0; i < hole; i++) { if (match.scores[i] === "A") runLead++; else if (match.scores[i] === "B") runLead--; }
  const runAbs = Math.abs(runLead);
  const runLeader = runLead > 0 ? "A" : runLead < 0 ? "B" : null;

  const strokeEntries = isScramble
    ? [
        ...((() => { let s = holeHcp <= hcpA ? 1 : 0; if (hcpA > 18 && holeHcp <= hcpA-18) s++; return s > 0 ? [{ name: match.player1b ? `${match.player1a} & ${match.player1b}` : match.player1a, hcp: hcpA, strokes: s }] : []; })()),
        ...((() => { let s = holeHcp <= hcpB ? 1 : 0; if (hcpB > 18 && holeHcp <= hcpB-18) s++; return s > 0 ? [{ name: match.player2b ? `${match.player2a} & ${match.player2b}` : match.player2a, hcp: hcpB, strokes: s }] : []; })()),
      ]
    : [
        { name: match.player1a, hcp: match.hcp1a || 0 },
        ...(!isSingles ? [{ name: match.player1b, hcp: match.hcp1b || 0 }] : []),
        { name: match.player2a, hcp: match.hcp2a || 0 },
        ...(!isSingles ? [{ name: match.player2b, hcp: match.hcp2b || 0 }] : []),
      ].map(p => { let s = holeHcp <= p.hcp ? 1 : 0; if (p.hcp > 18 && holeHcp <= p.hcp - 18) s++; return { ...p, strokes: s }; }).filter(e => e.strokes > 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 200, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {showHcp && (
        <HcpModal match={match} isSingles={isSingles} teamAColor={teamAColor} teamBColor={teamBColor}
          onSave={v => { onSave({ ...match, ...v }); setShowHcp(false); }} onClose={() => setShowHcp(false)} />
      )}
      {showEndEarly && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: GOLD, marginBottom: 6, fontFamily: "monospace" }}>END MATCH EARLY?</div>
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
                for (let i = 0; i < 18; i++) { if (ns[i] === null || ns[i] === undefined) ns[i] = "H"; }
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
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, color: "#668", padding: "5px 10px", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>← Back</button>
          <button onClick={() => setShowHcp(true)} style={{ fontSize: 10, padding: "4px 10px", background: `${GOLD}22`, border: `1px solid ${GOLD}55`, borderRadius: 6, color: GOLD, cursor: "pointer", fontFamily: "monospace", flexShrink: 0 }}>HCP ✏</button>
        </div>
        <div style={{ display: "flex", alignItems: "stretch", borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
          <div style={{ flex: 1, background: runLeader === "A" ? teamAColor : "#111a2e", padding: "8px 10px", minWidth: 0 }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: runLeader === "A" ? "#ffcccc" : teamAColor, letterSpacing: 1, fontFamily: "monospace", marginBottom: 2 }}>{teamAShort}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.player1a}</div>
            {!isSingles && <div style={{ fontSize: 12, fontWeight: 700, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{match.player1b}</div>}
          </div>
          <div style={{ background: runLeader === "A" ? teamAColor : runLeader === "B" ? teamBColor : "#1a2a44", minWidth: 68, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 4px", borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, flexShrink: 0 }}>
            {cur.state === "pending" ? <div style={{ fontSize: 10, color: "#446", fontFamily: "monospace" }}>—</div>
            : cur.state === "complete" || cur.state === "halved" ? <><div style={{ fontSize: 8, color: "#FFD700", fontFamily: "monospace", fontWeight: 800, letterSpacing: 1 }}>FINAL</div><div style={{ fontSize: 12, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>{cur.sublabel || "HALVED"}</div></>
            : <><div style={{ fontSize: 17, fontWeight: 900, color: "#fff", fontFamily: "monospace", lineHeight: 1 }}>{runLeader ? runAbs : "AS"}</div><div style={{ fontSize: 8, color: "#88aacc", fontFamily: "monospace", marginTop: 1 }}>{runLeader ? "UP" : "ALL SQ"}</div><div style={{ fontSize: 8, color: "#446", fontFamily: "monospace", marginTop: 2 }}>THRU {hole}</div></>}
          </div>
          <div style={{ flex: 1, background: runLeader === "B" ? teamBColor : "#111a2e", padding: "8px 10px", display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 0 }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: runLeader === "B" ? "#cce4ff" : teamBColorDisp, letterSpacing: 1, fontFamily: "monospace", marginBottom: 2 }}>{teamBShort}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right", width: "100%" }}>{match.player2a}</div>
            {!isSingles && <div style={{ fontSize: 12, fontWeight: 700, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right", width: "100%" }}>{match.player2b}</div>}
          </div>
        </div>
      </div>

      {/* Hole strip */}
      <div style={{ padding: "8px 10px 14px", display: "flex", gap: 2 }}>
        {Array.from({ length: 18 }, (_, i) => {
          const s = match.scores[i];
          const isDisputed = (match.disputes || []).includes(i);
          const bg = s === "A" ? teamAColor : s === "B" ? teamBColor : s === "H" ? "#334" : CARD2;
          const isAct = i === hole;
          return (
            <div key={i} style={{ flex: 1, position: "relative" }}>
              <div onClick={() => setHole(i)} style={{ height: isAct ? 26 : 20, background: bg, borderRadius: 3, cursor: "pointer", border: isAct ? `2px solid ${GOLD}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isAct ? 8 : 7, color: isAct ? "#fff" : "#ffffff99", fontFamily: "monospace", fontWeight: 700 }}>{i + 1}</div>
              {s != null && (
                <div onClick={e => { e.stopPropagation(); const cur = match.disputes || []; const nd = cur.includes(i) ? cur.filter(h => h !== i) : [...cur, i]; onSave({ ...match, disputes: nd }); }}
                  style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", fontSize: 9, cursor: "pointer", opacity: isDisputed ? 1 : 0.15, lineHeight: 1, userSelect: "none" }}>🚩</div>
              )}
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div style={{ margin: "10px 12px 0", background: `${cur.leader === "A" ? teamAColor : cur.state === "halved" ? "#334455" : teamBColor}33`, border: `1px solid ${cur.leader === "A" ? teamAColor : cur.state === "halved" ? "#556677" : teamBColor}66`, borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 9, color: "#668", fontFamily: "monospace", letterSpacing: 1 }}>MATCH RESULT</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: GOLD, letterSpacing: 1 }}>{cur.longLabel}</div>
            <div style={{ fontSize: 11, color: "#668", marginTop: 2 }}>{cur.sublabel}</div>
          </div>
          <div style={{ fontSize: 28 }}>🏆</div>
        </div>
      )}
      {cur.state === "gap" && (
        <div style={{ margin: "8px 12px 0", background: "#e67e2222", border: "1px solid #e67e2299", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 18 }}>⚠</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#e67e22", fontFamily: "monospace", letterSpacing: 1 }}>MISSING SCORE</div>
            <div style={{ fontSize: 10, color: "#e67e22bb", marginTop: 2 }}>Score from hole {cur.holesPlayed + 1} has not been recorded</div>
          </div>
          <button onClick={() => setHole(cur.holesPlayed)} style={{ flexShrink: 0, padding: "5px 10px", background: "#e67e2233", border: "1px solid #e67e22", borderRadius: 7, color: "#e67e22", fontSize: 10, cursor: "pointer", fontWeight: 800, fontFamily: "monospace" }}>GO →</button>
        </div>
      )}

      <div style={{ flex: 1, padding: "12px 12px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 12, padding: "10px", background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 8, color: "#446", fontFamily: "monospace", letterSpacing: 2 }}>HOLE</div><div style={{ fontSize: 28, fontWeight: 900, color: GOLD, fontFamily: "monospace", lineHeight: 1 }}>{hole + 1}</div></div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 8, color: "#446", fontFamily: "monospace", letterSpacing: 2 }}>PAR</div><div style={{ fontSize: 28, fontWeight: 900, color: "#ccd", fontFamily: "monospace", lineHeight: 1 }}>{holePar}</div></div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 8, color: "#446", fontFamily: "monospace", letterSpacing: 2 }}>HCP IDX</div><div style={{ fontSize: 28, fontWeight: 900, color: "#ccd", fontFamily: "monospace", lineHeight: 1 }}>{holeHcp}</div></div>
          {strokeEntries.length > 0 && <><div style={{ width: 1, background: BORDER }} /><div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}><div style={{ fontSize: 8, color: GOLD, fontFamily: "monospace", letterSpacing: 1 }}>STROKE</div><div style={{ fontSize: 9, color: GOLD, marginTop: 1 }}>{strokeEntries.map(e => `${e.name}${e.strokes > 1 ? ` ×${e.strokes}` : ""}`).join(", ")}</div></div></>}
        </div>

        <div style={{ background: `${teamAColor}18`, border: `1px solid ${teamAColor}44`, borderRadius: 12, padding: "12px", marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: teamAColor, fontWeight: 800, letterSpacing: 2, fontFamily: "monospace", marginBottom: 10 }}>{teamAShort}</div>
          <div style={{ display: "flex", justifyContent: isSingles ? "center" : "space-around" }}>
            <ScoreInput label={match.player1a} hcp={match.hcp1a || 0} value={sc.p1a} onChange={v => setSc(s => ({ ...s, p1a: v }))} color={teamAColor} labelColor={strokeEntries.find(e => e.name === match.player1a)?.strokes > 0 ? GOLD : null} strokes={strokeEntries.find(e => e.name === match.player1a)?.strokes || 1} par={holePar} />
            {!isSingles && <ScoreInput label={match.player1b} hcp={match.hcp1b || 0} value={sc.p1b} onChange={v => setSc(s => ({ ...s, p1b: v }))} color={teamAColor} labelColor={strokeEntries.find(e => e.name === match.player1b)?.strokes > 0 ? GOLD : null} strokes={strokeEntries.find(e => e.name === match.player1b)?.strokes || 1} par={holePar} />}
          </div>
          {!isSingles && <div style={{ textAlign: "center", marginTop: 8, fontSize: 10, color: "#fff4" }}>best net: <span style={{ color: "#fff", fontWeight: 700 }}>{teamANet}</span></div>}
        </div>

        <div style={{ background: `${teamBColor}33`, border: `1px solid ${teamBColor}66`, borderRadius: 12, padding: "12px", marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: teamBColorDisp, fontWeight: 800, letterSpacing: 2, fontFamily: "monospace", marginBottom: 10 }}>{teamBShort}</div>
          <div style={{ display: "flex", justifyContent: isSingles ? "center" : "space-around" }}>
            <ScoreInput label={match.player2a} hcp={match.hcp2a || 0} value={sc.p2a} onChange={v => setSc(s => ({ ...s, p2a: v }))} color={teamBColorDisp} labelColor={strokeEntries.find(e => e.name === match.player2a)?.strokes > 0 ? GOLD : null} strokes={strokeEntries.find(e => e.name === match.player2a)?.strokes || 1} par={holePar} />
            {!isSingles && <ScoreInput label={match.player2b} hcp={match.hcp2b || 0} value={sc.p2b} onChange={v => setSc(s => ({ ...s, p2b: v }))} color={teamBColorDisp} labelColor={strokeEntries.find(e => e.name === match.player2b)?.strokes > 0 ? GOLD : null} strokes={strokeEntries.find(e => e.name === match.player2b)?.strokes || 1} par={holePar} />}
          </div>
          {!isSingles && <div style={{ textAlign: "center", marginTop: 8, fontSize: 10, color: "#fff4" }}>best net: <span style={{ color: "#fff", fontWeight: 700 }}>{teamBNet}</span></div>}
        </div>

        <div style={{ background: `${hwColor}22`, border: `1px solid ${hwColor}55`, borderRadius: 10, padding: "9px 12px", marginBottom: 10, textAlign: "center" }}>
          <div style={{ fontSize: 9, color: "#446", fontFamily: "monospace", marginBottom: 2 }}>HOLE RESULT</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: hwColor }}>{hwLabel}</div>
        </div>

        {cur.state === "gap" && hole !== cur.holesPlayed
          ? <div style={{ width: "100%", padding: "15px", background: "#e67e2222", border: "1px solid #e67e2266", borderRadius: 14, color: "#e67e22", fontWeight: 900, fontSize: 13, textAlign: "center", fontFamily: "monospace", marginBottom: 8, letterSpacing: 1 }}>⚠ ENTER HOLE {cur.holesPlayed + 1} FIRST</div>
          : <button onClick={handleConfirm} style={{ width: "100%", padding: "15px", background: `linear-gradient(135deg,${hwColor},${hwColor}aa)`, border: "none", borderRadius: 14, color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer", letterSpacing: 1, fontFamily: "monospace", boxShadow: `0 4px 18px ${hwColor}44`, marginBottom: 8 }}>CONFIRM HOLE {hole + 1} →</button>
        }
        {hole > 0 && <button onClick={handleUndo} style={{ width: "100%", padding: "9px", background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, color: "#446", fontSize: 11, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1, marginBottom: 8 }}>↩ UNDO HOLE {hole}</button>}
        {!isComplete && <button onClick={() => setShowEndEarly(true)} style={{ width: "100%", padding: "7px", background: "none", border: `1px solid #334`, borderRadius: 10, color: "#446", fontSize: 10, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1, marginBottom: 20 }}>End Match Early</button>}
      </div>
    </div>
  );
}
