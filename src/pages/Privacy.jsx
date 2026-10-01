import { useNavigate } from "react-router-dom";
import { GOLD } from "../utils/scoring";

const CONTACT = "gebdaukas@gmail.com";

// Public page (linked from App Store Connect as the privacy policy URL), so it renders the same signed in or out.
export default function Privacy() {
  const nav = useNavigate();
  const h = { fontSize: 15, fontWeight: 800, color: GOLD, margin: "24px 0 8px", fontFamily: "monospace", letterSpacing: 1 };
  const p = { fontSize: 14, lineHeight: 1.6, color: "#c8d2dc", margin: "0 0 10px" };

  return (
    <div style={{ minHeight: "100vh", background: "#020c18", padding: "24px 16px 48px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <button onClick={() => nav("/")} style={{ background: "none", border: "none", color: "#6a8a7a", fontSize: 12, cursor: "pointer", padding: 0, fontFamily: "monospace" }}>← Dormie</button>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: GOLD, fontFamily: "monospace", letterSpacing: 3, margin: "16px 0 4px" }}>PRIVACY POLICY</h1>
        <div style={{ fontSize: 12, color: "#6a8a7a", marginBottom: 8 }}>Last updated October 1, 2026</div>

        <p style={p}>Dormie is a scoring app for golf trips and matches. This page explains what it stores and why. We don't sell your data, show ads, or track you across other apps or websites.</p>

        <div style={h}>WHAT WE COLLECT</div>
        <p style={p}><b>Account details.</b> When you sign in with Google, Apple, email, or phone, we receive your name, email address or phone number, and profile photo (if your sign-in provider shares one). These are used only to sign you in and show who you are to the people in your cups.</p>
        <p style={p}><b>Cup and match data.</b> The cups, teams, player names, handicaps, tee times, and scores you or your group enter. Anyone who is a member of a cup, or who has its watch link, can see that cup's data.</p>
        <p style={p}><b>Scorecard photos.</b> If you scan a scorecard, the photo is sent to Anthropic's Claude AI to read the course details. It is processed to fill in the form and is not saved by Dormie.</p>
        <p style={p}><b>Course searches.</b> Course names you search for are sent to GolfCourseAPI to look up course details.</p>

        <div style={h}>WHO PROCESSES IT</div>
        <p style={p}>Dormie runs on Google Firebase (sign-in and database) and Vercel (website hosting). Scorecard photos go to Anthropic and course searches to GolfCourseAPI, as described above. These providers handle data only to run those features.</p>

        <div style={h}>DELETING YOUR DATA</div>
        <p style={p}>You can delete your account at any time from the home screen ("Delete account"). This removes your sign-in and your list of cups. Scores and player names you entered in a shared cup stay in that cup so your group's results remain intact; email us if you'd like those removed too.</p>

        <div style={h}>CHILDREN</div>
        <p style={p}>Dormie isn't directed at children under 13, and we don't knowingly collect their information.</p>

        <div style={h}>CONTACT</div>
        <p style={p}>Questions or deletion requests: <a href={`mailto:${CONTACT}`} style={{ color: GOLD }}>{CONTACT}</a></p>
      </div>
    </div>
  );
}
