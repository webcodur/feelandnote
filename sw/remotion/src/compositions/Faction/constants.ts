/**
 * 세력도(Faction) 컷 화면 공통 상수 — 폰트·색·여백·레이아웃·줌·전환 순환.
 * 여러 컷 컴포넌트가 공유한다(단일원천).
 */
import type React from 'react'
import type { FactionTransition } from './types'

export const FONT = "'Pretendard Variable', 'Pretendard', sans-serif"
/** 대사 자막 세리프 — 북리커맨드 '하단' 자막과 동일 필체(MaruBuri) */
export const FONT_SERIF = 'MaruBuri, "Noto Serif KR", serif'
/** 사진 위 텍스트 가독성 — 검정 외곽선 + 그림자. 이름·직함이 밝은 사진에 묻히지 않게. */
export const TEXT_PAINT: React.CSSProperties = {
  WebkitTextStroke: '1.2px rgba(0,0,0,0.92)',
  paintOrder: 'stroke fill',
  textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 20px rgba(0,0,0,0.7), 0 3px 10px rgba(0,0,0,0.6)',
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
/** 세로 쇼츠 대사 박스 — 화면 왼쪽 밖에서 슬라이드 인하는 시작 거리(px). 음수=왼쪽 */
export const PANEL_SLIDE_X = 520
/** 세로 쇼츠 대사 박스 슬라이드 인 길이(초) */
export const PANEL_SLIDE_SEC = 0.4

/** auto 전환에서 인물마다 번갈아 적용할 효과 순환 목록 */
export const TRANSITION_CYCLE: Exclude<FactionTransition, 'auto'>[] = ['zoomin', 'kenburns', 'slide', 'zoomout']
