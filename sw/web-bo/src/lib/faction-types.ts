/**
 * 세력도감(Faction) 데이터 모델 — BO 측 정의.
 * sw/remotion/src/compositions/Faction/types.ts 와 구조 동기화.
 *
 * 한 파일(data.json)에 한국어 필드 + 영문 필드(*En)를 함께 둔다. 렌더 로더가 언어별로 펼친다.
 */

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
 * 카메라가 이 지점으로 다가가는 느낌. 미지정 축은 사진맞춤(imageCrop) 위치 → 가운데(50)로 폴백.
 */
export interface ZoomFocus {
  /** 가로 목표 % (0=왼쪽, 50=가운데, 100=오른쪽) */
  x?: number
  /** 세로 목표 % (0=위, 50=가운데, 100=아래) */
  y?: number
}

/**
 * 카드뉴스(SNS) 전용 필드 — 영상 렌더는 쓰지 않고, 세력도감 카드 미리보기·출고에만 쓴다.
 * 영상 데이터(faction-data.json)와 분리해 person-cards/<인물>.json 에 저장하고,
 * mergeFactionCards 가 인물 이름 키로 영상 인물에 병합한다.
 * remotion Faction/types.ts 의 인물 카드 필드와 구조 동기화.
 */
export interface FactionCardFields {
  /** 카드뉴스용 짧은 대사 — 카드 한 장에 들어갈 축약 대사. 없으면 quote 를 쓴다 */
  quoteCard?: string
  /** 카드뉴스 물음표 카드 큰 문구(headline). 비우면 대표 직함(lines[0])으로 폴백. 영상 미사용 */
  cardHeadline?: string
  /** 카드뉴스 물음표 카드 소개글 본문. 비우면 epithet 으로 폴백. 영상 미사용 */
  cardBody?: string
  /** 카드뉴스 연표 카드 — 인물별 연도·사건 (영상 미사용, SNS 카드 전용) */
  cardTimeline?: { title?: string; items: { year: string; text: string }[] }
  /**
   * 카드뉴스 스토리 — 인물 캐러셀 중심부(인물당 3장 기준). 한 항목 = 카드 한 장.
   * image 는 그 장의 배경 컨셉샷(없으면 개인샷 폴백). 영상 미사용, SNS 카드 전용.
   */
  cardStory?: { text: string; image?: string }[]
  /**
   * 카드뉴스 안내 서사 — 각 장 하단 안내 구간 문구. 키는 장 종류:
   * brief(첫 장)·quote(말)·identity(신원)·logo(소속 세력)·shot(소속 그룹)·map(도감 위치)·about(안내).
   * 비운 키는 그 장에서 안내 구간을 생략한다. 영상 미사용, SNS 카드 전용.
   */
  cardGuides?: { brief?: string; quote?: string; identity?: string; logo?: string; shot?: string; map?: string; about?: string }
  /** 카드뉴스 얼굴 사진 — 신원·말 카드의 작은 원형 얼굴 전용(없으면 개인샷 얼굴 크롭 폴백). 영상 미사용 */
  cardFace?: string
  /** 카드뉴스 게시 캡션 — feed=인스타·틱톡 캐러셀, threads=쓰레드 본문, x=X 트윗. 렌더 미사용(게시 시 복사용) */
  cardCaptions?: { feed?: string; threads?: string; x?: string }
  /** 카드뉴스 대사 장 배경 사진 — 비면 카드에 「대사 이미지 없음」 표시(폴백 없음). 영상 미사용 */
  cardQuoteImage?: string
}

/**
 * 세력 중심 카드뉴스 전용 필드 — 세력 철학, 스토리 등을 저장.
 * person-cards 와 유사하게 faction-cards.json 내 groups 에 저장된다.
 */
export interface FactionGroupCardFields {
  /** 세력 카드뉴스 표제(철학/모토) */
  cardHeadline?: string
  /** 세력 카드뉴스 소개/강령 본문 */
  cardBody?: string
  /** 세력 카드뉴스 스토리 (주요 갈등, 연혁 등) */
  cardStory?: { text: string; image?: string }[]
  /** 세력 카드뉴스 하단 안내 문구 */
  cardGuides?: { brief?: string; quote?: string; identity?: string; logo?: string; shot?: string; map?: string; about?: string }
  /** 세력 카드뉴스 게시 캡션 */
  cardCaptions?: { feed?: string; threads?: string; x?: string }
}

