"use client";

import Link from "next/link";

// Custom Neo-Pantheon SVG Icons
const Icons = {
  Scroll: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Rolled Top */}
      <path d="M19 4H5C3.89543 4 3 4.89543 3 6V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V6C21 4.89543 20.1046 4 19 4Z" opacity="0.1" fill="currentColor"/>
      <path d="M4 6V18C4 18.55 4.45 19 5 19H19C19.55 19 20 18.55 20 18V6C20 5.45 19.55 5 19 5H5C4.45 5 4 5.45 4 6Z" />
      
      {/* Scroll Detail - Top Roll */}
      <path d="M4 6c0-1.1.9-2 2-2h13c1.1 0 2 .9 2 2" strokeWidth="1.2"/>
      {/* Bottom Roll */}
      <path d="M4 18c0 1.1.9 2 2 2h13c1.1 0 2-.9 2-2" strokeWidth="1.2"/>

      {/* Content Lines (Text) */}
      <path d="M8 9h8" opacity="0.6"/>
      <path d="M8 12h8" opacity="0.6"/>
      <path d="M8 15h5" opacity="0.6"/>
      
      {/* Wax Seal / Ribbon (Optional detail) */}
      <circle cx="16" cy="15" r="2" fill="currentColor" fillOpacity="0.2" stroke="none" />
    </svg>
  ),
  Scales: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Central Pillar & Base */}
      <path d="M12 2v20" />
      <path d="M8 22h8" />
      
      {/* Tilted Beam (Pivot at 12,6) - Left High (5,4), Right Low (19,8) */}
      <path d="M5 4L19 8" strokeWidth="1.2" />
      <circle cx="12" cy="6" r="1" fill="currentColor" stroke="none" />

      {/* Left Pan (Lighter/Higher) */}
      {/* Chains hanging VERTICALLY from (5,4) */}
      <path d="M5 4l-2.5 6" opacity="0.5" />
      <path d="M5 4l2.5 6" opacity="0.5" />
      {/* Pan at y=10 */}
      <path d="M2.5 10c0 1.5 1.1 2.5 2.5 2.5s2.5-1 2.5-2.5h-5z" />

      {/* Right Pan (Heavier/Lower) */}
      {/* Chains hanging VERTICALLY from (19,8) */}
      <path d="M19 8l-2.5 6" opacity="0.5" />
      <path d="M19 8l2.5 6" opacity="0.5" />
      {/* Pan at y=14 */}
      <path d="M16.5 14c0 1.5 1.1 2.5 2.5 2.5s2.5-1 2.5-2.5h-5z" />
    </svg>
  ),
  Sundial: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12L16 8" strokeWidth="1.5" /> {/* Gnomon */}
      <path d="M12 3v2" />
      <path d="M12 19v2" />
      <path d="M3 12h2" />
      <path d="M19 12h2" />
      <path d="M17.5 17.5l-1.4-1.4" />
      <path d="M17.5 6.5l-1.4 1.4" />
      <path d="M6.5 17.5l1.4-1.4" />
      <path d="M6.5 6.5l1.4 1.4" />
      {/* Shadow */}
      <path d="M12 12l-2 2" strokeWidth="0.5" opacity="0.5" />
    </svg>
  ),
  Podium: (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* 2nd Place (Left) */}
      <path d="M3 12h6v9H3z" />
      <text x="6" y="18" textAnchor="middle" fontSize="4" fontFamily="serif" fill="currentColor" stroke="none" opacity="0.5">II</text>
      
      {/* 1st Place (Center - Tallest) */}
      <path d="M9 8h6v13H9z" />
      <text x="12" y="14" textAnchor="middle" fontSize="4" fontFamily="serif" fill="currentColor" stroke="none" opacity="0.8">I</text>
      
      {/* 3rd Place (Right) */}
      <path d="M15 15h6v6h-6z" />
      <text x="18" y="20" textAnchor="middle" fontSize="4" fontFamily="serif" fill="currentColor" stroke="none" opacity="0.5">III</text>

      {/* Heroic Wreath on top of 1st */}
      <path d="M10 5c0-1.5 1-2 2-2s2 .5 2 2" strokeWidth="1" opacity="0.8" />
    </svg>
  )
};

const LOUNGE_GAMES = [
  {
    id: "feed",
    title: "피드",
    description: "친구들의 최신 소식을 확인하세요",
    icon: <Icons.Scroll />,
    link: "/feed", // Link to feed or dashboard
    status: "확인 가능" // 'Available' context
  },
  {
    id: "higher-lower",
    title: "업다운",
    description: "두 인물 중 더 높은 평점을 맞춰보세요",
    icon: <Icons.Scales />,
    link: "/lounge/higher-lower",
    status: "플레이 가능"
  },
  {
    id: "timeline",
    title: "연대기",
    description: "인물들의 활동 시기를 맞춰보세요",
    icon: <Icons.Sundial />,
    link: "/lounge/timeline",
    status: "플레이 가능"
  },
  {
    id: "tier-list",
    title: "티어리스트",
    description: "나만의 콘텐츠 순위표를 만들어보세요",
    icon: <Icons.Podium />,
    link: "/lounge/tier-list",
    status: "준비 중"
  }
];

