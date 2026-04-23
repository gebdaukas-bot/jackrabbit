import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { db, ref, set, get } from "../firebase";
import { GOLD } from "../utils/scoring";
import { BUILT_IN_COURSES } from "../utils/courses";
import LiveBackground from "../components/LiveBackground";

const DEFAULT_PAR = [4,4,3,4,5,4,3,4,4, 4,3,4,5,3,4,4,5,4];
const DEFAULT_HCP = [1,3,17,9,5,13,15,7,11, 2,18,8,4,16,12,6,14,10];
const fmtHcp = v => v < 0 ? `+${Math.abs(v)}` : `${v}`;

function HcpStepper({ value, onChange }) {
  const { CARD2, BORDER, MUTED } = useTheme();
  return (
    <div style={{ display:"flex", alignItems:"center" }}>
      <button onClick={() => onChange(Math.max(-10, value - 1))}
        style={{ width:44, height:44, background:"none", border:`1px solid ${BORDER}`, borderRadius:"10px 0 0 10px", color:MUTED, cursor:"pointer", fontSize:20, lineHeight:1 }}>−</button>
      <div style={{ width:56, height:44, background:CARD2, border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:GOLD, fontFamily:"monospace" }}>
        {fmtHcp(value)}
      </div>
      <button onClick={() => onChange(Math.min(36, value + 1))}
        style={{ width:44, height:44, background:"none", border:`1px solid ${BORDER}`, borderRadius:"0 10px 10px 0", color:MUTED, cursor:"pointer", fontSize:20, lineHeight:1 }}>+</button>
    </div>
  );
}

