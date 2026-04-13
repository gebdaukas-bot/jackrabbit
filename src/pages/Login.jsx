import { useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { auth, googleProvider } from "../firebase";
import { signInWithRedirect, getRedirectResult } from "firebase/auth";
import { GOLD } from "../utils/scoring";

export default function Login() {
  const { BG, CARD, CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle redirect result when returning from Google
  useEffect(() => {
    setLoading(true);
    getRedirectResult(auth)
      .then(result => { if (!result) setLoading(false); })
      .catch(err => { console.error(err); setError(err.message); setLoading(false); });
  }, []);

  const handleGoogle = async () => {
    setError("");
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (err) {
      console.error("Login failed", err);
      setError(err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo / title */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>⛳</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: GOLD, fontFamily: "monospace", letterSpacing: 3 }}>JACKRABBIT</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 6, letterSpacing: 1 }}>Match play scoring for your crew</div>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 6, textAlign: "center" }}>Create or join a cup</div>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 24, textAlign: "center" }}>Sign in to get started</div>

          {error && <div style={{ fontSize: 11, color: "#e74c3c", marginBottom: 12, textAlign: "center" }}>{error}</div>}
          <button onClick={handleGoogle} disabled={loading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, padding: "14px 16px", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, cursor: loading ? "wait" : "pointer", fontSize: 14, fontWeight: 600, color: TEXT, opacity: loading ? 0.6 : 1 }}>
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.5 20-21 0-1.4-.1-2.7-.3-4H44.5v.5z"/>
              <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16.5 19.2 14 24 14c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.6 0-14.2 4.6-17.7 11.7z"/>
              <path fill="#FBBC05" d="M24 45c5.8 0 10.7-1.9 14.3-5.2l-6.6-5.4C29.9 36 27.1 37 24 37c-5.8 0-10.7-3.9-12.5-9.2l-7 5.4C8 39.7 15.4 45 24 45z"/>
              <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.6 2.9-2.1 5.3-4.3 7l6.6 5.4C41.7 37.5 45 31.2 45 24c0-1.4-.1-2.7-.3-4z"/>
            </svg>
            {loading ? "Signing in..." : "Continue with Google"}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11, color: MUTED }}>
          No account needed — just sign in with Google
        </div>
      </div>
    </div>
  );
}
