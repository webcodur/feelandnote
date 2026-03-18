import type { DrawContext } from "../types";

export function drawMountains({ ctx, width, height, time }: DrawContext) {
  const moonX = width * 0.7;

  const drawLayer = (
    baseColor: string,
    fogColor: string,
    yBase: number,
    detail: number,
    heightMult: number,
    blur: number,
    rimLight: boolean
  ) => {
    if (blur > 0) {
      ctx.filter = `blur(${blur}px)`;
    } else {
      ctx.filter = "none";
    }

    ctx.beginPath();
    ctx.moveTo(0, height);

    const ridge: {x: number, y: number}[] = [];

    for (let x = 0; x <= width + 20; x += 10) {
      let n = Math.sin(x * 0.001 * detail) * 1.0;
      n += Math.sin(x * 0.003 * detail) * 0.5;
      n += Math.sin(x * 0.012 * detail) * 0.2;
      n += Math.cos(x * 0.04 * detail) * 0.1;
      n += Math.sin(x * 0.1 * detail) * 0.02; // Fine grit

      let y = height * yBase - (n * height * heightMult);
      y = Math.max(0, y);
      ctx.lineTo(x, y);
      ridge.push({x, y});
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);

    ctx.fillStyle = baseColor;
    ctx.fill();

    const fog = ctx.createLinearGradient(0, height * (yBase - heightMult), 0, height);
    fog.addColorStop(0, "rgba(0,0,0,0)");
    fog.addColorStop(1, fogColor);
    ctx.fillStyle = fog;
    ctx.fill();

    // Rim Light (Halo from moon) - broken and partial
    if (rimLight) {
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 1.2;

      for (let i = 1; i < ridge.length; i++) {
        const p1 = ridge[i-1];
        const p2 = ridge[i];

        // 달 주변(e.g., 반경 250px 내)의 능선에만 빛 적용
        const distToMoon = Math.abs(p1.x - moonX);
        if (distToMoon > 250) continue;

        // Stable pseudo-random noise for breaks (정적 노이즈를 통해 선을 불규칙하게 끊기)
        const breakNoise = Math.sin(p1.x * 0.1) * Math.sin(p1.x * 0.03);
        if (breakNoise < 0.1) continue; // 노이즈 값이 작으면 안 그리고 끊음 (파단면 형성)

        const intensity = Math.max(0, 1 - distToMoon / 250);
        const alpha = intensity * 0.4 * breakNoise; // 빛의 세기를 크게 낮춤 (0.4 max)

        if (alpha > 0.01) {
          ctx.strokeStyle = `rgba(255, 200, 100, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }
  };

  // 5 Layers of depth
  // 1. Farthest (desaturated purple/red, blurred)
  drawLayer("#1f0d14", "rgba(50, 15, 20, 0.8)", 0.55, 0.6, 0.18, 3, true);
  // 2. Far-Mid
  drawLayer("#15060b", "rgba(30, 8, 12, 0.9)", 0.62, 0.9, 0.15, 1.5, true);
  // 3. Mid
  drawLayer("#0c0305", "rgba(15, 4, 6, 0.95)", 0.68, 1.3, 0.12, 0.5, true);
  // 4. Near-Mid
  drawLayer("#060102", "rgba(5, 1, 2, 1)", 0.75, 1.8, 0.09, 0, false);
  // 5. Nearest (almost black)
  drawLayer("#020001", "rgba(0, 0, 0, 1)", 0.82, 2.5, 0.06, 0, false);

  ctx.filter = "none";
}
