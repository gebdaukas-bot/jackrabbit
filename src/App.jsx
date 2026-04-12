import { useState, useEffect, useRef } from "react";
import { db, ref, onValue, set } from "./firebase.js";
import confetti from "canvas-confetti";

// ── Theme ─────────────────────────────────────────────────────────────────────
const _DARK  = { bg:"#040d1c", card:"#08142b", card2:"#0b1a35", border:"#0e2448", text:"#ccd", muted:"#446", muted2:"#668" };
const _LIGHT = { bg:"#f4f6f9", card:"#ffffff", card2:"#eef1f7", border:"#d8e0ed", text:"#1a2a44", muted:"#7a8fa8", muted2:"#5a6e82" };
const _initTheme = (() => { try { return localStorage.getItem("jr_theme")||"dark"; } catch { return "dark"; } })();
const _T = _initTheme === "light" ? _LIGHT : _DARK;
let BG     = _T.bg;
let CARD   = _T.card;
let CARD2  = _T.card2;
let BORDER = _T.border;
let TEXT   = _T.text;
let MUTED  = _T.muted;
let MUTED2 = _T.muted2;

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAM_A       = "GABBY'S INTERNS";
const TEAM_A_SHORT = "INTERNS";
const TEAM_B       = "TIGER'S DDs";
const TEAM_B_SHORT = "TIGERS";
const TEAM_A_COLOR = "#C8102E";
const TEAM_B_COLOR = "#003087";
const TEAM_B_DISP  = "#4A90D9";
const GOLD         = "#C4A44A";

const COURSES = {
  day1: {
    name: "The Links Course",
    par: [5,4,4,3,5,4,4,3,4, 4,4,3,4,5,4,3,4,3],
    hcp: [11,13,5,17,7,3,9,15,1, 12,10,16,2,14,8,18,6,4],
  },
  day2: {
    name: "Wild Dunes — Harbor Course",
    par: [5,4,3,4,3,4,3,5,5, 4,3,4,3,5,4,3,4,4],
    hcp: [5,3,17,1,13,11,15,7,9, 10,18,6,14,12,8,16,2,4],
  },
  day3: {
    name: "Charleston National",
    par: [4,3,4,4,5,4,3,4,5, 5,4,5,4,4,4,3,4,4],
    hcp: [3,17,5,11,13,15,9,1,7, 10,2,12,4,14,8,18,6,16],
  },
};

const mkScores = () => Array(18).fill(null);

const ALL_PLAYERS = [
  { name:"Gabe",     team:"A" },
  { name:"Naman",    team:"A" },
  { name:"Logan",    team:"A" },
  { name:"Tyler T.", team:"A" },
  { name:"Colin",    team:"A" },
  { name:"Ian",      team:"A" },
  { name:"Hunter",   team:"A" },
  { name:"Tim",      team:"A" },
  { name:"Clark",    team:"A" },
  { name:"Sushil",   team:"A" },
  { name:"Henry",    team:"B" },
  { name:"Spencer",  team:"B" },
  { name:"Geb",      team:"B" },
  { name:"Tony",     team:"B" },
  { name:"Sam",      team:"B" },
  { name:"Ryan",     team:"B" },
  { name:"Jake",     team:"B" },
  { name:"Destin",   team:"B" },
  { name:"Russell",  team:"B" },
  { name:"Tyler S.", team:"B" },
  { name:"Kimball",  team:"B" },
];

const initialDays = [
  {
    day:1, courseKey:"day1", label:"Friday — Fourballs", format:"Fourballs",
    matches:[
      {id:101,teeTime:"11:10",player1a:"Gabe",  hcp1a:0,player1b:"Naman",   hcp1b:0,player2a:"Henry",  hcp2a:0,player2b:"Spencer", hcp2b:0,scores:mkScores(),disputes:[]},
      {id:102,teeTime:"11:15",player1a:"Logan", hcp1a:0,player1b:"Tyler T.",hcp1b:0,player2a:"Geb",    hcp2a:0,player2b:"Tony",    hcp2b:0,scores:mkScores(),disputes:[]},
      {id:103,teeTime:"11:20",player1a:"Colin", hcp1a:0,player1b:"Ian",     hcp1b:0,player2a:"Sam",    hcp2a:0,player2b:"Ryan",    hcp2b:0,scores:mkScores(),disputes:[]},
      {id:104,teeTime:"11:30",player1a:"Hunter",hcp1a:0,player1b:"Tim",     hcp1b:0,player2a:"Jake",   hcp2a:0,player2b:"Destin",  hcp2b:0,scores:mkScores(),disputes:[]},
      {id:105,teeTime:"11:40",player1a:"Clark", hcp1a:0,player1b:"Sushil",  hcp1b:0,player2a:"Russell",hcp2a:0,player2b:"Tyler S.",hcp2b:0,scores:mkScores(),disputes:[]},
    ]
  },
  {
    day:2, courseKey:"day2", label:"Saturday — Fourballs", format:"Fourballs",
    matches:[
      {id:201,teeTime:"11:10",player1a:"Ian",     hcp1a:0,player1b:"Hunter", hcp1b:0,player2a:"Henry",   hcp2a:0,player2b:"Russell", hcp2b:0,scores:mkScores(),disputes:[]},
      {id:202,teeTime:"11:20",player1a:"Gabe",    hcp1a:0,player1b:"Tim",    hcp1b:0,player2a:"Geb",     hcp2a:0,player2b:"Ryan",    hcp2b:0,scores:mkScores(),disputes:[]},
      {id:203,teeTime:"11:30",player1a:"Naman",   hcp1a:0,player1b:"Sushil", hcp1b:0,player2a:"Tony",    hcp2a:0,player2b:"Jake",    hcp2b:0,scores:mkScores(),disputes:[]},
      {id:204,teeTime:"11:40",player1a:"Logan",   hcp1a:0,player1b:"Clark",  hcp1b:0,player2a:"Sam",     hcp2a:0,player2b:"Destin",  hcp2b:0,scores:mkScores(),disputes:[]},
      {id:205,teeTime:"11:50",player1a:"Tyler T.",hcp1a:0,player1b:"Colin",  hcp1b:0,player2a:"Tyler S.",hcp2a:0,player2b:"Spencer", hcp2b:0,scores:mkScores(),disputes:[]},
    ]
  },
  {
    day:3, courseKey:"day3", label:"Sunday — Mixed", format:"Mixed",
    matches:[
      {id:301,teeTime:"10:40",player1a:"Clark",   hcp1a:8, player1b:null,      hcp1b:0,player2a:"Tyler S.",hcp2a:0, player2b:null,      hcp2b:0,scores:mkScores(),disputes:[]},
      {id:302,teeTime:"10:48",player1a:"Sushil",  hcp1a:0, player1b:"Tim",     hcp1b:2,player2a:"Destin",  hcp2a:5, player2b:"Jake",    hcp2b:0,scores:mkScores(),disputes:[]},
      {id:303,teeTime:"10:56",player1a:"Logan",   hcp1a:0, player1b:"Gabe",    hcp1b:0,player2a:"Geb",     hcp2a:4, player2b:"Spencer", hcp2b:0,scores:mkScores(),disputes:[]},
      {id:304,teeTime:"11:04",player1a:"Tyler T.",hcp1a:0, player1b:"Naman",   hcp1b:2,player2a:"Sam",     hcp2a:3, player2b:"Henry",   hcp2b:0,scores:mkScores(),disputes:[]},
      {id:305,teeTime:"11:12",player1a:"Ian",     hcp1a:0, player1b:"Hunter",  hcp1b:0,player2a:"Tony",    hcp2a:1, player2b:"Kimball", hcp2b:2,scores:mkScores(),disputes:[]},
    ]
  }
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function findPlayerMatch(days, playerName, preferDay = null) {
  // Check preferred day first (today), then fall back to any day
  const order = preferDay !== null
    ? [preferDay, ...days.map((_,i)=>i).filter(i=>i!==preferDay)]
    : days.map((_,i)=>i);
  for (const di of order) {
    for (const m of days[di].matches) {
      if ([m.player1a, m.player1b, m.player2a, m.player2b].includes(playerName))
        return { dayIdx: di, matchId: m.id };
    }
  }
  return null;
}

function netScore(gross, playerHcp, holeHcpIndex) {
  return gross - (holeHcpIndex <= playerHcp ? 1 : 0)
               - (playerHcp > 18 && holeHcpIndex <= playerHcp - 18 ? 1 : 0);
}

function computeMatchStatus(scores) {
  let lead = 0, holesPlayed = 0;
  let closingLead = null, closingHolesPlayed = null;
  let gapHole = null; // index of first missing hole when later holes are present
  for (let i = 0; i < 18; i++) {
    const s = scores[i];
    if (s === null || s === undefined) {
      // Check if any later hole has a score — that would be a gap
      for (let j = i + 1; j < 18; j++) {
        if (scores[j] !== null && scores[j] !== undefined) { gapHole = i; break; }
      }
      break;
    }
    holesPlayed++;
    if (s === "A") lead++; else if (s === "B") lead--;
    // Capture the decisive hole the first time the lead becomes unassailable
    if (closingLead === null && Math.abs(lead) > (18 - holesPlayed)) {
      closingLead = lead;
      closingHolesPlayed = holesPlayed;
    }
  }
  const rem = 18 - holesPlayed;
  const abs = Math.abs(lead);
  const leader = lead > 0 ? "A" : lead < 0 ? "B" : null;
  const lName  = leader === "A" ? TEAM_A_SHORT : leader === "B" ? TEAM_B_SHORT : null;
  if (holesPlayed === 0 && gapHole === null) return {shortLabel:"—",longLabel:"Not Started",sublabel:"",state:"pending",leader:null,up:0,holesPlayed,lead};
  // Gap in recorded scores — flag it so the UI can prompt to fill the missing hole
  if (gapHole !== null) return {shortLabel:"⚠",longLabel:"Missing Score",sublabel:`Hole ${gapHole+1} not recorded`,state:"gap",leader,up:abs,holesPlayed,lead};
  // Match won by domination — use the score at the deciding hole, not any subsequent holes
  if (closingLead !== null) {
    const cAbs = Math.abs(closingLead);
    const cRem = 18 - closingHolesPlayed;
    const cLeader = closingLead > 0 ? "A" : "B";
    const cLName  = cLeader === "A" ? TEAM_A_SHORT : TEAM_B_SHORT;
    return {shortLabel:`${cAbs}&${cRem}`,longLabel:`${cLName} WIN`,sublabel:`${cAbs}&${cRem}`,state:"complete",leader:cLeader,up:cAbs,holesPlayed,lead};
  }
  if (holesPlayed === 18){
    if (!leader) return  {shortLabel:"AS",longLabel:"HALVED",sublabel:"½ pt each",state:"halved",leader:null,up:0,holesPlayed,lead:0};
    return               {shortLabel:"WIN",longLabel:`${lName} WIN`,sublabel:"1 point",state:"complete",leader,up:0,holesPlayed,lead};
  }
  if (!leader) return    {shortLabel:"AS",longLabel:"ALL SQUARE",sublabel:`Thru ${holesPlayed}`,state:"live",leader:null,up:0,holesPlayed,lead:0};
  return                 {shortLabel:`${abs}UP`,longLabel:lName,sublabel:`${abs} UP • Thru ${holesPlayed}`,state:"live",leader,up:abs,holesPlayed,lead};
}

function computeAllPoints(days) {
  let aA=0,aB=0,pA=0,pB=0;
  for (const day of days) for (const m of day.matches) {
    const s = computeMatchStatus(m.scores);
    if (s.state==="complete")    { s.leader==="A"?(aA++,pA++):(aB++,pB++); }
    else if (s.state==="halved") { aA+=.5;aB+=.5;pA+=.5;pB+=.5; }
    else if (s.state==="live"||s.state==="gap") { s.leader==="A"?pA++:s.leader==="B"?pB++:(pA+=.5,pB+=.5); }
  }
  return {actualA:aA,actualB:aB,projA:pA,projB:pB};
}

function computeDayPoints(day) {
  let a=0,b=0,pA=0,pB=0;
  for (const m of day.matches) {
    const s = computeMatchStatus(m.scores);
    if (s.state==="complete")    { s.leader==="A"?(a++,pA++):(b++,pB++); }
    else if (s.state==="halved") { a+=.5;b+=.5;pA+=.5;pB+=.5; }
    else if (s.state==="live"||s.state==="gap") { s.leader==="A"?pA++:s.leader==="B"?pB++:(pA+=.5,pB+=.5); }
  }
  return {a,b,pA,pB};
}

function fmt(n){ return n%1===0?`${n}`:`${n.toFixed(1)}`; }

const CBS_LOGO = <img src="data:image/png;base64,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" width="22" height="22" style={{objectFit:"contain"}} alt="CBS 4"/>;
const CBS_LOGO_LG = <img src="data:image/png;base64,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" width="48" height="48" style={{objectFit:"contain"}} alt="CBS 4"/>;

// ── Player Select ─────────────────────────────────────────────────────────────
function PlayerSelect({ onSelect }) {
  const teamA = ALL_PLAYERS.filter(p=>p.team==="A");
  const teamB = ALL_PLAYERS.filter(p=>p.team==="B");
  const [pendingName, setPendingName] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);

  const handleSelect = (name) => {
    if (name === "Geb") { setPendingName(name); setPin(""); setPinError(false); }
    else onSelect(name);
  };

  const handlePin = (digit) => {
    const next = pin + digit;
    setPin(next);
    setPinError(false);
    if (next.length === 4) {
      if (next === "3241") { onSelect(pendingName); }
      else { setPinError(true); setPin(""); }
    }
  };

  return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",fontFamily:"'Arial Narrow','Arial',sans-serif"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{background:`linear-gradient(180deg,${CARD} 0%,${BG} 100%)`,padding:"30px 20px 20px",textAlign:"center",borderBottom:`1px solid ${BORDER}`}}>
        <div style={{display:"flex",alignItems:"center",gap:12,justifyContent:"center",marginBottom:4}}>
          {CBS_LOGO_LG}
          <div style={{fontSize:26,fontWeight:900,letterSpacing:2,color:"#fff"}}>CBS RYDER CUP 2026</div>
        </div>
        <div style={{fontSize:13,color:"#446",marginTop:10}}>Select your name to get started</div>
      </div>

      {/* PIN modal for Geb */}
      {pendingName && (
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:24,width:"100%",maxWidth:300,textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:900,color:GOLD,marginBottom:4,letterSpacing:1,fontFamily:"monospace"}}>ADMIN ACCESS</div>
            <div style={{fontSize:11,color:"#446",marginBottom:20}}>Enter PIN for {pendingName}</div>
            {/* PIN dots */}
            <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:20}}>
              {Array.from({length:4},(_,i)=>(
                <div key={i} style={{width:14,height:14,borderRadius:"50%",background:i<pin.length?GOLD:BORDER}}/>
              ))}
            </div>
            {pinError && <div style={{fontSize:11,color:"#e55",marginBottom:12,fontFamily:"monospace"}}>Incorrect PIN</div>}
            {/* Numpad */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
              {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((d,i)=>(
                <button key={i} onClick={()=>d==="⌫"?setPin(p=>p.slice(0,-1))&&setPinError(false):d?handlePin(d):null}
                  style={{padding:"14px",background:d?CARD2:"transparent",border:d?`1px solid ${BORDER}`:"none",borderRadius:10,color:d==="⌫"?"#668":"#ccd",fontSize:18,fontWeight:700,cursor:d?"pointer":"default"}}>
                  {d}
                </button>
              ))}
            </div>
            <button onClick={()=>{setPendingName(null);setPin("");}} style={{fontSize:11,color:"#446",background:"none",border:"none",cursor:"pointer",padding:"8px"}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{flex:1,overflowY:"auto",padding:"16px 14px 40px"}}>
        {[{team:"A",players:teamA,color:TEAM_A_COLOR,label:TEAM_A},{team:"B",players:teamB,color:TEAM_B_COLOR,label:TEAM_B}].map(({team,players,color,label})=>(
          <div key={team} style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${BORDER}`}}>
              <div style={{width:4,height:20,background:color,borderRadius:2}}/>
              <div style={{fontSize:11,fontWeight:800,color:team==="A"?color:TEAM_B_DISP,letterSpacing:2,fontFamily:"monospace"}}>{label}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {players.map(p=>(
                <button key={p.name} onClick={()=>handleSelect(p.name)} style={{padding:"14px 10px",background:CARD,border:`1px solid ${color}44`,borderRadius:10,color:"#dde",fontSize:14,fontWeight:700,cursor:"pointer",textAlign:"center",fontFamily:"'Arial Narrow','Arial',sans-serif"}}>
                  {p.name}{p.name==="Geb"?" 🔑":""}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Score Input ───────────────────────────────────────────────────────────────
function ScoreInput({ label, hcp, value, onChange, color, labelColor, par, strokes = 1 }) {
  const diff = value - (par || 4);

  // Golf notation styling
  let scoreDisplay;
  if (diff <= -2) {
    // Eagle or better — two concentric circles
    scoreDisplay = (
      <div style={{position:"relative",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:44,height:44,borderRadius:"50%",border:"2px solid #FFD700"}}/>
        <div style={{position:"absolute",width:32,height:32,borderRadius:"50%",border:"2px solid #FFD700"}}/>
        <span style={{fontSize:20,fontWeight:900,color:"#FFD700",fontFamily:"monospace",zIndex:1}}>{value}</span>
      </div>
    );
  } else if (diff === -1) {
    // Birdie — one circle
    scoreDisplay = (
      <div style={{position:"relative",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:44,height:44,borderRadius:"50%",border:"2px solid #4caf50"}}/>
        <span style={{fontSize:20,fontWeight:900,color:"#4caf50",fontFamily:"monospace",zIndex:1}}>{value}</span>
      </div>
    );
  } else if (diff === 0) {
    // Par — plain
    scoreDisplay = (
      <span style={{fontSize:20,fontWeight:900,color:"#fff",fontFamily:"monospace"}}>{value}</span>
    );
  } else if (diff === 1) {
    // Bogey — one square
    scoreDisplay = (
      <div style={{position:"relative",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:40,height:40,border:"2px solid #e88",borderRadius:3}}/>
        <span style={{fontSize:20,fontWeight:900,color:"#e88",fontFamily:"monospace",zIndex:1}}>{value}</span>
      </div>
    );
  } else if (diff === 2) {
    // Double bogey — two squares
    scoreDisplay = (
      <div style={{position:"relative",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:44,height:44,border:"2px solid #e55",borderRadius:3}}/>
        <div style={{position:"absolute",width:34,height:34,border:"2px solid #e55",borderRadius:2}}/>
        <span style={{fontSize:20,fontWeight:900,color:"#e55",fontFamily:"monospace",zIndex:1}}>{value}</span>
      </div>
    );
  } else {
    // Triple bogey or worse — filled red square
    scoreDisplay = (
      <div style={{position:"relative",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center",background:"#c0392b",borderRadius:3}}>
        <span style={{fontSize:20,fontWeight:900,color:"#fff",fontFamily:"monospace",zIndex:1}}>{value}</span>
      </div>
    );
  }

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
      <div style={{fontSize:11,fontWeight:700,color:labelColor||color,fontFamily:"monospace",textAlign:"center",maxWidth:90,lineHeight:1.2}}>
        {labelColor ? `${"★".repeat(strokes)} ${label}` : label}
      </div>
      {hcp>0&&<div style={{fontSize:9,color:GOLD,fontFamily:"monospace"}}>HCP {hcp}</div>}
      <div style={{display:"flex",alignItems:"center",gap:0}}>
        <button onClick={()=>onChange(Math.max(1,value-1))} style={{width:34,height:52,fontSize:20,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"7px 0 0 7px",color:"#8aa",cursor:"pointer"}}>−</button>
        <div style={{width:52,height:52,background:BG,border:`1px solid ${BORDER}`,borderTop:`3px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {scoreDisplay}
        </div>
        <button onClick={()=>onChange(Math.min(12,value+1))} style={{width:34,height:52,fontSize:20,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"0 7px 7px 0",color:"#8aa",cursor:"pointer"}}>+</button>
      </div>
      {par && diff !== 0 && (
        <div style={{fontSize:8,color:diff<0?"#4caf50":diff===1?"#e88":diff===2?"#e55":"#c0392b",fontFamily:"monospace",fontWeight:700}}>
          {diff > 0 ? `+${diff}` : diff}
        </div>
      )}
    </div>
  );
}

// ── HCP Modal ─────────────────────────────────────────────────────────────────
function HcpModal({ match, isSingles, onSave, onClose }) {
  const [vals,setVals]=useState({hcp1a:match.hcp1a||0,hcp1b:match.hcp1b||0,hcp2a:match.hcp2a||0,hcp2b:match.hcp2b||0});
  const Row=({label,field,color})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${BORDER}`}}>
      <div style={{fontSize:13,fontWeight:700,color}}>{label}</div>
      <div style={{display:"flex",alignItems:"center"}}>
        <button onClick={()=>setVals(v=>({...v,[field]:Math.max(0,v[field]-1)}))} style={{width:32,height:34,fontSize:18,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"6px 0 0 6px",color:"#8aa",cursor:"pointer"}}>−</button>
        <div style={{width:44,height:34,background:BG,border:`1px solid ${BORDER}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:GOLD,fontFamily:"monospace"}}>{vals[field]}</div>
        <button onClick={()=>setVals(v=>({...v,[field]:Math.min(36,v[field]+1)}))} style={{width:32,height:34,fontSize:18,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"0 6px 6px 0",color:"#8aa",cursor:"pointer"}}>+</button>
      </div>
    </div>
  );
  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,width:"100%",maxWidth:340}}>
        <div style={{fontSize:13,fontWeight:900,color:GOLD,marginBottom:4,letterSpacing:1,fontFamily:"monospace"}}>SET HANDICAPS</div>
        <div style={{fontSize:11,color:"#446",marginBottom:14}}>Strokes given on lowest handicap index holes first</div>
        <Row label={match.player1a} field="hcp1a" color={TEAM_A_COLOR}/>
        {!isSingles&&<Row label={match.player1b} field="hcp1b" color={TEAM_A_COLOR}/>}
        <Row label={match.player2a} field="hcp2a" color={TEAM_B_DISP}/>
        {!isSingles&&<Row label={match.player2b} field="hcp2b" color={TEAM_B_DISP}/>}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",background:"none",border:`1px solid ${BORDER}`,borderRadius:10,color:"#668",fontSize:12,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>onSave(vals)} style={{flex:2,padding:"10px",background:`linear-gradient(135deg,${TEAM_B_COLOR},${TEAM_B_DISP}44)`,border:`1px solid ${TEAM_B_COLOR}`,borderRadius:10,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>SAVE</button>
        </div>
      </div>
    </div>
  );
}

