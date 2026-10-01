import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { GOLD } from "../utils/scoring";
import { courseLabel } from "../utils/courses";
import ScoreInput from "./ScoreInput";

// A warmup round: no format, no matches, no points — tee-time groups of any
// mix of teams, and each player's gross score per hole. The round record holds
// { id, format: "Warmup", pointValue: 0, course, groups: [{ teeTime, players: [name] }] };
// scores live at cups/{cupId}/warmupScores/{round.id}/{warmupKey(name)}/{holeIdx}.

export const isWarmup = round => round?.format === "Warmup";

export const warmupKey = name => String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

// A player's card is an array or a {holeIdx: score} object (Firebase returns
// either, depending on how many holes are filled in).
const holeScore = (card, i) => {
  const v = card?.[i];
  return typeof v === "number" && v > 0 ? v : null;
};

export function warmupTotals(card, par) {
  let strokes = 0, toPar = 0, thru = 0;
  for (let i = 0; i < 18; i++) {
    const s = holeScore(card, i);
    if (s == null) continue;
    strokes += s; toPar += s - (par[i] || 0); thru++;
  }
  return { strokes, toPar, thru };
}

const fmtToPar = n => n === 0 ? "E" : n > 0 ? `+${n}` : `${n}`;
const toParColor = n => n < 0 ? "#4caf50" : n > 0 ? "#e88" : "#ccd";

