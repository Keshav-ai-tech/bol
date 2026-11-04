/**
 * Gnani Text-to-Speech Client (Timbre v2.5 / v3.0)
 * Uses Gnani Vachana platform (https://api.vachana.ai/api/v1/tts/inference)
 * Converts Priya's coaching feedback into natural Indian English / Hinglish spoken audio.
 */

export interface SpeakResult {
  audioBase64?: string;
  audioUrl?: string;
  contentType: string;
  provider: 'gnani' | 'browser-speech' | 'demo';
}

// Supported Gnani Timbre voices: Kaveri (warm female), Shubhra, Pranav (warm male), Deepak
const VOICE_MAP: Record<string, string> = {
  'priya-warm': 'Kaveri',
  'priya': 'Kaveri',
  'kaveri': 'Kaveri',
  'shubhra': 'Shubhra',
  'pranav': 'Pranav',
  'deepak': 'Deepak',
};

export async function synthesizeSpeech(
  text: string,
  voice: string = 'Kaveri',
  lang: string = 'en-IN',
  customApiKey?: string
): Promise<SpeakResult> {
  const apiKey = customApiKey || process.env.GNANI_API_KEY;
  const baseUrl = process.env.GNANI_BASE_URL || 'https://api.vachana.ai';
  const ttsUrl = process.env.GNANI_TTS_URL || `${baseUrl}/api/v1/tts/inference`;
  const model = process.env.GNANI_TTS_MODEL || 'timbre-v2.5';

  if (apiKey) {
    try {
      const selectedVoice = VOICE_MAP[voice.toLowerCase()] || voice || 'Kaveri';

      const payload: Record<string, any> = {
        text,
        voice: selectedVoice,
        model,
        audio_config: {
          sample_rate: 16000,
          encoding: 'linear_pcm',
          num_channels: 1,
          sample_width: 2,
          container: 'wav',
        },
      };

      // Timbre-v2.5 accepts language code
      if (model === 'timbre-v2.5' && lang) {
        payload.language = lang;
      }

      const response = await fetch(ttsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key-ID': apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gnani TTS returned ${response.status}: ${errorText}`);
      }

      const contentType = response.headers.get('content-type') || 'audio/wav';
      const arrayBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(arrayBuffer).toString('base64');

      return {
        audioBase64,
        contentType,
        provider: 'gnani',
      };
    } catch (err) {
      console.warn('[Gnani TTS Warning] Synthesis failed, falling back to Web Speech:', err);
    }
  }

  // When Gnani TTS credentials are not configured or request fails, return browser-speech fallback
  return {
    contentType: 'audio/mpeg',
    provider: 'browser-speech',
  };
}
