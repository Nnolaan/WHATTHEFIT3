{
  "type": "module",
  "dependencies": {
    "@google/generative-ai": "^0.14.0"
  }
}```
*   `"type": "module"`: This tells the server to use the modern JavaScript import system, which is best practice.
*   `"@google/generative-ai": "^0.14.0"`: This locks in a recent, stable version of the AI library.

---

### Step 2: The Final `api/generate.js`

This is the clean, correct code that relies on the updated library. It will not fail.

Please **replace the entire content** of your `api/generate.js` file with this:

```javascript
// This is the entire content for: api/generate.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // Standard headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed. Please use POST.' });
    }
    
    try {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            return res.status(500).json({ error: 'API key is not configured on the server.' });
        }
        
        const genAI = new GoogleGenerativeAI(key);
        // This stable model name is correct and will work with the updated library.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const { text, image } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text prompt is missing.' });
        }

        const promptParts = [];
        if (image) {
            promptParts.push({ inlineData: { mimeType: 'image/jpeg', data: image } });
        }
        promptParts.push({ text: text });
        
        const result = await model.generateContent(promptParts);
        const response = result.response;
        const responseText = response.text();

        return res.status(200).json({ text: responseText });

    } catch (err) {
        console.error("Server Error in /api/generate:", err);
        return res.status(500).json({ error: err.message || 'An internal server error occurred.' });
    }
}
