import { project, quad, rgb, stoneHash } from "../drawUtils";
import {
  WALL_COL, ARCH_COL, PILLAR_COL,
  BG_R, BG_G, BG_B, TOTAL_DEPTH,
} from "../constants";

/**
 * 거친 석조 벽면 — 어두운 베이스 + 불규칙 돌 얼룩 + 수평 줄눈
 * side: -1 = left wall, +1 = right wall
 */
export function drawStoneWall(
  c: CanvasRenderingContext2D,
  z0: number, z1: number,
  alpha: number, isClose: boolean, segIdx: number,
  side: number,
  WALL_HALF_W: number, WALL_TOP: number, WALL_BOT: number,
  vpX: number, vpY: number, fovEff: number
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

export function drawArch(
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
