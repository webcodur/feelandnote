"use client";

import { useRef, useState } from "react";
import { Layers } from "lucide-react";

interface ArchiveTunnelBannerProps {
  height?: number;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

export default function ArchiveTunnelBanner({
  height = 700,
  compact = false,
  title = "ARCHIVE TUNNEL",
  subtitle = "INFINITE KNOWLEDGE BASE"
}: ArchiveTunnelBannerProps) {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    setMousePos({ x, y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (touch.clientX - left) / width - 0.5;
    const y = (touch.clientY - top) / height - 0.5;
    setMousePos({ x, y });
  };

  // Generate mocked items for the tunnel layers
  const LAYERS = compact ? 3 : 5;
  const ITEMS_PER_LAYER = compact ? 5 : 8;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`relative w-full bg-[#000] overflow-hidden flex items-center justify-center perspective-[1000px] ${compact ? "h-[250px] sm:h-[300px] md:h-[350px]" : ""}`}
      style={compact ? undefined : { height }}
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
          transform: `rotateX(${-mousePos.y * 20}deg) rotateY(${mousePos.x * 20}deg) translateZ(${compact ? 100 : 200}px)`
        }}
      >
        {/*
           Infinite Tunnel Rings
           We create multiple rings of items at different Z-depths
        */}
        {Array.from({ length: LAYERS }).map((_, layerIndex) => {
           const zDepth = -layerIndex * (compact ? 250 : 400);
           const opacity = 1 - (layerIndex / LAYERS);

           return (
             <div
               key={layerIndex}
               className={`absolute top-1/2 left-1/2 rounded-full border border-white/5 animate-[spin_60s_linear_infinite] ${compact ? "w-[280px] sm:w-[400px] md:w-[500px] h-[280px] sm:h-[400px] md:h-[500px]" : "w-[400px] sm:w-[600px] md:w-[800px] h-[400px] sm:h-[600px] md:h-[800px]"}`}
               style={{
                 transform: `translate(-50%, -50%) translateZ(${zDepth}px) scale(${1 + layerIndex * (compact ? 0.15 : 0.2)})`,
                 animationDirection: layerIndex % 2 === 0 ? 'normal' : 'reverse'
               }}
             >
                {/* Items on the ring */}
                {Array.from({ length: ITEMS_PER_LAYER }).map((__, itemIndex) => {
                  const angle = (itemIndex / ITEMS_PER_LAYER) * 360;
                  return (
                    <div
                      key={itemIndex}
                      className={`absolute top-0 left-1/2 origin-bottom transform-style-3d ${compact ? "w-12 sm:w-16 md:w-20 h-16 sm:h-24 md:h-28" : "w-16 sm:w-24 md:w-32 h-24 sm:h-32 md:h-44"}`}
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
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-[#d4af37] shadow-[0_0_100px_50px_rgba(212,175,55,0.2)] rounded-full ${compact ? "translate-z-[-800px]" : "translate-z-[-2000px]"}`} />

      </div>

      {/* Overlay Text */}
      <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center px-4">
         <h2 className={`font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight text-center ${compact ? "text-2xl sm:text-3xl md:text-4xl" : "text-4xl sm:text-5xl md:text-7xl"}`}>
            {title}
         </h2>
         <p className={`text-[#d4af37] tracking-[0.2em] sm:tracking-[0.5em] uppercase font-cinzel text-center ${compact ? "text-[10px] mt-2" : "text-[10px] sm:text-xs mt-3 sm:mt-4"}`}>
            {subtitle}
         </p>
      </div>

    </div>
  );
}
