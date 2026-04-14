import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { db, ref, onValue, set, update } from "../firebase";
import { computeMatchStatus, computeAllPoints, GOLD } from "../utils/scoring";
import HoleEntry from "../components/HoleEntry";
import GroupHoleEntry from "../components/GroupHoleEntry";
import confetti from "canvas-confetti";

const fmtHcp = v => v < 0 ? `+${Math.abs(v)}` : `${v}`;

function findPlayerMatch(days, playerName, preferDayIdx = null) {
  const order = preferDayIdx !== null
    ? [preferDayIdx, ...days.map((_,i)=>i).filter(i=>i!==preferDayIdx)]
    : days.map((_,i)=>i);
  for (const di of order) {
    for (const m of days[di].matches) {
      if ([m.player1a,m.player1b,m.player2a,m.player2b].includes(playerName))
        return { dayIdx:di, matchId:m.id };
    }
  }
  return null;
}

function fmt(n) {
  if (n===undefined||n===null) return "0";
  return n%1===0?String(n):n.toFixed(1);
}

// ── TV Match Row (matches original CBS style) ─────────────────────────────────
function MatchCard({ match, cup, onOpen, canEdit }) {
  const { BORDER } = useTheme();
  const { teamAColor, teamAShort, teamBColor, teamBColorDisp, teamBShort } = cup;
  const isSingles = !match.player1b;
  const st = computeMatchStatus(match.scores, teamAShort, teamBShort);

  const aWin     = st.state==="complete" && st.leader==="A";
  const bWin     = st.state==="complete" && st.leader==="B";
  const halved   = st.state==="halved";
  const live     = st.state==="live";
  const aLeading = live && st.leader==="A";
  const bLeading = live && st.leader==="B";
  const allSquare= live && !st.leader;

  const aNameColor = (aWin||aLeading) ? "#ffffff" : "#7a8fa8";
  const bNameColor = (bWin||bLeading) ? "#ffffff" : "#7a8fa8";
  const aBg = aWin ? teamAColor : aLeading ? `${teamAColor}22` : "#0d1929";
  const bBg = bWin ? teamBColor : bLeading ? `${teamBColor}22` : "#0d1929";

  const liveBadge = (
    <div style={{ background:aLeading?`${teamAColor}ee`:bLeading?`${teamBColor}ee`:"#1a2a44", borderRadius:6, padding:"3px 8px", display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0, minWidth:54 }}>
      <div style={{ fontSize:7, fontWeight:800, color:"#ffffffaa", fontFamily:"monospace", letterSpacing:1, lineHeight:1.3 }}>THRU {st.holesPlayed}</div>
      <div style={{ fontSize:15, fontWeight:900, color:"#fff", fontFamily:"monospace", lineHeight:1.1 }}>{allSquare?"AS":`${st.up}UP`}</div>
      <div style={{ width:5, height:5, borderRadius:"50%", background:"#4caf50", marginTop:2, animation:"pulse 1.5s infinite" }}/>
    </div>
  );

  if (!live) {
    let badgeBg="#0d1929", badgeTop="", badgeBot="—";
    if (aWin)       { badgeBg=teamAColor;  badgeTop="WIN";    badgeBot=st.sublabel; }
    else if (bWin)  { badgeBg=teamBColor;  badgeTop="WIN";    badgeBot=st.sublabel; }
    else if (halved){ badgeBg="#334455";   badgeTop="HALVED"; badgeBot="½pt"; }
    return (
      <div onClick={canEdit?()=>onOpen(match.id):undefined} style={{ display:"flex", alignItems:"stretch", cursor:canEdit?"pointer":"default", borderBottom:`1px solid #0a1628`, opacity:canEdit?1:0.85 }}>
        <div style={{ flex:1, background:aBg, padding:"10px 10px", minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:800, color:aNameColor, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{match.player1a}</div>
          {!isSingles&&<div style={{ fontSize:12, fontWeight:800, color:aNameColor, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{match.player1b}</div>}
          {((match.hcp1a||0)!==0||(match.hcp1b||0)!==0)&&<div style={{ fontSize:7, color:GOLD, marginTop:2, fontFamily:"monospace" }}>HCP {fmtHcp(match.hcp1a||0)}{!isSingles&&match.hcp1b?`/${fmtHcp(match.hcp1b)}`:""}</div>}
        </div>
        <div style={{ background:badgeBg, width:64, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"4px", flexShrink:0 }}>
          {badgeTop&&<div style={{ fontSize:7, fontWeight:800, color:(aWin||bWin)?"#FFD700":"#ffffffbb", fontFamily:"monospace", letterSpacing:0.5 }}>{badgeTop}</div>}
          <div style={{ fontSize:badgeBot.length>4?11:14, fontWeight:900, color:"#fff", fontFamily:"monospace", lineHeight:1 }}>{badgeBot}</div>
        </div>
        <div style={{ flex:1, background:bBg, padding:"10px 10px", display:"flex", flexDirection:"column", alignItems:"flex-end", minWidth:0 }}>
          <div style={{ fontSize:12, fontWeight:800, color:bNameColor, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"right", width:"100%" }}>{match.player2a}</div>
          {!isSingles&&<div style={{ fontSize:12, fontWeight:800, color:bNameColor, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"right", width:"100%" }}>{match.player2b}</div>}
          {((match.hcp2a||0)!==0||(match.hcp2b||0)!==0)&&<div style={{ fontSize:7, color:GOLD, marginTop:2, fontFamily:"monospace", textAlign:"right" }}>HCP {fmtHcp(match.hcp2a||0)}{!isSingles&&match.hcp2b?`/${fmtHcp(match.hcp2b)}`:""}</div>}
        </div>
      </div>
    );
  }

  // LIVE — names fill left/right, badge floats absolutely toward leading side
  return (
    <div onClick={canEdit?()=>onOpen(match.id):undefined} style={{ position:"relative", display:"flex", alignItems:"stretch", cursor:canEdit?"pointer":"default", borderBottom:`1px solid #0a1628`, overflow:"hidden", opacity:canEdit?1:0.85 }}>
      <div style={{ flex:1, background:aBg, padding:"10px 10px", minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:800, color:aNameColor, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{match.player1a}</div>
        {!isSingles&&<div style={{ fontSize:12, fontWeight:800, color:aNameColor, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{match.player1b}</div>}
        {((match.hcp1a||0)!==0||(match.hcp1b||0)!==0)&&<div style={{ fontSize:7, color:GOLD, marginTop:2, fontFamily:"monospace" }}>HCP {fmtHcp(match.hcp1a||0)}{!isSingles&&match.hcp1b?`/${fmtHcp(match.hcp1b)}`:""}</div>}
      </div>
      <div style={{ flex:1, background:bBg, padding:"10px 10px", display:"flex", flexDirection:"column", alignItems:"flex-end", minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:800, color:bNameColor, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"right", width:"100%" }}>{match.player2a}</div>
        {!isSingles&&<div style={{ fontSize:12, fontWeight:800, color:bNameColor, lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"right", width:"100%" }}>{match.player2b}</div>}
        {((match.hcp2a||0)!==0||(match.hcp2b||0)!==0)&&<div style={{ fontSize:7, color:GOLD, marginTop:2, fontFamily:"monospace", textAlign:"right" }}>HCP {fmtHcp(match.hcp2a||0)}{!isSingles&&match.hcp2b?`/${fmtHcp(match.hcp2b)}`:""}</div>}
      </div>
      <div style={{ position:"absolute", top:"50%", left:aLeading?"25%":bLeading?"75%":"50%", transform:"translate(-50%,-50%)", zIndex:2, pointerEvents:"none" }}>
        {liveBadge}
      </div>
    </div>
  );
}

function DayBlock({ day, cup, onOpen, canEdit }) {
  const { BORDER } = useTheme();
  const { teamAColor, teamAShort, teamBColor, teamBColorDisp, teamBShort } = cup;
  const rounds = day.rounds || [{ format: day.format, course: day.course }];
  const multiRound = rounds.length > 1;

  return (
    <div style={{ marginBottom:14, borderRadius:10, overflow:"hidden", border:`1px solid ${BORDER}` }}>
      {/* Day header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#060f22", padding:"7px 10px", borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ fontSize:10, fontWeight:800, color:GOLD, letterSpacing:2, fontFamily:"monospace" }}>{day.label?.toUpperCase()}</div>
      </div>
      {/* Team name header — only show if single round (multi-round has its own per-round) */}
      {!multiRound && (
        <div style={{ display:"flex", background:"#080f20", borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ flex:1, padding:"5px 10px", fontSize:8, fontWeight:800, color:teamAColor, letterSpacing:1, fontFamily:"monospace" }}>{teamAShort}</div>
          <div style={{ width:64, textAlign:"center", padding:"5px 0", fontSize:7, color:"#446", fontFamily:"monospace" }}>{rounds[0].format?.toUpperCase()}</div>
          <div style={{ flex:1, padding:"5px 10px", fontSize:8, fontWeight:800, color:teamBColorDisp, letterSpacing:1, fontFamily:"monospace", textAlign:"right" }}>{teamBShort}</div>
        </div>
      )}
      {/* Rounds */}
      {rounds.map((round, ri)=>{
        const roundMatches = day.matches.filter(m=>(m.roundIdx??0)===ri);
        return (
          <div key={ri}>
            {multiRound && (
              <div style={{ display:"flex", background:"#0a1428", borderBottom:`1px solid ${BORDER}`, borderTop:ri>0?`1px solid ${BORDER}`:"none" }}>
                <div style={{ flex:1, padding:"5px 10px", fontSize:8, fontWeight:800, color:teamAColor, letterSpacing:1, fontFamily:"monospace" }}>{teamAShort}</div>
                <div style={{ padding:"5px 10px", fontSize:7, color:GOLD, fontFamily:"monospace", fontWeight:700 }}>
                  {round.format?.toUpperCase()}{round.course?.name?` · ${round.course.name}`:""}
                </div>
                <div style={{ flex:1, padding:"5px 10px", fontSize:8, fontWeight:800, color:teamBColorDisp, letterSpacing:1, fontFamily:"monospace", textAlign:"right" }}>{teamBShort}</div>
              </div>
            )}
            {roundMatches.map(m=>(
              <MatchCard key={m.id} match={m} cup={cup} onOpen={onOpen} canEdit={canEdit(m.id)}/>
            ))}
          </div>
        );
      })}
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
  const [cupPlayers, setCupPlayers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("scoreboard");
  const [boardDayOverride, setBoardDayOverride] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(()=>{ try{return localStorage.getItem(`jr_player_${cupId}`)||"";}catch{return "";} });
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [offlineQueue, setOfflineQueue] = useState(()=>{ try{return JSON.parse(localStorage.getItem(`jr_queue_${cupId}`))||[];}catch{return [];} });
  const [syncStatus, setSyncStatus] = useState(null);
  const [matchCelebration, setMatchCelebration] = useState(null);

  const dirtyMatchIds = useRef(new Set());
  const prevMatchStates = useRef({});
  const prevWinnerRef = useRef(null);
  const confettiFired = useRef(false);
  const celebTimer = useRef(null);
  const rawMatchesRef = useRef(null);

  useEffect(()=>{
    const unsub = onValue(ref(db,`cups/${cupId}/meta`),snap=>{ if(snap.exists()) setMeta(snap.val()); });
    return ()=>unsub();
  },[cupId]);

  useEffect(()=>{
    const unsub = onValue(ref(db,`cups/${cupId}/players`),snap=>{
      if (!snap.exists()) return;
      const data = snap.val();
      setCupPlayers(Object.values(data).map(p=>p.name).filter(Boolean).sort());
    });
    return ()=>unsub();
  },[cupId]);

  useEffect(()=>{
    const unsub = onValue(ref(db,`cups/${cupId}/days`),snap=>{
      if (!snap.exists()) return;
      const rawDays = snap.val();
      const dayArr = Array.isArray(rawDays)?rawDays:Object.values(rawDays);
      setDays(prev=>{
        const base = dayArr.map((d,di)=>({
          ...(prev[di]||{matches:[]}),
          ...d,
          rounds: d.rounds || [{ format:d.format, course:d.course }],
          matches:(prev[di]||{matches:[]}).matches,
        }));
        // Apply any already-received raw matches (handles race condition where matches listener fires first)
        if (rawMatchesRef.current) {
          const dayMatches = base.map(()=>[]);
          Object.entries(rawMatchesRef.current).forEach(([matchKey,m])=>{
            const num = parseInt(matchKey.replace("m",""));
            let dayIdx, roundIdx;
            if (num>=1000){dayIdx=Math.floor(num/1000)-1;roundIdx=Math.floor((num%1000)/100)-1;}
            else{dayIdx=Math.floor(num/100)-1;roundIdx=0;}
            if (dayIdx>=0&&dayIdx<base.length)
              dayMatches[dayIdx].push({id:num,roundIdx,...m,scores:Array(18).fill(null),disputes:[]});
          });
          return base.map((day,di)=>({...day,matches:dayMatches[di].length>0?dayMatches[di].sort((a,b)=>a.id-b.id):day.matches}));
        }
        return base;
      });
    });
    return ()=>unsub();
  },[cupId]);

  useEffect(()=>{
    const unsub = onValue(ref(db,`cups/${cupId}/matches`),snap=>{
      if (!snap.exists()){ setLoaded(true); return; }
      const rawMatches = snap.val();
      rawMatchesRef.current = rawMatches;
      setDays(prev=>{
        if (!prev.length) return prev;
        const dayMatches = prev.map(()=>[]);
        Object.entries(rawMatches).forEach(([matchKey,m])=>{
          const num = parseInt(matchKey.replace("m",""));
          let dayIdx, roundIdx;
          if (num >= 1000) {
            // New scheme: m${(di+1)*1000 + (ri+1)*100 + matchNum}
            dayIdx = Math.floor(num/1000)-1;
            roundIdx = Math.floor((num%1000)/100)-1;
          } else {
            // Old scheme: m${(di+1)*100 + matchNum}
            dayIdx = Math.floor(num/100)-1;
            roundIdx = 0;
          }
          if (dayIdx>=0&&dayIdx<prev.length)
            dayMatches[dayIdx].push({id:num,roundIdx,...m,scores:Array(18).fill(null),disputes:[]});
        });
        return prev.map((day,di)=>({
          ...day,
          matches:dayMatches[di].length>0?dayMatches[di].sort((a,b)=>a.id-b.id):day.matches,
        }));
      });
    });
    return ()=>unsub();
  },[cupId]);

  useEffect(()=>{
    const unsub = onValue(ref(db,`cups/${cupId}/scores`),snap=>{
      const data = snap.val();
      setDays(prev=>prev.map(day=>({
        ...day,
        matches:day.matches.map(m=>{
          if (dirtyMatchIds.current.has(m.id)) return m;
          const fb = data?.[`m${m.id}`];
          if (!fb) return m;
          const scores = Array.isArray(fb.scores)?fb.scores:Array.from({length:18},(_,i)=>fb.scores?.[i]??null);
          const disputes = fb.disputes?Object.values(fb.disputes).filter(v=>v!=null):[];
          return {
            ...m, scores, disputes,
            hcp1a:fb.hcp1a??m.hcp1a, hcp1b:fb.hcp1b??m.hcp1b,
            hcp2a:fb.hcp2a??m.hcp2a, hcp2b:fb.hcp2b??m.hcp2b,
            grossP1a:fb.grossP1a?Array.from({length:18},(_,i)=>fb.grossP1a[i]??null):null,
            grossP1b:fb.grossP1b?Array.from({length:18},(_,i)=>fb.grossP1b[i]??null):null,
            grossP2a:fb.grossP2a?Array.from({length:18},(_,i)=>fb.grossP2a[i]??null):null,
            grossP2b:fb.grossP2b?Array.from({length:18},(_,i)=>fb.grossP2b[i]??null):null,
          };
        }),
      })));
      setLoaded(true);
    });
    return ()=>unsub();
  },[cupId]);

  const updateMatch = async (dayIdx,upd)=>{
    dirtyMatchIds.current.add(upd.id);
    setDays(ds=>ds.map((d,i)=>i!==dayIdx?d:{...d,matches:d.matches.map(m=>m.id===upd.id?upd:m)}));
    const path=`cups/${cupId}/scores/m${upd.id}`;
    const payload={scores:upd.scores,hcp1a:upd.hcp1a||0,hcp1b:upd.hcp1b||0,hcp2a:upd.hcp2a||0,hcp2b:upd.hcp2b||0};
    if (upd.grossP1a) payload.grossP1a=upd.grossP1a;
    if (upd.grossP1b) payload.grossP1b=upd.grossP1b;
    if (upd.grossP2a) payload.grossP2a=upd.grossP2a;
    if (upd.grossP2b) payload.grossP2b=upd.grossP2b;
    if (upd.disputes!==undefined) payload.disputes=upd.disputes||null;
    try {
      await set(ref(db,path),payload);
      dirtyMatchIds.current.delete(upd.id);
    } catch {
      setOfflineQueue(prev=>{
        const q=[...prev.filter(x=>x.path!==path),{path,payload}];
        try{localStorage.setItem(`jr_queue_${cupId}`,JSON.stringify(q));}catch{}
        return q;
      });
    }
  };

  useEffect(()=>{
    const flush=async()=>{
      if (!offlineQueue.length) return;
      try {
        for (const item of offlineQueue) { await set(ref(db,item.path),item.payload); const mid=parseInt(item.path.split("/").pop().replace("m",""));if(!isNaN(mid))dirtyMatchIds.current.delete(mid); }
        setOfflineQueue([]); try{localStorage.removeItem(`jr_queue_${cupId}`);}catch{}
        setSyncStatus("synced"); setTimeout(()=>setSyncStatus(null),2500);
      } catch {}
    };
    window.addEventListener("online",flush);
    return ()=>window.removeEventListener("online",flush);
  },[offlineQueue,cupId]);

  const {actualA,actualB,projA,projB} = days.length>0&&meta
    ? computeAllPoints(days,meta.teamAName,meta.teamBName)
    : {actualA:0,actualB:0,projA:0,projB:0};

  const totalMatches = days.reduce((s,d)=>s+d.matches.length,0);
  const doneMatches  = days.reduce((s,d)=>s+d.matches.filter(m=>["complete","halved"].includes(computeMatchStatus(m.scores).state)).length,0);
  const winTarget = totalMatches/2;
  const winner = actualA>winTarget?meta?.teamAName:actualB>winTarget?meta?.teamBName:null;
  const projWinner = !winner&&(projA>winTarget?meta?.teamAName:projB>winTarget?meta?.teamBName:null);
  const liveCount = days.reduce((s,d)=>s+d.matches.filter(m=>computeMatchStatus(m.scores).state==="live").length,0);

  useEffect(()=>{
    if (winner&&!prevWinnerRef.current&&!confettiFired.current){
      confettiFired.current=true;
      const col=winner===meta?.teamAName?["#C8102E","#ff8888","#C4A44A","#fff"]:["#003087","#4A90D9","#C4A44A","#fff"];
      confetti({particleCount:200,spread:120,origin:{y:0.35},colors:col});
    }
    prevWinnerRef.current=winner;
  },[winner]);

  useEffect(()=>{
    if (!meta) return;
    for (const day of days) for (const m of day.matches){
      const s=computeMatchStatus(m.scores,meta.teamAName,meta.teamBName);
      const prev=prevMatchStates.current[m.id];
      if (prev!==undefined&&prev==="live"&&(s.state==="complete"||s.state==="halved")){
        const color=s.state==="halved"?"#334455":s.leader==="A"?meta.teamAColor:meta.teamBColor;
        setMatchCelebration({label:s.longLabel,sublabel:s.sublabel||(s.state==="halved"?"½ pt each":"1 point"),color});
        if (celebTimer.current) clearTimeout(celebTimer.current);
        celebTimer.current=setTimeout(()=>setMatchCelebration(null),1500);
      }
      prevMatchStates.current[m.id]=s.state;
    }
  },[days,meta]);

  useEffect(()=>{ try{if(currentPlayer)localStorage.setItem(`jr_player_${cupId}`,currentPlayer);else localStorage.removeItem(`jr_player_${cupId}`);}catch{} },[currentPlayer,cupId]);

  if (!meta||!loaded) {
    return <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:MUTED,fontFamily:"monospace"}}>Loading cup...</div></div>;
  }

  const cup = {
    teamAName:meta.teamAName, teamAShort:meta.teamAName?.split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,6)||"A",
    teamAColor:meta.teamAColor||"#C8102E",
    teamBName:meta.teamBName, teamBShort:meta.teamBName?.split(/\s+/).map(w=>w[0]).join("").toUpperCase().slice(0,6)||"B",
    teamBColor:meta.teamBColor||"#003087", teamBColorDisp:meta.teamBColor||"#4A90D9",
  };

  const isAdmin = user?.uid===meta.createdBy;
  const allPlayers = days.flatMap(d=>d.matches.flatMap(m=>[m.player1a,m.player1b,m.player2a,m.player2b].filter(Boolean)));
  const uniquePlayers = cupPlayers.length>0 ? cupPlayers : [...new Set(allPlayers)];

  const todayDow = new Date().getDay();
  const dowToDay = {5:0,6:1,0:2};
  let autoDayIdx = dowToDay[todayDow]!==undefined?dowToDay[todayDow]:-1;
  if (autoDayIdx===-1){let best=0;for(let i=0;i<days.length;i++)if(days[i].matches.some(m=>m.scores.some(s=>s!==null)))best=i;autoDayIdx=best;}
  const boardDayIdx = boardDayOverride!==null?boardDayOverride:autoDayIdx;
  const boardDay = days[boardDayIdx];
  const playerMatch = currentPlayer?findPlayerMatch(days,currentPlayer,autoDayIdx):null;
  const canEdit = (dayIdx,matchId)=>{ if(isAdmin)return true; if(dayIdx!==autoDayIdx||!playerMatch)return false; return playerMatch.dayIdx===dayIdx&&playerMatch.matchId===matchId; };

  const openForScoring = (dayIdx,matchId)=>{
    const d=days[dayIdx]; const m=d?.matches.find(x=>x.id===matchId);
    if (m?.companionId) setActiveGroup({dayIdx,matchIds:[matchId,m.companionId]});
    else setActiveMatch({dayIdx,matchId});
  };

  // Login screen
  if (!currentPlayer) {
    return (
      <div style={{minHeight:"100vh",background:BG,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{width:"100%",maxWidth:360}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            {meta.logoUrl
              ? <img src={meta.logoUrl} alt="logo" style={{height:60,objectFit:"contain",marginBottom:8}}/>
              : <div style={{fontSize:40,marginBottom:8}}>⛳</div>}
            <div style={{fontSize:22,fontWeight:900,color:GOLD,fontFamily:"monospace",letterSpacing:2}}>{meta.name}</div>
            <div style={{fontSize:12,color:MUTED,marginTop:6}}>
              <span style={{color:cup.teamAColor,fontWeight:700}}>{meta.teamAName}</span>
              <span style={{color:MUTED}}> vs </span>
              <span style={{color:cup.teamBColorDisp,fontWeight:700}}>{meta.teamBName}</span>
            </div>
          </div>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:24}}>
            <div style={{fontSize:13,color:MUTED,marginBottom:16,textAlign:"center"}}>Who are you?</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {uniquePlayers.map(name=>(
                <button key={name} onClick={()=>{
                  setCurrentPlayer(name);
                  const pm=findPlayerMatch(days,name,autoDayIdx);
                  if(pm){const d=days[pm.dayIdx];const m=d?.matches.find(x=>x.id===pm.matchId);if(m?.companionId)setActiveGroup({dayIdx:pm.dayIdx,matchIds:[pm.matchId,m.companionId]});else if(m)setActiveMatch(pm);}
                }} style={{padding:"12px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:10,color:TEXT,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
                  {name}
                </button>
              ))}
            </div>
            <button onClick={()=>nav("/")} style={{width:"100%",marginTop:16,padding:"10px",background:"none",border:`1px solid ${BORDER}`,borderRadius:10,color:MUTED,fontSize:12,cursor:"pointer"}}>← Back to home</button>
          </div>
        </div>
      </div>
    );
  }

  const getCourse = (d, m) => {
    const ri = m?.roundIdx??0;
    return d?.rounds?.[ri]?.course || d?.course || {};
  };

  // Score entry screens
  if (activeGroup){
    const d=days[activeGroup.dayIdx];
    const groupMatches=activeGroup.matchIds.map(id=>d?.matches.find(x=>x.id===id)).filter(Boolean);
    if (groupMatches.length===2)
      return <GroupHoleEntry matches={groupMatches} course={getCourse(d,groupMatches[0])} cup={cup} onSave={(mi,upd)=>updateMatch(activeGroup.dayIdx,upd)} onClose={()=>setActiveGroup(null)}/>;
  }
  if (activeMatch){
    const d=days[activeMatch.dayIdx]; const m=d?.matches.find(x=>x.id===activeMatch.matchId);
    if (m?.companionId){const companion=d.matches.find(x=>x.id===m.companionId);if(companion)return <GroupHoleEntry matches={[m,companion]} course={getCourse(d,m)} cup={cup} onSave={(mi,upd)=>updateMatch(activeMatch.dayIdx,upd)} onClose={()=>setActiveMatch(null)}/>;}
    if (m) return <HoleEntry match={m} isSingles={!m.player1b} course={getCourse(d,m)} cup={cup} onSave={upd=>updateMatch(activeMatch.dayIdx,upd)} onClose={()=>setActiveMatch(null)}/>;
  }

  const playerTeamColor=(()=>{ for(const d of days)for(const m of d.matches){if([m.player1a,m.player1b].includes(currentPlayer))return cup.teamAColor;if([m.player2a,m.player2b].includes(currentPlayer))return cup.teamBColor;} return MUTED; })();

  return (
    <div style={{minHeight:"100vh",background:BG,color:TEXT,paddingBottom:60,fontFamily:"'Arial Narrow','Arial',sans-serif"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes celebFade{to{opacity:0;pointer-events:none}}*{box-sizing:border-box;margin:0;padding:0}html,body{background:${BG};}`}</style>

      {matchCelebration&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,background:matchCelebration.color,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"celebFade 0.3s ease 1.2s forwards",pointerEvents:"none"}}>
          <div style={{fontSize:42,fontWeight:900,color:"#fff",fontFamily:"monospace",letterSpacing:3,textAlign:"center",padding:"0 20px"}}>{matchCelebration.label}</div>
          <div style={{fontSize:22,color:"rgba(255,255,255,0.85)",fontFamily:"monospace",marginTop:10}}>{matchCelebration.sublabel}</div>
        </div>
      )}

      {/* Header — cup logo + name top left, like old app */}
      <div style={{background:`linear-gradient(180deg,${CARD} 0%,${BG} 100%)`,borderBottom:`2px solid ${BORDER}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px 5px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
            {meta.logoUrl
              ? <img src={meta.logoUrl} alt="logo" style={{height:32,width:32,objectFit:"contain",borderRadius:4}}/>
              : <div style={{fontSize:24,lineHeight:1}}>⛳</div>}
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:900,letterSpacing:1,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{meta.name}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
            {liveCount>0&&<div style={{fontSize:9,color:"#4caf50",fontWeight:700,animation:"pulse 2s infinite",letterSpacing:1}}>● {liveCount} LIVE</div>}
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {offlineQueue.length>0&&<div style={{fontSize:8,color:"#f39c12",fontFamily:"monospace",fontWeight:700}}>⚡{offlineQueue.length}</div>}
              {syncStatus==="synced"&&<div style={{fontSize:8,color:"#4caf50",fontFamily:"monospace"}}>✓</div>}
              <button onClick={toggle} style={{fontSize:14,background:"none",border:"none",cursor:"pointer",padding:"1px 4px",lineHeight:1}}>{theme==="dark"?"☀️":"🌙"}</button>
              <button onClick={()=>setCurrentPlayer("")} style={{fontSize:9,padding:"3px 8px",background:`${playerTeamColor}22`,border:`1px solid ${playerTeamColor}55`,borderRadius:5,color:TEXT,cursor:"pointer",fontFamily:"monospace",whiteSpace:"nowrap"}}>
                👤 {currentPlayer} ✕
              </button>
            </div>
          </div>
        </div>

        {winner&&<div style={{background:`${GOLD}22`,borderTop:`1px solid ${GOLD}44`,borderBottom:`1px solid ${GOLD}44`,padding:"7px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:900,color:GOLD,letterSpacing:2}}>🏆 {winner} WINS THE CUP!</div></div>}

        {/* Big scoreboard */}
        <div style={{display:"flex",alignItems:"stretch"}}>
          <div style={{flex:1,background:cup.teamAColor,padding:"8px 10px",display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0}}>
            <div style={{fontSize:10,fontWeight:900,color:"#ffcccc",letterSpacing:1,fontFamily:"monospace",lineHeight:1.2,wordBreak:"break-word"}}>{meta.teamAName}</div>
            <div style={{fontSize:36,fontWeight:900,color:"#fff",fontFamily:"monospace",lineHeight:1,marginTop:2}}>{fmt(actualA)}</div>
          </div>
          <div style={{background:"#060d1e",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"6px 8px",borderLeft:`1px solid ${BORDER}`,borderRight:`1px solid ${BORDER}`,flexShrink:0,minWidth:76}}>
            <div style={{fontSize:7,color:"#446",fontFamily:"monospace",letterSpacing:1,marginBottom:2}}>PROJECTED</div>
            <div style={{fontSize:10,fontWeight:700,fontFamily:"monospace",color:projA>projB?cup.teamAColor:projB>projA?cup.teamBColorDisp:"#557",whiteSpace:"nowrap"}}>{fmt(projA)}–{fmt(projB)}</div>
            {projWinner&&<div style={{fontSize:7,color:GOLD,fontFamily:"monospace",marginTop:2,whiteSpace:"nowrap"}}>→ {projWinner}</div>}
            <div style={{fontSize:7,color:"#335",marginTop:3,fontFamily:"monospace",whiteSpace:"nowrap"}}>WIN: {fmt(winTarget+0.5)}</div>
          </div>
          <div style={{flex:1,background:cup.teamBColor,padding:"8px 10px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-end",minWidth:0}}>
            <div style={{fontSize:10,fontWeight:900,color:"#cce4ff",letterSpacing:1,fontFamily:"monospace",lineHeight:1.2,wordBreak:"break-word",textAlign:"right"}}>{meta.teamBName}</div>
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

        {/* SCOREBOARD TAB */}
        {tab==="scoreboard"&&(
          <div>
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {days.map((d,i)=>(
                <button key={i} onClick={()=>setBoardDayOverride(i)}
                  style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",background:boardDayIdx===i?`${cup.teamBColor}55`:CARD2,borderBottom:boardDayIdx===i?`2px solid ${GOLD}`:"2px solid transparent",color:boardDayIdx===i?GOLD:"#446",fontWeight:700,fontSize:9,cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>
                  {d.label?.toUpperCase()||`DAY ${i+1}`}
                </button>
              ))}
            </div>
            {boardDay&&(
              <DayBlock day={boardDay} cup={cup}
                onOpen={mid=>{if(canEdit(boardDayIdx,mid))openForScoring(boardDayIdx,mid);}}
                canEdit={mid=>canEdit(boardDayIdx,mid)}/>
            )}

            {/* Hole-by-hole breakdown */}
            {boardDay&&boardDay.matches.length>0&&(()=>{
              const scoreStyle=(gross,par)=>{
                if(gross===null) return {val:"·",color:"#334",bg:"transparent",border:"none",radius:2};
                const d=gross-par;
                if(d<=-2) return {val:gross,color:"#FFD700",bg:"transparent",border:"1.5px double #FFD700",radius:2};
                if(d===-1) return {val:gross,color:"#4caf50",bg:"transparent",border:"1.5px solid #4caf50",radius:"50%"};
                if(d===0)  return {val:gross,color:"#ccd",bg:"transparent",border:"none",radius:2};
                if(d===1)  return {val:gross,color:"#e88",bg:"transparent",border:"1.5px solid #e88",radius:2};
                if(d===2)  return {val:gross,color:"#e55",bg:"transparent",border:"1.5px solid #e55",radius:2};
                return           {val:gross,color:"#fff",bg:"#c0392b",border:"none",radius:2};
              };
              return (
                <div>
                  <div style={{marginTop:16,marginBottom:4,fontSize:9,color:GOLD,fontFamily:"monospace",letterSpacing:2,opacity:0.7}}>HOLE BY HOLE</div>
                  {boardDay.matches.map(m=>{
                    const isSingles=!m.player1b;
                    const st=computeMatchStatus(m.scores,cup.teamAShort,cup.teamBShort);
                    const course=getCourse(boardDay,m);
                    const stColor={pending:BORDER,live:"#4caf50",complete:st.leader==="A"?cup.teamAColor:cup.teamBColor,halved:"#557",gap:"#e67e22"}[st.state];
                    let lead=0;
                    const runLeads=m.scores.map(s=>{if(s===null||s===undefined)return null;if(s==="A")lead++;else if(s==="B")lead--;return lead;});
                    const grossP1a=Array.isArray(m.grossP1a)?m.grossP1a:Array(18).fill(null);
                    const grossP1b=Array.isArray(m.grossP1b)?m.grossP1b:Array(18).fill(null);
                    const grossP2a=Array.isArray(m.grossP2a)?m.grossP2a:Array(18).fill(null);
                    const grossP2b=Array.isArray(m.grossP2b)?m.grossP2b:Array(18).fill(null);
                    const rowLabels=isSingles?[m.player1a,"SCORE",m.player2a]:[m.player1a,m.player1b,"SCORE",m.player2a,m.player2b];
                    const rowColors=isSingles?[cup.teamAColor,null,cup.teamBColorDisp]:[cup.teamAColor,cup.teamAColor,null,cup.teamBColorDisp,cup.teamBColorDisp];
                    const rowData=(hi)=>{
                      const par=(course.par||[])[hi]||4;
                      const s=m.scores[hi]; const rl=runLeads[hi];
                      let scoreCell;
                      if(s===null||s===undefined){scoreCell={val:<div style={{fontSize:9,color:"#334"}}>·</div>,isScore:true};}
                      else if(s==="H"){scoreCell={val:<div style={{fontSize:11,fontWeight:900,color:"#557"}}>—</div>,isScore:true};}
                      else{
                        const num=rl===null?0:Math.abs(rl);
                        const isA=s==="A"; const col=isA?cup.teamAColor:cup.teamBColorDisp;
                        if(num===0){scoreCell={val:<div style={{fontSize:11,fontWeight:900,color:"#557"}}>—</div>,isScore:true};}
                        else{scoreCell={val:(
                          <div style={{position:"relative",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
                            <div style={{width:0,height:0,borderLeft:"13px solid transparent",borderRight:"13px solid transparent",...(isA?{borderBottom:`26px solid ${col}`}:{borderTop:`26px solid ${col}`}),position:"absolute",top:0,left:0}}/>
                            <span style={{position:"relative",zIndex:1,fontSize:10,fontWeight:900,color:"#fff",marginTop:isA?6:-6}}>{num}</span>
                          </div>
                        ),isScore:true};}
                      }
                      if(isSingles) return [scoreStyle(grossP1a[hi],par),scoreCell,scoreStyle(grossP2a[hi],par)];
                      return [scoreStyle(grossP1a[hi],par),scoreStyle(grossP1b[hi],par),scoreCell,scoreStyle(grossP2a[hi],par),scoreStyle(grossP2b[hi],par)];
                    };
                    return (
                      <div key={m.id} style={{marginBottom:14,background:CARD,borderRadius:10,border:`1px solid ${stColor}44`,overflow:"hidden"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:"#060f22",borderBottom:`1px solid ${BORDER}`}}>
                          <div>
                            <div style={{fontSize:11,fontWeight:700,color:cup.teamAColor}}>{isSingles?m.player1a:`${m.player1a} & ${m.player1b}`}</div>
                            <div style={{fontSize:8,color:cup.teamAColor,opacity:0.6,fontFamily:"monospace"}}>{cup.teamAShort}</div>
                          </div>
                          <div style={{fontSize:10,fontWeight:800,color:stColor,fontFamily:"monospace",textAlign:"center",flex:1,padding:"0 8px"}}>{st.longLabel}{st.sublabel?` · ${st.sublabel}`:""}</div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:11,fontWeight:700,color:cup.teamBColorDisp}}>{isSingles?m.player2a:`${m.player2a} & ${m.player2b}`}</div>
                            <div style={{fontSize:8,color:cup.teamBColorDisp,opacity:0.6,fontFamily:"monospace"}}>{cup.teamBShort}</div>
                          </div>
                        </div>
                        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                          <table style={{borderCollapse:"collapse",fontSize:11}}>
                            <thead>
                              <tr style={{background:"#080f20",borderBottom:`1px solid ${BORDER}`}}>
                                <td style={{padding:"5px 10px",fontSize:8,color:"#446",fontFamily:"monospace",whiteSpace:"nowrap",minWidth:70,position:"sticky",left:0,background:"#080f20",zIndex:1}}></td>
                                {Array.from({length:18},(_,i)=>(
                                  <td key={i} style={{textAlign:"center",padding:"5px 4px",fontSize:8,color:"#668",fontFamily:"monospace",minWidth:34,borderLeft:i===9?`1px solid ${BORDER}`:undefined,fontWeight:i===9||i===0?"800":"400"}}>
                                    {i+1}{(m.disputes||[]).includes(i)?<span style={{color:"#e55",fontSize:7,marginLeft:1}}>🚩</span>:null}
                                  </td>
                                ))}
                              </tr>
                              <tr style={{background:"#080f20",borderBottom:`2px solid ${BORDER}`}}>
                                <td style={{padding:"4px 10px",fontSize:8,color:"#446",fontFamily:"monospace",whiteSpace:"nowrap",position:"sticky",left:0,background:"#080f20",zIndex:1}}>PAR</td>
                                {(course.par||Array(18).fill(4)).map((p,i)=>(
                                  <td key={i} style={{textAlign:"center",padding:"4px 4px",fontSize:9,color:"#557",fontFamily:"monospace",fontWeight:700,borderLeft:i===9?`1px solid ${BORDER}`:undefined}}>{p}</td>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {rowLabels.map((label,ri)=>{
                                const isScoreRow=label==="SCORE";
                                const nameColor=rowColors[ri];
                                return (
                                  <tr key={ri} style={{borderBottom:`1px solid ${BORDER}22`,background:isScoreRow?"#060f22":ri%2===0?CARD:CARD2}}>
                                    <td style={{padding:"6px 10px",fontSize:isScoreRow?8:11,fontWeight:700,color:isScoreRow?"#446":nameColor,whiteSpace:"nowrap",position:"sticky",left:0,background:isScoreRow?"#060f22":ri%2===0?CARD:CARD2,zIndex:1,fontFamily:isScoreRow?"monospace":"inherit",letterSpacing:isScoreRow?1:0}}>{label}</td>
                                    {Array.from({length:18},(_,hi)=>{
                                      const cell=rowData(hi)[ri];
                                      return (
                                        <td key={hi} style={{textAlign:"center",padding:"4px 2px",borderLeft:hi===9?`1px solid ${BORDER}`:undefined}}>
                                          {isScoreRow?(
                                            <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:30}}>{cell.val}</div>
                                          ):(
                                            <div style={{width:24,height:24,background:cell.bg,border:cell.border,borderRadius:cell.radius,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:cell.color,margin:"0 auto"}}>{cell.val}</div>
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
              );
            })()}
          </div>
        )}

        {/* MY MATCH TAB */}
        {tab==="matches"&&(
          <div>
            {!playerMatch?(
              <div style={{textAlign:"center",padding:"40px 20px",color:MUTED,fontSize:12}}>You are not in any match.</div>
            ):(() => {
              const d=days[playerMatch.dayIdx];
              const m=d?.matches.find(x=>x.id===playerMatch.matchId);
              if (!m) return null;
              const st=computeMatchStatus(m.scores,cup.teamAShort,cup.teamBShort);
              const companion=m.companionId?d.matches.find(x=>x.id===m.companionId):null;
              return (
                <div>
                  <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:16,marginBottom:12}}>
                    <div style={{fontSize:9,color:MUTED,fontFamily:"monospace",letterSpacing:2,marginBottom:8}}>{d.label?.toUpperCase()}</div>
                    <MatchCard match={m} cup={cup} onOpen={()=>{}} canEdit={false}/>
                    {companion&&(
                      <div style={{background:CARD2,borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:11,color:MUTED}}>
                        Playing with: <span style={{color:cup.teamAColor,fontWeight:700}}>{companion.player1a}</span> vs <span style={{color:cup.teamBColorDisp,fontWeight:700}}>{companion.player2a}</span>
                      </div>
                    )}
                    <button onClick={()=>{
                      if(companion)setActiveGroup({dayIdx:playerMatch.dayIdx,matchIds:[m.id,companion.id]});
                      else setActiveMatch(playerMatch);
                    }} style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${cup.teamAColor},${cup.teamBColor})`,border:"none",borderRadius:12,color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",letterSpacing:1,fontFamily:"monospace",marginTop:8}}>
                      {st.state==="pending"?"START SCORING":"ENTER SCORES →"}
                    </button>
                  </div>
                  <div style={{textAlign:"center",fontSize:10,color:MUTED,fontFamily:"monospace"}}>{doneMatches}/{totalMatches} matches complete</div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ADMIN TAB */}
        {tab==="admin"&&isAdmin&&(
          <div>
            {/* Logo */}
            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:12}}>
              <div style={{fontSize:11,color:MUTED,fontFamily:"monospace",letterSpacing:1,marginBottom:10}}>CUP LOGO</div>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                <div style={{width:56,height:56,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",flexShrink:0}}>
                  {meta.logoUrl?<img src={meta.logoUrl} alt="logo" style={{width:"100%",height:"100%",objectFit:"contain"}}/>:<div style={{fontSize:28}}>⛳</div>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <label style={{display:"block",width:"100%",padding:"8px 10px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:MUTED,fontSize:11,cursor:"pointer",textAlign:"center",marginBottom:6}}>
                    📁 Upload image
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={async e=>{
                      const file=e.target.files?.[0]; if(!file) return;
                      const reader=new FileReader();
                      reader.onload=async ev=>{
                        const dataUrl=ev.target.result;
                        await update(ref(db,`cups/${cupId}/meta`),{logoUrl:dataUrl});
                      };
                      reader.readAsDataURL(file);
                    }}/>
                  </label>
                  <input
                    placeholder="…or paste image URL"
                    defaultValue={meta.logoUrl?.startsWith("http")?meta.logoUrl:""}
                    onBlur={async e=>{const v=e.target.value.trim();if(v)await update(ref(db,`cups/${cupId}/meta`),{logoUrl:v});}}
                    style={{width:"100%",padding:"8px 10px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT,fontSize:11,outline:"none"}}
                  />
                </div>
              </div>
              {meta.logoUrl&&<button onClick={async()=>await update(ref(db,`cups/${cupId}/meta`),{logoUrl:null})} style={{fontSize:10,background:"none",border:"none",color:"#e74c3c",cursor:"pointer",padding:0}}>Remove logo</button>}
            </div>

            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:12}}>
              <div style={{fontSize:11,color:MUTED,fontFamily:"monospace",letterSpacing:1,marginBottom:8}}>INVITE CODE</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{flex:1,padding:"12px 14px",background:CARD2,borderRadius:8,fontFamily:"monospace",fontSize:26,fontWeight:900,color:GOLD,letterSpacing:4,textAlign:"center"}}>
                  {meta.inviteCode}
                </div>
                <button onClick={()=>navigator.clipboard?.writeText(meta.inviteCode)} style={{padding:"12px 14px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:GOLD,fontSize:12,cursor:"pointer",fontWeight:700}}>
                  Copy
                </button>
              </div>
              <div style={{fontSize:10,color:MUTED,marginTop:8}}>Share this code with players to join</div>
            </div>

            {days.map((day,di)=>(
              <div key={di} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:12}}>
                <div style={{fontSize:11,color:MUTED,fontFamily:"monospace",letterSpacing:1,marginBottom:10}}>{day.label?.toUpperCase()}</div>
                {day.matches.map(m=>(
                  <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${BORDER}`}}>
                    <div style={{fontSize:12,color:TEXT}}>{m.player1a}{m.player1b?` & ${m.player1b}`:""} vs {m.player2a}{m.player2b?` & ${m.player2b}`:""}</div>
                    <button onClick={async()=>{
                      if(!confirm(`Reset match scores for ${m.player1a} vs ${m.player2a}?`))return;
                      await set(ref(db,`cups/${cupId}/scores/m${m.id}`),null);
                    }} style={{padding:"4px 10px",background:"none",border:"1px solid #e74c3c",borderRadius:6,color:"#e74c3c",fontSize:10,cursor:"pointer",fontFamily:"monospace"}}>
                      Reset
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* SCORES TAB */}
        {tab==="leaderboard"&&(()=>{
          const lbDay=days[boardDayIdx];
          if (!lbDay) return null;
          const playerRows=[];
          for (const m of lbDay.matches) {
            const course=getCourse(lbDay,m);
            const isSingles=!m.player1b;
            const players=isSingles
              ?[{name:m.player1a,gross:m.grossP1a,team:"A"},{name:m.player2a,gross:m.grossP2a,team:"B"}]
              :[{name:m.player1a,gross:m.grossP1a,team:"A"},{name:m.player1b,gross:m.grossP1b,team:"A"},{name:m.player2a,gross:m.grossP2a,team:"B"},{name:m.player2b,gross:m.grossP2b,team:"B"}];
            for (const p of players) {
              if (!p.name) continue;
              const grossArr=Array.isArray(p.gross)?p.gross:Array(18).fill(null);
              let toPar=0,holesPlayed=0;
              for (let i=0;i<18;i++) { if(grossArr[i]!==null){toPar+=grossArr[i]-(course.par?.[i]||4);holesPlayed++;} }
              playerRows.push({name:p.name,team:p.team,gross:grossArr,toPar,holesPlayed,teeTime:m.teeTime,course});
            }
          }
          const started=playerRows.filter(r=>r.holesPlayed>0).sort((a,b)=>b.holesPlayed-a.holesPlayed||a.toPar-b.toPar);
          const notStarted=playerRows.filter(r=>r.holesPlayed===0).sort((a,b)=>(a.teeTime||"").localeCompare(b.teeTime||""));
          let pos=1;
          for (let i=0;i<started.length;i++){
            if(i>0&&started[i].toPar===started[i-1].toPar&&started[i].holesPlayed===started[i-1].holesPlayed){started[i].pos="T"+pos;started[i-1].pos="T"+pos;}
            else{pos=i+1;started[i].pos=String(pos);}
          }
          const fmtPar=(n,p)=>p===0?"—":n===0?"E":n>0?`+${n}`:`${n}`;
          const parColor=(n,p)=>p===0?MUTED:n<0?"#4caf50":n===0?"#ccd":n<=2?"#e88":"#c0392b";
          const HoleScore=({gross,par})=>{
            if(gross===null) return <div style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#335"}}>·</div>;
            const d=gross-par;
            if(d<=-2) return <div style={{position:"relative",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{position:"absolute",width:22,height:22,borderRadius:"50%",border:"1.5px solid #FFD700"}}/><div style={{position:"absolute",width:15,height:15,borderRadius:"50%",border:"1.5px solid #FFD700"}}/><span style={{fontSize:9,fontWeight:900,color:"#FFD700",zIndex:1}}>{gross}</span></div>;
            if(d===-1) return <div style={{position:"relative",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{position:"absolute",width:22,height:22,borderRadius:"50%",border:"1.5px solid #4caf50"}}/><span style={{fontSize:9,fontWeight:900,color:"#4caf50",zIndex:1}}>{gross}</span></div>;
            if(d===0) return <div style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#ccd"}}>{gross}</div>;
            if(d===1) return <div style={{position:"relative",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{position:"absolute",width:22,height:22,border:"1.5px solid #e88",borderRadius:2}}/><span style={{fontSize:9,fontWeight:900,color:"#e88",zIndex:1}}>{gross}</span></div>;
            if(d===2) return <div style={{position:"relative",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{position:"absolute",width:22,height:22,border:"1.5px solid #e55",borderRadius:2}}/><div style={{position:"absolute",width:15,height:15,border:"1.5px solid #e55",borderRadius:1}}/><span style={{fontSize:9,fontWeight:900,color:"#e55",zIndex:1}}>{gross}</span></div>;
            return <div style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",background:"#c0392b",borderRadius:2,fontSize:9,fontWeight:900,color:"#fff"}}>{gross}</div>;
          };
          const course=lbDay.rounds?.[0]?.course||lbDay.course||{par:Array(18).fill(4)};
          return (
            <div style={{paddingBottom:30}}>
              <div style={{display:"flex",gap:6,marginBottom:12}}>
                {days.map((d,i)=>(
                  <button key={i} onClick={()=>setBoardDayOverride(i)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",background:boardDayIdx===i?`${cup.teamBColor}55`:CARD2,borderBottom:boardDayIdx===i?`2px solid ${GOLD}`:"2px solid transparent",color:boardDayIdx===i?GOLD:"#446",fontWeight:700,fontSize:9,cursor:"pointer",fontFamily:"monospace",letterSpacing:1}}>
                    {d.label?.toUpperCase()||`DAY ${i+1}`}
                  </button>
                ))}
              </div>
              <div style={{fontSize:9,color:GOLD,fontFamily:"monospace",letterSpacing:2,marginBottom:10,opacity:0.7}}>{lbDay.label?.toUpperCase()} · INDIVIDUAL SCORES</div>
              {started.length===0&&notStarted.length===0?(
                <div style={{textAlign:"center",padding:"40px 20px",color:"#446"}}><div style={{fontSize:24,marginBottom:8}}>⛳</div><div style={{fontSize:12}}>No scores entered yet</div></div>
              ):(
                <div>
                  {started.length>0&&<div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                    <table style={{borderCollapse:"collapse",width:"100%",minWidth:640,background:CARD,borderRadius:10,overflow:"hidden",border:`1px solid ${BORDER}`}}>
                      <thead>
                        <tr style={{background:"#060f22"}}>
                          <td style={{width:28,padding:"5px 6px",fontSize:8,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>POS</td>
                          <td style={{padding:"5px 8px",fontSize:8,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>PLAYER</td>
                          {Array.from({length:9},(_,i)=><td key={i} style={{width:24,textAlign:"center",padding:"3px 1px",fontSize:8,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>{i+1}</td>)}
                          <td style={{width:28,textAlign:"center",padding:"3px 2px",fontSize:8,color:"#668",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>OUT</td>
                          {Array.from({length:9},(_,i)=><td key={i+9} style={{width:24,textAlign:"center",padding:"3px 1px",fontSize:8,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>{i+10}</td>)}
                          <td style={{width:28,textAlign:"center",padding:"3px 2px",fontSize:8,color:"#668",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>IN</td>
                          <td style={{width:36,textAlign:"center",padding:"3px 4px",fontSize:8,color:GOLD,fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>TOT</td>
                          <td style={{width:40,textAlign:"center",padding:"3px 4px",fontSize:8,color:GOLD,fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>TO PAR</td>
                        </tr>
                        <tr style={{background:"#080f20"}}>
                          <td style={{padding:"3px 6px",fontSize:7,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}></td>
                          <td style={{padding:"3px 8px",fontSize:7,color:"#446",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>PAR</td>
                          {Array.from({length:9},(_,i)=><td key={i} style={{textAlign:"center",padding:"3px 1px",fontSize:8,color:"#668",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>{course.par[i]}</td>)}
                          <td style={{textAlign:"center",padding:"3px 2px",fontSize:8,color:"#668",fontFamily:"monospace",fontWeight:700,borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>{course.par.slice(0,9).reduce((a,b)=>a+b,0)}</td>
                          {Array.from({length:9},(_,i)=><td key={i+9} style={{textAlign:"center",padding:"3px 1px",fontSize:8,color:"#668",fontFamily:"monospace",borderBottom:`1px solid ${BORDER}`}}>{course.par[i+9]}</td>)}
                          <td style={{textAlign:"center",padding:"3px 2px",fontSize:8,color:"#668",fontFamily:"monospace",fontWeight:700,borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>{course.par.slice(9).reduce((a,b)=>a+b,0)}</td>
                          <td style={{textAlign:"center",padding:"3px 4px",fontSize:8,color:"#668",fontFamily:"monospace",fontWeight:700,borderBottom:`1px solid ${BORDER}`,borderLeft:`1px solid ${BORDER}`}}>{course.par.reduce((a,b)=>a+b,0)}</td>
                          <td style={{borderBottom:`1px solid ${BORDER}`}}></td>
                        </tr>
                      </thead>
                      <tbody>
                        {started.map((row,ri)=>{
                          const outTotal=row.gross.slice(0,9).some(g=>g!==null)?row.gross.slice(0,9).reduce((a,g)=>a+(g||0),0):null;
                          const inTotal=row.gross.slice(9).some(g=>g!==null)?row.gross.slice(9).reduce((a,g)=>a+(g||0),0):null;
                          const outPlayed=row.gross.slice(0,9).filter(g=>g!==null).length;
                          const inPlayed=row.gross.slice(9).filter(g=>g!==null).length;
                          return (
                            <tr key={row.name} style={{background:ri%2===0?CARD:CARD2,borderBottom:`1px solid ${BORDER}33`}}>
                              <td style={{padding:"8px 6px",fontSize:10,fontWeight:800,color:"#446",fontFamily:"monospace",whiteSpace:"nowrap"}}>{row.pos}</td>
                              <td style={{padding:"8px 8px",minWidth:80}}><div style={{fontSize:12,fontWeight:700,color:row.team==="A"?cup.teamAColor:cup.teamBColorDisp,whiteSpace:"nowrap"}}>{row.name}</div></td>
                              {Array.from({length:9},(_,i)=><td key={i} style={{textAlign:"center",padding:"4px 1px"}}><HoleScore gross={row.gross[i]} par={row.course.par?.[i]||4}/></td>)}
                              <td style={{textAlign:"center",padding:"4px 2px",borderLeft:`1px solid ${BORDER}`,fontSize:11,fontWeight:700,color:outPlayed>0?parColor(row.gross.slice(0,9).filter(g=>g!==null).reduce((a,g)=>a+g,0)-row.course.par.slice(0,9).reduce((a,b,i)=>row.gross[i]!==null?a+b:a,0),outPlayed):MUTED,fontFamily:"monospace"}}>{outPlayed>0?outTotal:"—"}</td>
                              {Array.from({length:9},(_,i)=><td key={i+9} style={{textAlign:"center",padding:"4px 1px"}}><HoleScore gross={row.gross[i+9]} par={row.course.par?.[i+9]||4}/></td>)}
                              <td style={{textAlign:"center",padding:"4px 2px",borderLeft:`1px solid ${BORDER}`,fontSize:11,fontWeight:700,color:inPlayed>0?parColor(row.gross.slice(9).filter(g=>g!==null).reduce((a,g)=>a+g,0)-row.course.par.slice(9,9+inPlayed).reduce((a,b)=>a+b,0),inPlayed):MUTED,fontFamily:"monospace"}}>{inPlayed>0?inTotal:"—"}</td>
                              <td style={{textAlign:"center",padding:"4px 4px",borderLeft:`1px solid ${BORDER}`,fontSize:11,fontWeight:800,color:parColor(row.toPar,row.holesPlayed),fontFamily:"monospace"}}>{row.holesPlayed>0?row.gross.filter(g=>g!==null).reduce((a,b)=>a+b,0):"—"}</td>
                              <td style={{textAlign:"center",padding:"4px 4px",fontSize:12,fontWeight:900,color:parColor(row.toPar,row.holesPlayed),fontFamily:"monospace"}}>{fmtPar(row.toPar,row.holesPlayed)}{row.holesPlayed<18&&row.holesPlayed>0?<span style={{fontSize:8,color:MUTED}}> ({row.holesPlayed})</span>:null}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>}
                  {notStarted.length>0&&<div style={{marginTop:12}}>
                    <div style={{fontSize:9,color:MUTED,fontFamily:"monospace",letterSpacing:1,marginBottom:6}}>NOT STARTED</div>
                    {notStarted.map(r=>(
                      <div key={r.name} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",background:CARD,borderRadius:6,marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:r.team==="A"?cup.teamAColor:cup.teamBColorDisp}}>{r.name}</span>
                        <span style={{fontSize:10,color:MUTED,fontFamily:"monospace"}}>{r.teeTime||"—"}</span>
                      </div>
                    ))}
                  </div>}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
