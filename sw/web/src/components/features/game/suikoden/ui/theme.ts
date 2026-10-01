// 천도 v2 — 화면 색·치수 단일원천. 먹빛 바탕에 금선, 인주(印朱) 붉은빛, 비취 초록을 쓴다.

export const INK = {
  bg: '#08090c',
  panel: 'rgba(13, 15, 19, 0.92)',
  panelSolid: '#0f1116',
  raised: '#161920',
  line: 'rgba(212, 175, 55, 0.22)',
  lineStrong: 'rgba(212, 175, 55, 0.55)',
  gold: '#d4af37',
  goldBright: '#f3d57a',
  goldDim: '#8a732a',
  seal: '#c8452d',
  sealBright: '#e2583c',
  jade: '#3fb9a5',
  text: '#ece6d6',
  sub: '#a8a293',
  mute: '#6f6a60',
  ocean: '#0a1519',
  land: '#1a211d',
  landLine: 'rgba(236, 230, 214, 0.08)',
} as const

/** 세력 색을 배경용으로 흐리게 */
export function alpha(hex: string, a: number): string {
  const v = hex.replace('#', '')
  const r = parseInt(v.slice(0, 2), 16)
  const g = parseInt(v.slice(2, 4), 16)
  const b = parseInt(v.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
