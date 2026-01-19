"use client";

import React from 'react';
import { LaurelIcon } from './icons/neo-pantheon';

export type InfluenceRank = 'S' | 'A' | 'B' | 'C' | 'D' | string;

interface InfluenceBadgeProps {
  rank?: InfluenceRank;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: (e: React.MouseEvent) => void;
  showLabel?: boolean;
}

const BADGE_CONFIG: Record<string, {
  label: string;
  gradient: string;
  borderCol: string;
  textCol: string;
  glow: string;
  innerGlow: string;
  rimLight: string;
  special?: 'holographic' | 'shimmer';
}> = {
  // --- RANK BASED MAPPING ---
  S: { // Diamond (Exalted)
    label: "S",
    gradient: "from-[#004e92] via-[#002f6c] to-[#020024]",
    borderCol: "border-blue-400/50",
    textCol: "text-blue-50",
    glow: "drop-shadow-[0_0_15px_rgba(0,122,255,0.6)]",
    innerGlow: "shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.6)]",
    rimLight: "after:bg-gradient-to-tr after:from-transparent after:via-white/30 after:to-transparent",
  },
  A: { // Gold (Elite)
    label: "A",
    gradient: "from-[#FFF9E5] via-[#D4AF37] to-[#8A6D07]",
    borderCol: "border-[#FFEBAD]/60",
    textCol: "text-[#2D2100]",
    glow: "drop-shadow-[0_0_15px_rgba(212,175,55,0.6)]",
    innerGlow: "shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),inset_0_-2px_4px_rgba(0,0,0,0.4)]",
    rimLight: "after:bg-gradient-to-tr after:from-transparent after:via-white/40 after:to-transparent",
  },
  B: { // Silver (Prominent)
    label: "B",
    gradient: "from-[#F8F9FA] via-[#C0C0C0] to-[#707070]",
    borderCol: "border-white/50",
    textCol: "text-[#1A1A1A]",
    glow: "drop-shadow-[0_0_12px_rgba(192,192,192,0.4)]",
    innerGlow: "shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.3)]",
    rimLight: "after:bg-gradient-to-tr after:from-transparent after:via-white/30 after:to-transparent",
  },
  C: { // Bronze (Established)
    label: "C",
    gradient: "from-[#FFE4CC] via-[#CD7F32] to-[#663300]",
    borderCol: "border-[#E6A56E]/50",
    textCol: "text-[#261300]",
    glow: "drop-shadow-[0_0_10px_rgba(205,127,50,0.3)]",
    innerGlow: "shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.5)]",
    rimLight: "after:bg-gradient-to-tr after:from-transparent after:via-white/20 after:to-transparent",
  },
  D: { // Iron (Rising)
    label: "D",
    gradient: "from-[#475569] via-[#1E293B] to-[#0F172A]",
    borderCol: "border-white/10",
    textCol: "text-slate-100",
    glow: "drop-shadow-[0_0_5px_rgba(0,0,0,0.5)]",
    innerGlow: "shadow-[inset_0_1px_2px_rgba(255,255,255,0.1),inset_0_-1px_2px_rgba(0,0,0,0.8)]",
    rimLight: "after:hidden",
  },

  // --- SPECIAL VARIANTS (from Celeb Cards) ---
  "black-gold": {
    label: "S+",
    gradient: "from-[#1a1100] via-[#000000] to-[#1a1100]",
    borderCol: "border-[#D4AF37]/70",
    textCol: "text-[#D4AF37]",
    glow: "drop-shadow-[0_0_15px_rgba(212,175,55,0.8)]",
    innerGlow: "shadow-[inset_0_2px_4px_rgba(212,175,55,0.3),inset_0_-2px_4px_rgba(0,0,0,0.9)]",
    rimLight: "after:bg-gradient-to-tr after:from-transparent after:via-[#D4AF37]/40 after:to-transparent",
  },
  "rose-gold": {
    label: "SS",
    gradient: "from-[#fecfef] via-[#ff758c] to-[#f43f5e]",
    borderCol: "border-[#fb7185]/60",
    textCol: "text-white",
    glow: "drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]",
    innerGlow: "shadow-[inset_0_2px_4px_rgba(255,255,255,0.5),inset_0_-2px_4px_rgba(0,0,0,0.4)]",
    rimLight: "after:bg-gradient-to-tr after:from-transparent after:via-white/40 after:to-transparent",
  },
  "crimson": {
    label: "EX",
    gradient: "from-[#4a0000] via-[#8b0000] to-[#1a0000]",
    borderCol: "border-[#c9a227]/60",
    textCol: "text-[#c9a227]",
    glow: "drop-shadow-[0_0_20px_rgba(139,0,0,0.7)]",
    innerGlow: "shadow-[inset_0_2px_4px_rgba(201,162,39,0.3),inset_0_-2px_4px_rgba(0,0,0,0.7)]",
    rimLight: "after:bg-gradient-to-tr after:from-transparent after:via-[#c9a227]/30 after:to-transparent",
  },
  "amethyst": {
    label: "M",
    gradient: "from-[#8a2be2] via-[#4b0082] to-[#2e004f]",
    borderCol: "border-[#d8bfd8]/50",
    textCol: "text-white",
    glow: "drop-shadow-[0_0_15px_rgba(138,43,226,0.6)]",
    innerGlow: "shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.5)]",
    rimLight: "after:bg-gradient-to-tr after:from-transparent after:via-white/40 after:to-transparent",
  },
  "holographic": {
    label: "H",
    gradient: "from-[#ff0080] via-[#40e0d0] to-[#7b68ee]",
    borderCol: "border-white/80",
    textCol: "text-white",
    glow: "drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]",
    innerGlow: "shadow-[inset_0_2px_6px_rgba(255,255,255,0.8)]",
    rimLight: "after:bg-gradient-to-tr after:from-white/50 after:to-transparent",
    special: "holographic",
  }
};

