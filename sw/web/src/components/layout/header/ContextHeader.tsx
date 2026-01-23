"use client";

import { ICON_COLORS } from "@/components/ui/icons/neo-pantheon/types";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * DetailedPillar: Doric style pillar (Simple & Solid).
 */
function DetailedPillar({ className, side, opacity = 0.4 }: { className?: string; side: "left" | "right"; opacity?: number }) {
  const isLeft = side === "left";
  return (
    <div className={cn("pointer-events-none select-none", className)}>
      <svg viewBox="0 0 80 500" fill="none" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Capital - Doric Style (Simple Abacus + Echinus) */}
        <g strokeOpacity={opacity}>
          {/* 1. Abacus (Top slab) - Filled */}
          <rect x="5" y="10" width="70" height="12" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="#000000" fillOpacity="0.9" />
          
          {/* 2. Echinus (Curved cushion) - Filled */}
          {/* Connects Abacus (width 70) to Necking/Shaft (width 50) */}
          <path
            d="M5 22 
               Q10 40, 15 45
               H65
               Q70 40, 75 22
               Z"
             stopColor={ICON_COLORS.GOLD}
             fill="#000000"
             fillOpacity="0.8"
             stroke={ICON_COLORS.GOLD}
             strokeWidth="1.2"
          />
          
          {/* 3. Necking (Neck rings) - Simple horizontal lines */}
          <line x1="15" y1="48" x2="65" y2="48" stroke={ICON_COLORS.GOLD} strokeWidth="1" />
          <line x1="15" y1="52" x2="65" y2="52" stroke={ICON_COLORS.GOLD} strokeWidth="1" />
        </g>
        
        {/* Shaft - Strokes with opacity, Inner fill for occlusion */}
        <g strokeOpacity={opacity}>
          {/* Precise background for shaft */}
          <rect x="15" y="55" width="50" height="385" fill="#000000" fillOpacity="0.9" stroke="none" />
          
          {/* Shaft Borders */}
          <line x1="15" y1="55" x2="15" y2="440" stroke={ICON_COLORS.GOLD} strokeWidth="2.5" />
          <line x1="65" y1="55" x2="65" y2="440" stroke={ICON_COLORS.GOLD} strokeWidth="2.5" />
          
          {/* Fluting (Vertical Grooves) */}
          {[25, 35, 45, 55].map(x => (
            <line key={x} x1={x} y1="55" x2={x} y2="435" stroke={ICON_COLORS.GOLD} strokeWidth="0.8" opacity="0.6" />
          ))}
          
          {/* Subtle curved shading lines for roundness */}
          <path d="M15 65 Q20 65, 25 65 M55 65 Q60 65, 65 65" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.3" />
          <path d="M15 435 Q20 435, 25 435 M55 435 Q60 435, 65 435" stroke={ICON_COLORS.GOLD} strokeWidth="0.5" fill="none" opacity="0.3" />
        </g>
        
        {/* Base - Strokes with opacity, Inner fill for occlusion */}
        <g strokeOpacity={opacity}>
          <rect x="10" y="440" width="60" height="12" stroke={ICON_COLORS.GOLD} strokeWidth="2" fill="#000000" fillOpacity="0.9" />
          <rect x="5" y="452" width="70" height="15" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" fill="#000000" fillOpacity="0.9" />
          <rect x="0" y="467" width="80" height="15" stroke={ICON_COLORS.GOLD} strokeWidth="2.5" fill="#000000" fillOpacity="0.9" />
          <line x1="0" y1="482" x2="80" y2="482" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" opacity="0.5" />
          <line x1="0" y1="492" x2="80" y2="492" stroke={ICON_COLORS.GOLD} strokeWidth="1" opacity="0.3" />
        </g>
      </svg>
    </div>
  );
}

/**
 * TempleFloor: Grid tile floor with perspective.
 * Corrected perspective: Lines converge towards the top (horizon).
 */
