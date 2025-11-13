// api/generate.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. Use POST." });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "Missing GEMINI_API_KEY" });

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const { text, image } = req.body;
    if (!text) return res.status(400).json({ error: "Missing text prompt." });

    const promptParts = [];
    if (image) {
      promptParts.push({
        inlineData: { mimeType: "image/jpeg", data: image },
      });
    }
    promptParts.push({ text });

    // ----------------------------------------
    // 🔁 RETRY LOGIC (Fixes 503 overloaded errors)
    // ----------------------------------------
    async function generateWithRetry(fn, retries = 3) {
      for (let i = 0; i < retries; i++) {
        try {
          return await fn();
        } catch (err) {
          const msg = err?.message || "";
          const overloaded =
            msg.includes("overloaded") ||
            msg.includes("503") ||
            msg.includes("busy");

          if (overloaded && i < retries - 1) {
            // exponential backoff: 1.5s → 3s → 4.5s
            await new Promise((resolve) =>
              setTimeout(resolve, (i + 1) * 1500)
            );
            continue;
          }
          throw err;
        }
      }
    }
    // ----------------------------------------

    const result = await generateWithRetry(() =>
      model.generateContent(promptParts)
    );

    const responseText = result?.response?.text() || "";

    return res.status(200).json({ text: responseText });
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({ error: err.message || "Internal error" });
  }
}
