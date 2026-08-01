/**
 * 세력도감(Faction) 시리즈 데이터 모델 — 단일원천(SSoT)
 *
 * 무대사·음악 기반. 한 에피소드 = 한 분야(예: LLM).
 * 분야 안에 「세력(팀/기업)」이 여러 개, 세력마다 「인물」이 여러 명.
 * 흐름: 타이틀 → (세력 카드 → 그 세력 인물 컷들) 반복 → 마지막 인물 컷에서 페이드아웃.
 */

import type { VoiceTimings } from '../../lib/voice-timing'
import type { ImageFilter } from './image-filters'

/** 영상 방향 — 'portrait'(세로 9:16 쇼츠, 기존)·'landscape'(가로 16:9 롱폼) */
export type Orientation = 'portrait' | 'landscape'

/**
 * 사진 맞춤 — 화면 비율과 안 맞는 사진(가로 사진 등)을 화면에 채울(cover) 때
 * 잘릴 위치(초점)와 확대 정도를 정한다. 미지정이면 가운데 채움(기존 동작과 동일).
 */
export interface FactionImageCrop {
  /** 가로 초점 % (0=왼쪽 끝, 50=가운데 기본, 100=오른쪽 끝). cover로 좌우가 잘릴 때 보일 위치 */
  x?: number
  /** 세로 초점 % (0=위 끝, 50=가운데 기본, 100=아래 끝). cover로 위아래가 잘릴 때 보일 위치 */
  y?: number
  /** 확대 배율 (1=화면에 꼭 맞게 채움 기본, >1 더 당겨 확대). 켄번스 줌 모션 위에 곱해진다 */
  scale?: number
}

/**
 * 줌 푸시인 목표점 — zoomin 지속 효과가 화면 중앙 쪽으로 끌어당길 지점(0~100%).
 * 카메라가 이 지점으로 다가가는 느낌을 낸다. 미지정 축은 사진맞춤(imageCrop) 위치 → 가운데(50)로 폴백.
 */
export interface ZoomFocus {
  /** 가로 목표 % (0=왼쪽, 50=가운데, 100=오른쪽) */
  x?: number
  /** 세로 목표 % (0=위, 50=가운데, 100=아래) */
  y?: number
}

/**
 * 인물 한 명.
 * 한 파일(faction-data.json)에 한국어 필드 + 영문 필드(*En)를 함께 둔다. 로더가 언어에 맞춰 펼친다.
 * 영문판: name←nameEn, lines←linesEn, quote←quoteEn 식으로 치환(없으면 한국어 값으로 폴백).
 */
