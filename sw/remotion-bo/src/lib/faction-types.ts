/**
 * 세력도(Faction) 데이터 모델 — BO 측 정의.
 * sw/remotion/src/compositions/Faction/types.ts 와 구조 동기화.
 */

export interface FactionPerson {
  /** 이름 (예: '샘 알트만') */
  name: string
  /** 수식어·직책 (예: 'CEO', '딥러닝의 대부') */
  role?: string
  /** 소속 (예: 'OpenAI') */
  org?: string
  /** 인물 이미지. images/ 하위 파일명(basename) 또는 외부 URL(http로 시작) */
  image?: string
  /** 셀럽 DB에서 추가한 경우 slug — 아바타 재동기화·중복 판정용 */
  slug?: string
}

export interface FactionGroup {
  /** 세력명 (예: 'OpenAI', '선구자') */
  name: string
  /** 한 줄 설명 */
  tagline?: string
  /** 테마 색 (hex) */
  color?: string
  /** 로고 이미지 basename 또는 URL */
  logo?: string
  /** 소속 인물 (등장 순서) */
  people: FactionPerson[]
}

export interface FactionScript {
  /** 에피소드 제목 */
  title: string
  /** 부제 */
  subtitle?: string
  /** 배경음악 basename (public/music/ 하위) */
  music?: string
  /** 세력 목록 (등장 순서) */
  groups: FactionGroup[]
}

/** 에피소드 목록 카드용 요약 */
export interface FactionEpisodeListItem {
  id: string
  title: string
  subtitle?: string
  groupCount: number
  personCount: number
  hasMusic: boolean
}
