import { useTheme } from "../context/ThemeContext";
import { GOLD } from "../utils/scoring";

export default function ScoreInput({ label, hcp, value, onChange, color, labelColor, par, strokes = 1 }) {
  const { BG, CARD2, BORDER } = useTheme();
  const diff = value - (par || 4);

  let scoreDisplay;
  if (diff <= -2) {
    scoreDisplay = (
      <div style={{position:"relative",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:44,height:44,borderRadius:"50%",border:"2px solid #FFD700"}}/>
        <div style={{position:"absolute",width:32,height:32,borderRadius:"50%",border:"2px solid #FFD700"}}/>
        <span style={{fontSize:20,fontWeight:900,color:"#FFD700",fontFamily:"monospace",zIndex:1}}>{value}</span>
      </div>
    );
  } else if (diff === -1) {
    scoreDisplay = (
      <div style={{position:"relative",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:44,height:44,borderRadius:"50%",border:"2px solid #4caf50"}}/>
        <span style={{fontSize:20,fontWeight:900,color:"#4caf50",fontFamily:"monospace",zIndex:1}}>{value}</span>
      </div>
    );
  } else if (diff === 0) {
    scoreDisplay = <span style={{fontSize:20,fontWeight:900,color:"#fff",fontFamily:"monospace"}}>{value}</span>;
  } else if (diff === 1) {
    scoreDisplay = (
      <div style={{position:"relative",width:40,height:40,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:40,height:40,border:"2px solid #e88",borderRadius:3}}/>
        <span style={{fontSize:20,fontWeight:900,color:"#e88",fontFamily:"monospace",zIndex:1}}>{value}</span>
      </div>
    );
  } else if (diff === 2) {
    scoreDisplay = (
      <div style={{position:"relative",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",width:44,height:44,border:"2px solid #e55",borderRadius:3}}/>
        <div style={{position:"absolute",width:34,height:34,border:"2px solid #e55",borderRadius:2}}/>
        <span style={{fontSize:20,fontWeight:900,color:"#e55",fontFamily:"monospace",zIndex:1}}>{value}</span>
      </div>
    );
  } else {
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
      {hcp > 0 && <div style={{fontSize:9,color:GOLD,fontFamily:"monospace"}}>HCP {hcp}</div>}
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
