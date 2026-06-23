/**
 * 세력도(Faction) 시리즈 데이터 모델 — 단일원천(SSoT)
 *
 * 무대사·음악 기반. 한 에피소드 = 한 분야(예: LLM).
 * 분야 안에 「세력(팀/기업)」이 여러 개, 세력마다 「인물」이 여러 명.
 * 흐름: 타이틀 → (세력 카드 → 그 세력 인물 컷들) 반복 → 마지막 인물 컷에서 페이드아웃.
 */

import type { VoiceTimings } from '../../lib/voice-timing'

/** 영상 방향 — 'portrait'(세로 9:16 쇼츠, 기존)·'landscape'(가로 16:9 롱폼) */
export type Orientation = 'portrait' | 'landscape'

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
  /** 이 인물 컷 전환효과(세로 쇼츠 사진 모션). 미지정이면 세력→에피소드 설정을 따른다 */
  transition?: FactionTransition
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
  /**
   * 대사 도중 사진 교체 (선택) — 특정 의미 덩어리(quoteChunks 인덱스, 0-based)부터 다른 사진으로 부드럽게 전환.
   * 예: [{ chunk: 3, image: 'musk-2.webp' }] → 4번째 덩어리부터 musk-2 로 크로스페이드. image 가 컷 시작(0번째) 사진.
   * 전환 시각은 발화 시각(voiceTiming) 기준, 없으면 글자수 비례 폴백. 경로 규칙은 image 와 동일. 언어 공통.
   */
  imageChanges?: { chunk: number; image: string }[]
  /** 셀럽 DB에서 추가한 경우 slug — 아바타 재동기화·중복 판정용 */
  slug?: string
  /** true면 이 인물을 영상에서 제외(데이터는 보존). 세력 disabled의 인물 단위 버전 */
  disabled?: boolean
  /**
   * 대사 처리 단계 (선택).
   * - 'voice': 음성 재생 + 대사 표시(발음/대표급). 직함 1번 줄만 이름 옆에 고정.
   * - 'text': 대사 텍스트만 뜨고 읽을 시간 확보(무음).
   * - 'credit': 직함만 보고 대사 없이 짧게 넘어감(직함 2·3번 줄까지 순차 노출).
   * - 'full': 직함 2·3번 줄을 순차로 다 보여준 뒤 → 같은 자리에서 음성 재생 + 대사로 교차(통합).
   * 미지정이면 세력 수장(세력 첫 인물)=voice, 나머지=text, 대사 자체가 없으면 credit.
   */
  quoteMode?: 'voice' | 'text' | 'credit' | 'full'
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
  /**
   * 쇼츠 편 구분 (선택). 한 에피소드를 여러 쇼츠 편으로 나눌 때 세력을 편에 배정한다.
   * 쇼츠 렌더에 part가 지정되면 그 part 세력만 나온다. 롱폼은 part 무시(전체 노출). 미지정이면 모든 part에 노출.
   */
  part?: number
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
 * 인물 컷 전환효과(세로 쇼츠).
 * 두 갈래다.
 * (A) 컷 내부 사진 모션 — 컷 안에서 사진이 움직인다. 컷 사이는 크로스페이드.
 *   - zoomout: 살짝 크게 잡았다 제자리로(기본)
 *   - zoomin: 컷 내내 천천히 확대
 *   - kenburns: 확대하며 위로 천천히 이동(다큐 느낌)
 *   - auto: 인물마다 위 효과를 번갈아 적용(지루함 방지)
 * (B) 컷 전환 효과 — 이전 인물 위로 다음 인물이 효과적으로 들어온다(이어지는 전환).
 *   - slideLeft: 두 인물이 함께 왼쪽으로 미끄러져 교체(다음 인물은 오른쪽에서). 경계 블러로 연결
 *   - slideRight: 두 인물이 함께 오른쪽으로 미끄러져 교체(다음 인물은 왼쪽에서)
 *   - slide: slideLeft 별칭(구버전 호환)
 *   - glitch: 아날로그 TV 치지직(색수차·스캔라인·떨림)
 *   - tear: 화면 가운데를 찢고 다음 인물이 벌어지며 나온다
 *   - crt: 브라운관 켜짐(가로 한 줄 → 세로 펼침 → 전체)
 *   - zoompunch: 다음 인물이 확 다가오며(과확대→정지) 모션블러로 꽂힘
 *   - whip: 빠른 좌우 쓸기 + 방향 모션블러
 *   - filmburn: 필름 타들어가듯 가장자리 불자국과 함께 드러남
 *   - pixelate: 모자이크로 뭉갰다 또렷하게 재조립
 *   - shutter: 가로 블라인드 띠가 열리며 교체
 */
export type FactionTransition =
  | 'zoomout' | 'zoomin' | 'kenburns' | 'auto'
  | 'slide' | 'slideLeft' | 'slideRight'
  | 'glitch' | 'tear' | 'crt' | 'zoompunch' | 'whip' | 'filmburn' | 'pixelate' | 'shutter'

