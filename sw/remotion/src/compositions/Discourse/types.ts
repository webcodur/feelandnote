/**
 * 가상 담화(Discourse) 시리즈 데이터 모델 — 단일원천(SSoT)
 *
 * 한 에피소드 = 한 논제. 그 자리에 인물 1~4명이 모인다.
 * 인물이 1명이면 순수 독백편, 여럿이면 반박·대담편이다. 같은 구조가 둘 다 소화한다.
 *
 * 팩션과의 결정적 차이: 뼈대가 인물 명단이 아니라 **발언 순서(turns)** 다.
 * 팩션은 인물 1명 = 1컷 = 1대사로 끝나지만, 담화는 같은 인물이 말했다 반박당했다 되받는다.
 * 그래서 인물의 실체(cast)와 발언(turns)을 분리하고, 발언이 cast를 인덱스로 가리킨다.
 *
 * 원천: 본서비스 가상 독백(profiles.virtual_monologue). 실제 발언이 아니므로 고지(notice)가 필수다.
 * 기획·규격 SSoT: docs/project/remotion/discourse.md
 */

import type { VoiceTimings } from '../../lib/voice-timing'

/** 영상 방향 — 담화는 세로 전용이지만 팩션과 시그니처를 맞춘다 */
export type Orientation = 'portrait' | 'landscape'

/**
 * 사진 맞춤 — 화면 비율과 안 맞는 사진을 채울(cover) 때 잘릴 위치와 확대 정도.
 * 미지정이면 가운데 채움. (팩션 FactionImageCrop과 동일 규격)
 */
export interface DiscourseImageCrop {
  /** 가로 초점 % (0=왼쪽, 50=가운데 기본, 100=오른쪽) */
  x?: number
  /** 세로 초점 % (0=위, 50=가운데 기본, 100=아래) */
  y?: number
  /** 확대 배율 (1=화면에 꼭 맞게 채움 기본) */
  scale?: number
}

/** 컷 진입 전환 — 팩션 transitions.tsx 와 같은 어휘를 쓴다(구현 공유) */
export type DiscourseTransition =
  | 'zoomout' | 'zoomin' | 'kenburns' | 'auto'
  | 'slide' | 'slideLeft' | 'slideRight'
  | 'glitch' | 'tear' | 'crt' | 'zoompunch' | 'whip' | 'filmburn' | 'pixelate' | 'shutter'

/** 컷 지속 효과 — 컷이 떠 있는 동안 사진에 거는 카메라 움직임. 미지정이면 none(정지) */
export type DiscourseHoldMotion =
  | 'none' | 'zoomin' | 'zoomout' | 'kenburns'
  | 'panLeft' | 'panRight' | 'zoomPulse' | 'handheld'

/** 음성 합성 엔진 — 렌더는 저장된 wav만 재생한다. 이 값은 BO 생성용 */
export type DiscourseEngine = 'gemini' | 'gemini-v3' | 'elevenlabs'

/**
 * 음성 합성 설정 한 벌.
 * 인물(Speaker)에 기본값을 두고, 발언(Turn)이 필요할 때만 덮어쓴다.
 * 팩션은 이 세트를 인물 필드에 quote·epithet 접두사로 두 벌 평면 나열했으나,
 * 담화는 인물 1명이 여러 번 말하므로 묶어서 계승 가능하게 만든다.
 */
export interface DiscourseVoice {
  /** 합성 엔진. 미지정이면 'gemini' */
  engine?: DiscourseEngine
  /** Gemini 보이스명 */
  speaker?: string
  /** ElevenLabs 보이스 ID (engine='elevenlabs' 일 때) */
  elevenlabsVoiceId?: string
  /** 발화 스타일 지시 — Gemini 합성 시 본문 앞에 "<지시>: " prefix 로 붙는다 */
  style?: string
  /** ElevenLabs 감정/강도 */
  eleOptions?: { stability?: number; style?: number }
  /** ElevenLabs 감정 태그 (0~2개) */
  eleEmotions?: string[]
  /** ElevenLabs 끝 패딩 — 미지정이면 켜짐(끝 음절 잘림 방지) */
  eleTrail?: boolean
}

/**
 * 등장 인물 한 명 — 실체만 담는다. 무슨 말을 하는지는 Turn 이 갖는다.
 * 한 파일에 한국어 + 영문(*En)을 함께 두고 로더가 언어별로 펼친다.
 */
