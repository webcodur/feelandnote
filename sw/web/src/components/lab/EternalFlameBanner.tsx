"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Flame } from "lucide-react";

interface Props {
  children?: ReactNode;
}

class EternalFireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  baseX: number;

  constructor(
    private readonly getWidth: () => number,
    private readonly getHeight: () => number,
    private readonly ctx: CanvasRenderingContext2D,
    reset = false,
  ) {
    const width = getWidth();
    const height = getHeight();
    this.baseX = width / 2;
    this.x = this.baseX + (Math.random() - 0.5) * 60;
    this.y = reset ? height * 0.8 + Math.random() * 50 : Math.random() * height;
    this.vx = (Math.random() - 0.5) * 1;
    this.vy = -(Math.random() * 2 + 1);
    this.life = Math.random() * 0.5 + 0.5;
    this.maxLife = this.life;
    this.size = Math.random() * 15 + 10;
  }

  update(mouseX: number, mouseY: number) {
    const dx = this.x - mouseX;
    const dy = this.y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 200) {
      const force = (1 - dist / 200) * 0.5;
      this.vx += (dx / dist) * force;
      this.vx += (Math.random() - 0.5) * 0.5;
    }

    this.vx += (this.baseX - this.x) * 0.002;
    this.vy -= 0.05;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 0.015;
    this.size *= 0.98;

    if (this.life <= 0 || this.size < 0.5) this.reset();
  }

  reset() {
    const width = this.getWidth();
    const height = this.getHeight();
    this.x = width / 2 + (Math.random() - 0.5) * 60;
    this.y = height * 0.8 + Math.random() * 20;
    this.vx = (Math.random() - 0.5) * 1;
    this.vy = -(Math.random() * 2 + 1);
    this.life = Math.random() * 0.4 + 0.6;
    this.size = Math.random() * 20 + 20;
  }

  draw() {
    const progress = 1 - (this.life / this.maxLife);
    let r, g, b, a;

    if (progress < 0.2) {
      r = 255; g = 255; b = 200; a = 0.8;
    } else if (progress < 0.5) {
      r = 255; g = 200; b = 50; a = 0.6;
    } else if (progress < 0.8) {
      r = 200; g = 100; b = 0; a = 0.4;
    } else {
      r = 100; g = 20; b = 0; a = 0.0;
    }

    a *= this.life;
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
    this.ctx.fill();
  }
}

export default function EternalFlameBanner({ children }: Props) {
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
    const PARTICLE_COUNT = 400;
    
    let particles: EternalFireParticle[] = [];
    const mouse = { x: -1000, y: -1000 };

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;

      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
         const p = new EternalFireParticle(() => width, () => height, ctx, true);
         // Pre-warm simulations
         for(let j=0; j<100; j++) p.update(-1000, -1000); 
         particles.push(p);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       mouse.x = e.clientX - rect.left;
       mouse.y = e.clientY - rect.top;
    };

    const animate = () => {
      // Clear with trail effect for blur
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
      ctx.fillRect(0, 0, width, height);

      // Additive blending for fire glow
      ctx.globalCompositeOperation = "screen";

      particles.forEach(p => {
         p.update(mouse.x, mouse.y);
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
    <div className="relative w-full h-[700px] overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block" />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center translate-y-[-50px]">
         {children ?? (
           <>
             <h2 className="text-5xl md:text-7xl font-serif font-black text-[#d4af37] tracking-tight mix-blend-overlay blur-[1px] animate-pulse">
                PROMETHEUS
             </h2>
             <p className="text-orange-500/50 tracking-[0.5em] text-xs mt-4 uppercase font-cinzel">
                The Eternal Flame
             </p>
           </>
         )}
         <div className="mt-8 flex gap-2 items-center text-white/20 text-xs font-mono">
            <Flame size={14} />
            <span>IGNITION SOURCE</span>
         </div>
      </div>
      
       {/* Instruction */}
       <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/10 text-[10px] font-mono pointer-events-none">
          BLOW THE FIRE WITH CURSOR
       </div>
    </div>
  );
}
