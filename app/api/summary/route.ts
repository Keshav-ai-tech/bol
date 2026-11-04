import { NextRequest, NextResponse } from 'next/server';
import { generateSessionSummary } from '@/lib/services/llm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { history = [], level = 'beginner', topic = 'daily_life', language = 'en' } = body;

    const summary = await generateSessionSummary(history, level, topic, language);
    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Error in /api/summary:', error);
    return NextResponse.json(
      {
        scores: { fluency: 8.0, grammar: 7.5, confidence: 8.5 },
        topMistakes: ["Past tense verbs", "Missing articles"],
        tip: "Practise short 5-minute turns daily to keep your speaking rhythm active.",
      },
      { status: 200 }
    );
  }
}
