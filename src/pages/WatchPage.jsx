import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db, ref, onValue } from "../firebase";
import { computeMatchStatus, GOLD } from "../utils/scoring";
import { contrastText } from "../utils/color";
import { useTheme } from "../context/ThemeContext";
import LiveBackground from "../components/LiveBackground";

// Read-only spectator view for a standalone 1v1/2v2 match — no login, no join,
// no scoring. Just the live status, for sharing with people who only want to watch.
export default function WatchPage() {
  const { cupId } = useParams();
  const { CARD, CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [meta, setMeta] = useState(null);
  const [day, setDay] = useState(null);
  const [match, setMatch] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const unsubMeta = onValue(ref(db, `cups/${cupId}/meta`), snap => {
      if (!snap.exists()) { setNotFound(true); return; }
      setMeta(snap.val());
    });
    const unsubDays = onValue(ref(db, `cups/${cupId}/days/0`), snap => { if (snap.exists()) setDay(snap.val()); });
    const unsubMatches = onValue(ref(db, `cups/${cupId}/matches/m1101`), snap => {
      if (snap.exists()) setMatch(m => ({ ...(m || {}), id: 1101, roundIdx: 0, ...snap.val() }));
    });
    const unsubScores = onValue(ref(db, `cups/${cupId}/scores/m1101`), snap => {
      const fb = snap.val() || {};
      const scores = Array.isArray(fb.scores) ? fb.scores : Array.from({ length: 18 }, (_, i) => fb.scores?.[i] ?? null);
      setMatch(m => ({
        ...(m || {}), scores,
        hcp1a: fb.hcp1a ?? m?.hcp1a, hcp1b: fb.hcp1b ?? m?.hcp1b, hcp2a: fb.hcp2a ?? m?.hcp2a, hcp2b: fb.hcp2b ?? m?.hcp2b,
        grossP1a: fb.grossP1a ? Array.from({ length: 18 }, (_, i) => fb.grossP1a[i] ?? null) : null,
        grossP1b: fb.grossP1b ? Array.from({ length: 18 }, (_, i) => fb.grossP1b[i] ?? null) : null,
        grossP2a: fb.grossP2a ? Array.from({ length: 18 }, (_, i) => fb.grossP2a[i] ?? null) : null,
        grossP2b: fb.grossP2b ? Array.from({ length: 18 }, (_, i) => fb.grossP2b[i] ?? null) : null,
        extra: fb.extra ? Object.values(fb.extra) : [],
        extraGrossA: fb.extraGrossA ? Object.values(fb.extraGrossA) : [],
        extraGrossB: fb.extraGrossB ? Object.values(fb.extraGrossB) : [],
      }));
    });
    return () => { unsubMeta(); unsubDays(); unsubMatches(); unsubScores(); };
  }, [cupId]);

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, color: TEXT }}>
        <LiveBackground/>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 13, color: MUTED }}>This match link isn't valid, or the match was removed.</div>
        </div>
      </div>
    );
  }

  if (!meta || !day || !match) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: TEXT }}>
        <LiveBackground/>
        <div style={{ fontSize: 13, color: MUTED }}>Loading match…</div>
      </div>
    );
  }

  const round = day.rounds?.[0] || {};
  const course = round.course || {};
  const isSingles = !match.player1b;
  const st = computeMatchStatus(match.scores || Array(18).fill(null), meta.teamAName, meta.teamBName, match.startHole || 0, round.totalHoles || 18, round.pointValue || 1, round.allowExtraHoles || false, match.extra || []);
  const extraCount = match.extra?.length || 0;

  let lead = 0;
  const runLeads = Array(18).fill(null);
  for (let k = 0; k < 18; k++) {
    const s = (match.scores || [])[k];
    if (s === null || s === undefined) continue;
    if (s === "A") lead++; else if (s === "B") lead--;
    runLeads[k] = lead;
  }

  return (
    <div style={{ minHeight: "100vh", color: TEXT }}>
      <LiveBackground/>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 14px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, fontFamily: "monospace", letterSpacing: 2 }}>DORMIE · VIEW ONLY</div>
          <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>{meta.name}</div>
        </div>

        <div style={{ display: "flex", alignItems: "stretch", borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}`, marginBottom: 16 }}>
          <div style={{ flex: 1, background: meta.teamAColor, padding: "12px 14px", minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: `${contrastText(meta.teamAColor)}cc`, letterSpacing: 1, fontFamily: "monospace" }}>{meta.teamAName}</div>
          </div>
          <div style={{ background: "#060d1e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 14px", flexShrink: 0, minWidth: 100 }}>
            {st.state === "pending" && <div style={{ fontSize: 9, color: "#446", fontFamily: "monospace" }}>NOT STARTED</div>}
            {st.state === "live" && <><div style={{ fontSize: 8, color: "#446", fontFamily: "monospace" }}>THRU {st.holesPlayed}</div><div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace" }}>{!st.leader ? "AS" : `${st.up}UP`}</div></>}
            {st.state === "extra" && <><div style={{ fontSize: 8, color: GOLD, fontFamily: "monospace" }}>PLAYOFF</div><div style={{ fontSize: 14, fontWeight: 900, fontFamily: "monospace" }}>{st.sublabel}</div></>}
            {st.state === "halved" && <div style={{ fontSize: 12, fontWeight: 900, color: "#557", fontFamily: "monospace" }}>HALVED</div>}
            {st.state === "complete" && <><div style={{ fontSize: 8, color: GOLD, fontFamily: "monospace", fontWeight: 700 }}>FINAL</div><div style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace" }}>{st.sublabel}</div></>}
            {st.state === "gap" && <div style={{ fontSize: 9, color: "#e67e22", fontFamily: "monospace" }}>⚠ MISSING</div>}
          </div>
          <div style={{ flex: 1, background: meta.teamBColor, padding: "12px 14px", minWidth: 0, textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: `${contrastText(meta.teamBColor)}cc`, letterSpacing: 1, fontFamily: "monospace" }}>{meta.teamBName}</div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: MUTED, marginBottom: 16 }}>
          {match.player1a}{match.player1b ? ` & ${match.player1b}` : ""} <span style={{ color: "#557" }}>vs</span> {match.player2a}{match.player2b ? ` & ${match.player2b}` : ""}
          {course.name && <div style={{ marginTop: 4, fontSize: 10 }}>{course.name}</div>}
        </div>

        {/* Hole by hole */}
        <div style={{ fontSize: 9, color: GOLD, fontFamily: "monospace", letterSpacing: 2, opacity: 0.7, marginBottom: 6 }}>HOLE BY HOLE</div>
        {(() => {
          const totalCols = 18 + extraCount;
          const scoreStyle = (gross, par) => {
            if (gross === null || gross === undefined) return { val: "·", color: "#334", bg: "transparent", border: "none", radius: 2 };
            const d = gross - par;
            if (d <= -2) return { val: gross, color: "#FFD700", bg: "transparent", border: "1.5px double #FFD700", radius: 2 };
            if (d === -1) return { val: gross, color: "#4caf50", bg: "transparent", border: "1.5px solid #4caf50", radius: "50%" };
            if (d === 0) return { val: gross, color: "#ccd", bg: "transparent", border: "none", radius: 2 };
            if (d === 1) return { val: gross, color: "#e88", bg: "transparent", border: "1.5px solid #e88", radius: 2 };
            if (d === 2) return { val: gross, color: "#e55", bg: "transparent", border: "1.5px solid #e55", radius: 2 };
            return { val: gross, color: "#fff", bg: "#c0392b", border: "none", radius: 2 };
          };
          const arrowCell = (num, isA) => {
            if (num === 0) return <div style={{ fontSize: 11, fontWeight: 900, color: "#557" }}>—</div>;
            const col = isA ? meta.teamAColor : meta.teamBColor;
            return (
              <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
                <div style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", ...(isA ? { borderBottom: `24px solid ${col}` } : { borderTop: `24px solid ${col}` }), position: "absolute", top: 0, left: 0 }}/>
                <span style={{ position: "relative", zIndex: 1, fontSize: 9, fontWeight: 900, color: "#fff", marginTop: isA ? 5 : -5 }}>{num}</span>
              </div>
            );
          };
          const grossP1a = match.grossP1a || Array(18).fill(null);
          const grossP1b = match.grossP1b || Array(18).fill(null);
          const grossP2a = match.grossP2a || Array(18).fill(null);
          const grossP2b = match.grossP2b || Array(18).fill(null);
          const rowLabels = isSingles ? [match.player1a, "SCORE", match.player2a] : [match.player1a, match.player1b, "SCORE", match.player2a, match.player2b];
          const rowColors = isSingles ? [meta.teamAColor, null, meta.teamBColor] : [meta.teamAColor, meta.teamAColor, null, meta.teamBColor, meta.teamBColor];
          const rowData = (hi) => {
            if (hi >= 18) {
              const en = hi - 18;
              const es = match.extra?.[en];
              const par = course.par?.[0] || 4;
              const scoreCell = es === "A" || es === "B" ? arrowCell(1, es === "A") : <div style={{ fontSize: 11, fontWeight: 900, color: "#557" }}>—</div>;
              if (isSingles) return [scoreStyle(match.extraGrossA?.[en] ?? null, par), scoreCell, scoreStyle(match.extraGrossB?.[en] ?? null, par)];
              return [scoreStyle(match.extraGrossA?.[en] ?? null, par), scoreStyle(null, par), scoreCell, scoreStyle(match.extraGrossB?.[en] ?? null, par), scoreStyle(null, par)];
            }
            const par = (course.par || [])[hi] || 4;
            const s = (match.scores || [])[hi];
            let scoreCell;
            if (s === null || s === undefined) scoreCell = <div style={{ fontSize: 9, color: "#334" }}>·</div>;
            else if (s === "H") scoreCell = <div style={{ fontSize: 11, fontWeight: 900, color: "#557" }}>—</div>;
            else { const rl = runLeads[hi]; scoreCell = arrowCell(rl === null ? 0 : Math.abs(rl), s === "A"); }
            if (isSingles) return [scoreStyle(grossP1a[hi], par), scoreCell, scoreStyle(grossP2a[hi], par)];
            return [scoreStyle(grossP1a[hi], par), scoreStyle(grossP1b[hi], par), scoreCell, scoreStyle(grossP2a[hi], par), scoreStyle(grossP2b[hi], par)];
          };
          return (
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` }}>
              <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#080f20", borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "5px 10px", position: "sticky", left: 0, background: "#080f20" }}></td>
                    {Array.from({ length: totalCols }, (_, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "5px 4px", fontSize: 8, color: i >= 18 ? GOLD : "#668", fontFamily: "monospace", minWidth: 30, borderLeft: i === 9 || i === 18 ? `1px solid ${BORDER}` : undefined }}>
                        {i < 18 ? i + 1 : `PO${i - 17}`}
                      </td>
                    ))}
                  </tr>
                  <tr style={{ background: "#080f20", borderBottom: `2px solid ${BORDER}` }}>
                    <td style={{ padding: "4px 10px", fontSize: 8, color: "#446", fontFamily: "monospace", position: "sticky", left: 0, background: "#080f20" }}>PAR</td>
                    {Array.from({ length: totalCols }, (_, i) => (
                      <td key={i} style={{ textAlign: "center", padding: "4px 4px", fontSize: 9, color: "#557", fontFamily: "monospace", fontWeight: 700, borderLeft: i === 9 || i === 18 ? `1px solid ${BORDER}` : undefined }}>{i < 18 ? (course.par?.[i] || 4) : (course.par?.[0] || 4)}</td>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowLabels.map((label, ri) => {
                    const isScoreRow = label === "SCORE";
                    const nameColor = rowColors[ri];
                    return (
                      <tr key={ri} style={{ borderBottom: `1px solid ${BORDER}22`, background: isScoreRow ? "#060f22" : ri % 2 === 0 ? CARD : CARD2 }}>
                        <td style={{ padding: "6px 10px", fontSize: isScoreRow ? 8 : 11, fontWeight: 700, color: isScoreRow ? "#446" : nameColor, whiteSpace: "nowrap", position: "sticky", left: 0, background: isScoreRow ? "#060f22" : ri % 2 === 0 ? CARD : CARD2, fontFamily: isScoreRow ? "monospace" : "inherit", letterSpacing: isScoreRow ? 1 : 0 }}>{label}</td>
                        {Array.from({ length: totalCols }, (_, hi) => {
                          const cell = rowData(hi)[ri];
                          return (
                            <td key={hi} style={{ textAlign: "center", padding: "4px 2px", borderLeft: hi === 9 || hi === 18 ? `1px solid ${BORDER}` : undefined }}>
                              {isScoreRow ? (
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 30 }}>{cell}</div>
                              ) : (
                                <div style={{ width: 24, height: 24, background: cell.bg, border: cell.border, borderRadius: cell.radius, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: cell.color, margin: "0 auto" }}>{cell.val}</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
        <div style={{ textAlign: "center", fontSize: 10, color: "#446", marginTop: 16, fontFamily: "monospace" }}>Updates live · view only</div>
      </div>
    </div>
  );
}
