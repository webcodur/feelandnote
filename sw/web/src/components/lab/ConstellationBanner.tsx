"use client";

import { useEffect, useRef } from "react";
import { Network } from "lucide-react";

interface ConstellationBannerProps {
  height?: number;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

export default function ConstellationBanner({
  height = 700,
  compact = false,
  title = "WEB OF FATE",
  subtitle = "Connect with the Wisdom of Ages"
}: ConstellationBannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let canvasWidth = 0;
    let canvasHeight = 0;
    let particles: Particle[] = [];
    let animationFrameId: number;

    // Configuration
    const PARTICLE_COUNT = compact ? 60 : 100;
    const CONNECTION_RADIUS = compact ? 120 : 150;
    const MOUSE_RADIUS = compact ? 150 : 200;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;

      constructor() {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > canvasWidth) this.vx *= -1;
        if (this.y < 0 || this.y > canvasHeight) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fill();
      }
    }

    const init = () => {
      canvasWidth = canvas.parentElement?.clientWidth || window.innerWidth;
      canvasHeight = canvas.parentElement?.clientHeight || height;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
      }
    };

    const mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       mouse.x = e.clientX - rect.left;
       mouse.y = e.clientY - rect.top;
    };

    const handleTouchMove = (e: TouchEvent) => {
       if (e.touches.length === 0) return;
       const touch = e.touches[0];
       const rect = canvas.getBoundingClientRect();
       mouse.x = touch.clientX - rect.left;
       mouse.y = touch.clientY - rect.top;
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Background Gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, "#050505");
      gradient.addColorStop(1, "#111111");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Update and draw particles
      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      // Draw connections
      particles.forEach((a, i) => {
        // Connect to mouse
        const dxMouse = a.x - mouse.x;
        const dyMouse = a.y - mouse.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (distMouse < MOUSE_RADIUS) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(212, 175, 55, ${1 - distMouse / MOUSE_RADIUS})`; // Gold lines
            ctx.lineWidth = 1;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
        }

        // Connect to other particles
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < CONNECTION_RADIUS) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 * (1 - distance / CONNECTION_RADIUS)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    window.addEventListener("resize", init);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchmove", handleTouchMove, { passive: true });
    animate();

    return () => {
      window.removeEventListener("resize", init);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchmove", handleTouchMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [height, compact]);

  return (
    <div className={`relative w-full overflow-hidden ${compact ? "h-[250px] sm:h-[300px] md:h-[350px]" : ""}`} style={compact ? undefined : { height }}>
      <canvas ref={canvasRef} className="block" />

      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center px-4">
         <h2 className={`font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight text-center ${compact ? "text-2xl sm:text-3xl md:text-4xl" : "text-4xl sm:text-5xl md:text-7xl"}`}>
            {title}
         </h2>
         <p className={`text-[#d4af37] tracking-[0.2em] sm:tracking-[0.5em] uppercase font-cinzel text-center ${compact ? "text-[10px] mt-2" : "text-[10px] sm:text-xs mt-3 sm:mt-4"}`}>
            {subtitle}
         </p>
         {!compact && (
           <div className="mt-8 flex gap-2 items-center text-white/50 text-xs font-mono animate-pulse">
              <Network size={14} />
              <span>INTERACTIVE NEURAL GRAPH</span>
           </div>
         )}
      </div>
    </div>
  );
}
