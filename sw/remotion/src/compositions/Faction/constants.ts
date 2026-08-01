/**
 * 세력도감(Faction) 컷 화면 공통 상수 — 폰트·색·여백·레이아웃·줌·전환 순환.
 * 여러 컷 컴포넌트가 공유한다(단일원천).
 */
import type React from 'react'
import type { FactionTransition, HoldMotion } from './types'

export const FONT = "'Pretendard Variable', 'Pretendard', sans-serif"
/** 대사 자막 세리프 — 북리커맨드 '하단' 자막과 동일 필체(MaruBuri) */
export const FONT_SERIF = 'MaruBuri, "Noto Serif KR", serif'
/** 사진 위 텍스트 가독성 — 검정 외곽선 + 그림자. 이름·직함이 밝은 사진에 묻히지 않게. */
export const TEXT_PAINT: React.CSSProperties = {
  WebkitTextStroke: '1.2px rgba(0,0,0,0.92)',
  paintOrder: 'stroke fill',
  textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.7), 0 3px 10px rgba(0,0,0,0.6)',
}
/** 어두운 세력색은 번지는 광택 없이 렌더링 선명도만 보강한다. */
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

/* ── 가로 롱폼 인물 컷 레이아웃 상수(나중에 조정 가능) ── */
/** 인물 컷 좌측 사진 영역 너비 비율 */
export const L_PHOTO_W = '42%'
/** 인물 컷 우측 텍스트 영역 좌우 여백 */
export const L_TEXT_PAD = 96
/** 인물 컷 도입 줌아웃 — 시작 시 살짝 크게 잡았다가 이 시간 동안 확 빠르게 제자리(1.0)로 줄어든 뒤 정지 */
export const PERSON_ZOOM_OUT_SEC = 0.15
/** 줌아웃 시작 배율(1.0보다 큼) */
export const PERSON_ZOOM_START = 1.1
/** 진입 모션 이후 공통 지속 줌인 속도(프레임당 확대 비율) — 컷 길이와 무관하게 전 인물 동일 빠르기 (≈ 0.015/초 @60fps) */
export const CONT_ZOOM_RATE = 0.00025
/** 지속 줌인 누적 상한 — 여기에 닿으면 확대를 멈춘다(이후 다른 효과를 얹을 분기점) */
export const CONT_ZOOM_MAX = 1.35

/* ── 지속 효과(holdMotion) — 컷이 떠 있는 동안 정속으로 누적되는 카메라 움직임 ──
   컷 길이와 무관하게 프레임당 일정량 누적(전 인물 동일 빠르기), 상한에 닿으면 멈춘다.
   1.1초(66프레임) 짧은 컷에서도 눈에 띄도록 속도를 잡았다(≈ 초당 5~6% 확대/이동). */
/** 줌인/줌아웃 프레임당 확대율 (≈ 0.054/초 @60fps → 1.1초에 약 6%) */
export const HOLD_ZOOM_RATE = 0.0009
/** 줌 누적 상한(줌아웃·켄번스 등) */
export const HOLD_ZOOM_MAX = 1.32
/** 줌인 전용 — 더 약하게(천천히·덜 확대). 줌아웃·켄번스와 분리.
   속도는 컷 길이가 긴 인물 컷(수식어 낭독 → 대사)에 맞춰 낮게 잡았다: 상한 도달까지 약 13초.
   수식어가 앞에 끼어 대사가 늦게 떠도, 대사 구간 내내 확대가 살아있게 한다(상한 조기 소진 방지). */
export const HOLD_ZOOMIN_RATE = 0.00025
export const HOLD_ZOOMIN_MAX = 1.2
/** 줌인 푸시인 — 목표점을 화면 중앙으로 끌어당기는 정도(0=제자리 확대, 1=완전 중앙). 과하면 가장자리 검정 노출 */
export const HOLD_PUSHIN_GAIN = 0.6
/** 지속 줌아웃 시작 배율 — 이만큼 크게 시작해 1.0으로 천천히 줄어든다 */
export const HOLD_ZOOMOUT_START = 1.14
/* ── 시작 효과(enterMotion) — 컷 등장 직후 짧은 도입 임팩트. 끝나면 1.0으로 정착해 지속 효과로 이어진다 ── */
/** 시작 효과 도입 길이(초) — 줌인·none 기본 */
export const ENTER_MOTION_SEC = 0.15
/** 시작 줌아웃 전용 도입 길이(초) — 더 짧게(빠르게 끊김, 둔탁) */
export const ENTER_ZOOM_OUT_SEC = 0.07
/** 시작 줌아웃 시작 배율(1.12→1.0 큰 폭으로 짧고 둔탁하게 빠짐) */
export const ENTER_ZOOM_OUT_START = 1.12
/** 시작 줌인 시작 배율(0.92→1.0 팍 다가옴) */
export const ENTER_ZOOM_IN_START = 0.92
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
/* ── 시작·마무리 화면 카메라 ──
   인물·묶음 컷과 같은 지속 효과 계산(holdMotionParts)을 그대로 쓴다. 다른 대상과 달리 전역을 상위로 두지 않고
   아래 기본값을 쓰는 이유는, 전역을 비워둔 편이 대부분이어서 첫·끝 화면만 정지 사진으로 남기 때문이다.
   기본 속도로 4초짜리 화면이면 약 6% 다가간다(script.introEffects·outroEffects 로 편마다 덮어쓸 수 있다). */
/** 시작·마무리 화면 기본 지속 효과 — 설정을 비운 편이 쓰는 값 */
export const EDGE_HOLD_DEFAULT: HoldMotion = 'zoomin'
/** 세로 쇼츠 대사 박스 — 화면 왼쪽 밖에서 슬라이드 인하는 시작 거리(px). 음수=왼쪽 */
export const PANEL_SLIDE_X = 520
/** 세로 쇼츠 대사 박스 슬라이드 인 길이(초) */
export const PANEL_SLIDE_SEC = 0.4

/** auto 전환에서 인물마다 번갈아 적용할 효과 순환 목록 — 실제 전환 모션이 있는 것만(줌인·켄번스는 지속 효과 전용이라 제외) */
export const TRANSITION_CYCLE: Exclude<FactionTransition, 'auto'>[] = ['zoompunch', 'slideLeft', 'glitch', 'crt']
