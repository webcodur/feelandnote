/*
  파일명: /components/lab/GoldenDawnBackground/GoldenDawnBackground.tsx
  기능: Canvas 기반 황금빛 여명 해변 배경 컴포넌트
  책임: 해변을 따라 여명을 향해 걸어가는 1인칭 시점의 시네마틱 전진 연출.
        소실점의 태양, 원근 투영 지면(바다+해안선+모래), god ray, 금빛 입자를 렌더링한다.
*/

"use client";

import React, { useEffect, useRef } from "react";
import type { BandPath, Star } from "./types";
import { GodRay, Sparkle, FoamParticle } from "./sections/particles";
import { BANDS, createShoreFunctions, drawGround } from "./sections/drawGround";
import { drawWaveRipples, drawHaze, drawVignette } from "./sections/drawEffects";

const HORIZON = 0.38;
const SCROLL_SPEED = 0.8;

const SKY_STOPS = [
  [0, "#070b1e"],
  [0.2, "#121035"],
  [0.4, "#2d1540"],
  [0.6, "#6b2a38"],
  [0.78, "#b8622a"],
  [0.92, "#d4962a"],
  [1, "#ffe066"],
] as const;

// --- Draw Sky ---
const drawSky = (ctx: CanvasRenderingContext2D, w: number, horizonY: number) => {
  const grad = ctx.createLinearGradient(0, 0, 0, horizonY + 30);
  for (const [stop, color] of SKY_STOPS) grad.addColorStop(stop, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, horizonY + 30);
};

// --- Draw Stars ---
const drawStars = (ctx: CanvasRenderingContext2D, time: number, stars: Star[]) => {
  const fade = 0.5 + Math.sin(time * 0.004) * 0.1;
  for (const st of stars) {
    const twinkle = Math.sin(time * 0.015 + st.x * 0.1) * 0.3 + 0.7;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.s, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,250,230,${st.b * twinkle * fade})`;
    ctx.fill();
  }
};

// --- Draw Sun ---
const drawSun = (ctx: CanvasRenderingContext2D, w: number, h: number, vpX: number, vpY: number) => {
  // 최외곽 대기 산란
  const scatterR = Math.max(w, h) * 0.85;
  const scatter = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, scatterR);
  scatter.addColorStop(0, "rgba(255,200,80,0.15)");
  scatter.addColorStop(0.1, "rgba(255,180,60,0.08)");
  scatter.addColorStop(0.25, "rgba(200,120,40,0.04)");
  scatter.addColorStop(0.5, "rgba(150,70,30,0.015)");
  scatter.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = scatter;
  ctx.fillRect(0, 0, w, h);

  // 중간 글로우
  const outerR = Math.max(w, h) * 0.5;
  const outer = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, outerR);
  outer.addColorStop(0, "rgba(255,220,100,0.35)");
  outer.addColorStop(0.12, "rgba(255,195,75,0.18)");
  outer.addColorStop(0.3, "rgba(255,160,50,0.06)");
  outer.addColorStop(0.6, "rgba(200,100,40,0.02)");
  outer.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = outer;
  ctx.fillRect(0, 0, w, h);

  // 코어
  const coreR = w * 0.10;
  const core = ctx.createRadialGradient(vpX, vpY + 2, 0, vpX, vpY + 2, coreR);
  core.addColorStop(0, "rgba(255,255,240,0.95)");
  core.addColorStop(0.15, "rgba(255,240,180,0.7)");
  core.addColorStop(0.4, "rgba(255,210,100,0.25)");
  core.addColorStop(0.7, "rgba(255,190,70,0.08)");
  core.addColorStop(1, "rgba(255,180,60,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, w, h);

  // 디스크
  ctx.beginPath();
  ctx.arc(vpX, vpY + 3, w * 0.022, Math.PI, 0);
  ctx.closePath();
  const disc = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, w * 0.022);
  disc.addColorStop(0, "rgba(255,255,250,1)");
  disc.addColorStop(0.5, "rgba(255,245,200,0.95)");
  disc.addColorStop(1, "rgba(255,220,120,0.6)");
  ctx.fillStyle = disc;
  ctx.fill();
};

export default function GoldenDawnBackground({
  fullScreen,
}: { fullScreen?: boolean } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let w = 0;
    let h = 0;
    let time = 0;

    // --- State ---
    let rays: GodRay[] = [];
    let sparkles: Sparkle[] = [];
    let foamParticles: FoamParticle[] = [];
    let scrollOffset = 0;
    let stars: Star[] = [];

    const getVP = () => ({ x: w * 0.42, y: h * HORIZON });

    const init = () => {
      w = canvas.parentElement?.clientWidth || canvas.offsetWidth;
      h = canvas.parentElement?.clientHeight || canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;

      rays = Array.from({ length: 10 }, () => new GodRay());
      sparkles = Array.from({ length: 100 }, () => new Sparkle());
      foamParticles = Array.from({ length: 80 }, () => new FoamParticle());

      // [5] 별: 상단 밀집, 수평선 근처 제거, 크기 분산
      stars = [];
      const hLim = h * HORIZON * 0.85;
      for (let i = 0; i < 80; i++) {
        const y = Math.pow(Math.random(), 1.8) * hLim; // 상단 편향 분포
        const heightRatio = 1 - y / hLim;
        if (heightRatio < 0.08) continue; // 수평선 근처 제거
        stars.push({
          x: Math.random() * w,
          y,
          s: 0.2 + Math.pow(Math.random(), 3) * 1.8, // 대부분 작고 가끔 큼
          b: (Math.random() * 0.25 + 0.03) * heightRatio,
        });
      }
    };

    // --- Main loop ---
    const animate = () => {
      if (!ctx) return;
      time++;
      scrollOffset += SCROLL_SPEED;
      const vp = getVP();

      // Shore functions depend on current time
      const { getShoreX, getBandX, buildBandPath } = createShoreFunctions(w, h, time, getVP);

      ctx.clearRect(0, 0, w, h);
      drawSky(ctx, w, vp.y);
      drawStars(ctx, time, stars);
      drawSun(ctx, w, h, vp.x, vp.y);

      ctx.globalCompositeOperation = "screen";
      for (const ray of rays) { ray.update(); ray.draw(ctx, w, h, vp.x, vp.y); }
      ctx.globalCompositeOperation = "source-over";

      const bandPaths: BandPath[] = BANDS.map((b) => ({
        ...b,
        pts: buildBandPath(b.offset, b.seed, 60, vp.y),
      }));

      drawGround(
        ctx, w, h, time, vp.x, vp.y, bandPaths, getBandX,
        (horizonY, shorePoints) => drawWaveRipples(ctx, w, h, time, scrollOffset, horizonY, shorePoints),
      );

      for (const fp of foamParticles) { fp.update(SCROLL_SPEED); fp.draw(ctx, w, h, vp.x, vp.y, getShoreX); }

      ctx.globalCompositeOperation = "screen";
      for (const sp of sparkles) { sp.update(SCROLL_SPEED); sp.draw(ctx, w, h, vp.x, vp.y, vp.y); }
      ctx.globalCompositeOperation = "source-over";

      drawHaze(ctx, w, h, vp.x, vp.y);
      drawVignette(ctx, w, h, vp.x, vp.y);

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => init();
    window.addEventListener("resize", handleResize);
    init();
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      className={
        fullScreen
          ? "relative w-full h-full overflow-hidden bg-[#070b1e]"
          : "relative w-full h-[600px] overflow-hidden rounded-xl border border-amber-900/30 shadow-2xl bg-[#070b1e]"
      }
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
