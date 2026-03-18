"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { InfiniteCorridorBackgroundProps } from "./types";
import { project, quad, stoneHash } from "./drawUtils";
import {
  NUM_SEGMENTS, SEG_DEPTH, TOTAL_DEPTH, PILLAR_EVERY, FOV,
  CORRIDOR_ASPECT, FLOOR_BIAS, BG,
  WALL_COL, FLOOR_COL, CEIL_COL,
  PILLAR_PROTRUDE,
  BG_R, BG_G, BG_B,
} from "./constants";
import { drawStoneWall, drawArch } from "./sections/drawWall";
import { drawPillar3D } from "./sections/drawPillar";
import { drawTorch } from "./sections/drawTorch";
import { drawStoneFloor } from "./sections/drawFloor";
import { drawCeiling } from "./sections/drawCeiling";

export default function InfiniteCorridorBackground({
  className,
  speed = 1.0,
  corridorColor,
}: InfiniteCorridorBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  void corridorColor;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let W = 0, H = 0, vpX = 0, vpY = 0;
    let WALL_HALF_W = 600, FILL_HALF_W = 600, WALL_TOP = -400, WALL_BOT = 350;
    let fovEff = FOV; // 실효 FOV (와이드 보정)

    const resize = () => {
      W = canvas.parentElement?.clientWidth || window.innerWidth;
      H = canvas.parentElement?.clientHeight || window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      vpX = W / 2;
      vpY = H * 0.38;
      // 짧은 변 기준 → 어떤 종횡비에서도 회랑 깊이감 동일
      const ref = Math.min(W, H);
      fovEff = FOV;
      const nearScale = fovEff / (fovEff + SEG_DEPTH * 0.5);
      WALL_HALF_W = (ref / 2) * 1.35 / nearScale;
      // 화면 전체 채움용 (울트라와이드에서 벽 너머 영역)
      FILL_HALF_W = Math.max(WALL_HALF_W, (W / 2) * 1.4 / nearScale);
      const corridorH = WALL_HALF_W * 2 * CORRIDOR_ASPECT;
      WALL_TOP = -corridorH * (1 - FLOOR_BIAS);
      WALL_BOT = corridorH * FLOOR_BIAS;
    };

    window.addEventListener("resize", resize);
    resize();
    let cameraZ = 0;

    /**
     * Wing fills — 울트라와이드에서 회랑 벽 너머 빈 영역을 채운다.
     * 바닥·천장 확장 + 벽 매스(단면·외벽면)로 구성.
     */
    function drawWings(
      c: CanvasRenderingContext2D,
      z0: number, z1: number, alpha: number
    ) {
      if (FILL_HALF_W <= WALL_HALF_W * 1.02) return;
      const f = alpha;

      for (const side of [-1, 1]) {
        const innerX = side * WALL_HALF_W;
        const outerX = side * FILL_HALF_W;

        // 8개 꼭짓점 투영
        const fi0 = project(innerX, WALL_BOT, z0, vpX, vpY, fovEff);
        const fo0 = project(outerX, WALL_BOT, z0, vpX, vpY, fovEff);
        const fi1 = project(innerX, WALL_BOT, z1, vpX, vpY, fovEff);
        const fo1 = project(outerX, WALL_BOT, z1, vpX, vpY, fovEff);
        const ci0 = project(innerX, WALL_TOP, z0, vpX, vpY, fovEff);
        const co0 = project(outerX, WALL_TOP, z0, vpX, vpY, fovEff);
        const ci1 = project(innerX, WALL_TOP, z1, vpX, vpY, fovEff);
        const co1 = project(outerX, WALL_TOP, z1, vpX, vpY, fovEff);

        // 바닥 확장 — 어두운 석판
        const fr = Math.round(BG_R + (FLOOR_COL.dark[0] - 4 - BG_R) * f);
        const fg = Math.round(BG_G + (FLOOR_COL.dark[1] - 4 - BG_G) * f);
        const fb = Math.round(BG_B + (FLOOR_COL.dark[2] - 3 - BG_B) * f);
        quad(c, fi0.sx, fi0.sy, fo0.sx, fo0.sy, fo1.sx, fo1.sy, fi1.sx, fi1.sy,
          `rgb(${fr},${fg},${fb})`);

        // 천장 확장 — 깊은 어둠
        const cr = Math.round(BG_R + (CEIL_COL.deep[0] - BG_R) * f);
        const cg = Math.round(BG_G + (CEIL_COL.deep[1] - BG_G) * f);
        const cb = Math.round(BG_B + (CEIL_COL.deep[2] - BG_B) * f);
        quad(c, ci0.sx, ci0.sy, co0.sx, co0.sy, co1.sx, co1.sy, ci1.sx, ci1.sy,
          `rgb(${cr},${cg},${cb})`);

        // 벽 매스 — 단면(z0) + 외벽면(z0→z1)
        const wr = Math.round(BG_R + (WALL_COL.dark[0] - 8 - BG_R) * f);
        const wg = Math.round(BG_G + (WALL_COL.dark[1] - 8 - BG_G) * f);
        const wb = Math.round(BG_B + (WALL_COL.dark[2] - 7 - BG_B) * f);
        const wallMass = `rgb(${wr},${wg},${wb})`;
        // z0 단면 (천장~바닥 사이)
        quad(c, ci0.sx, ci0.sy, co0.sx, co0.sy, fo0.sx, fo0.sy, fi0.sx, fi0.sy, wallMass);
        // 외벽면 (z0→z1)
        quad(c, co0.sx, co0.sy, co1.sx, co1.sy, fo1.sx, fo1.sy, fo0.sx, fo0.sy, wallMass);
      }
    }

    /**
     * 먼지 입자 — 횃불 광원 주변에 떠다니는 미세 파티클.
     * 월드 좌표계에서 고정된 위치를 가지며, 카메라 이동에 따라 자연스럽게 흐른다.
     */
    const NUM_DUST = 25; // 줄임 (40→25)
    // 파티클별 고정 속성 — 벽 근처(횃불 근처)에 밀집
    const dustSeeds: { xOff: number; yOff: number; zOff: number; size: number; drift: number; bright: number }[] = [];
    for (let i = 0; i < NUM_DUST; i++) {
      // xOff: 70% 확률로 벽 근처(±0.6~1.0), 30% 확률로 중앙
      const xRand = stoneHash(i, 0, 99);
      const nearWall = xRand > 0.3;
      const xBase = nearWall
        ? (xRand > 0.65 ? 1 : -1) * (0.6 + stoneHash(i, 6, 99) * 0.4)
        : (stoneHash(i, 0, 99) - 0.5) * 1.2;
      dustSeeds.push({
        xOff: xBase,
        yOff: stoneHash(i, 1, 99) * 0.5 + 0.2, // 상단 치우침 (횃불 높이)
        zOff: stoneHash(i, 2, 99),
        size: 0.6 + stoneHash(i, 3, 99) * 1.2,
        drift: (stoneHash(i, 4, 99) - 0.5) * 2,
        bright: stoneHash(i, 5, 99),
      });
    }

    function drawDust(c: CanvasRenderingContext2D, time: number, camZ: number) {
      for (let i = 0; i < NUM_DUST; i++) {
        const s = dustSeeds[i];
        const worldZ = ((s.zOff * TOTAL_DEPTH + i * SEG_DEPTH * 0.37) - camZ) % TOTAL_DEPTH;
        const z = worldZ < 0 ? worldZ + TOTAL_DEPTH : worldZ;
        if (z > TOTAL_DEPTH * 0.3) continue; // 원경 더 빨리 제거 (0.5→0.3)

        const wx = s.xOff * WALL_HALF_W * 0.7
          + Math.sin(time * 0.3 + i * 1.7) * WALL_HALF_W * 0.04 * s.drift;
        const wy = WALL_TOP + (WALL_BOT - WALL_TOP) * s.yOff
          + Math.sin(time * 0.2 + i * 2.3) * (WALL_BOT - WALL_TOP) * 0.02;

        const p = project(wx, wy, z, vpX, vpY, fovEff);
        const depthRatio = z / TOTAL_DEPTH;
        // 더 가파른 감쇠: 원경에서 거의 안 보임
        const a = Math.pow(1 - depthRatio * 3.3, 3) * (0.10 + s.bright * 0.18);
        if (a < 0.01) continue;

        const sz = Math.max(0.4, s.size * p.scale * 1.2);

        const warmth = s.bright > 0.5 ? 1 : 0.6;
        const dr = Math.round(200 + 55 * warmth);
        const dg = Math.round(160 + 60 * warmth);
        const db = Math.round(80 + 40 * warmth);

        c.globalAlpha = a;
        c.fillStyle = `rgb(${dr},${dg},${db})`;
        c.beginPath();
        c.arc(p.sx, p.sy, sz, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }

    // ---- Main render ----
    const render = () => {
      const time = performance.now() * 0.001;
      cameraZ += speed * 2.5;

      // Clear
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // Segments sorted far→near
      const segs: { z: number; idx: number }[] = [];
      for (let i = 0; i < NUM_SEGMENTS; i++) {
        let z = (i * SEG_DEPTH - cameraZ) % TOTAL_DEPTH;
        if (z < 0) z += TOTAL_DEPTH;
        segs.push({ z, idx: i });
      }
      // 가장 먼 세그먼트를 카메라 앞에도 복제 — 근거리 빈 틈 방지
      segs.sort((a, b) => b.z - a.z);
      const farthest = segs[0];
      const nearest = segs[segs.length - 1];
      if (nearest.z > SEG_DEPTH * 0.05) {
        segs.push({ z: farthest.z - TOTAL_DEPTH, idx: farthest.idx });
        segs.sort((a, b) => b.z - a.z);
      }

      for (const seg of segs) {
        const z0 = seg.z;
        const z1 = z0 + SEG_DEPTH;
        // 세그먼트 전체가 카메라 뒤이거나 투영 불능이면 스킵
        if (z1 < 0 || z0 < -fovEff * 0.8) continue;
        const depthRatio = Math.max(0, z0 / TOTAL_DEPTH);

        // Alpha: simple power curve — bright near, fades to black at far end
        const alpha = Math.pow(1 - depthRatio, 1.6);
        if (alpha < 0.01) continue;

        const isClose = depthRatio < 0.55;

        // Project corners
        const tl0 = project(-WALL_HALF_W, WALL_TOP, z0, vpX, vpY, fovEff);
        const tr0 = project(WALL_HALF_W, WALL_TOP, z0, vpX, vpY, fovEff);
        const bl0 = project(-WALL_HALF_W, WALL_BOT, z0, vpX, vpY, fovEff);
        const br0 = project(WALL_HALF_W, WALL_BOT, z0, vpX, vpY, fovEff);
        const tl1 = project(-WALL_HALF_W, WALL_TOP, z1, vpX, vpY, fovEff);
        const tr1 = project(WALL_HALF_W, WALL_TOP, z1, vpX, vpY, fovEff);
        const bl1 = project(-WALL_HALF_W, WALL_BOT, z1, vpX, vpY, fovEff);
        const br1 = project(WALL_HALF_W, WALL_BOT, z1, vpX, vpY, fovEff);

        // 0. Wings — 벽 너머 확장 영역 (회랑 요소 뒤에 깔림)
        drawWings(ctx, z0, z1, alpha);

        // A. Ceiling — 볼트 천장
        drawCeiling(ctx, z0, z1, alpha, isClose, seg.idx,
          tl0, tr0, tl1, tr1);

        // B. Left wall — 석조 블록 패턴
        drawStoneWall(ctx, z0, z1, alpha, isClose, seg.idx, -1,
          WALL_HALF_W, WALL_TOP, WALL_BOT, vpX, vpY, fovEff);

        // C. Right wall
        drawStoneWall(ctx, z0, z1, alpha, isClose, seg.idx, 1,
          WALL_HALF_W, WALL_TOP, WALL_BOT, vpX, vpY, fovEff);

        // D. Floor — 석조 바닥 (러닝본드 석판 패턴)
        drawStoneFloor(ctx, z0, z1, alpha, isClose, seg.idx,
          WALL_HALF_W, WALL_BOT, vpX, vpY, fovEff);

        // E. Pillars + Arch + Torches — PILLAR_EVERY 세그먼트마다 일괄
        if (seg.idx % PILLAR_EVERY === 0 && alpha > 0.05) {
          // 3D 필라스터
          drawPillar3D(ctx, -WALL_HALF_W, +1, z0, alpha, isClose,
            WALL_HALF_W, WALL_TOP, WALL_BOT, vpX, vpY, fovEff);
          drawPillar3D(ctx, WALL_HALF_W, -1, z0, alpha, isClose,
            WALL_HALF_W, WALL_TOP, WALL_BOT, vpX, vpY, fovEff);

          // 아치
          const protrude = WALL_HALF_W * PILLAR_PROTRUDE;
          const innerL = -WALL_HALF_W + protrude;
          const innerR = WALL_HALF_W - protrude;
          const archL = project(innerL, WALL_TOP, z0, vpX, vpY, fovEff);
          const archR = project(innerR, WALL_TOP, z0, vpX, vpY, fovEff);
          const archPeakY = project(0, WALL_TOP * 1.3, z0, vpX, vpY, fovEff).sy;
          drawArch(ctx, archL.sx, archL.sy, archR.sx, archR.sy, archPeakY, alpha);

          // 횃불 — 벽면(z0)에 고정 부착
          if (isClose) {
            const torchY = WALL_TOP + (WALL_BOT - WALL_TOP) * 0.28;
            const torchAlpha = alpha;

            const lt = project(-WALL_HALF_W, torchY, z0, vpX, vpY, fovEff);
            const torchSize = WALL_HALF_W * 0.1 * lt.scale;
            drawTorch(ctx, lt.sx, lt.sy, torchSize, torchAlpha, time, seg.idx, 1);

            const rt = project(WALL_HALF_W, torchY, z0, vpX, vpY, fovEff);
            drawTorch(ctx, rt.sx, rt.sy, torchSize, torchAlpha, time, seg.idx + NUM_SEGMENTS, -1);
          }
        }
      }

      // H. Dust particles — 횃불 근처 떠다니는 먼지
      drawDust(ctx, time, cameraZ);

      // Fog — light vignette only at edges, NOT center
      const fogGrad = ctx.createRadialGradient(vpX, vpY, W * 0.25, vpX, vpY, W * 0.9);
      fogGrad.addColorStop(0, "rgba(10,10,12,0)");
      fogGrad.addColorStop(0.6, "rgba(10,10,12,0.15)");
      fogGrad.addColorStop(1, "rgba(10,10,12,0.6)");
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, W, H);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, [speed]);

  return (
    <div className={cn("absolute inset-0 w-full h-full bg-[#0a0a0c] overflow-hidden", className)}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,transparent_25%,rgba(10,10,12,0.5)_65%,#0a0a0c_100%)] pointer-events-none z-10" />
    </div>
  );
}
