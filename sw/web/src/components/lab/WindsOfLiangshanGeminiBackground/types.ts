export interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  life: number;
  maxLife: number;
}

export interface Reed {
  x: number;
  heightInfo: number;
  thickness: number;
  swayOffset: number;
  isForeground: boolean;
  angle: number;
}

export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
}
