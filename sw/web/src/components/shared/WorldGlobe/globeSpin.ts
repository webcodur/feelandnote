const SPIN_MIN_MS = 480;
const SPIN_MAX_MS = 800;
const SAME_PLACE_DEG = 1;

export function shortestTurn(from: number, to: number): number {
  let delta = to - from;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

export function spinDurationMs(
  from: [number, number],
  to: [number, number],
): number {
  const deg = Math.hypot(shortestTurn(from[0], to[0]), to[1] - from[1]);
  const t = Math.sqrt(Math.min(deg, 180) / 180);
  return Math.round(SPIN_MIN_MS + t * (SPIN_MAX_MS - SPIN_MIN_MS));
}

export function isNearRotation(
  from: [number, number],
  to: [number, number],
): boolean {
  return (
    Math.abs(shortestTurn(from[0], to[0])) < SAME_PLACE_DEG &&
    Math.abs(to[1] - from[1]) < SAME_PLACE_DEG
  );
}

export function rotationAt(
  from: [number, number],
  to: [number, number],
  t: number,
): [number, number] {
  const eased = easeOutCubic(t);
  return [
    from[0] + shortestTurn(from[0], to[0]) * eased,
    from[1] + (to[1] - from[1]) * eased,
  ];
}

export const PULSE_MS = 900;

export type MarkerPulse = {
  id: string;
  start: number;
  duration: number;
};

export function pulseProgress(pulse: MarkerPulse, now: number): number | null {
  const t = (now - pulse.start) / pulse.duration;
  if (t < 0 || t >= 1) return null;
  return t;
}

export function pulseRing(
  t: number,
  lag = 0,
): { radius: number; alpha: number; width: number } | null {
  const local = t - lag;
  if (local < 0 || local >= 1) return null;
  const eased = 1 - (1 - local) ** 2;
  return {
    radius: 7 + eased * 56,
    alpha: (1 - eased) * 0.88,
    width: 2.6 * (1 - eased) + 0.8,
  };
}
