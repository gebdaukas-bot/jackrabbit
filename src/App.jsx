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

const CBS_LOGO = (
  <svg width="22" height="24" viewBox="-5 0 235 250" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <polygon points="105,5 15,145 55,145 105,70 105,5" fill="#2878be"/>
    <polygon points="100,5 130,5 130,235 118,248 105,235 100,235" fill="#2878be"/>
    <polygon points="15,150 210,150 225,165 210,180 15,180" fill="#2878be"/>
    <polygon points="40,188 195,188 210,200 195,212 40,212" fill="#2878be"/>
    <polygon points="68,220 175,220 188,230 175,240 68,240" fill="#2878be"/>
  </svg>
);

const CBS_LOGO_LG = (
  <svg width="48" height="52" viewBox="-5 0 235 250" xmlns="http://www.w3.org/2000/svg" overflow="visible">
    <polygon points="105,5 15,145 55,145 105,70 105,5" fill="#2878be"/>
    <polygon points="100,5 130,5 130,235 118,248 105,235 100,235" fill="#2878be"/>
    <polygon points="15,150 210,150 225,165 210,180 15,180" fill="#2878be"/>
    <polygon points="40,188 195,188 210,200 195,212 40,212" fill="#2878be"/>
    <polygon points="68,220 175,220 188,230 175,240 68,240" fill="#2878be"/>
  </svg>
);

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
          <div style={{fontSize:26,fontWeight:900,letterSpacing:2,color:"#fff"}}>CBS RYDER CUP</div>
        </div>
        <div style={{fontSize:10,letterSpacing:4,color:"#446",fontFamily:"monospace",marginBottom:6}}>BOYS RYDER CUP 2025</div>
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
    ()=>Array.from({length:18},()=>({p1a:4,p1b:4,p2a:4,p2b:4}))
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
  const hwColor=hw==="A"?TEAM_A_COLOR:hw==="B"?TEAM_B_COLOR:"#445";
  const hwLabel=hw==="A"?`${TEAM_A_SHORT} wins · net ${teamANet} vs ${teamBNet}`:hw==="B"?`${TEAM_B_SHORT} wins · net ${teamBNet} vs ${teamANet}`:`Halved · both net ${teamANet}`;

  const handleConfirm=()=>{
    const ns=[...match.scores]; ns[hole]=hw;
    onSave({...match,scores:ns});
    if(hole<17){
      setHole(h=>h+1);
      setGrossScores(prev=>{const next=[...prev];next[hole+1]={p1a:4,p1b:4,p2a:4,p2b:4};return next;});
    }
  };
  const handleUndo=()=>{
    if(hole===0)return;
    const ns=[...match.scores]; ns[hole-1]=null;
    onSave({...match,scores:ns});
    setHole(h=>h-1);
    setGrossScores(prev=>{const next=[...prev];next[hole-1]={p1a:4,p1b:4,p2a:4,p2b:4};return next;});
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
      {isComplete?(
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{fontSize:36,marginBottom:10}}>🏆</div>
          <div style={{fontSize:16,fontWeight:900,color:GOLD,letterSpacing:2,textAlign:"center"}}>{cur.longLabel}</div>
          <div style={{fontSize:12,color:"#557",marginTop:5}}>{cur.sublabel}</div>
          <button onClick={handleUndo} style={{marginTop:20,padding:"10px 20px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:10,color:"#668",fontSize:12,cursor:"pointer"}}>↩ Undo Last Hole</button>
        </div>
      ):(
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
      )}
    </div>
  );
}

