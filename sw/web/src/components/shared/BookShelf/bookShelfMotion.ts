import type { CSSProperties } from 'react'

/** 책장 안의 데이터 등장·내용 전환·높이 변화가 공유하는 리듬. */
export const BOOKSHELF_MOTION = {
  duration: 240,
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
} as const

export const BOOKSHELF_MOTION_STYLE = {
  '--bookshelf-duration': `${BOOKSHELF_MOTION.duration}ms`,
  '--bookshelf-easing': BOOKSHELF_MOTION.easing,
} as CSSProperties
