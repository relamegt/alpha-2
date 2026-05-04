/**
 * Gemini Live API Client
 * Ported from the reference implementation for stable WebSocket connectivity.
 */

// Response type constants
export const MultimodalLiveResponseType = {
  TEXT: "TEXT",
  AUDIO: "AUDIO",
  SETUP_COMPLETE: "SETUP COMPLETE",
  INTERRUPTED: "INTERRUPTED",
  TURN_COMPLETE: "TURN COMPLETE",
  TOOL_CALL: "TOOL_CALL",
  ERROR: "ERROR",
  INPUT_TRANSCRIPTION: "INPUT_TRANSCRIPTION",
  OUTPUT_TRANSCRIPTION: "OUTPUT_TRANSCRIPTION",
};

/**
 * Parses ALL response types from a single server message.
 */
function parseResponseMessages(data) {
  const responses = [];
  const serverContent = data?.serverContent;
  const parts = serverContent?.modelTurn?.parts;

  try {
    if (data?.setupComplete) {
      responses.push({ type: MultimodalLiveResponseType.SETUP_COMPLETE, data: "", endOfTurn: false });
      return responses;
    }

    if (data?.toolCall) {
      responses.push({ type: MultimodalLiveResponseType.TOOL_CALL, data: data.toolCall, endOfTurn: false });
      return responses;
    }

    if (parts?.length) {
      for (const part of parts) {
        if (part.inlineData) {
          responses.push({ type: MultimodalLiveResponseType.AUDIO, data: part.inlineData.data, endOfTurn: false });
        } else if (part.text) {
          responses.push({ type: MultimodalLiveResponseType.TEXT, data: part.text, endOfTurn: false });
        }
      }
    }

    if (serverContent?.inputTranscription) {
      responses.push({
        type: MultimodalLiveResponseType.INPUT_TRANSCRIPTION,
        data: {
          text: serverContent.inputTranscription.text || "",
          finished: serverContent.inputTranscription.finished || false,
        },
        endOfTurn: false,
      });
    }

    if (serverContent?.outputTranscription) {
      responses.push({
        type: MultimodalLiveResponseType.OUTPUT_TRANSCRIPTION,
        data: {
          text: serverContent.outputTranscription.text || "",
          finished: serverContent.outputTranscription.finished || false,
        },
        endOfTurn: false,
      });
    }

    if (serverContent?.interrupted) {
      responses.push({ type: MultimodalLiveResponseType.INTERRUPTED, data: "", endOfTurn: false });
    }

    if (serverContent?.turnComplete) {
      responses.push({ type: MultimodalLiveResponseType.TURN_COMPLETE, data: "", endOfTurn: true });
    }
  } catch (err) {
    console.warn("⚠️ Error parsing response data: ", err, data);
  }

  return responses;
}

