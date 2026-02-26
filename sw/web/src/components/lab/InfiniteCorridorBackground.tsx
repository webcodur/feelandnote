"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface InfiniteCorridorBackgroundProps {
  className?: string;
  speed?: number;
  corridorColor?: string;
}

// --- Perspective projection ---
function project(
  worldX: number, worldY: number, worldZ: number,
  vpX: number, vpY: number, fov: number
) {
  const scale = fov / (fov + worldZ);
  return { sx: vpX + worldX * scale, sy: vpY + worldY * scale, scale };
}

// --- Constants ---
const NUM_SEGMENTS = 10;
const SEG_DEPTH = 700;
const TOTAL_DEPTH = NUM_SEGMENTS * SEG_DEPTH;
const PILLAR_EVERY = 2; // 기둥은 2세그먼트마다 1회
const FOV = 480;

const CORRIDOR_ASPECT = 0.85;
const FLOOR_BIAS = 0.6;

// --- Material palette ---
// 밝기: 기둥 > 벽 > 바닥 > 천장
const BG = "#0a0a0c";

// 기둥: 다듬어진 석재 — 가장 밝고 약간 따뜻한 회색
const PILLAR_COL = {
  dark:      [50, 46, 42],
  mid:       [78, 73, 67],
  light:     [105, 99, 91],
  highlight: [125, 118, 108],
} as const;

// 벽: 거친 석조 — 어둡고 무거운 톤
const WALL_COL = {
  dark:      [24, 23, 22],
  mid:       [38, 36, 34],
  light:     [52, 49, 46],
  mortar:    [14, 13, 12],
} as const;

// 바닥: 습기 있는 석판 — 벽보다 어둡고 약간 차가운 톤
const FLOOR_COL = {
  base:      [42, 41, 40],
  dark:      [26, 25, 25],
  mortar:    [16, 15, 15],
} as const;

// 천장: 빛이 닿지 않는 볼트 — 가장 어두운
const CEIL_COL = {
  base:      [14, 13, 13],
  deep:      [8, 8, 8],
} as const;

