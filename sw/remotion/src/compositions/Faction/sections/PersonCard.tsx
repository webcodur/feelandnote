import React, { useMemo } from 'react'
import { AbsoluteFill, Img, Sequence, Audio, interpolate, useCurrentFrame, staticFile, Easing } from 'remotion'
import type { FactionGroup, FactionPerson, FactionTransition, Orientation } from '../types'
import { CROSSFADE_SEC, ENTER_NAME_SEC, ENTER_FADE_SEC, CREDIT_LINE_STAGGER_SEC, personQuoteEnterSec, personAudioPlaySec, creditLinesOf, f, type QuoteMode } from '../timing'
import { BG, FG, FONT, FONT_SERIF, TEXT_PAINT, DEFAULT_ACCENT, CONTENT_PAD, L_PHOTO_W, L_TEXT_PAD, PERSON_ZOOM_OUT_SEC, PERSON_ZOOM_START, CONT_ZOOM_RATE, CONT_ZOOM_MAX, PANEL_SLIDE_X, PANEL_SLIDE_SEC } from '../constants'
import { resolveTransition, imgSrc, initials, sliceLocalTimings } from '../utils'
import { CUT_TRANSITIONS } from '../transitions'
import { vnPersonQuote, voiceRelPath, dbToLinear, clampRate } from '../voice-names'
import { Typewriter } from '../../../components/caption/Typewriter'
import { expandSubTimings, type VoiceTimingSegment } from '../../../lib/voice-timing'

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
            <span style={{ color: '#e8e8ee', fontFamily: FONT, fontSize, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.28, textAlign: 'left', ...TEXT_PAINT }}>{t}</span>
          </div>
        )
      })}
    </div>
  )
}

