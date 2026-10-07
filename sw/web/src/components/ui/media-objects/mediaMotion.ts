import { animate, type MotionValue } from 'framer-motion'

export const MEDIA_HOVER_DURATION_MS = 180
export const FILM_HOVER_DURATION_MS = 600

/** 정면 도착을 스프링의 긴 감쇠 시간에 맡기지 않는다. */
export function animateMediaHover(progress: MotionValue<number>, active: boolean, durationMs = MEDIA_HOVER_DURATION_MS) {
  return animate(progress, active ? 1 : 0, {
    type: 'tween', duration: durationMs / 1000, ease: [.2, 0, .2, 1],
  })
}
