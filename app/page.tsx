'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { BolLogo } from '@/components/BolLogo';
import { MotionOrb } from '@/components/MotionOrb';
import { MotionCard } from '@/components/MotionCard';
import { ScoreRing } from '@/components/ScoreRing';
import { StackedSection } from '@/components/StackedSection';
import { MotionButton } from '@/components/MotionButton';
import { AudioWaveform } from '@/components/AudioWaveform';
import { ParallaxSpheres } from '@/components/ParallaxSpheres';
import {
  VoiceRecorder,
  playTutorVoice,
  stopAnyPlayingAudio,
  downloadReportFile,
} from '@/lib/audio';
import {
  getStoredSessions,
  getStoredProgress,
  DEFAULT_PROGRESS,
  saveSession,
  PracticeSession,
  SessionTurn,
} from '@/lib/storage';
import { LANGUAGES, SupportedLanguage, getLanguageConfig } from '@/lib/config/languages';
import demoData from '@/lib/demoData/demoTurns.json';
import {
  analyzeFillers,
  summarizeSessionFillers,
  FillerAnalysis,
  SessionFillerSummary,
} from '@/lib/services/fillerDetector';
import { FluencyScorecardModal } from '@/components/FluencyScorecardModal';
import { FillerDetoxCard } from '@/components/FillerDetoxCard';

type AppView = 'welcome' | 'setup' | 'conversation' | 'generating_report' | 'summary' | 'progress';
type VoiceState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'error';

export type PracticeTopic = 'daily_life' | 'interview' | 'travel' | 'jugaad_genius';

const TOPIC_STARTER_PROMPTS: Record<PracticeTopic, Array<{ en: string; hi: string; ta: string }>> = {
  daily_life: [
    {
      en: "Today morning I had tea and went for a quick walk.",
      hi: "आज सुबह मैंने चाय पी और सैर पर गया।",
      ta: "இன்று காலை நான் தேநீர் குடித்துவிட்டு நடைப்பயிற்சி சென்றேன்.",
    },
    {
      en: "Usually my weekends are spent with family and friends.",
      hi: "आमतौर पर मेरे वीकेंड परिवार के साथ बीतते हैं।",
      ta: "வழக்கமாக வார இறுதி நாட்களில் குடும்பத்துடன் நேரம் செலவிடுவேன்.",
    },
    {
      en: "I am trying to balance my work routine and fitness.",
      hi: "मैं अपने काम और सेहत में संतुलन बना रहा हूँ।",
      ta: "எனது வேலை மற்றும் உடற்பயிற்சியை சமநிலையில் வைக்க முயற்சிக்கிறேன்.",
    },
  ],
  interview: [
    {
      en: "I have good problem solving skills and I love working in teams.",
      hi: "मेरी प्रॉब्लम सॉल्विंग अच्छी है और टीम में काम करना पसंद है।",
      ta: "என்னிடம் சிறந்த சிக்கல் தீர்க்கும் திறனும் குழுப்பணி ஆர்வமும் உள்ளது.",
    },
    {
      en: "In my last project, I led the customer feedback initiative.",
      hi: "पिछले प्रोजेक्ट में मैंने यूजर फीडबैक को लीड किया।",
      ta: "கடந்த திட்டத்தில் வாடிக்கையாளர் கருத்துக்களை முன்னின்று வழிநடத்தினேன்.",
    },
    {
      en: "My goal is to communicate confidently in team meetings.",
      hi: "मेरा लक्ष्य मीटिंग्स में आत्मविश्वास से बात करना है।",
      ta: "குழுக் கூட்டங்களில் தயக்கமின்றி சரளமாகப் பேசுவதே எனது இலக்கு.",
    },
  ],
  travel: [
    {
      en: "Could you please help me with the directions to the nearest metro?",
      hi: "क्या आप नज़दीकी मेट्रो का रास्ता बता सकते हैं?",
      ta: "அருகிலுள்ள மெட்ரோ நிலையத்திற்கான வழியைக் கூற முடியுமா?",
    },
    {
      en: "I would like to order one hot coffee and a sandwich, please.",
      hi: "कृपया एक गरम कॉफ़ी और एक सैंडविच दे दीजिए।",
      ta: "தயவுசெய்து ஒரு சூடான காபியும் சாண்ட்விச்சும் கொடுங்கள்.",
    },
    {
      en: "I really enjoy exploring new cities and local street foods.",
      hi: "मुझे नए शहर और स्थानीय खाना देखना बहुत पसंद है।",
      ta: "புதிய நகரங்களைச் சுற்றிப் பார்ப்பதும் உள்ளூர் உணவுகளை ருசிப்பதும் எனக்குப் பிடிக்கும்.",
    },
  ],
  jugaad_genius: [
    {
      en: "Could you please give me the cash change instead of toffees? I need it for the bus fare.",
      hi: "क्या मुझे टॉफ़ी के बदले छुट्टे पैसे मिल सकते हैं? मुझे बस के किराए के लिए चाहिए।",
      ta: "மிட்டாய்க்குப் பதிலாக மீதி சில்லறை காசு தர முடியுமா? பேருந்து கட்டணத்திற்கு தேவைப்படுகிறது.",
    },
    {
      en: "Excuse me, my phone battery is at 2%. Could I quickly scan my ticket first?",
      hi: "माफ़ कीजिएगा, मेरे फ़ोन की बैटरी 2% है। क्या मैं पहले टिकट स्कैन कर सकता हूँ?",
      ta: "மன்னிக்கவும், என் பேட்டரி 2% தான் உள்ளது. நான் முதலில் டிக்கெட்டை ஸ்கேன் செய்து கொள்ளலாமா?",
    },
    {
      en: "Thank you for bearing with me, my internet connection momentarily dropped.",
      hi: "धैर्य रखने के लिए धन्यवाद, मेरा इंटरनेट कनेक्शन एक पल के लिए कट गया था।",
      ta: "பொறுமைக்கு நன்றி, எனது இணைய இணைப்பு ஒரு கணம் துண்டிக்கப்பட்டுவிட்டது.",
    },
    {
      en: "We can solve this problem quickly by using a simple workaround.",
      hi: "हम इस समस्या को एक सरल वैकल्पिक तरीके (जुगाड़) से तुरंत हल कर सकते हैं।",
      ta: "நாம் ஒரு எளிய மாற்று வழியைக் கொண்டு இந்த சிக்கலை உடனடியாகத் தீர்க்கலாம்.",
    },
  ],
};

const ASYNC_ANALYSIS_STAGES = [
  {
    icon: 'graphic_eq',
    title: 'Acoustic Cadence & Waveform Scan',
    desc: 'Analyzing pitch variation, speaking cadence, and micro-pauses via Gnani Prisma Acoustic Engine...',
    hindi: 'आवाज़ के उतार-चढ़ाव और गति का विश्लेषण...',
  },
  {
    icon: 'translate',
    title: 'Hinglish Syntax & Preposition Audit',
    desc: 'Evaluating code-mixed sentence habits, preposition placement, and tense continuity...',
    hindi: 'व्याकरण, काल और सामान्य वाक्य संरचनाओं की जांच...',
  },
  {
    icon: 'speed',
    title: 'Fluency & CEFR Level Calibration',
    desc: 'Calculating words-per-minute pace, calm hesitation drops, and proficiency benchmark...',
    hindi: 'बोलने की गति (WPM) और CEFR स्तर का सटीक आकलन...',
  },
  {
    icon: 'auto_fix_high',
    title: 'Formulating Signature Phrasing Polishes',
    desc: 'Translating hesitant moments into natural, fluid everyday Indian English phrasing...',
    hindi: 'गलतियों को सहज और स्वाभाविक बोलचाल में बदलना...',
  },
  {
    icon: 'verified',
    title: 'Assembling Final Mastery Evaluation Report',
    desc: 'Compiling actionable homework plan, acoustic scores, and mentorship notes...',
    hindi: 'आपका पूर्ण मूल्यांकन और अभ्यास रिपोर्ट तैयार है...',
  },
];

function generateMarkdownReport(
  summary: any,
  turns: SessionTurn[],
  topic: string,
  level: string,
  durationSeconds: number,
  streak: number,
  language: SupportedLanguage = 'en',
  fillerSummary?: SessionFillerSummary
): string {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  const timeFormatted = `${minutes}m ${seconds}s`;
  const isTamil = language === 'ta';
  const isHindi = language === 'hi';
  const isJugaad = topic === 'jugaad_genius';

  let md = `# 🎙️ Bol Spoken English Sanctuary • Session Evaluation Report\n\n`;
  md += `**Date:** ${dateStr}\n`;
  md += `**Language Track:** ${isTamil ? 'தமிழ் வாய்ஸ் வினாடி வினா (Malar)' : isHindi ? 'हिन्दी स्पोकन गाइड (Meera)' : 'English / Hinglish (Priya)'}\n`;
  md += `**Practice Realm:** ${isJugaad ? '💡 JUGAAD GENIUS (Everyday Indian Problem Solving)' : topic.replace('_', ' ').toUpperCase()}\n`;
  md += `**Proficiency Level:** ${level === 'beginner' ? 'Beginner (Intuitive Guidance)' : 'Intermediate (Natural Flow)'}\n`;
  md += `**Speaking Duration:** ${timeFormatted}\n`;
  md += `**Continuous Practice Streak:** ${streak} Days 🔥\n`;
  md += `**Estimated CEFR Benchmark:** ${summary.cefrLevel || 'B1 - Independent Speaker'}\n\n`;
  md += `---\n\n`;

  md += `## 📊 Acoustic & Mastery Scores (out of 10)\n\n`;
  md += `- **Fluency & Cadence:** ${summary.scores?.fluency || 8.4} / 10\n`;
  md += `- **Grammar & Sentence Phrasing:** ${summary.scores?.grammar || 7.8} / 10\n`;
  md += `- **Confidence & Tone:** ${summary.scores?.confidence || 8.8} / 10\n`;
  if (isJugaad) {
    md += `- **Jugaad Agility & Street-Smart Negotiation:** 9.2 / 10 ⚡ (Quick-witted problem solver)\n`;
  }
  md += `\n`;

  md += `### ⏱️ Performance Metrics\n`;
  md += `- **Words Spoken:** ${summary.totalWords || 215} words\n`;
  md += `- **Speaking Pace:** ${summary.wpmEstimate || 124} WPM (Optimal Conversational Flow)\n`;
  md += `- **Hesitation Index Reduction:** ${summary.hesitationDropPercent || -40}% calm silence index\n`;
  if (fillerSummary) {
    md += `- **Filler Word Detox:** Grade ${fillerSummary.detoxGrade} (${fillerSummary.totalFillers === 0 ? '0 "Matlab" / Clean Flow' : `${fillerSummary.totalFillers} fillers detected`})\n`;
  }
  md += `\n---\n\n`;

  const mentorName = isTamil ? 'மலர் (Malar - Tamil Voice Quiz Tutor)' : isHindi ? 'मीरा (Meera)' : 'Priya';
  md += `## 💡 Coach ${mentorName}'s Mentorship Tip\n\n`;
  md += `> "${summary.tip || 'Keep practicing short sentences daily.'}"\n\n`;
  if (summary.hindiTip) {
    md += `*हिन्दी भाव:* ${summary.hindiTip}\n\n`;
  }
  if (isTamil && summary.tamilTip) {
    md += `*தமிழ் வழிகாட்டல்:* ${summary.tamilTip}\n\n`;
  }
  md += `---\n\n`;

  md += `## 🔍 Key Areas to Polish\n\n`;
  (summary.topMistakes || []).forEach((m: string, i: number) => {
    md += `${i + 1}. ${m}\n`;
  });
  md += `\n---\n\n`;

  if (turns.length > 0) {
    md += `## 💬 Session Dialogue & Polishes\n\n`;
    turns.forEach((t, i) => {
      md += `### Turn ${i + 1}\n`;
      md += `- **You said:** "${t.transcript}"\n`;
      md += `- **Coach ${isTamil ? 'Malar' : isHindi ? 'Meera' : 'Priya'}:** "${t.reply}"\n`;
      if (t.corrections && t.corrections.length > 0) {
        t.corrections.forEach((c) => {
          md += `  - ❌ *Original:* "${c.original}"\n`;
          md += `  - ✅ *Better:* "${c.better}"\n`;
          md += `  - 💡 *Explanation:* ${c.why}\n`;
        });
      }
      md += `\n`;
    });
  }

  md += `---\n\n`;
  md += `*Generated automatically by Bol — Spoken English Sanctuary with Gnani AI Acoustic Engine (Prisma & Timbre).*\n`;
  md += `*Zero judgment. Zero microphone logging for training without consent.*\n`;

  return md;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window !== 'undefined' && window.btoa ? window.btoa(binary) : '';
}

