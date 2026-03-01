import { type Particle, type SceneContext, PARTICLE_COUNT } from "./types";

// ─── 파티클 생성 ───

export function generateParticles(W: number, H: number): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * W,
      y: H * 0.2 + Math.random() * H * 0.6,
      size: Math.random() * 2 + 0.5,
      speedX: Math.random() * 0.3 + 0.05,
      speedY: -Math.random() * 0.2 - 0.02,
      opacity: Math.random() * 0.4 + 0.15,
    });
  }
  return particles;
}

// ─── 파티클 렌더링 ───

export function drawParticles(
  c: CanvasRenderingContext2D,
  t: number,
  dt: number,
  particles: Particle[],
  s: SceneContext,
) {
  const maxDist = s.W * 0.6;

  particles.forEach((p) => {
    p.x += (p.speedX + Math.sin(t + p.y * 0.04) * 0.3 - 0.4) * dt * 60;
    p.y += p.speedY * dt * 60;
    if (p.x > s.W) p.x = 0;
    if (p.x < 0) p.x = s.W;
    if (p.y < 0) p.y = s.H;

    const distToLight = Math.hypot(p.x - s.lx, p.y - s.ly);
    const le = Math.max(0, 1 - distToLight / maxDist);

    const r = 200 + le * 55;
    const g = 210 + le * 40;
    const b = 190 + le * 30;

    c.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.opacity * (0.3 + le * 0.7)})`;
    c.beginPath();
    c.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    c.fill();
  });
}
