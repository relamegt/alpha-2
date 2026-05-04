import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const apiKeyMatch = envFile.match(/VITE_GEMINI_API_KEY=(.*)/);
let apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : null;
if (apiKey && (apiKey.startsWith('"') || apiKey.startsWith("'"))) {
    apiKey = apiKey.substring(1, apiKey.length - 1);
}

if (!apiKey) {
    console.error('Missing VITE_GEMINI_API_KEY in .env');
    process.exit(1);
}

const voices = ['Puck', 'Charon', 'Fenrir', 'Kore', 'Zephyr'];

function createWavHeader(dataSize, sampleRate = 24000) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    return header;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateVoice(voiceName) {
    const filePath = path.join(__dirname, 'public', 'voices', `${voiceName}.wav`);
    if (fs.existsSync(filePath)) {
        console.log(`${voiceName}.wav already exists, skipping.`);
        return;
    }

    console.log(`Generating preview for ${voiceName}...`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key=${apiKey}`;
    
    const body = {
        contents: [{ parts: [{ text: `Hello! I am ${voiceName}, your AI interviewer. I am ready to start when you are.` }] }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName },
                },
            },
        },
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        const part = data.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        
        if (part && part.inlineData) {
            const base64Audio = part.inlineData.data;
            const audioBuffer = Buffer.from(base64Audio, 'base64');
            const header = createWavHeader(audioBuffer.length, 24000);
            const fullWav = Buffer.concat([header, audioBuffer]);
            
            const voicesDir = path.join(__dirname, 'public', 'voices');
            if (!fs.existsSync(voicesDir)) fs.mkdirSync(voicesDir, { recursive: true });
            
            fs.writeFileSync(filePath, fullWav);
            console.log(`Successfully saved ${voiceName}.wav`);
        } else {
            console.error(`Failed to get audio for ${voiceName}:`, JSON.stringify(data));
        }
    } catch (error) {
        console.error(`Error generating ${voiceName}:`, error);
    }
}

async function main() {
    for (const voice of voices) {
        await generateVoice(voice);
        await sleep(20000); // 20s delay to stay under 3 RPM free tier safely
    }
    console.log('Done!');
}

main();
