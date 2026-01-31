"use client";

import { useEffect, useRef } from "react";
import { Wind } from "lucide-react";

export default function FlowFieldBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId: number;
    
    // Configuration
    const PARTICLE_COUNT = 2000; // High count for fluid look
    const TRAIL_ALPHA = 0.05; // Fade speed
    const NOISE_SCALE = 0.005;
    
    // Simple Pseudo-Random Noise generator (since we don't have external libs)
    // Using a simple sine-based flow for performance and predictability
    const getFlowAngle = (x: number, y: number, time: number) => {
       const scale = 0.003;
       // Complex flow pattern using overlapping sines
       return ( Math.sin(x * scale) + Math.cos(y * scale) ) * Math.PI * 1.5 + time * 0.2;
    };

    class Particle {
       x: number;
       y: number;
       vx: number;
       vy: number;
       speed: number;
       history: {x: number, y: number}[];
       color: string;

       constructor() {
          this.x = Math.random() * width;
          this.y = Math.random() * height;
          this.vx = 0;
          this.vy = 0;
          this.speed = Math.random() * 2 + 1;
          this.history = [];
          // Gold variations
          const val = Math.random();
          if (val > 0.8) this.color = "rgba(255, 255, 255, 0.8)"; // Sparkle
          else if (val > 0.5) this.color = "rgba(212, 175, 55, 0.5)"; // Deep Gold
          else this.color = "rgba(180, 150, 40, 0.3)"; // Dark Gold
       }

       update(time: number, mouseX: number, mouseY: number) {
          const angle = getFlowAngle(this.x, this.y, time);
          
          // Mouse repulsion
          const dx = this.x - mouseX;
          const dy = this.y - mouseY;
          const distSq = dx*dx + dy*dy;
          const repulsionRadius = 200;
          
          let ax = Math.cos(angle);
          let ay = Math.sin(angle);

          if (distSq < repulsionRadius * repulsionRadius) {
             const angleToMouse = Math.atan2(dy, dx);
             const force = (1 - Math.sqrt(distSq) / repulsionRadius) * 5;
             ax += Math.cos(angleToMouse) * force;
             ay += Math.sin(angleToMouse) * force;
          }

          this.vx += (ax * this.speed - this.vx) * 0.1;
          this.vy += (ay * this.speed - this.vy) * 0.1;
          
          this.x += this.vx;
          this.y += this.vy;

          // Wrap edges
          if (this.x < 0) { this.x = width; this.history = []; }
          if (this.x > width) { this.x = 0; this.history = []; }
          if (this.y < 0) { this.y = height; this.history = []; }
          if (this.y > height) { this.y = 0; this.history = []; }
       }

       draw() {
          if (!ctx) return;
          ctx.beginPath();
          ctx.fillStyle = this.color;
          ctx.fillRect(this.x, this.y, 1.5, 1.5);
       }
    }

    let particles: Particle[] = [];
    const mouse = { x: -1000, y: -1000 };
    let time = 0;

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;

      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
         particles.push(new Particle());
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       mouse.x = e.clientX - rect.left;
       mouse.y = e.clientY - rect.top;
    };

    const animate = () => {
      time += 0.01;
      
      // Trails effect: Draw semi-transparent black rect instead of clearing
      ctx.fillStyle = `rgba(5, 5, 5, ${TRAIL_ALPHA})`;
      ctx.fillRect(0, 0, width, height);

      particles.forEach(p => {
         p.update(time, mouse.x, mouse.y);
         p.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    window.addEventListener("resize", init);
    canvas.addEventListener("mousemove", handleMouseMove);
    animate();

    return () => {
      window.removeEventListener("resize", init);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[700px] overflow-hidden bg-[#050505]">
      <canvas ref={canvasRef} className="block" />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
         <h2 className="text-5xl md:text-7xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-100 to-yellow-600 tracking-tight mix-blend-plus-lighter blur-[0.5px]">
            GOLDEN WIND
         </h2>
         <p className="text-[#d4af37] tracking-[0.5em] text-xs mt-4 uppercase font-cinzel opacity-80">
            Stream of Consciousness
         </p>
         <div className="mt-8 flex gap-2 items-center text-white/50 text-xs font-mono animate-pulse">
            <Wind size={14} />
            <span>FLUID DYNAMICS ENGINE</span>
         </div>
      </div>
    </div>
  );
}
