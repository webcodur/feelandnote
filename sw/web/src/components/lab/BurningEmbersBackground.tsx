/*
  파일명: /components/lab/BurningEmbersBackground.tsx
  기능: Canvas 기반 전장의 불씨 배경 컴포넌트
  책임: 타오르는 불씨와 재가 흩날리는 전장의 분위기를 렌더링한다.
*/

"use client";

import React, { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  color: string;
  isEmber: boolean; // true: 불씨 (glowing), false: 재 (darker)
}

export default function BurningEmbersBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const PARTICLE_COUNT = 150;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const createParticle = (initial: boolean = false): Particle => {
      const isEmber = Math.random() > 0.6; // 40% embers, 60% ash
      return {
        x: Math.random() * canvas.width,
        y: initial ? Math.random() * canvas.height : canvas.height + 10,
        size: isEmber ? Math.random() * 2 + 1 : Math.random() * 3 + 1,
        speedY: Math.random() * 1 + 0.5, // Embers rise slower
        speedX: Math.random() * 1 - 0.5, // Slight drift
        opacity: isEmber ? Math.random() * 0.5 + 0.5 : Math.random() * 0.3 + 0.1,
        color: isEmber 
          ? `rgba(255, ${Math.floor(Math.random() * 100 + 50)}, 0,` // Orange/Red glow
          : `rgba(100, 100, 100,`, // Dark grey ash
        isEmber,
      };
    };

    // Initialize particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(true));
    }

    const draw = () => {
      if (!ctx || !canvas) return;

      // Clear with trail effect for smoother motion perception
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background Gradient (Red/Black War Theme)
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, "#020617"); // Black (Top)
      bgGradient.addColorStop(0.8, "#2a0a0a"); // Dark Red
      bgGradient.addColorStop(1, "#450a0a"); // Red glow (Bottom)
      
      // We fill rect with simple opacity to create trail, but we need the base gradient
      // to not be overwritten by the trail clearing. 
      // Actually, standard "clear and redraw" is better for crisp particles. 
      // Let's stick to clearRect and draw gradient background every frame.
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and Draw Particles
      particles.forEach((p, index) => {
        p.y -= p.speedY;
        p.x += p.speedX + Math.sin(p.y * 0.01) * 0.5; // Organic drift
        
        // Flicker effect for embers
        if (p.isEmber) {
           p.opacity += (Math.random() - 0.5) * 0.1;
           if (p.opacity > 1) p.opacity = 1;
           if (p.opacity < 0.4) p.opacity = 0.4;
        }

        // Reset if out of view
        if (p.y < -10) {
          particles[index] = createParticle();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        if (p.isEmber) {
          // Glow effect for embers
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(255, 100, 0, 0.8)";
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.fillStyle = `${p.color} ${p.opacity})`;
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-xl border border-[#450a0a]/50 shadow-2xl bg-[#020617]">
      {/* 텍스트 오버레이 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none">
        <h2 className="text-4xl md:text-6xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#fca5a5] to-[#b91c1c] opacity-90 tracking-widest drop-shadow-[0_4px_15px_rgba(255,0,0,0.4)]">
          WARFARE
        </h2>
        <p className="mt-4 text-sm md:text-base text-[#fca5a5] tracking-[0.3em] uppercase opacity-70 drop-shadow-md">
          The Burning Aftermath
        </p>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
