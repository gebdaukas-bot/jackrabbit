import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { db, ref, set } from "../firebase";
import { GOLD } from "../utils/scoring";
import LiveBackground from "../components/LiveBackground";

const DEFAULT_PAR = [4,4,3,4,5,4,3,4,4, 4,3,4,5,3,4,4,5,4];
const DEFAULT_HCP = [1,3,17,9,5,13,15,7,11, 2,18,8,4,16,12,6,14,10];

const fmtHcp = v => v < 0 ? `+${Math.abs(v)}` : `${v}`;

function PlayerRow({ label, color, player, onChange }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  return (
    <div>
      <label style={{ fontSize:11, color, fontFamily:"monospace", letterSpacing:1 }}>{label}</label>
      <div style={{ display:"flex", gap:8, marginTop:6 }}>
        <input
          value={player.name}
          onChange={e => onChange({ ...player, name: e.target.value })}
          placeholder="Player name"
          style={{ flex:1, padding:"10px 12px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:14, outline:"none" }}
        />
        <div style={{ display:"flex", flexShrink:0 }}>
          <button onClick={() => onChange({ ...player, hcp: Math.max(-10, player.hcp - 1) })}
            style={{ width:28, height:40, background:"none", border:`1px solid ${BORDER}`, borderRadius:"6px 0 0 6px", color:MUTED, cursor:"pointer", fontSize:16, lineHeight:1 }}>−</button>
          <div style={{ width:42, height:40, background:CARD2, border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:GOLD, fontFamily:"monospace" }}>{fmtHcp(player.hcp)}</div>
          <button onClick={() => onChange({ ...player, hcp: Math.min(36, player.hcp + 1) })}
            style={{ width:28, height:40, background:"none", border:`1px solid ${BORDER}`, borderRadius:"0 6px 6px 0", color:MUTED, cursor:"pointer", fontSize:16, lineHeight:1 }}>+</button>
        </div>
      </div>
    </div>
  );
}

export default function CreateMatch({ user }) {
  const { CARD, CARD2, BORDER, TEXT, MUTED, MUTED2 } = useTheme();
  const nav = useNavigate();

  const [step, setStep] = useState(1);
  const [format, setFormat] = useState("1v1");
  const [courseName, setCourseName] = useState("");
  const [par, setPar] = useState([...DEFAULT_PAR]);
  const [hcp, setHcp] = useState([...DEFAULT_HCP]);
  const [creating, setCreating] = useState(false);

  const [p1a, setP1a] = useState({ name: "", hcp: 0 });
  const [p1b, setP1b] = useState({ name: "", hcp: 0 });
  const [p2a, setP2a] = useState({ name: "", hcp: 0 });
  const [p2b, setP2b] = useState({ name: "", hcp: 0 });

  const is2v2 = format !== "1v1";
  const matchFormat = format === "scramble" ? "Scramble" : format === "2v2" ? "2v2 Best Ball" : "Singles";
  const canProceed = p1a.name.trim() && p2a.name.trim() && (!is2v2 || (p1b.name.trim() && p2b.name.trim()));

  const handleCreate = async () => {
    if (!canProceed || creating) return;
    setCreating(true);
    try {
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      const cupId = `match_${Date.now()}_${rand}`;
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      const sideA = is2v2 ? `${p1a.name.trim()} & ${p1b.name.trim()}` : p1a.name.trim();
      const sideB = is2v2 ? `${p2a.name.trim()} & ${p2b.name.trim()}` : p2a.name.trim();

      const meta = {
        name: `${sideA} vs ${sideB}`,
        eventType: "live_match",
        teamAName: sideA,
        teamBName: sideB,
        teamAColor: "#C8102E",
        teamBColor: "#003087",
        createdBy: user.uid,
        createdAt: Date.now(),
        inviteCode,
        status: "active",
      };

      const playersObj = {};
      const addP = (p, team) => {
        if (!p.name.trim()) return;
        playersObj[p.name.trim().toLowerCase().replace(/\s+/g, "_")] = { name: p.name.trim(), team, hcp: p.hcp || 0 };
      };
      addP(p1a, "A");
      if (is2v2) addP(p1b, "A");
      addP(p2a, "B");
      if (is2v2) addP(p2b, "B");

      const day = {
        label: "Match",
        rounds: [{ format: matchFormat, course: { name: courseName.trim() || "Course", par, hcp } }],
      };

      const match = {
        teeTime: "",
        format: matchFormat,
        player1a: p1a.name.trim(), hcp1a: p1a.hcp || 0,
        player1b: is2v2 ? p1b.name.trim() : null, hcp1b: is2v2 ? (p1b.hcp || 0) : 0,
        player2a: p2a.name.trim(), hcp2a: p2a.hcp || 0,
        player2b: is2v2 ? p2b.name.trim() : null, hcp2b: is2v2 ? (p2b.hcp || 0) : 0,
        companionId: null,
      };

      await set(ref(db, `cups/${cupId}/meta`), meta);
      await set(ref(db, `cups/${cupId}/players`), playersObj);
      await set(ref(db, `cups/${cupId}/days/0`), day);
      await set(ref(db, `cups/${cupId}/matches/m1101`), match);
      await set(ref(db, `inviteCodes/${inviteCode}`), cupId);
      await set(ref(db, `users/${user.uid}/cups/${cupId}`), {
        name: meta.name, eventType: "live_match",
        teamAName: sideA, teamBName: sideB,
        createdAt: meta.createdAt,
      });

      localStorage.setItem(`jr_player_${cupId}`, p1a.name.trim());
      nav(`/cup/${cupId}`);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  const updateHole = (field, i, val) => {
    const n = parseInt(val);
    if (isNaN(n)) return;
    if (field === "par") setPar(a => a.map((v, j) => j === i ? n : v));
    else setHcp(a => a.map((v, j) => j === i ? n : v));
  };

  return (
    <div style={{ minHeight:"100vh", color:TEXT }}>
      <LiveBackground/>
      {/* Top bar */}
      <div style={{ background:"rgba(8,20,43,0.85)", backdropFilter:"blur(8px)", borderBottom:`1px solid ${BORDER}`, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <button onClick={() => step > 1 ? setStep(s => s - 1) : nav("/")}
          style={{ background:"none", border:`1px solid ${BORDER}`, borderRadius:8, padding:"4px 10px", color:MUTED, fontSize:11, cursor:"pointer" }}>
          ← Back
        </button>
        <div style={{ fontSize:14, fontWeight:900, color:GOLD, fontFamily:"monospace", letterSpacing:2 }}>
          ⚡ LIVE MATCH
        </div>
        <div style={{ fontSize:10, color:MUTED, fontFamily:"monospace" }}>{step}/2</div>
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"20px 16px" }}>

        {/* ── Step 1: Format + Players ─────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

            {/* Format */}
            <div>
              <div style={{ fontSize:11, color:MUTED2, fontFamily:"monospace", letterSpacing:1, marginBottom:10 }}>FORMAT</div>
              <div style={{ display:"flex", gap:8 }}>
                {[["1v1","1v1"],["2v2","2v2 Best Ball"],["scramble","Scramble"]].map(([key, label]) => (
                  <button key={key} onClick={() => setFormat(key)}
                    style={{ flex:1, padding:"12px 4px", background:format===key?GOLD:"none", border:`1px solid ${format===key?GOLD:BORDER}`, borderRadius:10, color:format===key?"#000":MUTED, fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Side A */}
            <div>
              <div style={{ fontSize:11, color:"#C8102E", fontFamily:"monospace", letterSpacing:1, marginBottom:10 }}>SIDE A</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <PlayerRow label={is2v2?"PLAYER 1":"PLAYER"} color="#C8102E" player={p1a} onChange={setP1a}/>
                {is2v2 && <PlayerRow label="PLAYER 2" color="#C8102E" player={p1b} onChange={setP1b}/>}
              </div>
            </div>

            {/* Side B */}
            <div>
              <div style={{ fontSize:11, color:"#4A90D9", fontFamily:"monospace", letterSpacing:1, marginBottom:10 }}>SIDE B</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <PlayerRow label={is2v2?"PLAYER 1":"PLAYER"} color="#4A90D9" player={p2a} onChange={setP2a}/>
                {is2v2 && <PlayerRow label="PLAYER 2" color="#4A90D9" player={p2b} onChange={setP2b}/>}
              </div>
            </div>

            {/* Course name */}
            <div>
              <label style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1 }}>
                COURSE NAME <span style={{ opacity:0.5, fontWeight:400 }}>(optional)</span>
              </label>
              <input
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                placeholder="e.g. Augusta National"
                style={{ width:"100%", marginTop:6, padding:"10px 12px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:14, outline:"none", boxSizing:"border-box" }}
              />
            </div>

            <button onClick={() => setStep(2)} disabled={!canProceed}
              style={{ padding:"14px", background:canProceed?`linear-gradient(135deg,${GOLD},${GOLD}88)`:"none", border:`1px solid ${canProceed?GOLD:BORDER}`, borderRadius:14, color:canProceed?"#000":MUTED, fontWeight:900, fontSize:14, cursor:canProceed?"pointer":"default", fontFamily:"monospace", letterSpacing:1, opacity:canProceed?1:0.5 }}>
              SET UP COURSE →
            </button>
          </div>
        )}

        {/* ── Step 2: Course ───────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div style={{ fontSize:11, color:MUTED2, fontFamily:"monospace", letterSpacing:1, marginBottom:16 }}>
              COURSE: PAR & HANDICAP INDEX
            </div>
            {["par","hcp"].map(field => (
              <div key={field} style={{ marginBottom:20 }}>
                <div style={{ fontSize:10, color:MUTED, fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>
                  {field === "par" ? "PAR PER HOLE" : "HANDICAP INDEX"}
                </div>
                <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                  <div style={{ display:"flex", gap:3, minWidth:"max-content" }}>
                    {Array.from({ length:18 }, (_, i) => (
                      <div key={i} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:8, color:MUTED, marginBottom:2, fontFamily:"monospace" }}>{i+1}</div>
                        <input
                          type="number"
                          min={field === "par" ? 3 : 1}
                          max={field === "par" ? 5 : 18}
                          value={(field === "par" ? par : hcp)[i]}
                          onChange={e => updateHole(field, i, e.target.value)}
                          style={{ width:30, height:30, background:CARD2, border:`1px solid ${BORDER}`, borderRadius:4, color:TEXT, fontSize:11, textAlign:"center", outline:"none", padding:0 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={handleCreate} disabled={creating}
              style={{ width:"100%", marginTop:8, padding:"16px", background:`linear-gradient(135deg,${GOLD},${GOLD}88)`, border:"none", borderRadius:14, color:"#000", fontWeight:900, fontSize:15, cursor:creating?"wait":"pointer", letterSpacing:1, fontFamily:"monospace", boxShadow:`0 4px 18px ${GOLD}33` }}>
              {creating ? "CREATING..." : "START MATCH ⛳"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
