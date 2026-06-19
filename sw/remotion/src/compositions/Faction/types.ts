/**
 * 세력도(Faction) 시리즈 데이터 모델 — 단일원천(SSoT)
 *
 * 무대사·음악 기반. 한 에피소드 = 한 분야(예: LLM).
 * 분야 안에 「세력(팀/기업)」이 여러 개, 세력마다 「인물」이 여러 명.
 * 흐름: 타이틀 → (세력 카드 → 그 세력 인물 컷들) 반복 → 아웃트로.
 */

/**
 * 인물 한 명.
 * 한 파일(data.json)에 한국어 필드 + 영문 필드(*En)를 함께 둔다. 로더가 언어에 맞춰 펼친다.
 * 영문판: name←nameEn, lines←linesEn, quote←quoteEn 식으로 치환(없으면 한국어 값으로 폴백).
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
  /** 인물 설명 줄 (3줄 권장). 한 줄씩 수직 회전하며 순차 등장한다 */
  lines?: string[]
  /** 인물 설명 줄 영문 (영문판에서 lines 대체) */
  linesEn?: string[]
  /** 인물 한마디 대사 (선택) — 한국어 의역. 인물 컷 메인 대사 */
  quote?: string
  /** 대사 의미 덩어리(줄바꿈 단위, 선택) — 렌더는 이걸 \n으로 이어 표시한다. 없으면 quote를 통째로 쓴다 */
  quoteChunks?: string[]
  /** 대사 실제 원문(verbatim) — 한국어판에서 의역 아래 보조로 띄운다(신뢰·고증용) */
  quoteOrigin?: string
  /** 대사 다듬은 영문 — 영문판에서 quote를 대체하는 대사로 쓴다 */
  quoteEn?: string
  /** 영문 대사 의미 덩어리(줄바꿈 단위, 선택) — 영문판에서 quoteChunks를 대체. 렌더는 \n으로 이어 표시 */
  quoteEnChunks?: string[]
  /** 소속 (예: 'OpenAI') — 언어 공통 */
  org?: string
  /** 인물 이미지. images/ 하위 파일명(basename) 또는 외부 URL(http로 시작) */
  image?: string
  /** 셀럽 DB에서 추가한 경우 slug — 아바타 재동기화·중복 판정용 */
  slug?: string
  /** true면 이 인물을 영상에서 제외(데이터는 보존). 세력 disabled의 인물 단위 버전 */
  disabled?: boolean
  /** 대사 음성 길이(초). 파이프라인이 TTS 생성 후 기록한다. 있으면 인물 컷 길이를 이 음성에 맞춘다 */
  quoteDuration?: number
  /** 대사 음성 음량 dB 게인 (기본 0) */
  quoteGainDb?: number
  /** 대사 음성 재생 배속 (기본 1, 0.5~2) */
  quotePlaybackRate?: number
  /** 대사 음성 화자 ID (선택) — 인물별 Gemini 보이스명 오버라이드. 미지정이면 공용 기본 목소리 */
  quoteSpeaker?: string
  /**
   * 대사 음성 합성 엔진 (선택) — 'gemini'(2.5) | 'gemini-v3'(3.1) | 'elevenlabs'.
   * 미지정이면 'gemini'. 파이프라인(pnpm voice:faction)은 Gemini 만 자동 생성하고,
   * 'elevenlabs' 음원은 BO 미리듣기 패널에서 사용자가 직접 생성·저장한다(자동 생성 차단).
   */
  quoteEngine?: 'gemini' | 'gemini-v3' | 'elevenlabs'
  /** 대사 음성 ElevenLabs 보이스 ID (선택) — quoteEngine='elevenlabs' 일 때 사용. 미리듣기·사용자 생성용 */
  quoteElevenlabsVoiceId?: string
  /**
   * 대사 발화 스타일 지시 (선택) — Gemini 합성 시 텍스트 앞에 "<지시>: " prefix 로 붙는다.
   * 예: '강하고 단호하게', '낮고 간절하게'. 비면 기본 말투. 인물별로 톤을 저장해 같은 보이스라도
   * 대사 강약을 다르게 낸다. 파이프라인(pnpm voice:faction)이 이 값을 prefix 로 적용하고,
   * 매니페스트 해시에 포함해 스타일을 바꾸면 재생성을 트리거한다. 빈 문자열은 옵트아웃(스타일 없음).
   */
  quoteStyle?: string
  /**
   * 대사 ElevenLabs 감정/강도 옵션 (선택) — quoteEngine='elevenlabs' 미리듣기·사용자 생성에 반영.
   * 북리커맨드 ELE send options 중 인물 톤 표현에 필요한 최소(stability·style)만 둔다.
   * Gemini 합성에는 영향이 없다(스타일은 quoteStyle 로 표현). 렌더는 저장된 wav 만 재생한다.
   */
  quoteEleOptions?: {
    /** 발화 안정성 (0~1). 낮을수록 표현이 강하고 변화가 크다 */
    stability?: number
    /** 스타일 과장 (0~1). 높을수록 감정·억양이 강조된다 */
    style?: number
  }
  /**
   * 대사 ElevenLabs 감정 태그 (선택) — quoteEngine='elevenlabs' 미리듣기·사용자 생성에 반영.
   * 북리커맨드 ELE send options 의 emotions[] 에 대응. 0~2개. 비면 감정 태그 없이 합성한다.
   * 합성 시 본문 앞에 "[tag1, tag2] " 형태로 붙는다(북리커맨드 buildEleText 규칙 그대로).
   * Gemini 합성·렌더에는 영향이 없다(렌더는 저장된 wav 만 재생).
   */
  quoteEleEmotions?: string[]
  /**
   * 대사 ElevenLabs 끝 패딩 (선택) — 본문 끝에 ' ... ... ...' 추가 여부. 미지정이면 추가(기본 켜짐).
   * 끝 음절이 잘리는 현상을 줄인다. 명시적으로 false 일 때만 미적용.
   */
  quoteEleTrail?: boolean
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
  /** 묶음 설명 한 줄 — 화보 카드에서 세력명 아래에 표시 (예: '딥러닝 혁명을 일으킨 3대 석학') */
  note?: string
  /** 묶음 설명 영문 */
  noteEn?: string
  /** 묶음 그룹 화보 이미지. images/ 하위 파일명(basename) 또는 외부 URL */
  image?: string
  /** 이 묶음 인물 목록 */
  people: FactionPerson[]
  /** true면 이 묶음만 세로 쇼츠에서 제외하고 가로 롱폼에는 노출한다 (세력은 그대로, 묶음 단위 분기) */
  longformOnly?: boolean
}