export interface FactionPerson {
  /** 이름 (예: '샘 알트만') */
  name: string
  /** 이름 영문 (영문판에서 name 대체) */
  nameEn?: string
  /** 수식어·직책 (예: 'CEO', '딥러닝의 대부') */
  role?: string
  /** 이 인물 컷 진입 전환효과(세로 쇼츠). 미지정이면 세력→에피소드 설정을 따른다 */
  transition?: FactionTransition
  /** 이 인물 컷 지속 효과(머무는 동안 카메라 움직임). 미지정이면 세력→에피소드 설정을 따른다 */
  holdMotion?: HoldMotion
  /** 이 인물 컷 시작 효과(등장 직후 짧은 도입 임팩트). 미지정이면 세력→에피소드 설정을 따른다 */
  enterMotion?: EnterMotion
  /** 이 인물 컷 지지직 글리치(줌과 별개 축, 머무는 동안 지직거림). 미지정이면 세력→에피소드 설정→개인샷 기본 꺼짐 */
  holdGlitch?: GlitchSetting
  /** 이 인물 컷 흔들림(핸드헬드, 줌과 별개 축. 줌·이동 효과 위에 겹쳐 건다). 미지정이면 세력→에피소드 설정→꺼짐 */
  holdShake?: boolean
  /** 줌인(zoomin) 푸시인 목표점 — 카메라가 다가갈 지점. 미지정이면 사진맞춤 위치→가운데 */
  zoomFocus?: ZoomFocus
  /** 이 인물 줌·이동 속도 배수(1=기본). 미지정이면 세력→에피소드→1 */
  zoomSpeed?: number
  /**
   * 수식어 — 인물을 규정하는 한 문장(문장형 서술). 직함(lines)과는 별개 값이다.
   * 예: '1988년 사이퍼펑크 선언문을 세상에 던져, 암호로 국가의 감시를 끝내려 한 예언자'.
   * 세로 쇼츠에서 대사 인물의 이름 아래에 먼저 떠올라 읽힌 뒤, 직함 통합 연출처럼 대사로 교차된다.
   * (롱폼은 음성 소개로 따로 처리하므로 노출하지 않는다)
   */
  epithet?: string
  /** 수식어 영문 (영문판에서 epithet 대체) */
  epithetEn?: string
  /**
   * 수식어 나레이션 음성 길이(초) — 나레이터가 수식어를 낭독한 음원(FxxCxxPxx-epithet.wav)의 길이.
   * 파이프라인이 생성 후 기록한다. 있으면 수식어 노출 구간을 이 음원에 맞추고 재생한다. 없으면 글자 수 읽기 추정(무음).
   */
  epithetDuration?: number
  /** 수식어 나레이션 음량 dB 게인 (기본 0) */
  epithetGainDb?: number
  /** 수식어 나레이션 재생 배속 (기본 1, 0.5~2) */
  epithetPlaybackRate?: number
  /** 수식어 나레이션 합성 엔진 (BO 생성용 — 렌더는 저장된 wav만 재생) */
  epithetEngine?: 'gemini' | 'gemini-v3' | 'elevenlabs'
  /** 수식어 나레이션 Gemini 보이스명 (BO 생성용) */
  epithetSpeaker?: string
  /** 수식어 나레이션 ElevenLabs 보이스 ID (BO 생성용) */
  epithetElevenlabsVoiceId?: string
  /** 수식어 나레이션 발화 스타일 prefix (BO 생성용) */
  epithetStyle?: string
  /** 수식어 나레이션 ELE 감정/강도 (BO 생성용) */
  epithetEleOptions?: { stability?: number; style?: number }
  /** 수식어 나레이션 ELE 감정 태그 (BO 생성용) */
  epithetEleEmotions?: string[]
  /** 수식어 나레이션 ELE 끝 패딩 (BO 생성용) */
  epithetEleTrail?: boolean
  /** 수식어 표시 방식 — true=낭독(음원 재생), false=타이핑 소리+글자만(음원 무시). 미지정이면 음원 있으면 낭독·없으면 타이핑 */
  epithetNarrate?: boolean
  epithetNarrateShorts?: boolean
  epithetNarrateLongform?: boolean
  /** 직함 표시 방식 — true=타이핑 효과(글자씩 점등), false/미지정=순차 등장(기존) */
  linesTyping?: boolean
  linesTypingShorts?: boolean
  linesTypingLongform?: boolean
  /** 인물 직함·이력 줄 (3줄 권장). 한 줄씩 순차 등장한다 */
  lines?: string[]
  /** 인물 직함·이력 줄 영문 (영문판에서 lines 대체) */
  linesEn?: string[]
  /** 인물 한마디 대사 (선택) — 한국어 의역. 인물 컷 메인 대사 */
  quote?: string
  /** 카드뉴스용 짧은 대사 (선택) — 카드 한 장에 들어갈 축약 대사. 없으면 quote 를 쓴다 */
  quoteCard?: string
  /** 카드뉴스 물음표 카드 — 큰 문구(headline). 비우면 대표 직함(lines[0])으로 폴백. 영상 미사용 */
  cardHeadline?: string
  /** 카드뉴스 물음표 카드 — 소개글 본문. 비우면 epithet 으로 폴백. 영상 미사용 */
  cardBody?: string
  /** 카드뉴스 연표 카드 — 인물별 연도·사건(영상 미사용, SNS 카드 전용) */
  cardTimeline?: { title?: string; items: { year: string; text: string }[] }
  /**
   * 카드뉴스 스토리 — 인물 캐러셀 중심부, 인물당 3장 기준. 한 항목 = 카드 한 장. 문단들이 하단 스토리
   * 영역에 순서대로 떠서 넘길 때마다 한 이야기가 이어진다. image 는 그 장의 배경 컨셉샷(없으면 개인샷 폴백).
   * 영상 미사용, SNS 카드 전용.
   */
  cardStory?: { text: string; image?: string }[]
  /**
   * 카드뉴스 안내 서사 — 시작·마무리 장들의 하단 안내 구간 문구. 스토리(cardStory)와 한 호흡으로 이어지게
   * 인물마다 대본으로 쓴다(고정 템플릿 금지). 키는 장 종류: brief(첫 장)·quote(말)·identity(신원)·
   * logo(소속 세력)·shot(소속 그룹)·map(도감 위치)·about(안내). 비운 키는 그 장에서 안내 구간을 생략한다.
   * 영상 미사용, SNS 카드 전용.
   */
  cardGuides?: { brief?: string; quote?: string; identity?: string; logo?: string; shot?: string; map?: string; about?: string }
  /** 카드뉴스 얼굴 사진 — 신원·말 카드의 작은 원형 얼굴 전용(없으면 개인샷을 얼굴 크롭으로 폴백). 영상 미사용 */
  cardFace?: string
  /** 카드뉴스 게시 캡션 — 게시물과 함께 나갈 본문 글. feed=인스타·틱톡 캐러셀 캡션, threads=쓰레드 본문(글이 주인공, 첫 줄 후크), x=X 트윗 본문. 렌더 미사용(게시 시 복사용) */
  cardCaptions?: { feed?: string; threads?: string; x?: string }
  /** 카드뉴스 대사 장 배경 사진 — 대사 분위기에 맞는 컷. 폴백 없음: 비어 있으면 카드에 「대사 이미지 없음」 결함 표시. 영상 미사용 */
  cardQuoteImage?: string
  /** 대사 의미 덩어리(줄바꿈 단위, 선택) — 렌더는 이걸 \n으로 이어 표시한다. 없으면 quote를 통째로 쓴다 */
  quoteChunks?: string[]
  /** 대사 근거 — 원전의 핵심 내용과 가상 독백으로 재구성한 방향. 한국어판 대사 아래 보조로 띄운다 */
  quoteOrigin?: string
  /**
   * 어록 채굴 뱅크 — 후보 원문·번역·출처. 영상 채택 대사(quote)와 별개.
   * 조사 md 이관 결과. BO에서 후보 고를 때 참조.
   */
  minedQuotes?: { ref: string; en: string; ko: string }[]
  /** 어록 채굴 메모 */
  minedNote?: string
  /** 대사 다듬은 영문 — 영문판에서 quote를 대체하는 대사로 쓴다 */
  quoteEn?: string
  /** 영문 대사 의미 덩어리(줄바꿈 단위, 선택) — 영문판에서 quoteChunks를 대체. 렌더는 \n으로 이어 표시 */
  quoteEnChunks?: string[]
  /** 소속 (예: 'OpenAI') — 언어 공통 */
  org?: string
  /** 인물 이미지. images/ 하위 파일명(basename) 또는 외부 URL(http로 시작) */
  image?: string
  /** 인물 이미지 맞춤 — 잘릴 위치·확대. 미지정이면 가운데 채움 */
  imageCrop?: FactionImageCrop
  /**
   * 대사 도중 사진 교체 (선택) — 특정 의미 덩어리(quoteChunks 인덱스, 0-based)부터 다른 사진으로 부드럽게 전환.
   * 예: [{ chunk: 3, image: 'musk-2.webp' }] → 4번째 덩어리부터 musk-2 로 크로스페이드. image 가 컷 시작(0번째) 사진.
   * 전환 시각은 발화 시각(voiceTiming) 기준, 없으면 글자수 비례 폴백. 경로 규칙은 image 와 동일. 언어 공통.
   * crop 은 그 교체 사진의 맞춤(잘릴 위치·확대). 미지정이면 가운데 채움.
   * filter 는 그 교체 사진의 필터 효과.
   * zoomFocus 는 그 교체 사진 전용 줌 목표점. 미지정이면 인물 zoomFocus → crop 위치 → 가운데.
   */
  imageChanges?: { chunk: number; image: string; crop?: FactionImageCrop; filter?: ImageFilter; zoomFocus?: ZoomFocus }[]
  /**
   * 대사 시작 시점 사진 교체 (선택) — 직함을 소개하는 도입 구간에는 image(직함용)를 보이다가,
   * 대사가 시작되는 순간(quoteEnterSec) quoteImage(대사용)로 부드럽게 전환한다. 인물당 사진을
   * 두 장(예: 정면 소개컷 / 발화컷) 준비해 도입↔대사를 시각으로 구분할 때 쓴다.
   * imageChanges(대사 도중 덩어리별 교체)와 독립적으로 함께 적용된다. 경로 규칙은 image 와 동일. 언어 공통.
   */
  quoteImage?: string
  /** quoteImage 의 사진 맞춤(잘릴 위치·확대). 미지정이면 가운데 채움 */
  quoteImageCrop?: FactionImageCrop
  /** quoteImage 전용 줌 목표점. 미지정이면 인물 zoomFocus → quoteImageCrop 위치 → 가운데 */
  quoteZoomFocus?: ZoomFocus
  /** 대사 사진 필터 효과. 미지정이면 원본. 옵션: 'vintage'(옛날 필름), 'sepia'(세피아), 'grayscale'(흑백) 등 */
  quoteImageFilter?: 'vintage' | 'sepia' | 'grayscale' | 'duotone' | 'fade'
  /** 셀럽 DB에서 추가한 경우 slug — 아바타 재동기화·중복 판정용 */
  slug?: string
  /**
   * 관할 그룹 소속 — 신 팩션(Gods-*)에서 인물이 속한 관할 분류. 화면 묶음(clusters)과 별개로
   * 논리적 소속을 데이터로 명시해, 그룹 재배치(예: 제우스 주권→영역)를 클러스터 이동 없이 추적·검증한다.
   * 그리스 신 6종: 'sovereignty'(주권)·'dominion'(영역)·'war'(전쟁)·'order'(질서)·'desire'(욕망)·'craft'(기술과 전달).
   * 신화 아닌 시리즈에는 미사용.
   */
  domain?: string
  /** true면 신화·전설 속 존재(실존 인물 아님) — 셀럽 DB 등록 대상이 아니다. BO 배지에서 '신화'로 구분(미등록 경고 아님) */
  mythical?: boolean
  /** true면 이 인물을 영상에서 제외(데이터는 보존). 세력 disabled의 인물 단위 버전 */
  disabled?: boolean
  /** true면 이 인물만 세로 쇼츠에서 제외하고 가로 롱폼에는 노출한다 (묶음 longformOnly의 인물 단위 버전) */
  longformOnly?: boolean
  /**
   * 대사 처리 스텝 (신모델) — 3개 독립 토글. 켜진 스텝이 순서대로 나오고 마지막에 대사로 교차한다.
   * 흐름: (직함 2·3줄) → (수식어 타이핑) → (대사). 음성 스텝이 꺼지면 대사는 뜨지 않고 켜진 리드 스텝만 보이고 끝난다.
   * 세 값 중 하나라도 정의돼 있으면 신모델로 간주하고 quoteMode(레거시)는 무시한다.
   */
  /**
   * 세로 쇼츠 전용 대사 처리 스텝
   */
  stepCreditShorts?: boolean
  stepEpithetShorts?: boolean
  stepVoiceShorts?: boolean
  /**
   * 가로 롱폼 전용 대사 처리 스텝
   */
  stepCreditLongform?: boolean
  stepEpithetLongform?: boolean
  stepVoiceLongform?: boolean
  /** (레거시) 대사 노출 방식. 신모델(step*)로 대체됨 */
  quoteMode?: 'text' | 'voice' | 'credit'
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
  /**
   * 대사 화면 표시 방식 (인물 단위). 미지정이면 에피소드 기본(quoteDisplay) → 'box'.
   * - 'box': 기존 대사 박스(이름·직함 + 좌측 강조선 + Typewriter 큰 글씨)
   * - 'caption': 북리커맨드 쇼츠 작은 자막(글래스 태블릿). 이름·직함 리드는 유지, 대사만 작은 자막
   */
  quoteDisplay?: 'box' | 'caption'
  /**
   * 작은 자막 세로 위치 (quoteDisplay==='caption' 일 때). 미지정이면 에피소드 기본 → 'bottom'.
   * - 'bottom': MID 영역 하단 가운데
   * - 'center': MID 영역 중하단 밴드(정중앙이 아니라 아래쪽 중간)
   */
  quoteCaptionPos?: 'bottom' | 'center'
  /**
   * 작은 자막 폰트 및 스타일 (quoteDisplay==='caption' 일 때). 미지정이면 에피소드 기본 → 'default'.
   * - 'default': 기본 크기의 산세리프 폰트
   * - 'serif-large': 조금 더 큰 크기의 세리프(명조) 폰트
   */
  quoteCaptionSize?: 'default' | 'large'
  quoteCaptionFont?: 'default' | 'serif'
}

