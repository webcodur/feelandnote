"use client";

import { useRef, useState } from "react";
import { Pilcrow } from "lucide-react";

export default function TypographyBanner() {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div 
      className="relative w-full h-[700px] bg-[#080808] overflow-hidden flex flex-col items-center justify-center select-none"
      onMouseMove={handleMouseMove}
    >
      {/* Background Texture (Subtle Noise) */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* 
        The Main Title 
        Using background-clip: text with a radial gradient that moves with the mouse
      */}
      <div className="relative z-10 px-8 text-center mix-blend-screen">
         <h1 
            className="text-[120px] md:text-[180px] leading-[0.8] font-serif font-black tracking-tighter text-transparent bg-clip-text transition-all duration-75"
            style={{
               backgroundImage: `radial-gradient(
                  circle 400px at ${mousePos.x}% ${mousePos.y}%, 
                  #ffd700 0%, 
                  #d4af37 30%, 
                  #654321 60%, 
                  #1a1a1a 100%
               )`,
               WebkitBackgroundClip: 'text',
               textShadow: '0 2px 10px rgba(0,0,0,0.5)' // Gives depth 'behind' the text
            }}
         >
            MAGNUM<br/>OPUS
         </h1>
      </div>

      {/* Secondary Text / Subtitle */}
      <div className="mt-12 max-w-2xl text-center space-y-6">
         <div className="h-px w-32 bg-[#d4af37]/30 mx-auto" />
         <p 
            className="font-cinzel text-[#e0e0e0] text-sm md:text-base tracking-[0.5em] uppercase opacity-60"
            style={{
               transform: `translateX(${(mousePos.x - 50) * 0.1}px)`
            }}
         >
            The Great Work of Your Life
         </p>
         <div className="h-px w-32 bg-[#d4af37]/30 mx-auto" />
      </div>

      {/* Decorative Marks */}
      <div className="absolute top-10 left-10 text-[#d4af37]/20 font-serif text-9xl leading-none opacity-20 select-none pointer-events-none">
         “
      </div>
      <div className="absolute bottom-10 right-10 text-[#d4af37]/20 font-serif text-9xl leading-none opacity-20 select-none pointer-events-none rotate-180">
         “
      </div>
      
      {/* Floating Letters (Deep Background) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10 font-cinzel text-[#d4af37]">
         <span className="absolute top-[10%] left-[5%] text-9xl blur-[2px]">A</span>
         <span className="absolute top-[60%] right-[10%] text-9xl blur-[4px]">Ω</span>
         <span className="absolute bottom-[20%] left-[20%] text-8xl blur-[3px]">∑</span>
      </div>

      <div className="absolute bottom-12 text-white/10 text-[10px] font-mono pointer-events-none flex items-center gap-2">
         <Pilcrow size={12} />
         <span>ILLUMINATED MANUSCRIPT</span>
      </div>

    </div>
  );
}
