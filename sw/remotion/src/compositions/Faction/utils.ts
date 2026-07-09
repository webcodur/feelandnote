/**
 * 세력도(Faction) 컷 화면 공통 헬퍼 — 전환 해석·이미지 경로·인물 탐색·발화 시각 상대화.
 * 여러 컷 컴포넌트가 공유하는 순수 로직(JSX 없음).
 */
import { staticFile } from 'remotion'
import type { FactionScript, FactionGroup, FactionPerson, FactionCluster, FactionTransition, HoldMotion, EnterMotion, Orientation, GlitchSetting, GlitchLevel } from './types'
import type { TimedCue } from './timing'
import type { VoiceTimingSegment } from '../../lib/voice-timing'
import { CUT_TRANSITIONS, noise } from './transitions'
import {
  TRANSITION_CYCLE,
  HOLD_ZOOM_RATE, HOLD_ZOOM_MAX, HOLD_ZOOMIN_RATE, HOLD_ZOOMIN_MAX, HOLD_ZOOMOUT_START, HOLD_PAN_ZOOM, HOLD_PAN_RATE, HOLD_PAN_MAX,
  HOLD_PULSE_AMP, HOLD_PULSE_PERIOD_SEC, HOLD_HANDHELD_ZOOM, HOLD_HANDHELD_AMP, HOLD_PUSHIN_GAIN,
  ENTER_MOTION_SEC, ENTER_ZOOM_OUT_SEC, ENTER_ZOOM_OUT_START, ENTER_ZOOM_IN_START,
} from './constants'
import { f } from './timing'

/** 전환 설정 해석 — auto면 인물 순번으로 순환, 미지정이면 zoomout */
export const resolveTransition = (t: FactionTransition | undefined, idx: number): Exclude<FactionTransition, 'auto'> =>
  t === 'auto' ? TRANSITION_CYCLE[idx % TRANSITION_CYCLE.length] : (t ?? 'zoomout')

/**
 * 지속 효과 해석 — 인물→세력→에피소드 순으로 명시값을 찾고, 없으면 'none'(정지).
 * 전환(transition)과 완전히 독립된 축이다. 전환을 줌류로 설정해도 지속 효과로 자동 승계하지 않는다
 * (예전 레거시 승계 제거 — "전환만 골랐는데 컷이 저절로 줌되는" 혼란을 없앤다). 지속 효과는 명시해야 적용된다.
 */
export const resolveHoldMotion = (person: FactionPerson, group: FactionGroup, script: FactionScript): HoldMotion =>
  script.lockEffects ? (script.holdMotion ?? 'none')
    : (person.holdMotion ?? group.holdMotion ?? script.holdMotion ?? 'none')

/** 단체샷(화보·로고 카드)용 지속 효과 해석 — 묶음→세력→에피소드 계승, 미지정이면 none(정지). 묶음(그룹샷)은 자체 holdMotion으로 덮어쓸 수 있다(로고 카드는 cluster 없음). */
export const resolveGroupHoldMotion = (group: FactionGroup, script: FactionScript, cluster?: FactionCluster): HoldMotion =>
  script.lockEffects ? (script.holdMotion ?? 'none')
    : (cluster?.holdMotion ?? group.holdMotion ?? script.holdMotion ?? 'none')

/**
 * 지지직 글리치 토글 해석 — 줌(holdMotion)과 별개 축. 인물/묶음 → 세력 → 에피소드 순으로 계승.
 * 어느 단계에서도 미지정이면 fallback(그룹샷 true·개인샷 false)을 쓴다.
 * own = 인물(개인샷) 또는 묶음(그룹샷)의 자체 지정값.
 */
export const resolveGlitchHold = (own: GlitchSetting | undefined, group: FactionGroup, script: FactionScript, fallback: GlitchSetting): false | GlitchLevel => {
  const raw = script.lockEffects ? (script.holdGlitch ?? fallback)
    : (own ?? group.holdGlitch ?? script.holdGlitch ?? fallback)
  // 레거시 boolean 정규화 — true=heavy(기존 동작), false/미지정=끄기. 'light'·'heavy'는 그대로.
  return raw === true ? 'heavy' : (raw === false || raw == null) ? false : raw
}

/**
 * 흔들림(핸드헬드) 토글 해석 — 줌·이동(holdMotion)과 별개 축. 인물/묶음 → 세력 → 에피소드 순으로 계승.
 * 어느 단계에서도 미지정이면 꺼짐. own = 인물(개인샷) 또는 묶음(그룹샷)의 자체 지정값.
 */
