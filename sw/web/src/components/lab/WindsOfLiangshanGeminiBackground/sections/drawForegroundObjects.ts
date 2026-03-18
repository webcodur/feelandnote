import type { DrawContext } from "../types";

export function drawForegroundObjects({ ctx, width, height }: DrawContext) {
  // Draw an old, gnarled, dead plum/pine tree reaching in from the left
  // to anchor the scene with a highly organic, distinct silhouette

  const treeBaseX = 0;
  const treeBaseY = height;

  // Base bark gradient (deep browns and blacks)
  const trunkGrad = ctx.createLinearGradient(0, 0, width * 0.3, 0);
  trunkGrad.addColorStop(0, "#050101"); // Deepest dark left
  trunkGrad.addColorStop(0.5, "#140505"); // Slight red-brown mid
  trunkGrad.addColorStop(1, "#2a0a0a"); // Lighter edge catching moon

  ctx.fillStyle = trunkGrad;
  ctx.strokeStyle = trunkGrad;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();

  // Main thick trunk starting from bottom left and bending inwards
  ctx.moveTo(treeBaseX, treeBaseY);

  // Left edge of trunk
  ctx.lineTo(treeBaseX, height * 0.4);

  // Top main branch reaching out rightwards
  ctx.bezierCurveTo(
    width * 0.1, height * 0.45,
    width * 0.2, height * 0.35,
    width * 0.3, height * 0.3
  );

  // Tapering back along bottom edge of top branch
  ctx.bezierCurveTo(
    width * 0.2, height * 0.38,
    width * 0.12, height * 0.5,
    width * 0.08, height * 0.55
  );

  // Lower secondary gnarly branch reaching out
  ctx.bezierCurveTo(
    width * 0.15, height * 0.65,
    width * 0.22, height * 0.7,
    width * 0.25, height * 0.75
  );

  // Tapering back along bottom edge of lower branch
  ctx.bezierCurveTo(
    width * 0.18, height * 0.75,
    width * 0.1, height * 0.7,
    width * 0.05, height * 0.8
  );

  // Right edge of main trunk down to ground
  ctx.lineTo(width * 0.1, treeBaseY);

  ctx.fill();

  // Inner Bark Texture (Noise lines)
  ctx.save();
  ctx.clip(); // Only draw inside the tree shape we just filled
  ctx.strokeStyle = "rgba(42, 10, 10, 0.4)"; // Deep red texture
  ctx.lineWidth = 1;
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * width * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, height * 0.4 + Math.random() * height * 0.6);
    ctx.bezierCurveTo(
      x + 20, height * 0.5,
      x - 10, height * 0.7,
      x + 30, height
    );
    ctx.stroke();
  }

  // Rim Light / Moon Highlight on the right edge
  ctx.strokeStyle = "rgba(212, 175, 55, 0.4)"; // Gold highlight
  ctx.lineWidth = 2;
  ctx.shadowColor = "#F9D76E";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  // Trace the right side of the main body for the highlight
  ctx.moveTo(width * 0.1, treeBaseY);
  ctx.bezierCurveTo(width * 0.05, height * 0.8, width * 0.1, height * 0.7, width * 0.18, height * 0.75); // Lower under
  ctx.bezierCurveTo(width * 0.22, height * 0.7, width * 0.15, height * 0.65, width * 0.08, height * 0.55); // Middle cleft
  ctx.bezierCurveTo(width * 0.12, height * 0.5, width * 0.2, height * 0.38, width * 0.3, height * 0.3); // Top under
  ctx.stroke();
  ctx.restore(); // Remove clip and shadow

  // Add small, twisted sub-branches (twigs) extending off the main shape
  const drawTwig = (sx: number, sy: number, ex: number, ey: number, cpX: number, cpY: number, twigWidth: number) => {
    // Twigs get slightly brighter towards the tips catching light
    const twigGrad = ctx.createLinearGradient(sx, sy, ex, ey);
    twigGrad.addColorStop(0, "#140505");
    twigGrad.addColorStop(1, "#3d0e0e");

    ctx.strokeStyle = twigGrad;
    ctx.lineWidth = twigWidth;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cpX, cpY, ex, ey);
    ctx.stroke();
  };

  // Twigs off top branch
  drawTwig(width * 0.2, height * 0.38, width * 0.25, height * 0.25, width * 0.22, height * 0.3, 3);
  drawTwig(width * 0.28, height * 0.32, width * 0.35, height * 0.28, width * 0.32, height * 0.3, 1.5);

  // Twigs off lower branch
  drawTwig(width * 0.15, height * 0.65, width * 0.18, height * 0.6, width * 0.16, height * 0.62, 2);
  drawTwig(width * 0.22, height * 0.72, width * 0.3, height * 0.8, width * 0.25, height * 0.75, 1);

  // Trunk roots spreading
  drawTwig(width * 0.08, height * 0.9, width * 0.15, height - 10, width * 0.12, height * 0.95, 5);
  drawTwig(width * 0.06, height * 0.85, width * 0.2, height - 20, width * 0.15, height * 0.88, 3);
}
