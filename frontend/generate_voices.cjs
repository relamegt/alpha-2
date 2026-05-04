const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const apiKey = process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
    console.error('Missing VITE_GEMINI_API_KEY in frontend/.env');
    process.exit(1);
}

const genAI = new GoogleGenAI(apiKey);

const voices = ['Puck', 'Charon', 'Fenrir', 'Kore', 'Zephyr'];

function createWavHeader(dataSize, sampleRate = 24000) {
    const header = Buffer.alloc(44);
    
    // RIFF identifier
    header.write('RIFF', 0);
    // File length
    header.writeUInt32LE(36 + dataSize, 4);
    // RIFF type
    header.write('WAVE', 8);

    // format chunk identifier
    header.write('fmt ', 12);
    // format chunk length
    header.writeUInt32LE(16, 16);
    // sample format (PCM)
    header.writeUInt16LE(1, 20);
    // channel count (Mono)
    header.writeUInt16LE(1, 22);
    // sample rate
    header.writeUInt32LE(sampleRate, 24);
    // byte rate (sample rate * block align)
    header.writeUInt32LE(sampleRate * 2, 28);
    // block align (channel count * bytes per sample)
    header.writeUInt16LE(2, 32);
    // bits per sample
    header.writeUInt16LE(16, 34);

    // data chunk identifier
    header.write('data', 36);
    // data chunk length
    header.writeUInt32LE(dataSize, 40);

    return header;
}

async function generateVoice(voiceName) {
    console.log(`Generating preview for ${voiceName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using a stable model for TTS
        
        // Actually, for TTS we should use the specific API if possible, 
        // but since the user wants a static file, I'll use the same modality as the app.
        const response = await model.generateContent({
            contents: [{ parts: [{ text: `Hello! I am ${voiceName}, your AI interviewer. I am ready to start when you are.` }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName },
                    },
                },
            },
        });

        const part = response.response.candidates[0].content.parts.find(p => p.inlineData);
        if (part && part.inlineData) {
            const base64Audio = part.inlineData.data;
            const audioBuffer = Buffer.from(base64Audio, 'base64');
            const dataSize = audioBuffer.length;
            const header = createWavHeader(dataSize, 24000);
            
            const fullWav = Buffer.concat([header, audioBuffer]);
            const filePath = path.join(__dirname, 'public', 'voices', `${voiceName}.wav`);
            fs.writeFileSync(filePath, fullWav);
            console.log(`Saved ${voiceName}.wav to ${filePath}`);
        } else {
            console.error(`No audio data returned for ${voiceName}`);
        }
    } catch (error) {
        console.error(`Failed to generate ${voiceName}:`, error);
    }
}

async function main() {
    for (const voice of voices) {
        await generateVoice(voice);
    }
    console.log('All voice previews generated!');
}

main();
