import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { seedCBSCup } from "../seed/cbsCup";
import { GOLD } from "../utils/scoring";

export default function SeedPage({ user }) {
  const { BG, CARD, CARD2, BORDER, TEXT, MUTED } = useTheme();
  const nav = useNavigate();
  const [status, setStatus] = useState(null);
  const [log, setLog] = useState([]);
  const [done, setDone] = useState(false);

  const handleSeed = async () => {
    setStatus("running");
    setLog([]);
    // Patch console.log to capture output
    const orig = console.log;
    const lines = [];
    console.log = (...args) => { orig(...args); lines.push(args.join(" ")); setLog([...lines]); };
    try {
      const result = await seedCBSCup(user.uid);
      setLog([...lines, `✓ Done! Cup ID: ${result.cupId}  Invite: ${result.inviteCode}`]);
      setStatus("done");
      setDone(true);
      console.log = orig;
    } catch (e) {
      setLog([...lines, `✗ Error: ${e.message}`]);
      setStatus("error");
      console.log = orig;
    }
  };

  return (
    <div style={{minHeight:"100vh",background:BG,color:TEXT,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:440}}>
        <div style={{fontSize:20,fontWeight:900,color:GOLD,fontFamily:"monospace",letterSpacing:2,marginBottom:4}}>CBS CUP MIGRATION</div>
        <div style={{fontSize:12,color:MUTED,marginBottom:24}}>One-time seed of CBS Ryder Cup 2026 data into the new platform structure. Run once as admin, then never again.</div>

        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:20,marginBottom:16}}>
          <div style={{fontSize:11,color:MUTED,marginBottom:12}}>This will:</div>
          <ul style={{fontSize:11,color:TEXT,paddingLeft:18,lineHeight:2}}>
            <li>Create <code style={{color:GOLD}}>cups/cbs-ryder-cup-2026/</code> with all metadata</li>
            <li>Copy players, matches, days, and course data</li>
            <li>Migrate scores from old <code style={{color:GOLD}}>matches/m*</code> paths</li>
            <li>Set invite code <code style={{color:GOLD}}>RYDERC26</code></li>
            <li>Add the cup to your account</li>
          </ul>
        </div>

        {log.length>0&&(
          <div style={{background:"#040d1c",border:`1px solid ${BORDER}`,borderRadius:10,padding:14,marginBottom:16,fontFamily:"monospace",fontSize:11,color:"#4caf50",maxHeight:200,overflowY:"auto"}}>
            {log.map((l,i)=><div key={i}>{l}</div>)}
          </div>
        )}

        {!done?(
          <button onClick={handleSeed} disabled={status==="running"}
            style={{width:"100%",padding:"14px",background:status==="running"?CARD2:`linear-gradient(135deg,${GOLD},${GOLD}88)`,border:"none",borderRadius:12,color:status==="running"?MUTED:"#000",fontWeight:900,fontSize:14,cursor:status==="running"?"wait":"pointer",letterSpacing:1,fontFamily:"monospace"}}>
            {status==="running"?"MIGRATING…":"RUN MIGRATION"}
          </button>
        ):(
          <button onClick={()=>nav("/cup/cbs-ryder-cup-2026")}
            style={{width:"100%",padding:"14px",background:`linear-gradient(135deg,${GOLD},${GOLD}88)`,border:"none",borderRadius:12,color:"#000",fontWeight:900,fontSize:14,cursor:"pointer",letterSpacing:1,fontFamily:"monospace"}}>
            OPEN CBS CUP →
          </button>
        )}
        <button onClick={()=>nav("/")} style={{width:"100%",marginTop:10,padding:"10px",background:"none",border:`1px solid ${BORDER}`,borderRadius:10,color:MUTED,fontSize:12,cursor:"pointer"}}>← Back to home</button>
      </div>
    </div>
  );
}
