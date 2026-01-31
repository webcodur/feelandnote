"use client";

import { useEffect, useRef } from "react";
import { Sprout } from "lucide-react";

export default function TreeBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId: number;
    let time = 0;
    
    // Configuration
    const mouse = { x: 0, y: 0 };
    
    // Tree settings
    let startLength = 150;
    
    const drawBranch = (startX: number, startY: number, len: number, angle: number, depth: number) => {
      ctx.beginPath();
      ctx.save();
      
      ctx.translate(startX, startY);
      ctx.rotate(angle);
      
      // Calculate width based on depth
      const lineWidth = depth > 3 ? depth * 1.5 : depth * 0.5;
      ctx.lineWidth = lineWidth;
      
      // Color blend from trunk (dark) to tips (gold)
      const colorRatio = 1 - depth / 10; // 0 to 1
      // Dark Stone to Gold
      // Trunk: 40,40,40
      // Tips: 212,175,55
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
         ctx.fillStyle = `rgba(255, 230, 100, ${Math.sin(time + startX) * 0.5 + 0.5})`; // Twinkle
         ctx.fill();
         ctx.restore();
         return;
      }

      ctx.translate(0, -len);
      
      // Calculate split angles based on mouse "Wind"
      // Mouse X relative to center defines wind direction and strength
      const wind = (mouse.x - width/2) / width; // -0.5 to 0.5
      // Sway drastically reduced for "subtle breathing" only
      const sway = Math.sin(time * (0.5 + depth * 0.1)) * 0.005 * depth; 
      
      const angleOffset = 0.4 + wind * 0.01; // Barely noticeable wind
      
      // Recursive calls
      // Right branch
      drawBranch(0, 0, len * 0.75, angleOffset + sway, depth - 1);
      // Left branch
      drawBranch(0, 0, len * 0.75, -angleOffset + sway, depth - 1);
      
      ctx.restore();
    };

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;
      mouse.x = width / 2;
    };

    const handleMouseMove = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       mouse.x = e.clientX - rect.left;
       mouse.y = e.clientY - rect.top;
    };

    const animate = () => {
      time += 0.03;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, width, height);

      // Floor
      ctx.fillStyle = "#111";
      ctx.fillRect(0, height - 10, width, 10);

      // Start Tree from bottom center
      // Depth 12 is minimal for full tree
      drawBranch(width / 2, height - 20, 140, 0, 11);

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
    <div className="relative w-full h-[700px] overflow-hidden bg-[#0a0a0a]">
      <canvas ref={canvasRef} className="block" />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center translate-y-[-100px]">
         <h2 className="text-5xl md:text-7xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-b from-emerald-200 to-emerald-900 tracking-tight mix-blend-plus-lighter opacity-80">
            TREE OF WISDOM
         </h2>
         <p className="text-emerald-500/50 tracking-[0.5em] text-xs mt-4 uppercase font-cinzel">
            Growth and Prosperity
         </p>
         <div className="mt-8 flex gap-2 items-center text-white/30 text-xs font-mono">
            <Sprout size={14} />
            <span>ORGANIC FRACTAL</span>
         </div>
      </div>
      
       {/* Instruction */}
       <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/10 text-[10px] font-mono pointer-events-none">
          MOVE CURSOR TO CONTROL THE WIND
       </div>
    </div>
  );
}