export class GeminiLiveAPI {
  constructor(token, model = 'gemini-3-flash-preview') {
    this.token = token;
    this.model = model;
    this.modelUri = model.startsWith('models/') ? model : `models/${model}`;

    this.responseModalities = ["AUDIO"];
    this.systemInstructions = "";
    this.voiceName = "Puck"; 
    this.temperature = 1.0;
    this.inputAudioTranscription = true;
    this.outputAudioTranscription = true;

    this.serviceUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${this.token}`;
    
    this.connected = false;
    this.webSocket = null;

    // Callbacks
    this.onReceiveResponse = () => {};
    this.onOpen = () => {};
    this.onClose = () => {};
    this.onError = () => {};
  }

  connect() {
    this.webSocket = new WebSocket(this.serviceUrl);

    this.webSocket.onclose = (event) => {
      this.connected = false;
      this.onClose(event);
    };

    this.webSocket.onerror = (event) => {
      this.connected = false;
      this.onError("Connection error");
    };

    this.webSocket.onopen = () => {
      this.connected = true;
      this.sendInitialSetupMessages();
      this.onOpen();
    };

    this.webSocket.onmessage = async (messageEvent) => {
      let jsonData;
      if (messageEvent.data instanceof Blob) {
        jsonData = await messageEvent.data.text();
      } else {
        jsonData = messageEvent.data;
      }

      try {
        const messageData = JSON.parse(jsonData);
        const responses = parseResponseMessages(messageData);
        for (const response of responses) {
          this.onReceiveResponse(response);
        }
      } catch (err) {
        console.error("Error parsing JSON message:", err, jsonData);
      }
    };
  }

  disconnect() {
    if (this.webSocket) {
      this.webSocket.close();
      this.connected = false;
    }
  }

  sendMessage(message) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    }
  }

  sendInitialSetupMessages() {
    const sessionSetupMessage = {
      setup: {
        model: this.modelUri,
        generationConfig: {
          responseModalities: this.responseModalalities,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.voiceName,
              },
            },
          },
        },
        systemInstruction: { parts: [{ text: this.systemInstructions }] },
      },
    };

    if (this.inputAudioTranscription) {
      sessionSetupMessage.setup.inputAudioTranscription = {};
    }
    if (this.outputAudioTranscription) {
      sessionSetupMessage.setup.outputAudioTranscription = {};
    }

    this.sendMessage(sessionSetupMessage);
  }

  sendAudioMessage(base64PCM) {
    this.sendMessage({
      realtimeInput: {
        audio: {
          mimeType: "audio/pcm;rate=24000",
          data: base64PCM
        }
      }
    });
  }
}

/**
 * Audio Streamer - Captures and streams microphone audio
 */
export class AudioStreamer {
  constructor(geminiClient) {
    this.client = geminiClient;
    this.audioContext = null;
    this.audioWorklet = null;
    this.mediaStream = null;
    this.isStreaming = false;
    this.sampleRate = 24000;
  }

  async start() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
      });

      await this.audioContext.audioWorklet.addModule("/audio-processors/capture.worklet.js");

      this.audioWorklet = new AudioWorkletNode(this.audioContext, "audio-capture-processor");

      this.audioWorklet.port.onmessage = (event) => {
        if (!this.isStreaming) return;
        if (event.data.type === "audio") {
          const pcmData = this.convertToPCM16(event.data.data);
          const base64Audio = this.arrayBufferToBase64(pcmData);
          if (this.client && this.client.connected) {
            this.client.sendAudioMessage(base64Audio);
          }
        }
      };

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      source.connect(this.audioWorklet);

      this.isStreaming = true;
      return true;
    } catch (error) {
      console.error("Failed to start audio streaming:", error);
      throw error;
    }
  }

  stop() {
    this.isStreaming = false;
    if (this.audioWorklet) {
      this.audioWorklet.disconnect();
      this.audioWorklet.port.close();
      this.audioWorklet = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  convertToPCM16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample * 0x7fff;
    }
    return int16Array.buffer;
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

/**
 * Audio Player - Plays audio responses from Gemini
 */
export class AudioPlayer {
  constructor() {
    this.audioContext = null;
    this.workletNode = null;
    this.gainNode = null;
    this.isInitialized = false;
    this.sampleRate = 24000;
  }

  async init() {
    if (this.isInitialized) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
      });

      await this.audioContext.audioWorklet.addModule("/audio-processors/playback.worklet.js");

      this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");
      this.gainNode = this.audioContext.createGain();
      
      this.workletNode.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize audio player:", error);
      throw error;
    }
  }

  async play(base64Audio) {
    if (!this.isInitialized) await this.init();
    try {
      if (this.audioContext.state === "suspended") await this.audioContext.resume();

      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const inputArray = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(inputArray.length);
      for (let i = 0; i < inputArray.length; i++) {
        float32Data[i] = inputArray[i] / 32768;
      }

      this.workletNode.port.postMessage(float32Data);
    } catch (error) {
      console.error("Error playing audio chunk:", error);
    }
  }

  interrupt() {
    if (this.workletNode) {
      this.workletNode.port.postMessage("interrupt");
    }
  }

  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
  }
}
