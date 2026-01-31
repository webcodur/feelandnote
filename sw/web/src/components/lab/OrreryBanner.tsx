"use client";

import { useEffect, useRef } from "react";
import { Orbit } from "lucide-react";

export default function OrreryBanner() {
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
    const PLANET_COUNT = 4;
    
    class Planet {
       index: number;
       distance: number;
       size: number;
       speed: number;
       angle: number;
       color: string;
       
       constructor(index: number) {
          this.index = index;
          this.distance = 100 + index * 60;
          this.size = 8 + Math.random() * 8;
          this.speed = 0.005 + (PLANET_COUNT - index) * 0.002;
          this.angle = Math.random() * Math.PI * 2;
          
          if (index === 0) this.color = "#a0a0a0"; // Mercury (Stone)
          else if (index === 1) this.color = "#d4af37"; // Venus (Gold)
          else if (index === 2) this.color = "#cd7f32"; // Earth/Mars (Bronze)
          else this.color = "#e0e0e0"; // Jupiter (Marble)
       }

       update() {
          this.angle += this.speed;
       }
    }

    let planets: Planet[] = [];
    const mouse = { x: 0.5, y: 0.5 }; // normalized 0-1
    const targetTilt = { x: 0, y: 0.4 }; // Pitch, Yaw? Just Pitch scale

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;

      planets = [];
      for (let i = 0; i < PLANET_COUNT; i++) {
         planets.push(new Planet(i));
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
       const rect = canvas.getBoundingClientRect();
       mouse.x = (e.clientX - rect.left) / width;
       mouse.y = (e.clientY - rect.top) / height;
    };

    const animate = () => {
      // Tilt control
      // Mouse Y controls the "flatness" of the ellipse (Pitch)
      // 0.1 (flat) to 1.0 (circle)
      const pitch = 0.2 + mouse.y * 0.6;
      
      // Mouse X controls rotation Z offset? Or just subtle parallax?
      // Let's just rotate the whole system slowly
      const rotationOffset = mouse.x * Math.PI * 0.5;

      ctx.fillStyle = "#080808";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      // Draw Orbit Rings (Back half)
      ctx.lineWidth = 1;
      
      planets.forEach(p => {
         ctx.beginPath();
         ctx.ellipse(cx, cy, p.distance, p.distance * pitch, rotationOffset, 0, Math.PI * 2);
         ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
         ctx.stroke();
      });

      // Draw Sun
      const sunGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 60);
      sunGrad.addColorStop(0, "#fff");
      sunGrad.addColorStop(0.2, "#d4af37");
      sunGrad.addColorStop(1, "rgba(212, 175, 55, 0)");
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 60, 0, Math.PI * 2);
      ctx.fill();
      
      // Core Sun
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI * 2);
      ctx.fill();


      // Sort planets by "y" (depth) to draw front/back correctly?
      // In 2D ellipse projection:
      // x = cos(a) * r
      // y = sin(a) * r * pitch
      // z = sin(a) * r ?? No.
      // 3D rotation logic:
      // orbit is in X-Z plane.
      // x = r * cos(a)
      // z = r * sin(a)
      // Project:
      // screenX = x
      // screenY = z * pitch
      // Depth is z.
      // If pitch is positive (looking down), +z is 'down' on screen (front), -z is 'up' (back).
      // Actually standard 3D: +z towards camera.
      // Let's model:
      // angle 0 = right (+x)
      // angle 90 = front (+z)
      
      const renderList = planets.map(p => {
         const a = p.angle + rotationOffset; // Apply global rotation
         const x = Math.cos(a) * p.distance;
         const z = Math.sin(a) * p.distance; // True depth relative to sun

         const screenX = cx + x;
         const screenY = cy + z * pitch;

         // Scale based on depth (perspective simulation)
         // z goes from -distance to +distance
         // scale factor
         const scale = 1 + z / 1000;

         return { planet: p, x: screenX, y: screenY, z, scale };
      });

      // Sort: z (back to front)
      renderList.sort((a, b) => a.z - b.z);

      renderList.forEach(({ planet, x, y, scale }) => {
         planet.update(); // Update physics for next frame

         // Planet Body
         ctx.beginPath();
         ctx.arc(x, y, planet.size * scale, 0, Math.PI * 2);
         ctx.fillStyle = planet.color;
         ctx.fill();

         // Shadow (fake lighting from Sun)
         const dx = cx - x;
         const dy = cy - y;
         const angleToSun = Math.atan2(dy, dx);

         ctx.beginPath();
         ctx.arc(x, y, planet.size * scale, angleToSun + Math.PI / 2, angleToSun - Math.PI / 2);
         ctx.fillStyle = "rgba(0,0,0,0.5)";
         ctx.fill();
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
    <div className="relative w-full h-[700px] overflow-hidden bg-[#080808]">
      <canvas ref={canvasRef} className="block" />
      
      {/* Overlay Content */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center translate-y-[-100px]">
         <h2 className="text-5xl md:text-7xl font-serif font-black text-[#d4af37]/10 tracking-tight blur-[2px]">
            UNIVERSE
         </h2>
      </div>
      
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center pointer-events-none">
         <div className="mt-[200px] flex flex-col items-center">
            <h2 className="text-4xl md:text-6xl font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-amber-600 tracking-tight mix-blend-screen">
               GRAND ORRERY
            </h2>
            <p className="text-white/40 tracking-[0.5em] text-xs mt-4 uppercase font-cinzel">
               Center of Your World
            </p>
            <div className="mt-8 flex gap-2 items-center text-white/30 text-xs font-mono">
               <Orbit size={14} />
               <span>PLANETARY SYSTEM</span>
            </div>
         </div>
      </div>
       {/* Instruction */}
       <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-white/10 text-[10px] font-mono pointer-events-none">
          MOUSE Y TO TILT PLANE
       </div>
    </div>
  );
}
