/**
 * 대사 구절 ↔ 사진 카드를 같은 색으로 묶는 색 묶음.
 *
 * 원고에서 사진이 걸린 구절의 배경색, 그 구절의 표식, 오른쪽 사진 카드의 테두리·머리띠가
 * 모두 이 한 벌을 공유한다. 어느 사진이 어디부터 화면에 걸리는지 눈으로 바로 대조된다.
 *
 * bg 는 대사칸 위에 얹는 옅은 색칠이라 진하게(/25) 잡아야 구획이 눈에 든다.
 * badge* 는 카드 머리띠·표식용 밝은 색 — 어두운 바탕에서 도드라지도록 밝은 쪽을 유지한다.
 *
 * 팩션(인물 대사)과 담화(발언 원고)가 함께 쓴다.
 */
export type AnchorTheme = {
  name: string
  bg: string
  text: string
  border: string
  badgeBg: string
  badgeText: string
}

export const ANCHOR_THEMES: AnchorTheme[] = [
  { name: 'amber', bg: 'bg-amber-400/25', text: 'text-amber-600', border: 'border-amber-400', badgeBg: 'bg-amber-100', badgeText: 'text-amber-800' },
  { name: 'blue', bg: 'bg-blue-400/25', text: 'text-blue-600', border: 'border-blue-400', badgeBg: 'bg-blue-100', badgeText: 'text-blue-800' },
  { name: 'emerald', bg: 'bg-emerald-400/25', text: 'text-emerald-600', border: 'border-emerald-400', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-800' },
  { name: 'violet', bg: 'bg-violet-400/25', text: 'text-violet-600', border: 'border-violet-400', badgeBg: 'bg-violet-100', badgeText: 'text-violet-800' },
  { name: 'rose', bg: 'bg-rose-400/25', text: 'text-rose-600', border: 'border-rose-400', badgeBg: 'bg-rose-100', badgeText: 'text-rose-800' },
  { name: 'cyan', bg: 'bg-cyan-400/25', text: 'text-cyan-600', border: 'border-cyan-400', badgeBg: 'bg-cyan-100', badgeText: 'text-cyan-800' },
]

/** 순번을 색으로 — 색 수를 넘어가면 처음부터 돌아간다 */
export const themeAt = (index: number): AnchorTheme => ANCHOR_THEMES[index % ANCHOR_THEMES.length]
