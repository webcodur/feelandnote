"use client";

import { useEffect, useRef } from "react";
import { ScrollText } from "lucide-react";

export default function ParchmentScrollBanner({ children }: { children?: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paperCanvasRef = useRef<HTMLCanvasElement | null>(null);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let animationFrameId: number;
    let frame = 0;

    // State
    let progress = 0;
    let targetProgress = 1;
    let autoExpand = true;

    // Assets / Styles
    const PAPER_COLOR = "#f0e6d2";
    const PAPER_SHADOW = "#dcbfa6";
    const ROLL_COLOR = "#c0a080";
    const ROLL_DARK = "#8b5a2b";
    
    // Text Content
    const lines = [
        "In the beginning, there was void.",
        "From the void, came the spark of thought.",
        "Thoughts wove together into the tapestry of wisdom.",
        "And thus, the Chronicles were written.",
        "Preserving knowledge for eternity."
    ];



    const createPaperTexture = (w: number, h: number) => {
        const pCanvas = document.createElement("canvas");
        pCanvas.width = w;
        pCanvas.height = h;
        const pCtx = pCanvas.getContext("2d");
        if (!pCtx) return null;

        // Base
        pCtx.fillStyle = PAPER_COLOR;
        pCtx.fillRect(0, 0, w, h);

        // Noise / Grain
        pCtx.fillStyle = "rgba(160, 140, 110, 0.05)";
        for (let i = 0; i < w * h * 0.05; i++) {
            pCtx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
        }

        // Horizontal Fibers
        pCtx.strokeStyle = "rgba(160, 140, 110, 0.2)";
        pCtx.lineWidth = 1;
        pCtx.beginPath();
        for (let i = 0; i < h; i += 4) {
             if (Math.random() > 0.4) {
                 const xStart = Math.random() * w;
                 const len = Math.random() * 100 + 20;
                 pCtx.moveTo(xStart, i);
                 pCtx.lineTo(Math.min(xStart + len, w), i);
             }
        }
        pCtx.stroke();



        return pCanvas;
    };

    const init = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = 700;
      canvas.width = width;
      canvas.height = height;
      
      // Reset progress only if it's the very first init?
      // Actually, init is called on resize. We should NOT reset progress on resize.
      // progress is a local variable in useEffect. Resizing calls init(), not useEffect.
      // So removing `progress = 0` will prevent reset.
      
      // If we want it to start closed on mount, we can set progress=0 at declaration.
      // progress = 0; // Removed to prevent reset on resize
      
      // Create static texture (Max width assumption)
      const maxW = Math.min(width * 0.9, 1200);
      const maxH = 500; // ample height
      paperCanvasRef.current = createPaperTexture(maxW, maxH);
    };

    const drawPaperTexture = (x: number, y: number, w: number, h: number) => {
        if (!paperCanvasRef.current) return;
        
        ctx.save();
        // Draw the static image pattern
        // Source X/Y could be centered or just clamped
        const pCv = paperCanvasRef.current;
        
        // We want the texture to "unroll", so coordinate system should stay fixed relative to paper center?
        // Or fixed relative to left roll? 
        // If fixed relative to left roll, it looks like it's coming out.
        // Let's draw the full texture but clipped.
        
        // Actually, we can just drawImage.
        // Source: take center portion of texture to match W?
        // Or just stretch? No stretch.
        const sx = (pCv.width - w) / 2;
        const sy = (pCv.height - h) / 2;
        
        // Validating bounds
        const safeSx = Math.max(0, sx);
        const safeSy = Math.max(0, sy);
        const safeW = Math.min(w, pCv.width - safeSx);
        const safeH = Math.min(h, pCv.height - safeSy);
        
        if(safeW > 0 && safeH > 0) {
            ctx.drawImage(pCv, safeSx, safeSy, safeW, safeH, x, y, safeW, safeH);
        } else {
             ctx.fillStyle = PAPER_COLOR;
             ctx.fillRect(x, y, w, h);
        }

        // Add shading gradient on top (unchanged)
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "rgba(0,0,0,0.15)");
        grad.addColorStop(0.1, "rgba(0,0,0,0)");
        grad.addColorStop(0.9, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.15)");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);
        
        ctx.restore();
    };

    const drawShadows = (x: number, y: number, w: number, h: number) => {
        // Left Edge Shadow (near left roll)
        const leftGrad = ctx.createLinearGradient(x, y, x + 30, y);
        leftGrad.addColorStop(0, "rgba(0,0,0,0.4)");
        leftGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = leftGrad;
        ctx.fillRect(x, y, 30, h);

        // Right Edge Shadow (near right roll)
        const rightGrad = ctx.createLinearGradient(x + w, y, x + w - 30, y);
        rightGrad.addColorStop(0, "rgba(0,0,0,0.4)");
        rightGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rightGrad;
        ctx.fillRect(x + w - 30, y, 30, h);
    };

    const drawRoll = (x: number, y: number, h: number, r: number, side: 'left' | 'right', rotation: number) => {
        ctx.save();
        
        // --- 1. Main Cylinder (Paper Roll) ---
        const grad = ctx.createLinearGradient(x - r, y, x + r, y);
        if (side === 'left') {
            grad.addColorStop(0, ROLL_DARK); // Outer dark
            grad.addColorStop(0.5, ROLL_COLOR);
            grad.addColorStop(1, "#e0c0a0"); // Inner light
        } else {
            grad.addColorStop(0, "#e0c0a0"); // Inner light
            grad.addColorStop(0.5, ROLL_COLOR);
            grad.addColorStop(1, ROLL_DARK);
        }
        
        ctx.fillStyle = grad;
        ctx.fillRect(x - r, y, r * 2, h);
        
        // Spiral texture (Paper layers)
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i=0; i<h; i+=8) {
             let yPos = y+i;
             ctx.moveTo(x-r, yPos);
             ctx.bezierCurveTo(x, yPos+4, x, yPos+4, x+r, yPos);
        }
        ctx.stroke();

        // Metallic Rings at ends of paper roll
        const ringHeight = 6;
        const drawRing = (yPos: number) => {
             const ringGrad = ctx.createLinearGradient(x-r-2, yPos, x+r+2, yPos);
             ringGrad.addColorStop(0, "#8a6d3b");
             ringGrad.addColorStop(0.2, "#fecf6a");
             ringGrad.addColorStop(0.5, "#8a6d3b");
             ringGrad.addColorStop(0.8, "#fecf6a");
             ringGrad.addColorStop(1, "#8a6d3b");
             ctx.fillStyle = ringGrad;
             ctx.fillRect(x - r - 1, yPos, (r * 2) + 2, ringHeight);
             
             // Ring Shine
             ctx.fillStyle = "rgba(255,255,255,0.4)";
             ctx.fillRect(x - r + 4, yPos, 2, ringHeight);
        };
        drawRing(y);
        drawRing(y + h - ringHeight);

        // --- 2. Decorative Handles (Turned Wood & Gold) ---
        
        const drawHandle = (baseY: number, direction: -1 | 1) => {
            // direction: -1 for top, 1 for bottom
            const woodColor = "#5c4033";
            const woodDark = "#3e2b22";
            
            // Helper to draw a "turned" segment
            const drawSegment = (offsetY: number, hSeg: number, wSeg: number, color: string, darkColor: string) => {
                 const segY = baseY + (offsetY * direction);
                 // Determine top/bottom based on direction for gradient logic
                 // Let's just use horizontal gradient for roundness
                 const g = ctx.createLinearGradient(x - wSeg, segY, x + wSeg, segY);
                 g.addColorStop(0, darkColor);
                 g.addColorStop(0.5, color);
                 g.addColorStop(1, darkColor);
                 
                 ctx.fillStyle = g;
                 // Draw Trapezoid or Rect? Rect for simplicity, or path for curve
                 // Let's do rects stack for "turned" look
                 if (direction === -1) {
                    ctx.fillRect(x - wSeg, segY - hSeg, wSeg * 2, hSeg);
                 } else {
                    ctx.fillRect(x - wSeg, segY, wSeg * 2, hSeg);
                 }
                 
                 // Add wood grain
                 ctx.strokeStyle = "rgba(0,0,0,0.3)";
                 ctx.beginPath();
                 ctx.moveTo(x, segY - (direction === -1 ? hSeg : 0));
                 ctx.lineTo(x, segY + (direction === 1 ? hSeg : 0));
                 ctx.stroke();
            };

            // Stem (Connection)
            drawSegment(0, 10, r * 0.4, woodColor, woodDark);
            // Bulbous Part
            drawSegment(10, 15, r * 0.6, woodColor, woodDark);
            // Narrow Neck
            drawSegment(25, 5, r * 0.3, woodColor, woodDark);
             // End Cap Base
            drawSegment(30, 8, r * 0.5, woodColor, woodDark);

            // --- 3. Gold Finial (Tip) ---
            const tipY = baseY + (38 * direction); // 30+8
            const tipRadius = r * 0.5;
            
            // Gold Sphere
            const goldGrad = ctx.createRadialGradient(x - tipRadius*0.3, tipY - tipRadius*0.3, 0, x, tipY, tipRadius);
            goldGrad.addColorStop(0, "#fff5d9"); // Highlight
            goldGrad.addColorStop(0.3, "#d4af37"); // Gold
            goldGrad.addColorStop(1, "#8a6d3b"); // Shadow
            
            ctx.fillStyle = goldGrad;
            ctx.beginPath();
            ctx.arc(x, tipY, tipRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Removed Ruby/Gemstone as requested
        };

        drawHandle(y, -1); // Top
        drawHandle(y + h, 1); // Bottom

        ctx.restore();
    };

    const animate = () => {
        frame++;
        
        // Background
        const gradBG = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
        gradBG.addColorStop(0, "#1a1a1a");
        gradBG.addColorStop(1, "#050505");
        ctx.fillStyle = gradBG;
        ctx.fillRect(0, 0, width, height);

        // Animation Logic
        if (autoExpand) {
             targetProgress = 1.0; 
             progress += (targetProgress - progress) * 0.02;
        }

        const maxPaperWidth = Math.min(width * 0.8, 1000);
        const currentPaperWidth = maxPaperWidth * progress;
        const paperHeight = 400;
        const rollRadius = 25;
        
        const centerX = width / 2;
        const centerY = (height - paperHeight) / 2;
        
        const leftX = centerX - currentPaperWidth / 2;
        const rightX = centerX + currentPaperWidth / 2;

        // Draw Shadows on floor/bg behind paper
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.filter = "blur(20px)";
        ctx.fillRect(leftX, centerY + 20, currentPaperWidth, paperHeight);
        ctx.filter = "none";

        // Draw Paper
        // Clip to allow unraveling effect
        ctx.save();
        ctx.beginPath();
        ctx.rect(leftX, centerY, currentPaperWidth, paperHeight);
        ctx.clip();
        
        drawPaperTexture(leftX - 10, centerY, currentPaperWidth + 20, paperHeight); // Slightly wider to cover edges
        
        // Paper Shadows near rolls (Inside Clip)
        drawShadows(leftX, centerY, currentPaperWidth, paperHeight);

        // Draw Text
        ctx.textAlign = "center";
        
        ctx.fillStyle = "rgba(0,0,0,0.7)"; // Ink color
        ctx.font = "italic 24px 'Cinzel'"; 
        lines.forEach((line, i) => {
            const y = centerY + 100 + i * 50;
            ctx.fillText(line, centerX, y);
        });

        // Decorative Compass/Map items on paper?
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY + paperHeight/2, 120, 0, Math.PI*2);
        ctx.stroke();

        ctx.restore();

        // Draw Rolls
        drawRoll(leftX, centerY, paperHeight, rollRadius, 'left', 0);
        drawRoll(rightX, centerY, paperHeight, rollRadius, 'right', 0);

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
    <div className="relative w-full h-[700px] overflow-hidden bg-[#050505] border-y border-[#d4af37]/20">
      <canvas ref={canvasRef} className="block" />
      
      {/* Overlay UI - Positioned absolute center if needed, or specific spots */}
      <div className="absolute top-10 w-full text-center pointer-events-none">
         <div className="inline-block p-1 border border-[#d4af37]/30 rounded-full bg-black/50 backdrop-blur-sm">
            <div className="px-4 py-1 text-[10px] text-[#d4af37] tracking-[0.2em] uppercase font-cinzel">
                Ancient Chronicles
            </div>
         </div>
      </div>
      
      {/* If we want the main title to be DOM and visually "above" the paper, pass it as children
          But typically the paper IS the background for the title. 
          The user passed children in standard demo overlay.
          Let's render children centered.
      */}
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 mix-blend-multiply opacity-80">
             {/* Use mix-blend to make it look like ink on paper? 
                 But the text is white in the demoOverlay... 
                 The paper is light. White text won't show well.
                 We might need to override the children style or just let it sit on top with shadow.
                 Actually, let's NOT render standard overlay inside the canvas area if it conflicts.
                 The standard overlay is White text. Paper is #f0e6d2 (Light Beige).
                 White text on Beige is bad contrast.
                 
                 Solution:
                 1. Dark Paper mode? -> "Dark Scroll"
                 2. Or render the text in Black/Gold inside Canvas logic (already doing "In the beginning...")
                 3. Or modifying the children to have dark text?
                 
                 Let's keep the Canvas text as the main visual for "Parchment Scroll" concept.
                 And maybe just render the "Scripture of Wisdom" smaller or in gold/black at the bottom.
                 
                 Actually, the prompt implies "Parchment Scroll - 양피지가 펼쳐지며 내용이 드러나는 효과".
                 The "Content" being revealed is likely the main attraction.
                 I will suppress the `children` or render them in a dark bubble if passed.
                 
                 Let's stick to the Canvas text being the "Content".
                 And maybe place the `children` (Title) at the top or bottom, 
                 OR invert its color via CSS filter.
              */}
              <div className="invert filter drop-shadow-md"> 
                {/* Inverting White text -> Black text. Good for paper. */}
                {children}
              </div>
        </div>
      )}

      <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
        <div className="inline-flex items-center gap-2 text-[#d4af37]/50 text-xs tracking-[0.3em] uppercase">
            <ScrollText size={14} />
            <span>Unrolling History</span>
        </div>
      </div>
    </div>
  );
}
