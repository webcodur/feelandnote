/**
 * ElevenLabs 보이스 목록의 거르기(필터)·정렬 공용 로직.
 * 셀럽 인물 보이스 매핑 패널과 세력도 보이스 콤보박스가 같은 `/api/elevenlabs/voices`
 * 응답을 쓰므로, 패싯 수집·필터·정렬·라벨 표기를 여기 한 곳에 둔다.
 */

/** 음성이 속한 ElevenLabs 계정 정보(목록 API가 음성마다 붙여준다). */
export type EleVoiceAccount = { id: string; label: string }

/** 두 검색대가 공유하는 최소 보이스 형태(둘의 타입이 이 모양을 만족한다). */
export type EleVoiceLike = {
  voice_id: string
  name: string
  category?: string | null
  labels?: Record<string, string> | null
  preview_url?: string | null
  description?: string | null
  account?: EleVoiceAccount | null
}

/**
 * 패싯(거를 수 있는 묶음) 표시 순서. 자주 쓰는 성별·나이·억양을 앞에.
 * 여기 없는 키도 자동 수집되어 뒤에 알파벳순으로 붙는다(꼬리표가 늘어도 코드 수정 불필요).
 */
export const FACET_ORDER = ['gender', 'age', 'accent', 'language', 'use_case', 'descriptive', 'category'] as const

/** 패싯 키 → 한국어 라벨. 없는 키는 키 자체를 보여준다. */
export const FACET_LABEL_KO: Record<string, string> = {
  category: '분류',
  gender: '성별',
  age: '나이',
  accent: '억양',
  language: '언어',
  use_case: '용도',
  descriptive: '느낌',
}

/** 패싯 값 → 한국어 표기(알려진 표준 값만). 없는 값은 원문 그대로. */
export const FACET_VALUE_KO: Record<string, string> = {
  male: '남성',
  female: '여성',
  neutral: '중성',
  young: '청년',
  middle_aged: '중년',
  old: '노년',
  premade: '기본',
  cloned: '복제',
  professional: '전문',
  generated: '생성',
  famous: '유명인',
  high_quality: '고품질',
}

export const facetLabel = (key: string) => FACET_LABEL_KO[key] ?? key
export const facetValueLabel = (value: string) => FACET_VALUE_KO[value] ?? value

export type EleSortKey = 'default' | 'name-asc' | 'name-desc' | 'category' | 'preview'

export const ELE_SORT_LABEL: Record<EleSortKey, string> = {
  default: '기본 순서',
  'name-asc': '이름 ㄱ→ㅎ',
  'name-desc': '이름 ㅎ→ㄱ',
  category: '분류별',
  preview: '미리듣기 있는 것 먼저',
}

/** 보이스에서 패싯 키 하나의 값을 꺼낸다. 'category' 는 별도 필드, 나머지는 labels 안. */
export function voiceFacetValue(v: EleVoiceLike, key: string): string | null {
  if (key === 'category') return v.category ?? null
  return v.labels?.[key] ?? null
}

export type Facet = { key: string; values: string[] }

/**
 * 보이스 전체를 훑어 패싯을 자동 수집한다. 분류(category)+모든 꼬리표 키를 모으고,
 * 키마다 실제 등장한 값을 정렬해 담는다. 값이 한 종류뿐인 패싯은 거를 의미가 없어 제외.
 */
export function collectFacets(voices: EleVoiceLike[]): Facet[] {
  const map = new Map<string, Set<string>>()
  const add = (key: string, val: string | null | undefined) => {
    if (!val) return
    if (!map.has(key)) map.set(key, new Set())
    map.get(key)!.add(val)
  }
  for (const v of voices) {
    add('category', v.category)
    if (v.labels) for (const [k, val] of Object.entries(v.labels)) add(k, val)
  }

  const orderIndex = (k: string) => {
    const i = (FACET_ORDER as readonly string[]).indexOf(k)
    return i === -1 ? FACET_ORDER.length : i
  }
  return [...map.entries()]
    .map(([key, set]) => ({ key, values: [...set].sort((a, b) => a.localeCompare(b)) }))
    .filter(f => f.values.length > 1)
    .sort((a, b) => {
      const d = orderIndex(a.key) - orderIndex(b.key)
      return d !== 0 ? d : a.key.localeCompare(b.key)
    })
}

/**
 * 선택된 패싯 값으로 보이스를 거른다.
 * 패싯 간 AND(성별=여성 그리고 용도=narration), 같은 패싯 값 사이 OR.
 */
export function matchesFacets(v: EleVoiceLike, active: Record<string, string[]>): boolean {
  for (const [key, vals] of Object.entries(active)) {
    if (!vals.length) continue
    const cur = voiceFacetValue(v, key)
    if (!cur || !vals.includes(cur)) return false
  }
  return true
}

/** 정렬. 'default' 는 입력 순서를 보존(원본을 복제만). */
export function sortVoices<T extends EleVoiceLike>(voices: T[], key: EleSortKey): T[] {
  const arr = [...voices]
  switch (key) {
    case 'name-asc':
      return arr.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':
      return arr.sort((a, b) => b.name.localeCompare(a.name))
    case 'category':
      return arr.sort((a, b) =>
        (a.category ?? '').localeCompare(b.category ?? '') || a.name.localeCompare(b.name))
    case 'preview':
      return arr.sort((a, b) =>
        Number(!!b.preview_url) - Number(!!a.preview_url) || a.name.localeCompare(b.name))
    default:
      return arr
  }
}
