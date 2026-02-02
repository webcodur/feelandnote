"use client";

import { useRef, useState, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

export default function AstrolabeBanner({ children }: Props) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse movement for parallax/rotation
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setMousePos({ x, y });
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[700px] overflow-hidden bg-[#020202] text-[#e0e0e0] flex items-center justify-center perspective-[1000px]"
    >
      {/* 0. Background Deep Space & Nebulas */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1500_0%,#000000_70%)] opacity-80" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse-slow" />
      
      {/* 1. Constellations Layer (Slow Rotate) */}
      <div className="absolute inset-[-50%] w-[200%] h-[200%] opacity-40 animate-[spin_240s_linear_infinite]">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-white/5 border-dashed" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full border border-white/5" />
         {/* Stars scattered */}
         {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={i} 
              className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
              style={{
                top: `${50 + Math.cos(i) * 30}%`,
                left: `${50 + Math.sin(i) * 30}%`,
                animationDelay: `${i * 0.5}s`
              }} 
            />
         ))}
      </div>

      {/* 2. THE ASTROLABE (Main Mechanical Structure) */}
      {/* We use transforms based on mousePos to give a 3D tilting effect */}
      <div 
        className="relative z-10 w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full flex items-center justify-center transition-transform duration-100 ease-out"
        style={{
          transform: `rotateX(${mousePos.y * -20}deg) rotateY(${mousePos.x * 20}deg) scale(0.9)`,
          boxShadow: '0 0 100px -20px rgba(212,175,55,0.1)'
        }}
      >
        {/* Outer Ring: Calendar/Zodiac - Rotates Counter-Clockwise */}
        <div className="absolute inset-0 rounded-full border-[1px] border-[#d4af37]/30 flex items-center justify-center animate-[spin_60s_linear_infinite_reverse]">
           <div className="absolute inset-2 rounded-full border-[1px] border-[#d4af37]/10 border-dashed" />
           {/* Decor */}
           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 w-4 h-8 bg-[#d4af37] [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
           {/* Runes/Marks */}
           {Array.from({ length: 12 }).map((_, i) => (
             <div 
               key={i} 
               className="absolute top-4 left-1/2 origin-bottom h-[50%]" 
               style={{ transform: `translateX(-50%) rotate(${i * 30}deg)` }}
             >
               <span className="block text-[10px] text-[#d4af37]/60 font-serif transform -rotate-90 mt-2">
                 {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][i]}
               </span>
               <div className="w-[1px] h-3 bg-[#d4af37]/40 mx-auto" />
             </div>
           ))}
        </div>

        {/* Middle Ring: Moving Plates - Rotates Clockwise based on Mouse X */}
        <div 
           className="absolute w-[70%] h-[70%] rounded-full border-[40px] border-[#d4af37]/10 flex items-center justify-center shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-sm"
           style={{ transform: `rotate(${mousePos.x * 60}deg)` }}
        >
           <div className="absolute inset-0 border border-[#d4af37]/40 rounded-full" />
           <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[1px] h-full bg-[#d4af37]/20" />
              <div className="h-[1px] w-full bg-[#d4af37]/20 absolute" />
           </div>
        </div>

        {/* Inner Gear: The Core Mechanism - Fast Spin on Hover */}
        <div className="absolute w-[40%] h-[40%] rounded-full border border-[#d4af37] bg-black/80 flex items-center justify-center group">
           <div className="absolute inset-0 rounded-full border-4 border-dashed border-[#d4af37]/30 animate-[spin_20s_linear_infinite]" />
        </div>
      </div>

      {/* 3. Foreground Overlay Content (Static, unconnected to rotation) */}
      {children && (
        <div className="absolute z-20 text-center pointer-events-none flex flex-col items-center justify-center">
          {children}
        </div>
      )}

       {/* 4. Vignette & Grain */}
       <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,black_100%)]" />
       
    </div>
  );
}
