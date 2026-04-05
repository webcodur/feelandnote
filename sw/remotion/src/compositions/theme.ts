/** 다크 모던 팔레트 — 전 컴포지션 공통 */
export const DARK = {
  /** 영상 전체 바닥 배경 */
  base: '#0d0b08',
  /** 패널·헤더·푸터 — base보다 깊게 */
  surface: '#0a0907',
  /** 그라데이션 중간톤 */
  mid: '#12100e',
  /** 그라데이션 피크 */
  peak: '#16130f',
  /** 그라데이션 중심 — 가장 따뜻한 다크 */
  glow: '#1a1510',
  /** 그라데이션 끝단 */
  edge: '#0e0c0a',
} as const

/** 자주 쓰는 다크 배경 그라데이션 */
export const DARK_BG = {
  /** 비네팅 — 중심 warm, 가장자리 base */
  radial: `radial-gradient(ellipse at 50% 40%, ${DARK.glow} 0%, ${DARK.base} 70%)`,
  /** 돌판 바 — 세로 웜 그라데이션 */
  stoneBar: `linear-gradient(180deg, ${DARK.base} 0%, ${DARK.mid} 20%, ${DARK.peak} 50%, ${DARK.mid} 80%, ${DARK.edge} 100%)`,
} as const
