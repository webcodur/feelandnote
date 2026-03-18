import { project, quad, stoneHash } from "../drawUtils";
import {
  FLOOR_COL, FLOOR_ROWS, FLOOR_COLS,
  PILLAR_EVERY, TOTAL_DEPTH,
  BG_R, BG_G, BG_B,
} from "../constants";

/**
 * Stone floor with running-bond pattern.
 * Each segment is divided into rows x cols of stone slabs.
 * Odd rows are offset by half a slab width (running bond).
 * Each slab gets a slight color/brightness variation.
 */
export function drawStoneFloor(
  c: CanvasRenderingContext2D,
  z0: number, z1: number,
  alpha: number, isClose: boolean, segIdx: number,
  WALL_HALF_W: number, WALL_BOT: number,
  vpX: number, vpY: number, fovEff: number
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
      const slabProximity = Math.max(0, 1 - d); // 0=먼곳, 1=가까운곳
      const v = (h - 0.5) * (4 + slabProximity * 8); // 전경 ±10, 원경 ±4
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