function TempleFloor({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none select-none", className)}>
      <svg viewBox="0 0 1000 120" fill="none" preserveAspectRatio="none" className="w-full h-full">
        {/* Deep background gradient for depth */}
        <defs>
          <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ICON_COLORS.GOLD} stopOpacity="0.1" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Horizon Line (The End of the Floor) - Visibly marked */}
        <line x1="0" y1="0" x2="1000" y2="0" stroke={ICON_COLORS.GOLD} strokeWidth="2" opacity="0.6" />
        
        {/* Horizontal perspective lines */}
        <line x1="0" y1="15" x2="1000" y2="15" stroke={ICON_COLORS.GOLD} strokeWidth="0.6" opacity="0.15" />
        <line x1="0" y1="35" x2="1000" y2="35" stroke={ICON_COLORS.GOLD} strokeWidth="0.7" opacity="0.2" />
        <line x1="0" y1="60" x2="1000" y2="60" stroke={ICON_COLORS.GOLD} strokeWidth="0.8" opacity="0.3" />
        <line x1="0" y1="90" x2="1000" y2="90" stroke={ICON_COLORS.GOLD} strokeWidth="1" opacity="0.4" />
        <line x1="0" y1="120" x2="1000" y2="120" stroke={ICON_COLORS.GOLD} strokeWidth="1.5" opacity="0.5" />

        {/* Vertical perspective lines */}
        {[-200, 0, 200, 400, 600, 800, 1000, 1200].map(bottomX => (
          <line 
            key={bottomX} 
            x1={500 + (bottomX - 500) * 0.4} 
            y1="0" 
            x2={bottomX} 
            y2="120" 
            stroke={ICON_COLORS.GOLD} 
            strokeWidth="0.8" 
            opacity="0.2" 
          />
        ))}

        {/* Floor Tint/Fill for substance */}
        <rect x="0" y="0" width="1000" height="120" fill="url(#floorFade)" opacity="0.3" />

        {/* Subtle grid intersections highlight */}
        <rect x="0" y="118" width="1000" height="2" fill={ICON_COLORS.GOLD} opacity="0.2" />
      </svg>
    </div>
  );
}

/**
 * SacredBrazier: Small brazier with rectangular base and tiny animated flame.
 */
function SacredBrazier({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none select-none", className)}>
      <style jsx>{`
        @keyframes tinyFlame {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.8; }
          50% { transform: scale(1.05, 1.15) translateY(-5px); opacity: 1; }
        }
        @keyframes distantGlow {
          0%, 100% { filter: blur(8px) opacity(0.3); }
          50% { filter: blur(12px) opacity(0.5); }
        }
      `}</style>
      <svg viewBox="0 0 140 140" fill="none" className="w-full h-full">
        {/* Glow - Taller to match the flame */}
        <ellipse cx="70" cy="55" rx="25" ry="35" fill={ICON_COLORS.GOLD} style={{ animation: 'distantGlow 3s ease-in-out infinite' }} />
        
        {/* Flame - Taller and Vertical */}
        <g style={{ transformOrigin: '50% 80%', animation: 'tinyFlame 2.0s ease-in-out infinite' }}>
           {/* Main Body of Flame - Reaching higher */}
          <path d="M70 15 C55 35, 50 60, 55 75 C57 80, 62 82, 70 82 C78 82, 83 80, 85 75 C90 60, 85 35, 70 15 Z" fill={ICON_COLORS.GOLD} opacity="0.8" />
          {/* Inner Core */}
          <path d="M70 30 C62 45, 60 65, 62 75 C63 78, 66 80, 70 80 C74 80, 77 78, 78 75 C80 65, 78 45, 70 30 Z" fill="#ffaa00" />
          {/* Highlights - Vertical streaks */}
          <path d="M66 60 Q70 40, 74 60" stroke="#ffffff" strokeWidth="1" opacity="0.6" fill="none" />
        </g>

        {/* Brazier Body - Wider Rectangular Design */}
        <g stroke={ICON_COLORS.GOLD} fill="#0d0d0d">
            {/* Top Bowl - Wide & Shallow */}
            <path d="M30 75 L110 75 L115 90 L25 90 Z" strokeWidth="2" />
            
            {/* Decorative horizontal line on the bowl */}
            <line x1="32" y1="82" x2="108" y2="82" strokeWidth="1" opacity="0.5" />

            {/* Rectangular Stem/Support - Wider */}
            <rect x="55" y="90" width="30" height="12" strokeWidth="1.5" />
            
            {/* Rectangular Base - Wide & Stable */}
            <rect x="35" y="102" width="70" height="10" strokeWidth="2.5" />
            <rect x="25" y="112" width="90" height="5" strokeWidth="2" opacity="0.8" />
        </g>
      </svg>
    </div>
  );
}

