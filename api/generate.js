import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: "Use POST" });

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing GEMINI_API_KEY on server." });

    const genAI = new GoogleGenerativeAI(key);

    // ✅ stable, fast, never overloaded
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const { text, image } = req.body;
    if (!text) return res.status(400).json({ error: "Missing prompt text." });

    const parts = [];
    if (image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        }
      });
    }
    parts.push({ text });

    const result = await model.generateContent(parts);
    const output = result.response.text();

    return res.status(200).json({ text: output });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
