'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SessionFillerSummary } from '@/lib/services/fillerDetector';

interface FillerDetoxCardProps {
  summary: SessionFillerSummary;
  className?: string;
}

export function FillerDetoxCard({ summary, className = '' }: FillerDetoxCardProps) {
  const isClean = summary.totalFillers === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`p-6 rounded-3xl bg-[#171838]/90 border border-[#262747] backdrop-blur-xl relative overflow-hidden shadow-lg ${className}`}
    >
      {/* Ambient background glow */}
      <div
        className={`absolute -right-8 -top-8 w-36 h-36 rounded-full blur-3xl pointer-events-none ${
          isClean ? 'bg-[#44e2cd]/15' : 'bg-[#ff7a59]/15'
        }`}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center ${
              isClean ? 'bg-[#44e2cd]/20 text-[#44e2cd]' : 'bg-[#ff7a59]/20 text-[#ffb4a2]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isClean ? 'verified' : 'timer_pause'}
            </span>
          </div>
          <div>
            <h3 className="font-['Epilogue'] font-bold text-[#e1e0ff] text-base leading-tight">
              Filler Word & Hesitation Detox
            </h3>
            <p className="font-['Noto_Sans'] text-xs text-[#a68b84]">
              तकियाकलाम और हिचकिचाहट विश्लेषण
            </p>
          </div>
        </div>

        {/* Grade Pill */}
        <div
          className={`px-3 py-1 rounded-full border text-xs font-bold font-['Space_Grotesk'] uppercase tracking-wider ${
            isClean
              ? 'bg-[#44e2cd]/15 border-[#44e2cd]/40 text-[#44e2cd]'
              : summary.detoxGrade === 'A'
              ? 'bg-[#03c6b2]/15 border-[#03c6b2]/40 text-[#62fae3]'
              : 'bg-[#ff7a59]/15 border-[#ff7a59]/40 text-[#ffb4a2]'
          }`}
        >
          Grade {summary.detoxGrade}
        </div>
      </div>

      {/* Primary Headline & Stats Row */}
      <div className="p-3.5 rounded-2xl bg-[#090a2a]/70 border border-[#262747] mb-4 flex items-center justify-between gap-4">
        <div>
          <span className="font-['Space_Grotesk'] text-xl sm:text-2xl font-bold text-[#e1e0ff] block">
            {isClean ? '0 Fillers' : `${summary.totalFillers} Fillers Detected`}
          </span>
          <span className="text-xs text-[#62fae3] font-['Noto_Sans']">
            {summary.headline}
          </span>
        </div>

        <div className="text-right shrink-0">
          <span className="font-['Space_Grotesk'] text-sm font-semibold text-[#dfc0b8] block">
            {summary.fillersPer100Words}% density
          </span>
          <span className="text-[11px] text-[#a68b84]">
            {isClean ? 'Flawless cadence' : 'Per 100 words'}
          </span>
        </div>
      </div>

      {/* Top Detected Fillers Chips */}
      {summary.topFillers.length > 0 ? (
        <div className="mb-4">
          <span className="text-xs text-[#dfc0b8] font-['Space_Grotesk'] uppercase tracking-wider block mb-2">
            Frequent Filler Crutches in this session:
          </span>
          <div className="flex flex-wrap gap-2">
            {summary.topFillers.map((item, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#262747] border border-[#ff7a59]/30 text-[#ffb4a2] text-xs font-['Space_Grotesk'] font-medium"
              >
                <span>“{item.word}”</span>
                <span className="w-4 h-4 rounded-full bg-[#ff7a59]/30 text-[10px] flex items-center justify-center font-bold">
                  {item.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 rounded-xl bg-[#44e2cd]/10 border border-[#44e2cd]/20 text-xs text-[#44e2cd] font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>Zero subconscious fillers (*matlab*, *actually*, *basically*) detected in your turns!</span>
        </div>
      )}

      {/* Coach Actionable Tip */}
      <div className="p-3.5 rounded-2xl bg-[#1b1c3c]/80 border border-[#262747] text-xs text-[#dfc0b8] leading-relaxed flex items-start gap-2.5">
        <span className="material-symbols-outlined text-[#44e2cd] text-base shrink-0 mt-0.5">
          psychology
        </span>
        <div>
          <span className="font-semibold text-[#e1e0ff] block mb-0.5 font-['Epilogue']">
            Priya&apos;s Cadence Tip:
          </span>
          <span>{summary.actionableTip}</span>
        </div>
      </div>
    </motion.div>
  );
}

