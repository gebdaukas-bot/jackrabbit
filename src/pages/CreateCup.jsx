import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { db, ref, set } from "../firebase";
import { GOLD } from "../utils/scoring";

const FORMATS   = ["2v2 Best Ball", "Singles"];
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
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <label style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1 }}>CUP NAME</label>
        {inp("name", 'e.g. "The Ryder Cup 2026"')}
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:"#C8102E", fontFamily:"monospace", letterSpacing:1 }}>TEAM A NAME</label>
          {inp("teamAName", "Team A")}
        </div>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:"#4A90D9", fontFamily:"monospace", letterSpacing:1 }}>TEAM B NAME</label>
          {inp("teamBName", "Team B")}
        </div>
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1 }}>TEAM A COLOR</label>
          <input type="color" value={data.teamAColor} onChange={e => setData(d => ({ ...d, teamAColor:e.target.value }))}
            style={{ width:"100%", height:42, padding:2, background:"none", border:`1px solid ${BORDER}`, borderRadius:8, cursor:"pointer", marginTop:6 }} />
        </div>
        <div style={{ flex:1 }}>
          <label style={{ fontSize:11, color:MUTED, fontFamily:"monospace", letterSpacing:1 }}>TEAM B COLOR</label>
          <input type="color" value={data.teamBColor} onChange={e => setData(d => ({ ...d, teamBColor:e.target.value }))}
            style={{ width:"100%", height:42, padding:2, background:"none", border:`1px solid ${BORDER}`, borderRadius:8, cursor:"pointer", marginTop:6 }} />
        </div>
      </div>
      <div>
        <label style={{ fontSize:11, color:GOLD, fontFamily:"monospace", letterSpacing:1 }}>INVITE CODE</label>
        <div style={{ fontSize:10, color:MUTED, marginTop:2, marginBottom:4 }}>Players use this to join the cup. Letters and numbers only.</div>
        {inp("inviteCode", "e.g. RYDERC26", { fontFamily:"monospace", letterSpacing:2, textTransform:"uppercase" })}
      </div>
    </div>
  );
}

