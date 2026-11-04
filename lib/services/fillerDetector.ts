/**
 * Filler Word & Hesitation Detector for Bol
 * Specialised for Indian speakers code-mixing in Hinglish, Tanglish, and English.
 * Detects subconscious filler words like 'matlab', 'actually', 'basically', 'like', 'you know', 'umm', 'uhh'.
 */

export interface DetectedFiller {
  word: string;
  count: number;
}

export interface FillerToken {
  text: string;
  isFiller: boolean;
  cleanFiller?: string;
}

export interface FillerAnalysis {
  totalCount: number;
  uniqueCount: number;
  detectedFillers: DetectedFiller[];
  tokens: FillerToken[];
  fillerRatioPercent: number; // Percentage of total words that were fillers
  detoxGrade: 'A+' | 'A' | 'B' | 'C' | 'Needs Attention';
  feedbackText: string;
}

export interface SessionFillerSummary {
  totalWords: number;
  totalFillers: number;
  fillerRatioPercent: number;
  fillersPer100Words: number;
  topFillers: DetectedFiller[];
  detoxGrade: 'A+' | 'A' | 'B' | 'C' | 'Needs Attention';
  headline: string;
  actionableTip: string;
}

// Multi-word filler phrases to check first
const MULTI_WORD_FILLERS = [
  'you know',
  'kind of',
  'sort of',
  'at the end of the day',
  'to be honest',
];

// Single word fillers common in Indian spoken English and Hinglish
const SINGLE_WORD_FILLERS = new Set([
  'matlab',
  'mtlb',
  'actually',
  'basically',
  'like',
  'literally',
  'honestly',
  'yaani',
  'yani',
  'toh',
  'umm',
  'um',
  'uhh',
  'uh',
  'er',
  'ah',
  'so',
  'right',
]);

/**
 * Normalizes a word by removing edge punctuation
 */
function stripPunctuation(str: string): string {
  return str.replace(/^[^\w\s]+|[^\w\s]+$/g, '').toLowerCase();
}

/**
 * Detects filler words and constructs a token array for UI highlighting
 */
export function analyzeFillers(text: string): FillerAnalysis {
  if (!text || text.trim().length === 0) {
    return {
      totalCount: 0,
      uniqueCount: 0,
      detectedFillers: [],
      tokens: [],
      fillerRatioPercent: 0,
      detoxGrade: 'A+',
      feedbackText: 'No speech analyzed yet.',
    };
  }

  const rawWords = text.trim().split(/\s+/);
  const totalWordCount = rawWords.length;
  const fillerCounts: Record<string, number> = {};
  const tokens: FillerToken[] = [];

  let i = 0;
  while (i < rawWords.length) {
    let matchedMulti = false;

    // Check multi-word phrases (up to 3 words ahead)
    for (const phrase of MULTI_WORD_FILLERS) {
      const phraseWords = phrase.split(' ');
      const len = phraseWords.length;

      if (i + len <= rawWords.length) {
        const sliceStr = rawWords
          .slice(i, i + len)
          .map(stripPunctuation)
          .join(' ');

        if (sliceStr === phrase) {
          matchedMulti = true;
          fillerCounts[phrase] = (fillerCounts[phrase] || 0) + 1;

          for (let k = 0; k < len; k++) {
            tokens.push({
              text: rawWords[i + k],
              isFiller: true,
              cleanFiller: phrase,
            });
          }
          i += len;
          break;
        }
      }
    }

    if (!matchedMulti) {
      const rawWord = rawWords[i];
      const cleaned = stripPunctuation(rawWord);

      if (cleaned && SINGLE_WORD_FILLERS.has(cleaned)) {
        // Special guard for 'so' and 'right': only flag if surrounded by pauses or excessive
        // For our detector, let's treat 'matlab', 'actually', 'basically', 'like', 'umm', 'uhh' as high confidence
        fillerCounts[cleaned] = (fillerCounts[cleaned] || 0) + 1;
        tokens.push({
          text: rawWord,
          isFiller: true,
          cleanFiller: cleaned,
        });
      } else {
        tokens.push({
          text: rawWord,
          isFiller: false,
        });
      }
      i++;
    }
  }

  const detectedFillers: DetectedFiller[] = Object.entries(fillerCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);

  const totalFillers = detectedFillers.reduce((acc, curr) => acc + curr.count, 0);
  const fillerRatioPercent = totalWordCount > 0 ? Math.round((totalFillers / totalWordCount) * 100) : 0;

  // Grade calculation
  let detoxGrade: 'A+' | 'A' | 'B' | 'C' | 'Needs Attention' = 'A+';
  let feedbackText = 'Super clean speech! Zero filler words detected.';

  if (totalFillers === 0) {
    detoxGrade = 'A+';
    feedbackText = 'Super clean speech! Zero filler words detected.';
  } else if (fillerRatioPercent <= 4) {
    detoxGrade = 'A';
    feedbackText = 'Natural and composed. Very few filler words used.';
  } else if (fillerRatioPercent <= 8) {
    detoxGrade = 'B';
    feedbackText = 'Good flow, but watch out for repeated filler crutches.';
  } else if (fillerRatioPercent <= 14) {
    detoxGrade = 'C';
    feedbackText = 'Moderate hesitation fillers. Try pausing silently instead of using fillers.';
  } else {
    detoxGrade = 'Needs Attention';
    feedbackText = 'High filler density. Take a deep breath between thoughts instead of filling the silence.';
  }

  return {
    totalCount: totalFillers,
    uniqueCount: detectedFillers.length,
    detectedFillers,
    tokens,
    fillerRatioPercent,
    detoxGrade,
    feedbackText,
  };
}

