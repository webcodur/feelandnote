import type { SceneContext } from "./types";
import { HAZE_MIST, WARM_SUN } from "./types";

/**
 * PASS 4: 3단 층상 안개 (먹빛 청록)
 */
export function drawHazeFar(c: CanvasRenderingContext2D, s: SceneContext, t: number) {
  const { W, H } = s;

  // 3단 안개 alpha 차등: 원거리 0.08, 중거리 0.15, 수면 근처 0.25
  const bands = [
    { y: 0.3, h: 0.06, a: 0.08, speed: 0.06 },
    { y: 0.38, h: 0.05, a: 0.15, speed: 0.04 },
    { y: 0.44, h: 0.04, a: 0.25, speed: 0.09 },
  ];

  for (const band of bands) {
    const by = H * band.y + Math.sin(t * band.speed) * 6;
    const bh = H * band.h;
    const grad = c.createLinearGradient(0, by, 0, by + bh);
    grad.addColorStop(0, `${HAZE_MIST} 0)`);
    grad.addColorStop(0.3, `${HAZE_MIST} ${band.a})`);
    grad.addColorStop(0.7, `${HAZE_MIST} ${band.a * 0.6})`);
    grad.addColorStop(1, `${HAZE_MIST} 0)`);
    c.fillStyle = grad;
    c.fillRect(0, by, W, bh);
  }

  // 안개 덩어리 (축소, 불균일)
  const blobs = [
    { x: 0.2, y: 0.36, r: 0.1, a: 0.06, sx: 0.07 },
    { x: 0.6, y: 0.4, r: 0.14, a: 0.08, sx: 0.09 },
    { x: 0.9, y: 0.34, r: 0.08, a: 0.05, sx: 0.12 },
  ];
  for (const b of blobs) {
    const ox = W * b.x + Math.sin(t * b.sx) * 40;
    const oy = H * b.y + Math.cos(t * b.sx * 0.6) * 12;
    const rg = c.createRadialGradient(ox, oy, 0, ox, oy, W * b.r);
    rg.addColorStop(0, `${HAZE_MIST} ${b.a})`);
    rg.addColorStop(0.6, `${HAZE_MIST} ${b.a * 0.3})`);
    rg.addColorStop(1, `${HAZE_MIST} 0)`);
    c.fillStyle = rg;
    c.fillRect(ox - W * b.r, oy - W * b.r, W * b.r * 2, W * b.r * 2);
  }
}

/**
 * PASS 6: 수면 위 아지랑이
 */
export function drawHazeMid(c: CanvasRenderingContext2D, s: SceneContext, t: number) {
  const { W, H, lx: sx, wt: top } = s;
  const hazeCenter = top - H * 0.03;

  c.save();
  c.globalCompositeOperation = "screen";

  const strips = [
    { yOff: -0.06, h: 0.03, a: 0.06, phase: 0 },
    { yOff: -0.02, h: 0.035, a: 0.1, phase: 1.5 },
    { yOff: 0.015, h: 0.02, a: 0.05, phase: 3.0 },
  ];

  for (const strip of strips) {
    const sy = hazeCenter + H * strip.yOff + Math.sin(t * 0.06 + strip.phase) * 5;
    const sh = H * strip.h;
    const band = c.createLinearGradient(0, sy, 0, sy + sh);
    band.addColorStop(0, `${HAZE_MIST} 0)`);
    band.addColorStop(0.3, `${HAZE_MIST} ${strip.a})`);
    band.addColorStop(0.7, `${HAZE_MIST} ${strip.a * 0.5})`);
    band.addColorStop(1, `${HAZE_MIST} 0)`);
    c.fillStyle = band;
    c.fillRect(0, sy, W, sh);
  }

  const blobs = [
    { x: 0.15, speed: 0.12, phase: 0, r: 0.12, a: 0.06 },
    { x: 0.5, speed: 0.08, phase: 2.0, r: 0.16, a: 0.08 },
    { x: 0.82, speed: 0.15, phase: 4.0, r: 0.1, a: 0.05 },
  ];
  for (const b of blobs) {
    const ox = W * b.x + Math.sin(t * b.speed + b.phase) * 35;
    const oy = hazeCenter + Math.cos(t * 0.08 + b.phase) * 12;
    const radius = W * b.r;
    const alpha = b.a + Math.sin(t * 0.1 + b.phase) * 0.02;
    const rg = c.createRadialGradient(ox, oy, 0, ox, oy, radius);
    rg.addColorStop(0, `${HAZE_MIST} ${alpha})`);
    rg.addColorStop(0.5, `${HAZE_MIST} ${alpha * 0.3})`);
    rg.addColorStop(1, `${HAZE_MIST} 0)`);
    c.fillStyle = rg;
    c.fillRect(ox - radius, oy - radius, radius * 2, radius * 2);
  }

  // 태양 잔광 (범위 축소)
  const warmHaze = c.createRadialGradient(sx, hazeCenter, 0, sx, hazeCenter, W * 0.2);
  warmHaze.addColorStop(0, `${WARM_SUN} 0.06)`);
  warmHaze.addColorStop(0.4, `${WARM_SUN} 0.02)`);
  warmHaze.addColorStop(1, `${WARM_SUN} 0)`);
  c.fillStyle = warmHaze;
  c.fillRect(sx - W * 0.2, hazeCenter - 100, W * 0.4, 200);

  c.restore();
}
