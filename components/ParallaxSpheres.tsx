'use client';

import React from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

export const ParallaxSpheres: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Parallax transforms at different depths
  const y1 = useTransform(scrollY, [0, 1000], [0, 220]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -160]);
  const y3 = useTransform(scrollY, [0, 1000], [0, 310]);
  const y4 = useTransform(scrollY, [0, 1000], [0, -90]);

  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[780px] h-[520px] bg-gradient-to-tr from-[#ffb4a2]/15 via-[#a596eb]/12 to-[#44e2cd]/15 rounded-full blur-[140px]" />
        <div className="absolute top-[32rem] -left-32 w-[460px] h-[460px] bg-[#ff7a59]/10 rounded-full blur-[120px]" />
        <div className="absolute top-[48rem] -right-36 w-[520px] h-[520px] bg-[#44e2cd]/10 rounded-full blur-[140px]" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Sphere 1: Top saffron-coral aura (Deep Layer) */}
      <motion.div
        style={{ y: y1 }}
        animate={{
          x: [0, 35, -20, 0],
          scale: [1, 1.08, 0.96, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[780px] h-[520px] bg-gradient-to-tr from-[#ffb4a2]/18 via-[#a596eb]/14 to-[#44e2cd]/18 rounded-full blur-[140px]"
      />

      {/* Sphere 2: Mid-left coral sphere (Fast Layer) */}
      <motion.div
        style={{ y: y2 }}
        animate={{
          x: [0, -40, 20, 0],
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-[28rem] -left-28 w-[460px] h-[460px] bg-[#ff7a59]/12 rounded-full blur-[120px]"
      />

      {/* Sphere 3: Mid-right cyan/teal sanctuary glow (Mid Layer) */}
      <motion.div
        style={{ y: y3 }}
        animate={{
          x: [0, 30, -30, 0],
          scale: [1, 0.94, 1.08, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-[44rem] -right-32 w-[520px] h-[520px] bg-[#44e2cd]/12 rounded-full blur-[140px]"
      />

      {/* Sphere 4: Bottom lavender serenity field */}
      <motion.div
        style={{ y: y4 }}
        animate={{
          x: [0, -25, 25, 0],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-20 left-1/4 w-[380px] h-[380px] bg-[#cabeff]/10 rounded-full blur-[110px]"
      />
    </div>
  );
};