export default function CreateMatch({ user }) {
  const { CARD, CARD2, BORDER, TEXT, MUTED, MUTED2 } = useTheme();
  const nav = useNavigate();

  const [step, setStep] = useState(1);
  const [format, setFormat] = useState("1v1");

  // Player state — names separate from hcps for cleaner steps
  const [names, setNames] = useState({ a1:"", a2:"", b1:"", b2:"" });
  const [hcps,  setHcps]  = useState({ a1:0,  a2:0,  b1:0,  b2:0  });

  // Course state
  const [courseName, setCourseName] = useState("");
  const [par, setPar] = useState([...DEFAULT_PAR]);
  const [hcp, setHcp] = useState([...DEFAULT_HCP]);
  const [showHoles, setShowHoles] = useState(false);
  const [prevCourses, setPrevCourses] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  const [creating, setCreating] = useState(false);

  const is2v2 = format !== "1v1";
  const matchFormat = format === "scramble" ? "Scramble" : format === "2v2" ? "2v2 Best Ball" : "Singles";

  const namesOk = names.a1.trim() && names.b1.trim() && (!is2v2 || (names.a2.trim() && names.b2.trim()));

  const STEPS = ["Players", "Handicaps", "Course"];

  // Fetch previous + built-in courses
  useEffect(() => {
    const load = async () => {
      const seen = {};
      const cupsSnap = await get(ref(db, `users/${user.uid}/cups`));
      if (cupsSnap.exists()) {
        await Promise.all(Object.keys(cupsSnap.val()).map(async cupId => {
          const daysSnap = await get(ref(db, `cups/${cupId}/days`));
          if (!daysSnap.exists()) return;
          for (const day of Object.values(daysSnap.val())) {
            for (const round of (day.rounds || [{ course: day.course }])) {
              const c = round.course;
              if (c?.name && c.par?.length === 18 && c.hcp?.length === 18 && !seen[c.name])
                seen[c.name] = { name: c.name, par: c.par, hcp: c.hcp };
            }
          }
        }));
      }
      const merged = { ...Object.fromEntries(BUILT_IN_COURSES.map(c => [c.name, c])), ...seen };
      setPrevCourses(Object.values(merged).sort((a, b) => a.name.localeCompare(b.name)));
    };
    load();
  }, [user.uid]);

  const handleScan = async (file) => {
    if (!file) return;
    setScanError(""); setScanning(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const [header, imageBase64] = dataUrl.split(",");
      const mediaType = header.match(/:(.*?);/)[1];
      const res = await fetch("/api/parse-scorecard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) { setScanError(data.error || "Failed to parse scorecard"); }
      else { setCourseName(data.name); setPar([...data.par]); setHcp([...data.hcp]); }
    } catch { setScanError("Something went wrong — try again"); }
    finally { setScanning(false); }
  };

  const updateHole = (field, i, val) => {
    const n = parseInt(val); if (isNaN(n)) return;
    if (field === "par") setPar(a => a.map((v, j) => j === i ? n : v));
    else setHcp(a => a.map((v, j) => j === i ? n : v));
  };

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      const cupId = `match_${Date.now()}_${rand}`;
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      const sideA = is2v2 ? `${names.a1.trim()} & ${names.a2.trim()}` : names.a1.trim();
      const sideB = is2v2 ? `${names.b1.trim()} & ${names.b2.trim()}` : names.b1.trim();

      const meta = {
        name: `${sideA} vs ${sideB}`,
        eventType: "live_match",
        teamAName: sideA, teamBName: sideB,
        teamAColor: "#C8102E", teamBColor: "#003087",
        createdBy: user.uid, createdAt: Date.now(),
        inviteCode, status: "active",
      };

      const playersObj = {};
      const addP = (name, team, h) => {
        if (!name.trim()) return;
        playersObj[name.trim().toLowerCase().replace(/\s+/g, "_")] = { name: name.trim(), team, hcp: h || 0 };
      };
      addP(names.a1, "A", hcps.a1);
      if (is2v2) addP(names.a2, "A", hcps.a2);
      addP(names.b1, "B", hcps.b1);
      if (is2v2) addP(names.b2, "B", hcps.b2);

      const day = {
        label: "Match",
        rounds: [{ format: matchFormat, course: { name: courseName.trim() || "Course", par, hcp } }],
      };
      const match = {
        teeTime: "", format: matchFormat,
        player1a: names.a1.trim(), hcp1a: hcps.a1 || 0,
        player1b: is2v2 ? names.a2.trim() : null, hcp1b: is2v2 ? (hcps.a2 || 0) : 0,
        player2a: names.b1.trim(), hcp2a: hcps.b1 || 0,
        player2b: is2v2 ? names.b2.trim() : null, hcp2b: is2v2 ? (hcps.b2 || 0) : 0,
        companionId: null,
      };

      await set(ref(db, `cups/${cupId}/meta`), meta);
      await set(ref(db, `cups/${cupId}/players`), playersObj);
      await set(ref(db, `cups/${cupId}/days/0`), day);
      await set(ref(db, `cups/${cupId}/matches/m1101`), match);
      await set(ref(db, `inviteCodes/${inviteCode}`), cupId);
      await set(ref(db, `users/${user.uid}/cups/${cupId}`), {
        name: meta.name, eventType: "live_match",
        teamAName: sideA, teamBName: sideB, createdAt: meta.createdAt,
      });
      localStorage.setItem(`jr_player_${cupId}`, names.a1.trim());
      nav(`/cup/${cupId}`);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  const nameInput = (key, placeholder, color) => (
    <input
      value={names[key]}
      onChange={e => setNames(n => ({ ...n, [key]: e.target.value }))}
      placeholder={placeholder}
      style={{ flex:1, padding:"14px 16px", background:CARD2, border:`2px solid ${color}33`, borderRadius:12, color:TEXT, fontSize:16, outline:"none", fontWeight:600 }}
    />
  );

  return (
    <div style={{ minHeight:"100vh", color:TEXT }}>
      <LiveBackground/>

      {/* Top bar */}
      <div style={{ background:"rgba(8,20,43,0.9)", backdropFilter:"blur(8px)", borderBottom:`1px solid ${BORDER}`, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={() => step > 1 ? setStep(s => s - 1) : nav("/")}
          style={{ background:"none", border:`1px solid ${BORDER}`, borderRadius:8, padding:"5px 10px", color:MUTED, fontSize:11, cursor:"pointer" }}>
          ← Back
        </button>
        <div style={{ flex:1, textAlign:"center", fontSize:13, fontWeight:900, color:GOLD, fontFamily:"monospace", letterSpacing:2 }}>
          {STEPS[step - 1].toUpperCase()}
        </div>
        {/* Step dots */}
        <div style={{ display:"flex", gap:5 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: i + 1 === step ? 18 : 8, height:6, borderRadius:3, background: i + 1 < step ? "#4caf50" : i + 1 === step ? GOLD : BORDER, transition:"all 0.2s" }}/>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:440, margin:"0 auto", padding:"28px 16px" }}>

        {/* ── Step 1: Format + Names ──────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

            {/* Format */}
            <div>
              <div style={{ fontSize:11, color:MUTED2, fontFamily:"monospace", letterSpacing:1, marginBottom:12 }}>FORMAT</div>
              <div style={{ display:"flex", gap:8 }}>
                {[["1v1","1v1"],["2v2","2v2 Best Ball"],["scramble","Scramble"]].map(([key, label]) => (
                  <button key={key} onClick={() => setFormat(key)}
                    style={{ flex:1, padding:"14px 4px", background:format===key?GOLD:"none", border:`1px solid ${format===key?GOLD:BORDER}`, borderRadius:12, color:format===key?"#000":MUTED, fontWeight:800, fontSize:12, cursor:"pointer", fontFamily:"monospace" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Side A */}
            <div>
              <div style={{ fontSize:11, color:"#C8102E", fontFamily:"monospace", letterSpacing:1, marginBottom:10 }}>SIDE A</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {nameInput("a1", is2v2 ? "Player 1 name" : "Player name", "#C8102E")}
                {is2v2 && nameInput("a2", "Player 2 name", "#C8102E")}
              </div>
            </div>

            {/* Side B */}
            <div>
              <div style={{ fontSize:11, color:"#4A90D9", fontFamily:"monospace", letterSpacing:1, marginBottom:10 }}>SIDE B</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {nameInput("b1", is2v2 ? "Player 1 name" : "Player name", "#4A90D9")}
                {is2v2 && nameInput("b2", "Player 2 name", "#4A90D9")}
              </div>
            </div>

            <button onClick={() => setStep(2)} disabled={!namesOk}
              style={{ padding:"16px", background:namesOk?`linear-gradient(135deg,${GOLD},${GOLD}88)`:"none", border:`1px solid ${namesOk?GOLD:BORDER}`, borderRadius:14, color:namesOk?"#000":MUTED, fontWeight:900, fontSize:15, cursor:namesOk?"pointer":"default", fontFamily:"monospace", letterSpacing:1, opacity:namesOk?1:0.4 }}>
              NEXT →
            </button>
          </div>
        )}

        {/* ── Step 2: Handicaps ───────────────────────────────────────────── */}
        {step === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ fontSize:11, color:MUTED, marginBottom:8 }}>Set each player's handicap index. Use + for a plus-handicap.</div>

            {/* Side A */}
            <div style={{ background:"rgba(200,16,46,0.08)", border:`1px solid #C8102E44`, borderRadius:14, padding:"16px 16px" }}>
              <div style={{ fontSize:10, color:"#C8102E", fontFamily:"monospace", letterSpacing:1, marginBottom:12 }}>SIDE A</div>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {[["a1",names.a1],["a2",names.a2]].filter(([k]) => k==="a1" || is2v2).map(([key, name]) => (
                  <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:TEXT, flex:1 }}>{name}</div>
                    <HcpStepper value={hcps[key]} onChange={v => setHcps(h => ({ ...h, [key]: v }))}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Side B */}
            <div style={{ background:"rgba(74,144,217,0.08)", border:`1px solid #4A90D944`, borderRadius:14, padding:"16px 16px" }}>
              <div style={{ fontSize:10, color:"#4A90D9", fontFamily:"monospace", letterSpacing:1, marginBottom:12 }}>SIDE B</div>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {[["b1",names.b1],["b2",names.b2]].filter(([k]) => k==="b1" || is2v2).map(([key, name]) => (
                  <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                    <div style={{ fontSize:16, fontWeight:700, color:TEXT, flex:1 }}>{name}</div>
                    <HcpStepper value={hcps[key]} onChange={v => setHcps(h => ({ ...h, [key]: v }))}/>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(3)}
              style={{ marginTop:8, padding:"16px", background:`linear-gradient(135deg,${GOLD},${GOLD}88)`, border:"none", borderRadius:14, color:"#000", fontWeight:900, fontSize:15, cursor:"pointer", fontFamily:"monospace", letterSpacing:1 }}>
              NEXT →
            </button>
          </div>
        )}

        {/* ── Step 3: Course ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

            {/* Dropdown */}
            <div>
              <div style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>SELECT COURSE</div>
              <select
                value={courseName}
                onChange={e => {
                  const c = prevCourses.find(x => x.name === e.target.value);
                  if (c) { setCourseName(c.name); setPar([...c.par]); setHcp([...c.hcp]); }
                  else setCourseName(e.target.value);
                }}
                style={{ width:"100%", padding:"14px 12px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:12, color:courseName?TEXT:MUTED, fontSize:14, outline:"none", cursor:"pointer" }}
              >
                <option value="">Choose a course…</option>
                {prevCourses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Manual name entry */}
            <div>
              <div style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>OR ENTER NAME</div>
              <input
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                placeholder="Type course name…"
                style={{ width:"100%", padding:"14px 12px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:12, color:TEXT, fontSize:14, outline:"none", boxSizing:"border-box" }}
              />
            </div>

            {/* Scan button */}
            <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"14px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:12, cursor:scanning?"wait":"pointer", color:scanning?MUTED:TEXT, fontWeight:700, fontSize:13 }}>
              {scanning ? "SCANNING…" : "📷 Scan Scorecard"}
              <input type="file" accept="image/*" style={{ display:"none" }} disabled={scanning}
                onChange={e => handleScan(e.target.files?.[0])}/>
            </label>
            {scanError && <div style={{ fontSize:12, color:"#e74c3c" }}>{scanError}</div>}

            {/* Hole grid — expandable */}
            <button onClick={() => setShowHoles(s => !s)}
              style={{ background:"none", border:`1px solid ${BORDER}`, borderRadius:10, padding:"10px 14px", color:MUTED, fontSize:12, cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between" }}>
              <span>Edit par & handicap index per hole</span>
              <span>{showHoles ? "▲" : "▼"}</span>
            </button>

            {showHoles && ["par","hcp"].map(field => (
              <div key={field} style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, color:MUTED, fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>
                  {field === "par" ? "PAR PER HOLE" : "HANDICAP INDEX"}
                </div>
                <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}>
                  <div style={{ display:"flex", gap:3, minWidth:"max-content" }}>
                    {Array.from({ length:18 }, (_, i) => (
                      <div key={i} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:8, color:MUTED, marginBottom:2, fontFamily:"monospace" }}>{i+1}</div>
                        <input type="number" min={field==="par"?3:1} max={field==="par"?5:18}
                          value={(field==="par"?par:hcp)[i]}
                          onChange={e => updateHole(field, i, e.target.value)}
                          style={{ width:30, height:30, background:CARD2, border:`1px solid ${BORDER}`, borderRadius:4, color:TEXT, fontSize:11, textAlign:"center", outline:"none", padding:0 }}/>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={handleCreate} disabled={creating}
              style={{ padding:"16px", background:`linear-gradient(135deg,${GOLD},${GOLD}88)`, border:"none", borderRadius:14, color:"#000", fontWeight:900, fontSize:15, cursor:creating?"wait":"pointer", letterSpacing:1, fontFamily:"monospace", boxShadow:`0 4px 18px ${GOLD}33`, marginTop:4 }}>
              {creating ? "CREATING..." : "START MATCH ⛳"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
