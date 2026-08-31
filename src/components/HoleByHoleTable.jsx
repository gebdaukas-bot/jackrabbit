import { useTheme } from "../context/ThemeContext";
import { GOLD } from "../utils/scoring";

// Full hole-by-hole scorecard for a single match: PAR + YARDAGE header rows,
// one row per player with birdie/par/bogey-styled gross scores plus OUT/IN/TOT
// subtotals, and a SCORE row showing the running match-play lead as an arrow
// pointing at whoever's ahead. Shared by the in-app BOARD tab and the
// no-login view-only page so they can't drift out of sync with each other.
export default function HoleByHoleTable({ match, course, totalHoles = 18, teamAColor, teamBColor, longLabel, sublabel, statusColor, meta }) {
  const { CARD, CARD2, BORDER, MUTED } = useTheme();
  const isSingles = !match.player1b;
  const extraCount = match.extra?.length || 0;
  const startHole = match.startHole || 0;

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
  const totalStyle = (val) => ({ val: val ?? "—", color: val != null ? "#FFD700" : "#446", bg: "transparent", border: "none", radius: 2, bold: true });

  const arrowCell = (num, isA) => {
    if (num === 0) return <div style={{ fontSize: 11, fontWeight: 900, color: "#557" }}>—</div>;
    const col = isA ? teamAColor : teamBColor;
    return (
      <div style={{ position: "relative", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
        <div style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", ...(isA ? { borderBottom: `24px solid ${col}` } : { borderTop: `24px solid ${col}` }), position: "absolute", top: 0, left: 0 }}/>
        <span style={{ position: "relative", zIndex: 1, fontSize: 9, fontWeight: 900, color: "#fff", marginTop: isA ? 5 : -5 }}>{num}</span>
      </div>
    );
  };

  // Running lead, walked in this match's actual play order (shotgun/split starts
  // don't necessarily begin on hole 1), then placed back on its physical hole.
  let lead = 0;
  const runLeads = Array(18).fill(null);
  for (let k = 0; k < 18; k++) {
    const i = (startHole + k) % 18;
    const s = (match.scores || [])[i];
    if (s === null || s === undefined) continue;
    if (s === "A") lead++; else if (s === "B") lead--;
    runLeads[i] = lead;
  }

  const par = course.par || Array(18).fill(4);
  const yardage = course.yardage?.some(y => y) ? course.yardage : null;
  const grossP1a = match.grossP1a || Array(18).fill(null);
  const grossP1b = match.grossP1b || Array(18).fill(null);
  const grossP2a = match.grossP2a || Array(18).fill(null);
  const grossP2b = match.grossP2b || Array(18).fill(null);

  const sum9 = (arr, from) => {
    const slice = arr.slice(from, from + 9);
    return slice.some(v => v == null) ? null : slice.reduce((a, b) => a + b, 0);
  };
  const sum18 = (arr) => (arr.slice(0, 18).some(v => v == null) ? null : arr.slice(0, 18).reduce((a, b) => a + b, 0));

  // Column plan: 1-9, OUT, 10-18, IN, TOT, then any sudden-death playoff holes
  // (excluded from OUT/IN/TOT since they're extra to the round, not part of it).
  const cols = [
    ...Array.from({ length: 9 }, (_, i) => ({ type: "hole", hi: i })),
    { type: "out" },
    ...Array.from({ length: 9 }, (_, i) => ({ type: "hole", hi: i + 9 })),
    { type: "in" },
    { type: "tot" },
    ...Array.from({ length: extraCount }, (_, i) => ({ type: "hole", hi: 18 + i })),
  ];

  const rowLabels = isSingles ? [match.player1a, "SCORE", match.player2a] : [match.player1a, match.player1b, "SCORE", match.player2a, match.player2b];
  const rowColors = isSingles ? [teamAColor, null, teamBColor] : [teamAColor, teamAColor, null, teamBColor, teamBColor];

  const cellFor = (col, ri) => {
    if (col.type === "hole" && col.hi >= 18) {
      const en = col.hi - 18;
      const es = match.extra?.[en];
      const p = course.par?.[0] || 4;
      const scoreCell = es === "A" || es === "B" ? arrowCell(1, es === "A") : <div style={{ fontSize: 11, fontWeight: 900, color: "#557" }}>—</div>;
      if (isSingles) return [scoreStyle(match.extraGrossA?.[en] ?? null, p), scoreCell, scoreStyle(match.extraGrossB?.[en] ?? null, p)][ri];
      return [scoreStyle(match.extraGrossA?.[en] ?? null, p), scoreStyle(null, p), scoreCell, scoreStyle(match.extraGrossB?.[en] ?? null, p), scoreStyle(null, p)][ri];
    }
    if (col.type === "hole") {
      const hi = col.hi, p = par[hi] || 4;
      const s = (match.scores || [])[hi];
      let scoreCell;
      if (s === null || s === undefined) scoreCell = <div style={{ fontSize: 9, color: "#334" }}>·</div>;
      else if (s === "H") scoreCell = <div style={{ fontSize: 11, fontWeight: 900, color: "#557" }}>—</div>;
      else { const rl = runLeads[hi]; scoreCell = arrowCell(rl === null ? 0 : Math.abs(rl), s === "A"); }
      if (isSingles) return [scoreStyle(grossP1a[hi], p), scoreCell, scoreStyle(grossP2a[hi], p)][ri];
      return [scoreStyle(grossP1a[hi], p), scoreStyle(grossP1b[hi], p), scoreCell, scoreStyle(grossP2a[hi], p), scoreStyle(grossP2b[hi], p)][ri];
    }
    // out / in / tot — subtotal columns, blank on the SCORE row
    const dash = { val: "—", color: "#446", bg: "transparent", border: "none", radius: 2 };
    const scoreDash = <div style={{ fontSize: 11, fontWeight: 900, color: "#334" }}></div>;
    const from = col.type === "in" ? 9 : 0;
    const sum = (arr) => col.type === "tot" ? sum18(arr) : sum9(arr, from);
    if (isSingles) return [totalStyle(sum(grossP1a)), scoreDash, totalStyle(sum(grossP2a))][ri];
    return [totalStyle(sum(grossP1a)), totalStyle(sum(grossP1b)), scoreDash, totalStyle(sum(grossP2a)), totalStyle(sum(grossP2b))][ri];
  };

  const colHeader = (col) => {
    if (col.type === "hole") return col.hi < 18 ? col.hi + 1 : `PO${col.hi - 17}`;
    return { out: "OUT", in: "IN", tot: "TOT" }[col.type];
  };
  const colPar = (col) => {
    if (col.type === "hole") return col.hi < 18 ? (par[col.hi] || 4) : (par[0] || 4);
    if (col.type === "out") return par.slice(0, 9).reduce((a, b) => a + b, 0);
    if (col.type === "in") return par.slice(9, 18).reduce((a, b) => a + b, 0);
    return par.slice(0, 18).reduce((a, b) => a + b, 0);
  };
  const colYardage = (col) => {
    if (!yardage) return null;
    if (col.type === "hole") return col.hi < 18 ? (yardage[col.hi] || null) : (yardage[0] || null);
    if (col.type === "out") return yardage.slice(0, 9).reduce((a, b) => a + (b || 0), 0);
    if (col.type === "in") return yardage.slice(9, 18).reduce((a, b) => a + (b || 0), 0);
    return yardage.slice(0, 18).reduce((a, b) => a + (b || 0), 0);
  };

  const divider = (col) => (col.type === "out" || col.type === "in" || col.type === "tot") ? `1px solid ${BORDER}` : (col.type === "hole" && col.hi === 18 ? `1px solid ${BORDER}` : undefined);

  return (
    <div style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
      {(longLabel || meta) && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "6px 10px", background: "#060f22", borderBottom: `1px solid ${BORDER}`, gap: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: statusColor || GOLD, fontFamily: "monospace", textAlign: "center" }}>{longLabel}{sublabel ? ` · ${sublabel}` : ""}</div>
          {meta && <div style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", textAlign: "center" }}>{meta}</div>}
        </div>
      )}
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#080f20", borderBottom: `1px solid ${BORDER}` }}>
              <td style={{ padding: "5px 10px", fontSize: 8, whiteSpace: "nowrap", minWidth: 70, position: "sticky", left: 0, background: "#080f20", zIndex: 1 }}></td>
              {cols.map((col, i) => (
                <td key={i} style={{ textAlign: "center", padding: "5px 4px", fontSize: 8, color: col.type === "hole" && col.hi >= 18 ? GOLD : col.type !== "hole" ? "#FFD700" : "#668", fontFamily: "monospace", minWidth: col.type === "hole" ? 34 : 38, borderLeft: divider(col), fontWeight: col.type !== "hole" || col.hi === 0 ? "800" : "400" }}>
                  {colHeader(col)}
                  {col.type === "hole" && col.hi < 18 && (match.disputes || []).includes(col.hi) ? <span style={{ color: "#e55", fontSize: 7, marginLeft: 1 }}>🚩</span> : null}
                </td>
              ))}
            </tr>
            <tr style={{ background: "#080f20", borderBottom: yardage ? undefined : `2px solid ${BORDER}` }}>
              <td style={{ padding: "4px 10px", fontSize: 8, color: "#446", fontFamily: "monospace", whiteSpace: "nowrap", position: "sticky", left: 0, background: "#080f20", zIndex: 1 }}>PAR</td>
              {cols.map((col, i) => (
                <td key={i} style={{ textAlign: "center", padding: "4px 4px", fontSize: 9, color: "#557", fontFamily: "monospace", fontWeight: 700, borderLeft: divider(col) }}>{colPar(col)}</td>
              ))}
            </tr>
            {yardage && (
              <tr style={{ background: "#080f20", borderBottom: `2px solid ${BORDER}` }}>
                <td style={{ padding: "4px 10px", fontSize: 8, color: "#446", fontFamily: "monospace", whiteSpace: "nowrap", position: "sticky", left: 0, background: "#080f20", zIndex: 1 }}>YDS</td>
                {cols.map((col, i) => (
                  <td key={i} style={{ textAlign: "center", padding: "4px 4px", fontSize: 9, color: "#557", fontFamily: "monospace", fontWeight: 700, borderLeft: divider(col) }}>{colYardage(col) || "—"}</td>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {rowLabels.map((label, ri) => {
              const isScoreRow = label === "SCORE";
              const nameColor = rowColors[ri];
              return (
                <tr key={ri} style={{ borderBottom: `1px solid ${BORDER}22`, background: isScoreRow ? "#060f22" : ri % 2 === 0 ? CARD : CARD2 }}>
                  <td style={{ padding: "6px 10px", fontSize: isScoreRow ? 8 : 11, fontWeight: 700, color: isScoreRow ? "#446" : nameColor, whiteSpace: "nowrap", position: "sticky", left: 0, background: isScoreRow ? "#060f22" : ri % 2 === 0 ? CARD : CARD2, zIndex: 1, fontFamily: isScoreRow ? "monospace" : "inherit", letterSpacing: isScoreRow ? 1 : 0 }}>{label}</td>
                  {cols.map((col, i) => {
                    const cell = cellFor(col, ri);
                    return (
                      <td key={i} style={{ textAlign: "center", padding: "4px 2px", borderLeft: divider(col) }}>
                        {isScoreRow ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 30 }}>{cell}</div>
                        ) : (
                          <div style={{ width: 24, height: 24, background: cell.bg, border: cell.border, borderRadius: cell.radius, display: "flex", alignItems: "center", justifyContent: "center", fontSize: cell.bold ? 11 : 10, fontWeight: cell.bold ? 900 : 700, color: cell.color, margin: "0 auto" }}>{cell.val}</div>
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
    </div>
  );
}
