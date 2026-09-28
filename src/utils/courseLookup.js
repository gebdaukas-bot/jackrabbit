import { db, ref, get, set } from "../firebase";

// Course search/lookup through /api/lookup-course, with a cache in Firebase that
// every user shares.
//
// GolfCourseAPI's free tier allows 35 requests per UTC day for the whole site: a
// search costs one, opening a course costs one. Course data barely changes, so
// anything fetched once is kept under courseCache/ and served from there after —
// re-adding a course anyone has looked up before costs nothing.
//
// Cache writes are best-effort: if the database rules don't allow courseCache/
// the lookup still works, it just isn't cached.

const SEARCH_TTL = 30 * 24 * 60 * 60 * 1000; // new courses do get added, so let searches expire
const COURSE_TTL = 365 * 24 * 60 * 60 * 1000; // tees get re-rated now and then

// Firebase keys can't contain . # $ [ ] /
const cacheKey = s => String(s).trim().toLowerCase().replace(/\s+/g, " ").replace(/[.#$[\]/]/g, "_").slice(0, 200);

async function readCache(path, ttl) {
  try {
    const snap = await get(ref(db, path));
    const v = snap.exists() ? snap.val() : null;
    return v && Date.now() - (v.fetchedAt || 0) < ttl ? v.data : null;
  } catch { return null; }
}

function writeCache(path, data) {
  // The JSON round trip drops undefined fields, which Firebase refuses to store.
  try { set(ref(db, path), { data: JSON.parse(JSON.stringify(data)), fetchedAt: Date.now() }).catch(() => {}); }
  catch { /* not cached — fine */ }
}

async function post(body) {
  const res = await fetch("/api/lookup-course", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Lookup failed");
  return data;
}

// Firebase drops empty arrays and turns sparse ones into objects — put the shape back.
const arr = v => Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
function normalizeCourse(c) {
  return { ...c, par: arr(c.par), hcp: arr(c.hcp), yardage: c.yardage ? arr(c.yardage) : null,
    tees: arr(c.tees).map(t => ({ ...t, ...(t.par ? { par: arr(t.par) } : {}), ...(t.hcp ? { hcp: arr(t.hcp) } : {}), ...(t.holeYardage ? { holeYardage: arr(t.holeYardage) } : {}) })) };
}

// → { results: [{ id, name, location, teeCount }], cached } or { unavailable, reason }
export async function searchCourses(query) {
  const path = `courseCache/searches/${cacheKey(query)}`;
  const hit = await readCache(path, SEARCH_TTL);
  if (hit) return { results: arr(hit), cached: true };
  const data = await post({ query });
  if (data.unavailable) return data;
  const results = data.results || [];
  // An empty result isn't cached — the course may just be spelled differently next time.
  if (results.length) writeCache(path, results);
  return { results, cached: false };
}

// → { found, id, name, par, hcp, yardage, tees, source, cached } or { unavailable, reason }
export async function fetchCourse(id) {
  const path = `courseCache/courses/${cacheKey(id)}`;
  const hit = await readCache(path, COURSE_TTL);
  if (hit) return { ...normalizeCourse(hit), cached: true };
  const data = await post({ courseId: id });
  if (data.unavailable || !data.found) return data;
  writeCache(path, data);
  return { ...data, cached: false };
}

// Claude's best guess at a course GolfCourseAPI doesn't have. Not cached — it's
// an estimate, and a real lookup should win once one is possible.
export async function estimateCourse(name) {
  return post({ estimate: name });
}

// A tee's own hole data where it has it (GolfCourseAPI tees do), else the
// course's. Returns the fields a round's course record stores.
export function courseFromTee(course, tee) {
  const holes = (v, fallback) => Array.isArray(v) && v.length === 18 ? [...v] : fallback ? [...fallback] : null;
  const yardage = holes(tee?.holeYardage, course.yardage);
  return {
    name: course.name,
    par: holes(tee?.par, course.par),
    hcp: holes(tee?.hcp, course.hcp),
    yardage: yardage ? yardage.map(y => y || null) : Array(18).fill(null),
    ...(tee ? { slope: tee.slope, rating: tee.rating, teeName: tee.name } : {}),
  };
}

export const LIMIT_MESSAGE = "Today's course lookup limit is used up (it resets at midnight UTC). Courses already looked up still load — or estimate this one with AI, or enter it by hand.";
