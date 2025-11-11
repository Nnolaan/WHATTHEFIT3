// This is the entire content for: api/generate.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // Standard headers for Vercel
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
            // This is a server-side error, but we send a JSON response
            return res.status(500).json({ error: 'API key is not configured on the server.' });
        }
        
        const genAI = new GoogleGenerativeAI(key);
        // Use the 'gemini-1.5-flash-latest' model which is excellent for both text and vision
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const { text, image } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text prompt is missing.' });
        }

        // --- THIS IS THE CRUCIAL FIX ---
        // We will build an array of prompt parts and pass it directly.
        const promptParts = [];

        if (image) {
            promptParts.push({ inlineData: { mimeType: 'image/jpeg', data: image } });
        }
        
        promptParts.push({ text: text }); // Always add the text part
        
        // Pass the array of parts directly to generateContent
        const result = await model.generateContent(promptParts);
        const response = result.response;
        const responseText = response.text();

        return res.status(200).json({ text: responseText });

    } catch (err) {
        // Log the actual error to the server console for debugging
        console.error("Server Error in /api/generate:", err);
        
        // Send a structured JSON error to the client
        return res.status(500).json({ error: err.message || 'An internal server error occurred.' });
    }
}
