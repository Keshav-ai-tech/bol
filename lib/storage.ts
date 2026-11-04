export interface SessionTurn {
  transcript: string;
  reply: string;
  corrections: Array<{
    original: string;
    better: string;
    why: string;
  }>;
}

export interface PracticeSession {
  id: string;
  date: string;
  level: string;
  topic: string;
  durationMinutes: number;
  turns: SessionTurn[];
  scores: {
    fluency: number;
    grammar: number;
    confidence: number;
  };
  topMistakes: string[];
  tip: string;
  fillerStats?: {
    totalFillers: number;
    detoxGrade: string;
  };
}

export interface UserProgress {
  streak: number;
  lastPracticeDate: string;
  totalSessions: number;
  totalMinutes: number;
}

const SESSIONS_KEY = 'bol_sessions';
const PROGRESS_KEY = 'bol_progress';

export function getStoredSessions(): PracticeSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) {
      // Default initial mock history so chart displays beautifully on first visit
      const initial: PracticeSession[] = [
        {
          id: 'session-1',
          date: '2026-10-23',
          level: 'beginner',
          topic: 'daily_life',
          durationMinutes: 4,
          turns: [],
          scores: { fluency: 6.8, grammar: 6.2, confidence: 7.0 },
          topMistakes: ["Past tense verbs", "Hesitation pauses"],
          tip: "Focus on speaking without pausing mid-word.",
        },
        {
          id: 'session-2',
          date: '2026-10-24',
          level: 'beginner',
          topic: 'travel',
          durationMinutes: 5,
          turns: [],
          scores: { fluency: 7.2, grammar: 6.6, confidence: 7.5 },
          topMistakes: ["Preposition choice in questions"],
          tip: "Use 'Could you please tell me' for polite travel queries.",
        },
        {
          id: 'session-3',
          date: '2026-10-25',
          level: 'beginner',
          topic: 'interview',
          durationMinutes: 6,
          turns: [],
          scores: { fluency: 7.6, grammar: 7.0, confidence: 7.9 },
          topMistakes: ["Introduction phrasing ('Myself...')"],
          tip: "Start with 'My name is' or 'I am'.",
        },
        {
          id: 'session-4',
          date: '2026-10-26',
          level: 'beginner',
          topic: 'daily_life',
          durationMinutes: 5,
          turns: [],
          scores: { fluency: 8.0, grammar: 7.4, confidence: 8.3 },
          topMistakes: ["Missing articles before nouns"],
          tip: "Remember to use 'the' before specific places like 'the market'.",
        },
        {
          id: 'session-5',
          date: '2026-10-27',
          level: 'beginner',
          topic: 'daily_life',
          durationMinutes: 4,
          turns: [],
          scores: { fluency: 8.4, grammar: 7.8, confidence: 8.8 },
          topMistakes: ["Past continuous overlap ('was went')"],
          tip: "Use simple past 'went' directly.",
        },
      ];
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read sessions from localStorage:', err);
    return [];
  }
}

export function saveSession(session: PracticeSession): void {
  if (typeof window === 'undefined') return;
  try {
    const sessions = getStoredSessions();
    sessions.unshift(session);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));

    // Update streak and progress
    const progress = getStoredProgress();
    const today = new Date().toISOString().split('T')[0];

    let newStreak = progress.streak;
    if (progress.lastPracticeDate) {
      const last = new Date(progress.lastPracticeDate);
      const curr = new Date(today);
      const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 3600 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays === 0) {
        // already practiced today, keep streak
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const updatedProgress: UserProgress = {
      streak: newStreak,
      lastPracticeDate: today,
      totalSessions: progress.totalSessions + 1,
      totalMinutes: progress.totalMinutes + (session.durationMinutes || 4),
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(updatedProgress));
  } catch (err) {
    console.error('Failed to save session to localStorage:', err);
  }
}

export function getStoredProgress(): UserProgress {
  if (typeof window === 'undefined') {
    return { streak: 5, lastPracticeDate: '2026-10-27', totalSessions: 5, totalMinutes: 24 };
  }
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) {
      const initial: UserProgress = {
        streak: 5,
        lastPracticeDate: '2026-10-27',
        totalSessions: 5,
        totalMinutes: 24,
      };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch (err) {
    return { streak: 5, lastPracticeDate: '2026-10-27', totalSessions: 5, totalMinutes: 24 };
  }
}
