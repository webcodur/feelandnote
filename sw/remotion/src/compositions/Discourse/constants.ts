/**
 * 가상 담화(Discourse) 화면 공통 상수.
 *
 * 화면 규격(폰트·색·여백·모션 계수)은 팩션과 같은 무대를 쓰므로 팩션 상수를 그대로 재export 한다.
 * 두 시리즈가 나란히 놓였을 때 프레임·자막 위치가 어긋나면 같은 채널의 영상으로 안 보인다.
 * 담화 전용 값만 아래에 더한다.
 */

export {
  FONT, FONT_SERIF, TEXT_PAINT, accentClarityPaint,
  BG, FG, DEFAULT_ACCENT,
  HEADER_H, SAFE_BOTTOM, CONTENT_PAD,
  PERSON_ZOOM_OUT_SEC, PERSON_ZOOM_START,
  CONT_ZOOM_RATE, CONT_ZOOM_MAX,
  HOLD_ZOOM_RATE, HOLD_ZOOM_MAX,
  HOLD_ZOOMIN_RATE, HOLD_ZOOMIN_MAX,
  HOLD_PUSHIN_GAIN, HOLD_ZOOMOUT_START,
  ENTER_MOTION_SEC, ENTER_ZOOM_OUT_SEC, ENTER_ZOOM_OUT_START, ENTER_ZOOM_IN_START,
  HOLD_PAN_ZOOM, HOLD_PAN_RATE, HOLD_PAN_MAX,
  HOLD_PULSE_AMP, HOLD_PULSE_PERIOD_SEC,
  HOLD_HANDHELD_ZOOM, HOLD_HANDHELD_AMP,
  PANEL_SLIDE_X, PANEL_SLIDE_SEC,
} from '../Faction/constants'

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
