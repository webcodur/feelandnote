import type { CSSProperties } from "react";

export const GLOBE_MIN_HEIGHT = 280;
export const GLOBE_HEIGHT_PER_WIDTH = 0.9;
export const GLOBE_ASPECT_RATIO = "10 / 9";

export function globeHeightForWidth(width: number, maxHeight: number): number {
  return Math.max(
    GLOBE_MIN_HEIGHT,
    Math.min(width * GLOBE_HEIGHT_PER_WIDTH, maxHeight),
  );
}

/**
 * Reserves the globe's final responsive geometry before its client chunk or
 * canvas drawing work starts. The canvas bitmap can stay deferred offscreen
 * without changing document height when it enters the viewport.
 */
export function globeFrameStyle(maxHeight: number): CSSProperties {
  return {
    width: "100%",
    aspectRatio: GLOBE_ASPECT_RATIO,
    minHeight: GLOBE_MIN_HEIGHT,
    maxHeight,
  };
}
