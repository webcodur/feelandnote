/*
  파일명: /components/lab/OracleVisionBackground.tsx
  기능: Canvas 기반 오라클의 예지 배경 컴포넌트 (심플 버전)
  책임: 피어오르는 연기와 블러 처리를 통해 몽환적이고 신비로운 분위기를 렌더링한다. (기하학적 심볼 제거됨)
*/

"use client";

import React, { useEffect, useRef } from "react";

export default function OracleVisionBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let time = 0;

    // --- Smoke Particle System ---
    class SmokeParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      life: number;
      maxLife: number;
      alpha: number;
      rotation: number;

      constructor(reset: boolean = false) {
        this.x = width / 2 + (Math.random() - 0.5) * 300; // Wider spread
        this.y = height + Math.random() * 100;
        if (reset) {
            this.y = Math.random() * height;
            this.x = Math.random() * width;
        }
        
        this.vx = (Math.random() - 0.5) * 0.3; // Slower horizontal
        this.vy = -Math.random() * 0.5 - 0.2; // Very slow rise
        this.size = Math.random() * 100 + 100; // Huge soft puffs
        this.maxLife = Math.random() * 400 + 300;
        this.life = reset ? Math.random() * this.maxLife : this.maxLife;
        this.alpha = 0;
        this.rotation = Math.random() * Math.PI * 2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += 0.001;
        this.life--;
        
        // Swirl
        this.vx += Math.sin(time * 0.001 + this.y * 0.002) * 0.01;
        
        if (this.life <= 0 || this.y < -200) {
            this.reset();
        }
        
        // Alpha curve
        const progress = 1 - (this.life / this.maxLife);
        const maxAlpha = 0.15; // Very subtle
        if (progress < 0.3) this.alpha = (progress / 0.3) * maxAlpha; 
        else if (progress > 0.7) this.alpha = ((1 - progress) / 0.3) * maxAlpha;
        else this.alpha = maxAlpha;
      }
      
      reset() {
         this.x = width / 2 + (Math.random() - 0.5) * 400;
         this.y = height + 100;
         this.life = this.maxLife;
         this.vx = (Math.random() - 0.5) * 0.3;
         this.vy = -Math.random() * 0.5 - 0.2;
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Soft purple/blue mist
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
        grad.addColorStop(0, `rgba(180, 160, 255, ${this.alpha})`); 
        grad.addColorStop(1, "rgba(180, 160, 255, 0)");
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    let smokes: SmokeParticle[] = [];

    const init = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
      
      smokes = Array.from({ length: 60 }, () => new SmokeParticle(true));
    };

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      time++;

      // Background
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, "#191724"); // Darker Purple/Navy
      grad.addColorStop(1, "#2a2640"); 
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Render Smoke
      // Use screen blend mode for ethereal look
      ctx.globalCompositeOperation = 'screen'; 
      smokes.forEach(s => {
          s.update();
          s.draw();
      });
      ctx.globalCompositeOperation = 'source-over';
      
      // Post-process Blur Overlay to unify
      // Using a semi-transparent overlay to "haze" it up
      ctx.fillStyle = "rgba(30, 20, 50, 0.1)";
      ctx.fillRect(0, 0, width, height);
      
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", init);
    init();
    draw();

    return () => {
      window.removeEventListener("resize", init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-xl border border-purple-900/20 shadow-2xl bg-[#191724]">
      {/* 텍스트 오버레이 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none">
        <h2 className="text-4xl md:text-6xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#e9d5ff] via-[#c084fc] to-[#7e22ce] opacity-60 tracking-widest blur-[1px]">
          ORACLE
        </h2>
        <p className="mt-4 text-sm md:text-base text-[#d8b4fe] tracking-[0.3em] uppercase opacity-50 blur-[0.5px]">
          The unseen truth
        </p>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block filter blur-[8px] scale-110" /> 
      {/* Heavy CSS blur on canvas and slight scale to hide edges */}
    </div>
  );
}
