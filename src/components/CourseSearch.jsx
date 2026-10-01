import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { GOLD } from "../utils/scoring";
import { searchCourses, fetchCourse, estimateCourse, LIMIT_MESSAGE } from "../utils/courseLookup";

// Search a course by name → pick the matching course → pick a tee box.
//
// Each tee has its own slope/course rating (and often its own yardages, and for
// women's tees its own par and stroke index), so the tee is what actually sets
// handicap strokes. Searching costs one GolfCourseAPI request and opening a course
// one more; both are cached (utils/courseLookup.js), so nothing here searches as
// the user types.
//
// Props:
//   query / onQueryChange  the course-name field this search is bound to
//   onCourse(course)       a course was loaded, with every tee (optional)
//   onTee(course, tee)     a tee was picked (omit, with pickTee={false}, to let the parent list tees)
//   selectedTee            name of the tee currently in use, to highlight it
//   players                [{ name, hi, color }] to preview each player's course handicap per tee
export default function CourseSearch({ query, onQueryChange, onCourse, onTee, selectedTee, pickTee = true, players = [], placeholder = "Search a course, e.g. Streamsong Black", large = false }) {
  const { CARD2, BORDER, TEXT, MUTED } = useTheme();
  const [busy, setBusy] = useState(null);          // "search" | "course" | "estimate" | null
  const [results, setResults] = useState(null);    // search hits, when there's more than one to pick from
  const [course, setCourse] = useState(null);      // the loaded course, with tees
  const [notice, setNotice] = useState(null);      // { kind: "none" | "limit" | "error", text }

  const q = (query || "").trim();
  const pad = large ? "14px 12px" : "9px 10px";
  const radius = large ? 12 : 8;

  const reset = () => { setResults(null); setCourse(null); setNotice(null); };

  const unavailableNotice = r => r.reason === "limit"
    ? { kind: "limit", text: LIMIT_MESSAGE }
    : { kind: "error", text: "Course lookup isn't available right now — estimate with AI, or enter the course by hand." };

  const loaded = c => {
    setCourse(c); setResults(null);
    onCourse?.(c);
    // One tee means there's nothing to choose.
    if (pickTee && c.tees?.length === 1) onTee?.(c, c.tees[0]);
  };

  // GolfCourseAPI lists some courses (new ones especially) without any tee
  // boxes — say so rather than spending a request to open an empty course.
  const noTeesNotice = name => ({ kind: "none", text: `${name || "That course"} is listed, but GolfCourseAPI has no tee or scorecard data for it yet — estimate with AI, or enter it by hand.` });

  const openCourse = async (id, name) => {
    setBusy("course"); setNotice(null);
    try {
      const c = await fetchCourse(id);
      if (c.unavailable) setNotice(unavailableNotice(c));
      else if (!c.found) setNotice(noTeesNotice(name));
      else loaded(c);
    } catch (e) { setNotice({ kind: "error", text: e.message || "Something went wrong — try again" }); }
    finally { setBusy(null); }
  };

  const search = async () => {
    if (!q || busy) return;
    reset(); setBusy("search");
    try {
      const r = await searchCourses(q);
      if (r.unavailable) { setNotice(unavailableNotice(r)); return; }
      if (!r.results.length) { setNotice({ kind: "none", text: `No courses matched "${q}".` }); return; }
      // A single hit needs no picking — go straight to its tees.
      if (r.results.length === 1) {
        const [only] = r.results;
        if (only.teeCount === 0) { setNotice(noTeesNotice(only.name)); return; }
        setBusy(null); await openCourse(only.id, only.name); return;
      }
      setResults(r.results);
    } catch (e) { setNotice({ kind: "error", text: e.message || "Something went wrong — try again" }); }
    finally { setBusy(null); }
  };

  const estimate = async () => {
    if (!q || busy) return;
    setBusy("estimate");
    try {
      const c = await estimateCourse(q);
      if (!c.found) setNotice({ kind: "error", text: "AI couldn't find reliable data for that course — enter it by hand." });
      else { setNotice(null); loaded(c); }
    } catch (e) { setNotice({ kind: "error", text: e.message || "Something went wrong — try again" }); }
    finally { setBusy(null); }
  };

  const teePar = t => (t.par || course?.par || []).reduce((a, b) => a + b, 0);
  const courseHcp = (hi, t) => Math.round((Number(hi) || 0) * (t.slope / 113) + (t.rating - teePar(t)));
  const fmt = v => v < 0 ? `+${Math.abs(v)}` : `${v}`;

  const row = { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: CARD2, border: `1px solid ${BORDER}`, borderRadius: radius, cursor: "pointer", marginBottom: 6, textAlign: "left", width: "100%", boxSizing: "border-box", color: TEXT };
  const label = { fontSize: 10, color: MUTED, fontFamily: "monospace", letterSpacing: 1, marginBottom: 6 };

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={query || ""}
          onChange={e => { onQueryChange(e.target.value); reset(); }}
          onKeyDown={e => { if (e.key === "Enter") search(); }}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, padding: pad, background: CARD2, border: `1px solid ${course ? "#4caf50" : BORDER}`, borderRadius: radius, color: TEXT, fontSize: large ? 14 : 13, outline: "none", boxSizing: "border-box" }}
        />
        <button onClick={search} disabled={!!busy || !q}
          style={{ padding: large ? "14px 16px" : "9px 14px", background: GOLD, border: "none", borderRadius: radius, color: "#000", fontWeight: 900, fontSize: large ? 12 : 11, cursor: busy || !q ? "default" : "pointer", fontFamily: "monospace", flexShrink: 0, opacity: busy || !q ? 0.5 : 1 }}>
          {busy === "search" ? "…" : "🔍 Search"}
        </button>
      </div>

      {busy === "course" && <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>Loading tee boxes…</div>}
      {busy === "estimate" && <div style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>Estimating with AI…</div>}

      {notice && (
        <div style={{ marginTop: 8, padding: "10px 12px", background: notice.kind === "none" ? "#e67e2214" : "#e74c3c14", border: `1px solid ${notice.kind === "none" ? "#e67e2255" : "#e74c3c55"}`, borderRadius: radius, fontSize: 11, color: notice.kind === "none" ? "#e67e22" : "#e74c3c" }}>
          <div>{notice.text}</div>
          {q && (
            <button onClick={estimate} disabled={!!busy}
              style={{ marginTop: 8, padding: "6px 10px", background: "none", border: `1px solid ${GOLD}`, borderRadius: 6, color: GOLD, fontSize: 10, fontWeight: 800, cursor: "pointer", fontFamily: "monospace" }}>
              ESTIMATE WITH AI
            </button>
          )}
        </div>
      )}

      {results && (
        <div style={{ marginTop: 10 }}>
          <div style={label}>{results.length} COURSES MATCH — PICK ONE</div>
          {results.map(r => (
            <button key={r.id} onClick={() => r.teeCount === 0 ? setNotice(noTeesNotice(r.name)) : openCourse(r.id, r.name)} disabled={!!busy} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</div>
                {(r.location || r.teeCount != null) && (
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>
                    {[r.location, r.teeCount ? `${r.teeCount} tee${r.teeCount === 1 ? "" : "s"}` : r.teeCount === 0 ? "no tee data" : null].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>
              <div style={{ color: MUTED, fontSize: 14, flexShrink: 0 }}>›</div>
            </button>
          ))}
        </div>
      )}

      {course && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#4caf50", minWidth: 0 }}>✓ {course.name}</div>
            <div style={{ fontSize: 10, color: MUTED, fontFamily: "monospace", flexShrink: 0 }}>{course.tees?.length || 0} tee{course.tees?.length === 1 ? "" : "s"}</div>
          </div>
          {course.source === "claude" && (
            <div style={{ fontSize: 10, color: "#e67e22", marginBottom: 8 }}>AI estimate, not official scorecard data — check the slope and rating against the scorecard.</div>
          )}
          {pickTee && course.tees?.length > 0 && (
            <>
              <div style={label}>PICK THE TEES BEING PLAYED</div>
              {course.tees.map((t, i) => {
                const sel = selectedTee === t.name;
                return (
                  <button key={i} onClick={() => onTee?.(course, t)}
                    style={{ ...row, background: sel ? `${GOLD}18` : CARD2, border: `1px solid ${sel ? GOLD : BORDER}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: sel ? GOLD : TEXT }}>{t.name}</div>
                      <div style={{ fontSize: 10, color: MUTED, fontFamily: "monospace", marginTop: 2 }}>
                        Rating {t.rating} · Slope {t.slope}{t.yardage ? ` · ${t.yardage} yds` : ""}{t.par ? ` · Par ${teePar(t)}` : ""}
                      </div>
                    </div>
                    {players.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-end", flexShrink: 0 }}>
                        {players.map(p => (
                          <div key={p.name} style={{ fontSize: 10, fontFamily: "monospace", color: sel ? p.color : MUTED, whiteSpace: "nowrap" }}>
                            {p.name}: <span style={{ fontWeight: 800, color: sel ? GOLD : MUTED }}>{fmt(courseHcp(p.hi, t))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