/** 세력(팀/기업) 하나 */
export interface FactionGroup {
  /** 세력명 (예: 'OpenAI', '선구자') */
  name: string
  /** 이 세력 인물 컷 전환효과(세로 쇼츠). 미지정이면 에피소드 전역(script.transition)을 따른다 */
  transition?: FactionTransition
  /** 세력명 영문 */
  nameEn?: string
  /** 한 줄 설명 (예: '모든 것의 시작') */
  tagline?: string
  /** 한 줄 설명 영문 */
  taglineEn?: string
  /** 테마 색 (hex). 세력 카드·인물 컷 강조색으로 사용 */
  color?: string
  /** 로고 이미지 basename (optional). images/ 하위 파일명 */
  logo?: string
  /** 세력 전체 그룹 화보 (clusters가 없는 팀의 화보 카드에 표시). basename·폴더경로·외부 URL */
  image?: string
  /** 세력 로고 컨셉아트 (타이틀 카드 풀스크린 배경). 회사 등장 직전 진입 비주얼. basename·폴더경로·URL */
  titleArt?: string
  /**
   * 무소속 개인 모음 여부. true면 팀이 아니라 독립 인물군이다.
   * 세력 카드(팀 등장)를 생략하고 인물 컷만 순차 노출한다. (예: '재야')
   */
  solo?: boolean
  /**
   * 화보 묶음 (optional). 있으면 한 세력을 여러 화보로 나눠 노출한다.
   * 흐름: 세력 타이틀(1회) → 묶음마다 (화보 카드 → 그 인물 컷들).
   * 있을 때 people 대신 각 묶음의 people을 쓴다.
   */
  clusters?: FactionCluster[]
  /** 소속 인물 목록 (clusters가 없을 때 사용) */
  people: FactionPerson[]
  /**
   * 이 세력 구간 배경음악 (public/music/ basename).
   * 세력 진입 시 이전 곡을 페이드아웃하고 이 곡으로 교체한다(구간 동안 반복 재생).
   * 미지정이면 직전 세력의 곡을 그대로 이어간다 — 언어 공통.
   */
  music?: string
  /** 이 세력 곡 음량 배율 (0~1, 미지정이면 1 = 원음). 0.5 면 50%. 곡마다 음량 편차를 잡는 데 쓴다 */
  musicVolume?: number
  /** true면 세로 쇼츠에서만 제외하고 가로 롱폼에는 노출한다 (쇼츠 3분 제한 대응) */
  longformOnly?: boolean
  /** true면 이 세력을 영상에서 완전히 제외. 데이터는 보존되어 false로 되돌리면 그대로 살아난다 */
  disabled?: boolean
}

