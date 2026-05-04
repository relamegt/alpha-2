import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { getInterviewGeminiApiKey, getInterviewGeminiModel } from '../lib/interviewGemini';

export function useInterviewLiveAPI({ systemInstruction, onTranscriptUpdate, onSessionEnd, voiceName = 'Puck' }) {
    const [state, setState] = useState('idle');
    const stateRef = useRef('idle');

    useEffect(() => { stateRef.current = state; }, [state]);

    const [error, setError] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [volume, setVolume] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const isMutedRef = useRef(false);

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

    const aiRef = useRef(null);
    const sessionRef = useRef(null);
    const processorRef = useRef(null);
    const audioContextRef = useRef(null);
    const streamRef = useRef(null);
    const nextPlayTimeRef = useRef(0);
    const activeSourcesRef = useRef([]);
    const sessionIdRef = useRef(0);
    const reconnectCountRef = useRef(0);
    const MAX_RECONNECTS = 2;
    const connectingRef = useRef(false);
    const reconnectTimerRef = useRef(null);
    const closedRef = useRef(false);

    const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
    const systemInstructionRef = useRef(systemInstruction);
    const voiceNameRef = useRef(voiceName);

    useEffect(() => { onTranscriptUpdateRef.current = onTranscriptUpdate; }, [onTranscriptUpdate]);
    useEffect(() => { systemInstructionRef.current = systemInstruction; }, [systemInstruction]);
    useEffect(() => { voiceNameRef.current = voiceName; }, [voiceName]);

    const disconnect = useCallback(() => {
        closedRef.current = true;
        stateRef.current = 'idle';
        connectingRef.current = false;
        sessionIdRef.current++;

        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }

        const session = sessionRef.current;
        sessionRef.current = null;
        try { session?.close?.(); } catch { /* ignore */ }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }

        activeSourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* ignore */ } });
        activeSourcesRef.current = [];

        if (processorRef.current) {
            processorRef.current.onaudioprocess = null;
            try { processorRef.current.disconnect(); } catch { /* ignore */ }
            processorRef.current = null;
        }

        if (audioContextRef.current) {
            try { audioContextRef.current.close?.(); } catch { /* ignore */ }
            audioContextRef.current = null;
        }

        setState('idle');
        setIsSpeaking(false);
        setVolume(0);
    }, []);

    const connectRef = useRef(null);

    const handleError = useCallback((msg) => {
        if (closedRef.current) return;
        if (reconnectCountRef.current < MAX_RECONNECTS) {
            reconnectCountRef.current += 1;
            setState('reconnecting');
            setError(`${msg} (Attempt ${reconnectCountRef.current}/${MAX_RECONNECTS})`);
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), 2000);
        } else {
            setState('fallback');
            setError('Voice connection failed. Switching to text mode.');
        }
    }, []);

    const connect = useCallback(async () => {
        if (stateRef.current === 'connected' || stateRef.current === 'connecting' || connectingRef.current) return;

        const apiKey = getInterviewGeminiApiKey();
        if (!apiKey) {
            setState('error');
            setError('Add VITE_GEMINI_API_KEY to your frontend environment for voice interviews.');
            return;
        }

        connectingRef.current = true;
        closedRef.current = false;
        const currentSessionId = ++sessionIdRef.current;
        setState('connecting');
        setError(null);

        try {
            if (!aiRef.current) {
                aiRef.current = new GoogleGenAI({
                    apiKey,
                    apiVersion: 'v1alpha',
                });
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 24000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                },
            });

            if (!connectingRef.current || closedRef.current || sessionIdRef.current !== currentSessionId) {
                stream.getTracks().forEach((t) => t.stop());
                return;
            }

            streamRef.current = stream;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
            if (audioContext.state === 'suspended') await audioContext.resume();
            audioContextRef.current = audioContext;

            const sessionPromise = aiRef.current.live.connect({
                model: getInterviewGeminiModel(),
                callbacks: {
                    onopen: () => {
                        if (closedRef.current || sessionIdRef.current !== currentSessionId) {
                            sessionRef.current?.close?.();
                            return;
                        }
                        connectingRef.current = false;
                        reconnectCountRef.current = 0;
                        console.log('[Gemini Live] onopen callback fired');

                        const source = audioContext.createMediaStreamSource(stream);
                        const processor = audioContext.createScriptProcessor(4096, 1, 1);
                        processorRef.current = processor;

                        processor.onaudioprocess = (e) => {
                            if (
                                isMutedRef.current ||
                                stateRef.current !== 'connected' ||
                                closedRef.current ||
                                sessionIdRef.current !== currentSessionId
                            ) {
                                if (stateRef.current !== 'connected') setVolume(0);
                                return;
                            }

                            const inputData = e.inputBuffer.getChannelData(0);
                            let sum = 0;
                            for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
                            setVolume(Math.sqrt(sum / inputData.length));

                            const pcmData = new Int16Array(inputData.length);
                            for (let i = 0; i < inputData.length; i++) {
                                pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                            }

                            if (sessionRef.current && stateRef.current === 'connected') {
                                try {
                                    const base64Data = btoa(
                                        String.fromCharCode(...new Uint8Array(pcmData.buffer))
                                    );
                                    sessionRef.current.sendRealtimeInput({
                                        audio: { data: base64Data, mimeType: 'audio/pcm;rate=24000' },
                                    });
                                } catch (err) {
                                    console.error('[Gemini Live] Audio transmission failed:', err);
                                }
                            }
                        };

                        source.connect(processor);
                        const silentGain = audioContext.createGain();
                        silentGain.gain.value = 0;
                        processor.connect(silentGain);
                        silentGain.connect(audioContext.destination);
                        console.log('[Gemini Live] Audio capture started');
                    },

                    onmessage: async (message) => {
                        const serverContent = message.serverContent;
                        if (!serverContent) return;

                        // ── Interviewer text (modelTurn parts) ──────────────────
                        if (serverContent.modelTurn?.parts) {
                            const text = serverContent.modelTurn.parts
                                .filter((p) => p.text)
                                .map((p) => p.text)
                                .join('');
                            if (text) {
                                onTranscriptUpdateRef.current?.({
                                    speaker: 'interviewer',
                                    text,
                                    timestamp_start: new Date().toISOString(),
                                    timestamp_end: new Date().toISOString(),
                                });
                            }
                        }

                        // ── AI audio → text transcription ───────────────────────
                        // We use this to populate the aiBuffer for real-time feedback
                        if (serverContent.outputTranscription?.text || serverContent.outputAudioTranscription?.text) {
                            const text = serverContent.outputTranscription?.text || serverContent.outputAudioTranscription?.text;
                            onTranscriptUpdateRef.current?.({
                                speaker: 'interviewer',
                                text,
                                timestamp_start: new Date().toISOString(),
                                timestamp_end: new Date().toISOString(),
                                is_partial: true 
                            });
                        }

                        // ── User speech → text transcription ────────────────────
                        if (serverContent.inputTranscription?.transcript || serverContent.inputAudioTranscription?.transcript) {
                            onTranscriptUpdateRef.current?.({
                                speaker: 'user',
                                text: serverContent.inputTranscription?.transcript || serverContent.inputAudioTranscription?.transcript,
                                timestamp_start: new Date().toISOString(),
                                timestamp_end: new Date().toISOString(),
                            });
                        }

                        // ── Audio playback ───────────────────────────────────────
                        const parts = serverContent.modelTurn?.parts || [];
                        const audioParts = parts.filter((p) => p.inlineData);

                        for (const part of audioParts) {
                            const base64Audio = part.inlineData?.data;
                            if (base64Audio && audioContextRef.current) {
                                const binary = atob(base64Audio);
                                const bytes = new Uint8Array(binary.length);
                                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                                const pcmData = new Int16Array(bytes.buffer);

                                const buffer = audioContextRef.current.createBuffer(1, pcmData.length, 24000);
                                const floatData = buffer.getChannelData(0);
                                for (let i = 0; i < pcmData.length; i++) floatData[i] = pcmData[i] / 32768;

                                const src = audioContextRef.current.createBufferSource();
                                src.buffer = buffer;
                                src.connect(audioContextRef.current.destination);

                                const currentTime = audioContextRef.current.currentTime;
                                const startTime = Math.max(currentTime, nextPlayTimeRef.current);
                                src.start(startTime);
                                nextPlayTimeRef.current = startTime + buffer.duration / src.playbackRate.value;

                                activeSourcesRef.current.push(src);
                                setIsSpeaking(true);

                                src.onended = () => {
                                    activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== src);
                                    if (activeSourcesRef.current.length === 0) setIsSpeaking(false);
                                };
                            }
                        }

                        // ── Barge-in / interruption ─────────────────────────────
                        if (serverContent.interrupted) {
                            activeSourcesRef.current.forEach((s) => { try { s.stop(); } catch { /* ignore */ } });
                            activeSourcesRef.current = [];
                            nextPlayTimeRef.current = 0;
                            setIsSpeaking(false);
                        }
                    },

                    onerror: (err) => {
                        console.error('[Gemini Live] Session Error:', err);
                        handleError('Connection error. Attempting to reconnect...');
                    },

                    onclose: (ev) => {
                        console.log('[Gemini Live] Session Closed:', ev);
                        const wasConnected = stateRef.current === 'connected';
                        if (!closedRef.current) {
                            closedRef.current = true;
                            stateRef.current = 'idle';
                            if (wasConnected) handleError('Connection closed unexpectedly.');
                        }
                    },
                },

                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceNameRef.current } },
                    },
                    systemInstruction: systemInstructionRef.current,
                    outputAudioTranscription: {},
                    inputAudioTranscription: {},
                },
            });

            const session = await sessionPromise;
            if (!closedRef.current && sessionIdRef.current === currentSessionId) {
                sessionRef.current = session;
                console.log('[Gemini Live] Session resolved and ready');
                setState('connected');
                stateRef.current = 'connected';
            } else {
                try { session?.close?.(); } catch { /* ignore */ }
            }

        } catch (err) {
            console.error('[Gemini Live] Connection failed:', err);
            connectingRef.current = false;
            if (!closedRef.current) {
                setState('error');
                setError(err.message || 'Failed to connect to microphone');
            }
        }
    }, [handleError]);

    connectRef.current = connect;

    useEffect(() => {
        return () => disconnect();
    }, [disconnect]);

    const sendMessage = useCallback((text) => {
        console.log('[Gemini Live] sendMessage called:', text);
        if (!sessionRef.current || stateRef.current !== 'connected' || closedRef.current) {
            console.warn('[Gemini Live] sendMessage dropped: session not ready or closed');
            return;
        }
        try {
            sessionRef.current.sendRealtimeInput({ text });
        } catch (err) {
            console.error('[Gemini Live] sendMessage failed:', err);
            return;
        }
        onTranscriptUpdateRef.current?.({
            speaker: 'user',
            text,
            timestamp_start: new Date().toISOString(),
            timestamp_end: new Date().toISOString(),
        });
    }, []);

    return {
        state,
        error,
        isSpeaking,
        volume,
        isMuted,
        setIsMuted,
        connect,
        disconnect,
        sendMessage,
        forceFallback: useCallback(() => setState('fallback'), []),
    };
}