// 아치: 기둥과 천장 사이 중간
const ARCH_COL = {
  mid:       [80, 74, 66],
} as const;

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

    // --- Helpers ---
    const rgb = (c: readonly number[], a: number) =>
      `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    function quad(
      c: CanvasRenderingContext2D,
      x0: number, y0: number, x1: number, y1: number,
      x2: number, y2: number, x3: number, y3: number,
      fill: string | CanvasGradient
    ) {
      c.beginPath();
      c.moveTo(x0, y0); c.lineTo(x1, y1);
      c.lineTo(x2, y2); c.lineTo(x3, y3);
      c.closePath();
      c.fillStyle = fill;
      c.fill();
    }

    /**
     * 거친 석조 벽면 — 어두운 베이스 + 불규칙 돌 얼룩 + 수평 줄눈
     * side: -1 = left wall, +1 = right wall
     */
    function drawStoneWall(
      c: CanvasRenderingContext2D,
      z0: number, z1: number,
      alpha: number, isClose: boolean, segIdx: number,
      side: number
    ) {
      const wallX = side * WALL_HALF_W;
      const f = alpha;

      // 1. 어두운 베이스 채움 — 상단 약간 밝고 하단 어둡게
      const t0 = project(wallX, WALL_TOP, z0, vpX, vpY, fovEff);
      const b0 = project(wallX, WALL_BOT, z0, vpX, vpY, fovEff);
      const t1 = project(wallX, WALL_TOP, z1, vpX, vpY, fovEff);
      const b1 = project(wallX, WALL_BOT, z1, vpX, vpY, fovEff);

      const topR = Math.round(BG_R + (WALL_COL.dark[0] + 4 - BG_R) * f);
      const topG = Math.round(BG_G + (WALL_COL.dark[1] + 4 - BG_G) * f);
      const topB = Math.round(BG_B + (WALL_COL.dark[2] + 3 - BG_B) * f);
      const botR = Math.round(BG_R + (WALL_COL.dark[0] - 6 - BG_R) * f);
      const botG = Math.round(BG_G + (WALL_COL.dark[1] - 6 - BG_G) * f);
      const botB = Math.round(BG_B + (WALL_COL.dark[2] - 5 - BG_B) * f);

      const baseGrad = c.createLinearGradient(
        (t0.sx + t1.sx) * 0.5, t0.sy,
        (b0.sx + b1.sx) * 0.5, b0.sy
      );
      baseGrad.addColorStop(0, `rgb(${topR},${topG},${topB})`);
      baseGrad.addColorStop(1, `rgb(${botR},${botG},${botB})`);
      quad(c, t0.sx, t0.sy, t1.sx, t1.sy, b1.sx, b1.sy, b0.sx, b0.sy, baseGrad);

      if (!isClose) return;

      // 2. 돌 얼룩 패치 — 불규칙 위치에 밝거나 어두운 반점
      const PATCHES = 8;
      for (let i = 0; i < PATCHES; i++) {
        const h1 = stoneHash(segIdx * 100 + side * 50, i, 0);
        const h2 = stoneHash(segIdx * 100 + side * 50, i, 1);
        const h3 = stoneHash(segIdx * 100 + side * 50, i, 2);
        const h4 = stoneHash(segIdx * 100 + side * 50, i, 3);

        // 패치 위치 (0~1 범위 → 벽면 내 좌표)
        const pY = WALL_TOP + (WALL_BOT - WALL_TOP) * (h1 * 0.8 + 0.1);
        const pZ = z0 + (z1 - z0) * (h2 * 0.8 + 0.1);
        const pp = project(wallX, pY, pZ, vpX, vpY, fovEff);

        // 패치 크기 (원근 반영)
        const patchSize = Math.max(2, (WALL_BOT - WALL_TOP) * 0.12 * pp.scale);
        if (patchSize < 1.5) continue;

        // 밝은 패치 or 어두운 패치
        const bright = h3 > 0.5;
        const intensity = h4 * 0.08 + 0.02; // 0.02~0.10

        if (bright) {
          const pr = Math.round(WALL_COL.light[0] * f + BG_R * (1 - f));
          const pg = Math.round(WALL_COL.light[1] * f + BG_G * (1 - f));
          const pb = Math.round(WALL_COL.light[2] * f + BG_B * (1 - f));
          c.globalAlpha = intensity;
          c.fillStyle = `rgb(${pr},${pg},${pb})`;
        } else {
          c.globalAlpha = intensity * 1.5;
          c.fillStyle = `rgb(${BG_R},${BG_G},${BG_B})`;
        }
        c.beginPath();
        c.ellipse(pp.sx, pp.sy, patchSize * (0.6 + h3 * 0.8), patchSize * (0.4 + h4 * 0.6), h1 * Math.PI, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;

      // 3. 수평 줄눈 — 불규칙 간격, 2~3줄
      const MORTAR_LINES = 3;
      const mR = Math.round(BG_R + (WALL_COL.mortar[0] - BG_R) * f);
      const mG = Math.round(BG_G + (WALL_COL.mortar[1] - BG_G) * f);
      const mB = Math.round(BG_B + (WALL_COL.mortar[2] - BG_B) * f);
      c.strokeStyle = `rgb(${mR},${mG},${mB})`;
      c.lineWidth = Math.max(0.5, 1.0 * (1 - Math.max(0, z0 / TOTAL_DEPTH)));

      for (let i = 0; i < MORTAR_LINES; i++) {
        // 불규칙 수직 위치 (해시 기반)
        const hPos = stoneHash(segIdx + side * 30, i + 10, 5);
        const yT = 0.15 + hPos * 0.7 / MORTAR_LINES + i * (0.7 / MORTAR_LINES);
        const y = WALL_TOP + (WALL_BOT - WALL_TOP) * Math.min(yT, 0.92);
        const pN = project(wallX, y, z0, vpX, vpY, fovEff);
        const pF = project(wallX, y, z1, vpX, vpY, fovEff);
        c.beginPath(); c.moveTo(pN.sx, pN.sy); c.lineTo(pF.sx, pF.sy); c.stroke();
      }
    }

    function drawArch(
      c: CanvasRenderingContext2D,
      lx: number, ly: number, rx: number, ry: number,
      peakY: number, alpha: number
    ) {
      const midX = (lx + rx) / 2;
      const archH = ly - peakY; // 아치 높이 (양수)
      const thickness = archH * 0.18; // 아치 두께

      // 외곽 (위쪽 경계)
      c.beginPath();
      c.moveTo(lx, ly);
      c.quadraticCurveTo(lx + (midX - lx) * 0.12, peakY, midX, peakY - archH * 0.08);
      c.quadraticCurveTo(rx - (rx - midX) * 0.12, peakY, rx, ry);
      // 내곽 (아래쪽 경계) — 두께만큼 안쪽
      c.lineTo(rx, ry + thickness);
      c.quadraticCurveTo(rx - (rx - midX) * 0.12, peakY + thickness, midX, peakY - archH * 0.08 + thickness);
      c.quadraticCurveTo(lx + (midX - lx) * 0.12, peakY + thickness, lx, ly + thickness);
      c.closePath();
      c.fillStyle = rgb(ARCH_COL.mid, alpha);
      c.fill();

      // 아치 하단 엣지 라인 (밝은 하이라이트)
      c.beginPath();
      c.moveTo(lx, ly + thickness);
      c.quadraticCurveTo(lx + (midX - lx) * 0.12, peakY + thickness, midX, peakY - archH * 0.08 + thickness);
      c.quadraticCurveTo(rx - (rx - midX) * 0.12, peakY + thickness, rx, ry + thickness);
      c.strokeStyle = rgb(PILLAR_COL.highlight, alpha * 0.4);
      c.lineWidth = Math.max(0.5, 1.5);
      c.stroke();
    }

    /**
     * 필라스터 — 벽면에서 회랑 안쪽으로 돌출된 3D 직사각 기둥.
     * 두 면을 그린다:
     *   - side face (z=z0 면): 벽→안쪽 돌출부의 두께가 보이는 면
     *   - front face (안쪽 면): Z축 방향으로 뻗는 기둥 정면
     */
    const PILLAR_PROTRUDE = 0.14; // 벽 폭 대비 돌출 비율
    const PILLAR_Z_THICK = 0.35;  // SEG_DEPTH 대비 Z 두께 (큰 값 = 두꺼운 기둥)

    function drawPillar3D(
      c: CanvasRenderingContext2D,
      wallX: number,    // 벽 X좌표 (±WALL_HALF_W)
      sign: number,     // +1: 좌벽(안쪽→오른쪽), -1: 우벽(안쪽→왼쪽)
      z: number,        // 기둥 앞면 Z
      alpha: number,
      isClose: boolean
    ) {
      const protrude = WALL_HALF_W * PILLAR_PROTRUDE;
      const zThick = SEG_DEPTH * PILLAR_Z_THICK;
      const innerX = wallX + sign * protrude;
      const zBack = z + zThick;

      // 기단/주두 비율
      const baseRatio = 0.06;
      const capRatio = 0.06;
      const baseProtrude = protrude * 1.1;
      const capProtrude = protrude * 1.08;
      // 기단/주두 Z방향 확장 (주신보다 앞뒤로 돌출)
      const zPad = zThick * 0.06;
      const zBaseFront = z - zPad;
      const zBaseBack = zBack + zPad;
      const zCapFront = z - zPad;
      const zCapBack = zBack + zPad;

      const yBase = WALL_BOT - (WALL_BOT - WALL_TOP) * baseRatio;
      const yCap = WALL_TOP + (WALL_BOT - WALL_TOP) * capRatio;
      const innerXBase = wallX + sign * baseProtrude;
      const innerXCap = wallX + sign * capProtrude;

      c.globalAlpha = 1;

      const zMid = z + zThick * 0.5;

      // 거리 기반 대비 감쇠 — 후방 기둥은 BG쪽으로 수렴
      const depthT = Math.max(0, z / TOTAL_DEPTH);
      const contrast = Math.pow(1 - depthT, 0.6); // 1=가까움(풀 대비), 0=먼곳(BG)
      // 거리 보정 색상 헬퍼: 원색→BG로 lerp
      const pCol = (col: readonly number[]) => {
        const r = Math.round(BG_R + (col[0] - BG_R) * contrast);
        const g = Math.round(BG_G + (col[1] - BG_G) * contrast);
        const b = Math.round(BG_B + (col[2] - BG_B) * contrast);
        return `rgb(${r},${g},${b})`;
      };
      // 차가운 side face 색상 (blue shift)
      const pColCool = (col: readonly number[]) => {
        const r = Math.round(BG_R + (col[0] * 0.85 - BG_R) * contrast);
        const g = Math.round(BG_G + (col[1] * 0.9 - BG_G) * contrast);
        const b = Math.round(BG_B + (Math.min(255, col[2] * 1.1) - BG_B) * contrast);
        return `rgb(${r},${g},${b})`;
      };
      // 따뜻한 front highlight (warm shift)
      const pColWarm = (col: readonly number[]) => {
        const r = Math.round(BG_R + (Math.min(255, col[0] * 1.1) - BG_R) * contrast);
        const g = Math.round(BG_G + (col[1] * 1.0 - BG_G) * contrast);
        const b = Math.round(BG_B + (col[2] * 0.85 - BG_B) * contrast);
        return `rgb(${r},${g},${b})`;
      };

      // ===== FRONT FACE (주 면, 회랑 중앙을 향함) =====

      // 기단 front (Z방향 확장)
      const bfNt = project(innerXBase, yBase, zBaseFront, vpX, vpY, fovEff);
      const bfNb = project(innerXBase, WALL_BOT, zBaseFront, vpX, vpY, fovEff);
      const bfFt = project(innerXBase, yBase, zBaseBack, vpX, vpY, fovEff);
      const bfFb = project(innerXBase, WALL_BOT, zBaseBack, vpX, vpY, fovEff);
      quad(c, bfNt.sx, bfNt.sy, bfFt.sx, bfFt.sy, bfFb.sx, bfFb.sy, bfNb.sx, bfNb.sy,
        pCol(PILLAR_COL.mid));

      // 주신 front — Z방향 수평 그라데이션 (중앙 따뜻하게, 양끝 어둡게)
      const sfNt = project(innerX, yCap, z, vpX, vpY, fovEff);
      const sfNb = project(innerX, yBase, z, vpX, vpY, fovEff);
      const sfFt = project(innerX, yCap, zBack, vpX, vpY, fovEff);
      const sfFb = project(innerX, yBase, zBack, vpX, vpY, fovEff);
      const shaftGrad = c.createLinearGradient(sfNt.sx, sfNt.sy, sfFt.sx, sfFt.sy);
      shaftGrad.addColorStop(0, pCol(PILLAR_COL.mid));
      shaftGrad.addColorStop(0.35, pColWarm(PILLAR_COL.highlight));
      shaftGrad.addColorStop(0.55, pCol(PILLAR_COL.light));
      shaftGrad.addColorStop(1, pCol(PILLAR_COL.dark));
      quad(c, sfNt.sx, sfNt.sy, sfFt.sx, sfFt.sy, sfFb.sx, sfFb.sy, sfNb.sx, sfNb.sy,
        shaftGrad);

      // 주두 front (Z방향 확장)
      const cfNt = project(innerXCap, WALL_TOP, zCapFront, vpX, vpY, fovEff);
      const cfNb = project(innerXCap, yCap, zCapFront, vpX, vpY, fovEff);
      const cfFt = project(innerXCap, WALL_TOP, zCapBack, vpX, vpY, fovEff);
      const cfFb = project(innerXCap, yCap, zCapBack, vpX, vpY, fovEff);
      const capGrad = c.createLinearGradient(cfNt.sx, cfNt.sy, cfFt.sx, cfFt.sy);
      capGrad.addColorStop(0, pCol(PILLAR_COL.light));
      capGrad.addColorStop(0.4, pColWarm(PILLAR_COL.highlight));
      capGrad.addColorStop(1, pCol(PILLAR_COL.mid));
      quad(c, cfNt.sx, cfNt.sy, cfFt.sx, cfFt.sy, cfFb.sx, cfFb.sy, cfNb.sx, cfNb.sy,
        capGrad);

      // === 플루팅 (세로 홈) — 가까운 세그먼트만 ===
      if (isClose) {
        const FLUTES = 3;
        for (let fi = 1; fi <= FLUTES; fi++) {
          const t = fi / (FLUTES + 1);
          const fz = z + zThick * t;
          const ft = project(innerX, yCap, fz, vpX, vpY, fovEff);
          const fb = project(innerX, yBase, fz, vpX, vpY, fovEff);
          // 홈 그림자 (어두운 선)
          c.strokeStyle = rgb(PILLAR_COL.dark, 0.35);
          c.lineWidth = Math.max(0.5, 1.2 * ft.scale);
          c.beginPath(); c.moveTo(ft.sx, ft.sy); c.lineTo(fb.sx, fb.sy); c.stroke();
          // 홈 옆 하이라이트 (밝은 선, 1px 오프셋)
          const hlOff = Math.max(0.5, 0.8 * ft.scale);
          c.strokeStyle = rgb(PILLAR_COL.highlight, 0.15);
          c.lineWidth = Math.max(0.3, 0.6 * ft.scale);
          c.beginPath(); c.moveTo(ft.sx + hlOff, ft.sy); c.lineTo(fb.sx + hlOff, fb.sy); c.stroke();
        }
      }

      // === 몰딩 라인 (주두↔주신, 주신↔기단 경계) ===
      if (isClose) {
        c.lineWidth = Math.max(0.5, 1.5 * sfNt.scale);
        // 주두 하단 — 밝은 선 (받침 역할)
        const capLineN = project(innerXCap, yCap, zCapFront, vpX, vpY, fovEff);
        const capLineF = project(innerXCap, yCap, zCapBack, vpX, vpY, fovEff);
        c.strokeStyle = rgb(PILLAR_COL.highlight, 0.5);
        c.beginPath(); c.moveTo(capLineN.sx, capLineN.sy); c.lineTo(capLineF.sx, capLineF.sy); c.stroke();
        // 주두 하단 그림자 (1px 아래)
        c.strokeStyle = rgb(PILLAR_COL.dark, 0.4);
        c.beginPath(); c.moveTo(capLineN.sx, capLineN.sy + 1.5); c.lineTo(capLineF.sx, capLineF.sy + 1); c.stroke();

        // 기단 상단 — 밝은 선
        const baseLineN = project(innerXBase, yBase, zBaseFront, vpX, vpY, fovEff);
        const baseLineF = project(innerXBase, yBase, zBaseBack, vpX, vpY, fovEff);
        c.strokeStyle = rgb(PILLAR_COL.highlight, 0.4);
        c.beginPath(); c.moveTo(baseLineN.sx, baseLineN.sy); c.lineTo(baseLineF.sx, baseLineF.sy); c.stroke();
        // 기단 상단 그림자
        c.strokeStyle = rgb(PILLAR_COL.dark, 0.3);
        c.beginPath(); c.moveTo(baseLineN.sx, baseLineN.sy - 1.5); c.lineTo(baseLineF.sx, baseLineF.sy - 1); c.stroke();
      }

      // ===== SIDE FACE (z = z 앞면, 보조 그림자) =====

      // 기단 side (확장된 Z)
      const bsWt = project(wallX, yBase, zBaseFront, vpX, vpY, fovEff);
      const bsWb = project(wallX, WALL_BOT, zBaseFront, vpX, vpY, fovEff);
      const bsIt = project(innerXBase, yBase, zBaseFront, vpX, vpY, fovEff);
      const bsIb = project(innerXBase, WALL_BOT, zBaseFront, vpX, vpY, fovEff);
      quad(c, bsWt.sx, bsWt.sy, bsIt.sx, bsIt.sy, bsIb.sx, bsIb.sy, bsWb.sx, bsWb.sy,
        pColCool(PILLAR_COL.dark));

      // 주신 side — 차가운 톤
      const ssWt = project(wallX, yCap, z, vpX, vpY, fovEff);
      const ssWb = project(wallX, yBase, z, vpX, vpY, fovEff);
      const ssIt = project(innerX, yCap, z, vpX, vpY, fovEff);
      const ssIb = project(innerX, yBase, z, vpX, vpY, fovEff);
      quad(c, ssWt.sx, ssWt.sy, ssIt.sx, ssIt.sy, ssIb.sx, ssIb.sy, ssWb.sx, ssWb.sy,
        pColCool(PILLAR_COL.dark));

      // 주두 side — 차가운 톤 (확장된 Z)
      const csWt = project(wallX, WALL_TOP, zCapFront, vpX, vpY, fovEff);
      const csWb = project(wallX, yCap, zCapFront, vpX, vpY, fovEff);
      const csIt = project(innerXCap, WALL_TOP, zCapFront, vpX, vpY, fovEff);
      const csIb = project(innerXCap, yCap, zCapFront, vpX, vpY, fovEff);
      quad(c, csWt.sx, csWt.sy, csIt.sx, csIt.sy, csIb.sx, csIb.sy, csWb.sx, csWb.sy,
        pColCool(PILLAR_COL.mid));

      c.globalAlpha = 1;
    }

    /**
     * Wall-mounted torch with bracket, stick, flame, and ambient light.
     * tx,ty = flame base position (where stick meets flame).
     * size  = reference size for all parts (scale-aware).
     * side  = -1 (left wall) or +1 (right wall) — bracket faces inward.
     */
    function drawTorch(
      c: CanvasRenderingContext2D,
      tx: number, ty: number,
      size: number, alpha: number,
      time: number, idx: number,
      side: number  // +1: 벽이 왼쪽(브라켓 오른쪽으로), -1: 벽이 오른쪽
    ) {
      if (size < 0.5 || alpha < 0.02) return;
      const t = time * 5 + idx * 3.1;
      const flick1 = 0.8 + 0.2 * Math.sin(t * 1.7);
      const flick2 = 0.85 + 0.15 * Math.sin(t * 2.3 + 1.2);
      const sway = Math.sin(t * 1.1) * size * 0.04;

      c.save();
      c.globalAlpha = alpha;

      // 기준점: tx,ty = 불꽃 밑동 위치. 벽쪽으로 side 방향.
      const bkLen = size * 0.55;       // 브라켓 벽→끝 길이
      const wallSideX = tx + side * bkLen; // 벽 부착점 X
      const bkThick = Math.max(1.8, size * 0.07);

      // ── 1. 주변 광원 (가장 먼저, 뒤에 깔림) ──
      const ambR = size * 3;
      const ambGrad = c.createRadialGradient(tx, ty - size * 0.2, 0, tx, ty, ambR);
      ambGrad.addColorStop(0, `rgba(255,170,60,${0.10 * flick1})`);
      ambGrad.addColorStop(0.35, `rgba(255,140,40,${0.04 * flick1})`);
      ambGrad.addColorStop(1, "rgba(255,120,30,0)");
      c.fillStyle = ambGrad;
      c.beginPath(); c.arc(tx, ty, ambR, 0, Math.PI * 2); c.fill();

      // ── 2. 철제 브라켓 ──
      const cupY = ty + size * 0.18;
      c.lineCap = "round";
      c.lineJoin = "round";

      // 벽 부착판 (작은 세로 바)
      c.fillStyle = rgb([35, 32, 28], 1);
      const plateW = bkThick * 1.8;
      const plateH = bkLen * 0.5;
      c.fillRect(wallSideX - plateW * 0.5, cupY - plateH * 0.6, plateW, plateH);

      // 수평 암 (벽→컵)
      c.strokeStyle = rgb([50, 44, 38], 1);
      c.lineWidth = bkThick;
      c.beginPath();
      c.moveTo(wallSideX, cupY);
      c.lineTo(tx, cupY);
      c.stroke();
      // 암 하이라이트 (윗면)
      c.strokeStyle = rgb([70, 62, 52], 0.5);
      c.lineWidth = Math.max(0.5, bkThick * 0.3);
      c.beginPath();
      c.moveTo(wallSideX, cupY - bkThick * 0.4);
      c.lineTo(tx, cupY - bkThick * 0.4);
      c.stroke();

      // 대각 보강대 (벽 위→암 중간)
      c.strokeStyle = rgb([50, 44, 38], 1);
      c.lineWidth = bkThick * 0.6;
      c.beginPath();
      c.moveTo(wallSideX, cupY - bkLen * 0.55);
      c.lineTo(tx + side * bkLen * 0.25, cupY);
      c.stroke();

      // 컵 (U자 받침 — 횃불봉을 잡는 고리)
      const cupR = size * 0.09;
      c.strokeStyle = rgb([55, 48, 40], 1);
      c.lineWidth = bkThick * 0.9;
      c.beginPath();
      c.arc(tx, cupY + cupR * 0.3, cupR, Math.PI * 0.15, Math.PI * 0.85);
      c.stroke();

      // ── 3. 횃불봉 (나무 막대) ──
      const stickBot = cupY + cupR * 0.2;
      const stickTop = ty - size * 0.12;
      const stickW = Math.max(1.2, size * 0.035);

      // 봉 본체 (약간 아래가 굵음)
      c.fillStyle = rgb([60, 38, 20], 1);
      c.beginPath();
      c.moveTo(tx - stickW * 0.7, stickTop);
      c.lineTo(tx + stickW * 0.7, stickTop);
      c.lineTo(tx + stickW, stickBot);
      c.lineTo(tx - stickW, stickBot);
      c.closePath();
      c.fill();
      // 봉 하이라이트 (왼쪽 면)
      c.fillStyle = rgb([85, 60, 35], 0.4);
      c.fillRect(tx - stickW * 0.3, stickTop, stickW * 0.5, stickBot - stickTop);

      // 감은 천 (2줄)
      c.fillStyle = rgb([80, 58, 32], 0.7);
      const wrapH = Math.max(1.5, stickW * 1.8);
      for (const ratio of [0.2, 0.5]) {
        const wy = stickTop + (stickBot - stickTop) * ratio;
        c.fillRect(tx - stickW * 1.2, wy, stickW * 2.4, wrapH);
      }

      // ── 4. 불꽃 (3레이어 물방울) ──
      const flameBase = stickTop;
      const flameH = size * 0.45 * flick1;
      const flameW = size * 0.16 * flick2;

      const tearDrop = (cx: number, baseY: number, w: number, h: number) => {
        c.beginPath();
        c.moveTo(cx, baseY - h);
        c.quadraticCurveTo(cx + w * 1.1, baseY - h * 0.3, cx + w, baseY);
        c.quadraticCurveTo(cx, baseY + h * 0.06, cx - w, baseY);
        c.quadraticCurveTo(cx - w * 1.1, baseY - h * 0.3, cx, baseY - h);
        c.closePath();
      };

      // 외부 불꽃 (어두운 주황-빨강)
      tearDrop(tx + sway, flameBase, flameW * 1.3, flameH * 1.1);
      const outerGrad = c.createLinearGradient(tx, flameBase, tx, flameBase - flameH * 1.1);
      outerGrad.addColorStop(0, `rgba(220,100,20,${0.65 * flick1})`);
      outerGrad.addColorStop(0.5, `rgba(255,140,30,${0.55 * flick1})`);
      outerGrad.addColorStop(1, `rgba(255,80,10,${0.08})`);
      c.fillStyle = outerGrad;
      c.fill();

      // 중간 불꽃 (주황-노랑)
      tearDrop(tx + sway * 0.6, flameBase, flameW, flameH * 0.85);
      const midGrad = c.createLinearGradient(tx, flameBase, tx, flameBase - flameH * 0.85);
      midGrad.addColorStop(0, `rgba(255,180,40,${0.75 * flick2})`);
      midGrad.addColorStop(0.6, `rgba(255,220,80,${0.65 * flick2})`);
      midGrad.addColorStop(1, `rgba(255,200,50,${0.12})`);
      c.fillStyle = midGrad;
      c.fill();

      // 핵심 불꽃 (밝은 백-노랑)
      tearDrop(tx + sway * 0.3, flameBase, flameW * 0.45, flameH * 0.5);
      const coreGrad = c.createLinearGradient(tx, flameBase, tx, flameBase - flameH * 0.5);
      coreGrad.addColorStop(0, `rgba(255,255,220,${0.85 * flick1})`);
      coreGrad.addColorStop(0.5, `rgba(255,240,160,${0.65})`);
      coreGrad.addColorStop(1, `rgba(255,220,100,${0.08})`);
      c.fillStyle = coreGrad;
      c.fill();

      c.restore();
    }

    // --- Seeded hash for deterministic stone variation ---
    function stoneHash(a: number, b: number, c: number): number {
      const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
      return x - Math.floor(x);
    }

    /**
     * Stone floor with running-bond pattern.
     * Each segment is divided into rows × cols of stone slabs.
     * Odd rows are offset by half a slab width (running bond).
     * Each slab gets a slight color/brightness variation.
     */
    const FLOOR_ROWS = 3;
    const FLOOR_COLS = 6;

    // BG parsed for RGB lerp
    const BG_R = 10, BG_G = 10, BG_B = 12;

    function drawStoneFloor(
      c: CanvasRenderingContext2D,
      z0: number, z1: number,
      alpha: number, isClose: boolean, segIdx: number
    ) {
      // 깊이 비율 (0=가까움, 1=멂) → RGB에 직접 반영
      const d = z0 / TOTAL_DEPTH;

      // Far segments: simple solid fill (alpha baked into RGB)
      if (!isClose) {
        const bl = project(-WALL_HALF_W, WALL_BOT, z0, vpX, vpY, fovEff);
        const br = project(WALL_HALF_W, WALL_BOT, z0, vpX, vpY, fovEff);
        const bl1 = project(-WALL_HALF_W, WALL_BOT, z1, vpX, vpY, fovEff);
        const br1 = project(WALL_HALF_W, WALL_BOT, z1, vpX, vpY, fovEff);
        const f = alpha; // depth fade factor
        const fr = Math.round(BG_R + (FLOOR_COL.dark[0] - BG_R) * f);
        const fg2 = Math.round(BG_G + (FLOOR_COL.dark[1] - BG_G) * f);
        const fb = Math.round(BG_B + (FLOOR_COL.dark[2] - BG_B) * f);
        quad(c, bl.sx, bl.sy, br.sx, br.sy, br1.sx, br1.sy, bl1.sx, bl1.sy,
          `rgb(${fr},${fg2},${fb})`);
        return;
      }

      // Close segments: individual stone slabs — 불투명, RGB에 깊이 bake
      const proximity = Math.max(0, 1 - d);
      const groutW = Math.max(0.5, 0.8 + proximity * 1.5);

      for (let row = 0; row < FLOOR_ROWS; row++) {
        const rT0 = row / FLOOR_ROWS;
        const rT1 = (row + 1) / FLOOR_ROWS;
        const zNear = z0 + (z1 - z0) * rT0;
        const zFar = z0 + (z1 - z0) * rT1;

        // Running bond: odd rows offset by half col width
        const isOddRow = (segIdx * FLOOR_ROWS + row) % 2 === 1;
        const offset = isOddRow ? 0.5 / FLOOR_COLS : 0;
        const startCol = isOddRow ? -1 : 0;

        for (let col = startCol; col < FLOOR_COLS; col++) {
          let cT0 = col / FLOOR_COLS + offset;
          let cT1 = (col + 1) / FLOOR_COLS + offset;
          if (cT1 <= 0 || cT0 >= 1) continue;
          cT0 = Math.max(0, cT0);
          cT1 = Math.min(1, cT1);

          const xL = -WALL_HALF_W + (WALL_HALF_W * 2) * cT0;
          const xR = -WALL_HALF_W + (WALL_HALF_W * 2) * cT1;

          const p00 = project(xL, WALL_BOT, zNear, vpX, vpY, fovEff);
          const p10 = project(xR, WALL_BOT, zNear, vpX, vpY, fovEff);
          const p01 = project(xL, WALL_BOT, zFar, vpX, vpY, fovEff);
          const p11 = project(xR, WALL_BOT, zFar, vpX, vpY, fovEff);

          // Per-slab variation — 전경일수록 대비 강화
          const h = stoneHash(segIdx, row, col);
          const proximity = Math.max(0, 1 - d); // 0=먼곳, 1=가까운곳
          const v = (h - 0.5) * (4 + proximity * 8); // 전경 ±10, 원경 ±4
          const f = alpha;
          const sr = Math.round(BG_R + (FLOOR_COL.base[0] + v - BG_R) * f);
          const sg = Math.round(BG_G + (FLOOR_COL.base[1] + v - BG_G) * f);
          const sb = Math.round(BG_B + (FLOOR_COL.base[2] + v - BG_B) * f);

          quad(c,
            p00.sx, p00.sy, p10.sx, p10.sy,
            p11.sx, p11.sy, p01.sx, p01.sy,
            `rgb(${sr},${sg},${sb})`
          );
        }

        // Horizontal grout line
        if (row > 0) {
          const gL = project(-WALL_HALF_W, WALL_BOT, zNear, vpX, vpY, fovEff);
          const gR = project(WALL_HALF_W, WALL_BOT, zNear, vpX, vpY, fovEff);
          const gf = alpha;
          const mr = Math.round(BG_R + (FLOOR_COL.mortar[0] - BG_R) * gf);
          const mg = Math.round(BG_G + (FLOOR_COL.mortar[1] - BG_G) * gf);
          const mb = Math.round(BG_B + (FLOOR_COL.mortar[2] - BG_B) * gf);
          c.strokeStyle = `rgb(${mr},${mg},${mb})`;
          c.lineWidth = groutW;
          c.beginPath();
          c.moveTo(gL.sx, gL.sy);
          c.lineTo(gR.sx, gR.sy);
          c.stroke();
        }
      }

      // Vertical grout lines
      const gf = alpha;
      const mr = Math.round(BG_R + (FLOOR_COL.mortar[0] - BG_R) * gf);
      const mg = Math.round(BG_G + (FLOOR_COL.mortar[1] - BG_G) * gf);
      const mb = Math.round(BG_B + (FLOOR_COL.mortar[2] - BG_B) * gf);

      for (let row = 0; row < FLOOR_ROWS; row++) {
        const rT0 = row / FLOOR_ROWS;
        const rT1 = (row + 1) / FLOOR_ROWS;
        const zNear = z0 + (z1 - z0) * rT0;
        const zFar = z0 + (z1 - z0) * rT1;
        const isOddRow = (segIdx * FLOOR_ROWS + row) % 2 === 1;
        const offset = isOddRow ? 0.5 / FLOOR_COLS : 0;

        c.strokeStyle = `rgb(${mr},${mg},${mb})`;
        c.lineWidth = groutW;
        const vStartCol = isOddRow ? 0 : 1;

        for (let col = vStartCol; col < FLOOR_COLS; col++) {
          const cT = col / FLOOR_COLS + offset;
          if (cT <= 0 || cT >= 1) continue;
          const x = -WALL_HALF_W + (WALL_HALF_W * 2) * cT;
          const pN = project(x, WALL_BOT, zNear, vpX, vpY, fovEff);
          const pF = project(x, WALL_BOT, zFar, vpX, vpY, fovEff);
          c.beginPath();
          c.moveTo(pN.sx, pN.sy);
          c.lineTo(pF.sx, pF.sy);
          c.stroke();
        }

        if (isOddRow) {
          const xHalf = -WALL_HALF_W + (WALL_HALF_W * 2) * (0.5 / FLOOR_COLS);
          const eN = project(xHalf, WALL_BOT, zNear, vpX, vpY, fovEff);
          const eF = project(xHalf, WALL_BOT, zFar, vpX, vpY, fovEff);
          c.beginPath(); c.moveTo(eN.sx, eN.sy); c.lineTo(eF.sx, eF.sy); c.stroke();
          const xEnd = -WALL_HALF_W + (WALL_HALF_W * 2) * (1 - 0.5 / FLOOR_COLS);
          const rN = project(xEnd, WALL_BOT, zNear, vpX, vpY, fovEff);
          const rF = project(xEnd, WALL_BOT, zFar, vpX, vpY, fovEff);
          c.beginPath(); c.moveTo(rN.sx, rN.sy); c.lineTo(rF.sx, rF.sy); c.stroke();
        }
      }

      // 횃불 반사광 — 기둥 세그먼트의 바닥에 따뜻한 오버레이
      if (segIdx % PILLAR_EVERY === 0 && proximity > 0.4) {
        const bl = project(-WALL_HALF_W, WALL_BOT, z0, vpX, vpY, fovEff);
        const br = project(WALL_HALF_W, WALL_BOT, z0, vpX, vpY, fovEff);
        const midSx = (bl.sx + br.sx) * 0.5;
        const reflR = Math.abs(br.sx - bl.sx) * 0.4;
        const reflA = (proximity - 0.4) * 0.12;
        // 좌측 횃불 반사
        const lRefl = c.createRadialGradient(bl.sx, bl.sy, 0, bl.sx, bl.sy, reflR);
        lRefl.addColorStop(0, `rgba(255,160,60,${reflA})`);
        lRefl.addColorStop(1, "rgba(255,140,40,0)");
        c.fillStyle = lRefl;
        c.fillRect(bl.sx - reflR, bl.sy - reflR * 0.3, reflR * 2, reflR * 0.6);
        // 우측 횃불 반사
        const rRefl = c.createRadialGradient(br.sx, br.sy, 0, br.sx, br.sy, reflR);
        rRefl.addColorStop(0, `rgba(255,160,60,${reflA})`);
        rRefl.addColorStop(1, "rgba(255,140,40,0)");
        c.fillStyle = rRefl;
        c.fillRect(br.sx - reflR, br.sy - reflR * 0.3, reflR * 2, reflR * 0.6);
      }
    }

    /**
     * 볼트 천장 — 중앙 릿지가 약간 밝고 좌우 스프링라인이 어두운 크로스볼트 느낌.
     * 가까운 세그먼트: 가로 리브(골조) 줄눈 + 돌 얼룩.
     */
    function drawCeiling(
      c: CanvasRenderingContext2D,
      z0: number, z1: number,
      alpha: number, isClose: boolean, segIdx: number,
      tl0: { sx: number; sy: number },
      tr0: { sx: number; sy: number },
      tl1: { sx: number; sy: number },
      tr1: { sx: number; sy: number },
    ) {
      const f = alpha;

      // 1. 베이스 — 좌우→중앙 그라데이션 (좌우 어두움, 중앙 약간 밝음 = 볼트 릿지)
      const midX0 = (tl0.sx + tr0.sx) * 0.5;
      const edgeR = Math.round(BG_R + (CEIL_COL.deep[0] - BG_R) * f);
      const edgeG = Math.round(BG_G + (CEIL_COL.deep[1] - BG_G) * f);
      const edgeB = Math.round(BG_B + (CEIL_COL.deep[2] - BG_B) * f);
      const ridgeR = Math.round(BG_R + (CEIL_COL.base[0] + 6 - BG_R) * f);
      const ridgeG = Math.round(BG_G + (CEIL_COL.base[1] + 6 - BG_G) * f);
      const ridgeB = Math.round(BG_B + (CEIL_COL.base[2] + 5 - BG_B) * f);

      const ceilGrad = c.createLinearGradient(tl0.sx, tl0.sy, tr0.sx, tl0.sy);
      ceilGrad.addColorStop(0, `rgb(${edgeR},${edgeG},${edgeB})`);
      ceilGrad.addColorStop(0.4, `rgb(${ridgeR},${ridgeG},${ridgeB})`);
      ceilGrad.addColorStop(0.6, `rgb(${ridgeR},${ridgeG},${ridgeB})`);
      ceilGrad.addColorStop(1, `rgb(${edgeR},${edgeG},${edgeB})`);
      quad(c,
        tl0.sx, tl0.sy, tr0.sx, tr0.sy,
        tr1.sx, tr1.sy, tl1.sx, tl1.sy,
        ceilGrad
      );

      if (!isClose) return;

      // 2. 리브(횡 골조) — 세그먼트 경계에 하나, 밝은 선
      const ribR = Math.round(BG_R + (CEIL_COL.base[0] + 12 - BG_R) * f);
      const ribG = Math.round(BG_G + (CEIL_COL.base[1] + 12 - BG_G) * f);
      const ribB = Math.round(BG_B + (CEIL_COL.base[2] + 10 - BG_B) * f);
      c.strokeStyle = `rgb(${ribR},${ribG},${ribB})`;
      c.lineWidth = Math.max(1, 2.5 * (1 - Math.max(0, z0 / TOTAL_DEPTH)));
      c.beginPath();
      c.moveTo(tl0.sx, tl0.sy);
      c.lineTo(tr0.sx, tr0.sy);
      c.stroke();

      // 3. 릿지라인 (중앙 종축선) — 미세한 밝은 선
      const midY0 = tl0.sy;
      const midY1 = tl1.sy;
      const mid1X = (tl1.sx + tr1.sx) * 0.5;
      c.strokeStyle = `rgba(${ribR},${ribG},${ribB},0.4)`;
      c.lineWidth = Math.max(0.5, 1.5 * (1 - Math.max(0, z0 / TOTAL_DEPTH)));
      c.beginPath();
      c.moveTo(midX0, midY0);
      c.lineTo(mid1X, midY1);
      c.stroke();

      // 4. 돌 얼룩 (벽면과 동일 방식, 더 적고 어둡게)
      const PATCHES = 4;
      for (let i = 0; i < PATCHES; i++) {
        const h1 = stoneHash(segIdx * 200, i, 10);
        const h2 = stoneHash(segIdx * 200, i, 11);
        const h3 = stoneHash(segIdx * 200, i, 12);

        // 천장 면 내 보간 위치
        const tU = h1 * 0.8 + 0.1; // left-right (0~1)
        const tV = h2 * 0.8 + 0.1; // near-far (0~1)

        // 4점 보간
        const sx = tl0.sx + (tr0.sx - tl0.sx) * tU
          + (tl1.sx + (tr1.sx - tl1.sx) * tU - (tl0.sx + (tr0.sx - tl0.sx) * tU)) * tV;
        const sy = tl0.sy + (tr0.sy - tl0.sy) * tU
          + (tl1.sy + (tr1.sy - tl1.sy) * tU - (tl0.sy + (tr0.sy - tl0.sy) * tU)) * tV;

        const patchSize = Math.max(1.5, Math.abs(tl0.sx - tr0.sx) * 0.06 * (1 - tV * 0.5));
        if (patchSize < 1) continue;

        const dark = h3 > 0.4; // 대부분 어두운 얼룩
        c.globalAlpha = dark ? 0.12 : 0.06;
        c.fillStyle = dark
          ? `rgb(${BG_R},${BG_G},${BG_B})`
          : `rgb(${ridgeR},${ridgeG},${ridgeB})`;
        c.beginPath();
        c.ellipse(sx, sy, patchSize, patchSize * 0.6, h1 * Math.PI, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }

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
        const isVeryClose = depthRatio < 0.25;

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
        drawStoneWall(ctx, z0, z1, alpha, isClose, seg.idx, -1);

        // C. Right wall
        drawStoneWall(ctx, z0, z1, alpha, isClose, seg.idx, 1);

        // D. Floor — 석조 바닥 (러닝본드 석판 패턴)
        drawStoneFloor(ctx, z0, z1, alpha, isClose, seg.idx);

        // E. Pillars + Arch + Torches — PILLAR_EVERY 세그먼트마다 일괄
        if (seg.idx % PILLAR_EVERY === 0 && alpha > 0.05) {
          // 3D 필라스터
          drawPillar3D(ctx, -WALL_HALF_W, +1, z0, alpha, isClose);
          drawPillar3D(ctx, WALL_HALF_W, -1, z0, alpha, isClose);

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
