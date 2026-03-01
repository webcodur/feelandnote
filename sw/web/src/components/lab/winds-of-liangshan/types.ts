// ─── 상수 ───

export const LIGHT_X_RATIO = 0.75;
export const LIGHT_Y_RATIO = 0.15;
export const WATER_TOP_RATIO = 0.52;
export const WARM_SUN = "rgba(255, 220, 160,";
export const HAZE_MIST = "rgba(180, 200, 190,";
export const INK_SKY = "#2f3f4a";
export const INK_MOUNTAIN_FAR = "rgba(80, 100, 110,";
export const INK_MOUNTAIN_NEAR = "rgba(30, 45, 48,";
export const WATER_DEEP = "#1f4a45";
export const PARTICLE_COUNT = 50;

// ─── 인터페이스 ───

export interface MountainLayer {
  speed: number;
  color: string;
  heightMult: number;
  freq: number;
  amp: number;
  offset: number;
}

export interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

export interface Reed {
  x: number;
  y: number;
  height: number;
  segments: number;
  swayOffset: number;
  isMass: boolean;
  highlight: boolean;
}

export interface ReedCluster {
  centerX: number;
  width: number;
  density: number;
}

/** 각 draw 함수가 공유하는 화면 치수 + 헬퍼 */
export interface SceneContext {
  W: number;
  H: number;
  /** 광원 X */
  lx: number;
  /** 광원 Y */
  ly: number;
  /** 수면 상단 Y */
  wt: number;
  /** 카메라 스크롤 (px) — 사물 레이어용 */
  scroll: number;
}

/** x좌표를 스크롤+래핑 적용하여 반환. margin은 화면 밖 여유분 */
export function scrollWrap(x: number, scroll: number, W: number, margin = 0.2): number {
  const total = W * (1 + margin * 2);
  return (((x - scroll) % total) + total) % total - W * margin;
}

// ─── 유틸 ───

export function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

/** 카메라 스크롤 속도 (px/초) — 사물 레이어 기준 */
export const CAMERA_SPEED = 15;

export function makeSceneContext(W: number, H: number, time: number): SceneContext {
  return {
    W,
    H,
    lx: W * LIGHT_X_RATIO,
    ly: H * LIGHT_Y_RATIO,
    wt: H * WATER_TOP_RATIO,
    scroll: time * CAMERA_SPEED,
  };
}