// ── TV Match Row ──────────────────────────────────────────────────────────────
function TVMatchRow({ match, isSingles, onOpen }) {
  const s=computeMatchStatus(match.scores);
  const aWin=s.state==="complete"&&s.leader==="A";
  const bWin=s.state==="complete"&&s.leader==="B";
  const live=s.state==="live";
  let centreTop="",centreBot="—",centreBg="#0d1929";
  if(aWin){centreTop="WIN";centreBot=s.sublabel;centreBg=TEAM_A_COLOR;}
  else if(bWin){centreTop="WIN";centreBot=s.sublabel;centreBg=TEAM_B_COLOR;}
  else if(s.state==="halved"){centreTop="HALVED";centreBot="½pt";centreBg="#334455";}
  else if(live&&!s.leader){centreTop=`THRU ${s.holesPlayed}`;centreBot="AS";centreBg="#1a2a44";}
  else if(live){centreTop=`THRU ${s.holesPlayed}`;centreBot=`${s.up}UP`;centreBg=s.leader==="A"?`${TEAM_A_COLOR}cc`:`${TEAM_B_COLOR}cc`;}
  const aText=aWin?"#fff":live&&s.leader==="A"?"#fff":"#7a8fa8";
  const bText=bWin?"#fff":live&&s.leader==="B"?"#fff":"#7a8fa8";
  return (
    <div onClick={onOpen} style={{display:"flex",alignItems:"stretch",cursor:"pointer",borderBottom:`1px solid #0a1628`}}>
      <div style={{flex:1,background:aWin?TEAM_A_COLOR:"#0d1929",padding:"10px 10px",minWidth:0}}>
        <div style={{fontSize:12,fontWeight:800,color:aText,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.player1a}</div>
        {!isSingles&&<div style={{fontSize:12,fontWeight:800,color:aText,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{match.player1b}</div>}
        {(match.hcp1a||0)+(match.hcp1b||0)>0&&<div style={{fontSize:7,color:GOLD,marginTop:2,fontFamily:"monospace"}}>HCP {match.hcp1a||0}{!isSingles&&match.hcp1b?`/${match.hcp1b}`:""}</div>}
      </div>
      <div style={{background:centreBg,width:64,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"4px 4px",flexShrink:0}}>
        {centreTop&&<div style={{fontSize:7,fontWeight:800,color:"#ffffffbb",fontFamily:"monospace",letterSpacing:0.5}}>{centreTop}</div>}
        <div style={{fontSize:centreBot.length>4?11:14,fontWeight:900,color:"#fff",fontFamily:"monospace",lineHeight:1}}>{centreBot}</div>
        {live&&<div style={{width:5,height:5,borderRadius:"50%",background:"#4caf50",marginTop:2,animation:"pulse 1.5s infinite"}}/>}
      </div>
      <div style={{flex:1,background:bWin?TEAM_B_COLOR:"#0d1929",padding:"10px 10px",display:"flex",flexDirection:"column",alignItems:"flex-end",minWidth:0}}>
        <div style={{fontSize:12,fontWeight:800,color:bText,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right",width:"100%"}}>{match.player2a}</div>
        {!isSingles&&<div style={{fontSize:12,fontWeight:800,color:bText,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textAlign:"right",width:"100%"}}>{match.player2b}</div>}
        {(match.hcp2a||0)+(match.hcp2b||0)>0&&<div style={{fontSize:7,color:GOLD,marginTop:2,fontFamily:"monospace",textAlign:"right"}}>HCP {match.hcp2a||0}{!isSingles&&match.hcp2b?`/${match.hcp2b}`:""}</div>}
      </div>
    </div>
  );
}

// ── TV Day Block ──────────────────────────────────────────────────────────────
function TVDayBlock({ day, onOpen }) {
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
      {day.matches.map(m=><TVMatchRow key={m.id} match={m} isSingles={isSingles} onOpen={()=>onOpen(m.id)}/>)}
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
          return {
            ...m,
            scores: fbMatch.scores || m.scores,
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
  const boardDayIdx = boardDayOverride!==null ? boardDayOverride : autoDayIdx;
  const boardDay    = days[boardDayIdx];
  const dayLabels   = ["FRIDAY","SATURDAY","SUNDAY"];
  const playerMatch = currentPlayer ? findPlayerMatch(days,currentPlayer) : null;

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
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Header */}
      <div style={{background:`linear-gradient(180deg,${CARD} 0%,${BG} 100%)`,borderBottom:`2px solid ${BORDER}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px 5px"}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            {CBS_LOGO}
            <div>
              <div style={{fontSize:7,letterSpacing:2,color:"#446",fontFamily:"monospace"}}>BOYS RYDER CUP 2025</div>
              <div style={{fontSize:13,fontWeight:900,letterSpacing:1,color:"#fff"}}>CBS RYDER CUP</div>
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
        {[["scoreboard","📊 BOARD"],["matches","⛳ MY MATCH"]].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:"11px 2px",background:"none",border:"none",borderBottom:tab===key?`2px solid ${GOLD}`:"2px solid transparent",color:tab===key?GOLD:"#446",fontWeight:700,fontSize:10,letterSpacing:1,cursor:"pointer",fontFamily:"monospace"}}>{label}</button>
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
            <TVDayBlock day={boardDay} onOpen={mid=>setActiveMatch({dayIdx:boardDayIdx,matchId:mid})}/>
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
              return (
                <div>
                  <div style={{fontSize:9,color:GOLD,fontFamily:"monospace",letterSpacing:2,marginBottom:10,opacity:0.8}}>{d.label.toUpperCase()} · {m.teeTime!=="TBD"?m.teeTime:""}</div>
                  <div style={{borderRadius:12,overflow:"hidden",border:`1px solid ${stateColor}44`,marginBottom:14}}>
                    <div style={{display:"flex",background:"#080f20",borderBottom:`1px solid ${BORDER}`,padding:"6px 10px",alignItems:"center",justifyContent:"space-between"}}>
                      <div style={{fontSize:9,color:"#446",fontFamily:"monospace"}}>{d.format.toUpperCase()}</div>
                      <div style={{fontSize:10,fontWeight:800,color:stateColor,fontFamily:"monospace"}}>{s.longLabel}</div>
                    </div>
                    <TVMatchRow match={m} isSingles={isSingles} onOpen={()=>{}}/>
                  </div>
                  <button onClick={()=>setActiveMatch(playerMatch)} style={{width:"100%",padding:"16px",background:`linear-gradient(135deg,${TEAM_B_COLOR},${TEAM_B_DISP}66)`,border:`1px solid ${TEAM_B_COLOR}`,borderRadius:14,color:"#fff",fontWeight:900,fontSize:16,cursor:"pointer",letterSpacing:1,fontFamily:"monospace",boxShadow:`0 4px 20px ${TEAM_B_COLOR}44`,marginBottom:10}}>
                    ⛳ ENTER SCORES
                  </button>
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
      </div>
    </div>
  );
}
