import { NextResponse } from 'next/server';

export async function GET() {
  const gnaniConfigured = Boolean(process.env.GNANI_API_KEY);
  const llmConfigured = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.LLM_API_KEY);

  return NextResponse.json({
    ok: true,
    service: 'Bol English Voice Coach',
    version: '1.0.0',
    gnaniConfigured,
    gnaniVoice: process.env.GNANI_TTS_VOICE || 'Kaveri',
    gnaniModel: process.env.GNANI_TTS_MODEL || 'timbre-v2.5',
    llmConfigured,
    timestamp: new Date().toISOString(),
  });
}
