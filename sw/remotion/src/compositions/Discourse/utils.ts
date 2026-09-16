/**
 * 가상 담화(Discourse) 컷 화면 공통 헬퍼 — 순수 로직(JSX 없음).
 *
 * 카메라 모션 계산·통합 명칭 분해·발화 시각 상대화, 그리고 담화 고유의 축
 * (발언→인물→전역 계승, 담화 이미지 경로, 인물색 폴백, 발언 컷 내부 시각)을 모은다.
 */
import { staticFile } from 'remotion'
import type { DiscourseScript, Speaker, Turn, DiscourseHoldMotion, DiscourseTransition } from './types'
import type { VoiceTimingSegment } from '../../lib/voice-timing'
import {
  CAST_COLORS, DEFAULT_ACCENT, DEFAULT_NOTICE, DEFAULT_NOTICE_EN,
  HOLD_ZOOM_RATE, HOLD_ZOOM_MAX, HOLD_ZOOMIN_RATE, HOLD_ZOOMIN_MAX, HOLD_ZOOMOUT_START, HOLD_PAN_ZOOM, HOLD_PAN_RATE, HOLD_PAN_MAX,
  HOLD_PULSE_AMP, HOLD_PULSE_PERIOD_SEC, HOLD_HANDHELD_ZOOM, HOLD_HANDHELD_AMP, HOLD_PUSHIN_GAIN,
} from './constants'
import { TURN_PAD_SEC, turnSec, f } from './timing'

/** 결정적 의사 난수(-1~1) — 같은 프레임·시드면 늘 같은 값이라 렌더가 재현된다 */
const noise = (frame: number, seed: number) => {
  const v = Math.sin(frame * 12.9898 + seed * 78.233) * 43758.5453
  return (v - Math.floor(v)) * 2 - 1
}

/** 지속 효과 옵션 — 줌인 푸시인 목표점(focusX·focusY %)과 줌·이동 속도 배수(speedMul).
 *  spanFrames: 줌이 상한까지 걸쳐 진행할 총 프레임(대사·컷 길이). 긴 단일 사진 컷에서 상한 조기 소진을 막기 위해 속도를 늘린다.
 *  미지정(다중 사진 전환 등)이면 기본 정속(HOLD_ZOOMIN_RATE)만 쓴다 — 사진이 바뀌어 상한 걱정이 없을 때. */
export type HoldOpts = { focusX?: number; focusY?: number; speedMul?: number; spanFrames?: number }

/** 줌인 푸시인 목표점을 향한 한 프레임 이동량(요소 % 기준). 목표점이 화면 중앙으로 끌려온다. */
const pushinShift = (focus: number | undefined, progress: number): number =>
  ((50 - (focus ?? 50)) * progress * HOLD_PUSHIN_GAIN)

/**
 * 흔들림(핸드헬드) 한 프레임의 변환 — 평소엔 잔잔하다 가끔씩만 흔들린다(느린 게이트가 임계를 넘는 구간만 활성).
 * z = 컷 로컬 프레임.
 */
const shakeParts = (z: number): { scale: number; tx: number; ty: number } => {
  const zz = Math.max(0, z)
  const gate = Math.max(0, noise(Math.floor(zz / 10), 23) - 0.35) / 0.65
  const a = HOLD_HANDHELD_AMP * gate
  return { scale: HOLD_HANDHELD_ZOOM, tx: noise(zz, 1) * a, ty: noise(zz, 7) * a }
}

/**
 * 지속 효과 한 프레임의 변환량 — 줌 배율(scale)·가로세로 이동(tx·ty %).
 * 컷 길이와 무관하게 프레임당 정속으로 누적하며 상한에서 멈춘다. z = 컷 로컬 프레임(시작 0).
 * speedMul로 누적 속도를 배수한다.
 * 줌인은 목표점(focus)이 있으면 푸시인 — 확대하며 그 지점을 화면 중앙으로 끌어당긴다.
 */
