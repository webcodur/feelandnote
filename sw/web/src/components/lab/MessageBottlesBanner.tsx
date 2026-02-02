"use client";

import { useEffect, useRef } from "react";
import { Anchor } from "lucide-react";

export default function MessageBottlesBanner({ children }: { children?: React.ReactNode }) {
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
    const BOTTLE_COUNT = 8;
    
    type Wave = {
        y: number;
        length: number;
        amplitude: number;
        speed: number;
        color: string;
    }

    // Three layers of waves
    const waves: Wave[] = [
        { y: 0, length: 0.005, amplitude: 30, speed: 0.02, color: "rgba(30, 40, 60, 0.3)" }, // Back
        { y: 0, length: 0.01, amplitude: 40, speed: 0.03, color: "rgba(20, 30, 50, 0.5)" }, // Mid
        { y: 0, length: 0.008, amplitude: 50, speed: 0.04, color: "rgba(10, 20, 40, 0.8)" }  // Front
    ];

    type Bottle = {
        x: number;
        layer: 0 | 1 | 2; // Which wave it floats on
        angle: number;
        type: number; // Variation
        message: boolean;
    }

    const bottles: Bottle[] = [];

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;

      // Base Y for waves
      waves[0].y = height * 0.55;
      waves[1].y = height * 0.65;
      waves[2].y = height * 0.75;

      // Init bottles
      bottles.length = 0;
      for (let i = 0; i < BOTTLE_COUNT; i++) {
          bottles.push({
              x: Math.random() * width,
              layer: Math.floor(Math.random() * 3) as 0|1|2,
              angle: 0,
              type: Math.floor(Math.random() * 2),
              message: true
          });
      }
    };

    const getWaveY = (x: number, wave: Wave, t: number) => {
        return wave.y + Math.sin(x * wave.length + t * wave.speed) * wave.amplitude + 
               Math.sin(x * wave.length * 2 + t * wave.speed * 1.5) * (wave.amplitude * 0.5);
    };

    const getWaveSlope = (x: number, wave: Wave, t: number) => {
        // Derivative approx
        const d = 5;
        const y1 = getWaveY(x - d, wave, t);
        const y2 = getWaveY(x + d, wave, t);
        return Math.atan2(y2 - y1, d * 2);
    };

    const drawBottle = (x: number, y: number, angle: number, scale: number) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(scale, scale);

        // Glass Body
        ctx.fillStyle = "rgba(200, 220, 255, 0.1)";
        ctx.strokeStyle = "rgba(200, 220, 255, 0.4)";
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        // Bottle shape
        ctx.moveTo(-15, -20);
        ctx.lineTo(-15, 30);
        ctx.arc(0, 30, 15, Math.PI, 0, true); // Bottom curve
        ctx.lineTo(15, -20);
        // Neck
        ctx.quadraticCurveTo(8, -30, 8, -40);
        ctx.lineTo(10, -45); // Lip
        ctx.lineTo(-10, -45); // Lip
        ctx.lineTo(-8, -40);
        ctx.quadraticCurveTo(-8, -30, -15, -20);
        
        ctx.fill();
        ctx.stroke();

        // Cork
        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(-7, -48, 14, 8);

        // Message Scroll inside
        ctx.fillStyle = "#f0e6d2"; // Parchment
        ctx.beginPath();
        ctx.moveTo(-8, 20);
        ctx.lineTo(8, 25);
        ctx.lineTo(6, -10);
        ctx.lineTo(-6, -15);
        ctx.fill();
        
        // Scroll details (tie)
        ctx.fillStyle = "#cc0000";
        ctx.fillRect(-7, 5, 14, 2);

        // Highlights
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        ctx.moveTo(8, -20);
        ctx.lineTo(10, 20);
        ctx.stroke();

        ctx.restore();
    };

    const drawWave = (wave: Wave, t: number) => {
        ctx.fillStyle = wave.color;
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, getWaveY(0, wave, t));
        
        for (let x = 0; x <= width; x += 10) {
            ctx.lineTo(x, getWaveY(x, wave, t));
        }
        
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
        
        // Surface specular line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= width; x += 10) {
            const y = getWaveY(x, wave, t);
            if(x===0) ctx.moveTo(x,y);
            else ctx.lineTo(x,y);
        }
        ctx.stroke();
    };

    const animate = () => {
        time++;
        
        // Background - Deep Ocean Night
        const gradBG = ctx.createLinearGradient(0, 0, 0, height);
        gradBG.addColorStop(0, "#0a0a12");
        gradBG.addColorStop(0.5, "#0f1525");
        gradBG.addColorStop(1, "#1a253a");
        ctx.fillStyle = gradBG;
        ctx.fillRect(0, 0, width, height);

        // Moon/Stars?
        ctx.fillStyle = "#ffffff";
        // Simple stars
        for(let i=0; i<50; i++) {
             // Static stars seeded basically (but random here flickers, so use fixed seed or just random once in init, but for now simple sparkle)
             if(Math.random() > 0.95) ctx.fillRect(Math.random()*width, Math.random()*height*0.5, 1, 1);
        }

        // Draw Layers (Wave -> Bottles -> Wave -> Bottles...)
        // Sorted by z-index effectively
        
        // Layer 0 Wave
        drawWave(waves[0], time);
        // Layer 0 Bottles
        bottles.filter(b => b.layer === 0).forEach(b => {
             b.x += 0.2; // Drift speed
             if(b.x > width + 50) b.x = -50;
             const y = getWaveY(b.x, waves[0], time);
             const angle = getWaveSlope(b.x, waves[0], time);
             drawBottle(b.x, y + 10, angle + Math.sin(time*0.05 + b.x)*0.2, 0.6); // float slightly submerged
        });

        // Layer 1 Wave
        drawWave(waves[1], time);
        // Layer 1 Bottles
        bottles.filter(b => b.layer === 1).forEach(b => {
             b.x += 0.3; 
             if(b.x > width + 50) b.x = -50;
             const y = getWaveY(b.x, waves[1], time);
             const angle = getWaveSlope(b.x, waves[1], time);
             drawBottle(b.x, y + 15, angle + Math.sin(time*0.04 + b.x)*0.25, 0.8);
        });

        // Layer 2 Wave (Front)
        drawWave(waves[2], time);
        // Layer 2 Bottles
        bottles.filter(b => b.layer === 2).forEach(b => {
             b.x += 0.4; 
             if(b.x > width + 50) b.x = -50;
             const y = getWaveY(b.x, waves[2], time);
             const angle = getWaveSlope(b.x, waves[2], time);
             drawBottle(b.x, y + 20, angle + Math.sin(time*0.03 + b.x)*0.3, 1.0);
        });
        
        // Foreground mist?
        
        animationFrameId = requestAnimationFrame(animate);
    };

    init();
    window.addEventListener("resize", init);
    animate();

    return () => {
      window.removeEventListener("resize", init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[700px] overflow-hidden bg-[#050505] border-y border-[#d4af37]/20 select-none">
      <canvas ref={canvasRef} className="block" />
      
      {/* Overlay UI */}
      <div className="absolute top-10 w-full text-center pointer-events-none">
         <div className="inline-block p-1 border border-[#d4af37]/30 rounded-full bg-black/50 backdrop-blur-sm">
            <div className="px-4 py-1 text-[10px] text-[#d4af37] tracking-[0.2em] uppercase font-cinzel">
                Drifting Memories
            </div>
         </div>
      </div>

      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          {children}
        </div>
      )}

      <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
        <div className="inline-flex items-center gap-2 text-[#d4af37]/50 text-xs tracking-[0.3em] uppercase">
            <Anchor size={14} />
            <span>Sea of Messages</span>
        </div>
      </div>
    </div>
  );
}
