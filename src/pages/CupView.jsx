import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { db, ref, onValue, set, update } from "../firebase";
import { computeMatchStatus, standings, courseHcp, playingHcp, strokesOffLow, matchStrokes, SHAMBLE_ALLOWANCE, GOLD } from "../utils/scoring";
import { getTeams, cupSidesFor, matchTeams, teamsToMeta, autoShort, MAX_TEAMS, TEAM_IDS, DEFAULT_TEAM_COLORS, DEFAULT_TEAM_NAMES } from "../utils/teams";
import { contrastText } from "../utils/color";
import HoleEntry from "../components/HoleEntry";
import GroupHoleEntry from "../components/GroupHoleEntry";
import HoleByHoleTable from "../components/HoleByHoleTable";
import CourseSearch from "../components/CourseSearch";
import { isWarmup, warmupKey, WarmupRound, WarmupEntry } from "../components/Warmup";
import { joinCup } from "../utils/joinCup";
import { pushSupported, pushPref, enablePush, disablePush, refreshPush, notifyCup } from "../utils/push";
import { courseFromTee } from "../utils/courseLookup";
import LiveBackground from "../components/LiveBackground";
import TeamChip from "../components/TeamChip";
import ContestPrompt, { ContestHeadsUp } from "../components/ContestPrompt";
import { CONTEST_LABEL, contestKey, contestsOnHole, fmtFeet } from "../utils/contests";
import Icon, { DormieMark } from "../components/Icon";
import { courseLabel, BUILT_IN_COURSES } from "../utils/courses";
import confetti from "canvas-confetti";

// Minutes after midnight for sorting tee times: "11:10", "1:03 PM", "7:30am".
// Blank (TBD) sorts last.
function teeMinutes(t) {
  const m = /(\d{1,2}):(\d{2})\s*([ap])?/i.exec(t || "");
  if (!m) return Infinity;
  const h = Number(m[1]) % (m[3] ? 12 : 24) + (/p/i.test(m[3] || "") ? 12 : 0);
  return h * 60 + Number(m[2]);
}
import { QRCodeSVG } from "qrcode.react";

const fmtHcp = v => { const n = Number(v) || 0; return n < 0 ? `+${Math.abs(n).toFixed(1)}` : n.toFixed(1); };

