import React, { useMemo } from 'react'
import { AbsoluteFill, Sequence, Audio, interpolate, useCurrentFrame, staticFile, Easing } from 'remotion'
import type { DiscourseScript, Speaker, Turn, DiscourseHoldMotion, DiscourseImageCrop } from '../types'
import { CROSSFADE_SEC, f } from '../timing'
import { BG, FONT, FONT_SERIF, TEXT_PAINT, CONTENT_PAD, KIND_LABEL, KIND_LABEL_EN, accentClarityPaint } from '../constants'
import { imgSrc, initials, holdMotionTransform, isPushinZoom, sliceLocalTimings, turnEnterSec, turnSpeakSec, turnChunks, castColor, readableOrigin } from '../utils'
import { vnTurn, voiceRelPath, dbToLinear, clampRate } from '../voice-names'
import { Typewriter } from '../../../components/caption/Typewriter'
import { expandSubTimings, type VoiceTimingSegment } from '../../../lib/voice-timing'
import { FactionMedia } from '../../Faction/sections/FactionMedia'
import { CaptionBackdrop } from '../../Faction/sections/CaptionBackdrop'

/** 자막 한 페이지 분량(글자) — 덩어리를 여기까지 모아 한 화면에 띄운다. 덩어리 경계로만 끊어 말이 잘리지 않는다 */
const PAGE_MAX_CHARS = 52
/** 자막 글자 크기 */
const CAPTION_FONT = 46
/** 텍스트 선퇴장 길이(초) — 컷 경계에서 펑 하고 사라지지 않게 */
const TEXT_EXIT_SEC = 0.45

/**
 * 발언 자막 — 사람이 의미 단위로 끊어둔 덩어리(chunks)를 한 화면 분량까지 모아 페이지로 묶고,
 * 음성 진행에 맞춰 한 페이지씩 교체하며 공통 Typewriter 로 읽는 글자를 점등한다.
 *
 * 발화 시각(timings)이 덩어리 수와 맞으면 실제 시각으로, 아니면 글자수 비례로 전환·점등한다(폴백).
 * **음성이 아직 없어도 자막은 흐른다** — 폴백이 이 시리즈의 기본 상태다(대본이 먼저, 음성은 나중).
 */
