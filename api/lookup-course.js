import Anthropic from "@anthropic-ai/sdk";

// Real course data from GolfCourseAPI.com (search + tee/hole data), tried first
// since it's actual scorecard data rather than an LLM's best guess. Falls back
// to Claude below for courses it doesn't have (~30k course coverage on free tier).
//
// The free tier allows 35 requests per UTC day across the whole site, so each
// helper below is exactly one request, and the client caches what they return
// (see src/utils/courseLookup.js).
const GCA_BASE = "https://api.golfcourseapi.com/v1";

class GolfCourseAPIError extends Error {
  constructor(status) {
    super(`GolfCourseAPI responded ${status}`);
    // 429 = the daily request quota is used up.
    this.reason = status === 429 ? "limit" : "error";
  }
}

async function gcaFetch(path) {
  const apiKey = process.env.GOLFCOURSE_API_KEY;
  if (!apiKey) throw Object.assign(new Error("GOLFCOURSE_API_KEY not set"), { reason: "nokey" });
  const res = await fetch(`${GCA_BASE}${path}`, { headers: { Authorization: `Key ${apiKey}` } });
  if (!res.ok) throw new GolfCourseAPIError(res.status);
  return res.json();
}

function displayName(c) {
  return !c.course_name || c.club_name === c.course_name
    ? c.club_name
    : `${c.club_name} - ${c.course_name}`;
}

// One request. Search results only carry a tee-box count per grouping, not the
// tees themselves, so picking a result costs one more request (fetchCourse).
async function searchCourses(query) {
  const { courses } = await gcaFetch(`/search?search_query=${encodeURIComponent(query)}`);
  return (courses || []).map(c => {
    const loc = c.location || {};
    const teeCount = Object.values(c.tees || {}).reduce((a, n) => a + (Number(n) || 0), 0);
    return {
      id: String(c.id),
      name: displayName(c),
      location: [loc.city, loc.state, loc.country !== "United States" ? loc.country : null].filter(Boolean).join(", "),
      ...(teeCount ? { teeCount } : {}),
    };
  });
}

// One request: the course with every 18-hole tee box. Each tee carries its own
// par, stroke index and hole yardages as well as slope/rating — women's tees in
// particular often differ in par and stroke index from the men's.
async function fetchCourse(id) {
  // Despite the docs showing a bare Course schema for this response, the API
  // actually wraps it the same way the create/update endpoints do.
  const { course } = await gcaFetch(`/courses/${encodeURIComponent(id)}`);
  if (!course) return null;

  const groups = [["male", "M"], ["female", "W"]]
    .map(([key, g]) => (course.tees?.[key] || []).filter(t => t.holes?.length === 18).map(t => ({ t, g })))
    .filter(list => list.length);
  // Only tag tees with M/W when the course lists both — otherwise it's noise.
  const tagGender = groups.length > 1;
  const tees = groups.flat().map(({ t, g }) => ({
    name: tagGender ? `${t.tee_name} (${g})` : t.tee_name,
    gender: g,
    slope: t.slope_rating,
    rating: t.course_rating,
    yardage: t.total_yards,
    par: t.holes.map(h => h.par),
    hcp: t.holes.map(h => h.handicap),
    holeYardage: t.holes.map(h => h.yardage || 0),
  }));
  if (!tees.length) return null;

  const primary = tees[0];
  return {
    found: true,
    id: String(course.id ?? id),
    name: displayName(course),
    par: primary.par,
    hcp: primary.hcp,
    yardage: primary.holeYardage,
    tees,
    source: "golfcourseapi",
  };
}

// Legacy one-shot lookup (search + first result's details = two requests).
async function fetchFromGolfCourseAPI(courseName) {
  const results = await searchCourses(courseName);
  if (!results.length) return null;
  return fetchCourse(results[0].id);
}

async function fetchFromClaude(courseName) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Look up the golf course "${courseName}" and return its official data.

