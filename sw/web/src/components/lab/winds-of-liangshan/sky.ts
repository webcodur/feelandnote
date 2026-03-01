import type { SceneContext } from "./types";
import { WARM_SUN } from "./types";

/**
 * PASS 0: 먹빛 청회 하늘
 */
export function drawSky(c: CanvasRenderingContext2D, s: SceneContext) {
  const { W, H } = s;

  const grad = c.createLinearGradient(0, 0, 0, H * 0.55);
  grad.addColorStop(0, "#5f7a86");
  grad.addColorStop(0.3, "#4a6670");
  grad.addColorStop(0.6, "#3a5560");
  grad.addColorStop(1, "#2f3f4a");
  c.fillStyle = grad;
  c.fillRect(0, 0, W, H);

  // 하단 어둡게 (강화)
  const darkGrad = c.createLinearGradient(0, H * 0.5, 0, H);
  darkGrad.addColorStop(0, "rgba(15, 25, 30, 0)");
  darkGrad.addColorStop(0.4, "rgba(15, 25, 30, 0.25)");
  darkGrad.addColorStop(1, "rgba(10, 20, 25, 0.5)");
  c.fillStyle = darkGrad;
  c.fillRect(0, H * 0.5, W, H * 0.5);

  // 비네팅 (강화)
  const vig = c.createRadialGradient(W * 0.6, H * 0.35, W * 0.3, W * 0.5, H * 0.4, W * 0.95);
  vig.addColorStop(0, "rgba(10, 20, 25, 0)");
  vig.addColorStop(1, "rgba(10, 20, 25, 0.35)");
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);
}

/**
 * PASS 1: 집중된 태양 + 관통 빛줄기
 */
export function drawSun(c: CanvasRenderingContext2D, s: SceneContext, t: number) {
  const { W, H, lx: sx, ly: sy } = s;

  // Core
  const core = c.createRadialGradient(sx, sy, 0, sx, sy, W * 0.04);
  core.addColorStop(0, "rgba(255, 245, 220, 0.95)");
  core.addColorStop(0.3, "rgba(255, 230, 180, 0.6)");
  core.addColorStop(0.6, `${WARM_SUN} 0.2)`);
  core.addColorStop(1, `${WARM_SUN} 0)`);
  c.fillStyle = core;
  c.fillRect(0, 0, W, H);

  c.save();
  c.globalCompositeOperation = "screen";

  // Glow (반경 축소 — 집중)
  const glow = c.createRadialGradient(sx, sy, 0, sx, sy, W * 0.3);
  glow.addColorStop(0, `${WARM_SUN} 0.3)`);
  glow.addColorStop(0.08, `${WARM_SUN} 0.18)`);
  glow.addColorStop(0.25, `${WARM_SUN} 0.06)`);
  glow.addColorStop(1, `${WARM_SUN} 0)`);
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  // Light Shafts (3개, 좁고 강렬하게 — 관통, 시선 앵커)
  for (let i = 0; i < 3; i++) {
    const angle = Math.PI - 0.12 - i * 0.28;
    const length = W * (0.95 + i * 0.05);
    const baseWidth = 20 + i * 12;
    const width = baseWidth + Math.sin(t * 0.3 + i * 1.8) * (baseWidth * 0.2);
    const alpha = 0.09 + Math.sin(t * 0.25 + i * 1.2) * 0.025;

    c.save();
    c.translate(sx, sy);
    c.rotate(angle);

    const rg = c.createLinearGradient(0, 0, length, 0);
    rg.addColorStop(0, `${WARM_SUN} ${alpha * 2.5})`);
    rg.addColorStop(0.1, `${WARM_SUN} ${alpha})`);
    rg.addColorStop(1, `${WARM_SUN} 0)`);

    c.fillStyle = rg;
    c.beginPath();
    c.moveTo(0, -width * 0.05);
    c.lineTo(length, -width * 0.4);
    c.lineTo(length, width * 0.4);
    c.lineTo(0, width * 0.05);
    c.closePath();
    c.fill();
    c.restore();
  }

  c.restore();
}
