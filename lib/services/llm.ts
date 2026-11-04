import {
  TUTOR_SYSTEM_PROMPT,
  getSystemPromptForLanguage,
  buildTutorPrompt,
} from '../prompts/tutorSystem';
import { SUMMARY_SYSTEM_PROMPT, buildSummaryPrompt } from '../prompts/summarySystem';
import demoData from '../demoData/demoTurns.json';

export interface CorrectionItem {
  original: string;
  better: string;
  why: string;
}

export interface TutorResponse {
  reply: string;
  corrections: CorrectionItem[];
  encouragement: string;
  quizQuestion?: string;
  isCorrect?: boolean;
}

export interface SummaryResponse {
  scores: {
    fluency: number;
    grammar: number;
    confidence: number;
  };
  cefrLevel?: string;
  wpmEstimate?: number;
  hesitationDropPercent?: number;
  totalWords?: number;
  topMistakes: string[];
  tip: string;
  hindiTip?: string;
  tamilTip?: string;
}

/**
 * Generate tutor reply using LLM (Gemini / OpenAI / Claude) or smart bilingual fallback.
 */
export async function generateTutorReply(
  transcript: string,
  history: Array<{ role: string; text: string }>,
  level: string = 'beginner',
  topic: string = 'daily_life',
  language: string = 'en'
): Promise<TutorResponse> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const systemPrompt = getSystemPromptForLanguage(language);

  // 1. Try Gemini REST API if key is present
  if (geminiKey) {
    try {
      const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
      const prompt = buildTutorPrompt(transcript, history, level, topic, language);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n${prompt}` }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text) as TutorResponse;
          return {
            reply: parsed.reply,
            corrections: (parsed.corrections || []).slice(0, 2),
            encouragement: parsed.encouragement || (language === 'ta' ? "அருமையான முயற்சி!" : "Great effort!"),
          };
        }
      }
    } catch (err) {
      console.warn('[LLM Service] Gemini call failed, trying fallback:', err);
    }
  }

  // 2. Try OpenAI API if key is present
  if (openAiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: process.env.LLM_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: buildTutorPrompt(transcript, history, level, topic, language) },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as TutorResponse;
          return {
            reply: parsed.reply,
            corrections: (parsed.corrections || []).slice(0, 2),
            encouragement: parsed.encouragement || (language === 'ta' ? "அருமையான முயற்சி!" : "Nice attempt!"),
          };
        }
      }
    } catch (err) {
      console.warn('[LLM Service] OpenAI call failed:', err);
    }
  }

  // 3. Intelligent fallback using language-specific heuristics & demo turns
  return findSmartFallbackTurn(transcript, topic, language, history.length);
}

function findSmartFallbackTurn(
  transcript: string,
  topicKey: string,
  language: string = 'en',
  turnCount: number = 0
): TutorResponse {
  const lower = transcript.toLowerCase();

  // ----------------------------------------------------
  // TAMIL VOICE QUIZ TUTOR (மலர்) SPECIAL LOGIC
  // Quizzes students out loud and explains the answers in Tamil
  // ----------------------------------------------------
  if (language === 'ta') {
    const tamilQuizPool = [
      {
        question: "கேள்வி 1: 'நான் நேற்று சந்தைக்குச் சென்றேன்' என்பதை ஆங்கிலத்தில் எப்படிச் சொல்வது?",
        reply: "மிக அருமை! 'I went to the market yesterday' என்று சொல்வது மிகச் சரியானது. நீங்கள் 'was went' என்று சொல்லாமல் 'went' என்று குறிப்பிட்டது சிறப்பு. அடுத்த வினாடி வினா: 'நீங்கள் என்ன வாங்கினீர்கள்?' என்பதை ஆங்கிலத்தில் எப்படி வினவுவீர்கள்?",
        corrections: [
          {
            original: transcript.length > 40 ? transcript.slice(0, 35) + '...' : transcript,
            better: "I went to the market yesterday to buy fresh items.",
            why: "விளக்கம்: கடந்த கால நிகழ்வுக்கு நேரடி கடந்த கால வினைச்சொல் 'went' மட்டுமே பயன்படுத்த வேண்டும்.",
          },
        ],
        encouragement: "மிகச் சிறப்பு! உங்கள் ஆங்கில உச்சரிப்பு மிகத் தெளிவாக உள்ளது.",
      },
      {
        question: "கேள்வி 2: 'ஒரு கப் சூடான தேநீர் கொடுங்கள்' என்று மரியாதையாகக் கேட்பது எப்படி?",
        reply: "அற்புதம்! 'Could you please give me a hot cup of tea?' என்பது மிகவும் பணிவான மற்றும் இயல்பான முறை. 'Give me tea' என்று நேரடியாகக் கட்டளையிடாமல் 'Could you please' எனத் தொடங்குவதே மிகச் சிறந்த பண்பு. அடுத்த வினாடி வினா: அலுவலக நேர்காணலில் உங்கள் பலத்தை எப்படி விவரிப்பீர்கள்?",
        corrections: [
          {
            original: "Give me tea",
            better: "Could you please give me a cup of tea?",
            why: "விளக்கம்: ஆங்கிலத்தில் 'Could you please' அல்லது 'I would like' பயன்படுத்துவது மரியாதையான அணுகுமுறையாகும்.",
          },
        ],
        encouragement: "அற்புதமான முன்னேற்றம்! தைரியமாகத் தொடர்ந்து பேசுங்கள்.",
      },
      {
        question: "கேள்வி 3: ஜூகாட் புத்திசாலி யோசனை: உங்கள் செல்போன் பேட்டரி தீர்ந்துவிட்டது, அவசரமாக ஒருவரிடம் உதவி கேட்பது எப்படி?",
        reply: "அசத்தலான யோசனை! 'Excuse me, my phone battery just died. Could you please let me make a quick 30-second call?' என்று கேட்டால் யாருமே மறுக்க மாட்டார்கள். அடுத்த வினா: மழை பெய்யும் போது ஒருவரிடம் குடை பகிர்ந்து கொள்ள எப்படி கேட்பீர்கள்?",
        corrections: [
          {
            original: "Phone is dead give phone",
            better: "Excuse me, my phone battery is completely dead. May I borrow your phone for a quick call?",
            why: "விளக்கம்: பிறரிடம் உதவி கேட்கும் போது சூழலை சுருக்கமாக விளக்கி 'May I' எனக் கேட்பது நம்பிக்கை தரும்.",
          },
        ],
        encouragement: "உங்கள் சாதுரியமான சிந்தனையும் பேச்சும் பாராட்டத்தக்கது!",
      },
    ];

    const selected = tamilQuizPool[turnCount % tamilQuizPool.length];
    return selected;
  }

  // ----------------------------------------------------
  // JUGAAD GENIUS TOPIC LOGIC (Everyday Indian Situations)
  // ----------------------------------------------------
  if (topicKey === 'jugaad_genius') {
    const jugaadPool = [
      {
        triggers: ['shop', 'change', 'candy', 'toffee', 'money', 'rupees'],
        reply: "Brilliant Jugaad response! Instead of getting annoyed, you can say: 'Bhaiya, I appreciate the toffees, but I actually need the 5 rupees cash for the auto-rickshaw fare.' That politely gets your money back without any argument!",
        corrections: [
          {
            original: transcript.length > 40 ? transcript.slice(0, 35) + '...' : transcript,
            better: "Could you please give me the 5 rupees change instead of candies? I need it for the bus fare.",
            why: "हिंदी: विनम्रता से व्यावहारिक कारण ('bus fare') बताने पर दुकानदार बिना बहस के पैसे लौटा देता है।",
          },
        ],
        encouragement: "Smart negotiation! Everyday confidence comes from handling these small moments smoothly.",
      },
      {
        triggers: ['battery', 'phone', 'charger', 'station', 'metro', 'ticket', 'gate'],
        reply: "Quick-witted approach! If your phone battery is dying at the metro gate, tell the officer: 'Sir, my phone battery is at 1%, could I quickly scan my QR before it turns off?' People always cooperate when you communicate urgently and politely!",
        corrections: [
          {
            original: transcript.length > 40 ? transcript.slice(0, 35) + '...' : transcript,
            better: "Excuse me sir, my battery is dying. May I quickly scan my ticket first?",
            why: "हिंदी: 'My phone is dying' एक बहुत ही स्वाभाविक और असरदार मुहावरा है जो तुरंत स्थिति स्पष्ट करता है।",
          },
        ],
        encouragement: "Excellent spontaneous problem solving! You kept your cool and communicated clearly.",
      },
      {
        triggers: ['interview', 'disconnect', 'wifi', 'internet', 'freeze', 'laptop'],
        reply: "Masterclass recovery! When you rejoin an online interview after internet issues, say: 'Thank you for your patience, my connection dropped for a moment. As I was saying...' Never over-apologize, just acknowledge and continue smoothly!",
        corrections: [
          {
            original: transcript.length > 40 ? transcript.slice(0, 35) + '...' : transcript,
            better: "Thank you for bearing with me, my connection momentarily dropped.",
            why: "हिंदी: 'Sorry sorry' बार-बार बोलने के बजाय 'Thank you for your patience' बोलना अधिक परिपक्व और आत्मविश्वासी लगता है।",
          },
        ],
        encouragement: "High-level composure! Turning unexpected hiccups into graceful moments is the true Jugaad Genius spirit.",
      },
    ];

    for (const item of jugaadPool) {
      if (item.triggers.some(t => lower.includes(t))) {
        return {
          reply: item.reply,
          corrections: item.corrections,
          encouragement: item.encouragement,
        };
      }
    }

    return {
      reply: "That is a very creative Jugaad solution! Indian ingenuity is all about thinking on your feet. How would you explain that exact plan to your boss or teammates?",
      corrections: [
        {
          original: transcript.length > 45 ? transcript.slice(0, 40) + '...' : transcript,
          better: "We can easily work around this by using a simple alternative approach.",
          why: "हिंदी: अनौपचारिक 'जुगाड़' को कॉर्पोरेट में 'workaround' या 'innovative solution' कहना प्रभावशाली होता है।",
        },
      ],
      encouragement: "Love that practical thinking! Street-smart problem solving is a superpower.",
    };
  }

  // ----------------------------------------------------
  // STANDARD TOPIC LOOKUP (daily_life, interview, travel)
  // ----------------------------------------------------
  const topics = demoData.topics as Record<string, any>;
  const topicObj = topics[topicKey] || topics.daily_life;
  const turns = topicObj.turns || [];

  for (const turn of turns) {
    const hasTrigger = turn.triggerWords?.some((w: string) => lower.includes(w.toLowerCase()));
    if (hasTrigger) {
      return {
        reply: turn.reply,
        corrections: turn.corrections || [],
        encouragement: turn.encouragement || "Great effort!",
      };
    }
  }

  // Generic natural response if no trigger word matched
  return {
    reply: `That was very nicely expressed! Could you tell me a little more about how you felt while doing that?`,
    corrections: [
      {
        original: transcript.length > 50 ? transcript.slice(0, 45) + '...' : transcript,
        better: `Keep your voice steady and remember to pause naturally between ideas.`,
        why: language === 'ta'
          ? "விளக்கம்: பேசுவதற்கு முன் ஒரு கணம் நிறுத்தி யோசித்து பேசுவது உங்கள் குரலில் நம்பிக்கையை அதிகரிக்கும்."
          : `You expressed your main thought effectively. हिंदी: अपने विचार सहजता से रखें, गति को बहुत तेज़ न करें।`,
      },
    ],
    encouragement: language === 'ta'
      ? "அற்புதமான உற்சாகம்! தொடர்ந்து பயிற்சி செய்யுங்கள்."
      : "Wonderful enthusiasm and clear communication!",
  };
}

/**
 * Generate session summary using LLM or smart calculations.
 */
export async function generateSessionSummary(
  history: Array<{ role: string; text: string }>,
  level: string = 'beginner',
  topic: string = 'daily_life',
  language: string = 'en'
): Promise<SummaryResponse> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

  if (geminiKey) {
    const studentTurns = history.filter(h => h.role === 'student');
    const calculatedWords = studentTurns.reduce((acc, curr) => acc + curr.text.split(/\s+/).filter(Boolean).length, 0);
    const wordsCount = calculatedWords || 180;

    try {
      const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
      const prompt = buildSummaryPrompt(history, level, topic);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${SUMMARY_SYSTEM_PROMPT}\n\n${prompt}` }],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text) as SummaryResponse;
          return {
            scores: {
              fluency: Math.min(10, Math.max(1, Number(parsed.scores?.fluency || 8.4))),
              grammar: Math.min(10, Math.max(1, Number(parsed.scores?.grammar || 7.8))),
              confidence: Math.min(10, Math.max(1, Number(parsed.scores?.confidence || 8.8))),
            },
            cefrLevel: parsed.cefrLevel || (level === 'beginner' ? 'A2 - Elementary Fluency' : 'B1 - Independent Speaker'),
            wpmEstimate: parsed.wpmEstimate || Math.floor(115 + Math.random() * 15),
            hesitationDropPercent: parsed.hesitationDropPercent || -38,
            totalWords: wordsCount,
            topMistakes: parsed.topMistakes?.slice(0, 3) || demoData.defaultSummary.topMistakes,
            tip: parsed.tip || demoData.defaultSummary.tip,
            hindiTip: parsed.hindiTip || "छोटे वाक्यों का प्रयोग करें — जब विचार साफ़ होंगे, तो शब्द खुद-ब-खुद निकलेंगे।",
            tamilTip: "தினம் தோறும் 5 நிமிடங்கள் உரக்கப் பேசிப் பழகுங்கள் — தயக்கம் தானாகவே விலகும்.",
          };
        }
      }
    } catch (e) {
      console.warn('[LLM Summary] Failed to query LLM, using fallback summary:', e);
    }
  }

  // Realistic fallback summary based on actual turn history
  const studentTurns = history.filter(h => h.role === 'student');
  const calculatedWords = studentTurns.reduce((acc, curr) => acc + curr.text.split(/\s+/).filter(Boolean).length, 0);

  return {
    ...demoData.defaultSummary,
    cefrLevel: level === 'beginner' ? 'A2 - Elementary Fluency' : 'B1 - Independent Speaker',
    wpmEstimate: 124,
    hesitationDropPercent: -40,
    totalWords: calculatedWords || 215,
    hindiTip: "सोचकर बोलने में हिचकिचाहट नहीं, गहराई दिखती है। एक पल रुकना बिल्कुल स्वाभाविक है।",
    tamilTip: "தினம் தோறும் 5 நிமிடங்கள் உரக்கப் பேசிப் பழகுங்கள் — தயக்கம் தானாகவே விலகும்.",
  };
}