/**
 * 화보 묶음 — 한 세력을 여러 그룹 화보로 나눌 때 사용.
 * 예: Google DeepMind를 '창업자' 화보와 '딥마인드' 화보로 분리.
 */
export interface FactionCluster {
  /** 단체 명칭 — 통합 한 필드. 앞부분\n뒷부분(개행) 형태. 생략 시 미표시 */
  label?: string
  /** 단체 명칭 영문 (통합형, 앞부분\n뒷부분) */
  labelEn?: string
  /** 묶음 그룹 화보 이미지. images/ 하위 파일명(basename) 또는 외부 URL */
  image?: string
  /** 화보 맞춤 — 비율 유지(contain) 위에서 보일 위치·확대. 미지정이면 기본 정렬(가로 가운데·세로 위) */
  imageCrop?: FactionImageCrop
  /** 이 묶음의 카드뉴스용 소개글 (그룹샷 카드 하단에 노출) */
  cardBody?: string
  /** 이 묶음 인물 목록 */
  people: FactionPerson[]
  /** 이 그룹샷 지속 효과(머무는 동안 카메라 움직임). 미지정이면 세력→에피소드 설정을 따른다. 'zoomin'=다가가는 줌 */
  holdMotion?: HoldMotion
  /** 이 그룹샷 시작 효과(등장 직후 짧은 도입 임팩트). 미지정이면 세력→에피소드 설정을 따른다 */
  enterMotion?: EnterMotion
  /** 이 묶음(그룹샷) 지지직 글리치. 미지정이면 세력→에피소드 설정→그룹샷 기본 켜짐 */
  holdGlitch?: GlitchSetting
  /** 이 묶음(그룹샷) 흔들림(핸드헬드, 줌과 별개 축). 미지정이면 세력→에피소드 설정→꺼짐 */
  holdShake?: boolean
  /** 이 그룹샷 줌인 푸시인 목표점 — 카메라가 다가갈 지점. 미지정이면 사진맞춤 위치→가운데 */
  zoomFocus?: ZoomFocus
  /** 이 그룹샷 줌·이동 속도 배수(1=기본). 미지정이면 세력→에피소드→1 */
  zoomSpeed?: number
  /** true면 이 묶음만 세로 쇼츠에서 제외하고 가로 롱폼에는 노출한다 (세력은 그대로, 묶음 단위 분기) */
  longformOnly?: boolean
  /** true면 이 묶음을 영상에서 완전히 제외. 데이터는 보존되어 false로 되돌리면 그대로 살아난다 */
  disabled?: boolean
}