export default function InfluenceBadge({ 
  rank, 
  variant,
  className = "", 
  size = 'md', 
  onClick,
  showLabel = true 
}: InfluenceBadgeProps & { variant?: string }) {
  const normalizedRank = (variant || rank?.toUpperCase() || 'D') as string;
  const config = BADGE_CONFIG[normalizedRank] || BADGE_CONFIG.D;

  const sizeClasses = {
    sm: "w-9 h-12 text-xs",
    md: "w-11 h-15 text-sm",
    lg: "w-15 h-22 text-base",
    xl: "w-20 h-28 text-lg",
  };

  const labelSize = {
    sm: "text-[5px]",
    md: "text-[6px]",
    lg: "text-[8px]",
    xl: "text-[10px]",
  };

  const rankSize = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
    xl: "text-5xl",
  };

  const isHighRank = ['S', 'A', 'black-gold', 'rose-gold', 'crimson', 'amethyst', 'holographic'].includes(normalizedRank);

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        relative flex flex-col items-center justify-center transition-all duration-500
        ${onClick ? "active:scale-90 cursor-pointer hover:scale-110" : "cursor-default"}
        ${sizeClasses[size]}
        ${config.glow}
        ${className}
      `}
    >
      {/* 1. Base Shape with Bevel/Emboss */}
      <div className={`
        absolute inset-0 bg-gradient-to-b ${config.gradient}
        border ${config.borderCol} ${config.innerGlow}
        [clip-path:polygon(0%_0%,100%_0%,100%_80%,50%_100%,0%_80%)]
        before:absolute before:inset-0 before:bg-white/10 before:mix-blend-overlay
        after:absolute after:inset-0 ${config.rimLight}
        ${config.special === 'holographic' ? 'animate-[holoGradient_5s_infinite]' : ''}
      `} />

      {/* 2. Metal Texture & Noise Overlay */}
      <div className="absolute inset-0 opacity-30 pointer-events-none mix-blend-soft-light [clip-path:polygon(0%_0%,100%_0%,100%_80%,50%_100%,0%_80%)]" 
           style={{ backgroundImage: `url("https://res.cloudinary.com/dchkzn79d/image/upload/v1737077656/noise_w9lq5j.png")`, backgroundSize: '80px 80px' }} />

      {/* 3. Ornament / Frame (High Rank only) */}
      {isHighRank && (
        <div className="absolute inset-1 border border-white/20 opacity-30 pointer-events-none [clip-path:polygon(0%_0%,100%_0%,100%_80%,50%_100%,0%_80%)] scale-90" />
      )}

      {/* 4. Content (Rank & Text) */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full pb-3">
        {showLabel && (
          <span className={`
            font-black ${labelSize[size]} ${config.textCol} tracking-[0.25em] leading-none mb-1 opacity-80
            [text-shadow:0.5px_0.5px_0px_rgba(255,255,255,0.2),-0.5px_-0.5px_0px_rgba(0,0,0,0.3)]
          `}>
            RANK
          </span>
        )}
        <div className="relative">
          <span className={`
            font-black font-serif ${rankSize[size]} ${config.textCol} leading-none inline-block
            ${normalizedRank === 'D' 
              ? '[text-shadow:1px_1px_0.5px_rgba(255,255,255,0.1),-1px_-1px_1px_rgba(0,0,0,0.8)]' 
              : '[text-shadow:-1px_-1px_0px_rgba(255,255,255,0.4),1px_1px_0px_rgba(0,0,0,0.5),2px_2px_2px_rgba(0,0,0,0.3)]'}
          `}>
            {config.label}
          </span>
          
          {normalizedRank === 'S' && (
            <div className="absolute -top-3 -left-1 opacity-25 -rotate-12 scale-110 pointer-events-none">
               <LaurelIcon size={size === 'sm' ? 14 : size === 'md' ? 24 : 36} className={config.textCol} />
            </div>
          )}
        </div>
      </div>

      {/* 5. Rank S / Special Effects */}
      {(normalizedRank === 'S' || normalizedRank === 'black-gold') && (
        <div className="absolute inset-[-4px] border border-white/20 rounded-full animate-ping opacity-10 pointer-events-none" />
      )}
    </button>
  );
}