export const resolveHoldShake = (own: boolean | undefined, group: FactionGroup, script: FactionScript): boolean =>
  script.lockEffects ? (script.holdShake ?? false)
    : (own ?? group.holdShake ?? script.holdShake ?? false)

/** 줌·이동 속도 배수 해석 — 인물/묶음 → 세력 → 에피소드 계승, 미지정이면 1(기본 속도). own = 인물 또는 묶음의 자체 지정값. */
export const resolveZoomSpeed = (own: number | undefined, group: FactionGroup, script: FactionScript): number =>
  script.lockEffects ? (script.zoomSpeed ?? 1)
    : (own ?? group.zoomSpeed ?? script.zoomSpeed ?? 1)

/** 시작 효과 해석 — 인물/묶음 → 세력 → 에피소드 계승, 미지정이면 'none'. own = 인물 또는 묶음의 자체 지정값. */
export const resolveEnterMotion = (own: EnterMotion | undefined, group: FactionGroup, script: FactionScript): EnterMotion =>
  script.lockEffects ? (script.enterMotion ?? 'none')
    : (own ?? group.enterMotion ?? script.enterMotion ?? 'none')

/**
 * 시작 효과 한 프레임의 배율 — 도입 길이(ENTER_MOTION_SEC) 동안 시작 배율에서 1.0으로 감속해 정착한다.
 * 도입이 끝나면 항상 1.0이라 지속 효과(holdMotion)와 1.0에서 매끄럽게 이어진다. z = 컷 로컬 프레임.
 */
/** 시작 효과 도입 길이(초) — 줌아웃은 더 짧게(빠르게 끊김), 그 외는 기본. 지속 효과 시작 시점 계산과 공유한다. */
export const enterMotionSec = (enter: EnterMotion): number =>
  enter === 'zoomout' ? ENTER_ZOOM_OUT_SEC : ENTER_MOTION_SEC

