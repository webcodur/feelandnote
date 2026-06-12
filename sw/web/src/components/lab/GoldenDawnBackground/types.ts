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
