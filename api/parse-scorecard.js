import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { imageBase64, mediaType } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: "No image provided" });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType || "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Parse this golf scorecard image and extract the course data.

Return ONLY a valid JSON object with this exact structure — no explanation, no markdown:
{
  "name": "Course Name",
  "par": [4,4,3,4,5,4,3,4,4,4,3,4,5,3,4,4,5,4],
  "hcp": [1,3,17,9,5,13,15,7,11,2,18,8,4,16,12,6,14,10]
}

Rules:
- "par" must be an array of exactly 18 integers (holes 1–18 in order)
- "hcp" must be an array of exactly 18 integers representing stroke/handicap index (each value 1–18, used once)
- If a value is unclear, use a reasonable default (par 4 for unknown holes; for hcp use the sequence 1–18 as a fallback)
- Return only the JSON object, nothing else`,
            },
          ],
        },
      ],
    });

    const text = message.content[0].text.trim();
    const clean = text.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
    const data = JSON.parse(clean);

    if (
      !data.name ||
      !Array.isArray(data.par) || data.par.length !== 18 ||
      !Array.isArray(data.hcp) || data.hcp.length !== 18
    ) {
      return res.status(422).json({ error: "Unexpected response format from model" });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("parse-scorecard error:", err?.message || err);
    res.status(500).json({ error: "Failed to scan scorecard — make sure ANTHROPIC_API_KEY is set in Vercel" });
  }
}