export interface Speaker {
  /** 이름 (예: '진시황') */
  name: string
  /** 이름 영문 */
  nameEn?: string
  /**
   * 본서비스 셀럽 slug — 필수에 가깝다.
   * 이 값으로 가상 독백 원천·아바타·BO 등록 배지가 연결된다. 신화 인물만 예외.
   */
  slug?: string
  /** 직함·이력 줄 (최대 3줄). 작성 원칙은 팩션과 동일 — 1번째는 짧은 대표 직함 */
  lines?: string[]
  /** 직함·이력 줄 영문 */
  linesEn?: string[]
  /** 수식어 — 인물을 규정하는 한 문장. 소개 컷에서 낭독·표시 */
  epithet?: string
  /** 수식어 영문 */
  epithetEn?: string
  /** 수식어 낭독 음성 길이(초). 파이프라인이 기록. 없으면 글자 수 추정(무음) */
  epithetDuration?: number
  /** 생몰 (예: 'BC 259 ~ BC 210'). 시대 초월 조합에서 대비로 쓴다 */
  era?: string
  /** 인물 색 — 이름·자막 강조. 발언자 식별의 핵심 축이라 인물마다 다르게 준다 */
  color?: string
  /** 소개 컷 기본 이미지. 폴더 경로 또는 외부 URL(http로 시작) */
  image?: string
  /** 기본 이미지 맞춤 */
  imageCrop?: DiscourseImageCrop
  /** 이 인물 컷 지속 효과 기본값. 미지정이면 에피소드 전역 → none */
  holdMotion?: DiscourseHoldMotion
  /** 이 인물 컷 진입 전환 기본값. 미지정이면 에피소드 전역 */
  transition?: DiscourseTransition
  /** 이 인물 음성 기본 설정. 발언(Turn.voice)이 덮어쓴다 */
  voice?: DiscourseVoice
  /** true면 신화·전설 속 존재(실존 아님). 셀럽 DB 등록 대상이 아니다 */
  mythical?: boolean
  /** true면 생존 인물 — 고지·편성 판단에 쓴다(§3 고지 원칙) */
  living?: boolean
  /** true면 이 인물을 영상에서 제외(데이터 보존). turns 의 해당 발언도 함께 빠진다 */
  disabled?: boolean
}

/**
 * 발언 종류 — 화면 연출과 자막 리드가 갈린다.
 * - monologue: 독백. 앞 발언을 받지 않고 자기 사상을 말한다. 1인편은 전부 이것.
 * - accuse:    추궁. 앞 발언을 받지 않고 **상대를 불러세워 따진다.** 담화의 문을 여는 발언.
 * - rebuttal:  반박. 앞 발언을 자르거나 받아 뒤집는다. 난입 연출.
 * - reply:     재반박·응답. 반박을 받아 되받는다.
 * - agree:     동의·보강. 앞 발언에 힘을 보탠다.
 *
 * ⚠ 첫 발언을 monologue 로 여는 것을 기본으로 삼지 않는다.
 *   담화는 두 사람이 마주 앉은 자리다. 각자 허공에 대고 사상을 선언하며 시작하면 대담이 아니라 연설 두 개가 된다.
 *   상대를 부르고 따지는 accuse 로 열면 논제가 첫 컷에서 곧바로 선다(musk-altman 편에서 확립).
 */
export type TurnKind = 'monologue' | 'accuse' | 'rebuttal' | 'reply' | 'agree'

/**
 * 발언 하나 — 이 배열이 영상의 뼈대다.
 *
 * 음원 파일명은 배열 위치 기반(T01-<slug>.wav, voice-names.ts).
 * 위치가 밀리면 음원이 어긋나므로, 발언을 삽입·재배치할 때는 wav 도 함께 옮긴다.
 * slug 를 파일명에 넣은 이유가 이것이다 — 번호와 인물이 어긋나면 눈으로 잡힌다.
 */
