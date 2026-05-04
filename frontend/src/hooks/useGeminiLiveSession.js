// src/hooks/useGeminiLiveSession.js
import { useState, useRef, useCallback } from 'react';
import { 
  GeminiLiveAPI, 
  AudioStreamer, 
  AudioPlayer, 
  MultimodalLiveResponseType 
} from '../services/geminiLiveClient';

export function useGeminiLiveSession({ ephemeralToken, systemPrompt, onTranscriptUpdate, onSessionEnd }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);

  const clientRef = useRef(null);
  const streamerRef = useRef(null);
  const playerRef = useRef(null);

  // ── Handle incoming messages ─────────────────────────────────────────────
  const handleMessage = useCallback((message) => {
    switch (message.type) {
      case MultimodalLiveResponseType.AUDIO:
        if (playerRef.current) {
          playerRef.current.play(message.data);
          setIsSpeaking(true);
        }
        break;

      case MultimodalLiveResponseType.INPUT_TRANSCRIPTION:
        // We only update if it's finished to avoid jitter, or based on preference
        if (message.data.finished) {
          onTranscriptUpdate?.({ role: 'user', text: message.data.text });
        }
        break;

      case MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION:
        if (message.data.finished) {
          onTranscriptUpdate?.({ role: 'assistant', text: message.data.text });
        }
        break;

      case MultimodalLiveResponseType.INTERRUPTED:
        if (playerRef.current) playerRef.current.interrupt();
        setIsSpeaking(false);
        break;

      case MultimodalLiveResponseType.TURN_COMPLETE:
        setIsSpeaking(false);
        break;

      case MultimodalLiveResponseType.SETUP_COMPLETE:
        setIsConnected(true);
        setIsListening(true);
        // Start streaming audio once setup is complete
        streamerRef.current?.start().catch(err => {
            console.error('Failed to start audio streamer:', err);
            setError('Could not access microphone.');
        });
        break;

      case MultimodalLiveResponseType.ERROR:
        setError(message.data || 'An error occurred with Gemini Live.');
        break;

      default:
        break;
    }
  }, [onTranscriptUpdate]);

  // ── Start Session ────────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setError(null);

    try {
      // 1. Initialize Client
      const client = new GeminiLiveAPI(ephemeralToken);
      client.systemInstructions = systemPrompt;
      client.onReceiveResponse = handleMessage;
      client.onOpen = () => console.debug('[Gemini Live] Connection Open');
      client.onClose = () => {
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        onSessionEnd?.();
      };
      client.onError = (err) => setError(err);

      clientRef.current = client;

      // 2. Initialize Media
      streamerRef.current = new AudioStreamer(client);
      playerRef.current = new AudioPlayer();
      await playerRef.current.init();

      // 3. Connect
      client.connect();
    } catch (err) {
      console.error('[Gemini Live] Start Error:', err);
      setError('Failed to initialize session.');
    }
  }, [ephemeralToken, systemPrompt, handleMessage, onSessionEnd]);

  // ── End Session ──────────────────────────────────────────────────────────────
  const endSession = useCallback(() => {
    streamerRef.current?.stop();
    playerRef.current?.destroy();
    clientRef.current?.disconnect();

    clientRef.current = null;
    streamerRef.current = null;
    playerRef.current = null;

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
  }, []);

  return { startSession, endSession, isConnected, isListening, isSpeaking, error };
}