export const enterMotionScale = (enter: EnterMotion, z: number): number => {
  if (enter === 'none') return 1
  const dur = f(enterMotionSec(enter))
  const t = Math.min(1, Math.max(0, z) / dur)
  const start = enter === 'zoomout' ? ENTER_ZOOM_OUT_START : ENTER_ZOOM_IN_START
  // 줌아웃은 둔탁하게 — 가감속 없는 정속(linear)으로 컷 시작 즉시 일정 속도로 빠지다 끝에서 뚝 멈춘다.
  // 줌인은 그대로 easeOutCubic으로 부드럽게 안착.
  const e = enter === 'zoomout'
    ? t
    : 1 - Math.pow(1 - t, 3)
  return start + (1 - start) * e
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
 * 줌·이동(holdMotion)과 별개 축이라, 어느 줌/이동 위에도 겹쳐 합성한다. z = 컷 로컬 프레임.
 */
export const shakeParts = (z: number): { scale: number; tx: number; ty: number } => {
  const zz = Math.max(0, z)
  const gate = Math.max(0, noise(Math.floor(zz / 10), 23) - 0.35) / 0.65
  const a = HOLD_HANDHELD_AMP * gate
  return { scale: HOLD_HANDHELD_ZOOM, tx: noise(zz, 1) * a, ty: noise(zz, 7) * a }
}

/**
 * 지속 효과 한 프레임의 변환량 — 줌 배율(scale)·가로세로 이동(tx·ty %).
 * 컷 길이와 무관하게 프레임당 정속으로 누적하며 상한에서 멈춘다. z = 컷 로컬 프레임(시작 0).
 * 인물 컷·단체샷이 공유한다(같은 효과를 같은 빠르기로). speedMul로 누적 속도를 배수한다.
 * 줌인은 목표점(focus)이 있으면 푸시인 — 확대하며 그 지점을 화면 중앙으로 끌어당긴다.
 */
export const holdMotionParts = (hold: HoldMotion, z: number, opts: HoldOpts = {}): { scale: number; tx: number; ty: number } => {
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
      // 지속 줌아웃 — 컷 내내 천천히 축소(여운). 도입의 '팍 빠짐'은 시작 효과(enterMotion)가 담당한다.
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

/**
 * 줌·이동(holdMotion)에 흔들림(shake)을 겹쳐 합성한 한 프레임 변환 — 확대는 곱하고 이동은 더한다.
 * shake가 꺼지면 줌·이동만 그대로 반환한다(기존 동작 동일).
 */
export const holdAndShakeParts = (hold: HoldMotion, shake: boolean, z: number, opts: HoldOpts = {}): { scale: number; tx: number; ty: number } => {
  const base = holdMotionParts(hold, z, opts)
  if (!shake) return base
  const s = shakeParts(z)
  return { scale: base.scale * s.scale, tx: base.tx + s.tx, ty: base.ty + s.ty }
}

/** 줌인 푸시인 여부 — 목표점을 향해 카메라가 이동하는 모드라 확대 기준점(transform-origin)을 중앙에 둔다. */
export const isPushinZoom = (hold: HoldMotion): boolean => hold === 'zoomin'

/** 지속 효과 변환을 CSS transform 문자열로. extraScale(사진 맞춤 확대)을 곱해 얹는다. */
export const holdMotionTransform = (hold: HoldMotion, z: number, extraScale = 1, opts: HoldOpts = {}): string => {
  const { scale, tx, ty } = holdMotionParts(hold, z, opts)
  return `scale(${scale * extraScale}) translate(${tx}%, ${ty}%)`
}

/**
 * 인물·로고·화보 이미지 경로.
 * - 외부 URL(http) → 그대로
 * - 폴더 경로(슬래시 포함, 예: '1/앨런 튜링.webp') → 에피소드 폴더 하위에서 직접
 * - basename(예: 'logo.png') → 에피소드 폴더 하위 images/ 에서 찾는다 (BO 업로드 호환)
 */
export const imgSrc = (episodeName: string, image: string) =>
  /^https?:\/\//.test(image)
    ? image
    : image.includes('/')
      ? staticFile(`factions/${episodeName}/${image}`)
      : staticFile(`factions/${episodeName}/images/${image}`)

/** 영상 파일 여부 — 확장자 기준(쿼리스트링·해시 무시). 이미지/영상 공용 src 분기에 쓴다 */
export const isVideoSrc = (src: string): boolean =>
  /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)

/**
 * 시작 화면 소스 — 우선순위: 쇼츠 편별(introImageByPart[part]) → 롱폼 전용(introImageLong) → 공용(introImage).
 * 쇼츠는 편별 지정이 있으면 그 편만 다른 화면, 없으면 공용. 롱폼은 롱폼 전용, 없으면 공용.
 */
export const resolveIntroImage = (script: FactionScript, isShorts: boolean, part?: number): string | undefined =>
  (isShorts && part != null && script.introImageByPart?.[part])
  || (!isShorts && script.introImageLong)
  || script.introImage

/**
 * 마지막 화면 소스 — 우선순위: 쇼츠 편별(outroImageByPart[part]) → 롱폼 전용(outroImageLong) → 공용(outroImage).
 */
export const resolveOutroImage = (script: FactionScript, isShorts: boolean, part?: number): string | undefined =>
  (isShorts && part != null && script.outroImageByPart?.[part])
  || (!isShorts && script.outroImageLong)
  || script.outroImage

/** 이름 → 이니셜(이미지 없는 인물 플레이스홀더) */
export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')
}

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

/**
 * 세력의 그룹 목록(clusters 그대로).
 * 그룹이 1개뿐이고 그룹명(label)이 없으면 세력 명칭 뒷부분을 그룹명으로 폴백한다 — 이 폴백의 단일 지점.
 */
export const clustersOf = (g: FactionGroup): FactionCluster[] => {
  const cs = g.clusters ?? []
  return cs.length === 1 && !cs[0].label ? [{ ...cs[0], label: nameTail(g.name) || undefined }] : cs
}

/** 인물 컷의 컷 전환 종류 — 세로 쇼츠 인물 컷이고 전환이 컷 전환류면 그 kind, 아니면 null */
export const personCutKind = (script: FactionScript, cue: TimedCue['cue'], orientation: Orientation): string | null => {
  if (cue.kind !== 'person' || orientation !== 'portrait') return null
  const g = script.groups[cue.groupIndex]
  const person = clustersOf(g)[cue.clusterIndex].people[cue.personIndex]
  // 전환을 한 단계도 지정하지 않으면 크로스페이드(기본). 잠금(lockEffects) 시엔 전역 전환만 따른다.
  const raw = script.lockEffects ? script.transition : (person.transition ?? g.transition ?? script.transition)
  if (raw == null) return null
  const k = resolveTransition(raw, cue.personIndex)
  return CUT_TRANSITIONS.has(k) ? k : null
}

/** slug로 전체 세력에서 인물 찾기 — 비활성화 세력은 건너뛴다(인트로에서도 빠지게) */
export const findPerson = (script: FactionScript, slug: string): FactionPerson | null => {
  for (const g of script.groups) {
    if (g.disabled) continue
    const list = g.clusters.flatMap(c => c.people)
    const p = list.find(x => x.slug === slug && !x.disabled)
    if (p) return p
  }
  return null
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
