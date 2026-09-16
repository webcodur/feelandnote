/**
 * 가상 담화(Discourse) 화면 공통 상수 — 폰트·색·여백·카메라 모션 계수.
 * 여러 컷 컴포넌트가 공유한다(단일원천).
 */
import type React from 'react'

export const FONT = "'Pretendard Variable', 'Pretendard', sans-serif"
/** 대사 자막 세리프 — 북리커맨드 '하단' 자막과 동일 필체(MaruBuri) */
export const FONT_SERIF = 'MaruBuri, "Noto Serif KR", serif'
/** 사진 위 텍스트 가독성 — 검정 외곽선 + 그림자. 이름·직함이 밝은 사진에 묻히지 않게. */
export const TEXT_PAINT: React.CSSProperties = {
  WebkitTextStroke: '1.2px rgba(0,0,0,0.92)',
  paintOrder: 'stroke fill',
  textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.7), 0 3px 10px rgba(0,0,0,0.6)',
}
/** 어두운 강조색은 번지는 광택 없이 렌더링 선명도만 보강한다. */
export const accentClarityPaint = (accent: string): React.CSSProperties => {
  const hex = accent.match(/^#([0-9a-f]{6})$/i)?.[1]
  if (!hex) return {}
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  const luma = (r * 299 + g * 587 + b * 114) / 1000
  if (luma >= 92) return {}
  return {
    filter: 'brightness(1.16) saturate(1.1)',
  }
}
export const BG = '#0a0a0f'
export const FG = '#f5f2ea'
export const DEFAULT_ACCENT = '#d4a828'
/** 상단 고정 빈 영역(블랙 프레임) 높이 — 북리커맨드 쇼츠 HEADER_H와 통일. 본문 컷은 이 아래에만 그린다 */
export const HEADER_H = 320
/** 하단 고정 빈 영역(블랙 프레임) 높이 — 북리커맨드 쇼츠 SHORT_SAFE_BOTTOM과 통일 */
export const SAFE_BOTTOM = 460
/** 본문 좌우·하단 여백 — 북리커맨드 쇼츠 SHORT_CONTENT_PAD와 통일 */
export const CONTENT_PAD = 48

/* ── 지속 효과(holdMotion) — 컷이 떠 있는 동안 정속으로 누적되는 카메라 움직임 ──
   컷 길이와 무관하게 프레임당 일정량 누적(전 인물 동일 빠르기), 상한에 닿으면 멈춘다.
   1.1초(66프레임) 짧은 컷에서도 눈에 띄도록 속도를 잡았다(≈ 초당 5~6% 확대/이동). */
/** 줌인/줌아웃 프레임당 확대율 (≈ 0.054/초 @60fps → 1.1초에 약 6%) */
export const HOLD_ZOOM_RATE = 0.0009
/** 줌 누적 상한(줌아웃·켄번스 등) */
export const HOLD_ZOOM_MAX = 1.32
/** 줌인 전용 — 더 약하게(천천히·덜 확대). 줌아웃·켄번스와 분리.
   속도는 긴 컷에 맞춰 낮게 잡았다: 상한 도달까지 약 13초. */
export const HOLD_ZOOMIN_RATE = 0.00025
export const HOLD_ZOOMIN_MAX = 1.2
/** 줌인 푸시인 — 목표점을 화면 중앙으로 끌어당기는 정도(0=제자리 확대, 1=완전 중앙). 과하면 가장자리 검정 노출 */
export const HOLD_PUSHIN_GAIN = 0.6
/** 지속 줌아웃 시작 배율 — 이만큼 크게 시작해 1.0으로 천천히 줄어든다 */
export const HOLD_ZOOMOUT_START = 1.14
/** 패닝/켄번스/핸드헬드 베이스 확대 — 이동·흔들림에도 가장자리 검정이 안 보이게 미리 키운다 */
export const HOLD_PAN_ZOOM = 1.14
/** 패닝(좌우)·켄번스(상하) 프레임당 이동율(% 단위, 정속) */
export const HOLD_PAN_RATE = 0.06
/** 패닝·켄번스 이동 누적 상한(%) — 베이스 확대 여유분 안쪽 */
export const HOLD_PAN_MAX = 5
/** 줌 펄스 — 진폭(±배율)과 한 주기(초) */
export const HOLD_PULSE_AMP = 0.018
export const HOLD_PULSE_PERIOD_SEC = 1.4
/** 핸드헬드 — 베이스 확대와 미세 흔들림 진폭(% 단위) */
export const HOLD_HANDHELD_ZOOM = 1.05
export const HOLD_HANDHELD_AMP = 0.18

/**
 * 기본 고지 문구 — 데이터에 notice 가 없을 때 렌더가 쓴다.
 * 본서비스 안내(sw/web/messages/ko/celeb.json virtualMonologueNote)와 같은 취지로 맞춘다.
 * **이 문구를 지우거나 비활성화하지 않는다** — 실존 인물이 하지 않은 말을 하는 시리즈의 최소 방어선이다.
 */
export const DEFAULT_NOTICE = '저서와 공개된 발언을 바탕으로 사상을 재구성했습니다. 본인이 실제로 남긴 말은 아닙니다.'
export const DEFAULT_NOTICE_EN = 'Reconstructed from published works and public statements. Not actual quotations.'

/** 상시 고지 소자막 — 화면 하단 고정. 눈에 거슬리지 않되 항상 읽히는 크기 */
export const NOTICE_FONT_SIZE = 26
export const NOTICE_OPACITY = 0.62

/** 발언 종류별 기본 강조 — 추궁·반박은 더 날카롭게 들어온다 */
export const KIND_TRANSITION = {
  monologue: 'zoomout',
  accuse: 'zoompunch',
  rebuttal: 'zoompunch',
  reply: 'slideLeft',
  agree: 'zoomout',
} as const

/** 발언 종류별 화면 리드 문구 — 누가 누구를 받아 말하는지 알린다. 독백은 리드 없음 */
export const KIND_LABEL: Record<string, string | null> = {
  monologue: null,
  accuse: '추궁',
  rebuttal: '반박',
  reply: '되받다',
  agree: '동의',
}
export const KIND_LABEL_EN: Record<string, string | null> = {
  monologue: null,
  accuse: 'CONFRONTS',
  rebuttal: 'REBUTS',
  reply: 'REPLIES',
  agree: 'AGREES',
}

/** 인물마다 색이 없을 때 돌려 쓰는 기본 팔레트 — 발언자 식별이 색에 걸려 있어 반드시 갈린다 */
export const CAST_COLORS = ['#d4a828', '#5aa9e6', '#e05c5c', '#6fcf97']
