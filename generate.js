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

        const { text, image } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text prompt is missing.' });
        }

        let model;
        let promptParts = [];

        // This is the core logic change:
        // If an image is present, use the vision model and create a multi-part prompt.
        // If not, use the standard text model.
        if (image) {
            model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            promptParts = [
                { inlineData: { mimeType: 'image/jpeg', data: image } },
                { text: text },
            ];
        } else {
            model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            promptParts = [{ text: text }];
        }
        
        const result = await model.generateContent({ contents: [{ parts: promptParts }] });
        const responseText = result.response.text();

        return res.status(200).json({ text: responseText });

    } catch (err) {
        console.error("Server Error:", err);
        return res.status(500).json({ error: err.message || 'An internal server error occurred.' });
    }
}