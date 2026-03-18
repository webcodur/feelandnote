import type { Projected } from "./types";

// --- Perspective projection ---
export function project(
  worldX: number, worldY: number, worldZ: number,
  vpX: number, vpY: number, fov: number
): Projected {
  const scale = fov / (fov + worldZ);
  return { sx: vpX + worldX * scale, sy: vpY + worldY * scale, scale };
}

export const rgb = (c: readonly number[], a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${a})`;

export function quad(
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

// --- Seeded hash for deterministic stone variation ---
export function stoneHash(a: number, b: number, c: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return x - Math.floor(x);
}
