"use client";

import { useEffect, useRef } from "react";
import { Eye } from "lucide-react";

export default function PrismBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const prismRef = useRef<HTMLDivElement>(null);
  // Separate refs for light beams to control them smoothly if needed, 
  // currently they use CSS animation which is fine.

  // Mutable state for animation loop
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      // Calculate target normalized position (-0.5 to 0.5)
      target.current.x = (e.clientX - left) / width - 0.5;
      target.current.y = (e.clientY - top) / height - 0.5;
    };

    const container = containerRef.current;
    if (container) {
       container.addEventListener("mousemove", handleMouseMove);
    }

    let animationFrameId: number;

    const animate = () => {
      // Lerp for smoothness
      mouse.current.x += (target.current.x - mouse.current.x) * 0.1;
      mouse.current.y += (target.current.y - mouse.current.y) * 0.1;

      if (prismRef.current) {
        // Apply transform directly to style
        const rotateX = mouse.current.y * 30;
        const rotateY = mouse.current.x * 30 + 45;
        prismRef.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      }

      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (container) {
         container.removeEventListener("mousemove", handleMouseMove);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[700px] bg-black overflow-hidden flex items-center justify-center perspective-[1200px]"
    >
      {/* 0. Ambient Light Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#202020_0%,#000000_100%)]" />
      
      {/* Light Beams moving automatically */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200px] bg-gradient-to-r from-transparent via-accent/10 to-transparent blur-3xl animate-[spin_20s_linear_infinite]"
      />
       <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[100px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent blur-3xl mix-blend-screen animate-[spin_15s_linear_infinite_reverse]"
      />

      {/* 1. THE PRISM (3D CSS Shape) - Controlled by Ref/AnimLoop */}
      <div 
        ref={prismRef}
        className="relative z-10 w-64 h-64 preserve-3d"
        style={{
           transformStyle: 'preserve-3d',
           transform: 'rotateX(0deg) rotateY(45deg)' // Initial state
        }}
      >
        {/* Core Glow */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-accent rounded-full blur-[50px] animate-pulse" />
        </div>

        {/* Faces of a Cube */}
        {/* Front */}
        <div className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-[2px] shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center translate-z-32">
           <Eye size={48} className="text-accent/50 opacity-50" />
        </div>
        {/* Back */}
        <div className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-[2px] shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] translate-z-[-32px] rotate-y-180" />
        {/* Left */}
        <div className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-[2px] shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] origin-left rotate-y-[-90deg]" />
        {/* Right */}
        <div className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-[2px] shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] origin-right rotate-y-[90deg]" />
        {/* Top */}
        <div className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-[2px] shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] origin-top rotate-x-[90deg]" />
        {/* Bottom */}
        <div className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-[2px] shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] origin-bottom rotate-x-[-90deg]" />
      </div>

      {/* 2. Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
         {Array.from({ length: 30 }).map((_, i) => (
            <div 
               key={i}
               className="absolute w-1 h-1 bg-accent rounded-full blur-[1px] animate-float"
               style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.2,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 5}s`
               }}
            />
         ))}
      </div>

      {/* 3. Text Content */}
      <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none">
         <h2 className="text-4xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-t from-white to-stone-500 tracking-tighter mb-4 opacity-80 mix-blend-overlay">
            PRISM OF INSIGHT
         </h2>
         <p className="font-cinzel text-accent/80 tracking-[0.5em] text-xs">
            Refract your potential
         </p>
      </div>
    </div>
  );
}
