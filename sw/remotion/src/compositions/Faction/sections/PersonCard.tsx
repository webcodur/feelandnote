import React, { useMemo } from 'react'
import { AbsoluteFill, Sequence, Audio, interpolate, useCurrentFrame, staticFile, Easing } from 'remotion'
import type { FactionGroup, FactionPerson, FactionImageCrop, HoldMotion, EnterMotion, Orientation, GlitchLevel } from '../types'
import { CROSSFADE_SEC, OUTRO_CROSSFADE_SEC, ENTER_NAME_SEC, ENTER_FADE_SEC, CREDIT_LINE_STAGGER_SEC, personLeadTiming, personAudioPlaySec, creditLinesOf, creditAppearSec, epithetIsNarrated, epithetSpeakSec, f, type PersonSteps } from '../timing'
import { BG, FG, FONT, FONT_SERIF, TEXT_PAINT, DEFAULT_ACCENT, CONTENT_PAD, L_PHOTO_W, L_TEXT_PAD, PANEL_SLIDE_X, PANEL_SLIDE_SEC } from '../constants'
import { imgSrc, initials, sliceLocalTimings, holdAndShakeParts, enterMotionScale, enterMotionSec, isPushinZoom } from '../utils'
import { vnPersonQuote, vnPersonEpithet, voiceRelPath, dbToLinear, clampRate } from '../voice-names'
import { Typewriter } from '../../../components/caption/Typewriter'
import { expandSubTimings, type VoiceTimingSegment } from '../../../lib/voice-timing'
import { FactionMedia } from './FactionMedia'
import { HoldGlitch } from '../transitions'

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
  const lens = words.map(w => w.length)
  const total = lens.reduce((a, b) => a + b, 0) || 1
  let cur = 0
  return words.map((w, i) => {
    const dur = (speakSec * lens[i]) / total
    const seg: VoiceTimingSegment = { start: cur, end: cur + dur, text: w }
    cur += dur + pauseAfter[i] // 구두점 뒤 휴지만큼 다음 어절 점등을 미룬다
    return seg
  })
}

/**
 * 대사 페이지 + 글자 점등 — 사람이 의미 단위로 끊어둔 덩어리(chunks)를 박스 분량(maxChars)까지
 * 모아 페이지로 묶고, 음원 진행에 맞춰 한 페이지씩 교체하며 공통 Typewriter로 읽는 글자를 점등한다.
 * 덩어리 경계로만 끊으므로 단어가 잘리지 않고, 한 페이지 분량만 그려 박스가 무한정 늘어나지 않는다.
 * 발화 시각(timings)이 덩어리 수와 맞으면 실제 시각으로, 아니면 글자수 비례로 전환·점등한다(폴백).
 */
const QuotePages: React.FC<{
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
const CreditLines: React.FC<{ items: string[]; accent: string; fontSize: number; frame: number; startFrame: number; staggerFrames: number }> = ({ items, accent, fontSize, frame, startFrame, staggerFrames }) => {
  const isList = items.length > 1
  const dot = Math.round(fontSize * 0.2)
  const gap = Math.round(fontSize * 0.3)
  const rise = Math.round(fontSize * 0.55)
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isList ? Math.round(fontSize * 0.32) : 0 }}>
      {items.map((t, i) => {
        const ls = startFrame + i * staggerFrames
        const op = interpolate(frame, [ls, ls + f(ENTER_FADE_SEC)], [0, 1], clamp)
        const ty = interpolate(frame, [ls, ls + f(ENTER_FADE_SEC)], [rise, 0], { ...clamp, easing: Easing.out(Easing.cubic) })
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap, opacity: op, transform: `translateY(${ty}px)` }}>
            {isList ? <span style={{ flexShrink: 0, width: dot, height: dot, borderRadius: '50%', background: accent, marginTop: Math.round(fontSize * 0.46) }} /> : null}
            <span style={{ color: '#e8e8ee', fontFamily: FONT, fontSize, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.28, textAlign: 'left', wordBreak: 'keep-all', ...TEXT_PAINT }}>{t}</span>
          </div>
        )
      })}
    </div>
  )
}

