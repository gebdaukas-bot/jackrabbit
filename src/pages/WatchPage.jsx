import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db, ref, onValue } from "../firebase";
import { computeMatchStatus, GOLD } from "../utils/scoring";
import { contrastText } from "../utils/color";
import { getTeams, cupSidesFor } from "../utils/teams";
import { useTheme } from "../context/ThemeContext";
import LiveBackground from "../components/LiveBackground";
import HoleByHoleTable from "../components/HoleByHoleTable";

// Read-only spectator view for a standalone 1v1/2v2 match — no login, no join,
// no scoring. Just the live status, for sharing with people who only want to watch.
export default function WatchPage() {
  const { cupId } = useParams();
  const { BORDER, TEXT, MUTED } = useTheme();
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
  // Resolve the two sides through the team model, so a match between any two of
  // the cup's teams shows their own names and colors.
  const sides = cupSidesFor(getTeams(meta), match);
  const st = computeMatchStatus(match.scores || Array(18).fill(null), sides.teamAName, sides.teamBName, match.startHole || 0, round.totalHoles || 18, round.pointValue || 1, round.allowExtraHoles || false, match.extra || []);
  return (
    <div style={{ minHeight: "100vh", color: TEXT }}>
      <LiveBackground/>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 14px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, fontFamily: "monospace", letterSpacing: 2 }}>DORMIE · VIEW ONLY</div>
          <div style={{ fontSize: 16, fontWeight: 900, marginTop: 4 }}>{meta.name}</div>
        </div>

        <div style={{ display: "flex", alignItems: "stretch", borderRadius: 10, overflow: "hidden", border: `1px solid ${BORDER}`, marginBottom: 16 }}>
          <div style={{ flex: 1, background: sides.teamAColor, padding: "12px 14px", minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: `${contrastText(sides.teamAColor)}cc`, letterSpacing: 1, fontFamily: "monospace" }}>{sides.teamAName}</div>
          </div>
          <div style={{ background: "#060d1e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "10px 14px", flexShrink: 0, minWidth: 100 }}>
            {st.state === "pending" && <div style={{ fontSize: 9, color: "#446", fontFamily: "monospace" }}>NOT STARTED</div>}
            {st.state === "live" && <><div style={{ fontSize: 8, color: "#446", fontFamily: "monospace" }}>THRU {st.holesPlayed}</div><div style={{ fontSize: 22, fontWeight: 900, fontFamily: "monospace" }}>{!st.leader ? "AS" : `${st.up}UP`}</div></>}
            {st.state === "extra" && <><div style={{ fontSize: 8, color: GOLD, fontFamily: "monospace" }}>PLAYOFF</div><div style={{ fontSize: 14, fontWeight: 900, fontFamily: "monospace" }}>{st.sublabel}</div></>}
            {st.state === "halved" && <div style={{ fontSize: 12, fontWeight: 900, color: "#557", fontFamily: "monospace" }}>HALVED</div>}
            {st.state === "complete" && <><div style={{ fontSize: 8, color: GOLD, fontFamily: "monospace", fontWeight: 700 }}>FINAL</div><div style={{ fontSize: 16, fontWeight: 900, fontFamily: "monospace" }}>{st.sublabel}</div></>}
            {st.state === "gap" && <div style={{ fontSize: 9, color: "#e67e22", fontFamily: "monospace" }}>⚠ MISSING</div>}
          </div>
          <div style={{ flex: 1, background: sides.teamBColor, padding: "12px 14px", minWidth: 0, textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: `${contrastText(sides.teamBColor)}cc`, letterSpacing: 1, fontFamily: "monospace" }}>{sides.teamBName}</div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 12, color: MUTED, marginBottom: 16 }}>
          {match.player1a}{match.player1b ? ` & ${match.player1b}` : ""} <span style={{ color: "#557" }}>vs</span> {match.player2a}{match.player2b ? ` & ${match.player2b}` : ""}
          {course.name && <div style={{ marginTop: 4, fontSize: 10 }}>{course.name}</div>}
        </div>

        {/* Hole by hole */}
        <div style={{ fontSize: 9, color: GOLD, fontFamily: "monospace", letterSpacing: 2, opacity: 0.7, marginBottom: 6 }}>HOLE BY HOLE</div>
        <HoleByHoleTable match={match} course={course} totalHoles={round.totalHoles || 18}
          teamAColor={sides.teamAColor} teamBColor={sides.teamBColorDisp}/>
        <div style={{ textAlign: "center", fontSize: 10, color: "#446", marginTop: 16, fontFamily: "monospace" }}>Updates live · view only</div>
      </div>
    </div>
  );
}
