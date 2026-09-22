import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { db, ref, set, get } from "../firebase";
import { GOLD } from "../utils/scoring";
import { BUILT_IN_COURSES } from "../utils/courses";
import { teamsToMeta, matchTeams, MAX_TEAMS, TEAM_IDS, DEFAULT_TEAM_COLORS, DEFAULT_TEAM_NAMES } from "../utils/teams";
import LiveBackground from "../components/LiveBackground";

const FORMATS   = ["2v2 Best Ball", "Singles", "Scramble"];
const DEFAULT_PAR = [4,4,3,4,5,4,3,4,4, 4,3,4,5,3,4,4,5,4];
const DEFAULT_HCP = [1,3,17,9,5,13,15,7,11, 2,18,8,4,16,12,6,14,10];
const DAY_NAMES   = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function mkRound() {
  return { format:"2v2 Best Ball", courseName:"", par:[...DEFAULT_PAR], hcp:[...DEFAULT_HCP], matches:[] };
}
function mkDay(n) {
  return { label:`Day ${n}`, rounds:[mkRound()] };
}

// ── Step 1: Cup name + teams + invite code ───────────────────────────────────
function Step1({ data, setData }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const inp = (key, placeholder, extra = {}) => (
    <input
      value={data[key]}
      onChange={e => setData(d => ({ ...d, [key]: e.target.value }))}
      placeholder={placeholder}
      style={{ width:"100%", padding:"10px 12px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:14, outline:"none", boxSizing:"border-box", marginTop:6, ...extra }}
    />
  );

  // Changing the team count keeps the teams already filled in and tops up (or
  // trims) from the defaults, so switching 2 → 4 → 2 never loses your typing.
  const setTeamCount = n => setData(d => {
    const cur = d.teams;
    if (n > cur.length) {
      const added = Array.from({length:n-cur.length},(_,i)=>{
        const idx = cur.length + i;
        return { id:TEAM_IDS[idx], name:DEFAULT_TEAM_NAMES[idx], color:DEFAULT_TEAM_COLORS[idx] };
      });
      return { ...d, teams:[...cur, ...added] };
    }
    // Dropping teams strands anyone on them and any pairing that named them, so
    // clear both rather than leave picks pointing at a team that's gone.
    const kept = cur.slice(0,n);
    const ok = id => kept.some(t=>t.id===id);
    return {
      ...d,
      teams: kept,
      players: d.players.filter(p=>ok(p.team)),
      days: d.days.map(day=>({ ...day, rounds:day.rounds.map(r=>({ ...r, matches:r.matches.map(m=>{
        const aOk = ok(m.teamA), bOk = ok(m.teamB);
        if (aOk && bOk) return m;
        return {
          ...m,
          teamA: aOk ? m.teamA : kept[0].id,
          teamB: bOk ? m.teamB : (kept[1] || kept[0]).id,
          ...(aOk ? {} : { player1a:"", hcp1a:0, player1b:m.player1b===null?null:"", hcp1b:0 }),
          ...(bOk ? {} : { player2a:"", hcp2a:0, player2b:m.player2b===null?null:"", hcp2b:0 }),
        };
      })}))})),
    };
  });

  const setTeam = (i, patch) => setData(d => ({ ...d, teams:d.teams.map((t,j)=>j===i?{...t,...patch}:t) }));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <label style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1 }}>CUP NAME</label>
        {inp("name", 'e.g. "The Ryder Cup 2026"')}
      </div>

      <div>
        <label style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1 }}>HOW MANY TEAMS?</label>
        <div style={{ fontSize:10, color:MUTED, marginTop:2, marginBottom:6 }}>Every match is still one team against another — with three or four, you pick the pairing for each match.</div>
        <div style={{ display:"flex", gap:8 }}>
          {[2,3,4].map(n=>(
            <button key={n} onClick={()=>setTeamCount(n)}
              style={{ flex:1, padding:"12px 4px", background:data.teams.length===n?GOLD:"none", border:`1px solid ${data.teams.length===n?GOLD:BORDER}`, borderRadius:10, color:data.teams.length===n?"#000":TEXT, fontWeight:data.teams.length===n?900:400, fontSize:16, cursor:"pointer", fontFamily:"monospace" }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {data.teams.map((t,i)=>(
        <div key={t.id} style={{ display:"flex", gap:10, alignItems:"flex-end" }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, color:t.color, fontFamily:"monospace", letterSpacing:1 }}>TEAM {i+1} NAME</label>
            <input value={t.name} onChange={e=>setTeam(i,{name:e.target.value})} placeholder={DEFAULT_TEAM_NAMES[i]}
              style={{ width:"100%", padding:"10px 12px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:14, outline:"none", boxSizing:"border-box", marginTop:6 }}/>
          </div>
          <input type="color" value={t.color} onChange={e=>setTeam(i,{color:e.target.value})} title={`${t.name} color`}
            style={{ width:52, height:42, padding:2, background:"none", border:`1px solid ${BORDER}`, borderRadius:8, cursor:"pointer", flexShrink:0 }} />
        </div>
      ))}

      <div>
        <label style={{ fontSize:11, color:GOLD, fontFamily:"monospace", letterSpacing:1 }}>INVITE CODE <span style={{ color:MUTED, fontWeight:400 }}>(optional)</span></label>
        <div style={{ fontSize:10, color:MUTED, marginTop:2, marginBottom:4 }}>Leave blank to auto-generate. Letters and numbers only.</div>
        {inp("inviteCode", "e.g. RYDERC26", { fontFamily:"monospace", letterSpacing:2, textTransform:"uppercase" })}
      </div>
    </div>
  );
}

// ── Step 2: Players ──────────────────────────────────────────────────────────
function Step2({ data, setData }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState(data.teams[0].id);
  const [newHcp, setNewHcp] = useState(0);
  const [pasteTeam, setPasteTeam] = useState(data.teams[0].id);
  // Dropping from 4 teams back to 2 on step 1 can strand these on a team that no
  // longer exists, so fall back to the first team.
  const validTeam = id => data.teams.some(t=>t.id===id) ? id : data.teams[0].id;
  const teamOpts = data.teams.map(t=><option key={t.id} value={t.id}>{t.name||`Team ${t.id}`}</option>);
  const [pasteText, setPasteText] = useState("");

  const addPlayer = () => {
    if (!newName.trim()) return;
    setData(d => ({ ...d, players:[...d.players, { name:newName.trim(), team:validTeam(newTeam), hcp:newHcp }] }));
    setNewName(""); setNewHcp(0);
  };
  const removePlayer = i => setData(d => ({ ...d, players:d.players.filter((_,idx)=>idx!==i) }));
  const adjustHcp = (i, delta) => setData(d => {
    const players=[...d.players];
    players[i]={...players[i], hcp:Math.round(Math.min(36,Math.max(-10,players[i].hcp+delta))*10)/10};
    return {...d,players};
  });

  const pasteList = () => {
    const lines = pasteText.split(/\n/).map(s=>s.trim()).filter(Boolean);
    if (!lines.length) return;
    const parsed = lines.map(line => {
      const m = line.match(/^(.*?)[\s,\t]+([+-]?\d+\.?\d*)$/);
      if (m) {
        const name = m[1].trim();
        const hcp = Math.round(Math.min(36, Math.max(-10, parseFloat(m[2]))) * 10) / 10;
        if (name) return { name, team: validTeam(pasteTeam), hcp };
      }
      return { name: line.trim(), team: validTeam(pasteTeam), hcp: 0 };
    }).filter(p => p.name);
    setData(d => ({ ...d, players:[...d.players, ...parsed] }));
    setPasteText("");
  };
  const setPlayerHcp = (i, val) => setData(d => {
    const players = [...d.players];
    const n = parseFloat(val);
    players[i] = {...players[i], hcp: isNaN(n) ? 0 : Math.round(Math.min(36, Math.max(-10, n)) * 10) / 10};
    return {...d, players};
  });

  return (
    <div>
      {/* Paste area — always visible */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex", gap:8, marginBottom:6, alignItems:"center" }}>
          <select value={validTeam(pasteTeam)} onChange={e=>setPasteTeam(e.target.value)}
            style={{ padding:"6px 8px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:6, color:TEXT, fontSize:12, cursor:"pointer" }}>
            {teamOpts}
          </select>
          <button onClick={pasteList} disabled={!pasteText.trim()}
            style={{ padding:"6px 14px", background:pasteText.trim()?GOLD:"none", border:`1px solid ${pasteText.trim()?GOLD:BORDER}`, borderRadius:6, color:pasteText.trim()?"#000":MUTED, fontWeight:700, fontSize:12, cursor:pasteText.trim()?"pointer":"default" }}>
            Add All
          </button>
        </div>
        <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)}
          placeholder={"Paste names, one per line…\nAdd handicap after name: 'Tiger Woods 8.4'"}  rows={3}
          style={{ width:"100%", padding:"8px 10px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit" }}/>
      </div>

      {/* Manual add */}
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Player name"
          onKeyDown={e=>e.key==="Enter"&&addPlayer()}
          style={{ flex:"1 1 120px", padding:"8px 10px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:13, outline:"none" }} />
        <select value={validTeam(newTeam)} onChange={e=>setNewTeam(e.target.value)}
          style={{ padding:"8px 10px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:13, cursor:"pointer" }}>
          {teamOpts}
        </select>
        <div style={{ display:"flex", alignItems:"center" }}>
          <button onClick={()=>setNewHcp(h=>Math.round(Math.max(-10,h-0.1)*10)/10)} style={{ width:28, height:32, background:CARD2, border:`1px solid ${BORDER}`, borderRadius:"6px 0 0 6px", color:TEXT, cursor:"pointer", fontSize:14 }}>−</button>
          <div style={{ width:52, height:32, background:CARD2, border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:GOLD, fontFamily:"monospace" }}>{newHcp<0?`+${Math.abs(newHcp).toFixed(1)}`:Number(newHcp).toFixed(1)}</div>
          <button onClick={()=>setNewHcp(h=>Math.round(Math.min(36,h+0.1)*10)/10)} style={{ width:28, height:32, background:CARD2, border:`1px solid ${BORDER}`, borderRadius:"0 6px 6px 0", color:TEXT, cursor:"pointer", fontSize:14 }}>+</button>
        </div>
        <button onClick={addPlayer} style={{ padding:"8px 14px", background:GOLD, border:"none", borderRadius:8, color:"#000", fontWeight:700, fontSize:13, cursor:"pointer" }}>Add</button>
      </div>
      {data.teams.map(team=>{
        const players = data.players.filter(p=>p.team===team.id);
        if (!players.length) return null;
        return (
          <div key={team.id} style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:team.color, fontFamily:"monospace", letterSpacing:1, marginBottom:6, fontWeight:700 }}>
              {team.name} <span style={{color:MUTED,fontWeight:400}}>· {players.length}</span>
            </div>
            {players.map((p,ri)=>{
              const gi = data.players.findIndex(x=>x===p);
              return (
                <div key={ri} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", background:CARD2, borderRadius:8, marginBottom:4 }}>
                  <span style={{ fontSize:13, color:TEXT }}>{p.name}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:9, color:MUTED, fontFamily:"monospace" }}>HCP</span>
                    <button onClick={()=>adjustHcp(gi,-0.1)} style={{ width:24, height:26, background:"none", border:`1px solid ${BORDER}`, borderRadius:"4px 0 0 4px", color:MUTED, cursor:"pointer", fontSize:13, lineHeight:1 }}>−</button>
                    <input type="number" inputMode="decimal" step="0.1" min="-10" max="36"
                      value={p.hcp}
                      onChange={e=>setPlayerHcp(gi, e.target.value)}
                      onBlur={e=>setPlayerHcp(gi, e.target.value)}
                      style={{ width:52, height:26, background:"none", border:`1px solid ${BORDER}`, borderLeft:"none", borderRight:"none", color:GOLD, fontFamily:"monospace", fontSize:12, fontWeight:700, textAlign:"center", outline:"none", MozAppearance:"textfield" }}/>
                    <button onClick={()=>adjustHcp(gi,0.1)} style={{ width:24, height:26, background:"none", border:`1px solid ${BORDER}`, borderRadius:"0 4px 4px 0", color:MUTED, cursor:"pointer", fontSize:13, lineHeight:1 }}>+</button>
                    <button onClick={()=>removePlayer(gi)} style={{ background:"none", border:"none", color:"#e74c3c", cursor:"pointer", fontSize:16, lineHeight:1, marginLeft:4 }}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 3: Days + Rounds ────────────────────────────────────────────────────
function Step3({ data, setData }) {
  const { CARD2, BORDER, TEXT, MUTED, MUTED2 } = useTheme();

  const setNumDays = (n) => {
    setData(d => {
      const current = d.days;
      if (n > current.length) return { ...d, days:[...current, ...Array.from({length:n-current.length},(_,i)=>mkDay(current.length+i+1))] };
      return { ...d, days:current.slice(0,n) };
    });
  };

  const updateDayLabel = (di, val) => setData(d => {
    const days=[...d.days]; days[di]={...days[di],label:val}; return {...d,days};
  });

  const updateRound = (di, ri, key, val) => setData(d => {
    const days=[...d.days];
    const rounds=[...days[di].rounds];
    rounds[ri]={...rounds[ri],[key]:val};
    days[di]={...days[di],rounds};
    return {...d,days};
  });

  const addRound = (di) => setData(d => {
    const days=[...d.days];
    days[di]={...days[di], rounds:[...days[di].rounds, mkRound()]};
    return {...d,days};
  });

  const removeRound = (di, ri) => setData(d => {
    const days=[...d.days];
    days[di]={...days[di], rounds:days[di].rounds.filter((_,i)=>i!==ri)};
    return {...d,days};
  });

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", gap:8 }}>
          {[1,2,3,4,5].map(n=>(
            <button key={n} onClick={()=>setNumDays(n)}
              style={{ flex:1, padding:"12px 4px", background:data.days.length===n?GOLD:"none", border:`1px solid ${data.days.length===n?GOLD:BORDER}`, borderRadius:10, color:data.days.length===n?"#000":TEXT, fontWeight:data.days.length===n?900:400, fontSize:16, cursor:"pointer", fontFamily:"monospace" }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {data.days.map((day,di)=>(
        <div key={di} style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:12, padding:14, marginBottom:12 }}>
          <div style={{ fontSize:10, color:MUTED2, fontFamily:"monospace", letterSpacing:1, marginBottom:8 }}>DAY {di+1}</div>

          {/* Day label */}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:10, color:MUTED, marginBottom:4 }}>Label</div>
            <input value={day.label} onChange={e=>updateDayLabel(di,e.target.value)}
              style={{ width:"100%", padding:"8px 10px", background:"none", border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:13, outline:"none", boxSizing:"border-box", marginBottom:6 }} />
            <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
              {DAY_NAMES.map(d=>(
                <button key={d} onClick={()=>updateDayLabel(di,d)}
                  style={{ padding:"3px 8px", background:"none", border:`1px solid ${BORDER}`, borderRadius:6, color:MUTED, fontSize:10, cursor:"pointer", fontFamily:"monospace" }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Rounds */}
          {day.rounds.map((round, ri)=>(
            <div key={ri} style={{ background:"#060f22", border:`1px solid ${BORDER}`, borderRadius:10, padding:12, marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <div style={{ fontSize:10, color:GOLD, fontFamily:"monospace", letterSpacing:1 }}>
                  {day.rounds.length > 1 ? `ROUND ${ri+1}` : "ROUND"}
                </div>
                {day.rounds.length > 1 && (
                  <button onClick={()=>removeRound(di,ri)} style={{ background:"none", border:"none", color:"#e74c3c", cursor:"pointer", fontSize:14, lineHeight:1 }}>×</button>
                )}
              </div>
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, color:MUTED2, marginBottom:4, fontFamily:"monospace" }}>FORMAT</div>
                <div style={{ display:"flex", gap:6 }}>
                  {FORMATS.map(f=>(
                    <button key={f} onClick={()=>updateRound(di,ri,"format",f)}
                      style={{ flex:1, padding:"7px 4px", background:round.format===f?GOLD:"none", border:`1px solid ${round.format===f?GOLD:BORDER}`, borderRadius:8, color:round.format===f?"#000":TEXT, fontSize:11, cursor:"pointer", fontWeight:round.format===f?800:400, fontFamily:"monospace" }}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:MUTED2, marginBottom:4, fontFamily:"monospace" }}>COURSE NAME</div>
                <input value={round.courseName} onChange={e=>updateRound(di,ri,"courseName",e.target.value)} placeholder="e.g. Pebble Beach Golf Links"
                  style={{ width:"100%", padding:"8px 10px", background:"none", border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:13, outline:"none", boxSizing:"border-box" }} />
              </div>
            </div>
          ))}

          {day.rounds.length < 2 && (
            <button onClick={()=>addRound(di)}
              style={{ width:"100%", padding:"8px", background:"none", border:`1px dashed ${BORDER}`, borderRadius:8, color:MUTED, fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>
              + ADD ROUND
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 4: Course data (par + hcp index per hole) ───────────────────────────
function Step4({ data, setData, prevCourses }) {
  const { CARD2, BORDER, TEXT, MUTED, MUTED2 } = useTheme();
  const [activeDay, setActiveDay] = useState(0);
  const [activeRound, setActiveRound] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");

  // Look up a course by the name already typed in Step 3 — same GolfCourseAPI
  // (falling back to Claude) lookup the standalone match wizard uses, wired in
  // here too so the full cup wizard doesn't require manual par/hcp entry.
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupDone, setLookupDone] = useState(false);
  const [lookupFound, setLookupFound] = useState(false);
  const [lookupError, setLookupError] = useState("");

  const applyToActiveRound = patch => setData(d => {
    const days = [...d.days];
    const rounds = [...days[activeDay].rounds];
    rounds[ri] = { ...rounds[ri], ...patch };
    days[activeDay] = { ...days[activeDay], rounds };
    return { ...d, days };
  });

  const handleLookup = async () => {
    const name = round.courseName.trim();
    if (!name || lookingUp) return;
    setLookingUp(true); setLookupError(""); setLookupDone(false);
    try {
      const res = await fetch("/api/lookup-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseName: name }),
      });
      const data = await res.json();
      if (!res.ok) { setLookupError(data.error || "Lookup failed"); setLookupFound(false); }
      else if (!data.found) { setLookupFound(false); }
      else {
        applyToActiveRound({ courseName: data.name, par: [...data.par], hcp: [...data.hcp] });
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
      const parsed = await res.json();
      if (!res.ok) {
        setScanError(parsed.error || "Failed to parse scorecard");
      } else {
        setData(d => {
          const days = [...d.days];
          const rounds = [...days[activeDay].rounds];
          rounds[ri] = { ...rounds[ri], courseName: parsed.name, par: [...parsed.par], hcp: [...parsed.hcp] };
          days[activeDay] = { ...days[activeDay], rounds };
          return { ...d, days };
        });
      }
    } catch { setScanError("Something went wrong — try again"); }
    finally { setScanning(false); }
  };

  // Reset round tab if switching day
  const switchDay = (i) => { setActiveDay(i); setActiveRound(0); };

  const updateHole = (type, holeIdx, val) => {
    const num = parseInt(val); if (isNaN(num)) return;
    setData(d => {
      const days=[...d.days];
      const rounds=[...days[activeDay].rounds];
      const arr=[...rounds[activeRound][type]];
      arr[holeIdx]=num;
      rounds[activeRound]={...rounds[activeRound],[type]:arr};
      days[activeDay]={...days[activeDay],rounds};
      return {...d,days};
    });
  };

  const day = data.days[activeDay];
  // Clamp activeRound if day changed
  const ri = Math.min(activeRound, day.rounds.length-1);
  const round = day.rounds[ri];
  const totalPar = round.par.reduce((a,b)=>a+b,0);

  return (
    <div>
      {/* Day tabs */}
      {data.days.length > 1 && (
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          {data.days.map((d,i)=>(
            <button key={i} onClick={()=>switchDay(i)}
              style={{ flex:1, padding:"7px 4px", background:activeDay===i?GOLD:"none", border:`1px solid ${activeDay===i?GOLD:BORDER}`, borderRadius:8, color:activeDay===i?"#000":TEXT, fontSize:11, cursor:"pointer", fontWeight:activeDay===i?800:400, fontFamily:"monospace" }}>
              {d.label}
            </button>
          ))}
        </div>
      )}

      {/* Round tabs (only if day has > 1 round) */}
      {day.rounds.length > 1 && (
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          {day.rounds.map((r,i)=>(
            <button key={i} onClick={()=>setActiveRound(i)}
              style={{ flex:1, padding:"6px 4px", background:ri===i?`${GOLD}33`:"none", border:`1px solid ${ri===i?GOLD:BORDER}`, borderRadius:8, color:ri===i?GOLD:MUTED, fontSize:10, cursor:"pointer", fontFamily:"monospace" }}>
              {r.courseName||`Round ${i+1}`}
            </button>
          ))}
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ fontSize:12, color:MUTED }}>par and handicap index for <strong style={{ color:TEXT }}>{day.label}</strong></div>
        <label style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:700, color:scanning?MUTED:GOLD, fontFamily:"monospace", cursor:scanning?"wait":"pointer", flexShrink:0, marginLeft:10 }}>
          {scanning ? "SCANNING..." : "📷 SCAN"}
          <input type="file" accept="image/*" style={{ display:"none" }} disabled={scanning}
            onChange={e => handleScan(e.target.files?.[0])}/>
        </label>
      </div>

      {/* Course name + Look Up — same GolfCourseAPI/Claude lookup as the quick-match wizard */}
      <div style={{ marginBottom:8 }}>
        <div style={{ display:"flex", gap:8 }}>
          <input
            value={round.courseName}
            onChange={e => { applyToActiveRound({ courseName:e.target.value }); setLookupDone(false); setLookupError(""); }}
            placeholder="e.g. Pebble Beach Golf Links"
            style={{ flex:1, padding:"10px 12px", background:CARD2, border:`1px solid ${lookupDone&&lookupFound?"#4caf50":BORDER}`, borderRadius:8, color:TEXT, fontSize:13, outline:"none", boxSizing:"border-box" }}
          />
          <button onClick={handleLookup} disabled={lookingUp || !round.courseName.trim()}
            style={{ padding:"10px 14px", background:GOLD, border:"none", borderRadius:8, color:"#000", fontWeight:900, fontSize:11, cursor:lookingUp||!round.courseName.trim()?"default":"pointer", fontFamily:"monospace", flexShrink:0, opacity:lookingUp||!round.courseName.trim()?0.5:1 }}>
            {lookingUp ? "…" : "🔍 Look Up"}
          </button>
        </div>
      </div>
      {lookupDone && lookupFound && <div style={{ fontSize:11, color:"#4caf50", marginBottom:10 }}>✓ Found — par &amp; handicap filled in below.</div>}
      {lookupDone && !lookupFound && !lookupError && <div style={{ fontSize:11, color:"#e67e22", marginBottom:10 }}>Course not found — enter par/hcp manually below, or scan a scorecard.</div>}
      {lookupError && <div style={{ fontSize:11, color:"#e74c3c", marginBottom:10 }}>{lookupError}</div>}
      {scanError && <div style={{ fontSize:11, color:"#e74c3c", marginBottom:10 }}>{scanError}</div>}

      {prevCourses?.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, color:MUTED, fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>LOAD PREVIOUS COURSE</div>
          <select
            defaultValue=""
            onChange={e => {
              const c = prevCourses.find(x => x.name === e.target.value);
              if (!c) return;
              setData(d => {
                const days = [...d.days];
                const rounds = [...days[activeDay].rounds];
                rounds[ri] = { ...rounds[ri], courseName: c.name, par: [...c.par], hcp: [...c.hcp] };
                days[activeDay] = { ...days[activeDay], rounds };
                return { ...d, days };
              });
            }}
            style={{ width:"100%", padding:"10px 12px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:13, outline:"none", cursor:"pointer" }}
          >
            <option value="" disabled>Select a course…</option>
            {prevCourses.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      )}

      {[0,1].map(half => (
        <div key={half} style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, color:MUTED2, fontFamily:"monospace", letterSpacing:1, marginBottom:6 }}>{half===0?"FRONT 9":"BACK 9"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 1fr", gap:4, alignItems:"center", marginBottom:4 }}>
            <div style={{ fontSize:9, color:MUTED2, fontFamily:"monospace", textAlign:"center" }}>#</div>
            <div style={{ fontSize:9, color:MUTED2, fontFamily:"monospace", textAlign:"center" }}>PAR</div>
            <div style={{ fontSize:9, color:MUTED2, fontFamily:"monospace", textAlign:"center" }}>HCP</div>
          </div>
          {Array.from({length:9},(_,i)=>half*9+i).map(i=>(
            <div key={i} style={{ display:"grid", gridTemplateColumns:"28px 1fr 1fr", gap:4, alignItems:"center", marginBottom:3 }}>
              <div style={{ fontSize:11, color:MUTED, textAlign:"center", fontFamily:"monospace" }}>{i+1}</div>
              <input type="number" min={3} max={6} value={round.par[i]}
                onChange={e=>updateHole("par",i,e.target.value)}
                style={{ padding:"5px 6px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:6, color:TEXT, fontSize:13, textAlign:"center", outline:"none", width:"100%", boxSizing:"border-box" }} />
              <input type="number" min={1} max={18} value={round.hcp[i]}
                onChange={e=>updateHole("hcp",i,e.target.value)}
                style={{ padding:"5px 6px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:6, color:TEXT, fontSize:13, textAlign:"center", outline:"none", width:"100%", boxSizing:"border-box" }} />
            </div>
          ))}
          <div style={{ fontSize:10, color:MUTED, fontFamily:"monospace", marginTop:4 }}>
            {half===0?"Front":"Back"} par: {round.par.slice(half*9,(half+1)*9).reduce((a,b)=>a+b,0)}
          </div>
        </div>
      ))}
      <div style={{ fontSize:11, color:GOLD, fontFamily:"monospace", fontWeight:700 }}>Total par: {totalPar}</div>
    </div>
  );
}

// ── Step 5: Pairings ─────────────────────────────────────────────────────────
const FMT_LABELS = { "Singles":"1v1", "2v2 Best Ball":"Best Ball", "Scramble":"Scramble" };
const ALL_MATCH_FMTS = ["Singles", "2v2 Best Ball", "Scramble"];

function Step5({ data, setData }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [activeDay, setActiveDay] = useState(0);
  const [activeRound, setActiveRound] = useState(0);

  const switchDay = (i) => { setActiveDay(i); setActiveRound(0); };

  const day = data.days[activeDay];
  const ri = Math.min(activeRound, day.rounds.length-1);
  const round = day.rounds[ri];
  // With three or four teams each match names its own pairing; with two there is
  // only one possible pairing, so the picker stays hidden.
  const pickTeams = data.teams.length > 2;
  const sidesOf = m => matchTeams(data.teams, m);
  const rosterOf = t => data.players.filter(p=>p.team===t.id);

  const mutateRound = (fn) => setData(d => {
    const days=[...d.days];
    const rounds=[...days[activeDay].rounds];
    rounds[ri]=fn(rounds[ri]);
    days[activeDay]={...days[activeDay],rounds};
    return {...d,days};
  });

  const addMatch = () => mutateRound(r => {
    const fmt = r.format;
    const isSingles = fmt === "Singles";
    return { ...r, matches:[...r.matches, {
      teeTime:"", format:fmt,
      teamA:data.teams[0].id, teamB:data.teams[1].id,
      player1a:"", hcp1a:0, player1b:isSingles?null:"", hcp1b:0,
      player2a:"", hcp2a:0, player2b:isSingles?null:"", hcp2b:0,
    }]};
  });

  const removeMatch = (mi) => mutateRound(r => ({ ...r, matches:r.matches.filter((_,i)=>i!==mi) }));

  const setSideTeam = (mi, side, teamId) => mutateRound(r => {
    const matches=[...r.matches];
    const n = side==="A" ? "1" : "2";
    const m = matches[mi];
    matches[mi] = { ...m, [side==="A"?"teamA":"teamB"]:teamId,
      [`player${n}a`]:"", [`hcp${n}a`]:0,
      [`player${n}b`]:m[`player${n}b`]===null?null:"", [`hcp${n}b`]:0 };
    return { ...r, matches };
  });

  const setMatchFmt = (mi, fmt) => mutateRound(r => {
    const matches=[...r.matches];
    const m={...matches[mi]};
    m.format=fmt;
    const isSingles=fmt==="Singles";
    if (isSingles){ m.player1b=null; m.hcp1b=0; m.player2b=null; m.hcp2b=0; }
    else { if(m.player1b===null)m.player1b=""; if(m.player2b===null)m.player2b=""; }
    if (fmt==="Scramble"){ m.hcp1a=0; m.hcp1b=0; m.hcp2a=0; m.hcp2b=0; }
    matches[mi]=m;
    return { ...r, matches };
  });

  const updateMatch = (mi, key, val) => mutateRound(r => {
    const matches=[...r.matches];
    if (["player1a","player1b","player2a","player2b"].includes(key)) {
      const fmt=matches[mi].format||round.format;
      const player=data.players.find(p=>p.name===val);
      const hcpKey=key.replace("player","hcp");
      matches[mi]={...matches[mi],[key]:val,[hcpKey]:fmt==="Scramble"?0:(player?.hcp||0)};
    } else {
      matches[mi]={...matches[mi],[key]:val};
    }
    return { ...r, matches };
  });

  const PSel = ({mi, field, side}) => {
    const m=round.matches[mi];
    const players=rosterOf(side==="A"?sidesOf(m).a:sidesOf(m).b);
    return (
      <select value={round.matches[mi][field]||""} onChange={e=>updateMatch(mi,field,e.target.value)}
        style={{ flex:1, padding:"6px 8px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:7, color:TEXT, fontSize:12, cursor:"pointer", minWidth:0 }}>
        <option value="">—</option>
        {players.map(p=><option key={p.name} value={p.name}>{p.name}{p.hcp<0?` (+${Math.abs(p.hcp).toFixed(1)})`:p.hcp>0?` (${Number(p.hcp).toFixed(1)})`:""}</option>)}
      </select>
    );
  };

  return (
    <div>
      {data.days.length > 1 && (
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          {data.days.map((d,i)=>(
            <button key={i} onClick={()=>switchDay(i)}
              style={{ flex:1, padding:"7px 4px", background:activeDay===i?GOLD:"none", border:`1px solid ${activeDay===i?GOLD:BORDER}`, borderRadius:8, color:activeDay===i?"#000":TEXT, fontSize:11, cursor:"pointer", fontWeight:activeDay===i?800:400, fontFamily:"monospace" }}>
              {d.label}
            </button>
          ))}
        </div>
      )}
      {day.rounds.length > 1 && (
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          {day.rounds.map((r,i)=>(
            <button key={i} onClick={()=>setActiveRound(i)}
              style={{ flex:1, padding:"6px 4px", background:ri===i?`${GOLD}33`:"none", border:`1px solid ${ri===i?GOLD:BORDER}`, borderRadius:8, color:ri===i?GOLD:MUTED, fontSize:10, cursor:"pointer", fontFamily:"monospace" }}>
              {r.courseName||`Round ${i+1}`}
            </button>
          ))}
        </div>
      )}
      {round.matches.map((m,mi)=>{
        const fmt=m.format||round.format;
        const isSingles=fmt==="Singles";
        return (
          <div key={mi} style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:12, padding:12, marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <input value={m.teeTime||""} onChange={e=>updateMatch(mi,"teeTime",e.target.value)} placeholder="Tee time"
                style={{ width:68, padding:"4px 6px", background:"none", border:`1px solid ${BORDER}`, borderRadius:6, color:TEXT, fontSize:11, outline:"none", fontFamily:"monospace" }} />
              <div style={{ display:"flex", gap:3 }}>
                {ALL_MATCH_FMTS.map(f=>(
                  <button key={f} onClick={()=>setMatchFmt(mi,f)}
                    style={{ padding:"3px 8px", background:fmt===f?GOLD:"none", border:`1px solid ${fmt===f?GOLD:BORDER}`, borderRadius:5, color:fmt===f?"#000":MUTED, fontSize:9, cursor:"pointer", fontFamily:"monospace", fontWeight:fmt===f?800:400 }}>
                    {FMT_LABELS[f]}
                  </button>
                ))}
              </div>
              <button onClick={()=>removeMatch(mi)} style={{ background:"none", border:"none", color:"#e74c3c", cursor:"pointer", fontSize:14 }}>×</button>
            </div>
            {pickTeams&&(
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
                {["A","B"].map(side=>{
                  const t=side==="A"?sidesOf(m).a:sidesOf(m).b;
                  return (
                    <div key={side} style={{ flex:1, display:"flex", alignItems:"center", gap:4, minWidth:0 }}>
                      {side==="B"&&<span style={{ fontSize:9, color:MUTED, fontFamily:"monospace", flexShrink:0 }}>vs</span>}
                      <select value={t.id} onChange={e=>setSideTeam(mi,side,e.target.value)}
                        style={{ flex:1, padding:"5px 6px", background:CARD2, border:`1px solid ${t.color}`, borderRadius:7, color:t.color, fontSize:11, fontWeight:800, cursor:"pointer", minWidth:0, fontFamily:"monospace" }}>
                        {data.teams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
              <span style={{ fontSize:9, color:sidesOf(m).a.color, fontFamily:"monospace", fontWeight:700, width:44, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{(sidesOf(m).a.name||"A").substring(0,5)}</span>
              <PSel mi={mi} field="player1a" side="A"/>
              {!isSingles&&<PSel mi={mi} field="player1b" side="A"/>}
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ fontSize:9, color:sidesOf(m).b.color, fontFamily:"monospace", fontWeight:700, width:44, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{(sidesOf(m).b.name||"B").substring(0,5)}</span>
              <PSel mi={mi} field="player2a" side="B"/>
              {!isSingles&&<PSel mi={mi} field="player2b" side="B"/>}
            </div>
          </div>
        );
      })}
      <button onClick={addMatch} style={{ width:"100%", padding:"10px", background:"none", border:`1px solid ${BORDER}`, borderRadius:10, color:MUTED, fontSize:12, cursor:"pointer", fontFamily:"monospace" }}>
        + ADD MATCH
      </button>
    </div>
  );
}

// ── Step 6: Admin setup ───────────────────────────────────────────────────────
function Step6({ data, setData }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const allNames = data.players.map(p=>p.name);
  const toggleAdmin = name => {
    setData(d => {
      const cur = d.adminPlayers||[];
      return { ...d, adminPlayers: cur.includes(name) ? cur.filter(n=>n!==name) : [...cur, name] };
    });
  };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div>
        <label style={{ fontSize:11, color:GOLD, fontFamily:"monospace", letterSpacing:1 }}>WHICH PLAYER ARE YOU?</label>
        <div style={{ fontSize:10, color:MUTED, marginTop:2, marginBottom:8 }}>You'll be auto-signed in as this player when you open the cup.</div>
        <select value={data.creatorPlayer||""} onChange={e=>setData(d=>({...d,creatorPlayer:e.target.value}))}
          style={{ width:"100%", padding:"10px 12px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:14, outline:"none", boxSizing:"border-box" }}>
          <option value="">— select yourself —</option>
          {allNames.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize:11, color:GOLD, fontFamily:"monospace", letterSpacing:1 }}>ADMIN ACCESS</label>
        <div style={{ fontSize:10, color:MUTED, marginTop:2, marginBottom:10 }}>Admins can edit scores and manage the cup. You always have admin access.</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {allNames.filter(n=>n!==data.creatorPlayer).map(name=>{
            const checked = (data.adminPlayers||[]).includes(name);
            return (
              <button key={name} onClick={()=>toggleAdmin(name)} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", background:checked?`${GOLD}18`:CARD2, border:`1px solid ${checked?GOLD:BORDER}`, borderRadius:10, cursor:"pointer", textAlign:"left" }}>
                <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${checked?GOLD:BORDER}`, background:checked?GOLD:"none", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  {checked&&<span style={{ fontSize:12, color:"#000", fontWeight:900, lineHeight:1 }}>✓</span>}
                </div>
                <span style={{ fontSize:13, color:TEXT, fontWeight:600 }}>{name}</span>
              </button>
            );
          })}
          {allNames.filter(n=>n!==data.creatorPlayer).length===0&&(
            <div style={{ fontSize:12, color:MUTED, textAlign:"center", padding:"12px 0" }}>No other players added yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Type chooser (step 0) ─────────────────────────────────────────────────────
function StepType({ onPick }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:13, color:MUTED, textAlign:"center", marginBottom:4 }}>What kind of event are you setting up?</div>

      <button onClick={() => onPick("cup")}
        style={{ display:"flex", alignItems:"center", gap:16, width:"100%", padding:"18px 16px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:14, cursor:"pointer", textAlign:"left" }}>
        <div style={{ fontSize:32, lineHeight:1, flexShrink:0 }}>🏆</div>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:TEXT, marginBottom:3 }}>Ryder Cup</div>
          <div style={{ fontSize:11, color:MUTED, lineHeight:1.4 }}>Multi-day team event with rosters, pairings, and a full scoreboard</div>
        </div>
      </button>

      <button onClick={() => onPick("match")}
        style={{ display:"flex", alignItems:"center", gap:16, width:"100%", padding:"18px 16px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:14, cursor:"pointer", textAlign:"left" }}>
        <div style={{ fontSize:32, lineHeight:1, flexShrink:0 }}>⚡</div>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:TEXT, marginBottom:3 }}>Live Match</div>
          <div style={{ fontSize:11, color:MUTED, lineHeight:1.4 }}>A single 1v1 or 2v2 match — pick players, set the course, start scoring</div>
        </div>
      </button>
    </div>
  );
}

// ── Main wizard ──────────────────────────────────────────────────────────────
export default function CreateCup({ user }) {
  const { BG, CARD, CARD2, BORDER, TEXT, MUTED } = useTheme();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [prevCourses, setPrevCourses] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const cupsSnap = await get(ref(db, `users/${user.uid}/cups`));
      if (!cupsSnap.exists()) return;
      const seen = {};
      await Promise.all(Object.keys(cupsSnap.val()).map(async cupId => {
        const daysSnap = await get(ref(db, `cups/${cupId}/days`));
        if (!daysSnap.exists()) return;
        const arr = Object.values(daysSnap.val());
        for (const day of arr) {
          for (const round of (day.rounds || [{ course: day.course }])) {
            const c = round.course;
            if (c?.name && c.par?.length === 18 && c.hcp?.length === 18 && !seen[c.name]) {
              seen[c.name] = { name: c.name, par: c.par, hcp: c.hcp };
            }
          }
        }
      }));
      const merged = { ...Object.fromEntries(BUILT_IN_COURSES.map(c => [c.name, c])), ...seen };
      setPrevCourses(Object.values(merged).sort((a, b) => a.name.localeCompare(b.name)));
    };
    fetch();
  }, [user.uid]);

  const [data, setData] = useState({
    name:"",
    teams:[
      { id:TEAM_IDS[0], name:DEFAULT_TEAM_NAMES[0], color:DEFAULT_TEAM_COLORS[0] },
      { id:TEAM_IDS[1], name:DEFAULT_TEAM_NAMES[1], color:DEFAULT_TEAM_COLORS[1] },
    ],
    inviteCode:"",
    players:[], days:[mkDay(1)],
    creatorPlayer:"", adminPlayers:[],
  });

  const STEPS = ["Cup Setup","Players","Days","Courses","Pairings","Admins"];

  const canNext = () => {
    if (step===1) return data.name.trim() && data.teams.every(t=>t.name.trim());
    // Every team needs at least one player, or it can never be given a match.
    if (step===2) return data.teams.every(t=>data.players.some(p=>p.team===t.id));
    if (step===6) return !!data.creatorPlayer;
    return true;
  };

  const handleCreate = async () => {
    setSaving(true); setError("");
    try {
      const cupId = `cup_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      const inviteCode = (data.inviteCode.trim() || Math.random().toString(36).slice(2,7)).toUpperCase().replace(/[^A-Z0-9]/g,"");

      // Build Firebase days (rounds structure, no matches embedded)
      const daysMeta = data.days.map(day => ({
        label: day.label,
        rounds: day.rounds.map(r => ({ format:r.format, course:{ name:r.courseName, par:r.par, hcp:r.hcp } })),
      }));

      // Build flat matches map with new ID scheme:
      // m${(dayIdx+1)*1000 + (roundIdx+1)*100 + matchNum}
      const allMatches = {};
      data.days.forEach((day, di) => {
        day.rounds.forEach((round, ri) => {
          round.matches.forEach((m, mi) => {
            const matchId = (di+1)*1000 + (ri+1)*100 + mi + 1;
            const { a:sideA, b:sideB } = matchTeams(data.teams, m);
            allMatches[`m${matchId}`] = {
              teeTime: m.teeTime||"",
              format: m.format||round.format,
              // Only meaningful past two teams; a two-team cup leaves it implicit.
              ...(data.teams.length>2 ? { teamA:sideA.id, teamB:sideB.id } : {}),
              player1a: m.player1a||"", hcp1a: m.hcp1a||0,
              player1b: m.player1b||null, hcp1b: m.hcp1b||0,
              player2a: m.player2a||"", hcp2a: m.hcp2a||0,
              player2b: m.player2b||null, hcp2b: m.hcp2b||0,
              companionId: null,
            };
          });
        });
      });

      const players = {};
      data.players.forEach(p=>{ players[p.name.toLowerCase().replace(/\s+/g,"_")]={name:p.name,team:p.team,hcp:p.hcp}; });

      const adminPlayers = [data.creatorPlayer, ...(data.adminPlayers||[])].filter(Boolean);
      const meta = {
        name:data.name,
        // Writes meta.teams plus the legacy teamAName/teamBName mirror.
        ...teamsToMeta(data.teams),
        createdBy:user.uid, createdAt:Date.now(), inviteCode, status:"active",
        adminPlayers,
      };

      await set(ref(db,`cups/${cupId}/meta`), meta);
      await set(ref(db,`cups/${cupId}/players`), players);
      for (let i=0; i<daysMeta.length; i++) {
        await set(ref(db,`cups/${cupId}/days/${i}`), daysMeta[i]);
      }
      if (Object.keys(allMatches).length > 0) await set(ref(db,`cups/${cupId}/matches`), allMatches);
      await set(ref(db,`inviteCodes/${inviteCode}`), cupId);
      await set(ref(db,`users/${user.uid}/cups/${cupId}`), { name:data.name, teams:teamsToMeta(data.teams).teams, teamAName:meta.teamAName, teamBName:meta.teamBName, createdAt:Date.now() });

      // Auto-sign the creator in as their chosen player
      if (data.creatorPlayer) {
        try { localStorage.setItem(`jr_player_${cupId}`, data.creatorPlayer); } catch {}
      }

      nav(`/cup/${cupId}`);
    } catch(e) {
      console.error(e); setError("Failed to create cup. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", color:TEXT }}>
      <LiveBackground/>
      <div style={{ background:"rgba(8,20,43,0.85)", backdropFilter:"blur(8px)", borderBottom:`1px solid ${BORDER}`, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>step>1?setStep(s=>s-1):nav("/")}
          style={{ background:"none", border:`1px solid ${BORDER}`, borderRadius:8, padding:"5px 10px", color:MUTED, fontSize:11, cursor:"pointer" }}>
          ← Back
        </button>
        <div style={{ fontSize:14, fontWeight:800, color:TEXT }}>{STEPS[step-1]}</div>
        <div style={{ marginLeft:"auto", display:"flex", gap:5 }}>
          {STEPS.map((_,i)=>(
            <div key={i} style={{ width:i+1<step?18:i+1===step?18:8, height:6, borderRadius:3, background:i+1<step?"#4caf50":i+1===step?GOLD:BORDER, transition:"all 0.2s" }}/>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:520, margin:"0 auto", padding:"16px 16px 32px" }}>
        <div style={{ background:"rgba(8,20,43,0.8)", backdropFilter:"blur(10px)", border:`1px solid ${BORDER}`, borderRadius:16, padding:"20px" }}>
          {step===1&&<Step1 data={data} setData={setData}/>}
          {step===2&&<Step2 data={data} setData={setData}/>}
          {step===3&&<Step3 data={data} setData={setData}/>}
          {step===4&&<Step4 data={data} setData={setData} prevCourses={prevCourses}/>}
          {step===5&&<Step5 data={data} setData={setData}/>}
          {step===6&&<Step6 data={data} setData={setData}/>}
        </div>

        {error&&<div style={{ fontSize:12, color:"#e74c3c", marginTop:12, textAlign:"center" }}>{error}</div>}

        <div style={{ marginTop:14 }}>
          {step<STEPS.length?(
            <button onClick={()=>setStep(s=>s+1)} disabled={!canNext()}
              style={{ width:"100%", padding:"15px", background:canNext()?`linear-gradient(135deg,${GOLD},${GOLD}88)`:BORDER, border:"none", borderRadius:14, color:canNext()?"#000":MUTED, fontWeight:900, fontSize:15, cursor:canNext()?"pointer":"not-allowed", letterSpacing:1, fontFamily:"monospace" }}>
              NEXT →
            </button>
          ):(
            <button onClick={handleCreate} disabled={saving}
              style={{ width:"100%", padding:"15px", background:`linear-gradient(135deg,${GOLD},${GOLD}88)`, border:"none", borderRadius:14, color:"#000", fontWeight:900, fontSize:15, cursor:"pointer", letterSpacing:1, fontFamily:"monospace" }}>
              {saving?"CREATING...":"CREATE CUP ⛳"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