function findPlayerMatch(days, playerName, preferDayIdx = null) {
  const order = preferDayIdx !== null
    ? [preferDayIdx, ...days.map((_,i)=>i).filter(i=>i!==preferDayIdx)]
    : days.map((_,i)=>i);
  for (const di of order) {
    for (const m of days[di]?.matches || []) {
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
function MatchCard({ match, teams, onOpen, canEdit, round, showTeamLabels, sameTeeAsAbove, teeBetween }) {
  const { BORDER } = useTheme();
  // Which two of the cup's teams contest *this* match — with more than two teams
  // in the cup that varies match to match, so the card paints itself in its own
  // pairing's colors rather than a cup-wide team A/team B.
  const { teamAColor, teamAColorDisp, teamAShort, teamBColor, teamBColorDisp, teamBShort } = cupSidesFor(teams, match);
  const isSingles = !match.player1b;
  // Strokes shown beside each name: off the low man in this match, as scored.
  const hcpKeys = isSingles ? ["hcp1a","hcp2a"] : ["hcp1a","hcp1b","hcp2a","hcp2b"];
  const lowHcp = Math.min(...hcpKeys.map(k => Math.round(Number(match[k]) || 0)));
  const strokesOf = k => Math.round(Number(match[k]) || 0) - lowHcp;
  const format = match.format || round?.format;
  const isScramble = format === "Scramble";
  const isShamble = format === "Shamble";
  const pointValue = round?.pointValue ?? 1;
  const st = computeMatchStatus(match.scores, teamAShort, teamBShort, match.startHole || 0, round?.totalHoles || 18, pointValue, round?.allowExtraHoles || false, match.extra || []);
  // A brief gold glow when this match's score changes while you're watching.
  const sig = `${st.state}|${st.shortLabel}|${st.holesPlayed}`;
  const prevSig = useRef(sig);
  const [flashing, setFlashing] = useState(false);
  useEffect(() => {
    if (prevSig.current === sig) return;
    prevSig.current = sig;
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), 1200);
    return () => clearTimeout(t);
  }, [sig]);

  const aWin     = st.state==="complete" && st.leader==="A";
  const bWin     = st.state==="complete" && st.leader==="B";
  const halved   = st.state==="halved";
  const live     = st.state==="live";
  const aLeading = live && st.leader==="A";
  const bLeading = live && st.leader==="B";
  const allSquare= live && !st.leader;

  const aNameColor = aWin ? contrastText(teamAColor) : aLeading ? "var(--strong)" : "var(--name-dim)";
  const bNameColor = bWin ? contrastText(teamBColor) : bLeading ? "var(--strong)" : "var(--name-dim)";
  const aBg = aWin ? teamAColor : aLeading ? `${teamAColor}22` : "var(--panel-e)";
  const bBg = bWin ? teamBColor : bLeading ? `${teamBColor}22` : "var(--panel-e)";
  const liveBadgeColor = aLeading ? contrastText(teamAColor) : bLeading ? contrastText(teamBColor) : "#ffffff"; // six digits: an alpha suffix gets appended below

  const sideLabel = (short, color, align) => showTeamLabels ? (
    <div style={{fontSize:7,fontWeight:800,color,letterSpacing:1,fontFamily:"var(--mono)",marginBottom:2,textAlign:align,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{short}</div>
  ) : null;

  const liveBadge = (
    <div style={{ background:aLeading?`${teamAColor}ee`:bLeading?`${teamBColor}ee`:"#1a2a44", borderRadius:6, padding:"3px 8px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", flexShrink:0, minWidth:54 }}>
      <div style={{ fontSize:7, fontWeight:800, color:`${liveBadgeColor}aa`, fontFamily:"var(--mono)", letterSpacing:1, lineHeight:1.3 }}>THRU {st.holesPlayed}</div>
      <div style={{ fontSize:15, fontWeight:900, color:liveBadgeColor, fontFamily:"var(--mono)", lineHeight:1.1 }}>{allSquare?"AS":`${st.up}UP`}</div>
      <div style={{ width:5, height:5, borderRadius:"50%", background:"#4caf50", marginTop:2, animation:"pulse 1.5s infinite" }}/>
    </div>
  );

  if (!live) {
    let badgeBg="var(--panel-e)", badgeTop="", badgeBot="—", badgeTextColor="var(--strong)";
    if (aWin)       { badgeBg=teamAColor;  badgeTop="WIN";    badgeBot=st.sublabel; badgeTextColor=contrastText(teamAColor); }
    else if (bWin)  { badgeBg=teamBColor;  badgeTop="WIN";    badgeBot=st.sublabel; badgeTextColor=contrastText(teamBColor); }
    else if (halved){ badgeBg="var(--faint-c)";   badgeTop="HALVED"; badgeBot=pointValue===1?"½pt":`${pointValue/2}pt`; }
    // A match teeing off with the one above it (same group) doesn't repeat the time.
    else if (sameTeeAsAbove){ badgeBot=""; }
    // Two singles sharing a tee time (neither started): the time sits on the line
    // between the two cards, beside all four names, rather than on the top one.
    else if (teeBetween){ badgeBot=""; }
    else if (match.teeTime){ badgeTop="TEE"; badgeBot=match.teeTime; }
    const sharedTee = teeBetween && !aWin && !bWin && !halved;
    return (
      <div onClick={canEdit?()=>onOpen(match.id):undefined} style={{ display:"flex", alignItems:"stretch", cursor:canEdit?"pointer":"default", borderBottom:"1px solid var(--sep)", opacity:canEdit?1:0.85, position:"relative", animation:flashing?"flash 1.2s ease-out":"none" }}>
        <div style={{ flex:1, background:aBg, padding:"10px 10px", minWidth:0 }}>
          {sideLabel(teamAShort, aWin||aLeading ? aNameColor : teamAColorDisp, "left")}
          <div style={{display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}>
            <div style={{fontSize:12,fontWeight:800,color:aNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{match.player1a}</div>
            {!isScramble&&strokesOf("hcp1a")>0&&<span title="strokes" style={{fontSize:9,color:"var(--muted2)",fontFamily:"var(--mono)",flexShrink:0}}>({strokesOf("hcp1a")})</span>}
          </div>
          {!isSingles&&<div style={{display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}>
            <div style={{fontSize:12,fontWeight:800,color:aNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{match.player1b}</div>
            {!isScramble&&strokesOf("hcp1b")>0&&<span title="strokes" style={{fontSize:9,color:"var(--muted2)",fontFamily:"var(--mono)",flexShrink:0}}>({strokesOf("hcp1b")})</span>}
          </div>}
          {isScramble&&(match.hcp1a||0)!==0&&<div style={{fontSize:11,fontWeight:800,color:"var(--muted2-b)",fontFamily:"var(--mono)",marginTop:3}}>Team HCP: {fmtHcp(match.hcp1a||0)}</div>}
        </div>
        <div style={{ background:badgeBg, width:64, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"4px", flexShrink:0, position:"relative" }}>
          {sharedTee&&<div style={{ position:"absolute", left:0, right:0, bottom:0, transform:"translateY(50%)", zIndex:2, display:"flex", flexDirection:"column", alignItems:"center", padding:"4px 0", background:badgeBg }}>
            <div style={{ fontSize:7, fontWeight:800, color:"var(--strong-dim)", fontFamily:"var(--mono)", letterSpacing:0.5 }}>TEE</div>
            <div style={{ fontSize:match.teeTime.length>4?11:14, fontWeight:900, color:badgeTextColor, fontFamily:"var(--mono)", lineHeight:1 }}>{match.teeTime}</div>
          </div>}
          {badgeTop&&<div style={{ fontSize:7, fontWeight:800, color:(aWin||bWin)?"#FFD700":"var(--strong-dim)", fontFamily:"var(--mono)", letterSpacing:0.5 }}>{badgeTop}</div>}
          <div style={{ fontSize:badgeBot.length>4?11:14, fontWeight:900, color:badgeTextColor, fontFamily:"var(--mono)", lineHeight:1 }}>{badgeBot}</div>
          {(isScramble||isShamble)&&<div style={{ fontSize:6, color:"#aaa", fontFamily:"var(--mono)", marginTop:1, letterSpacing:0.5 }}>{isScramble?"SCRAMBLE":"SHAMBLE"}</div>}
        </div>
        <div style={{ flex:1, background:bBg, padding:"10px 10px", display:"flex", flexDirection:"column", alignItems:"flex-end", minWidth:0 }}>
          {sideLabel(teamBShort, bWin||bLeading ? bNameColor : teamBColorDisp, "right")}
          <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,overflow:"hidden"}}>
            {!isScramble&&strokesOf("hcp2a")>0&&<span title="strokes" style={{fontSize:9,color:"var(--muted2)",fontFamily:"var(--mono)",flexShrink:0}}>({strokesOf("hcp2a")})</span>}
            <div style={{fontSize:12,fontWeight:800,color:bNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0,textAlign:"right"}}>{match.player2a}</div>
          </div>
          {!isSingles&&<div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,overflow:"hidden"}}>
            {!isScramble&&strokesOf("hcp2b")>0&&<span title="strokes" style={{fontSize:9,color:"var(--muted2)",fontFamily:"var(--mono)",flexShrink:0}}>({strokesOf("hcp2b")})</span>}
            <div style={{fontSize:12,fontWeight:800,color:bNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0,textAlign:"right"}}>{match.player2b}</div>
          </div>}
          {isScramble&&(match.hcp2a||0)!==0&&<div style={{fontSize:11,fontWeight:800,color:"var(--muted2-b)",fontFamily:"var(--mono)",marginTop:3,textAlign:"right"}}>Team HCP: {fmtHcp(match.hcp2a||0)}</div>}
        </div>
      </div>
    );
  }

  // LIVE — names fill left/right; score badge sits in its own fixed center column
  // (previously floated on top of the leading side at 25%/75%, which covered the name text)
  return (
    <div onClick={canEdit?()=>onOpen(match.id):undefined} style={{ display:"flex", alignItems:"stretch", cursor:canEdit?"pointer":"default", borderBottom:"1px solid var(--sep)", opacity:canEdit?1:0.85 }}>
      <div style={{ flex:1, background:aBg, padding:"10px 10px", minWidth:0 }}>
        {sideLabel(teamAShort, aWin||aLeading ? aNameColor : teamAColorDisp, "left")}
        <div style={{display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}>
          <div style={{fontSize:12,fontWeight:800,color:aNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{match.player1a}</div>
          {!isScramble&&strokesOf("hcp1a")>0&&<span title="strokes" style={{fontSize:9,color:"var(--muted2)",fontFamily:"var(--mono)",flexShrink:0}}>({strokesOf("hcp1a")})</span>}
        </div>
        {!isSingles&&<div style={{display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}>
          <div style={{fontSize:12,fontWeight:800,color:aNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{match.player1b}</div>
          {!isScramble&&strokesOf("hcp1b")>0&&<span title="strokes" style={{fontSize:9,color:"var(--muted2)",fontFamily:"var(--mono)",flexShrink:0}}>({strokesOf("hcp1b")})</span>}
        </div>}
        {isScramble&&(match.hcp1a||0)!==0&&<div style={{fontSize:11,fontWeight:800,color:"var(--muted2-b)",fontFamily:"var(--mono)",marginTop:3}}>Team HCP: {fmtHcp(match.hcp1a||0)}</div>}
      </div>
      {liveBadge}
      <div style={{ flex:1, background:bBg, padding:"10px 10px", display:"flex", flexDirection:"column", alignItems:"flex-end", minWidth:0 }}>
        {sideLabel(teamBShort, bWin||bLeading ? bNameColor : teamBColorDisp, "right")}
        <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,overflow:"hidden"}}>
          {!isScramble&&strokesOf("hcp2a")>0&&<span title="strokes" style={{fontSize:9,color:"var(--muted2)",fontFamily:"var(--mono)",flexShrink:0}}>({strokesOf("hcp2a")})</span>}
          <div style={{fontSize:12,fontWeight:800,color:bNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0,textAlign:"right"}}>{match.player2a}</div>
        </div>
        {!isSingles&&<div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,overflow:"hidden"}}>
          {!isScramble&&strokesOf("hcp2b")>0&&<span title="strokes" style={{fontSize:9,color:"var(--muted2)",fontFamily:"var(--mono)",flexShrink:0}}>({strokesOf("hcp2b")})</span>}
          <div style={{fontSize:12,fontWeight:800,color:bNameColor,lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0,textAlign:"right"}}>{match.player2b}</div>
        </div>}
        {isScramble&&(match.hcp2a||0)!==0&&<div style={{fontSize:11,fontWeight:800,color:"var(--muted2-b)",fontFamily:"var(--mono)",marginTop:3,textAlign:"right"}}>Team HCP: {fmtHcp(match.hcp2a||0)}</div>}
      </div>
    </div>
  );
}

function DayBlock({ day, dayIdx, contests = {}, teams, onOpen, canEdit, warmupScores, teamColorOf, canScoreWarmup, onOpenWarmup }) {
  const { BORDER } = useTheme();
  // A cup-wide "team A vs team B" banner only makes sense when there are exactly
  // two teams. Past that, pairings vary per match, so each card names its own two
  // teams and the banner carries just the format and course.
  const twoTeam = teams.length === 2;
  const [{ short: teamAShort, colorDisp: teamAColor }, { short: teamBShort, colorDisp: teamBColorDisp }] = teams;
  const rounds = day.rounds || [{ format: day.format, course: day.course }];
  const multiRound = rounds.length > 1;

  return (
    <div style={{ marginBottom:14, borderRadius:10, overflow:"hidden", border:`1px solid ${BORDER}` }}>
      {/* Day header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--panel-b)", padding:"7px 10px", borderBottom:`1px solid ${BORDER}` }}>
        <div style={{ fontSize:10, fontWeight:800, color:"var(--text-b)", letterSpacing:1, fontFamily:"var(--mono)" }}>{day.label?.toUpperCase()}</div>
      </div>
      {/* Team name header — only show if single round (multi-round has its own per-round) */}
      {!multiRound && !isWarmup(rounds[0]) && (
        <div style={{ display:"flex", flexDirection:"column", background:"var(--panel-a)", borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ display:"flex" }}>
            {twoTeam && <div style={{ flex:1, padding:"5px 10px", fontSize:8, fontWeight:800, color:teamAColor, letterSpacing:1, fontFamily:"var(--mono)" }}><TeamChip color={teamAColor} style={{marginRight:5}}/>{teamAShort}</div>}
            <div style={{ flex:twoTeam?undefined:1, width:twoTeam?64:undefined, textAlign:"center", padding:"5px 0", fontSize:7, color:"var(--muted)", fontFamily:"var(--mono)" }}>{rounds[0].format?.toUpperCase()}</div>
            {twoTeam && <div style={{ flex:1, padding:"5px 10px", fontSize:8, fontWeight:800, color:teamBColorDisp, letterSpacing:1, fontFamily:"var(--mono)", textAlign:"right" }}>{teamBShort}<TeamChip color={teamBColorDisp} style={{marginLeft:5}}/></div>}
          </div>
          {rounds[0].course?.name && (
            <div style={{ textAlign:"center", padding:"0 10px 5px", fontSize:8, color:"var(--muted2)", fontFamily:"var(--mono)", fontWeight:700 }}>{courseLabel(rounds[0].course)}</div>
          )}
        </div>
      )}
      {/* Rounds */}
      {/* Warmups are played before the cup's matches, so they're listed first */}
      {rounds.map((round, ri)=>({round, ri})).sort((a,b)=>isWarmup(b.round)-isWarmup(a.round)).map(({round, ri})=>{
        if (isWarmup(round)) return (
          <div key={ri} style={{ borderTop:ri>0||rounds.length===1?"none":`1px solid ${BORDER}` }}>
            <WarmupRound round={round} scores={warmupScores?.[round.id]} teamColorOf={teamColorOf}
              canScore={canScoreWarmup} onOpen={gi=>onOpenWarmup(ri,gi)}/>
          </div>
        );
        const toMin=teeMinutes;
        const roundMatches = [...day.matches.filter(m=>(m.roundIdx??0)===ri)].sort((a,b)=>toMin(a.teeTime)-toMin(b.teeTime));
        return (
          <div key={ri}>
            {multiRound && (
              <div style={{ display:"flex", background:"var(--panel-d)", borderBottom:`1px solid ${BORDER}`, borderTop:ri>0?`1px solid ${BORDER}`:"none" }}>
                {twoTeam && <div style={{ flex:1, padding:"5px 10px", fontSize:8, fontWeight:800, color:teamAColor, letterSpacing:1, fontFamily:"var(--mono)" }}><TeamChip color={teamAColor} style={{marginRight:5}}/>{teamAShort}</div>}
                <div style={{ flex:twoTeam?undefined:1, textAlign:twoTeam?undefined:"center", padding:"5px 10px", fontSize:8, color:"var(--muted2)", fontFamily:"var(--mono)", fontWeight:700 }}>
                  {round.format?.toUpperCase()}{round.course?.name?` · ${courseLabel(round.course)}`:""}
                </div>
                {twoTeam && <div style={{ flex:1, padding:"5px 10px", fontSize:8, fontWeight:800, color:teamBColorDisp, letterSpacing:1, fontFamily:"var(--mono)", textAlign:"right" }}>{teamBShort}<TeamChip color={teamBColorDisp} style={{marginLeft:5}}/></div>}
              </div>
            )}
            {roundMatches.map((m,i)=>(
              <MatchCard key={m.id} match={m} teams={teams} onOpen={onOpen} canEdit={canEdit(m.id)} round={round} showTeamLabels={!twoTeam}
                sameTeeAsAbove={!!m.teeTime&&i>0&&roundMatches[i-1].teeTime===m.teeTime}
                teeBetween={!!m.teeTime&&roundMatches[i+1]?.teeTime===m.teeTime&&(i===0||roundMatches[i-1].teeTime!==m.teeTime)&&[m,roundMatches[i+1]].every(x=>!(x.scores||[]).some(v=>v!=null))}/>
            ))}
            {/* Side contests for this round and who leads them. */}
            {["ld","ctp"].some(t=>round.contests?.[t]!=null)&&(
              <div style={{ display:"flex", gap:6, padding:"8px", borderTop:`1px solid ${BORDER}`, background:"var(--panel-d)" }}>
                {["ld","ctp"].filter(t=>round.contests?.[t]!=null).map(t=>{
                  const c = contests[contestKey(dayIdx, ri, t)];
                  const team = c && teams.find(x=>x.id===c.team);
                  return (
                    <div key={t} style={{ flex:1, minWidth:0, padding:"7px 9px", borderRadius:8, background:"var(--panel-e)", border:`1px solid ${BORDER}` }}>
                      <div style={{ fontSize:8, fontWeight:800, color:"var(--gold-text)", fontFamily:"var(--mono)", letterSpacing:0.5 }}>{t==="ld"?"🏌️ LONGEST DRIVE":"🎯 CLOSEST TO PIN"} · #{round.contests[t]+1}</div>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:4, fontSize:12, fontWeight:800, color:c?"var(--text-b)":"var(--muted)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {team&&<TeamChip color={team.color}/>}{c ? c.name : "Up for grabs"}
                        {c&&t==="ctp"&&<span style={{ marginLeft:"auto", fontFamily:"var(--mono)", color:"var(--gold-text)" }}>{fmtFeet(c.inches)}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Admin sub-editors ─────────────────────────────────────────────────────────

function AdminHeader({ title, onBack, onSave, saving }) {
  const { BORDER, MUTED, TEXT } = useTheme();
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${BORDER}`}}>
      <button onClick={onBack} style={{background:"none",border:`1px solid ${BORDER}`,borderRadius:8,padding:"5px 10px",color:MUTED,fontSize:11,cursor:"pointer",flexShrink:0}}>← Back</button>
      <div style={{fontSize:14,fontWeight:800,color:TEXT,flex:1}}>{title}</div>
      {onSave&&<button onClick={onSave} disabled={saving} style={{padding:"8px 16px",background:GOLD,border:"none",borderRadius:8,color:"#000",fontWeight:800,fontSize:12,cursor:saving?"wait":"pointer",flexShrink:0}}>{saving?"Saving…":"Save"}</button>}
    </div>
  );
}

function AdminPlayers({ initPlayers, teams, onSave, onBack }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [players, setPlayers] = useState(initPlayers.map(p=>({...p})));
  // Tapping a player's team chip moves them to the next team in the cup, so this
  // works the same whether the cup has two teams or four.
  const teamOf = id => teams.find(t=>t.id===id) || teams[0];
  const nextTeam = id => teams[(teams.findIndex(t=>t.id===id)+1+teams.length)%teams.length]?.id || teams[0].id;
  const [saving, setSaving] = useState(false);
  const fmtH = v => { const n = Number(v) || 0; return n < 0 ? `+${Math.abs(n).toFixed(1)}` : n.toFixed(1); };
  const adj = (i, d) => setPlayers(ps=>ps.map((p,j)=>j===i?{...p,hcp:Math.round(Math.min(36,Math.max(-10,p.hcp+d))*10)/10}:p));
  const handleSave = async () => { setSaving(true); await onSave(players); setSaving(false); onBack(); };
  return (
    <div>
      <AdminHeader title="Players & Handicaps" onBack={onBack} onSave={handleSave} saving={saving}/>
      {players.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 0",borderBottom:`1px solid ${BORDER}`}}>
          <input value={p.name} onChange={e=>setPlayers(ps=>ps.map((x,j)=>j===i?{...x,name:e.target.value}:x))}
            style={{flex:1,padding:"6px 8px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:6,color:TEXT,fontSize:12,outline:"none",minWidth:0}}/>
          <button onClick={()=>setPlayers(ps=>ps.map((x,j)=>j===i?{...x,team:nextTeam(x.team)}:x))}
            title="Tap to move to the next team"
            style={{padding:"5px 9px",background:"none",border:`1px solid ${teamOf(p.team).colorDisp}`,borderRadius:6,color:teamOf(p.team).colorDisp,fontSize:10,fontWeight:800,cursor:"pointer",flexShrink:0,fontFamily:"var(--mono)",maxWidth:78,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {teamOf(p.team).short}
          </button>
          <div style={{display:"flex",flexShrink:0}}>
            <button onClick={()=>adj(i,-0.1)} style={{width:24,height:28,background:"none",border:`1px solid ${BORDER}`,borderRadius:"4px 0 0 4px",color:MUTED,cursor:"pointer",fontSize:13,lineHeight:1}}>−</button>
            <div style={{width:48,height:28,background:CARD2,border:`1px solid ${BORDER}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"var(--gold-text)",fontFamily:"var(--mono)"}}>{fmtH(p.hcp)}</div>
            <button onClick={()=>adj(i,0.1)} style={{width:24,height:28,background:"none",border:`1px solid ${BORDER}`,borderRadius:"0 4px 4px 0",color:MUTED,cursor:"pointer",fontSize:13,lineHeight:1}}>+</button>
          </div>
          <button onClick={()=>setPlayers(ps=>ps.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#e74c3c",cursor:"pointer",fontSize:16,padding:"0 2px",flexShrink:0}}>×</button>
        </div>
      ))}
      <button onClick={()=>setPlayers(ps=>[...ps,{name:"",team:teams[0].id,hcp:0}])}
        style={{width:"100%",marginTop:12,padding:"10px",background:"none",border:`1px solid ${BORDER}`,borderRadius:8,color:MUTED,fontSize:12,cursor:"pointer",fontFamily:"var(--mono)"}}>
        + ADD PLAYER
      </button>
    </div>
  );
}

function AdminCourses({ initDays, onSave, onBack }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [days, setDays] = useState(initDays.map(d=>({...d,rounds:d.rounds.map(r=>({...r,course:{...(r.course||{}),par:[...(r.course?.par||[])],hcp:[...(r.course?.hcp||[])],yardage:Array.from({length:18},(_,i)=>r.course?.yardage?.[i]||null)}}))})));
  const [saving, setSaving] = useState(false);
  const [selDay, setSelDay] = useState(0);
  const [selRound, setSelRound] = useState(0);
  const round = days[selDay]?.rounds[selRound] || {};
  const course = round.course || {};

  const updateCourse = patch => setDays(ds=>ds.map((d,di)=>di!==selDay?d:{...d,rounds:d.rounds.map((r,ri)=>ri!==selRound?r:{...r,course:{...r.course,...patch}})}));

  // Picking a tee sets the round's slope/rating (what RECALC HCPs works from)
  // and takes that tee's own par/stroke index/yardage.
  const applyTee = (c, tee) => updateCourse(courseFromTee(c, tee));

  const updateHole = (field, hi, val) => {
    if (field==="yardage" && val.trim()==="") {
      setDays(ds=>ds.map((d,di)=>di!==selDay?d:{...d,rounds:d.rounds.map((r,ri)=>ri!==selRound?r:{...r,course:{...r.course,yardage:r.course.yardage.map((v,i)=>i===hi?null:v)}})}));
      return;
    }
    const n = parseInt(val); if (isNaN(n)) return;
    setDays(ds=>ds.map((d,di)=>di!==selDay?d:{...d,rounds:d.rounds.map((r,ri)=>ri!==selRound?r:{...r,course:{...r.course,[field]:r.course[field].map((v,i)=>i===hi?n:v)}})}));
  };
  const updateRoundField = (field, val) => {
    setDays(ds=>ds.map((d,di)=>di!==selDay?d:{...d,rounds:d.rounds.map((r,ri)=>ri!==selRound?r:{...r,[field]:val})}));
  };
  const handleSave = async () => { setSaving(true); await onSave(days); setSaving(false); onBack(); };
  return (
    <div>
      <AdminHeader title="Edit Courses" onBack={onBack} onSave={handleSave} saving={saving}/>
      {days.length>1&&<div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>{days.map((d,di)=><button key={di} onClick={()=>{setSelDay(di);setSelRound(0);}} style={{padding:"4px 10px",background:selDay===di?GOLD:"none",border:`1px solid ${selDay===di?GOLD:BORDER}`,borderRadius:6,color:selDay===di?"#000":MUTED,fontSize:11,cursor:"pointer",fontFamily:"var(--mono)"}}>{d.label}</button>)}</div>}
      {days[selDay]?.rounds.length>1&&<div style={{display:"flex",gap:6,marginBottom:10}}>{days[selDay].rounds.map((_,ri)=><button key={ri} onClick={()=>setSelRound(ri)} style={{padding:"4px 10px",background:selRound===ri?GOLD:"none",border:`1px solid ${selRound===ri?GOLD:BORDER}`,borderRadius:6,color:selRound===ri?"#000":MUTED,fontSize:11,cursor:"pointer",fontFamily:"var(--mono)"}}>Round {ri+1}</button>)}</div>}
      <div style={{marginBottom:12}}>
        <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:4}}>COURSE NAME</div>
        <CourseSearch key={`${selDay}-${selRound}`} query={course.name||""} onQueryChange={name=>updateCourse({name})}
          onTee={applyTee} selectedTee={course.teeName}/>
        <select value="" onChange={e=>{const c=BUILT_IN_COURSES.find(x=>x.name===e.target.value); if(!c) return; if(c.tees?.length) applyTee(c,c.tees[0]); else updateCourse({...courseFromTee(c),slope:null,rating:null,teeName:null});}}
          style={{width:"100%",marginTop:8,padding:"9px 10px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:MUTED,fontSize:13,outline:"none",cursor:"pointer"}}>
          <option value="">…or load a saved course</option>
          {[...BUILT_IN_COURSES].sort((a,b)=>a.name.localeCompare(b.name)).map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
        {course.teeName&&<div style={{fontSize:11,color:"var(--gold-text)",marginTop:8,fontFamily:"var(--mono)"}}>Playing the {course.teeName} tees · Rating {course.rating} · Slope {course.slope} — strokes for matches not yet started update automatically when you save.</div>}
      </div>
      {/* Side contests for this round: the hole for each, or none. Longest drive is
          offered on par 4s and 5s only, closest to the pin on par 3s only. */}
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        {[["ld","LONGEST DRIVE HOLE"],["ctp","CLOSEST TO THE PIN HOLE"]].map(([t,label])=>(
          <div key={t} style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:4}}>{label}</div>
            <select value={round.contests?.[t]??""} onChange={e=>updateRoundField("contests",{...(round.contests||{}),[t]:e.target.value===""?null:Number(e.target.value)})}
              style={{width:"100%",padding:"9px 8px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT,fontSize:13,outline:"none",cursor:"pointer"}}>
              <option value="">None</option>
              {(course.par||[]).map((p,i)=>(t==="ctp"?p===3:p!==3)&&<option key={i} value={i}>Hole {i+1} · par {p}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:4}}>HOLES</div>
          <div style={{display:"flex",gap:6}}>
            {[18,9].map(n=>(
              <button key={n} onClick={()=>updateRoundField("totalHoles",n===18?undefined:n)}
                style={{flex:1,padding:"8px 0",background:(round.totalHoles||18)===n?GOLD:CARD2,border:`1px solid ${(round.totalHoles||18)===n?GOLD:BORDER}`,borderRadius:8,color:(round.totalHoles||18)===n?"#000":TEXT,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"var(--mono)"}}>{n}</button>
            ))}
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:4}}>POINT VALUE</div>
          <input type="number" step={0.5} min={0.5} max={5}
            value={round.pointValue??1}
            onChange={e=>{const v=parseFloat(e.target.value); if(!isNaN(v)) updateRoundField("pointValue",v===1?undefined:v);}}
            style={{width:"100%",padding:"8px 10px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT,fontSize:13,outline:"none",boxSizing:"border-box",fontWeight:700,fontFamily:"var(--mono)"}}/>
        </div>
      </div>
      {(round.totalHoles||18)===9&&<div style={{fontSize:10,color:MUTED,marginBottom:12,fontFamily:"var(--mono)"}}>Set which 9 holes each match plays via its "start hole" field in the Matchups editor (hole 1 = front 9, hole 10 = back 9).</div>}
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        {[["slope","SLOPE RATING",55,155,1],["rating","COURSE RATING",60,85,0.1]].map(([field,label,mn,mx,step])=>(
          <div key={field} style={{flex:1}}>
            <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:4}}>{label}</div>
            <input type="number" step={step} min={mn} max={mx}
              value={course[field]??(field==="slope"?113:(course.par?.reduce((a,b)=>a+b,0)||72))}
              onChange={e=>{
                const v=parseFloat(e.target.value); if(isNaN(v)) return;
                setDays(ds=>ds.map((d,di)=>di!==selDay?d:{...d,rounds:d.rounds.map((r,ri)=>ri!==selRound?r:{...r,course:{...r.course,[field]:v}})}));
              }}
              style={{width:"100%",padding:"8px 10px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT,fontSize:13,outline:"none",boxSizing:"border-box",fontWeight:700,fontFamily:"var(--mono)"}}/>
          </div>
        ))}
        <div style={{textAlign:"center",paddingTop:18}}>
          <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)"}}>PAR</div>
          <div style={{fontSize:15,fontWeight:900,color:TEXT,fontFamily:"var(--mono)"}}>{course.par?.reduce((a,b)=>a+b,0)||"—"}</div>
        </div>
      </div>
      {["par","hcp","yardage"].map(field=>(
        <div key={field} style={{marginBottom:12}}>
          <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:6}}>{field==="par"?"PAR PER HOLE":field==="hcp"?"HANDICAP INDEX":"YARDAGE"}</div>
          <div style={{overflowX:"auto"}}>
            <div style={{display:"flex",gap:3,minWidth:"max-content"}}>
              {Array.from({length:18},(_,i)=>(
                <div key={i} style={{textAlign:"center"}}>
                  <div style={{fontSize:8,color:MUTED,marginBottom:2,fontFamily:"var(--mono)"}}>{i+1}</div>
                  <input type="number" min={field==="par"?3:field==="hcp"?1:1} max={field==="par"?5:field==="hcp"?18:700}
                    value={field==="yardage"?(course.yardage?.[i]??""):(course[field]?.[i]||(field==="par"?4:i+1))}
                    placeholder={field==="yardage"?"—":undefined}
                    onChange={e=>updateHole(field,i,e.target.value)}
                    style={{width:field==="yardage"?38:30,height:30,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:4,color:TEXT,fontSize:11,textAlign:"center",outline:"none",padding:0}}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Match ids encode the round in their hundreds digit, so a day tops out well below 10 rounds.
const MAX_ROUNDS_PER_DAY = 4;

// A new round starts on the same course as the round before it (most trips play
// a course twice in a day); "Edit Courses" changes it.
const newRoundAfter = prev => ({
  format:"2v2 Best Ball",
  course: prev?.course ? {...prev.course} : {name:"",par:Array(18).fill(4),hcp:Array.from({length:18},(_,i)=>i+1),slope:113,rating:72},
});

function AdminRounds({ initDays, cupPlayers, onSave, onBack }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [days, setDays] = useState(initDays.map(d=>({...d,rounds:d.rounds.map(r=>({...r,...(r.groups?{groups:r.groups.map(g=>({...g,players:[...(g.players||[])]}))}:{})}))})));
  const [saving, setSaving] = useState(false);
  const handleSave = async () => { setSaving(true); await onSave(days); setSaving(false); onBack(); };

  // Removing a round also drops its matches, and shifts the roundIdx of any
  // later rounds in the same day down by one so they stay contiguous — the
  // actual match-id renumbering (ids encode dayIdx/roundIdx) happens in
  // saveAdminRounds when this gets saved.
  const removeRound = (di, ri) => {
    if (!window.confirm("Remove this round? Its matches and any scores already entered will be deleted permanently once you save.")) return;
    setDays(ds=>ds.map((d,i)=>{
      if (i!==di) return d;
      return {
        ...d,
        rounds: d.rounds.filter((_,j)=>j!==ri),
        matches: d.matches
          .filter(m=>(m.roundIdx??0)!==ri)
          .map(m=>(m.roundIdx??0)>ri ? {...m, roundIdx:(m.roundIdx??0)-1} : m),
      };
    }));
  };

  const setRound = (di, ri, fn) => setDays(ds=>ds.map((d,i)=>i!==di?d:{...d,rounds:d.rounds.map((r,j)=>j!==ri?r:fn(r))}));

  // New rounds go at the end of the day, so no existing match ids shift.
  const addRound = (di, warmup) => setDays(ds=>ds.map((d,i)=>{
    if (i!==di) return d;
    const r = newRoundAfter(d.rounds[d.rounds.length-1]);
    return {...d, rounds:[...d.rounds, warmup
      ? {...r, format:"Warmup", pointValue:0, id:`w${Date.now().toString(36)}`, groups:[{teeTime:"",players:[]}]}
      : r]};
  }));

  const addDay = () => setDays(ds=>[...ds, {label:`Day ${ds.length+1}`, rounds:[newRoundAfter(ds[ds.length-1]?.rounds?.[0])], matches:[]}]);

  const setGroup = (di, ri, gi, fn) => setRound(di, ri, r=>({...r, groups:r.groups.map((g,k)=>k!==gi?g:fn(g))}));
  const togglePlayer = (di, ri, gi, name) => setGroup(di, ri, gi, g=>({...g, players:g.players.includes(name)?g.players.filter(n=>n!==name):[...g.players,name]}));

  const chip = on => ({padding:"5px 9px",background:on?GOLD:"none",border:`1px solid ${on?GOLD:BORDER}`,borderRadius:6,color:on?"#000":MUTED,fontSize:11,cursor:"pointer",fontWeight:on?800:400});
  const dashed = {flex:1,padding:"8px",background:"none",border:`1px dashed ${BORDER}`,borderRadius:8,color:MUTED,fontSize:11,cursor:"pointer",fontFamily:"var(--mono)"};

  return (
    <div>
      <AdminHeader title="Edit Rounds" onBack={onBack} onSave={handleSave} saving={saving}/>
      {days.map((day,di)=>(
        <div key={di} style={{marginBottom:16}}>
          <div style={{fontSize:11,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:8}}>{day.label?.toUpperCase()}</div>
          {day.rounds.map((r,ri)=>(
            <div key={ri} style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:10,padding:12,marginBottom:8}}>
              {day.rounds.length>1&&
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)"}}>ROUND {ri+1}</div>
                  <button onClick={()=>removeRound(di,ri)} title="Remove this round (deletes its matches and scores)"
                    style={{background:"none",border:"none",color:"#e74c3c",cursor:"pointer",fontSize:14,lineHeight:1}}>×</button>
                </div>}
              {isWarmup(r) ? (
                <div>
                  <div style={{fontSize:11,color:MUTED,fontFamily:"var(--mono)",marginBottom:8}}>WARMUP · no points · tee-time groups</div>
                  {(r.groups||[]).map((g,gi)=>{
                    // A player can only be in one group per warmup.
                    const taken = new Set((r.groups||[]).flatMap((x,k)=>k===gi?[]:x.players||[]));
                    return (
                      <div key={gi} style={{borderTop:`1px solid ${BORDER}`,padding:"8px 0"}}>
                        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                          <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)"}}>GROUP {gi+1}</div>
                          <input value={g.teeTime||""} placeholder="Tee time" onChange={e=>setGroup(di,ri,gi,x=>({...x,teeTime:e.target.value}))}
                            style={{flex:1,padding:"5px 8px",background:"none",border:`1px solid ${BORDER}`,borderRadius:6,color:TEXT,fontSize:12,outline:"none",minWidth:0}}/>
                          <button onClick={()=>setRound(di,ri,x=>({...x,groups:(x.groups||[]).filter((_,k)=>k!==gi)}))} title="Remove group"
                            style={{background:"none",border:"none",color:"#e74c3c",cursor:"pointer",fontSize:14,lineHeight:1}}>×</button>
                        </div>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {cupPlayers.filter(p=>!taken.has(p.name)).map(p=>(
                            <button key={p.name} onClick={()=>togglePlayer(di,ri,gi,p.name)} style={chip(g.players.includes(p.name))}>{p.name}</button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={()=>setRound(di,ri,x=>({...x,groups:[...(x.groups||[]),{teeTime:"",players:[]}]}))} style={{...dashed,width:"100%",marginTop:6}}>+ ADD GROUP</button>
                </div>
              ) :
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["2v2 Best Ball","Singles","Scramble","Shamble"].map(f=>(
                  <button key={f} onClick={()=>setDays(ds=>ds.map((d,i)=>i!==di?d:{...d,rounds:d.rounds.map((x,j)=>j!==ri?x:{...x,format:f})}))}
                    style={{padding:"6px 12px",background:r.format===f?GOLD:"none",border:`1px solid ${r.format===f?GOLD:BORDER}`,borderRadius:6,color:r.format===f?"#000":MUTED,fontSize:11,cursor:"pointer",fontFamily:"var(--mono)",fontWeight:r.format===f?800:400}}>
                    {f}
                  </button>
                ))}
              </div>}
            </div>
          ))}
          {day.rounds.length<MAX_ROUNDS_PER_DAY&&(
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>addRound(di,false)} style={dashed}>+ ADD ROUND</button>
              <button onClick={()=>addRound(di,true)} style={dashed}>+ ADD WARMUP</button>
            </div>
          )}
        </div>
      ))}
      <button onClick={addDay} style={{...dashed,width:"100%",padding:"10px"}}>+ ADD DAY</button>
      <div style={{fontSize:10,color:MUTED,marginTop:10,lineHeight:1.5}}>New rounds copy the previous round's course; change it in Edit Courses. Add matches in Edit Matchups.</div>
    </div>
  );
}

function AdminMatchups({ initDays, cupPlayers, teams, onSave, onBack }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [days, setDays] = useState(initDays.map(d=>({...d,matches:d.matches.map(m=>({...m}))})));
  const [saving, setSaving] = useState(false);
  // With more than two teams the pairing is per match, so the editor exposes a
  // team picker on each side and filters the player lists to that team.
  const pickTeams = teams.length > 2;
  const sidesOf = m => matchTeams(teams, m);
  const rosterOf = t => cupPlayers.filter(p=>p.team===t.id);

  // Changing which team plays a side invalidates whoever was picked for it.
  const setSideTeam = (di, matchId, side, teamId) => setDays(ds=>ds.map((d,i)=>i!==di?d:{...d,matches:d.matches.map(m=>{
    if (m.id!==matchId) return m;
    const n = side==="A" ? "1" : "2";
    return {...m, [side==="A"?"teamA":"teamB"]:teamId,
            [`player${n}a`]:"", [`hcp${n}a`]:0, [`player${n}b`]:m[`player${n}b`]===null?null:"", [`hcp${n}b`]:0};
  })}));

  const setField = (di, matchId, field, val) => setDays(ds=>ds.map((d,i)=>i!==di?d:{...d,matches:d.matches.map(m=>{
    if (m.id!==matchId) return m;
    if (!field.startsWith("player")) return {...m,[field]:val};
    // Picking a player re-strokes the match off its low man (see matchStrokes).
    const next={...m,[field]:val||""};
    const round=ds[di].rounds?.[m.roundIdx??0];
    if (!round?.course?.par?.length||!next.player1a||!next.player2a) return next;
    return {...next,...matchStrokes(next,n=>cupPlayers.find(p=>p.name===n)?.hcp||0,round.course,next.format||round.format,round.totalHoles||18)};
  })}));

  const moveMatch = (di, matchId, direction, ri) => setDays(ds=>ds.map((d,i)=>{
    if (i!==di) return d;
    const riIndices=d.matches.map((m,idx)=>((m.roundIdx??0)===ri?idx:-1)).filter(idx=>idx>=0);
    const riMatchPos=riIndices.findIndex(idx=>d.matches[idx].id===matchId);
    const targetRiPos=riMatchPos+direction;
    if (targetRiPos<0||targetRiPos>=riIndices.length) return d;
    const newMatches=[...d.matches];
    [newMatches[riIndices[riMatchPos]],newMatches[riIndices[targetRiPos]]]=[newMatches[riIndices[targetRiPos]],newMatches[riIndices[riMatchPos]]];
    return {...d,matches:newMatches};
  }));

  const addMatch = (di, ri) => {
    const riMs = days[di].matches.filter(m=>m.roundIdx===ri);
    const base = (di+1)*1000+(ri+1)*100;
    const maxId = riMs.length>0 ? Math.max(...riMs.map(m=>m.id)) : base;
    const newId = Math.max(maxId+1, base+riMs.length+1);
    setDays(ds=>ds.map((d,i)=>i!==di?d:{...d,matches:[...d.matches,{id:newId,roundIdx:ri,teamA:teams[0].id,teamB:teams[1].id,player1a:"",player1b:null,player2a:"",player2b:null,hcp1a:0,hcp1b:0,hcp2a:0,hcp2b:0,teeTime:"",scores:Array(18).fill(null),disputes:[]}]}));
  };

  const removeMatch = (di, matchId) => setDays(ds=>ds.map((d,i)=>i!==di?d:{...d,matches:d.matches.filter(m=>m.id!==matchId)}));

  const recalcHcps = (di, ri) => {
    const round = days[di]?.rounds[ri];
    if (!round?.course?.par?.length) return;
    const indexOf = name => cupPlayers.find(p=>p.name===name)?.hcp||0;
    setDays(ds=>ds.map((d,dii)=>dii!==di?d:{...d,matches:d.matches.map(m=>(m.roundIdx??0)!==ri?m:{...m,...matchStrokes(m,indexOf,round.course,m.format||round.format,round.totalHoles||18)})}));
  };

  const handleSave = async () => {
    setSaving(true);
    const rounded = days.map(d=>({...d,matches:d.matches.map(m=>({
      ...m,
      hcp1a:Math.round((parseFloat(m.hcp1a)||0)*10)/10,
      hcp1b:Math.round((parseFloat(m.hcp1b)||0)*10)/10,
      hcp2a:Math.round((parseFloat(m.hcp2a)||0)*10)/10,
      hcp2b:Math.round((parseFloat(m.hcp2b)||0)*10)/10,
    }))}));
    await onSave(rounded);
    setSaving(false);
    onBack();
  };

  const PSel = ({di,matchId,field,side,isScramble,format})=>{
    const m=days[di].matches.find(x=>x.id===matchId);
    const opts=rosterOf(side==="A"?sidesOf(m).a:sidesOf(m).b);
    return (
      <select value={m?.[field]||""} onChange={e=>{
        const val=e.target.value;
        setDays(ds=>ds.map((d,i)=>i!==di?d:{...d,matches:d.matches.map(mx=>{
          if(mx.id!==matchId) return mx;
          const player=cupPlayers.find(p=>p.name===val);
          // For scramble, don't auto-set hcp from player — team hcp is set separately
          // Picking a player re-strokes the match off its low man (see recalcHcps).
          const next={...mx,[field]:val||""};
          const round=days[di].rounds[mx.roundIdx??0];
          if(!round?.course?.par?.length||!next.player1a||!next.player2a) return next;
          return {...next,...matchStrokes(next,n=>cupPlayers.find(p=>p.name===n)?.hcp||0,round.course,format||round.format,round.totalHoles||18)};
        })}));
      }}
        style={{flex:1,padding:"5px 6px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:6,color:TEXT,fontSize:11,cursor:"pointer",minWidth:0}}>
        <option value="">—</option>
        {opts.map(p=><option key={p.name} value={p.name}>{p.name}</option>)}
      </select>
    );
  };

  const HcpStepper = ({di,matchId,field,color})=>{
    const m=days[di].matches.find(x=>x.id===matchId);
    const raw=m?.[field];
    const display=raw===undefined||raw===""?"":raw;
    const setVal=(v)=>setDays(ds=>ds.map((day,i)=>i!==di?day:{...day,matches:day.matches.map(mx=>mx.id!==matchId?mx:{...mx,[field]:v})}));
    const adj=(d)=>{
      const cur=parseFloat(raw)||0;
      const next=Math.max(0,Math.round((cur+d)*10)/10);
      setVal(next);
    };
    return (
      <div style={{display:"flex",alignItems:"center",gap:0}}>
        <button onClick={()=>adj(-0.1)} style={{width:22,height:28,background:"none",border:`1px solid ${BORDER}`,borderRadius:"6px 0 0 6px",color:MUTED,cursor:"pointer",fontSize:12,lineHeight:1}}>−</button>
        <input
          type="number" inputMode="decimal" step="0.1" min="0"
          value={display}
          onChange={e=>setVal(e.target.value)}
          onBlur={e=>{
            const n=parseFloat(e.target.value);
            if(isNaN(n)) setVal(0); else setVal(Math.round(n*10)/10);
          }}
          style={{width:44,height:28,background:CARD2,border:`1px solid ${BORDER}`,borderLeft:"none",borderRight:"none",textAlign:"center",fontSize:12,fontWeight:800,color,fontFamily:"var(--mono)",outline:"none",MozAppearance:"textfield"}}
        />
        <button onClick={()=>adj(0.1)} style={{width:22,height:28,background:"none",border:`1px solid ${BORDER}`,borderRadius:"0 6px 6px 0",color:MUTED,cursor:"pointer",fontSize:12,lineHeight:1}}>+</button>
      </div>
    );
  };

  return (
    <div>
      <AdminHeader title="Edit Matchups" onBack={onBack} onSave={handleSave} saving={saving}/>
      {days.map((day,di)=>(
        <div key={di} style={{marginBottom:16}}>
          <div style={{fontSize:11,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:8}}>{day.label?.toUpperCase()}</div>
          {day.rounds.map((r,ri)=>{
            if (isWarmup(r)) return (
              <div key={ri} style={{marginBottom:10,fontSize:10,color:MUTED,fontFamily:"var(--mono)"}}>ROUND {ri+1} · WARMUP — tee-time groups and scores only, no matches or points</div>
            );
            const rMs=day.matches.filter(m=>(m.roundIdx??0)===ri);
            const isSingles=r.format==="Singles";
            const isScramble=r.format==="Scramble";
            return (
              <div key={ri} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  {day.rounds.length>1
                    ? <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)"}}>ROUND {ri+1} · {r.format}</div>
                    : <div/>}
                  <button onClick={()=>recalcHcps(di,ri)}
                    style={{padding:"4px 10px",background:"none",border:`1px solid ${GOLD}`,borderRadius:6,color:"var(--gold-text)",fontSize:9,fontWeight:800,cursor:"pointer",fontFamily:"var(--mono)",letterSpacing:0.5}}>
                    ⟳ RECALC HCPs
                  </button>
                </div>
                {rMs.map((m,mi)=>(
                  <div key={m.id} style={{background:CARD2,border:`1px solid ${BORDER}`,borderRadius:10,padding:10,marginBottom:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input value={m.teeTime||""} onChange={e=>setField(di,m.id,"teeTime",e.target.value)} placeholder="Tee time"
                          style={{width:70,padding:"3px 6px",background:"none",border:`1px solid ${BORDER}`,borderRadius:4,color:TEXT,fontSize:10,outline:"none",fontFamily:"var(--mono)"}}/>
                        <input type="number" min={1} max={18} value={(m.startHole||0)+1}
                          onChange={e=>{const n=parseInt(e.target.value,10); setField(di,m.id,"startHole", isNaN(n)?0:Math.min(18,Math.max(1,n))-1);}}
                          title="Starting hole (for shotgun/split starts — rest of the round follows in order from here)" placeholder="Hole 1"
                          style={{width:44,padding:"3px 6px",background:"none",border:`1px solid ${BORDER}`,borderRadius:4,color:TEXT,fontSize:10,outline:"none",fontFamily:"var(--mono)"}}/>
                        <div style={{display:"flex",flexDirection:"column",gap:1}}>
                          <button onClick={()=>moveMatch(di,m.id,-1,ri)} disabled={mi===0}
                            style={{width:20,height:18,background:"none",border:`1px solid ${BORDER}`,borderRadius:3,color:mi===0?"var(--faint)":MUTED,cursor:mi===0?"default":"pointer",fontSize:9,lineHeight:1,padding:0}}>▲</button>
                          <button onClick={()=>moveMatch(di,m.id,1,ri)} disabled={mi===rMs.length-1}
                            style={{width:20,height:18,background:"none",border:`1px solid ${BORDER}`,borderRadius:3,color:mi===rMs.length-1?"var(--faint)":MUTED,cursor:mi===rMs.length-1?"default":"pointer",fontSize:9,lineHeight:1,padding:0}}>▼</button>
                        </div>
                      </div>
                      <button onClick={()=>removeMatch(di,m.id)} style={{background:"none",border:"none",color:"#e74c3c",cursor:"pointer",fontSize:14}}>×</button>
                    </div>
                    {pickTeams&&(
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
                        {["A","B"].map(side=>{
                          const t=side==="A"?sidesOf(m).a:sidesOf(m).b;
                          return (
                            <div key={side} style={{flex:1,display:"flex",alignItems:"center",gap:4,minWidth:0}}>
                              {side==="B"&&<span style={{fontSize:8,color:MUTED,fontFamily:"var(--mono)",flexShrink:0}}>vs</span>}
                              <select value={t.id} onChange={e=>setSideTeam(di,m.id,side,e.target.value)}
                                style={{flex:1,padding:"4px 6px",background:CARD2,border:`1px solid ${t.colorDisp}`,borderRadius:6,color:t.colorDisp,fontSize:10,fontWeight:800,cursor:"pointer",minWidth:0,fontFamily:"var(--mono)"}}>
                                {teams.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:5}}>
                      <span style={{fontSize:8,color:sidesOf(m).a.colorDisp,fontWeight:800,fontFamily:"var(--mono)",width:pickTeams?24:10,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pickTeams?sidesOf(m).a.short:"A"}</span>
                      <PSel di={di} matchId={m.id} field="player1a" side="A" isScramble={isScramble} format={r.format}/>
                      {!isScramble&&<HcpStepper di={di} matchId={m.id} field="hcp1a" color={sidesOf(m).a.colorDisp}/>}
                      {!isSingles&&<PSel di={di} matchId={m.id} field="player1b" side="A" isScramble={isScramble} format={r.format}/>}
                      {!isSingles&&!isScramble&&<HcpStepper di={di} matchId={m.id} field="hcp1b" color={sidesOf(m).a.colorDisp}/>}
                      {isScramble&&<HcpStepper di={di} matchId={m.id} field="hcp1a" color={sidesOf(m).a.colorDisp}/>}
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{fontSize:8,color:sidesOf(m).b.colorDisp,fontWeight:800,fontFamily:"var(--mono)",width:pickTeams?24:10,flexShrink:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pickTeams?sidesOf(m).b.short:"B"}</span>
                      <PSel di={di} matchId={m.id} field="player2a" side="B" isScramble={isScramble} format={r.format}/>
                      {!isScramble&&<HcpStepper di={di} matchId={m.id} field="hcp2a" color={sidesOf(m).b.colorDisp}/>}
                      {!isSingles&&<PSel di={di} matchId={m.id} field="player2b" side="B" isScramble={isScramble} format={r.format}/>}
                      {!isSingles&&!isScramble&&<HcpStepper di={di} matchId={m.id} field="hcp2b" color={sidesOf(m).b.colorDisp}/>}
                      {isScramble&&<HcpStepper di={di} matchId={m.id} field="hcp2a" color={sidesOf(m).b.colorDisp}/>}
                    </div>
                    {isScramble&&<div style={{fontSize:9,color:MUTED,marginTop:4,fontFamily:"var(--mono)"}}>Team HCP (lowest = 0)</div>}
                    {!isScramble&&<div style={{fontSize:9,color:MUTED,marginTop:4,fontFamily:"var(--mono)"}}>HCP · lowest = 0{r.format==="Shamble"?` · ${SHAMBLE_ALLOWANCE*100}% allowance`:""}</div>}
                  </div>
                ))}
                <button onClick={()=>addMatch(di,ri)} style={{width:"100%",padding:"8px",background:"none",border:`1px solid ${BORDER}`,borderRadius:8,color:MUTED,fontSize:11,cursor:"pointer",fontFamily:"var(--mono)"}}>+ ADD MATCH</button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function AdminAdmins({ allPlayers, initAdminPlayers, onSave, onBack }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [adminPlayers, setAdminPlayers] = useState(initAdminPlayers || []);
  const [saving, setSaving] = useState(false);

  const toggle = (name) =>
    setAdminPlayers(prev => prev.includes(name) ? prev.filter(n=>n!==name) : [...prev, name]);

  const handleSave = async () => { setSaving(true); await onSave(adminPlayers); setSaving(false); onBack(); };

  return (
    <div>
      <AdminHeader title="Admin Access" onBack={onBack} onSave={handleSave} saving={saving}/>
      <div style={{fontSize:12,color:MUTED,marginBottom:16,lineHeight:1.5}}>
        Players with admin can edit matchups, scores, courses, and settings.
      </div>
      {allPlayers.length === 0 && (
        <div style={{fontSize:12,color:MUTED,fontFamily:"var(--mono)",padding:"8px 0"}}>No players found. Add players first.</div>
      )}
      {allPlayers.map(name => {
        const isOn = adminPlayers.includes(name);
        return (
          <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${BORDER}`}}>
            <div style={{fontSize:13,color:TEXT,fontWeight:600}}>{name}</div>
            <button onClick={()=>toggle(name)}
              style={{padding:"5px 16px",background:isOn?GOLD:"none",border:`1px solid ${isOn?GOLD:BORDER}`,borderRadius:8,color:isOn?"#000":MUTED,fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:"var(--mono)"}}>
              {isOn?"ADMIN":"player"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function AdminScores({ days, onOpenMatch, onBack }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  return (
    <div>
      <AdminHeader title="Edit Scores" onBack={onBack}/>
      {days.map((day,di)=>(
        <div key={di} style={{marginBottom:16}}>
          <div style={{fontSize:11,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:8}}>{day.label?.toUpperCase()}</div>
          {day.matches.length===0&&<div style={{fontSize:12,color:MUTED,padding:"8px 0"}}>No matches yet.</div>}
          {day.matches.map(m=>(
            <button key={m.id} onClick={()=>onOpenMatch(di,m)}
              style={{width:"100%",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:10,color:TEXT,fontSize:12,cursor:"pointer",marginBottom:6,textAlign:"left"}}>
              <div>
                <div style={{fontWeight:700}}>{m.player1a||"—"}{m.player1b?` & ${m.player1b}`:""}</div>
                <div style={{color:MUTED,fontSize:11}}>vs {m.player2a||"—"}{m.player2b?` & ${m.player2b}`:""}</div>
              </div>
              <div style={{fontSize:13}}>✏️</div>
            </button>
          ))}
        </div>
      ))}
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
  // Longest drive / closest to the pin: current leaders, and the prompt a group
  // gets after confirming one of those holes.
  const [contests, setContests] = useState({});
  const [contestAsk, setContestAsk] = useState(null);
  const [contestNext, setContestNext] = useState(null); // heads-up before a contest hole
  useEffect(()=>{
    const unsub = onValue(ref(db,`cups/${cupId}/contests`),snap=>setContests(snap.val()||{}));
    return ()=>unsub();
  },[cupId]);
  // When scores last came in, shown as "updated 20s ago" while matches are live.
  const [lastUpdate, setLastUpdate] = useState(null);
  const [, setNowTick] = useState(0);
  useEffect(()=>{ const t=setInterval(()=>setNowTick(n=>n+1),15000); return ()=>clearInterval(t); },[]);
  const [tab, setTab] = useState("scoreboard");
  // Scores tab: which slice of the card to show (a full 18 doesn't fit a phone).
  const [scoreView, setScoreView] = useState("front");
  const [boardDayOverride, setBoardDayOverride] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(()=>{ try{return localStorage.getItem(`jr_player_${cupId}`)||"";}catch{return "";} });
  const [activeMatch, setActiveMatch] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeWarmup, setActiveWarmup] = useState(null); // { dayIdx, roundIdx, groupIdx }
  const [warmupScores, setWarmupScores] = useState({});
  const [offlineQueue, setOfflineQueue] = useState(()=>{ try{return JSON.parse(localStorage.getItem(`jr_queue_${cupId}`))||[];}catch{return [];} });
  const [syncStatus, setSyncStatus] = useState(null);
  const [matchCelebration, setMatchCelebration] = useState(null);

  const [adminSection, setAdminSection] = useState(null);

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

  // Only a cup's members (and its creator) can change it, so someone who
  // opens a cup link without having joined is asked for the invite code.
  const [isMember, setIsMember] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  useEffect(()=>{
    if (!user?.uid) return;
    const unsub = onValue(ref(db,`users/${user.uid}/cups/${cupId}`),snap=>setIsMember(snap.exists()));
    return ()=>unsub();
  },[cupId,user?.uid]);

  useEffect(()=>{
    const unsub = onValue(ref(db,`cups/${cupId}/players`),snap=>{
      if (!snap.exists()) return;
      const data = snap.val();
      setCupPlayers(Object.values(data).filter(p=>p.name).sort((a,b)=>a.name.localeCompare(b.name)));
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
      setLastUpdate(Date.now());
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
            // Sudden-death playoff holes, played beyond regulation when a match is set up
            // to allow extra holes and ends level — parallel arrays, one entry per extra hole.
            extra:fb.extra?Object.values(fb.extra):[],
            extraGrossA:fb.extraGrossA?Object.values(fb.extraGrossA):[],
            extraGrossB:fb.extraGrossB?Object.values(fb.extraGrossB):[],
          };
        }),
      })));
      setLoaded(true);
    });
    return ()=>unsub();
  },[cupId]);

  useEffect(()=>{
    const unsub = onValue(ref(db,`cups/${cupId}/warmupScores`),snap=>setWarmupScores(snap.val()||{}));
    return ()=>unsub();
  },[cupId]);

  const saveWarmupHole = (roundId, hole, vals) => update(ref(db,`cups/${cupId}/warmupScores/${roundId}`),
    Object.fromEntries(Object.entries(vals).map(([name,v])=>[`${warmupKey(name)}/${hole}`, v])));

  // Strokes follow from the players' indexes and the tees being played, so when
  // either changes, every match that hasn't started yet is re-stroked: course
  // handicaps from slope and rating, lowest in the match plays off zero. Matches
  // under way keep the strokes they started with.
  const restrokeUnstarted = async (roundsByDay, players) => {
    const indexOf = name => players.find(p=>p.name===name)?.hcp || 0;
    const updates = {};
    days.forEach((d,di)=>d.matches.forEach(m=>{
      if ((m.scores||[]).some(v=>v!=null) || !m.player1a || !m.player2a) return;
      const round = roundsByDay[di]?.[m.roundIdx??0];
      if (!round?.course?.par?.length || isWarmup(round)) return;
      const st = matchStrokes(m, indexOf, round.course, m.format||round.format, round.totalHoles||18);
      for (const k of ["hcp1a","hcp1b","hcp2a","hcp2b"]) if ((m[k]||0)!==st[k]) updates[`matches/m${m.id}/${k}`]=st[k];
    }));
    if (Object.keys(updates).length) await update(ref(db,`cups/${cupId}`),updates);
  };

  const saveAdminPlayers = async (players) => {
    const obj = {};
    players.forEach(p=>{ if(p.name.trim()) obj[p.name.trim().toLowerCase().replace(/\s+/g,"_")]={name:p.name.trim(),team:p.team,hcp:p.hcp||0}; });
    await set(ref(db,`cups/${cupId}/players`),obj);
    await restrokeUnstarted(days.map(d=>d.rounds), players.filter(p=>p.name.trim()).map(p=>({name:p.name.trim(),hcp:p.hcp||0})));
  };

  const saveAdminDays = async (editedDays) => {
    for (let di=0; di<editedDays.length; di++) {
      const d = editedDays[di];
      await set(ref(db,`cups/${cupId}/days/${di}`),{
        label:d.label,
        rounds:d.rounds.map(r=>({
          format:r.format,
          // Firebase Realtime Database collapses `null` entries out of arrays (reindexing
          // everything after them), so any unset yardage holes get written as 0 instead —
          // read paths treat 0 the same as "no data" for this field.
          course:{name:r.course?.name||"",par:r.course?.par||[],hcp:r.course?.hcp||[],slope:r.course?.slope||113,rating:r.course?.rating||(r.course?.par?.reduce((a,b)=>a+b,0)||72),...(r.course?.yardage?.some(y=>y)?{yardage:r.course.yardage.map(y=>y||0)}:{}),...((r.course?.teeName||r.course?.selectedTee?.name)?{teeName:r.course.teeName||r.course.selectedTee.name}:{})},
          ...(r.totalHoles?{totalHoles:r.totalHoles}:{}),
          ...(r.contests&&(r.contests.ld!=null||r.contests.ctp!=null)?{contests:{...(r.contests.ld!=null?{ld:r.contests.ld}:{}),...(r.contests.ctp!=null?{ctp:r.contests.ctp}:{})}}:{}),
          ...(r.pointValue!=null&&r.pointValue!==1?{pointValue:r.pointValue}:{}),
          ...(isWarmup(r)?{id:r.id,groups:r.groups||[]}:{}),
        })),
      });
    }
    await restrokeUnstarted(editedDays.map(d=>d.rounds), cupPlayers);
  };

  // Like saveAdminDays, but also reconciles cups/{cupId}/matches and .../scores:
  // deletes matches dropped by a round removal, and renumbers the ids of any
  // matches whose roundIdx shifted (match ids encode dayIdx+roundIdx), fixing
  // up companionId references that pointed at anything moved or deleted.
  const saveAdminRounds = async (editedDays) => {
    for (let di=0; di<editedDays.length; di++) {
      const d = editedDays[di];
      await set(ref(db,`cups/${cupId}/days/${di}`),{
        label:d.label,
        rounds:d.rounds.map(r=>({
          format:r.format,
          // Firebase Realtime Database collapses `null` entries out of arrays (reindexing
          // everything after them), so any unset yardage holes get written as 0 instead —
          // read paths treat 0 the same as "no data" for this field.
          course:{name:r.course?.name||"",par:r.course?.par||[],hcp:r.course?.hcp||[],slope:r.course?.slope||113,rating:r.course?.rating||(r.course?.par?.reduce((a,b)=>a+b,0)||72),...(r.course?.yardage?.some(y=>y)?{yardage:r.course.yardage.map(y=>y||0)}:{}),...((r.course?.teeName||r.course?.selectedTee?.name)?{teeName:r.course.teeName||r.course.selectedTee.name}:{})},
          ...(r.totalHoles?{totalHoles:r.totalHoles}:{}),
          ...(r.contests&&(r.contests.ld!=null||r.contests.ctp!=null)?{contests:{...(r.contests.ld!=null?{ld:r.contests.ld}:{}),...(r.contests.ctp!=null?{ctp:r.contests.ctp}:{})}}:{}),
          ...(r.pointValue!=null&&r.pointValue!==1?{pointValue:r.pointValue}:{}),
          ...(isWarmup(r)?{id:r.id,groups:r.groups||[]}:{}),
        })),
      });
    }

    const existingIds = new Set(days.flatMap(d=>d.matches.map(m=>`m${m.id}`)));
    const keptIds = new Set(editedDays.flatMap(d=>d.matches).map(m=>`m${m.id}`));

    const idMap = {}; // oldId -> newId, for matches whose roundIdx shifted
    for (let di=0; di<editedDays.length; di++) {
      for (const m of editedDays[di].matches) {
        const newId = (di+1)*1000 + ((m.roundIdx??0)+1)*100 + (m.id%100);
        if (newId !== m.id) idMap[m.id] = newId;
      }
    }
    const remapCompanion = (cid) => {
      if (cid == null) return null;
      if (idMap[cid] !== undefined) return idMap[cid];
      return keptIds.has(`m${cid}`) ? cid : null;
    };

    const updates = {};
    for (const id of existingIds) {
      if (!keptIds.has(id)) {
        updates[`cups/${cupId}/matches/${id}`] = null;
        updates[`cups/${cupId}/scores/${id}`] = null;
      }
    }
    for (let di=0; di<editedDays.length; di++) {
      for (const m of editedDays[di].matches) {
        const newId = (di+1)*1000 + ((m.roundIdx??0)+1)*100 + (m.id%100);
        const companionId = remapCompanion(m.companionId);
        if (newId !== m.id) {
          updates[`cups/${cupId}/matches/m${m.id}`] = null;
          updates[`cups/${cupId}/matches/m${newId}`] = {
            teeTime:m.teeTime||"", companionId, startHole:m.startHole||0,
            ...matchTeamFields(m),
            player1a:m.player1a||"", hcp1a:m.hcp1a||0,
            player1b:m.player1b||null, hcp1b:m.hcp1b||0,
            player2a:m.player2a||"", hcp2a:m.hcp2a||0,
            player2b:m.player2b||null, hcp2b:m.hcp2b||0,
          };
          if (m.scores?.some(s=>s!=null)) {
            updates[`cups/${cupId}/scores/m${m.id}`] = null;
            updates[`cups/${cupId}/scores/m${newId}`] = {
              scores:m.scores, hcp1a:m.hcp1a||0, hcp1b:m.hcp1b||0, hcp2a:m.hcp2a||0, hcp2b:m.hcp2b||0,
              ...(m.grossP1a?{grossP1a:m.grossP1a}:{}),
              ...(m.grossP1b?{grossP1b:m.grossP1b}:{}),
              ...(m.grossP2a?{grossP2a:m.grossP2a}:{}),
              ...(m.grossP2b?{grossP2b:m.grossP2b}:{}),
              ...(m.disputes?.length?{disputes:m.disputes}:{}),
            };
          }
        } else if (companionId !== (m.companionId??null)) {
          updates[`cups/${cupId}/matches/m${m.id}/companionId`] = companionId;
        }
      }
    }
    if (Object.keys(updates).length) await update(ref(db), updates);
  };

  // Which two teams a match is between. A two-team cup leaves these unset so its
  // matches keep resolving to the only pairing there is; past two teams the ids
  // are written explicitly.
  const matchTeamFields = m => {
    const t = getTeams(meta);
    if (t.length <= 2) return { teamA:m.teamA||null, teamB:m.teamB||null };
    const { a, b } = matchTeams(t, m);
    return { teamA:a.id, teamB:b.id };
  };

  const saveAdminMatchups = async (editedDays) => {
    const existingIds = new Set(days.flatMap(d=>d.matches.map(m=>`m${m.id}`)));
    const newIds = new Set(editedDays.flatMap(d=>d.matches.map(m=>`m${m.id}`)));
    for (const d of editedDays) {
      for (const m of d.matches) {
        await set(ref(db,`cups/${cupId}/matches/m${m.id}`),{
          teeTime:m.teeTime||"", companionId:m.companionId||null, startHole:m.startHole||0,
          ...matchTeamFields(m),
          player1a:m.player1a||"", hcp1a:m.hcp1a||0,
          player1b:m.player1b||null, hcp1b:m.hcp1b||0,
          player2a:m.player2a||"", hcp2a:m.hcp2a||0,
          player2b:m.player2b||null, hcp2b:m.hcp2b||0,
        });
      }
    }
    for (const id of existingIds) {
      if (!newIds.has(id)) await set(ref(db,`cups/${cupId}/matches/${id}`),null);
    }
  };

  const saveAdminAdmins = async (adminPlayers) => {
    await set(ref(db,`cups/${cupId}/meta/adminPlayers`), adminPlayers.length > 0 ? adminPlayers : null);
  };

  // Team edits rewrite the whole teams array, plus the legacy teamAName/teamBName
  // mirror for the first two, so saved cup lists and any older client still show
  // something sensible.
  const writeTeams = next => update(ref(db,`cups/${cupId}/meta`), teamsToMeta(next));

  const saveTeam = (idx, patch) =>
    writeTeams(getTeams(meta).map((t,i)=>{
      if (i!==idx) return t;
      const next = {...t, ...patch};
      // If the nickname was just the initials of the old name, keep it in step
      // with the new one instead of leaving a stale abbreviation behind.
      if (patch.name && !patch.short && t.short === autoShort(t.name, t.id))
        next.short = autoShort(patch.name, t.id);
      return next;
    }));

  const addTeam = () => {
    const cur = getTeams(meta);
    if (cur.length >= MAX_TEAMS) return;
    const id = TEAM_IDS.find(x=>!cur.some(t=>t.id===x));
    if (!id) return;
    const i = cur.length;
    // No explicit short — it derives from the name, and keeps deriving if the
    // organiser renames the team.
    return writeTeams([...cur,{id,name:DEFAULT_TEAM_NAMES[i],color:DEFAULT_TEAM_COLORS[i]}]);
  };

  // Removing a team would orphan anyone assigned to it, so make the admin move
  // them off it first rather than silently reassigning players or matches.
  const removeTeam = t => {
    const cur = getTeams(meta);
    if (cur.length <= 2) return;
    const nPlayers = cupPlayers.filter(p=>p.team===t.id).length;
    const nMatches = days.reduce((n,d)=>n+d.matches.filter(m=>m.teamA===t.id||m.teamB===t.id).length,0);
    if (nPlayers || nMatches) {
      window.alert(`${t.name} still has ${nPlayers} player${nPlayers===1?"":"s"} and ${nMatches} match${nMatches===1?"":"es"}. Move those to another team first, then remove it.`);
      return;
    }
    if (!window.confirm(`Remove ${t.name} from this cup?`)) return;
    return writeTeams(cur.filter(x=>x.id!==t.id));
  };

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
    if (upd.extra?.length) payload.extra=upd.extra;
    if (upd.extraGrossA?.length) payload.extraGrossA=upd.extraGrossA;
    if (upd.extraGrossB?.length) payload.extraGrossB=upd.extraGrossB;
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

  // The cup's teams (2–4). Legacy cups have no meta.teams and fall back to the
  // old teamAName/teamBName pair — see utils/teams.js.
  const teams = getTeams(meta);
  const twoTeam = teams.length === 2;
  const cupSidesOf = m => cupSidesFor(teams, m);

  const { rows:teamRows, totalPoints, winner:winnerTeam, projWinner:projWinnerTeam, winTarget } =
    standings(days, teams);
  // teamRows is sorted by points; the head-to-head board wants each team by id.
  const ptsOf = id => teamRows.find(r=>r.team.id===id) || { actual:0, proj:0 };
  const teamColorOf = id => teams.find(t=>t.id===id)?.colorDisp || MUTED;

  const totalMatches = days.reduce((s,d)=>s+d.matches.length,0);
  const doneMatches  = days.reduce((s,d)=>s+d.matches.filter(m=>["complete","halved"].includes(computeMatchStatus(m.scores,undefined,undefined,m.startHole||0,d.rounds?.[m.roundIdx??0]?.totalHoles||18).state)).length,0);
  const winner = winnerTeam?.name || null;
  const projWinner = projWinnerTeam?.name || null;
  const liveCount = days.reduce((s,d)=>s+d.matches.filter(m=>computeMatchStatus(m.scores,undefined,undefined,m.startHole||0,d.rounds?.[m.roundIdx??0]?.totalHoles||18).state==="live").length,0);

  useEffect(()=>{
    if (winner&&!prevWinnerRef.current&&!confettiFired.current){
      confettiFired.current=true;
      confetti({particleCount:200,spread:120,origin:{y:0.35},colors:[winnerTeam?.color||GOLD,winnerTeam?.colorDisp||GOLD,"#C4A44A","#fff"]});
    }
    prevWinnerRef.current=winner;
  },[winner]);

  useEffect(()=>{
    if (!meta) return;
    let finishedNow=false;
    for (const day of days) for (const m of day.matches){
      const sides=cupSidesFor(getTeams(meta),m);
      const s=computeMatchStatus(m.scores,sides.teamAName,sides.teamBName,m.startHole||0,day.rounds?.[m.roundIdx??0]?.totalHoles||18);
      const prev=prevMatchStates.current[m.id];
      if (prev!==undefined&&prev==="live"&&(s.state==="complete"||s.state==="halved")){
        const color=s.state==="halved"?"var(--faint-c)":s.leader==="A"?sides.teamAColor:sides.teamBColor;
        setMatchCelebration({label:s.longLabel,sublabel:s.sublabel||(s.state==="halved"?"½ pt each":"1 point"),color});
        if (celebTimer.current) clearTimeout(celebTimer.current);
        celebTimer.current=setTimeout(()=>setMatchCelebration(null),1500);
      }
      const done=st=>st==="complete"||st==="halved";
      if (prev!==undefined&&!done(prev)&&done(s.state)) finishedNow=true;
      prevMatchStates.current[m.id]=s.state;
    }
    // A match just finished: have the server send its notifications (and the
    // day's or cup's, if this was the one that decided them).
    if (finishedNow) notifyCup(cupId);
  },[days,meta]);

  // This phone's notification sign-up for the cup: "on", "off", or null (not asked yet).
  const [pushState,setPushState]=useState(()=>pushSupported?pushPref(cupId):"off");
  const togglePush=async on=>{
    if (on) setPushState(await enablePush(user.uid,cupId).catch(()=>false)?"on":"off");
    else { await disablePush(user.uid,cupId); setPushState("off"); }
  };

  // On opening the cup, catch up on any notifications missed while every
  // scorer's phone was offline, and keep this phone's sign-up current.
  const canNotify = loaded&&!!meta&&(isMember||meta?.createdBy===user?.uid);
  useEffect(()=>{
    if (!canNotify) return;
    notifyCup(cupId);
    refreshPush(user.uid,cupId);
  },[canNotify,cupId]);

  useEffect(()=>{ try{if(currentPlayer)localStorage.setItem(`jr_player_${cupId}`,currentPlayer);else localStorage.removeItem(`jr_player_${cupId}`);}catch{} },[currentPlayer,cupId]);

  useEffect(()=>{ if(meta?.eventType==="live_match") setTab("matches"); },[meta?.eventType]);

  if (!meta||!loaded||isMember===null) {
    // Placeholder shapes of the header, tabs and match cards while the cup loads.
    const bone=(h,extra)=>({height:h,borderRadius:10,background:"var(--panel-f)",animation:"shimmer 1.4s ease-in-out infinite",...extra});
    return (
      <div style={{minHeight:"100vh"}}><LiveBackground/>
        <div style={{padding:"16px 14px",display:"flex",alignItems:"center",gap:10}}><div style={bone(24,{width:24,borderRadius:6})}/><div style={bone(18,{width:160})}/></div>
        <div style={bone(92,{borderRadius:0})}/>
        <div style={{display:"flex",gap:6,padding:"8px"}}>{[0,1,2,3].map(i=><div key={i} style={bone(34,{flex:1})}/>)}</div>
        <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:8}}>{[0,1,2,3,4].map(i=><div key={i} style={bone(64)}/>)}</div>
      </div>
    );
  }

  if (!isMember && meta.createdBy!==user?.uid) {
    const submitJoin = async () => {
      setJoining(true); setJoinError("");
      try { await joinCup(user, joinCode, cupId); }
      catch (e) { setJoinError(e.message || "Something went wrong. Try again."); }
      finally { setJoining(false); }
    };
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <LiveBackground/>
        <div style={{width:"100%",maxWidth:360,background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:24,textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:900,color:"var(--gold-text)",fontFamily:"var(--mono)",letterSpacing:1,marginBottom:6}}>{meta.name}</div>
          <div style={{fontSize:12,color:MUTED,marginBottom:16}}>Enter the cup's invite code to join. The organiser can share it from the cup's admin page.</div>
          <input value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter")submitJoin();}}
            placeholder="INVITE CODE" autoCapitalize="characters"
            style={{width:"100%",padding:"12px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:10,color:TEXT,fontSize:16,fontFamily:"var(--mono)",letterSpacing:1.5,textAlign:"center",outline:"none",boxSizing:"border-box"}}/>
          {joinError&&<div style={{fontSize:11,color:"#e74c3c",marginTop:8}}>{joinError}</div>}
          <button onClick={submitJoin} disabled={joining||!joinCode.trim()}
            style={{width:"100%",marginTop:12,padding:"12px",background:GOLD,border:"none",borderRadius:10,color:"#000",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"var(--mono)",opacity:joining||!joinCode.trim()?0.5:1}}>
            {joining?"JOINING…":"JOIN CUP"}
          </button>
          <button onClick={()=>nav("/")} style={{width:"100%",marginTop:10,padding:"10px",background:"none",border:`1px solid ${BORDER}`,borderRadius:10,color:MUTED,fontSize:12,cursor:"pointer"}}>← Back to home</button>
        </div>
      </div>
    );
  }

  // Cup-wide chrome (gradients, tab accents) still needs a two-color bundle;
  // it uses the first two teams. Anything tied to a specific match uses
  // cupSidesOf(match) instead, so each match shows its own pairing's colors.
  const cup = cupSidesOf(null);

  const isAdmin = user?.uid===meta.createdBy || (meta.adminPlayers||[]).includes(currentPlayer);
  const allPlayers = days.flatMap(d=>d.matches.flatMap(m=>[m.player1a,m.player1b,m.player2a,m.player2b].filter(Boolean)));
  const uniquePlayers = cupPlayers.length>0 ? cupPlayers.map(p=>p.name) : [...new Set(allPlayers)];

  let autoDayIdx = -1;
  if (meta.startDate) {
    const start = new Date(meta.startDate + "T12:00:00");
    const today = new Date(); today.setHours(12,0,0,0);
    const dayOffset = Math.round((today - start) / 86400000);
    if (dayOffset >= 0 && dayOffset < days.length) autoDayIdx = dayOffset;
    else if (dayOffset < 0) autoDayIdx = 0;
    else autoDayIdx = days.length - 1;
  } else {
    // Fri/Sat/Sun heuristic for a 3-day cup — irrelevant (and out of range) for a
    // standalone 1-day match, so only trust it when it actually lands inside `days`.
    const dowToDay = {5:0,6:1,0:2};
    const dow = new Date().getDay();
    autoDayIdx = (dowToDay[dow]!==undefined && dowToDay[dow]<days.length) ? dowToDay[dow] : -1;
  }
  if (autoDayIdx===-1){let best=0;for(let i=0;i<days.length;i++)if(days[i]?.matches?.some(m=>m.scores.some(s=>s!==null)))best=i;autoDayIdx=best;}
  const boardDayIdx = boardDayOverride!==null?boardDayOverride:autoDayIdx;
  const boardDay = days[boardDayIdx];
  const playerMatch = currentPlayer?findPlayerMatch(days,currentPlayer,autoDayIdx):null;
  const canEdit = (dayIdx,matchId)=>{ if(isAdmin)return true; if(dayIdx!==autoDayIdx||!playerMatch)return false; return playerMatch.dayIdx===dayIdx&&playerMatch.matchId===matchId; };

  // Warmup groups mix teams, so each player shows their own team's color, and
  // anyone in the group (or an admin) can keep its scores.
  const playerColorOf = name => teamColorOf(cupPlayers.find(p=>p.name===name)?.team);
  const canScoreWarmup = group => isAdmin || (group?.players||[]).includes(currentPlayer);

  const openForScoring = (dayIdx,matchId)=>{
    const d=days[dayIdx]; const m=d?.matches.find(x=>x.id===matchId);
    if (m?.companionId) setActiveGroup({dayIdx,matchIds:[matchId,m.companionId]});
    else setActiveMatch({dayIdx,matchId});
  };

  // Login screen
  if (!currentPlayer) {
    return (
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
        <LiveBackground/>
        <div style={{width:"100%",maxWidth:360}}>
          <div style={{textAlign:"center",marginBottom:28}}>
            {meta.logoUrl
              ? <img src={meta.logoUrl} alt="logo" style={{height:60,objectFit:"contain",marginBottom:8}}/>
              : <div style={{marginBottom:8,display:"flex",justifyContent:"center"}}><DormieMark size={44}/></div>}
            <div style={{fontSize:22,fontWeight:900,color:"var(--gold-text)",fontFamily:"var(--mono)",letterSpacing:1}}>{meta.name}</div>
            <div style={{fontSize:12,color:MUTED,marginTop:6,display:"flex",flexWrap:"wrap",justifyContent:"center",alignItems:"center",gap:4}}>
              {teams.map((t,i)=>(
                <span key={t.id}>
                  {i>0&&<span style={{color:MUTED}}>{twoTeam?" vs ":" · "}</span>}
                  <span style={{color:t.colorDisp,fontWeight:700}}>{t.name}</span>
                </span>
              ))}
            </div>
          </div>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:18,padding:24}}>
            <div style={{fontSize:13,color:MUTED,marginBottom:16,textAlign:"center"}}>Who are you?</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {uniquePlayers.map(name=>(
                <button key={name} onClick={()=>setCurrentPlayer(name)}
                  style={{padding:"12px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:10,color:TEXT,fontSize:14,fontWeight:600,cursor:"pointer",textAlign:"left"}}>
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
  if (activeWarmup){
    const round=days[activeWarmup.dayIdx]?.rounds?.[activeWarmup.roundIdx];
    const group=round?.groups?.[activeWarmup.groupIdx];
    if (round&&group) return <WarmupEntry round={round} group={group} scores={warmupScores[round.id]} teamColorOf={playerColorOf}
      onSaveHole={(hole,vals)=>saveWarmupHole(round.id,hole,vals)} onClose={()=>setActiveWarmup(null)}/>;
  }
  // After a group confirms a hole: if it's a contest hole in this round, ask
  // whether anyone in the group took the lead.
  const askContests = (dayIdx, ms, hole) => {
    const roundIdx = ms[0]?.roundIdx ?? 0;
    const round = days[dayIdx]?.rounds?.[roundIdx];
    // The next hole this group plays (shotgun starts wrap), if the round goes on.
    const start = ms[0]?.startHole || 0, total = round?.totalHoles || 18;
    const pos = (hole - start + 18) % 18;
    const nextHole = pos < total - 1 ? (hole + 1) % 18 : null;
    const nextTypes = nextHole == null ? [] : contestsOnHole(round, nextHole);
    setContestNext(nextTypes.length ? { dayIdx, roundIdx, hole: nextHole, types: nextTypes } : null);
    const types = contestsOnHole(round, hole);
    if (!types.length) return;
    const players = ms.flatMap(m => {
      const sides = cupSidesFor(teams, m);
      return [[m.player1a,sides.teamAId,sides.teamAColor],[m.player1b,sides.teamAId,sides.teamAColor],[m.player2a,sides.teamBId,sides.teamBColor],[m.player2b,sides.teamBId,sides.teamBColor]]
        .filter(([n])=>n).map(([name,team,color])=>({name,team,color}));
    });
    setContestAsk({ dayIdx, roundIdx, hole, types, players });
  };
  const submitContest = async (type, entry) => {
    const { dayIdx, roundIdx, hole } = contestAsk;
    await set(ref(db,`cups/${cupId}/contests/${contestKey(dayIdx,roundIdx,type)}`),{ type, dayIdx, roundIdx, hole, ...entry, at:Date.now() });
    notifyCup(cupId);
  };
  // The "did you beat it?" prompt first; any heads-up for the next hole after it.
  const contestPrompt = contestAsk ? (
    <ContestPrompt key={`${contestAsk.dayIdx}-${contestAsk.roundIdx}-${contestAsk.hole}`} hole={contestAsk.hole} types={contestAsk.types} players={contestAsk.players}
      current={Object.fromEntries(contestAsk.types.map(t=>[t,contests[contestKey(contestAsk.dayIdx,contestAsk.roundIdx,t)]]))}
      onSubmit={submitContest} onDone={()=>setContestAsk(null)}/>
  ) : contestNext ? (
    <ContestHeadsUp key={`next-${contestNext.hole}`} hole={contestNext.hole} types={contestNext.types} teams={teams}
      current={Object.fromEntries(contestNext.types.map(t=>[t,contests[contestKey(contestNext.dayIdx,contestNext.roundIdx,t)]]))}
      onDone={()=>setContestNext(null)}/>
  ) : null;

  if (activeGroup){
    const d=days[activeGroup.dayIdx];
    const groupMatches=activeGroup.matchIds.map(id=>d?.matches.find(x=>x.id===id)).filter(Boolean)
      .map(m=>({...m,totalHoles:d?.rounds?.[m.roundIdx??0]?.totalHoles||18}));
    if (groupMatches.length===2)
      return <><GroupHoleEntry matches={groupMatches} course={getCourse(d,groupMatches[0])} cups={groupMatches.map(cupSidesOf)} onSave={(mi,upd)=>updateMatch(activeGroup.dayIdx,upd)} onClose={()=>setActiveGroup(null)} onHoleConfirmed={h=>askContests(activeGroup.dayIdx,groupMatches,h)}/>{contestPrompt}</>;
  }
  if (activeMatch){
    const d=days[activeMatch.dayIdx]; const m=d?.matches.find(x=>x.id===activeMatch.matchId);
    if (m?.companionId){const companion=d.matches.find(x=>x.id===m.companionId);if(companion){
      const withHoles=[m,companion].map(x=>({...x,totalHoles:d?.rounds?.[x.roundIdx??0]?.totalHoles||18}));
      return <><GroupHoleEntry matches={withHoles} course={getCourse(d,m)} cups={withHoles.map(cupSidesOf)} onSave={(mi,upd)=>updateMatch(activeMatch.dayIdx,upd)} onClose={()=>setActiveMatch(null)} onHoleConfirmed={h=>askContests(activeMatch.dayIdx,withHoles,h)}/>{contestPrompt}</>;
    }}
    if (m) { const mRound=d?.rounds?.[m.roundIdx??0]; return <><HoleEntry match={{...m,format:mRound?.format||"",totalHoles:mRound?.totalHoles||18,allowExtraHoles:mRound?.allowExtraHoles||false}} isSingles={!m.player1b} course={getCourse(d,m)} cup={cupSidesOf(m)} onSave={upd=>updateMatch(activeMatch.dayIdx,upd)} onClose={()=>setActiveMatch(null)} onHoleConfirmed={h=>askContests(activeMatch.dayIdx,[m],h)}/>{contestPrompt}</>; }
  }

  const playerTeamColor=(()=>{
    const p=cupPlayers.find(x=>x.name===currentPlayer);
    if (p) return teams.find(t=>t.id===p.team)?.colorDisp || MUTED;
    for(const d of days)for(const m of d.matches){
      const sides=cupSidesOf(m);
      if([m.player1a,m.player1b].includes(currentPlayer))return sides.teamAColor;
      if([m.player2a,m.player2b].includes(currentPlayer))return sides.teamBColor;
    }
    return MUTED;
  })();

  return (
    <div style={{minHeight:"100vh",color:TEXT,paddingBottom:60,fontFamily:"var(--sans)"}}>
      <LiveBackground/>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}@keyframes celebFade{to{opacity:0;pointer-events:none}}*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {matchCelebration&&(
        <div style={{position:"fixed",inset:0,zIndex:1000,background:matchCelebration.color,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"celebFade 0.3s ease 1.2s forwards",pointerEvents:"none"}}>
          <div style={{fontSize:42,fontWeight:900,color:"#fff",fontFamily:"var(--mono)",letterSpacing:1.5,textAlign:"center",padding:"0 20px"}}>{matchCelebration.label}</div>
          <div style={{fontSize:22,color:"rgba(255,255,255,0.85)",fontFamily:"var(--mono)",marginTop:10}}>{matchCelebration.sublabel}</div>
        </div>
      )}

      {/* Header — cup logo + name top left, like old app */}
      <div style={{background:`linear-gradient(180deg,${CARD} 0%,${BG} 100%)`,borderBottom:`2px solid ${BORDER}`,position:"sticky",top:"env(safe-area-inset-top)",zIndex:100}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px 5px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
            {/* The iOS app has no browser back button, so give a way out to the cup list. */}
            <button onClick={()=>nav("/")} aria-label="All cups" style={{background:"none",border:"none",color:MUTED,fontSize:22,lineHeight:1,cursor:"pointer",padding:"0 4px 2px 0"}}>‹</button>
            {meta.logoUrl
              ? <img src={meta.logoUrl} alt="logo" style={{height:32,width:32,objectFit:"contain",borderRadius:4}}/>
              : <DormieMark size={36}/>}
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,fontWeight:900,letterSpacing:1,color:TEXT,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:160}}>{meta.name}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:3,flexShrink:0}}>
            {liveCount>0&&<div style={{fontSize:9,color:"#4caf50",fontWeight:700,letterSpacing:1,display:"flex",alignItems:"center",gap:6}}><span style={{animation:"pulse 2s infinite"}}>● {liveCount} LIVE</span>{lastUpdate&&<span style={{color:MUTED,fontWeight:600,letterSpacing:0}}>· updated {(()=>{const sec=Math.round((Date.now()-lastUpdate)/1000);return sec<45?"just now":sec<3600?`${Math.round(sec/60)}m ago`:`${Math.round(sec/3600)}h ago`;})()}</span>}</div>}
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              {offlineQueue.length>0&&<div style={{fontSize:8,color:"#f39c12",fontFamily:"var(--mono)",fontWeight:700}}>⚡{offlineQueue.length}</div>}
              {syncStatus==="synced"&&<div style={{fontSize:8,color:"#4caf50",fontFamily:"var(--mono)"}}>✓</div>}
              {pushSupported&&<button onClick={()=>togglePush(pushState!=="on")} aria-label={pushState==="on"?"Turn off notifications":"Turn on notifications"}
                style={{fontSize:14,background:"none",border:"none",cursor:"pointer",padding:"1px 4px",lineHeight:1,opacity:pushState==="on"?1:0.45}}>{pushState==="on"?"🔔":"🔕"}</button>}
              <button onClick={toggle} style={{fontSize:14,background:"none",border:"none",cursor:"pointer",padding:"1px 4px",lineHeight:1}}>{theme==="dark"?"☀️":"🌙"}</button>
              <button onClick={()=>setCurrentPlayer("")} style={{fontSize:9,padding:"3px 8px",background:`${playerTeamColor}22`,border:`1px solid ${playerTeamColor}55`,borderRadius:5,color:TEXT,cursor:"pointer",fontFamily:"var(--mono)",whiteSpace:"nowrap"}}>
                👤 {currentPlayer} ✕
              </button>
            </div>
          </div>
        </div>

        {winner&&<div style={{background:`${GOLD}22`,borderTop:`1px solid ${GOLD}44`,borderBottom:`1px solid ${GOLD}44`,padding:"7px",textAlign:"center"}}><div style={{fontSize:14,fontWeight:900,color:"var(--gold-text)",letterSpacing:1}}>🏆 {winner} {meta.eventType==="live_match"?"WINS THE MATCH!":"WINS THE CUP!"}</div></div>}

        {/* One-time offer of notifications, until this phone says yes or no
            (the bell in the header changes it later). */}
        {pushSupported&&pushState===null&&(
          <div style={{display:"flex",alignItems:"center",gap:8,background:"var(--panel-c)",borderBottom:`1px solid ${BORDER}`,padding:"8px 10px"}}>
            <div style={{fontSize:16}}>🔔</div>
            <div style={{flex:1,fontSize:11,color:TEXT,lineHeight:1.35}}>Get notified as each match finishes, with standings at the end of every day.</div>
            <button onClick={()=>togglePush(true)} style={{fontSize:10,fontWeight:900,padding:"6px 10px",background:GOLD,border:"none",borderRadius:6,color:"#000",cursor:"pointer",fontFamily:"var(--mono)",whiteSpace:"nowrap"}}>TURN ON</button>
            <button onClick={()=>togglePush(false)} aria-label="No thanks" style={{fontSize:12,background:"none",border:"none",color:MUTED,cursor:"pointer",padding:"4px"}}>✕</button>
          </div>
        )}

        {/* Big scoreboard — cups only */}
        {meta.eventType!=="live_match"&&twoTeam&&(()=>{
          const [a,b]=teams, pa=ptsOf(a.id), pb=ptsOf(b.id);
          return (
            <div style={{display:"flex",alignItems:"stretch"}}>
              <div style={{flex:1,background:a.color,padding:"8px 10px",display:"flex",flexDirection:"column",justifyContent:"center",minWidth:0}}>
                <div style={{fontSize:10,fontWeight:900,color:`${contrastText(a.color)}cc`,letterSpacing:1,fontFamily:"var(--mono)",lineHeight:1.2,wordBreak:"break-word"}}>{a.name}</div>
                <div style={{fontSize:36,fontWeight:900,color:contrastText(a.color),fontFamily:"var(--mono)",lineHeight:1,marginTop:2}}>{fmt(pa.actual)}</div>
              </div>
              <div style={{background:"var(--panel-c)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"6px 8px",borderLeft:`1px solid ${BORDER}`,borderRight:`1px solid ${BORDER}`,flexShrink:0,minWidth:96}}>
                <div style={{fontSize:8,color:"var(--muted2)",fontFamily:"var(--mono)",letterSpacing:0.5,marginBottom:2,fontWeight:700}}>PROJECTED</div>
                <div style={{fontSize:16,fontWeight:900,fontFamily:"var(--mono)",color:pa.proj>pb.proj?a.colorDisp:pb.proj>pa.proj?b.colorDisp:"var(--text)",whiteSpace:"nowrap",fontVariantNumeric:"tabular-nums"}}>{fmt(pa.proj)}–{fmt(pb.proj)}</div>
                {projWinner&&<div style={{fontSize:9,color:"var(--gold-text)",fontFamily:"var(--mono)",marginTop:1,whiteSpace:"nowrap",fontWeight:700}}>→ {projWinner}</div>}
                <div style={{fontSize:11,color:"var(--gold-text)",marginTop:4,fontFamily:"var(--mono)",whiteSpace:"nowrap",fontWeight:800,background:`${GOLD}1f`,borderRadius:4,padding:"1px 6px"}}>WIN: {fmt(winTarget)}</div>
              </div>
              <div style={{flex:1,background:b.color,padding:"8px 10px",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"flex-end",minWidth:0}}>
                <div style={{fontSize:10,fontWeight:900,color:`${contrastText(b.color)}cc`,letterSpacing:1,fontFamily:"var(--mono)",lineHeight:1.2,wordBreak:"break-word",textAlign:"right"}}>{b.name}</div>
                <div style={{fontSize:36,fontWeight:900,color:contrastText(b.color),fontFamily:"var(--mono)",lineHeight:1,marginTop:2}}>{fmt(pb.actual)}</div>
              </div>
            </div>
          );
        })()}

        {/* Standings board — three or four teams don't fit the head-to-head
            layout, so they stack as a leaderboard ordered by points. */}
        {meta.eventType!=="live_match"&&!twoTeam&&(
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"var(--panel-c)",padding:"4px 10px",borderBottom:`1px solid ${BORDER}`}}>
              <div style={{fontSize:7,color:"var(--muted)",fontFamily:"var(--mono)",letterSpacing:1}}>STANDINGS</div>
              <div style={{fontSize:7,color:"var(--muted)",fontFamily:"var(--mono)",letterSpacing:1}}>
                PTS · PROJ{projWinner?` · → ${projWinner}`:""}
              </div>
            </div>
            {teamRows.map((r,i)=>{
              const lead=teamRows[0].actual;
              const isLead=r.actual===lead&&lead>0;
              // Teams level on points share a rank (1,1,3,4), so a tie at the top
              // doesn't read as one team leading the other.
              const rank=teamRows.findIndex(x=>x.actual===r.actual)+1;
              const txt=contrastText(r.team.color);
              return (
                <div key={r.team.id} style={{display:"flex",alignItems:"center",background:r.team.color,padding:"7px 10px",gap:8,borderBottom:i<teamRows.length-1?"1px solid #0006":"none"}}>
                  <div style={{fontSize:9,fontWeight:900,color:`${txt}88`,fontFamily:"var(--mono)",width:14,flexShrink:0}}>{rank}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,fontWeight:900,color:txt,letterSpacing:1,fontFamily:"var(--mono)",lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.team.name}</div>
                    {/* What this team needs to be sure of the cup — no fixed
                        target exists with 3+ teams, so each gets its own. */}
                    {!winner&&(r.out||r.toWin!=null)&&
                      <div style={{fontSize:10,fontWeight:800,color:`${txt}dd`,fontFamily:"var(--mono)",letterSpacing:0.5,marginTop:2}}>{r.out?"ELIMINATED":`WIN: ${fmt(r.toWin)}`}</div>}
                  </div>
                  <div style={{fontSize:9,color:`${txt}99`,fontFamily:"var(--mono)",whiteSpace:"nowrap",flexShrink:0}}>proj {fmt(r.proj)}</div>
                  <div style={{fontSize:24,fontWeight:900,color:txt,fontFamily:"var(--mono)",lineHeight:1,minWidth:40,textAlign:"right",flexShrink:0}}>{fmt(r.actual)}</div>
                  {isLead&&<div style={{fontSize:10,flexShrink:0}}>👑</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* Live match status bar */}
        {meta.eventType==="live_match"&&(()=>{
          const lm=days[0]?.matches[0];
          const lmRound=days[0]?.rounds?.[lm?.roundIdx??0];
          const st=lm?computeMatchStatus(lm.scores,cup.teamAShort,cup.teamBShort,lm.startHole||0,lmRound?.totalHoles||18,lmRound?.pointValue||1,lmRound?.allowExtraHoles||false,lm.extra||[]):null;
          return (
            <div style={{display:"flex",alignItems:"stretch"}}>
              <div style={{flex:1,background:cup.teamAColor,padding:"8px 10px",minWidth:0}}>
                <div style={{fontSize:10,fontWeight:900,color:`${contrastText(cup.teamAColor)}cc`,letterSpacing:1,fontFamily:"var(--mono)",lineHeight:1.2,wordBreak:"break-word"}}>{cup.teamAName}</div>
              </div>
              <div style={{background:"var(--panel-c)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"6px 10px",borderLeft:`1px solid ${BORDER}`,borderRight:`1px solid ${BORDER}`,flexShrink:0,minWidth:80}}>
                {!st||st.state==="pending"?<div style={{fontSize:8,color:"var(--muted)",fontFamily:"var(--mono)",letterSpacing:1}}>NOT STARTED</div>:null}
                {st?.state==="live"&&<><div style={{fontSize:7,color:"var(--muted)",fontFamily:"var(--mono)"}}>THRU {st.holesPlayed}</div><div style={{fontSize:18,fontWeight:900,color:"#fff",fontFamily:"var(--mono)",lineHeight:1}}>{!st.leader?"AS":`${st.up}UP`}</div><div style={{width:5,height:5,borderRadius:"50%",background:"#4caf50",marginTop:3,animation:"pulse 1.5s infinite"}}/></>}
                {st?.state==="complete"&&<><div style={{fontSize:7,color:"var(--gold-text)",fontFamily:"var(--mono)",fontWeight:700}}>WIN</div><div style={{fontSize:14,fontWeight:900,color:"#fff",fontFamily:"var(--mono)"}}>{st.sublabel}</div></>}
                {st?.state==="halved"&&<div style={{fontSize:10,fontWeight:900,color:"var(--muted-b)",fontFamily:"var(--mono)"}}>HALVED</div>}
                {st?.state==="extra"&&<><div style={{fontSize:7,color:"var(--gold-text)",fontFamily:"var(--mono)",fontWeight:700}}>PLAYOFF</div><div style={{fontSize:12,fontWeight:900,color:"#fff",fontFamily:"var(--mono)"}}>{st.sublabel}</div></>}
              </div>
              <div style={{flex:1,background:cup.teamBColor,padding:"8px 10px",minWidth:0,textAlign:"right"}}>
                <div style={{fontSize:10,fontWeight:900,color:`${contrastText(cup.teamBColor)}cc`,letterSpacing:1,fontFamily:"var(--mono)",lineHeight:1.2,wordBreak:"break-word"}}>{cup.teamBName}</div>
              </div>
            </div>
          );
        })()}
        {/* Tabs: a segmented control, inside the pinned header so it stays reachable while you scroll. */}
        <div style={{display:"flex",gap:4,padding:"6px 8px",background:CARD,borderBottom:`1px solid ${BORDER}`}}>
          {[
            ["scoreboard","BOARD","board"],
          ["matches","MY MATCH","flag"],
          ...(isAdmin?[["admin","ADMIN","sliders"]]:[]),
          ...(meta.eventType!=="live_match"?[["leaderboard","SCORES","card"]]:[]),
        ].map(([key,label,icon])=>(
            <button key={key} onClick={()=>setTab(key)} style={{flex:1,padding:"10px 2px",minHeight:40,background:tab===key?`${GOLD}26`:"none",border:"none",borderRadius:8,boxShadow:tab===key?`inset 0 -2px 0 ${GOLD}`:"none",color:tab===key?"var(--gold-text)":MUTED,fontWeight:tab===key?900:700,fontSize:9,letterSpacing:0.5,cursor:"pointer",fontFamily:"var(--mono)",transition:"background .15s, color .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><Icon name={icon} size={14} strokeWidth={tab===key?2.4:2}/>{label}</button>
          ))}
        </div>
      </div>

      <div key={tab} style={{padding:"12px 10px 0",animation:"fadeIn .18s ease-out"}}>

        {/* SCOREBOARD TAB */}
        {tab==="scoreboard"&&(
          <div>
            {days.length>1&&<div style={{display:"flex",gap:6,marginBottom:12}}>
              {days.map((d,i)=>(
                <button key={i} onClick={()=>setBoardDayOverride(i)}
                  style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",background:boardDayIdx===i?`${GOLD}33`:CARD2,borderBottom:boardDayIdx===i?`2px solid ${GOLD}`:"2px solid transparent",color:boardDayIdx===i?GOLD:"var(--muted)",fontWeight:700,fontSize:9,cursor:"pointer",fontFamily:"var(--mono)",letterSpacing:1}}>
                  {d.label?.toUpperCase()||`DAY ${i+1}`}
                </button>
              ))}
            </div>}
            {boardDay&&(
              <DayBlock day={boardDay} dayIdx={boardDayIdx} contests={contests} teams={teams}
                onOpen={mid=>{if(canEdit(boardDayIdx,mid))openForScoring(boardDayIdx,mid);}}
                canEdit={mid=>canEdit(boardDayIdx,mid)}
                warmupScores={warmupScores} teamColorOf={playerColorOf} canScoreWarmup={canScoreWarmup}
                onOpenWarmup={(ri,gi)=>setActiveWarmup({dayIdx:boardDayIdx,roundIdx:ri,groupIdx:gi})}/>
            )}

            {/* Hole-by-hole breakdown */}
            {boardDay&&boardDay.matches.length>0&&(
              <div>
                <div style={{marginTop:16,marginBottom:4,fontSize:9,color:"var(--muted2)",fontWeight:700,fontFamily:"var(--mono)",letterSpacing:1,}}>HOLE BY HOLE</div>
                {[...boardDay.matches].sort((a,b)=>{const toMin=teeMinutes;return toMin(a.teeTime)-toMin(b.teeTime);}).map((m,mi)=>{
                  const mRound=boardDay.rounds?.[m.roundIdx??0];
                  const course=getCourse(boardDay,m);
                  const sides=cupSidesOf(m);
                  const st=computeMatchStatus(m.scores,sides.teamAShort,sides.teamBShort,m.startHole||0,mRound?.totalHoles||18,mRound?.pointValue||1,mRound?.allowExtraHoles||false,m.extra||[]);
                  const stColor={pending:MUTED,live:"#4caf50",complete:st.leader==="A"?sides.teamAColorDisp:sides.teamBColorDisp,halved:"var(--muted-b)",extra:GOLD,gap:"#e67e22"}[st.state];
                  return (
                    <div key={m.id} style={{marginBottom:14}}>
                      <HoleByHoleTable match={m} course={course} totalHoles={mRound?.totalHoles||18}
                        teamAColor={sides.teamAColor} teamBColor={sides.teamBColorDisp}
                        longLabel={st.longLabel} sublabel={st.sublabel}
                        meta={`${m.teeTime?`${m.teeTime} · `:""}Match ${mi+1}`}
                        statusColor={stColor}/>
                    </div>
                  );
                })}
              </div>
            )}
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
              const round=d?.rounds?.[m.roundIdx??0];
              const sides=cupSidesOf(m);
              const st=computeMatchStatus(m.scores,sides.teamAShort,sides.teamBShort,m.startHole||0,round?.totalHoles||18,round?.pointValue||1,round?.allowExtraHoles||false,m.extra||[]);
              const companion=m.companionId?d.matches.find(x=>x.id===m.companionId):null;
              const cSides=companion?cupSidesOf(companion):null;
              return (
                <div>
                  <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:16,marginBottom:12}}>
                    <div style={{fontSize:9,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:8}}>{d.label?.toUpperCase()}</div>
                    <MatchCard match={m} teams={teams} onOpen={()=>{}} canEdit={false} round={round} showTeamLabels={!twoTeam}/>
                    {companion&&(
                      <div style={{background:CARD2,borderRadius:8,padding:"8px 10px",marginBottom:10,fontSize:11,color:MUTED}}>
                        Playing with: <span style={{color:cSides.teamAColorDisp,fontWeight:700}}>{companion.player1a}</span> vs <span style={{color:cSides.teamBColorDisp,fontWeight:700}}>{companion.player2a}</span>
                      </div>
                    )}
                    <button onClick={()=>{
                      if(companion)setActiveGroup({dayIdx:playerMatch.dayIdx,matchIds:[m.id,companion.id]});
                      else setActiveMatch(playerMatch);
                    }} style={{width:"100%",padding:"13px",background:`linear-gradient(135deg,${sides.teamAColor},${sides.teamBColor})`,border:"none",borderRadius:12,color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",letterSpacing:1,fontFamily:"var(--mono)",marginTop:8}}>
                      {st.state==="pending"?"START SCORING":"ENTER SCORES →"}
                    </button>
                  </div>
                  {meta.eventType!=="live_match"&&<div style={{textAlign:"center",fontSize:10,color:MUTED,fontFamily:"var(--mono)"}}>{doneMatches}/{totalMatches} matches complete</div>}
                  {meta.eventType==="live_match"&&meta.inviteCode&&(()=>{
                    const joinUrl=`https://dormie-golf.vercel.app/join/${meta.inviteCode}`;
                    const canShare=typeof navigator!=="undefined"&&!!navigator.share;
                    return (
                      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:16,marginTop:4}}>
                        <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:10}}>SHARE WITH SPECTATORS</div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <div style={{flex:1,padding:"9px 12px",background:CARD2,borderRadius:8,fontFamily:"var(--mono)",fontSize:10,color:MUTED,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{joinUrl}</div>
                          <button onClick={()=>navigator.clipboard?.writeText(joinUrl)}
                            style={{padding:"9px 12px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:"var(--gold-text)",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>Copy</button>
                        </div>
                        {canShare&&(
                          <button onClick={()=>navigator.share({url:joinUrl,title:meta.name})}
                            style={{width:"100%",padding:"12px",background:`linear-gradient(135deg,${GOLD},${GOLD}88)`,border:"none",borderRadius:10,color:"#000",fontWeight:900,fontSize:13,cursor:"pointer",letterSpacing:1,fontFamily:"var(--mono)"}}>
                            ↗ Share Link
                          </button>
                        )}
                        {(()=>{
                          const watchUrl=`https://dormie-golf.vercel.app/watch/${cupId}`;
                          return (
                            <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${BORDER}`}}>
                              <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:8}}>VIEW-ONLY LINK · no sign-in needed</div>
                              <div style={{display:"flex",alignItems:"center",gap:8}}>
                                <div style={{flex:1,padding:"9px 12px",background:CARD2,borderRadius:8,fontFamily:"var(--mono)",fontSize:10,color:MUTED,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{watchUrl}</div>
                                <button onClick={()=>navigator.clipboard?.writeText(watchUrl)}
                                  style={{padding:"9px 12px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:"var(--gold-text)",fontSize:11,fontWeight:700,cursor:"pointer",flexShrink:0}}>Copy</button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        )}

        {/* ADMIN TAB */}
        {tab==="admin"&&isAdmin&&(
          <div>
            {adminSection===null&&(<>
              {/* Logo */}
              <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:12}}>
                <div style={{fontSize:11,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:10}}>CUP LOGO</div>
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
                        reader.onload=async ev=>{ await update(ref(db,`cups/${cupId}/meta`),{logoUrl:ev.target.result}); };
                        reader.readAsDataURL(file);
                      }}/>
                    </label>
                    <input placeholder="…or paste image URL" defaultValue={meta.logoUrl?.startsWith("http")?meta.logoUrl:""}
                      onBlur={async e=>{const v=e.target.value.trim();if(v)await update(ref(db,`cups/${cupId}/meta`),{logoUrl:v});}}
                      style={{width:"100%",padding:"8px 10px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT,fontSize:11,outline:"none"}}/>
                  </div>
                </div>
                {meta.logoUrl&&<button onClick={async()=>await update(ref(db,`cups/${cupId}/meta`),{logoUrl:null})} style={{fontSize:10,background:"none",border:"none",color:"#e74c3c",cursor:"pointer",padding:0}}>Remove logo</button>}
              </div>

              {/* Invite code + link + QR */}
              {meta.inviteCode && (() => {
                const joinUrl = `https://dormie-golf.vercel.app/join/${meta.inviteCode}`;
                return (
                  <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:12}}>
                    <div style={{fontSize:11,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:8}}>INVITE</div>
                    {/* Code display */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                      <div style={{flex:1,padding:"12px 14px",background:CARD2,borderRadius:8,fontFamily:"var(--mono)",fontSize:26,fontWeight:900,color:"var(--gold-text)",letterSpacing:4,textAlign:"center"}}>{meta.inviteCode}</div>
                      <button onClick={()=>navigator.clipboard?.writeText(meta.inviteCode)} style={{padding:"12px 14px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:"var(--gold-text)",fontSize:12,cursor:"pointer",fontWeight:700}}>Code</button>
                    </div>
                    {/* Share link */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <div style={{flex:1,padding:"9px 12px",background:CARD2,borderRadius:8,fontFamily:"var(--mono)",fontSize:10,color:MUTED,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{joinUrl}</div>
                      <button onClick={()=>navigator.clipboard?.writeText(joinUrl)} style={{padding:"9px 14px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:"var(--gold-text)",fontSize:12,cursor:"pointer",fontWeight:700,flexShrink:0}}>Link</button>
                    </div>
                    {/* QR code */}
                    <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px"}}>
                      <div style={{background:"#fff",borderRadius:10,padding:10,display:"inline-block"}}>
                        <QRCodeSVG value={joinUrl} size={160} bgColor="#ffffff" fgColor="#020c18" level="M"/>
                      </div>
                    </div>
                    <div style={{fontSize:10,color:MUTED,textAlign:"center",marginTop:8}}>Scan to join or share the link</div>
                  </div>
                );
              })()}

              {/* Cup Settings */}
              <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:12}}>
                <div style={{fontSize:11,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:12}}>TEAMS</div>
                {teams.map((t,ti)=>(
                  <div key={t.id} style={{marginBottom:16,paddingBottom:16,borderBottom:`1px solid ${BORDER}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                      <div style={{width:12,height:12,borderRadius:"50%",background:t.color,flexShrink:0}}/>
                      <div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,flex:1}}>TEAM {ti+1}</div>
                      {teams.length>2&&(
                        <button onClick={()=>removeTeam(t)} title="Remove this team"
                          style={{background:"none",border:"none",color:"#e74c3c",cursor:"pointer",fontSize:15,lineHeight:1,padding:0}}>×</button>
                      )}
                    </div>
                    <div style={{display:"flex",gap:8,marginBottom:10}}>
                      <div style={{flex:2}}>
                        <div style={{fontSize:10,color:MUTED,marginBottom:4,fontWeight:700}}>FULL NAME</div>
                        <input defaultValue={t.name}
                          onBlur={e=>saveTeam(ti,{name:e.target.value.trim()||t.name})}
                          style={{width:"100%",padding:"7px 10px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:10,color:MUTED,marginBottom:4,fontWeight:700}}>NICKNAME</div>
                        <input defaultValue={t.short} maxLength={8} placeholder="auto"
                          onBlur={e=>saveTeam(ti,{short:e.target.value.trim()||autoShort(t.name,t.id)})}
                          style={{width:"100%",padding:"7px 10px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"var(--mono)",fontWeight:700}}/>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                      {["#C8102E","#E53935","#1565C0","#003087","#1B5E20","#2E7D32","#E65100","#F57F17","#4A148C","#880E4F","#006064","#212121"].map(color=>(
                        <button key={color} onClick={()=>saveTeam(ti,{color})}
                          style={{width:28,height:28,background:color,border:t.color===color?`3px solid ${GOLD}`:"3px solid transparent",borderRadius:8,cursor:"pointer",flexShrink:0}}/>
                      ))}
                      <label style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer",fontSize:10,color:MUTED}}>
                        <input type="color" value={t.color} onChange={e=>saveTeam(ti,{color:e.target.value})}
                          style={{width:28,height:28,border:"none",background:"none",cursor:"pointer",padding:0,borderRadius:8}}/>
                        custom
                      </label>
                    </div>
                  </div>
                ))}
                {teams.length<MAX_TEAMS&&(
                  <button onClick={addTeam}
                    style={{width:"100%",marginBottom:16,padding:"10px",background:"none",border:`1px solid ${BORDER}`,borderRadius:8,color:MUTED,fontSize:12,cursor:"pointer",fontFamily:"var(--mono)"}}>
                    + ADD TEAM
                  </button>
                )}
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:10,color:MUTED,marginBottom:6,fontWeight:700}}>FIRST ROUND DATE</div>
                  <div style={{fontSize:11,color:MUTED,marginBottom:8,lineHeight:1.4}}>Day 1 of the cup. The app uses this to show the right day's scoreboard automatically.</div>
                  <input type="date" value={meta.startDate||""} onChange={async e=>await update(ref(db,`cups/${cupId}/meta`),{startDate:e.target.value||null})}
                    style={{padding:"8px 10px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:8,color:TEXT,fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"}}/>
                </div>
              </div>

              {/* Admin sections grid */}
              <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:12}}>
                <div style={{fontSize:11,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:12}}>MANAGE CUP</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[
                    {label:"Players & Handicaps",icon:"👥",key:"players"},
                    {label:"Courses",icon:"🏌️",key:"courses"},
                    {label:"Rounds",icon:"📅",key:"rounds"},
                    {label:"Matchups",icon:"🤝",key:"matchups"},
                    {label:"Scores",icon:"✏️",key:"scores"},
                    {label:"Admins",icon:"🔐",key:"admins"},
                  ].map(({label,icon,key})=>(
                    <button key={key} onClick={()=>setAdminSection(key)}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"14px 10px",background:CARD2,border:`1px solid ${BORDER}`,borderRadius:12,color:TEXT,fontSize:12,fontWeight:600,cursor:"pointer",textAlign:"center"}}>
                      <span style={{fontSize:22}}>{icon}</span>
                      <span style={{fontSize:11,color:MUTED,lineHeight:1.2}}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Match score reset (destructive, kept separate) */}
              <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:16,marginBottom:12}}>
                <div style={{fontSize:11,color:"#e74c3c",fontFamily:"var(--mono)",letterSpacing:1,marginBottom:10}}>RESET SCORES</div>
                {days.map((day,di)=>(
                  <div key={di} style={{marginBottom:di<days.length-1?12:0}}>
                    {days.length>1&&<div style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)",marginBottom:6}}>{day.label?.toUpperCase()}</div>}
                    {(day.rounds||[]).filter(isWarmup).flatMap(r=>(r.groups||[]).map((g,gi)=>(
                      <div key={`${r.id}-${gi}`} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${BORDER}`}}>
                        <div style={{fontSize:11,color:TEXT}}>Warmup{g.teeTime?` ${g.teeTime}`:""} · {(g.players||[]).map(n=>n.split(" ")[0]).join(", ")}</div>
                        <button onClick={async()=>{if(!confirm(`Reset warmup scores for this group?`))return;await update(ref(db,`cups/${cupId}/warmupScores/${r.id}`),Object.fromEntries((g.players||[]).map(n=>[warmupKey(n),null])));}}
                          style={{padding:"3px 8px",background:"none",border:"1px solid #e74c3c",borderRadius:6,color:"#e74c3c",fontSize:10,cursor:"pointer",fontFamily:"var(--mono)",flexShrink:0,marginLeft:8}}>
                          Reset
                        </button>
                      </div>
                    )))}
                    {day.matches.map(m=>(
                      <div key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${BORDER}`}}>
                        <div style={{fontSize:11,color:TEXT}}>{m.player1a}{m.player1b?` & ${m.player1b}`:""} vs {m.player2a}{m.player2b?` & ${m.player2b}`:""}</div>
                        <button onClick={async()=>{if(!confirm(`Reset scores for this match?`))return;await set(ref(db,`cups/${cupId}/scores/m${m.id}`),null);}}
                          style={{padding:"3px 8px",background:"none",border:"1px solid #e74c3c",borderRadius:6,color:"#e74c3c",fontSize:10,cursor:"pointer",fontFamily:"var(--mono)",flexShrink:0,marginLeft:8}}>
                          Reset
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>)}

            {adminSection==="players"&&(
              <AdminPlayers initPlayers={cupPlayers} teams={teams}
                onSave={saveAdminPlayers} onBack={()=>setAdminSection(null)}/>
            )}
            {adminSection==="courses"&&(
              <AdminCourses initDays={days} onSave={saveAdminDays} onBack={()=>setAdminSection(null)}/>
            )}
            {adminSection==="rounds"&&(
              <AdminRounds initDays={days} cupPlayers={cupPlayers} onSave={saveAdminRounds} onBack={()=>setAdminSection(null)}/>
            )}
            {adminSection==="matchups"&&(
              <AdminMatchups initDays={days} cupPlayers={cupPlayers} teams={teams}
                onSave={saveAdminMatchups} onBack={()=>setAdminSection(null)}/>
            )}
            {adminSection==="admins"&&(
              <AdminAdmins
                allPlayers={uniquePlayers}
                initAdminPlayers={meta.adminPlayers||[]}
                onSave={saveAdminAdmins}
                onBack={()=>setAdminSection(null)}/>
            )}
            {adminSection==="scores"&&(
              <AdminScores days={days} onBack={()=>setAdminSection(null)}
                onOpenMatch={(di,m)=>{
                  if(m.companionId){const companion=days[di].matches.find(x=>x.id===m.companionId);if(companion)setActiveGroup({dayIdx:di,matchIds:[m.id,m.companionId]});else setActiveMatch({dayIdx:di,matchId:m.id});}
                  else setActiveMatch({dayIdx:di,matchId:m.id});
                  setAdminSection(null);
                }}/>
            )}
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
              // A player has a row per match, so a two-round day lists them twice; key rows by match.
              playerRows.push({key:`${m.id}-${p.name}`,roundIdx:m.roundIdx??0,name:p.name,team:p.team,gross:grossArr,toPar,holesPlayed,teeTime:m.teeTime,course});
            }
          }
          const multiRound=new Set(playerRows.map(r=>r.roundIdx)).size>1;
          const started=playerRows.filter(r=>r.holesPlayed>0).sort((a,b)=>b.holesPlayed-a.holesPlayed||a.toPar-b.toPar);
          const notStarted=playerRows.filter(r=>r.holesPlayed===0).sort((a,b)=>(a.teeTime||"").localeCompare(b.teeTime||""));
          let pos=1;
          for (let i=0;i<started.length;i++){
            if(i>0&&started[i].toPar===started[i-1].toPar&&started[i].holesPlayed===started[i-1].holesPlayed){started[i].pos="T"+pos;started[i-1].pos="T"+pos;}
            else{pos=i+1;started[i].pos=String(pos);}
          }
          const fmtPar=(n,p)=>p===0?"—":n===0?"E":n>0?`+${n}`:`${n}`;
          const parColor=(n,p)=>p===0?MUTED:n<0?"#4caf50":n===0?"var(--text)":n<=2?"var(--bogey-ink)":"var(--double-ink)";
          // Tiered by shape as well as color (see HoleByHoleTable): par plain, bogey a
          // soft tint, double or worse a solid red box, birdie a circle, eagle a double circle.
          const HoleScore=({gross,par})=>{
            const box={width:22,height:22,boxSizing:"border-box",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,margin:"0 auto"};
            if(gross===null) return <div style={{...box,fontSize:10,color:"var(--faint-b)"}}>·</div>;
            const d=gross-par;
            if(d<=-2) return <div style={{...box,borderRadius:"50%",border:"3px double #FFD700",fontWeight:900,color:"#FFD700"}}>{gross}</div>;
            if(d===-1) return <div style={{...box,borderRadius:"50%",border:"1.5px solid #4caf50",fontWeight:900,color:"#4caf50"}}>{gross}</div>;
            if(d===0) return <div style={{...box,fontWeight:700,color:"var(--text)"}}>{gross}</div>;
            if(d===1) return <div style={{...box,borderRadius:3,background:"var(--bogey-bg)",fontWeight:700,color:"var(--bogey-ink)"}}>{gross}</div>;
            return <div style={{...box,borderRadius:3,background:"var(--double-bg)",fontWeight:900,color:"#fff"}}>{gross}</div>;
          };
          const course=lbDay.rounds?.[0]?.course||lbDay.course||{par:Array(18).fill(4)};
          return (
            <div style={{paddingBottom:30}}>
              <div style={{display:"flex",gap:6,marginBottom:12}}>
                {days.map((d,i)=>(
                  <button key={i} onClick={()=>setBoardDayOverride(i)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:"none",background:boardDayIdx===i?`${GOLD}33`:CARD2,borderBottom:boardDayIdx===i?`2px solid ${GOLD}`:"2px solid transparent",color:boardDayIdx===i?GOLD:"var(--muted)",fontWeight:700,fontSize:9,cursor:"pointer",fontFamily:"var(--mono)",letterSpacing:1}}>
                    {d.label?.toUpperCase()||`DAY ${i+1}`}
                  </button>
                ))}
              </div>
              <div style={{fontSize:9,color:"var(--muted2)",fontWeight:700,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:10,}}>{lbDay.label?.toUpperCase()} · INDIVIDUAL SCORES</div>
              {started.length===0&&notStarted.length===0?(
                <div style={{textAlign:"center",padding:"40px 20px",color:"var(--muted)"}}><div style={{fontSize:24,marginBottom:8}}>⛳</div><div style={{fontSize:12}}>No scores entered yet</div></div>
              ):(
                <div>
                  {started.length>0&&(()=>{
                    // Front 9 / Back 9 / Total: a full 18-hole row doesn't fit a phone, and the
                    // back nine used to hide behind the OUT column. ±PAR lives on Total, so a
                    // nine's holes fit across a phone without scrolling.
                    const holes=scoreView==="front"?[0,1,2,3,4,5,6,7,8]:scoreView==="back"?[9,10,11,12,13,14,15,16,17]:[];
                    const showOut=scoreView!=="back", showIn=scoreView!=="front", showTot=scoreView==="total";
                    const sumPar=(a,b)=>course.par.slice(a,b).reduce((x,y)=>x+y,0);
                    const half=(row,a,b)=>{const g=row.gross.slice(a,b),n=g.filter(x=>x!==null).length;if(!n)return{n,v:null,d:0};const v=g.reduce((x,y)=>x+(y||0),0);return{n,v,d:v-row.course.par.slice(a,b).reduce((x,y,i)=>g[i]!==null?x+y:x,0)};};
                    const th={textAlign:"center",padding:"5px 1px",fontSize:8,color:"var(--muted)",fontFamily:"var(--mono)",borderBottom:`1px solid ${BORDER}`};
                    const sumTh={...th,padding:"5px 3px",color:"var(--muted2)",borderLeft:`1px solid ${BORDER}`};
                    // The POS + PLAYER cells stay put while the holes scroll under them.
                    const pin=(bg,left)=>({position:"sticky",left,zIndex:1,background:bg});
                    return (
                      <>
                        <div style={{display:"flex",background:CARD2,borderRadius:8,padding:3,marginBottom:8,gap:3}}>
                          {[["front","FRONT 9"],["back","BACK 9"],["total","TOTAL"]].map(([v,l])=>(
                            <button key={v} onClick={()=>setScoreView(v)} style={{flex:1,padding:"7px 0",border:"none",borderRadius:6,background:scoreView===v?`${GOLD}33`:"transparent",color:scoreView===v?"var(--gold-text)":"var(--muted2)",fontWeight:800,fontSize:10,fontFamily:"var(--mono)",letterSpacing:1,cursor:"pointer"}}>{l}</button>
                          ))}
                        </div>
                        <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",borderRadius:10,border:`1px solid ${BORDER}`}}>
                        <table style={{borderCollapse:"collapse",width:"100%",background:CARD,fontVariantNumeric:"tabular-nums"}}>
                          <thead>
                            <tr style={{background:"var(--panel-b)"}}>
                              <td style={{...th,...pin("var(--panel-b)",0),width:24,textAlign:"left",padding:"5px 6px"}}>POS</td>
                              <td style={{...th,...pin("var(--panel-b)",24),textAlign:"left",padding:"5px 6px"}}>PLAYER</td>
                              {holes.map(i=><td key={i} style={{...th,width:24}}>{i+1}</td>)}
                              {showOut&&<td style={sumTh}>OUT</td>}
                              {showIn&&<td style={sumTh}>IN</td>}
                              {showTot&&<td style={{...sumTh,color:"var(--text-b)",fontWeight:800}}>TOT</td>}
                              {showTot&&<td style={{...sumTh,color:"var(--text-b)",fontWeight:800}}>±PAR</td>}
                            </tr>
                            <tr style={{background:"var(--panel-a)"}}>
                              <td style={{...th,...pin("var(--panel-a)",0),fontSize:7}}></td>
                              <td style={{...th,...pin("var(--panel-a)",24),fontSize:7,textAlign:"left",padding:"3px 6px"}}>PAR</td>
                              {holes.map(i=><td key={i} style={{...th,color:"var(--muted2)",padding:"3px 1px"}}>{course.par[i]}</td>)}
                              {showOut&&<td style={{...sumTh,padding:"3px",fontWeight:700}}>{sumPar(0,9)}</td>}
                              {showIn&&<td style={{...sumTh,padding:"3px",fontWeight:700}}>{sumPar(9,18)}</td>}
                              {showTot&&<td style={{...sumTh,padding:"3px",fontWeight:700}}>{sumPar(0,18)}</td>}
                              {showTot&&<td style={{...sumTh,padding:"3px"}}></td>}
                            </tr>
                          </thead>
                          <tbody>
                            {started.map((row,ri)=>{
                              const bg=ri%2===0?CARD:CARD2;
                              const out=half(row,0,9), inn=half(row,9,18);
                              const sumCell=(h)=><td style={{textAlign:"center",padding:"4px 3px",borderLeft:`1px solid ${BORDER}`,fontSize:11,fontWeight:700,color:h.n>0?parColor(h.d,h.n):MUTED,fontFamily:"var(--mono)"}}>{h.n>0?h.v:"—"}</td>;
                              return (
                                <tr key={row.key} style={{background:bg,borderBottom:`1px solid ${BORDER}33`}}>
                                  <td style={{...pin(bg,0),padding:"8px 6px",fontSize:10,fontWeight:800,color:"var(--muted2)",fontFamily:"var(--mono)",whiteSpace:"nowrap"}}>{row.pos}</td>
                                  <td style={{...pin(bg,24),padding:"8px 4px 8px 6px",maxWidth:holes.length?92:150}}><div style={{fontSize:12,fontWeight:700,color:teamColorOf(row.team),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{row.name}{multiRound&&<span style={{fontSize:8,color:MUTED,fontFamily:"var(--mono)",marginLeft:5}}>R{row.roundIdx+1}</span>}</div></td>
                                  {holes.map(i=><td key={i} style={{textAlign:"center",padding:"4px 1px"}}><HoleScore gross={row.gross[i]} par={row.course.par?.[i]||4}/></td>)}
                                  {showOut&&sumCell(out)}
                                  {showIn&&sumCell(inn)}
                                  {showTot&&<td style={{textAlign:"center",padding:"4px 3px",borderLeft:`1px solid ${BORDER}`,fontSize:11,fontWeight:800,color:parColor(row.toPar,row.holesPlayed),fontFamily:"var(--mono)"}}>{row.holesPlayed>0?row.gross.filter(g=>g!==null).reduce((a,b)=>a+b,0):"—"}</td>}
                                  {showTot&&<td style={{textAlign:"center",padding:"4px 4px",borderLeft:`1px solid ${BORDER}`,fontSize:12,fontWeight:900,color:parColor(row.toPar,row.holesPlayed),fontFamily:"var(--mono)",whiteSpace:"nowrap"}}>{fmtPar(row.toPar,row.holesPlayed)}{row.holesPlayed<18&&row.holesPlayed>0?<span style={{fontSize:8,color:MUTED}}> ({row.holesPlayed})</span>:null}</td>}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        </div>
                      </>
                    );
                  })()}
                  {notStarted.length>0&&<div style={{marginTop:12}}>
                    <div style={{fontSize:9,color:MUTED,fontFamily:"var(--mono)",letterSpacing:1,marginBottom:6}}>NOT STARTED</div>
                    {notStarted.map(r=>(
                      <div key={r.key} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",background:CARD,borderRadius:6,marginBottom:4}}>
                        <span style={{fontSize:12,fontWeight:700,color:teamColorOf(r.team)}}>{r.name}{multiRound&&<span style={{fontSize:8,color:MUTED,fontFamily:"var(--mono)",marginLeft:5}}>R{r.roundIdx+1}</span>}</span>
                        <span style={{fontSize:10,color:MUTED,fontFamily:"var(--mono)"}}>{r.teeTime||"—"}</span>
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
