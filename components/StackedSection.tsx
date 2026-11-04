'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface StackedSectionProps {
  children: React.ReactNode;
  index: number;
  total?: number;
  className?: string;
  id?: string;
}

export const StackedSection: React.FC<StackedSectionProps> = ({
  children,
  index,
  className = '',
  id,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      id={id}
      className={`relative w-full mb-10 sm:mb-16 lg:mb-20 ${className}`}
    >
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="w-full"
      >
        {children}
      </motion.div>
    </section>
  );
};