export default function LoungePreview() {
  const ROMAN_NUMERALS = ["I", "II", "III", "IV"];

  return (
    <div className="w-full py-16">
      {/* Architectural Architrave (Header) */}
      <div className="w-full relative mx-auto max-w-7xl flex flex-col items-center mb-0 z-20">
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-[#44403c] to-transparent opacity-50" />
        <div className="w-[80%] h-[1px] mt-[1px] bg-gradient-to-r from-transparent via-[#78716c] to-transparent opacity-30" />
      </div>
      
      {/* Main Colonnade Container */}
      <div className="relative border-x border-[#292524] bg-[#0c0a09] mx-auto max-w-7xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)_inset]">
        {/* Background Texture - Warm Stone & Noise */}
        <div className="absolute inset-0 opacity-[0.3] bg-[url('/patterns/noise.png')] mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c1917] via-[#0c0a09] to-[#050505] opacity-90" />
        
        <div className="grid grid-cols-1 md:grid-cols-4 relative z-10">
          {LOUNGE_GAMES.map((game, index) => (
            <Link
              key={game.id}
              href={game.link}
              className={`group relative h-[400px] md:h-[480px] flex flex-col items-center justify-end pb-14 transition-all duration-500 ease-out
                ${index !== LOUNGE_GAMES.length - 1 ? 'md:border-r border-[#292524]' : ''}
              `}
            >
              {/* Pillar Decoration - The Capital */}
              <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent opacity-100 pointer-events-none" />
              <div className="absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-[#44403c] to-transparent" />

              {/* Roman Numeral - Background Inscription (Visible & Warm) */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 text-7xl font-serif text-[#292524] 
                            opacity-50 group-hover:opacity-80 
                            transition-all duration-700 
                            select-none mix-blend-color-dodge font-black tracking-tighter
                            group-hover:scale-110 group-hover:text-[#574c3e] group-hover:blur-[1px]">
                {ROMAN_NUMERALS[index]}
              </div>

              {/* Pillar Shadow Effect - Fluting */}
              <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-black/50 via-[#1c1917] to-black/50 opacity-40" />
              <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-[#292524] via-[#1c1917] to-[#292524] opacity-30" />

              {/* Lighting - The Radiant Abyss (Always On Ambient) */}
              {/* 1. Base Warmth (Always visible) */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#B4925A]/10 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              {/* 2. Central Glow (Hover Enhancer) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#F7E7CE] opacity-0 group-hover:opacity-10 blur-[100px] transition-opacity duration-500" />

              {/* Content Container */}
              <div className="relative z-10 flex flex-col items-center text-center w-full px-6">
                
                {/* Icon - The Golden Coin Artifact (Brighter Base) */}
                <div className="mb-10 relative group-hover:-translate-y-3 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                   {/* Coin Outer Ring / Halo */}
                   <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#B4925A] to-[#60492C] opacity-10 group-hover:opacity-40 blur-xl transition-opacity duration-500" />
                   
                   {/* Coin Container */}
                   <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center
                                 bg-gradient-to-br from-[#292524] to-[#1c1917]
                                 border border-[#44403c] group-hover:border-[#a8a29e] group-hover:border-opacity-100
                                 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5),0_10px_30px_rgba(0,0,0,0.5)]
                                 transition-all duration-500 group-hover:shadow-[inset_0_2px_20px_rgba(0,0,0,0.2),0_0_40px_rgba(180,146,90,0.4)]">
                     
                     {/* Inner Metallic Rim */}
                     <div className="absolute inset-1 rounded-full border border-[#57534e] opacity-30 group-hover:opacity-80 transition-opacity duration-500" />
                     
                     {/* The Icon itself - Metallic Relief (Brighter Default) */}
                     <div className="text-[#a8a29e] group-hover:text-[#F7E7CE] transition-colors duration-300
                                   drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)] group-hover:drop-shadow-[0_2px_8px_rgba(247,231,206,0.5)]
                                   [&>svg]:w-10 [&>svg]:h-10 md:[&>svg]:w-12 md:[&>svg]:h-12">
                        {game.icon}
                     </div>
                   </div>
                </div>

                {/* Title - Elegant & Sharp (Brighter) */}
                <h3 className="text-lg md:text-xl font-serif font-bold text-[#d6d3d1] group-hover:text-[#F3E5AB] transition-colors duration-300 uppercase tracking-[0.2em] mb-4">
                  {game.title}
                </h3>

                {/* Divider - Decorative Line */}
                <div className="w-8 h-[1px] bg-[#57534e] mb-4 group-hover:w-16 group-hover:bg-[#d4af37] transition-all duration-500" />

                {/* Description - Subtle Whisper (More Legible) */}
                 <p className="font-sans text-[11px] md:text-xs text-[#78716c] group-hover:text-[#e5e5e5] transition-colors duration-300 leading-relaxed max-w-[220px] line-clamp-2 h-8">
                  {game.description}
                </p>

                {/* Status - Ancient Seal */}
                <div className="mt-8 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                   <div className={`px-3 py-1 border ${
                    game.status === "플레이 가능" 
                      ? "border-[#4d7c0f]/40 text-[#65a30d]" 
                      : "border-[#44403c] text-[#78716c]"
                   } rounded-sm group-hover:border-opacity-100 transition-all duration-500 bg-black/20`}>
                     <span className="font-cinzel text-[9px] tracking-[0.3em] uppercase">
                       {game.status === "플레이 가능" ? "Unsealed" : "Sealed"}
                     </span>
                   </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Base / Stylobate */}
      <div className="w-full h-1 border-t border-[#1c1917] bg-[#0c0a09] mx-auto max-w-7xl relative opacity-50" />
    </div>
  );
}
