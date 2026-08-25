import React, { useMemo } from 'react'
import { AbsoluteFill, Sequence, Audio, interpolate, useCurrentFrame, staticFile, Easing } from 'remotion'
import type { FactionGroup, FactionPerson, FactionImageCrop, ZoomFocus, HoldMotion, EnterMotion, Orientation, GlitchLevel } from '../types'
import type { ImageFilter } from '../image-filters'
import { activeFactionMediaLayers, CROSSFADE_SEC, OUTRO_CROSSFADE_SEC, ENTER_NAME_SEC, ENTER_FADE_SEC, CREDIT_LINE_STAGGER_SEC, personEntryMediaOf, personLeadTiming, personAudioPlaySec, creditLinesOf, creditLineOffsetsSec, creditListSpanSec, epithetIsNarrated, epithetSpeakSec, linesTypingOf, f, type PersonSteps } from '../timing'
import { BG, FG, FONT, FONT_SERIF, TEXT_PAINT, DEFAULT_ACCENT, CONTENT_PAD, L_PHOTO_W, L_TEXT_PAD, PANEL_SLIDE_X, PANEL_SLIDE_SEC, accentClarityPaint } from '../constants'
import { imgSrc, initials, sliceLocalTimings, holdAndShakeParts, enterMotionScale, enterMotionSec, isPushinZoom } from '../utils'
import { vnPersonQuote, vnPersonEpithet, voiceRelPath, dbToLinear, clampRate } from '../voice-names'
import { Typewriter } from '../../../components/caption/Typewriter'
import { ShortCaption } from '../../../components/caption/ShortCaption'
import { expandSubTimings, type VoiceTimingSegment } from '../../../lib/voice-timing'
import { FactionMedia } from './FactionMedia'
import { HoldGlitch } from '../transitions'
import { CaptionBackdrop } from './CaptionBackdrop'
import { CaptionIdentityText, CaptionSwapSlot, resolveFactionCaptionAppearance } from './CaptionSwapSlot'

// 직함 마커 효과음(가로 롱폼) — 직함 줄이 하나씩 리스팅될 때마다 마커(점)가 톡 찍히는 소리.
// 전용 합성 자산(짧은 상승 블립). 톤 교체 시 이 파일명만 바꾼다.
const CREDIT_MARKER_SFX = 'common/sfx/credit-marker.wav'
const CREDIT_MARKER_VOL = 0.5

/**
 * 수식어 타이핑용 발화 시각 — 음원 없이 낱말(어절) 단위로 글자가 차오르게 가짜 시각을 만든다.
 * 전체 노출 시간(totalSec)을 어절 글자수 비례로 나눠 각 어절의 시작·끝(초)을 잡되,
 * 쉼표·마침표로 끝나는 어절 뒤에는 짧은 휴지를 둬 읽다 잠깐 쉬는 호흡을 준다.
 * 휴지 합만큼을 점등 시간에서 빼 전체 길이는 totalSec 그대로 유지한다.
 * Typewriter 가 이 시각을 받아 어절을 하나씩 점등한다(문장 단위 폴백이 아니라 낱말 단위).
 */
function epithetWordTimings(text: string, totalSec: number): VoiceTimingSegment[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= 1) return [] // 어절이 하나뿐이면 통째(폴백)
  // 어절 끝 구두점별 휴지(초) — 마침표류는 길게, 쉼표류는 짧게. 마지막 어절 뒤는 교차로 넘어가므로 휴지 없음.
  const PAUSE_SENTENCE = 0.3
  const PAUSE_COMMA = 0.16
  const pauseAfter = words.map((w, i): number => {
    if (i === words.length - 1) return 0
    const last = w.trim().slice(-1)
    if (/[.?!。]/.test(last)) return PAUSE_SENTENCE
    if (/[,，、]/.test(last)) return PAUSE_COMMA
    return 0
  })
  const pauseTotal = pauseAfter.reduce((a, b) => a + b, 0)
  // 점등에 쓸 시간 = 전체 - 휴지 합. 휴지가 과하면 점등이 너무 빨라지지 않게 하한(전체의 40%)을 둔다.
  const speakSec = Math.max(totalSec * 0.4, totalSec - pauseTotal)
  // 휴지 합이 남는 시간을 넘으면 비례 축소해 전체 길이를 넘지 않게 한다(뒷어절 유실 방지).
  const pauseRoom = Math.max(0, totalSec - speakSec)
  const pauseScale = pauseTotal > pauseRoom ? pauseRoom / pauseTotal : 1
  const lens = words.map(w => w.length)
  const total = lens.reduce((a, b) => a + b, 0) || 1
  let cur = 0
  return words.map((w, i) => {
    const dur = (speakSec * lens[i]) / total
    const seg: VoiceTimingSegment = { start: cur, end: cur + dur, text: w }
    cur += dur + pauseAfter[i] * pauseScale // 구두점 뒤 휴지만큼 다음 어절 점등을 미룬다
    return seg
  })
}

/**
 * 수식어 글자 단위 점등 시각 — 어절 단위(epithetWordTimings) 대신 한 글자씩 순차 점등용.
 * 전체 노출 시간을 글자 수 비례로 나누되, 구두점 뒤에는 짧은 휴지를 둬 읽는 호흡을 준다.
 * 공백은 점등 시간 0으로 두고(다음 글자와 함께 넘어감), 휴지 합만큼 점등 시간에서 빼 전체 길이를 유지한다.
 * Typewriter가 charLevel 모드에서 이 시각을 받아 글자를 하나씩 점등한다.
 */
function epithetCharTimings(text: string, totalSec: number): VoiceTimingSegment[] {
  const chars = Array.from(text)
  if (chars.length <= 1) return []
  const PAUSE_SENTENCE = 0.3
  const PAUSE_COMMA = 0.16
  const pauseAfter = chars.map((c, i): number => {
    if (i === chars.length - 1) return 0
    if (/[.?!。]/.test(c)) return PAUSE_SENTENCE
    if (/[,，、]/.test(c)) return PAUSE_COMMA
    return 0
  })
  const pauseTotal = pauseAfter.reduce((a, b) => a + b, 0)
  const speakSec = Math.max(totalSec * 0.4, totalSec - pauseTotal)
  // 휴지 합이 남는 시간을 넘으면 비례 축소한다. 구두점이 많은 수식어(예: `... ... !!! !!!`)에서
  // 휴지만으로 노출 시간을 넘겨 뒷글자가 컷 밖으로 밀려나면 화면에 아무것도 안 뜬다.
  const pauseRoom = Math.max(0, totalSec - speakSec)
  const pauseScale = pauseTotal > pauseRoom ? pauseRoom / pauseTotal : 1
  // 공백은 가중치 0(즉시 통과), 그 외 글자는 균등 가중치.
  const weights = chars.map((c): number => (/\s/.test(c) ? 0 : 1))
  const wTotal = weights.reduce((a, b) => a + b, 0) || 1
  let cur = 0
  return chars.map((c, i) => {
    const dur = (speakSec * weights[i]) / wTotal
    const seg: VoiceTimingSegment = { start: cur, end: cur + dur, text: c }
    cur += dur + pauseAfter[i] * pauseScale
    return seg
  })
}

/**
 * 직함 타이핑용 글자 점등 시각 — 마커(줄)별로 살짝 끊어 치는 분리감을 준다.
 * 줄 경계(`\n`)마다 미세한 휴지(LINE_PAUSE)를 넣어, 1행 끝난 후 + 2·3행 사이에 약간의 텀.
 * 공백·마커점(·)·개행은 점등 시간 0(즉시 통과)으로 두고, 나머지 글자에 시간을 균등 배분한다.
 * 휴지 합만큼을 점등 시간에서 빼 전체 길이(totalSec)를 유지한다.
 * Typewriter가 charLevel 모드에서 이 시각을 받아 글자를 하나씩 점등한다.
 */
function creditTypingTimings(text: string, totalSec: number): VoiceTimingSegment[] {
  const chars = Array.from(text)
  if (chars.length <= 1) return []
  const LINE_PAUSE = 0.15 // 줄(마커) 사이 미세한 텀 — 1행 끝난 후 + 2·3행 사이에 약간의 여유
  const pauseAfter = chars.map((c, i): number => {
    if (i === chars.length - 1) return 0
    return c === '\n' ? LINE_PAUSE : 0
  })
  const pauseTotal = pauseAfter.reduce((a, b) => a + b, 0)
  const speakSec = Math.max(totalSec * 0.4, totalSec - pauseTotal)
  // 공백·개행·마커점은 가중치 0(즉시 통과), 그 외 글자만 점등 시간 배분.
  const weights = chars.map((c): number => (/\s/.test(c) || c === '·' ? 0 : 1))
  const wTotal = weights.reduce((a, b) => a + b, 0) || 1
  let cur = 0
  return chars.map((c, i) => {
    const dur = (speakSec * weights[i]) / wTotal
    const seg: VoiceTimingSegment = { start: cur, end: cur + dur, text: c }
    cur += dur + pauseAfter[i]
    return seg
  })
}

