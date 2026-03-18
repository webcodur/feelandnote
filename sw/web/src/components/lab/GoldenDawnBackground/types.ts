export interface DrawContext {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  time: number;
  scrollOffset: number;
}

export interface BandDef {
  offset: number;
  color: string;
  seed: number;
}

export interface BandPath extends BandDef {
  pts: { x: number; y: number }[];
}

export interface Star {
  x: number;
  y: number;
  s: number;
  b: number;
}
