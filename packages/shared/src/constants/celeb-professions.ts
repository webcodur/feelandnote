import professionData from './celeb-professions.json'

// 초기 직군 시드: 기존 오프라인 생성 도구의 호환용이다.
// 공개 웹·관리 화면의 직군 목록과 허용값은 DB celeb_professions에서 읽는다.
export const CELEB_PROFESSIONS: readonly (typeof professionData)[number][] = professionData

export type CelebProfession = (typeof CELEB_PROFESSIONS)[number]['value']
export type ProfessionOption = (typeof CELEB_PROFESSIONS)[number]

/** 번역 사전에 직군을 다시 나열하지 않고 공통 직군 데이터로 메시지를 만든다. */
export function getCelebProfessionMessages(locale: string, professions: readonly ProfessionOption[] = CELEB_PROFESSIONS): Record<string, string> {
  return Object.fromEntries(professions.map(({ value, label, label_en }) => [value, locale === 'en' ? label_en : label]))
}

/** 특정 직군에 전용 표현이 없으면 모든 직군에 동일한 기본 표현을 적용한다. */
export function mapCelebProfessions<T>(overrides: Readonly<Partial<Record<string, T>>>, fallback: T, professions: readonly ProfessionOption[] = CELEB_PROFESSIONS): Readonly<Record<string, T>> {
  return Object.fromEntries(professions.map(({ value }) => [value, overrides[value] ?? fallback]))
}

// 필터용 (전체 포함)
export const CELEB_PROFESSION_FILTERS = [
  { value: 'all' as const, label: '전체', label_en: 'All' },
  ...CELEB_PROFESSIONS,
] as const

// 유틸 함수
export const getCelebProfessionLabel = (value: string | null | undefined, locale?: string, professions: readonly ProfessionOption[] = CELEB_PROFESSIONS): string => {
  if (!value) return locale === 'en' ? 'Uncategorized' : '미분류'
  const normalized = value.toLowerCase()
  const profession = professions.find((p) => p.value.toLowerCase() === normalized)
  if (!profession) return value
  return locale === 'en' ? profession.label_en : profession.label
}

export const getCelebProfession = (value: string | null | undefined, professions: readonly ProfessionOption[] = CELEB_PROFESSIONS): ProfessionOption | null => {
  if (!value) return null
  return professions.find((p) => p.value === value) ?? null
}
