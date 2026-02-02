"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
  height?: number;
  compact?: boolean;
}

export default function HexagonBanner({ children, height = 700, compact = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let canvasWidth = 0;
    let canvasHeight = 0;
    const canvasHeightProp = height;
    let animationFrameId: number;
    let tick = 0;

    // Configuration
    const HEX_SIZE = 35; // Denser grid for better visual
    const HEX_HEIGHT = HEX_SIZE * 2;
    const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
    const HOVER_RADIUS = 180;

    const mouse = { x: -1000, y: -1000 };
    const hexActivation: Map<string, number> = new Map(); // 잔상 효과용
    const FADE_SPEED = 0.03; // 잔상 감쇠 속도
    let mouseActivity = 0; // 마우스 활성도 (0~1)
    const ACTIVITY_DECAY = 0.015; // 약 66프레임(~1초)에 0으로 감쇠

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouseActivity = 1; // 움직이면 활성화
    };

    const drawHexagon = (x: number, y: number, size: number, color: string, fill: boolean = false) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6; // Rotate 30deg to have flat top
        const hx = x + size * Math.cos(angle);
        const hy = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.stroke();
      }
    };

    const render = () => {
      tick++;

      // 마우스 활성도 감쇠
      mouseActivity = Math.max(0, mouseActivity - ACTIVITY_DECAY);

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const rows = Math.ceil(canvasHeight / (HEX_HEIGHT * 0.75)) + 1;
      const cols = Math.ceil(canvasWidth / HEX_WIDTH) + 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const xOffset = (r % 2) * (HEX_WIDTH / 2);
          const x = c * HEX_WIDTH + xOffset - HEX_WIDTH / 2;
          const y = r * (HEX_HEIGHT * 0.75) - HEX_HEIGHT / 2;

          // Distance to mouse
          const dx = x - mouse.x;
          const dy = y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Interaction with fade trail (마우스 활성도 반영)
          const hexKey = `${r}-${c}`;
          const rawActive = Math.max(0, 1 - dist / HOVER_RADIUS);
          const instantActive = rawActive * rawActive * (3 - 2 * rawActive) * mouseActivity;

          // 잔상 처리: 현재 활성화가 높으면 즉시 반영, 아니면 서서히 감쇠
          const prevActive = hexActivation.get(hexKey) || 0;
          const newActive = instantActive > prevActive
            ? instantActive
            : Math.max(0, prevActive - FADE_SPEED);
          hexActivation.set(hexKey, newActive);
          const active = newActive;

          // Wave effect - slower
          const wave = Math.sin(x * 0.012 + y * 0.012 + tick * 0.015) * 0.5 + 0.5;
          const wave2 = Math.sin(x * 0.006 - y * 0.008 + tick * 0.01) * 0.5 + 0.5;

          // Color calculation
          // Base: Dark Stone
          // Active: Gold - stronger near, weaker far
          const alpha = 0.12 + active * 0.9 + wave * 0.1 + wave2 * 0.06;
          const isGold = active > 0.15 || wave > 0.75 || wave2 > 0.88;
          
          let color = `rgba(90, 90, 90, ${alpha})`;
          let size = HEX_SIZE - 2;

          if (isGold) {
             color = `rgba(212, 175, 55, ${alpha * 1.3})`;

             if (active > 0.6) {
                // Strong fill for very close hexes
               drawHexagon(x, y, size * 0.9, `rgba(212, 175, 55, ${active * 0.6})`, true);
             } else if (active > 0.3) {
                // Medium fill
               drawHexagon(x, y, size * 0.8, `rgba(212, 175, 55, ${active * 0.35})`, true);
             } else if (wave > 0.8) {
               // Subtle fill for wave peaks
               drawHexagon(x, y, size * 0.65, `rgba(212, 175, 55, ${wave * 0.12})`, true);
             }
          }

          ctx.lineWidth = 1 + active * 2.5;
          drawHexagon(x, y, size, color, false);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    const init = () => {
      canvasWidth = canvas.parentElement?.clientWidth || window.innerWidth;
      canvasHeight = canvas.parentElement?.clientHeight || canvasHeightProp;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
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
  }, [height, compact]);

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#050505] ${compact ? "h-[250px] sm:h-[300px] md:h-[350px]" : ""}`}
      style={compact ? undefined : { height }}
    >
      <canvas ref={canvasRef} className="block" />

      {/* Overlay Content */}
      {children && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
