"use client";

import { useEffect, useRef } from "react";
import { Flashlight } from "lucide-react";

export default function PharosBanner() {
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
    const BEAM_LENGTH = 800;
    const BEAM_WIDTH_ANGLE = 0.4; // Radians
    
    const mouse = { x: 0, y: 0 };
    // Origin of light (Bottom Center)
    const origin = { x: 0, y: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    // Fog particles
    const particles = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * 700,
      size: Math.random() * 2,
      speed: Math.random() * 0.5 + 0.1,
      opacity: Math.random() * 0.5
    }));

    const render = () => {
      if (!ctx) return;
      ctx.fillStyle = "#020202";
      ctx.fillRect(0, 0, width, height);

      origin.x = width / 2;
      origin.y = height + 50; // Slightly below screen

      // Calculate angle to mouse
      const dx = mouse.x - origin.x;
      const dy = mouse.y - origin.y;
      let angle = Math.atan2(dy, dx);
      
      // Limit angle so it doesn't go below horizon too much
      angle = Math.max(-Math.PI + 0.2, Math.min(-0.2, angle));

      // Draw background text that is only visible under light (simulated via clipping or globalCompositeOperation)
      // Actually simpler: Draw everything dark, then draw "Light" overlay with 'destination-in' or 'screen' blend?
      // Let's use 'screen' blend for the light beam.

      // 1. Draw star dust (always visible but faint)
      particles.forEach(p => {
         p.y -= p.speed;
         if (p.y < 0) p.y = height;
         ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.2})`;
         ctx.beginPath();
         ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
         ctx.fill();
      });

      // 2. Draw The Light Beam
      ctx.save();
      // Gradient for beam
      // We need a gradient that spans the cone
      
      // Create a large triangle/cone for the beam
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(
         origin.x + Math.cos(angle - BEAM_WIDTH_ANGLE/2) * BEAM_LENGTH, 
         origin.y + Math.sin(angle - BEAM_WIDTH_ANGLE/2) * BEAM_LENGTH
      );
      ctx.lineTo(
         origin.x + Math.cos(angle + BEAM_WIDTH_ANGLE/2) * BEAM_LENGTH, 
         origin.y + Math.sin(angle + BEAM_WIDTH_ANGLE/2) * BEAM_LENGTH
      );
      ctx.closePath();
      
      const grad = ctx.createRadialGradient(origin.x, origin.y, 10, origin.x, origin.y, BEAM_LENGTH);
      grad.addColorStop(0, "rgba(255, 230, 200, 0.9)"); // Bright center
      grad.addColorStop(0.1, "rgba(212, 175, 55, 0.4)"); // Gold tint
      grad.addColorStop(0.6, "rgba(212, 175, 55, 0.05)");
      grad.addColorStop(1, "transparent");
      
      ctx.fillStyle = grad;
      ctx.globalCompositeOperation = "screen"; // Additive light
      ctx.fill();

      // 3. Highlight particles inside the beam
      // We re-draw particles with higher opacity if they are in the cone
      // Mathematical check for 'point in sector' is cheaper than clipping for simple particles?
      // Clipping is easier to implement visually
      ctx.clip(); // Clip to the beam path we just drew
      
      particles.forEach(p => {
        // Draw brighter particles inside beam
         ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * 0.8 + 0.2})`;
         ctx.beginPath();
         ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI*2);
         ctx.fill();
      });
      ctx.restore();


      animationFrameId = requestAnimationFrame(render);
    };

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;
      // Default mouse pos to center top so beam points up initially
      mouse.x = width / 2;
      mouse.y = height / 2;
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
    <div className="relative w-full h-[700px] overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block" />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
         <h2 className="text-5xl md:text-7xl font-serif font-black text-[#1a1a1a] tracking-tight mix-blend-color-dodge z-10" style={{ textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>
            PHAROS OF TRUTH
         </h2>
         <p className="text-[#d4af37]/30 tracking-[0.5em] text-xs mt-4 uppercase font-cinzel z-10">
            Guidance in the Void
         </p>
         <div className="mt-8 flex gap-2 items-center text-white/20 text-xs font-mono">
            <Flashlight size={14} />
            <span>LIGHTHOUSE ACTIVE</span>
         </div>
      </div>
       {/* Instruction */}
       <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/20 text-xs font-mono pointer-events-none">
          MOVE CURSOR TO DIRECT THE BEAM
       </div>
    </div>
  );
}