// ── Hole Entry ────────────────────────────────────────────────────────────────
function HoleEntry({ match, isSingles, courseKey, onSave, onClose }) {
  const course = COURSES[courseKey];
  const status = computeMatchStatus(match.scores);
  const [hole,setHole] = useState(status.holesPlayed<18?status.holesPlayed:17);
  const [showHcp,setShowHcp] = useState(false);
  const [grossScores,setGrossScores] = useState(()=>{
    // Pre-populate from saved Firebase data if available, otherwise default to par
    return Array.from({length:18},(_,i)=>{
      const parVal = course.par[i];
      const g1a = Array.isArray(match.grossP1a) ? match.grossP1a[i] : null;
      const g1b = Array.isArray(match.grossP1b) ? match.grossP1b[i] : null;
      const g2a = Array.isArray(match.grossP2a) ? match.grossP2a[i] : null;
      const g2b = Array.isArray(match.grossP2b) ? match.grossP2b[i] : null;
      return {
        p1a: g1a !== null && g1a !== undefined ? g1a : parVal,
        p1b: g1b !== null && g1b !== undefined ? g1b : parVal,
        p2a: g2a !== null && g2a !== undefined ? g2a : parVal,
        p2b: g2b !== null && g2b !== undefined ? g2b : parVal,
      };
    });
  });

  const sc = grossScores[hole];
  const setSc = (updater) => setGrossScores(prev=>{
    const next=[...prev];
    next[hole]=typeof updater==="function"?updater(prev[hole]):updater;
    return next;
  });

  const holeHcp=course.hcp[hole], holePar=course.par[hole];
  const net1a=netScore(sc.p1a,match.hcp1a||0,holeHcp);
  const net1b=isSingles?99:netScore(sc.p1b,match.hcp1b||0,holeHcp);
  const net2a=netScore(sc.p2a,match.hcp2a||0,holeHcp);
  const net2b=isSingles?99:netScore(sc.p2b,match.hcp2b||0,holeHcp);
  const teamANet=isSingles?net1a:Math.min(net1a,net1b);
  const teamBNet=isSingles?net2a:Math.min(net2a,net2b);
  const hw=teamANet<teamBNet?"A":teamBNet<teamANet?"B":"H";
  const hwColor=hw==="A"?TEAM_A_COLOR:hw==="B"?TEAM_B_COLOR:GOLD;
  const hwLabel=hw==="A"?`${TEAM_A_SHORT} wins · net ${teamANet} vs ${teamBNet}`:hw==="B"?`${TEAM_B_SHORT} wins · net ${teamBNet} vs ${teamANet}`:`Halved · both net ${teamANet}`;

  const handleConfirm=()=>{
    const ns=[...match.scores]; ns[hole]=hw;
    // Build updated gross score arrays (18 holes each)
    const toArr = (existing, newVal) => {
      const arr = Array.isArray(existing) ? [...existing] : Array(18).fill(null);
      arr[hole] = newVal;
      return arr;
    };
    onSave({
      ...match, scores:ns,
      grossP1a: toArr(match.grossP1a, sc.p1a),
      grossP1b: isSingles ? match.grossP1b : toArr(match.grossP1b, sc.p1b),
      grossP2a: toArr(match.grossP2a, sc.p2a),
      grossP2b: isSingles ? match.grossP2b : toArr(match.grossP2b, sc.p2b),
    });
    if(hole<17){
      const nextPar=course.par[hole+1];
      setHole(h=>h+1);
      setGrossScores(prev=>{const next=[...prev];next[hole+1]={p1a:nextPar,p1b:nextPar,p2a:nextPar,p2b:nextPar};return next;});
    }
  };
  const handleUndo=()=>{
    if(hole===0)return;
    const undoHole = hole-1;
    const ns=[...match.scores]; ns[undoHole]=null;
    // Also clear gross scores for the undone hole
    const clearArr = (arr) => {
      const a = Array.isArray(arr) ? [...arr] : Array(18).fill(null);
      a[undoHole] = null;
      return a;
    };
    onSave({
      ...match, scores:ns,
      grossP1a: clearArr(match.grossP1a),
      grossP1b: clearArr(match.grossP1b),
      grossP2a: clearArr(match.grossP2a),
      grossP2b: clearArr(match.grossP2b),
    });
    setHole(h=>h-1);
    const prevPar=course.par[undoHole];
    setGrossScores(prev=>{const next=[...prev];next[undoHole]={p1a:prevPar,p1b:prevPar,p2a:prevPar,p2b:prevPar};return next;});
  };

  const cur=computeMatchStatus(match.scores);
  const isComplete=cur.state==="complete"||cur.state==="halved";
  let runLead=0;
  for(let i=0;i<hole;i++){if(match.scores[i]==="A")runLead++;else if(match.scores[i]==="B")runLead--;}
  const runAbs=Math.abs(runLead);
  const runLeader=runLead>0?"A":runLead<0?"B":null;
  const [showEndEarly,setShowEndEarly]=useState(false);
  const strokeEntries=[
    {name:match.player1a,hcp:match.hcp1a||0},
    ...(!isSingles?[{name:match.player1b,hcp:match.hcp1b||0}]:[]),
    {name:match.player2a,hcp:match.hcp2a||0},
    ...(!isSingles?[{name:match.player2b,hcp:match.hcp2b||0}]:[]),
  ].map(p=>{
    let strokes=holeHcp<=p.hcp?1:0;
    if(p.hcp>18&&holeHcp<=p.hcp-18)strokes++;
    return {...p,strokes};
  }).filter(e=>e.strokes>0);

  return (
    <div style={{position:"fixed",inset:0,background:BG,zIndex:200,display:"flex",flexDirection:"column",overflowY:"auto"}}>
      {showHcp&&<HcpModal match={match} isSingles={isSingles} onSave={v=>{onSave({...match,...v});setShowHcp(false);}} onClose={()=>setShowHcp(false)}/>}
      {showEndEarly&&(
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:24,maxWidth:320,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:900,color:GOLD,marginBottom:6,fontFamily:"monospace"}}>END MATCH EARLY?</div>
            <div style={{fontSize:11,color:TEXT,marginBottom:6}}>
              {cur.state==="pending"?"Match is all square — result will be HALVED.":cur.leader?`${cur.leader==="A"?TEAM_A_SHORT:TEAM_B_SHORT} leads ${cur.up}UP after ${cur.holesPlayed} holes.`:"All square after "+cur.holesPlayed+" holes — result will be HALVED."}
            </div>
            <div style={{fontSize:10,color:MUTED,marginBottom:20}}>Remaining holes will be recorded as halved.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowEndEarly(false)} style={{flex:1,padding:"10px",background:"none",border:`1px solid ${BORDER}`,borderRadius:10,color:MUTED,fontSize:12,cursor:"pointer"}}>Cancel</button>
              <button onClick={()=>{
                const ns=[...match.scores];
                for(let i=0;i<18;i++){if(ns[i]===null||ns[i]===undefined)ns[i]="H";}
                onSave({...match,scores:ns});
                setShowEndEarly(false);
                onClose();
              }} style={{flex:1,padding:"10px",background:`linear-gradient(135deg,${TEAM_B_COLOR},${TEAM_B_DISP}66)`,border:`1px solid ${TEAM_B_COLOR}`,borderRadius:10,color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer"}}>CONFIRM</button>
            </div>
          </div>
        </div>
      )}
      <div style={{background:CARD,borderBottom:`1px solid ${BORDER}`,padding:"10px 12px",position:"sticky",top:0,zIndex:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <button onClick={onClose} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:7,color:"#668",padding:"5px 10px",cursor:"pointer",fontSize:11,flexShrink:0}}>← Back</button>
          <button onClick={()=>setShowHcp(true)} style={{fontSize:10,padding:"4px 10px",background:`${GOLD}22`,border:`1px solid ${GOLD}55`,borderRadius:6,color:GOLD,cursor:"pointer",fontFamily:"monospace",flexShrink:0}}>HCP ✏</button>
        </div>
        {/* TV match score bar */}
        <div style={{display:"flex",alignItems:"stretch",borderRadius:8,overflow:"hidden",border:`1px solid ${BORDER}`}}>
          <div style={{flex:1,background:runLeader==="A"?TEAM_A_COLOR:"#111a2e",padding:"8px 10px",minWidth:0}}>
            <div style={{fontSize:8,fontWeight:800,color:runLeader==="A"?"#ffcccc":TEAM_A_COLOR,letterSpacing:1,fontFamily:"monospace",marginBottom:2}}>{TEAM_A_SHORT}</div>
            <div style={{fontSize:12,fontWeight:700,color:"#dde",lineHeight:1.25,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.player1a}</div>
            {!isSingles&&<div style={{fontSize:12,fontWeight:700,color:"#dde",lineHeight:1.25,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.player1b}</div>}
          </div>
          <div style={{background:runLeader==="A"?TEAM_A_COLOR:runLeader==="B"?TEAM_B_COLOR:"#1a2a44",minWidth:68,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"6px 4px",borderLeft:`1px solid ${BORDER}`,borderRight:`1px solid ${BORDER}`,flexShrink:0}}>
            {cur.state==="pending"?<div style={{fontSize:10,color:"#446",fontFamily:"monospace"}}>—</div>
            :cur.state==="complete"||cur.state==="halved"?<><div style={{fontSize:8,color:"#FFD700",fontFamily:"monospace",fontWeight:800,letterSpacing:1}}>FINAL</div><div style={{fontSize:12,fontWeight:900,color:"#fff",fontFamily:"monospace"}}>{cur.sublabel||"HALVED"}</div></>
            :<><div style={{fontSize:17,fontWeight:900,color:"#fff",fontFamily:"monospace",lineHeight:1}}>{runLeader?runAbs:"AS"}</div><div style={{fontSize:8,color:"#88aacc",fontFamily:"monospace",marginTop:1}}>{runLeader?"UP":"ALL SQ"}</div><div style={{fontSize:8,color:"#446",fontFamily:"monospace",marginTop:2}}>THRU {hole}</div></>}
          </div>
          <div style={{flex:1,background:runLeader==="B"?TEAM_B_COLOR:"#111a2e",padding:"8px 10px",display:"flex",flexDirection:"column",alignItems:"flex-end",minWidth:0}}>
            <div style={{fontSize:8,fontWeight:800,color:runLeader==="B"?"#cce4ff":TEAM_B_DISP,letterSpacing:1,fontFamily:"monospace",marginBottom:2}}>{TEAM_B_SHORT}</div>
            <div style={{fontSize:12,fontWeight:700,color:"#dde",lineHeight:1.25,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right",width:"100%"}}>{match.player2a}</div>
            {!isSingles&&<div style={{fontSize:12,fontWeight:700,color:"#dde",lineHeight:1.25,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right",width:"100%"}}>{match.player2b}</div>}
          </div>
        </div>
      </div>
      <div style={{padding:"8px 10px 14px",display:"flex",gap:2}}>
        {Array.from({length:18},(_,i)=>{
          const s=match.scores[i];
          const isConfirmed = s!==null && s!==undefined;
          const isDisputed = (match.disputes||[]).includes(i);
          const bg=s==="A"?TEAM_A_COLOR:s==="B"?TEAM_B_COLOR:s==="H"?"#334":CARD2;
          const isAct=i===hole;
          return (
            <div key={i} style={{flex:1,position:"relative"}}>
              <div onClick={()=>setHole(i)} style={{height:isAct?26:20,background:bg,borderRadius:3,cursor:"pointer",border:isAct?`2px solid ${GOLD}`:"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isAct?8:7,color:isAct?"#fff":"#ffffff99",fontFamily:"monospace",fontWeight:700,transition:"all .12s"}}>
                {i+1}
              </div>
              {isConfirmed&&(
                <div onClick={e=>{e.stopPropagation();const cur=match.disputes||[];const nd=cur.includes(i)?cur.filter(h=>h!==i):[...cur,i];onSave({...match,disputes:nd});}}
                  style={{position:"absolute",bottom:-8,left:"50%",transform:"translateX(-50%)",fontSize:9,cursor:"pointer",opacity:isDisputed?1:0.15,lineHeight:1,userSelect:"none"}}>
                  🚩
                </div>
              )}
            </div>
          );
        })}
      </div>
      {isComplete&&(
        <div style={{margin:"10px 12px 0",background:`${cur.leader==="A"?TEAM_A_COLOR:cur.state==="halved"?"#334455":TEAM_B_COLOR}33`,border:`1px solid ${cur.leader==="A"?TEAM_A_COLOR:cur.state==="halved"?"#556677":TEAM_B_COLOR}66`,borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:9,color:"#668",fontFamily:"monospace",letterSpacing:1}}>MATCH RESULT</div>
            <div style={{fontSize:15,fontWeight:900,color:GOLD,letterSpacing:1}}>{cur.longLabel}</div>
            <div style={{fontSize:11,color:"#668",marginTop:2}}>{cur.sublabel}</div>
          </div>
          <div style={{fontSize:28}}>🏆</div>
        </div>
      )}
      {cur.state==="gap"&&(
        <div style={{margin:"8px 12px 0",background:"#e67e2222",border:"1px solid #e67e2299",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontSize:18,flexShrink:0}}>⚠</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:900,color:"#e67e22",fontFamily:"monospace",letterSpacing:1}}>MISSING SCORE</div>
            <div style={{fontSize:10,color:"#e67e22bb",marginTop:2}}>Score from hole {cur.holesPlayed+1} has not been recorded</div>
          </div>
          <button onClick={()=>setHole(cur.holesPlayed)} style={{flexShrink:0,padding:"5px 10px",background:"#e67e2233",border:"1px solid #e67e22",borderRadius:7,color:"#e67e22",fontSize:10,cursor:"pointer",fontWeight:800,fontFamily:"monospace"}}>GO →</button>
        </div>
      )}
      <div style={{flex:1,padding:"12px 12px 0"}}>
          <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:12,padding:"10px",background:CARD,borderRadius:12,border:`1px solid ${BORDER}`}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:8,color:"#446",fontFamily:"monospace",letterSpacing:2}}>HOLE</div><div style={{fontSize:28,fontWeight:900,color:GOLD,fontFamily:"monospace",lineHeight:1}}>{hole+1}</div></div>
            <div style={{width:1,background:BORDER}}/>
            <div style={{textAlign:"center"}}><div style={{fontSize:8,color:"#446",fontFamily:"monospace",letterSpacing:2}}>PAR</div><div style={{fontSize:28,fontWeight:900,color:"#ccd",fontFamily:"monospace",lineHeight:1}}>{holePar}</div></div>
            <div style={{width:1,background:BORDER}}/>
            <div style={{textAlign:"center"}}><div style={{fontSize:8,color:"#446",fontFamily:"monospace",letterSpacing:2}}>HCP IDX</div><div style={{fontSize:28,fontWeight:900,color:"#ccd",fontFamily:"monospace",lineHeight:1}}>{holeHcp}</div></div>
            {strokeEntries.length>0&&<><div style={{width:1,background:BORDER}}/><div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}><div style={{fontSize:8,color:GOLD,fontFamily:"monospace",letterSpacing:1}}>STROKE</div><div style={{fontSize:9,color:GOLD,marginTop:1}}>{strokeEntries.map(e=>`${e.name}${e.strokes>1?` ×${e.strokes}`:""}`).join(", ")}</div></div></>}
          </div>
          <div style={{background:`${TEAM_A_COLOR}18`,border:`1px solid ${TEAM_A_COLOR}44`,borderRadius:12,padding:"12px",marginBottom:8}}>
            <div style={{fontSize:9,color:TEAM_A_COLOR,fontWeight:800,letterSpacing:2,fontFamily:"monospace",marginBottom:10}}>{TEAM_A_SHORT}</div>
            <div style={{display:"flex",justifyContent:isSingles?"center":"space-around"}}>
              <ScoreInput label={match.player1a} hcp={match.hcp1a||0} value={sc.p1a} onChange={v=>setSc(s=>({...s,p1a:v}))} color={TEAM_A_COLOR} labelColor={strokeEntries.find(e=>e.name===match.player1a)?.strokes>0?GOLD:null} strokes={strokeEntries.find(e=>e.name===match.player1a)?.strokes||1} par={holePar}/>
              {!isSingles&&<ScoreInput label={match.player1b} hcp={match.hcp1b||0} value={sc.p1b} onChange={v=>setSc(s=>({...s,p1b:v}))} color={TEAM_A_COLOR} labelColor={strokeEntries.find(e=>e.name===match.player1b)?.strokes>0?GOLD:null} strokes={strokeEntries.find(e=>e.name===match.player1b)?.strokes||1} par={holePar}/>}
            </div>
            {!isSingles&&<div style={{textAlign:"center",marginTop:8,fontSize:10,color:"#fff4"}}>best net: <span style={{color:"#fff",fontWeight:700}}>{teamANet}</span></div>}
          </div>
          <div style={{background:`${TEAM_B_COLOR}33`,border:`1px solid ${TEAM_B_COLOR}66`,borderRadius:12,padding:"12px",marginBottom:10}}>
            <div style={{fontSize:9,color:TEAM_B_DISP,fontWeight:800,letterSpacing:2,fontFamily:"monospace",marginBottom:10}}>{TEAM_B_SHORT}</div>
            <div style={{display:"flex",justifyContent:isSingles?"center":"space-around"}}>
              <ScoreInput label={match.player2a} hcp={match.hcp2a||0} value={sc.p2a} onChange={v=>setSc(s=>({...s,p2a:v}))} color={TEAM_B_DISP} labelColor={strokeEntries.find(e=>e.name===match.player2a)?.strokes>0?GOLD:null} strokes={strokeEntries.find(e=>e.name===match.player2a)?.strokes||1} par={holePar}/>
              {!isSingles&&<ScoreInput label={match.player2b} hcp={match.hcp2b||0} value={sc.p2b} onChange={v=>setSc(s=>({...s,p2b:v}))} color={TEAM_B_DISP} labelColor={strokeEntries.find(e=>e.name===match.player2b)?.strokes>0?GOLD:null} strokes={strokeEntries.find(e=>e.name===match.player2b)?.strokes||1} par={holePar}/>}
            </div>
            {!isSingles&&<div style={{textAlign:"center",marginTop:8,fontSize:10,color:"#fff4"}}>best net: <span style={{color:"#fff",fontWeight:700}}>{teamBNet}</span></div>}
          </div>
          <div style={{background:`${hwColor}22`,border:`1px solid ${hwColor}55`,borderRadius:10,padding:"9px 12px",marginBottom:10,textAlign:"center"}}>
            <div style={{fontSize:9,color:"#446",fontFamily:"monospace",marginBottom:2}}>HOLE RESULT</div>
            <div style={{fontSize:13,fontWeight:800,color:hwColor}}>{hwLabel}</div>
          </div>
          {cur.state==="gap"&&hole!==cur.holesPlayed
            ? <div style={{width:"100%",padding:"15px",background:"#e67e2222",border:"1px solid #e67e2266",borderRadius:14,color:"#e67e22",fontWeight:900,fontSize:13,textAlign:"center",fontFamily:"monospace",marginBottom:8,letterSpacing:1}}>⚠ ENTER HOLE {cur.holesPlayed+1} FIRST</div>
            : <button onClick={handleConfirm} style={{width:"100%",padding:"15px",background:`linear-gradient(135deg,${hwColor},${hwColor}aa)`,border:"none",borderRadius:14,color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer",letterSpacing:1,fontFamily:"monospace",boxShadow:`0 4px 18px ${hwColor}44`,marginBottom:8}}>CONFIRM HOLE {hole+1} →</button>
          }
          {hole>0&&<button onClick={handleUndo} style={{width:"100%",padding:"9px",background:"none",border:`1px solid ${BORDER}`,borderRadius:10,color:"#446",fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,marginBottom:8}}>↩ UNDO HOLE {hole}</button>}
          {!isComplete&&<button onClick={()=>setShowEndEarly(true)} style={{width:"100%",padding:"7px",background:"none",border:`1px solid #334`,borderRadius:10,color:"#446",fontSize:10,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,marginBottom:20}}>End Match Early</button>}
        </div>
    </div>
  );
}

// ── Admin Match Editor ────────────────────────────────────────────────────────
function AdminMatchEditor({ match, isSingles, courseKey, onSave, onClose }) {
  const course = COURSES[courseKey];
  const [gross, setGross] = useState(() => Array.from({length:18}, (_,i) => ({
    p1a: (Array.isArray(match.grossP1a) && match.grossP1a[i] != null) ? match.grossP1a[i] : course.par[i],
    p1b: (Array.isArray(match.grossP1b) && match.grossP1b[i] != null) ? match.grossP1b[i] : course.par[i],
    p2a: (Array.isArray(match.grossP2a) && match.grossP2a[i] != null) ? match.grossP2a[i] : course.par[i],
    p2b: (Array.isArray(match.grossP2b) && match.grossP2b[i] != null) ? match.grossP2b[i] : course.par[i],
  })));
  // "auto"=compute from gross, "A"/"B"/"H"=explicit, "unplayed"=null
  const [overrides, setOverrides] = useState(() => match.scores.map(s => s == null ? "unplayed" : s));
  const [showHcp, setShowHcp] = useState(false);
  const [hcpVals, setHcpVals] = useState({hcp1a:match.hcp1a||0, hcp1b:match.hcp1b||0, hcp2a:match.hcp2a||0, hcp2b:match.hcp2b||0});

  const computedResult = (i) => {
    const g = gross[i], hcpIdx = course.hcp[i];
    const net1a = netScore(g.p1a, hcpVals.hcp1a, hcpIdx);
    const net1b = isSingles ? 99 : netScore(g.p1b, hcpVals.hcp1b, hcpIdx);
    const net2a = netScore(g.p2a, hcpVals.hcp2a, hcpIdx);
    const net2b = isSingles ? 99 : netScore(g.p2b, hcpVals.hcp2b, hcpIdx);
    const tA = isSingles ? net1a : Math.min(net1a, net1b);
    const tB = isSingles ? net2a : Math.min(net2a, net2b);
    return tA < tB ? "A" : tB < tA ? "B" : "H";
  };

  const handleSave = () => {
    const finalScores = overrides.map((ov, i) => {
      if (ov === "unplayed") return null;
      if (ov === "auto") return computedResult(i);
      return ov;
    });
    onSave({
      ...match, scores: finalScores,
      grossP1a: gross.map(g=>g.p1a), grossP1b: gross.map(g=>g.p1b),
      grossP2a: gross.map(g=>g.p2a), grossP2b: gross.map(g=>g.p2b),
      ...hcpVals,
    });
  };

  const setG = (holeIdx, player, val) => setGross(prev => {
    const n=[...prev]; n[holeIdx]={...prev[holeIdx],[player]:val}; return n;
  });

  const Spin = ({holeIdx, player, color, label}) => (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,flex:1,minWidth:0}}>
      <div style={{fontSize:8,color,fontFamily:"monospace",fontWeight:700,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:64}}>{label}</div>
      <div style={{display:"flex",alignItems:"center"}}>
        <button onClick={()=>setG(holeIdx,player,Math.max(1,gross[holeIdx][player]-1))} style={{width:24,height:30,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"4px 0 0 4px",color:"#8aa",fontSize:14,cursor:"pointer"}}>−</button>
        <div style={{width:30,height:30,background:BG,border:`1px solid ${BORDER}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:TEXT,fontFamily:"monospace"}}>{gross[holeIdx][player]}</div>
        <button onClick={()=>setG(holeIdx,player,Math.min(12,gross[holeIdx][player]+1))} style={{width:24,height:30,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"0 4px 4px 0",color:"#8aa",fontSize:14,cursor:"pointer"}}>+</button>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:BG,zIndex:200,display:"flex",flexDirection:"column",fontFamily:"'Arial Narrow','Arial',sans-serif"}}>
      {showHcp&&<HcpModal match={{...match,...hcpVals}} isSingles={isSingles} onSave={v=>{setHcpVals(v);setShowHcp(false);}} onClose={()=>setShowHcp(false)}/>}
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <div style={{background:CARD,borderBottom:`1px solid ${BORDER}`,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:10,flexShrink:0}}>
        <button onClick={onClose} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:7,color:MUTED,padding:"5px 10px",cursor:"pointer",fontSize:11}}>← Back</button>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>setShowHcp(true)} style={{padding:"5px 10px",background:"none",border:`1px solid ${GOLD}`,borderRadius:7,color:GOLD,fontSize:11,cursor:"pointer",fontWeight:700}}>HCP</button>
          <div style={{fontSize:11,fontWeight:900,color:GOLD,letterSpacing:1,fontFamily:"monospace"}}>ADMIN EDIT · Match {match.id}</div>
        </div>
        <button onClick={handleSave} style={{padding:"6px 14px",background:`linear-gradient(135deg,${TEAM_B_COLOR},${TEAM_B_DISP}66)`,border:`1px solid ${TEAM_B_COLOR}`,borderRadius:8,color:"#fff",fontWeight:800,fontSize:11,cursor:"pointer"}}>SAVE</button>
      </div>
      <div style={{padding:"6px 12px",background:CARD2,borderBottom:`1px solid ${BORDER}`,flexShrink:0}}>
        <span style={{fontSize:11,fontWeight:700,color:TEAM_A_COLOR}}>{match.player1a}{!isSingles&&match.player1b?` & ${match.player1b}`:""}</span>
        <span style={{fontSize:10,color:MUTED,margin:"0 6px"}}>vs</span>
        <span style={{fontSize:11,fontWeight:700,color:TEAM_B_DISP}}>{match.player2a}{!isSingles&&match.player2b?` & ${match.player2b}`:""}</span>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 10px 20px"}}>
        {Array.from({length:18}, (_,i) => {
          const par = course.par[i], hcpIdx = course.hcp[i];
          const computed = computedResult(i);
          const ov = overrides[i];
          const resColor = ov==="A"||ov==="auto"&&computed==="A"?TEAM_A_COLOR:ov==="B"||ov==="auto"&&computed==="B"?TEAM_B_COLOR:ov==="H"||ov==="auto"&&computed==="H"?GOLD:MUTED;
          return (
            <div key={i} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px",marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:900,color:GOLD,fontFamily:"monospace"}}>HOLE {i+1}</div>
                <div style={{fontSize:10,color:MUTED,fontFamily:"monospace"}}>PAR {par} · HCP {hcpIdx}</div>
              </div>
              <div style={{display:"flex",gap:4,marginBottom:8}}>
                <Spin holeIdx={i} player="p1a" color={TEAM_A_COLOR} label={match.player1a}/>
                {!isSingles&&<Spin holeIdx={i} player="p1b" color={TEAM_A_COLOR} label={match.player1b}/>}
                <Spin holeIdx={i} player="p2a" color={TEAM_B_DISP} label={match.player2a}/>
                {!isSingles&&<Spin holeIdx={i} player="p2b" color={TEAM_B_DISP} label={match.player2b}/>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                <div style={{fontSize:9,color:MUTED,fontFamily:"monospace",flexShrink:0}}>RESULT:</div>
                {[["auto","CALC"],["A","A"],["H","H"],["B","B"],["unplayed","—"]].map(([v,lbl])=>(
                  <button key={v} onClick={()=>setOverrides(prev=>{const n=[...prev];n[i]=v;return n;})}
                    style={{padding:"3px 7px",background:ov===v?`${v==="A"?TEAM_A_COLOR:v==="B"?TEAM_B_COLOR:v==="H"?GOLD:MUTED}33`:"transparent",border:`1px solid ${ov===v?v==="A"?TEAM_A_COLOR:v==="B"?TEAM_B_COLOR:v==="H"?GOLD:MUTED:BORDER}`,borderRadius:5,color:ov===v?v==="A"?TEAM_A_COLOR:v==="B"?TEAM_B_COLOR:v==="H"?GOLD:MUTED:MUTED,fontSize:10,cursor:"pointer",fontFamily:"monospace",fontWeight:ov===v?700:400}}>
                    {lbl}
                  </button>
                ))}
                <div style={{fontSize:9,color:MUTED,fontFamily:"monospace",marginLeft:"auto"}}>auto={computed}</div>
              </div>
            </div>
          );
        })}
        <button onClick={handleSave} style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${TEAM_B_COLOR},${TEAM_B_DISP}66)`,border:`1px solid ${TEAM_B_COLOR}`,borderRadius:12,color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer",fontFamily:"monospace",marginTop:4}}>
          SAVE ALL CHANGES
        </button>
      </div>
    </div>
  );
}

// ── Admin Section ─────────────────────────────────────────────────────────────
function AdminSection({ days }) {
  const [confirmReset, setConfirmReset] = useState(null);
  const [pairings, setPairings] = useState(() => {
    const d2 = {}; days[1].matches.forEach(m=>{ d2[m.id]={player1a:m.player1a,player1b:m.player1b,player2a:m.player2a,player2b:m.player2b}; });
    const d3 = {}; days[2].matches.forEach(m=>{ d3[m.id]={player1a:m.player1a,player2a:m.player2a}; });
    return {d2,d3};
  });
  const [pairingSaved, setPairingSaved] = useState(false);

  const teamANames = ALL_PLAYERS.filter(p=>p.team==="A").map(p=>p.name);
  const teamBNames = ALL_PLAYERS.filter(p=>p.team==="B").map(p=>p.name);

  const savePairings = async () => {
    const d2Payload = {}; Object.entries(pairings.d2).forEach(([id,p])=>{ d2Payload[`m${id}`]=p; });
    const d3Payload = {}; Object.entries(pairings.d3).forEach(([id,p])=>{ d3Payload[`m${id}`]=p; });
    await set(ref(db,"pairings/day2"), d2Payload);
    await set(ref(db,"pairings/day3"), d3Payload);
    setPairingSaved(true); setTimeout(()=>setPairingSaved(false), 2000);
  };

  const doReset = async () => {
    if (confirmReset === null) return;
    await set(ref(db, `matches/m${confirmReset}`), {
      scores: Array(18).fill(null), hcp1a:0, hcp1b:0, hcp2a:0, hcp2b:0,
      grossP1a:null, grossP1b:null, grossP2a:null, grossP2b:null, disputes:null
    });
    setConfirmReset(null);
  };

  const selStyle = {width:"100%",padding:"5px 4px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:6,color:TEXT,fontSize:11,cursor:"pointer"};

  return (
    <div style={{paddingBottom:40}}>
      {/* Confirm reset modal */}
      {confirmReset !== null && (
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:24,maxWidth:320,width:"100%",textAlign:"center"}}>
            <div style={{fontSize:13,fontWeight:900,color:"#e55",marginBottom:8,fontFamily:"monospace"}}>RESET MATCH {confirmReset}?</div>
            <div style={{fontSize:12,color:TEXT,marginBottom:20}}>This clears all scores, gross scores, and disputes. Cannot be undone.</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setConfirmReset(null)} style={{flex:1,padding:"10px",background:"none",border:`1px solid ${BORDER}`,borderRadius:10,color:MUTED,fontSize:12,cursor:"pointer"}}>Cancel</button>
              <button onClick={doReset} style={{flex:1,padding:"10px",background:"#c0392b",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>RESET</button>
            </div>
          </div>
        </div>
      )}

      {/* DISPUTES */}
      <div style={{marginBottom:22}}>
        <div style={{fontSize:11,fontWeight:900,color:"#e55",letterSpacing:2,fontFamily:"monospace",marginBottom:10}}>🚩 DISPUTES</div>
        {(() => {
          const list = [];
          for (const day of days) for (const m of day.matches)
            for (const h of (m.disputes||[])) list.push({id:m.id,hole:h+1,players:[m.player1a,m.player1b,m.player2a,m.player2b].filter(Boolean).join(" / ")});
          if (!list.length) return <div style={{fontSize:11,color:MUTED,fontFamily:"monospace",padding:"8px 0"}}>No disputes flagged.</div>;
          return list.map((d,i)=>(
            <div key={i} style={{padding:"8px 12px",background:CARD2,borderRadius:8,marginBottom:6,border:"1px solid #e5533333"}}>
              <div style={{fontSize:11,color:"#e55",fontWeight:700,fontFamily:"monospace"}}>Match {d.id} — Hole {d.hole}</div>
              <div style={{fontSize:10,color:MUTED,marginTop:2}}>{d.players}</div>
            </div>
          ));
        })()}
      </div>

      {/* PAIRINGS */}
      <div style={{marginBottom:22}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontSize:11,fontWeight:900,color:GOLD,letterSpacing:2,fontFamily:"monospace"}}>PAIRINGS</div>
          <button onClick={savePairings} style={{padding:"6px 14px",background:`linear-gradient(135deg,${TEAM_B_COLOR},${TEAM_B_DISP}66)`,border:`1px solid ${TEAM_B_COLOR}`,borderRadius:8,color:"#fff",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"monospace"}}>
            {pairingSaved?"✓ SAVED":"SAVE"}
          </button>
        </div>
        <div style={{fontSize:10,color:MUTED2,fontFamily:"monospace",marginBottom:6,letterSpacing:1}}>SATURDAY — Day 2</div>
        {days[1].matches.map(m=>(
          <div key={m.id} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
            <div style={{fontSize:10,fontWeight:700,color:MUTED2,fontFamily:"monospace",marginBottom:8}}>Match {m.id} · {m.teeTime}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[{k:"player1a",col:TEAM_A_COLOR,lbl:"A1",team:"A"},{k:"player1b",col:TEAM_A_COLOR,lbl:"A2",team:"A"},{k:"player2a",col:TEAM_B_DISP,lbl:"B1",team:"B"},{k:"player2b",col:TEAM_B_DISP,lbl:"B2",team:"B"}].map(slot=>(
                <div key={slot.k}>
                  <div style={{fontSize:8,color:slot.col,fontFamily:"monospace",marginBottom:2}}>{slot.lbl}</div>
                  <select value={pairings.d2[m.id]?.[slot.k]||""} onChange={e=>setPairings(prev=>({...prev,d2:{...prev.d2,[m.id]:{...prev.d2[m.id],[slot.k]:e.target.value}}}))} style={selStyle}>
                    <option value="">—</option>
                    {(slot.team==="A"?teamANames:teamBNames).map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{fontSize:10,color:MUTED2,fontFamily:"monospace",marginBottom:6,letterSpacing:1,marginTop:12}}>SUNDAY — Day 3</div>
        {days[2].matches.map(m=>(
          <div key={m.id} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
            <div style={{fontSize:10,fontWeight:700,color:MUTED2,fontFamily:"monospace",marginBottom:8}}>Match {m.id} · {m.teeTime}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {[{k:"player1a",col:TEAM_A_COLOR,lbl:"A",team:"A"},{k:"player2a",col:TEAM_B_DISP,lbl:"B",team:"B"}].map(slot=>(
                <div key={slot.k}>
                  <div style={{fontSize:8,color:slot.col,fontFamily:"monospace",marginBottom:2}}>{slot.lbl}</div>
                  <select value={pairings.d3[m.id]?.[slot.k]||""} onChange={e=>setPairings(prev=>({...prev,d3:{...prev.d3,[m.id]:{...prev.d3[m.id],[slot.k]:e.target.value}}}))} style={selStyle}>
                    <option value="">—</option>
                    {(slot.team==="A"?teamANames:teamBNames).map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* RESET MATCHES */}
      <div>
        <div style={{fontSize:11,fontWeight:900,color:"#e55",letterSpacing:2,fontFamily:"monospace",marginBottom:10}}>RESET MATCHES</div>
        {days.map((day,di)=>day.matches.map(m=>(
          <div key={m.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,marginBottom:6}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:TEXT}}>{m.player1a}{m.player1b?` & ${m.player1b}`:""} vs {m.player2a}{m.player2b?` & ${m.player2b}`:""}</div>
              <div style={{fontSize:9,color:MUTED,fontFamily:"monospace"}}>Match {m.id} · Day {di+1}</div>
            </div>
            <button onClick={()=>setConfirmReset(m.id)} style={{padding:"5px 10px",background:"#c0392b22",border:"1px solid #c0392b66",borderRadius:7,color:"#e55",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"monospace",flexShrink:0}}>Reset</button>
          </div>
        )))}
      </div>
    </div>
  );
}

// ── TV Match Row ──────────────────────────────────────────────────────────────
function TVMatchRow({ match, isSingles, onOpen, canEdit }) {
  const s = computeMatchStatus(match.scores);
  const aWin    = s.state==="complete" && s.leader==="A";
  const bWin    = s.state==="complete" && s.leader==="B";
  const halved  = s.state==="halved";
  const live    = s.state==="live";
  const gap     = s.state==="gap";
  const aLeading = (live||gap) && s.leader==="A";
  const bLeading = (live||gap) && s.leader==="B";
  const allSquare = (live||gap) && !s.leader;

  const aNameColor = (aWin||aLeading) ? "#ffffff" : "#7a8fa8";
  const bNameColor = (bWin||bLeading) ? "#ffffff" : "#7a8fa8";
  const aBg = aWin ? TEAM_A_COLOR : aLeading ? `${TEAM_A_COLOR}22` : "#0d1929";
  const bBg = bWin ? TEAM_B_COLOR : bLeading ? `${TEAM_B_COLOR}22` : "#0d1929";

  // Score badge for live matches
  const liveScoreBadge = (
    <div style={{
      background: aLeading?`${TEAM_A_COLOR}ee`:bLeading?`${TEAM_B_COLOR}ee`:"#1a2a44",
      borderRadius:6, padding:"3px 8px", display:"flex", flexDirection:"column",
      alignItems:"center", flexShrink:0, minWidth:54,
    }}>
      <div style={{fontSize:7,fontWeight:800,color:"#ffffffaa",fontFamily:"monospace",letterSpacing:1,lineHeight:1.3}}>THRU {s.holesPlayed}</div>
      <div style={{fontSize:15,fontWeight:900,color:"#fff",fontFamily:"monospace",lineHeight:1.1}}>{allSquare?"AS":`${s.up}UP`}</div>
      <div style={{width:5,height:5,borderRadius:"50%",background:"#4caf50",marginTop:2,animation:"pulse 1.5s infinite"}}/>
    </div>
  );

  if (!live) {
    // Pending, complete, halved, gap — static centred badge
    let badgeBg = "#0d1929", badgeTop = "", badgeBot = "—";
    if (aWin)        { badgeBg=TEAM_A_COLOR; badgeTop="WIN"; badgeBot=s.sublabel; }
    else if (bWin)   { badgeBg=TEAM_B_COLOR; badgeTop="WIN"; badgeBot=s.sublabel; }
    else if (halved) { badgeBg="#334455";    badgeTop="HALVED"; badgeBot="½pt"; }
    else if (gap)    { badgeBg="#e67e22";    badgeTop="⚠"; badgeBot="MISSING"; }
    return (
      <div onClick={canEdit?onOpen:undefined} style={{display:"flex",alignItems:"stretch",cursor:canEdit?"pointer":"default",borderBottom:`1px solid #0a1628`,opacity:canEdit?1:0.85}}>
        <div style={{flex:1,background:aBg,padding:"10px 10px",minWidth:0}}>
          <div style={{fontSize:12,fontWeight:800,color:aNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.player1a}</div>
          {!isSingles&&<div style={{fontSize:12,fontWeight:800,color:aNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.player1b}</div>}
          {(match.hcp1a||0)+(match.hcp1b||0)>0&&<div style={{fontSize:7,color:GOLD,marginTop:2,fontFamily:"monospace"}}>HCP {match.hcp1a||0}{!isSingles&&match.hcp1b?`/${match.hcp1b}`:""}</div>}
        </div>
        <div style={{background:badgeBg,width:64,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"4px",flexShrink:0}}>
          {badgeTop&&<div style={{fontSize:7,fontWeight:800,color:aWin||bWin?"#FFD700":"#ffffffbb",fontFamily:"monospace",letterSpacing:0.5}}>{badgeTop}</div>}
          <div style={{fontSize:badgeBot.length>4?11:14,fontWeight:900,color:"#fff",fontFamily:"monospace",lineHeight:1}}>{badgeBot}</div>
        </div>
        <div style={{flex:1,background:bBg,padding:"10px 10px",display:"flex",flexDirection:"column",alignItems:"flex-end",minWidth:0}}>
          <div style={{fontSize:12,fontWeight:800,color:bNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right",width:"100%"}}>{match.player2a}</div>
          {!isSingles&&<div style={{fontSize:12,fontWeight:800,color:bNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right",width:"100%"}}>{match.player2b}</div>}
          {(match.hcp2a||0)+(match.hcp2b||0)>0&&<div style={{fontSize:7,color:GOLD,marginTop:2,fontFamily:"monospace",textAlign:"right"}}>HCP {match.hcp2a||0}{!isSingles&&match.hcp2b?`/${match.hcp2b}`:""}</div>}
        </div>
      </div>
    );
  }

  // LIVE — names pinned to outer edges, badge floats halfway into leading side
  // We use a single relative container with absolutely-positioned badge
  return (
    <div onClick={canEdit?onOpen:undefined} style={{position:"relative",display:"flex",alignItems:"stretch",cursor:canEdit?"pointer":"default",borderBottom:`1px solid #0a1628`,overflow:"hidden",opacity:canEdit?1:0.85}}>
      {/* Team A — names left-pinned */}
      <div style={{flex:1,background:aBg,padding:"10px 10px",minWidth:0}}>
        <div style={{fontSize:12,fontWeight:800,color:aNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.player1a}</div>
        {!isSingles&&<div style={{fontSize:12,fontWeight:800,color:aNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.player1b}</div>}
        {(match.hcp1a||0)+(match.hcp1b||0)>0&&<div style={{fontSize:7,color:GOLD,marginTop:2,fontFamily:"monospace"}}>HCP {match.hcp1a||0}{!isSingles&&match.hcp1b?`/${match.hcp1b}`:""}</div>}
      </div>
      {/* Team B — names right-pinned */}
      <div style={{flex:1,background:bBg,padding:"10px 10px",display:"flex",flexDirection:"column",alignItems:"flex-end",minWidth:0}}>
        <div style={{fontSize:12,fontWeight:800,color:bNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right",width:"100%"}}>{match.player2a}</div>
        {!isSingles&&<div style={{fontSize:12,fontWeight:800,color:bNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right",width:"100%"}}>{match.player2b}</div>}
        {(match.hcp2a||0)+(match.hcp2b||0)>0&&<div style={{fontSize:7,color:GOLD,marginTop:2,fontFamily:"monospace",textAlign:"right"}}>HCP {match.hcp2a||0}{!isSingles&&match.hcp2b?`/${match.hcp2b}`:""}</div>}
      </div>
      {/* Badge — absolutely centred, then shifted 25% toward leading team */}
      <div style={{
        position:"absolute",
        top:"50%",
        // 50% = dead centre. Shift left 25% if A leading, right 25% if B leading
        left: aLeading ? "25%" : bLeading ? "75%" : "50%",
        transform: "translate(-50%, -50%)",
        zIndex:2,
        pointerEvents:"none",
      }}>
        {liveScoreBadge}
      </div>
    </div>
  );
}

// ── TV Day Block ──────────────────────────────────────────────────────────────
function TVDayBlock({ day, onOpen, canEdit }) {
  const dp=computeDayPoints(day);
  const hasAct=day.matches.some(m=>m.scores.some(s=>s!==null));
  // isSingles is per-match (mixed days supported)
  return (
    <div style={{marginBottom:14,borderRadius:10,overflow:"hidden",border:`1px solid ${BORDER}`}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#060f22",padding:"7px 10px",borderBottom:`1px solid ${BORDER}`}}>
        <div style={{fontSize:10,fontWeight:800,color:GOLD,letterSpacing:2,fontFamily:"monospace"}}>{day.label.toUpperCase()}</div>
        {hasAct&&<div style={{fontSize:8,color:"#446",fontFamily:"monospace"}}>{fmt(dp.a)}–{fmt(dp.b)} · proj {fmt(dp.pA)}–{fmt(dp.pB)}</div>}
      </div>
      <div style={{display:"flex",background:"#080f20",borderBottom:`1px solid ${BORDER}`}}>
        <div style={{flex:1,padding:"5px 10px",fontSize:8,fontWeight:800,color:TEAM_A_COLOR,letterSpacing:1,fontFamily:"monospace"}}>{TEAM_A_SHORT}</div>
        <div style={{width:64,textAlign:"center",padding:"5px 0",fontSize:7,color:"#446",fontFamily:"monospace"}}>{day.format.toUpperCase()}</div>
        <div style={{flex:1,padding:"5px 10px",fontSize:8,fontWeight:800,color:TEAM_B_DISP,letterSpacing:1,fontFamily:"monospace",textAlign:"right"}}>{TEAM_B_SHORT}</div>
      </div>
      {day.matches.map(m=><TVMatchRow key={m.id} match={m} isSingles={!m.player1b} onOpen={()=>onOpen(m.id)} canEdit={canEdit?canEdit(m.id):false}/>)}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [theme, setTheme]           = useState(_initTheme);
  const [days, setDays]             = useState(initialDays);
  const [loaded, setLoaded]         = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(()=>{ try{return localStorage.getItem("jr_player")||null;}catch{return null;} });
  const [tab, setTab]               = useState("scoreboard");
  const [activeMatch, setActiveMatch] = useState(null);
  const [adminEditMatch, setAdminEditMatch] = useState(null);
  const [boardDayOverride, setBoardDayOverride] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState(()=>{ try{return JSON.parse(localStorage.getItem("jr_offline_queue")||"[]");}catch{return [];} });
  const [syncStatus, setSyncStatus] = useState(null);
  const [matchCelebration, setMatchCelebration] = useState(null);
  const isSaving = useRef(false);
  const dirtyMatchIds = useRef(new Set()); // match IDs with unconfirmed local writes
  const prevWinnerRef = useRef(null);
  const prevMatchStates = useRef({});
  const confettiFired = useRef(false);
  const celebTimer = useRef(null);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    const t = next === "light" ? _LIGHT : _DARK;
    BG = t.bg; CARD = t.card; CARD2 = t.card2; BORDER = t.border;
    TEXT = t.text; MUTED = t.muted; MUTED2 = t.muted2;
    setTheme(next);
    try { localStorage.setItem("jr_theme", next); } catch {}
  };

  // ── Firebase: subscribe to all match data ──
  useEffect(()=>{
    const dbRef = ref(db, "matches");
    const unsub = onValue(dbRef, (snapshot)=>{
      const data = snapshot.val();
      if (!data) { setLoaded(true); return; }
      setDays(prev => prev.map(day => ({
        ...day,
        matches: day.matches.map(m => {
          // Skip matches with unconfirmed local writes — they're authoritative until Firebase confirms
          if (dirtyMatchIds.current.has(m.id)) return m;
          const fbMatch = data[`m${m.id}`];
          if (!fbMatch) return m;
          const rawScores = fbMatch.scores;
          const scores = Array.isArray(rawScores)
            ? rawScores
            : Array.from({length:18}, (_,i) => rawScores?.[i] ?? null);
          const rawDisputes = fbMatch.disputes;
          const disputes = rawDisputes ? Object.values(rawDisputes).filter(v=>v!=null) : [];
          return {
            ...m, scores, disputes,
            hcp1a: fbMatch.hcp1a ?? m.hcp1a,
            hcp1b: fbMatch.hcp1b ?? m.hcp1b,
            hcp2a: fbMatch.hcp2a ?? m.hcp2a,
            hcp2b: fbMatch.hcp2b ?? m.hcp2b,
            grossP1a: fbMatch.grossP1a ? Array.from({length:18},(_,i)=>fbMatch.grossP1a[i]??null) : null,
            grossP1b: fbMatch.grossP1b ? Array.from({length:18},(_,i)=>fbMatch.grossP1b[i]??null) : null,
            grossP2a: fbMatch.grossP2a ? Array.from({length:18},(_,i)=>fbMatch.grossP2a[i]??null) : null,
            grossP2b: fbMatch.grossP2b ? Array.from({length:18},(_,i)=>fbMatch.grossP2b[i]??null) : null,
          };
        })
      })));
      setLoaded(true);
    });
    return ()=> unsub();
  }, []);

  // ── Firebase: subscribe to pairings ──
  useEffect(()=>{
    const unsub = onValue(ref(db,"pairings"), snapshot=>{
      const data = snapshot.val();
      if (!data) return;
      setDays(prev => prev.map((day,di)=>{
        const dayKey = di===1?"day2":di===2?"day3":null;
        if (!dayKey || !data[dayKey]) return day;
        return {
          ...day,
          matches: day.matches.map(m=>{
            const pairing = data[dayKey][`m${m.id}`];
            if (!pairing) return m;
            return {...m, ...pairing};
          })
        };
      }));
    });
    return ()=> unsub();
  }, []);

  // ── Firebase: write a single match on update (with offline queue) ──
  const updateMatch = async (dayIdx, upd) => {
    dirtyMatchIds.current.add(upd.id); // protect local state from Firebase overwrites
    isSaving.current = true;
    setDays(ds => ds.map((d,i) => i!==dayIdx ? d : {
      ...d, matches: d.matches.map(m => m.id===upd.id ? upd : m)
    }));
    const path = `matches/m${upd.id}`;
    const payload = {
      scores: upd.scores,
      hcp1a: upd.hcp1a||0, hcp1b: upd.hcp1b||0,
      hcp2a: upd.hcp2a||0, hcp2b: upd.hcp2b||0,
    };
    if (upd.grossP1a) payload.grossP1a = upd.grossP1a;
    if (upd.grossP1b) payload.grossP1b = upd.grossP1b;
    if (upd.grossP2a) payload.grossP2a = upd.grossP2a;
    if (upd.grossP2b) payload.grossP2b = upd.grossP2b;
    if (upd.disputes !== undefined) payload.disputes = upd.disputes || null;
    try {
      await set(ref(db, path), payload);
      dirtyMatchIds.current.delete(upd.id); // confirmed — Firebase can update again
    } catch {
      setOfflineQueue(prev=>{
        const q = [...prev.filter(x=>x.path!==path), {path, payload}];
        try { localStorage.setItem("jr_offline_queue", JSON.stringify(q)); } catch {}
        return q;
      });
      // keep in dirtyMatchIds — will be released when offline queue flushes
    } finally {
      isSaving.current = false;
    }
  };

  // ── Flush offline queue when back online ──
  useEffect(()=>{
    const flush = async () => {
      if (!offlineQueue.length) return;
      try {
        for (const item of offlineQueue) {
          await set(ref(db, item.path), item.payload);
          // Release dirty protection now that this write is confirmed
          const mid = parseInt(item.path.replace("matches/m",""));
          if (!isNaN(mid)) dirtyMatchIds.current.delete(mid);
        }
        setOfflineQueue([]);
        try { localStorage.removeItem("jr_offline_queue"); } catch {}
        setSyncStatus("synced");
        setTimeout(()=>setSyncStatus(null), 2500);
      } catch {}
    };
    window.addEventListener("online", flush);
    return ()=> window.removeEventListener("online", flush);
  }, [offlineQueue]);

  // ── Computed score values (must be declared BEFORE any useEffect that references them) ──
  const {actualA,actualB,projA,projB} = computeAllPoints(days);
  const totalMatches = days.reduce((s,d)=>s+d.matches.length,0);
  const doneMatches  = days.reduce((s,d)=>s+d.matches.filter(m=>["complete","halved"].includes(computeMatchStatus(m.scores).state)).length,0);
  const liveCount    = days.reduce((s,d)=>s+d.matches.filter(m=>computeMatchStatus(m.scores).state==="live").length,0);
  const winTarget    = totalMatches/2;
  const winner       = actualA>winTarget?TEAM_A_SHORT:actualB>winTarget?TEAM_B_SHORT:null;
  const projWinner   = !winner&&(projA>winTarget?TEAM_A_SHORT:projB>winTarget?TEAM_B_SHORT:null);

  // ── Confetti when cup is won ──
  useEffect(()=>{
    if (winner && !prevWinnerRef.current && !confettiFired.current) {
      confettiFired.current = true;
      const col = winner===TEAM_A_SHORT?["#C8102E","#ff8888","#C4A44A","#fff"]:["#003087","#4A90D9","#C4A44A","#fff"];
      confetti({particleCount:200,spread:120,origin:{y:0.35},colors:col});
      setTimeout(()=>confetti({particleCount:100,spread:80,origin:{y:0.35,x:0.2},colors:col}),400);
      setTimeout(()=>confetti({particleCount:100,spread:80,origin:{y:0.35,x:0.8},colors:col}),700);
    }
    prevWinnerRef.current = winner;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  // ── Match completion celebration ──
  useEffect(()=>{
    for (const day of days) for (const m of day.matches) {
      const s = computeMatchStatus(m.scores);
      const prev = prevMatchStates.current[m.id];
      if (prev !== undefined && prev === "live" && (s.state==="complete"||s.state==="halved")) {
        const color = s.state==="halved"?"#334455":s.leader==="A"?TEAM_A_COLOR:TEAM_B_COLOR;
        setMatchCelebration({label:s.longLabel, sublabel:s.sublabel||(s.state==="halved"?"½ pt each":"1 point"), color});
        if (celebTimer.current) clearTimeout(celebTimer.current);
        celebTimer.current = setTimeout(()=>setMatchCelebration(null), 1500);
      }
      prevMatchStates.current[m.id] = s.state;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(()=>{ try{if(currentPlayer)localStorage.setItem("jr_player",currentPlayer);else localStorage.removeItem("jr_player");}catch{} },[currentPlayer]);

  const todayDow = new Date().getDay();
  const dowToDay = {5:0, 6:1, 0:2};
  let autoDayIdx = dowToDay[todayDow]!==undefined ? dowToDay[todayDow] : -1;
  if (autoDayIdx===-1) {
    let best=0;
    for(let i=0;i<days.length;i++) if(days[i].matches.some(m=>m.scores.some(s=>s!==null))) best=i;
    autoDayIdx=best;
  }
  const todayDayIdx  = autoDayIdx; // the actual day index for today
  const boardDayIdx  = boardDayOverride!==null ? boardDayOverride : autoDayIdx;
  const boardDay     = days[boardDayIdx];
  const dayLabels    = ["FRIDAY","SATURDAY","SUNDAY"];
  const playerMatch  = currentPlayer ? findPlayerMatch(days,currentPlayer,todayDayIdx) : null;
  const isAdmin      = currentPlayer === "Geb";

  // Can a player open/edit a given match?
  // Rules: must be today's day AND (admin OR it's your own match)
  const canEdit = (dayIdx, matchId) => {
    if (isAdmin) return true;
    if (dayIdx !== todayDayIdx) return false;
    return playerMatch && playerMatch.dayIdx === dayIdx && playerMatch.matchId === matchId;
  };

  // Loading screen
  if (!loaded) return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"monospace",color:MUTED}}>
      <div style={{marginBottom:16}}>{CBS_LOGO_LG}</div>
      <div style={{fontSize:12,letterSpacing:3,animation:"pulse 1.5s infinite"}}>CONNECTING...</div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}*{box-sizing:border-box;margin:0;padding:0}`}</style>
    </div>
  );

  if (!currentPlayer) return <PlayerSelect onSelect={name=>{
    setCurrentPlayer(name);
    if (name === "Geb") return; // admin goes to scoreboard
    setTab("matches");
    const pm = findPlayerMatch(days, name, todayDayIdx);
    if (pm && pm.dayIdx === todayDayIdx) setActiveMatch(pm);
  }}/>;

  if (adminEditMatch) {
    const d=days[adminEditMatch.dayIdx];
    const m=d.matches.find(x=>x.id===adminEditMatch.matchId);
    return <AdminMatchEditor match={m} isSingles={!m.player1b} courseKey={d.courseKey}
      onSave={upd=>{updateMatch(adminEditMatch.dayIdx,upd);setAdminEditMatch(null);}}
      onClose={()=>setAdminEditMatch(null)}/>;
  }

  if (activeMatch) {
    const d=days[activeMatch.dayIdx];
    const m=d.matches.find(x=>x.id===activeMatch.matchId);
    return <HoleEntry match={m} isSingles={!m.player1b} courseKey={d.courseKey} onSave={upd=>updateMatch(activeMatch.dayIdx,upd)} onClose={()=>setActiveMatch(null)}/>;
  }

  const playerInfo = ALL_PLAYERS.find(p=>p.name===currentPlayer);
  const playerTeamColor = playerInfo?.team==="A" ? TEAM_A_COLOR : TEAM_B_COLOR;

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Arial Narrow','Arial',sans-serif",color:TEXT,paddingBottom:60}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes celebFade{to{opacity:0;pointer-events:none}}*{box-sizing:border-box;margin:0;padding:0}html,body{background:${BG};}`}</style>

      {/* Match completion celebration overlay */}
      {matchCelebration&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,background:matchCelebration.color,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"celebFade 0.3s ease 1.2s forwards",pointerEvents:"none"}}>
          <div style={{fontSize:42,fontWeight:900,color:"#fff",fontFamily:"monospace",letterSpacing:3,textAlign:"center",padding:"0 20px"}}>{matchCelebration.label}</div>
          <div style={{fontSize:22,color:"rgba(255,255,255,0.85)",fontFamily:"monospace",marginTop:10}}>{matchCelebration.sublabel}</div>
        </div>
      )}

      {/* Header */}
      <div style={{background:`linear-gradient(180deg,${CARD} 0%,${BG} 100%)`,borderBottom:`2px solid ${BORDER}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px 5px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {CBS_LOGO}
            <div>
              <div style={{fontSize:13,fontWeight:900,letterSpacing:1,color:"#fff"}}>CBS RYDER CUP 2026</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3}}>
            {liveCount>0&&<div style={{fontSize:9,color:"#4caf50",fontWeight:700,animation:"pulse 2s infinite",letterSpacing:1}}>● {liveCount} LIVE</div>}
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {offlineQueue.length>0&&<div style={{fontSize:8,color:"#f39c12",fontFamily:"monospace",fontWeight:700,whiteSpace:"nowrap"}}>⚡ Offline — {offlineQueue.length} pending</div>}
              {syncStatus==="synced"&&<div style={{fontSize:8,color:"#4caf50",fontFamily:"monospace",fontWeight:700}}>✓ Synced</div>}
              <button onClick={toggleTheme} title={theme==="dark"?"Switch to light mode":"Switch to dark mode"} style={{fontSize:14,background:"none",border:"none",cursor:"pointer",padding:"1px 4px",lineHeight:1}}>{theme==="dark"?"☀️":"🌙"}</button>
              <button onClick={()=>setCurrentPlayer(null)} style={{fontSize:9,padding:"3px 8px",background:`${playerTeamColor}22`,border:`1px solid ${playerTeamColor}55`,borderRadius:5,color:TEXT,cursor:"pointer",fontFamily:"monospace",whiteSpace:"nowrap"}}>
                👤 {currentPlayer} ✕
              </button>
            </div>
          </div>
        </div>

        {winner&&<div style={{background:`${GOLD}22`,borderTop:`1px solid ${GOLD}44`,borderBottom:`1px solid ${GOLD}44`,padding:"7px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:900,color:GOLD,letterSpacing:2}}>🏆 TEAM {winner} WINS THE CUP!</div></div>}

        {/* Big TV scoreboard */}
        <div style={{display:"flex",alignItems:"stretch"}}>
          <div style={{flex:1,background:TEAM_A_COLOR,padding:"8px 10px",display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0}}>
            <div style={{fontSize:10,fontWeight:900,color:"#ffcccc",letterSpacing:1,fontFamily:"monospace",lineHeight:1.2,wordBreak:"break-word"}}>{TEAM_A}</div>
            <div style={{fontSize:36,fontWeight:900,color:"#fff",fontFamily:"monospace",lineHeight:1,marginTop:2}}>{fmt(actualA)}</div>
          </div>
          <div style={{background:"#060d1e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"6px 8px",borderLeft:`1px solid ${BORDER}`,borderRight:`1px solid ${BORDER}`,flexShrink:0,minWidth:76}}>
            <div style={{fontSize:7,color:"#446",fontFamily:"monospace",letterSpacing:1,marginBottom:2}}>PROJECTED</div>
            <div style={{fontSize:10,fontWeight:700,fontFamily:"monospace",color:projA>projB?TEAM_A_COLOR:projB>projA?TEAM_B_DISP:"#557",whiteSpace:"nowrap"}}>{fmt(projA)}–{fmt(projB)}</div>
            {projWinner&&<div style={{fontSize:7,color:GOLD,fontFamily:"monospace",marginTop:2,whiteSpace:"nowrap"}}>→ {projWinner}</div>}
            <div style={{fontSize:7,color:"#335",marginTop:3,fontFamily:"monospace",whiteSpace:"nowrap"}}>WIN: {fmt(winTarget+0.5)}</div>
          </div>
          <div style={{flex:1,background:TEAM_B_COLOR,padding:"8px 10px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-end",minWidth:0}}>
            <div style={{fontSize:10,fontWeight:900,color:"#cce4ff",letterSpacing:1,fontFamily:"monospace",lineHeight:1.2,wordBreak:"break-word",textAlign:"right"}}>{TEAM_B}</div>
            <div style={{fontSize:36,fontWeight:900,color:"#fff",fontFamily:"monospace",lineHeight:1,marginTop:2}}>{fmt(actualB)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",background:CARD,borderBottom:`1px solid ${BORDER}`}}>
        {[["scoreboard","📊 BOARD"],["matches","⛳ MY MATCH"],...(isAdmin?[["admin","⚙️ ADMIN"]]:[]),["leaderboard","🏌️ SCORES"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:"11px 2px",background:"none",border:"none",borderBottom:tab===key?`2px solid ${GOLD}`:"2px solid transparent",color:tab===key?GOLD:MUTED,fontWeight:700,fontSize:9,letterSpacing:1,cursor:"pointer",fontFamily:"monospace"}}>{label}</button>
        ))}
      </div>

      <div style={{padding:"12px 10px 0"}}>
        {tab==="scoreboard"&&(
          <div>
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {days.map((d,i)=>(
                <button key={i} onClick={()=>setBoardDayOverride(i)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",background:boardDayIdx===i?`${TEAM_B_COLOR}55`:CARD2,borderBottom:boardDayIdx===i?`2px solid ${GOLD}`:"2px solid transparent",color:boardDayIdx===i?GOLD:"#446",fontWeight:700,fontSize:9,cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>{dayLabels[i]}</button>
              ))}
            </div>
            <TVDayBlock day={boardDay} onOpen={mid=>{
              if(canEdit(boardDayIdx,mid)){
                if(isAdmin) setAdminEditMatch({dayIdx:boardDayIdx,matchId:mid});
                else setActiveMatch({dayIdx:boardDayIdx,matchId:mid});
              }
            }} canEdit={(mid)=>canEdit(boardDayIdx,mid)}/>

            {/* Hole-by-hole match breakdowns */}
            <div style={{marginTop:16,marginBottom:4,fontSize:9,color:GOLD,fontFamily:"monospace",letterSpacing:2,opacity:0.7}}>
              HOLE BY HOLE
            </div>
            {boardDay.matches.map(m=>{
              const isSingles = !m.player1b;
              const st = computeMatchStatus(m.scores);
              const stColor = {pending:BORDER,live:"#4caf50",complete:st.leader==="A"?TEAM_A_COLOR:TEAM_B_COLOR,halved:"#557",gap:"#e67e22"}[st.state];
              const course = COURSES[boardDay.courseKey];
              let lead = 0;
              const runLeads = m.scores.map(s=>{
                if(s===null||s===undefined) return null;
                if(s==="A") lead++; else if(s==="B") lead--;
                return lead;
              });
              const grossP1a = Array.isArray(m.grossP1a)?m.grossP1a:Array(18).fill(null);
              const grossP1b = Array.isArray(m.grossP1b)?m.grossP1b:Array(18).fill(null);
              const grossP2a = Array.isArray(m.grossP2a)?m.grossP2a:Array(18).fill(null);
              const grossP2b = Array.isArray(m.grossP2b)?m.grossP2b:Array(18).fill(null);
              const holesPlayed = m.scores.filter(s=>s!==null).length;

              // Score value display with golf notation colours
              const scoreStyle = (gross, par) => {
                if(gross===null) return {val:"·", color:"#334", bg:"transparent", border:"none", radius:2};
                const d = gross - par;
                if(d<=-2) return {val:gross, color:"#FFD700", bg:"transparent", border:`1.5px double #FFD700`, radius:2};
                if(d===-1) return {val:gross, color:"#4caf50", bg:"transparent", border:`1.5px solid #4caf50`, radius:"50%"};
                if(d===0)  return {val:gross, color:"#ccd",    bg:"transparent", border:"none", radius:2};
                if(d===1)  return {val:gross, color:"#e88",    bg:"transparent", border:`1.5px solid #e88`, radius:2};
                if(d===2)  return {val:gross, color:"#e55",    bg:"transparent", border:`1.5px solid #e55`, radius:2};
                return           {val:gross, color:"#fff",    bg:"#c0392b",     border:"none", radius:2};
              };

              // Row labels — changes based on singles vs fourballs
              const rowLabels = isSingles
                ? [m.player1a, "SCORE", m.player2a]
                : [m.player1a, m.player1b, "SCORE", m.player2a, m.player2b];

              const rowData = (holeIdx) => {
                const par = course.par[holeIdx];
                const s = m.scores[holeIdx];
                const rl = runLeads[holeIdx];
                const arrowColor = s==="A"?TEAM_A_COLOR:s==="B"?TEAM_B_DISP:s==="H"?"#557":"#334";

                // Big arrow with number inside for the SCORE row
                let scoreCell;
                if (s===null||s===undefined) {
                  scoreCell = {val:<div style={{fontSize:9,color:"#334"}}>·</div>, isScore:true};
                } else if (s==="H") {
                  scoreCell = {val:<div style={{fontSize:11,fontWeight:900,color:"#557"}}>—</div>, isScore:true};
                } else {
                  const num = rl===null?0:Math.abs(rl);
                  const isA = s==="A";
                  const col = isA?TEAM_A_COLOR:TEAM_B_DISP;
                  // If the hole was won but score is back to AS, just show a dash
                  if (num === 0) {
                    scoreCell = {val:<div style={{fontSize:11,fontWeight:900,color:"#557"}}>—</div>, isScore:true};
                  } else {
                  // Triangle pointing up (A wins) or down (B wins) with number inside
                  scoreCell = {val:(
                    <div style={{position:"relative",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
                      <div style={{
                        width:0, height:0,
                        borderLeft:"13px solid transparent",
                        borderRight:"13px solid transparent",
                        ...(isA
                          ? {borderBottom:`26px solid ${col}`}
                          : {borderTop:`26px solid ${col}`}
                        ),
                        position:"absolute", top:0, left:0
                      }}/>
                      <span style={{position:"relative",zIndex:1,fontSize:10,fontWeight:900,color:"#fff",marginTop:isA?6:-6}}>{num}</span>
                    </div>
                  ), isScore:true};
                  }
                }

                if(isSingles) return [
                  scoreStyle(grossP1a[holeIdx], par),
                  scoreCell,
                  scoreStyle(grossP2a[holeIdx], par),
                ];
                return [
                  scoreStyle(grossP1a[holeIdx], par),
                  scoreStyle(grossP1b[holeIdx], par),
                  scoreCell,
                  scoreStyle(grossP2a[holeIdx], par),
                  scoreStyle(grossP2b[holeIdx], par),
                ];
              };

              const rowColors = isSingles
                ? [TEAM_A_COLOR, null, TEAM_B_DISP]
                : [TEAM_A_COLOR, TEAM_A_COLOR, null, TEAM_B_DISP, TEAM_B_DISP];

              return (
                <div key={m.id} style={{marginBottom:14,background:CARD,borderRadius:10,border:`1px solid ${stColor}44`,overflow:"hidden"}}>
                  {/* Match header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"#060f22",borderBottom:`1px solid ${BORDER}`}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:TEAM_A_COLOR}}>{isSingles?m.player1a:`${m.player1a} & ${m.player1b}`}</div>
                      <div style={{fontSize:8,color:TEAM_A_COLOR,opacity:0.6,fontFamily:"monospace"}}>{TEAM_A_SHORT}</div>
                    </div>
                    <div style={{fontSize:10,fontWeight:800,color:stColor,fontFamily:"monospace",textAlign:"center",flex:1,padding:"0 8px"}}>{st.longLabel}{st.sublabel?` · ${st.sublabel}`:""}</div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:11,fontWeight:700,color:TEAM_B_DISP}}>{isSingles?m.player2a:`${m.player2a} & ${m.player2b}`}</div>
                      <div style={{fontSize:8,color:TEAM_B_DISP,opacity:0.6,fontFamily:"monospace"}}>{TEAM_B_SHORT}</div>
                    </div>
                  </div>

                  {/* Vertical column layout — scroll horizontally */}
                  <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                    <table style={{borderCollapse:"collapse",fontSize:11}}>
                      <thead>
                        <tr style={{background:"#080f20",borderBottom:`1px solid ${BORDER}`}}>
                          {/* Row label column */}
                          <td style={{padding:"5px 10px",fontSize:8,color:"#446",fontFamily:"monospace",whiteSpace:"nowrap",minWidth:70,position:"sticky",left:0,background:"#080f20",zIndex:1}}>
                          </td>
                          {/* Hole number columns */}
                          {Array.from({length:18},(_,i)=>(
                            <td key={i} style={{textAlign:"center",padding:"5px 4px",fontSize:8,color:"#668",fontFamily:"monospace",minWidth:34,borderLeft:i===9?`1px solid ${BORDER}`:undefined,fontWeight:i===9||i===0?"800":"400"}}>
                              {i+1}{(m.disputes||[]).includes(i)?<span style={{color:"#e55",fontSize:7,marginLeft:1}}>🚩</span>:null}
                            </td>
                          ))}
                        </tr>
                        <tr style={{background:"#080f20",borderBottom:`2px solid ${BORDER}`}}>
                          <td style={{padding:"4px 10px",fontSize:8,color:"#446",fontFamily:"monospace",whiteSpace:"nowrap",position:"sticky",left:0,background:"#080f20",zIndex:1}}>PAR</td>
                          {course.par.map((parNum,i)=>(
                            <td key={i} style={{textAlign:"center",padding:"4px 4px",fontSize:9,color:"#557",fontFamily:"monospace",fontWeight:700,borderLeft:i===9?`1px solid ${BORDER}`:undefined}}>{parNum}</td>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rowLabels.map((label,ri)=>{
                          const isScoreRow = label==="SCORE";
                          const nameColor = rowColors[ri];
                          return (
                            <tr key={ri} style={{borderBottom:`1px solid ${BORDER}22`,background:isScoreRow?"#060f22":ri%2===0?CARD:CARD2}}>
                              {/* Sticky label column */}
                              <td style={{padding:"6px 10px",fontSize:isScoreRow?8:11,fontWeight:700,color:isScoreRow?"#446":nameColor,whiteSpace:"nowrap",position:"sticky",left:0,background:isScoreRow?"#060f22":ri%2===0?CARD:CARD2,zIndex:1,fontFamily:isScoreRow?"monospace":"inherit",letterSpacing:isScoreRow?1:0}}>
                                {label}
                              </td>
                              {/* Data cells */}
                              {Array.from({length:18},(_,hi)=>{
                                const d = rowData(hi);
                                const cell = d[ri];
                                return (
                                  <td key={hi} style={{textAlign:"center",padding:"4px 2px",borderLeft:hi===9?`1px solid ${BORDER}`:undefined}}>
                                    {isScoreRow ? (
                                      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:30}}>{cell.val}</div>
                                    ) : (
                                      <div style={{width:24,height:24,background:cell.bg,border:cell.border,borderRadius:cell.radius,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:cell.color,margin:"0 auto"}}>
                                        {cell.val}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab==="matches"&&(
          <div>
            {playerMatch?(()=>{
              const d=days[playerMatch.dayIdx];
              const m=d.matches.find(x=>x.id===playerMatch.matchId);
              const s=computeMatchStatus(m.scores);
              const isSingles=!m.player1b;
              const stateColor={pending:BORDER,live:"#4caf50",complete:s.leader==="A"?TEAM_A_COLOR:TEAM_B_COLOR,halved:"#557"}[s.state];
              const matchEditable = canEdit(playerMatch.dayIdx, playerMatch.matchId);
              return (
                <div>
                  <div style={{fontSize:9,color:GOLD,fontFamily:"monospace",letterSpacing:2,marginBottom:10,opacity:0.8}}>{d.label.toUpperCase()} · {m.teeTime!=="TBD"?m.teeTime:""}</div>
                  <div style={{borderRadius:12,overflow:"hidden",border:`1px solid ${stateColor}44`,marginBottom:14}}>
                    <div style={{display:"flex",background:"#080f20",borderBottom:`1px solid ${BORDER}`,padding:"6px 10px",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{fontSize:9,color:"#446",fontFamily:"monospace"}}>{d.format.toUpperCase()}</div>
                      <div style={{fontSize:10,fontWeight:800,color:stateColor,fontFamily:"monospace"}}>{s.longLabel}</div>
                    </div>
                    <TVMatchRow match={m} isSingles={!m.player1b} onOpen={()=>{}} canEdit={false}/>
                  </div>
                  {matchEditable ? (
                    <button onClick={()=>setActiveMatch(playerMatch)} style={{width:"100%",padding:"16px",background:`linear-gradient(135deg,${TEAM_B_COLOR},${TEAM_B_DISP}66)`,border:`1px solid ${TEAM_B_COLOR}`,borderRadius:14,color:"#fff",fontWeight:900,fontSize:16,cursor:"pointer",letterSpacing:1,fontFamily:"monospace",boxShadow:`0 4px 20px ${TEAM_B_COLOR}44`,marginBottom:10}}>
                      ⛳ ENTER SCORES
                    </button>
                  ) : (
                    <div style={{textAlign:"center",padding:"12px",background:CARD2,borderRadius:12,marginBottom:10,border:`1px solid ${BORDER}`}}>
                      <div style={{fontSize:11,color:"#446",fontFamily:"monospace"}}>
                        🔒 Score entry opens on {dayLabels[playerMatch.dayIdx]}
                      </div>
                    </div>
                  )}
                  <div style={{fontSize:10,color:"#446",textAlign:"center",fontFamily:"monospace"}}>{doneMatches}/{totalMatches} matches complete</div>
                </div>
              );
            })():(
              <div style={{textAlign:"center",padding:"40px 20px",color:"#446"}}>
                <div style={{fontSize:24,marginBottom:10}}>🏌️</div>
                <div style={{fontSize:13}}>You're not in a match yet.</div>
                <div style={{fontSize:11,marginTop:6,color:"#335"}}>Check back when the pairings are set.</div>
              </div>
            )}
          </div>
        )}

        {tab==="admin"&&isAdmin&&<AdminSection days={days}/>}

        {tab==="leaderboard"&&(()=>{
          const lbDay = days[boardDayIdx];
          const course = COURSES[lbDay.courseKey];
          // Build one row per player
          const playerRows = [];
          for (const m of lbDay.matches) {
            const isSingles = !m.player1b;
            const players = isSingles
              ? [{name:m.player1a,gross:m.grossP1a,team:"A"},{name:m.player2a,gross:m.grossP2a,team:"B"}]
              : [
                  {name:m.player1a,gross:m.grossP1a,team:"A"},
                  {name:m.player1b,gross:m.grossP1b,team:"A"},
                  {name:m.player2a,gross:m.grossP2a,team:"B"},
                  {name:m.player2b,gross:m.grossP2b,team:"B"},
                ];
            for (const player of players) {
              if (!player.name || player.name.startsWith("Player ")) continue;
              const grossArr = Array.isArray(player.gross) ? player.gross : Array(18).fill(null);
              let total = 0, toPar = 0, holesPlayed = 0;
              for (let i = 0; i < 18; i++) {
                if (grossArr[i] !== null) {
                  total += grossArr[i];
                  toPar += grossArr[i] - course.par[i];
                  holesPlayed++;
                }
              }
              playerRows.push({ name:player.name, team:player.team, gross:grossArr, total, toPar, holesPlayed, teeTime:m.teeTime });
            }
          }

          // Split into started and not-started
          const startedRows = playerRows.filter(r => r.holesPlayed > 0);
          const notStartedRows = playerRows.filter(r => r.holesPlayed === 0);

          // Sort started: most holes played first, then lowest toPar
          startedRows.sort((a,b) => {
            if (b.holesPlayed !== a.holesPlayed) return b.holesPlayed - a.holesPlayed;
            return a.toPar - b.toPar;
          });

          // Sort not-started by tee time
          notStartedRows.sort((a,b) => (a.teeTime||"").localeCompare(b.teeTime||""));

          // Assign positions (tied players share position)
          let pos = 1;
          for (let i = 0; i < startedRows.length; i++) {
            if (i > 0 && startedRows[i].toPar === startedRows[i-1].toPar && startedRows[i].holesPlayed === startedRows[i-1].holesPlayed) {
              startedRows[i].pos = "T" + pos;
              startedRows[i-1].pos = "T" + pos;
            } else {
              pos = i + 1;
              startedRows[i].pos = String(pos);
            }
          }

          const fmtToPar = (n, played) => {
            if (played === 0) return "—";
            if (n === 0) return "E";
            return n > 0 ? `+${n}` : `${n}`;
          };
          const toParColor = (n, played) => {
            if (played === 0) return "#446";
            if (n < 0) return "#4caf50";
            if (n === 0) return "#ccd";
            if (n <= 2) return "#e88";
            return "#c0392b";
          };

          // Score notation for individual holes
          const HoleScore = ({gross, par}) => {
            if (gross === null) return <div style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#335"}}>·</div>;
            const diff = gross - par;
            if (diff <= -2) return (
              <div style={{position:"relative",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{position:"absolute",width:22,height:22,borderRadius:"50%",border:"1.5px solid #FFD700"}}/>
                <div style={{position:"absolute",width:15,height:15,borderRadius:"50%",border:"1.5px solid #FFD700"}}/>
                <span style={{fontSize:9,fontWeight:900,color:"#FFD700",zIndex:1}}>{gross}</span>
              </div>
            );
            if (diff === -1) return (
              <div style={{position:"relative",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{position:"absolute",width:22,height:22,borderRadius:"50%",border:"1.5px solid #4caf50"}}/>
                <span style={{fontSize:9,fontWeight:900,color:"#4caf50",zIndex:1}}>{gross}</span>
              </div>
            );
            if (diff === 0) return <div style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#ccd"}}>{gross}</div>;
            if (diff === 1) return (
              <div style={{position:"relative",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{position:"absolute",width:22,height:22,border:"1.5px solid #e88",borderRadius:2}}/>
                <span style={{fontSize:9,fontWeight:900,color:"#e88",zIndex:1}}>{gross}</span>
              </div>
            );
            if (diff === 2) return (
              <div style={{position:"relative",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <div style={{position:"absolute",width:22,height:22,border:"1.5px solid #e55",borderRadius:2}}/>
                <div style={{position:"absolute",width:15,height:15,border:"1.5px solid #e55",borderRadius:1}}/>
                <span style={{fontSize:9,fontWeight:900,color:"#e55",zIndex:1}}>{gross}</span>
              </div>
            );
            return <div style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",background:"#c0392b",borderRadius:2,fontSize:9,fontWeight:900,color:"#fff"}}>{gross}</div>;
          };

          return (
            <div style={{paddingBottom:30}}>
              {/* Day selector */}
              <div style={{display:"flex",gap:6,marginBottom:12}}>
                {days.map((d,i)=>(
                  <button key={i} onClick={()=>setBoardDayOverride(i)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",background:boardDayIdx===i?`${TEAM_B_COLOR}55`:CARD2,borderBottom:boardDayIdx===i?`2px solid ${GOLD}`:"2px solid transparent",color:boardDayIdx===i?GOLD:"#446",fontWeight:700,fontSize:9,cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>{dayLabels[i]}</button>
                ))}
              </div>
              <div style={{fontSize:9,color:GOLD,fontFamily:"monospace",letterSpacing:2,marginBottom:10,opacity:0.7}}>
                {lbDay.label.toUpperCase()} · INDIVIDUAL SCORES
              </div>

              {startedRows.length === 0 && notStartedRows.length === 0 ? (
                <div style={{textAlign:"center",padding:"40px 20px",color:"#446"}}>
                  <div style={{fontSize:24,marginBottom:8}}>⛳</div>
                  <div style={{fontSize:12}}>No scores entered yet</div>
                </div>
              ) : (
                <div>
                {startedRows.length > 0 && <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                  <table style={{borderCollapse:"collapse",width:"100%",minWidth:640,background:CARD,borderRadius:10,overflow:"hidden",border:`1px solid ${BORDER}`}}>
                    <thead>
                      {/* Hole number row */}
                      <tr style={{background:"#060f22"}}>
                        <td style={{width:28,padding:"5px 6px",fontSize:8,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>POS</td>
                        <td style={{padding:"5px 8px",fontSize:8,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>PLAYER</td>
                        {Array.from({length:9},(_,i)=>(
                          <td key={i} style={{width:24,textAlign:"center",padding:"3px 1px",fontSize:8,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>{i+1}</td>
                        ))}
                        <td style={{width:28,textAlign:"center",padding:"3px 2px",fontSize:8,color:"#668",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>OUT</td>
                        {Array.from({length:9},(_,i)=>(
                          <td key={i+9} style={{width:24,textAlign:"center",padding:"3px 1px",fontSize:8,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>{i+10}</td>
                        ))}
                        <td style={{width:28,textAlign:"center",padding:"3px 2px",fontSize:8,color:"#668",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>IN</td>
                        <td style={{width:36,textAlign:"center",padding:"3px 4px",fontSize:8,color:GOLD,fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>TOT</td>
                        <td style={{width:40,textAlign:"center",padding:"3px 4px",fontSize:8,color:GOLD,fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>TO PAR</td>
                      </tr>
                      {/* Par row */}
                      <tr style={{background:"#080f20"}}>
                        <td style={{padding:"3px 6px",fontSize:7,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}></td>
                        <td style={{padding:"3px 8px",fontSize:7,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>PAR</td>
                        {Array.from({length:9},(_,i)=>(
                          <td key={i} style={{textAlign:"center",padding:"3px 1px",fontSize:8,color:"#668",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>{course.par[i]}</td>
                        ))}
                        <td style={{textAlign:"center",padding:"3px 2px",fontSize:8,color:"#668",fontFamily:"monospace",fontWeight:700,borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>{course.par.slice(0,9).reduce((a,b)=>a+b,0)}</td>
                        {Array.from({length:9},(_,i)=>(
                          <td key={i+9} style={{textAlign:"center",padding:"3px 1px",fontSize:8,color:"#668",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>{course.par[i+9]}</td>
                        ))}
                        <td style={{textAlign:"center",padding:"3px 2px",fontSize:8,color:"#668",fontFamily:"monospace",fontWeight:700,borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>{course.par.slice(9).reduce((a,b)=>a+b,0)}</td>
                        <td style={{textAlign:"center",padding:"3px 4px",fontSize:8,color:"#668",fontFamily:"monospace",fontWeight:700,borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>{course.par.reduce((a,b)=>a+b,0)}</td>
                        <td style={{borderBottom:`1px solid ${BORDER}`}}></td>
                      </tr>
                    </thead>
                    <tbody>
                      {startedRows.map((row,ri)=>{
                        const outTotal = row.gross.slice(0,9).some(g=>g!==null) ? row.gross.slice(0,9).reduce((a,g)=>a+(g||0),0) : null;
                        const inTotal  = row.gross.slice(9).some(g=>g!==null)   ? row.gross.slice(9).reduce((a,g)=>a+(g||0),0)  : null;
                        const outPlayed = row.gross.slice(0,9).filter(g=>g!==null).length;
                        const inPlayed  = row.gross.slice(9).filter(g=>g!==null).length;
                        return (
                          <tr key={row.name} style={{background:ri%2===0?CARD:CARD2,borderBottom:`1px solid ${BORDER}33`}}>
                            <td style={{padding:"8px 6px",fontSize:10,fontWeight:800,color:"#446",fontFamily:"monospace",whiteSpace:"nowrap"}}>{row.pos}</td>
                            <td style={{padding:"8px 8px",minWidth:80}}>
                              <div style={{fontSize:12,fontWeight:700,color:row.team==="A"?TEAM_A_COLOR:TEAM_B_DISP,whiteSpace:"nowrap"}}>{row.name}</div>
                            </td>
                            {Array.from({length:9},(_,i)=>(
                              <td key={i} style={{textAlign:"center",padding:"4px 1px"}}>
                                <HoleScore gross={row.gross[i]} par={course.par[i]}/>
                              </td>
                            ))}
                            <td style={{textAlign:"center",padding:"4px 2px",borderLeft:`1px solid ${BORDER}`,fontSize:11,fontWeight:700,color:outPlayed>0?toParColor(row.gross.slice(0,9).reduce((a,g)=>a+(g||0),0)-course.par.slice(0,outPlayed).reduce((a,b)=>a+b,0),outPlayed):"#446",fontFamily:"monospace"}}>
                              {outPlayed>0?outTotal:"—"}
                            </td>
                            {Array.from({length:9},(_,i)=>(
                              <td key={i+9} style={{textAlign:"center",padding:"4px 1px"}}>
                                <HoleScore gross={row.gross[i+9]} par={course.par[i+9]}/>
                              </td>
                            ))}
                            <td style={{textAlign:"center",padding:"4px 2px",borderLeft:`1px solid ${BORDER}`,fontSize:11,fontWeight:700,color:inPlayed>0?toParColor(row.gross.slice(9,9+inPlayed).reduce((a,g)=>a+(g||0),0)-course.par.slice(9,9+inPlayed).reduce((a,b)=>a+b,0),inPlayed):"#446",fontFamily:"monospace"}}>
                              {inPlayed>0?inTotal:"—"}
                            </td>
                            <td style={{textAlign:"center",padding:"4px 4px",borderLeft:`1px solid ${BORDER}`,fontSize:12,fontWeight:700,color:row.holesPlayed>0?"#ccd":"#446",fontFamily:"monospace"}}>
                              {row.holesPlayed>0?row.total:"—"}
                            </td>
                            <td style={{textAlign:"center",padding:"4px 4px",fontSize:13,fontWeight:900,color:toParColor(row.toPar,row.holesPlayed),fontFamily:"monospace"}}>
                              {fmtToPar(row.toPar,row.holesPlayed)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>}
                {notStartedRows.length > 0 && (
                  <div style={{marginTop: startedRows.length > 0 ? 14 : 0}}>
                    <div style={{fontSize:8,color:"#446",fontFamily:"monospace",letterSpacing:2,marginBottom:6,paddingLeft:2}}>NOT STARTED</div>
                    {notStartedRows.map((row,ri)=>(
                      <div key={row.name} style={{display:"flex",alignItems:"center",padding:"9px 12px",background:ri%2===0?CARD:CARD2,borderBottom:`1px solid ${BORDER}33`,borderRadius:ri===0?"8px 8px 0 0":ri===notStartedRows.length-1?"0 0 8px 8px":0}}>
                        <div style={{fontSize:10,color:"#334",fontFamily:"monospace",marginRight:10,minWidth:36}}>🕐</div>
                        <div style={{fontSize:13,fontWeight:700,color:row.team==="A"?TEAM_A_COLOR:TEAM_B_DISP,flex:1}}>{row.name}</div>
                        <div style={{fontSize:11,color:"#446",fontFamily:"monospace"}}>{row.teeTime&&row.teeTime!=="TBD"?row.teeTime:"TBD"}</div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