/** 배경음악 트랙 한 곡 — 복수 곡 순차 재생(롱폼 길이 충당)용 */
export interface FactionTrack {
  /** public/music/ 하위 파일 basename (예: 'drive.mp3') */
  file: string
  /** 곡 길이(초). 순차 배치·순환 계산에 쓴다. BO에서 음악 선택 시 자동 측정해 저장 */
  durationSec?: number
  /** 이 곡 음량 배율 (0~1, 미지정이면 1 = 원음). 0.5 면 50%. 곡마다 음량 편차를 잡는 데 쓴다 */
  volume?: number
}

/**
 * 에피소드 한 편 (data.json).
 * 한국어 필드 + 영문 필드(*En)를 함께 담는다. 로더가 언어별로 펼쳐 ko/en 두 영상의 소스가 된다.
 */
/**
 * 인물 컷 전환효과(세로 쇼츠 사진 모션).
 * - zoomout: 살짝 크게 잡았다 제자리로(기본)
 * - zoomin: 컷 내내 천천히 확대
 * - kenburns: 확대하며 위로 천천히 이동(다큐 느낌)
 * - slide: 옆에서 밀고 들어옴
 * - auto: 인물마다 위 효과를 번갈아 적용(지루함 방지)
 */
export type FactionTransition = 'zoomout' | 'zoomin' | 'kenburns' | 'slide' | 'auto'

export interface FactionScript {
  /** 에피소드 제목 (예: 'AI를 만드는 사람들') */
  title: string
  /** 인물 컷 전환효과(세로 쇼츠). 미지정이면 zoomout — 언어 공통 */
  transition?: FactionTransition
  /** 제목 영문 */
  titleEn?: string
  /** 부제 (예: '1편 · LLM') */
  subtitle?: string
  /** 부제 영문 */
  subtitleEn?: string
  /** 배경음악 파일 basename. public/music/ 하위 파일명 (예: 'drive.mp3'). 없으면 무음 — 언어 공통. tracks가 있으면 무시 */
  music?: string
  /**
   * 배경음악 복수 곡 — 순서대로 이어 재생하고, 영상이 더 길면 처음부터 순환해 끝까지 채운다.
   * 롱폼이 길어 한 곡으로 부족할 때 쓴다. 있으면 music 대신 이걸 쓴다 — 언어 공통.
   */
  tracks?: FactionTrack[]
  /** 인트로에 띄울 핵심 인물 slug 목록. 있으면 텍스트 대신 인물 그리드로 시작한다 — 언어 공통 */
  heroes?: string[]
  /** 마무리 화면 큰 제목 (한 편의 매듭). 없으면 title 사용 (예: 'AI를 만드는 사람들') */
  outroTitle?: string
  /** 마무리 화면 큰 제목 영문 */
  outroTitleEn?: string
  /** 마무리 화면 한 줄 안내 (회차·분야 표기). 예: 'LLM · 그 첫 번째 세력도' */
  outroNote?: string
  /** 마무리 화면 한 줄 안내 영문 */
  outroNoteEn?: string
  /** 마무리(아웃트로) 엔딩 이미지 (선택) — 한 장 풀스크린 배경, 그 위에 제목. basename·폴더경로·URL — 언어 공통 */
  outroImage?: string
  /** 세력 목록 (등장 순서) */
  groups: FactionGroup[]
}