export interface FactionPerson extends FactionCardFields {
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
  /** 이 인물 컷 지지직 글리치(줌과 별개 축). 미지정이면 세력→에피소드 설정→개인샷 기본 꺼짐 */
  holdGlitch?: GlitchSetting
  /** 이 인물 컷 흔들림(핸드헬드, 줌과 별개 축. 줌·이동 위에 겹쳐 건다). 미지정이면 세력→에피소드 설정→꺼짐 */
  holdShake?: boolean
  /** 줌인(zoomin) 푸시인 목표점 — 카메라가 다가갈 지점. 미지정이면 사진맞춤 위치→가운데 */
  zoomFocus?: ZoomFocus
  /** 이 인물 줌·이동 속도 배수(1=기본). 미지정이면 세력→에피소드→1 */
  zoomSpeed?: number
  /** 수식어 — 인물을 규정하는 한 문장(문장형 서술). 직함(lines)과는 별개 값 */
  epithet?: string
  /** 수식어 영문 (영문판에서 epithet 대체) */
  epithetEn?: string
  /** 수식어 나레이션 음성 길이(초) — 나레이터 낭독 음원(FxxCxxPxx-epithet.wav) 길이. 있으면 노출 구간을 음원에 맞춰 재생 */
  epithetDuration?: number
  /** 수식어 나레이션 음량 dB 게인 (기본 0) */
  epithetGainDb?: number
  /** 수식어 나레이션 재생 배속 (기본 1, 0.5~2) */
  epithetPlaybackRate?: number
  /** 수식어 나레이션 합성 엔진 ('gemini'|'gemini-v3'|'elevenlabs') — 대사 음성과 별개로 둔다(나레이터 보이스) */
  epithetEngine?: 'gemini' | 'gemini-v3' | 'elevenlabs'
  /** 수식어 나레이션 Gemini 보이스명 */
  epithetSpeaker?: string
  /** 수식어 나레이션 ElevenLabs 보이스 ID */
  epithetElevenlabsVoiceId?: string
  /** 수식어 나레이션 합성 엔진 — 영문판. 국문(epithetEngine)과 따로 고른다 */
  epithetEngineEn?: 'gemini' | 'gemini-v3' | 'elevenlabs'
  /** 수식어 나레이션 ElevenLabs 보이스 ID — 영문판. 셀럽 프로필의 voice_id_en 과 짝이다 */
  epithetElevenlabsVoiceIdEn?: string
  /** 수식어 나레이션 발화 스타일 prefix (Gemini) */
  epithetStyle?: string
  /** 수식어 나레이션 ELE 감정/강도 */
  epithetEleOptions?: { stability?: number; style?: number }
  /** 수식어 나레이션 ELE 감정 태그 (0~2개) */
  epithetEleEmotions?: string[]
  /** 수식어 나레이션 ELE 끝 패딩 (미지정=켜짐) */
  epithetEleTrail?: boolean
  /** 수식어 표시 방식 — true=낭독(음원 재생), false=타이핑 소리+글자만(음원 무시). 미지정이면 음원 있으면 낭독·없으면 타이핑 */
  epithetNarrate?: boolean
  epithetNarrateShorts?: boolean
  epithetNarrateLongform?: boolean
  /** 직함 표시 방식 — true=타이핑 효과(글자씩 점등), false/미지정=순차 등장(기존) */
  linesTyping?: boolean
  linesTypingShorts?: boolean
  linesTypingLongform?: boolean
  /** 인물 직함·이력 줄 (3줄 권장). 한 줄씩 순차 등장 */
  lines?: string[]
  /** 인물 직함·이력 줄 영문 */
  linesEn?: string[]
  /** 인물 한마디 대사 (선택) — 한국어 의역. 인물 컷 메인 대사 */
  quote?: string
  /** 대사 점등 덩어리 (선택) — 순차 하이라이팅 단위. 없으면 quote를 통째로 처리 */
  quoteChunks?: string[]
  /** 대사 근거 — 원전의 핵심 내용과 가상 독백으로 재구성한 방향. 한국어판 대사 아래 보조로 띄운다 */
  quoteOrigin?: string
  /** 어록 채굴 뱅크 { ref, en, ko }[] — 조사 md 이관. 영상 quote와 별개 */
  minedQuotes?: { ref: string; en: string; ko: string }[]
  minedNote?: string
  /** 대사 다듬은 영문 — 영문판에서 quote를 대체하는 대사로 쓴다 */
  quoteEn?: string
  /** 영문 대사 점등 덩어리 (선택) — 영문판에서 quoteChunks를 대체 */
  quoteEnChunks?: string[]
  /** 소속 (예: 'OpenAI') — 언어 공통 */
  org?: string
  /** 인물 이미지. images/ 하위 파일명(basename) 또는 외부 URL(http로 시작) */
  image?: string
  /** 인물 이미지 맞춤 — 잘릴 위치·확대. 미지정이면 가운데 채움 */
  imageCrop?: FactionImageCrop
  /**
   * 대사 도중 사진 교체 (선택) — 특정 의미 덩어리(quoteChunks 인덱스, 0-based)부터 다른 사진으로 부드럽게 전환.
   * 예: [{ chunk: 3, image: 'musk-2.webp' }] → 4번째 덩어리부터 전환. image 가 컷 시작(0번째) 사진. 언어 공통.
   * crop 은 그 교체 사진의 맞춤(잘릴 위치·확대). 미지정이면 가운데 채움.
   * filter 는 그 교체 사진의 필터 효과.
   * zoomFocus 는 그 교체 사진 전용 줌 목표점. 미지정이면 인물 zoomFocus → crop 위치 → 가운데.
   */
  imageChanges?: { chunk: number; image: string; crop?: FactionImageCrop; filter?: string; zoomFocus?: ZoomFocus }[]
  /**
   * 대사 시작 시점 사진 교체 (선택) — 도입(직함 소개) 구간엔 image(직함용)를 보이다가,
   * 대사가 시작되는 순간 quoteImage(대사용)로 부드럽게 전환한다. imageChanges 와 독립적으로 함께 적용.
   * 경로 규칙은 image 와 동일. 언어 공통.
   */
  quoteImage?: string
  /** quoteImage 의 사진 맞춤(잘릴 위치·확대). 미지정이면 가운데 채움 */
  quoteImageCrop?: FactionImageCrop
  /** quoteImage 전용 줌 목표점. 미지정이면 인물 zoomFocus → quoteImageCrop 위치 → 가운데 */
  quoteZoomFocus?: ZoomFocus
  /** 대사 사진 필터 효과. 미지정이면 원본 */
  quoteImageFilter?: string
  /** 셀럽 DB에서 추가한 경우 slug — 아바타 재동기화·중복 판정용 */
  slug?: string
  /** 관할 그룹 소속(신 팩션 Gods-*). 화면 묶음과 별개로 논리적 소속을 명시해 그룹 재배치를 추적한다. 그리스: sovereignty·dominion·war·order·desire·craft */
  domain?: string
  /** 신화·전설·허구 인물. 본서비스 fiction 프로필과 가상 독백 연결 대상으로 쓴다 */
  mythical?: boolean
  /**
   * 셀럽 DB 인물 식별자(profiles.id, 불변 UUID) — 보이스·셀럽 정보 연동의 단일 열쇠.
   * slug·이름이 바뀌어도 안 끊긴다. 셀럽 검색으로 추가하면 자동으로 박힌다.
   */
  celebId?: string
  /** true면 이 인물을 영상에서 제외(데이터는 보존). 세력 disabled의 인물 단위 버전 */
  disabled?: boolean
  /** 켜면 이 인물만 세로 쇼츠에서 빠지고 가로 롱폼에는 그대로 나온다 */
  longformOnly?: boolean
  /**
   * 대사 처리 스텝 (신모델) — 3개 독립 토글. 켜진 스텝이 순서대로 나오고 마지막에 대사로 교차한다.
   * 흐름: (직함 2·3줄) → (수식어 타이핑) → (대사). 음성이 꺼지면 대사는 안 뜨고 켜진 리드 스텝만 보이고 끝.
   * 세 값 중 하나라도 정의돼 있으면 신모델로 간주(quoteMode 무시).
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
  /**
   * 대사 처리 단계 (레거시 — 신모델 스텝이 없을 때만 환산).
   * - 'voice': 음성+대사. - 'text': 대사만(무음). - 'credit': 직함만. - 'full': 직함 뒤 음성+대사. 미지정이면 자동.
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
   * 미지정이면 'gemini'. 파이프라인은 Gemini 만 자동 생성, 'elevenlabs' 는 미리듣기 패널에서 사용자가 직접 생성·저장.
   */
  quoteEngine?: 'gemini' | 'gemini-v3' | 'elevenlabs'
  /** 대사 음성 ElevenLabs 보이스 ID (선택) — quoteEngine='elevenlabs' 일 때 사용. 미리듣기·사용자 생성용 */
  quoteElevenlabsVoiceId?: string
  /**
   * 대사 음성 합성 엔진 — **영문판**. 국문(quoteEngine)과 따로 고른다.
   *
   * 국문과 한 칸을 나눠 쓰지 않는 이유: 영문 목소리를 채우며 엔진을 바꾸면 국문 합성 엔진까지
   * 함께 바뀐다. 언어마다 잘 맞는 엔진이 다르므로(국문 GEM · 영문 ELE 같은 조합) 칸을 갈랐다.
   *
   * ⚠ 음성 합성 파이프라인은 아직 이 값을 읽지 않는다 — `--lang en` 으로 돌려도 국문 엔진(quoteEngine)을
   *   따른다. 현재는 백오피스 편집기의 미리듣기·수동 생성과 셀럽 목소리 연동에만 쓰인다.
   */
  quoteEngineEn?: 'gemini' | 'gemini-v3' | 'elevenlabs'
  /**
   * 대사 음성 ElevenLabs 보이스 ID — **영문판**. 셀럽 프로필의 `voice_id_en` 과 짝이다
   * (국문 `quoteElevenlabsVoiceId` ↔ `voice_id_ko`). 위와 같은 이유로 파이프라인은 아직 안 읽는다.
   */
  quoteElevenlabsVoiceIdEn?: string
  /**
   * 대사 발화 스타일 지시 (선택) — Gemini 합성 시 텍스트 앞에 "<지시>: " prefix 로 붙는다.
   * 예: '강하고 단호하게', '낮고 간절하게'. 비면 기본 말투. 인물별로 톤을 저장해 같은 보이스라도
   * 대사 강약을 다르게 낸다. 빈 문자열은 옵트아웃(스타일 없음)으로 취급한다.
   */
  quoteStyle?: string
  /**
   * 대사 ElevenLabs 감정/강도 옵션 (선택) — quoteEngine='elevenlabs' 미리듣기·사용자 생성에 반영.
   * 북리커맨드 ELE send options 중 인물 톤 표현에 필요한 최소(stability·style)만 둔다.
   * 미지정 필드는 프리뷰 라우트 기본값(stability 0.5, style 0.3)을 따른다.
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
  /** 작은 자막 폰트 스타일 — 에피소드 전역 기본을 덮어쓴다. 'default'(기본) | 'serif-large'(세리프 좀 더 큼) */
  quoteCaptionSize?: 'default' | 'large'
  quoteCaptionFont?: 'default' | 'serif'
}

