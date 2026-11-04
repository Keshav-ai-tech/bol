import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/services/gnaniStt';
import { getLanguageConfig } from '@/lib/config/languages';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let audioBuffer: Buffer;
    let mimeType = 'audio/wav';
    let language = 'en';
    let customApiKey: string | undefined = req.headers.get('x-api-key') || undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('audio') as File | null;
      if (!file) {
        return NextResponse.json(
          { error: { code: 'EMPTY_AUDIO', message: "No audio file provided in request." } },
          { status: 400 }
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
      mimeType = file.type || 'audio/wav';

      const customLang = (formData.get('language') as string | null) || (formData.get('lang') as string | null);
      if (customLang) language = customLang;

      const formApiKey = formData.get('apiKey') as string | null;
      if (formApiKey) customApiKey = formApiKey;
    } else {
      // JSON payload containing base64 audio
      const body = await req.json();
      if (!body.audio) {
        return NextResponse.json(
          { error: { code: 'EMPTY_AUDIO', message: "Empty audio buffer received." } },
          { status: 400 }
        );
      }
      audioBuffer = Buffer.from(body.audio, 'base64');
      if (body.mimeType) mimeType = body.mimeType;
      if (body.language || body.lang) language = body.language || body.lang;
      if (body.apiKey) customApiKey = body.apiKey;
    }

    if (audioBuffer.length < 300) {
      return NextResponse.json(
        { error: { code: 'EMPTY_AUDIO', message: "Couldn't hear you clearly, please speak again." } },
        { status: 400 }
      );
    }

    const langConfig = getLanguageConfig(language);
    const sttCode = langConfig.sttCode || 'en-IN';

    const result = await transcribeAudio(audioBuffer, mimeType, sttCode, customApiKey);
    return NextResponse.json({
      transcript: result.transcript,
      confidence: result.confidence,
      provider: result.provider,
      language,
      sttCode,
    });
  } catch (error: any) {
    console.error('Error in /api/transcribe:', error);
    return NextResponse.json(
      { error: { code: 'STT_FAILED', message: "Couldn't transcribe audio. Please try again." } },
      { status: 500 }
    );
  }
}
