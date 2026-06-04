/**
 * 세력도(Faction) 시리즈 데이터 모델 — 단일원천(SSoT)
 *
 * 무대사·음악 기반. 한 에피소드 = 한 분야(예: LLM).
 * 분야 안에 「세력(팀/기업)」이 여러 개, 세력마다 「인물」이 여러 명.
 * 흐름: 타이틀 → (세력 카드 → 그 세력 인물 컷들) 반복 → 아웃트로.
 */

/** 인물 한 명 */
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

/** 세력(팀/기업) 하나 */
export interface FactionGroup {
  /** 세력명 (예: 'OpenAI', '선구자') */
  name: string
  /** 한 줄 설명 (예: '모든 것의 시작') */
  tagline?: string
  /** 테마 색 (hex). 세력 카드·인물 컷 강조색으로 사용 */
  color?: string
  /** 로고 이미지 basename (optional). images/ 하위 파일명 */
  logo?: string
  /** 소속 인물 목록 */
  people: FactionPerson[]
}

/** 에피소드 한 편 */
export interface FactionScript {
  /** 에피소드 제목 (예: 'AI를 만드는 사람들') */
  title: string
  /** 부제 (예: '1편 · LLM') */
  subtitle?: string
  /** 배경음악 파일 basename. public/music/ 하위 파일명 (예: 'drive.mp3'). 없으면 무음 */
  music?: string
  /** 세력 목록 (등장 순서) */
  groups: FactionGroup[]
}
