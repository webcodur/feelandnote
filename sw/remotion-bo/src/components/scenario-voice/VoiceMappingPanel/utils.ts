/** 에피소드 파일명 → 인물 slug. -en 접미사, -숫자 변형 제거. */
export function nameToSlug(name: string): string {
  const base = name.endsWith('-en') ? name.slice(0, -3) : name
  const m = base.match(/^(.+)-\d+$/)
  return m ? m[1] : base
}

// 패싯 수집·필터·정렬은 공용 모듈에 둔다(세력도 콤보박스와 공유). 기존 호출부 이름 유지용 re-export.
export { collectFacets, matchesFacets, sortVoices, voiceFacetValue } from '@/components/voice-utils'
export type { Facet } from '@/components/voice-utils'