export interface Turn {
  /** 발언자 — cast 배열 인덱스 (0-based) */
  cast: number
  /** 발언 종류 */
  kind: TurnKind
  /** 누구를 향한 발언인가 — cast 인덱스. 독백이면 생략 */
  to?: number
  /** 대사 (한국어) */
  text: string
  /** 대사 영문 */
  textEn?: string
  /**
   * 의미 덩어리 — 자막이 한 번에 뜨는 단위이자 이미지 교체의 기준점.
   * 렌더는 이걸 \n 으로 이어 표시한다. 없으면 text 를 통째로 쓴다.
   * **분할은 사람이 한다** (글자수 자동 분할 금지 — 의미·호흡 단위).
   */
  chunks?: string[]
  /** 영문 의미 덩어리 */
  chunksEn?: string[]
  /**
   * 실제 발언 원문(verbatim) — 이 대사가 실존 발언에 근거할 때만.
   * 재구성분과 실발언을 구분해 표시하는 신뢰 장치다. 없으면 순수 재구성.
   */
  origin?: string
  /** 원문 출처 (예: 'X, 2024-03-01' / '사기 진시황본기') */
  originRef?: string
  /** 이 발언 시작 이미지. 미지정이면 Speaker.image */
  image?: string
  /** 시작 이미지 맞춤 */
  imageCrop?: DiscourseImageCrop
  /**
   * 발언 도중 이미지 교체 — 지정한 의미 덩어리(chunks 인덱스, 0-based)부터 다른 사진으로 크로스페이드.
   * **인물 수와 이미지 장수는 무관하다.** 한 발언 안에서도 여러 번 넘어간다.
   * 전환 시각은 발화 시각(voiceTimings) 기준, 없으면 글자수 비례 폴백.
   */
  imageChanges?: { chunk: number; image: string; crop?: DiscourseImageCrop }[]
  /** 이 발언 컷 진입 전환. 미지정이면 인물 → 에피소드 전역 */
  transition?: DiscourseTransition
  /** 이 발언 컷 지속 효과. 미지정이면 인물 → 에피소드 전역 */
  holdMotion?: DiscourseHoldMotion
  /** 음성 길이(초). 파이프라인이 생성 후 기록. 있으면 컷 길이를 이 음원에 맞춘다 */
  duration?: number
  /** 음량 dB 게인 (기본 0) */
  gainDb?: number
  /** 재생 배속 (기본 1, 0.5~2) */
  playbackRate?: number
  /** 이 발언 음성 설정 — 인물 기본값(Speaker.voice)을 덮어쓴다. 톤이 바뀌는 발언에만 */
  voice?: DiscourseVoice
  /**
   * 쇼츠 편 구분. 쇼츠 렌더에 part 가 지정되면 그 편 발언만 나온다.
   * 미지정이면 모든 편 공통. 롱폼은 part 를 무시한다(전체 노출).
   */
  part?: number
  /** true면 이 발언을 영상에서 제외(데이터 보존) */
  disabled?: boolean
}

/** 배경음악 트랙 한 곡 */
export interface DiscourseTrack {
  /** public/music/ 하위 basename */
  file: string
  /** 곡 길이(초) — 순차 배치·순환 계산용 */
  durationSec?: number
  /** 음량 배율 (0~1, 미지정이면 1) */
  volume?: number
}

/**
 * 롱폼 배치 한 칸 — 편 경계(cut)만 우선 지원한다.
 * 담화는 발언 순서가 곧 영상 순서라 팩션처럼 블록을 재배치할 일이 없다.
 * 경계를 꽂으면 그 지점에서 롱폼이 여러 편(KO-LV1·KO-LV2…)으로 갈라진다.
 */
export type DiscourseLongformItem =
  | { cut: true }
  /**
   * 논제 매듭·장 표지 문구 — 통합형(앞부분\n뒷부분).
   * 바로 앞 { turn: n } 이 가리키는 발언 **앞**에 끼어든다.
   *
   * **마지막 매듭 카드**(담화가 무엇으로 끝났는지 남기는 표지)는 발언 개수와 같거나 큰 자리를 가리킨다.
   * 예: 발언이 15개면 `{ turn: 15 }, { era: {...} }` → 마지막 발언의 여운이 끝난 뒤 아웃트로 앞에 뜬다.
   * 존재하는 발언 자리를 가리키면 그 발언 앞에 끼어들어 매듭이 담화 중간에 박힌다(musk-altman 편 실제 사고).
   */
  | { era: { label: string; labelEn?: string } }
  /** 이 칸 앞까지의 발언 개수 — 배치 기준점 */
  | { turn: number }

/**
 * 에피소드 한 편 — **합쳐진 한 벌**.
 *
 * 디스크에는 세 파일로 나뉘어 있다: discourse-data.json(메타·편성) / cast.json(인물) / turns.json(발언).
 * 로더(script.ts)가 합쳐 이 타입으로 만들고, BO는 discourse-utils.ts 가 합치고 나눈다. 그 바깥은 나뉜 것을 모른다.
 * 세 파일 모두 한국어 필드 + 영문 필드(*En)를 함께 담고, 로더가 언어별로 펼친다.
 */