const TurnCaption: React.FC<{
  chunks: string[]
  timings?: VoiceTimingSegment[]
  startFrame: number
  spreadFrames: number
  color: string
  highlightColor: string
}> = ({ chunks, timings, startFrame, spreadFrames, color, highlightColor }) => {
  const frame = useCurrentFrame()

  // 빈 덩어리(연속 개행)를 뺀 실제 덩어리 — 발화 시각·점등과 1:1로 맞물린다.
  const realChunks = useMemo(() => chunks.filter(c => c && c.trim()), [chunks])
  const pages = useMemo(() => {
    const out: { text: string; start: number; end: number }[] = []
    let cur = ''
    let curStart = 0
    let ri = 0
    for (const c of chunks) {
      if (!c || !c.trim()) continue
      const cand = cur ? `${cur} ${c}` : c
      if (cand.length > PAGE_MAX_CHARS && cur) {
        out.push({ text: cur, start: curStart, end: ri })
        cur = c
        curStart = ri
      } else {
        cur = cand
      }
      ri++
    }
    if (cur) out.push({ text: cur, start: curStart, end: ri })
    return out.length ? out : [{ text: realChunks.join(' '), start: 0, end: realChunks.length }]
  }, [chunks, realChunks])

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
      fontSize={CAPTION_FONT} color={color} highlightColor={highlightColor}
      timings={segTimings} keepLit
      style={{
        lineHeight: 1.4, textAlign: 'center', fontFamily: FONT, fontWeight: 800, wordBreak: 'keep-all',
        WebkitTextStroke: '1.6px rgba(0,0,0,0.9)', paintOrder: 'stroke fill',
        textShadow: '0 0 8px rgba(0,0,0,0.95), 0 0 24px rgba(0,0,0,0.75), 0 4px 16px rgba(0,0,0,0.55)',
      }}
    />
  )

  if (pages.length <= 1) {
    const seg = useTimings ? sliceLocalTimings(expanded!, 0, realChunks.length) : undefined
    return <div style={{ gridArea: '1 / 1' }}>{tw(pages[0].text, startFrame, spreadFrames, seg)}</div>
  }

  // 모든 페이지를 같은 칸에 겹쳐 쌓고 현재 페이지만 보인다 —
  // 안 보이는 페이지도 자리를 차지하므로 자막 높이가 '가장 긴 페이지' 기준으로 컷 내내 고정된다(이름이 오르내리지 않는다).
  return (
    <div style={{ gridArea: '1 / 1', display: 'grid' }}>
      {pages.map((page, pi) => {
        const isLast = pi === pages.length - 1
        const ps = pageStart(pi)
        const nextPs = isLast
          ? (useTimings ? startFrame + f(expanded![page.end - 1].end!) : startFrame + spreadFrames)
          : pageStart(pi + 1)
        // 첫 페이지는 점등 시작이 아니라 자막 등장 시점부터 보인다(음성 앞 무음 대비). 점등 자체는 제 시각 그대로.
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

/**
 * 발언 컷 — 이 시리즈의 본체.
 *
 * 인물 사진이 화면을 채우고(켄번스·지속 효과), 하단 어둠 위로 발언자 이름과 자막이 얹힌다.
 * 대사 도중 지정한 덩어리에서 사진이 크로스페이드로 바뀐다(imageChanges — 팩션 계승).
 *
 * ⚠ 음원은 duration 이 기록된 발언에만 건다. 파이프라인이 wav 를 만들면서 duration 을 쓰므로,
 *   duration 이 없다 = wav 가 없다 이다. 없는 파일을 staticFile 로 물리면 렌더가 깨지므로 아예 걸지 않는다.
 *   → 음성 미생성 상태에서는 무음으로 흐르고 자막만 글자수 비례로 점등한다.
 */
export const TurnCard: React.FC<{
  episodeName: string
  script: DiscourseScript
  turn: Turn
  turnIndex: number
  speaker: Speaker
  color: string
  frame: number
  cueStart: number
  cueDuration: number
  voiceTiming?: VoiceTimingSegment[]
  hold: DiscourseHoldMotion
  isEn: boolean
}> = ({ episodeName, script, turn, turnIndex, speaker, color, frame, cueStart, cueDuration, voiceTiming, hold, isEn }) => {
  const [imgErr, setImgErr] = React.useState(false)
  const local = frame - cueStart
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

  const chunks = turnChunks(turn)
  const enterSec = turnEnterSec()
  const speakSec = turnSpeakSec(turn)
  const captionStart = cueStart + f(enterSec)
  const captionSpread = Math.max(1, f(speakSec))

  // 시작 사진 — 이 발언 전용 지정이 있으면 그것, 없으면 인물 기본 사진.
  const baseImage = turn.image ?? speaker.image
  const baseCrop = turn.imageCrop ?? speaker.imageCrop

  const styleFor = (crop?: DiscourseImageCrop, holdLocalStart = 0, stretchSpan?: number): React.CSSProperties => {
    const x = crop?.x ?? 50
    const y = crop?.y ?? 50
    const z = Math.max(0, local - holdLocalStart)
    return {
      width: '100%', height: '100%', objectFit: 'cover',
      objectPosition: `${x}% ${y}%`,
      // 푸시인 줌은 목표점으로 다가가는 모드라 확대 기준점을 화면 중앙에 둔다. 그 외엔 사진맞춤 위치.
      transformOrigin: isPushinZoom(hold) ? '50% 50%' : `${x}% ${y}%`,
      transform: holdMotionTransform(hold, z, crop?.scale ?? 1, {
        focusX: crop?.x, focusY: crop?.y,
        ...(stretchSpan != null && stretchSpan > 0 ? { spanFrames: stretchSpan } : {}),
      }),
    }
  }

  // ── 사진 교체 시각 ── 자막과 같은 기준(실제 덩어리 인덱스 + 발화 시각)으로 잡아야 컷이 음성에 맞는다.
  const imgChanges = turn.imageChanges?.length ? [...turn.imageChanges].sort((a, b) => a.chunk - b.chunk) : []
  const expanded = voiceTiming ? expandSubTimings(voiceTiming) : undefined
  const realChunks = chunks.filter(c => c && c.trim())
  const useT = !!expanded && expanded.length === realChunks.length && expanded.every(t => t.start != null)
  const totalChars = realChunks.join(' ').length || 1
  /** chunks 인덱스 → 그 앞의 빈 덩어리를 뺀 실제 인덱스 */
  const realIndexOf = (ci: number): number => {
    let r = 0
    for (let i = 0; i < ci && i < chunks.length; i++) if (chunks[i]?.trim()) r++
    return r
  }
  const chunkFrame = (ci: number): number => {
    const ri = realIndexOf(ci)
    if (ri <= 0) return captionStart
    if (useT) return captionStart + f(expanded![Math.min(ri, expanded!.length - 1)].start!)
    const before = realChunks.slice(0, ri).join(' ').length
    return captionStart + Math.round(captionSpread * before / totalChars)
  }

  // 단일 사진은 컷 전체에 줌을 늘리고(상한 조기 소진 방지), 교체가 있으면 사진마다 줌을 다시 깐다(정속).
  const initialsFallback = (
    <AbsoluteFill style={{
      alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(160deg, ${color}2e 0%, ${BG} 62%)`,
      transform: holdMotionTransform(hold, Math.max(0, local), 1, { spanFrames: Math.max(1, cueDuration) }),
    }}>
      <span style={{ color: `${color}59`, fontFamily: FONT, fontSize: 300, fontWeight: 800 }}>{initials(speaker.name)}</span>
    </AbsoluteFill>
  )
  const photo = !baseImage || imgErr ? initialsFallback : (() => {
    if (!imgChanges.length) {
      return <FactionMedia src={imgSrc(episodeName, baseImage)} startFrame={cueStart} onError={() => setImgErr(true)} style={styleFor(baseCrop, 0, Math.max(1, cueDuration))} />
    }
    const cf = f(CROSSFADE_SEC)
    return (
      <>
        <AbsoluteFill>
          <FactionMedia src={imgSrc(episodeName, baseImage)} startFrame={cueStart} onError={() => setImgErr(true)} style={styleFor(baseCrop, 0)} />
        </AbsoluteFill>
        {imgChanges.map((ic, idx) => {
          const start = chunkFrame(ic.chunk)
          const op = interpolate(frame, [start - cf, start], [0, 1], clamp)
          if (op <= 0) return null
          return (
            <AbsoluteFill key={idx} style={{ opacity: op }}>
              <FactionMedia src={imgSrc(episodeName, ic.image)} startFrame={start} style={styleFor(ic.crop, Math.max(0, start - cueStart))} />
            </AbsoluteFill>
          )
        })}
      </>
    )
  })()

  // ── 음성 ── duration 이 기록된 발언만. 시퀀스를 컷 끝까지 열어 끝 음절이 씹히지 않게 한다(음원이 끝나면 자동 무음).
  const hasVoice = turn.duration != null && turn.duration > 0
  const audioEl = hasVoice ? (
    <Sequence from={captionStart} durationInFrames={Math.max(1, cueDuration - f(enterSec))}>
      <Audio
        src={staticFile(voiceRelPath(episodeName, vnTurn(turnIndex, speaker.slug)))}
        volume={dbToLinear(turn.gainDb)}
        playbackRate={clampRate(turn.playbackRate)}
      />
    </Sequence>
  ) : null

  // ── 리드 ── 앞 발언을 받는 발언만 무엇을 하는 발언인지 알린다. 독백은 리드 없음.
  const kindLabel = (isEn ? KIND_LABEL_EN : KIND_LABEL)[turn.kind] ?? null
  const toSpeaker = turn.to != null ? script.cast[turn.to] : undefined
  const toColor = turn.to != null ? castColor(toSpeaker, turn.to) : color

  // 등장·퇴장 — 이름·리드가 먼저 박히고, 자막은 발화 시작에 맞춰 뜬다.
  const leadOp = interpolate(local, [0, f(0.3)], [0, 1], clamp)
  const leadTy = interpolate(local, [0, f(0.3)], [18, 0], { ...clamp, easing: Easing.out(Easing.cubic) })
  const captionOp = interpolate(local, [f(enterSec), f(enterSec + 0.25)], [0, 1], clamp)
  const exitOp = interpolate(local, [Math.max(0, cueDuration - f(TEXT_EXIT_SEC)), cueDuration], [1, 0], clamp)
  // 원문을 화면에 띄울지 — 읽히는 언어일 때만(한문 사료는 출처만 남긴다). 판별 근거는 utils.readableOrigin
  const readable = readableOrigin(turn.origin)

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {audioEl}
      <AbsoluteFill>{photo}</AbsoluteFill>
      {/* 하단 어둠 — 어떤 사진 위에서도 자막이 읽히게 */}
      <AbsoluteFill style={{ background: 'linear-gradient(to bottom, transparent 34%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.88) 100%)' }} />
      <AbsoluteFill style={{
        flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
        padding: `0 ${CONTENT_PAD}px 64px`, gap: 18, opacity: exitOp, pointerEvents: 'none',
      }}>
        {/* 리드 배지 — '반박 → 샘 알트만'. 누구를 받아 말하는지 한눈에 보인다. */}
        {kindLabel && (
          <div style={{
            opacity: leadOp, transform: `translateY(${leadTy}px)`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{
              padding: '6px 18px', borderRadius: 999,
              border: `2px solid ${color}`, background: 'rgba(0,0,0,0.6)',
              color: color, fontFamily: FONT, fontSize: 26, fontWeight: 800, letterSpacing: 3,
              ...accentClarityPaint(color),
            }}>{kindLabel}</span>
            {toSpeaker && (
              <span style={{
                color: 'rgba(255,255,255,0.72)', fontFamily: FONT, fontSize: 28, fontWeight: 700, letterSpacing: 1,
                ...TEXT_PAINT,
              }}>
                → <span style={{ color: toColor, ...accentClarityPaint(toColor) }}>{toSpeaker.name}</span>
              </span>
            )}
          </div>
        )}
        {/* 발언자 이름 — 인물색. 담화에서 가장 중요한 정보는 '누가 말하는가'다. */}
        <div style={{
          opacity: leadOp, transform: `translateY(${leadTy}px)`,
          color: color, fontFamily: FONT_SERIF, fontSize: 52, fontWeight: 800,
          letterSpacing: 2, lineHeight: 1.1, textAlign: 'center',
          textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.8)',
          WebkitTextStroke: '1px rgba(0,0,0,0.85)', paintOrder: 'stroke fill',
          ...accentClarityPaint(color),
        }}><CaptionBackdrop>{speaker.name}</CaptionBackdrop></div>
        {/* 대사 — 덩어리 단위 글자 점등 */}
        {chunks.length > 0 && (
          <div style={{ display: 'grid', width: '100%', maxWidth: 940, opacity: captionOp, marginTop: 6 }}>
            <TurnCaption
              chunks={chunks}
              timings={voiceTiming}
              startFrame={captionStart}
              spreadFrames={captionSpread}
              // 음원 없는 무음 발언은 살짝 차갑게 — 음원 있는 발언과 톤을 구분한다.
              color={hasVoice ? '#9aa0aa' : '#7f858e'}
              highlightColor={hasVoice ? '#f6f1e8' : '#cfd3d9'}
            />
          </div>
        )}
        {/* 실제 발언 원문 — 의역 아래 작게. 재구성분과 실발언을 구분하는 신뢰 장치다(있는 발언에만).
            원문은 **시청자가 읽을 수 있을 때만** 띄운다(readableOrigin). 한문 사료는 읽히지 않아 화면에선 노이즈이고,
            대사 자체가 이미 그 문장을 한글로 옮긴 것이라 같은 말을 두 번 보여주게 된다. 그때는 출처만 남긴다.
            데이터의 origin 은 그대로 보존한다 — 검증 근거이자 BO 표시용이다. */}
        {(readable || turn.originRef) && (
          <div style={{
            opacity: captionOp, maxWidth: 900, marginTop: 6,
            color: 'rgba(255,255,255,0.55)', fontFamily: FONT, fontSize: 24, fontWeight: 500,
            lineHeight: 1.4, textAlign: 'center', wordBreak: 'keep-all', ...TEXT_PAINT,
          }}>
            {readable && `"${turn.origin}"`}
            {turn.originRef && <span style={{ opacity: 0.7 }}>{readable ? ` — ${turn.originRef}` : turn.originRef}</span>}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
