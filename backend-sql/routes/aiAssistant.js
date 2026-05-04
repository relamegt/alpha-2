const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const prisma = require('../config/db');
const { protect } = require('../middleware/auth');
const axios = require('axios'); // Added axios for Groq requests

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Build a pool of all available models
const modelsPool = [];

// Initialize Gemma models
if (process.env.GEMINI_API_KEY) {
    const gemmaModels = [
        process.env.GEMMA_MODEL1,
        process.env.GEMMA_MODEL2,
        process.env.GEMMA_MODEL3
    ].filter(Boolean);

    gemmaModels.forEach(m => {
        modelsPool.push({ provider: 'gemma', model: m });
    });
}

// Initialize Groq models
const groqKey = process.env.GROQ_API_KEY;
if (groqKey) {
    const groqModels = [
        process.env.GROQ_MODEL1,
        process.env.GROQ_MODEL2,
        process.env.GROQ_MODEL3,
        process.env.GROQ_MODEL4,
        process.env.GROQ_MODEL5,
    ].filter(Boolean);

    groqModels.forEach(m => {
        modelsPool.push({ provider: 'groq', model: m });
    });
}

// Fallback in case no models are loaded
if (modelsPool.length === 0) {
    modelsPool.push({ provider: 'gemma', model: 'gemma-4-26b-a4b-it' });
}

let currentModelIndex = 0;
const getNextModel = () => {
    const selected = modelsPool[currentModelIndex];
    currentModelIndex = (currentModelIndex + 1) % modelsPool.length;
    return selected;
};

const SYSTEM_INSTRUCTION = `You are an expert programming tutor embedded in an online judge platform. A student has written code for a problem and needs help. Analyze their code deeply and return ONLY a single valid JSON object — no markdown, no code fences, no explanation outside the JSON.

The JSON must follow this exact schema:
{
  "codeSummary": {
    "problemExpects": string,
    "whatUserWrote": string,
    "howItDiffers": string,
    "whatIsMissed": string,
    "verdict": "correct" | "partially_correct" | "incorrect"
  },
  "bugs": [
    {
      "line": number or null,
      "severity": "error" | "warning" | "edge-case",
      "diagnosis": string,
      "fix": string
    }
  ],
  "optimizations": [string, string],
  "fullSolution": {
    "code": string,
    "explanation": string,
    "timeComplexity": string,
    "spaceComplexity": string,
    "keyTakeaways": [string, string]
  }
}

Rules:
- codeSummary.problemExpects: 1-2 clear sentences — what the problem/task actually requires as output or behavior.
- codeSummary.whatUserWrote: 1-2 sentences — what the student's code actually does when run (not what it should do).
- codeSummary.howItDiffers: 1 sentence — the key gap between what the problem expects vs. what the code produces.
- codeSummary.whatIsMissed: 1-2 sentences — specific logic, edge cases, or conditions the student forgot or got wrong.
- codeSummary.verdict: "correct" if logic is right, "partially_correct" if works for some cases, "incorrect" if clearly fails.
- bugs: every logical error, runtime error, wrong condition, missed edge case. diagnosis = what is wrong. fix = how to fix. Empty array [] if no bugs.
- optimizations: exactly 2 time or space improvements.
- fullSolution: correct, clean, optimized solution with explanation, real complexities, 2 key takeaways.
- For SQL problems: timeComplexity and spaceComplexity can be "N/A" or query complexity notes.
- For web dev problems: timeComplexity and spaceComplexity can be "N/A".
- Return ONLY valid JSON. No text outside the JSON object.`;

const getNextMonthFirstDay = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1);
};

const extractText = (response) => {
    const parts = response?.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) return null;
    const responseParts = parts.filter(p => !p.thought);
    if (responseParts.length === 0) return null;
    return responseParts.map(p => p.text).join('').trim() || null;
};

