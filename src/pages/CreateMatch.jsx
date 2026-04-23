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

  const [names, setNames] = useState({ a1:"", a2:"", b1:"", b2:"" });
  const [hcps,  setHcps]  = useState({ a1:0,  a2:0,  b1:0,  b2:0  });

  // Course state
  const [courseName, setCourseName] = useState("");
  const [par, setPar] = useState([...DEFAULT_PAR]);
  const [hcp, setHcp] = useState([...DEFAULT_HCP]);
  const [showHoles, setShowHoles] = useState(false);
  const [prevCourses, setPrevCourses] = useState([]);

  // Lookup state
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [lookupFound, setLookupFound] = useState(false);
  const [lookupError, setLookupError] = useState("");

  // Tee state
  const [tees, setTees] = useState([]);
  const [selectedTeeIdx, setSelectedTeeIdx] = useState(null);
  const [newTeeName, setNewTeeName] = useState("");
  const [newTeeSlope, setNewTeeSlope] = useState("");
  const [newTeeRating, setNewTeeRating] = useState("");

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState("");

  const [creating, setCreating] = useState(false);

  const is2v2 = format !== "1v1";
  const matchFormat = format === "scramble" ? "Scramble" : format === "2v2" ? "2v2 Best Ball" : "Singles";
  const namesOk = names.a1.trim() && names.b1.trim() && (!is2v2 || (names.a2.trim() && names.b2.trim()));
  const STEPS = ["Players", "Handicaps", "Course"];

  const totalPar = par.reduce((a, b) => a + b, 0);
  const calcCourseHcp = (hi, slope, rating) => Math.round(hi * (slope / 113) + (rating - totalPar));

  const courseNameOk = courseName.trim().length >= 6 && courseName.trim().toLowerCase() !== "unknown course";
  const teeOk = tees.length === 0 || selectedTeeIdx !== null;
  const step3Ok = courseNameOk && teeOk;

  // Active players list for hcp display
  const activePlayers = [
    { key:"a1", name:names.a1, hi:hcps.a1, color:"#C8102E" },
    ...(is2v2 ? [{ key:"a2", name:names.a2, hi:hcps.a2, color:"#C8102E" }] : []),
    { key:"b1", name:names.b1, hi:hcps.b1, color:"#4A90D9" },
    ...(is2v2 ? [{ key:"b2", name:names.b2, hi:hcps.b2, color:"#4A90D9" }] : []),
  ];

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
                seen[c.name] = { name: c.name, par: c.par, hcp: c.hcp, tees: c.tees || [] };
            }
          }
        }));
      }
      const merged = { ...Object.fromEntries(BUILT_IN_COURSES.map(c => [c.name, c])), ...seen };
      setPrevCourses(Object.values(merged).sort((a, b) => a.name.localeCompare(b.name)));
    };
    load();
  }, [user.uid]);

  const resetCourseData = () => {
    setLookupDone(false); setLookupFound(false); setLookupError("");
    setTees([]); setSelectedTeeIdx(null);
    setScanned(false); setScanError("");
  };

  const handleLookup = async () => {
    if (!courseName.trim() || lookingUp) return;
    setLookingUp(true); setLookupError(""); setLookupDone(false);
    setTees([]); setSelectedTeeIdx(null);
    try {
      const res = await fetch("/api/lookup-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseName: courseName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error || "Lookup failed"); setLookupFound(false); }
      else if (!data.found) { setLookupFound(false); }
      else {
        setCourseName(data.name);
        setPar([...data.par]);
        setHcp([...data.hcp]);
        setTees(data.tees || []);
        setLookupFound(true);
      }
      setLookupDone(true);
    } catch { setLookupError("Something went wrong — try again"); setLookupDone(true); }
    finally { setLookingUp(false); }
  };

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
      else { setCourseName(data.name); setPar([...data.par]); setHcp([...data.hcp]); setScanned(true); }
    } catch { setScanError("Something went wrong — try again"); }
    finally { setScanning(false); }
  };

  const handleAddTee = () => {
    const slope = parseInt(newTeeSlope);
    const rating = parseFloat(newTeeRating);
    if (!newTeeName.trim() || isNaN(slope) || isNaN(rating)) return;
    setTees(t => [...t, { name: newTeeName.trim(), slope, rating }]);
    setNewTeeName(""); setNewTeeSlope(""); setNewTeeRating("");
  };

  const updateHole = (field, i, val) => {
    const n = parseInt(val); if (isNaN(n)) return;
    if (field === "par") setPar(a => a.map((v, j) => j === i ? n : v));
    else setHcp(a => a.map((v, j) => j === i ? n : v));
  };

  const handleCreate = async () => {
    if (creating || !step3Ok) return;
    setCreating(true);
    try {
      const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
      const cupId = `match_${Date.now()}_${rand}`;
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      const sideA = is2v2 ? `${names.a1.trim()} & ${names.a2.trim()}` : names.a1.trim();
      const sideB = is2v2 ? `${names.b1.trim()} & ${names.b2.trim()}` : names.b1.trim();

      const selectedTee = selectedTeeIdx !== null ? tees[selectedTeeIdx] : null;
      const resolveHcp = (hi) => selectedTee ? calcCourseHcp(hi, selectedTee.slope, selectedTee.rating) : hi;

      const meta = {
        name: `${sideA} vs ${sideB}`,
        eventType: "live_match",
        teamAName: sideA, teamBName: sideB,
        teamAColor: "#C8102E", teamBColor: "#003087",
        createdBy: user.uid, createdAt: Date.now(),
        inviteCode, status: "active",
      };

      const playersObj = {};
      const addP = (name, team, hi) => {
        if (!name.trim()) return;
        playersObj[name.trim().toLowerCase().replace(/\s+/g, "_")] = {
          name: name.trim(), team, hcp: hi || 0,
          courseHcp: resolveHcp(hi || 0),
        };
      };
      addP(names.a1, "A", hcps.a1);
      if (is2v2) addP(names.a2, "A", hcps.a2);
      addP(names.b1, "B", hcps.b1);
      if (is2v2) addP(names.b2, "B", hcps.b2);

      const courseObj = {
        name: courseName.trim(), par, hcp,
        ...(tees.length > 0 ? { tees } : {}),
        ...(selectedTee ? { selectedTee } : {}),
      };
      const day = { label: "Match", rounds: [{ format: matchFormat, course: courseObj }] };
      const match = {
        teeTime: "", format: matchFormat,
        player1a: names.a1.trim(), hcp1a: resolveHcp(hcps.a1 || 0),
        player1b: is2v2 ? names.a2.trim() : null, hcp1b: is2v2 ? resolveHcp(hcps.a2 || 0) : 0,
        player2a: names.b1.trim(), hcp2a: resolveHcp(hcps.b1 || 0),
        player2b: is2v2 ? names.b2.trim() : null, hcp2b: is2v2 ? resolveHcp(hcps.b2 || 0) : 0,
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
            <div>
              <div style={{ fontSize:11, color:"#C8102E", fontFamily:"monospace", letterSpacing:1, marginBottom:10 }}>SIDE A</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {nameInput("a1", is2v2 ? "Player 1 name" : "Player name", "#C8102E")}
                {is2v2 && nameInput("a2", "Player 2 name", "#C8102E")}
              </div>
            </div>
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

            {/* Previous courses dropdown */}
            <div>
              <div style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>SELECT PREVIOUS COURSE</div>
              <select
                value=""
                onChange={e => {
                  const c = prevCourses.find(x => x.name === e.target.value);
                  if (!c) return;
                  setCourseName(c.name); setPar([...c.par]); setHcp([...c.hcp]);
                  setTees(c.tees || []); setSelectedTeeIdx(null);
                  resetCourseData();
                }}
                style={{ width:"100%", padding:"14px 12px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:12, color:MUTED, fontSize:14, outline:"none", cursor:"pointer" }}
              >
                <option value="">Choose a previous course…</option>
                {prevCourses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>

            {/* Course name + Look Up */}
            <div>
              <div style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>COURSE NAME</div>
              <div style={{ display:"flex", gap:8 }}>
                <input
                  value={courseName}
                  onChange={e => { setCourseName(e.target.value); resetCourseData(); }}
                  placeholder="Type course name…"
                  style={{ flex:1, padding:"14px 12px", background:CARD2, border:`1px solid ${lookupDone&&lookupFound?"#4caf50":BORDER}`, borderRadius:12, color:TEXT, fontSize:14, outline:"none" }}
                />
                <button onClick={handleLookup} disabled={lookingUp || !courseName.trim()}
                  style={{ padding:"14px 16px", background:GOLD, border:"none", borderRadius:12, color:"#000", fontWeight:900, fontSize:12, cursor:lookingUp||!courseName.trim()?"default":"pointer", fontFamily:"monospace", flexShrink:0, opacity:lookingUp||!courseName.trim()?0.5:1 }}>
                  {lookingUp ? "…" : "Look Up"}
                </button>
              </div>
            </div>

            {/* Lookup result banner */}
            {lookupDone && lookupFound && (
              <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 14px", background:"#0d2b0d", border:"1px solid #4caf5055", borderRadius:10 }}>
                <div style={{ fontSize:18 }}>✓</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#4caf50" }}>{courseName}</div>
                  <div style={{ fontSize:10, color:MUTED }}>{tees.length} tee box{tees.length!==1?"es":""} found</div>
                </div>
              </div>
            )}
            {lookupDone && !lookupFound && !lookupError && (
              <div style={{ padding:"10px 14px", background:"#1a1a0a", border:"1px solid #e67e2255", borderRadius:10, fontSize:12, color:"#e67e22" }}>
                Course not found — enter tees manually below, or scan the scorecard for hole data.
              </div>
            )}
            {lookupError && (
              <div style={{ fontSize:12, color:"#e74c3c" }}>{lookupError}</div>
            )}

            {/* Tee boxes */}
            {(tees.length > 0 || lookupDone) && (
              <div>
                <div style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>
                  SELECT TEES {tees.length > 0 ? "" : "(add one below)"}
                </div>
                {tees.map((tee, i) => {
                  const sel = selectedTeeIdx === i;
                  return (
                    <div key={i} onClick={() => setSelectedTeeIdx(i)}
                      style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:sel?`${GOLD}18`:CARD2, border:`1px solid ${sel?GOLD:BORDER}`, borderRadius:10, cursor:"pointer", marginBottom:6 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:sel?GOLD:TEXT }}>{tee.name}</div>
                        <div style={{ fontSize:10, color:MUTED, fontFamily:"monospace", marginTop:2 }}>
                          Rating {tee.rating} · Slope {tee.slope}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:2, alignItems:"flex-end" }}>
                        {activePlayers.map(p => (
                          <div key={p.key} style={{ fontSize:10, fontFamily:"monospace", color:sel?p.color:MUTED, whiteSpace:"nowrap" }}>
                            {p.name}: <span style={{ fontWeight:800, color:sel?GOLD:MUTED }}>{fmtHcp(calcCourseHcp(p.hi, tee.slope, tee.rating))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Add tee manually */}
                <div style={{ marginTop:8 }}>
                  <div style={{ fontSize:10, color:MUTED, fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>ADD TEE BOX</div>
                  <div style={{ display:"flex", gap:6 }}>
                    <input value={newTeeName} onChange={e => setNewTeeName(e.target.value)} placeholder="Tee name"
                      style={{ flex:2, padding:"10px 10px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:12, outline:"none" }}/>
                    <input value={newTeeRating} onChange={e => setNewTeeRating(e.target.value)} placeholder="Rating" type="number" step="0.1"
                      style={{ flex:1, padding:"10px 6px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:12, outline:"none", textAlign:"center" }}/>
                    <input value={newTeeSlope} onChange={e => setNewTeeSlope(e.target.value)} placeholder="Slope" type="number"
                      style={{ flex:1, padding:"10px 6px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:12, outline:"none", textAlign:"center" }}/>
                    <button onClick={handleAddTee} disabled={!newTeeName.trim()||!newTeeSlope||!newTeeRating}
                      style={{ padding:"10px 12px", background:GOLD, border:"none", borderRadius:8, color:"#000", fontWeight:900, fontSize:12, cursor:"pointer", flexShrink:0 }}>
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scan button */}
            <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"14px", background:scanned?"#0d2b0d":CARD2, border:`1px solid ${scanned?"#4caf50":BORDER}`, borderRadius:12, cursor:scanned||scanning?"default":"pointer", color:scanned?"#4caf50":scanning?MUTED:TEXT, fontWeight:700, fontSize:13 }}>
              {scanning ? "SCANNING…" : scanned ? "✓ Course Imported" : "📷 Scan Scorecard"}
              <input type="file" accept="image/*" style={{ display:"none" }} disabled={scanning||scanned}
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

            {!step3Ok && (
              <div style={{ fontSize:12, color:"#e67e22", fontFamily:"monospace", textAlign:"center" }}>
                {!courseNameOk
                  ? (!courseName.trim() ? "Enter a course name to continue"
                    : courseName.trim().toLowerCase() === "unknown course" ? "Please enter the real course name"
                    : `Course name must be at least 6 characters (${courseName.trim().length}/6)`)
                  : "Select a tee box to continue"}
              </div>
            )}
            <button onClick={handleCreate} disabled={creating || !step3Ok}
              style={{ padding:"16px", background:step3Ok?`linear-gradient(135deg,${GOLD},${GOLD}88)`:"none", border:`1px solid ${step3Ok?GOLD:BORDER}`, borderRadius:14, color:step3Ok?"#000":MUTED, fontWeight:900, fontSize:15, cursor:(creating||!step3Ok)?"default":"pointer", letterSpacing:1, fontFamily:"monospace", boxShadow:step3Ok?`0 4px 18px ${GOLD}33`:"none", marginTop:4, opacity:step3Ok?1:0.4 }}>
              {creating ? "CREATING..." : "START MATCH ⛳"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