/**
 * Aggregates filler analysis across an entire conversation session
 */
export function summarizeSessionFillers(
  turns: Array<{ transcript: string }>
): SessionFillerSummary {
  if (!turns || turns.length === 0) {
    return {
      totalWords: 0,
      totalFillers: 0,
      fillerRatioPercent: 0,
      fillersPer100Words: 0,
      topFillers: [],
      detoxGrade: 'A+',
      headline: 'Flawless Delivery',
      actionableTip: 'Continue practicing intentional 1-second silent pauses to structure your thoughts.',
    };
  }

  const allTranscripts = turns.map((t) => t.transcript || '').join(' ');
  const analysis = analyzeFillers(allTranscripts);
  const totalWords = allTranscripts.trim().split(/\s+/).filter(Boolean).length;
  const fillersPer100Words = totalWords > 0 ? Math.round((analysis.totalCount / totalWords) * 100) : 0;

  let headline = 'Crisp & Articulate';
  let actionableTip = 'Whenever you feel the urge to say "matlab" or "actually", close your lips and take a silent 1-second pause. Silence sounds confident to recruiters!';

  if (analysis.totalCount === 0) {
    headline = 'Zero-Filler Masterclass!';
    actionableTip = 'Outstanding! You spoke without using conversational crutches. This projects high executive presence.';
  } else if (analysis.detoxGrade === 'A') {
    headline = 'Minimal Fillers · Polished Delivery';
    actionableTip = 'You maintained great cadence. To reach perfection, replace the occasional filler with a natural breath.';
  } else if (analysis.detoxGrade === 'B' || analysis.detoxGrade === 'C') {
    headline = 'Hesitation Detox Active';
    actionableTip = `Notice how you used "${analysis.detectedFillers[0]?.word || 'actually'}". Try substituting it with a purposeful pause before transitioning thoughts.`;
  } else {
    headline = 'Filler Reset Needed';
    actionableTip = 'Slow your speech by 10%—speaking slightly slower gives your mind time to find the next English word without filler crutches.';
  }

  return {
    totalWords,
    totalFillers: analysis.totalCount,
    fillerRatioPercent: analysis.fillerRatioPercent,
    fillersPer100Words,
    topFillers: analysis.detectedFillers,
    detoxGrade: analysis.detoxGrade,
    headline,
    actionableTip,
  };
}

