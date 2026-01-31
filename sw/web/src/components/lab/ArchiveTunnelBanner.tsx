"use client";

import { useRef, useState, useEffect } from "react";
import { BookOpen, Layers } from "lucide-react";

export default function ArchiveTunnelBanner() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setMousePos({ x, y });
  };

  // Generate mocked items for the tunnel layers
  const LAYERS = 5;
  const ITEMS_PER_LAYER = 8;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full h-[700px] bg-[#000] overflow-hidden flex items-center justify-center perspective-[1000px] overflow-hidden"
    >
      {/* Background Starfield */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#111_0%,#000_100%)]" />
      
      {/* 
        The Tunnel Container 
        Moves inversely to mouse to create 'looking around' effect
      */}
      <div 
        className="relative preserve-3d w-full h-full flex items-center justify-center transform-style-3d"
        style={{
          transform: `rotateX(${-mousePos.y * 20}deg) rotateY(${mousePos.x * 20}deg) translateZ(200px)`
        }}
      >
        {/*
           Infinite Tunnel Rings
           We create multiple rings of items at different Z-depths
        */}
        {Array.from({ length: LAYERS }).map((_, layerIndex) => {
           const zDepth = -layerIndex * 400; // 0, -400, -800, -1200...
           const opacity = 1 - (layerIndex / LAYERS);
           
           return (
             <div 
               key={layerIndex}
               className="absolute top-1/2 left-1/2 w-[800px] h-[800px] rounded-full border border-white/5 animate-[spin_60s_linear_infinite]"
               style={{
                 transform: `translate(-50%, -50%) translateZ(${zDepth}px) scale(${1 + layerIndex * 0.2})`,
                 animationDirection: layerIndex % 2 === 0 ? 'normal' : 'reverse'
               }}
             >
                {/* Items on the ring */}
                {Array.from({ length: ITEMS_PER_LAYER }).map((__, itemIndex) => {
                  const angle = (itemIndex / ITEMS_PER_LAYER) * 360;
                  return (
                    <div
                      key={itemIndex}
                      className="absolute top-0 left-1/2 w-32 h-44 origin-bottom transform-style-3d"
                      style={{
                        transform: `translateX(-50%) rotate(${angle}deg) translateY(-50%) rotateX(-90deg)`,
                      }}
                    >
                      {/* The Card Itself */}
                      <div className="w-full h-full bg-stone-900/40 border border-[#d4af37]/20 backdrop-blur-sm flex flex-col items-center justify-center p-2 hover:bg-[#d4af37]/10 transition-colors">
                         <div className="w-full h-2/3 bg-white/5 mb-2" />
                         <div className="w-3/4 h-2 bg-[#d4af37]/40 rounded-full" />
                      </div>
                    </div>
                  );
                })}
             </div>
           );
        })}
        
        {/* Central Converging Point Light */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-[#d4af37] shadow-[0_0_100px_50px_rgba(212,175,55,0.2)] rounded-full translate-z-[-2000px]" />

      </div>

      {/* Overlay Text */}
      <div className="absolute z-50 text-center pointer-events-none mix-blend-difference">
         <h1 className="text-6xl md:text-8xl font-black text-[#e0e0e0] tracking-tighter mb-2">
            ARCHIVE <span className="text-stone-500">TUNNEL</span>
         </h1>
         <div className="flex items-center justify-center gap-2 text-[#d4af37] tracking-[0.5em] font-cinzel text-xs">
            <Layers size={14} />
            <span>INFINITE KNOWLEDGE BASE</span>
         </div>
      </div>

    </div>
  );
}