/**
 * 대사 페이지 + 글자 점등 — 사람이 의미 단위로 끊어둔 덩어리(chunks)를 박스 분량(maxChars)까지
 * 모아 페이지로 묶고, 음원 진행에 맞춰 한 페이지씩 교체하며 공통 Typewriter로 읽는 글자를 점등한다.
 * 덩어리 경계로만 끊으므로 단어가 잘리지 않고, 한 페이지 분량만 그려 박스가 무한정 늘어나지 않는다.
 * 발화 시각(timings)이 덩어리 수와 맞으면 실제 시각으로, 아니면 글자수 비례로 전환·점등한다(폴백).
 */
export const QuotePages: React.FC<{
  chunks: string[]
  timings?: VoiceTimingSegment[]
  startFrame: number
  spreadFrames: number
  fontSize: number
  color: string
  highlightColor: string
  maxChars: number
  opacity: number
  lineHeight?: number
}> = ({ chunks, timings, startFrame, spreadFrames, fontSize, color, highlightColor, maxChars, opacity, lineHeight = 1.3 }) => {
  const frame = useCurrentFrame()

  // 빈 덩어리("" — 연속 개행)를 뺀 실제 덩어리. 발화 시각(expanded)·점등은 이 단위와 1:1.
  const realChunks = useMemo(() => chunks.filter(c => c && c.trim()), [chunks])
  // 실제 덩어리를 박스 분량까지 모아 페이지로 묶는다. 빈 덩어리를 만나면 분량과 무관하게 페이지를 강제로 끊는다.
  // page.start/end 는 빈 덩어리를 뺀 실제 덩어리 인덱스 범위 [start,end).
  const pages = useMemo(() => {
    const out: { text: string; start: number; end: number }[] = []
    let cur = ''
    let curStart = 0
    let ri = 0 // 실제 덩어리 인덱스
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i]
      if (!c || !c.trim()) { // 빈 덩어리 = 페이지 강제 경계
        if (cur) { out.push({ text: cur, start: curStart, end: ri }); cur = ''; curStart = ri }
        continue
      }
      const cand = cur ? `${cur} ${c}` : c
      if (cand.length > maxChars && cur) {
        out.push({ text: cur, start: curStart, end: ri })
        cur = c; curStart = ri
      } else {
        cur = cand
      }
      ri++
    }
    if (cur) out.push({ text: cur, start: curStart, end: ri })
    return out.length ? out : [{ text: realChunks.join(' '), start: 0, end: realChunks.length }]
  }, [chunks, realChunks, maxChars])

  // 덩어리별 발화 시각 — 펼친 토막 수가 실제 덩어리 수와 같을 때만 실제 시각을 쓴다(아니면 폴백).
  const expanded = useMemo(() => (timings ? expandSubTimings(timings) : undefined), [timings])
  const useTimings = !!expanded && expanded.length === realChunks.length
    && expanded.every(t => t.start != null && t.end != null)

  const totalChars = realChunks.join(' ').length || 1
  const charsBefore = (pi: number) => pages.slice(0, pi).reduce((s, p) => s + p.text.length + 1, 0)
  const pageStart = (pi: number): number => useTimings
    ? startFrame + f(expanded![pages[pi].start].start!)
    : startFrame + Math.round(spreadFrames * (charsBefore(pi) / totalChars))

  const tw = (text: string, ps: number, spread: number, segTimings?: VoiceTimingSegment[]) => (
    <Typewriter
      text={text} startFrame={ps} spreadFrames={spread}
      fontSize={fontSize} color={color} highlightColor={highlightColor}
      timings={segTimings} style={{ lineHeight, textAlign: 'left', fontWeight: 800, wordBreak: 'keep-all', WebkitTextStroke: '1.6px rgba(0,0,0,0.9)', paintOrder: 'stroke fill', textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.75), 0 4px 16px rgba(0,0,0,0.55)' }} keepLit
    />
  )

  // 단일 페이지 — 전환 없이 통째 점등
  if (pages.length <= 1) {
    const seg = useTimings ? sliceLocalTimings(expanded!, 0, realChunks.length) : undefined
    return <div style={{ gridArea: '1 / 1', opacity }}>{tw(pages[0].text, startFrame, spreadFrames, seg)}</div>
  }

  // 멀티 페이지 — 모든 페이지를 같은 칸(grid 1/1)에 겹쳐 쌓고 현재 페이지만 보인다.
  // 안 보이는 페이지도 자리를 차지하므로 박스 높이가 '가장 큰 페이지' 기준으로 컷 시작부터 고정된다.
  // → 페이지가 바뀌거나 음성이 늦게 시작해도 박스(따라서 이름)의 높낮이가 흔들리지 않는다.
  return (
    <div style={{ gridArea: '1 / 1', opacity, display: 'grid' }}>
      {pages.map((page, pi) => {
        const isLast = pi === pages.length - 1
        const ps = pageStart(pi)
        const nextPs = isLast
          ? (useTimings ? startFrame + f(expanded![page.end - 1].end!) : startFrame + spreadFrames)
          : pageStart(pi + 1)
        // 첫 페이지는 점등 시작(ps)이 아니라 대사 등장(startFrame)부터 보이게 한다(음성 앞 무음 대비). 점등 자체는 ps 시각 그대로.
        const showFrom = pi === 0 ? startFrame : ps
        const visible = frame >= showFrom && (isLast || frame < nextPs)
        const seg = useTimings ? sliceLocalTimings(expanded!, page.start, page.end) : undefined
        return (
          <div key={pi} style={{ gridArea: '1 / 1', opacity: visible ? 1 : 0 }}>
            {tw(page.text, ps, Math.max(1, nextPs - ps), seg)}
          </div>
        )
      })}
    </div>
  )
}

// 인물 직함·이력 — 한 항목 = 한 줄. 여러 줄이면 세력 색 점 마커를 붙여 세로 리스트로 보인다(단일 줄은 마커 없이).
// 각 줄은 밑에서 한 줄씩 순차로 떠오른다(startFrame부터 staggerFrames 간격). frame은 컷 로컬 프레임(lt).
const CreditLines: React.FC<{ items: string[]; accent: string; fontSize: number; frame: number; startFrame: number; offsetsFrames: number[]; emphasizeFirst?: boolean }> = ({ items, accent, fontSize, frame, startFrame, offsetsFrames, emphasizeFirst = false }) => {
  const isList = items.length > 1
  const dot = Math.round(fontSize * 0.25)
  const gap = Math.round(fontSize * 0.4)
  const rise = Math.round(fontSize * 0.55)
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isList ? Math.round(fontSize * 0.4) : 0 }}>
      {items.map((t, i) => {
        const ls = startFrame + (offsetsFrames[i] ?? 0)
        const op = interpolate(frame, [ls, ls + f(ENTER_FADE_SEC)], [0, 1], clamp)
        const ty = interpolate(frame, [ls, ls + f(ENTER_FADE_SEC)], [rise, 0], { ...clamp, easing: Easing.out(Easing.cubic) })
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap, opacity: op, transform: `translateY(${ty}px)` }}>
            {isList ? <span style={{ flexShrink: 0, width: dot, height: dot, borderRadius: '50%', background: accent, marginTop: Math.round(fontSize * 0.5) }} /> : null}
            <span style={{ color: emphasizeFirst && i === 0 ? accent : '#e8e8ee', fontFamily: FONT, fontSize, fontWeight: emphasizeFirst && i === 0 ? 800 : 700, letterSpacing: 0.3, lineHeight: 1.4, textAlign: 'left', wordBreak: 'keep-all', overflowWrap: 'break-word', ...TEXT_PAINT }}>{t}</span>
          </div>
        )
      })}
    </div>
  )
}