// ── Step 2: Players ──────────────────────────────────────────────────────────
function Step2({ data, setData }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [newName, setNewName] = useState("");
  const [newTeam, setNewTeam] = useState("A");
  const [newHcp, setNewHcp] = useState(0);
  const [pasteTeam, setPasteTeam] = useState("A");
  const [pasteText, setPasteText] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  const addPlayer = () => {
    if (!newName.trim()) return;
    setData(d => ({ ...d, players:[...d.players, { name:newName.trim(), team:newTeam, hcp:newHcp }] }));
    setNewName(""); setNewHcp(0);
  };
  const removePlayer = i => setData(d => ({ ...d, players:d.players.filter((_,idx)=>idx!==i) }));
  const adjustHcp = (i, delta) => setData(d => {
    const players=[...d.players];
    players[i]={...players[i], hcp:Math.min(36,Math.max(-10,players[i].hcp+delta))};
    return {...d,players};
  });

  const pasteList = () => {
    const names = pasteText.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
    if (!names.length) return;
    setData(d => ({ ...d, players:[...d.players, ...names.map(name=>({ name, team:pasteTeam, hcp:0 }))] }));
    setPasteText(""); setShowPaste(false);
  };

  return (
    <div>
      {/* Paste list toggle */}
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:8 }}>
        <button onClick={()=>setShowPaste(s=>!s)} style={{ padding:"4px 10px", background:"none", border:`1px solid ${BORDER}`, borderRadius:6, color:MUTED, fontSize:11, cursor:"pointer", fontFamily:"monospace" }}>
          {showPaste?"▲ hide paste":"📋 paste list"}
        </button>
      </div>

      {/* Paste panel */}
      {showPaste&&(
        <div style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:10, padding:12, marginBottom:14 }}>
          <div style={{ fontSize:10, color:MUTED, marginBottom:8 }}>Paste names (one per line or comma-separated). All get HCP 0 — edit individually after.</div>
          <div style={{ display:"flex", gap:8, marginBottom:8 }}>
            <select value={pasteTeam} onChange={e=>setPasteTeam(e.target.value)}
              style={{ padding:"6px 8px", background:"none", border:`1px solid ${BORDER}`, borderRadius:6, color:TEXT, fontSize:12, cursor:"pointer" }}>
              <option value="A">{data.teamAName||"Team A"}</option>
              <option value="B">{data.teamBName||"Team B"}</option>
            </select>
            <button onClick={pasteList} style={{ padding:"6px 14px", background:GOLD, border:"none", borderRadius:6, color:"#000", fontWeight:700, fontSize:12, cursor:"pointer" }}>Add All</button>
          </div>
          <textarea value={pasteText} onChange={e=>setPasteText(e.target.value)} placeholder={"John Smith\nJane Doe\nBob Jones"} rows={5}
            style={{ width:"100%", padding:"8px 10px", background:"none", border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit" }} />
        </div>
      )}

      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Player name"
          onKeyDown={e=>e.key==="Enter"&&addPlayer()}
          style={{ flex:"1 1 120px", padding:"8px 10px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:13, outline:"none" }} />
        <select value={newTeam} onChange={e=>setNewTeam(e.target.value)}
          style={{ padding:"8px 10px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:8, color:TEXT, fontSize:13, cursor:"pointer" }}>
          <option value="A">{data.teamAName||"Team A"}</option>
          <option value="B">{data.teamBName||"Team B"}</option>
        </select>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ fontSize:11, color:MUTED, fontFamily:"monospace" }}>HCP</span>
          <button onClick={()=>setNewHcp(h=>Math.max(-10,h-1))} style={{ width:28, height:32, background:CARD2, border:`1px solid ${BORDER}`, borderRadius:"6px 0 0 6px", color:TEXT, cursor:"pointer", fontSize:14 }}>−</button>
          <div style={{ width:40, height:32, background:CARD2, border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:GOLD, fontFamily:"monospace" }}>{newHcp>0?`+${newHcp}`:newHcp}</div>
          <button onClick={()=>setNewHcp(h=>Math.min(36,h+1))} style={{ width:28, height:32, background:CARD2, border:`1px solid ${BORDER}`, borderRadius:"0 6px 6px 0", color:TEXT, cursor:"pointer", fontSize:14 }}>+</button>
        </div>
        <button onClick={addPlayer} style={{ padding:"8px 14px", background:GOLD, border:"none", borderRadius:8, color:"#000", fontWeight:700, fontSize:13, cursor:"pointer" }}>Add</button>
      </div>
      {["A","B"].map(team=>{
        const players = data.players.filter(p=>p.team===team);
        if (!players.length) return null;
        return (
          <div key={team} style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:team==="A"?data.teamAColor:data.teamBColor, fontFamily:"monospace", letterSpacing:1, marginBottom:6, fontWeight:700 }}>
              {team==="A"?data.teamAName:data.teamBName}
            </div>
            {players.map((p,ri)=>{
              const gi = data.players.findIndex(x=>x===p);
              return (
                <div key={ri} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", background:CARD2, borderRadius:8, marginBottom:4 }}>
                  <span style={{ fontSize:13, color:TEXT }}>{p.name}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:9, color:MUTED, fontFamily:"monospace" }}>HCP</span>
                    <button onClick={()=>adjustHcp(gi,-1)} style={{ width:24, height:26, background:"none", border:`1px solid ${BORDER}`, borderRadius:"4px 0 0 4px", color:MUTED, cursor:"pointer", fontSize:13, lineHeight:1 }}>−</button>
                    <div style={{ width:34, height:26, background:"none", border:`1px solid ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:GOLD, fontFamily:"monospace" }}>{p.hcp>0?`+${p.hcp}`:p.hcp}</div>
                    <button onClick={()=>adjustHcp(gi,1)} style={{ width:24, height:26, background:"none", border:`1px solid ${BORDER}`, borderRadius:"0 4px 4px 0", color:MUTED, cursor:"pointer", fontSize:13, lineHeight:1 }}>+</button>
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
        <div style={{ fontSize:12, color:MUTED, marginBottom:10 }}>How many days is the tournament?</div>
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
function Step4({ data, setData }) {
  const { CARD2, BORDER, TEXT, MUTED, MUTED2 } = useTheme();
  const [activeDay, setActiveDay] = useState(0);
  const [activeRound, setActiveRound] = useState(0);

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

      <div style={{ fontSize:12, color:MUTED, marginBottom:12 }}>
        <strong style={{ color:TEXT }}>{round.courseName||`${day.label} course`}</strong> — par and handicap index for each hole
      </div>

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
function Step5({ data, setData }) {
  const { CARD2, BORDER, TEXT, MUTED, MUTED2 } = useTheme();
  const [activeDay, setActiveDay] = useState(0);
  const [activeRound, setActiveRound] = useState(0);

  const switchDay = (i) => { setActiveDay(i); setActiveRound(0); };

  const day = data.days[activeDay];
  const ri = Math.min(activeRound, day.rounds.length-1);
  const round = day.rounds[ri];
  const isSingles = round.format === "Singles";
  const teamA = data.players.filter(p=>p.team==="A");
  const teamB = data.players.filter(p=>p.team==="B");

  const mutateRound = (fn) => setData(d => {
    const days=[...d.days];
    const rounds=[...days[activeDay].rounds];
    rounds[ri]=fn(rounds[ri]);
    days[activeDay]={...days[activeDay],rounds};
    return {...d,days};
  });

  const addMatch = () => mutateRound(r => {
    const empty = isSingles
      ? { teeTime:"", player1a:"", hcp1a:0, player1b:null, hcp1b:0, player2a:"", hcp2a:0, player2b:null, hcp2b:0 }
      : { teeTime:"", player1a:"", hcp1a:0, player1b:"", hcp1b:0, player2a:"", hcp2a:0, player2b:"", hcp2b:0 };
    return { ...r, matches:[...r.matches, empty] };
  });

  const removeMatch = (mi) => mutateRound(r => ({ ...r, matches:r.matches.filter((_,i)=>i!==mi) }));

  const updateMatch = (mi, key, val) => mutateRound(r => {
    const matches=[...r.matches];
    if (["player1a","player1b","player2a","player2b"].includes(key)) {
      const player = data.players.find(p=>p.name===val);
      const hcpKey = key.replace("player","hcp");
      matches[mi]={...matches[mi],[key]:val,[hcpKey]:player?player.hcp:0};
    } else {
      matches[mi]={...matches[mi],[key]:val};
    }
    return { ...r, matches };
  });

  const playerSelect = (mi, field, team) => {
    const players = team==="A"?teamA:teamB;
    return (
      <select value={round.matches[mi][field]||""} onChange={e=>updateMatch(mi,field,e.target.value)}
        style={{ flex:1, padding:"6px 8px", background:CARD2, border:`1px solid ${BORDER}`, borderRadius:7, color:TEXT, fontSize:12, cursor:"pointer", minWidth:0 }}>
        <option value="">—</option>
        {players.map(p=><option key={p.name} value={p.name}>{p.name} {p.hcp>0?`(+${p.hcp})`:p.hcp<0?`(${p.hcp})`:""}</option>)}
      </select>
    );
  };

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

      {/* Round tabs */}
      {day.rounds.length > 1 && (
        <div style={{ display:"flex", gap:6, marginBottom:12 }}>
          {day.rounds.map((r,i)=>(
            <button key={i} onClick={()=>setActiveRound(i)}
              style={{ flex:1, padding:"6px 4px", background:ri===i?`${GOLD}33`:"none", border:`1px solid ${ri===i?GOLD:BORDER}`, borderRadius:8, color:ri===i?GOLD:MUTED, fontSize:10, cursor:"pointer", fontFamily:"monospace" }}>
              {r.format} {r.courseName?`· ${r.courseName}`:""}
            </button>
          ))}
        </div>
      )}

      <div style={{ fontSize:11, color:MUTED, marginBottom:12, fontFamily:"monospace" }}>
        {day.label} · {round.format.toUpperCase()} · {round.matches.length} match{round.matches.length!==1?"es":""}
      </div>

      {round.matches.map((m,mi)=>(
        <div key={mi} style={{ background:CARD2, border:`1px solid ${BORDER}`, borderRadius:12, padding:12, marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:10, color:MUTED2, fontFamily:"monospace" }}>MATCH {mi+1}</span>
              <input value={m.teeTime||""} onChange={e=>updateMatch(mi,"teeTime",e.target.value)} placeholder="Tee time"
                style={{ width:70, padding:"4px 6px", background:"none", border:`1px solid ${BORDER}`, borderRadius:6, color:TEXT, fontSize:11, outline:"none", fontFamily:"monospace" }} />
            </div>
            <button onClick={()=>removeMatch(mi)} style={{ background:"none", border:"none", color:"#e74c3c", cursor:"pointer", fontSize:14 }}>×</button>
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
            <span style={{ fontSize:9, color:data.teamAColor, fontFamily:"monospace", fontWeight:700, width:50, flexShrink:0 }}>{(data.teamAName||"TEAM A").substring(0,6)}</span>
            {playerSelect(mi,"player1a","A")}
            {!isSingles&&playerSelect(mi,"player1b","A")}
          </div>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <span style={{ fontSize:9, color:data.teamBColor, fontFamily:"monospace", fontWeight:700, width:50, flexShrink:0 }}>{(data.teamBName||"TEAM B").substring(0,6)}</span>
            {playerSelect(mi,"player2a","B")}
            {!isSingles&&playerSelect(mi,"player2b","B")}
          </div>
        </div>
      ))}
      <button onClick={addMatch} style={{ width:"100%", padding:"10px", background:"none", border:`1px solid ${BORDER}`, borderRadius:10, color:MUTED, fontSize:12, cursor:"pointer", fontFamily:"monospace" }}>
        + ADD MATCH
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

  const [data, setData] = useState({
    name:"", teamAName:"Team A", teamBName:"Team B",
    teamAColor:"#C8102E", teamBColor:"#003087",
    inviteCode:"",
    players:[], days:[mkDay(1)],
  });

  const STEPS = ["Cup Setup","Players","Days","Courses","Pairings"];

  const canNext = () => {
    if (step===1) return data.name.trim() && data.teamAName.trim() && data.teamBName.trim() && data.inviteCode.trim().length >= 4;
    if (step===2) return data.players.filter(p=>p.team==="A").length>0 && data.players.filter(p=>p.team==="B").length>0;
    return true;
  };

  const handleCreate = async () => {
    setSaving(true); setError("");
    try {
      const cupId = `cup_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      const inviteCode = data.inviteCode.trim().toUpperCase().replace(/[^A-Z0-9]/g,"");

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
            allMatches[`m${matchId}`] = {
              teeTime: m.teeTime||"",
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

      const meta = {
        name:data.name, teamAName:data.teamAName, teamBName:data.teamBName,
        teamAColor:data.teamAColor, teamBColor:data.teamBColor,
        createdBy:user.uid, createdAt:Date.now(), inviteCode, status:"active",
      };

      await set(ref(db,`cups/${cupId}/meta`), meta);
      await set(ref(db,`cups/${cupId}/players`), players);
      for (let i=0; i<daysMeta.length; i++) {
        await set(ref(db,`cups/${cupId}/days/${i}`), daysMeta[i]);
      }
      if (Object.keys(allMatches).length > 0) await set(ref(db,`cups/${cupId}/matches`), allMatches);
      await set(ref(db,`inviteCodes/${inviteCode}`), cupId);
      await set(ref(db,`users/${user.uid}/cups/${cupId}`), { name:data.name, teamAName:data.teamAName, teamBName:data.teamBName, createdAt:Date.now() });

      nav(`/cup/${cupId}`);
    } catch(e) {
      console.error(e); setError("Failed to create cup. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:BG, color:TEXT }}>
      <div style={{ background:CARD, borderBottom:`1px solid ${BORDER}`, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={()=>step>1?setStep(s=>s-1):nav("/")}
          style={{ background:"none", border:`1px solid ${BORDER}`, borderRadius:8, padding:"5px 10px", color:MUTED, fontSize:11, cursor:"pointer" }}>
          ← Back
        </button>
        <div style={{ fontSize:14, fontWeight:800, color:TEXT }}>Create Cup</div>
        <div style={{ marginLeft:"auto", fontSize:11, color:MUTED, fontFamily:"monospace" }}>STEP {step}/{STEPS.length}</div>
      </div>

      <div style={{ display:"flex", background:CARD, borderBottom:`1px solid ${BORDER}` }}>
        {STEPS.map((s,i)=>(
          <div key={i} style={{ flex:1, padding:"6px 2px", textAlign:"center", fontSize:9, fontFamily:"monospace", letterSpacing:0.5, color:i+1===step?GOLD:i+1<step?"#4caf50":MUTED, borderBottom:i+1===step?`2px solid ${GOLD}`:"2px solid transparent" }}>
            {i+1<step?"✓":i+1}
          </div>
        ))}
      </div>

      <div style={{ maxWidth:520, margin:"0 auto", padding:"20px 16px" }}>
        <div style={{ fontSize:16, fontWeight:800, color:TEXT, marginBottom:4 }}>{STEPS[step-1]}</div>
        <div style={{ fontSize:11, color:MUTED, marginBottom:20, fontFamily:"monospace" }}>
          {step===1&&"Name your cup, set up teams, and choose an invite code."}
          {step===2&&"Add all players with their team and handicap. Use negative for plus-handicappers."}
          {step===3&&"How many days? Each day can have up to 2 rounds with different formats and courses."}
          {step===4&&"Enter par and handicap index for each hole."}
          {step===5&&"Set matchups. You can change these later from the cup."}
        </div>

        <div style={{ background:CARD, border:`1px solid ${BORDER}`, borderRadius:16, padding:"20px" }}>
          {step===1&&<Step1 data={data} setData={setData}/>}
          {step===2&&<Step2 data={data} setData={setData}/>}
          {step===3&&<Step3 data={data} setData={setData}/>}
          {step===4&&<Step4 data={data} setData={setData}/>}
          {step===5&&<Step5 data={data} setData={setData}/>}
        </div>

        {error&&<div style={{ fontSize:12, color:"#e74c3c", marginTop:12, textAlign:"center" }}>{error}</div>}

        <div style={{ marginTop:16 }}>
          {step<STEPS.length?(
            <button onClick={()=>setStep(s=>s+1)} disabled={!canNext()}
              style={{ width:"100%", padding:"15px", background:canNext()?`linear-gradient(135deg,${GOLD},${GOLD}88)`:CARD2, border:"none", borderRadius:14, color:canNext()?"#000":MUTED, fontWeight:900, fontSize:15, cursor:canNext()?"pointer":"not-allowed", letterSpacing:1, fontFamily:"monospace" }}>
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
