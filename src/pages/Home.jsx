import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { getTeams } from "../utils/teams";
import { joinCup } from "../utils/joinCup";
import { auth, signOut, db, ref, onValue, set, get, isNative } from "../firebase";
import { deleteUser, OAuthProvider, reauthenticateWithCredential, revokeAccessToken } from "firebase/auth";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { GOLD } from "../utils/scoring";
import LiveBackground from "../components/LiveBackground";
import { summarizeCup } from "../utils/cupSummary";

export default function Home({ user }) {
  const { BG, CARD, CARD2, BORDER, TEXT, MUTED, MUTED2, theme, toggle } = useTheme();
  const nav = useNavigate();
  const [cups, setCups] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [accountError, setAccountError] = useState("");

  useEffect(() => {
    if (!user) return;
    const userRef = ref(db, `users/${user.uid}/cups`);
    const unsub = onValue(userRef, snap => {
      const data = snap.val();
      if (!data) { setCups([]); return; }
      // data is { cupId: { name, teams?, teamAName, teamBName, createdAt } }
      const list = Object.entries(data).map(([id, meta]) => ({ id, ...meta }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setCups(list);
    });
    return () => unsub();
  }, [user]);

  // Live summaries (score, status, where/when) for each cup in the list.
  const [summaries, setSummaries] = useState({});
  const cupIds = cups.map(c => c.id).join(",");
  useEffect(() => {
    if (!cupIds) return;
    const unsubs = cupIds.split(",").map(id => onValue(ref(db, `cups/${id}`), snap =>
      setSummaries(prev => ({ ...prev, [id]: summarizeCup(snap.val()) }))));
    return () => unsubs.forEach(u => u());
  }, [cupIds]);

  // The cup worth putting front and centre: one with matches live now, else the
  // newest one that isn't finished yet.
  const featured = cups.find(c => summaries[c.id]?.live > 0)
    || cups.find(c => summaries[c.id] && !summaries[c.id].finished);

  const handleDelete = async (cupId) => {
    await set(ref(db, `users/${user.uid}/cups/${cupId}`), null);
    setConfirmDelete(null);
  };

  const handleSignOut = async () => {
    // Also clear the native Google/Apple session so the next sign-in can pick a different account.
    if (isNative) await FirebaseAuthentication.signOut().catch(() => {});
    await signOut(auth);
  };

  // Apple requires in-app account deletion. Shared cup data stays so the rest of the group keeps their results.
  const handleDeleteAccount = async () => {
    setAccountError("");
    try {
      // Apple also requires revoking Sign in with Apple on deletion. A fresh Apple
      // sign-in gives the authorization code to revoke with, and doubles as the
      // recent login deleteUser() needs.
      if (isNative && user.providerData.some(p => p.providerId === "apple.com")) {
        const { credential } = await FirebaseAuthentication.signInWithApple();
        await reauthenticateWithCredential(user, new OAuthProvider("apple.com").credential({ idToken: credential?.idToken, rawNonce: credential?.nonce }));
        if (credential?.authorizationCode) await revokeAccessToken(auth, credential.authorizationCode);
      }
      // Drop this account's notification sign-ups along with its cup list.
      const cups = (await get(ref(db, `users/${user.uid}/cups`))).val() || {};
      await Promise.all(Object.keys(cups).map(id => set(ref(db, `pushSubs/${id}/${user.uid}`), null).catch(() => {})));
      await set(ref(db, `users/${user.uid}`), null);
      await deleteUser(user);
      if (isNative) await FirebaseAuthentication.signOut().catch(() => {});
    } catch (e) {
      if (e.code === "auth/requires-recent-login") {
        setAccountError("For security, sign out and sign back in, then delete your account.");
      } else {
        setAccountError(e.message || "Couldn't delete your account. Try again.");
      }
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      nav(`/cup/${await joinCup(user, joinCode)}`);
    } catch (e) {
      setJoinError(e.message || "Something went wrong. Try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", color: TEXT }}>
      <LiveBackground/>
      {/* Top bar */}
      <div style={{ background: "var(--glass-85)", backdropFilter:"blur(8px)", borderBottom: `1px solid ${BORDER}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: "var(--gold-text)", fontFamily: "var(--mono)", letterSpacing:1 }}>⛳ DORMIE</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={toggle} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "4px 10px", color: MUTED, fontSize: 11, cursor: "pointer" }}>
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button onClick={handleSignOut} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "4px 10px", color: MUTED, fontSize: 11, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "20px 16px" }}>
        {/* Featured: the live (or next) cup, big, right at the top. */}
        {featured && summaries[featured.id] ? (
          <FeaturedCup cup={featured} sum={summaries[featured.id]} onOpen={() => nav(`/cup/${featured.id}`)} />
        ) : (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: MUTED2 }}>Welcome back,</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: TEXT }}>{user.displayName?.split(" ")[0] || "friend"}</div>
          </div>
        )}

        {/* Create: a cup is the main thing; a one-off match is the secondary option. */}
        <button onClick={() => nav("/create")} style={{ width:"100%", padding:"16px", background:`linear-gradient(135deg,${GOLD},${GOLD}cc)`, border:"none", borderRadius:14, color:"#000", fontWeight:900, fontSize:15, cursor:"pointer", letterSpacing:1, fontFamily:"var(--mono)", marginBottom:10, boxShadow:`0 4px 18px ${GOLD}33` }}>
          + CREATE NEW CUP
        </button>
        <button onClick={() => nav("/match")} style={{ width:"100%", padding:"14px", background:"transparent", border:`1.5px solid ${GOLD}99`, borderRadius:14, color:"var(--gold-text)", fontWeight:800, fontSize:13, cursor:"pointer", letterSpacing:1, fontFamily:"var(--mono)", marginBottom:24 }}>
          ⚡ CREATE NEW MATCH
        </button>

        {/* Join by code */}
        <div style={{ background: "var(--glass-80)", backdropFilter:"blur(10px)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px", marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: MUTED2, letterSpacing: 1, marginBottom: 10, fontFamily: "var(--mono)" }}>JOIN A CUP</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleJoin()}
              placeholder="INVITE CODE"
              maxLength={8}
              style={{ flex: 1, padding: "10px 12px", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 14, fontFamily: "var(--mono)", letterSpacing:1, outline: "none" }}
            />
            <button onClick={handleJoin} disabled={joining} style={{ padding: "10px 16px", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, color: TEXT, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              {joining ? "..." : "Join"}
            </button>
          </div>
          {joinError && <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 8 }}>{joinError}</div>}
        </div>

        {/* Cups list */}
        <div style={{ fontSize: 12, fontWeight: 700, color: MUTED2, letterSpacing: 1, marginBottom: 10, fontFamily: "var(--mono)" }}>YOUR CUPS</div>
        {cups.length === 0 ? (
          <div style={{ background: "var(--glass-80)", backdropFilter:"blur(10px)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "24px", textAlign: "center", color: MUTED, fontSize: 12 }}>
            No cups yet. Create one or join with an invite code.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cups.map(cup => (
              <div key={cup.id} style={{ position: "relative" }}>
                {confirmDelete === cup.id ? (
                  <div style={{ background: "var(--glass-95)", border: `1px solid #e74c3c`, borderRadius: 14, padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 12, color: "#e74c3c", fontWeight: 700 }}>Remove "{cup.name}" from your list?</div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => setConfirmDelete(null)} style={{ padding: "6px 12px", background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                      <button onClick={() => handleDelete(cup.id)} style={{ padding: "6px 12px", background: "#e74c3c", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button onClick={() => nav(`/cup/${cup.id}`)} style={{ width: "100%", textAlign: "left", background: "var(--glass-80)", backdropFilter:"blur(10px)", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px", cursor: "pointer" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                        {cup.eventType === "live_match" && (
                          <span style={{ fontSize:9, fontWeight:800, color:"#4A90D9", fontFamily:"var(--mono)", letterSpacing:1, background:"#4A90D922", border:"1px solid #4A90D944", borderRadius:4, padding:"1px 5px" }}>⚡ MATCH</span>
                        )}
                        <div style={{ fontSize: 15, fontWeight: 800, color: TEXT, paddingRight: 30 }}>{cup.name}</div>
                      </div>
                      <CupCardBody cup={cup} sum={summaries[cup.id]} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(cup.id); }} aria-label={`Remove ${cup.name}`} style={{ position: "absolute", top: 4, right: 4, width: 44, height: 44, background: "none", border: "none", color: MUTED2, fontSize: 18, cursor: "pointer", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${BORDER}`, textAlign: "center", fontSize: 11 }}>
          {confirmDeleteAccount ? (
            <div>
              <div style={{ color: TEXT, marginBottom: 10 }}>Delete your Dormie account? Your cup list goes away; scores in shared cups stay for your group.</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button onClick={() => { setConfirmDeleteAccount(false); setAccountError(""); }} style={{ padding: "6px 12px", background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleDeleteAccount} style={{ padding: "6px 12px", background: "#e74c3c", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete account</button>
              </div>
              {accountError && <div style={{ color: "#e74c3c", marginTop: 10 }}>{accountError}</div>}
            </div>
          ) : (
            <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
              <button onClick={() => nav("/privacy")} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}>Privacy policy</button>
              <button onClick={() => setConfirmDeleteAccount(true)} style={{ background: "none", border: "none", color: MUTED, fontSize: 11, cursor: "pointer" }}>Delete account</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LiveDot() {
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: "#4caf50", animation: "pulse 1.5s infinite", marginRight: 5, verticalAlign: "middle" }} />;
}

// Team names with their points: "Eagles 2 – 4 Hawks" head-to-head, a points
// list with three or four teams.
function ScoreLine({ sum, big = false }) {
  const { MUTED } = useTheme();
  const fmt = n => (n % 1 ? `${Math.floor(n) || ""}½` : String(n));
  const chip = (t, after = false) => <span style={{ display: "inline-block", width: big ? 9 : 7, height: big ? 9 : 7, borderRadius: 2, background: t.color, border: "1px solid #fff3", [after ? "marginLeft" : "marginRight"]: 5, verticalAlign: "middle" }} />;
  const pts = Object.fromEntries(sum.rows.map(r => [r.team.id, r.actual]));
  const size = big ? 15 : 12;
  if (sum.teams.length === 2) {
    const [a, b] = sum.teams;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: size, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: a.colorDisp }}>{chip(a)}{a.name}</span>
        <span style={{ color: "var(--strong)", fontFamily: "var(--mono)", fontWeight: 900, fontSize: size + (big ? 5 : 1) }}>{fmt(pts[a.id])}–{fmt(pts[b.id])}</span>
        <span style={{ color: b.colorDisp }}>{b.name}{chip(b, true)}</span>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", fontSize: size, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
      {sum.rows.map(r => (
        <span key={r.team.id} style={{ color: r.team.colorDisp }}>{chip(r.team)}{r.team.name.replace(/^team\s+/i, "")} <span style={{ color: "var(--strong)", fontFamily: "var(--mono)" }}>{fmt(r.actual)}</span></span>
      ))}
      {!sum.started && <span style={{ color: MUTED, fontWeight: 400 }}></span>}
    </div>
  );
}

function CupCardBody({ cup, sum }) {
  const { MUTED, MUTED2 } = useTheme();
  if (!sum) return <div style={{ height: 34, borderRadius: 6, background: "var(--panel-a)", opacity: 0.6 }} />; // loading placeholder
  return (
    <>
      <div style={{ fontSize: 11, color: sum.live ? "#4caf50" : MUTED2, fontFamily: "var(--mono)", marginBottom: 6, fontWeight: 700 }}>
        {sum.live > 0 && <LiveDot />}{sum.live > 0 ? `${sum.live} LIVE · ` : ""}{sum.status}
      </div>
      {cup.eventType !== "live_match" && <ScoreLine sum={sum} />}
      {sum.place && <div style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>{sum.place}</div>}
    </>
  );
}

function FeaturedCup({ cup, sum, onOpen }) {
  const { BORDER, MUTED2, TEXT } = useTheme();
  const [a, b] = sum.teams;
  return (
    <button onClick={onOpen} style={{ width: "100%", textAlign: "left", marginBottom: 18, padding: 0, border: `1px solid ${GOLD}55`, borderRadius: 16, cursor: "pointer", overflow: "hidden", background: `linear-gradient(135deg, ${a?.color || GOLD}33, var(--glass-95) 45%, ${b?.color || GOLD}33)`, boxShadow: `0 6px 24px #0006` }}>
      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, fontFamily: "var(--mono)", color: sum.live ? "#4caf50" : "var(--gold-text)", marginBottom: 6 }}>
          {sum.live > 0 ? <><LiveDot />LIVE NOW · {sum.live} MATCH{sum.live === 1 ? "" : "ES"}</> : sum.started ? "IN PROGRESS" : "UP NEXT"}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: TEXT, marginBottom: 10 }}>{cup.name}</div>
        {cup.eventType !== "live_match" && <ScoreLine sum={sum} big />}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
          <span style={{ fontSize: 11, color: MUTED2 }}>{sum.status}{sum.place ? ` · ${sum.place}` : ""}</span>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gold-text)", fontFamily: "var(--mono)", whiteSpace: "nowrap", flexShrink: 0, marginLeft: 10 }}>OPEN →</span>
        </div>
      </div>
    </button>
  );
}
