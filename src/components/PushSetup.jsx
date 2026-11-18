import { useEffect, useState } from "react";
import { StatusBar, Style } from "@capacitor/status-bar";
import { DormieMark } from "./Icon";
import { enablePushEverywhere, declinePushEverywhere } from "../utils/push";

const GOLD = "#C4A44A";

// Example notifications, so it's clear what saying yes gets you.
const SAMPLES = [
  { title: "Team Blue secured a point", body: "Henry & Geb beat Spencer & Hunter 4&3" },
  { title: "End of Day 1", body: "Blue 4½ · Red 3½" },
  { title: "🎯 Closest to the pin on 6", body: "Cy Cole takes the lead at 6′ 1″" },
];

// Shown once after signing in in the iOS app, while iOS would still show its
// permission prompt: yes signs this phone up for all the member's cups.
export default function PushSetup({ uid, onDone }) {
  const [busy, setBusy] = useState(false);

  // Navy page, so white status-bar text in either theme; put it back on the way out.
  useEffect(() => {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    return () => {
      StatusBar.setStyle({ style: document.documentElement.dataset.theme === "light" ? Style.Light : Style.Dark }).catch(() => {});
    };
  }, []);

  const turnOn = async () => {
    setBusy(true);
    try { await enablePushEverywhere(uid); } catch {}
    onDone();
  };
  const notNow = () => { declinePushEverywhere(); onDone(); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2001, display: "flex", flexDirection: "column", boxSizing: "border-box",
      padding: "max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom))",
      overflowX: "hidden", overflowY: "auto", overscrollBehavior: "none", background: "#060e1c",
      backgroundImage: "radial-gradient(120% 60% at 50% -10%, rgba(46,92,170,0.22) 0%, transparent 60%)", animation: "fadeIn .25s ease-out" }}>
      <div style={{ width: "100%", maxWidth: 400, margin: "auto", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><DormieMark size={56} /></div>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginTop: 18, lineHeight: 1.2 }}>Don't miss a point</div>
        <div style={{ fontSize: 15, color: "#95a1bb", marginTop: 8, lineHeight: 1.45 }}>
          Get a notification the moment something happens in your cups, even when you're on another hole.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "26px 0 28px", textAlign: "left" }}>
          {SAMPLES.map(n => (
            <div key={n.title} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 12px", borderRadius: 16, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <DormieMark size={30} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</div>
                <div style={{ fontSize: 13, color: "#c4ccdb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.body}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={turnOn} disabled={busy}
          style={{ width: "100%", padding: 16, background: `linear-gradient(135deg,${GOLD},${GOLD}cc)`, border: "none", borderRadius: 14, color: "#000", fontWeight: 900, fontSize: 14, fontFamily: "var(--mono)", letterSpacing: 1, cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "…" : "TURN ON NOTIFICATIONS"}
        </button>
        <button onClick={notNow} disabled={busy}
          style={{ width: "100%", marginTop: 8, padding: 14, background: "none", border: "none", color: "#95a1bb", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Not now
        </button>
        <div style={{ fontSize: 12, color: "#7d89a6", marginTop: 6 }}>You can change this for each cup with the 🔔 at the top.</div>
      </div>
    </div>
  );
}
