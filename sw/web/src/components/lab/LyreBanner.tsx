"use client";

import { useEffect, useRef } from "react";
import { Music } from "lucide-react";

export default function LyreBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId: number;
    let tick = 0;

    // String Physics
    const STRINGS = 7;
    const SPACING = 80;
    
    class GuitarString {
       x: number;
       baseX: number;
       velocity: number;
       amplitude: number;
       frequency: number;

       constructor(x: number, index: number) {
          this.baseX = x;
          this.x = x;
          this.velocity = 0;
          this.amplitude = 0;
          this.frequency = 0.1 + index * 0.02; 
       }

       update(mouseX: number, mouseY: number, prevMouseX: number) {
          // Check collision with mouse movement
          // Simple check: if mouse crossed the string
          const withinY = mouseY > height * 0.1 && mouseY < height * 0.9;
          
          if (withinY) {
             // Basic collision detection
             if ((prevMouseX < this.baseX && mouseX > this.baseX) || 
                 (prevMouseX > this.baseX && mouseX < this.baseX)) {
                   const force = Math.abs(mouseX - prevMouseX);
                   this.velocity = Math.min(20, Math.max(-20, (mouseX - prevMouseX) * 0.5));
                   this.amplitude = Math.min(50, force * 2);
             }
          }

          // Physics: Spring Intertia
          const force = -0.1 * (this.x - this.baseX); // Spring to base
          this.velocity += force;
          this.velocity *= 0.95; // Damping
          this.x += this.velocity;
       }

       draw() {
          if (!ctx) return;
          
          ctx.beginPath();
          ctx.moveTo(this.x, 0);
          
          // Draw curve
          // We simulate a quadratic curve where the control point moves
          // For a real string vibration, we'd need multiple points, but a single curve is good for "plucking" visual
          
          // Visualize vibration as a sine wave if amplitude is high?
          // Simple version: Quad curve to current x displacement at mouse height?
          // Since we don't track mouse Y for pluck location perfectly, let's just bow the center.
          
          // Actually, let's make it more wobbly.
          // We can use a sine wave overlaid on the displacement
          const wobbles = 10;
          const vibration = Math.sin(tick * 0.5) * this.velocity * 0.5;

          ctx.bezierCurveTo(
             this.x + this.velocity * 5, height * 0.33,
             this.x - this.velocity * 5, height * 0.66,
             this.x, height
          );

          // Glow based on activity
          const activity = Math.abs(this.velocity);
          const alpha = 0.2 + Math.min(0.8, activity * 0.1);
          
          ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
          ctx.lineWidth = 1 + activity * 0.2;
          ctx.stroke();

          // Add particles/sparkles if vibrating hard
          if (activity > 2 && Math.random() > 0.8) {
             // drawSparkle
          }
       }
    }

    let strings: GuitarString[] = [];
    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;

      strings = [];
      const totalWidth = (STRINGS - 1) * SPACING;
      const startX = (width - totalWidth) / 2;
      
      for (let i = 0; i < STRINGS; i++) {
         strings.push(new GuitarString(startX + i * SPACING, i));
      }
    };

    let prevMouse = { x: -1000, y: -1000 };
    const mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       prevMouse.x = mouse.x;
       prevMouse.y = mouse.y;
       mouse.x = e.clientX - rect.left;
       mouse.y = e.clientY - rect.top;
    };

    const animate = () => {
      tick++;
      ctx.clearRect(0, 0, width, height);
      
      // Vertical Gradient Background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "#080808");
      gradient.addColorStop(0.5, "#111");
      gradient.addColorStop(1, "#080808");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw Base/Top decorations (Wood/Gold blocks)
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, width, 20);
      ctx.fillRect(0, height - 20, width, 20);
      
      ctx.fillStyle = "#d4af37";
      ctx.fillRect(0, 19, width, 1);
      ctx.fillRect(0, height - 20, width, 1);

      strings.forEach(s => {
         s.update(mouse.x, mouse.y, prevMouse.x);
         s.draw();
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
    <div className="relative w-full h-[700px] overflow-hidden">
      <canvas ref={canvasRef} className="block" />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
         <h2 className="text-5xl md:text-7xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-stone-400 to-white tracking-tight mix-blend-overlay">
            HARMONY
         </h2>
         <p className="text-[#d4af37] tracking-[0.5em] text-xs mt-4 uppercase font-cinzel">
            Resonance of the Soul
         </p>
         <div className="mt-8 flex gap-2 items-center text-white/50 text-xs font-mono animate-pulse">
            <Music size={14} />
            <span>INTERACTIVE STRINGS</span>
         </div>
         {/* Instruction */}
         <div className="absolute bottom-12 text-white/20 text-[10px] font-mono">
            STRUM THE STRINGS WITH YOUR CURSOR
         </div>
      </div>
    </div>
  );
}
