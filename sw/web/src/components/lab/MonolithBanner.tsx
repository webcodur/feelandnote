"use client";

import { useRef, useState } from "react";
import { MoveUpRight } from "lucide-react";

export default function MonolithBanner() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
      className="relative w-full h-[700px] bg-[#050505] overflow-hidden flex items-center justify-center perspective-[1000px] group"
    >
      {/* 0. Red/Dark Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(60,0,0,0.2)_0%,transparent_70%)]" />
      
      {/* Grid Floor - Moving inversely to mouse for parallax */}
      <div 
        className="absolute bottom-[-150px] w-[200%] h-[600px] bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] perspective-origin-center transform-style-3d origin-top" 
        style={{ transform: `rotateX(70deg) translateY(${mousePos.y * 30}px) translateX(${mousePos.x * 30}px)` }}
      />

      {/* 1. THE MONOLITH CONTAINER */}
      <div 
        className="relative z-10 w-[240px] h-[480px] preserve-3d transition-transform duration-100 ease-out"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${mousePos.y * -15}deg) rotateY(${mousePos.x * 35 + 20}deg)` 
          // Default slightly rotated Y (+20deg) to show depth immediately
        }}
      >
        {/* Front Face */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-black border border-stone-800 flex items-center justify-center backface-hidden shadow-2xl">
           {/* Surface Texture */}
           <div className="absolute inset-0 bg-[url('/patterns/noise.png')] opacity-20 mix-blend-overlay" />
           {/* Sheen/Reflection */}
           <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-50" />
           
           {/* Runes */}
           <div className="relative z-10 flex flex-col items-center gap-8 opacity-40 group-hover:opacity-80 transition-opacity duration-700">
               <div className="w-[1px] h-20 bg-gradient-to-b from-transparent via-accent to-transparent" />
               <span className="font-cinzel text-3xl font-bold text-stone-700 group-hover:text-accent/50 transition-colors">I II III</span>
               <div className="w-[1px] h-20 bg-gradient-to-b from-transparent via-accent to-transparent" />
           </div>

           {/* Scanner Light Effect */}
           <div className="absolute top-0 w-full h-[1px] bg-accent shadow-[0_0_15px_rgba(212,175,55,1)] animate-[scan_4s_ease-in-out_infinite] opacity-50" />
        </div>

        {/* Right Side (Thickness) */}
        <div 
          className="absolute inset-y-0 right-0 w-[40px] bg-[#0a0a0a] origin-right transform rotate-y-90 border-r border-t border-b border-stone-800"
          style={{ transform: 'rotateY(90deg) translateZ(0px)' }}
        >
             <div className="w-full h-full bg-gradient-to-l from-black to-stone-900 opacity-80" />
        </div>

        {/* Left Side (Thickness) */}
        <div 
          className="absolute inset-y-0 left-0 w-[40px] bg-[#0a0a0a] origin-left transform -rotate-y-90 border-l border-t border-b border-stone-800"
           style={{ transform: 'rotateY(-90deg) translateZ(0px)' }}
        >
             <div className="w-full h-full bg-gradient-to-r from-black to-stone-900 opacity-80" />
        </div>

         {/* Top Side (Thickness) */}
         <div 
          className="absolute inset-x-0 top-0 h-[40px] bg-[#111] origin-top transform rotate-x-90 border border-stone-800"
           style={{ transform: 'rotateX(90deg) translateZ(0px)' }}
        >
             <div className="w-full h-full bg-stone-900" />
        </div>

      </div>

      {/* 2. Abstract Geometric Floaters (Static/Ambient for scale) */}
      <div 
        className="absolute w-20 h-20 border border-white/5 rounded-full top-[20%] left-[20%] animate-[spin_10s_linear_infinite]"
      />
      <div 
        className="absolute w-40 h-40 border border-white/5 rounded-full bottom-[20%] right-[20%] animate-[spin_15s_linear_infinite_reverse]"
      />

      {/* 3. Text Info */}
      <div className="absolute top-12 left-12">
        <h1 className="text-xl font-cinzel text-white/40 tracking-[0.2em]">ARTIFACT: MONOLITH</h1>
        <div className="flex items-center gap-2 text-accent/50 text-xs mt-2 font-mono">
            <MoveUpRight size={12} />
            <span>DIMENSIONAL ANCHOR</span>
        </div>
      </div>

    </div>
  );
}