Return ONLY a valid JSON object — no explanation, no markdown:
{
  "found": true,
  "name": "Full Official Course Name",
  "par": [4,4,3,4,5,4,3,4,4,4,3,4,5,3,4,4,5,4],
  "hcp": [1,3,17,9,5,13,15,7,11,2,18,8,4,16,12,6,14,10],
  "yardage": [420,175,510,390,140,455,585,410,205,435,160,530,400,395,150,470,410,595],
  "tees": [
    { "name": "Black", "rating": 74.2, "slope": 148, "yardage": 7012 },
    { "name": "Blue",  "rating": 72.1, "slope": 138, "yardage": 6580 },
    { "name": "White", "rating": 70.3, "slope": 128, "yardage": 6120 },
    { "name": "Red",   "rating": 68.5, "slope": 118, "yardage": 5480 }
  ]
}

If you do not have reliable data for this specific course, return exactly: { "found": false }

Rules:
- "par" must be exactly 18 integers (holes 1–18 in order)
- "hcp" must be exactly 18 integers, each value 1–18 used exactly once
- "yardage" must be exactly 18 integers, the per-hole yardage from the tees array's primary (first-listed) tee
- "tees" must list every available set of tees from hardest to easiest with accurate USGA slope, course rating, and total yardage
- Only return data you are genuinely confident about — if uncertain about par/hcp, yardage, or slope/rating, return { "found": false }`,
      },
    ],
  });

  const text = message.content[0].text.trim();
  const clean = text.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
  const data = JSON.parse(clean);

  if (!data.found) return null;
  if (
    !data.name ||
    !Array.isArray(data.par) || data.par.length !== 18 ||
    !Array.isArray(data.hcp) || data.hcp.length !== 18 ||
    !Array.isArray(data.tees) || data.tees.length === 0
  ) {
    return null;
  }
  // Yardage is a nice-to-have — don't fail the whole lookup over it.
  if (!Array.isArray(data.yardage) || data.yardage.length !== 18) data.yardage = null;
  return data;
}

// POST body, one of:
//   { query }      → { results: [{ id, name, location, teeCount }] }      1 GolfCourseAPI request
//   { courseId }   → { found, id, name, par, hcp, yardage, tees: [...] }  1 GolfCourseAPI request
//   { estimate }   → Claude's best guess for a course GolfCourseAPI lacks (no GolfCourseAPI request)
//   { courseName } → legacy: top search hit, falling back to Claude       2 GolfCourseAPI requests
// When GolfCourseAPI can't be used, { query } and { courseId } answer
// { unavailable: true, reason: "limit" | "nokey" | "error" } so the client can
// say so instead of quietly passing off an estimate as real data.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { query, courseId, estimate, courseName } = req.body || {};

  const unavailable = err => {
    console.error("GolfCourseAPI unavailable:", err?.message || err);
    return res.status(200).json({ unavailable: true, reason: err?.reason || "error" });
  };

  if (query) {
    try { return res.status(200).json({ results: await searchCourses(String(query).trim()) }); }
    catch (err) { return unavailable(err); }
  }

  if (courseId) {
    try { return res.status(200).json((await fetchCourse(String(courseId))) || { found: false }); }
    catch (err) { return unavailable(err); }
  }

  if (estimate) {
    try {
      const fromClaude = await fetchFromClaude(String(estimate).trim());
      return res.status(200).json(fromClaude ? { ...fromClaude, source: "claude" } : { found: false });
    } catch (err) {
      console.error("lookup-course estimate error:", err?.message || err);
      return res.status(500).json({ error: "Estimate failed — make sure ANTHROPIC_API_KEY is set in Vercel" });
    }
  }

  if (!courseName) return res.status(400).json({ error: "No course name provided" });

  try {
    const fromApi = await fetchFromGolfCourseAPI(courseName).catch(err => {
      console.error("GolfCourseAPI lookup failed, falling back to Claude:", err?.message || err);
      return null;
    });
    if (fromApi) return res.status(200).json(fromApi);

    const fromClaude = await fetchFromClaude(courseName);
    if (fromClaude) return res.status(200).json({ ...fromClaude, source: "claude" });

    res.status(200).json({ found: false });
  } catch (err) {
    console.error("lookup-course error:", err?.message || err);
    res.status(500).json({ error: "Lookup failed — make sure ANTHROPIC_API_KEY is set in Vercel" });
  }
}
