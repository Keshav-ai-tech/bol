'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface AudioWaveformProps {
  isSpeaking: boolean;
  isRecording?: boolean;
  liveVolume?: number;
  className?: string;
  bars?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isSpeaking,
  isRecording = false,
  liveVolume = 0,
  className = '',
  bars = 16,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Color gradient sequence
  const speakingColors = ['#44e2cd', '#03c6b2', '#62fae3', '#cabeff', '#a596eb'];
  const recordingColors = ['#ff7a59', '#ffb4a2', '#ffdad2', '#ff7a59', '#ffb4a2'];
  const colors = isRecording ? recordingColors : speakingColors;
  const isActive = isSpeaking || isRecording;

  return (
    <div className={`flex items-center justify-center gap-1.5 h-10 px-3 py-1.5 rounded-2xl bg-[#090a2a]/60 backdrop-blur-md border border-[#262747]/60 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => {
        const color = colors[i % colors.length];
        const baseHeight = 4 + (Math.sin(i * 0.6) + 1) * 2;
        
        let targetHeight = baseHeight;
        if (isRecording) {
          // Modulate height based on live audio volume
          const dynamicBoost = Math.max(0.15, liveVolume) * (14 + (Math.sin(i * 0.9) + 1) * 8);
          targetHeight = Math.min(32, baseHeight + dynamicBoost);
        } else if (isSpeaking) {
          const peakHeight = 12 + (Math.sin(i * 0.8) + 1) * 10;
          targetHeight = peakHeight;
        }

        return (
          <motion.div
            key={i}
            animate={
              !isActive || prefersReducedMotion
                ? { height: `${baseHeight}px` }
                : isRecording
                ? { height: `${targetHeight}px` }
                : {
                    height: [
                      `${baseHeight}px`,
                      `${targetHeight}px`,
                      `${baseHeight * 1.5}px`,
                      `${targetHeight * 0.8}px`,
                      `${baseHeight}px`,
                    ],
                  }
            }
            transition={
              isRecording
                ? { type: 'spring', stiffness: 300, damping: 20 }
                : {
                    duration: 0.9 + (i % 5) * 0.15,
                    repeat: isSpeaking ? Infinity : 0,
                    ease: 'easeInOut',
                    delay: (i % 4) * 0.08,
                  }
            }
            style={{
              backgroundColor: color,
              width: '3.5px',
              borderRadius: '9999px',
            }}
          />
        );
      })}
    </div>
  );
};
