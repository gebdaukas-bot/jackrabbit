import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { joinCup } from "../utils/joinCup";
import { useTheme } from "../context/ThemeContext";
import { GOLD } from "../utils/scoring";
import LiveBackground from "../components/LiveBackground";
import Login from "./Login";

export default function JoinPage({ user }) {
  const { code } = useParams();
  const nav = useNavigate();
  const { MUTED, BORDER } = useTheme();
  const [status, setStatus] = useState("joining");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !code) return;
    const join = async () => {
      try {
        nav(`/cup/${await joinCup(user, code)}`, { replace: true });
      } catch (e) {
        setError(e.message || "Something went wrong. Try again.");
        setStatus("error");
      }
    };
    join();
  }, [user, code, nav]);

  // Not logged in — show login page; after sign-in, AuthGate re-renders and this component gets user
  if (!user) return <Login />;

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <LiveBackground/>
      <div style={{ background:"var(--glass-85)", backdropFilter:"blur(12px)", border:`1px solid ${BORDER}`, borderRadius:20, padding:"32px 28px", width:"100%", maxWidth:340, textAlign:"center" }}>
        {status === "joining" && (
          <>
            <div style={{ fontSize:36, marginBottom:12 }}>⛳</div>
            <div style={{ fontSize:16, fontWeight:800, color:GOLD, fontFamily:"monospace", letterSpacing:2, marginBottom:8 }}>DORMIE</div>
            <div style={{ fontSize:13, color:MUTED }}>Joining cup…</div>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:13, color:"#e74c3c", marginBottom:20 }}>{error}</div>
            <button onClick={()=>nav("/")} style={{ padding:"10px 24px", background:GOLD, border:"none", borderRadius:10, color:"#000", fontWeight:800, fontSize:13, cursor:"pointer" }}>
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
