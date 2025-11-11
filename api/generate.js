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
        // Use a single, modern model that handles both text and vision
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const { text, image } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text prompt is missing.' });
        }

        // Build the prompt parts dynamically
        const promptParts = [];

        if (image) {
            promptParts.push({ inlineData: { mimeType: 'image/jpeg', data: image } });
        }
        
        promptParts.push({ text: text });
        
        // --- THIS IS THE CRUCIAL FIX ---
        // The generateContent call now includes `role: "user"`
        const result = await model.generateContent({
            contents: [{ role: "user", parts: promptParts }]
        });
        
        const responseText = result.response.text();

        return res.status(200).json({ text: responseText });

    } catch (err) {
        console.error("Server Error:", err);
        return res.status(500).json({ error: err.message || 'An internal server error occurred.' });
    }
}
