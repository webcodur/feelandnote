/*
  파일명: /components/lab/RiverStyxBackground.tsx
  기능: Canvas 기반 스틱스 강 배경 컴포넌트
  책임: 검푸른 강물, 안개, 그리고 부유하는 영혼의 불빛을 통해 신비롭고 엄숙한 분위기를 렌더링한다.
*/

"use client";

import React, { useEffect, useRef } from "react";

export default function RiverStyxBackground() {
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

    // --- Noise Helper (Simple value noise for fog) ---
    // A simple pseudo-random noise function
    const noise = (x: number, y: number) => {
        const sin = Math.sin(x * 12.9898 + y * 78.233);
        const cos = Math.cos(x * 43.123 + y * 12.312);
        return (Math.sin(sin * 43758.5453 + time * 0.001) + 1) / 2;
    };
    
    // Better fog: Layered moving sine waves with opacity variation
    class FogLayer {
        y: number;
        speed: number;
        amplitude: number;
        wavelength: number;
        opacity: number;
        offset: number;

        constructor(y: number, speed: number, amp: number, wave: number, op: number) {
            this.y = y;
            this.speed = speed;
            this.amplitude = amp;
            this.wavelength = wave;
            this.opacity = op;
            this.offset = Math.random() * 1000;
        }

        draw() {
           if (!ctx) return;
           ctx.beginPath();
           const waveTime = time * this.speed + this.offset;
           
           ctx.moveTo(0, height);
           for (let x = 0; x <= width; x += 20) {
               // Combine huge sine waves for rolling fog bank effect
               const y = this.y + Math.sin(x * this.wavelength + waveTime) * this.amplitude
                                + Math.sin(x * (this.wavelength * 0.5) - waveTime * 0.5) * (this.amplitude * 0.5);
               ctx.lineTo(x, y);
           }
           ctx.lineTo(width, height);
           ctx.lineTo(0, height);
           
           // Gradient fog
           const grad = ctx.createLinearGradient(0, this.y - this.amplitude, 0, height);
           grad.addColorStop(0, `rgba(200, 210, 220, 0)`);
           grad.addColorStop(0.2, `rgba(180, 190, 210, ${this.opacity})`);
           grad.addColorStop(1, `rgba(150, 170, 190, ${this.opacity * 1.5})`);
           
           ctx.fillStyle = grad;
           ctx.fill();
        }
    }
    
    let fogLayers: FogLayer[] = [];

    // --- Soul Lights (Will-o'-the-wisps) ---
    class Soul {
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        life: number;
        maxLife: number;

        constructor(reset: boolean = false) {
            this.x = Math.random() * width;
            this.y = height - Math.random() * 150; // Near water surface
            this.vx = (Math.random() - 0.5) * 0.2; // Slow drift
            this.vy = -Math.random() * 0.2 - 0.05; // Slowly rising
            this.size = Math.random() * 2 + 1;
            this.maxLife = Math.random() * 200 + 100;
            this.life = reset ? Math.random() * this.maxLife : this.maxLife;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life--;
            
            // Wiggle
            this.x += Math.sin(time * 0.05 + this.life) * 0.1;

            if (this.life <= 0 || this.y < height - 300) {
                // Return to surface
                this.y = height - Math.random() * 50;
                this.life = this.maxLife;
                this.x = Math.random() * width;
                this.vy = -Math.random() * 0.2 - 0.05;
            }
        }

        draw() {
            if (!ctx) return;
            const alpha = Math.sin((this.life / this.maxLife) * Math.PI); // Fade in/out
            
            // Soul flame
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y - 5, this.size * 5);
            grad.addColorStop(0, `rgba(200, 230, 255, ${alpha})`); // White-blue core
            grad.addColorStop(0.4, `rgba(100, 150, 255, ${alpha * 0.5})`); // Blue glow
            grad.addColorStop(1, "rgba(0, 0, 0, 0)");
            
            ctx.fillStyle = grad;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(100, 200, 255, 0.5)";
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Reflection on water (fake)
            ctx.save();
            ctx.transform(1, 0, 0, 0.2, 0, this.y * 1.6 - 10); // Flatten and move down? A bit complex.
            // Just specific rect for reflection
            const reflectY = height - (height - this.y) + 20; // Rough mirror point?
            // Actually, water is just the bottom area. Let's assume water level is fixed.
            // Let's implement actual water level logic below.
            ctx.restore();
        }
    }
    
    let souls: Soul[] = [];
    const WATER_LEVEL_RATIO = 0.7; // 70% down is water
    
    const init = () => {
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;

        fogLayers = [];
        // Back fog
        fogLayers.push(new FogLayer(height * 0.6, 0.002, 30, 0.005, 0.1));
        fogLayers.push(new FogLayer(height * 0.7, 0.003, 40, 0.008, 0.15));
        // Front fog
        fogLayers.push(new FogLayer(height * 0.85, 0.005, 50, 0.01, 0.2));

        souls = Array.from({ length: 30 }, () => new Soul(true));
    };

    const draw = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, width, height);
        time++;

        // 1. Sky / Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, "#020617"); // Black/Deep Blue
        bgGrad.addColorStop(1, "#1e293b"); // Dark Grey/Blue
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // 2. Water Surface
        const waterY = height * WATER_LEVEL_RATIO;
        const waterGrad = ctx.createLinearGradient(0, waterY, 0, height);
        waterGrad.addColorStop(0, "#0f172a"); // Horizon
        waterGrad.addColorStop(1, "#02040a"); // Deep bottom
        ctx.fillStyle = waterGrad;
        ctx.fillRect(0, waterY, width, height - waterY);
        
        // Water Ripples (Canvas patterns or simple lines)
        ctx.strokeStyle = "rgba(100,120,150,0.1)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 20; i++) {
             // Moving ripple lines
             const y = waterY + Math.random() * (height - waterY);
             const x = Math.random() * width;
             const len = Math.random() * 100 + 50;
             ctx.beginPath();
             ctx.moveTo(x, y);
             ctx.lineTo(x + len, y);
             ctx.stroke();
        }

        // 3. Fog (Back layers)
        fogLayers.slice(0, 2).forEach(f => f.draw());

        // 4. Souls
        souls.forEach(s => {
            s.update();
            // If soul is above water, reflect it
            if (s.y < height) {
                 // Simple reflection vertical stretch
                 const distFromWater = Math.abs(s.y - waterY);
                 // If above water line
                 if (s.y < waterY) {
                     // Reflection is at waterY + distFromWater
                     // Only draw if visible
                     const ry = waterY + distFromWater * 0.8; // Perspective compression
                     // Draw reflection
                     ctx.globalAlpha = 0.2;
                     ctx.beginPath();
                     ctx.arc(s.x, ry, s.size * 2, 0, Math.PI * 2);
                     ctx.fillStyle = "rgba(100, 150, 255, 0.5)";
                     ctx.fill();
                     ctx.globalAlpha = 1;
                 }
            }
            s.draw();
        });
        
        // 5. Fog (Front layer)
        fogLayers.slice(2).forEach(f => f.draw());
        
        // Smooth Vignette
        const vig = ctx.createRadialGradient(width/2, height/2, height/2, width/2, height/2, height);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(0,0,0,0.8)");
        ctx.fillStyle = vig;
        ctx.fillRect(0,0,width,height);

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
    <div className="relative w-full h-[600px] overflow-hidden rounded-xl border border-slate-800 shadow-2xl bg-[#020617]">
      {/* 텍스트 오버레이 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none">
        <h2 className="text-4xl md:text-6xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#e2e8f0] via-[#94a3b8] to-[#475569] opacity-80 tracking-widest drop-shadow-[0_0_10px_rgba(148,163,184,0.3)]">
          THE STYX
        </h2>
        <p className="mt-4 text-sm md:text-base text-[#94a3b8] tracking-[0.3em] uppercase opacity-60 drop-shadow-md">
          River of Souls
        </p>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
