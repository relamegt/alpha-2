require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
    console.log('API Key set:', !!process.env.GEMINI_API_KEY);

    const result = await ai.models.generateContent({
        model: 'gemma-4-26b-a4b-it',
        contents: 'Return this exact JSON only, no extra text: {"status": "ok", "value": 42}',
        config: {
            maxOutputTokens: 8192,
            temperature: 0.3,
        }
    });

    console.log('--- Keys:', Object.keys(result));
    console.log('--- text type:', typeof result.text);
    console.log('--- text value:', result.text);
    console.log('--- candidate finish reason:', result?.candidates?.[0]?.finishReason);
    console.log('--- raw candidate:', JSON.stringify(result?.candidates?.[0], null, 2));
}

test().catch(err => {
    console.error('FAILED:', err.message);
    console.error('Status:', err.status);
    console.error('Full error:', JSON.stringify(err, null, 2));
});