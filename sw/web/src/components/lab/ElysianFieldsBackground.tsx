/*
  파일명: /components/lab/ElysianFieldsBackground.tsx
  기능: Canvas 기반 엘리시움 들판 배경 컴포넌트
  책임: 흔들리는 풀밭과 반딧불이를 통해 평화롭고 치유적인 분위기를 렌더링한다.
*/

"use client";

import React, { useEffect, useRef } from "react";

export default function ElysianFieldsBackground() {
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

    // --- Configuration ---
    const CONFIG = {
      grassCount: 300,
      fireflyCount: 50,
      windSpeed: 0.002,
      skyTop: "#1e293b", // Night sky top
      skyBottom: "#0f172a", // Night sky bottom
      grassBase: "#143d29", // Dark green
      grassTip: "#4ade80", // Light green
    };

    // --- Classes ---

    class GrassBlade {
      x: number;
      height: number;
      width: number;
      lean: number;
      curve: number;
      color: string;
      phase: number; // Unique phase for wind variation

      constructor() {
        this.x = Math.random() * width;
        // Perspective distribution: More grass at bottom, smaller/denser at back?
        // For simplicity, let's do a uniform field but layered.
        // Actually, a simple 2D side-view or slight depth look.
        // Let's go with a slight depth simulation by sorting Y.
        // But for a "field", maybe just layers.
        
        // Let's try simple layered grass.
        this.x = Math.random() * width;
        this.height = Math.random() * 80 + 40; // 40~120px
        this.width = Math.random() * 2 + 1;
        this.lean = (Math.random() - 0.5) * 0.5;
        this.curve = 0;
        this.phase = Math.random() * Math.PI * 2;
        
        // Color variation
        const brightness = Math.random() * 50 + 20;
        this.color = `hsl(140, 60%, ${brightness}%)`;
      }

      update(windStrength: number) {
        // Wind affects curve
        this.curve = this.lean + Math.sin(time * CONFIG.windSpeed + this.phase) * windStrength;
      }

      draw(yBase: number) {
        if (!ctx) return;
        
        // Quadratic Bezier Curve for blade
        const tipX = this.x + this.curve * this.height;
        const tipY = yBase - this.height;
        const cpX = this.x + (this.curve * 0.5) * this.height; // Control point
        const cpY = yBase - this.height * 0.5;

        ctx.beginPath();
        ctx.moveTo(this.x - this.width / 2, yBase);
        ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
        ctx.quadraticCurveTo(cpX, cpY, this.x + this.width / 2, yBase);
        ctx.fillStyle = this.color;
        
        // Add a bit of glow to tips? Maybe too expensive.
        ctx.fill();
        // ctx.stroke(); // unnecessary
      }
    }
    
    // Improved Grass System: Layers
    interface GrassLayer {
        y: number;
        blades: GrassBlade[];
        speedCheck: number; // Parallax speed factor if we moved camera (not needed here)
        darkness: number; // 0 to 1, darken back layers
    }
    
    let layers: GrassLayer[] = [];

    class Firefly {
      x: number;
      y: number;
      size: number;
      vx: number;
      vy: number;
      alpha: number;
      flashSpeed: number;
      flashPhase: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height * 0.8; // Mostly in air
        this.size = Math.random() * 2 + 1;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.alpha = 0;
        this.flashSpeed = Math.random() * 0.05 + 0.02;
        this.flashPhase = Math.random() * Math.PI * 2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Soft wander
        this.vx += (Math.random() - 0.5) * 0.05;
        this.vy += (Math.random() - 0.5) * 0.05;
        
        // Clamp speed
        const maxSpeed = 1;
        if (Math.abs(this.vx) > maxSpeed) this.vx *= 0.9;
        if (Math.abs(this.vy) > maxSpeed) this.vy *= 0.9;
 
        // Wrap around
        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        // Flash behavior
        this.alpha = (Math.sin(time * this.flashSpeed + this.flashPhase) + 1) / 2; // 0 to 1
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        
        // Glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 3);
        gradient.addColorStop(0, `rgba(250, 255, 180, ${this.alpha})`); // Pale yellow-green center
        gradient.addColorStop(1, "rgba(250, 255, 180, 0)");
        
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }
    
    let fireflies: Firefly[] = [];

    const init = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;

      // Initialize Grass Layers
      layers = [];
      const layerCount = 5;
      for (let i = 0; i < layerCount; i++) {
          const y = height - (i * 15); // Stacking upwards slightly? No, depth means lower y is further back?
          // Actually for a flat field view:
          // Front layer is at bottom (height). Back layer is higher up (height * 0.8).
          // And render back layers first.
          
          const layerY = height - (i * 30); // Spread out vertically
          const density = 80 + i * 20; // Dense
          
          const blades: GrassBlade[] = [];
          for (let j = 0; j < density; j++) {
             // Create blade
             const b = new GrassBlade();
             // Adjust darkness/size based on layer
             // Back layers (high i) should be darker, smaller?
             // If i=0 is front (bottom):
             // i=4 is back (top).
             // Back grass should be smaller due to perspective.
             const scale = 1 - (i * 0.15);
             b.height *= scale;
             b.width *= scale;
             
             // Override color for depth
             // Front: Bright. Back: Dark/Blue-ish.
             const depthFactor = i / layerCount;
             const hue = 140 + depthFactor * 20; // Shift to cooler green
             const light = 40 - depthFactor * 20; // 40 -> 20
             b.color = `hsl(${hue}, 60%, ${light}%)`;
             
             blades.push(b);
          }
          
          // Add to layers (Order: Back to Front, i.e., Highest Y to Lowest Y on screen? 
          // Painter's algo: Draw furthest Y first.
          // In standard 2D, smaller Y is top (far), larger Y is bottom (near).
          // So we should draw layer with smallest Y first (far back), then largest Y (front).
          // My loop: i=0 -> y=height (Front). i=4 -> y=height-120 (Back).
          // So I should draw i=4 first, then i=0.
          layers.push({ y: layerY, blades, speedCheck: 1, darkness: 0 });
      }
      // Reverse layers for drawing order (Back to Front)
      layers.reverse();

      fireflies = Array.from({ length: CONFIG.fireflyCount }, () => new Firefly());
    };

    const drawBackground = () => {
        // Night/Dusk Sky Gradient
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, "#0f172a"); // Deep Blue
        grad.addColorStop(0.6, "#1e3a8a"); // Lighter Blue
        grad.addColorStop(1, "#064e3b"); // Emerald Green tint near horizon
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Moon or faint glow?
        // Let's add a soft moon glow
        const moonGrad = ctx.createRadialGradient(width * 0.8, height * 0.2, 0, width * 0.8, height * 0.2, 100);
        moonGrad.addColorStop(0, "rgba(255, 255, 255, 0.1)");
        moonGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = moonGrad;
        ctx.fillRect(0, 0, width, height);
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      time += 1;
      
      drawBackground();

      // Draw Fireflies (Behind grass for depth feeling?)
      // Some behind, some in front?
      // Let's draw half, then grass, then half.
      
      fireflies.forEach((f, i) => {
          f.update();
          // Draw "far" fireflies
          if (i % 2 === 0) f.draw();
      });

      // Draw Grass Layers (Back to Front)
      layers.forEach(layer => {
          // Wind factor
          const wind = Math.sin(time * 0.005) * 0.5 + Math.sin(time * 0.01) * 0.2;
          
          layer.blades.forEach(blade => {
              blade.update(wind);
              blade.draw(layer.y);
          });
      });
      
      // Draw "near" fireflies
      fireflies.forEach((f, i) => {
          if (i % 2 !== 0) f.draw();
      });
      
      // Bloom/Post-process overlay
      // Soft glow for whole scene
      // ctx.globalCompositeOperation = 'overlay';
      // ctx.fillStyle = "rgba(40, 255, 100, 0.05)";
      // ctx.fillRect(0, 0, width, height);
      // ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", init);
    init();
    animate();

    return () => {
      window.removeEventListener("resize", init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-xl border border-emerald-900/30 shadow-2xl bg-[#0f172a]">
      {/* 텍스트 오버레이 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none">
        <h2 className="text-4xl md:text-6xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#f0fdf4] via-[#86efac] to-[#15803d] opacity-90 tracking-widest drop-shadow-[0_0_15px_rgba(74,222,128,0.4)]">
          ELYSIUM
        </h2>
        <p className="mt-4 text-sm md:text-base text-[#86efac] tracking-[0.3em] uppercase opacity-70 drop-shadow-md">
          Fields of the Blessed
        </p>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
