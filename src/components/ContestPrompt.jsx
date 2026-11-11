import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { GOLD } from "../utils/scoring";
import { CONTEST_LABEL, fmtFeet } from "../utils/contests";
import TeamChip from "./TeamChip";

// Shown after a group confirms a longest-drive or closest-to-the-pin hole: did
// anyone in the group beat the current leader? Asks about each contest on the
// hole in turn. `players` are the group's players ({ name, team, color });
// `current` maps contest type to its current leader (or nothing yet).
export default function ContestPrompt({ hole, types, players, current, onSubmit, onDone }) {
  const { BG, CARD, CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState(null);
  const [feet, setFeet] = useState(10);
  const [inches, setInches] = useState(0);
  const [saving, setSaving] = useState(false);

  const type = types[step];
  const lead = current[type];
  const isCtp = type === "ctp";
  const total = feet * 12 + inches;
  // Closest to the pin has to actually be closer than the current best.
  const beats = !isCtp || !lead || total < lead.inches;

  const next = () => {
    setPicked(null); setFeet(10); setInches(0);
    if (step + 1 < types.length) setStep(step + 1); else onDone();
  };
  const save = async (p) => {
    setSaving(true);
    try { await onSubmit(type, { name: p.name, team: p.team, ...(isCtp ? { inches: total } : {}) }); }
    finally { setSaving(false); }
    next();
  };

  const stepper = (label, value, set, max) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ fontSize: 9, color: MUTED, fontFamily: "var(--mono)", letterSpacing: 1 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <button onClick={() => set(Math.max(0, value - 1))} style={{ width: 48, height: 48, fontSize: 22, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: "8px 0 0 8px", color: TEXT, cursor: "pointer" }}>−</button>
        <div style={{ width: 60, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: BG, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, fontSize: 24, fontWeight: 900, fontFamily: "var(--mono)", color: "var(--strong)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
        <button onClick={() => set(Math.min(max, value + 1))} style={{ width: 48, height: 48, fontSize: 22, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: "0 8px 8px 0", color: TEXT, cursor: "pointer" }}>+</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "#000b", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 480, background: CARD, borderTop: `2px solid ${GOLD}`, borderRadius: "18px 18px 0 0", padding: "18px 16px calc(18px + env(safe-area-inset-bottom))", animation: "fadeIn .2s ease-out" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--gold-text)", fontFamily: "var(--mono)", letterSpacing: 1 }}>HOLE {hole + 1} · {CONTEST_LABEL[type].toUpperCase()}</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>
          {lead ? <>Current: <span style={{ color: TEXT, fontWeight: 700 }}>{lead.name}</span>{isCtp ? <span style={{ color: "var(--gold-text)", fontWeight: 800, fontFamily: "var(--mono)" }}> {fmtFeet(lead.inches)}</span> : null}</> : "No one has it yet."}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: TEXT, margin: "10px 0 14px" }}>
          {picked ? `How close was ${picked.name.split(" ")[0]}?`
            : lead ? (isCtp ? `Did anyone get inside ${fmtFeet(lead.inches)}?` : "Did anyone in your group outdrive that?")
            : `Who in your group ${isCtp ? "was closest" : "hit the longest drive"}?`}
        </div>

        {!picked && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {players.map(p => (
              <button key={p.name} disabled={saving} onClick={() => (isCtp ? setPicked(p) : save(p))}
                style={{ minHeight: 48, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontSize: 14, fontWeight: 700, cursor: "pointer", textAlign: "left" }}>
                <TeamChip color={p.color} />{p.name}
              </button>
            ))}
          </div>
        )}

        {picked && (
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              {stepper("FEET", feet, setFeet, 200)}
              {stepper("INCHES", inches, setInches, 11)}
            </div>
            {!beats && <div style={{ fontSize: 12, color: "#e88", textAlign: "center", marginTop: 10 }}>That's not closer than {fmtFeet(lead.inches)}.</div>}
            <button disabled={!beats || saving} onClick={() => save(picked)}
              style={{ width: "100%", marginTop: 14, padding: 14, background: beats ? `linear-gradient(135deg,${GOLD},${GOLD}cc)` : CARD2, border: "none", borderRadius: 12, color: beats ? "#000" : MUTED, fontWeight: 900, fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 1, cursor: beats ? "pointer" : "default" }}>
              {saving ? "SAVING…" : `SAVE ${fmtFeet(total)} FOR ${picked.name.split(" ")[0].toUpperCase()}`}
            </button>
          </>
        )}

        <button onClick={picked ? () => setPicked(null) : next}
          style={{ width: "100%", marginTop: 10, padding: 12, background: "none", border: `1px solid ${BORDER}`, borderRadius: 12, color: MUTED, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          {picked ? "← Back" : lead ? "No, nobody beat it" : isCtp ? "Skip (nobody on the green)" : "Skip"}
        </button>
      </div>
    </div>
  );
}
