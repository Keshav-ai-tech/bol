'use client';

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface MotionCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  interactiveTilt?: boolean;
  onClick?: () => void;
}

export const MotionCard: React.FC<MotionCardProps> = ({
  children,
  className = '',
  delay = 0,
  interactiveTilt = true,
  onClick,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 200, damping: 25 });
  const mouseY = useSpring(y, { stiffness: 200, damping: 25 });

  const rotateX = useTransform(mouseY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !interactiveTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const mousePosX = (e.clientX - rect.left) / rect.width - 0.5;
    const mousePosY = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(mousePosX);
    y.set(mousePosY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 35, rotateX: 8 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
      style={{
        perspective: 1000,
        rotateX: prefersReducedMotion || !interactiveTilt ? 0 : rotateX,
        rotateY: prefersReducedMotion || !interactiveTilt ? 0 : rotateY,
        transformStyle: 'preserve-3d',
      }}
      whileHover={
        prefersReducedMotion
          ? {}
          : {
              y: -5,
              transition: { duration: 0.25, ease: 'easeOut' },
            }
      }
      className={`relative ${className}`}
    >
      {children}
    </motion.div>
  );
};
