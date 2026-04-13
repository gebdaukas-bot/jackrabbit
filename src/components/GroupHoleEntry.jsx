import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { netScore, computeMatchStatus, GOLD } from "../utils/scoring";
import ScoreInput from "./ScoreInput";

export default function GroupHoleEntry({ matches, course, cup, onSave, onClose }) {
  const { BG, CARD, CARD2, BORDER, MUTED } = useTheme();
  const { teamAColor, teamAShort, teamBColor, teamBColorDisp, teamBShort } = cup;

  const initHole = () => {
    const hp = matches.map(m => { const s = computeMatchStatus(m.scores, teamAShort, teamBShort); return s.holesPlayed < 18 ? s.holesPlayed : 17; });
    return Math.max(...hp);
  };
  const [hole, setHole] = useState(initHole);
  const [showEndEarly, setShowEndEarly] = useState(false);

  const [grossScores, setGrossScores] = useState(() =>
    matches.map(m =>
      Array.from({ length: 18 }, (_, i) => {
        const par = course.par[i];
        return {
          p1a: Array.isArray(m.grossP1a) && m.grossP1a[i] != null ? m.grossP1a[i] : par,
          p2a: Array.isArray(m.grossP2a) && m.grossP2a[i] != null ? m.grossP2a[i] : par,
        };
      })
    )
  );

  const holeHcp = course.hcp[hole], holePar = course.par[hole];

  const holeWinner = (mi) => {
    const sc = grossScores[mi][hole];
    const m = matches[mi];
    const net1a = netScore(sc.p1a, m.hcp1a || 0, holeHcp);
    const net2a = netScore(sc.p2a, m.hcp2a || 0, holeHcp);
    return net1a < net2a ? "A" : net2a < net1a ? "B" : "H";
  };

  const setSc = (mi, updater) => {
    setGrossScores(prev => {
      const next = prev.map(ms => [...ms]);
      next[mi][hole] = typeof updater === "function" ? updater(prev[mi][hole]) : updater;
      return next;
    });
  };

  const handleConfirm = () => {
    matches.forEach((m, mi) => {
      const hw = holeWinner(mi);
      const ns = [...m.scores]; ns[hole] = hw;
      const toArr = (existing, newVal) => {
        const arr = Array.isArray(existing) ? [...existing] : Array(18).fill(null);
        arr[hole] = newVal;
        return arr;
      };
      onSave(mi, { ...m, scores: ns, grossP1a: toArr(m.grossP1a, grossScores[mi][hole].p1a), grossP2a: toArr(m.grossP2a, grossScores[mi][hole].p2a) });
    });
    if (hole < 17) {
      const nextPar = course.par[hole + 1];
      setHole(h => h + 1);
      setGrossScores(prev => {
        const next = prev.map(ms => [...ms]);
        next[0][hole + 1] = { p1a: nextPar, p2a: nextPar };
        next[1][hole + 1] = { p1a: nextPar, p2a: nextPar };
        return next;
      });
    }
  };

  const handleUndo = () => {
    if (hole === 0) return;
    const undoHole = hole - 1;
    matches.forEach((m, mi) => {
      const ns = [...m.scores]; ns[undoHole] = null;
      const clearArr = arr => { const a = Array.isArray(arr) ? [...arr] : Array(18).fill(null); a[undoHole] = null; return a; };
      onSave(mi, { ...m, scores: ns, grossP1a: clearArr(m.grossP1a), grossP2a: clearArr(m.grossP2a) });
    });
    setHole(h => h - 1);
    const prevPar = course.par[undoHole];
    setGrossScores(prev => {
      const next = prev.map(ms => [...ms]);
      next[0][undoHole] = { p1a: prevPar, p2a: prevPar };
      next[1][undoHole] = { p1a: prevPar, p2a: prevPar };
      return next;
    });
  };

  const statuses = matches.map(m => computeMatchStatus(m.scores, teamAShort, teamBShort));
  const isComplete = statuses.every(s => s.state === "complete" || s.state === "halved");
  const hasGap = statuses.some(s => s.state === "gap");

  const m0 = matches[0], m1 = matches[1];
  const sc0 = grossScores[0][hole], sc1 = grossScores[1][hole];

  const hw0 = holeWinner(0), hw1 = holeWinner(1);
  const hw0Color = hw0 === "A" ? teamAColor : hw0 === "B" ? teamBColor : GOLD;
  const hw1Color = hw1 === "A" ? teamAColor : hw1 === "B" ? teamBColor : GOLD;

  const net0_1a = netScore(sc0.p1a, m0.hcp1a || 0, holeHcp);
  const net0_2a = netScore(sc0.p2a, m0.hcp2a || 0, holeHcp);
  const net1_1a = netScore(sc1.p1a, m1.hcp1a || 0, holeHcp);
  const net1_2a = netScore(sc1.p2a, m1.hcp2a || 0, holeHcp);

  const str = (hcp) => { let s = holeHcp <= hcp ? 1 : 0; if (hcp > 18 && holeHcp <= hcp - 18) s++; return s; };
  const strokeEntries = [
    { name: m0.player1a, hcp: m0.hcp1a || 0 }, { name: m0.player2a, hcp: m0.hcp2a || 0 },
    { name: m1.player1a, hcp: m1.hcp1a || 0 }, { name: m1.player2a, hcp: m1.hcp2a || 0 },
  ].map(p => ({ ...p, strokes: str(p.hcp) })).filter(e => e.strokes > 0);

  let runLead0 = 0; for (let i = 0; i < hole; i++) { if (m0.scores[i] === "A") runLead0++; else if (m0.scores[i] === "B") runLead0--; }
  let runLead1 = 0; for (let i = 0; i < hole; i++) { if (m1.scores[i] === "A") runLead1++; else if (m1.scores[i] === "B") runLead1--; }

  const MatchBar = ({ m, lead, s }) => {
    const rAbs = Math.abs(lead), rLeader = lead > 0 ? "A" : lead < 0 ? "B" : null;
    return (
      <div style={{ display: "flex", alignItems: "stretch", borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}`, marginBottom: 6 }}>
        <div style={{ flex: 1, background: rLeader === "A" ? teamAColor : "#111a2e", padding: "5px 8px", minWidth: 0 }}>
          <div style={{ fontSize: 7, fontWeight: 800, color: rLeader === "A" ? "#ffcccc" : teamAColor, letterSpacing: 1, fontFamily: "monospace" }}>{teamAShort}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.player1a}</div>
        </div>
        <div style={{ background: rLeader === "A" ? teamAColor : rLeader === "B" ? teamBColor : "#1a2a44", minWidth: 58, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3px", borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, flexShrink: 0 }}>
          {s.state === "pending" ? <div style={{ fontSize: 9, color: "#446", fontFamily: "monospace" }}>—</div>
          : s.state === "complete" || s.state === "halved" ? <><div style={{ fontSize: 6, color: "#FFD700", fontFamily: "monospace", fontWeight: 800 }}>FINAL</div><div style={{ fontSize: 10, fontWeight: 900, color: "#fff", fontFamily: "monospace" }}>{s.sublabel || "HALVED"}</div></>
          : <><div style={{ fontSize: 13, fontWeight: 900, color: "#fff", fontFamily: "monospace", lineHeight: 1 }}>{rLeader ? rAbs : "AS"}</div><div style={{ fontSize: 6, color: "#88aacc", fontFamily: "monospace" }}>{rLeader ? "UP" : "ALL SQ"}</div><div style={{ fontSize: 6, color: "#446", fontFamily: "monospace" }}>THRU {hole}</div></>}
        </div>
        <div style={{ flex: 1, background: rLeader === "B" ? teamBColor : "#111a2e", padding: "5px 8px", display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 0 }}>
          <div style={{ fontSize: 7, fontWeight: 800, color: rLeader === "B" ? "#cce4ff" : teamBColorDisp, letterSpacing: 1, fontFamily: "monospace" }}>{teamBShort}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right", width: "100%" }}>{m.player2a}</div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 200, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      {showEndEarly && (
        <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: GOLD, marginBottom: 6, fontFamily: "monospace" }}>END BOTH MATCHES EARLY?</div>
            <div style={{ fontSize: 10, color: MUTED, marginBottom: 20 }}>Remaining holes will be halved for both matches.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowEndEarly(false)} style={{ flex: 1, padding: "10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, color: MUTED, fontSize: 12, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => {
                matches.forEach((m, mi) => { const ns = [...m.scores]; for (let i = 0; i < 18; i++) { if (ns[i] === null || ns[i] === undefined) ns[i] = "H"; } onSave(mi, { ...m, scores: ns }); });
                setShowEndEarly(false); onClose();
              }} style={{ flex: 1, padding: "10px", background: `linear-gradient(135deg,${teamBColor},${teamBColorDisp}66)`, border: `1px solid ${teamBColor}`, borderRadius: 10, color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "10px 12px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, color: "#668", padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>← Back</button>
          <div style={{ fontSize: 9, color: GOLD, fontFamily: "monospace", letterSpacing: 1 }}>GROUP · {m0.teeTime}</div>
        </div>
        <MatchBar m={m0} lead={runLead0} s={statuses[0]} />
        <MatchBar m={m1} lead={runLead1} s={statuses[1]} />
      </div>

      <div style={{ padding: "8px 10px 14px", display: "flex", gap: 2 }}>
        {Array.from({ length: 18 }, (_, i) => {
          const s = m0.scores[i];
          const bg = s === "A" ? teamAColor : s === "B" ? teamBColor : s === "H" ? "#334" : CARD2;
          const isAct = i === hole;
          return <div key={i} onClick={() => setHole(i)} style={{ flex: 1, height: isAct ? 26 : 20, background: bg, borderRadius: 3, cursor: "pointer", border: isAct ? `2px solid ${GOLD}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isAct ? 8 : 7, color: isAct ? "#fff" : "#ffffff99", fontFamily: "monospace", fontWeight: 700 }}>{i + 1}</div>;
        })}
      </div>

      <div style={{ flex: 1, padding: "0 12px 0" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 12, padding: "10px", background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` }}>
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 8, color: "#446", fontFamily: "monospace", letterSpacing: 2 }}>HOLE</div><div style={{ fontSize: 28, fontWeight: 900, color: GOLD, fontFamily: "monospace", lineHeight: 1 }}>{hole + 1}</div></div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 8, color: "#446", fontFamily: "monospace", letterSpacing: 2 }}>PAR</div><div style={{ fontSize: 28, fontWeight: 900, color: "#ccd", fontFamily: "monospace", lineHeight: 1 }}>{holePar}</div></div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ textAlign: "center" }}><div style={{ fontSize: 8, color: "#446", fontFamily: "monospace", letterSpacing: 2 }}>HCP IDX</div><div style={{ fontSize: 28, fontWeight: 900, color: "#ccd", fontFamily: "monospace", lineHeight: 1 }}>{holeHcp}</div></div>
          {strokeEntries.length > 0 && <><div style={{ width: 1, background: BORDER }} /><div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}><div style={{ fontSize: 8, color: GOLD, fontFamily: "monospace", letterSpacing: 1 }}>STROKE</div><div style={{ fontSize: 9, color: GOLD, marginTop: 1 }}>{strokeEntries.map(e => `${e.name}${e.strokes > 1 ? ` ×${e.strokes}` : ""}`).join(", ")}</div></div></>}
        </div>

        {isComplete && (
          <div style={{ marginBottom: 10, background: `${GOLD}22`, border: `1px solid ${GOLD}55`, borderRadius: 12, padding: "12px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: GOLD }}>BOTH MATCHES COMPLETE 🏆</div>
          </div>
        )}
        {hasGap && (
          <div style={{ marginBottom: 8, background: "#e67e2222", border: "1px solid #e67e2299", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 18 }}>⚠</div>
            <div style={{ fontSize: 10, color: "#e67e22", fontFamily: "monospace" }}>MISSING SCORE — fill earlier hole first</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {[
            { m: m0, sc: sc0, mi: 0, hwColor: hw0Color, hw: hw0, netA: net0_1a, netB: net0_2a },
            { m: m1, sc: sc1, mi: 1, hwColor: hw1Color, hw: hw1, netA: net1_1a, netB: net1_2a },
          ].map(({ m, sc, mi, hwColor, hw, netA, netB }) => (
            <div key={mi} style={{ flex: 1, borderRadius: 14, overflow: "hidden", border: `1px solid ${BORDER}`, display: "flex", flexDirection: "column" }}>
              <div style={{ background: `${teamAColor}22`, padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
                <ScoreInput label={m.player1a} hcp={m.hcp1a || 0} value={sc.p1a} onChange={v => setSc(mi, s => ({ ...s, p1a: v }))} color={teamAColor} labelColor={str(m.hcp1a || 0) > 0 ? GOLD : null} strokes={str(m.hcp1a || 0) || 1} par={holePar} />
              </div>
              <div style={{ background: CARD2, padding: "5px 0", textAlign: "center", fontSize: 12, fontWeight: 900, color: MUTED, fontFamily: "monospace", letterSpacing: 2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>VS</div>
              <div style={{ background: `${teamBColor}33`, padding: "10px 6px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 120 }}>
                <ScoreInput label={m.player2a} hcp={m.hcp2a || 0} value={sc.p2a} onChange={v => setSc(mi, s => ({ ...s, p2a: v }))} color={teamBColorDisp} labelColor={str(m.hcp2a || 0) > 0 ? GOLD : null} strokes={str(m.hcp2a || 0) || 1} par={holePar} />
              </div>
              <div style={{ background: hwColor, padding: "8px 4px", textAlign: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: "#fff", fontFamily: "monospace", letterSpacing: 1 }}>
                  {hw === "A" ? `${m.player1a} wins` : hw === "B" ? `${m.player2a} wins` : "HALVED"}
                </div>
                <div style={{ fontSize: 9, color: "#ffffffbb", marginTop: 1, fontFamily: "monospace" }}>
                  {hw === "H" ? `net ${netA} · ${netB}` : `net ${netA} vs ${netB}`}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!isComplete && (
          <button onClick={handleConfirm} style={{ width: "100%", padding: "15px", background: `linear-gradient(135deg,${GOLD},${GOLD}aa)`, border: "none", borderRadius: 14, color: "#fff", fontWeight: 900, fontSize: 15, cursor: "pointer", letterSpacing: 1, fontFamily: "monospace", boxShadow: `0 4px 18px ${GOLD}44`, marginBottom: 8 }}>CONFIRM HOLE {hole + 1} →</button>
        )}
        {hole > 0 && <button onClick={handleUndo} style={{ width: "100%", padding: "9px", background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, color: "#446", fontSize: 11, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1, marginBottom: 8 }}>↩ UNDO HOLE {hole}</button>}
        {!isComplete && <button onClick={() => setShowEndEarly(true)} style={{ width: "100%", padding: "7px", background: "none", border: `1px solid #334`, borderRadius: 10, color: "#446", fontSize: 10, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1, marginBottom: 20 }}>End Matches Early</button>}
      </div>
    </div>
  );
}