export const PersonCard: React.FC<{ episodeName: string; group: FactionGroup; person: FactionPerson; frame: number; cueStart: number; cueDuration: number; orientation: Orientation; groupIndex: number; personIndex: number; clusterIndex?: number; transition?: FactionTransition; quoteMode?: QuoteMode; voiceTiming?: VoiceTimingSegment[]; zoomFreezeSec?: number; isShorts?: boolean }> = ({ episodeName, group, person, frame, cueStart, cueDuration, orientation, groupIndex, personIndex, clusterIndex, transition, quoteMode = 'text', voiceTiming, zoomFreezeSec, isShorts = false }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  const [imgErr, setImgErr] = React.useState(false)
  const local = frame - cueStart
  // 롱폼은 사진을 기다리지 않고 텍스트가 컷과 거의 동시에 바로 등장 — 등장 타이밍을 ENTER_NAME_SEC만큼 앞당긴다(세로 쇼츠는 기존 그대로)
  const lt = orientation === 'landscape' ? local + f(ENTER_NAME_SEC) : local
  // 대사 소스 — 덩어리(quoteChunks)가 있으면 그 배열을, 없으면 통째 quote를 단일 덩어리로.
  // 덩어리 경계는 줄바꿈이 아니라 색 전환점으로만 쓴다(화면에선 한 흐름으로 이어짐).
  const quoteChunks = person.quoteChunks?.length ? person.quoteChunks : (person.quote ? [person.quote] : [])
  // credit 모드는 직함만(대사 숨김). voice·text는 대사 표시.
  const hasQuote = quoteMode !== 'credit' && quoteChunks.length > 0
  // 직함·이력 — 최대 3행. 1번 줄은 (전원) 이름 옆에 고정.
  //   대사 있는 인물: 아래 슬롯은 바로 대사(2·3번 직함은 미노출, 데이터 보관).
  //   대사 없는 인물: 2번부터 이름 아래 슬롯에 한 줄씩 순차로 띄운다(밑에서 떠오름).
  const creditItems = creditLinesOf(person)
  const creditHead = creditItems[0]       // 이름 옆 고정(전원)
  const creditRest = creditItems.slice(1) // 아래 슬롯 순차(대사 없는 인물만)

  // ── 인물 사진 전환효과(세로 쇼츠 전용) — 전역 설정 또는 auto 순환. 가로 롱폼은 줌 없이 고정 ──
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
  // 전환효과: 인물 설정 우선 → 세력(group) 설정 → 에피소드 전역(transition)
  const tk = resolveTransition(person.transition ?? group.transition ?? transition, personIndex)
  const fxTransform = (() => {
    if (orientation === 'landscape') return 'scale(1)'
    // 줌 기준 시각 — 마지막 컷은 대사 끝(zoomFreezeSec)에서 줌을 멈추고 종료 꼬리 동안 정지한다. 그 외 컷은 local 그대로.
    const z = zoomFreezeSec != null ? Math.min(local, f(zoomFreezeSec)) : local
    // 진입 모션(introSec) 종료 후부터 정속으로 누적되는 공통 지속 줌인.
    // 프레임당 일정 비율(CONT_ZOOM_RATE)로 확대하므로, 컷이 길든 짧든 모든 인물의 줌인 빠르기가 같다. CONT_ZOOM_MAX에 닿으면 멈춘다.
    const contZoomAfter = (introSec: number) =>
      Math.min(CONT_ZOOM_MAX, 1 + CONT_ZOOM_RATE * Math.max(0, z - f(introSec)))
    // 컷 전환 효과(slide·glitch·tear 등) — 진입 모션은 CueLayer·CutEnter가 바깥 레이어에서 담당.
    // 사진은 컷 시작부터 인물이 넘어가기 직전까지 공통 지속 줌인으로 끊김 없이 확대한다.
    if (CUT_TRANSITIONS.has(tk)) {
      return `scale(${contZoomAfter(0)})`
    }
    // 줌인·켄번스는 도입부(0.55초)에 빠르게 움직인 뒤, 정지하지 않고 공통 지속 줌인으로 컷 끝까지 계속 확대한다.
    // 진입 종료(0.55초) 시점에 지속 줌인이 1.0이라 빠르기가 매끄럽게 이어진다.
    if (tk === 'zoomin') {
      const intro = interpolate(z, [0, f(0.55)], [1.0, 1.09], { ...clamp, easing: Easing.out(Easing.cubic) })
      return `scale(${intro * contZoomAfter(0.55)})`
    }
    if (tk === 'kenburns') {
      const s = interpolate(z, [0, f(0.55)], [1.03, 1.1], { ...clamp, easing: Easing.out(Easing.cubic) })
      const y = interpolate(z, [0, f(0.55)], [1.6, -1.6], { ...clamp, easing: Easing.out(Easing.cubic) })
      return `scale(${s * contZoomAfter(0.55)}) translateY(${y}%)`
    }
    // zoomout (기본): 빠르게 뒤로 빠진 뒤(0~0.15초, 1.1→1.0) 멈추지 않고, 공통 지속 줌인으로 컷 끝까지 정속 확대.
    // 두 구간 경계(0.15초)에서 지속 줌인이 1.0이라 매끄럽게 이어진다.
    const s = z < f(PERSON_ZOOM_OUT_SEC)
      ? interpolate(z, [0, f(PERSON_ZOOM_OUT_SEC)], [PERSON_ZOOM_START, 1.0], clamp)
      : contZoomAfter(PERSON_ZOOM_OUT_SEC)
    return `scale(${s})`
  })()
  // 1) 박스 + 이름 + 직함 함께 페이드인. 세로는 박스째 왼쪽에서 슬라이드 인(가로는 슬라이드 없이 페이드만)
  const nameOp = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 세로 박스 슬라이드 — 왼쪽 밖(-PANEL_SLIDE_X)에서 제자리(0)로. 슬라이드와 페이드를 같은 구간에 묶는다
  const panelSlideX = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + PANEL_SLIDE_SEC)], [-PANEL_SLIDE_X, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const panelOp = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 2) 직함 — 대사 인물의 이름 옆 직함(creditHead)은 이름과 함께 페이드인해 상시 표기.
  //   대사 없는 인물의 아래 직함 줄별 순차 등장은 CreditLines가 담당.
  const quoteEnterSec = personQuoteEnterSec(person, quoteMode)
  const creditOp = interpolate(lt, [f(ENTER_NAME_SEC), f(ENTER_NAME_SEC + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 3) 대사 — 등장 페이드인 직후 바로 등장. full(통합)은 직함을 다 보여준 뒤라 quoteEnterSec 자체가 늦다.
  const quoteOp = interpolate(lt, [f(quoteEnterSec), f(quoteEnterSec + ENTER_FADE_SEC)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  // 아래 슬롯에 직함 2·3번 줄을 띄우는 모드 — credit(상시) / full(대사 등장 직전 페이드아웃 후 대사로 교차).
  const showCreditRest = (quoteMode === 'credit' || quoteMode === 'full') && creditRest.length > 0
  const creditRestOp = quoteMode === 'full'
    ? interpolate(lt, [f(quoteEnterSec - ENTER_FADE_SEC), f(quoteEnterSec)], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 1

  // 음성은 voice 모드(발음 인물)만 재생. text·credit은 무음.
  const audioPlaySec = personAudioPlaySec(person)
  // 음성 시퀀스를 음원 길이에 딱 맞춰 끊으면(round 내림 + 프리뷰 디코딩 지연) 끝 한 글자가 씹힌다.
  // 컷은 음원 뒤로 여운(약 1.55초)이 항상 있으므로, 시퀀스를 컷 끝까지 열어두면 음원이 온전히 재생된다.
  // 음원이 끝나면 Remotion 이 자동으로 무음이라 길게 열어도 안전하다.
  const audioWindowFrames = Math.max(f(audioPlaySec), cueDuration - f(quoteEnterSec))
  const audioEl = (quoteMode === 'voice' || quoteMode === 'full') && person.quoteDuration && person.quoteDuration > 0 ? (
    <Sequence from={cueStart + f(quoteEnterSec)} durationInFrames={audioWindowFrames}>
      <Audio
        src={staticFile(voiceRelPath(episodeName, vnPersonQuote(groupIndex, personIndex, clusterIndex)))}
        volume={dbToLinear(person.quoteGainDb)}
        playbackRate={clampRate(person.quotePlaybackRate)}
      />
    </Sequence>
  ) : null

  // 이미지(세로·가로 공용) — imageChanges가 있으면 대사 도중 발화 시각에 맞춰 사진을 크로스페이드로 교체. 없으면 단일. 둘 다 없으면 이니셜.
  const initialsFallback = (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${accent}22 0%, ${BG} 60%)` }}>
      <span style={{ color: accent, fontFamily: FONT, fontSize: orientation === 'landscape' ? 220 : 320, fontWeight: 800 }}>{initials(person.name)}</span>
    </AbsoluteFill>
  )
  const imgChanges = person.imageChanges?.length ? [...person.imageChanges].sort((a, b) => a.chunk - b.chunk) : []
  const photo = !person.image || imgErr ? initialsFallback : (() => {
    const base = <Img src={imgSrc(episodeName, person.image)} onError={() => setImgErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    if (!imgChanges.length) return base
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
    const cf = f(CROSSFADE_SEC)
    return (
      <>
        <AbsoluteFill>{base}</AbsoluteFill>
        {imgChanges.map((ic, idx) => {
          const start = chunkFrame(ic.chunk)
          const op = interpolate(frame, [start - cf, start], [0, 1], clamp)
          if (op <= 0) return null
          return (
            <AbsoluteFill key={idx} style={{ opacity: op }}>
              <Img src={imgSrc(episodeName, ic.image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </AbsoluteFill>
          )
        })}
      </>
    )
  })()

  // ── 가로 롱폼: 좌측 세로 사진 + 우측 텍스트(잡지 스프레드) ──
  if (orientation === 'landscape') {
    return (
      <AbsoluteFill style={{ backgroundColor: BG, flexDirection: 'row' }}>
        {audioEl}
        {/* 좌: 인물 사진 — 켄번스 줌(컷 동안 천천히 확대) */}
        <div style={{ width: L_PHOTO_W, height: '100%', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          <AbsoluteFill style={{ transform: fxTransform }}>{photo}</AbsoluteFill>
          {/* 사진→텍스트 경계 부드럽게 */}
          <AbsoluteFill style={{ background: `linear-gradient(to right, transparent 70%, ${BG} 100%)` }} />
        </div>
        {/* 우: 텍스트 — 이름 위치를 고정(상단 기준)하고 아래 슬롯만 확장. 인물마다 위아래로 흔들리지 않게 */}
        {/* 이름(고정) → 같은 슬롯에서 직함(2행) → 대사로 교차 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 28, padding: `300px ${L_TEXT_PAD}px 0` }}>
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
                  color={quoteMode === 'text' ? '#9da6b2' : '#d8dce2'}
                  highlightColor={quoteMode === 'text' ? '#dfe4ea' : '#ffffff'}
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
      {/* 인물 사진 — 켄번스 줌(컷 동안 천천히 확대) */}
      <AbsoluteFill style={{ overflow: 'hidden', transform: fxTransform }}>{photo}</AbsoluteFill>
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
          transform: `translateX(${panelSlideX}px)`, opacity: panelOp,
        }}>
          {/* 이름(세력색) + 직함 1번(이름 옆 고정, 전원) */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ color: accent, fontFamily: FONT_SERIF, fontSize: 52, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1.1, textAlign: 'left', ...TEXT_PAINT }}>{person.name}</div>
            {creditHead ? (
              <div style={{ color: FG, fontFamily: FONT, fontSize: 32, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.1, opacity: creditOp, whiteSpace: 'nowrap', ...TEXT_PAINT }}>{creditHead}</div>
            ) : null}
          </div>
          {/* 아래 슬롯 — voice·text는 바로 대사 / credit은 직함 2번부터 순차 / full(통합)은 직함 순차 → 대사로 교차(겹쳐 두고 페이드) */}
          <div style={{ display: 'grid', alignItems: 'start', alignSelf: 'stretch' }}>
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
