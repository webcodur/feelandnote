"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { type Particle, type Reed, makeSceneContext } from "./types";
import { drawSky, drawSun } from "./sky";
import { FAR_MOUNTAINS, BG_MOUNTAINS, MID_MOUNTAINS, drawMountains, drawMountainHaze } from "./mountains";
import { drawHazeFar, drawHazeMid } from "./haze";
import { drawWater, drawWaterMist } from "./water";
import { drawObjects } from "./objects";
import { generateReeds, drawReeds } from "./reeds";
import { generateParticles, drawParticles } from "./particles";

interface WindsOfLiangshanBackgroundProps {
  className?: string;
}

export default function WindsOfLiangshanBackground({
  className,
}: WindsOfLiangshanBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = 0;
    let H = 0;
    let time = 0;
    let prevTimestamp = 0;

    let particles: Particle[] = [];
    let reeds: Reed[] = [];

    const isMobile = (canvas.parentElement?.clientWidth || window.innerWidth) < 768;

    const init = () => {
      W = canvas.parentElement?.clientWidth || window.innerWidth;
      H = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = W;
      canvas.height = H;

      particles = generateParticles(W, H, isMobile);
      reeds = generateReeds(W, H, isMobile);
    };

    window.addEventListener("resize", init);
    init();

    const draw = (timestamp: number) => {
      if (!ctx || !canvas) return;
      if (prevTimestamp === 0) prevTimestamp = timestamp;
      const dt = Math.min((timestamp - prevTimestamp) / 1000, 0.1);
      prevTimestamp = timestamp;
      time += dt;

      const s = makeSceneContext(W, H, time);

      ctx.clearRect(0, 0, W, H);

      drawSky(ctx, s);                            // 0: 밝은 낮 하늘
      drawSun(ctx, s, time);                      // 1: 태양
      drawMountains(ctx, s, time, FAR_MOUNTAINS); // 1.5: 최후경 산맥
      drawMountains(ctx, s, time, BG_MOUNTAINS);  // 2: 원경 산맥
      drawMountainHaze(ctx, s, time);             // 2.5: 산 허리 안개
      drawMountains(ctx, s, time, MID_MOUNTAINS); // 3: 중경 산맥
      drawHazeFar(ctx, s, time);                  // 4: 원경 아지랑이
      drawWater(ctx, s, time);                    // 5: 밝은 수면
      drawHazeMid(ctx, s, time);                  // 6: 수면 아지랑이
      drawObjects(ctx, s, time);                  // 7: 정자, 배, 어부
      drawWaterMist(ctx, s, time);                // 8: 물안개
      drawReeds(ctx, time, reeds, s, isMobile);    // 9: 풍성한 갈대
      drawParticles(ctx, time, dt, particles, s); // 10: 먼지/꽃가루

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", init);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden bg-[#2f3f4a]",
        className,
      )}
    >
      <canvas ref={canvasRef} className="w-full h-full block touch-none" />
    </div>
  );
}
