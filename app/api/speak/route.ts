import { NextRequest, NextResponse } from 'next/server';
import { synthesizeSpeech } from '@/lib/services/gnaniTts';
import { getLanguageConfig } from '@/lib/config/languages';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      language = 'en',
      voice,
      lang,
      apiKey: bodyApiKey,
    } = body;

    const customApiKey = req.headers.get('x-api-key') || bodyApiKey;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: "Text string is required for speech synthesis." } },
        { status: 400 }
      );
    }

    const targetLang = language || lang || 'en';
    const langConfig = getLanguageConfig(targetLang);
    const ttsCode = langConfig.ttsCode || 'en-IN';
    const ttsVoice = voice || langConfig.ttsVoice || 'Kaveri';

    const result = await synthesizeSpeech(text, ttsVoice, ttsCode, customApiKey);

    // If binary audio was returned from Gnani
    if (result.audioBase64) {
      const buffer = Buffer.from(result.audioBase64, 'base64');
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': result.contentType,
          'Content-Length': buffer.length.toString(),
          'X-Provider': result.provider,
        },
      });
    }

    // Otherwise notify browser to use Web Speech API fallback
    return NextResponse.json({
      fallbackToBrowser: true,
      text,
      voice: ttsVoice,
      lang: ttsCode,
      language: targetLang,
      provider: result.provider,
    });
  } catch (error: any) {
    console.error('Error in /api/speak:', error);
    return NextResponse.json(
      { error: { code: 'TTS_FAILED', message: "Speech synthesis failed." } },
      { status: 500 }
    );
  }
}
