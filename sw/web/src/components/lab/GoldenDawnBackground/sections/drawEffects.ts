import { wave } from "./noise";

// --- Wave ripple curves ---
export const drawWaveRipples = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  scrollOffset: number,
  horizonY: number,
  shorePoints: { x: number; y: number }[],
) => {
  const t0 = time * 0.02;
  const waveCount = 14;

  for (let r = 0; r < waveCount; r++) {
    const cycle = ((r / waveCount + scrollOffset * 0.00025) % 1.0);
    const dist = 1 - cycle;
    if (dist < 0.03) continue;

    const alpha = (1 - dist * 0.6) * 0.1 * Math.min(cycle * 5, 1);
    if (alpha < 0.005) continue;

    ctx.beginPath();
    let started = false;

    for (let i = 0; i < shorePoints.length; i++) {
      const pt = shorePoints[i];
      const t = i / (shorePoints.length - 1);
      const perspScale = Math.max(t, 0.05);
      const offsetDist = dist * 120 * perspScale;

      const nextPt = shorePoints[Math.min(i + 1, shorePoints.length - 1)];
      const dx = nextPt.x - pt.x, dy = nextPt.y - pt.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len, ny = dx / len;

      const undulate = wave(t * 12 + r * 3.7, t0 * 0.8 + r * 0.5, 3 * perspScale);
      const wx = pt.x + nx * offsetDist + ny * undulate;
      const wy = pt.y + ny * offsetDist - nx * undulate;

      if (wx > pt.x + 5 || wx < -20) continue;

      if (!started) { ctx.moveTo(wx, wy); started = true; }
      else ctx.lineTo(wx, wy);
    }

    if (started) {
      ctx.strokeStyle = `rgba(180,210,235,${alpha})`;
      ctx.lineWidth = 0.4 + (1 - dist) * 1.2;
      ctx.stroke();
    }
  }
};

// --- Horizon haze: 공기층 삽입 ---
export const drawHaze = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  vpX: number,
  horizonY: number,
) => {
  // 전체 수평선 대역
  const hBand = ctx.createLinearGradient(0, horizonY - 50, 0, horizonY + 80);
  hBand.addColorStop(0, "rgba(160,120,70,0)");
  hBand.addColorStop(0.25, "rgba(170,130,80,0.15)");
  hBand.addColorStop(0.5, "rgba(165,125,75,0.12)");
  hBand.addColorStop(0.75, "rgba(150,110,65,0.06)");
  hBand.addColorStop(1, "rgba(140,100,60,0)");
  ctx.fillStyle = hBand;
  ctx.fillRect(0, horizonY - 50, w, 130);

  // VP 중심 해무 — 중앙 가장 밝고 좌우 감쇠
  const hazeR = w * 0.45;
  const haze = ctx.createRadialGradient(vpX, horizonY, 0, vpX, horizonY, hazeR);
  haze.addColorStop(0, "rgba(220,180,110,0.18)");
  haze.addColorStop(0.2, "rgba(200,160,90,0.12)");
  haze.addColorStop(0.5, "rgba(180,140,80,0.06)");
  haze.addColorStop(0.8, "rgba(150,110,65,0.02)");
  haze.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(vpX - hazeR, horizonY - hazeR * 0.4, hazeR * 2, hazeR * 0.8);

  // 수평선 양측 어둡게 (중앙↔측면 밝기 차이)
  const sideGrad = ctx.createLinearGradient(0, 0, w, 0);
  sideGrad.addColorStop(0, "rgba(20,15,10,0.08)");
  sideGrad.addColorStop(0.3, "rgba(20,15,10,0)");
  sideGrad.addColorStop(0.7, "rgba(20,15,10,0)");
  sideGrad.addColorStop(1, "rgba(20,15,10,0.06)");
  ctx.fillStyle = sideGrad;
  ctx.fillRect(0, horizonY - 30, w, 80);

  // 지면 원경부 안개층
  const groundFog = ctx.createLinearGradient(0, horizonY, 0, horizonY + h * 0.18);
  groundFog.addColorStop(0, "rgba(160,125,80,0.12)");
  groundFog.addColorStop(0.4, "rgba(150,115,75,0.05)");
  groundFog.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = groundFog;
  ctx.fillRect(0, horizonY, w, h * 0.18);
};

// --- Vignette ---
export const drawVignette = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  vpX: number,
  vpY: number,
) => {
  const vig = ctx.createRadialGradient(vpX, vpY, h * 0.25, w * 0.5, h * 0.5, h * 0.85);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
};
