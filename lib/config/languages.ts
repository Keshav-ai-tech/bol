/**
 * Language Configuration for Bol Speaking Coach
 * Decouples language definitions, Gnani STT/TTS codes, voices, personas, and typography.
 */

export interface LanguageConfig {
  id: string;
  label: string;
  subLabel: string;
  flag: string;
  personaName: string;
  role: string;
  tagline: string;
  sttCode: string;
  ttsCode: string;
  ttsVoice: string;
  font: string;
  isQuizMode: boolean;
  initialGreeting: string;
}

export const LANGUAGES: Record<'en' | 'hi' | 'ta', LanguageConfig> = {
  en: {
    id: 'en',
    label: "English / Hinglish",
    subLabel: "Coach Priya",
    flag: "🇬🇧",
    personaName: "Priya",
    role: "Hinglish Speaking Coach",
    tagline: "Safe, judgment-free English sanctuary with gentle Hindi guidance.",
    sttCode: process.env.GNANI_STT_CODE_EN || "en-IN",
    ttsCode: process.env.GNANI_TTS_CODE_EN || "en-IN",
    ttsVoice: process.env.GNANI_TTS_VOICE || "Kaveri",
    font: "Plus Jakarta Sans",
    isQuizMode: false,
    initialGreeting: "Hello! I am Priya. Take a deep breath — this is your safe space. Speak freely without worrying about mistakes!",
  },
  hi: {
    id: 'hi',
    label: "हिन्दी / Hinglish",
    subLabel: "कोच मीरा",
    flag: "🇮🇳",
    personaName: "मीरा (Meera)",
    role: "हिन्दी-इंग्लिश स्पोकन गाइड",
    tagline: "अपनी मातृभाषा के सहज प्रवाह के साथ धाराप्रवाह अंग्रेज़ी बोलना सीखें।",
    sttCode: process.env.GNANI_STT_CODE_HI || "hi-IN",
    ttsCode: process.env.GNANI_TTS_CODE_HI || "hi-IN",
    ttsVoice: process.env.GNANI_TTS_VOICE || "Kaveri",
    font: "Plus Jakarta Sans",
    isQuizMode: false,
    initialGreeting: "नमस्ते! मैं मीरा हूँ। बेझिझक बोलिए, गलतियों की बिल्कुल चिंता मत कीजिए — हर गलती से ही हम सीखते हैं।",
  },
  ta: {
    id: 'ta',
    label: "தமிழ் வாய்ஸ் டியூட்டர்",
    subLabel: "குரல் வினாடி வினா • மலர்",
    flag: "🌴",
    personaName: "மலர் (Malar)",
    role: "தமிழ் வாய்ஸ் வினாடி வினா & ஸ்போக்கன் டியூட்டர்",
    tagline: "உரக்க வினாக்கள் கேட்டு, உங்கள் பதிலுக்கு உடனடி விளக்கம் அளிக்கும் தமிழ் வழிகாட்டி.",
    sttCode: process.env.GNANI_STT_CODE_TA || "ta-IN",
    ttsCode: process.env.GNANI_TTS_CODE_TA || "ta-IN",
    ttsVoice: process.env.GNANI_TTS_VOICE_TA || "Kaveri",
    font: "Noto Sans Tamil",
    isQuizMode: true,
    initialGreeting: "வணக்கம்! நான் உங்கள் தமிழ் குரல் வழிகாட்டி மலர். நான் உங்களுக்கு ஆங்கில வினாக்களை உரக்கக் கேட்பேன். தைரியமாகப் பேசுங்கள், சரியான விடையும் விளக்கமும் தருகிறேன்!",
  },
};

export type SupportedLanguage = keyof typeof LANGUAGES;

/**
 * Helper to retrieve language configuration with guaranteed 'en' fallback
 */
export function getLanguageConfig(key?: string | null): LanguageConfig {
  if (!key) return LANGUAGES.en;
  return LANGUAGES[key as SupportedLanguage] || LANGUAGES.en;
}
