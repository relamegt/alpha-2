/**
 * Encode Float32Array (from Web Audio API) → Base64 PCM16 string
 * Required format for Gemini Live API audio input: audio/pcm;rate=16000
 */
export function encodeAudioToPCM16(float32Array) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, float32Array[i] * 32768));
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode Base64 PCM16 string (from Gemini Live API output) → Float32Array
 * Gemini outputs audio at 24kHz. Use this to feed into AudioContext.
 */
export function decodePCM16ToFloat32(base64String) {
  const binary = atob(base64String);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
  return float32;
}
