// This is the entire content for: api/generate.js
// This version includes the critical Content-Type header to fix the "Bad Request" error.

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

        let finalResponseText = 'No content generated.';
        let model;

        if (image) {
            // --- STEP 1: Use the Vision Model (LLaVA) to describe the image ---
            const imageBuffer = Buffer.from(image, 'base64');
            const visionInputs = {
                prompt: "Describe the clothes, colors, and textures of the person's outfit in this image in factual detail.",
                image: [...imageBuffer]
            };

            model = '@cf/llava-hf/llava-1.5-7b-hf';
            const visionResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json' // THE CRITICAL FIX IS HERE
                },
                body: JSON.stringify(visionInputs)
            });

            if (!visionResponse.ok) {
                throw new Error(`Cloudflare Vision AI error: ${visionResponse.statusText}`);
            }
            const visionData = await visionResponse.json();
            const imageDescription = visionData.result?.description || 'A person wearing clothes.';
            
            // --- STEP 2: Feed the description to the Creative Text Model (Llama 2) ---
            const creativePrompt = `Based on the following description of an outfit: "${imageDescription}". ${text}`;
            const creativeInputs = { prompt: creativePrompt };
            
            model = '@cf/meta/llama-2-7b-chat-int8';
            const creativeResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json' // THE CRITICAL FIX IS HERE
                },
                body: JSON.stringify(creativeInputs)
            });
            
            if (!creativeResponse.ok) {
                throw new Error(`Cloudflare Text AI error: ${creativeResponse.statusText}`);
            }
            const creativeData = await creativeResponse.json();
            finalResponseText = creativeData.result?.response || 'Could not generate styling ideas.';

        } else {
            // --- If there's no image, just use the text model directly ---
            const textInputs = { prompt: text };
            model = '@cf/meta/llama-2-7b-chat-int8';
            const textResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json' // THE CRITICAL FIX IS HERE
                },
                body: JSON.stringify(textInputs)
            });

            if (!textResponse.ok) {
                throw new Error(`Cloudflare Text AI error: ${textResponse.statusText}`);
            }
            const textData = await textResponse.json();
            finalResponseText = textData.result?.response || 'No content generated.';
        }

        return res.status(200).json({ text: finalResponseText });

    } catch (err) {
        console.error("Server Error in /api/generate (Cloudflare):", err);
        return res.status(500).json({ error: err.message || 'An internal server error occurred.' });
    }
}
