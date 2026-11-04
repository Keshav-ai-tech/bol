'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface MotionOrbProps {
  mode?: 'hero' | 'button';
  state?: 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'error';
  onClick?: () => void;
  size?: 'md' | 'lg';
  className?: string;
}

export const MotionOrb: React.FC<MotionOrbProps> = ({
  mode = 'hero',
  state = 'idle',
  onClick,
  size = 'lg',
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  // Mouse position for 3D perspective tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for fluid tilt without lag
  const mouseX = useSpring(x, { stiffness: 180, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 180, damping: 20 });

  // Map mouse offsets to degrees of tilt
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [14, -14]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-14, 14]);
  const glareX = useTransform(mouseX, [-0.5, 0.5], ['20%', '80%']);
  const glareY = useTransform(mouseY, [-0.5, 0.5], ['20%', '80%']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mousePosX = (e.clientX - rect.left) / width - 0.5;
    const mousePosY = (e.clientY - rect.top) / height - 0.5;
    x.set(mousePosX);
    y.set(mousePosY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Dimensions
  const isLarge = size === 'lg';
  const containerSize = isLarge ? 'w-72 h-72 sm:w-84 sm:h-84' : 'w-32 h-32 sm:w-36 sm:h-36';
  const orbSize = isLarge ? 'w-48 h-48 sm:w-56 sm:h-56' : 'w-28 h-28 sm:w-32 sm:h-32';

  // Float animation for hero mode
  const floatAnimation = prefersReducedMotion
    ? {}
    : {
        y: [0, -12, 0],
        rotate: [0, 1.5, -1.5, 0],
        transition: {
          duration: 5.5,
          repeat: Infinity,
          ease: 'easeInOut' as const,
        },
      };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{ perspective: 1200 }}
      className={`relative ${containerSize} flex items-center justify-center select-none cursor-pointer group ${className}`}
    >
      {/* 3D Tilting Wrapper */}
      <motion.div
        style={{
          rotateX: prefersReducedMotion ? 0 : rotateX,
          rotateY: prefersReducedMotion ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={mode === 'hero' ? floatAnimation : undefined}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Outward Harmonic Pulsing Rings */}
        {/* Ring 1 (Slow Deep Wave) */}
        <motion.div
          animate={
            prefersReducedMotion
              ? {}
              : state === 'recording'
              ? { scale: [1, 1.5, 1.7], opacity: [0.6, 0.2, 0] }
              : { scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }
          }
          transition={{
            duration: state === 'recording' ? 1.6 : 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#ff7a59]/25 to-[#44e2cd]/20 blur-xl pointer-events-none"
        />

        {/* Ring 2 (Concentric Glass Resonance) */}
        <motion.div
          animate={
            prefersReducedMotion
              ? {}
              : state === 'recording'
              ? { scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }
              : { scale: [1, 1.06, 1] }
          }
          transition={{
            duration: state === 'recording' ? 1.1 : 4.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-2 sm:inset-4 rounded-full border border-[#44e2cd]/30 shadow-[0_0_30px_rgba(68,226,205,0.2)] pointer-events-none"
        />

        {/* Ring 3 (Outer subtle rim) */}
        <div className="absolute inset-6 rounded-full border border-[#ffb4a2]/20 shadow-[0_0_20px_rgba(255,180,162,0.15)] pointer-events-none" />

        {/* Spinning Radiance Filigree during transcribing/thinking */}
        {(state === 'transcribing' || state === 'thinking') && (
          <motion.svg
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 240 240"
          >
            <circle
              cx="120"
              cy="120"
              r="108"
              fill="none"
              stroke="#44e2cd"
              strokeWidth="2"
              strokeDasharray="8 16"
              opacity="0.8"
            />
            <circle
              cx="120"
              cy="120"
              r="94"
              fill="none"
              stroke="#ff7a59"
              strokeWidth="1.5"
              strokeDasharray="4 12"
              opacity="0.9"
            />
          </motion.svg>
        )}

        {/* CORE 3D SPHERICAL GLASS ORB */}
        <motion.div
          whileHover={prefersReducedMotion ? {} : { scale: 1.05 }}
          whileTap={prefersReducedMotion ? {} : { scale: 0.95 }}
          className={`relative ${orbSize} rounded-full p-1 flex items-center justify-center overflow-hidden transition-shadow duration-500 shadow-[0_0_60px_rgba(255,122,89,0.45),0_0_110px_rgba(68,226,205,0.25)] ${
            state === 'recording'
              ? 'bg-gradient-to-tr from-[#ff7a59] via-[#ff6b6b] to-[#93000a]'
              : state === 'speaking'
              ? 'bg-gradient-to-tr from-[#03c6b2] via-[#44e2cd] to-[#a596eb]'
              : 'bg-gradient-to-tr from-[#ff7a59] via-[#ffb347] to-[#03c6b2]'
          }`}
          style={{
            transform: 'translateZ(30px)',
          }}
        >
          {/* Dynamic Specular Highlight Glare responding to mouse */}
          <motion.div
            style={{
              top: prefersReducedMotion ? '15%' : glareY,
              left: prefersReducedMotion ? '25%' : glareX,
            }}
            className="absolute w-24 h-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-md pointer-events-none transform -rotate-20"
          />

          {/* Secondary Soft Specular Rim */}
          <div className="absolute -top-8 -left-8 w-40 h-40 rounded-full bg-white/25 blur-lg pointer-events-none transform rotate-12" />
          <div className="absolute bottom-2 right-4 w-24 h-24 rounded-full bg-[#090a2a]/30 blur-sm pointer-events-none" />

          {/* Ambient Liquid Movement Gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#701500]/15 to-[#090a2a]/60 backdrop-blur-[2px]" />

          {/* Center Microphone / Graphic Indicator */}
          <div className="relative z-10 flex flex-col items-center justify-center text-[#621100]">
            <motion.div
              animate={
                state === 'recording'
                  ? { scale: [1, 1.15, 1] }
                  : state === 'speaking'
                  ? { y: [0, -2, 0] }
                  : {}
              }
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className={`${
                isLarge ? 'w-16 h-16' : 'w-12 h-12'
              } rounded-full bg-[#090a2a]/30 backdrop-blur-md flex items-center justify-center shadow-inner group-hover:shadow-[0_0_25px_rgba(255,255,255,0.4)] transition-all`}
            >
              {state === 'recording' ? (
                <span className={`material-symbols-outlined ${isLarge ? 'text-[36px]' : 'text-[28px]'} text-white`}>
                  stop
                </span>
              ) : state === 'transcribing' || state === 'thinking' ? (
                <span className={`material-symbols-outlined ${isLarge ? 'text-[36px]' : 'text-[28px]'} text-white animate-spin`}>
                  progress_activity
                </span>
              ) : state === 'speaking' ? (
                <span className={`material-symbols-outlined ${isLarge ? 'text-[36px]' : 'text-[28px]'} text-[#003731]`}>
                  graphic_eq
                </span>
              ) : (
                <span
                  className={`material-symbols-outlined ${isLarge ? 'text-[36px]' : 'text-[28px]'} text-[#e1e0ff] group-hover:scale-110 transition-transform`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  mic
                </span>
              )}
            </motion.div>

            {/* Live Decibel Equalizer Frequency Bars */}
            {isLarge && (
              <div className="flex items-center gap-1.5 mt-3 h-6">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.span
                    key={i}
                    animate={
                      prefersReducedMotion
                        ? {}
                        : {
                            height: state === 'speaking' ? [4, 18, 6, 22, 4] : [4, 14, 4],
                          }
                    }
                    transition={{
                      duration: 0.8 + i * 0.15,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="w-1 bg-[#e1e0ff] rounded-full"
                    style={{ height: '8px' }}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
