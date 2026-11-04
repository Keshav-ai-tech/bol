'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface MotionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  title?: string;
}

export const MotionButton: React.FC<MotionButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  type = 'button',
  disabled = false,
  title,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-[#ff7a59] via-[#ffb4a2] to-[#ff7a59] text-[#621100] font-bold shadow-[0_0_24px_rgba(255,122,89,0.35)] hover:shadow-[0_0_36px_rgba(255,122,89,0.6)]',
    secondary:
      'bg-[#262747] hover:bg-[#313253] text-[#e1e0ff] border border-[#313253] shadow-md',
    ghost:
      'bg-transparent hover:bg-[#262747]/60 text-[#dfc0b8] hover:text-[#e1e0ff]',
    glass:
      'bg-[#1b1c3c]/80 hover:bg-[#262747] text-[#e1e0ff] border border-[#262747] backdrop-blur-md',
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      whileHover={
        prefersReducedMotion || disabled
          ? {}
          : {
              y: -2.5,
              scale: 1.025,
              transition: { duration: 0.18, ease: 'easeOut' },
            }
      }
      whileTap={
        prefersReducedMotion || disabled
          ? {}
          : {
              y: 0,
              scale: 0.975,
              transition: { duration: 0.1, ease: 'easeIn' },
            }
      }
      className={`inline-flex items-center justify-center transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
    >
      {children}
    </motion.button>
  );
};
