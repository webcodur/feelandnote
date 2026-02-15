/*
  파일명: /components/lab/SeaWavesBackground.tsx
  기능: Canvas 기반 심해 배경 컴포넌트 (Cinematic Logic)
  책임: HTML5 Canvas API를 사용하여 영화 같은 퀄리티의 심해 장면(God Rays, Bubbles, Particles)을 렌더링한다.
*/

"use client";

import React, { useEffect, useRef } from "react";

export default function SeaWavesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    // --- Configuration ---
    const CONFIG = {
      bubbleCount: 40,
      particleCount: 150,
      rayCount: 6,
      baseColor: "#020617", // Deepest Blue/Black
      midColor: "#0f172a",  // Mid Blue
      topColor: "#1e293b",  // Lighter Blue (Surface)
    };

    // --- Classes ---

    class Bubble {
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
      wobble: number;
      wobbleSpeed: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = height + Math.random() * 100;
        this.size = Math.random() * 3 + 1; // 1 ~ 4px
        this.speed = Math.random() * 1 + 0.5;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.wobble = Math.random() * Math.PI * 2;
        this.wobbleSpeed = Math.random() * 0.05 + 0.02;
      }

      reset() {
        this.x = Math.random() * width;
        this.y = height + Math.random() * 100;
        this.size = Math.random() * 3 + 1;
        this.speed = Math.random() * 1 + 0.5;
        this.opacity = Math.random() * 0.5 + 0.1;
      }

      update() {
        this.y -= this.speed;
        this.wobble += this.wobbleSpeed;
        this.x += Math.sin(this.wobble) * 0.5;

        if (this.y < -this.size) {
          this.reset();
        }
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fill();
        
        // Highlight (reflection on bubble)
        ctx.beginPath();
        ctx.arc(this.x - this.size * 0.3, this.y - this.size * 0.3, this.size * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity + 0.2})`;
        ctx.fill();
      }
    }

    class Particle {
      x: number;
      y: number;
      size: number;
      velX: number;
      velY: number;
      opacity: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 1.5 + 0.1; // Very small dust
        this.velX = (Math.random() - 0.5) * 0.2;
        this.velY = (Math.random() - 0.5) * 0.2;
        this.opacity = Math.random() * 0.3 + 0.05;
      }

      update() {
        this.x += this.velX;
        this.y += this.velY;

        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = `rgba(200, 220, 255, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
    }

    class LightRay {
      x: number;
      width: number;
      angle: number;
      intensity: number;
      speed: number;
      phase: number;

      constructor() {
        this.x = Math.random() * width;
        this.width = Math.random() * 100 + 50;
        this.angle = Math.PI / 3 + (Math.random() - 0.5) * 0.2; // roughly 60 degrees
        this.intensity = Math.random() * 0.05 + 0.02;
        this.speed = Math.random() * 0.005 + 0.002;
        this.phase = Math.random() * Math.PI * 2;
      }

      update() {
        this.phase += this.speed;
      }

      draw() {
        if (!ctx) return;
        
        const flicker = Math.sin(this.phase) * 0.01;
        const currentIntensity = Math.max(0, this.intensity + flicker);

        const gradient = ctx.createLinearGradient(
          this.x, 0, 
          this.x - Math.tan(Math.PI/2 - this.angle) * height, height
        );
        
        gradient.addColorStop(0, `rgba(200, 230, 255, ${currentIntensity})`);
        gradient.addColorStop(0.5, `rgba(100, 150, 200, ${currentIntensity * 0.5})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, 0)`);

        ctx.save();
        ctx.translate(this.x, 0);
        ctx.rotate(this.angle - Math.PI/2);
        ctx.fillStyle = gradient;
        ctx.fillRect(-this.width/2, 0, this.width, height * 1.5); // Extend length
        ctx.restore();
      }
    }

    class Terrain {
      points: { x: number; y: number }[] = [];
      scrollOffset: number = 0;
      
      constructor() {
        this.generate();
      }

      generate() {
        this.points = [];
        let x = 0;
        let y = height * 0.85; // Start at 85% height
        this.points.push({ x: 0, y: height }); // Bottom Left
        this.points.push({ x: 0, y: y });      // Start point

        while (x < width) {
          x += Math.random() * 50 + 20;
          y += (Math.random() - 0.5) * 30;
          // Clamp y
          y = Math.max(height * 0.75, Math.min(height * 0.95, y));
          this.points.push({ x, y });
        }

        this.points.push({ x: width, y: height }); // Bottom Right
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        this.points.forEach((p, index) => {
           // Simple smoothing could be added here
           if (index === 0) return;
           ctx.lineTo(p.x, p.y);
        });
        
        ctx.lineTo(width, height);
        ctx.closePath();
        
        const grad = ctx.createLinearGradient(0, height * 0.7, 0, height);
        grad.addColorStop(0, "#020617");
        grad.addColorStop(1, "#000000");
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    // --- State Initialization ---
    let bubbles: Bubble[] = [];
    let particles: Particle[] = [];
    let rays: LightRay[] = [];
    let terrain: Terrain;

    const init = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;

      bubbles = Array.from({ length: CONFIG.bubbleCount }, () => new Bubble());
      particles = Array.from({ length: CONFIG.particleCount }, () => new Particle());
      rays = Array.from({ length: CONFIG.rayCount }, () => new LightRay());
      terrain = new Terrain();
    };

    const drawBackground = () => {
        // Deep Gradient
    // ... (rest of implementation)
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, CONFIG.topColor);
        grad.addColorStop(0.4, CONFIG.midColor);
        grad.addColorStop(1, CONFIG.baseColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Vignette
        const radGrad = ctx.createRadialGradient(width/2, height/2, height/3, width/2, height/2, height);
        radGrad.addColorStop(0, "rgba(0,0,0,0)");
        radGrad.addColorStop(1, "rgba(0,0,0,0.6)");
        ctx.fillStyle = radGrad;
        ctx.fillRect(0, 0, width, height);
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      drawBackground();

      // Rays (Behind everything)
      rays.forEach(ray => {
        ray.update();
        ray.draw();
      });

       // Terrain (Background objects)
      if (terrain) terrain.draw();

      // Particles (Mid)
      particles.forEach(p => {
        p.update();
        p.draw();
      });

      // Bubbles (Front)
      bubbles.forEach(b => {
        b.update();
        b.draw();
      });
      
      // Simulate water flow distortion (Subtle global shift - optional but nice)
      // Implementation omitted for performance, but particles already drift nicely.

      animationFrameId = requestAnimationFrame(animate);
    };

    // --- Events ---
    window.addEventListener("resize", init);
    init();
    animate();

    return () => {
      window.removeEventListener("resize", init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-xl border border-slate-800 shadow-2xl bg-[#020617]">
      {/* 텍스트 오버레이 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none mix-blend-overlay">
        <h2 className="text-4xl md:text-6xl font-cinzel font-bold text-slate-200 tracking-[0.2em] drop-shadow-[0_0_15px_rgba(100,200,255,0.5)]">
          ABYSS
        </h2>
        <p className="mt-4 text-sm md:text-base text-slate-400 tracking-[0.5em] uppercase opacity-80">
          The Silent Depths
        </p>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
      
      {/* Noise Texture Overlay for film grain look (optional) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay"></div>
    </div>
  );
}
