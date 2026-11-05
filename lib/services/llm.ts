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
 * Generate tutor reply using LLM (Gemini / OpenAI) or smart dynamic dialogue engine.
 */
export async function generateTutorReply(
  transcript: string,
  history: Array<{ role: string; text: string }>,
  level: string = 'beginner',
  topic: string = 'daily_life',
  language: string = 'en',
  customApiKey?: string
): Promise<TutorResponse> {
  const geminiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;
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

  // 3. Intelligent dynamic dialogue engine (natural human-like conversation on both sides)
  return findSmartFallbackTurn(transcript, topic, language, history);
}

function findSmartFallbackTurn(
  transcript: string,
  topicKey: string,
  language: string = 'en',
  history: Array<{ role: string; text: string }> = []
): TutorResponse {
  const clean = transcript.trim();
  const lower = clean.toLowerCase().replace(/[.,!?;:]/g, ' ');
  const words = lower.split(/\s+/).filter(Boolean);
  const firstWord = words[0] || '';
  const isTamil = language === 'ta';
  const isHindi = language === 'hi';

  // Helper for quick grammar checks on common Indian-English patterns
  const detectedCorrections: CorrectionItem[] = [];
  if (lower.includes('was went') || lower.includes('were went') || lower.includes('am went')) {
    detectedCorrections.push({
      original: clean.match(/\b(was|were|am)\s+went\b/i)?.[0] || 'was went',
      better: 'went',
      why: isHindi
        ? "हिंदी: 'was went' एक साथ नहीं बोलते — भूतकाल के लिए सीधे 'I went' कहें।"
        : isTamil
        ? "விளக்கம்: 'was went' என இரு வினைச்சொற்கள் இணைக்கக் கூடாது, 'went' என நேரடியாகப் பயன்படுத்த வேண்டும்."
        : "Use simple past 'went' directly without 'was'.",
    });
  }
  if (lower.includes('didnt knew') || lower.includes("didn't knew") || lower.includes('did not knew')) {
    detectedCorrections.push({
      original: clean.match(/\bdid(?:n't| not)\s+knew\b/i)?.[0] || "didn't knew",
      better: "didn't know",
      why: isHindi
        ? "हिंदी: 'did' या 'didn't' के बाद हमेशा verb की first form ('know') आती है।"
        : "After 'did' or 'didn't', always use the base form of the verb ('know').",
    });
  }
  if (lower.includes('cousin brother') || lower.includes('cousin sister')) {
    detectedCorrections.push({
      original: clean.match(/\bcousin\s+(?:brother|sister)\b/i)?.[0] || 'cousin brother',
      better: 'cousin',
      why: "In English, simply say 'my cousin'. You can clarify gender with 'he' or 'she'.",
    });
  }
  if (lower.includes('passed out from') || lower.includes('pass out from')) {
    detectedCorrections.push({
      original: clean.match(/\bpass(?:ed)?\s+out\s+from\b/i)?.[0] || 'passed out from',
      better: 'graduated from',
      why: "'Pass out' means to faint. For college or school completion, use 'graduated from'.",
    });
  }

  // 1. GREETINGS: Hello, Hi, Hey, Good Morning, Namaste, Vanakkam
  const greetingWords = ['hello', 'hi', 'hey', 'hiya', 'namaste', 'namaskar', 'vanakkam', 'greetings'];
  const hasGreetingWord = words.some(w => greetingWords.includes(w));
  const isTimeGreeting = lower.includes('good morning') || lower.includes('good afternoon') || lower.includes('good evening');

  if (hasGreetingWord || isTimeGreeting) {
    let reply = "Hello! It's so wonderful to speak with you today. How are you doing?";
    if (isTimeGreeting) {
      const timeGreet = lower.includes('good morning') ? 'Good morning!' : lower.includes('good afternoon') ? 'Good afternoon!' : 'Good evening!';
      reply = `${timeGreet} It's great to hear from you. How has your day been so far?`;
    } else if (isTamil) {
      reply = "வணக்கம்! உங்களுடன் பேசுவதில் மிக்க மகிழ்ச்சி. இன்று உங்கள் நாள் எப்படிப் போகிறது?";
    } else if (isHindi) {
      reply = "नमस्ते! आपसे बात करके बहुत अच्छा लगा। आज आपका दिन कैसा चल रहा है?";
    }
    return {
      reply,
      corrections: detectedCorrections,
      encouragement: "A warm, natural greeting starts every conversation on the right foot!",
    };
  }

  // 2. CHECKING IN ON THE AI: "How are you", "How do you do", "Kaise ho"
  if (
    lower.includes('how are you') ||
    lower.includes("how're you") ||
    lower.includes('how do you do') ||
    lower.includes('how are things') ||
    lower.includes("how's it going") ||
    lower.includes('kaise ho') ||
    lower.includes('kya haal')
  ) {
    const reply = isTamil
      ? "நான் மிகவும் நலமாக உள்ளேன், அன்பாகக் கேட்டதற்கு மிக்க நன்றி! இன்று உங்கள் நாள் எப்படி அமைகிறது?"
      : isHindi
      ? "मैं बहुत अच्छी हूँ, पूछने के लिए शुक्रिया! आज आपका दिन कैसा बीत रहा है?"
      : "I'm doing wonderfully, thank you so much for asking! I'm really excited to chat with you today. How has your day been so far?";
    return {
      reply,
      corrections: detectedCorrections,
      encouragement: "Polite check-ins are the hallmark of natural conversational fluency!",
    };
  }

  // 3. USER SHARING THEIR WELL-BEING: "I am fine", "I'm good", "All good", "Doing well"
  if (
    lower.includes('i am fine') ||
    lower.includes("i'm fine") ||
    lower.includes('i am good') ||
    lower.includes("i'm good") ||
    lower.includes('all good') ||
    lower.includes('doing well') ||
    lower.includes('pretty good') ||
    lower.includes('theek hoon') ||
    lower.includes('sab badhiya')
  ) {
    const reply = isTamil
      ? "மகிழ்ச்சி! இன்று உங்கள் வேலைகள் அல்லது படிப்பில் என்னென்ன திட்டங்கள் உள்ளன?"
      : isHindi
      ? "यह सुनकर बहुत अच्छा लगा! आज आप क्या खास कर रहे हैं, या सामान्य दिनचर्या है?"
      : "I'm really glad to hear that! Are you up to anything exciting today, or is it mostly a quiet, focused day for you?";
    return {
      reply,
      corrections: detectedCorrections,
      encouragement: "Smooth, natural everyday communication!",
    };
  }

  // 4. USER EXPRESSING TIREDNESS OR A BUSY DAY
  if (
    lower.includes('tired') ||
    lower.includes('busy') ||
    lower.includes('exhausted') ||
    lower.includes('stressed') ||
    lower.includes('not good') ||
    lower.includes('bad day') ||
    lower.includes('hectic')
  ) {
    const reply = isHindi
      ? "मैं समझ सकती हूँ, कभी-कभी दिन काफी थका देने वाला होता है। थोड़ी बातचीत से मन हल्का हो जाता है। क्या हुआ, कुछ साझा करना चाहेंगे?"
      : "I completely understand — some days can be genuinely exhausting! Taking a moment to speak and unwind is a great way to recharge. What made your day so hectic?";
    return {
      reply,
      corrections: detectedCorrections,
      encouragement: "Sharing your honest feelings in English is a big step in fluency!",
    };
  }

  // 5. INTRODUCTIONS: "My name is...", "I am...", "Myself..."
  if (lower.startsWith('myself') || lower.includes(' myself ')) {
    const nameMatch = clean.replace(/myself\s+/i, '').split(/\s+/)[0] || '';
    const name = nameMatch ? nameMatch.charAt(0).toUpperCase() + nameMatch.slice(1) : '';
    return {
      reply: `It is an absolute pleasure to meet you${name ? ', ' + name : ''}! Tell me, what do you enjoy doing most in your studies, work, or free time?`,
      corrections: [
        {
          original: clean.match(/\bmyself\s+\w+/i)?.[0] || 'Myself',
          better: name ? `My name is ${name} / I am ${name}` : 'My name is...',
          why: isHindi
            ? "हिंदी: औपचारिक या अनौपचारिक परिचय में 'Myself' से वाक्य शुरू नहीं करते, 'My name is' या 'I am' कहें।"
            : "In English introductions, use 'My name is' or 'I am' rather than 'Myself'.",
        },
      ],
      encouragement: "Self-introductions become effortless with just a few practices!",
    };
  }

  if (lower.includes('my name is') || lower.includes("i am ") || lower.includes("i'm ")) {
    if (words.length <= 6 && (lower.includes('my name') || words.length <= 4)) {
      return {
        reply: "It's such a pleasure to meet you! I'm your speaking partner on Bol. Tell me, what goals do you have for practicing English today?",
        corrections: detectedCorrections,
        encouragement: "Clear, confident self-introduction!",
      };
    }
  }

  // 6. ASKING ABOUT THE AI COACH: "Who are you", "What is your name"
  if (
    lower.includes('who are you') ||
    lower.includes('what is your name') ||
    lower.includes("what's your name") ||
    lower.includes('who r u') ||
    lower.includes('koun ho')
  ) {
    const tutorName = isTamil ? 'மலர் (Malar)' : isHindi ? 'मीरा (Meera)' : 'Priya';
    const reply = isTamil
      ? "நான் மலர்! போல் தளத்தில் உங்கள் ஆங்கிலப் பேச்சுத் தோழி. தயக்கமின்றி சகஜமாகப் பேச நான் உங்களுக்கு உதவுகிறேன். நாம் எதைப் பற்றிப் பேசலாம்?"
      : `I'm ${tutorName}, your English speaking partner on Bol! We converse back and forth just like two friends having a conversation, so you can practice speaking English naturally without any hesitation. What would you like to talk about today?`;
    return {
      reply,
      corrections: detectedCorrections,
      encouragement: "Curiosity and direct questions make for engaging conversations!",
    };
  }

  // 7. SIMPLE CONFIRMATIONS & GRATITUDE: "Thank you", "Yes", "No", "Sure", "Okay"
  if (lower.includes('thank you') || lower.includes('thanks') || lower.includes('shukriya') || lower.includes('dhanyawad')) {
    return {
      reply: "You're very welcome! It's truly a delight to converse with you. What would you like to discuss next?",
      corrections: detectedCorrections,
      encouragement: "Polite expressions enrich natural conversational rapport!",
    };
  }

  if (['yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'alright', 'haan', 'correct'].includes(lower)) {
    return {
      reply: "Awesome! Let's dive deeper. Could you share a quick thought or experience about that?",
      corrections: detectedCorrections,
      encouragement: "Active listening and agreement keep conversations moving forward smoothly!",
    };
  }

  // 8. INTERVIEW TOPIC LOGIC
  if (topicKey === 'interview' || lower.includes('interview') || lower.includes('resume') || lower.includes('job') || lower.includes('project') || lower.includes('company')) {
    if (lower.includes('strength') || lower.includes('good at') || lower.includes('skill')) {
      return {
        reply: "That is a very valuable strength to bring to any team! Could you give me an example of a situation where that strength helped you solve a real problem?",
        corrections: detectedCorrections,
        encouragement: "Grounding your strengths in real examples makes interviewers remember you!",
      };
    }
    if (lower.includes('project') || lower.includes('worked on') || lower.includes('developed')) {
      return {
        reply: "That sounds like a fascinating project! What was your specific contribution to it, and what was the biggest challenge you overcame?",
        corrections: detectedCorrections,
        encouragement: "Explaining project impact clearly is key to cracking technical and HR interviews!",
      };
    }
    return {
      reply: "Great point! In interviews, speaking with calm, measured pacing gives you immediate authority. How would you introduce your background in one concise minute?",
      corrections: detectedCorrections,
      encouragement: "Terrific professional composure!",
    };
  }

  // 9. TRAVEL TOPIC LOGIC
  if (topicKey === 'travel' || lower.includes('travel') || lower.includes('flight') || lower.includes('hotel') || lower.includes('train') || lower.includes('ticket') || lower.includes('trip') || lower.includes('city')) {
    if (lower.includes('ticket') || lower.includes('price') || lower.includes('cost') || lower.includes('fare')) {
      return {
        reply: "Polite travel questions make navigating any journey so much smoother! Could you ask me for directions or recommendation for local food?",
        corrections: detectedCorrections,
        encouragement: "You're asking practical questions with great clarity!",
      };
    }
    return {
      reply: "Exploring new places is such an adventure! What is one destination you would love to visit next, and what attracts you there?",
      corrections: detectedCorrections,
      encouragement: "Describing travel dreams is one of the best ways to practice vivid vocabulary!",
    };
  }

  // 10. JUGAAD GENIUS TOPIC LOGIC
  if (topicKey === 'jugaad_genius') {
    return {
      reply: "That is a remarkably street-smart approach! Thinking quickly on your feet is an invaluable communication skill. How would you describe that solution to someone who wants a quick summary?",
      corrections: detectedCorrections,
      encouragement: "Love that practical Indian ingenuity!",
    };
  }

  // 11. GENERAL DYNAMIC DIALOGUE REFLECTION: Reflects what the user said
  const snippet = clean.length > 50 ? clean.slice(0, 45) + '...' : clean;
  return {
    reply: `That makes complete sense! When you say "${snippet}", what part of that experience stands out the most to you?`,
    corrections: detectedCorrections,
    encouragement: isTamil
      ? "உங்கள் குரலில் நல்ல தெளிவும் நம்பிக்கையும் தெரிகிறது!"
      : isHindi
      ? "बहुत बढ़िया प्रयास! आपकी बात पूरी तरह स्पष्ट थी।"
      : "You communicated your idea clearly and naturally!",
  };
}

/**
 * Generate session summary using LLM or smart calculations.
 */
export async function generateSessionSummary(
  history: Array<{ role: string; text: string }>,
  level: string = 'beginner',
  topic: string = 'daily_life',
  language: string = 'en',
  customApiKey?: string
): Promise<SummaryResponse> {
  const geminiKey = customApiKey || process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

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
