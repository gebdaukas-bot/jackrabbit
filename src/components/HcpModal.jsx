import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { GOLD } from "../utils/scoring";

export default function HcpModal({ match, isSingles, teamAColor, teamBColor, onSave, onClose }) {
  const { BG, CARD, CARD2, BORDER } = useTheme();
  const [vals, setVals] = useState({
    hcp1a: match.hcp1a||0, hcp1b: match.hcp1b||0,
    hcp2a: match.hcp2a||0, hcp2b: match.hcp2b||0,
  });

  const Row = ({ label, field, color }) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${BORDER}`}}>
      <div style={{fontSize:13,fontWeight:700,color}}>{label}</div>
      <div style={{display:"flex",alignItems:"center"}}>
        <button onClick={()=>setVals(v=>({...v,[field]:Math.max(-10,v[field]-1)}))} style={{width:32,height:34,fontSize:18,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"6px 0 0 6px",color:"#8aa",cursor:"pointer"}}>−</button>
        <div style={{width:44,height:34,background:BG,border:`1px solid ${BORDER}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:GOLD,fontFamily:"monospace"}}>{vals[field]>0?`+${vals[field]}`:vals[field]}</div>
        <button onClick={()=>setVals(v=>({...v,[field]:Math.min(36,v[field]+1)}))} style={{width:32,height:34,fontSize:18,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"0 6px 6px 0",color:"#8aa",cursor:"pointer"}}>+</button>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:20,width:"100%",maxWidth:340}}>
        <div style={{fontSize:13,fontWeight:900,color:GOLD,marginBottom:4,letterSpacing:1,fontFamily:"monospace"}}>SET HANDICAPS</div>
        <div style={{fontSize:11,color:"#446",marginBottom:14}}>Strokes given on lowest handicap index holes first</div>
        <Row label={match.player1a} field="hcp1a" color={teamAColor}/>
        {!isSingles && <Row label={match.player1b} field="hcp1b" color={teamAColor}/>}
        <Row label={match.player2a} field="hcp2a" color={teamBColor}/>
        {!isSingles && <Row label={match.player2b} field="hcp2b" color={teamBColor}/>}
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",background:"none",border:`1px solid ${BORDER}`,borderRadius:10,color:"#668",fontSize:12,cursor:"pointer"}}>Cancel</button>
          <button onClick={()=>onSave(vals)} style={{flex:2,padding:"10px",background:`linear-gradient(135deg,${teamBColor},${teamBColor}44)`,border:`1px solid ${teamBColor}`,borderRadius:10,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer"}}>SAVE</button>
        </div>
      </div>
    </div>
  );
}
