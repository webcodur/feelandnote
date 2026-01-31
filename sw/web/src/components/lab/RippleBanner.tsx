"use client";

import { useEffect, useRef, useState } from "react";
import { Waves } from "lucide-react";

export default function RippleBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
     // Normalize to -1 to 1
     const x = (e.clientX / window.innerWidth) * 2 - 1;
     const y = (e.clientY / window.innerHeight) * 2 - 1;
     setMousePos({ x, y });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = 700;
    };
    resize();
    window.addEventListener("resize", resize);

    // Particle/Wave Settings
    const GAP = 50; // Increased from 30 to 50 for performance
    
    const render = () => {
       time += 0.05;
       ctx.fillStyle = "#050505";
       ctx.fillRect(0, 0, canvas.width, canvas.height);

       const cols = Math.ceil(canvas.width / GAP);
       const rows = Math.ceil(canvas.height / GAP);

       for (let ix = 0; ix <= cols; ix++) {
         for (let iy = 0; iy <= rows; iy++) {
            const x = ix * GAP;
            const y = iy * GAP;

            // Distance from mouse (interaction)
            // We map canvas coords to -1..1 for comparison
            const nx = (x / canvas.width) * 2 - 1;
            const ny = (y / canvas.height) * 2 - 1;
            
            const dx = nx - mousePos.x;
            const dy = ny - mousePos.y;
            // Approximation for performance (manhattan distance is faster but circular is better looking)
            // Sticking to pythagoras but could limit checks
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Wave calculation
            const angle = dist * 10 - time;
            const displacement = Math.sin(angle) * 10;
            
            // Interaction bloom
            const active = Math.max(0, 1 - dist * 3); 

            const size = active * 4 + 2;
            
            // Optimization: Simplify color string or logic
            // Only draw if visible
            ctx.beginPath();
            ctx.arc(x, y + displacement, size, 0, Math.PI * 2);
            // Use lighter alpha operations
            ctx.fillStyle = `rgba(212, 175, 55, ${0.3 + active * 0.7})`; 
            ctx.fill();
         }
       }

       animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mousePos]);

  return (
    <div className="relative w-full h-[700px] bg-[#050505] overflow-hidden" onMouseMove={handleMouseMove}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
         <h2 className="text-5xl md:text-7xl font-cinzel text-white/90 mix-blend-overlay tracking-widest blur-[1px]">
            TIME RIPPLE
         </h2>
         <p className="text-[#d4af37] tracking-[1em] text-[10px] mt-4 uppercase">
            Every moment creates a wave
         </p>
         <Waves className="text-[#d4af37]/50 mt-8 animate-pulse" size={32} />
      </div>
    </div>
  );
}
