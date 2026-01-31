"use client";

import { useEffect, useRef } from "react";
import { Music } from "lucide-react";

interface LyreBannerProps {
  height?: number;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

export default function LyreBanner({
  height = 700,
  compact = false,
  title = "HARMONY",
  subtitle = "Resonance of the Soul"
}: LyreBannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let canvasWidth = 0;
    let canvasHeight = 0;
    let animationFrameId: number;
    let tick = 0;

    // String Physics
    const STRINGS = compact ? 5 : 7;
    const SPACING = compact ? 60 : 80;

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
          const withinY = mouseY > canvasHeight * 0.1 && mouseY < canvasHeight * 0.9;

          if (withinY) {
             if ((prevMouseX < this.baseX && mouseX > this.baseX) ||
                 (prevMouseX > this.baseX && mouseX < this.baseX)) {
                   const force = Math.abs(mouseX - prevMouseX);
                   this.velocity = Math.min(20, Math.max(-20, (mouseX - prevMouseX) * 0.5));
                   this.amplitude = Math.min(50, force * 2);
             }
          }

          const force = -0.1 * (this.x - this.baseX);
          this.velocity += force;
          this.velocity *= 0.95;
          this.x += this.velocity;
       }

       draw() {
          if (!ctx) return;

          ctx.beginPath();
          ctx.moveTo(this.x, 0);

          ctx.bezierCurveTo(
             this.x + this.velocity * 5, canvasHeight * 0.33,
             this.x - this.velocity * 5, canvasHeight * 0.66,
             this.x, canvasHeight
          );

          const activity = Math.abs(this.velocity);
          const alpha = 0.2 + Math.min(0.8, activity * 0.1);

          ctx.strokeStyle = `rgba(212, 175, 55, ${alpha})`;
          ctx.lineWidth = 1 + activity * 0.2;
          ctx.stroke();
       }
    }

    let strings: GuitarString[] = [];
    const init = () => {
      canvasWidth = canvas.parentElement?.clientWidth || window.innerWidth;
      canvasHeight = canvas.parentElement?.clientHeight || height;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      strings = [];
      const totalWidth = (STRINGS - 1) * SPACING;
      const startX = (canvasWidth - totalWidth) / 2;

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

    const handleTouchMove = (e: TouchEvent) => {
       if (e.touches.length === 0) return;
       const touch = e.touches[0];
       const rect = canvas.getBoundingClientRect();
       prevMouse.x = mouse.x;
       prevMouse.y = mouse.y;
       mouse.x = touch.clientX - rect.left;
       mouse.y = touch.clientY - rect.top;
    };

    const animate = () => {
      tick++;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Vertical Gradient Background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, "#080808");
      gradient.addColorStop(0.5, "#111");
      gradient.addColorStop(1, "#080808");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw Base/Top decorations
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvasWidth, 20);
      ctx.fillRect(0, canvasHeight - 20, canvasWidth, 20);

      ctx.fillStyle = "#d4af37";
      ctx.fillRect(0, 19, canvasWidth, 1);
      ctx.fillRect(0, canvasHeight - 20, canvasWidth, 1);

      strings.forEach(s => {
         s.update(mouse.x, mouse.y, prevMouse.x);
         s.draw();
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
           <>
             <div className="mt-8 flex gap-2 items-center text-white/50 text-xs font-mono animate-pulse">
                <Music size={14} />
                <span>INTERACTIVE STRINGS</span>
             </div>
             <div className="absolute bottom-12 text-white/20 text-[10px] font-mono">
                STRUM THE STRINGS WITH YOUR CURSOR
             </div>
           </>
         )}
      </div>
    </div>
  );
}
