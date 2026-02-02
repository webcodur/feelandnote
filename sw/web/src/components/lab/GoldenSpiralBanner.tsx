"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

export default function GoldenSpiralBanner({ children }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId: number;
    let frame = 0;

    // Golden Ratio & Angle
    const PHI = (1 + Math.sqrt(5)) / 2;
    const GOLDEN_ANGLE = (2 * Math.PI) * (1 - 1/PHI); // ~2.3999 rad (137.5 deg)

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;
    };

    const animate = () => {
        frame++;
        const time = frame * 0.002;
        
        // Background
        const gradBG = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width*0.8);
        gradBG.addColorStop(0, "#1a1a1a");
        gradBG.addColorStop(1, "#050505");
        ctx.fillStyle = gradBG;
        ctx.fillRect(0, 0, width, height);

        // Center glow
        const glow = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, 300);
        glow.addColorStop(0, "rgba(212, 175, 55, 0.15)");
        glow.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        ctx.translate(width/2, height/2);

        // Interactive parameters
        // Creating a breathing effect on spread
        const spreadBase = 12;
        const spreadVar = Math.sin(time * 0.5) * 2;
        const spread = spreadBase + spreadVar; 
        
        const count = 600;
        
        // Slowly rotate everything
        ctx.rotate(time * 0.2);

        for (let i = 0; i < count; i++) {
            // Vogel's Model
            // r = c * sqrt(n)
            // theta = n * golden_angle
            
            // Add slight drift to angle to make it dynamic
            const angleDrift = i * 0.00001 * Math.sin(time); 
            const angle = i * (GOLDEN_ANGLE + angleDrift);
            
            // Radius animation
            const r = spread * Math.sqrt(i);
            
            const x = r * Math.cos(angle);
            const y = r * Math.sin(angle);
            
            // Size based on distance from center (inverse perspective ish)
            // or just larger on outside?
            // Let's make inner ones smaller, outer ones larger but fading
            const size = Math.min(3, 0.5 + (r / 200));
            
            // Opacity
            const alpha = Math.max(0, 1 - (r / (Math.min(width, height) * 0.6)));
            
            ctx.fillStyle = `rgba(212, 175, 55, ${alpha})`;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            
            // Connecting spirals (visual trick)
            // Connect point i to i-something (fibonacci numbers: 1, 2, 3, 5, 8, 13, 21, 34...)
            // 21 and 34 create the visible spiral arms usually
            if (i > 34 && alpha > 0.1) {
                const neighborIndex = i - 34; // Try 21, 34, 55
                // Calculate neighbor pos
                const nAngle = neighborIndex * (GOLDEN_ANGLE + angleDrift);
                const nR = spread * Math.sqrt(neighborIndex);
                const nX = nR * Math.cos(nAngle);
                const nY = nR * Math.sin(nAngle);
                
                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(nX, nY);
                ctx.stroke();
            }
        }

        ctx.rotate(-time * 0.2);
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset

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
    <div className="relative w-full h-[700px] overflow-hidden bg-[#050505]">
      <canvas ref={canvasRef} className="block" />

      {/* Overlay Content */}
      {children && (
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
