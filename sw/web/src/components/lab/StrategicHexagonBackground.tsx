/*
  파일명: /components/lab/StrategicHexagonBackground.tsx
  기능: Canvas 기반 전략적 육각형 배경 컴포넌트
  책임: 육각형 그리드와 노이즈 알고리즘을 사용하여 '살아있는 전략 지도'를 렌더링한다.
*/

"use client";

import React, { useEffect, useRef } from "react";

export default function StrategicHexagonBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    const hexSize = 25; // Size of each hexagon
    const hexHeight = hexSize * 2;
    const hexWidth = Math.sqrt(3) * hexSize;
    const xSpacing = hexWidth;
    const ySpacing = hexHeight * 0.75;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    // Simple pseudo-noise function based on coordinates and time
    // Returns value between 0 and 1
    const noise = (x: number, y: number, t: number) => {
      return (Math.sin(x * 0.1 + t) + Math.sin(y * 0.1 + t * 0.5) + Math.sin((x + y) * 0.05 + t * 0.2) + 3) / 6;
    };

    const drawHexagon = (x: number, y: number, size: number, color: string, fill: boolean = false) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6; // Pointy top
        const xPos = x + size * Math.cos(angle);
        const yPos = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(xPos, yPos);
        else ctx.lineTo(xPos, yPos);
      }
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const draw = () => {
      if (!ctx || !canvas) return;

      // Dark Tech Background
      ctx.fillStyle = "#0f172a"; // Slate 900
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let hexIndexX = 0;
      let hexIndexY = 0;

      // Ensure we cover the whole canvas
      const rows = Math.ceil(canvas.height / ySpacing) + 2;
      const cols = Math.ceil(canvas.width / xSpacing) + 2;

      for (let r = -1; r < rows; r++) {
        for (let q = -1; q < cols; q++) {
          let x = q * xSpacing;
          let y = r * ySpacing;
          
          // Offset every other row
          if (r % 2 !== 0) {
            x += xSpacing / 2;
          }

          // Distance from mouse
          const dist = Math.sqrt((x - mouseRef.current.x) ** 2 + (y - mouseRef.current.y) ** 2);
          const maxDist = 200;
          const interaction = Math.max(0, (maxDist - dist) / maxDist); // 0 to 1 based on mouse proximity

          // Noise value for "breathing" effect
          const n = noise(q, r, time);
          
          // Logic for visual style
          // Base opacity fluctuates slightly
          // Interaction greatly increases opacity and changes color
          const isActive = n > 0.6; // Threshold for "active" territory
          
          let alpha = 0.05; // Base faint grid
          let color = "#1e293b"; // Slate 800
          
          if (isActive) {
             alpha = 0.1 + n * 0.1; // Active areas are brighter
             color = "#334155"; // Slate 700
          }
          
          // Mouse interaction overrides
          if (interaction > 0) {
              alpha += interaction * 0.5;
              color = `rgba(56, 189, 248, ${alpha})`; // Sky blue highlight
          } else {
              color = `rgba(148, 163, 184, ${alpha})`; // Slate 400
          }

          // Draw Stroke
          drawHexagon(x, y, hexSize - 1, color, false);

          // Optionally fill some hexagons
          if (isActive || interaction > 0.5) {
             const fillAlpha = interaction > 0 ? interaction * 0.2 : n * 0.05;
             drawHexagon(x, y, hexSize - 2, `rgba(56, 189, 248, ${fillAlpha})`, true);
          }
        }
      }

      time += 0.01; // Animation speed
      animationFrameId = requestAnimationFrame(draw);
    };

    const handleMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };
    
    const handleMouseLeave = () => {
        mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", resize);
    
    resize();
    draw();

    return () => {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-xl border border-[#334155]/50 shadow-2xl bg-[#0f172a]">
      {/* 텍스트 오버레이 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none select-none">
        <h2 className="text-4xl md:text-6xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#e2e8f0] to-[#64748b] opacity-90 tracking-widest drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
          STRATEGY
        </h2>
        <p className="mt-4 text-sm md:text-base text-[#94a3b8] tracking-[0.3em] uppercase opacity-70 drop-shadow-md">
          The Living Map
        </p>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