export const holdMotionParts = (hold: DiscourseHoldMotion, z: number, opts: HoldOpts = {}): { scale: number; tx: number; ty: number } => {
  const zz = Math.max(0, z)
  const spd = opts.speedMul ?? 1
  const zr = HOLD_ZOOM_RATE * spd
  const pr = HOLD_PAN_RATE * spd
  switch (hold) {
    case 'zoomin': {
      // 줌인은 전용 속도·상한으로 더 약하게(줌아웃·켄번스와 분리).
      // spanFrames 있음 = 긴 단일 사진 컷: 대사 길이에 맞춰 상한까지 균등 완주(조기 정지 방지, 속도 느려짐).
      // spanFrames 없음 = 기본 정속. 다중 사진 전환처럼 구간이 짧아 상한 걱정이 없을 때 쓴다.
      const zir = HOLD_ZOOMIN_RATE * spd
      const scale = opts.spanFrames && opts.spanFrames > 0
        ? 1 + (HOLD_ZOOMIN_MAX - 1) * Math.min(1, (zz / opts.spanFrames) * spd)
        : Math.min(HOLD_ZOOMIN_MAX, 1 + zir * zz)
      // 확대 진행도(0~1)에 맞춰 목표점을 중앙으로 끌어당긴다 — 상한 도달 시 최대치.
      const p = HOLD_ZOOMIN_MAX > 1 ? (scale - 1) / (HOLD_ZOOMIN_MAX - 1) : 0
      return { scale, tx: pushinShift(opts.focusX, p), ty: pushinShift(opts.focusY, p) }
    }
    case 'zoomout':
      // 지속 줌아웃 — 컷 내내 천천히 축소(여운).
      return { scale: Math.max(1, HOLD_ZOOMOUT_START - zr * zz), tx: 0, ty: 0 }
    case 'kenburns':
      return { scale: Math.min(HOLD_ZOOM_MAX, HOLD_PAN_ZOOM + zr * zz), tx: 0, ty: -Math.min(HOLD_PAN_MAX, pr * zz) }
    case 'panLeft':
      return { scale: HOLD_PAN_ZOOM, tx: -Math.min(HOLD_PAN_MAX, pr * zz), ty: 0 }
    case 'panRight':
      return { scale: HOLD_PAN_ZOOM, tx: Math.min(HOLD_PAN_MAX, pr * zz), ty: 0 }
    case 'zoomPulse':
      return { scale: 1 + HOLD_PULSE_AMP * Math.sin((2 * Math.PI * zz) / f(HOLD_PULSE_PERIOD_SEC)), tx: 0, ty: 0 }
    case 'handheld':
      return shakeParts(zz)
    default:
      return { scale: 1, tx: 0, ty: 0 }
  }
}

/** 줌인 푸시인 여부 — 목표점을 향해 카메라가 이동하는 모드라 확대 기준점(transform-origin)을 중앙에 둔다. */
export const isPushinZoom = (hold: DiscourseHoldMotion): boolean => hold === 'zoomin'

/** 지속 효과 변환을 CSS transform 문자열로. extraScale(사진 맞춤 확대)을 곱해 얹는다. */
export const holdMotionTransform = (hold: DiscourseHoldMotion, z: number, extraScale = 1, opts: HoldOpts = {}): string => {
  const { scale, tx, ty } = holdMotionParts(hold, z, opts)
  return `scale(${scale * extraScale}) translate(${tx}%, ${ty}%)`
}

/** 영상 파일 여부 — 확장자 기준(쿼리스트링·해시 무시). 이미지/영상 공용 src 분기에 쓴다 */
export const isVideoSrc = (src: string): boolean =>
  /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)

/** 통합 명칭(앞부분\n뒷부분)에서 앞부분(첫 줄)만. */
export const nameHead = (s?: string): string => {
  const i = (s ?? '').indexOf('\n')
  return i >= 0 ? s!.slice(0, i) : (s ?? '')
}
/** 통합 명칭에서 뒷부분(둘째 줄 이후). 없으면 빈 문자열. */
export const nameTail = (s?: string): string => {
  const i = (s ?? '').indexOf('\n')
  return i >= 0 ? s!.slice(i + 1).trim() : ''
}

/** 페이지 범위 [start,end) 의 토막 시각을 페이지 시작(0초) 기준으로 상대화 — Typewriter 점등 입력 */
export const sliceLocalTimings = (expanded: VoiceTimingSegment[], start: number, end: number): VoiceTimingSegment[] => {
  const base = expanded[start].start ?? 0
  return expanded.slice(start, end).map(t => ({
    ...t,
    start: (t.start ?? 0) - base,
    end: (t.end ?? 0) - base,
  }))
}

/**
 * 이름 → 사진 없는 인물 자리에 띄울 글자.
 *
 * 영문 이름 전제의 이니셜(Elon Musk → EM)을 한글 이름에 걸면
 * '일론 머스크' → '일머', '진시황' → '진시' 처럼 읽을 수 없는 글자가 나온다.
 * 담화는 인물 이름이 한글이 기본이므로 **한글이면 첫 글자 한 자**만 쓴다(문패처럼).
 * 영문 이름은 두 자 이니셜.
 */