router.get('/credits', protect, async (req, res) => {
    try {
        const userId = req.user.userId;
        let aiCredits = await prisma.aiCredits.findUnique({ where: { userId } });
        if (!aiCredits) {
            aiCredits = await prisma.aiCredits.create({
                data: { userId, credits: 30, resetAt: getNextMonthFirstDay() }
            });
        }
        if (process.env.NODE_ENV === 'development') {
            res.json({ success: true, credits: 'Unlimited', resetAt: aiCredits.resetAt });
        } else {
            res.json({ success: true, credits: aiCredits.credits, resetAt: aiCredits.resetAt });
        }
    } catch (error) {
        console.error('[AI] Error fetching credits:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch AI credits' });
    }
});

router.post('/ask', protect, async (req, res) => {
    const { problemTitle, problemDescription, language, code, userQuestion } = req.body;
    const userId = req.user.userId;

    if (!code || !userQuestion) {
        return res.status(400).json({ success: false, message: 'Code and question are required' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            let credits = await tx.aiCredits.findUnique({ where: { userId } });
            if (!credits) {
                credits = await tx.aiCredits.create({
                    data: { userId, credits: 30, resetAt: getNextMonthFirstDay() }
                });
            }
            if (process.env.NODE_ENV !== 'development' && credits.credits <= 0) {
                return { error: 'Monthly AI credits exhausted.', resetAt: credits.resetAt };
            }
            let updatedCredits;
            if (process.env.NODE_ENV === 'development') {
                updatedCredits = { credits: 'Unlimited' };
            } else {
                updatedCredits = await tx.aiCredits.update({
                    where: { userId },
                    data: { credits: { decrement: 1 } }
                });
            }
            return { updatedCredits };
        });

        if (result.error) {
            return res.status(403).json({ success: false, message: result.error, resetAt: result.resetAt });
        }

        try {
            const prompt = `Problem: ${problemTitle}\nDescription: ${problemDescription}\nLanguage: ${language}\n\nStudent's Code:\n\`\`\`${language}\n${code}\n\`\`\`\n\nStudent's Question: ${userQuestion}`;

            const selectedInfo = getNextModel();
            let text = null;

            console.log(`[AI] Routing request to ${selectedInfo.provider} model: ${selectedInfo.model}`);

            if (selectedInfo.provider === 'gemma') {
                const gemmaResult = await ai.models.generateContent({
                    model: selectedInfo.model,
                    contents: prompt,
                    config: {
                        systemInstruction: SYSTEM_INSTRUCTION,
                        maxOutputTokens: 8192,
                        temperature: 0.3,
                    }
                });
                text = extractText(gemmaResult);
            } else if (selectedInfo.provider === 'groq') {
                const apiKey = process.env.GROQ_API_KEY;
                const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: selectedInfo.model,
                    messages: [
                        { role: 'system', content: SYSTEM_INSTRUCTION },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.3,
                    max_completion_tokens: 500,
                    response_format: { type: 'json_object' }
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                text = response.data.choices?.[0]?.message?.content;
            }

            if (!text) {
                console.error(`[AI] Empty response from ${selectedInfo.provider}.`);
                throw new Error(`${selectedInfo.provider} returned an empty response`);
            }

            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const cleanJson = jsonMatch ? jsonMatch[0] : text;

            let parsedData;
            try {
                parsedData = JSON.parse(cleanJson);
            } catch (parseErr) {
                console.error('[AI] JSON Parse Error:', text.slice(0, 500));
                throw new Error(`${selectedInfo.provider} returned invalid JSON`);
            }

            return res.json({
                success: true,
                data: parsedData,
                creditsRemaining: result.updatedCredits.credits
            });

        } catch (modelErr) {
            console.error('[AI] Model Provider Error:', modelErr.response ? modelErr.response.data : modelErr.message);
            if (process.env.NODE_ENV !== 'development') {
                await prisma.aiCredits.update({
                    where: { userId },
                    data: { credits: { increment: 1 } }
                });
            }
            return res.status(500).json({
                success: false,
                message: 'AI analysis failed. Please try again. Your credit has been restored.'
            });
        }

    } catch (error) {
        console.error('[AI] General Error:', error);
        res.status(500).json({ success: false, message: 'An unexpected error occurred' });
    }
});

module.exports = router;