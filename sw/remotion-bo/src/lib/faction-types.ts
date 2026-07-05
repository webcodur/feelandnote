/**
 * 세력도(Faction) 데이터 모델 — BO 측 정의.
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
 * 카드뉴스(SNS) 전용 필드 — 영상 렌더는 쓰지 않고, 세력도 카드 미리보기·출고에만 쓴다.
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
  /** 직함 표시 방식 — true=타이핑 효과(글자씩 점등), false/미지정=순차 등장(기존) */
  linesTyping?: boolean
  /** 인물 직함·이력 줄 (3줄 권장). 한 줄씩 순차 등장 */
  lines?: string[]
  /** 인물 직함·이력 줄 영문 */
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
  /** 인물 이미지 맞춤 — 잘릴 위치·확대. 미지정이면 가운데 채움 */
  imageCrop?: FactionImageCrop
  /**
   * 대사 도중 사진 교체 (선택) — 특정 의미 덩어리(quoteChunks 인덱스, 0-based)부터 다른 사진으로 부드럽게 전환.
   * 예: [{ chunk: 3, image: 'musk-2.webp' }] → 4번째 덩어리부터 전환. image 가 컷 시작(0번째) 사진. 언어 공통.
   * crop 은 그 교체 사진의 맞춤(잘릴 위치·확대). 미지정이면 가운데 채움.
   */
  imageChanges?: { chunk: number; image: string; crop?: FactionImageCrop }[]
  /**
   * 대사 시작 시점 사진 교체 (선택) — 도입(직함 소개) 구간엔 image(직함용)를 보이다가,
   * 대사가 시작되는 순간 quoteImage(대사용)로 부드럽게 전환한다. imageChanges 와 독립적으로 함께 적용.
   * 경로 규칙은 image 와 동일. 언어 공통.
   */
  quoteImage?: string
  /** quoteImage 의 사진 맞춤(잘릴 위치·확대). 미지정이면 가운데 채움 */
  quoteImageCrop?: FactionImageCrop
  /** 셀럽 DB에서 추가한 경우 slug — 아바타 재동기화·중복 판정용 */
  slug?: string
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
  /** 직함 스텝 — 직함 2·3번 줄을 순차로 보여준 뒤 다음으로 교차 */
  stepCredit?: boolean
  /** 수식어 스텝 — 수식어를 타이핑으로 보여준 뒤 다음으로 교차(세로 쇼츠 전용) */
  stepEpithet?: boolean
  /** 음성 스텝 — 대사를 표시하고 음원이 있으면 재생. 꺼지면 대사 자체가 안 뜬다 */
  stepVoice?: boolean
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
  /** 세력 명칭 영문 (한 필드, 개행) */
  nameEn?: string
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
  /** 이 세력 구간 배경음악(public/music/ basename). 세력 진입 시 이전 곡 페이드아웃 후 교체(구간 반복 재생). 미지정이면 직전 곡 유지 */
  music?: string
  /** 이 세력 곡 음량 배율 (0~1, 미지정이면 1 = 원음). 0.5 면 50%. 곡마다 음량 편차를 잡는 데 쓴다 */
  musicVolume?: number
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
 * 롱폼 배치 한 칸 — 세력 블록(group: 원래 세력 인덱스) 또는 시대 문구 카드(era) 또는 편 경계(cut).
 * longformLayout 항목 순서대로 롱폼이 흐른다. cut 을 꽂으면 그 지점에서 여러 편으로 갈라진다.
 */
export type FactionLongformItem =
  | { group: number }
  | { era: FactionEra }
  | { cut: true }

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
  /** 쇼츠 편(part)별 시작 화면 핵심 인물 slug. 해당 편 렌더 시 heroes 대신 쓴다. 미지정 편은 공통 heroes */
  heroesByPart?: Record<number, string[]>
  /** 시작/마지막 화면 배치 — 'row'(가로 한 줄·각 칸 세로로 김, 기본) | 'column'(세로 한 줄·각 칸 가로로 김) | 'grid'(2열 그리드) */
  heroLayout?: 'row' | 'column' | 'grid'
  /** 세력 목록 (등장 순서) */
  groups: FactionGroup[]
}

/** 세력도 진행 상태 — 할 일 / 공개 / 완료 */
export type FactionStatus = 'todo' | 'live' | 'done'

/** 에피소드 목록 카드용 요약 */
export interface FactionEpisodeListItem {
  id: string
  /** 영상 명칭 (한 필드, 개행으로 앞/뒤). 카드는 첫 줄/나머지로 나눠 표시한다 */
  title: string
  groupCount: number
  personCount: number
  hasMusic: boolean
  status: FactionStatus
}

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