export const PersonCard: React.FC<{ episodeName: string; group: FactionGroup; person: FactionPerson; frame: number; cueStart: number; cueDuration: number; orientation: Orientation; groupIndex: number; personIndex: number; clusterIndex?: number; steps: PersonSteps; voiceTiming?: VoiceTimingSegment[]; zoomFreezeSec?: number; isShorts?: boolean; isLast?: boolean; noZoom?: boolean; hold?: HoldMotion; enter?: EnterMotion; glitch?: false | GlitchLevel; shake?: boolean; zoomSpeed?: number }> = ({ episodeName, group, person, frame, cueStart, cueDuration, orientation, groupIndex, personIndex, clusterIndex, steps, voiceTiming, zoomFreezeSec, isShorts = false, isLast = false, noZoom = false, hold = 'none', enter = 'none', glitch = false, shake = false, zoomSpeed = 1 }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  const [imgErr, setImgErr] = React.useState(false)
  const local = frame - cueStart
  // 롱폼은 사진을 기다리지 않고 텍스트가 컷과 거의 동시에 바로 등장 — 등장 타이밍을 ENTER_NAME_SEC만큼 앞당긴다(세로 쇼츠는 기존 그대로)
  const lt = orientation === 'landscape' ? local + f(ENTER_NAME_SEC) : local
  // 대사 소스 — 덩어리(quoteChunks)가 있으면 그 배열을, 없으면 통째 quote를 단일 덩어리로.
  // 덩어리 경계는 줄바꿈이 아니라 색 전환점으로만 쓴다(화면에선 한 흐름으로 이어짐).
  const quoteChunks = person.quoteChunks?.length ? person.quoteChunks : (person.quote ? [person.quote] : [])
  // 리드 시퀀스(직함→수식어→대사) 시각 — 길이 계산(timing)과 동일 SSoT
  const lead = personLeadTiming(person, steps, isShorts)
  // 음성 스텝이 켜져야 대사가 뜬다(꺼지면 대사 없음).
  const hasQuote = steps.voice && quoteChunks.length > 0
  // 음원이 없는 무음 대사(읽기 전용)는 자막을 살짝 흐리게 — 음원 재생 대사와 톤 구분.
  const silentQuote = !(person.quoteDuration && person.quoteDuration > 0)
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
  const holdTf = (extraScale = 1, crop?: FactionImageCrop) => {
    const enterS = enterOff ? 1 : enterMotionScale(enter, holdZ)
    if (holdOff) return `scale(${enterS * extraScale})`
    const { scale, tx, ty } = holdAndShakeParts(hold, shake, Math.max(0, holdZ - enterFrames), { focusX: person.zoomFocus?.x ?? crop?.x, focusY: person.zoomFocus?.y ?? crop?.y, speedMul: zoomSpeed })
    return `scale(${enterS * scale * extraScale}) translate(${tx}%, ${ty}%)`
  }
  const pushin = !holdOff && isPushinZoom(hold)
  // 1) 박스 + 이름 + 직함 함께 페이드인. 세로는 박스째 왼쪽에서 슬라이드 인(가로는 슬라이드 없이 페이드만)
  const nameOp = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 세로 박스 슬라이드 — 왼쪽 밖(-PANEL_SLIDE_X)에서 제자리(0)로. 슬라이드와 페이드를 같은 구간에 묶는다
  const panelSlideX = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + PANEL_SLIDE_SEC)], [-PANEL_SLIDE_X, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const panelOp = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 마지막 인물 컷 — 최종화면으로 넘어가기 직전에 대사 박스를 먼저 거둔다(인물 사진은 CueLayer 크로스페이드로 뒤이어 사라진다).
  const BOX_EXIT_SEC = 0.5
  const boxExitOp = isLast
    ? interpolate(local, [cueDuration - f(OUTRO_CROSSFADE_SEC + BOX_EXIT_SEC), cueDuration - f(OUTRO_CROSSFADE_SEC)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1
  // 2) 직함 — 대사 인물의 이름 옆 직함(creditHead)은 이름과 함께 페이드인해 상시 표기.
  //   대사 없는 인물의 아래 직함 줄별 순차 등장은 CreditLines가 담당.
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

  // 음성 스텝이 켜지고 음원이 있을 때만 재생.
  const audioPlaySec = personAudioPlaySec(person)
  // 음성 시퀀스를 음원 길이에 딱 맞춰 끊으면(round 내림 + 프리뷰 디코딩 지연) 끝 한 글자가 씹힌다.
  // 컷은 음원 뒤로 여운(약 1.55초)이 항상 있으므로, 시퀀스를 컷 끝까지 열어두면 음원이 온전히 재생된다.
  // 음원이 끝나면 Remotion 이 자동으로 무음이라 길게 열어도 안전하다.
  const audioWindowFrames = Math.max(f(audioPlaySec), cueDuration - f(quoteEnterSec))
  const audioEl = hasQuote && person.quoteDuration && person.quoteDuration > 0 ? (
    <Sequence from={cueStart + f(quoteEnterSec)} durationInFrames={audioWindowFrames}>
      <Audio
        src={staticFile(voiceRelPath(episodeName, vnPersonQuote(groupIndex, personIndex, clusterIndex)))}
        volume={dbToLinear(person.quoteGainDb)}
        playbackRate={clampRate(person.quotePlaybackRate)}
      />
    </Sequence>
  ) : null
  // 수식어 표시 방식 — 낭독(나레이터 음성)인가 타이핑(소리+글자만)인가. 미지정이면 음원 있으면 낭독.
  const epithetNarrated = epithetIsNarrated(person)
  // 수식어 낭독 — 낭독 모드 + 음원이 있을 때만 수식어 등장 시점에 맞춰 나레이터 낭독을 재생한다.
  const epithetEl = (() => {
    if (!hasEpithet || !epithetNarrated || !person.epithetDuration || person.epithetDuration <= 0) return null
    const playSec = person.epithetDuration / clampRate(person.epithetPlaybackRate)
    return (
      <Sequence from={cueStart + epithetStartF} durationInFrames={f(playSec) + f(0.4)}>
        <Audio
          src={staticFile(voiceRelPath(episodeName, vnPersonEpithet(groupIndex, personIndex, clusterIndex)))}
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
    const speak = epithetSpeakSec(person)
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
  // 직함 리드 타자 효과음 — 직함 2·3줄이 순차로 떠오르는 동안 타이핑 사운드를 깐다(세로 쇼츠).
  const creditTypingEl = (() => {
    if (!isShorts || !showCreditRest) return null
    const dur = f(creditAppearSec(person))
    if (dur <= 0) return null
    return (
      <Sequence from={cueStart + f(ENTER_NAME_SEC)} durationInFrames={dur}>
        <Audio src={staticFile('common/sfx/typing.mp3')} loop volume={0.6} />
      </Sequence>
    )
  })()

  // 켄번스 줌은 미디어 "요소 자체"의 transform 으로 건다(상위 래퍼 아님).
  // 영상(<video>)에 상위 transform 이 걸리면 Chrome 이 별도 합성 레이어로 떼어내 사방으로 떨린다 — 요소 자체에 걸면 단일 레이어라 매끄럽다.
  // 사진 맞춤(crop): cover로 잘릴 위치를 objectPosition·transformOrigin 으로 잡고, 확대(scale)는 줌 모션 위에 곱한다.
  // 미지정이면 가운데(50% 50%)·1배 → 기존 동작 그대로.
  const styleFor = (crop?: FactionImageCrop): React.CSSProperties => {
    const x = crop?.x ?? 50
    const y = crop?.y ?? 50
    const sc = crop?.scale ?? 1
    return {
      width: '100%', height: '100%', objectFit: 'cover',
      objectPosition: `${x}% ${y}%`,
      // 푸시인 줌은 목표점으로 이동하는 모드라 확대 기준점을 화면 중앙에 둔다(이동량 계산과 일치). 그 외엔 사진맞춤 위치.
      transformOrigin: pushin ? '50% 50%' : `${x}% ${y}%`,
      transform: holdTf(sc, crop),
    }
  }
  // 이미지(세로·가로 공용) — imageChanges가 있으면 대사 도중 발화 시각에 맞춰 사진을 크로스페이드로 교체. 없으면 단일. 둘 다 없으면 이니셜.
  const initialsFallback = (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${accent}22 0%, ${BG} 60%)`, transform: holdTf() }}>
      <span style={{ color: accent, fontFamily: FONT, fontSize: orientation === 'landscape' ? 220 : 320, fontWeight: 800 }}>{initials(person.name)}</span>
    </AbsoluteFill>
  )
  const imgChanges = person.imageChanges?.length ? [...person.imageChanges].sort((a, b) => a.chunk - b.chunk) : []
  const photo = !person.image || imgErr ? initialsFallback : (() => {
    const base = <FactionMedia src={imgSrc(episodeName, person.image)} startFrame={cueStart} onError={() => setImgErr(true)} style={styleFor(person.imageCrop)} />
    // 덩어리 시작 프레임 — 발화 시각(voiceTiming) 우선, 없으면 글자수 비례
    const audioStart = cueStart + f(quoteEnterSec)
    const spread = Math.max(1, cueDuration - f(quoteEnterSec))
    const expanded = voiceTiming ? expandSubTimings(voiceTiming) : undefined
    const useT = !!expanded && expanded.length === quoteChunks.length && expanded.every(t => t.start != null)
    const totalChars = quoteChunks.join(' ').length || 1
    const chunkFrame = (ci: number): number => {
      if (ci <= 0) return cueStart
      if (useT) return audioStart + f(expanded![Math.min(ci, expanded!.length - 1)].start!)
      const before = quoteChunks.slice(0, ci).join(' ').length
      return audioStart + Math.round(spread * before / totalChars)
    }
    // 사진 전환 목록 — quoteImage(직함→대사, 대사 시작 시점) + imageChanges(대사 도중 덩어리별 교체)를 합쳐 한 번에 깐다.
    const changes: { start: number; image: string; crop?: FactionImageCrop }[] = []
    if (person.quoteImage && hasQuote) changes.push({ start: audioStart, image: person.quoteImage, crop: person.quoteImageCrop })
    for (const ic of imgChanges) changes.push({ start: chunkFrame(ic.chunk), image: ic.image, crop: ic.crop })
    if (!changes.length) return base
    const cf = f(CROSSFADE_SEC)
    return (
      <>
        <AbsoluteFill>{base}</AbsoluteFill>
        {changes.map((c, idx) => {
          const op = interpolate(frame, [c.start - cf, c.start], [0, 1], clamp)
          if (op <= 0) return null
          return (
            <AbsoluteFill key={idx} style={{ opacity: op }}>
              <FactionMedia src={imgSrc(episodeName, c.image)} startFrame={c.start} style={styleFor(c.crop)} />
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

  // ── 가로 롱폼: 좌측 세로 사진 + 우측 텍스트(잡지 스프레드) ──
  if (orientation === 'landscape') {
    return (
      <AbsoluteFill style={{ backgroundColor: BG, flexDirection: 'row' }}>
        {audioEl}
        {/* 좌: 인물 사진 — 켄번스 줌(컷 동안 천천히 확대) */}
        <div style={{ width: L_PHOTO_W, height: '100%', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          <AbsoluteFill>{photoEl}</AbsoluteFill>
          {/* 사진→텍스트 경계 부드럽게 */}
          <AbsoluteFill style={{ background: `linear-gradient(to right, transparent 70%, ${BG} 100%)` }} />
        </div>
        {/* 우: 텍스트 — 이름 위치를 고정(상단 기준)하고 아래 슬롯만 확장. 인물마다 위아래로 흔들리지 않게 */}
        {/* 이름(고정) → 같은 슬롯에서 직함(2행) → 대사로 교차 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 28, padding: `300px ${L_TEXT_PAD}px 0`, opacity: boxExitOp }}>
          {/* 이름 + 직함 1번(이름 옆 고정, 전원) */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ color: '#ffffff', fontFamily: FONT, fontSize: 88, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.1, textAlign: 'left', opacity: nameOp }}>{person.name}</div>
            {creditHead ? (
              <div style={{ color: accent, fontFamily: FONT, fontSize: 50, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.1, opacity: creditOp, whiteSpace: 'nowrap' }}>{creditHead}</div>
            ) : null}
          </div>
          {/* 아래 슬롯 — voice·text는 바로 대사 / credit은 직함 2번부터 순차 / full(통합)은 직함 순차 → 대사로 교차(겹쳐 두고 페이드) */}
          <div style={{ display: 'grid', alignItems: 'start' }}>
            {showCreditRest ? (
              <div style={{ gridArea: '1 / 1', opacity: creditRestOp }}>
                <CreditLines items={creditRest} accent={accent} fontSize={52} frame={lt} startFrame={f(ENTER_NAME_SEC + CREDIT_LINE_STAGGER_SEC)} staggerFrames={f(CREDIT_LINE_STAGGER_SEC)} />
              </div>
            ) : null}
            {hasQuote ? (
              <div style={{ gridArea: '1 / 1' }}>
                <QuotePages
                  chunks={quoteChunks} timings={voiceTiming}
                  startFrame={cueStart + f(quoteEnterSec)}
                  spreadFrames={Math.max(1, cueDuration - f(quoteEnterSec))}
                  fontSize={64}
                  color={silentQuote ? '#9da6b2' : '#d8dce2'}
                  highlightColor={silentQuote ? '#dfe4ea' : '#ffffff'}
                  maxChars={73} opacity={quoteOp}
                />
              </div>
            ) : null}
          </div>
          {/* 영문 원문 보조 — 가로 롱폼에서만 표기(세로 쇼츠는 숨김), 대사와 함께 페이드인 */}
          {person.quoteEn ? (
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
      {/* 인물 사진 — 켄번스 줌(컷 동안 천천히 확대). 줌은 미디어 요소 자체에 걸려 있다(영상 떨림 방지) */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>{photoEl}</AbsoluteFill>
      {/* 상단 살짝 어둡게 — 상단 헤더 영역 가독 */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${BG}aa 0%, transparent 20%)` }} />
      {/* 텍스트 — 박스(이름+직함 한 줄 + 대사)를 한 덩어리로 화면 하단에 둔다. 왼쪽 끝에 붙지 않게 좌우 여백. */}
      {/* 북리커맨드 쇼츠 하단 자막의 위치·크기 감각에 맞춤(하단·여백·작은 글씨). */}
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'stretch', padding: `0 ${CONTENT_PAD}px ${CONTENT_PAD}px` }}>
        {/* 박스를 한 덩어리로 왼쪽에서 슬라이드 인. 박스 높이는 이름 + 직함/대사 슬롯으로 처음부터 확보되어, */}
        {/* 슬라이드로 한 번 들어온 뒤엔 박스가 가만히 있고 그 안에서 직함(2행)→대사 교차만 일어난다(들썩임 없음). */}
        <div style={{
          position: 'relative',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
          // 쇼츠는 우측을 비워 인물 사진·우측 요소와 안 겹치게 좁게(864), 세로 롱폼은 우측 끝까지(984)
          width: 'fit-content', maxWidth: isShorts ? 864 : 984,
          background: 'rgba(0,0,0,0.4)', padding: '22px 28px', borderRadius: 4,
          borderLeft: `4px solid ${accent}`, // 좌측바만 세력색으로 — 색상 조금 활용
          fontFamily: FONT_SERIF, // 박스 전체 serif — 이름·직함·대사 통일
          transform: `translateX(${panelSlideX}px)`, opacity: panelOp * boxExitOp,
        }}>
          {/* 이름(세력색) + 직함 1번(이름 옆 고정, 전원) */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ color: accent, fontFamily: FONT_SERIF, fontSize: 52, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.1, textAlign: 'left', ...TEXT_PAINT }}>{person.name}</div>
            {creditHead ? (
              <div style={{ color: FG, fontFamily: FONT, fontSize: 32, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.1, opacity: creditOp, whiteSpace: 'nowrap', ...TEXT_PAINT }}>{creditHead}</div>
            ) : null}
          </div>
          {/* 아래 슬롯 — voice·text는 바로 대사 / credit은 직함 2번부터 순차 / full(통합)·수식어 리드인은 앞 내용 순차 → 대사로 교차(겹쳐 두고 페이드) */}
          <div style={{ display: 'grid', alignItems: 'start', alignSelf: 'stretch' }}>
            {/* 수식어(문장형) — 한 문장으로 떠 있다가 대사로 교차. 같은 슬롯에서 페이드아웃.
                낭독 모드는 음성이 읽으므로 글자를 통째로 띄우고, 타이핑 모드는 글자가 속도에 맞춰 한 구절씩 점등된다. */}
            {hasEpithet ? (
              <div style={{ gridArea: '1 / 1', opacity: epithetOp }}>
                <div style={{ opacity: epithetInOp, transform: `translateY(${epithetInTy}px)` }}>
                  {epithetNarrated ? (
                    <div style={{
                      color: '#f0f0f4', fontFamily: FONT_SERIF,
                      fontSize: 50, fontWeight: 600,
                      letterSpacing: 0.2, lineHeight: 1.5, textAlign: 'left',
                      wordBreak: 'keep-all',
                      ...TEXT_PAINT,
                    }}>{epithet}</div>
                  ) : (
                    <Typewriter
                      text={epithet}
                      startFrame={cueStart + epithetStartF}
                      spreadFrames={f(epithetSpeakSec(person))}
                      timings={epithetWordTimings(epithet, epithetSpeakSec(person))}
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
                <CreditLines items={creditRest} accent={accent} fontSize={40} frame={lt} startFrame={f(ENTER_NAME_SEC + CREDIT_LINE_STAGGER_SEC)} staggerFrames={f(CREDIT_LINE_STAGGER_SEC)} />
              </div>
            ) : null}
            {hasQuote ? (
              <div style={{ gridArea: '1 / 1' }}>
                <QuotePages
                  chunks={quoteChunks} timings={voiceTiming}
                  startFrame={cueStart + f(quoteEnterSec)}
                  spreadFrames={Math.max(1, cueDuration - f(quoteEnterSec))}
                  fontSize={50}
                  color="#c8a46e"
                  highlightColor="#f5e6c8"
                  maxChars={68} opacity={quoteOp} lineHeight={1.7}
                />
              </div>
            ) : null}
          </div>
          {/* 원문 보조 표기는 세로 쇼츠에서 띄우지 않는다(가로 롱폼 전용) */}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
