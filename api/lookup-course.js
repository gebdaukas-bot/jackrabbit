import Anthropic from "@anthropic-ai/sdk";

// Real course data from GolfCourseAPI.com (search + tee/hole data), tried first
// since it's actual scorecard data rather than an LLM's best guess. Falls back
// to Claude below for courses it doesn't have (~30k course coverage on free tier).
async function fetchFromGolfCourseAPI(courseName) {
  const apiKey = process.env.GOLFCOURSE_API_KEY;
  if (!apiKey) return null;
  const headers = { Authorization: `Key ${apiKey}` };

  const searchRes = await fetch(
    `https://api.golfcourseapi.com/v1/search?search_query=${encodeURIComponent(courseName)}`,
    { headers }
  );
  if (!searchRes.ok) return null;
  const { courses } = await searchRes.json();
  const top = courses?.[0];
  if (!top) return null;

  const courseRes = await fetch(`https://api.golfcourseapi.com/v1/courses/${top.id}`, { headers });
  if (!courseRes.ok) return null;
  // Despite the docs showing a bare Course schema for this response, the API
  // actually wraps it the same way the create/update endpoints do.
  const { course } = await courseRes.json();
  if (!course) return null;

  // Our data model stores one par/hcp array per course (not per tee) — use the
  // first 18-hole tee set as canonical and pull ratings from every 18-hole tee.
  const allTees = [...(course.tees?.male || []), ...(course.tees?.female || [])];
  const eighteens = allTees.filter(t => t.holes?.length === 18);
  const primary = eighteens[0];
  if (!primary) return null;

  const name = course.club_name === course.course_name
    ? course.club_name
    : `${course.club_name} - ${course.course_name}`;

  return {
    found: true,
    name,
    par: primary.holes.map(h => h.par),
    hcp: primary.holes.map(h => h.handicap),
    yardage: primary.holes.map(h => h.yardage),
    tees: eighteens.map(t => ({ name: t.tee_name, slope: t.slope_rating, rating: t.course_rating, yardage: t.total_yards })),
  };
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { courseName } = req.body || {};
  if (!courseName) return res.status(400).json({ error: "No course name provided" });

  try {
    const fromApi = await fetchFromGolfCourseAPI(courseName).catch(err => {
      console.error("GolfCourseAPI lookup failed, falling back to Claude:", err?.message || err);
      return null;
    });
    if (fromApi) return res.status(200).json(fromApi);

    const fromClaude = await fetchFromClaude(courseName);
    if (fromClaude) return res.status(200).json(fromClaude);

    res.status(200).json({ found: false });
  } catch (err) {
    console.error("lookup-course error:", err?.message || err);
    res.status(500).json({ error: "Lookup failed — make sure ANTHROPIC_API_KEY is set in Vercel" });
  }
}
