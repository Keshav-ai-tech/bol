'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SessionFillerSummary } from '@/lib/services/fillerDetector';

export interface ScorecardProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  scores: {
    fluency: number;
    grammar: number;
    confidence: number;
  };
  cefrLevel: string;
  wpmEstimate: number;
  totalWords: number;
  topicName: string;
  fillerSummary: SessionFillerSummary;
  dateStr?: string;
}

export function FluencyScorecardModal({
  isOpen,
  onClose,
  streak,
  scores,
  cefrLevel,
  wpmEstimate,
  totalWords,
  topicName,
  fillerSummary,
  dateStr,
}: ScorecardProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const displayDate = dateStr || new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const shareText = `🚀 Consistency is the key to mastering spoken English!

Today I completed Day ${streak} of my spoken English & placement practice on Bol, an AI voice coach built on @Gnani AI's sovereign speech stack:
🔥 Streak: ${streak} Days Active
📊 CEFR Fluency: ${cefrLevel || 'B2 Independent'}
⚡ Speaking Pace: ${wpmEstimate || 124} WPM
🎯 Filler Word Detox: ${fillerSummary.totalFillers === 0 ? '0 "Matlab" used (Clean Flow!)' : `${fillerSummary.totalFillers} fillers detected (${fillerSummary.detoxGrade} Grade)`}

Bol uses Gnani's Prisma v2.5 (trained on 14M+ hours of Indian telephonic audio) & Timbre v2.5 to understand code-mixed Hinglish and guide vernacular learners into confident English without hesitation.

#GreatIndianAIInternshipChallenge #GnaniAI #SovereignAI #VoiceAI #SpeechAI #IndianAI`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleShareWhatsApp = () => {
    const waText = encodeURIComponent(
      `🔥 Day ${streak} completed on Bol Voice Coach!\n\n` +
      `🎯 Fluency Score: ${scores.fluency || 8.4}/10 (${cefrLevel || 'B2'})\n` +
      `⚡ Speaking Pace: ${wpmEstimate || 124} WPM\n` +
      `🛡️ Filler Detox: ${fillerSummary.totalFillers === 0 ? 'Zero "Matlab" / Clean Flow!' : `${fillerSummary.totalFillers} fillers (${fillerSummary.detoxGrade} Grade)`}\n\n` +
      `Practicing with India's Sovereign Speech AI for the #GreatIndianAIInternshipChallenge #GnaniAI 🇮🇳🎙️`
    );
    window.open(`https://api.whatsapp.com/send?text=${waText}`, '_blank');
  };

  const handleShareLinkedIn = () => {
    // Copy the text first so the user can easily paste it into LinkedIn
    handleCopyText();
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://www.gnani.ai/great-indian-ai-internship-registration-form')}`;
    window.open(linkedinUrl, '_blank');
  };

  // Pure HTML5 Canvas export for crisp PNG generation without dependencies
  const handleDownloadImage = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630; // standard social share aspect ratio (1.91:1)
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setDownloading(false);
        return;
      }

      // 1. Dark Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
      bgGrad.addColorStop(0, '#090a2a');
      bgGrad.addColorStop(0.5, '#101239');
      bgGrad.addColorStop(1, '#1b1c3c');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1200, 630);

      // 2. Subtle Glow Orbs
      const glow1 = ctx.createRadialGradient(150, 120, 10, 150, 120, 350);
      glow1.addColorStop(0, 'rgba(255, 122, 89, 0.25)');
      glow1.addColorStop(1, 'rgba(255, 122, 89, 0)');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, 600, 400);

      const glow2 = ctx.createRadialGradient(1050, 500, 10, 1050, 500, 350);
      glow2.addColorStop(0, 'rgba(68, 226, 205, 0.22)');
      glow2.addColorStop(1, 'rgba(68, 226, 205, 0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(600, 200, 600, 430);

      // 3. Card Border Box
      ctx.strokeStyle = '#262747';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, 1120, 550);

      // Inner subtle border
      ctx.strokeStyle = 'rgba(68, 226, 205, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(48, 48, 1104, 534);

      // 4. Header: Logo & Contest Badge
      ctx.fillStyle = '#ff7a59';
      ctx.font = 'bold 36px "Space Grotesk", sans-serif';
      ctx.fillText('BOL', 80, 105);

      ctx.fillStyle = '#dfc0b8';
      ctx.font = '500 18px "Space Grotesk", sans-serif';
      ctx.fillText('• HINGLISH-TO-ENGLISH AI SPEAKING COACH', 165, 105);

      // Sovereign Badge Top Right
      ctx.fillStyle = 'rgba(68, 226, 205, 0.12)';
      ctx.fillRect(780, 75, 340, 40);
      ctx.strokeStyle = '#44e2cd';
      ctx.lineWidth = 1;
      ctx.strokeRect(780, 75, 340, 40);

      ctx.fillStyle = '#44e2cd';
      ctx.font = 'bold 13px "Space Grotesk", sans-serif';
      ctx.fillText('🇮🇳 BUILT ON GNANI AI ARTHA STACK', 805, 100);

      // 5. Main Hero Row: Streak & Headline
      ctx.fillStyle = '#ffb4a2';
      ctx.font = 'bold 54px "Fraunces", serif';
      ctx.fillText(`🔥 Day ${streak} Speaking Streak`, 80, 190);

      ctx.fillStyle = '#62fae3';
      ctx.font = '600 22px "Noto Sans", sans-serif';
      ctx.fillText(`Practice Topic: ${topicName || 'Placement & Daily Life'} • ${displayDate}`, 80, 230);

      // 6. 4 Metric Glass Tiles
      const tiles = [
        { label: 'CEFR LEVEL', value: cefrLevel || 'B2 Independent', sub: 'Placement Ready', color: '#cabeff' },
        { label: 'FLUENCY SCORE', value: `${scores.fluency || 8.4}/10`, sub: 'Natural Cadence', color: '#ff7a59' },
        { label: 'SPEAKING PACE', value: `${wpmEstimate || 124} WPM`, sub: 'Optimal Flow', color: '#44e2cd' },
        {
          label: 'FILLER WORD DETOX',
          value: fillerSummary.totalFillers === 0 ? '0 "Matlab"' : `${fillerSummary.totalFillers} Fillers`,
          sub: `Grade: ${fillerSummary.detoxGrade} (${fillerSummary.totalFillers === 0 ? 'Clean Flow' : 'Detox Active'})`,
          color: '#62fae3',
        },
      ];

      const tileWidth = 240;
      const tileHeight = 150;
      const startX = 80;
      const startY = 270;
      const gap = 46;

      tiles.forEach((tile, idx) => {
        const x = startX + idx * (tileWidth + gap);
        const y = startY;

        // Tile bg
        ctx.fillStyle = '#171838';
        ctx.fillRect(x, y, tileWidth, tileHeight);
        ctx.strokeStyle = '#262747';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileWidth, tileHeight);

        // Top accent line
        ctx.fillStyle = tile.color;
        ctx.fillRect(x, y, tileWidth, 4);

        // Label
        ctx.fillStyle = '#dfc0b8';
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.fillText(tile.label, x + 16, y + 36);

        // Value
        ctx.fillStyle = tile.color;
        ctx.font = 'bold 26px "Space Grotesk", sans-serif';
        ctx.fillText(tile.value, x + 16, y + 80);

        // Subtitle
        ctx.fillStyle = '#a68b84';
        ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(tile.sub, x + 16, y + 115);
      });

      // 7. Footer: Tech Callout & Hashtags
      ctx.fillStyle = '#1b1c3c';
      ctx.fillRect(80, 470, 1040, 75);
      ctx.strokeStyle = '#262747';
      ctx.lineWidth = 1;
      ctx.strokeRect(80, 470, 1040, 75);

      ctx.fillStyle = '#e1e0ff';
      ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('🎙️ Powered by Gnani Prisma v2.5 (14M+ hrs Indian telephonic audio) & Timbre v2.5', 105, 502);

      ctx.fillStyle = '#44e2cd';
      ctx.font = 'bold 14px "Space Grotesk", sans-serif';
      ctx.fillText('#GreatIndianAIInternshipChallenge   #GnaniAI   #SovereignAI   #VoiceAI', 105, 528);

      // Download trigger
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Bol_Fluency_Day${streak}_${displayDate.replace(/\s+/g, '_')}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        setDownloading(false);
      }, 'image/png');
    } catch (e) {
      console.error('Failed to generate image:', e);
      setDownloading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#090a2a]/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-2xl bg-[#101239] border border-[#262747] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#1b1c3c] hover:bg-[#262747] text-[#dfc0b8] hover:text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-[#ff7a59]/15 border border-[#ff7a59]/40 text-[#ffb4a2] text-xs font-bold uppercase tracking-wider font-['Space_Grotesk']">
              Shareable Fluency Scorecard
            </span>
            <span className="text-xs text-[#a68b84]">•</span>
            <span className="text-xs text-[#44e2cd] font-semibold">1-Click Viral Share</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-['Fraunces'] text-[#e1e0ff] mb-1">
            Showcase Your Daily Progress
          </h2>
          <p className="text-sm text-[#dfc0b8] font-['Plus_Jakarta_Sans'] mb-6">
            Share your speaking streak and filler detox metrics on WhatsApp and LinkedIn to inspire your peers and build public accountability.
          </p>

          {/* PREVIEW CARD */}
          <div
            ref={cardRef}
            className="relative p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-[#171838] via-[#101239] to-[#090a2a] border border-[#313253] shadow-inner mb-6 overflow-hidden"
          >
            {/* Ambient Orbs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#ff7a59]/15 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#44e2cd]/15 rounded-full blur-3xl pointer-events-none"></div>

            {/* Top Brand Lockup */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="font-['Space_Grotesk'] font-bold text-xl text-[#ff7a59] tracking-tight">
                  BOL
                </span>
                <span className="text-[#a68b84] text-xs">•</span>
                <span className="text-xs font-['Space_Grotesk'] text-[#dfc0b8] uppercase tracking-wider">
                  AI Voice Coach
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#44e2cd]/15 border border-[#44e2cd]/30 text-[#44e2cd] text-[10px] font-bold font-['Space_Grotesk']">
                🇮🇳 GNANI ARTHA STACK
              </span>
            </div>

            {/* Hero Streak Row */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">🔥</span>
                <span className="font-['Fraunces'] text-2xl sm:text-3xl font-bold text-[#ffdad2]">
                  Day {streak} Speaking Streak
                </span>
              </div>
              <p className="text-xs text-[#62fae3] font-['Noto_Sans']">
                {topicName || 'Daily Practice'} • {displayDate}
              </p>
            </div>

            {/* Metrics 4-Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5">
              {/* CEFR Level */}
              <div className="p-3.5 rounded-xl bg-[#090a2a]/80 border border-[#262747]">
                <span className="text-[10px] uppercase font-['Space_Grotesk'] text-[#dfc0b8] tracking-wider block mb-1">
                  CEFR Benchmark
                </span>
                <span className="font-['Space_Grotesk'] text-base sm:text-lg font-bold text-[#cabeff]">
                  {cefrLevel || 'B2 Independent'}
                </span>
                <span className="text-[11px] text-[#a68b84] block mt-0.5">Placement Ready</span>
              </div>

              {/* Fluency Score */}
              <div className="p-3.5 rounded-xl bg-[#090a2a]/80 border border-[#262747]">
                <span className="text-[10px] uppercase font-['Space_Grotesk'] text-[#dfc0b8] tracking-wider block mb-1">
                  Fluency Score
                </span>
                <span className="font-['Space_Grotesk'] text-base sm:text-lg font-bold text-[#ff7a59]">
                  {scores.fluency || 8.4} / 10
                </span>
                <span className="text-[11px] text-[#a68b84] block mt-0.5">Natural Cadence</span>
              </div>

              {/* Speaking Pace */}
              <div className="p-3.5 rounded-xl bg-[#090a2a]/80 border border-[#262747]">
                <span className="text-[10px] uppercase font-['Space_Grotesk'] text-[#dfc0b8] tracking-wider block mb-1">
                  Speaking Pace
                </span>
                <span className="font-['Space_Grotesk'] text-base sm:text-lg font-bold text-[#44e2cd]">
                  {wpmEstimate || 124} WPM
                </span>
                <span className="text-[11px] text-[#a68b84] block mt-0.5">Optimal Speed</span>
              </div>

              {/* Filler Detox */}
              <div className="p-3.5 rounded-xl bg-[#090a2a]/80 border border-[#262747]">
                <span className="text-[10px] uppercase font-['Space_Grotesk'] text-[#dfc0b8] tracking-wider block mb-1">
                  Filler Word Detox
                </span>
                <span className="font-['Space_Grotesk'] text-base sm:text-lg font-bold text-[#62fae3]">
                  {fillerSummary.totalFillers === 0 ? '0 "Matlab"' : `${fillerSummary.totalFillers} Fillers`}
                </span>
                <span className="text-[11px] text-[#a68b84] block mt-0.5">
                  Grade {fillerSummary.detoxGrade} ({fillerSummary.totalFillers === 0 ? 'Clean Flow' : 'Hesitation Detox'})
                </span>
              </div>
            </div>

            {/* Bottom Engine Note */}
            <div className="pt-3 border-t border-[#262747] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-[#dfc0b8]">
              <span>Captured on Gnani Prisma v2.5 STT & Timbre v2.5 TTS</span>
              <span className="text-[#44e2cd] font-semibold">#GreatIndianAIInternshipChallenge</span>
            </div>
          </div>

          {/* ACTION BUTTONS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {/* Download PNG */}
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#ff7a59] hover:bg-[#ff8f73] text-[#491206] font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] transition-all shadow-lg active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              <span>{downloading ? 'Generating PNG...' : 'Download Image'}</span>
            </button>

            {/* WhatsApp Share */}
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-[#053818] font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] transition-all shadow-lg active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">send</span>
              <span>Share WhatsApp</span>
            </button>

            {/* LinkedIn Share */}
            <button
              onClick={handleShareLinkedIn}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-[#0077b5] hover:bg-[#00669c] text-white font-bold text-xs uppercase tracking-wider font-['Space_Grotesk'] transition-all shadow-lg active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">share</span>
              <span>Post to LinkedIn</span>
            </button>
          </div>

          {/* Copy Post Text */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#090a2a]/60 border border-[#262747]">
            <span className="text-xs text-[#dfc0b8] truncate mr-2">
              Includes #GreatIndianAIInternshipChallenge & #GnaniAI tags for nomination!
            </span>
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-lg bg-[#262747] hover:bg-[#313253] text-[#44e2cd] text-xs font-bold shrink-0 transition-colors"
            >
              {copied ? '✓ Copied Text!' : 'Copy Caption'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

