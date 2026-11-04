'use client';

import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface ScoreRingProps {
  label: string;
  score: number;
  maxScore?: number;
  gradientId: string;
  gradientColors: [string, string];
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  delay?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  label,
  score,
  maxScore = 10,
  gradientId,
  gradientColors,
  subtitle,
  badge,
  badgeColor = '#ff7a59',
  delay = 0,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [displayScore, setDisplayScore] = useState<number>(prefersReducedMotion ? score : 0);

  const radius = 66;
  const circumference = 2 * Math.PI * radius; // ~414.7
  const percentage = Math.min(1, Math.max(0, score / maxScore));
  const targetOffset = circumference * (1 - percentage);

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayScore(score);
      return;
    }

    const startTime = performance.now();
    const duration = 1400; // ms
    const initialDelay = delay * 1000;

    let frameId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime - initialDelay;
      if (elapsed < 0) {
        frameId = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = parseFloat((eased * score).toFixed(1));
      setDisplayScore(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setDisplayScore(score);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [score, maxScore, delay, prefersReducedMotion]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative group flex flex-col items-center p-6 rounded-3xl bg-[#1b1c3c]/80 border border-[#262747] backdrop-blur-xl shadow-xl transition-colors hover:border-[#313253]"
    >
      {badge && (
        <span
          className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-['Space_Grotesk'] uppercase font-bold tracking-wider shadow-sm border border-[#262747]"
          style={{
            backgroundColor: `${badgeColor}22`,
            color: badgeColor,
          }}
        >
          {badge}
        </span>
      )}

      {/* SVG Progress Ring */}
      <div className="relative w-44 h-44 flex items-center justify-center my-3">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#262747"
            strokeWidth="11"
          />
          <motion.circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="12"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{
              duration: prefersReducedMotion ? 0.1 : 1.4,
              delay: prefersReducedMotion ? 0 : delay,
              ease: [0.16, 1, 0.3, 1],
            }}
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-['Space_Grotesk'] text-4xl sm:text-5xl font-bold text-[#e1e0ff] tracking-tight">
            {displayScore.toFixed(1)}
          </span>
          <span className="font-['Space_Grotesk'] text-[11px] text-[#dfc0b8] uppercase tracking-wider mt-0.5">
            out of {maxScore}
          </span>
        </div>
      </div>

      <h3 className="font-['Epilogue'] text-lg font-bold text-[#e1e0ff] mt-1">{label}</h3>
      <p className="font-['Plus_Jakarta_Sans'] text-xs text-[#dfc0b8] text-center mt-1 leading-relaxed">
        {subtitle}
      </p>
    </motion.div>
  );
};