export interface DiscourseScript {
  /** 영상 명칭 — 통합 한 필드. 앞부분\n뒷부분(개행) */
  title: string
  /** 영상 명칭 영문 */
  titleEn?: string
  /** 쇼츠 편별 영상 명칭. 해당 part 렌더 시 title 대신 */
  titleByPart?: Record<number, string>
  /** 롱폼 편별 영상 명칭 */
  titleByLvPart?: Record<number, string>
  /** 논제 — 이 자리에서 무엇을 다투는가. 인트로에 크게 뜬다 */
  topic?: string
  /** 논제 영문 */
  topicEn?: string
  /** 시작문구 — 인트로에서 영상 주제를 먼저 알린다 */
  logline?: string
  /** 시작문구 영문 */
  loglineEn?: string
  /** 쇼츠 편별 시작문구 */
  loglineByPart?: Record<number, string>
  /** 쇼츠 편별 시작문구 영문 */
  loglineByPartEn?: Record<number, string>
  /**
   * 고지 문구 — **비워 두면 안 된다.**
   * 실존 인물이 실제로 하지 않은 말을 하는 시리즈라 오해 방지가 기능 요건이다.
   * 인트로 카드 + 화면 하단 상시 소자막 + 아웃트로 3중으로 노출한다(§3 고지 원칙).
   * 미지정이면 렌더가 기본 문구(constants.ts DEFAULT_NOTICE)를 쓴다.
   */
  notice?: string
  /** 고지 문구 영문 */
  noticeEn?: string
  /** 등장 인물 (1~4명). 1명이면 순수 독백편 */
  cast: Speaker[]
  /** 발언 순서 — 영상의 뼈대 */
  turns: Turn[]
  /** 롱폼 배치 — 편 경계·장 표지. 비면 발언 순서 그대로 통짜 한 편 */
  longformLayout?: DiscourseLongformItem[]
  /** 인물 소개 컷을 띄울지. 미지정이면 켜짐. 끄면 인트로 직후 바로 첫 발언 */
  showCastIntro?: boolean
  /** 컷 진입 전환 전역 기본 */
  transition?: DiscourseTransition
  /** 컷 지속 효과 전역 기본. 미지정이면 none(정지) */
  holdMotion?: DiscourseHoldMotion
  /** true면 지속 효과를 전부 끄고 정지. 떨림 점검·정적 연출용 */
  noZoom?: boolean
  /** 배경음악 basename (public/music/ 하위). tracks 가 있으면 무시 */
  music?: string
  /** 배경음악 복수 곡 — 순차·순환 재생 */
  tracks?: DiscourseTrack[]
  /** 발언 음성 재생 중 BGM 음량 배율(0~1). 미설정이면 덕킹 없음 */
  musicDuckVolume?: number
  /** 시작 화면 이미지 한 장. 있으면 인물 그리드 대신 이 이미지 */
  introImage?: string
  /** 마지막 화면 이미지 한 장. 있으면 브랜드 로고 대신 */
  outroImage?: string
  /** 인트로 지속 시간(초). 미지정이면 INTRO_SEC. 고지를 읽을 여유가 필요하면 늘린다 */
  introSec?: number
  /** 마지막 발언 끝 ~ 다음으로 넘어가기까지 화면 유지(초). 기본 timing.ts END_HOLD_SEC */
  endHoldSec?: number
  /** 종료 화면이 떠 있는 시간(초) */
  outroHoldSec?: number
  /** 종료 직전 검정 페이드아웃 길이(초) */
  endFadeSec?: number
  /** 시작 효과음 (public/common/sfx/ 하위) */
  startSfx?: string
  /** 롱폼 썸네일 전용 이미지. 미지정이면 첫 인물 이미지 폴백 */
  lvThumbnailImage?: string
  /**
   * 발화 시각 맵 — 키는 발언 자리 기반 wav stem (예 'T01-qin-shi-huang').
   * data.timing.<locale>.json 을 로더가 싣고 렌더가 조회해 자막 점등·이미지 교체를 음원에 맞춘다.
   * 데이터 파일에는 없다(로더 주입).
   */
  voiceTimings?: VoiceTimings
}
