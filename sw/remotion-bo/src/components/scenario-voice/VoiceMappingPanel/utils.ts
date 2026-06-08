/** 에피소드 파일명 → 인물 slug. -en 접미사, -숫자 변형 제거. */
export function nameToSlug(name: string): string {
  const base = name.endsWith('-en') ? name.slice(0, -3) : name
  const m = base.match(/^(.+)-\d+$/)
  return m ? m[1] : base
}