export default function BolSanctuary() {
  const prefersReducedMotion = useReducedMotion();

  // Navigation & View State
  const [currentView, setCurrentView] = useState<AppView>('welcome');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Practice Configuration
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [level, setLevel] = useState<'beginner' | 'intermediate'>('beginner');
  const [topic, setTopic] = useState<PracticeTopic>('daily_life');

  // Active Session State
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [liveVolume, setLiveVolume] = useState<number>(0);
  const [turns, setTurns] = useState<SessionTurn[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [currentReply, setCurrentReply] = useState<string>('');
  const [currentHindiSubtext, setCurrentHindiSubtext] = useState<string>('');
  const [currentCorrections, setCurrentCorrections] = useState<
    Array<{ original: string; better: string; why: string }>
  >([]);
  const [lastAudioBase64, setLastAudioBase64] = useState<string | undefined>(undefined);
  const [manualText, setManualText] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);

  // Asynchronous Report Generation State
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [analysisStage, setAnalysisStage] = useState<number>(0);

  // Summary & Progress State
  const [latestSummary, setLatestSummary] = useState<any>(demoData.defaultSummary);
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);

  // Filler Word Detection & Shareable Scorecard State
  const [currentFillerAnalysis, setCurrentFillerAnalysis] = useState<FillerAnalysis | null>(null);
  const [sessionFillerSummary, setSessionFillerSummary] = useState<SessionFillerSummary>(() =>
    summarizeSessionFillers([])
  );
  const [isScorecardOpen, setIsScorecardOpen] = useState<boolean>(false);

  // Modals & UI Controls
  const [showTroubleshoot, setShowTroubleshoot] = useState<boolean>(false);
  const [troubleTab, setTroubleTab] = useState<'all' | 'mic' | 'audio' | 'net'>('all');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [sampleAudioPlaying, setSampleAudioPlaying] = useState<boolean>(false);

  // API & Integration Settings
  const [demoMode, setDemoMode] = useState<boolean>(false);
  const [gnaniKey, setGnaniKey] = useState<string>('');
  const [geminiKey, setGeminiKey] = useState<string>('');

  // Audio Recorder & Timers
  const recorderRef = useRef<VoiceRecorder | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Show transient toast notifications
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  };

  // Initialize on client mount
  useEffect(() => {
    recorderRef.current = new VoiceRecorder();
    setSessions(getStoredSessions());
    setProgress(getStoredProgress());

    const savedDemo = localStorage.getItem('bol_demo_mode');
    if (savedDemo !== null) setDemoMode(savedDemo === 'true');
    const savedGnani = localStorage.getItem('bol_gnani_key');
    if (savedGnani) setGnaniKey(savedGnani);
    const savedGemini = localStorage.getItem('bol_gemini_key');
    if (savedGemini) setGeminiKey(savedGemini);

    // Auto-detect server-side Gnani configuration
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.gnaniConfigured && savedDemo === null) {
          setDemoMode(false);
        }
      })
      .catch((err) => console.warn('Health check fetch failed:', err));

    return () => {
      stopAnyPlayingAudio();
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // Keyboard shortcut: Spacebar to toggle recording
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        currentView === 'conversation' &&
        !showManualInput &&
        !showSettings &&
        !showTroubleshoot
      ) {
        e.preventDefault();
        if (voiceState === 'idle') {
          handleStartRecording();
        } else if (voiceState === 'recording') {
          handleStopRecording();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, voiceState, showManualInput, showSettings, showTroubleshoot]);

  // Session timer ticker
  useEffect(() => {
    if (currentView === 'conversation') {
      sessionTimerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    }
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [currentView]);

  const handleSaveSettings = () => {
    localStorage.setItem('bol_demo_mode', String(demoMode));
    localStorage.setItem('bol_gnani_key', gnaniKey);
    localStorage.setItem('bol_gemini_key', geminiKey);
    setShowSettings(false);
    showToast('Preferences saved successfully');
  };

  const handleStartSession = async () => {
    const isTamil = selectedLanguage === 'ta';
    const isHindi = selectedLanguage === 'hi';
    const langConfig = getLanguageConfig(selectedLanguage);
    const topicInfo = (demoData.topics as Record<string, any>)[topic] || demoData.topics.daily_life;

    let greetingText = topicInfo.greeting;
    let subtext = topicInfo.greetingHindi || "";

    if (isTamil) {
      if (topic === 'jugaad_genius') {
        greetingText = "வணக்கம்! நான் உங்கள் தமிழ் குரல் வழிகாட்டி மலர். ஜூகாட் ஜீனியஸ் வினாடி வினா: ரயில் நிலையத்தில் டிக்கெட் காட்டும் போது உங்கள் மொபைல் பேட்டரி 2% மட்டுமே இருந்தால் டிக்கெட் பரிசோதகரிடம் எப்படிச் சமாளிப்பீர்கள்?";
      } else {
        greetingText = "வணக்கம்! நான் உங்கள் தமிழ் குரல் வழிகாட்டி மலர். நான் உங்களுக்கு ஆங்கில வினாக்களை உரக்கக் கேட்பேன். தைரியமாகப் பேசுங்கள், சரியான விடையும் விளக்கமும் தருகிறேன்!";
      }
      subtext = "மலர் உங்களுக்கு வினாக்களைக் கேட்கிறார் — உரக்கப் பேசிப் பழகுங்கள்";
    } else if (isHindi) {
      if (topic === 'jugaad_genius') {
        greetingText = "नमस्ते! मैं मीरा हूँ। जुगाड़ जीनियस में आपका स्वागत है! मान लीजिए रेलवे स्टेशन पर टिकट दिखाते समय फ़ोन की बैटरी 2% बची है, तो आप टिकट परीक्षक से क्या कहेंगे?";
      } else {
        greetingText = langConfig.initialGreeting || topicInfo.greeting;
      }
      subtext = "मीरा आपकी कोच हैं — बिना किसी डर के खुलकर बोलिए";
    } else if (topic === 'jugaad_genius') {
      greetingText = "Welcome to Jugaad Genius! Let's test your street-smart problem solving. What would you do if your phone battery drops to 2% right as you need to show your e-ticket at the station gate?";
      subtext = "Think on your feet! Speak your clever solution out loud.";
    }

    setCurrentView('conversation');
    setSessionSeconds(0);
    setRecordingSeconds(0);
    setLiveVolume(0);
    setTurns([]);
    const initialStarter = isTamil ? "வணக்கம் மலர், நான் பயிற்சி செய்யத் தயார்!" : "Yesterday I went to the market to buy fresh vegetables.";
    setCurrentTranscript(initialStarter);
    setCurrentFillerAnalysis(analyzeFillers(initialStarter));
    setCurrentReply(greetingText);
    setCurrentHindiSubtext(subtext);
    setCurrentCorrections([]);
    setVoiceState('speaking');

    let audioBase64: string | undefined = undefined;
    if (!demoMode) {
      try {
        const speakRes = await fetch('/api/speak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(gnaniKey ? { 'x-api-key': gnaniKey } : {}),
          },
          body: JSON.stringify({
            text: greetingText,
            language: selectedLanguage,
            voice: langConfig.ttsVoice,
            ...(gnaniKey ? { apiKey: gnaniKey } : {}),
          }),
        });
        if (speakRes.ok) {
          const arrayBuf = await speakRes.arrayBuffer();
          audioBase64 = arrayBufferToBase64(arrayBuf);
          setLastAudioBase64(audioBase64);
        }
      } catch (err) {
        console.warn('Initial greeting TTS fetch error:', err);
      }
    }

    playTutorVoice(
      greetingText,
      audioBase64,
      0.95,
      () => {
        setVoiceState('idle');
      },
      langConfig.ttsCode
    );
  };

  const handleStartRecording = async () => {
    setErrorMessage(null);
    stopAnyPlayingAudio();
    setLiveVolume(0);
    setRecordingSeconds(0);

    try {
      if (!recorderRef.current) recorderRef.current = new VoiceRecorder();
      await recorderRef.current.start((vol) => {
        setLiveVolume(vol);
      });
      setVoiceState('recording');

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Recording start error:', err);
      if (err.message === 'PERMISSION_DENIED') {
        setShowTroubleshoot(true);
        setTroubleTab('mic');
        setErrorMessage('Microphone access was denied. Please allow microphone permissions to speak.');
      } else {
        setErrorMessage("Could not initialize microphone. Please check your browser audio settings.");
      }
      setVoiceState('error');
    }
  };

  const handleStopRecording = async () => {
    if (!recorderRef.current || voiceState !== 'recording') return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    try {
      setVoiceState('transcribing');
      const { blob } = await recorderRef.current.stop();
      setLiveVolume(0);

      let transcript = '';

      if (!demoMode) {
        const formData = new FormData();
        formData.append('audio', blob, 'turn.wav');
        formData.append('language', selectedLanguage);
        if (gnaniKey) {
          formData.append('apiKey', gnaniKey);
        }

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: gnaniKey ? { 'x-api-key': gnaniKey } : undefined,
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          transcript = data.transcript;
        } else {
          throw new Error('Transcription API error');
        }
      } else {
        const topicData = demoData.topics[topic] || demoData.topics.daily_life;
        const turnIndex = turns.length % topicData.turns.length;
        transcript = topicData.turns[turnIndex].transcript;
      }

      if (!transcript || transcript.trim().length === 0) {
        setVoiceState('error');
        setErrorMessage("Couldn't hear you clearly, please tap the mic to speak again.");
        return;
      }

      await processTurn(transcript);
    } catch (err: any) {
      console.error('Turn processing error:', err);
      setVoiceState('error');
      setErrorMessage("Voice processing paused. Bol is right here with you — tap retry to speak again.");
    }
  };

  const handleCancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recorderRef.current) {
      recorderRef.current.cancel();
    }
    setLiveVolume(0);
    setRecordingSeconds(0);
    setVoiceState('idle');
  };

  const processTurn = async (transcript: string) => {
    setCurrentTranscript(transcript);
    const fillerResult = analyzeFillers(transcript);
    setCurrentFillerAnalysis(fillerResult);
    setVoiceState('thinking');

    const historyPayload = turns.map((t) => [
      { role: 'student', text: t.transcript },
      { role: 'tutor', text: t.reply },
    ]).flat();

    try {
      const tutorRes = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          history: historyPayload,
          level,
          topic,
          language: selectedLanguage,
        }),
      });

      const tutorData = await tutorRes.json();
      const reply = tutorData.reply || "That was a good attempt! Tell me more about that.";
      const corrections = tutorData.corrections || [];

      setCurrentReply(reply);
      setCurrentCorrections(corrections);
      setCurrentHindiSubtext(
        selectedLanguage === 'ta'
          ? "மலர் உங்கள் பதிலைக் கேட்டு உடனடி விளக்கம் தருகிறார் — அடுத்த வினாவை எதிர்கொள்ளுங்கள்"
          : selectedLanguage === 'hi'
          ? "मीरा सुन रही हैं — आराम से अपनी गति में बोलें, कोई जल्दबाजी नहीं।"
          : level === 'beginner'
          ? "Priya is listening attentively — speak calmly in your own natural rhythm."
          : ""
      );

      const newTurn: SessionTurn = {
        transcript,
        reply,
        corrections,
      };
      setTurns((prev) => [...prev, newTurn]);

      setVoiceState('speaking');

      let audioBase64: string | undefined = undefined;
      if (!demoMode) {
        try {
          const speakRes = await fetch('/api/speak', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(gnaniKey ? { 'x-api-key': gnaniKey } : {}),
            },
            body: JSON.stringify({
              text: reply,
              language: selectedLanguage,
              voice: getLanguageConfig(selectedLanguage).ttsVoice,
              ...(gnaniKey ? { apiKey: gnaniKey } : {}),
            }),
          });
          if (speakRes.ok) {
            const arrayBuf = await speakRes.arrayBuffer();
            audioBase64 = arrayBufferToBase64(arrayBuf);
            setLastAudioBase64(audioBase64);
          }
        } catch (e) {
          console.warn('Speak API call failed, falling back to Web Speech:', e);
        }
      }

      playTutorVoice(
        reply,
        audioBase64,
        0.95,
        () => {
          setVoiceState('idle');
        },
        getLanguageConfig(selectedLanguage).ttsCode
      );
    } catch (err) {
      console.error('Failed to get tutor reply:', err);
      setVoiceState('idle');
    }
  };

  /**
   * Asynchronous Report Generation Flow:
   * Transitions immediately to the diagnostic analysis screen,
   * steps through 5 acoustic & linguistic calibration milestones in real time,
   * computes the summary in the background, and seamlessly reveals the report.
   */
  const handleEndSession = async () => {
    stopAnyPlayingAudio();
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // Enter asynchronous report generation state immediately
    setCurrentView('generating_report');
    setAnalysisProgress(15);
    setAnalysisStage(0);

    // Asynchronously trigger progressive milestones
    const stageTimer = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 92) return prev;
        const next = prev + Math.floor(Math.random() * 10) + 8;
        if (next > 78) setAnalysisStage(3);
        else if (next > 54) setAnalysisStage(2);
        else if (next > 28) setAnalysisStage(1);
        return Math.min(94, next);
      });
    }, 400);

    try {
      const historyPayload = turns.map((t) => [
        { role: 'student', text: t.transcript },
        { role: 'tutor', text: t.reply },
      ]).flat();

      const startTime = Date.now();
      const res = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: historyPayload,
          level,
          topic,
          language: selectedLanguage,
        }),
      });

      const summary = await res.json();
      setLatestSummary(summary);

      // Ensure at least 2.2 seconds of clear diagnostic progress visualization
      const elapsed = Date.now() - startTime;
      const remainingWait = Math.max(0, 2200 - elapsed);
      await new Promise((r) => setTimeout(r, remainingWait));

      clearInterval(stageTimer);
      setAnalysisProgress(100);
      setAnalysisStage(4);

      await new Promise((r) => setTimeout(r, 450));

      const allTurns = turns.map((t) => ({ transcript: t.transcript }));
      const fillerSummary = summarizeSessionFillers(allTurns);
      setSessionFillerSummary(fillerSummary);

      const newSession: PracticeSession = {
        id: 'sess_' + Date.now(),
        date: new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }),
        level,
        topic,
        durationMinutes: Math.max(1, Math.round(sessionSeconds / 60)),
        turns: turns.map((t) => ({
          transcript: t.transcript,
          reply: t.reply,
          corrections: t.corrections || [],
        })),
        scores: summary.scores || { fluency: 8.4, grammar: 7.8, confidence: 8.8 },
        topMistakes: summary.topMistakes || [],
        tip: summary.tip || "Keep practicing short sentences daily.",
        fillerStats: {
          totalFillers: fillerSummary.totalFillers,
          detoxGrade: fillerSummary.detoxGrade,
        },
      };

      saveSession(newSession);
      setSessions(getStoredSessions());
      setProgress(getStoredProgress());
      setCurrentView('summary');
      setVoiceState('idle');
    } catch (e) {
      console.error('Failed to summarize session:', e);
      clearInterval(stageTimer);
      setAnalysisProgress(100);
      setCurrentView('summary');
      setVoiceState('idle');
    }
  };

  const handleDownloadReport = () => {
    const md = generateMarkdownReport(
      latestSummary,
      turns,
      topic,
      level,
      sessionSeconds,
      progress.streak,
      selectedLanguage,
      sessionFillerSummary
    );
    const filename = `Bol_Speaking_Report_${new Date().toISOString().slice(0, 10)}.md`;
    downloadReportFile(md, filename);
    showToast(`Evaluation Report downloaded: ${filename}`);
  };

  const handleCopyReport = () => {
    const md = generateMarkdownReport(
      latestSummary,
      turns,
      topic,
      level,
      sessionSeconds,
      progress.streak,
      selectedLanguage,
      sessionFillerSummary
    );
    if (navigator.clipboard) {
      navigator.clipboard.writeText(md);
      showToast('Evaluation Report copied to clipboard!');
    }
  };

  const handleToggleSampleAudio = () => {
    if (sampleAudioPlaying) {
      stopAnyPlayingAudio();
      setSampleAudioPlaying(false);
    } else {
      setSampleAudioPlaying(true);
      playTutorVoice(
        "Yesterday I went to the market to buy fresh vegetables for dinner. How about you?",
        undefined,
        0.95,
        () => setSampleAudioPlaying(false)
      );
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0f1030] text-[#e1e0ff] relative selection:bg-[#ff7a59] selection:text-[#701500] overflow-x-hidden">
      {/* Background Floating Spheres with Parallax Depth */}
      <ParallaxSpheres />

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#171838]/95 border border-[#44e2cd] text-[#62fae3] font-['Space_Grotesk'] text-xs font-semibold shadow-2xl flex items-center gap-2 backdrop-blur-xl"
          >
            <span className="material-symbols-outlined text-sm text-[#44e2cd]">check_circle</span>
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Sanctuary Header */}
      <header className="sticky top-0 left-0 right-0 z-50 bg-[#0f1030]/85 backdrop-blur-2xl border-b border-[#262747]/60 shadow-[0_4px_30px_rgba(0,0,0,0.35)]">
        <div className="h-16 sm:h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 flex items-center justify-between gap-3 sm:gap-4">
          {/* Logo & Sanctuary Badge */}
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => {
                stopAnyPlayingAudio();
                setCurrentView('welcome');
              }}
              className="focus:outline-none transition-transform hover:scale-[1.02]"
            >
              <BolLogo size="md" showSubtitle={true} />
            </button>
            <div className="hidden lg:flex items-center px-3 py-1 rounded-full bg-[#262747]/80 text-[#dfc0b8] font-['Space_Grotesk'] text-[11px] uppercase tracking-wider border border-[#313253]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#44e2cd] mr-2 animate-pulse"></span>
              AI Voice Sanctuary
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-[#1b1c3c]/80 border border-[#262747]">
            <button
              onClick={() => {
                stopAnyPlayingAudio();
                setCurrentView('welcome');
              }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                currentView === 'welcome'
                  ? 'bg-[#262747] text-[#e1e0ff] shadow-sm'
                  : 'text-[#dfc0b8] hover:text-[#e1e0ff]'
              }`}
            >
              Sanctuary
            </button>
            <button
              onClick={() => {
                stopAnyPlayingAudio();
                setCurrentView('setup');
              }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                currentView === 'setup' || currentView === 'conversation'
                  ? 'bg-[#262747] text-[#e1e0ff] shadow-sm'
                  : 'text-[#dfc0b8] hover:text-[#e1e0ff]'
              }`}
            >
              Practice
            </button>
            <button
              onClick={() => {
                stopAnyPlayingAudio();
                setCurrentView('progress');
              }}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                currentView === 'progress'
                  ? 'bg-[#262747] text-[#e1e0ff] shadow-sm'
                  : 'text-[#dfc0b8] hover:text-[#e1e0ff]'
              }`}
            >
              Progress & Streak
            </button>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Streak Counter */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentView('progress')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#262747]/90 text-[#e1e0ff] border border-[#313253] hover:border-[#ff7a59]/40 transition-colors"
              title="Daily Practice Streak"
            >
              <span
                className="material-symbols-outlined text-[#ff7a59] text-[16px] sm:text-[18px] leading-none"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                local_fire_department
              </span>
              <span
                suppressHydrationWarning
                className="font-['Space_Grotesk'] text-[11px] sm:text-[12px] font-bold text-[#ffb4a2] uppercase tracking-wider"
              >
                {progress.streak}d
              </span>
            </motion.button>

            {/* Language Switcher Segmented Pill */}
            <div className="flex items-center p-0.5 rounded-full bg-[#1b1c3c] border border-[#262747]" title="Switch Practice Language">
              {(['en', 'hi', 'ta'] as SupportedLanguage[]).map((langKey) => {
                const conf = LANGUAGES[langKey];
                const isActive = selectedLanguage === langKey;
                return (
                  <button
                    key={langKey}
                    type="button"
                    onClick={() => {
                      setSelectedLanguage(langKey);
                      showToast(`Language set to ${conf.label}`);
                    }}
                    className={`px-2 sm:px-2.5 py-1 rounded-full text-xs font-['Space_Grotesk'] font-medium transition-all flex items-center gap-1 ${
                      isActive
                        ? 'bg-[#262747] text-[#44e2cd] shadow-sm font-semibold border border-[#313253]'
                        : 'text-[#dfc0b8] hover:text-[#e1e0ff]'
                    }`}
                  >
                    <span>{conf.flag}</span>
                    <span className="hidden sm:inline text-[11px] font-semibold">{langKey.toUpperCase()}</span>
                  </button>
                );
              })}
            </div>

            {/* Live Mode Badge */}
            <button
              onClick={() => setShowSettings(true)}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-['Space_Grotesk'] uppercase tracking-wider border transition-all ${
                demoMode
                  ? 'bg-[#1b1c3c] text-[#cabeff] border-[#a596eb]/30 hover:border-[#a596eb]'
                  : 'bg-[#03c6b2]/10 text-[#44e2cd] border-[#44e2cd]/40 hover:border-[#44e2cd]'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${demoMode ? 'bg-[#a596eb]' : 'bg-[#44e2cd] animate-pulse'}`}></span>
              {demoMode ? 'Demo Mode' : 'Live Gnani AI'}
            </button>

            {/* Settings Button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1b1c3c] hover:bg-[#262747] text-[#dfc0b8] hover:text-[#e1e0ff] border border-[#262747] transition-colors"
              title="API Keys and Voice Settings"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
            </motion.button>

            {/* Troubleshoot Help Button */}
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowTroubleshoot(true)}
              className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1b1c3c] hover:bg-[#262747] text-[#dfc0b8] hover:text-[#e1e0ff] border border-[#262747] transition-colors"
              title="Troubleshooting and Audio Help"
            >
              <span className="material-symbols-outlined text-[18px]">help_outline</span>
            </motion.button>

            {/* Start Free CTA in Header */}
            {currentView === 'welcome' && (
              <MotionButton
                onClick={() => setCurrentView('setup')}
                className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px]"
              >
                Start Free
              </MotionButton>
            )}
          </div>
        </div>
      </header>

      {/* Main View Transition Container */}
      <main className="relative z-10 flex-1 flex flex-col w-full">
        {/* ========================================================= */}
        {/* VIEW 1: WELCOME SCREEN (Responsive Parallax Sanctuary)     */}
        {/* ========================================================= */}
        {currentView === 'welcome' && (
          <div className="w-full flex flex-col items-center">
            {/* Section 1: Hero Layer */}
            <StackedSection index={0} className="pt-6 sm:pt-10 pb-8 sm:pb-14 flex flex-col items-center text-center">
              <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center">
                {/* Pill Label */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-[#262747]/80 backdrop-blur-md border border-[#313253] mb-5 shadow-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-[#44e2cd] animate-pulse shadow-[0_0_8px_#44e2cd]"></span>
                  <span className="font-['Space_Grotesk'] text-[10px] sm:text-[11px] text-[#62fae3] uppercase tracking-wider font-semibold">
                    Zero Anxiety • Private Voice Sanctuary
                  </span>
                  <span className="font-['Space_Grotesk'] text-[11px] text-[#dfc0b8] font-medium hidden sm:inline">
                    • 100% Hindi Learner Tailored
                  </span>
                </motion.div>

                {/* Headline with Stagger */}
                <motion.h1
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="font-['Fraunces'] text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#e1e0ff] max-w-4xl leading-[1.08] mb-4 sm:mb-5"
                >
                  Speak English{' '}
                  <span className="bg-gradient-to-r from-[#ffb4a2] via-[#ff7a59] to-[#44e2cd] bg-clip-text text-transparent">
                    without fear.
                  </span>
                </motion.h1>

                {/* Bilingual Subheadline */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.2 }}
                  className="flex flex-col items-center gap-2 max-w-2xl mb-7 sm:mb-8"
                >
                  <p className="font-['Plus_Jakarta_Sans'] text-base sm:text-[17px] text-[#dfc0b8] leading-relaxed">
                    A judgment-free conversational sanctuary designed for ambitious Indian minds navigating everyday fluency.
                  </p>
                  <p className="font-['Noto_Sans'] text-lg sm:text-xl font-medium text-transparent bg-gradient-to-r from-[#ffdad2] to-[#e6deff] bg-clip-text drop-shadow-[0_0_12px_rgba(255,180,162,0.25)]">
                    “बोलो, गलती से मत डरो — यहाँ कोई जज करने वाला नहीं है।”
                  </p>
                </motion.div>

                {/* 3D FLOATING VOICE ORB (Click to enter practice) */}
                <div className="mb-7 sm:mb-8 flex flex-col items-center">
                  <MotionOrb
                    mode="hero"
                    state="idle"
                    onClick={() => setCurrentView('setup')}
                    size="lg"
                  />
                  <div className="mt-3 text-center">
                    <span className="text-xs text-[#dfc0b8] font-['Space_Grotesk'] tracking-wide">
                      Hover to explore 3D refraction • Tap to enter speaking section
                    </span>
                  </div>
                </div>

                {/* Live Audio Sample Bar */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.35 }}
                  className="w-full max-w-xl mb-7 sm:mb-8 p-3 rounded-2xl bg-[#171838]/85 backdrop-blur-xl border border-[#262747] shadow-lg flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 text-left">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleToggleSampleAudio}
                      className="w-10 h-10 rounded-full bg-[#ff7a59] text-[#701500] flex items-center justify-center shadow-md shrink-0"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {sampleAudioPlaying ? 'pause' : 'play_arrow'}
                      </span>
                    </motion.button>
                    <div>
                      <div className="font-['Plus_Jakarta_Sans'] text-[13px] font-semibold text-[#e1e0ff] flex items-center gap-2">
                        Sample Coach Audio: “Daily routine”
                        <span className="text-[10px] uppercase font-['Space_Grotesk'] px-1.5 py-0.5 rounded bg-[#262747] text-[#44e2cd]">
                          Bilingual
                        </span>
                      </div>
                      <div className="font-['Noto_Sans'] text-[12px] sm:text-[13px] text-[#dfc0b8] italic">
                        “Yesterday I went to the market to buy fresh vegetables...”
                      </div>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-[#44e2cd] font-['Space_Grotesk'] text-[14px]">
                    <span className="material-symbols-outlined text-[18px]">graphic_eq</span>
                    <span>0:06</span>
                  </div>
                </motion.div>

                {/* Primary CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-4 w-full sm:w-auto">
                  <MotionButton
                    onClick={() => setCurrentView('setup')}
                    className="w-full sm:w-auto min-h-[52px] sm:min-h-[58px] px-8 rounded-full font-['Epilogue'] text-[16px] sm:text-[17px]"
                  >
                    <span>Begin Voice Practice</span>
                    <span className="material-symbols-outlined text-[20px] ml-2">arrow_forward</span>
                  </MotionButton>
                  <MotionButton
                    variant="glass"
                    onClick={() => setCurrentView('progress')}
                    className="w-full sm:w-auto min-h-[52px] sm:min-h-[58px] px-7 rounded-full text-[14px] sm:text-[15px]"
                  >
                    <span
                      className="material-symbols-outlined text-[#ff7a59] text-[20px] mr-2"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      local_fire_department
                    </span>
                    <span suppressHydrationWarning>View {progress.streak}-Day Streak</span>
                  </MotionButton>
                </div>
              </div>
            </StackedSection>

            {/* Section 2: 3 Pillars Cards */}
            <StackedSection index={1} className="px-4 sm:px-6 max-w-6xl mx-auto">
              <div className="p-6 sm:p-10 lg:p-12 rounded-3xl bg-[#171838]/90 border border-[#262747] backdrop-blur-2xl shadow-2xl">
                <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
                  <span className="font-['Space_Grotesk'] text-[11px] uppercase tracking-wider text-[#44e2cd] font-semibold">
                    The Sanctuary Philosophy
                  </span>
                  <h2 className="font-['Fraunces'] text-2xl sm:text-4xl font-bold text-[#e1e0ff] mt-2 mb-3">
                    Why Indian students thrive on Bol
                  </h2>
                  <p className="font-['Plus_Jakarta_Sans'] text-xs sm:text-sm text-[#dfc0b8]">
                    Built around the psychological comfort of Hindi thinkers transitioning to fluent English speakers.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 text-left">
                  <MotionCard delay={0.1} className="p-6 rounded-3xl bg-[#1b1c3c]/90 border border-[#262747] backdrop-blur-xl">
                    <div className="w-12 h-12 rounded-2xl bg-[#ff7a59]/20 text-[#ffb4a2] flex items-center justify-center mb-4 shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">translate</span>
                    </div>
                    <h3 className="font-['Fraunces'] text-lg sm:text-xl font-bold text-[#e1e0ff] mb-2">Hinglish Native Ear</h3>
                    <p className="font-['Plus_Jakarta_Sans'] text-[13px] sm:text-[14px] text-[#dfc0b8] leading-relaxed">
                      Trained for Indian accents, code-mixed sentence structures, and quiet pauses. Never feel judged when you search for a word.
                    </p>
                  </MotionCard>

                  <MotionCard delay={0.2} className="p-6 rounded-3xl bg-[#1b1c3c]/90 border border-[#262747] backdrop-blur-xl">
                    <div className="w-12 h-12 rounded-2xl bg-[#44e2cd]/20 text-[#44e2cd] flex items-center justify-center mb-4 shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">auto_fix_high</span>
                    </div>
                    <h3 className="font-['Fraunces'] text-lg sm:text-xl font-bold text-[#e1e0ff] mb-2">Gentle Phrasing Polish</h3>
                    <p className="font-['Plus_Jakarta_Sans'] text-[13px] sm:text-[14px] text-[#dfc0b8] leading-relaxed">
                      Signature <em>You said → Better → Why</em> correction cards with intuitive Hindi insights so grammar clicks instantly.
                    </p>
                  </MotionCard>

                  <MotionCard delay={0.3} className="p-6 rounded-3xl bg-[#1b1c3c]/90 border border-[#262747] backdrop-blur-xl">
                    <div className="w-12 h-12 rounded-2xl bg-[#cabeff]/20 text-[#cabeff] flex items-center justify-center mb-4 shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">trending_up</span>
                    </div>
                    <h3 className="font-['Fraunces'] text-lg sm:text-xl font-bold text-[#e1e0ff] mb-2">Confidence Tracking</h3>
                    <p className="font-['Plus_Jakarta_Sans'] text-[13px] sm:text-[14px] text-[#dfc0b8] leading-relaxed">
                      Acoustic fluency scores, hesitation drop measurements, and daily streaks that prove your improvement before job placements.
                    </p>
                  </MotionCard>
                </div>
              </div>
            </StackedSection>

            {/* Section 3: Daily Practice Realms */}
            <StackedSection index={2} className="px-4 sm:px-6 max-w-6xl mx-auto mb-12 sm:mb-16">
              <div className="p-6 sm:p-10 lg:p-12 rounded-3xl bg-[#1b1c3c]/95 border border-[#313253] backdrop-blur-2xl shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-8">
                  <div>
                    <span className="font-['Space_Grotesk'] text-[11px] uppercase tracking-wider text-[#44e2cd] font-semibold">
                      Curated Scenarios
                    </span>
                    <h2 className="font-['Fraunces'] text-2xl sm:text-3xl font-bold text-[#e1e0ff] mt-1">
                      Choose your realm and speak right now
                    </h2>
                  </div>
                  <MotionButton
                    onClick={() => setCurrentView('setup')}
                    className="px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-semibold shrink-0 self-start sm:self-auto"
                  >
                    <span>Choose Realm</span>
                    <span className="material-symbols-outlined text-sm ml-1.5">arrow_forward</span>
                  </MotionButton>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                  <div
                    onClick={() => {
                      setTopic('daily_life');
                      setCurrentView('setup');
                    }}
                    className="p-5 rounded-2xl bg-[#090a2a]/70 border border-[#262747] hover:border-[#ff7a59] cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="text-[#ff7a59] mb-3">
                      <span className="material-symbols-outlined text-[26px]">local_cafe</span>
                    </div>
                    <h4 className="font-['Fraunces'] text-base font-bold text-[#e1e0ff]">Daily Life & Routine</h4>
                    <p className="text-xs text-[#ffdad2] font-['Noto_Sans'] mb-2">दैनिक दिनचर्या • அன்றாட வாழ்வு</p>
                    <p className="text-xs text-[#dfc0b8] leading-relaxed">
                      Practice morning coffee, cooking, shopping, and everyday small-talk with ease.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      setTopic('interview');
                      setCurrentView('setup');
                    }}
                    className="p-5 rounded-2xl bg-[#090a2a]/70 border border-[#262747] hover:border-[#44e2cd] cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="text-[#44e2cd] mb-3">
                      <span className="material-symbols-outlined text-[26px]">work_outline</span>
                    </div>
                    <h4 className="font-['Fraunces'] text-base font-bold text-[#e1e0ff]">Workplace & Interviews</h4>
                    <p className="text-xs text-[#e1e0ff] font-['Noto_Sans'] mb-2">जॉब इंटरव्यू • நேர்காணல்</p>
                    <p className="text-xs text-[#dfc0b8] leading-relaxed">
                      Introduce yourself, project challenges, career aspirations, and answer tough queries.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      setTopic('travel');
                      setCurrentView('setup');
                    }}
                    className="p-5 rounded-2xl bg-[#090a2a]/70 border border-[#262747] hover:border-[#cabeff] cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="text-[#cabeff] mb-3">
                      <span className="material-symbols-outlined text-[26px]">flight_takeoff</span>
                    </div>
                    <h4 className="font-['Fraunces'] text-base font-bold text-[#e1e0ff]">Travel & Social</h4>
                    <p className="text-xs text-[#e6deff] font-['Noto_Sans'] mb-2">यात्रा • சுற்றுலா & வழிகள்</p>
                    <p className="text-xs text-[#dfc0b8] leading-relaxed">
                      Directions, hotel check-ins, cafe orders, and conversational ice-breakers.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      setTopic('jugaad_genius');
                      setCurrentView('setup');
                    }}
                    className="p-5 rounded-2xl bg-[#090a2a]/70 border border-[#ffb703]/50 hover:border-[#ffb703] shadow-[0_0_15px_rgba(255,183,3,0.15)] cursor-pointer transition-all hover:scale-[1.02] relative overflow-hidden"
                  >
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#ffb703]/20 text-[#ffd166] text-[9px] font-['Space_Grotesk'] font-bold uppercase tracking-wider">
                      NEW • வினாடி வினா
                    </div>
                    <div className="text-[#ffb703] mb-3">
                      <span className="material-symbols-outlined text-[26px]">lightbulb</span>
                    </div>
                    <h4 className="font-['Fraunces'] text-base font-bold text-[#e1e0ff]">Jugaad Genius</h4>
                    <p className="text-xs text-[#ffd166] font-['Noto_Sans'] mb-2">स्मार्ट देसी समाधान • தீர்வுகள்</p>
                    <p className="text-xs text-[#dfc0b8] leading-relaxed">
                      Everyday dilemmas, witty negotiations, ticket hassles, and street-smart quick spoken answers.
                    </p>
                  </div>
                </div>
              </div>
            </StackedSection>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: PRACTICE SETUP SCREEN (Animated Cards)            */}
        {/* ========================================================= */}
        {currentView === 'setup' && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10 flex flex-col gap-6 sm:gap-8"
          >
            {/* Step Calibration Status Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
              <div className="flex items-center gap-2 bg-[#171838]/80 backdrop-blur-xl px-4 py-2 rounded-full border border-[#262747]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#44e2cd]"></div>
                  <div className="w-6 h-2.5 rounded-full bg-[#ff7a59] shadow-[0_0_10px_#ff7a59]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#313253]"></div>
                </div>
                <span className="font-['Space_Grotesk'] text-[11px] tracking-widest text-[#e1e0ff] uppercase pl-1">
                  Step 2 of 3
                </span>
                <span className="text-[#a68b84] text-xs">•</span>
                <span className="font-['Plus_Jakarta_Sans'] text-[13px] text-[#44e2cd]">Level & Realm</span>
              </div>

              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#262747]/90 border border-[#313253]">
                <span
                  className="material-symbols-outlined text-[#44e2cd] text-[18px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  graphic_eq
                </span>
                <span className="font-['Space_Grotesk'] text-[11px] text-[#e1e0ff] uppercase font-semibold">
                  Practice Calibration
                </span>
                <span className="text-[#a68b84] text-xs">/</span>
                <span className="font-['Noto_Sans'] text-[#ffdad2] text-xs">आज का अभ्यास तय करें</span>
              </div>
            </div>

            {/* Step 1: Language & Voice Coach Selection */}
            <div>
              <label className="block font-['Space_Grotesk'] text-xs uppercase tracking-wider text-[#dfc0b8] mb-3">
                1. Select Language & Voice Coach / மொழி மற்றும் வழிகாட்டி
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(['en', 'hi', 'ta'] as SupportedLanguage[]).map((langKey) => {
                  const conf = LANGUAGES[langKey];
                  const isSelected = selectedLanguage === langKey;
                  return (
                    <MotionCard
                      key={langKey}
                      onClick={() => setSelectedLanguage(langKey)}
                      className={`p-5 rounded-2xl cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-[#1b1c3c] border-[#44e2cd] shadow-[0_0_20px_rgba(68,226,205,0.2)]'
                          : 'bg-[#171838]/80 border-[#262747] hover:border-[#313253]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{conf.flag}</span>
                        {conf.isQuizMode && (
                          <span className="px-2 py-0.5 rounded-full bg-[#03c6b2]/20 text-[#44e2cd] font-['Space_Grotesk'] text-[10px] uppercase font-bold tracking-wider">
                            Voice Quiz Mode
                          </span>
                        )}
                      </div>
                      <h3 className="font-['Fraunces'] text-lg font-bold text-[#e1e0ff] mb-1">
                        {conf.label}
                      </h3>
                      <p className="text-xs text-[#44e2cd] font-semibold mb-2">{conf.subLabel}</p>
                      <p className="text-xs text-[#dfc0b8] leading-relaxed font-['Plus_Jakarta_Sans']">
                        {conf.tagline}
                      </p>
                    </MotionCard>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Level Selection */}
            <div>
              <label className="block font-['Space_Grotesk'] text-xs uppercase tracking-wider text-[#dfc0b8] mb-3">
                2. Select Comfort Level / अभ्यास का स्तर
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MotionCard
                  onClick={() => setLevel('beginner')}
                  className={`p-5 rounded-2xl cursor-pointer border transition-all ${
                    level === 'beginner'
                      ? 'bg-[#1b1c3c] border-[#ff7a59] shadow-[0_0_20px_rgba(255,122,89,0.2)]'
                      : 'bg-[#171838]/80 border-[#262747] hover:border-[#313253]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-[#ff7a59]"></span>
                    <h3 className="font-['Fraunces'] text-lg font-bold text-[#e1e0ff]">Beginner • Guided Comfort</h3>
                  </div>
                  <p className="text-xs text-[#dfc0b8] leading-relaxed">
                    Warm, patient feedback in clear English with native language explanations. Slow pace, zero rush.
                  </p>
                </MotionCard>

                <MotionCard
                  onClick={() => setLevel('intermediate')}
                  className={`p-5 rounded-2xl cursor-pointer border transition-all ${
                    level === 'intermediate'
                      ? 'bg-[#1b1c3c] border-[#44e2cd] shadow-[0_0_20px_rgba(68,226,205,0.2)]'
                      : 'bg-[#171838]/80 border-[#262747] hover:border-[#313253]'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-[#44e2cd]"></span>
                    <h3 className="font-['Fraunces'] text-lg font-bold text-[#e1e0ff]">Intermediate • Natural Flow</h3>
                  </div>
                  <p className="text-xs text-[#dfc0b8] leading-relaxed">
                    Conversational pace, advanced vocabulary suggestions, and polished idioms for career readiness.
                  </p>
                </MotionCard>
              </div>
            </div>

            {/* Step 3: Realm Selection */}
            <div>
              <label className="block font-['Space_Grotesk'] text-xs uppercase tracking-wider text-[#dfc0b8] mb-3">
                3. Select Practice Realm / பயிற்சித் களம்
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MotionCard
                  onClick={() => setTopic('daily_life')}
                  className={`p-5 rounded-2xl cursor-pointer border transition-all ${
                    topic === 'daily_life'
                      ? 'bg-[#1b1c3c] border-[#ff7a59] shadow-[0_0_20px_rgba(255,122,89,0.2)]'
                      : 'bg-[#171838]/80 border-[#262747] hover:border-[#313253]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#262747] text-[#ff7a59] flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[22px]">local_cafe</span>
                  </div>
                  <h3 className="font-['Fraunces'] text-base font-bold text-[#e1e0ff] mb-1">Daily Life & Routine</h3>
                  <p className="font-['Noto_Sans'] text-xs text-[#ffdad2] mb-2">दैनिक दिनचर्या • அன்றாட வாழ்வு</p>
                  <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#dfc0b8]">
                    Talking about shopping, cooking, hobbies, and weekend plans.
                  </p>
                </MotionCard>

                <MotionCard
                  onClick={() => setTopic('interview')}
                  className={`p-5 rounded-2xl cursor-pointer border transition-all ${
                    topic === 'interview'
                      ? 'bg-[#1b1c3c] border-[#44e2cd] shadow-[0_0_20px_rgba(68,226,205,0.2)]'
                      : 'bg-[#171838]/80 border-[#262747] hover:border-[#313253]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#262747] text-[#44e2cd] flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[22px]">work_outline</span>
                  </div>
                  <h3 className="font-['Fraunces'] text-base font-bold text-[#e1e0ff] mb-1">Workplace & Interviews</h3>
                  <p className="font-['Noto_Sans'] text-xs text-[#e1e0ff] mb-2">जॉब इंटरव्यू • நேர்காணல்</p>
                  <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#dfc0b8]">
                    Self-introduction, project experience, and corporate conversations.
                  </p>
                </MotionCard>

                <MotionCard
                  onClick={() => setTopic('travel')}
                  className={`p-5 rounded-2xl cursor-pointer border transition-all ${
                    topic === 'travel'
                      ? 'bg-[#1b1c3c] border-[#cabeff] shadow-[0_0_20px_rgba(202,190,255,0.2)]'
                      : 'bg-[#171838]/80 border-[#262747] hover:border-[#313253]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#262747] text-[#cabeff] flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[22px]">flight_takeoff</span>
                  </div>
                  <h3 className="font-['Fraunces'] text-base font-bold text-[#e1e0ff] mb-1">Travel & Social Settings</h3>
                  <p className="font-['Noto_Sans'] text-xs text-[#e6deff] mb-2">यात्रा • சுற்றுலா & வழிகள்</p>
                  <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#dfc0b8]">
                    Asking directions, ordering at restaurants, and friendly chit-chat.
                  </p>
                </MotionCard>

                <MotionCard
                  onClick={() => setTopic('jugaad_genius')}
                  className={`p-5 rounded-2xl cursor-pointer border transition-all relative overflow-hidden ${
                    topic === 'jugaad_genius'
                      ? 'bg-[#1b1c3c] border-[#ffb703] shadow-[0_0_20px_rgba(255,183,3,0.3)]'
                      : 'bg-[#171838]/80 border-[#ffb703]/40 hover:border-[#ffb703]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#ffb703]/20 text-[#ffd166] flex items-center justify-center mb-3">
                    <span className="material-symbols-outlined text-[22px]">lightbulb</span>
                  </div>
                  <h3 className="font-['Fraunces'] text-base font-bold text-[#e1e0ff] mb-1">Jugaad Genius</h3>
                  <p className="font-['Noto_Sans'] text-xs text-[#ffd166] mb-2">स्मार्ट देसी समाधान • தீர்வுகள்</p>
                  <p className="font-['Plus_Jakarta_Sans'] text-[12px] text-[#dfc0b8]">
                    Witty quick thinking, smart negotiations, ticket hassles, and street-smart spoken answers.
                  </p>
                </MotionCard>
              </div>
            </div>

            {/* Enter Sanctuary Button */}
            <div className="flex items-center justify-between pt-4">
              <MotionButton
                variant="glass"
                onClick={() => setCurrentView('welcome')}
                className="px-6 py-2.5 rounded-full text-[14px]"
              >
                Back
              </MotionButton>
              <MotionButton
                onClick={handleStartSession}
                className="px-8 py-3.5 rounded-full font-['Epilogue'] text-[16px]"
              >
                <span>
                  {selectedLanguage === 'ta'
                    ? 'Enter Voice Quiz with Malar (மலர்)'
                    : selectedLanguage === 'hi'
                    ? 'Enter Sanctuary with Meera (मीरा)'
                    : 'Enter Sanctuary with Priya'}
                </span>
                <span className="material-symbols-outlined text-[20px] ml-2">arrow_forward</span>
              </MotionButton>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: LIVE CONVERSATION SCREEN (Interactive Voice Loop) */}
        {/* ========================================================= */}
        {currentView === 'conversation' && (
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
            {/* Session Context Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 py-1">
              <div className="flex items-center flex-wrap gap-2 sm:gap-3">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    stopAnyPlayingAudio();
                    setCurrentView('setup');
                  }}
                  className="w-9 h-9 rounded-full bg-[#262747]/70 hover:bg-[#313253] flex items-center justify-center text-[#e1e0ff] border border-[#313253] transition-colors"
                  title="Change setup"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </motion.button>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1b1c3c]/80 border border-[#262747]">
                  <span className="material-symbols-outlined text-[#ff7a59] text-[16px]">
                    {topic === 'daily_life' ? 'local_cafe' : topic === 'interview' ? 'work_outline' : 'flight_takeoff'}
                  </span>
                  <span className="font-['Plus_Jakarta_Sans'] text-[13px] font-medium text-[#e1e0ff]">
                    {demoData.topics[topic]?.name || 'Practice Session'}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#090a2a]/80 text-[#dfc0b8] font-['Space_Grotesk'] text-[11px] uppercase tracking-wider border border-[#262747]">
                  <span className="w-2 h-2 rounded-full bg-[#44e2cd] shadow-[0_0_8px_#44e2cd]"></span>
                  <span>{level === 'beginner' ? 'Beginner • Hinglish Hints' : 'Intermediate • Natural Flow'}</span>
                </div>
              </div>

              {/* Timer, Turn & Finish Button */}
              <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#262747]/60 border border-[#313253]">
                  <span className="material-symbols-outlined text-[#cabeff] text-[16px] animate-pulse">timer</span>
                  <span className="font-['Space_Grotesk'] text-[13px] text-[#e1e0ff] font-semibold tabular-nums">
                    {formatTimer(sessionSeconds)}
                  </span>
                </div>
                <div className="hidden sm:inline-flex items-center px-3 py-1.5 rounded-full bg-[#171838] text-[11px] font-['Space_Grotesk'] text-[#44e2cd] uppercase border border-[#262747]">
                  Turn {turns.length + 1}
                </div>
                <MotionButton
                  variant="secondary"
                  onClick={handleEndSession}
                  className="px-4 py-1.5 rounded-full text-[13px] border border-[#313253]"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1 text-[#ff7a59]">done_all</span>
                  <span>Finish & Score</span>
                </MotionButton>
              </div>
            </div>

            {/* Error Banner */}
            <AnimatePresence>
              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-4 rounded-2xl bg-[#93000a]/25 border border-[#ffb4ab]/40 text-[#ffb4ab] flex items-center justify-between gap-3 text-[14px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">info</span>
                    <span>{errorMessage}</span>
                  </div>
                  <button onClick={() => setShowTroubleshoot(true)} className="underline text-xs hover:text-white">
                    Need Help?
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* DUAL CONVERSATION FLOW CARDS */}
            <div className="flex flex-col gap-5">
              {/* Card 1: AI Coach / Tamil Voice Quiz Tutor */}
              <motion.article
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative rounded-3xl bg-[#1b1c3c]/85 border border-[#262747] backdrop-blur-2xl p-6 sm:p-7 shadow-xl overflow-hidden"
              >
                {/* Tamil Voice Quiz Mode Banner */}
                {selectedLanguage === 'ta' && (
                  <div className="mb-4 px-3.5 py-2 rounded-2xl bg-[#03c6b2]/10 border border-[#03c6b2]/30 flex items-center justify-between gap-3 text-xs text-[#62fae3]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#44e2cd]">quiz</span>
                      <span className="font-semibold font-['Noto_Sans_Tamil']">தமிழ் குரல் வினாடி வினா • உரக்கக் கேட்கிறார் & விளக்கம் தருகிறார்</span>
                    </div>
                    <span className="text-[10px] font-['Space_Grotesk'] text-[#dfc0b8] hidden sm:inline uppercase">
                      Voice Quiz Active
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#262747]/60">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff7a59] via-[#cabeff] to-[#44e2cd] flex items-center justify-center text-[#0f1030] font-['Fraunces'] text-2xl font-bold shadow-md">
                        {selectedLanguage === 'ta' ? 'ம' : selectedLanguage === 'hi' ? 'मी' : 'P'}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#03c6b2] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-['Fraunces'] text-xl font-bold text-[#e1e0ff]">
                          {selectedLanguage === 'ta' ? 'மலர் (Malar)' : selectedLanguage === 'hi' ? 'मीरा (Meera)' : 'Priya'}
                        </h3>
                        <span className="font-['Space_Grotesk'] text-[10px] px-2 py-0.5 rounded-full bg-[#ff7a59]/20 text-[#ffb4a2] uppercase font-bold tracking-wider">
                          {selectedLanguage === 'ta' ? 'தமிழ் வினாடி வினா' : selectedLanguage === 'hi' ? 'हिन्दी स्पोकन गाइड' : 'Bol AI Tutor'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#dfc0b8] mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#44e2cd]"></span>
                        <span>
                          {voiceState === 'speaking'
                            ? (selectedLanguage === 'ta' ? 'உரக்கப் பேசுகிறார்...' : 'Speaking gently...')
                            : (selectedLanguage === 'ta' ? 'உங்கள் பதிலைக் கவனிக்கிறார்' : 'Listening attentively')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Animated Waveform & Replay Button */}
                  <div className="flex items-center gap-3">
                    <AudioWaveform isSpeaking={voiceState === 'speaking'} bars={12} />
                    <MotionButton
                      variant="glass"
                      onClick={() => playTutorVoice(currentReply, lastAudioBase64, 0.95, undefined, getLanguageConfig(selectedLanguage).ttsCode)}
                      className="px-3.5 py-1.5 rounded-full text-[13px]"
                      title="Listen again"
                    >
                      <span className="material-symbols-outlined text-[#44e2cd] text-[17px] mr-1.5">volume_up</span>
                      <span>{selectedLanguage === 'ta' ? 'மீண்டும் கேள்' : 'Replay Audio'}</span>
                    </MotionButton>
                  </div>
                </div>

                {/* Spoken Prompt / Quiz Question */}
                <p className="font-['Fraunces'] text-xl sm:text-2xl leading-relaxed text-[#e1e0ff] font-medium">
                  “{currentReply}”
                </p>

                {/* Guidance / Subtext */}
                {currentHindiSubtext && (
                  <div className="mt-4 pt-3 flex items-center gap-2 border-t border-[#262747]/40 text-[#cabeff]/90 text-[14px]">
                    <span className="material-symbols-outlined text-[#44e2cd] text-[17px] shrink-0">spa</span>
                    <p className="font-['Noto_Sans']">{currentHindiSubtext}</p>
                  </div>
                )}
              </motion.article>

              {/* Card 2: Student Transcript */}
              {currentTranscript && (
                <motion.article
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45 }}
                  className="relative rounded-2xl bg-[#171838]/85 border border-[#262747] backdrop-blur-xl p-5 shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff7a59] animate-pulse shadow-[0_0_8px_#ff7a59]"></div>
                      <span className="font-['Space_Grotesk'] text-[11px] uppercase tracking-widest text-[#dfc0b8] font-semibold">
                        You said
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Live Filler Word Badge */}
                      {currentFillerAnalysis && currentFillerAnalysis.totalCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#ff7a59]/20 border border-[#ff7a59]/40 text-[#ffb4a2] text-[11px] font-['Space_Grotesk'] font-bold">
                          <span className="material-symbols-outlined text-xs">timer_pause</span>
                          <span>
                            {currentFillerAnalysis.totalCount} filler{currentFillerAnalysis.totalCount > 1 ? 's' : ''}:{' '}
                            {currentFillerAnalysis.detectedFillers.map((f) => `"${f.word}"`).join(', ')}
                          </span>
                        </span>
                      ) : currentFillerAnalysis ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#44e2cd]/15 border border-[#44e2cd]/30 text-[#44e2cd] text-[11px] font-['Space_Grotesk'] font-semibold">
                          <span className="material-symbols-outlined text-xs">verified</span>
                          <span>Clean flow · Zero fillers</span>
                        </span>
                      ) : null}

                      <span className="font-['Space_Grotesk'] text-[11px] text-[#44e2cd] flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">mic_external_on</span>
                        Captured with Gnani Prisma STT
                      </span>
                    </div>
                  </div>

                  <p className="font-['Plus_Jakarta_Sans'] text-[16px] text-[#e1e0ff] leading-relaxed">
                    “
                    {currentFillerAnalysis && currentFillerAnalysis.tokens.length > 0 ? (
                      currentFillerAnalysis.tokens.map((token, i) =>
                        token.isFiller ? (
                          <span
                            key={i}
                            title={`Filler crutch: "${token.cleanFiller || token.text}"`}
                            className="bg-[#ff7a59]/25 text-[#ffdad2] px-1.5 py-0.5 rounded-md border border-[#ff7a59]/50 font-semibold mx-0.5 inline-block"
                          >
                            {token.text}
                          </span>
                        ) : (
                          <span key={i}>{token.text} </span>
                        )
                      )
                    ) : (
                      currentTranscript
                    )}
                    ”
                  </p>
                </motion.article>
              )}

              {/* Card 3: Phrasing Polish Cards */}
              <AnimatePresence>
                {currentCorrections.length > 0 && (
                  <motion.section
                    initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 45, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={
                      prefersReducedMotion
                        ? { duration: 0.3 }
                        : { type: 'spring', damping: 18, stiffness: 220, bounce: 0.28 }
                    }
                    className="rounded-3xl bg-[#262747]/95 border border-[#313253] backdrop-blur-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#313253]">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#03c6b2]/20 flex items-center justify-center text-[#44e2cd]">
                          <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>
                        </div>
                        <div>
                          <h3 className="font-['Epilogue'] text-lg font-semibold text-[#e1e0ff] leading-tight">
                            Gentle Phrasing Polish
                          </h3>
                          <p className="font-['Noto_Sans'] text-xs text-[#44e2cd]">
                            सहज सुधार · आपकी बात समझ आ गई, इसे और स्वाभाविक बनाएं
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-[#313253] text-[#dfc0b8] font-['Space_Grotesk'] text-[10px] uppercase tracking-wider">
                        Grammar & Flow
                      </span>
                    </div>

                    <div className="space-y-3">
                      {currentCorrections.map((corr, idx) => (
                        <div key={idx} className="space-y-2">
                          {/* You said row */}
                          <div className="p-3.5 rounded-2xl bg-[#090a2a]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-[#1b1c3c]">
                            <div className="flex items-start sm:items-center gap-2.5">
                              <span className="px-2 py-0.5 rounded-full bg-[#1b1c3c] font-['Space_Grotesk'] text-[10px] uppercase text-[#dfc0b8] shrink-0">
                                You said
                              </span>
                              <span className="text-[15px] text-[#ffb4ab] font-medium line-through decoration-[#ff7a59]">
                                {corr.original}
                              </span>
                            </div>
                          </div>

                          {/* Better row with Hear Native audio */}
                          <div className="p-3.5 rounded-2xl bg-[#1b1c3c]/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-[#262747] shadow-sm">
                            <div className="flex items-start sm:items-center gap-2.5">
                              <span className="px-2 py-0.5 rounded-full bg-[#03c6b2]/30 text-[#62fae3] font-['Space_Grotesk'] text-[10px] uppercase font-bold shrink-0">
                                Better
                              </span>
                              <span className="text-[15px] text-[#44e2cd] font-semibold">
                                {corr.better}
                              </span>
                            </div>
                            <MotionButton
                              variant="secondary"
                              onClick={() => playTutorVoice(corr.better)}
                              className="px-3 py-1 rounded-full text-[12px] shrink-0 text-[#44e2cd]"
                            >
                              <span className="material-symbols-outlined text-[15px] mr-1">volume_up</span>
                              <span>Hear Native</span>
                            </MotionButton>
                          </div>

                          {/* Why row */}
                          <div className="p-3.5 rounded-2xl bg-[#171838]/70 flex items-start gap-2.5 border border-[#262747]">
                            <span className="material-symbols-outlined text-[#ff7a59] text-[19px] shrink-0 mt-0.5">
                              lightbulb
                            </span>
                            <p className="text-[14px] text-[#dfc0b8] leading-relaxed">
                              {corr.why}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>

            {/* Conversation Prompts & Sentence Starters for speaker clarity */}
            <div className="w-full flex flex-col items-center gap-2 pt-2">
              <span className="text-[11px] font-['Space_Grotesk'] uppercase text-[#dfc0b8] tracking-wider">
                {selectedLanguage === 'ta'
                  ? 'பதில் சொல்ல யோசனையா? தொட்டுப் பேசலாம்:'
                  : selectedLanguage === 'hi'
                  ? 'बोलने के लिए संकेत • किसी भी वाक्य पर टैप करें:'
                  : 'Need inspiration? Tap an idea to say:'}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl">
                {(TOPIC_STARTER_PROMPTS[topic] || TOPIC_STARTER_PROMPTS.daily_life).map((item, idx) => {
                  const displayText = selectedLanguage === 'ta' ? item.ta : selectedLanguage === 'hi' ? item.hi : item.en;
                  const speakValue = selectedLanguage === 'ta' ? item.ta : item.en;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setManualText(speakValue);
                        setShowManualInput(true);
                      }}
                      className="px-3 py-1.5 rounded-full bg-[#171838] hover:bg-[#262747] border border-[#262747] hover:border-[#44e2cd] text-xs text-[#dfc0b8] hover:text-[#e1e0ff] transition-all text-left flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-xs text-[#44e2cd]">tips_and_updates</span>
                      <span>“{displayText}”</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CENTER-BOTTOM: 3D GLOWING VOICE ORB MIC BUTTON & LIVE AUDIO FEEDBACK */}
            <div className="flex flex-col items-center justify-center py-4 relative">
              {/* Live Audio Volume Waveform (active when user is recording) */}
              {voiceState === 'recording' && (
                <div className="mb-4 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#ff7a59]/20 text-[#ffb4a2] border border-[#ff7a59]/40 text-xs font-['Space_Grotesk']">
                    <span className="w-2 h-2 rounded-full bg-[#ff7a59] animate-ping"></span>
                    <span>RECORDING ({formatTimer(recordingSeconds)})</span>
                  </div>
                  <AudioWaveform isSpeaking={false} isRecording={true} liveVolume={liveVolume} bars={20} />
                </div>
              )}

              <MotionOrb
                mode="button"
                state={voiceState}
                size="lg"
                onClick={() => {
                  if (voiceState === 'idle') handleStartRecording();
                  else if (voiceState === 'recording') handleStopRecording();
                  else if (voiceState === 'error') handleStartRecording();
                }}
              />

              {/* Status Hint */}
              <div className="mt-4 flex flex-col items-center gap-1 text-center">
                <span className="font-['Space_Grotesk'] text-[13px] font-semibold text-[#e1e0ff] tracking-wide">
                  {voiceState === 'recording'
                    ? 'Listening to your voice... (Tap orb to finish)'
                    : voiceState === 'transcribing'
                    ? 'Transcribing your words with Gnani Prisma STT...'
                    : voiceState === 'thinking'
                    ? 'Priya is preparing your coaching reply...'
                    : voiceState === 'speaking'
                    ? 'Priya is speaking out loud...'
                    : 'Tap orb or press Spacebar to speak'}
                </span>
                <span className="font-['Noto_Sans'] text-xs text-[#dfc0b8]">
                  {voiceState === 'recording' ? 'आराम से बोलें, हम सुन रहे हैं...' : 'बोलो, गलती से मत डरो'}
                </span>
              </div>

              {/* Cancel Button during recording */}
              {voiceState === 'recording' && (
                <button
                  type="button"
                  onClick={handleCancelRecording}
                  className="mt-3 px-4 py-1 rounded-full bg-[#262747] text-[#ffb4ab] text-xs hover:bg-[#313253] transition-colors"
                >
                  Cancel this recording
                </button>
              )}

              {/* Text Fallback Option */}
              <div className="mt-3">
                <button
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="text-xs text-[#dfc0b8] hover:text-[#44e2cd] underline transition-colors"
                >
                  {showManualInput ? 'Hide text fallback' : 'Or type your sentence instead of speaking'}
                </button>
              </div>

              {showManualInput && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualText.trim()) {
                      processTurn(manualText.trim());
                      setManualText('');
                    }
                  }}
                  className="mt-3 flex items-center gap-2 w-full max-w-md"
                >
                  <input
                    type="text"
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="e.g. I went to the market today..."
                    className="flex-1 px-4 py-2.5 rounded-full bg-[#1b1c3c] border border-[#262747] text-[#e1e0ff] placeholder-[#a68b84] text-sm focus:outline-none focus:border-[#44e2cd]"
                  />
                  <MotionButton type="submit" className="px-5 py-2.5 rounded-full text-sm">
                    Send
                  </MotionButton>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: ASYNCHRONOUS REPORT GENERATION PIPELINE           */}
        {/* ========================================================= */}
        {currentView === 'generating_report' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl mx-auto px-4 py-16 flex flex-col items-center text-center my-auto"
          >
            {/* Center Pulsing Orb */}
            <div className="relative mb-8">
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-[#ff7a59] via-[#cabeff] to-[#44e2cd] flex items-center justify-center p-1 shadow-[0_0_50px_rgba(255,122,89,0.35)] animate-spin-slow">
                <div className="w-full h-full rounded-full bg-[#0f1030] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[36px] text-[#44e2cd] animate-pulse">
                    auto_awesome
                  </span>
                </div>
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff7a59] animate-ping"></span>
            </div>

            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1b1c3c] border border-[#262747] text-xs font-['Space_Grotesk'] text-[#44e2cd] uppercase tracking-wider mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#44e2cd] animate-pulse"></span>
              <span>Asynchronous Diagnostic Pipeline</span>
            </div>

            <h2 className="font-['Fraunces'] text-3xl sm:text-4xl font-bold text-[#e1e0ff] mb-2">
              Evaluating your speaking nuance...
            </h2>
            <p className="font-['Noto_Sans'] text-sm sm:text-base text-[#dfc0b8] mb-8 max-w-md">
              प्रिया आपके बोलने के तरीके, प्रवाह और व्याकरण का विस्तृत विश्लेषण कर रही हैं...
            </p>

            {/* Diagnostic Progress Bar */}
            <div className="w-full max-w-md bg-[#171838] rounded-full h-3 mb-8 overflow-hidden border border-[#262747] p-0.5">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#ff7a59] via-[#cabeff] to-[#44e2cd]"
                animate={{ width: `${analysisProgress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Diagnostic Milestones Checklist */}
            <div className="w-full max-w-md space-y-3 text-left">
              {ASYNC_ANALYSIS_STAGES.map((stage, idx) => {
                const isPassed = analysisStage > idx;
                const isCurrent = analysisStage === idx;
                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3 ${
                      isPassed
                        ? 'bg-[#1b1c3c]/90 border-[#44e2cd]/40 text-[#e1e0ff]'
                        : isCurrent
                        ? 'bg-[#262747] border-[#ff7a59] text-[#e1e0ff] shadow-md'
                        : 'bg-[#171838]/40 border-[#262747]/40 text-[#a68b84]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isPassed
                          ? 'bg-[#03c6b2]/20 text-[#44e2cd]'
                          : isCurrent
                          ? 'bg-[#ff7a59]/20 text-[#ffb4a2] animate-pulse'
                          : 'bg-[#1b1c3c] text-[#a68b84]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {isPassed ? 'check' : stage.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-['Epilogue'] text-xs font-bold leading-tight">
                        {stage.title}
                      </div>
                      <div className="text-[11px] text-[#dfc0b8] mt-0.5 leading-snug">
                        {stage.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 5: GREAT SESSION MASTERY REPORT                      */}
        {/* ========================================================= */}
        {currentView === 'summary' && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center text-center"
          >
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1b1c3c]/90 border border-[#262747] mb-3">
              <span className="w-2 h-2 rounded-full bg-[#44e2cd] animate-ping"></span>
              <span className="font-['Space_Grotesk'] text-[11px] uppercase text-[#44e2cd] tracking-widest font-semibold">
                Session Mastery
              </span>
              <span className="text-[#a68b84] text-xs">•</span>
              <span className="font-['Plus_Jakarta_Sans'] text-xs text-[#dfc0b8]">{demoData.topics[topic]?.name}</span>
              <span className="text-[#a68b84] text-xs">•</span>
              <span className="font-['Space_Grotesk'] text-xs text-[#ffb4a2] font-bold">
                {progress.streak}-DAY STREAK
              </span>
            </div>

            <h1 className="font-['Fraunces'] text-4xl sm:text-6xl font-bold tracking-tight bg-gradient-to-r from-[#ffdad2] via-[#ff7a59] to-[#44e2cd] bg-clip-text text-transparent mb-2">
              Great session!
            </h1>
            <p className="font-['Noto_Sans'] text-base sm:text-lg text-[#62fae3] font-medium mb-1">
              शानदार बोलचाल! आपकी हिचकिचाहट हर दिन कम हो रही है और आत्मविश्वास बढ़ रहा है।
            </p>
            <p className="font-['Plus_Jakarta_Sans'] text-sm sm:text-[15px] text-[#dfc0b8] max-w-lg mb-8">
              You spoke with natural cadence and took healthy speaking risks. Here is your evaluation report:
            </p>

            {/* SUMMARY METRICS STRIP (Total Output, Pace WPM, Silence Index, CEFR Benchmark) */}
            <div className="relative z-10 w-full max-w-4xl mx-auto mb-8 p-4 rounded-2xl bg-[#171838]/90 border border-[#262747] backdrop-blur-md shadow-lg">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#262747] text-center">
                <div className="flex flex-col items-center justify-center p-1">
                  <span className="font-['Space_Grotesk'] text-[10px] text-[#dfc0b8] uppercase tracking-wider">
                    Total Output
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-['Space_Grotesk'] text-xl font-bold text-[#e1e0ff]">
                      {latestSummary.totalWords || 215}
                    </span>
                    <span className="text-xs text-[#dfc0b8]">words</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-1">
                  <span className="font-['Space_Grotesk'] text-[10px] text-[#dfc0b8] uppercase tracking-wider">
                    Speaking Pace
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-['Space_Grotesk'] text-xl font-bold text-[#44e2cd]">
                      {latestSummary.wpmEstimate || 124}
                    </span>
                    <span className="text-xs text-[#44e2cd]">WPM (Optimal)</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-1 pt-3 sm:pt-1">
                  <span className="font-['Space_Grotesk'] text-[10px] text-[#dfc0b8] uppercase tracking-wider">
                    Hesitation Index
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-['Space_Grotesk'] text-xl font-bold text-[#ff7a59]">
                      {latestSummary.hesitationDropPercent || -40}%
                    </span>
                    <span className="text-xs text-[#ffb4a2]">calm pauses</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-1 pt-3 sm:pt-1">
                  <span className="font-['Space_Grotesk'] text-[10px] text-[#dfc0b8] uppercase tracking-wider">
                    CEFR Benchmark
                  </span>
                  <div className="mt-1">
                    <span className="px-2.5 py-1 rounded-full bg-[#262747] font-['Space_Grotesk'] text-[11px] font-bold text-[#cabeff]">
                      {latestSummary.cefrLevel || 'B1 Threshold'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* TRIO OF ANIMATED SCORE RINGS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10 text-center">
              <ScoreRing
                label="Fluency"
                score={Number(latestSummary.scores?.fluency || 8.4)}
                gradientId="fluencyRing"
                gradientColors={['#ff7a59', '#ffb4a2']}
                subtitle="Natural flow with minimal hesitation pauses."
                badge="Top Momentum"
                badgeColor="#ff7a59"
                delay={0.1}
              />

              <ScoreRing
                label="Grammar & Phrasing"
                score={Number(latestSummary.scores?.grammar || 7.8)}
                gradientId="grammarRing"
                gradientColors={['#44e2cd', '#03c6b2']}
                subtitle="Proper verb tenses and preposition choices."
                badge="Consistency"
                badgeColor="#44e2cd"
                delay={0.25}
              />

              <ScoreRing
                label="Confidence"
                score={Number(latestSummary.scores?.confidence || 8.8)}
                gradientId="confidenceRing"
                gradientColors={['#cabeff', '#a596eb']}
                subtitle="Zero hesitation retreat moments detected."
                badge="Courage Metric"
                badgeColor="#cabeff"
                delay={0.4}
              />
            </div>

            {/* Top 3 Areas to Polish & Mentor Advice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left mb-10">
              <MotionCard delay={0.2} className="p-6 rounded-3xl bg-[#171838]/85 border border-[#262747]">
                <div className="flex items-center gap-2 mb-4 text-[#ffb4ab]">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                  <h3 className="font-['Epilogue'] font-bold text-[#e1e0ff]">Top Areas to Polish</h3>
                </div>
                <div className="space-y-3">
                  {(latestSummary.topMistakes || demoData.defaultSummary.topMistakes).map(
                    (mistake: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2.5 text-sm text-[#dfc0b8]">
                        <span className="w-5 h-5 rounded-full bg-[#ff7a59]/20 text-[#ffb4a2] flex items-center justify-center text-xs shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{mistake}</span>
                      </div>
                    )
                  )}
                </div>
              </MotionCard>

              <MotionCard delay={0.3} className="p-6 rounded-3xl bg-[#1b1c3c] border border-[#44e2cd]/40 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3 text-[#44e2cd]">
                  <span className="material-symbols-outlined text-[22px]">lightbulb</span>
                  <h3 className="font-['Epilogue'] font-bold text-[#e1e0ff]">Priya&apos;s Tip for Tomorrow</h3>
                </div>
                <p className="font-['Plus_Jakarta_Sans'] text-[15px] text-[#e1e0ff] leading-relaxed mb-4">
                  “{latestSummary.tip || demoData.defaultSummary.tip}”
                </p>
                <div className="p-3 rounded-2xl bg-[#090a2a]/60 text-xs text-[#cabeff] font-['Noto_Sans']">
                  {latestSummary.hindiTip || "छोटे वाक्यों का प्रयोग करें — जब विचार साफ़ होंगे, तो शब्द खुद-ब-खुद निकलेंगे।"}
                </div>
              </MotionCard>
            </div>

            {/* FILLER WORD & HESITATION DETOX CARD */}
            <div className="w-full mb-8 text-left">
              <FillerDetoxCard summary={sessionFillerSummary} />
            </div>

            {/* ACTION DOCK & REPORT DOWNLOAD FILE EXPORTER */}
            <div className="flex flex-col items-center gap-4 w-full max-w-xl mx-auto">
              {/* Featured Viral Share Trigger */}
              <button
                type="button"
                onClick={() => setIsScorecardOpen(true)}
                className="w-full group relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#ff7a59] via-[#ff9b71] to-[#44e2cd] text-[#3d0e04] font-bold shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left mb-1"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#171838]/20 flex items-center justify-center text-2xl shadow-inner">
                    📸
                  </div>
                  <div>
                    <div className="font-['Fraunces'] text-lg sm:text-xl font-bold leading-tight flex items-center justify-center sm:justify-start gap-2">
                      <span>Share Daily Fluency Scorecard</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#3d0e04] text-[#ffdad2] font-['Space_Grotesk'] uppercase tracking-wider">
                        Day {progress.streak}
                      </span>
                    </div>
                    <p className="text-xs text-[#52170b] font-medium font-['Plus_Jakarta_Sans']">
                      1-Click WhatsApp & LinkedIn Share with #GreatIndianAIInternshipChallenge & #GnaniAI
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3d0e04] text-[#ffdad2] text-xs font-bold font-['Space_Grotesk'] uppercase tracking-wider group-hover:bg-[#1b1c3c] transition-colors shrink-0">
                  <span>Open Card</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </button>

              {/* Primary Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                <MotionButton
                  onClick={() => setCurrentView('setup')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-full font-['Epilogue'] text-[15px]"
                >
                  <span className="material-symbols-outlined text-[19px] mr-2">refresh</span>
                  <span>Practise Again</span>
                </MotionButton>
                <MotionButton
                  variant="secondary"
                  onClick={() => setCurrentView('progress')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-full text-[15px]"
                >
                  <span
                    className="material-symbols-outlined text-[#ff7a59] text-[20px] mr-2"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    local_fire_department
                  </span>
                  <span>View Speaking Streak</span>
                </MotionButton>
              </div>

              {/* Secondary Report File & Copy Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#171838] hover:bg-[#262747] text-[#44e2cd] border border-[#262747] hover:border-[#44e2cd] text-xs font-semibold transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  <span>Download Evaluation Report (.md)</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyReport}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#171838] hover:bg-[#262747] text-[#dfc0b8] hover:text-[#e1e0ff] border border-[#262747] text-xs font-semibold transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  <span>Copy Summary Notes</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* VIEW 6: SPEAKING PROGRESS (Streak & Fluency Trajectory)    */}
        {/* ========================================================= */}
        {currentView === 'progress' && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col gap-6 sm:gap-8"
          >
            {/* Header: Streak Showcase */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#262747] border border-[#313253]">
                    <span
                      className="material-symbols-outlined text-[#ff7a59] text-[18px] animate-pulse"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      local_fire_department
                    </span>
                    <span className="font-['Space_Grotesk'] text-[12px] text-[#ffb4a2] tracking-wider uppercase font-bold">
                      {progress.streak}-Day Streak
                    </span>
                    <span className="font-['Noto_Sans'] text-xs text-[#dfc0b8]">लगातार अभ्यास</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#171838] text-[#cabeff] text-xs">
                    <span className="material-symbols-outlined text-sm">shield</span>
                    <span>Consistency Shield Active</span>
                  </div>
                </div>

                <h1 className="font-['Fraunces'] text-3xl sm:text-5xl font-bold text-[#e1e0ff]">
                  Aapki Speaking{' '}
                  <span className="italic bg-gradient-to-r from-[#ffb4a2] via-[#ff7a59] to-[#44e2cd] bg-clip-text text-transparent">
                    Progress
                  </span>
                </h1>
                <p className="font-['Noto_Sans'] text-[14px] sm:text-[15px] text-[#dfc0b8] mt-1">
                  हर दिन 5 मिनट बोलने से हिचकिचाहट हमेशा के लिए दूर हो जाती है।
                </p>
              </div>

              <div className="flex items-center gap-3 self-start lg:self-end flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsScorecardOpen(true)}
                  className="px-5 py-3 rounded-full bg-[#1b1c3c] hover:bg-[#262747] border border-[#ff7a59]/40 hover:border-[#ff7a59] text-[#ffb4a2] text-xs font-bold font-['Space_Grotesk'] uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                >
                  <span className="text-base">📸</span>
                  <span>Share Scorecard</span>
                </button>
                <MotionButton
                  onClick={() => setCurrentView('setup')}
                  className="px-7 py-3 rounded-full text-sm font-bold"
                >
                  <span className="material-symbols-outlined text-[18px] mr-2">mic</span>
                  <span>Start Today&apos;s Session</span>
                </MotionButton>
              </div>
            </div>

            {/* Trajectory Chart Card */}
            <MotionCard className="p-6 rounded-3xl bg-[#1b1c3c]/85 border border-[#262747] backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <span className="font-['Space_Grotesk'] text-[11px] uppercase tracking-wider text-[#44e2cd] font-semibold">
                    Acoustic & Fluency Tracking
                  </span>
                  <h3 className="font-['Epilogue'] text-xl font-bold text-[#e1e0ff]">
                    Speaking Score Trajectory
                  </h3>
                  <p className="text-xs text-[#dfc0b8]">Continuous vocal measurement across recent practice cycles</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff7a59]"></span>
                    <span className="text-[#dfc0b8]">Fluency</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#44e2cd]"></span>
                    <span className="text-[#dfc0b8]">Confidence</span>
                  </div>
                </div>
              </div>

              {/* Animated SVG Line Chart */}
              <div className="w-full h-52 relative flex items-end">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="30" x2="500" y2="30" stroke="#262747" strokeDasharray="3 3" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#262747" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#262747" strokeDasharray="3 3" />

                  {/* Gradient Area Fill */}
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff7a59" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#ff7a59" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <polygon
                    points="0,110 100,95 200,80 300,55 400,45 500,30 500,150 0,150"
                    fill="url(#chartGrad)"
                  />

                  {/* Trend Path */}
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    d="M 0,110 L 100,95 L 200,80 L 300,55 L 400,45 L 500,30"
                    fill="none"
                    stroke="#ff7a59"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
                    d="M 0,125 L 100,105 L 200,90 L 300,70 L 400,50 L 500,38"
                    fill="none"
                    stroke="#44e2cd"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                  />

                  {/* Data Point Dots */}
                  {[
                    { cx: 0, cy: 110 },
                    { cx: 100, cy: 95 },
                    { cx: 200, cy: 80 },
                    { cx: 300, cy: 55 },
                    { cx: 400, cy: 45 },
                    { cx: 500, cy: 30 },
                  ].map((p, i) => (
                    <circle
                      key={i}
                      cx={p.cx}
                      cy={p.cy}
                      r="4.5"
                      fill="#0f1030"
                      stroke="#ff7a59"
                      strokeWidth="2.5"
                    />
                  ))}
                </svg>
              </div>

              <div className="flex justify-between items-center text-xs text-[#a68b84] mt-4 font-['Space_Grotesk']">
                <span>Day 1 (Intro)</span>
                <span>Day 3</span>
                <span>Day 5</span>
                <span>Day 7</span>
                <span>Day 10</span>
                <span className="text-[#44e2cd] font-bold">Today (8.6 Peak)</span>
              </div>
            </MotionCard>
          </motion.div>
        )}
      </main>

      {/* ========================================================= */}
      {/* GLOBAL SANCTUARY FOOTER (Fully Responsive 4-Column Design) */}
      {/* ========================================================= */}
      <footer className="w-full border-t border-[#262747]/70 bg-[#090a2a]/95 text-xs text-[#a68b84] relative z-20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-10 sm:py-14">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            {/* Col 1 & 2: Brand & Mission */}
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-['Fraunces'] text-2xl font-bold text-[#e1e0ff]">Bol</span>
                <span className="w-2 h-2 rounded-full bg-[#ff7a59] shadow-[0_0_10px_#ff7a59]"></span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#1b1c3c] text-[#44e2cd] font-['Space_Grotesk'] uppercase tracking-wider font-semibold">
                  Speaking Sanctuary
                </span>
              </div>
              <p className="text-[#dfc0b8] text-[13px] leading-relaxed max-w-md font-['Plus_Jakarta_Sans']">
                A non-judgmental spoken English sanctuary created for Hindi native speakers to talk fluently, calmly, and fearlessly.
              </p>
              <div className="flex items-center gap-2 pt-2 text-[#44e2cd] font-['Space_Grotesk'] text-[11px] tracking-widest uppercase font-semibold">
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                <span>Powered by Gnani AI Acoustic Engine (Timbre & Prisma)</span>
              </div>
            </div>

            {/* Col 3: Sanctuary Realms & Links */}
            <div className="space-y-3">
              <div className="text-[#e1e0ff] font-['Epilogue'] font-semibold text-sm tracking-wide">
                Sanctuary Realms
              </div>
              <ul className="space-y-2 text-[#dfc0b8] text-xs font-['Plus_Jakarta_Sans']">
                <li>
                  <button onClick={() => setCurrentView('setup')} className="hover:text-[#44e2cd] transition-colors text-left">
                    Daily Hinglish Topics
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('setup')} className="hover:text-[#44e2cd] transition-colors text-left">
                    Job Interview Prep
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('setup')} className="hover:text-[#44e2cd] transition-colors text-left">
                    Travel & Social Chats
                  </button>
                </li>
                <li>
                  <button onClick={() => setCurrentView('progress')} className="hover:text-[#44e2cd] transition-colors text-left">
                    Speaking Streak & Chart
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Language & Audio Safety */}
            <div className="space-y-3">
              <div className="text-[#e1e0ff] font-['Epilogue'] font-semibold text-sm tracking-wide">
                Language & Safety
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-2.5 py-1 rounded-full bg-[#1b1c3c] text-[#e1e0ff] text-xs border border-[#262747]">
                  English (India)
                </span>
                <span className="px-2.5 py-1 rounded-full bg-[#171838] text-[#ffdad2] text-xs font-['Noto_Sans'] border border-[#262747]">
                  हिन्दी / Hinglish
                </span>
              </div>
              <p className="text-[#a68b84] text-xs leading-relaxed pt-1">
                Zero judgment. Zero microphone storage. Audio is evaluated in memory and discarded.
              </p>
              <div className="flex items-center gap-3 pt-1 text-xs">
                <button onClick={() => setShowTroubleshoot(true)} className="text-[#44e2cd] hover:underline">
                  Audio Guide
                </button>
                <span className="text-[#313253]">•</span>
                <button onClick={() => setShowSettings(true)} className="text-[#44e2cd] hover:underline">
                  AI Settings
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-[#262747]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#a68b84]">
            <div>© 2026 Bol (Gnani AI). All rights reserved.</div>
            <div className="flex items-center gap-4 text-[#dfc0b8]">
              <span>Privacy Sanctuary</span>
              <span>•</span>
              <span>Voice Ethics</span>
              <span>•</span>
              <button onClick={() => setShowTroubleshoot(true)} className="hover:text-[#44e2cd]">
                Help & Mic Setup
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Troubleshoot & Audio Guide Modal */}
      <AnimatePresence>
        {showTroubleshoot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-[#1b1c3c] border border-[#262747] p-6 text-left relative shadow-2xl"
            >
              <button
                onClick={() => setShowTroubleshoot(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#262747] text-[#dfc0b8] hover:text-[#e1e0ff] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>

              <div className="flex items-center gap-2 mb-2 text-[#44e2cd]">
                <span className="material-symbols-outlined text-[20px]">help_outline</span>
                <h2 className="font-['Fraunces'] text-2xl font-bold text-[#e1e0ff]">
                  Audio & Voice Guide
                </h2>
              </div>
              <p className="text-xs text-[#dfc0b8] mb-5">
                Quick diagnostic tips for microphone permissions and crystal-clear acoustic feedback.
              </p>

              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#090a2a] border border-[#262747] mb-5 text-xs">
                <button
                  onClick={() => setTroubleTab('all')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                    troubleTab === 'all' ? 'bg-[#262747] text-[#e1e0ff] font-bold' : 'text-[#dfc0b8]'
                  }`}
                >
                  All Tips
                </button>
                <button
                  onClick={() => setTroubleTab('mic')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                    troubleTab === 'mic' ? 'bg-[#ff7a59] text-[#701500] font-bold' : 'text-[#dfc0b8]'
                  }`}
                >
                  Microphone
                </button>
                <button
                  onClick={() => setTroubleTab('audio')}
                  className={`flex-1 py-1.5 rounded-lg text-center transition-colors ${
                    troubleTab === 'audio' ? 'bg-[#44e2cd] text-[#003731] font-bold' : 'text-[#dfc0b8]'
                  }`}
                >
                  Speakers
                </button>
              </div>

              {/* Content Panels */}
              <div className="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
                {(troubleTab === 'mic' || troubleTab === 'all') && (
                  <div className="p-4 rounded-2xl bg-[#171838] border border-[#262747]">
                    <div className="flex items-center gap-2 text-[#ffb4ab] mb-1">
                      <span className="material-symbols-outlined text-[20px]">mic_off</span>
                      <h4 className="font-['Epilogue'] font-bold text-sm">Microphone Access Help</h4>
                    </div>
                    <p className="text-xs text-[#dfc0b8] leading-relaxed mb-2">
                      Browsers require microphone permission before recording. Your voice is processed in memory and never sold or stored.
                    </p>
                    <div className="p-2.5 rounded-xl bg-[#090a2a] text-xs text-[#ffdad2] font-['Noto_Sans']">
                      <strong>कैसे चालू करें:</strong> ब्राउज़र एड्रेस बार में लॉक (Lock/Tune) आइकॉन पर क्लिक करें और Microphone को <strong>‘Allow’</strong> करें।
                    </div>
                  </div>
                )}

                {(troubleTab === 'audio' || troubleTab === 'all') && (
                  <div className="p-4 rounded-2xl bg-[#171838] border border-[#262747]">
                    <div className="flex items-center gap-2 text-[#44e2cd] mb-1">
                      <span className="material-symbols-outlined text-[20px]">volume_up</span>
                      <h4 className="font-['Epilogue'] font-bold text-sm">Audio & Speaker Check</h4>
                    </div>
                    <p className="text-xs text-[#dfc0b8] leading-relaxed mb-2">
                      If you cannot hear Priya&apos;s voice responses, check if your system volume is unmuted.
                    </p>
                    <MotionButton
                      variant="glass"
                      onClick={() =>
                        playTutorVoice("Namaste! This is Priya. Your speakers are working beautifully.")
                      }
                      className="px-3.5 py-1 rounded-full text-xs text-[#44e2cd]"
                    >
                      <span className="material-symbols-outlined text-sm mr-1">play_arrow</span>
                      <span>Play Speaker Test Audio</span>
                    </MotionButton>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <MotionButton onClick={() => setShowTroubleshoot(false)} className="px-6 py-2 rounded-full text-xs">
                  Got It
                </MotionButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-3xl bg-[#1b1c3c] border border-[#262747] p-6 text-left relative shadow-2xl"
            >
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#262747] text-[#dfc0b8] hover:text-[#e1e0ff] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>

              <div className="flex items-center gap-2 mb-2 text-[#ff7a59]">
                <span className="material-symbols-outlined text-[20px]">settings</span>
                <h2 className="font-['Fraunces'] text-2xl font-bold text-[#e1e0ff]">
                  Settings & AI Integration
                </h2>
              </div>
              <p className="text-xs text-[#dfc0b8] mb-6">
                Configure your Gnani AI keys (Prisma STT & Timbre TTS) and language model provider.
              </p>

              <div className="space-y-4 text-left">
                {/* Demo Mode Toggle */}
                <div className="p-4 rounded-2xl bg-[#171838] border border-[#262747] flex items-center justify-between">
                  <div>
                    <h4 className="font-['Epilogue'] text-sm font-bold text-[#e1e0ff]">Demo Mode (Offline Fallback)</h4>
                    <p className="text-xs text-[#dfc0b8]">Works immediately without any API keys or network usage.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDemoMode(!demoMode)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                      demoMode ? 'bg-[#ff7a59]' : 'bg-[#313253]'
                    }`}
                  >
                    <motion.div
                      layout
                      className="bg-white w-4 h-4 rounded-full shadow-md"
                    />
                  </button>
                </div>

                {/* Gnani API Key */}
                <div>
                  <label className="block text-xs font-['Space_Grotesk'] text-[#dfc0b8] uppercase mb-1">
                    Gnani API Key (Prisma STT & Timbre TTS)
                  </label>
                  <input
                    type="password"
                    value={gnaniKey}
                    onChange={(e) => setGnaniKey(e.target.value)}
                    placeholder="Auto-configured via server .env.local (or paste custom key)"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#171838] border border-[#262747] text-[#e1e0ff] placeholder-[#a68b84] text-xs focus:outline-none focus:border-[#ff7a59]"
                  />
                </div>

                {/* LLM Key */}
                <div>
                  <label className="block text-xs font-['Space_Grotesk'] text-[#dfc0b8] uppercase mb-1">
                    Language Model Key (Gemini / Claude / OpenAI)
                  </label>
                  <input
                    type="password"
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="Optional: Google Gemini API key or OpenAI key"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#171838] border border-[#262747] text-[#e1e0ff] placeholder-[#a68b84] text-xs focus:outline-none focus:border-[#44e2cd]"
                  />
                </div>

                {/* Voice Test Button */}
                <div className="pt-2">
                  <MotionButton
                    variant="glass"
                    onClick={async () => {
                      const testText = "Namaste! This is Priya from Bol voice coach. Your Gnani audio is set up perfectly.";
                      try {
                        const res = await fetch('/api/speak', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(gnaniKey ? { 'x-api-key': gnaniKey } : {}),
                          },
                          body: JSON.stringify({
                            text: testText,
                            language: selectedLanguage,
                            voice: getLanguageConfig(selectedLanguage).ttsVoice,
                            ...(gnaniKey ? { apiKey: gnaniKey } : {}),
                          }),
                        });
                        if (res.ok) {
                          const arrayBuf = await res.arrayBuffer();
                          const b64 = arrayBufferToBase64(arrayBuf);
                          playTutorVoice(testText, b64, 0.95, undefined, getLanguageConfig(selectedLanguage).ttsCode);
                          return;
                        }
                      } catch (e) {
                        console.warn('Voice test failed, using Web Speech:', e);
                      }
                      playTutorVoice(testText);
                    }}
                    className="px-4 py-2 rounded-full text-xs text-[#44e2cd]"
                  >
                    <span className="material-symbols-outlined text-sm mr-1.5">volume_up</span>
                    <span>Test Gnani AI Voice</span>
                  </MotionButton>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-5 py-2 rounded-full bg-[#171838] text-[#dfc0b8] text-xs hover:text-[#e1e0ff]"
                >
                  Cancel
                </button>
                <MotionButton onClick={handleSaveSettings} className="px-6 py-2 rounded-full text-xs">
                  Save Preferences
                </MotionButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp & LinkedIn Shareable Fluency Scorecard Modal */}
      <FluencyScorecardModal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        streak={progress.streak}
        scores={latestSummary.scores || { fluency: 8.4, grammar: 7.8, confidence: 8.8 }}
        cefrLevel={latestSummary.cefrLevel || 'B2 Independent'}
        wpmEstimate={latestSummary.wpmEstimate || 124}
        totalWords={latestSummary.totalWords || 215}
        topicName={demoData.topics[topic]?.name || 'Placement & Daily Practice'}
        fillerSummary={sessionFillerSummary}
      />
    </div>
  );
}
