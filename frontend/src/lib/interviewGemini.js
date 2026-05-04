import { GoogleGenAI, Type } from '@google/genai';

export function getInterviewGeminiApiKey() {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function getInterviewGeminiModel() {
    return import.meta.env.VITE_GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview';
}

function getClient() {
    const apiKey = getInterviewGeminiApiKey();
    if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY');
    return new GoogleGenAI({
        apiKey,
        apiVersion: 'v1alpha'
    });
}

export const INTERVIEWER_SYSTEM_PROMPTS = {
    HR: (difficulty) => `You are a SINGLE HR Interviewer. IMPORTANT: Use "I", never "we". You are the only person in this room.
    Vibe: Professional, slightly formal, but welcoming.
    Goal: Assess cultural fit, resume verification, and behavioral patterns.

    STARTING THE INTERVIEW: You MUST start the interview immediately as soon as the candidate joins.
    1. Greet them warmly.
    2. Briefly introduce your role.
    3. Ask the candidate: "Could you please walk me through your background and introduce yourself?"

    ONCE THE INTERVIEW STARTS:
    - You MUST use the provided RESUME CONTEXT and JOB DESCRIPTION to ask specific, deep questions.
    - CRITICAL: STICK RIGIDLY TO THE RESUME. Do not mention or assume skills, projects, or degree certifications that are not in the text below.
    - If the candidate mentions something not in the resume, you can acknowledge it, but do not hallucinate details about it.
    - Reference specific dates, company names, and technologies exactly as listed in their resume.
    - Contrast their answers against the requirements in the job description to identify fit vs gaps.

    Rules:
    - Difficulty: ${difficulty}.
    - If ${difficulty === 'Hard'}, be very probing. Focus on gaps in stories. Look for contradictions between their voice answers and their resume.
    - Always use follow-up questions like "What was specifically YOUR role in that?" or "Can you quantify that impact?".
    - Do not wait for the user to start. You are the host.

    WRAP UP (Triggered by [SYSTEM SIGNAL: Time is up]):
    - When you receive the time-up signal: Finish your current sentence/thought gracefully then STOP.
    - Transition: "Thank you for sharing that. Our scheduled time has come to an end. Do you have any final questions for me before we wrap up?"
    - The Final Step: After answering any final questions briefly, or if they have none, say: "It's been a pleasure speaking with you today. Please go ahead and click the 'End Interview' button to complete our session."
    - Termination: After giving the direction to click the button, TERMINATE YOUR OUTPUT. Do not reply to any further candidate input.
  `,
    Technical: (difficulty) => `
    ROLE: You are a SINGLE Senior Technical Lead. Use "I", never "we".
    Vibe: Highly technical, focused on logic and implementation.

    STARTING: Start immediately.
    1. Greet the candidate.
    2. Ask: "Before we dive in, could you give me a brief overview of your technical background and what you've been working on recently?"

    Rules:
    - Difficulty: ${difficulty}.
    - Focus on trade-offs and "why" behind decisions.

    WRAP UP:
    - Follow the same WRAP UP instructions as HR. Use the time-up signal as your cue to exit gracefully.
    - Termination: ONCE YOU HAVE DIRECTED THE CANDIDATE TO THE BUTTON, DO NOT SPEAK AGAIN.
  `,
    Coding: (difficulty) => `
    ROLE: You are a SINGLE Software Engineer. Use "I".
    Vibe: Collaborative but precise.

    STARTING: Start immediately. Greet them and ask for a brief intro focused on coding experience.

    WRAP UP:
    - Follow the same WRAP UP instructions as HR.
    - Termination: ONCE YOU HAVE DIRECTED THE CANDIDATE TO THE BUTTON, DO NOT SPEAK AGAIN.
  `,
    Situational: (difficulty) => `
    ROLE: You are a SINGLE Senior Hiring Manager. Use "I".
    Vibe: Strategic, looking for leadership and ownership.

    STARTING: Start immediately. Greet them and ask: "Tell me about your journey to this role."

    WRAP UP:
    - Follow the same WRAP UP instructions as HR.
    - Termination: ONCE YOU HAVE DIRECTED THE CANDIDATE TO THE BUTTON, DO NOT SPEAK AGAIN.
  `,
    Custom: (difficulty) => `
    ROLE: You are a SINGLE professional interviewer. Use "I".
    Difficulty: ${difficulty}.

    WRAP UP:
    - Follow the same WRAP UP instructions as HR.
    - Termination: ONCE YOU HAVE DIRECTED THE CANDIDATE TO THE BUTTON, DO NOT SPEAK AGAIN.
  `,
};

export const AI_VOICES = [
    { id: 'Puck', name: 'Puck', description: 'Friendly & Energetic', gender: 'male' },
    { id: 'Charon', name: 'Charon', description: 'Deep & Professional', gender: 'male' },
    { id: 'Fenrir', name: 'Fenrir', description: 'Authoritative & Calm', gender: 'male' },
    { id: 'Kore', name: 'Kore', description: 'Soft & Clear', gender: 'female' },
    // { id: 'Zephyr', name: 'Zephyr', description: 'Melodic & Warm', gender: 'female' },
];

/*
export async function streamVoicePreview(voiceName, onAudioChunk) {
    try {
        const ai = getClient();
        const response = await ai.models.generateContentStream({
            model: getInterviewGeminiModel(),
            contents: [{ parts: [{ text: `Hello! I am ${voiceName}. I am ready to start.` }] }],
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        for await (const chunk of response) {
            const part = chunk.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
            const base64Audio = part?.inlineData?.data;
            if (base64Audio) onAudioChunk(base64Audio);
        }
        return true;
    } catch (error) {
        // 503 happens during traffic spikes; keep UI usable.
        if (error?.status === 503 || String(error?.message || '').includes('"code": 503')) {
            console.warn('TTS preview model is under high demand (503). Try again shortly.');
        } else {
            console.error('Streaming preview failed:', error);
        }
        return false;
    }
}
*/

export async function generateDebrief(transcript, sessionInfo) {
    const ai = getClient();
    const prompt = `Generate a detailed and FAIR interview debrief.
    Session Info: ${JSON.stringify(sessionInfo)}
    Transcript: ${JSON.stringify(transcript)}

    SCORING GUIDELINES (BE FAIR AND REALISTIC):
    - Assessment: Analyze the quality of the candidate's responses against the difficulty level.
    - Anti-Bias: Do NOT default to low scores (e.g., 10%) just because the session was short or handled by AI.
    - Fair Range:
        * 75-95%: Strong, clear answers with specific examples and good technical/situational depth.
        * 50-75%: Solid answers, but might lack specific quantification or have minor delivery issues.
        * 30-50%: Answers were superficial or significantly lacked detail.
        * 10-20%: Reserved ONLY for total failure (silence, offensive behavior, or completely nonsensical answers).
    - If the candidate answered the best, they MUST receive high scores regardless of any AI limitations.

    CRITICAL: Follow the provided JSON schema exactly.
    In "improvements", provide a "micro_exercise" for each.
    In "moments_that_mattered", include specific timestamps and reasons.
  `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    session_summary: {
                        type: Type.OBJECT,
                        properties: {
                            session_status: { type: Type.STRING },
                            planned_duration_minutes: { type: Type.NUMBER },
                            actual_duration_minutes: { type: Type.NUMBER },
                            role_guess: { type: Type.STRING },
                            company: { type: Type.STRING },
                            interview_type: { type: Type.STRING },
                            difficulty: { type: Type.STRING },
                            topics_discussed: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        topic: { type: Type.STRING },
                                        notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                                    },
                                },
                            },
                        },
                    },
                    scores: {
                        type: Type.OBJECT,
                        properties: {
                            overall: { type: Type.NUMBER },
                            communication: { type: Type.NUMBER },
                            structure_star: { type: Type.NUMBER },
                            role_fit: { type: Type.NUMBER },
                            confidence_clarity: { type: Type.NUMBER },
                            delivery: { type: Type.NUMBER },
                            technical_depth: { type: Type.NUMBER },
                        },
                    },
                    strengths: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                evidence: {
                                    type: Type.OBJECT,
                                    properties: {
                                        timestamp_start: { type: Type.STRING },
                                        timestamp_end: { type: Type.STRING },
                                        quote: { type: Type.STRING },
                                    },
                                },
                                why_it_matters: { type: Type.STRING },
                            },
                        },
                    },
                    improvements: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                issue: { type: Type.STRING },
                                evidence: {
                                    type: Type.OBJECT,
                                    properties: {
                                        timestamp_start: { type: Type.STRING },
                                        timestamp_end: { type: Type.STRING },
                                        quote: { type: Type.STRING },
                                    },
                                },
                                better_answer_example: { type: Type.STRING },
                                micro_exercise: { type: Type.STRING },
                            },
                        },
                    },
                    delivery_metrics: {
                        type: Type.OBJECT,
                        properties: {
                            filler_word_estimate: { type: Type.NUMBER },
                            pace_wpm_estimate: { type: Type.NUMBER },
                            long_pause_estimate: { type: Type.NUMBER },
                        },
                    },
                    moments_that_mattered: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                label: { type: Type.STRING },
                                timestamp_start: { type: Type.STRING },
                                timestamp_end: { type: Type.STRING },
                                reason: { type: Type.STRING },
                            },
                        },
                    },
                    practice_plan_7_days: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                day: { type: Type.NUMBER },
                                focus: { type: Type.STRING },
                                tasks: { type: Type.ARRAY, items: { type: Type.STRING } },
                                time_minutes: { type: Type.NUMBER },
                            },
                        },
                    },
                    next_interview_checklist: { type: Type.ARRAY, items: { type: Type.STRING } },
                    notes_if_low_data: { type: Type.STRING },
                },
            },
        },
    });

    return JSON.parse(response.text || '{}');
}