export interface FactionScript {
  /** 에피소드 제목 (예: 'AI를 만드는 사람들') */
  title: string
  /** 인물 컷 전환효과(세로 쇼츠). 미지정이면 zoomout — 언어 공통 */
  transition?: FactionTransition
  /**
   * 한 편(쇼츠 part·롱폼) 종료 처리 — 마지막 인물 대사가 끝난 뒤 영상이 꺼지기까지.
   * endHoldSec:  (대사 후 대기) 마지막 인물 대사 끝 ~ 다음으로 넘어가기까지 그 인물 화면을 정지(줌인 멈춤)한 채 유지하는 시간(초). 기본 4.
   * outroHoldSec:(마지막 화면 대기) 종료 화면(outroSameAsIntro)이 떠 있는 시간(초). 종료 화면을 쓸 때만 의미. 기본 2.5.
   * endFadeSec:  종료 직전 검정 페이드아웃 길이(초). 기본 3. 마지막에 보이는 화면(종료 화면이 있으면 그것, 없으면 마지막 인물 대기) 안에서 끝나도록, 그 화면 대기시간보다 길면 거기에 맞춘다.
   */
  endHoldSec?: number
  outroHoldSec?: number
  endFadeSec?: number
  /** 제목 영문 */
  titleEn?: string
  /** 쇼츠 편(part)별 제목. 해당 part 렌더 시 title 대신 쓴다. 미지정이면 title */
  titleByPart?: Record<number, string>
  /** 부제 (예: '1편 · LLM') */
  subtitle?: string
  /** 부제 영문 */
  subtitleEn?: string
  /** 배경음악 파일 basename. public/music/ 하위 파일명 (예: 'drive.mp3'). 없으면 무음 — 언어 공통. tracks가 있으면 무시 */
  music?: string
  /**
   * 대사(voice 음성) 재생 중 BGM을 낮출 음량 배율(0~1). 예: 0.4 = 대사 때만 40%로 덕킹, 평소는 100%.
   * 미설정이면 덕킹하지 않는다(상시 원음). voice 인물 음성 구간에만 적용.
   */
  musicDuckVolume?: number
  /**
   * 쇼츠 편(part)별 배경음악 basename. 편 분할 시 편마다 다른 BGM.
   * 그 편은 이 곡만 반복 재생한다(세력별 music·전역 tracks 무시). 미지정 편은 기존 BGM 로직을 따른다.
   */
  musicByPart?: Record<number, string>
  /** 쇼츠 편(part)별 배경음악 음량 배율(0~1, 미지정이면 1=원음). musicByPart 곡에 적용 */
  musicVolumeByPart?: Record<number, number>
  /**
   * 배경음악 복수 곡 — 순서대로 이어 재생하고, 영상이 더 길면 처음부터 순환해 끝까지 채운다.
   * 롱폼이 길어 한 곡으로 부족할 때 쓴다. 있으면 music 대신 이걸 쓴다 — 언어 공통.
   */
  tracks?: FactionTrack[]
  /** 인트로에 띄울 핵심 인물 slug 목록. 있으면 텍스트 대신 인물 그리드로 시작한다 — 언어 공통 */
  heroes?: string[]
  /** 시작 화면(인트로)을 마지막 화면(아웃트로)에도 동일하게 재사용한다. */
  outroSameAsIntro?: boolean
  /** 쇼츠 편(part)별 인트로 핵심 인물 slug. 해당 part 렌더 시 heroes 대신 쓴다. 미지정이면 heroes */
  heroesByPart?: Record<number, string[]>
  /** 시작/마지막 화면 배치 — 'row'(가로 한 줄·각 칸 세로로 김, 기본) | 'column'(세로 한 줄·각 칸 가로로 김) | 'grid'(2열 그리드) */
  heroLayout?: 'row' | 'column' | 'grid'
  /** 쇼츠 편(part)별 부제(인트로에 표시). 해당 part 렌더 시 subtitle 대신 쓴다. 미지정이면 subtitle */
  subtitleByPart?: Record<number, string>
  /** 인트로에 띄울 한 줄 설명(로그라인). 제목·부제 아래에 표시해 영상 주제를 먼저 알린다 — 언어 공통(en은 loglineEn) */
  logline?: string
  /** 로그라인 영문 */
  loglineEn?: string
  /** 쇼츠 편(part)별 로그라인. 해당 part 렌더 시 logline 대신 쓴다. 미지정이면 logline */
  loglineByPart?: Record<number, string>
  /** 쇼츠 편(part)별 로그라인 영문 */
  loglineByPartEn?: Record<number, string>
  /** 인트로(시작 화면) 지속 시간(초). 미지정이면 INTRO_SEC 기본값. 로그라인을 읽을 여유가 필요할 때 늘린다 */
  introSec?: number
  /** 시작 효과음 파일명(public/common/sfx/ 하위). 로그라인과 함께 울리고 같이 페이드아웃. 미지정이면 효과음 없음 */
  startSfx?: string
  /** 세력 로고(타이틀 카드) 등장 효과음 파일명(public/common/sfx/ 하위). 미지정이면 효과음 없음 */
  groupSfx?: string
  /**
   * 대사 음성 토막별 발화 시각 맵 (선택) — 키는 인물 자리 기반 wav stem(vnPersonQuote, 예 'F01P01-quote').
   * data.timing.<locale>.json 을 로더(script.ts)가 통째로 싣는다. 렌더가 인물 컷에서 stem 으로 조회해
   * 자막 페이지 전환·글자 점등을 실제 발화 시각에 맞춘다. 없으면 글자수 비례 폴백(로더가 언어별로 주입).
   */
  voiceTimings?: VoiceTimings
  /** 세력 목록 (등장 순서) */
  groups: FactionGroup[]
}
