import { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signInWithRedirect } from "firebase/auth";

const GOLD = "#C4A44A";

// Pre-generate floating elements so they don't change on re-render
const FLOATERS = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  emoji: ["⛳","🏌️","🏌️‍♀️","🏅","🏆","⛳","🏌️","⛳"][i % 8],
  left: `${(i * 17 + 5) % 95}%`,
  size: 16 + (i * 7) % 24,
  duration: 12 + (i * 3) % 14,
  delay: -(i * 2.1),
  drift: (i % 2 === 0 ? 1 : -1) * (20 + (i * 11) % 40),
}));

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-cancelled-by-user") {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (e) {
          setError(e.message);
          setLoading(false);
        }
      } else {
        setError(err.code + ": " + err.message);
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, position:"relative", overflow:"hidden", background:"#020c18" }}>

      <style>{`
        @keyframes gradientShift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes floatUp {
          0%   { transform: translateY(110vh) translateX(0px) rotate(0deg); opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 0.6; }
          100% { transform: translateY(-10vh) translateX(var(--drift)) rotate(360deg); opacity: 0; }
        }
        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 20px ${GOLD}44, 0 0 40px ${GOLD}22; }
          50%       { text-shadow: 0 0 30px ${GOLD}88, 0 0 60px ${GOLD}44, 0 0 80px ${GOLD}22; }
        }
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .login-card {
          animation: cardFloat 6s ease-in-out infinite;
        }
        .login-title {
          animation: titleGlow 3s ease-in-out infinite;
        }
      `}</style>

      {/* Animated gradient layer */}
      <div style={{
        position:"absolute", inset:0, zIndex:0,
        background:"linear-gradient(135deg, #020c18 0%, #0a1f1a 25%, #071428 50%, #0d1f10 75%, #020c18 100%)",
        backgroundSize:"400% 400%",
        animation:"gradientShift 12s ease infinite",
      }}/>

      {/* Subtle grid overlay */}
      <div style={{
        position:"absolute", inset:0, zIndex:1, opacity:0.04,
        backgroundImage:"linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
        backgroundSize:"40px 40px",
      }}/>

      {/* Floating golf emojis */}
      {FLOATERS.map(f=>(
        <div key={f.id} style={{
          position:"absolute", left:f.left, bottom:"-10vh", zIndex:2,
          fontSize:f.size, userSelect:"none", pointerEvents:"none",
          "--drift": `${f.drift}px`,
          animation:`floatUp ${f.duration}s linear ${f.delay}s infinite`,
          filter:"blur(0.5px)",
          opacity: 0.5,
        }}>
          {f.emoji}
        </div>
      ))}

      {/* Glowing orbs */}
      <div style={{ position:"absolute", top:"15%", left:"10%", width:300, height:300, borderRadius:"50%", background:`radial-gradient(circle, ${GOLD}18 0%, transparent 70%)`, zIndex:1, filter:"blur(20px)" }}/>
      <div style={{ position:"absolute", bottom:"20%", right:"5%", width:250, height:250, borderRadius:"50%", background:"radial-gradient(circle, #1a4a2a44 0%, transparent 70%)", zIndex:1, filter:"blur(20px)" }}/>

      {/* Main content */}
      <div style={{ position:"relative", zIndex:10, width:"100%", maxWidth:400 }}>

        {/* Title */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:56, marginBottom:8, lineHeight:1 }}>⛳</div>
          <div className="login-title" style={{ fontSize:42, fontWeight:900, color:GOLD, fontFamily:"monospace", letterSpacing:6, lineHeight:1 }}>
            DORMIE
          </div>
          <div style={{ fontSize:12, color:"#6a8a7a", marginTop:10, letterSpacing:2, fontFamily:"monospace" }}>
            MATCH PLAY · LIVE SCORING
          </div>
        </div>

        {/* Card */}
        <div className="login-card" style={{
          background:"rgba(8,18,36,0.75)",
          backdropFilter:"blur(20px)",
          WebkitBackdropFilter:"blur(20px)",
          border:`1px solid ${GOLD}33`,
          borderRadius:24,
          padding:"32px 28px",
          boxShadow:`0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px ${GOLD}11 inset`,
        }}>
          <div style={{ textAlign:"center", marginBottom:24 }}>
            <div style={{ fontSize:15, fontWeight:700, color:"#ccd", marginBottom:6 }}>Create or join a cup</div>
            <div style={{ fontSize:11, color:"#4a6a5a", letterSpacing:1 }}>Sign in with Google to get started</div>
          </div>

          {error && (
            <div style={{ fontSize:11, color:"#e74c3c", marginBottom:14, padding:"8px 10px", background:"#e74c3c18", borderRadius:8, fontFamily:"monospace", wordBreak:"break-all", border:"1px solid #e74c3c33" }}>
              {error}
            </div>
          )}

          <button onClick={handleGoogle} disabled={loading} style={{
            width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:12,
            padding:"14px 16px",
            background: loading ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)",
            border:`1px solid ${loading?"#ffffff22":"#ffffff33"}`,
            borderRadius:14,
            cursor: loading ? "wait" : "pointer",
            fontSize:14, fontWeight:600, color:"#dde",
            opacity: loading ? 0.7 : 1,
            transition:"background 0.2s, border 0.2s",
            boxShadow: loading ? "none" : "0 2px 12px rgba(0,0,0,0.3)",
          }}>
            {loading ? (
              <div style={{ width:20, height:20, border:"2px solid #ffffff33", borderTop:`2px solid ${GOLD}`, borderRadius:"50%", animation:"pulse 0.8s linear infinite" }}/>
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.5 20-21 0-1.4-.1-2.7-.3-4H44.5v.5z"/>
                <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.5 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.6 0-14.2 4.6-17.7 11.7z"/>
                <path fill="#FBBC05" d="M24 45c5.8 0 10.7-1.9 14.3-5.2l-6.6-5.4C29.9 36 27.1 37 24 37c-5.8 0-10.7-3.9-12.5-9.2l-7 5.4C8 39.7 15.4 45 24 45z"/>
                <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.6 2.9-2.1 5.3-4.3 7l6.6 5.4C41.7 37.5 45 31.2 45 24c0-1.4-.1-2.7-.3-4z"/>
              </svg>
            )}
            {loading ? "Signing in..." : "Continue with Google"}
          </button>
        </div>

        <div style={{ textAlign:"center", marginTop:20, fontSize:10, color:"#3a5a4a", letterSpacing:1, fontFamily:"monospace" }}>
          NO ACCOUNT NEEDED · JUST SIGN IN
        </div>
      </div>
    </div>
  );
}