interface ContextHeaderProps {
  title: string;
  subtitle?: string; // e.g., "archive"
  userId: string;
  isOwner?: boolean;
}

export default function ContextHeader({ title, subtitle = "Archive", userId, isOwner }: ContextHeaderProps) {
  return (
    <div className="border-b-[1px] border-accent-dim/30 bg-black pt-8 pb-6 sm:pt-12 sm:pb-10 relative overflow-hidden transition-all duration-500 shadow-2xl min-h-[300px] sm:min-h-[450px] flex items-center justify-center group/header">
        {/* Background Embellishment */}
        <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[60px] sm:text-[100px] md:text-[180px] font-cinzel text-accent/10 pointer-events-none select-none tracking-[0.5em] font-black uppercase whitespace-nowrap blur-[2px] transition-all duration-700 group-hover/header:opacity-20">
          {subtitle}
        </div>

        {/* Temple Architecture */}
        <div className="absolute inset-0 z-0">
          {/* Floor & Brazier (Rendered FIRST to be BEHIND the pillars) */}
          <div className="absolute bottom-0 left-0 right-0 h-16 md:h-24">
            <TempleFloor className="w-full h-full" />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-16 md:w-24 h-16 md:h-24">
                <SacredBrazier className="w-full h-full drop-shadow-[0_-3px_12px_rgba(212,175,55,0.3)]" />
            </div>
          </div>

          {/* Left Colonnade */}
          <div className="absolute left-4 md:left-12 top-0 bottom-0 w-[60px] md:w-[120px]">
            <DetailedPillar side="left" opacity={0.6} className="w-full h-full scale-[1.1] translate-x-[-20%] drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]" />
          </div>
          <div className="absolute left-[80px] md:left-[220px] top-0 bottom-0 w-[50px] md:w-[100px]">
            <DetailedPillar side="left" opacity={0.35} className="w-full h-full scale-[0.9] translate-x-[-10%]" />
          </div>
          <div className="hidden md:block absolute left-[140px] md:left-[360px] top-0 bottom-0 w-[40px] md:w-[80px]">
            <DetailedPillar side="left" opacity={0.15} className="w-full h-full scale-[0.75]" />
          </div>

          {/* Right Colonnade */}
          <div className="absolute right-4 md:right-12 top-0 bottom-0 w-[60px] md:w-[120px]">
            <DetailedPillar side="right" opacity={0.6} className="w-full h-full scale-[1.1] translate-x-[20%] drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]" />
          </div>
          <div className="absolute right-[80px] md:right-[220px] top-0 bottom-0 w-[50px] md:w-[100px]">
            <DetailedPillar side="right" opacity={0.35} className="w-full h-full scale-[0.9] translate-x-[10%]" />
          </div>
          <div className="hidden md:block absolute right-[140px] md:right-[360px] top-0 bottom-0 w-[40px] md:w-[80px]">
            <DetailedPillar side="right" opacity={0.15} className="w-full h-full scale-[0.75]" />
          </div>
        </div>

        {/* Decorative Top Line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-80" />

      <div className="container max-w-7xl mx-auto px-4 md:px-8 relative z-10 text-center -translate-y-8 sm:-translate-y-12 transition-transform duration-500">
        {/* Breadcrumbs & Title */}
        <div className="inline-flex flex-col items-center">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 md:mb-5">
            <div className="h-px w-8 sm:w-16 bg-accent shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
            <span className="text-cinzel text-accent-dim text-[10px] sm:text-sm tracking-[0.4em] font-black drop-shadow-sm">THE RECORD OF</span>
            <div className="h-px w-8 sm:w-16 bg-accent shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
          </div>
          
          <h1 className="text-3xl sm:text-5xl md:text-8xl font-serif font-black text-text-primary tracking-tight drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] mb-4 md:mb-8">
            {title}의 기록관
          </h1>

          <div className="mt-2 flex items-center justify-center gap-3 md:gap-4 scale-110 md:scale-125">
             <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_12px_rgba(212,175,55,1)]" />
             <span className="text-serif text-accent text-[11px] sm:text-sm tracking-[0.2em] font-black uppercase">Official Sacred Record</span>
             <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_12px_rgba(212,175,55,1)]" />
          </div>
        </div>

      </div>
    </div>
  );
}
