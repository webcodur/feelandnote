// --- God Ray ---
export class GodRay {
  angle: number; width: number; length: number;
  opacity: number; phase: number; speed: number;
  constructor() {
    this.angle = (Math.random() - 0.5) * 1.2;
    this.width = Math.random() * 0.04 + 0.01;
    this.length = Math.random() * 0.6 + 0.4;
    this.opacity = Math.random() * 0.07 + 0.02;
    this.phase = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 0.004 + 0.001;
  }
  update() { this.phase += this.speed; }
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, vpX: number, vpY: number) {
    const flicker = Math.sin(this.phase) * 0.5 + 0.5;
    const alpha = this.opacity * flicker;
    if (alpha < 0.003) return;
    const reach = Math.max(w, h) * this.length;
    const dx = Math.sin(this.angle), dy = Math.cos(this.angle);
    const endX = vpX + dx * reach, endY = vpY + dy * reach;
    const halfW = this.width * reach;
    const grad = ctx.createLinearGradient(vpX, vpY, endX, endY);
    grad.addColorStop(0, `rgba(255,220,100,${alpha * 2})`);
    grad.addColorStop(0.3, `rgba(255,190,80,${alpha})`);
    grad.addColorStop(0.7, `rgba(255,160,60,${alpha * 0.4})`);
    grad.addColorStop(1, "rgba(255,140,40,0)");
    ctx.beginPath();
    ctx.moveTo(vpX - dx * 5, vpY - dy * 5);
    ctx.lineTo(endX - dy * halfW, endY + dx * halfW);
    ctx.lineTo(endX + dy * halfW, endY - dx * halfW);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// --- Sparkle ---
export class Sparkle {
  worldX: number; worldZ: number; phase: number;
  speed: number; size: number; brightness: number;
  constructor() {
    this.worldX = -Math.random() * 0.8 - 0.1;
    this.worldZ = Math.random();
    this.phase = Math.random() * Math.PI * 2;
    this.speed = Math.random() * 0.06 + 0.02;
    this.size = Math.random() * 2 + 0.5;
    this.brightness = Math.random() * 0.7 + 0.2;
  }
  update(so: number) {
    this.phase += this.speed;
    this.worldZ += so * 0.0004;
    if (this.worldZ > 1.1) {
      this.worldZ -= 1.2;
      this.worldX = -Math.random() * 0.8 - 0.1;
      this.brightness = Math.random() * 0.7 + 0.2;
    }
  }
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, vpX: number, _vpY: number, horizonY: number) {
    if (this.worldZ < 0) return;
    const t = this.worldZ;
    const screenY = horizonY + t * (h - horizonY);
    const screenX = vpX + this.worldX * t * w * 0.9;
    if (screenX < 0 || screenX > w || screenY < horizonY) return;
    const twinkle = Math.pow(Math.sin(this.phase) * 0.5 + 0.5, 3);
    const alpha = this.brightness * twinkle * Math.min(t * 3, 1);
    if (alpha < 0.02) return;
    const ds = this.size * (0.3 + t * 1.5);
    ctx.beginPath();
    ctx.arc(screenX, screenY, ds, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,230,140,${alpha})`;
    ctx.fill();
    if (ds > 1.5 && alpha > 0.25) {
      ctx.beginPath();
      ctx.arc(screenX, screenY, ds * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,215,80,${alpha * 0.12})`;
      ctx.fill();
    }
  }
}

// --- Foam ---
export class FoamParticle {
  worldZ: number; offset: number; size: number; opacity: number;
  constructor() {
    this.worldZ = Math.random();
    this.offset = (Math.random() - 0.5) * 0.06;
    this.size = Math.random() * 1.5 + 0.3;
    this.opacity = Math.random() * 0.4 + 0.1;
  }
  update(so: number) {
    this.worldZ += so * 0.0004;
    if (this.worldZ > 1.1) {
      this.worldZ -= 1.2;
      this.offset = (Math.random() - 0.5) * 0.06;
      this.opacity = Math.random() * 0.4 + 0.1;
    }
  }
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, vpX: number, horizonY: number, getShoreX: (t: number) => number) {
    if (this.worldZ < 0.02) return;
    const t = this.worldZ;
    const screenY = horizonY + t * (h - horizonY);
    const screenX = getShoreX(t) + this.offset * t * w * 0.9;
    if (screenX < 0 || screenX > w) return;
    const ds = this.size * (0.2 + t * 1.2);
    const alpha = this.opacity * Math.min(t * 4, 1);
    ctx.beginPath();
    ctx.arc(screenX, screenY, ds, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,245,220,${alpha})`;
    ctx.fill();
  }
}