/** 세력(팀/기업) 하나 — 인물은 항상 그룹(clusters) 소속. 그룹명·그룹샷·인물 목록은 각 그룹(FactionCluster)이 가진다 */
export interface FactionGroup {
  /** 세력 명칭 — 통합 한 필드. 앞부분\n뒷부분(개행) 형태 (예: 'OpenAI\n모든 것의 시작') */
  name: string
  /** 이 세력의 카드뉴스용 소개글 (강령 카드 등 하단에 노출) */
  cardBody?: string
  /** 이 세력의 강령 타이틀 (기본: '세력 강령') */
  cardHeadline?: string
  /** 이 세력의 스토리 (스토리 카드 등에 노출) */
  cardStory?: { text: string; image?: string }[]
  /** 이 세력 인물 컷 진입 전환효과(세로 쇼츠). 미지정이면 에피소드 전역(script.transition)을 따른다 */
  transition?: FactionTransition
  /** 이 세력 인물 컷 지속 효과(머무는 동안 카메라 움직임). 미지정이면 에피소드 전역(script.holdMotion)을 따른다 */
  holdMotion?: HoldMotion
  /** 이 세력 시작 효과(등장 직후 짧은 도입 임팩트). 미지정이면 에피소드 전역(script.enterMotion)을 따른다 */
  enterMotion?: EnterMotion
  /** 이 세력 지지직 글리치(줌과 별개 축). 미지정이면 에피소드 전역(script.holdGlitch)을 따른다 */
  holdGlitch?: GlitchSetting
  /** 이 세력 흔들림(핸드헬드, 줌과 별개 축). 미지정이면 에피소드 전역(script.holdShake)을 따른다 */
  holdShake?: boolean
  /** 이 세력 줌·이동 속도 배수(1=기본). 미지정이면 에피소드 전역(script.zoomSpeed)을 따른다 */
  zoomSpeed?: number
  /** 세력 명칭 영문 (통합형, 앞부분\n뒷부분) */
  nameEn?: string
  /**
   * 본서비스 세력도감 연결 키 — celeb_tags.slug. BO 출간(DB·R2 반영)이 쓰는 값이다.
   * 렌더는 이 값을 무시하지만 BO 타입(faction-types.ts)과 구조를 맞추기 위해 둔다.
   */
  tagSlug?: string
  /** 테마 색 (hex). 세력 카드·인물 컷 강조색으로 사용 */
  color?: string
  /** 영상 로고 (타이틀 카드 풀스크린 배경, mp4 등). 있으면 logoImg 보다 우선. basename·폴더경로·URL */
  logoVid?: string
  /** 이미지 로고. 영상 타이틀 카드(logoVid 없을 때 풀스크린)·카드뉴스(표지 기본값·정체 카드 소속 배지) 공용 */
  logoImg?: string
  /** 로고(logoVid·logoImg) 타이틀 카드 표시 맞춤 — 비율 유지(contain) 위에서 보일 위치·확대. 미지정이면 기본 정렬 */
  logoCrop?: FactionImageCrop
  /**
   * 로고(타이틀 카드) 전용 움직임 효과 — 로고 화면에만 거는 효과.
   * 비면 세력 전역 효과를 따르며, 줌 목표점(zoomFocus)을 지정할 수 있다.
   */
  logoEffects?: {
    holdMotion?: HoldMotion
    enterMotion?: EnterMotion
    holdGlitch?: GlitchSetting
    holdShake?: boolean
    zoomSpeed?: number
    zoomFocus?: ZoomFocus
  }
  /**
   * 무소속 개인 모음 여부. true면 팀이 아니라 독립 인물군이다.
   * 화보(그룹샷) 컷을 생략하고 인물 컷만 순차 노출한다(타이틀 카드는 logoVid·logoImg 있으면 그대로). (예: '재야')
   */
  solo?: boolean
  /**
   * 그룹 목록 — 필수(1개 이상). 모든 인물은 그룹 소속이다.
   * 흐름: 세력 타이틀(1회) → 그룹마다 (화보 카드 → 그 인물 컷들). solo 세력은 화보 카드를 생략한다.
   */
  clusters: FactionCluster[]
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
 * 에피소드 한 편 (faction-data.json).
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

/**
 * 인물 컷 "지속 효과" — 컷이 떠 있는 동안(진입 전환이 끝난 뒤) 사진에 계속 거는 카메라 움직임.
 * 진입 전환(transition)과 별개 축이다. 컷 진입은 transition, 머무는 동안은 holdMotion이 담당한다.
 * 인물→세력→에피소드 순으로 계승하며, 어느 단계에서도 미지정이면 'none'(정지)이 기본이다.
 * (단, 레거시 호환: holdMotion이 전혀 없고 transition이 zoom류면 그 zoom을 지속 효과로 승계한다.)
 *   - none:      움직임 없이 고정
 *   - zoomin:    천천히 확대(집중·긴장)
 *   - zoomout:   천천히 축소(여운·물러남)
 *   - kenburns:  확대하며 위로 천천히 이동(다큐)
 *   - panLeft:   살짝 확대한 채 왼쪽으로 천천히 이동
 *   - panRight:  살짝 확대한 채 오른쪽으로 천천히 이동
 *   - zoomPulse: 심장박동처럼 미세하게 확대·축소를 반복(긴장)
 *   - handheld:  사람이 든 카메라처럼 미세하게 흔들림(현장감)
 */
export type HoldMotion =
  | 'none' | 'zoomin' | 'zoomout' | 'kenburns'
  | 'panLeft' | 'panRight' | 'zoomPulse' | 'handheld'

/**
 * 인물 컷 "시작 효과" — 컷이 등장한 직후 짧은 도입 임팩트(약 0.15초). 끝나면 제자리(1.0)로 정착해
 * 지속 효과(holdMotion)로 매끄럽게 이어진다. 전환(컷 교체 순간)·지속(컷 내내)과 구분되는 별개 축이다.
 *   - none:    도입 임팩트 없음
 *   - zoomout: 살짝 크게(1.1) 잡았다가 팍 빠지며 제자리로(예전 줌아웃 도입). 뒤에 지속 'zoomin'을 붙이면 예전 '줌아웃 후 줌인'.
 *   - zoomin:  살짝 작게 잡았다가 팍 다가오며 제자리로
 */
export type EnterMotion = 'none' | 'zoomin' | 'zoomout'

/** 지지직 모드 — light(내내 은은) / heavy(내내 강함, 기존) / tail(컷 끝 1초만 강하게, 전환 직전). */
export type GlitchLevel = 'light' | 'heavy' | 'tail'
/** 지지직 설정값 — 레거시 boolean 호환(true=heavy, false=끄기) + 강도 명시. */
export type GlitchSetting = boolean | GlitchLevel

/**
 * 시대 문구 카드 — 롱폼 배치(longformLayout)에서 세력 블록 사이에 끼우는 장(章) 표지 텍스트.
 * label 은 통합형 '앞부분\n뒷부분'(개행). 앞부분 크게·흰색, 뒷부분 강조색. 예: '4강\n패권을 다투다'.
 */
export interface FactionEra {
  /** 시대 문구 — 통합 한 필드(앞부분\n뒷부분) */
  label: string
  /** 시대 문구 영문 (통합형, 앞부분\n뒷부분) */
  labelEn?: string
}

/**
 * 챕터 전환(Chapter break) — 롱폼에서 여러 쇼츠 주제(챕터)를 한 영상에 이을 때 챕터 사이에 두는 전환 연출.
 * 편 경계(cut)와 달리 영상을 가르지 않고 한 영상 안에서 챕터를 넘긴다(쇼츠 미적용, 롱폼 전용).
 * 흐름: 이전 챕터 마지막 → [검정 브릿지: 이전 곡 페이드아웃 + 효과음 1회] → [챕터 표지: 배경 미디어 + 챕터 제목, 이 챕터 곡 페이드인] → 다음 챕터.
 * 배경음악 곡 경계도 이 지점에서 갈린다(챕터 표지 등장에 맞춰 새 곡이 열림).
 */
export interface FactionChapter {
  /** 챕터 제목 — 통합형(앞부분\n뒷부분). 앞부분(예 '챕터 2') 크게 흰색, 뒷부분(예 '감시에 맞서다') 강조색 */
  title: string
  /** 챕터 제목 영문 (통합형, 앞부분\n뒷부분) */
  titleEn?: string
  /** 챕터명을 공용 낭독 목소리로 읽을지. 미지정이면 narrator.readChapterTitle 전역값을 따른다 */
  narrate?: boolean
  /** 챕터명 음원의 길이·재생 설정. 목소리 설정은 공용 낭독값을 상속하고 여기 값만 우선한다 */
  voice?: FactionNarratorVoice
  /** 챕터 표지 배경 미디어 — 이미지 또는 비디오 한 장(경로·basename·http). 시작·종료 화면 미디어와 같은 규칙. mp4 등 비디오 지원 */
  media?: string
  /** 챕터 표지 배경 미디어 맞춤 — 잘릴 위치·확대. 미지정이면 가운데 채움 */
  mediaCrop?: FactionImageCrop
  /** 이 챕터부터 재생할 배경음악(public/music/ basename). 챕터 표지 등장에 맞춰 페이드인. 미지정이면 이전 곡을 이어간다 — 언어 공통 */
  music?: string
  /** 이 챕터 곡 음량 배율 (0~1, 미지정이면 1 = 원음) */
  musicVolume?: number
  /** 챕터 전환 효과음(public/common/sfx/ 하위). 검정 브릿지 진입 시 1회. 미지정이면 무음 */
  sfx?: string
  /** 검정 브릿지를 챕터 표지 앞에 둔다(미지정이면 켜짐). 이전 챕터를 검정으로 닫고 숨 고른 뒤 표지로 진입 */
  blackBefore?: boolean
  /** 검정 브릿지를 챕터 표지 뒤에 둔다(미지정이면 꺼짐, 확장용). 표지를 검정으로 닫고 다음 챕터로 진입 */
  blackAfter?: boolean
}

/**
 * 롱폼 배치 한 칸 — 세력 블록(group: 원래 세력 인덱스) / 시대 문구 카드(era) / 편 경계(cut) / 챕터 전환(chapter).
 * longformLayout 항목 순서대로 롱폼이 흐른다.
 * 편 경계(cut)를 꽂으면 롱폼이 그 지점에서 여러 편(KO-LV1·KO-LV2…)으로 갈라진다.
 * 경계가 하나도 없으면 기존처럼 통짜 한 편(KO-LV). 각 편은 자체 인트로·아웃트로를 갖는다.
 * 챕터 전환(chapter)은 영상을 가르지 않고 한 영상 안에서 챕터를 넘긴다(음악 곡 경계 겸용).
 */
export type FactionLongformItem =
  | { group: number }
  | { era: FactionEra }
  | { cut: true }
  | { chapter: FactionChapter }

/**
 * 나레이터 낭독 한 벌 — 텍스트 + 음성 설정. **필드명을 인물 대사(quote*)와 동일하게** 맞춰
 * BO 음성 패널(FactionExpandedVoicePanel + QUOTE_SLOT)을 무수정 재사용한다.
 * 렌더는 저장된 wav만 재생한다(인물 대사와 같은 규칙).
 */
export interface FactionNarratorVoice {
  /** 낭독 텍스트. 시작문구 낭독은 script.logline 사본(BO가 동기화), 마무리·소개 컷은 이 필드가 원본 */
  quote?: string
  /** 낭독 텍스트 영문 */
  quoteEn?: string
  /** 낭독 텍스트 의미 덩어리(자막 페이지 단위, 선택). 없으면 quote 통째 */
  quoteChunks?: string[]
  /** 영문 의미 덩어리 */
  quoteEnChunks?: string[]
  /** 음성 길이(초) — BO 저장 후 기록. 있으면 화면 길이를 음성에 맞춘다 */
  quoteDuration?: number
  /** 음량 dB 게인 (기본 0) */
  quoteGainDb?: number
  /** 재생 배속 (기본 1, 0.5~2) */
  quotePlaybackRate?: number
  /** 합성 엔진 (BO 생성용 — 렌더는 저장된 wav만 재생) */
  quoteEngine?: 'gemini' | 'gemini-v3' | 'elevenlabs'
  /** Gemini 보이스명 (BO 생성용) */
  quoteSpeaker?: string
  /** ElevenLabs 보이스 ID (BO 생성용) */
  quoteElevenlabsVoiceId?: string
  /** 발화 스타일 prefix (BO 생성용) */
  quoteStyle?: string
  /** ELE 감정/강도 (BO 생성용) */
  quoteEleOptions?: { stability?: number; style?: number }
  /** ELE 감정 태그 (BO 생성용) */
  quoteEleEmotions?: string[]
  /** ELE 끝 패딩 (BO 생성용) */
  quoteEleTrail?: boolean
}

/**
 * 공용 낭독자(옵션) — 화면에 등장하는 인물이 아니라 영상 제목·시작문구·수식어를 읽는 목소리다.
 *
 * logline의 음성 설정을 모든 인물 수식어의 기본값으로 물려준다. 인물의 epithet* 필드가 있으면
 * 그 값만 우선하므로 일부 인물만 다른 목소리로 예외 처리할 수 있다.
 *
 * name·label·image·intro·show*는 인격형 나레이터를 쓰던 초기 데이터의 하위 호환 필드다.
 * 새 편집 화면에서는 만들지 않으며, 기존 데이터에 intro가 남아 있을 때만 소개 컷을 보존한다.
 */
export interface FactionNarrator {
  /** 레거시 나레이터 이름. 공용 낭독자는 이름을 갖지 않는다 */
  name?: string
  /** 나레이터 이름 영문 */
  nameEn?: string
  /** 한 줄 소개 — 소개 컷에서 이름 아래 작게 표시 (예: '신들의 전령') */
  label?: string
  /** 한 줄 소개 영문 */
  labelEn?: string
  /** 나레이터 이미지 — 인물 image와 같은 경로 규칙(폴더 경로·basename·http). 소개 컷 배경 */
  image?: string
  /** 이미지 맞춤 — 잘릴 위치·확대. 미지정이면 가운데 채움 */
  imageCrop?: FactionImageCrop
  /** 시작 화면에서 영상 제목을 읽는다 (미지정=꺼짐) */
  readTitle?: boolean
  /** 시작 화면에서 시작문구를 읽는다 (미지정=켜짐, 기존 데이터 호환) */
  readLogline?: boolean
  /** 롱폼 챕터 표지에서 챕터명을 읽는다 (미지정=꺼짐) */
  readChapterTitle?: boolean
  /**
   * 공용 낭독 음성 설정 + 시작 낭독 음원의 길이.
   * 같은 음성 설정이 인물별 수식어 음성의 기본값으로 상속된다.
   */
  logline?: FactionNarratorVoice
  /** 마무리 낭독 — 닫는 한마디. 마무리 화면에 문구가 뜨고 음원이 재생된다 */
  outro?: FactionNarratorVoice
  /** 소개 컷 대사 — 비면 소개 컷 자체가 생략된다 */
  intro?: FactionNarratorVoice
  /** 세로 쇼츠에서 소개 컷 노출 (미지정=꺼짐 — 쇼츠는 시작문구 낭독만으로 연다) */
  showShorts?: boolean
  /** 롱폼에서 소개 컷 노출 (미지정=켜짐) */
  showLongform?: boolean
}

export interface FactionScript {
  /** 영상 명칭 — 통합 한 필드. 앞부분\n뒷부분(개행) 형태 (예: 'AI를 만드는 사람들\n1편 · LLM') */
  title: string
  /**
   * 롱폼(쇼츠 아님) 전용 배치 — 세력 블록 순서를 쇼츠와 다르게 직접 큐레이션하고, 사이사이 시대 문구 카드를 끼운다.
   * 항목 순서대로 롱폼이 흐른다(group=세력 블록 그대로, era=시대 문구 카드). 세력은 원래 인덱스를 참조하므로 음원·자막 키 무손상.
   * 비면 기존 동작(세력 배열 순서). 여기 빠진 활성 세력은 누락 방지로 맨 뒤에 자동으로 붙는다. 쇼츠 무영향 — 언어 공통.
   */
  longformLayout?: FactionLongformItem[]
  /** 인물 컷 진입 전환효과(세로 쇼츠) — 컷이 바뀌는 순간만. 미지정이면 크로스페이드 — 언어 공통 */
  transition?: FactionTransition
  /** 인물 컷 지속 효과 — 컷이 떠 있는 동안의 카메라 움직임(에피소드 전역 기본). 세력·인물이 덮어쓴다. 미지정이면 none(정지) — 언어 공통 */
  holdMotion?: HoldMotion
  /** 인물 컷 시작 효과 — 등장 직후 짧은 도입 임팩트(에피소드 전역 기본). 세력·인물·묶음이 덮어쓴다. 미지정이면 none — 언어 공통 */
  enterMotion?: EnterMotion
  /** 지지직 글리치 전역 기본(줌과 별개 축). 세력·인물·묶음이 덮어쓴다. 미지정이면 그룹샷 켜짐·개인샷 꺼짐 — 언어 공통 */
  holdGlitch?: GlitchSetting
  /** 흔들림(핸드헬드) 전역 기본(줌과 별개 축). 세력·인물·묶음이 덮어쓴다. 미지정이면 꺼짐 — 언어 공통 */
  holdShake?: boolean
  /** 줌·이동 속도 배수 전역 기본(1=기본). 세력·인물·묶음이 덮어쓴다 — 언어 공통 */
  zoomSpeed?: number
  /** true면 모든 컷의 효과(전환·시작·지속·지지직·속도)를 전역값으로 고정한다. 세력·인물·묶음 개별값은 보존되지만 무시된다(줌 목표점 제외) */
  lockEffects?: boolean
  /**
   * 대사 화면 표시 방식 — 에피소드 전역 기본. 인물 quoteDisplay 가 있으면 그쪽이 우선.
   * - 'box'(기본): 기존 대사 박스
   * - 'caption': 북리커맨드 쇼츠 작은 자막(글래스 태블릿)
   */
  quoteDisplay?: 'box' | 'caption'
  /**
   * 작은 자막 세로 위치 — 에피소드 전역 기본. 인물 quoteCaptionPos 가 있으면 그쪽이 우선.
   * - 'bottom'(기본): MID 영역 하단
   * - 'center': MID 영역 중하단 밴드(정중앙이 아니라 아래쪽 중간)
   */
  quoteCaptionPos?: 'bottom' | 'center'
  /**
   * 작은 자막 크기 — 에피소드 전역 기본. 인물 quoteCaptionSize 가 있으면 그쪽이 우선.
   * - 'default'(기본): 기본 크기
   * - 'large': 조금 더 큰 크기
   */
  quoteCaptionSize?: 'default' | 'large'
  /**
   * 작은 자막 폰트 — 에피소드 전역 기본. 인물 quoteCaptionFont 가 있으면 그쪽이 우선.
   * - 'default'(기본): 산세리프 폰트
   * - 'serif': 세리프(명조) 폰트
   */
  quoteCaptionFont?: 'default' | 'serif'
  /** true면 모든 컷의 지속 효과(줌·패닝 등)를 끄고 정지 화면으로 둔다. 영상 컷 떨림 점검·정적 연출용 — 언어 공통 */
  noZoom?: boolean
  /** 가로 롱폼 우상단 상태표시줄의 세력명 표기. true면 세력 명칭을 개행 포함 전체(앞부분+뒷부분)로, 미지정/false면 앞부분만 — 언어 공통 */
  statusFullName?: boolean
  /**
   * 한 편(쇼츠 part·롱폼) 종료 처리 — 마지막 인물 대사가 끝난 뒤 영상이 꺼지기까지.
   * endHoldSec:  (대사 후 대기) 마지막 인물 대사 끝 ~ 다음으로 넘어가기까지 그 인물 화면을 정지(줌인 멈춤)한 채 유지하는 시간(초). 기본 4.
   * outroHoldSec:(종료 화면 대기) 영상 끝 화면(브랜드 엔딩 또는 outroImage 종료 이미지)이 떠 있는 시간(초). 기본 2.5.
   * endFadeSec:  종료 직전 검정 페이드아웃 길이(초). 기본 3. 마지막에 보이는 화면(종료 화면이 있으면 그것, 없으면 마지막 인물 대기) 안에서 끝나도록, 그 화면 대기시간보다 길면 거기에 맞춘다.
   */
  endHoldSec?: number
  outroHoldSec?: number
  endFadeSec?: number
  /** 영상 명칭 영문 (통합형, 앞부분\n뒷부분) */
  titleEn?: string
  /** 편성 화면에서 관리할 쇼츠 편 수. 렌더 대상은 실제 group.part 값으로 결정한다. 미지정이면 기존 호환값 2 */
  shortsPartCount?: number
  /** 쇼츠 편별 영상 명칭(통합형, 앞부분\n뒷부분). 해당 part 렌더 시 title 대신 쓴다. 미지정이면 title */
  titleByPart?: Record<number, string>
  /** 롱폼 편별 영상 명칭(통합형). 편 경계(cut)로 가른 롱폼 n편(lvPart) 렌더 시 title 대신 쓴다. 미지정이면 title */
  titleByLvPart?: Record<number, string>
  /** 배경음악 파일 basename. public/music/ 하위 파일명 (예: 'drive.mp3'). 없으면 무음 — 언어 공통. tracks가 있으면 무시 */
  music?: string
  /**
   * 대사(voice 음성) 재생 중 BGM을 낮출 음량 배율(0~1). 예: 0.4 = 대사 때만 40%로 덕킹, 평소는 100%.
   * 미설정이면 덕킹하지 않는다(상시 원음). voice 인물 음성 구간에만 적용.
   */
  musicDuckVolume?: number
  /** 쇼츠 편(part)별 배경음악 basename. 편 분할 시 편마다 다른 BGM(그 편은 이 곡만 반복) */
  musicByPart?: Record<number, string>
  /** 쇼츠 편(part)별 배경음악 음량 배율(0~1, 미지정이면 1=원음) */
  musicVolumeByPart?: Record<number, number>
  /**
   * 배경음악 복수 곡 — 순서대로 이어 재생하고, 영상이 더 길면 처음부터 순환해 끝까지 채운다.
   * 롱폼이 길어 한 곡으로 부족할 때 쓴다. 있으면 music 대신 이걸 쓴다 — 언어 공통.
   */
  tracks?: FactionTrack[]
  /** 인트로에 띄울 핵심 인물 slug 목록. 있으면 텍스트 대신 인물 그리드(통합화면)로 시작한다 — 언어 공통 */
  heroes?: string[]
  /** 시작 화면(인트로)을 이 이미지 한 장으로 덮는다(경로·basename·http). 있으면 통합화면(heroes) 대신 이 이미지를 화면 가득 띄운다 — 언어 공통 */
  introImage?: string
  /** 마지막 화면(아웃트로)에 깔 이미지 한 장(경로·basename·http). 있으면 브랜드 로고 대신 이 이미지를 화면 가득 띄운다 — 언어 공통 */
  outroImage?: string
  /** 롱폼 전용 시작 화면(이미지·영상). 롱폼 렌더 시 introImage 대신 쓴다. 미지정이면 introImage(=쇼츠와 동일) — 언어 공통 */
  introImageLong?: string
  /** 롱폼 전용 마지막 화면(이미지·영상). 롱폼 렌더 시 outroImage 대신 쓴다. 미지정이면 outroImage(=쇼츠와 동일) — 언어 공통 */
  outroImageLong?: string
  /** 쇼츠 편(part)별 시작 화면(이미지·영상). 해당 편 렌더 시 introImage 대신 쓴다. 미지정 편은 공용 introImage — 언어 공통 */
  introImageByPart?: Record<number, string>
  /** 쇼츠 편(part)별 마지막 화면(이미지·영상). 해당 편 렌더 시 outroImage 대신 쓴다. 미지정 편은 공용 outroImage — 언어 공통 */
  outroImageByPart?: Record<number, string>
  /** true면 종료 화면(브랜드 로고·종료 이미지)을 두지 않고 마지막 인물 화면에서 검정으로 페이드아웃하며 끝낸다 — 언어 공통 */
  noOutro?: boolean
  /** 쇼츠 편(part)별 인트로 핵심 인물 slug. 해당 part 렌더 시 heroes 대신 쓴다. 미지정이면 heroes */
  heroesByPart?: Record<number, string[]>
  /** 롱폼 편(lvPart)별 인트로 핵심 인물 slug. 해당 롱폼 편 렌더 시 heroes 대신 쓴다. 미지정이면 heroes */
  heroesByLvPart?: Record<number, string[]>
  /** 시작/마지막 화면 배치 — 'row'(가로 한 줄·각 칸 세로로 김, 기본) | 'column'(세로 한 줄·각 칸 가로로 김) | 'grid'(2열 그리드) */
  heroLayout?: 'row' | 'column' | 'grid'
  /** 롱폼(LV) 썸네일 전용 이미지(DND 등록용). 미지정이면 첫 번째 인물 이미지로 폴백 */
  lvThumbnailImage?: string
  /** 인트로에 띄울 시작문구. 영상 명칭 앞부분·뒷부분 아래에 표시해 영상 주제를 먼저 알린다 — 언어 공통(en은 loglineEn) */
  logline?: string
  /** 시작문구 영문 */
  loglineEn?: string
  /** 쇼츠 편별 시작문구. 해당 part 렌더 시 logline 대신 쓴다. 미지정이면 logline */
  loglineByPart?: Record<number, string>
  /** 쇼츠 편별 시작문구 영문 */
  loglineByPartEn?: Record<number, string>
  /** 롱폼 편별 시작문구. 해당 롱폼 편(lvPart) 렌더 시 logline 대신 쓴다. 미지정이면 logline */
  loglineByLvPart?: Record<number, string>
  /** 롱폼 편별 시작문구 영문 */
  loglineByLvPartEn?: Record<number, string>
  /** 인트로(시작 화면) 지속 시간(초). 미지정이면 INTRO_SEC 기본값. 시작문구를 읽을 여유가 필요할 때 늘린다 */
  introSec?: number
  /**
   * 시작 화면(인트로) 전용 움직임 효과 — 첫 화면에만 거는 효과.
   * 세력 로고 카드(logoEffects)와 같은 형태다. 다만 시작 화면은 세력에 속하지 않아 전역을 상위로 두지 않고,
   * 비면 EDGE_HOLD_DEFAULT(천천히 확대)를 쓴다 — 첫 화면이 정지 사진처럼 굳어 있지 않게 하는 기본값이다.
   * 정지시키려면 지속 효과를 'none'으로 지정한다(전역 정지 스위치 noZoom 도 함께 존중한다).
   */
  introEffects?: {
    holdMotion?: HoldMotion
    enterMotion?: EnterMotion
    holdShake?: boolean
    zoomSpeed?: number
    zoomFocus?: ZoomFocus
  }
  /** 마무리 화면(아웃트로) 전용 움직임 효과 — 시작 화면(introEffects)과 같은 규칙. 비면 천천히 확대 */
  outroEffects?: {
    holdMotion?: HoldMotion
    enterMotion?: EnterMotion
    holdShake?: boolean
    zoomSpeed?: number
    zoomFocus?: ZoomFocus
  }
  /** 공용 낭독자(옵션) — 제목·시작문구와 인물 수식어에 같은 기본 목소리를 쓴다 */
  narrator?: FactionNarrator
  /** 로고 타이틀 카드(logoVid 또는 logoImg 있는 세력의 진입 화면) 1장 지속 시간(초). 미지정 시 GROUP_SEC(4). BO에서 오버라이드용 */
  groupSec?: number
  /**
   * 자막형(quoteDisplay='caption') 인물 화면에서 대사가 뜨기 전 이름·직함만 보이는 시간(초).
   * 미지정 시 CAPTION_ID_HOLD_SEC(1). 늘리면 그만큼 인물 컷 전체가 길어진다(대사 낭독은 그대로).
   */
  captionIdHoldSec?: number
  /** 그룹샷(화보 묶음) 카드 1장 지속 시간(초) — 단체사진 + 그룹명(cluster.label)이 뜨는 화면. 미지정 시 인원 수별 자동(clusterDurationSec, 2.6~3.2). 지정하면 인원 수와 무관하게 이 값으로 고정. BO에서 오버라이드용 */
  clusterSec?: number
  /** 시작 효과음 파일명(public/common/sfx/ 하위). 시작문구와 함께 울리고 같이 페이드아웃. 미지정이면 효과음 없음 */
  startSfx?: string
  /** 세력 로고(타이틀 카드) 등장 효과음 파일명(public/common/sfx/ 하위). 미지정이면 효과음 없음 */
  groupSfx?: string
  /**
   * 대사 음성 토막별 발화 시각 맵 (선택) — 키는 인물 자리 기반 wav stem(vnPersonQuote, 예 'F01C01P01-quote').
   * data.timing.<locale>.json 을 로더(script.ts)가 통째로 싣는다. 렌더가 인물 컷에서 stem 으로 조회해
   * 자막 페이지 전환·글자 점등을 실제 발화 시각에 맞춘다. 없으면 글자수 비례 폴백(로더가 언어별로 주입).
   */
  voiceTimings?: VoiceTimings
  /** 세력 목록 (등장 순서) */
  groups: FactionGroup[]
}
