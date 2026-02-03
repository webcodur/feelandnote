"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eye } from "lucide-react";

interface PrismBannerProps {
  children?: ReactNode;
  height?: number;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

export default function PrismBanner({
  children,
  height = 700,
  compact = false,
  title = "PRISM OF INSIGHT",
  subtitle = "Refract your potential"
}: PrismBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prismRef = useRef<HTMLDivElement>(null);

  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      target.current.x = (e.clientX - left) / width - 0.5;
      target.current.y = (e.clientY - top) / height - 0.5;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!containerRef.current || e.touches.length === 0) return;
      const touch = e.touches[0];
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      target.current.x = (touch.clientX - left) / width - 0.5;
      target.current.y = (touch.clientY - top) / height - 0.5;
    };

    const container = containerRef.current;
    if (container) {
       container.addEventListener("mousemove", handleMouseMove);
       container.addEventListener("touchmove", handleTouchMove, { passive: true });
    }

    let animationFrameId: number;

    const animate = () => {
      mouse.current.x += (target.current.x - mouse.current.x) * 0.1;
      mouse.current.y += (target.current.y - mouse.current.y) * 0.1;

      if (prismRef.current) {
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
         container.removeEventListener("touchmove", handleTouchMove);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const prismSize = compact ? "w-24 h-24 sm:w-32 sm:h-32" : "w-64 h-64";
  const particleCount = compact ? 10 : 30;

  // 파티클 위치를 클라이언트에서만 생성 (hydration 에러 방지)
  const [particles, setParticles] = useState<Array<{ top: number; left: number; opacity: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: particleCount }, () => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        opacity: Math.random() * 0.5 + 0.2,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 5,
      }))
    );
  }, [particleCount]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-black overflow-hidden flex items-center justify-center perspective-[1200px] ${compact ? "h-[250px] sm:h-[300px] md:h-[350px]" : ""}`}
      style={compact ? undefined : { height }}
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

      {/* 1. THE PRISM (3D CSS Shape) */}
      <div
        ref={prismRef}
        className={`relative z-10 ${prismSize} preserve-3d`}
        style={{
           transformStyle: 'preserve-3d',
           transform: 'rotateX(0deg) rotateY(45deg)'
        }}
      >
        {/* Core Glow */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className={`bg-accent rounded-full blur-[50px] animate-pulse ${compact ? "w-8 h-8 sm:w-10 sm:h-10" : "w-20 h-20"}`} />
        </div>

        {/* Faces of a Cube */}
        {/* Front */}
        <div className="absolute inset-0 border border-white/20 bg-white/5 backdrop-blur-[2px] shadow-[inset_0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center translate-z-32">
           <Eye size={compact ? 20 : 48} className="text-accent/50 opacity-50" />
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
         {particles.map((p, i) => (
            <div
               key={i}
               className="absolute w-1 h-1 bg-accent rounded-full blur-[1px] animate-float"
               style={{
                  top: `${p.top}%`,
                  left: `${p.left}%`,
                  opacity: p.opacity,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`
               }}
            />
         ))}
      </div>

      {/* 3. Text Content */}
      <div className="absolute inset-0 z-50 pointer-events-none flex flex-col items-center justify-center isolate px-4">
         {children ?? (
           <>
             <h2 className={`font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight text-center ${compact ? "text-2xl sm:text-3xl md:text-4xl" : "text-4xl sm:text-5xl md:text-7xl"}`}>
                {title}
             </h2>
             <p className={`text-[#d4af37] tracking-[0.2em] sm:tracking-[0.5em] uppercase font-cinzel text-center ${compact ? "text-[10px] mt-2" : "text-[10px] sm:text-xs mt-3 sm:mt-4"}`}>
                {subtitle}
             </p>
           </>
         )}
      </div>
    </div>
  );
}
