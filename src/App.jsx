import { useState, useEffect, useRef } from "react";
import { db, ref, onValue, set } from "./firebase.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const TEAM_A       = "GABBY'S INTERNS";
const TEAM_A_SHORT = "INTERNS";
const TEAM_B       = "TIGERS DD'S";
const TEAM_B_SHORT = "TIGERS";
const TEAM_A_COLOR = "#C8102E";
const TEAM_B_COLOR = "#003087";
const TEAM_B_DISP  = "#4A90D9";
const GOLD         = "#C4A44A";
const BG           = "#040d1c";
const CARD         = "#08142b";
const CARD2        = "#0b1a35";
const BORDER       = "#0e2448";

const COURSES = {
  day1: {
    name: "The Links Course",
    par: [5,4,4,3,5,4,4,3,4, 4,4,3,4,5,4,3,4,5],
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
];

const initialDays = [
  {
    day:1, courseKey:"day1", label:"Friday — Fourballs", format:"Fourballs",
    matches:[
      {id:101,teeTime:"11:10",player1a:"Gabe",  hcp1a:0,player1b:"Naman",   hcp1b:0,player2a:"Henry",  hcp2a:0,player2b:"Spencer", hcp2b:0,scores:mkScores()},
      {id:102,teeTime:"11:15",player1a:"Logan", hcp1a:0,player1b:"Tyler T.",hcp1b:0,player2a:"Geb",    hcp2a:0,player2b:"Tony",    hcp2b:0,scores:mkScores()},
      {id:103,teeTime:"11:20",player1a:"Colin", hcp1a:0,player1b:"Ian",     hcp1b:0,player2a:"Sam",    hcp2a:0,player2b:"Ryan",    hcp2b:0,scores:mkScores()},
      {id:104,teeTime:"11:30",player1a:"Hunter",hcp1a:0,player1b:"Tim",     hcp1b:0,player2a:"Jake",   hcp2a:0,player2b:"Destin",  hcp2b:0,scores:mkScores()},
      {id:105,teeTime:"11:40",player1a:"Clark", hcp1a:0,player1b:"Sushil",  hcp1b:0,player2a:"Russell",hcp2a:0,player2b:"Tyler S.",hcp2b:0,scores:mkScores()},
    ]
  },
  {
    day:2, courseKey:"day2", label:"Saturday — Fourballs", format:"Fourballs",
    matches:[
      {id:201,teeTime:"11:10",player1a:"Ian",     hcp1a:0,player1b:"Hunter", hcp1b:0,player2a:"Henry",   hcp2a:0,player2b:"Russell", hcp2b:0,scores:mkScores()},
      {id:202,teeTime:"11:20",player1a:"Gabe",    hcp1a:0,player1b:"Tim",    hcp1b:0,player2a:"Geb",     hcp2a:0,player2b:"Ryan",    hcp2b:0,scores:mkScores()},
      {id:203,teeTime:"11:30",player1a:"Naman",   hcp1a:0,player1b:"Sushil", hcp1b:0,player2a:"Tony",    hcp2a:0,player2b:"Jake",    hcp2b:0,scores:mkScores()},
      {id:204,teeTime:"11:40",player1a:"Logan",   hcp1a:0,player1b:"Clark",  hcp1b:0,player2a:"Sam",     hcp2a:0,player2b:"Destin",  hcp2b:0,scores:mkScores()},
      {id:205,teeTime:"11:50",player1a:"Tyler T.",hcp1a:0,player1b:"Colin",  hcp1b:0,player2a:"Tyler S.",hcp2a:0,player2b:"Spencer", hcp2b:0,scores:mkScores()},
    ]
  },
  {
    day:3, courseKey:"day3", label:"Sunday Singles", format:"Singles",
    matches:[
      {id:301,teeTime:"10:40",player1a:"Gabe",    hcp1a:0,player1b:null,hcp1b:0,player2a:"Spencer", hcp2a:0,player2b:null,hcp2b:0,scores:mkScores()},
      {id:302,teeTime:"10:40",player1a:"Hunter",  hcp1a:0,player1b:null,hcp1b:0,player2a:"Ryan",    hcp2a:0,player2b:null,hcp2b:0,scores:mkScores()},
      {id:303,teeTime:"10:48",player1a:"Naman",   hcp1a:0,player1b:null,hcp1b:0,player2a:"Henry",   hcp2a:0,player2b:null,hcp2b:0,scores:mkScores()},
      {id:304,teeTime:"10:48",player1a:"Ian",     hcp1a:0,player1b:null,hcp1b:0,player2a:"Tony",    hcp2a:0,player2b:null,hcp2b:0,scores:mkScores()},
      {id:305,teeTime:"10:56",player1a:"Tyler T.",hcp1a:0,player1b:null,hcp1b:0,player2a:"Geb",     hcp2a:0,player2b:null,hcp2b:0,scores:mkScores()},
      {id:306,teeTime:"10:56",player1a:"Logan",   hcp1a:0,player1b:null,hcp1b:0,player2a:"Sam",     hcp2a:0,player2b:null,hcp2b:0,scores:mkScores()},
      {id:307,teeTime:"11:04",player1a:"Clark",   hcp1a:0,player1b:null,hcp1b:0,player2a:"Tyler S.",hcp2a:0,player2b:null,hcp2b:0,scores:mkScores()},
      {id:308,teeTime:"11:04",player1a:"Sushil",  hcp1a:0,player1b:null,hcp1b:0,player2a:"Destin",  hcp2a:0,player2b:null,hcp2b:0,scores:mkScores()},
      {id:309,teeTime:"11:12",player1a:"Tim",     hcp1a:0,player1b:null,hcp1b:0,player2a:"Jake",    hcp2a:0,player2b:null,hcp2b:0,scores:mkScores()},
    ]
  }
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function findPlayerMatch(days, playerName) {
  for (let di = 0; di < days.length; di++) {
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
  for (let i = 0; i < 18; i++) {
    const s = scores[i];
    if (s === null || s === undefined) break;
    holesPlayed++;
    if (s === "A") lead++; else if (s === "B") lead--;
  }
  const rem = 18 - holesPlayed;
  const abs = Math.abs(lead);
  const leader = lead > 0 ? "A" : lead < 0 ? "B" : null;
  const lName  = leader === "A" ? TEAM_A_SHORT : leader === "B" ? TEAM_B_SHORT : null;
  if (holesPlayed === 0) return {shortLabel:"—",longLabel:"Not Started",sublabel:"",state:"pending",leader:null,up:0,holesPlayed,lead};
  if (abs > rem)         return {shortLabel:`${abs}&${rem}`,longLabel:`${lName} WIN`,sublabel:`${abs}&${rem}`,state:"complete",leader,up:abs,holesPlayed,lead};
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
    else if (s.state==="live")   { s.leader==="A"?pA++:s.leader==="B"?pB++:(pA+=.5,pB+=.5); }
  }
  return {actualA:aA,actualB:aB,projA:pA,projB:pB};
}

function computeDayPoints(day) {
  let a=0,b=0,pA=0,pB=0;
  for (const m of day.matches) {
    const s = computeMatchStatus(m.scores);
    if (s.state==="complete")    { s.leader==="A"?(a++,pA++):(b++,pB++); }
    else if (s.state==="halved") { a+=.5;b+=.5;pA+=.5;pB+=.5; }
    else if (s.state==="live")   { s.leader==="A"?pA++:s.leader==="B"?pB++:(pA+=.5,pB+=.5); }
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
      <div style={{flex:1,overflowY:"auto",padding:"16px 14px 40px"}}>
        {[{team:"A",players:teamA,color:TEAM_A_COLOR,label:TEAM_A},{team:"B",players:teamB,color:TEAM_B_COLOR,label:TEAM_B}].map(({team,players,color,label})=>(
          <div key={team} style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,paddingBottom:8,borderBottom:`1px solid ${BORDER}`}}>
              <div style={{width:4,height:20,background:color,borderRadius:2}}/>
              <div style={{fontSize:11,fontWeight:800,color:team==="A"?color:TEAM_B_DISP,letterSpacing:2,fontFamily:"monospace"}}>{label}</div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {players.map(p=>(
                <button key={p.name} onClick={()=>onSelect(p.name)} style={{padding:"14px 10px",background:CARD,border:`1px solid ${color}44`,borderRadius:10,color:"#dde",fontSize:14,fontWeight:700,cursor:"pointer",textAlign:"center",fontFamily:"'Arial Narrow','Arial',sans-serif"}}>
                  {p.name}
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
function ScoreInput({ label, hcp, value, onChange, color, labelColor }) {
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
      <div style={{fontSize:11,fontWeight:700,color:labelColor||color,fontFamily:"monospace",textAlign:"center",maxWidth:90,lineHeight:1.2}}>
        {labelColor ? `★ ${label}` : label}
      </div>
      {hcp>0&&<div style={{fontSize:9,color:GOLD,fontFamily:"monospace"}}>HCP {hcp}</div>}
      <div style={{display:"flex",alignItems:"center"}}>
        <button onClick={()=>onChange(Math.max(1,value-1))} style={{width:34,height:42,fontSize:20,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"7px 0 0 7px",color:"#8aa",cursor:"pointer"}}>−</button>
        <div style={{width:48,height:42,background:BG,border:`1px solid ${BORDER}`,borderTop:`3px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:900,color:"#fff",fontFamily:"monospace"}}>{value}</div>
        <button onClick={()=>onChange(Math.min(12,value+1))} style={{width:34,height:42,fontSize:20,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"0 7px 7px 0",color:"#8aa",cursor:"pointer"}}>+</button>
      </div>
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
  const [grossScores,setGrossScores] = useState(
    ()=>Array.from({length:18},(_,i)=>{ const p=course.par[i]; return {p1a:p,p1b:p,p2a:p,p2b:p}; })
  );

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
    onSave({...match,scores:ns});
    if(hole<17){
      const nextPar=course.par[hole+1];
      setHole(h=>h+1);
      setGrossScores(prev=>{const next=[...prev];next[hole+1]={p1a:nextPar,p1b:nextPar,p2a:nextPar,p2b:nextPar};return next;});
    }
  };
  const handleUndo=()=>{
    if(hole===0)return;
    const ns=[...match.scores]; ns[hole-1]=null;
    onSave({...match,scores:ns});
    setHole(h=>h-1);
    const prevPar=course.par[hole-1];
    setGrossScores(prev=>{const next=[...prev];next[hole-1]={p1a:prevPar,p1b:prevPar,p2a:prevPar,p2b:prevPar};return next;});
  };

  const cur=computeMatchStatus(match.scores);
  const isComplete=cur.state==="complete"||cur.state==="halved";
  let runLead=0;
  for(let i=0;i<hole;i++){if(match.scores[i]==="A")runLead++;else if(match.scores[i]==="B")runLead--;}
  const runAbs=Math.abs(runLead);
  const runLeader=runLead>0?"A":runLead<0?"B":null;
  const strokeReceivers=[];
  if((match.hcp1a||0)>0&&holeHcp<=(match.hcp1a||0))strokeReceivers.push(match.player1a);
  if(!isSingles&&(match.hcp1b||0)>0&&holeHcp<=(match.hcp1b||0))strokeReceivers.push(match.player1b);
  if((match.hcp2a||0)>0&&holeHcp<=(match.hcp2a||0))strokeReceivers.push(match.player2a);
  if(!isSingles&&(match.hcp2b||0)>0&&holeHcp<=(match.hcp2b||0))strokeReceivers.push(match.player2b);

  return (
    <div style={{position:"fixed",inset:0,background:BG,zIndex:200,display:"flex",flexDirection:"column",overflowY:"auto"}}>
      {showHcp&&<HcpModal match={match} isSingles={isSingles} onSave={v=>{onSave({...match,...v});setShowHcp(false);}} onClose={()=>setShowHcp(false)}/>}
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
      {/* Hole strip */}
      <div style={{padding:"8px 10px 0",display:"flex",gap:2}}>
        {Array.from({length:18},(_,i)=>{
          const s=match.scores[i];
          const bg=s==="A"?TEAM_A_COLOR:s==="B"?TEAM_B_COLOR:s==="H"?"#334":CARD2;
          const isAct=i===hole;
          return <div key={i} onClick={()=>setHole(i)} style={{flex:1,height:isAct?26:20,background:bg,borderRadius:3,cursor:"pointer",border:isAct?`2px solid ${GOLD}`:"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:isAct?8:7,color:isAct?"#fff":"#ffffff99",fontFamily:"monospace",fontWeight:700,transition:"all .12s"}}>{i+1}</div>;
        })}
      </div>
      <div style={{textAlign:"center",fontSize:8,color:"#335",fontFamily:"monospace",marginTop:2}}>{match.scores.filter(s=>s!==null).length}/18 holes complete</div>
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
      <div style={{flex:1,padding:"12px 12px 0"}}>
          <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:12,padding:"10px",background:CARD,borderRadius:12,border:`1px solid ${BORDER}`}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:8,color:"#446",fontFamily:"monospace",letterSpacing:2}}>HOLE</div><div style={{fontSize:28,fontWeight:900,color:GOLD,fontFamily:"monospace",lineHeight:1}}>{hole+1}</div></div>
            <div style={{width:1,background:BORDER}}/>
            <div style={{textAlign:"center"}}><div style={{fontSize:8,color:"#446",fontFamily:"monospace",letterSpacing:2}}>PAR</div><div style={{fontSize:28,fontWeight:900,color:"#ccd",fontFamily:"monospace",lineHeight:1}}>{holePar}</div></div>
            <div style={{width:1,background:BORDER}}/>
            <div style={{textAlign:"center"}}><div style={{fontSize:8,color:"#446",fontFamily:"monospace",letterSpacing:2}}>HCP IDX</div><div style={{fontSize:28,fontWeight:900,color:"#ccd",fontFamily:"monospace",lineHeight:1}}>{holeHcp}</div></div>
            {strokeReceivers.length>0&&<><div style={{width:1,background:BORDER}}/><div style={{display:"flex",flexDirection:"column",justifyContent:"center"}}><div style={{fontSize:8,color:GOLD,fontFamily:"monospace",letterSpacing:1}}>STROKE</div><div style={{fontSize:9,color:GOLD,marginTop:1}}>{strokeReceivers.join(", ")}</div></div></>}
          </div>
          <div style={{background:`${TEAM_A_COLOR}18`,border:`1px solid ${TEAM_A_COLOR}44`,borderRadius:12,padding:"12px",marginBottom:8}}>
            <div style={{fontSize:9,color:TEAM_A_COLOR,fontWeight:800,letterSpacing:2,fontFamily:"monospace",marginBottom:10}}>{TEAM_A_SHORT}</div>
            <div style={{display:"flex",justifyContent:isSingles?"center":"space-around"}}>
              <ScoreInput label={match.player1a} hcp={match.hcp1a||0} value={sc.p1a} onChange={v=>setSc(s=>({...s,p1a:v}))} color={TEAM_A_COLOR} labelColor={strokeReceivers.includes(match.player1a)?GOLD:null}/>
              {!isSingles&&<ScoreInput label={match.player1b} hcp={match.hcp1b||0} value={sc.p1b} onChange={v=>setSc(s=>({...s,p1b:v}))} color={TEAM_A_COLOR} labelColor={strokeReceivers.includes(match.player1b)?GOLD:null}/>}
            </div>
            {!isSingles&&<div style={{textAlign:"center",marginTop:8,fontSize:10,color:"#fff4"}}>best net: <span style={{color:"#fff",fontWeight:700}}>{teamANet}</span></div>}
          </div>
          <div style={{background:`${TEAM_B_COLOR}33`,border:`1px solid ${TEAM_B_COLOR}66`,borderRadius:12,padding:"12px",marginBottom:10}}>
            <div style={{fontSize:9,color:TEAM_B_DISP,fontWeight:800,letterSpacing:2,fontFamily:"monospace",marginBottom:10}}>{TEAM_B_SHORT}</div>
            <div style={{display:"flex",justifyContent:isSingles?"center":"space-around"}}>
              <ScoreInput label={match.player2a} hcp={match.hcp2a||0} value={sc.p2a} onChange={v=>setSc(s=>({...s,p2a:v}))} color={TEAM_B_DISP} labelColor={strokeReceivers.includes(match.player2a)?GOLD:null}/>
              {!isSingles&&<ScoreInput label={match.player2b} hcp={match.hcp2b||0} value={sc.p2b} onChange={v=>setSc(s=>({...s,p2b:v}))} color={TEAM_B_DISP} labelColor={strokeReceivers.includes(match.player2b)?GOLD:null}/>}
            </div>
            {!isSingles&&<div style={{textAlign:"center",marginTop:8,fontSize:10,color:"#fff4"}}>best net: <span style={{color:"#fff",fontWeight:700}}>{teamBNet}</span></div>}
          </div>
          <div style={{background:`${hwColor}22`,border:`1px solid ${hwColor}55`,borderRadius:10,padding:"9px 12px",marginBottom:10,textAlign:"center"}}>
            <div style={{fontSize:9,color:"#446",fontFamily:"monospace",marginBottom:2}}>HOLE RESULT</div>
            <div style={{fontSize:13,fontWeight:800,color:hwColor}}>{hwLabel}</div>
          </div>
          <button onClick={handleConfirm} style={{width:"100%",padding:"15px",background:`linear-gradient(135deg,${hwColor},${hwColor}aa)`,border:"none",borderRadius:14,color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer",letterSpacing:1,fontFamily:"monospace",boxShadow:`0 4px 18px ${hwColor}44`,marginBottom:8}}>CONFIRM HOLE {hole+1} →</button>
          {hole>0&&<button onClick={handleUndo} style={{width:"100%",padding:"9px",background:"none",border:`1px solid ${BORDER}`,borderRadius:10,color:"#446",fontSize:11,cursor:"pointer",fontFamily:"monospace",letterSpacing:1,marginBottom:20}}>↩ UNDO HOLE {hole}</button>}
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
  const aLeading = live && s.leader==="A";
  const bLeading = live && s.leader==="B";
  const allSquare = live && !s.leader;

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
    // Pending, complete, halved — static centred badge
    let badgeBg = "#0d1929", badgeTop = "", badgeBot = "—";
    if (aWin)        { badgeBg=TEAM_A_COLOR; badgeTop="WIN"; badgeBot=s.sublabel; }
    else if (bWin)   { badgeBg=TEAM_B_COLOR; badgeTop="WIN"; badgeBot=s.sublabel; }
    else if (halved) { badgeBg="#334455";    badgeTop="HALVED"; badgeBot="½pt"; }
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
  const isSingles=day.format==="Singles";
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
      {day.matches.map(m=><TVMatchRow key={m.id} match={m} isSingles={isSingles} onOpen={()=>onOpen(m.id)} canEdit={canEdit?canEdit(m.id):false}/>)}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [days, setDays]             = useState(initialDays);
  const [loaded, setLoaded]         = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState(()=>{ try{return localStorage.getItem("jr_player")||null;}catch{return null;} });
  const [tab, setTab]               = useState("scoreboard");
  const [activeMatch, setActiveMatch] = useState(null);
  const [boardDayOverride, setBoardDayOverride] = useState(null);
  const isSaving = useRef(false);

  // ── Firebase: subscribe to all match data ──
  useEffect(()=>{
    const dbRef = ref(db, "matches");
    const unsub = onValue(dbRef, (snapshot)=>{
      if (isSaving.current) return; // ignore echo of our own write
      const data = snapshot.val();
      if (!data) { setLoaded(true); return; }
      // Merge firebase data into initialDays structure
      setDays(prev => prev.map(day => ({
        ...day,
        matches: day.matches.map(m => {
          const fbMatch = data[`m${m.id}`];
          if (!fbMatch) return m;
          // Firebase stores arrays as objects {0:val,1:val,...} — convert back
          const rawScores = fbMatch.scores;
          const scores = Array.isArray(rawScores)
            ? rawScores
            : Array.from({length:18}, (_,i) => rawScores?.[i] ?? null);
          return {
            ...m,
            scores,
            hcp1a: fbMatch.hcp1a ?? m.hcp1a,
            hcp1b: fbMatch.hcp1b ?? m.hcp1b,
            hcp2a: fbMatch.hcp2a ?? m.hcp2a,
            hcp2b: fbMatch.hcp2b ?? m.hcp2b,
          };
        })
      })));
      setLoaded(true);
    });
    return ()=> unsub();
  }, []);

  // ── Firebase: write a single match on update ──
  const updateMatch = (dayIdx, upd) => {
    isSaving.current = true;
    setDays(ds => ds.map((d,i) => i!==dayIdx ? d : {
      ...d, matches: d.matches.map(m => m.id===upd.id ? upd : m)
    }));
    // Write just the changed match to Firebase
    set(ref(db, `matches/m${upd.id}`), {
      scores: upd.scores,
      hcp1a: upd.hcp1a||0,
      hcp1b: upd.hcp1b||0,
      hcp2a: upd.hcp2a||0,
      hcp2b: upd.hcp2b||0,
    }).finally(()=>{ isSaving.current = false; });
  };

  useEffect(()=>{ try{if(currentPlayer)localStorage.setItem("jr_player",currentPlayer);else localStorage.removeItem("jr_player");}catch{} },[currentPlayer]);

  const {actualA,actualB,projA,projB} = computeAllPoints(days);
  const totalMatches = days.reduce((s,d)=>s+d.matches.length,0);
  const doneMatches  = days.reduce((s,d)=>s+d.matches.filter(m=>["complete","halved"].includes(computeMatchStatus(m.scores).state)).length,0);
  const liveCount    = days.reduce((s,d)=>s+d.matches.filter(m=>computeMatchStatus(m.scores).state==="live").length,0);
  const winTarget    = totalMatches/2;
  const winner       = actualA>winTarget?TEAM_A_SHORT:actualB>winTarget?TEAM_B_SHORT:null;
  const projWinner   = !winner&&(projA>winTarget?TEAM_A_SHORT:projB>winTarget?TEAM_B_SHORT:null);

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
  const playerMatch  = currentPlayer ? findPlayerMatch(days,currentPlayer) : null;
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
    <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"monospace",color:"#446"}}>
      <div style={{marginBottom:16}}>{CBS_LOGO_LG}</div>
      <div style={{fontSize:12,letterSpacing:3,animation:"pulse 1.5s infinite"}}>CONNECTING...</div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}*{box-sizing:border-box;margin:0;padding:0}`}</style>
    </div>
  );

  if (!currentPlayer) return <PlayerSelect onSelect={name=>setCurrentPlayer(name)}/>;

  if (activeMatch) {
    const d=days[activeMatch.dayIdx];
    const m=d.matches.find(x=>x.id===activeMatch.matchId);
    return <HoleEntry match={m} isSingles={d.format==="Singles"} courseKey={d.courseKey} onSave={upd=>updateMatch(activeMatch.dayIdx,upd)} onClose={()=>setActiveMatch(null)}/>;
  }

  const playerInfo = ALL_PLAYERS.find(p=>p.name===currentPlayer);
  const playerTeamColor = playerInfo?.team==="A" ? TEAM_A_COLOR : TEAM_B_COLOR;

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Arial Narrow','Arial',sans-serif",color:"#ccd",paddingBottom:60}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}*{box-sizing:border-box;margin:0;padding:0}html,body{background:${BG};}`}</style>

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
            <button onClick={()=>setCurrentPlayer(null)} style={{fontSize:9,padding:"3px 8px",background:`${playerTeamColor}22`,border:`1px solid ${playerTeamColor}55`,borderRadius:5,color:"#ccd",cursor:"pointer",fontFamily:"monospace",whiteSpace:"nowrap"}}>
              👤 {currentPlayer} ✕
            </button>
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
        {[["scoreboard","📊 BOARD"],["matches","⛳ MY MATCH"],["leaderboard","🏌️ SCORES"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:"11px 2px",background:"none",border:"none",borderBottom:tab===key?`2px solid ${GOLD}`:"2px solid transparent",color:tab===key?GOLD:"#446",fontWeight:700,fontSize:9,letterSpacing:1,cursor:"pointer",fontFamily:"monospace"}}>{label}</button>
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
              if(canEdit(boardDayIdx,mid)) setActiveMatch({dayIdx:boardDayIdx,matchId:mid});
            }} canEdit={(mid)=>canEdit(boardDayIdx,mid)}/>
          </div>
        )}

        {tab==="matches"&&(
          <div>
            {playerMatch?(()=>{
              const d=days[playerMatch.dayIdx];
              const m=d.matches.find(x=>x.id===playerMatch.matchId);
              const s=computeMatchStatus(m.scores);
              const isSingles=d.format==="Singles";
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
                    <TVMatchRow match={m} isSingles={isSingles} onOpen={()=>{}} canEdit={false}/>
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

        {tab==="leaderboard"&&(()=>{
          // Build per-player gross score totals across the current board day
          // We store gross scores only in local UI state (not in Firebase), so we
          // show match-play hole results (A/B/H) and compute relative-to-par from
          // the confirmed hole results per player pair.
          // Since we only store hole WINNERS not raw scores, we show match-play
          // standings per player instead — who won/lost how many holes.

          // Collect all matches for the viewed day
          const lbDay = days[boardDayIdx];
          const isSingles = lbDay.format === "Singles";

          // Build rows: one per player pairing
          const rows = lbDay.matches.map(m => {
            const holesA = m.scores.filter(s=>s==="A").length;
            const holesB = m.scores.filter(s=>s==="B").length;
            const holesH = m.scores.filter(s=>s==="H").length;
            const played = holesA + holesB + holesH;
            const st = computeMatchStatus(m.scores);
            return { m, holesA, holesB, holesH, played, st, isSingles };
          });

          return (
            <div style={{paddingBottom:20}}>
              <div style={{fontSize:9,color:GOLD,fontFamily:"monospace",letterSpacing:2,marginBottom:10,opacity:0.7}}>
                {lbDay.label.toUpperCase()} · HOLE-BY-HOLE RESULTS
              </div>

              {/* Header */}
              <div style={{display:"flex",background:"#060f22",borderRadius:"8px 8px 0 0",padding:"6px 10px",border:`1px solid ${BORDER}`,borderBottom:"none"}}>
                <div style={{flex:2,fontSize:8,color:"#446",fontFamily:"monospace",letterSpacing:1}}>PLAYERS</div>
                <div style={{width:36,textAlign:"center",fontSize:8,color:TEAM_A_COLOR,fontFamily:"monospace"}}>WON</div>
                <div style={{width:36,textAlign:"center",fontSize:8,color:"#557",fontFamily:"monospace"}}>HLV</div>
                <div style={{width:36,textAlign:"center",fontSize:8,color:TEAM_B_DISP,fontFamily:"monospace"}}>LOST</div>
                <div style={{width:50,textAlign:"center",fontSize:8,color:GOLD,fontFamily:"monospace"}}>STATUS</div>
              </div>

              {rows.map(({m, holesA, holesB, holesH, played, st},i)=>{
                const isAMatch = true; // all player1x are team A
                const aColor = st.state==="complete"&&st.leader==="A" ? TEAM_A_COLOR : st.state==="complete"&&st.leader==="B" ? "#3a4a5a" : "#ccd";
                const bColor = st.state==="complete"&&st.leader==="B" ? TEAM_B_DISP : st.state==="complete"&&st.leader==="A" ? "#3a4a5a" : "#ccd";
                const stColor = st.state==="complete"?(st.leader==="A"?TEAM_A_COLOR:TEAM_B_COLOR):st.state==="halved"?"#668":st.state==="live"?"#4caf50":"#446";
                return (
                  <div key={m.id} style={{border:`1px solid ${BORDER}`,borderTop:i===0?undefined:`1px solid ${BORDER}`,background:CARD,padding:"10px 10px",display:"flex",alignItems:"center",borderRadius:i===rows.length-1?"0 0 8px 8px":0}}>
                    <div style={{flex:2,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:aColor,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {isSingles ? m.player1a : `${m.player1a} & ${m.player1b}`}
                      </div>
                      <div style={{fontSize:9,color:"#335",margin:"1px 0"}}>vs</div>
                      <div style={{fontSize:12,fontWeight:700,color:bColor,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {isSingles ? m.player2a : `${m.player2a} & ${m.player2b}`}
                      </div>
                      {m.teeTime!=="TBD"&&<div style={{fontSize:8,color:"#446",fontFamily:"monospace",marginTop:2}}>{m.teeTime}</div>}
                    </div>
                    <div style={{width:36,textAlign:"center",fontSize:16,fontWeight:900,color:TEAM_A_COLOR,fontFamily:"monospace"}}>{holesA}</div>
                    <div style={{width:36,textAlign:"center",fontSize:16,fontWeight:900,color:"#557",fontFamily:"monospace"}}>{holesH}</div>
                    <div style={{width:36,textAlign:"center",fontSize:16,fontWeight:900,color:TEAM_B_DISP,fontFamily:"monospace"}}>{holesB}</div>
                    <div style={{width:50,textAlign:"center"}}>
                      <div style={{fontSize:10,fontWeight:800,color:stColor,fontFamily:"monospace",lineHeight:1.2}}>{st.shortLabel}</div>
                      {played>0&&<div style={{fontSize:8,color:"#446",fontFamily:"monospace"}}>/{played}</div>}
                    </div>
                  </div>
                );
              })}

              {/* Mini hole-by-hole grid for each match */}
              <div style={{marginTop:14}}>
                <div style={{fontSize:9,color:GOLD,fontFamily:"monospace",letterSpacing:2,marginBottom:8,opacity:0.7}}>HOLE BY HOLE</div>
                {rows.map(({m, st},i)=>(
                  <div key={m.id} style={{marginBottom:10,background:CARD,borderRadius:10,border:`1px solid ${BORDER}`,overflow:"hidden"}}>
                    <div style={{display:"flex",justifyContent:"space-between",padding:"6px 10px",background:"#060f22",borderBottom:`1px solid ${BORDER}`}}>
                      <div style={{fontSize:10,fontWeight:700,color:TEAM_A_COLOR}}>{isSingles?m.player1a:`${m.player1a} & ${m.player1b}`}</div>
                      <div style={{fontSize:9,fontWeight:800,color:st.state==="live"?"#4caf50":st.state==="complete"?(st.leader==="A"?TEAM_A_COLOR:TEAM_B_DISP):"#446",fontFamily:"monospace"}}>{st.shortLabel}</div>
                      <div style={{fontSize:10,fontWeight:700,color:TEAM_B_DISP,textAlign:"right"}}>{isSingles?m.player2a:`${m.player2a} & ${m.player2b}`}</div>
                    </div>
                    <div style={{display:"flex",padding:"6px 6px",gap:2}}>
                      {Array.from({length:18},(_,hi)=>{
                        const s=m.scores[hi];
                        const bg=s==="A"?TEAM_A_COLOR:s==="B"?TEAM_B_COLOR:s==="H"?"#334":CARD2;
                        const label=s==="A"?"A":s==="B"?"B":s==="H"?"½":"·";
                        return (
                          <div key={hi} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
                            <div style={{fontSize:7,color:"#446",fontFamily:"monospace"}}>{hi+1}</div>
                            <div style={{width:"100%",height:20,background:bg,borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:s?"#fff":"#334",fontWeight:700}}>{label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
