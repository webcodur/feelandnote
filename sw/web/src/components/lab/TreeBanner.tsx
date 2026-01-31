"use client";

import { useEffect, useRef } from "react";
import { Sprout } from "lucide-react";

interface TreeBannerProps {
  height?: number;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

export default function TreeBanner({
  height = 700,
  compact = false,
  title = "TREE OF WISDOM",
  subtitle = "Growth and Prosperity"
}: TreeBannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let canvasWidth = 0;
    let canvasHeight = 0;
    let animationFrameId: number;
    let time = 0;

    // Configuration
    const mouse = { x: 0, y: 0 };
    const treeDepth = compact ? 8 : 11;
    const baseLength = compact ? 70 : 140;

    const drawBranch = (startX: number, startY: number, len: number, angle: number, depth: number) => {
      ctx.beginPath();
      ctx.save();

      ctx.translate(startX, startY);
      ctx.rotate(angle);

      // Calculate width based on depth
      const lineWidth = depth > 3 ? depth * 1.5 : depth * 0.5;
      ctx.lineWidth = lineWidth;

      // Color blend from trunk (dark) to tips (gold)
      const colorRatio = 1 - depth / 10;
      const r = 40 + (212 - 40) * colorRatio;
      const g = 40 + (175 - 40) * colorRatio;
      const b = 40 + (55 - 40) * colorRatio;

      ctx.strokeStyle = `rgba(${r},${g},${b}, 1)`;
      ctx.lineCap = "round";

      ctx.moveTo(0, 0);
      ctx.lineTo(0, -len);
      ctx.stroke();

      if (depth < 1) {
         // Draw Leaf/Fruit at tip
         ctx.beginPath();
         ctx.arc(0, -len, 3, 0, Math.PI*2);
         ctx.fillStyle = `rgba(255, 230, 100, ${Math.sin(time + startX) * 0.5 + 0.5})`;
         ctx.fill();
         ctx.restore();
         return;
      }

      ctx.translate(0, -len);

      // Calculate split angles based on mouse "Wind"
      const wind = (mouse.x - canvasWidth/2) / canvasWidth;
      const sway = Math.sin(time * (0.5 + depth * 0.1)) * 0.005 * depth;

      const angleOffset = 0.4 + wind * 0.01;

      // Recursive calls
      drawBranch(0, 0, len * 0.75, angleOffset + sway, depth - 1);
      drawBranch(0, 0, len * 0.75, -angleOffset + sway, depth - 1);

      ctx.restore();
    };

    const init = () => {
      canvasWidth = canvas.parentElement?.clientWidth || window.innerWidth;
      canvasHeight = canvas.parentElement?.clientHeight || height;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      mouse.x = canvasWidth / 2;
    };

    const handleMouseMove = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       mouse.x = e.clientX - rect.left;
       mouse.y = e.clientY - rect.top;
    };

    const animate = () => {
      time += 0.03;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Floor
      ctx.fillStyle = "#111";
      ctx.fillRect(0, canvasHeight - 10, canvasWidth, 10);

      // Start Tree from bottom center
      drawBranch(canvasWidth / 2, canvasHeight - 20, baseLength, 0, treeDepth);

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
  }, [height, compact]);

  return (
    <div className={`relative w-full overflow-hidden bg-[#0a0a0a] ${compact ? "h-[250px] sm:h-[300px] md:h-[350px]" : ""}`} style={compact ? undefined : { height }}>
      <canvas ref={canvasRef} className="block" />

      {/* Overlay Content */}
      <div className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-center px-4 ${compact ? "" : "translate-y-[-100px]"}`}>
         <h2 className={`font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-stone-500 tracking-tight text-center ${compact ? "text-2xl sm:text-3xl md:text-4xl" : "text-4xl sm:text-5xl md:text-7xl"}`}>
            {title}
         </h2>
         <p className={`text-[#d4af37] tracking-[0.2em] sm:tracking-[0.5em] uppercase font-cinzel text-center ${compact ? "text-[10px] mt-2" : "text-[10px] sm:text-xs mt-3 sm:mt-4"}`}>
            {subtitle}
         </p>
         {!compact && (
           <div className="mt-8 flex gap-2 items-center text-white/30 text-xs font-mono">
              <Sprout size={14} />
              <span>ORGANIC FRACTAL</span>
           </div>
         )}
      </div>

       {/* Instruction */}
       {!compact && (
         <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/10 text-[10px] font-mono pointer-events-none">
            MOVE CURSOR TO CONTROL THE WIND
         </div>
       )}
    </div>
  );
}
