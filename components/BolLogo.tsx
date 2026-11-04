'use client';

import React from 'react';

interface BolLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export const BolLogo: React.FC<BolLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
  };

  const subSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Glowing Speech Bubble with Wavebars and Teal Dot */}
      <div className={`relative ${iconSizes[size]} shrink-0 flex items-center justify-center`}>
        <div className="absolute inset-0 rounded-2xl bg-[#ff7a59]/30 blur-md pointer-events-none"></div>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(255,122,89,0.35)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Bubble Gradient */}
          <defs>
            <linearGradient id="bubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffb347" />
              <stop offset="50%" stopColor="#ff7a59" />
              <stop offset="100%" stopColor="#ff6b6b" />
            </linearGradient>
          </defs>

          {/* Speech Bubble Shape */}
          <path
            d="M20 22C20 14.268 26.268 8 34 8H76C83.732 8 90 14.268 90 22V56C90 63.732 83.732 70 76 70H44L28 84C27 84.875 25.5 84 25.5 82.5V70H20C12.268 70 6 63.732 6 56V22C6 14.268 12.268 8 20 8"
            fill="url(#bubbleGrad)"
          />

          {/* Sound Wave Bars */}
          <rect x="26" y="32" width="6" height="24" rx="3" fill="#0f1030" />
          <rect x="38" y="24" width="6" height="40" rx="3" fill="#0f1030" />
          <rect x="50" y="18" width="6" height="52" rx="3" fill="#0f1030" />
          <rect x="62" y="26" width="6" height="36" rx="3" fill="#0f1030" />
          <rect x="74" y="34" width="6" height="20" rx="3" fill="#0f1030" />

          {/* Accent Teal Dot */}
          <circle cx="16" cy="80" r="6" fill="#44e2cd" className="animate-pulse" />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col leading-none">
        <div className="flex items-center">
          <span className={`font-['Fraunces'] font-bold tracking-tight text-[#e1e0ff] ${textSizes[size]}`}>
            Bol
          </span>
          <span className="w-2 h-2 ml-1 rounded-full bg-[#ff7a59] shadow-[0_0_10px_#ff7a59]"></span>
        </div>
        {showSubtitle && (
          <span className={`font-['Noto_Sans'] text-[#cabeff]/80 font-medium tracking-wide ${subSizes[size]} -mt-0.5`}>
            बोल
          </span>
        )}
      </div>
    </div>
  );
};
