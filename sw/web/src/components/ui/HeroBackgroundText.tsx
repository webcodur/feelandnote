import React from "react";

interface HeroBackgroundTextProps {
  text: string;
  className?: string;
}

export function HeroBackgroundText({ text, className = "" }: HeroBackgroundTextProps) {
  return (
    <div 
      className={`absolute top-4 left-1/2 -translate-x-1/2 font-cinzel text-[14vw] font-black pointer-events-none z-0 user-select-none whitespace-nowrap tracking-[0.3em] opacity-[0.03] text-accent select-none transition-all duration-1000 ${className}`}
      style={{
        textShadow: "0 0 40px rgba(212, 175, 55, 0.1)"
      }}
    >
      {text}
    </div>
  );
}
