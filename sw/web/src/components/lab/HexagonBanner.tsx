"use client";

import { useEffect, useRef } from "react";
import { Grid } from "lucide-react";

export default function HexagonBanner() {
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

    // Configuration
    const HEX_SIZE = 50; // Increased from 30 for performance
    const HEX_HEIGHT = HEX_SIZE * 2;
    const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
    const HOVER_RADIUS = 200;

    const mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const drawHexagon = (x: number, y: number, size: number, color: string, fill: boolean = false) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6; // Rotate 30deg to have flat top
        const hx = x + size * Math.cos(angle);
        const hy = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.stroke();
      }
    };

    const render = () => {
      tick++;
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);

      const rows = Math.ceil(height / (HEX_HEIGHT * 0.75)) + 1;
      const cols = Math.ceil(width / HEX_WIDTH) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const xOffset = (r % 2) * (HEX_WIDTH / 2);
          const x = c * HEX_WIDTH + xOffset - HEX_WIDTH / 2;
          const y = r * (HEX_HEIGHT * 0.75) - HEX_HEIGHT / 2;

          // Distance to mouse
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Interaction
          const active = Math.max(0, 1 - dist / HOVER_RADIUS);
          
          // Wave effect 
          // Use sin wave based on x, y, and tick
          const wave = Math.sin(x * 0.01 + y * 0.01 + tick * 0.02) * 0.5 + 0.5;

          // Color calculation
          // Base: Dark Stone
          // Active: Gold
          const alpha = 0.1 + active * 0.6 + wave * 0.05;
          const isGold = active > 0.1 || wave > 0.8;
          
          let color = `rgba(80, 80, 80, ${alpha})`;
          let size = HEX_SIZE - 2;

          if (isGold) {
             const gVal = 50 + active * 200;
             color = `rgba(212, 175, 55, ${alpha})`;
             
             if (active > 0.5) {
                // Fill hex if very close
               drawHexagon(x, y, size * 0.9, `rgba(212, 175, 55, ${active * 0.3})`, true);
             }
          }

          ctx.lineWidth = 1 + active;
          drawHexagon(x, y, size, color, false);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;
    };

    init();
    window.addEventListener("resize", init);
    canvas.addEventListener("mousemove", handleMouseMove);
    render();

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
         <h2 className="text-5xl md:text-7xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-t from-stone-200 to-stone-500 tracking-tighter mix-blend-overlay">
            SACRED GEOMETRY
         </h2>
         <p className="text-[#d4af37] tracking-[0.5em] text-xs mt-4 uppercase font-cinzel">
            The Structure of Logic
         </p>
         <div className="mt-8 flex gap-2 items-center text-white/50 text-xs font-mono animate-pulse">
            <Grid size={14} />
            <span>PATTERN RECOGNITION</span>
         </div>
      </div>
    </div>
  );
}
