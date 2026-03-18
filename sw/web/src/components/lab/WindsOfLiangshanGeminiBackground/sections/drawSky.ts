import type { DrawContext } from "../types";

export function drawSky({ ctx, width, height, time }: DrawContext) {
  // 1. Background base: Linear Gradient for Twilight horizon
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.8);
  skyGrad.addColorStop(0, "#08040a"); // Dark purple/black top
  skyGrad.addColorStop(0.4, "#1a0815"); // Deep twilight purple
  skyGrad.addColorStop(0.7, "#3a1010"); // Dark crimson
  skyGrad.addColorStop(1, "#5a1a05"); // Warm orange/red near horizon
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Add "canvas" noise texture to sky
  for(let i=0; i<400; i++) {
    ctx.fillStyle = `rgba(255, 200, 150, ${Math.random() * 0.02})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 1.5, 1.5);
  }

  // 2. The Blood Moon
  const moonX = width * 0.7;
  const moonY = height * 0.3;
  const moonRadius = Math.min(width, height) * 0.095; // Slightly reduced moon size

  ctx.globalCompositeOperation = "lighter";

  // Glow Layer 1 (Huge & extremely soft)
  const glow1 = ctx.createRadialGradient(moonX, moonY, moonRadius, moonX, moonY, moonRadius * 6);
  glow1.addColorStop(0, "rgba(220, 120, 60, 0.08)"); // Lowered intensity & saturation
  glow1.addColorStop(0.5, "rgba(180, 50, 20, 0.03)");
  glow1.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, height);

  // Glow Layer 2 (Mid)
  const glow2 = ctx.createRadialGradient(moonX, moonY, moonRadius, moonX, moonY, moonRadius * 3);
  glow2.addColorStop(0, "rgba(230, 160, 90, 0.12)"); // Less yellow, more dusty orange
  glow2.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, width, height);

  // Glow Layer 3 (Tight)
  const glow3 = ctx.createRadialGradient(moonX, moonY, moonRadius * 0.8, moonX, moonY, moonRadius * 1.5);
  glow3.addColorStop(0, "rgba(255, 210, 130, 0.25)"); // Greatly reduced from 0.6 to 0.25
  glow3.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow3;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "source-over";

  // Sharp inner moon - Base color (Lower saturation, directional light)
  const moonGrad = ctx.createRadialGradient(
    moonX + moonRadius * 0.3, moonY - moonRadius * 0.3, 0, // Highlight strongly offset to top-right
    moonX, moonY, moonRadius
  );
  // Desaturated and darkened base colors
  moonGrad.addColorStop(0, "#e8d8b8"); // Pale, less saturated gold
  moonGrad.addColorStop(0.6, "#c8ae70"); // Dusty, muted yellow/brown
  moonGrad.addColorStop(1, "#8a6630"); // Dark shadow edge

  ctx.fillStyle = moonGrad;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
  ctx.fill();

  // Moon craters / texture (Organic, blurred patches)
  ctx.save();
  ctx.clip(); // Ensure patterns don't bleed outside the moon

  ctx.globalCompositeOperation = "multiply";
  ctx.filter = "blur(4px)"; // Soft edges

  // Helper to draw an irregular blob
  const drawBlob = (cx: number, cy: number, size: number, alpha: number) => {
    ctx.fillStyle = `rgba(100, 20, 0, ${alpha})`;

    ctx.beginPath();
    // Generate an irregular, bumpy circle
    for (let angle = 0; angle <= Math.PI * 2; angle += 0.5) {
      const r = size * (0.7 + Math.sin(angle * 3 + cx) * 0.15 + Math.cos(angle * 5 + cy) * 0.15);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (angle === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };

  // Large Maria (Dark Seas) - Very low alpha to blend in
  drawBlob(moonX - moonRadius * 0.2, moonY - moonRadius * 0.05, moonRadius * 0.45, 0.18);
  drawBlob(moonX - moonRadius * 0.35, moonY + moonRadius * 0.2, moonRadius * 0.35, 0.22);
  drawBlob(moonX + moonRadius * 0.1, moonY - moonRadius * 0.3, moonRadius * 0.4, 0.14);

  // Medium Patches
  drawBlob(moonX + moonRadius * 0.3, moonY + moonRadius * 0.1, moonRadius * 0.3, 0.16);
  drawBlob(moonX + moonRadius * 0.15, moonY + moonRadius * 0.4, moonRadius * 0.25, 0.19);
  drawBlob(moonX - moonRadius * 0.1, moonY - moonRadius * 0.3, moonRadius * 0.2, 0.12);

  // Fine details
  for (let i = 0; i < 6; i++) {
    const seedAngle = (i * Math.PI) / 3;
    const dist = 0.3 * moonRadius + (i % 2) * 0.4 * moonRadius; // Distribute semi-randomly but deterministically
    drawBlob(
      moonX + Math.cos(seedAngle) * dist,
      moonY + Math.sin(seedAngle) * dist,
      moonRadius * (0.05 + (i * 0.02)),
      0.1 + (i % 3) * 0.03
    );
  }

  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";

  // Self-Shadow (Spherical shading) - Darken bottom-left strongly
  ctx.globalCompositeOperation = "multiply";
  const shadowGrad = ctx.createRadialGradient(
    moonX - moonRadius * 0.4, moonY + moonRadius * 0.4, 0,
    moonX - moonRadius * 0.2, moonY + moonRadius * 0.2, moonRadius * 1.5
  );
  shadowGrad.addColorStop(0, "rgba(20, 5, 0, 0.6)"); // Very dark core of shadow
  shadowGrad.addColorStop(0.6, "rgba(40, 15, 5, 0.2)");
  shadowGrad.addColorStop(1, "rgba(0, 0, 0, 0)"); // Fades out towards top-right light

  ctx.fillStyle = shadowGrad;
  ctx.fillRect(moonX - moonRadius, moonY - moonRadius, moonRadius * 2, moonRadius * 2);

  ctx.restore(); // remove clip


  // 3. Volumetric Fog / Clouds passing moon (MUCH SLOWER)
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 5; i++) {
    const cloudSpeed = time * 0.02 + i * 200;
    const cx = moonX - moonRadius * 2 + (cloudSpeed % (moonRadius * 4));
    const cy = moonY - moonRadius + i * 30 + Math.sin(time * 0.005 + i) * 20;

    const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, moonRadius * 1.5);
    cloudGrad.addColorStop(0, "rgba(255, 100, 50, 0.04)"); // Warm moonlight glow on clouds
    cloudGrad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = cloudGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, moonRadius * 2.5, moonRadius * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = "source-over"; // reset
}
