import { useTheme } from "../context/ThemeContext";
import { GOLD } from "../utils/scoring";

export default function ScoreInput({ label, hcp, value, onChange, color, labelColor, par, strokes = 1 }) {
  const { BG, CARD2, BORDER } = useTheme();
  const diff = value - (par || 4);

  // Same tiers as the scorecards: par plain, bogey a soft tint, double or worse a
  // solid red box, birdie a circle, eagle a double circle — shape as well as color.
  const box = { width: 42, height: 42, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums" };
  let scoreDisplay;
  if (diff <= -2) scoreDisplay = <div style={{ ...box, borderRadius: "50%", border: "4px double #FFD700", color: "#FFD700" }}>{value}</div>;
  else if (diff === -1) scoreDisplay = <div style={{ ...box, borderRadius: "50%", border: "2px solid #4caf50", color: "#4caf50" }}>{value}</div>;
  else if (diff === 0) scoreDisplay = <div style={{ ...box, color: "var(--strong)" }}>{value}</div>;
  else if (diff === 1) scoreDisplay = <div style={{ ...box, borderRadius: 4, background: "var(--bogey-bg)", color: "var(--bogey-ink)" }}>{value}</div>;
  else scoreDisplay = <div style={{ ...box, borderRadius: 4, background: "var(--double-bg)", color: "#fff" }}>{value}</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
      {/* Names get a fixed two-line slot and the handicap line is always reserved, so
          the steppers side by side line up even when only one name wraps. */}
      <div style={{fontSize:13,fontWeight:700,color:labelColor||color,textAlign:"center",maxWidth:130,lineHeight:"13px",height:26,display:"flex",alignItems:"flex-end",justifyContent:"center",overflow:"hidden"}}>
        <span style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{labelColor ? `${"★".repeat(strokes)} ${label}` : label}</span>
      </div>
      <div style={{fontSize:9,color:"var(--muted2)",fontFamily:"var(--mono)",height:11,visibility:hcp > 0 ? "visible" : "hidden"}}>HCP {Number(hcp || 0).toFixed(1)}</div>
      <div style={{display:"flex",alignItems:"center",gap:0}}>
        <button onClick={()=>onChange(Math.max(1,value-1))} style={{width:48,height:52,fontSize:22,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"7px 0 0 7px",color:"var(--muted2-b)",cursor:"pointer"}}>−</button>
        <div style={{width:52,height:52,background:BG,border:`1px solid ${BORDER}`,borderTop:`3px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {scoreDisplay}
        </div>
        <button onClick={()=>onChange(Math.min(12,value+1))} style={{width:48,height:52,fontSize:22,background:CARD2,border:`1px solid ${BORDER}`,borderRadius:"0 7px 7px 0",color:"var(--muted2-b)",cursor:"pointer"}}>+</button>
      </div>
    </div>
  );
}
