import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { db, ref, onValue, set } from "../firebase";
import { computeMatchStatus, computeAllPoints, netScore, GOLD } from "../utils/scoring";
import HoleEntry from "../components/HoleEntry";
import GroupHoleEntry from "../components/GroupHoleEntry";
import confetti from "canvas-confetti";

const mkScores = () => Array(18).fill(null);

function findPlayerMatch(days, playerName, preferDayIdx = null) {
  const order = preferDayIdx !== null
    ? [preferDayIdx, ...days.map((_, i) => i).filter(i => i !== preferDayIdx)]
    : days.map((_, i) => i);
  for (const di of order) {
    for (const m of days[di].matches) {
      if ([m.player1a, m.player1b, m.player2a, m.player2b].includes(playerName))
        return { dayIdx: di, matchId: m.id };
    }
  }
  return null;
}

function fmt(n) {
  if (n === undefined || n === null) return "0";
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

// ── Match card row (compact) ──────────────────────────────────────────────────
function MatchCard({ match, cup, onOpen, canEdit }) {
  const { CARD, CARD2, BORDER, MUTED } = useTheme();
  const { teamAColor, teamAShort, teamBColor, teamBColorDisp, teamBShort } = cup;
  const isSingles = !match.player1b;
  const st = computeMatchStatus(match.scores, teamAShort, teamBShort);
  const stColor = st.state === "pending" ? BORDER : st.state === "live" ? "#4caf50" : st.state === "complete" ? (st.leader === "A" ? teamAColor : teamBColor) : st.state === "halved" ? "#557" : "#e67e22";
  const isClickable = canEdit || st.state === "live" || st.state === "complete" || st.state === "halved";

  return (
    <div onClick={() => isClickable && onOpen(match.id)}
      style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 8, overflow: "hidden", cursor: isClickable ? "pointer" : "default", opacity: 1 }}>
      <div style={{ display: "flex", alignItems: "stretch", minHeight: 50 }}>
        <div style={{ width: 4, background: stColor, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: "8px 10px", minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: teamAColor, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isSingles ? match.player1a : `${match.player1a} & ${match.player1b}`}
              </div>
              <div style={{ fontSize: 11, color: teamBColorDisp, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {isSingles ? match.player2a : `${match.player2a} & ${match.player2b}`}
              </div>
            </div>
            <div style={{ flexShrink: 0, marginLeft: 8, textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: stColor, fontFamily: "monospace" }}>{st.shortLabel}</div>
              <div style={{ fontSize: 9, color: MUTED, fontFamily: "monospace" }}>{st.state === "pending" ? match.teeTime || "—" : st.sublabel}</div>
            </div>
          </div>
        </div>
      </div>
      {(st.state === "live" || st.state === "gap") && (
        <div style={{ display: "flex", gap: 2, padding: "3px 6px 5px" }}>
          {match.scores.map((s, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: s === "A" ? teamAColor : s === "B" ? teamBColor : s === "H" ? "#334" : CARD2 }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Day scoreboard block ──────────────────────────────────────────────────────
function DayBlock({ day, cup, onOpen, canEdit }) {
  const { CARD2, BORDER, MUTED } = useTheme();
  return (
    <div>
      <div style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", letterSpacing: 2, marginBottom: 8 }}>{day.label?.toUpperCase()} · {day.format?.toUpperCase()}</div>
      {day.matches.map(m => (
        <MatchCard key={m.id} match={m} cup={cup} onOpen={onOpen} canEdit={canEdit(m.id)} />
      ))}
    </div>
  );
}

// ── CupView ───────────────────────────────────────────────────────────────────
export default function CupView({ user }) {
  const { cupId } = useParams();
  const nav = useNavigate();
  const { BG, CARD, CARD2, BORDER, TEXT, MUTED, MUTED2, theme, toggle } = useTheme();

  const [meta, setMeta] = useState(null);
  const [days, setDays] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("scoreboard");
  const [boardDayOverride, setBoardDayOverride] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(() => { try { return localStorage.getItem(`jr_player_${cupId}`) || ""; } catch { return ""; } });
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState(() => { try { return JSON.parse(localStorage.getItem(`jr_queue_${cupId}`)) || []; } catch { return []; } });
  const [syncStatus, setSyncStatus] = useState(null);
  const [matchCelebration, setMatchCelebration] = useState(null);
  const [inviteVisible, setInviteVisible] = useState(false);

  const dirtyMatchIds = useRef(new Set());
  const isSaving = useRef(false);
  const prevMatchStates = useRef({});
  const prevWinnerRef = useRef(null);
  const confettiFired = useRef(false);
  const celebTimer = useRef(null);

  // Load cup meta
  useEffect(() => {
    const unsub = onValue(ref(db, `cups/${cupId}/meta`), snap => {
      if (snap.exists()) setMeta(snap.val());
    });
    return () => unsub();
  }, [cupId]);

  // Load days structure (static: label, format, course)
  useEffect(() => {
    const unsub = onValue(ref(db, `cups/${cupId}/days`), snap => {
      if (!snap.exists()) { setLoaded(true); return; }
      const rawDays = snap.val();
      // rawDays is an array or object of day configs
      const dayArr = Array.isArray(rawDays) ? rawDays : Object.values(rawDays);
      setDays(prev => {
        // Merge structural data (label, format, course) while preserving score state
        return dayArr.map((d, di) => {
          const existing = prev[di] || { matches: [] };
          return { ...existing, ...d, matches: existing.matches };
        });
      });
    });
    return () => unsub();
  }, [cupId]);

  // Load match definitions (players, handicaps, tee times)
  useEffect(() => {
    const unsub = onValue(ref(db, `cups/${cupId}/matches`), snap => {
      if (!snap.exists()) { setLoaded(true); return; }
      const rawMatches = snap.val();
      setDays(prev => {
        if (!prev.length) return prev;
        // Group matches by day index based on match id prefix
        // Match id format: m{dayNum}{matchNum} e.g. m101 = day1 match1
        const dayMatches = prev.map(() => []);
        Object.entries(rawMatches).forEach(([matchKey, m]) => {
          const id = parseInt(matchKey.replace("m", ""));
          const dayIdx = Math.floor(id / 100) - 1;
          if (dayIdx >= 0 && dayIdx < prev.length) {
            dayMatches[dayIdx].push({ id, ...m, scores: Array(18).fill(null), disputes: [] });
          }
        });
        return prev.map((day, di) => ({
          ...day,
          matches: dayMatches[di].length > 0
            ? dayMatches[di].sort((a, b) => a.id - b.id)
            : day.matches,
        }));
      });
    });
    return () => unsub();
  }, [cupId]);

  // Subscribe to live scores
  useEffect(() => {
    const unsub = onValue(ref(db, `cups/${cupId}/scores`), snap => {
      const data = snap.val();
      setDays(prev => prev.map(day => ({
        ...day,
        matches: day.matches.map(m => {
          if (dirtyMatchIds.current.has(m.id)) return m;
          const fb = data?.[`m${m.id}`];
          if (!fb) return m;
          const scores = Array.isArray(fb.scores)
            ? fb.scores
            : Array.from({ length: 18 }, (_, i) => fb.scores?.[i] ?? null);
          const disputes = fb.disputes ? Object.values(fb.disputes).filter(v => v != null) : [];
          return {
            ...m, scores, disputes,
            hcp1a: fb.hcp1a ?? m.hcp1a, hcp1b: fb.hcp1b ?? m.hcp1b,
            hcp2a: fb.hcp2a ?? m.hcp2a, hcp2b: fb.hcp2b ?? m.hcp2b,
            grossP1a: fb.grossP1a ? Array.from({ length: 18 }, (_, i) => fb.grossP1a[i] ?? null) : null,
            grossP1b: fb.grossP1b ? Array.from({ length: 18 }, (_, i) => fb.grossP1b[i] ?? null) : null,
            grossP2a: fb.grossP2a ? Array.from({ length: 18 }, (_, i) => fb.grossP2a[i] ?? null) : null,
            grossP2b: fb.grossP2b ? Array.from({ length: 18 }, (_, i) => fb.grossP2b[i] ?? null) : null,
          };
        }),
      })));
      setLoaded(true);
    });
    return () => unsub();
  }, [cupId]);

  const updateMatch = async (dayIdx, upd) => {
    dirtyMatchIds.current.add(upd.id);
    isSaving.current = true;
    setDays(ds => ds.map((d, i) => i !== dayIdx ? d : { ...d, matches: d.matches.map(m => m.id === upd.id ? upd : m) }));
    const path = `cups/${cupId}/scores/m${upd.id}`;
    const payload = {
      scores: upd.scores,
      hcp1a: upd.hcp1a || 0, hcp1b: upd.hcp1b || 0,
      hcp2a: upd.hcp2a || 0, hcp2b: upd.hcp2b || 0,
    };
    if (upd.grossP1a) payload.grossP1a = upd.grossP1a;
    if (upd.grossP1b) payload.grossP1b = upd.grossP1b;
    if (upd.grossP2a) payload.grossP2a = upd.grossP2a;
    if (upd.grossP2b) payload.grossP2b = upd.grossP2b;
    if (upd.disputes !== undefined) payload.disputes = upd.disputes || null;
    try {
      await set(ref(db, path), payload);
      dirtyMatchIds.current.delete(upd.id);
    } catch {
      setOfflineQueue(prev => {
        const q = [...prev.filter(x => x.path !== path), { path, payload }];
        try { localStorage.setItem(`jr_queue_${cupId}`, JSON.stringify(q)); } catch {}
        return q;
      });
    } finally {
      isSaving.current = false;
    }
  };

  // Flush offline queue
  useEffect(() => {
    const flush = async () => {
      if (!offlineQueue.length) return;
      try {
        for (const item of offlineQueue) {
          await set(ref(db, item.path), item.payload);
          const mid = parseInt(item.path.split("/").pop().replace("m", ""));
          if (!isNaN(mid)) dirtyMatchIds.current.delete(mid);
        }
        setOfflineQueue([]);
        try { localStorage.removeItem(`jr_queue_${cupId}`); } catch {}
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus(null), 2500);
      } catch {}
    };
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [offlineQueue, cupId]);

  // Confetti on cup win
  const { actualA, actualB, projA, projB } = days.length > 0 && meta
    ? computeAllPoints(days, meta.teamAName, meta.teamBName)
    : { actualA: 0, actualB: 0, projA: 0, projB: 0 };

  const totalMatches = days.reduce((s, d) => s + d.matches.length, 0);
  const winTarget = totalMatches / 2;
  const winner = actualA > winTarget ? meta?.teamAName : actualB > winTarget ? meta?.teamBName : null;
  const projWinner = !winner && (projA > winTarget ? meta?.teamAName : projB > winTarget ? meta?.teamBName : null);
  const liveCount = days.reduce((s, d) => s + d.matches.filter(m => computeMatchStatus(m.scores).state === "live").length, 0);

  useEffect(() => {
    if (winner && !prevWinnerRef.current && !confettiFired.current) {
      confettiFired.current = true;
      const col = winner === meta?.teamAName ? ["#C8102E", "#ff8888", "#C4A44A", "#fff"] : ["#003087", "#4A90D9", "#C4A44A", "#fff"];
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.35 }, colors: col });
    }
    prevWinnerRef.current = winner;
  }, [winner]);

  // Match completion celebration
  useEffect(() => {
    if (!meta) return;
    for (const day of days) for (const m of day.matches) {
      const s = computeMatchStatus(m.scores, meta.teamAName, meta.teamBName);
      const prev = prevMatchStates.current[m.id];
      if (prev !== undefined && prev === "live" && (s.state === "complete" || s.state === "halved")) {
        const color = s.state === "halved" ? "#334455" : s.leader === "A" ? meta.teamAColor : meta.teamBColor;
        setMatchCelebration({ label: s.longLabel, sublabel: s.sublabel || (s.state === "halved" ? "½ pt each" : "1 point"), color });
        if (celebTimer.current) clearTimeout(celebTimer.current);
        celebTimer.current = setTimeout(() => setMatchCelebration(null), 1500);
      }
      prevMatchStates.current[m.id] = s.state;
    }
  }, [days, meta]);

  useEffect(() => {
    try { if (currentPlayer) localStorage.setItem(`jr_player_${cupId}`, currentPlayer); else localStorage.removeItem(`jr_player_${cupId}`); } catch {}
  }, [currentPlayer, cupId]);

  if (!meta || !loaded) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: MUTED, fontFamily: "monospace" }}>Loading cup...</div>
      </div>
    );
  }

  const cup = {
    teamAName: meta.teamAName,
    teamAShort: meta.teamAName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 6) || "A",
    teamAColor: meta.teamAColor || "#C8102E",
    teamBName: meta.teamBName,
    teamBShort: meta.teamBName?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 6) || "B",
    teamBColor: meta.teamBColor || "#003087",
    teamBColorDisp: meta.teamBColor || "#4A90D9",
  };

  const isAdmin = user?.uid === meta.createdBy;
  const allPlayers = days.flatMap(d => d.matches.flatMap(m => [m.player1a, m.player1b, m.player2a, m.player2b].filter(Boolean)));
  const uniquePlayers = [...new Set(allPlayers)];

  const todayDow = new Date().getDay();
  const dowToDay = { 5: 0, 6: 1, 0: 2 };
  let autoDayIdx = dowToDay[todayDow] !== undefined ? dowToDay[todayDow] : -1;
  if (autoDayIdx === -1) {
    let best = 0;
    for (let i = 0; i < days.length; i++) if (days[i].matches.some(m => m.scores.some(s => s !== null))) best = i;
    autoDayIdx = best;
  }
  const boardDayIdx = boardDayOverride !== null ? boardDayOverride : autoDayIdx;
  const boardDay = days[boardDayIdx];

  const playerMatch = currentPlayer ? findPlayerMatch(days, currentPlayer, autoDayIdx) : null;

  const canEdit = (dayIdx, matchId) => {
    if (isAdmin) return true;
    if (dayIdx !== autoDayIdx) return false;
    if (!playerMatch) return false;
    return playerMatch.dayIdx === dayIdx && playerMatch.matchId === matchId;
  };

  const openForScoring = (dayIdx, matchId) => {
    const d = days[dayIdx];
    const m = d?.matches.find(x => x.id === matchId);
    if (m?.companionId) {
      setActiveGroup({ dayIdx, matchIds: [matchId, m.companionId] });
    } else {
      setActiveMatch({ dayIdx, matchId });
    }
  };

  // Login screen
  if (!currentPlayer) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: GOLD, fontFamily: "monospace", letterSpacing: 2 }}>{meta.name}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>
              <span style={{ color: cup.teamAColor, fontWeight: 700 }}>{meta.teamAName}</span>
              <span style={{ color: MUTED }}> vs </span>
              <span style={{ color: cup.teamBColorDisp, fontWeight: 700 }}>{meta.teamBName}</span>
            </div>
          </div>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 24 }}>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 16, textAlign: "center" }}>Who are you?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {uniquePlayers.map(name => (
                <button key={name} onClick={() => {
                  setCurrentPlayer(name);
                  const pm = findPlayerMatch(days, name, autoDayIdx);
                  if (pm) {
                    const d = days[pm.dayIdx];
                    const m = d?.matches.find(x => x.id === pm.matchId);
                    if (m?.companionId) setActiveGroup({ dayIdx: pm.dayIdx, matchIds: [pm.matchId, m.companionId] });
                    else setActiveMatch(pm);
                  }
                }} style={{ padding: "12px", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                  {name}
                </button>
              ))}
            </div>
            <button onClick={() => nav("/")} style={{ width: "100%", marginTop: 16, padding: "10px", background: "none", border: `1px solid ${BORDER}`, borderRadius: 10, color: MUTED, fontSize: 12, cursor: "pointer" }}>← Back to home</button>
          </div>
        </div>
      </div>
    );
  }

  // Score entry screens
  if (activeGroup) {
    const d = days[activeGroup.dayIdx];
    const groupMatches = activeGroup.matchIds.map(id => d?.matches.find(x => x.id === id)).filter(Boolean);
    if (groupMatches.length === 2) {
      return <GroupHoleEntry matches={groupMatches} course={d.course} cup={cup}
        onSave={(mi, upd) => updateMatch(activeGroup.dayIdx, upd)}
        onClose={() => setActiveGroup(null)} />;
    }
  }

  if (activeMatch) {
    const d = days[activeMatch.dayIdx];
    const m = d?.matches.find(x => x.id === activeMatch.matchId);
    if (m?.companionId) {
      const companion = d.matches.find(x => x.id === m.companionId);
      if (companion) {
        return <GroupHoleEntry matches={[m, companion]} course={d.course} cup={cup}
          onSave={(mi, upd) => updateMatch(activeMatch.dayIdx, upd)}
          onClose={() => setActiveMatch(null)} />;
      }
    }
    if (m) {
      return <HoleEntry match={m} isSingles={!m.player1b} course={d.course} cup={cup}
        onSave={upd => updateMatch(activeMatch.dayIdx, upd)}
        onClose={() => setActiveMatch(null)} />;
    }
  }

  const playerTeamColor = (() => {
    for (const d of days) for (const m of d.matches) {
      if ([m.player1a, m.player1b].includes(currentPlayer)) return cup.teamAColor;
      if ([m.player2a, m.player2b].includes(currentPlayer)) return cup.teamBColor;
    }
    return MUTED;
  })();

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, paddingBottom: 60, fontFamily: "'Arial Narrow','Arial',sans-serif" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes celebFade{to{opacity:0;pointer-events:none}}*{box-sizing:border-box;margin:0;padding:0}html,body{background:${BG};}`}</style>

      {/* Celebration overlay */}
      {matchCelebration && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: matchCelebration.color, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "celebFade 0.3s ease 1.2s forwards", pointerEvents: "none" }}>
          <div style={{ fontSize: 42, fontWeight: 900, color: "#fff", fontFamily: "monospace", letterSpacing: 3, textAlign: "center", padding: "0 20px" }}>{matchCelebration.label}</div>
          <div style={{ fontSize: 22, color: "rgba(255,255,255,0.85)", fontFamily: "monospace", marginTop: 10 }}>{matchCelebration.sublabel}</div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(180deg,${CARD} 0%,${BG} 100%)`, borderBottom: `2px solid ${BORDER}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px 5px" }}>
          <button onClick={() => nav("/")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: MUTED, padding: "2px 6px" }}>← Home</button>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1, color: TEXT, textAlign: "center", flex: 1 }}>{meta.name}</div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {liveCount > 0 && <div style={{ fontSize: 9, color: "#4caf50", fontWeight: 700, animation: "pulse 2s infinite", letterSpacing: 1 }}>● {liveCount}</div>}
            {offlineQueue.length > 0 && <div style={{ fontSize: 8, color: "#f39c12", fontFamily: "monospace", fontWeight: 700 }}>⚡{offlineQueue.length}</div>}
            {syncStatus === "synced" && <div style={{ fontSize: 8, color: "#4caf50", fontFamily: "monospace" }}>✓</div>}
            <button onClick={toggle} style={{ fontSize: 14, background: "none", border: "none", cursor: "pointer", padding: "1px 4px", lineHeight: 1 }}>{theme === "dark" ? "☀️" : "🌙"}</button>
            <button onClick={() => setCurrentPlayer("")} style={{ fontSize: 9, padding: "3px 8px", background: `${playerTeamColor}22`, border: `1px solid ${playerTeamColor}55`, borderRadius: 5, color: TEXT, cursor: "pointer", fontFamily: "monospace" }}>
              👤 {currentPlayer} ✕
            </button>
          </div>
        </div>

        {winner && <div style={{ background: `${GOLD}22`, borderTop: `1px solid ${GOLD}44`, borderBottom: `1px solid ${GOLD}44`, padding: "7px", textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 900, color: GOLD, letterSpacing: 2 }}>🏆 {winner} WINS THE CUP!</div></div>}

        {/* Big scoreboard */}
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <div style={{ flex: 1, background: cup.teamAColor, padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center", minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "#ffcccc", letterSpacing: 1, fontFamily: "monospace", lineHeight: 1.2, wordBreak: "break-word" }}>{meta.teamAName}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", fontFamily: "monospace", lineHeight: 1, marginTop: 2 }}>{fmt(actualA)}</div>
          </div>
          <div style={{ background: "#060d1e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 8px", borderLeft: `1px solid ${BORDER}`, borderRight: `1px solid ${BORDER}`, flexShrink: 0, minWidth: 76 }}>
            <div style={{ fontSize: 7, color: "#446", fontFamily: "monospace", letterSpacing: 1, marginBottom: 2 }}>PROJECTED</div>
            <div style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color: projA > projB ? cup.teamAColor : projB > projA ? cup.teamBColorDisp : "#557", whiteSpace: "nowrap" }}>{fmt(projA)}–{fmt(projB)}</div>
            {projWinner && <div style={{ fontSize: 7, color: GOLD, fontFamily: "monospace", marginTop: 2, whiteSpace: "nowrap" }}>→ {projWinner}</div>}
            <div style={{ fontSize: 7, color: "#335", marginTop: 3, fontFamily: "monospace", whiteSpace: "nowrap" }}>WIN: {fmt(winTarget + 0.5)}</div>
          </div>
          <div style={{ flex: 1, background: cup.teamBColor, padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "#cce4ff", letterSpacing: 1, fontFamily: "monospace", lineHeight: 1.2, wordBreak: "break-word", textAlign: "right" }}>{meta.teamBName}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", fontFamily: "monospace", lineHeight: 1, marginTop: 2 }}>{fmt(actualB)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", background: CARD, borderBottom: `1px solid ${BORDER}` }}>
        {[["scoreboard", "📊 BOARD"], ["matches", "⛳ MY MATCH"], ...(isAdmin ? [["admin", "⚙️ ADMIN"]] : [])].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: "11px 2px", background: "none", border: "none", borderBottom: tab === key ? `2px solid ${GOLD}` : "2px solid transparent", color: tab === key ? GOLD : MUTED, fontWeight: 700, fontSize: 9, letterSpacing: 1, cursor: "pointer", fontFamily: "monospace" }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "12px 10px 0" }}>

        {/* SCOREBOARD TAB */}
        {tab === "scoreboard" && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {days.map((d, i) => (
                <button key={i} onClick={() => setBoardDayOverride(i)}
                  style={{ flex: 1, padding: "7px 4px", borderRadius: 8, border: "none", background: boardDayIdx === i ? `${cup.teamBColor}55` : CARD2, borderBottom: boardDayIdx === i ? `2px solid ${GOLD}` : "2px solid transparent", color: boardDayIdx === i ? GOLD : "#446", fontWeight: 700, fontSize: 9, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1 }}>
                  {d.label?.split(" ")[0]?.toUpperCase() || `DAY ${i + 1}`}
                </button>
              ))}
            </div>
            {boardDay && (
              <DayBlock day={boardDay} cup={cup}
                onOpen={mid => { if (canEdit(boardDayIdx, mid)) openForScoring(boardDayIdx, mid); }}
                canEdit={mid => canEdit(boardDayIdx, mid)} />
            )}
          </div>
        )}

        {/* MY MATCH TAB */}
        {tab === "matches" && (
          <div>
            {!playerMatch ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: MUTED, fontSize: 12 }}>You are not in any match.</div>
            ) : (() => {
              const d = days[playerMatch.dayIdx];
              const m = d?.matches.find(x => x.id === playerMatch.matchId);
              if (!m) return null;
              const st = computeMatchStatus(m.scores, cup.teamAShort, cup.teamBShort);
              const companion = m.companionId ? d.matches.find(x => x.id === m.companionId) : null;
              const isGroup = !!companion;
              return (
                <div>
                  <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", letterSpacing: 2, marginBottom: 8 }}>{d.label?.toUpperCase()}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: cup.teamAColor }}>{m.player1a}{m.player1b ? ` & ${m.player1b}` : ""}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: cup.teamBColorDisp }}>{m.player2a}{m.player2b ? ` & ${m.player2b}` : ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: GOLD, fontFamily: "monospace" }}>{st.shortLabel}</div>
                        <div style={{ fontSize: 10, color: MUTED }}>{st.sublabel || m.teeTime}</div>
                      </div>
                    </div>
                    {isGroup && companion && (
                      <div style={{ background: CARD2, borderRadius: 8, padding: "8px 10px", marginBottom: 10, fontSize: 11, color: MUTED }}>
                        Playing with: <span style={{ color: cup.teamAColor, fontWeight: 700 }}>{companion.player1a}</span> vs <span style={{ color: cup.teamBColorDisp, fontWeight: 700 }}>{companion.player2a}</span>
                      </div>
                    )}
                    <button onClick={() => {
                      if (isGroup && companion) setActiveGroup({ dayIdx: playerMatch.dayIdx, matchIds: [m.id, companion.id] });
                      else setActiveMatch(playerMatch);
                    }} style={{ width: "100%", padding: "13px", background: `linear-gradient(135deg,${cup.teamAColor},${cup.teamBColor})`, border: "none", borderRadius: 12, color: "#fff", fontWeight: 900, fontSize: 14, cursor: "pointer", letterSpacing: 1, fontFamily: "monospace" }}>
                      {st.state === "pending" ? "START SCORING" : "ENTER SCORES →"}
                    </button>
                  </div>

                  {/* All days summary */}
                  {days.map((day, di) => (
                    <div key={di} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, color: MUTED, fontFamily: "monospace", letterSpacing: 2, marginBottom: 6 }}>{day.label?.toUpperCase()}</div>
                      {day.matches.map(mx => (
                        <MatchCard key={mx.id} match={mx} cup={cup}
                          onOpen={mid => { if (canEdit(di, mid)) openForScoring(di, mid); }}
                          canEdit={canEdit(di, mx.id)} />
                      ))}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ADMIN TAB */}
        {tab === "admin" && isAdmin && (
          <div>
            {/* Invite code */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: 1, marginBottom: 8 }}>INVITE CODE</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, padding: "10px 14px", background: CARD2, borderRadius: 8, fontFamily: "monospace", fontSize: 22, fontWeight: 900, color: GOLD, letterSpacing: 4, textAlign: "center" }}>
                  {inviteVisible ? meta.inviteCode : "••••••"}
                </div>
                <button onClick={() => setInviteVisible(v => !v)} style={{ padding: "10px 14px", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 12, cursor: "pointer" }}>
                  {inviteVisible ? "Hide" : "Show"}
                </button>
                {inviteVisible && <button onClick={() => navigator.clipboard?.writeText(meta.inviteCode)} style={{ padding: "10px 14px", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, color: GOLD, fontSize: 12, cursor: "pointer" }}>Copy</button>}
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 8 }}>Share this code with players to join the cup</div>
            </div>

            {/* Match reset per day */}
            {days.map((day, di) => (
              <div key={di} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", letterSpacing: 1, marginBottom: 10 }}>{day.label?.toUpperCase()}</div>
                {day.matches.map(m => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 12, color: TEXT }}>{m.player1a} vs {m.player2a}</div>
                    <button onClick={async () => {
                      if (!confirm(`Reset match ${m.player1a} vs ${m.player2a}?`)) return;
                      await set(ref(db, `cups/${cupId}/scores/m${m.id}`), null);
                    }} style={{ padding: "4px 10px", background: "none", border: "1px solid #e74c3c", borderRadius: 6, color: "#e74c3c", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>
                      Reset
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
