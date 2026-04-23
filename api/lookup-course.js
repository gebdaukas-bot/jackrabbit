import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { courseName } = req.body || {};
  if (!courseName) return res.status(400).json({ error: "No course name provided" });

  try {
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
  "tees": [
    { "name": "Black", "rating": 74.2, "slope": 148 },
    { "name": "Blue",  "rating": 72.1, "slope": 138 },
    { "name": "White", "rating": 70.3, "slope": 128 },
    { "name": "Red",   "rating": 68.5, "slope": 118 }
  ]
}

If you do not have reliable data for this specific course, return exactly: { "found": false }

Rules:
- "par" must be exactly 18 integers (holes 1–18 in order)
- "hcp" must be exactly 18 integers, each value 1–18 used exactly once
- "tees" must list every available set of tees from hardest to easiest with accurate USGA slope and course rating
- Only return data you are genuinely confident about — if uncertain about par/hcp or slope/rating, return { "found": false }`,
        },
      ],
    });

    const text = message.content[0].text.trim();
    const clean = text.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
    const data = JSON.parse(clean);

    if (!data.found) return res.status(200).json({ found: false });

    if (
      !data.name ||
      !Array.isArray(data.par) || data.par.length !== 18 ||
      !Array.isArray(data.hcp) || data.hcp.length !== 18 ||
      !Array.isArray(data.tees) || data.tees.length === 0
    ) {
      return res.status(200).json({ found: false });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("lookup-course error:", err?.message || err);
    res.status(500).json({ error: "Lookup failed — make sure ANTHROPIC_API_KEY is set in Vercel" });
  }
}
