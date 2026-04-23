import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { auth, signOut, db, ref, onValue, get, set } from "../firebase";
import { GOLD } from "../utils/scoring";
import LiveBackground from "../components/LiveBackground";

export default function Home({ user }) {
  const { BG, CARD, CARD2, BORDER, TEXT, MUTED, MUTED2, theme, toggle } = useTheme();
  const nav = useNavigate();
  const [cups, setCups] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) return;
    const userRef = ref(db, `users/${user.uid}/cups`);
    const unsub = onValue(userRef, snap => {
      const data = snap.val();
      if (!data) { setCups([]); return; }
      // data is { cupId: { name, teamAName, teamBName, createdAt } }
      const list = Object.entries(data).map(([id, meta]) => ({ id, ...meta }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setCups(list);
    });
    return () => unsub();
  }, [user]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      const code = joinCode.trim().toUpperCase();
      const codesSnap = await get(ref(db, `inviteCodes/${code}`));
      if (!codesSnap.exists()) { setJoinError("Cup not found. Check the code and try again."); setJoining(false); return; }
      const cupId = codesSnap.val();
      const cupSnap = await get(ref(db, `cups/${cupId}/meta`));
      if (!cupSnap.exists()) { setJoinError("Cup not found."); setJoining(false); return; }
      const meta = cupSnap.val();
      await set(ref(db, `users/${user.uid}/cups/${cupId}`), {
        name: meta.name, teamAName: meta.teamAName, teamBName: meta.teamBName,
        createdAt: meta.createdAt,
      });
      nav(`/cup/${cupId}`);
    } catch (e) {
      setJoinError("Something went wrong. Try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", color: TEXT }}>
      <LiveBackground/>
      {/* Top bar */}
      <div style={{ background: "rgba(8,20,43,0.85)", backdropFilter:"blur(8px)", borderBottom: `1px solid ${BORDER}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: GOLD, fontFamily: "monospace", letterSpacing: 2 }}>⛳ DORMIE</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={toggle} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "4px 10px", color: MUTED, fontSize: 11, cursor: "pointer" }}>
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button onClick={() => signOut(auth)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "4px 10px", color: MUTED, fontSize: 11, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        {/* User greeting */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: MUTED }}>Welcome back,</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{user.displayName?.split(" ")[0] || "friend"}</div>
        </div>

        {/* Create buttons */}
        <button onClick={() => nav("/create")} style={{ width:"100%", padding:"16px", background:`linear-gradient(135deg,${GOLD},${GOLD}88)`, border:"none", borderRadius:14, color:"#000", fontWeight:900, fontSize:15, cursor:"pointer", letterSpacing:1, fontFamily:"monospace", marginBottom:10, boxShadow:`0 4px 18px ${GOLD}33` }}>
          + CREATE NEW CUP
        </button>
        <button onClick={() => nav("/match")} style={{ width:"100%", padding:"16px", background:`linear-gradient(135deg,${GOLD},${GOLD}88)`, border:"none", borderRadius:14, color:"#000", fontWeight:900, fontSize:15, cursor:"pointer", letterSpacing:1, fontFamily:"monospace", marginBottom:24, boxShadow:`0 4px 18px ${GOLD}33` }}>
          ⚡ CREATE NEW MATCH
        </button>

        {/* Join by code */}
        <div style={{ background: "rgba(8,20,43,0.8)", backdropFilter:"blur(10px)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: MUTED2, letterSpacing: 1, marginBottom: 10, fontFamily: "monospace" }}>JOIN A CUP</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="INVITE CODE"
              maxLength={8}
              style={{ flex: 1, padding: "10px 12px", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 14, fontFamily: "monospace", letterSpacing: 2, outline: "none" }}
            />
            <button onClick={handleJoin} disabled={joining} style={{ padding: "10px 16px", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {joining ? "..." : "Join"}
            </button>
          </div>
          {joinError && <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 8 }}>{joinError}</div>}
        </div>

        {/* Cups list */}
        <div style={{ fontSize: 12, fontWeight: 700, color: MUTED2, letterSpacing: 1, marginBottom: 10, fontFamily: "monospace" }}>YOUR CUPS</div>
        {cups.length === 0 ? (
          <div style={{ background: "rgba(8,20,43,0.8)", backdropFilter:"blur(10px)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px", textAlign: "center", color: MUTED, fontSize: 12 }}>
            No cups yet. Create one or join with an invite code.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cups.map(cup => (
              <button key={cup.id} onClick={() => nav(`/cup/${cup.id}`)} style={{ width: "100%", textAlign: "left", background: "rgba(8,20,43,0.8)", backdropFilter:"blur(10px)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px", cursor: "pointer" }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  {cup.eventType === "live_match" && (
                    <span style={{ fontSize:9, fontWeight:800, color:"#4A90D9", fontFamily:"monospace", letterSpacing:1, background:"#4A90D922", border:"1px solid #4A90D944", borderRadius:4, padding:"1px 5px" }}>⚡ MATCH</span>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 800, color: TEXT }}>{cup.name}</div>
                </div>
                <div style={{ fontSize: 11, color: MUTED }}>
                  {cup.eventType === "live_match" ? (
                    <span style={{ color: MUTED }}>{cup.teamAName} vs {cup.teamBName}</span>
                  ) : (
                    <>
                      <span style={{ color: "#C8102E", fontWeight: 700 }}>{cup.teamAName}</span>
                      <span style={{ color: MUTED }}> vs </span>
                      <span style={{ color: "#4A90D9", fontWeight: 700 }}>{cup.teamBName}</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
