/*
  파일명: /components/lab/GoldenAscensionBackground.tsx
  기능: Canvas 기반 황금의 비상 배경 컴포넌트
  책임: 부와 권력을 상징하는 황금빛 입자와 성스러운 분위기를 렌더링한다.
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
  angle: number; // For sparkles
  angularSpeed: number; // Rotation speed
}

export default function GoldenAscensionBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Particle[] = [];
    const PARTICLE_COUNT = 100;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const createParticle = (initial: boolean = false): Particle => {
      return {
        x: Math.random() * canvas.width,
        y: initial ? Math.random() * canvas.height : canvas.height + 10,
        size: Math.random() * 2 + 0.5, // Small, dust-like
        speedY: Math.random() * 0.5 + 0.2, // Very slow rising
        speedX: (Math.random() - 0.5) * 0.5, // Slight horizontal drift
        opacity: Math.random() * 0.5 + 0.2,
        angle: Math.random() * Math.PI * 2,
        angularSpeed: (Math.random() - 0.5) * 0.05,
      };
    };

    // Initialize particles
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle(true));
    }

    const draw = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background Gradient (Dark Brown/Gold Theme)
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, "#191512"); // Very Dark Brown (Top)
      bgGradient.addColorStop(0.5, "#2D2418"); // Dark Brown
      bgGradient.addColorStop(1, "#453823"); // Brownish Gold (Bottom)
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gold Glow overlay at the bottom
      const glowGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height, 0,
        canvas.width / 2, canvas.height, canvas.height * 0.6
      );
      glowGradient.addColorStop(0, "rgba(255, 215, 0, 0.1)");
      glowGradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);


      // Update and Draw Particles
      particles.forEach((p, index) => {
        p.y -= p.speedY; // Rise up
        p.x += p.speedX + Math.sin(p.y * 0.01) * 0.2; // Fluid motion
        p.angle += p.angularSpeed; // Rotate (for sparkle effect simulation)
        
        // Flicker / Sparkle
        // Simply oscillating opacity based on angle
        const sparkle = Math.abs(Math.sin(p.angle));
        const currentOpacity = p.opacity * (0.5 + sparkle * 0.5);

        // Reset if out of view
        if (p.y < -10) {
          particles[index] = createParticle();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        
        // Gold Color
        ctx.fillStyle = `rgba(255, 223, 100, ${currentOpacity})`;
        
        // Add a slight glow to larger particles
        if (p.size > 1.5) {
          ctx.shadowBlur = 5;
          ctx.shadowColor = "rgba(255, 215, 0, 0.5)";
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0; // Reset
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
    <div className="relative w-full h-[600px] overflow-hidden rounded-xl border border-[#D4AF37]/40 shadow-2xl bg-[#191512]">
      {/* 텍스트 오버레이 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none">
        <h2 className="text-4xl md:text-6xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#FFF8DC] via-[#FFD700] to-[#DAA520] opacity-90 tracking-widest drop-shadow-[0_4px_15px_rgba(218,165,32,0.4)]">
          ASCENSION
        </h2>
        <p className="mt-4 text-sm md:text-base text-[#F0E68C] tracking-[0.3em] uppercase opacity-80 drop-shadow-md">
          The Golden Era
        </p>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