// The board view of a warmup round: its groups, then a leaderboard.
export function WarmupRound({ round, scores, teamColorOf, canScore, onOpen }) {
  const { BORDER, MUTED } = useTheme();
  const par = round.course?.par || [];
  const groups = round.groups || [];
  const totalsOf = name => warmupTotals(scores?.[warmupKey(name)], par);
  const board = groups.flatMap(g => g.players || [])
    .map(name => ({ name, ...totalsOf(name) }))
    .sort((a, b) => (b.thru > 0) - (a.thru > 0) || a.toPar - b.toPar || b.thru - a.thru || a.name.localeCompare(b.name));
  const started = board.some(p => p.thru > 0);

  return (
    <div>
      <div style={{ background: "#0a1428", borderBottom: `1px solid ${BORDER}`, padding: "5px 10px", fontSize: 7, color: GOLD, fontFamily: "monospace", fontWeight: 700, textAlign: "center" }}>
        WARMUP · NO POINTS{round.course?.name ? ` · ${courseLabel(round.course).toUpperCase()}` : ""}
      </div>
      {groups.map((g, gi) => {
        const can = canScore(g);
        return (
          <div key={gi} onClick={can ? () => onOpen(gi) : undefined}
            style={{ display: "flex", alignItems: "stretch", borderBottom: "1px solid #0a1628", cursor: can ? "pointer" : "default", opacity: can ? 1 : 0.85 }}>
            <div style={{ width: 64, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060f22", borderRight: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 7, color: "#446", fontFamily: "monospace", letterSpacing: 1 }}>TEE</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#ccd", fontFamily: "monospace" }}>{g.teeTime || "TBD"}</div>
            </div>
            <div style={{ flex: 1, padding: "6px 10px", minWidth: 0 }}>
              {(g.players || []).map(name => {
                const t = totalsOf(name);
                return (
                  <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: teamColorOf(name), flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                    {t.thru > 0
                      ? <>
                          <div style={{ fontSize: 9, color: "#557", fontFamily: "monospace" }}>{t.thru === 18 ? "F" : `thru ${t.thru}`}</div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: toParColor(t.toPar), fontFamily: "monospace", minWidth: 30, textAlign: "right" }}>{fmtToPar(t.toPar)}</div>
                        </>
                      : <div style={{ fontSize: 10, color: "#446", fontFamily: "monospace" }}>—</div>}
                  </div>
                );
              })}
            </div>
            {can && <div style={{ display: "flex", alignItems: "center", padding: "0 8px", color: "#446", fontSize: 12 }}>›</div>}
          </div>
        );
      })}
      {started && (
        <div style={{ padding: "8px 10px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 8, color: MUTED, fontFamily: "monospace", letterSpacing: 2, marginBottom: 4 }}>WARMUP LEADERBOARD</div>
          {board.map((p, i) => {
            const pos = board.findIndex(x => x.thru > 0 && x.toPar === p.toPar) + 1;
            const tied = board.filter(x => x.thru > 0 && x.toPar === p.toPar).length > 1;
            return (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", borderTop: i ? "1px solid #0a1628" : "none" }}>
                <div style={{ width: 22, fontSize: 10, color: "#557", fontFamily: "monospace" }}>{p.thru > 0 ? `${tied ? "T" : ""}${pos}` : ""}</div>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: teamColorOf(p.name), flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 12, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                <div style={{ fontSize: 9, color: "#557", fontFamily: "monospace" }}>{p.thru === 0 ? "" : p.thru === 18 ? `F · ${p.strokes}` : `thru ${p.thru} · ${p.strokes}`}</div>
                <div style={{ fontSize: 12, fontWeight: 900, color: p.thru ? toParColor(p.toPar) : "#446", fontFamily: "monospace", minWidth: 30, textAlign: "right" }}>{p.thru ? fmtToPar(p.toPar) : "—"}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Hole-by-hole gross score entry for one warmup group.
export function WarmupEntry({ round, group, scores, teamColorOf, onSaveHole, onClose }) {
  const { BG, CARD, CARD2, BORDER } = useTheme();
  const course = round.course || {};
  const par = course.par || [];
  const players = group.players || [];
  const cardOf = name => scores?.[warmupKey(name)];
  const holeDone = i => players.every(n => holeScore(cardOf(n), i) != null);
  const firstOpen = (() => { for (let i = 0; i < 18; i++) if (!holeDone(i)) return i; return 17; })();
  const [hole, setHole] = useState(firstOpen);
  const seed = i => Object.fromEntries(players.map(n => [n, holeScore(cardOf(n), i) ?? par[i] ?? 3]));
  const [vals, setVals] = useState(() => seed(firstOpen));
  const [saving, setSaving] = useState(false);

  const goTo = i => { setHole(i); setVals(seed(i)); };
  const save = async () => {
    setSaving(true);
    try { await onSaveHole(hole, vals); } finally { setSaving(false); }
    if (hole < 17) goTo(hole + 1);
  };

  const yards = course.yardage?.[hole] || null;
  const stat = (label, value, color = "#ccd") => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 8, color: "#446", fontFamily: "monospace", letterSpacing: 2 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: "monospace", lineHeight: 1 }}>{value}</div>
    </div>
  );
  const divider = <div style={{ width: 1, background: BORDER }} />;

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, zIndex: 200, display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "10px 12px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 7, color: "#668", padding: "5px 10px", cursor: "pointer", fontSize: 11 }}>← Back</button>
          <div style={{ fontSize: 10, color: GOLD, fontFamily: "monospace", fontWeight: 800, letterSpacing: 1 }}>WARMUP{group.teeTime ? ` · ${group.teeTime}` : ""}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
          {players.map(n => {
            const t = warmupTotals(cardOf(n), par);
            return (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, background: "#111a2e", borderRadius: 6, padding: "5px 8px", minWidth: 0 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: teamColorOf(n), flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "#dde", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n}</div>
                <div style={{ fontSize: 11, fontWeight: 900, color: t.thru ? toParColor(t.toPar) : "#446", fontFamily: "monospace" }}>{t.thru ? fmtToPar(t.toPar) : "—"}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hole strip: filled once every player in the group has a score */}
      <div style={{ padding: "8px 10px 10px", display: "flex", gap: 2 }}>
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} onClick={() => goTo(i)} style={{ flex: 1, height: i === hole ? 26 : 20, background: holeDone(i) ? "#2e4a6e" : CARD2, borderRadius: 3, cursor: "pointer", border: i === hole ? `2px solid ${GOLD}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#99a", fontFamily: "monospace" }}>{i + 1}</div>
        ))}
      </div>

      <div style={{ flex: 1, padding: "0 12px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 12, padding: "10px", background: CARD, borderRadius: 12, border: `1px solid ${BORDER}` }}>
          {stat("HOLE", hole + 1, GOLD)}
          {divider}
          {stat("PAR", par[hole] ?? "—")}
          {yards && <>{divider}{stat("YDS", yards)}</>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 6px", marginBottom: 12 }}>
          {players.map(n => (
            <ScoreInput key={n} label={n} value={vals[n]} par={par[hole]} color={teamColorOf(n)}
              onChange={v => setVals(s => ({ ...s, [n]: v }))} />
          ))}
        </div>

        <button onClick={save} disabled={saving}
          style={{ width: "100%", padding: "15px", background: `linear-gradient(135deg,${GOLD},${GOLD}aa)`, border: "none", borderRadius: 14, color: "#000", fontWeight: 900, fontSize: 15, cursor: "pointer", letterSpacing: 1, fontFamily: "monospace", marginBottom: 20, opacity: saving ? 0.6 : 1 }}>
          {saving ? "SAVING…" : hole < 17 ? `SAVE HOLE ${hole + 1} →` : "SAVE HOLE 18 ✓"}
        </button>
      </div>
    </div>
  );
}