/**
 * 화보 묶음 — 한 세력을 여러 그룹 화보로 나눌 때 사용.
 * 예: Google DeepMind를 '창업자' 화보와 '딥마인드' 화보로 분리.
 */
export interface FactionCluster {
  /** 단체 명칭 (한 필드, 개행으로 앞/뒤). 첫 줄=명칭, 나머지=설명(세력색). 생략 시 미표시 */
  label?: string
  /** 단체 명칭 영문 (한 필드, 개행) */
  labelEn?: string
  /** 묶음 그룹 화보 이미지 basename 또는 URL */
  image?: string
  /** 화보 맞춤 — 비율 유지(contain) 위에서 보일 위치·확대. 미지정이면 기본 정렬(가로 가운데·세로 위) */
  imageCrop?: FactionImageCrop
  /** 이 묶음 인물 (등장 순서) */
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

export interface FactionGroup extends Partial<FactionGroupCardFields> {
  /** 세력 명칭 (한 필드, 개행으로 앞/뒤). 첫 줄=명칭(식별자), 나머지=설명(세력색) */
  name: string
  /**
   * 그룹명 — 그룹을 따로 나누지 않는 세력의 단일 그룹샷 카드 명칭(한 필드, 개행). 첫 줄=명칭, 나머지=설명(세력색).
   * 비우면 세력 명칭 둘째 줄을 그룹샷에 그대로 쓴다. 그룹을 여러 개로 나눈 세력은 각 그룹(clusters)의 label 을 쓴다.
   */
  label?: string
  /** 그룹명 영문 (한 필드, 개행) */
  labelEn?: string
  /** 이 세력 인물 컷 진입 전환효과. 미지정이면 에피소드 전역 설정을 따른다 */
  transition?: FactionTransition
  /** 이 세력 인물 컷 지속 효과(머무는 동안 카메라 움직임). 미지정이면 에피소드 전역 설정을 따른다 */
  holdMotion?: HoldMotion
  /** 이 세력 시작 효과(등장 직후 짧은 도입 임팩트). 미지정이면 에피소드 전역을 따른다 */
  enterMotion?: EnterMotion
  /** 이 세력 지지직 글리치(줌과 별개 축). 미지정이면 에피소드 전역(holdGlitch)을 따른다 */
  holdGlitch?: GlitchSetting
  /** 이 세력 흔들림(핸드헬드, 줌과 별개 축). 미지정이면 에피소드 전역(holdShake)을 따른다 */
  holdShake?: boolean
  /** 이 세력 줌·이동 속도 배수(1=기본). 미지정이면 에피소드 전역(zoomSpeed)을 따른다 */
  zoomSpeed?: number
  /**
   * 그룹샷 전용 움직임 효과 — 그룹을 따로 나누지 않은 세력의 단체사진(그룹샷) 화면에만 거는 효과.
   * 비면 세력 효과(위 holdMotion 등)를 따른다. 그룹을 여러 개로 나눈 세력은 각 그룹이 자기 효과를 가지므로 안 쓴다.
   */
  shotEffects?: {
    holdMotion?: HoldMotion
    enterMotion?: EnterMotion
    holdGlitch?: GlitchSetting
    holdShake?: boolean
    zoomSpeed?: number
    zoomFocus?: ZoomFocus
  }
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
  /** 세력 명칭 영문 (한 필드, 개행) */
  nameEn?: string
  /**
   * 본서비스 세력도감 연결 키 — celeb_tags.slug. 이 값이 있어야 출간(DB·R2 반영)이 된다.
   * 미지정이면 진단이 세력 폴더(NN-<slug>)에서 뽑은 제안값을 알려준다. 영상 렌더는 쓰지 않는다.
   */
  tagSlug?: string
  /** 테마 색 (hex) */
  color?: string
  /** 영상 로고 (타이틀 카드 풀스크린 배경, mp4 등). 있으면 logoImg보다 우선. basename·폴더경로·URL */
  logoVid?: string
  /** 세력 전체 그룹 화보 (clusters가 없는 팀의 화보 카드에 표시). basename·폴더경로·URL */
  image?: string
  /** 세력 화보(image) 맞춤 — 비율 유지(contain) 위에서 보일 위치·확대. 미지정이면 기본 정렬 */
  imageCrop?: FactionImageCrop
  /** 이미지 로고 (타이틀 카드 영상 없을 때 풀스크린·카드뉴스 공용). basename·폴더경로·URL */
  logoImg?: string
  /** 로고(logoVid·logoImg) 타이틀 카드 표시 맞춤 — 비율 유지(contain) 위에서 보일 위치·확대. 미지정이면 기본 정렬 */
  logoCrop?: FactionImageCrop
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
  /**
   * 쇼츠 편 배정 (선택). 한 에피소드를 여러 쇼츠 편으로 나눌 때 이 세력을 몇 편에 넣을지 정한다.
   * 그 편 쇼츠 렌더에는 이 part 세력만 나온다(공통=미지정 세력은 모든 편에 노출). 롱폼은 part 무시(전체 노출).
   */
  part?: number
  /** true면 이 세력을 영상에서 완전히 제외. 데이터는 보존되어 false로 되돌리면 그대로 살아난다 */
  disabled?: boolean
}

/** 배경음악 트랙 한 곡 — 복수 곡 순차 재생(롱폼 길이 충당)용 */
export interface FactionTrack {
  /** public/music/ 하위 파일 basename */
  file: string
  /** 곡 길이(초). 순차 배치·순환 계산용. 음악 선택 시 자동 측정해 저장 */
  durationSec?: number
  /** 이 곡 음량 배율 (0~1, 미지정이면 1 = 원음). 0.5 면 50%. 곡마다 음량 편차를 잡는 데 쓴다 */
  volume?: number
}

/** 인물 컷 진입 전환효과(세로 쇼츠) — 컷이 바뀌는 순간만. auto=인물마다 번갈아 */
export type FactionTransition =
  | 'zoomout' | 'zoomin' | 'kenburns' | 'auto'
  | 'slide' | 'slideLeft' | 'slideRight'
  | 'glitch' | 'tear' | 'crt' | 'zoompunch' | 'whip' | 'filmburn' | 'pixelate' | 'shutter'

/**
 * 인물 컷 지속 효과 — 컷이 떠 있는 동안(진입 전환 후) 사진에 계속 거는 카메라 움직임.
 * 진입 전환(transition)과 별개 축. 인물→세력→에피소드 계승, 미지정이면 none(정지).
 *   none·zoomin·zoomout·kenburns·panLeft·panRight·zoomPulse·handheld
 */
export type HoldMotion =
  | 'none' | 'zoomin' | 'zoomout' | 'kenburns'
  | 'panLeft' | 'panRight' | 'zoomPulse' | 'handheld'

/**
 * 인물 컷 "시작 효과" — 컷 등장 직후 짧은 도입 임팩트(약 0.15초). 끝나면 1.0으로 정착해 지속 효과로 이어진다.
 * 전환(컷 교체 순간)·지속(컷 내내)과 구분되는 별개 축. zoomout=팍 빠짐, zoomin=팍 다가옴.
 */
export type EnterMotion = 'none' | 'zoomin' | 'zoomout'

/** 지지직 모드 — light(내내 은은) / heavy(내내 강함, 기존) / tail(컷 끝 1초만 강하게). */
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
 * longformLayout 항목 순서대로 롱폼이 흐른다. cut 을 꽂으면 그 지점에서 여러 편으로 갈라진다.
 * 챕터 전환(chapter)은 영상을 가르지 않고 한 영상 안에서 챕터를 넘긴다(음악 곡 경계 겸용).
 */
export type FactionLongformItem =
  | { group: number }
  | { era: FactionEra }
  | { cut: true }
  | { chapter: FactionChapter }

/**
 * 나레이터 낭독 한 벌 — 텍스트 + 음성 설정. 필드명을 인물 대사(quote*)와 동일하게 맞춰
 * 음성 패널(FactionExpandedVoicePanel + QUOTE_SLOT)을 무수정 재사용한다.
 * ⚠ 동기화 대상: sw/remotion/src/compositions/Faction/types.ts 의 FactionNarratorVoice.
 */
export type FactionNarratorVoice = Pick<FactionPerson,
  | 'quote' | 'quoteEn' | 'quoteChunks' | 'quoteEnChunks'
  | 'quoteDuration' | 'quoteGainDb' | 'quotePlaybackRate'
  | 'quoteEngine' | 'quoteSpeaker' | 'quoteElevenlabsVoiceId' | 'quoteStyle'
  | 'quoteEleOptions' | 'quoteEleEmotions' | 'quoteEleTrail'
>

/**
 * 공용 낭독자(옵션) — 화면에 등장하는 인물이 아니라 제목·시작문구·수식어를 읽는 목소리.
 * logline 음성 설정은 모든 인물 수식어의 기본값이며, 인물 epithet* 값이 있으면 그쪽이 우선한다.
 * name·label·image·intro·show*는 인격형 나레이터 초기 데이터의 하위 호환 필드다.
 * ⚠ 동기화 대상: sw/remotion/src/compositions/Faction/types.ts 의 FactionNarrator.
 */
export interface FactionNarrator {
  /** 레거시 나레이터 이름. 공용 낭독자는 이름을 갖지 않는다 */
  name?: string
  /** 나레이터 이름 영문 */
  nameEn?: string
  /** 한 줄 소개 — 소개 컷에서 이름 아래 작게 표시 */
  label?: string
  /** 한 줄 소개 영문 */
  labelEn?: string
  /** 나레이터 이미지 — 인물 image와 같은 경로 규칙. 소개 컷 배경 */
  image?: string
  /** 이미지 맞춤 — 잘릴 위치·확대 */
  imageCrop?: FactionImageCrop
  /** 시작 화면에서 영상 제목을 읽는다 (미지정=꺼짐) */
  readTitle?: boolean
  /** 시작 화면에서 시작문구를 읽는다 (미지정=켜짐, 기존 데이터 호환) */
  readLogline?: boolean
  /** 롱폼 챕터 표지에서 챕터명을 읽는다 (미지정=꺼짐) */
  readChapterTitle?: boolean
  /** 공용 낭독 음성 설정 + 시작 낭독 음원 길이. 인물 수식어 음성의 기본값 */
  logline?: FactionNarratorVoice
  /** 마무리 낭독 — 닫는 한마디. 마무리 화면에 문구가 뜨고 음원이 재생된다 */
  outro?: FactionNarratorVoice
  /** 소개 컷 대사 — 비면 소개 컷 자체가 생략된다 */
  intro?: FactionNarratorVoice
  /** 세로 쇼츠에서 소개 컷 노출 (미지정=꺼짐) */
  showShorts?: boolean
  /** 롱폼에서 소개 컷 노출 (미지정=켜짐) */
  showLongform?: boolean
}

export interface FactionScript {
  /** 영상 명칭 (한 필드, 개행으로 앞/뒤). 첫 줄=앞부분(흰색), 나머지=뒷부분(세력색) */
  title: string
  /**
   * 롱폼(쇼츠 아님) 전용 배치 — 세력 블록 순서를 직접 큐레이션하고 사이사이 시대 문구 카드를 끼운다.
   * 항목 순서대로 롱폼이 흐른다(group=세력 블록, era=시대 문구, cut=편 경계). 비면 기존 동작(세력 배열 순서). 언어 공통.
   */
  longformLayout?: FactionLongformItem[]
  /** 인물 컷 진입 전환효과(세로 쇼츠). 미지정이면 크로스페이드 */
  transition?: FactionTransition
  /** 인물 컷 지속 효과(머무는 동안 카메라 움직임) — 에피소드 전역 기본. 세력·인물이 덮어쓴다. 미지정이면 none(정지) */
  holdMotion?: HoldMotion
  /** 인물 컷 시작 효과(등장 직후 짧은 도입 임팩트) — 에피소드 전역 기본. 세력·인물·묶음이 덮어쓴다 */
  enterMotion?: EnterMotion
  /** 지지직 글리치 전역 기본(줌과 별개 축). 세력·인물·묶음이 덮어쓴다. 미지정이면 그룹샷 켜짐·개인샷 꺼짐 */
  holdGlitch?: GlitchSetting
  /** 흔들림(핸드헬드) 전역 기본(줌과 별개 축). 세력·인물·묶음이 덮어쓴다. 미지정이면 꺼짐 */
  holdShake?: boolean
  /** 줌·이동 속도 배수 전역 기본(1=기본). 세력·인물·묶음이 덮어쓴다 */
  zoomSpeed?: number
  /** true면 모든 컷의 효과(전환·시작·지속·지지직·속도)를 전역값으로 고정한다(개별값 보존하되 무시, 줌 목표점 제외) */
  lockEffects?: boolean
  /** true면 모든 컷의 지속 효과(줌·패닝 등)를 끄고 정지 화면으로 둔다. 영상 컷 떨림 점검·정적 연출용 */
  noZoom?: boolean
  /**
   * 대사 화면 표시 방식 — 에피소드 전역 기본. 인물 quoteDisplay 가 있으면 그쪽이 우선.
   * - 'box'(기본): 기존 대사 박스
   * - 'caption': 북리커맨드 쇼츠 작은 자막(글래스 태블릿)
   */
  quoteDisplay?: 'box' | 'caption'
  /**
   * 작은 자막 세로 위치 — 에피소드 전역 기본. 인물 quoteCaptionPos 가 있으면 그쪽이 우선.
   * - 'bottom'(기본): 화면 최하단(이름·직함과 동일 선상) / 'center': 화면 중하단 밴드(이름과 떨어진 독립 블록).
   */
  quoteCaptionPos?: 'bottom' | 'center'
  /** 작은 자막 폰트 스타일 — 에피소드 전역 기본. 'default'(기본) | 'serif-large'(세리프 좀 더 큼) */
  quoteCaptionSize?: 'default' | 'large'
  quoteCaptionFont?: 'default' | 'serif'
  /**
   * 한 편(쇼츠 part·롱폼) 종료 처리 — 마지막 인물 대사가 끝난 뒤 영상이 꺼지기까지.
   * endHoldSec:  (대사 후 대기) 마지막 인물 대사 끝 ~ 다음으로 넘어가기까지 그 인물 화면을 정지(줌인 멈춤)한 채 유지하는 시간(초). 기본 4.
   * outroHoldSec:(종료 화면 대기) 영상 끝 화면(브랜드 엔딩 또는 outroImage 종료 이미지)이 떠 있는 시간(초). 기본 2.5.
   * endFadeSec:  종료 직전 검정 페이드아웃 길이(초). 기본 3. 마지막에 보이는 화면(종료 화면이 있으면 그것, 없으면 마지막 인물 대기) 안에서 끝나도록, 그 화면 대기시간보다 길면 거기에 맞춘다.
   */
  endHoldSec?: number
  outroHoldSec?: number
  endFadeSec?: number
  /** 영상 명칭 영문 (한 필드, 개행) */
  titleEn?: string
  /** 편성 화면에서 관리할 쇼츠 편 수. 미지정이면 기존 호환값 2 */
  shortsPartCount?: number
  /** 쇼츠 편(part)별 영상 명칭 (한 필드, 개행). 해당 편 렌더 시 title 대신 쓴다. 미지정 편은 공통 값 */
  titleByPart?: Record<number, string>
  /** 시작 화면에 띄울 시작문구. 영상 명칭 아래에 천천히 떠올라 영상 주제를 먼저 알린다 — 언어 공통(en은 loglineEn) */
  logline?: string
  /** 시작문구 (영문) */
  loglineEn?: string
  /** 쇼츠 편(part)별 시작문구. 해당 편 렌더 시 logline 대신 쓴다. 미지정 편은 공통 logline */
  loglineByPart?: Record<number, string>
  /** 쇼츠 편(part)별 시작문구 (영문) */
  loglineByPartEn?: Record<number, string>
  /** 시작 화면 지속 시간(초). 미지정이면 기본값(2.5). 시작문구를 읽을 여유가 필요할 때 늘린다 */
  introSec?: number
  /**
   * 시작 화면(인트로) 전용 움직임 효과 — 첫 화면에만 거는 효과.
   * 세력 로고 카드(logoEffects)와 같은 형태다. 다만 시작 화면은 세력에 속하지 않아 전역을 상위로 두지 않고,
   * 비면 '천천히 확대'가 기본이다(첫 화면이 정지 사진처럼 굳지 않게). 정지시키려면 지속 효과를 '정지'로 지정한다.
   */
  introEffects?: {
    holdMotion?: HoldMotion
    enterMotion?: EnterMotion
    holdShake?: boolean
    zoomSpeed?: number
    zoomFocus?: ZoomFocus
  }
  /** 마무리 화면(아웃트로) 전용 움직임 효과 — 시작 화면(introEffects)과 같은 규칙. 비면 '천천히 확대' */
  outroEffects?: {
    holdMotion?: HoldMotion
    enterMotion?: EnterMotion
    holdShake?: boolean
    zoomSpeed?: number
    zoomFocus?: ZoomFocus
  }
  /** 공용 낭독자(옵션) — 제목·시작문구와 인물 수식어에 같은 기본 목소리를 쓴다 */
  narrator?: FactionNarrator
  /** 로고 타이틀 카드(logoVid 또는 logoImg 있는 세력의 진입 화면) 1장 지속 시간(초). 미지정 시 4. BO에서 조정하여 스튜디오/렌더에 적용 */
  groupSec?: number
  /** 그룹샷(화보 묶음) 카드 1장 지속 시간(초) — 단체사진 + 그룹명(cluster.label)이 뜨는 화면. 미지정 시 인원 수별 자동(2.6~3.2). 지정하면 인원 수 무관 고정. BO에서 조정하여 스튜디오/렌더에 적용 */
  clusterSec?: number
  /**
   * 자막형(quoteDisplay='caption') 인물 화면에서 대사가 뜨기 전 이름·직함만 보이는 시간(초).
   * 미지정 시 1초. 늘리면 그만큼 인물 화면 전체가 길어진다(대사 낭독 길이는 그대로).
   */
  captionIdHoldSec?: number
  /** 시작 효과음 파일명(public/common/sfx/ 하위). 시작문구와 함께 울리고 같이 페이드아웃. 미지정이면 효과음 없음 */
  startSfx?: string
  /** 세력 로고(타이틀 카드) 등장 효과음 파일명(public/common/sfx/ 하위). 미지정이면 효과음 없음 */
  groupSfx?: string
  /** 배경음악 basename (public/music/ 하위) — 언어 공통. tracks가 있으면 무시 */
  music?: string
  /** 배경음악 복수 곡 — 순서대로 이어 재생, 영상이 더 길면 순환. 롱폼 길이 충당용 — 언어 공통 */
  tracks?: FactionTrack[]
  /** 대사(voice 음성) 재생 중 BGM을 낮출 음량 배율(0~1). 예 0.4 = 대사 때만 40%, 평소 100%. 미설정이면 덕킹 안 함 */
  musicDuckVolume?: number
  /** 쇼츠 편(part)별 배경음악 basename. 편 분할 시 편마다 다른 BGM(그 편은 이 곡만 반복) */
  musicByPart?: Record<number, string>
  /** 쇼츠 편(part)별 배경음악 음량 배율(0~1, 미지정이면 1=원음) */
  musicVolumeByPart?: Record<number, number>
  /** 인트로에 띄울 핵심 인물 slug 목록. 있으면 텍스트 대신 인물 그리드(통합화면)로 시작 — 언어 공통 */
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
  /** 쇼츠 편(part)별 시작 화면 핵심 인물 slug. 해당 편 렌더 시 heroes 대신 쓴다. 미지정 편은 공통 heroes */
  heroesByPart?: Record<number, string[]>
  /** 시작/마지막 화면 배치 — 'row'(가로 한 줄·각 칸 세로로 김, 기본) | 'column'(세로 한 줄·각 칸 가로로 김) | 'grid'(2열 그리드) */
  heroLayout?: 'row' | 'column' | 'grid'
  /** 롱폼(LV) 썸네일 전용 이미지(DND 등록용). 미지정이면 첫 번째 인물 이미지로 폴백 */
  lvThumbnailImage?: string
  /** 세력 목록 (등장 순서) */
  groups: FactionGroup[]
}

/*
 * 여기 있던 `FactionStatus`('todo'|'live'|'done')와 `FactionEpisodeListItem` 은 26.07.27 에 지웠다.
 * 아무 데서도 읽지 않는 죽은 타입이었고, 편 상태의 정본은
 * `actions/admin/factions/episodes.ts` 의 `FactionEpisodeStatus`('ready'|'blocked') 하나다.
 */

/**
 * 카드뉴스 대본 파일 — 인물 이름을 키로 카드 전용 필드(FactionCardFields)를 담는다.
 * 디스크에는 person-cards/<인물>.json 들로 흩어져 있고, API 응답에서 이름 키로 병합한 형태다.
 */
export interface FactionCardsFile {
  people?: Record<string, Partial<FactionCardFields>>
  groups?: Record<string, Partial<FactionGroupCardFields>>
}

/**
 * 영상 데이터(FactionScript) 위에 카드 대본(FactionCardsFile)을 병합한다.
 * 각 인물(세력 people·묶음 clusters.people)에 이름이 일치하는 카드 필드를 덮어씌워
 * 카드 미리보기·출고의 단일 원본을 만든다. 원본 script 는 바뀌지 않는다(복사본 반환).
 */
export function mergeFactionCards(script: FactionScript, cards: FactionCardsFile): FactionScript {
  const byPersonName = cards.people ?? {}
  const byGroupName = cards.groups ?? {}

  const mergePerson = (p: FactionPerson): FactionPerson => {
    const card = byPersonName[p.name]
    return card ? { ...p, ...card } : p
  }

  return {
    ...script,
    groups: (script.groups ?? []).map(g => {
      const gCard = byGroupName[g.name] ?? {}
      return {
        ...g,
        ...gCard,
        people: (g.people ?? []).map(mergePerson),
        ...(g.clusters ? { clusters: g.clusters.map(c => ({ ...c, people: (c.people ?? []).map(mergePerson) })) } : {}),
      }
    }),
  }
}