export const PersonCard: React.FC<{
  episodeName: string; group: FactionGroup; person: FactionPerson; frame: number; cueStart: number; cueDuration: number
  orientation: Orientation; groupIndex: number; personIndex: number; clusterIndex?: number; steps: PersonSteps
  /** 인물 신원 음성의 원래 장면 좌표. 통합 beat가 다른 장면에 놓여도 수식어 음원은 원래 파일을 쓴다. */
  voiceClusterIndex?: number
  /** 통합 beat가 실제로 사용할 대사 음원. 없으면 구 인물 위치 음원을 쓴다. */
  quoteVoiceFile?: string
  voiceTiming?: VoiceTimingSegment[]; zoomFreezeSec?: number; isShorts?: boolean; isLast?: boolean; noZoom?: boolean
  hold?: HoldMotion; enter?: EnterMotion; glitch?: false | GlitchLevel; shake?: boolean; zoomSpeed?: number
  /** 대사 화면 표시 — CueLayer 가 인물→에피소드 기본을 풀어 넘긴다. 'box'(기본) | 'caption'(작은 자막) */
  quoteDisplay?: 'box' | 'caption'
  /** 작은 자막 세로 위치 — 'bottom'(기본) | 'center'(중하단 밴드) */
  quoteCaptionPos?: 'bottom' | 'center'
  /** 작은 자막 폰트 스타일 — 'default'(기본) | 'serif-large'(세리프 좀 더 큼) */
  quoteCaptionSize?: 'default' | 'large'
  quoteCaptionFont?: 'default' | 'serif'
  /**
   * 다음 컷이 이 컷 끝보다 앞당겨 들어오는 시간(초) — CueLayer 가 다음 컷 전환 종류로 계산해 넘긴다.
   * 이 컷의 글자를 그 시점 전에 다 걷어, 다음 인물 신원과 같은 자리에서 겹쳐 읽히지 않게 한다.
   */
  nextEnterSec?: number
  /** 자막형에서 대사 전 이름·직함 노출 시간(초) — CueLayer 가 편 설정을 풀어 넘긴다. 컷 길이 계산과 같은 값이어야 한다 */
  captionIdHoldSec?: number
}> = ({ episodeName, group, person, frame, cueStart, cueDuration, orientation, groupIndex, personIndex, clusterIndex, voiceClusterIndex, quoteVoiceFile, steps, voiceTiming, zoomFreezeSec, isShorts = false, isLast = false, noZoom = false, hold = 'none', enter = 'none', glitch = false, shake = false, zoomSpeed = 1, quoteDisplay = 'box', quoteCaptionPos = 'bottom', quoteCaptionSize = 'default', quoteCaptionFont = 'default', nextEnterSec = 0, captionIdHoldSec }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  const [imgErr, setImgErr] = React.useState(false)
  const local = frame - cueStart
  const showIdentity = steps.identity !== false
  const entryMedia = personEntryMediaOf(person, group, clusterIndex ?? 0)
  const baseImage = entryMedia.image
  const baseImageCrop = entryMedia.crop
  // 롱폼은 사진을 기다리지 않고 텍스트가 컷과 거의 동시에 바로 등장 — 등장 타이밍을 ENTER_NAME_SEC만큼 앞당긴다(세로 쇼츠는 기존 그대로)
  const lt = orientation === 'landscape' ? local + f(ENTER_NAME_SEC) : local
  // 대사 소스 — 덩어리(quoteChunks)가 있으면 그 배열을, 없으면 통째 quote를 단일 덩어리로.
  // 덩어리 경계는 줄바꿈이 아니라 색 전환점으로만 쓴다(화면에선 한 흐름으로 이어짐).
  const quoteChunks = person.quoteChunks?.length ? person.quoteChunks : (person.quote ? [person.quote] : [])
  // 리드 시퀀스(직함→수식어→대사) 시각 — 길이 계산(timing)과 동일 SSoT
  // 작은 자막 모드는 이름·직함1 최소 1초 홀드를 타이밍 SSoT에 반영(quoteDisplay prop = CueLayer 해석값)
  const lead = personLeadTiming(person, steps, isShorts, { captionMode: quoteDisplay === 'caption', captionIdHoldSec })
  // 음성 스텝이 켜져야 대사가 뜬다(꺼지면 대사 없음).
  const hasQuote = steps.voice && quoteChunks.length > 0
  // 음원이 없는 무음 대사(읽기 전용)는 자막을 살짝 흐리게 — 음원 재생 대사와 톤 구분.
  const silentQuote = !(person.quoteDuration && person.quoteDuration > 0)
  // 작은 자막 모드 — 박스 안 Typewriter 대신 ShortCaption(글래스 태블릿)으로 대사를 띄운다.
  const useCaption = quoteDisplay === 'caption'
  // 직함·이력 — 최대 3행. 1번 줄은 (전원) 이름 옆에 고정. 2·3번 줄은 직함 스텝이 켜졌을 때 순차 노출.
  const creditItems = creditLinesOf(person)
  const creditHead = creditItems[0]       // 이름 옆 고정(전원)
  const creditRest = creditItems.slice(1) // 아래 슬롯 순차(직함 스텝)
  // 수식어(문장형) — 세로 롱폼에서 수식어 스텝이 켜졌을 때. 타이핑으로 떠올라 읽힌 뒤 다음으로 교차.
  const epithet = person.epithet ?? ''
  const hasEpithet = lead.epiOn

  // ── 인물 사진 "지속 효과"(세로 쇼츠 전용) — 컷이 떠 있는 동안 사진에 계속 거는 카메라 움직임 ──
  // 컷 진입 전환(slide·glitch 등)은 바깥(CueLayer·CutEnter)이 담당하므로, 여기선 머무는 동안의 모션만 만든다.
  // hold 는 CueLayer 가 인물→세력→에피소드 계승(레거시 zoom 승계 포함)을 풀어 넘긴 값. 계산은 단체샷과 공유(utils).
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
  // 가로 롱폼·정지·전역 정지 스위치면 모션 없음. 그 외엔 기준 시각(마지막 컷은 대사 끝에서 멈춤)으로 지속 변환을 만든다.
  const holdOff = noZoom || (hold === 'none' && !shake) || orientation === 'landscape'
  // 시작 효과는 가로 롱폼·정지 모드에서만 끈다(세로에선 지속 없이 시작 효과만도 가능).
  const enterOff = noZoom || orientation === 'landscape'
  const holdZ = Math.max(0, zoomFreezeSec != null ? Math.min(local, f(zoomFreezeSec)) : local)
  // 시작 효과(도입 짧은 임팩트) × 지속 효과(도입 후 컷 내내)를 결합한다.
  // 도입 동안은 시작 배율이 1.0으로 정착하고, 지속 효과는 도입이 끝난 시점(local-도입길이)부터 누적해 1.0에서 매끄럽게 이어진다.
  // 푸시인 목표점 — 줌 전용 목표점 → 그 사진의 사진맞춤 위치 → 가운데 순으로 폴백. 속도는 계승값(zoomSpeed) 배수.
  const enterFrames = f(enterMotionSec(enter))
  // 줌 기준 구간 끝 — 마지막 컷은 대사 종료(zoomFreezeSec), 그 외는 컷 끝.
  // 단일 사진 + 긴 대사: spanFrames로 전체 구간에 줌을 늘린다(상한 조기 소진 방지).
  // 다중 사진 전환: 사진마다 줌 재시작 + 정속(span 없음) — 체류가 짧아 상한까지 갈 염려가 없다.
  const holdSpanEnd = zoomFreezeSec != null ? f(zoomFreezeSec) : cueDuration
  const holdSpanFrames = Math.max(1, holdSpanEnd - enterFrames)
  /**
   * 지속 줌 transform.
   * @param holdLocalStart 이 사진이 뜨는 컷 로컬 프레임(0=첫 사진). 교체 사진마다 줌을 여기서 재시작한다.
   * @param stretchSpan 줌을 늘릴 총 프레임. 있으면 긴 대사 완주 모드, 없으면 기본 정속.
   * @param focus 이 사진 전용 줌 목표점. 미지정이면 인물 zoomFocus → 그 사진 crop 위치 → 가운데.
   */
  const holdTf = (extraScale = 1, crop?: FactionImageCrop, holdLocalStart = 0, stretchSpan?: number, focus?: ZoomFocus) => {
    // 시작 효과(enter)는 컷 첫 사진에만. 교체 사진은 1.0에서 지속 줌만 다시 깐다.
    const enterS = enterOff || holdLocalStart > 0 ? 1 : enterMotionScale(enter, holdZ)
    if (holdOff) return `scale(${enterS * extraScale})`
    const zForHold = holdLocalStart > 0
      ? Math.max(0, holdZ - holdLocalStart)
      : Math.max(0, holdZ - enterFrames)
    const { scale, tx, ty } = holdAndShakeParts(hold, shake, zForHold, {
      focusX: focus?.x ?? person.zoomFocus?.x ?? crop?.x,
      focusY: focus?.y ?? person.zoomFocus?.y ?? crop?.y,
      speedMul: zoomSpeed,
      // stretchSpan 있을 때만 대사 길이 늘림. 다중 사진은 인자 생략 → 정속.
      ...(stretchSpan != null && stretchSpan > 0 ? { spanFrames: stretchSpan } : {}),
    })
    const totalScale = enterS * scale * extraScale
    // 푸시인(줌인)은 확대하며 목표점을 화면 중앙으로 끌어당긴다. 목표점을 가장자리로 잡으면 이동량이
    // 확대 여유분을 넘어 사진 밖(검정)이 드러난다. 확대 기준점이 중앙(transform-origin 50% 50%)이므로
    // 각 방향 안전 이동폭 = 50·(S−1)/S %. 그 밖으로는 잘라내 목표점을 극단으로 찍어도 검정이 안 보이게 한다.
    const maxShift = isPushinZoom(hold) && totalScale > 1 ? (50 * (totalScale - 1)) / totalScale : Infinity
    const cx = Math.max(-maxShift, Math.min(maxShift, tx))
    const cy = Math.max(-maxShift, Math.min(maxShift, ty))
    return `scale(${totalScale}) translate(${cx}%, ${cy}%)`
  }
  const pushin = !holdOff && isPushinZoom(hold)
  // 1) 박스 슬라이드. 이름 먼저 (박히게, box와 함께).
  // 1행 직함값 지연(0.45s + 0.30s rise)은 롱폼 + showCreditRest(직함 따로 처리)일 때만 적용.
  // 바로 대사(voice/text) 케이스는 이름과 같이 즉시.
  // (그 다음 2·3번 순차 타이핑)
  // 세로는 박스째 왼쪽 슬라이드(가로는 페이드만).
  const nameOp = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 가로 롱폼 이름 등장 — 직함 줄처럼 아래에서 살짝 떠오르며 들어온다(정적으로 미리 떠 있지 않게).
  const nameRise = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [30, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })

  // 롱폼 + showCreditRest(직함 따로)에서만 사용하는 1번 직함 지연 값.
  // 그 외는 이름과 함께 즉시 표시.
  const creditHeadStart = ENTER_NAME_SEC + 0.45
  const creditHeadFadeSec = 0.30
  // 세로 박스 슬라이드 — 왼쪽 밖(-PANEL_SLIDE_X)에서 제자리(0)로. 슬라이드와 페이드를 같은 구간에 묶는다
  const panelSlideX = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + PANEL_SLIDE_SEC)], [-PANEL_SLIDE_X, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const panelOp = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 텍스트 선퇴장 — 인물 컷이 끝나기 전에 이름·직함·자막을 미리 페이드아웃.
  // (컷 경계에서 펑 하고 사라지지 않게. 사진은 CueLayer 전환이 담당.)
  // 마지막 인물은 최종화면 크로스페이드 직전 구간에서 거둔다.
  const BOX_EXIT_SEC = 0.5
  // 글자를 다 거두는 시점 — 마지막 인물은 최종화면 크로스페이드 직전, 그 외는 다음 컷이 겹쳐 들어오기 직전.
  // (예전엔 컷 끝에 맞춰 거뒀다. 다음 컷은 전환 길이만큼 먼저 들어오므로 그 구간에서 이전 대사와
  //  다음 인물 신원이 같은 중앙 자리에 함께 떠 서로 읽혔다.)
  const exitEndRaw = isLast
    ? cueDuration - f(OUTRO_CROSSFADE_SEC)
    : cueDuration - f(nextEnterSec)
  // 대사가 뜨자마자 걷히는 역전을 막는 하한 — 대사 등장 뒤 최소 한 박자는 남긴다.
  const exitFloor = f(lead.quoteEnterSec + ENTER_FADE_SEC + 0.3)
  // 컷이 아주 짧아 앞당길 여유가 없으면 예전처럼 컷 끝에 맞춰 걷는다(글자가 컷 시작부터 흐려지는 일 방지).
  const exitEnd = Math.min(cueDuration, Math.max(exitFloor + 1, exitEndRaw))
  const exitStart = Math.max(0, exitEnd - f(BOX_EXIT_SEC))
  const boxExitOp = interpolate(local, [exitStart, exitEnd], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 2) 직함 — 1행 직함값 지연은 useDelayedHead (!isShorts && showCreditRest)일 때만.
  //   그 외(바로 대사)는 이름과 동시 표시. showCreditRest일 때 2·3번은 1행 이후 시작.
  const quoteEnterSec = lead.quoteEnterSec
  const creditOp = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 3) 대사 — 켜진 리드 스텝(직함·수식어)을 다 보여준 뒤(quoteEnterSec) 등장.
  const quoteOp = interpolate(lt, [f(quoteEnterSec), f(quoteEnterSec + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 수식어 리드인 — 대사가 있으면 그 직전에 페이드아웃(교차), 대사가 없으면(마지막 리드) 켜진 채 유지.
  const epithetOp = hasQuote
    ? interpolate(lt, [f(quoteEnterSec - ENTER_FADE_SEC), f(quoteEnterSec)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  // 수식어 등장 — 직함 리드(있으면) 뒤(lead.epithetStartSec)에 부드럽게 떠오르고, 나레이터가 낭독하는 동안 머문다.
  const epithetStartF = f(lead.epithetStartSec)
  const epithetInOp = interpolate(lt, [epithetStartF, epithetStartF + f(ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const epithetInTy = interpolate(lt, [epithetStartF, epithetStartF + f(ENTER_FADE_SEC)], [14, 0], { ...clamp, easing: Easing.out(Easing.cubic) })
  // 직함 2·3번 줄(직함 스텝) — 다음 스텝(수식어 또는 대사) 직전 페이드아웃, 마지막 리드면 유지.
  const showCreditRest = lead.creditOn && creditRest.length > 0
  const creditExitSec = lead.epiOn ? lead.epithetStartSec : (hasQuote ? quoteEnterSec : Infinity)
  const creditRestOp = Number.isFinite(creditExitSec)
    ? interpolate(lt, [f(creditExitSec - ENTER_FADE_SEC), f(creditExitSec)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1

  // 직함1번 지연은 "직함을 따로 출력처리" (showCreditRest) + 롱폼(!isShorts)인 경우에만.
  // 바로 대사(voice/text) 케이스는 이름과 같이 즉시 띄움.
  const useDelayedHead = !isShorts && showCreditRest  // 롱폼에서 직함 따로 출력(credit step)할 때만 1번 직함 지연. 바로 대사는 이름과 함께.
  // 가로 롱폼: 직함 리드가 뜨는 인물은 1번째 줄까지 아래 리스트로 내려 전 줄을 리스트형으로 보인다(대사·수식어 인물 포함).
  // 첫 줄은 세력색으로 강조(이름 옆에 붙던 직함과 동일 색). 리드가 끝나면 리스트가 사라지며 수식어·대사로 넘어간다.
  const creditListFull = showCreditRest
  const creditListItems = creditListFull ? creditItems : creditRest

  // 직함 타이핑용 텍스트와 전체 span은 여기서 미리 계산 (creditRestAvailableSec 등에서 참조되므로 선언 순서 중요)
  const creditTypedTextLandscape = creditListItems.map(t => (creditListItems.length > 1 ? `· ${t}` : t)).join('\n')
  const creditTypedTextPortrait = creditRest.map(t => (creditRest.length > 1 ? `· ${t}` : t)).join('\n')
  // 타이핑 총 길이 — 리드 종료 전에 완주하도록.
  const creditTypingSpanSec = Math.max(0.4, creditListSpanSec(person, true) - ENTER_FADE_SEC - 0.15)

  // 리스트 첫 줄 등장 시각(초, 컷 로컬) — 이름(ENTER_NAME_SEC)이 먼저 뜬 뒤 한 박자(stagger) 늦게 첫 항목이 이어 뜬다.
  // (이름과 첫 항목이 동시에 튀지 않게 분리.)
  const creditListStartSec = ENTER_NAME_SEC + CREDIT_LINE_STAGGER_SEC

  // 세로 대사박스(쇼츠/LV 포트레이트) 직함 스텝(showCreditRest)일 때:
  // 1행(이름+직함1) 끝난 후 미세한 텀 두고 2·3번 직함 순차 등장.
  // (portraitCreditRestStartSec = creditHeadEnd + 0.12)
  const boxSlideEndSec = ENTER_NAME_SEC + PANEL_SLIDE_SEC
  const effectiveHeadEndSec = useDelayedHead
    ? (creditHeadStart + creditHeadFadeSec)
    : (ENTER_NAME_SEC + ENTER_FADE_SEC)
  // 1행 직함 끝난 후 미세한 텀(0.12s) 두고 2·3행 시작. 그 사이(줄 간)에도 미세한 텀.
  const portraitCreditRestStartSec = showCreditRest
    ? Math.max(boxSlideEndSec, effectiveHeadEndSec + 0.12)
    : ENTER_NAME_SEC + CREDIT_LINE_STAGGER_SEC

  // 직함 스텝일 때 1행 끝 + 미세 텀 후 시작하므로, 실제 사용 가능한 시간을 계산해
  // 타이핑 spread와 SFX 지속시간이 fade-out 전에 마무리되도록 맞춘다.
  const creditRestAvailableSec = (showCreditRest && Number.isFinite(creditExitSec))
    ? Math.max(0.4, creditExitSec - portraitCreditRestStartSec - 0.08)
    : creditTypingSpanSec

  const headStartSec = useDelayedHead ? creditHeadStart : ENTER_NAME_SEC
  const headFadeSec = useDelayedHead ? creditHeadFadeSec : ENTER_FADE_SEC
  const creditHeadOp = interpolate(
    lt,
    [f(headStartSec), f(headStartSec + headFadeSec)],
    [0, 1],
    clamp
  )
  const creditHeadTy = useDelayedHead
    ? interpolate(
        lt,
        [f(headStartSec), f(headStartSec + headFadeSec)],
        [10, 0],
        { ...clamp, easing: Easing.out(Easing.cubic) }
      )
    : 0

  // 줄별 등장 시각(리스트 시작 기준) — 긴 줄일수록 다음 줄까지 더 오래 머문다(읽을 시간). timing과 동일 산식.
  // 리스트 줄 집합은 렌더 분기 기준: 가로는 전체, 세로(롱폼·쇼츠)는 1줄이 이름 옆이라 나머지만.
  const creditListOffsetsSec = creditLineOffsetsSec(person, orientation !== 'landscape')

  // 음성 스텝이 켜지고 음원이 있을 때만 재생.
  const audioPlaySec = personAudioPlaySec(person)
  // 음성 시퀀스를 음원 길이에 딱 맞춰 끊으면(round 내림 + 프리뷰 디코딩 지연) 끝 한 글자가 씹힌다.
  // 컷은 음원 뒤로 여운(약 1.55초)이 항상 있으므로, 시퀀스를 컷 끝까지 열어두면 음원이 온전히 재생된다.
  // 음원이 끝나면 Remotion 이 자동으로 무음이라 길게 열어도 안전하다.
  const audioWindowFrames = Math.max(f(audioPlaySec), cueDuration - f(quoteEnterSec))
  const audioEl = hasQuote && person.quoteDuration && person.quoteDuration > 0 ? (
    <Sequence from={cueStart + f(quoteEnterSec)} durationInFrames={audioWindowFrames}>
      <Audio
        src={staticFile(voiceRelPath(episodeName, quoteVoiceFile ?? vnPersonQuote(groupIndex, personIndex, voiceClusterIndex ?? clusterIndex)))}
        volume={dbToLinear(person.quoteGainDb)}
        playbackRate={clampRate(person.quotePlaybackRate)}
      />
    </Sequence>
  ) : null
  // 수식어 표시 방식 — 낭독(나레이터 음성)인가 타이핑(소리+글자만)인가. 미지정이면 음원 있으면 낭독.
  const epithetNarrated = epithetIsNarrated(person, isShorts)
  // 수식어 낭독 — 낭독 모드 + 음원이 있을 때만 수식어 등장 시점에 맞춰 나레이터 낭독을 재생한다.
  const epithetEl = (() => {
    if (!hasEpithet || !epithetNarrated || !person.epithetDuration || person.epithetDuration <= 0) return null
    const playSec = person.epithetDuration / clampRate(person.epithetPlaybackRate)
    return (
      <Sequence from={cueStart + epithetStartF} durationInFrames={f(playSec) + f(0.4)}>
        <Audio
          src={staticFile(voiceRelPath(episodeName, vnPersonEpithet(groupIndex, personIndex, voiceClusterIndex ?? clusterIndex)))}
          volume={dbToLinear(person.epithetGainDb)}
          playbackRate={clampRate(person.epithetPlaybackRate)}
        />
      </Sequence>
    )
  })()
  // 수식어 타자 효과음 — 타이핑 모드면 낱말이 차오르는 구간마다 타이핑 사운드를 깐다.
  // 구두점 휴지(낱말 사이 쉬는 구간)에는 소리도 끊어, 글자가 멈추면 타자 소리도 함께 멈춘다.
  const epithetTypingEl = (() => {
    if (!hasEpithet || epithetNarrated) return null
    const speak = epithetSpeakSec(person, isShorts)
    const segs = epithetWordTimings(epithet, speak)
    // 낱말 타이밍이 있으면 각 낱말 구간에, 없으면(어절 하나) 전체 구간에 한 번.
    const spans = segs.length
      ? segs.map(s => ({ from: epithetStartF + f(s.start ?? 0), dur: f((s.end ?? 0) - (s.start ?? 0)) }))
      : [{ from: epithetStartF, dur: f(speak) }]
    const playable = spans.filter(sp => sp.dur > 0)
    if (!playable.length) return null
    return (
      <>
        {playable.map((sp, i) => (
          <Sequence key={i} from={cueStart + sp.from} durationInFrames={sp.dur}>
            <Audio src={staticFile('common/sfx/typing.mp3')} loop volume={0.6} />
          </Sequence>
        ))}
      </>
    )
  })()
  // 직함 리드 타자 효과음 — 직함 2·3줄을 타이핑 방식(linesTyping)으로 내보낼 때,
  // 실제 글자가 차오르는 구간(seg)에만 typing.mp3 루프.
  // \n 줄 사이 LINE_PAUSE(쉬는 시간)에는 Sequence가 없어서 SFX 완전 중지.
  const creditTypingEl = (() => {
    if (orientation !== 'portrait' || !showCreditRest || !linesTypingOf(person, isShorts)) return null
    const base = cueStart + f(portraitCreditRestStartSec)
    const text = creditTypedTextPortrait
    const listSpan = creditListSpanSec(person, true)
    const avail = Number.isFinite(creditExitSec)
      ? Math.max(0.4, creditExitSec - portraitCreditRestStartSec - 0.08)
      : listSpan
    const spanSec = Math.max(0.4, Math.min(listSpan - ENTER_FADE_SEC - 0.15, avail))
    const segs = creditTypingTimings(text, spanSec)
    const playable = segs
      .map(s => ({
        from: s.start ?? 0,
        dur: Math.max(0, (s.end ?? 0) - (s.start ?? 0))
      }))
      .filter(sp => sp.dur > 0)
    if (!playable.length) return null
    return (
      <>
        {playable.map((sp, i) => (
          <Sequence key={i} from={base + f(sp.from)} durationInFrames={f(sp.dur)}>
            <Audio src={staticFile('common/sfx/typing.mp3')} loop volume={0.6} />
          </Sequence>
        ))}
      </>
    )
  })()
  // 직함 마커 효과음(가로 롱폼) — 직함 줄(2·3번)이 하나씩 순차로 떠오를 때마다 마커 소리를 낸다.
  // i번째 줄은 컷 로컬 (i+1)*CREDIT_LINE_STAGGER_SEC 시점에 등장(CreditLines의 stagger와 동일).
  // 줄 텍스트가 길수록 소리도 그만큼 길게(원본의 저음 여운을 더 길게 남긴다). 끝은 살짝 페이드해 끊김음 방지.
  // 쇼츠는 타자 루프(creditTypingEl)를 쓰므로 여기선 롱폼 전용.
  const creditPopEl = (() => {
    if (orientation !== 'landscape' || !showCreditRest) return null
    // 글자 수 → 재생 길이(초). 짧은 줄은 짧게, 긴 줄은 원본 길이(약 1.1초)까지 늘린다.
    const markerSec = (t: string) => Math.min(1.05, Math.max(0.45, 0.4 + t.trim().length * 0.032))
    // 리스트에 실제로 뜨는 줄마다 마커 소리. i번째 줄은 컷 로컬 (리스트 시작 - ENTER_NAME + 줄 오프셋) 시점에 등장.
    const baseOffsetSec = creditListStartSec - ENTER_NAME_SEC
    return (
      <>
        {creditListItems.map((line, i) => {
          const durF = f(markerSec(line))
          const fadeF = Math.min(f(0.1), Math.floor(durF / 4))
          return (
            <Sequence key={i} from={cueStart + f(baseOffsetSec + (creditListOffsetsSec[i] ?? 0))} durationInFrames={durF}>
              <Audio
                src={staticFile(CREDIT_MARKER_SFX)}
                volume={(fr) => CREDIT_MARKER_VOL * interpolate(fr, [durF - fadeF, durF], [1, 0], clamp)}
              />
            </Sequence>
          )
        })}
      </>
    )
  })()

  // 켄번스 줌은 미디어 "요소 자체"의 transform 으로 건다(상위 래퍼 아님).
  // 영상(<video>)에 상위 transform 이 걸리면 Chrome 이 별도 합성 레이어로 떼어내 사방으로 떨린다 — 요소 자체에 걸면 단일 레이어라 매끄럽다.
  // 사진 맞춤(crop): cover로 잘릴 위치를 objectPosition·transformOrigin 으로 잡고, 확대(scale)는 줌 모션 위에 곱한다.
  // 미지정이면 가운데(50% 50%)·1배 → 기존 동작 그대로.
  /**
   * @param holdLocalStart 사진 등장 컷 로컬 프레임(다중 전환 시 줌 재시작).
   * @param stretchSpan 단일 사진 긴 대사 늘림 프레임. 다중 사진은 생략 → 정속.
   */
  const styleFor = (crop?: FactionImageCrop, holdLocalStart = 0, stretchSpan?: number, focus?: ZoomFocus): React.CSSProperties => {
    const x = crop?.x ?? 50
    const y = crop?.y ?? 50
    const sc = crop?.scale ?? 1
    return {
      width: '100%', height: '100%', objectFit: 'cover',
      objectPosition: `${x}% ${y}%`,
      // 푸시인 줌은 목표점으로 이동하는 모드라 확대 기준점을 화면 중앙에 둔다(이동량 계산과 일치). 그 외엔 사진맞춤 위치.
      transformOrigin: pushin ? '50% 50%' : `${x}% ${y}%`,
      transform: holdTf(sc, crop, holdLocalStart, stretchSpan, focus),
    }
  }
  // 이미지(세로·가로 공용) — imageChanges가 있으면 대사 도중 발화 시각에 맞춰 사진을 크로스페이드로 교체. 없으면 단일. 둘 다 없으면 이니셜.
  // 단일 사진: 긴 대사면 줌을 구간 전체에 늘림. 다중 사진: 사진마다 줌 재시작 + 기본 정속(상한 조기 소진 염려 없음).
  const initialsFallback = (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${accent}22 0%, ${BG} 60%)`, transform: holdTf(1, undefined, 0, holdSpanFrames) }}>
      <span style={{ color: accent, fontFamily: FONT, fontSize: orientation === 'landscape' ? 220 : 320, fontWeight: 800 }}>{initials(person.name)}</span>
    </AbsoluteFill>
  )
  const imgChanges = person.imageChanges?.length ? [...person.imageChanges].sort((a, b) => a.chunk - b.chunk) : []
  const photo = !baseImage || imgErr ? initialsFallback : (() => {
    // 덩어리 시작 프레임 — 발화 시각(voiceTiming) 우선, 없으면 글자수 비례.
    // 발화 시각·글자수는 자막(QuotePages)과 동일하게 '빈 덩어리(연속 개행)를 뺀 실제 덩어리' 기준으로 센다.
    // imageChanges[].chunk 는 BO에서 quoteChunks(빈 덩어리 포함) 인덱스로 저장되므로, 실제 덩어리 인덱스로 환산해야
    // 자막과 같은 발화 시각을 타 컷 전환이 음성에 정확히 맞는다(환산 없이 쓰면 개수 불일치로 폴백에 떨어져 한 박자 늦음).
    const audioStart = cueStart + f(quoteEnterSec)
    const spread = Math.max(1, cueDuration - f(quoteEnterSec))
    const expanded = voiceTiming ? expandSubTimings(voiceTiming) : undefined
    const realChunks = quoteChunks.filter(c => c && c.trim())
    const useT = !!expanded && expanded.length === realChunks.length && expanded.every(t => t.start != null)
    const totalChars = realChunks.join(' ').length || 1
    // quoteChunks 인덱스 → 그 앞의 실제(비어있지 않은) 덩어리 개수 = 실제 덩어리 인덱스
    const realIndexOf = (ci: number): number => {
      let r = 0
      for (let i = 0; i < ci && i < quoteChunks.length; i++) if (quoteChunks[i]?.trim()) r++
      return r
    }
    const chunkFrame = (ci: number): number => {
      const ri = realIndexOf(ci)
      if (ri <= 0) return audioStart
      if (useT) return audioStart + f(expanded![Math.min(ri, expanded!.length - 1)].start!)
      const before = realChunks.slice(0, ri).join(' ').length
      return audioStart + Math.round(spread * before / totalChars)
    }
    // 사진 전환 목록 — quoteImage와 imageChanges를 합치되 현재+다음 두 레이어만 렌더한다.
    const changes: { start: number; image: string; crop?: FactionImageCrop; filter?: ImageFilter; zoomFocus?: ZoomFocus }[] = []
    if (
      person.quoteImage
      && !entryMedia.quoteImageUsedAsBase
      && (hasQuote || person.quoteImageAt === 'cue')
    ) changes.push({
      start: person.quoteImageAt === 'cue' ? cueStart : audioStart,
      image: person.quoteImage,
      crop: person.quoteImageCrop,
      filter: person.quoteImageFilter,
      zoomFocus: person.quoteZoomFocus,
    })
    for (const ic of imgChanges) changes.push({ start: chunkFrame(ic.chunk), image: ic.image, crop: ic.crop, filter: ic.filter, zoomFocus: ic.zoomFocus })
    const localOf = (abs: number) => Math.max(0, abs - cueStart)
    // 단일 사진: 대사 전체 길이로 줌 늘림. 다중: stretch 생략 → 정속 + 사진마다 재시작.
    if (!changes.length) {
      return <FactionMedia src={imgSrc(episodeName, baseImage)} startFrame={cueStart} onError={() => setImgErr(true)} style={styleFor(baseImageCrop, 0, holdSpanFrames, entryMedia.zoomFocus)} filter={entryMedia.filter} />
    }
    const base = <FactionMedia src={imgSrc(episodeName, baseImage)} startFrame={cueStart} onError={() => setImgErr(true)} style={styleFor(baseImageCrop, 0, undefined, entryMedia.zoomFocus)} filter={entryMedia.filter} />
    const cf = f(CROSSFADE_SEC)
    const activeMedia = activeFactionMediaLayers(changes.map(change => change.start), frame, cf)
    const activeMediaIndexes = new Set(activeMedia.indexes)
    return (
      <>
        {activeMedia.showBase ? <AbsoluteFill>{base}</AbsoluteFill> : null}
        {changes.map((c, idx) => {
          if (!activeMediaIndexes.has(idx)) return null
          const op = interpolate(frame, [c.start - cf, c.start], [0, 1], clamp)
          if (op <= 0) return null
          // 교체 사진 — 뜬 시점부터 줌 재시작, 기본 정속(stretch 없음).
          const ls = localOf(c.start)
          return (
            <AbsoluteFill key={idx} style={{ opacity: op }}>
              <FactionMedia src={imgSrc(episodeName, c.image)} startFrame={c.start} style={styleFor(c.crop, ls, undefined, c.zoomFocus)} filter={c.filter} />
            </AbsoluteFill>
          )
        })}
      </>
    )
  })()
  // 지지직 글리치(줌과 별개 축, 개인샷 기본 꺼짐). 켜지면 사진에만 입혀 텍스트 가독은 유지.
  // 막판(tail)은 컷 끝나기 직전 1초에만 지직거린다(다음 인물로 넘어가기 직전). 라이트·헤비는 컷 내내.
  const glitchGate = glitch === 'tail' ? Math.max(0, cueDuration - f(1.0)) : 0
  const photoEl = glitch ? <HoldGlitch frame={frame} startFrame={cueStart} level={glitch || 'heavy'} gateFromLocal={glitchGate}>{photo}</HoldGlitch> : photo

  // 작은 자막 모드 — 대사 박스(통합)와 분리한다.
  // 박스 모드: 이름·직함·대사를 한 하단 패널에 묶는다.
  // 자막 모드:
  //   - 신원(이름·직함1): 로고/그룹명 CardCaption 과 동일 위치·형태(하단 중앙). 컷 내내 유지. 등장 애니메이션.
  //   - 대사: 중앙/중하단 음영 자막.
  const quoteText = quoteChunks.filter(c => c && c.trim()).join(' ')
  const quoteSpread = Math.max(1, cueDuration - f(quoteEnterSec))
  // landscape 우측 텍스트 컬럼만 대사 때 거둘 때 사용. 세로 신원 앵커는 퇴장하지 않는다.
  const captionLeadExitOp = useCaption && hasQuote && orientation === 'landscape'
    ? interpolate(lt, [f(quoteEnterSec), f(quoteEnterSec + ENTER_FADE_SEC)], [1, 0], clamp)
    : 1
  const captionAppearance = resolveFactionCaptionAppearance(orientation, {
    position: quoteCaptionPos,
    size: quoteCaptionSize,
    font: quoteCaptionFont,
  })
  const captionSlotPos = captionAppearance.slotStyle
  const captionFont = captionAppearance.fontSize
  const captionFontFamily = captionAppearance.fontFamily
  const captionMinH = captionAppearance.minHeight
  // 신원 — 로고/그룹명 CardCaption 과 동일 위치·형태.
  // [개편] 중앙 배치 + 중앙자막 크기로 축소. [기존] idCaptionSize 62 / idExtraSize 40 / flex-end + pad '0 60px 56px'
  const idCaptionSize = 48
  const idExtraSize = 34
  const captionEl = useCaption && orientation === 'portrait' ? (
    <CaptionSwapSlot
      localFrame={local}
      captionEnterSec={quoteEnterSec}
      exitOpacity={boxExitOp}
      hasCaption={hasQuote}
      showIdentity={showIdentity}
      captionSlotStyle={captionSlotPos}
      captionMinHeight={captionMinH}
      identity={(
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 14,
        }}>
          {/* 직함 2·3·수식어 리드 — 이름 위. 대사 구간에선 각자 타이밍으로 자연 퇴장. */}
          {showCreditRest ? (
            <div style={{ opacity: creditRestOp, maxWidth: 920, width: '100%' }}>
              {linesTypingOf(person, isShorts) ? (
                <Typewriter
                  text={creditTypedTextPortrait}
                  startFrame={cueStart + f(portraitCreditRestStartSec)}
                  spreadFrames={f(Math.min(creditTypingSpanSec, creditRestAvailableSec))}
                  timings={creditTypingTimings(creditTypedTextPortrait, Math.min(creditTypingSpanSec, creditRestAvailableSec))}
                  charLevel
                  fontSize={idExtraSize}
                  color="rgba(255,255,255,0.9)"
                  highlightColor="#ffffff"
                  style={{
                    fontFamily: FONT_SERIF, fontWeight: 600, letterSpacing: 1, lineHeight: 1.25,
                    textAlign: 'center', wordBreak: 'keep-all',
                  }}
                  keepLit
                />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <CreditLines items={creditRest} accent={accent} fontSize={idExtraSize} frame={lt} startFrame={f(portraitCreditRestStartSec)} offsetsFrames={creditListOffsetsSec.map(f)} />
                </div>
              )}
            </div>
          ) : null}
          {hasEpithet ? (
            <div style={{
              opacity: epithetOp * epithetInOp,
              maxWidth: 920,
              transform: `translateY(${epithetInTy}px)`,
            }}>
              {epithetNarrated ? (
                <div style={{
                  color: `${accent}e6`, fontFamily: FONT, fontSize: idExtraSize, fontWeight: 600,
                  letterSpacing: 1, lineHeight: 1.25, textAlign: 'center', wordBreak: 'keep-all',
                  whiteSpace: 'pre-line',
                }}>{epithet}</div>
              ) : (
                <Typewriter
                  text={epithet}
                  startFrame={cueStart + epithetStartF}
                  spreadFrames={f(epithetSpeakSec(person, isShorts))}
                  timings={epithetCharTimings(epithet, epithetSpeakSec(person, isShorts))}
                  charLevel
                  fontSize={idExtraSize}
                  color={`${accent}cc`}
                  highlightColor={accent}
                  style={{
                    fontFamily: FONT, fontWeight: 600, letterSpacing: 1, lineHeight: 1.25,
                    textAlign: 'center', wordBreak: 'keep-all',
                  }}
                  keepLit
                />
              )}
            </div>
          ) : null}
          {/* 이름(앞부분·흰색) / 직함(뒷부분·세력색) — GroupCard CardCaption 과 동일 규격·정렬 */}
          <CaptionIdentityText fontSize={idCaptionSize}>{person.name}</CaptionIdentityText>
          {creditHead ? (
            <div style={{
              color: accent,
              fontFamily: FONT_SERIF,
              fontSize: idCaptionSize,
              fontWeight: 700,
              letterSpacing: 2,
              lineHeight: 1.15,
              textAlign: 'center',
              whiteSpace: 'pre-line',
              wordBreak: 'keep-all',
              textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.8)',
              WebkitTextStroke: '1px rgba(0,0,0,0.85)',
              paintOrder: 'stroke fill',
              ...accentClarityPaint(accent),
            }}><CaptionBackdrop>{creditHead}</CaptionBackdrop></div>
          ) : null}
        </div>
      )}
      caption={hasQuote ? (
          <ShortCaption
            text={quoteText}
            startFrame={cueStart + f(quoteEnterSec)}
            spreadFrames={quoteSpread}
            timings={voiceTiming}
            fontSize={captionFont}
            color={silentQuote ? '#b8bcc4' : '#f2ebe0'}
            fontFamily={captionFontFamily}
            fontWeight={700}
            maxPanelWidth={760}
            chrome="shadow"
          />
      ) : undefined}
    />
  ) : (useCaption && hasQuote && quoteOp > 0 ? (
    // 가로 롱폼 자막 모드 — 대사만 중하단(신 mid-low) 음영 자막
    <div style={{
      position: 'absolute',
      zIndex: 40,
      left: CONTENT_PAD,
      right: CONTENT_PAD,
       bottom: captionAppearance.landscapeBottom,
      display: 'flex',
      justifyContent: 'center',
      opacity: quoteOp * boxExitOp,
      pointerEvents: 'none',
    }}>
      <ShortCaption
        text={quoteText}
        startFrame={cueStart + f(quoteEnterSec)}
        spreadFrames={quoteSpread}
        timings={voiceTiming}
        fontSize={captionFont}
        color={silentQuote ? '#b8bcc4' : '#f2ebe0'}
        fontFamily={captionFontFamily}
        fontWeight={700}
        maxPanelWidth={900}
        chrome="shadow"
      />
    </div>
  ) : null)

  // ── 가로 롱폼: 좌측 세로 사진 + 우측 텍스트(잡지 스프레드) ──
  if (orientation === 'landscape') {
    // 수식어가 떠 있는 정도(0~1). 등장하면 1, 대사로 넘어가며 0.
    // 이 값만큼 이름·직함을 거두고 수식어를 우측 화면 한가운데에 세운다.
    const epiVis = epithetInOp * epithetOp
    // 수식어 글자 크기 — 우측 영역 안에 세로로 다 담기게 길이에 따라 줄인다(넘쳐 잘리지 않도록).
    const EPI_COL_W = 1920 * 0.58 - L_TEXT_PAD * 2 // 우측 텍스트 폭
    const EPI_MAX_H = 1080 - 160                   // 위아래 여백 뺀 사용 높이
    const epithetFontSize = (() => {
      // 줄바꿈으로 나눈 문단을 각각 접어 실제 줄 수를 센다. 빈 줄(연속 개행)도 한 줄로 친다.
      const paras = epithet.trim().split('\n')
      for (const size of [60, 54, 48, 44, 40]) {
        const perLine = Math.max(1, Math.floor(EPI_COL_W / (size * 1.02)))
        const lines = paras.reduce((n, p) => n + Math.max(1, Math.ceil(p.trim().length / perLine)), 0)
        if (lines * size * 1.5 <= EPI_MAX_H) return size
      }
      return 40
    })()
    // 수식어 화면 — 우측 영역 세로 한가운데. 이름과 같은 자리를 쓰지 않고 통째로 중앙에 선다.
    const epithetStage = hasEpithet ? (
      <div style={{
        position: 'absolute', left: L_PHOTO_W, right: 0, top: 0, bottom: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: `0 ${L_TEXT_PAD}px`,
        opacity: boxExitOp * captionLeadExitOp * epiVis,
        pointerEvents: 'none',
      }}>
        <div style={{ transform: `translateY(${epithetInTy}px)` }}>
          {epithetNarrated ? (
            <div style={{
              color: '#f0f0f4', fontFamily: FONT_SERIF,
              fontSize: epithetFontSize, fontWeight: 600,
              letterSpacing: 0.2, lineHeight: 1.5, textAlign: 'left',
              // 줄바꿈을 살려 문단을 나눈다(글자 점등 방식과 동일하게 보이도록).
              whiteSpace: 'pre-line',
              wordBreak: 'keep-all',
              ...TEXT_PAINT,
            }}>{epithet}</div>
          ) : (
            <Typewriter
              text={epithet}
              startFrame={cueStart + epithetStartF}
              spreadFrames={f(epithetSpeakSec(person, isShorts))}
              timings={epithetCharTimings(epithet, epithetSpeakSec(person, isShorts))}
              charLevel
              fontSize={epithetFontSize}
              color="#7c818c"
              highlightColor="#f0f0f4"
              style={{ fontFamily: FONT_SERIF, fontWeight: 600, letterSpacing: 0.2, lineHeight: 1.5, textAlign: 'left', wordBreak: 'keep-all', ...TEXT_PAINT }}
              keepLit
            />
          )}
        </div>
      </div>
    ) : null

    return (
      <AbsoluteFill style={{ backgroundColor: BG, flexDirection: 'row' }}>
        {audioEl}
        {epithetEl}
        {epithetTypingEl}
        {creditPopEl}
        {captionEl}
        {epithetStage}
        {/* 좌: 인물 사진 — 켄번스 줌(컷 동안 천천히 확대) */}
        <div style={{ width: L_PHOTO_W, height: '100%', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          <AbsoluteFill>{photoEl}</AbsoluteFill>
          {/* 사진→텍스트 경계 부드럽게 */}
          <AbsoluteFill style={{ background: `linear-gradient(to right, transparent 70%, ${BG} 100%)` }} />
        </div>
        {/* 우: 텍스트 — 이름 위치를 고정(상단 기준)하고 아래 슬롯만 확장. 인물마다 위아래로 흔들리지 않게 */}
        {/* 이름(고정) → 같은 슬롯에서 직함(2행) → 대사로 교차. 작은 자막 모드에선 대사 시작 시 우측 리드도 함께 거둔다. */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 28, padding: `300px ${L_TEXT_PAD}px 0`, opacity: boxExitOp * captionLeadExitOp }}>
          {/* 이름 + 직함 1번(이름 옆 고정) — 아래에서 떠오르며 등장. 직함만 있는 인물은 1번째 줄도 아래 리스트로 내린다. */}
          {/* 수식어가 뜨는 동안에는 이름·직함을 거둔다(수식어가 화면 한가운데를 통째로 쓴다). */}
          {showIdentity ? <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap', transform: `translateY(${nameRise}px)`, opacity: 1 - epiVis }}>
            <div style={{ color: '#ffffff', fontFamily: FONT, fontSize: 88, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.1, textAlign: 'left', opacity: nameOp }}>{person.name}</div>
            {creditHead && !creditListFull ? (
              <div style={{ color: accent, fontFamily: FONT, fontSize: 50, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.1, opacity: creditOp, whiteSpace: 'nowrap', ...accentClarityPaint(accent) }}>{creditHead}</div>
            ) : null}
          </div> : null}
          {/* 아래 슬롯 — voice·text는 바로 대사 / credit은 직함 2번부터 순차 / full(통합)은 직함 순차 → 대사로 교차(겹쳐 두고 페이드) */}
          <div style={{ display: 'grid', alignItems: 'start' }}>
            {/* 수식어는 이 슬롯이 아니라 우측 화면 한가운데(epithetStage)에 따로 선다. */}
            {showCreditRest ? (
              <div style={{ gridArea: '1 / 1', opacity: creditRestOp }}>
                {linesTypingOf(person, isShorts) ? (
                  <Typewriter
                    text={creditTypedTextLandscape}
                    startFrame={cueStart + f(creditListStartSec) - f(ENTER_NAME_SEC)}
                    spreadFrames={f(creditTypingSpanSec)}
                    timings={creditTypingTimings(creditTypedTextLandscape, creditTypingSpanSec)}
                    charLevel
                    fontSize={60}
                    color="#e8e8ee"
                    highlightColor="#ffffff"
                    style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.4, textAlign: 'left', wordBreak: 'keep-all', ...TEXT_PAINT }}
                    keepLit
                  />
                ) : (
                  <CreditLines items={creditListItems} accent={accent} fontSize={60} frame={lt} startFrame={f(creditListStartSec)} offsetsFrames={creditListOffsetsSec.map(f)} emphasizeFirst={creditListFull} />
                )}
              </div>
            ) : null}
            {/* 박스 모드일 때만 우측 슬롯에 큰 대사. 작은 자막 모드는 captionEl 로 별도 출력 */}
            {hasQuote && !useCaption ? (
              <div style={{ gridArea: '1 / 1' }}>
                <QuotePages
                  chunks={quoteChunks} timings={voiceTiming}
                  startFrame={cueStart + f(quoteEnterSec)}
                  spreadFrames={quoteSpread}
                  fontSize={64}
                  color={silentQuote ? '#9da6b2' : '#d8dce2'}
                  highlightColor={silentQuote ? '#dfe4ea' : '#ffffff'}
                  maxChars={73} opacity={quoteOp}
                />
              </div>
            ) : null}
          </div>
          {/* 영문 원문 보조 — 가로 롱폼·박스 모드에서만 표기, 대사와 함께 페이드인 */}
          {person.quoteEn && !useCaption ? (
            <div style={{ color: `${FG}66`, fontFamily: FONT, fontSize: 36, fontWeight: 500, letterSpacing: 0.3, lineHeight: 1.35, textAlign: 'left', opacity: quoteOp, whiteSpace: 'pre-line' }}>{person.quoteEn}</div>
          ) : null}
        </div>
      </AbsoluteFill>
    )
  }

  // ── 세로 쇼츠(기존): 풀스크린 사진 + 좌측 하단 텍스트 ──
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {audioEl}
      {epithetEl}
      {epithetTypingEl}
      {creditTypingEl}
      {captionEl}
      {/* 인물 사진 — 켄번스 줌(컷 동안 천천히 확대). 줌은 미디어 요소 자체에 걸려 있다(영상 떨림 방지) */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>{photoEl}</AbsoluteFill>
      {/* 상단 살짝 어둡게 — 상단 헤더 영역 가독 */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}aa 0%, transparent 20%)` }} />
      {/* 박스 모드: 이름·직함·대사를 한 덩어리로 하단. 작은 자막 모드는 captionIdEl(좌하단 큰 타이포)+captionEl. */}
      {!useCaption ? (
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'stretch', padding: `0 ${CONTENT_PAD}px ${CONTENT_PAD}px` }}>
        {/* 박스 슬라이드 인. 이름 먼저 (박히게). */}
        {/* 1행 직함값 지연은 롱폼 + showCreditRest(직함 따로 출력)일 때만. 바로 대사 케이스는 이름과 동시. */}
        {/* 1행 끝난 후 미세한 텀(0.12s) + 줄 간 미세 텀(0.15s) 두고 2·3행 순차 타이핑. */}
        {/* 박스 내부에서만 교차하므로 레이아웃 들썩임 없음. */}
        <div style={{
          position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
          // 쇼츠는 우측을 비워 인물 사진·우측 요소와 안 겹치게 좁게(864), 세로 롱폼은 우측 끝까지(984)
          width: 'fit-content', maxWidth: isShorts ? 864 : 984,
          background: 'rgba(0,0,0,0.4)',
          padding: '22px 28px',
          borderRadius: 4,
          borderLeft: `4px solid ${accent}`,
          fontFamily: FONT_SERIF,
          transform: `translateX(${panelSlideX}px)`,
          opacity: (showIdentity ? panelOp : quoteOp) * boxExitOp,
        }}>
          {/* 이름(세력색) + 직함 1번(이름 옆 고정, 전원) */}
          {showIdentity ? <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <div style={{
              color: accent, fontFamily: FONT_SERIF,
              fontSize: 52, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.1,
              textAlign: 'left', opacity: nameOp, ...TEXT_PAINT, ...accentClarityPaint(accent),
            }}>{person.name}</div>
            {creditHead ? (
              <div style={{
                color: FG, fontFamily: FONT,
                fontSize: 36, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.1,
                opacity: creditHeadOp, transform: `translateY(${creditHeadTy}px)`, whiteSpace: 'nowrap', ...TEXT_PAINT,
              }}>{creditHead}</div>
            ) : null}
          </div> : null}
          {/* 아래 슬롯 — voice·text는 바로 대사 / credit은 직함 2번부터 순차 / full(통합)·수식어 리드인은 앞 내용 순차 → 대사로 교차(겹쳐 두고 페이드) */}
          <div style={{ display: 'grid', alignItems: 'start', alignSelf: 'stretch' }}>
            {hasEpithet ? (
              <div style={{ gridArea: '1 / 1', opacity: epithetOp }}>
                <div style={{ opacity: epithetInOp, transform: `translateY(${epithetInTy}px)` }}>
                  {epithetNarrated ? (
                    <div style={{
                      color: '#f0f0f4', fontFamily: FONT_SERIF,
                      fontSize: 50, fontWeight: 600,
                      letterSpacing: 0.2, lineHeight: 1.5, textAlign: 'left',
                      whiteSpace: 'pre-line',
                      wordBreak: 'keep-all',
                      ...TEXT_PAINT,
                    }}>{epithet}</div>
                  ) : (
                    <Typewriter
                      text={epithet}
                      startFrame={cueStart + epithetStartF}
                      spreadFrames={f(epithetSpeakSec(person, isShorts))}
                      timings={epithetCharTimings(epithet, epithetSpeakSec(person, isShorts))}
                      charLevel
                      fontSize={50}
                      color="#7c818c"
                      highlightColor="#f0f0f4"
                      style={{ fontFamily: FONT_SERIF, fontWeight: 600, letterSpacing: 0.2, lineHeight: 1.5, textAlign: 'left', wordBreak: 'keep-all', ...TEXT_PAINT }}
                      keepLit
                    />
                  )}
                </div>
              </div>
            ) : null}
            {showCreditRest ? (
              <div style={{ gridArea: '1 / 1', opacity: creditRestOp }}>
                {linesTypingOf(person, isShorts) ? (
                  <Typewriter
                    text={creditTypedTextPortrait}
                    startFrame={cueStart + f(portraitCreditRestStartSec)}
                    spreadFrames={f(Math.min(creditTypingSpanSec, creditRestAvailableSec))}
                    timings={creditTypingTimings(creditTypedTextPortrait, Math.min(creditTypingSpanSec, creditRestAvailableSec))}
                    charLevel
                    fontSize={48}
                    color="#e8e8ee"
                    highlightColor="#ffffff"
                    style={{ fontFamily: FONT, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.4, textAlign: 'left', wordBreak: 'keep-all', ...TEXT_PAINT }}
                    keepLit
                  />
                ) : (
                  <CreditLines items={creditRest} accent={accent} fontSize={48} frame={lt} startFrame={f(portraitCreditRestStartSec)} offsetsFrames={creditListOffsetsSec.map(f)} />
                )}
              </div>
            ) : null}
            {hasQuote ? (
              <div style={{ gridArea: '1 / 1' }}>
                <QuotePages
                  chunks={quoteChunks} timings={voiceTiming}
                  startFrame={cueStart + f(quoteEnterSec)}
                  spreadFrames={quoteSpread}
                  fontSize={50}
                  color="#c8a46e"
                  highlightColor="#f5e6c8"
                  maxChars={68} opacity={quoteOp} lineHeight={1.7}
                />
              </div>
            ) : null}
          </div>
        </div>
      </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  )
}
