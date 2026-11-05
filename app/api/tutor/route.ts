import { NextRequest, NextResponse } from 'next/server';
import { generateTutorReply } from '@/lib/services/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      transcript,
      history = [],
      level = 'beginner',
      topic = 'daily_life',
      language = 'en',
      apiKey,
    } = body;
    const customApiKey = apiKey || req.headers.get('x-api-key') || undefined;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: "Missing student transcript text." } },
        { status: 400 }
      );
    }

    const tutorReply = await generateTutorReply(transcript, history, level, topic, language, customApiKey);

    return NextResponse.json(tutorReply);
  } catch (error: any) {
    console.error('Error in /api/tutor:', error);
    return NextResponse.json(
      {
        reply: "You expressed that well! Could you tell me a little more about that?",
        corrections: [],
        encouragement: "Great effort, keep speaking freely!",
      },
      { status: 200 }
    );
  }
}
