// This is the entire content for: api/generate.js
// This version uses Cloudflare AI and the correct Node.js method for handling images.

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
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        const apiToken = process.env.CLOUDFLARE_API_TOKEN;

        if (!accountId || !apiToken) {
            return res.status(500).json({ error: 'Cloudflare credentials are not configured on the server.' });
        }

        const { text, image } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'Text prompt is missing.' });
        }

        let inputs = { prompt: text };
        let model = '@cf/meta/llama-2-7b-chat-int8'; // Default text model

        if (image) {
            // If there's an image, switch to the vision model
            model = '@cf/llava-hf/llava-1.5-7b-hf';
            
            // THIS IS THE FIX: Use Node.js Buffer to handle the image data, not a browser function.
            const imageBuffer = Buffer.from(image, 'base64');
            
            inputs = {
                prompt: text,
                image: [...imageBuffer] // Spread the buffer directly into an array of bytes
            };
        }

        const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

        const response = await fetch(cloudflareUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inputs)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Cloudflare AI error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        const responseText = data.result?.response || 'No content generated.';

        return res.status(200).json({ text: responseText });

    } catch (err) {
        console.error("Server Error in /api/generate (Cloudflare):", err);
        return res.status(500).json({ error: err.message || 'An internal server error occurred.' });
    }
}
