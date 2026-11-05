/**
 * Gnani Speech-to-Text Client (Prisma v2.5 / v3)
 * Uses Gnani Vachana platform (POST https://api.vachana.ai/stt/v3)
 * Handles audio upload, language code selection (en-IN, hi-IN, ta-IN),
 * and returns the transcribed text.
 */

export interface TranscribeResult {
  transcript: string;
  confidence?: number;
  provider: 'gnani' | 'demo' | 'web-fallback';
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/wav',
  languageCode: string = 'en-IN',
  customApiKey?: string
): Promise<TranscribeResult> {
  const apiKey = customApiKey || process.env.GNANI_API_KEY;
  const baseUrl = process.env.GNANI_BASE_URL || 'https://api.vachana.ai';
  const sttUrl = process.env.GNANI_STT_URL || `${baseUrl}/stt/v3`;

  // If Gnani API key is configured, call Gnani Vachana STT API
  if (apiKey) {
    try {
      const formData = new FormData();
      // Gnani STT requires wav, mp3, flac, ogg, aac, or m4a
      const isWav = mimeType.includes('wav');
      const filename = isWav ? 'audio.wav' : 'audio.mp3';
      const audioType = isWav ? 'audio/wav' : mimeType;

      const blob = new Blob([new Uint8Array(audioBuffer)], { type: audioType });
      formData.append('audio_file', blob, filename);
      formData.append('language_code', languageCode || 'en-IN');
      formData.append('format', 'verbatim');

      const response = await fetch(sttUrl, {
        method: 'POST',
        headers: {
          'X-API-Key-ID': apiKey,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gnani STT responded with HTTP ${response.status}: ${errorText}`);
      }

      const data: any = await response.json();
      if (data && (data.transcript || data.text || data.result)) {
        const transcript = data.transcript || data.text || data.result || '';
        return {
          transcript: transcript.trim(),
          confidence: 0.95,
          provider: 'gnani',
        };
      }
    } catch (err) {
      console.warn('[Gnani STT Warning] API call failed, trying secondary fallback:', err);
    }
  }

  // 2. Secondary fallback: Gemini Multimodal Audio Transcription if GEMINI_API_KEY is available
  const geminiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  if (geminiKey) {
    try {
      const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const base64Audio = audioBuffer.toString('base64');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType.includes('wav') ? 'audio/wav' : mimeType || 'audio/wav',
                    data: base64Audio,
                  },
                },
                {
                  text: `Please transcribe the exact words spoken in this audio. The expected primary language is ${languageCode}. Return ONLY the verbatim transcribed text, without any additional notes or preamble.`,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        if (text) {
          return {
            transcript: text,
            confidence: 0.96,
            provider: 'web-fallback',
          };
        }
      }
    } catch (e) {
      console.warn('[Gemini STT Warning] Audio transcription failed:', e);
    }
  }

  // If both server providers are unavailable, return an empty transcript so client SpeechRecognition or user input takes precedence
  return {
    transcript: '',
    confidence: 0,
    provider: 'web-fallback',
  };
}
