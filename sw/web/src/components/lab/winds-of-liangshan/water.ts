import type { SceneContext } from "./types";
import { WARM_SUN, HAZE_MIST } from "./types";

/**
 * PASS 5: 먹빛 수면 + 미세 파동
 */
export function drawWater(c: CanvasRenderingContext2D, s: SceneContext, t: number) {
  const { W, H, lx: sx, wt: top } = s;
  const waterH = H - top;

  // 짙은 청록 수면
  const grad = c.createLinearGradient(0, top, 0, H);
  grad.addColorStop(0, "#2a5a52");
  grad.addColorStop(0.1, "#1f4a45");
  grad.addColorStop(0.3, "#183e3a");
  grad.addColorStop(0.6, "#12302e");
  grad.addColorStop(1, "#0d2522");
  c.fillStyle = grad;
  c.fillRect(0, top, W, waterH);

  // 미세 파동 (진폭 다양화, 간격 좁히기)
  for (let y = top + 3; y < top + waterH * 0.65; y += 3) {
    const depth = (y - top) / waterH;
    const freq = 0.07 / (depth + 0.06);
    const speed = t * 0.6;
    const rippleAlpha = 0.12 * (1 - depth * 1.8);
    c.fillStyle = `rgba(120, 160, 150, ${Math.max(rippleAlpha, 0.01)})`;
    for (let x = 0; x < W; x += 12) {
      const wave = Math.sin(x * freq + speed + y * 0.12);
      if (wave > 0.4) {
        const w = 3 + depth * 12 + Math.sin(x * 0.03 + t) * 3;
        c.fillRect(x, y, w, 0.8);
      }
    }
  }

  // 좁고 강렬한 태양 반사
  c.save();
  c.globalCompositeOperation = "screen";

  const refGrad = c.createRadialGradient(sx, top + 5, 0, sx, top + 30, W * 0.1);
  refGrad.addColorStop(0, `${WARM_SUN} 0.35)`);
  refGrad.addColorStop(0.15, `${WARM_SUN} 0.15)`);
  refGrad.addColorStop(0.5, `${WARM_SUN} 0.04)`);
  refGrad.addColorStop(1, `${WARM_SUN} 0)`);
  c.fillStyle = refGrad;
  c.fillRect(sx - W * 0.1, top, W * 0.2, waterH * 0.35);

  // 좁은 수평 반짝임
  for (let i = 0; i < 7; i++) {
    const sy = top + 4 + i * 6 + Math.sin(t * 1.0 + i * 1.4) * 2;
    const sw = 15 + i * 6 + Math.sin(t * 0.8 + i) * 8;
    const cx = sx + Math.sin(t * 0.35 + i * 2) * 6;
    const sa = 0.08 + Math.sin(t * 0.5 + i * 1.1) * 0.03;
    const sg = c.createLinearGradient(cx - sw / 2, sy, cx + sw / 2, sy);
    sg.addColorStop(0, `${WARM_SUN} 0)`);
    sg.addColorStop(0.3, `${WARM_SUN} ${sa})`);
    sg.addColorStop(0.7, `${WARM_SUN} ${sa})`);
    sg.addColorStop(1, `${WARM_SUN} 0)`);
    c.fillStyle = sg;
    c.fillRect(cx - sw / 2, sy, sw, 1);
  }

  c.restore();

  // 간헐적 파문 (ripple ring)
  drawRipples(c, s, t);
}

/**
 * 원형 파문 — 누군가 돌을 던진 듯한 파동
 */
function drawRipples(c: CanvasRenderingContext2D, s: SceneContext, t: number) {
  const { W, wt: top, H } = s;
  const waterH = H - top;

  const ripples = [
    { x: 0.35, y: 0.3, period: 12, offset: 0 },
    { x: 0.7, y: 0.2, period: 18, offset: 7 },
  ];

  for (const r of ripples) {
    const phase = ((t + r.offset) % r.period) / r.period;
    if (phase > 0.6) continue; // 사라진 상태

    const rx = W * r.x;
    const ry = top + waterH * r.y;
    const maxRadius = 30;
    const radius = phase * maxRadius / 0.6;
    const alpha = 0.15 * (1 - phase / 0.6);

    c.save();
    c.strokeStyle = `rgba(150, 180, 170, ${alpha})`;
    c.lineWidth = 0.8;
    c.beginPath();
    c.ellipse(rx, ry, radius, radius * 0.3, 0, 0, Math.PI * 2);
    c.stroke();

    if (radius > 8) {
      c.strokeStyle = `rgba(150, 180, 170, ${alpha * 0.5})`;
      c.beginPath();
      c.ellipse(rx, ry, radius * 0.6, radius * 0.6 * 0.3, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }
}

/**
 * PASS 8: 수면 물안개
 */
export function drawWaterMist(c: CanvasRenderingContext2D, s: SceneContext, t: number) {
  const { W, wt: top } = s;
  const mistY = top - 2;

  const mistGrad = c.createLinearGradient(0, mistY - 12, 0, top + 18);
  mistGrad.addColorStop(0, `${HAZE_MIST} 0)`);
  mistGrad.addColorStop(0.5, `${HAZE_MIST} 0.06)`);
  mistGrad.addColorStop(1, `${HAZE_MIST} 0)`);
  c.fillStyle = mistGrad;
  c.fillRect(0, mistY - 12, W, 30);

  const blobs = [
    { x: 0.3, speed: 0.05, phase: 0, r: 0.15, a: 0.04 },
    { x: 0.7, speed: 0.07, phase: 2.5, r: 0.12, a: 0.035 },
  ];
  for (const b of blobs) {
    const ox = W * b.x + Math.sin(t * b.speed + b.phase) * 35;
    const oy = mistY + Math.cos(t * 0.04 + b.phase) * 4;
    const rg = c.createRadialGradient(ox, oy, 0, ox, oy, W * b.r);
    rg.addColorStop(0, `${HAZE_MIST} ${b.a})`);
    rg.addColorStop(1, `${HAZE_MIST} 0)`);
    c.fillStyle = rg;
    c.fillRect(ox - W * b.r, oy - 25, W * b.r * 2, 50);
  }
}
