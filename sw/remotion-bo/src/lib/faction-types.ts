/**
 * 세력도(Faction) 데이터 모델 — BO 측 정의.
 * sw/remotion/src/compositions/Faction/types.ts 와 구조 동기화.
 *
 * 한 파일(data.json)에 한국어 필드 + 영문 필드(*En)를 함께 둔다. 렌더 로더가 언어별로 펼친다.
 */

export interface FactionPerson {
  /** 이름 (예: '샘 알트만') */
  name: string
  /** 이름 영문 (영문판에서 name 대체) */
  nameEn?: string
  /** 수식어·직책 (예: 'CEO', '딥러닝의 대부') */
  role?: string
  /** 강렬한 한 줄 별칭 (legacy). lines가 있으면 무시 */
  epithet?: string
  /** 별칭 영문 (legacy) */
  epithetEn?: string
  /** 인물 설명 줄 (3줄 권장). 한 줄씩 수직 회전하며 순차 등장 */
  lines?: string[]
  /** 인물 설명 줄 영문 */
  linesEn?: string[]
  /** 인물 한마디 대사 (선택) — 한국어 의역. 인물 컷 메인 대사 */
  quote?: string
  /** 대사 점등 덩어리 (선택) — 순차 하이라이팅 단위. 없으면 quote를 통째로 처리 */
  quoteChunks?: string[]
  /** 대사 실제 원문(verbatim) — 한국어판에서 의역 아래 보조로 띄운다(신뢰·고증용) */
  quoteOrigin?: string
  /** 대사 다듬은 영문 — 영문판에서 quote를 대체하는 대사로 쓴다 */
  quoteEn?: string
  /** 영문 대사 점등 덩어리 (선택) — 영문판에서 quoteChunks를 대체 */
  quoteEnChunks?: string[]
  /** 소속 (예: 'OpenAI') — 언어 공통 */
  org?: string
  /** 인물 이미지. images/ 하위 파일명(basename) 또는 외부 URL(http로 시작) */
  image?: string
  /** 셀럽 DB에서 추가한 경우 slug — 아바타 재동기화·중복 판정용 */
  slug?: string
}

/**
 * 화보 묶음 — 한 세력을 여러 그룹 화보로 나눌 때 사용.
 * 예: Google DeepMind를 '창업자' 화보와 '딥마인드' 화보로 분리.
 */
export interface FactionCluster {
  /** 묶음 소제목 (예: '창업자', '딥마인드'). 생략 시 미표시 */
  label?: string
  /** 묶음 소제목 영문 */
  labelEn?: string
  /** 묶음 설명 한 줄 — 화보 카드에서 세력명 아래에 표시 */
  note?: string
  /** 묶음 설명 영문 */
  noteEn?: string
  /** 묶음 그룹 화보 이미지 basename 또는 URL */
  image?: string
  /** 이 묶음 인물 (등장 순서) */
  people: FactionPerson[]
}

export interface FactionGroup {
  /** 세력명 (예: 'OpenAI', '선구자') */
  name: string
  /** 세력명 영문 */
  nameEn?: string
  /** 한 줄 설명 */
  tagline?: string
  /** 한 줄 설명 영문 */
  taglineEn?: string
  /** 테마 색 (hex) */
  color?: string
  /** 로고 이미지 basename 또는 URL */
  logo?: string
  /** 세력 전체 그룹 화보 (clusters가 없는 팀의 화보 카드에 표시). basename·폴더경로·URL */
  image?: string
  /** 세력 로고 컨셉아트 (타이틀 카드 풀스크린 배경). 회사 등장 직전 진입 비주얼 */
  titleArt?: string
  /**
   * 무소속 개인 모음 여부. true면 팀이 아니라 독립 인물군이다.
   * 세력 카드(팀 등장)를 생략하고 인물 컷만 순차 노출한다. (예: '재야')
   */
  solo?: boolean
  /**
   * 화보 묶음 (optional). 있으면 한 세력을 여러 화보로 나눠 노출한다.
   * 흐름: 세력 타이틀(1회) → 묶음마다 (화보 카드 → 그 인물 컷들).
   */
  clusters?: FactionCluster[]
  /** 소속 인물 (clusters가 없을 때 사용) */
  people: FactionPerson[]
  /** true면 세로 쇼츠에서만 제외하고 가로 롱폼에는 노출한다 (쇼츠 3분 제한 대응) */
  longformOnly?: boolean
  /** true면 이 세력을 영상에서 완전히 제외. 데이터는 보존되어 false로 되돌리면 그대로 살아난다 */
  disabled?: boolean
}

export interface FactionScript {
  /** 에피소드 제목 */
  title: string
  /** 제목 영문 */
  titleEn?: string
  /** 부제 */
  subtitle?: string
  /** 부제 영문 */
  subtitleEn?: string
  /** 배경음악 basename (public/music/ 하위) — 언어 공통 */
  music?: string
  /** 인트로에 띄울 핵심 인물 slug 목록. 있으면 텍스트 대신 인물 그리드로 시작 — 언어 공통 */
  heroes?: string[]
  /** 마무리 화면 큰 제목 (한 편의 매듭). 없으면 title 사용 */
  outroTitle?: string
  /** 마무리 화면 큰 제목 영문 */
  outroTitleEn?: string
  /** 마무리 화면 한 줄 안내 (회차·분야 표기) */
  outroNote?: string
  /** 마무리 화면 한 줄 안내 영문 */
  outroNoteEn?: string
  /** 세력 목록 (등장 순서) */
  groups: FactionGroup[]
}

/** 세력도 진행 상태 — 할 일 / 공개 / 완료 */
export type FactionStatus = 'todo' | 'live' | 'done'

/** 에피소드 목록 카드용 요약 */
export interface FactionEpisodeListItem {
  id: string
  title: string
  subtitle?: string
  groupCount: number
  personCount: number
  hasMusic: boolean
  status: FactionStatus
}
