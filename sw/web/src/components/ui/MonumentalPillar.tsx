import React from "react";

interface MonumentalPillarProps {
  className?: string;
}

export function MonumentalPillar({ className = "" }: MonumentalPillarProps) {
  return (
    <div className={`flex flex-col items-center self-stretch flex-shrink-0 pt-16 pb-8 hidden lg:flex ${className}`}>
      {/* Pillar Head (Capital) */}
      <div className="w-8 h-3 bg-[#222] border-2 border-accent shadow-[0_0_15px_rgba(212,175,55,0.5)] z-10" />
      
      {/* Pillar Body (Shaft) */}
      <div className="flex-1 w-2 relative bg-gradient-to-r from-[#1a1a1a] via-[#333] to-[#111] border-x border-accent-dim/30 shadow-[5px_0_15px_rgba(0,0,0,0.5)]">
        {/* Glow effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/20 to-transparent pointer-events-none" />
      </div>
      
      {/* Pillar Base (Plinth) */}
      <div className="w-8 h-3 bg-[#222] border-2 border-accent shadow-[0_0_15_rgba(212,175,55,0.5)] z-10" />
    </div>
  );
}