export const initials = (name: string): string => {
  const n = name.trim()
  if (!n) return '?'
  if (/[가-힣]/.test(n)) return n[0] // 한글 — 첫 글자 한 자 (진시황→진, 샘 알트만→샘)
  const parts = n.split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

/**
 * 지속 효과 해석 — 발언 → 인물 → 에피소드 순으로 명시값을 찾고, 없으면 'none'(정지).
 * noZoom 은 전 컷 정지 스위치라 계승보다 우선한다.
 */
export const resolveHoldMotion = (
  turn: Turn | undefined,
  speaker: Speaker | undefined,
  script: DiscourseScript,
): DiscourseHoldMotion =>
  script.noZoom ? 'none' : (turn?.holdMotion ?? speaker?.holdMotion ?? script.holdMotion ?? 'none')

/** 진입 전환 해석 — 발언 → 인물 → 에피소드 계승. 미지정이면 undefined(크로스페이드) */
export const resolveTransition = (
  turn: Turn | undefined,
  speaker: Speaker | undefined,
  script: DiscourseScript,
): DiscourseTransition | undefined =>
  turn?.transition ?? speaker?.transition ?? script.transition

/**
 * 인물·시작·종료 이미지 경로.
 * - 외부 URL(http) → 그대로
 * - 폴더 경로(슬래시 포함, 예: 'cast/qin-shi-huang/01.png') → 에피소드 폴더 하위에서 직접
 * - basename(예: 'intro.png') → 에피소드 폴더 하위 images/ 에서 찾는다 (BO 업로드 호환)
 */
export const imgSrc = (episodeName: string, image: string): string =>
  /^https?:\/\//.test(image)
    ? image
    : image.includes('/')
      ? staticFile(`discourses/${episodeName}/${image}`)
      : staticFile(`discourses/${episodeName}/images/${image}`)

/**
 * 인물 색 — 데이터에 있으면 그것, 없으면 기본 팔레트를 자리 번호로 돌려 쓴다.
 * 담화는 누가 말하는지를 색으로 알리므로 인물마다 반드시 갈려야 한다.
 */
export const castColor = (speaker: Speaker | undefined, castIndex: number): string =>
  speaker?.color ?? CAST_COLORS[castIndex % CAST_COLORS.length] ?? DEFAULT_ACCENT

/**
 * 고지 문구 — 데이터에 없으면 기본 문구로 폴백한다.
 * **빈 문자열을 돌려주지 않는다.** 고지 없는 화면은 이 시리즈에서 허용하지 않는다(§3 고지 원칙).
 */
export const resolveNotice = (script: DiscourseScript, isEn: boolean): string => {
  const own = script.notice?.trim()
  if (own) return own
  return isEn ? DEFAULT_NOTICE_EN : DEFAULT_NOTICE
}

/**
 * 발언 컷 안에서 자막·음성이 시작하는 시각(초, 컷 로컬).
 * 컷 앞뒤 여백(TURN_PAD_SEC)을 절반씩 나눠 앞은 자막이 뜨는 틈, 뒤는 넘어가기 전 숨으로 쓴다.
 */
export const turnEnterSec = (): number => TURN_PAD_SEC / 2

/**
 * 발언 자막·음성이 흐르는 길이(초) — 컷 길이에서 앞뒤 여백을 뺀 값.
 * **렌더(TurnCard)와 자막(subs.ts)이 이 함수를 공유한다.** 각자 계산하면 자막이 영상과 어긋난다.
 */
export const turnSpeakSec = (t: Turn): number => Math.max(0.1, turnSec(t) - TURN_PAD_SEC)

/** 발언의 자막 덩어리 — chunks 가 있으면 그 배열, 없으면 text 통째 한 덩어리 */
export const turnChunks = (t: Turn): string[] =>
  t.chunks?.length ? t.chunks : (t.text ? [t.text] : [])

/**
 * 실제 발언 원문(origin)을 화면에 띄울 것인가.
 *
 * 원문은 **시청자가 읽을 수 있을 때만** 뜻이 있다. 머스크·알트만 편의 영어 원문은 읽히므로
 * "이건 진짜 한 말"이라는 근거가 되지만, 『사기』의 한문 사료는 읽히지 않아 화면에선 노이즈다.
 * 게다가 담화 대사가 이미 그 문장을 한글로 옮긴 것이라 같은 말을 두 번 보여주게 된다.
 * 읽히지 않는 원문은 화면에서 빼고 출처만 남긴다 — 데이터의 origin 은 검증 근거로 그대로 둔다.
 *
 * 판별은 한자(CJK 통합한자) 포함 여부. 한글 자막을 보는 시청자 기준이다.
 */
export const readableOrigin = (origin?: string): boolean =>
  !!origin && !/[一-鿿]/.test(origin)
