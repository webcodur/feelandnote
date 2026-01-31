"use client";

import { useEffect, useRef } from "react";
import { Columns } from "lucide-react";

export default function PillarsBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId: number;
    
    // Config
    const PILLAR_COUNT = 6; // Per side
    const PILLAR_SPACING = 300; // Depth spacing
    
    const mouse = { x: 0.5, y: 0.5 }; // Normalized 0-1
    const targetMouse = { x: 0.5, y: 0.5 }; // For smooth lerp

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;
    };
    
    // Helper to draw a pillar
    // x, y, w, h are screen coordinates
    const drawPillar = (x: number, topY: number, botY: number, w: number, alpha: number) => {
       // Shadow
       ctx.fillStyle = `rgba(0,0,0, ${0.5 * alpha})`;
       ctx.fillRect(x + w*0.5, botY, w * 2, 20); // Simple floor shadow
       
       // Pillar Body (Gradient for roundness)
       const grad = ctx.createLinearGradient(x, topY, x + w, topY);
       grad.addColorStop(0, "#111"); // Left edge dark
       grad.addColorStop(0.3, "#444"); // Highlight
       grad.addColorStop(0.6, "#222"); // Base
       grad.addColorStop(1, "#050505"); // Right shadow
       
       ctx.fillStyle = grad;
       ctx.fillRect(x, topY, w, botY - topY);
       
       // Gold Accents (Capital and Base)
       ctx.fillStyle = `rgba(212, 175, 55, ${0.4 * alpha})`; // Dim gold
       // Base
       ctx.fillRect(x - w*0.1, botY - w*0.5, w*1.2, w*0.5);
       // Capital
       ctx.fillRect(x - w*0.1, topY, w*1.2, w*0.8);
       
       // Subtle Fluting lines
       ctx.strokeStyle = "rgba(0,0,0,0.5)";
       ctx.lineWidth = 1;
       ctx.beginPath();
       ctx.moveTo(x + w*0.3, topY);
       ctx.lineTo(x + w*0.3, botY);
       ctx.moveTo(x + w*0.7, topY);
       ctx.lineTo(x + w*0.7, botY);
       ctx.stroke();
    };

    const handleMouseMove = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       targetMouse.x = (e.clientX - rect.left) / width;
       targetMouse.y = (e.clientY - rect.top) / height;
    };

    const animate = () => {
      // Lerp mouse
      mouse.x += (targetMouse.x - mouse.x) * 0.05;
      mouse.y += (targetMouse.y - mouse.y) * 0.05;

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, width, height);
      
      // Vanishing Point
      // Moves based on mouseX, Y
      const vpX = width * 0.5 + (0.5 - mouse.x) * width * 0.5; // Parallax opposite to mouse
      const vpY = height * 0.5 + (0.5 - mouse.y) * 100;
      
      // Horizon (Floor vs Sky)
      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, vpY);
      skyGrad.addColorStop(0, "#000");
      skyGrad.addColorStop(1, "#1a1a1a");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, vpY);
      
      // Floor (Reflective marble)
      const floorGrad = ctx.createLinearGradient(0, vpY, 0, height);
      floorGrad.addColorStop(0, "#1a1a1a");
      floorGrad.addColorStop(1, "#000");
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, vpY, width, height - vpY);
      
      // Grid lines on floor for depth
      ctx.strokeStyle = "rgba(212, 175, 55, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Radiating lines
      for(let i = -5; i <= 5; i++) {
         const x = width/2 + i * 200;
         ctx.moveTo(x, height);
         ctx.lineTo(vpX, vpY);
      }
      ctx.stroke();


      // Draw Pillars
      // We draw from back (farthest) to front
      const DEPTH_START = 2000;
      const DEPTH_END = 100;
      
      // We want rows on Left and Right
      const SIDE_OFFSET = 400; // Half width of "corridor"
      
      for(let i = PILLAR_COUNT; i >= 0; i--) {
         // Z position (fake depth)
         // z goes from far to near
         // Move pillars "Forward" slightly constantly? No, stationarty.
         // Just static placement
         const z = 100 + i * PILLAR_SPACING;
         
         // Project to 2D
         // Scale factor
         const fl = 800; // focal length
         const scale = fl / (fl + z);
         
         const alpha = Math.min(1, scale * 1.5); // Fade out far ones
         
         // World positions relative to camera center
         // Parallax shift: Camera moves left/right
         const camX = (mouse.x - 0.5) * 800; // Camera pos
         
         // Left Pillar
         const lx = -SIDE_OFFSET - camX;
         const screenLX = vpX + lx * scale;
         const screenW = 80 * scale;
         const screenH = 2000 * scale; // Tall pillars
         // Position vertically centered on horizon? No, sitting on floor.
         // Floor Y at this Z
         const floorY = vpY + 400 * scale; // 400 is camera height
         const ceilingY = vpY - 800 * scale;
         
         drawPillar(screenLX - screenW/2, ceilingY, floorY, screenW, alpha);

         // Right Pillar
         const rx = SIDE_OFFSET - camX;
         const screenRX = vpX + rx * scale;
         drawPillar(screenRX - screenW/2, ceilingY, floorY, screenW, alpha);
      }

      // Draw Atmospheric Dust
      // Simple dots moving
      // Saved for V2 if needed for performance

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
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center translate-y-[-50px]">
         <h2 className="text-5xl md:text-7xl font-serif font-black text-[#d4af37] tracking-tight mix-blend-overlay opacity-80 shadow-2xl">
            THE PANTHEON
         </h2>
         <p className="text-white/30 tracking-[0.5em] text-xs mt-4 uppercase font-cinzel">
            Hall of Records
         </p>
         <div className="mt-8 flex gap-2 items-center text-white/20 text-xs font-mono">
            <Columns size={14} />
            <span>ARCHITECTURAL PERSPECTIVE</span>
         </div>
      </div>
    </div>
  );
}
