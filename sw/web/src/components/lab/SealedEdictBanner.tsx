"use client";

import { useEffect, useRef } from "react";
import { Mail, Feather } from "lucide-react";

export default function SealedEdictBanner() {
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
    const LETTER_COUNT = 15;
    
    // Types
    type Letter = {
       x: number;
       y: number;
       z: number; // Depth 0.5 to 2
       rotation: number;
       rotationSpeed: number;
       vx: number;
       vy: number;
       width: number;
       height: number;
       color: string;
       sealColor: string;
    }
    
    let letters: Letter[] = [];

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;
      
      letters = [];
      for (let i = 0; i < LETTER_COUNT; i++) {
        const z = Math.random() * 1.5 + 0.5; // Scale
        letters.push({
            x: Math.random() * width,
            y: Math.random() * height,
            z: z,
            rotation: (Math.random() - 0.5) * 0.5,
            rotationSpeed: (Math.random() - 0.5) * 0.002,
            vx: (Math.random() - 0.5) * 0.2, // Drift
            vy: (Math.random() - 0.5) * 0.2 + 0.1, // Slight float up/down?
            width: 140,
            height: 90,
            color: "#e0e0e0", // Parchment
            sealColor: "#8b0000" // Dark Red Wax
        });
      }
    };
    
    const drawLetter = (l: Letter) => {
        const scale = l.z;
        const w = l.width * scale;
        const h = l.height * scale;
        
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(l.rotation);
        
        // Shadow
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10 * scale;
        ctx.shadowOffsetX = 5 * scale;
        ctx.shadowOffsetY = 5 * scale;
        
        // Envelope Body
        // Parchment Gradient
        const grad = ctx.createLinearGradient(-w/2, -h/2, w/2, h/2);
        grad.addColorStop(0, "#f0e6d2");
        grad.addColorStop(1, "#dcbfa6");
        ctx.fillStyle = grad;
        
        // Rounded Rect
        ctx.beginPath();
        ctx.roundRect(-w/2, -h/2, w, h, 4 * scale);
        ctx.fill();
        
        ctx.shadowColor = "transparent"; // Reset shadow for internal lines
        
        // Envelope Flap Lines
        ctx.strokeStyle = "rgba(100, 80, 60, 0.2)";
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        // Top flap triangle
        ctx.moveTo(-w/2, -h/2);
        ctx.lineTo(0, 0); // Center
        ctx.lineTo(w/2, -h/2);
        // Bottom seams
        ctx.moveTo(-w/2, h/2);
        ctx.lineTo(0, 0);
        ctx.lineTo(w/2, h/2);
        ctx.stroke();
        
        // Wax Seal
        const sealSize = 18 * scale;
        ctx.fillStyle = l.sealColor;
        ctx.beginPath();
        ctx.arc(0, 5 * scale, sealSize, 0, Math.PI * 2);
        
        // Make seal look imperfect
        for(let i=0; i<8; i++) {
           const ang = (i / 8) * Math.PI * 2;
           const rDist = sealSize + (Math.random() * 2 * scale);
           // Just simple circle for performance, maybe add inner shadow
        }
        ctx.fill();
        
        // Seal Inner Detail (Stamp)
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        ctx.arc(0, 5 * scale, sealSize * 0.7, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight on Seal
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.arc(-sealSize*0.3, 5 * scale - sealSize*0.3, sealSize*0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    };

    const animate = () => {
        // Deep space background
        const gradBG = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
        gradBG.addColorStop(0, "#1a1a1a");
        gradBG.addColorStop(1, "#050505");
        ctx.fillStyle = gradBG;
        ctx.fillRect(0, 0, width, height);
        
        // Floating Dust particles behind?
        
        // Sort letters by Z (draw far first)
        letters.sort((a, b) => a.z - b.z);
        
        letters.forEach(l => {
            l.x += l.vx;
            l.y += l.vy;
            l.rotation += l.rotationSpeed;
            
            // Boundary bounce/wrap
            if (l.x < -100) l.x = width + 100;
            if (l.x > width + 100) l.x = -100;
            if (l.y < -100) l.y = height + 100;
            if (l.y > height + 100) l.y = -100;
            
            // Mouse Interaction?
            // Simple parallax
            
            drawLetter(l);
        });
        
        // Overlay Text
        ctx.fillStyle = "rgba(212, 175, 55, 0.8)";
        ctx.font = "bold 60px 'Cinzel'";
        ctx.textAlign = "center";
        ctx.shadowColor = "rgba(212, 175, 55, 0.5)";
        ctx.shadowBlur = 20;
        ctx.fillText("UNSEALED FATE", width/2, height/2);
        ctx.shadowBlur = 0;
        
        ctx.font = "14px 'Roboto'";
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.letterSpacing = "4px";
        ctx.fillText("THE CHRONICLES AWAIT", width/2, height/2 + 40);
        
        // Fog/Cloud overlay?
        
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
      
      {/* Overlay UI */}
      <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
        <div className="inline-flex items-center gap-2 text-[#d4af37]/50 text-xs tracking-[0.3em] uppercase">
            <Mail size={14} />
            <span>Sealed Edicts</span>
        </div>
      </div>
    </div>
  );
}
