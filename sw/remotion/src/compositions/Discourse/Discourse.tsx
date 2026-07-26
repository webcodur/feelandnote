import React, { useMemo, useCallback } from 'react'
import {
  AbsoluteFill, Sequence, Audio,
  interpolate, interpolateColors, useCurrentFrame, useVideoConfig, staticFile, Easing,
} from 'remotion'
import type { DiscourseScript, Orientation } from './types'
import { episodes } from './script'
import { buildCues, CROSSFADE_SEC, OUTRO_CROSSFADE_SEC, INTRO_SEC, INTRO_FADE_OUT_SEC, endFadeSecOf, f, type TimedCue } from './timing'
import {
  BG, FONT, DEFAULT_ACCENT, SAFE_BOTTOM, CONTENT_PAD,
  NOTICE_FONT_SIZE, NOTICE_OPACITY,
} from './constants'
import { castColor, resolveNotice, turnEnterSec } from './utils'
import { clampRate } from './voice-names'
import { discourseBgmTracks, canSequenceDiscourseTracks } from './bgm-select'
import { CueLayer } from './sections/CueLayer'
import { TopHeader } from '../Faction/sections/TopHeader'

/* ═══════════════ 배경음악 ═══════════════ */

/** 음량 배율 정규화 — 미지정이면 1(원음). 과증폭 방지로 상한을 둔다 */
const vol01 = (v?: number) => (v == null ? 1 : Math.min(1.5, Math.max(0, v)))
/** 곡 경계 크로스 구간(초) — 곡이 바뀌는 자리의 끊김을 없앤다 */
const EDGE_FADE_SEC = 0.6
/** 영상 끝 음악 페이드아웃(초) — 화면이 검정으로 잠기는 동안 음악도 함께 빠진다 */
const MUSIC_END_FADE_SEC = 2.0

/**
 * 배경음악 — tracks 를 순서대로 깔고 영상이 더 길면 순환한다. tracks 가 없으면 music 한 곡.
 * 발언 음성이 흐르는 동안에는 musicDuckVolume 으로 낮춘다(덕킹).
 */
const DiscourseBgmInner: React.FC<{ script: DiscourseScript; total: number; isShorts: boolean; part?: number; lvPart?: number }> = ({ script, total, isShorts, part, lvPart }) => {
  const { fps } = useVideoConfig()
  const cues = useMemo(() => buildCues(script, isShorts, part, lvPart), [script, isShorts, part, lvPart])

  const duck = script.musicDuckVolume != null ? Math.min(1, Math.max(0, script.musicDuckVolume)) : 1
  // 들어갈 때는 음성 직전에 미리 낮추고, 빠질 때는 더 길게 끌어 부드럽게 돌아온다.
  const DUCK_ATTACK = Math.round(0.7 * fps)
  const DUCK_RELEASE = Math.round(1.3 * fps)
  // 발언이 연달아 붙으면 사이마다 음악이 확 올라왔다 내려가는 들썩임이 생긴다 — 가까운 구간은 한 덩어리로 묶는다.
  const DUCK_MERGE_GAP = Math.round(2.6 * fps)
  const duckWindows = useMemo(() => {
    const raw: [number, number][] = []
    if (duck < 1) {
      for (const tc of cues) {
        if (tc.cue.kind !== 'turn') continue
        const t = script.turns[tc.cue.turnIndex]
        if (!t?.duration || t.duration <= 0) continue // 음원 없는 발언은 낮출 대상이 없다
        const s = tc.start + f(turnEnterSec())
        raw.push([s, s + f(t.duration / clampRate(t.playbackRate))])
      }
    }
    raw.sort((a, b) => a[0] - b[0])
    const merged: [number, number][] = []
    for (const w of raw) {
      const last = merged[merged.length - 1]
      if (last && w[0] - last[1] <= DUCK_MERGE_GAP) last[1] = Math.max(last[1], w[1])
      else merged.push([w[0], w[1]])
    }
    return merged
  }, [duck, cues, script, DUCK_MERGE_GAP])

  // 한 프레임의 덕킹 배율 — Studio 가 음량 곡선을 그리며 수만 번 부르는 최다 핫패스다.
  // 전 구간을 훑지 않고 해당 프레임이 속한 구간 하나만 보고 빠져나온다.
  const duckAt = useCallback((gf: number): number => {
    if (duck >= 1 || !duckWindows.length) return 1
    for (const [s, e] of duckWindows) {
      if (gf < s - DUCK_ATTACK) break
      if (gf <= e + DUCK_RELEASE) {
        return interpolate(gf, [s - DUCK_ATTACK, s, e, e + DUCK_RELEASE], [1, duck, duck, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.ease) })
      }
    }
    return 1
  }, [duck, duckWindows, DUCK_ATTACK, DUCK_RELEASE])

  if (total <= 0) return null

  // 선곡은 `bgm-select.ts` 소유다 — 렌더 창고가 담을 곡을 정할 때 같은 함수를 부른다.
  const tracks = discourseBgmTracks(script)
  if (!tracks.length) return null

  const outroFadeF = f(MUSIC_END_FADE_SEC)
  const edgeF = Math.round(EDGE_FADE_SEC * fps)

  // 한 곡이거나 길이를 모르는 곡이 섞이면 순차 배치가 불가능하다 — 첫 곡 한 장을 전체에 깐다.
  if (!canSequenceDiscourseTracks(tracks)) {
    const baseVol = vol01(tracks[0].volume)
    return (
      <Audio
        src={staticFile(`music/${tracks[0].file}`)}
        volume={fr => interpolate(fr, [total - outroFadeF, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * baseVol * duckAt(fr)}
      />
    )
  }

  const segs: { file: string; from: number; dur: number; vol: number }[] = []
  let cursor = 0
  let idx = 0
  while (cursor < total) {
    const t = tracks[idx % tracks.length]
    const clipF = Math.round((t.durationSec as number) * fps)
    if (clipF <= 0) break
    segs.push({ file: t.file, from: cursor, dur: Math.min(clipF, total - cursor), vol: vol01(t.volume) })
    cursor += clipF
    idx++
  }

  return (
    <>
      {segs.map((s, i) => {
        const volume = (lf: number) => {
          const gf = s.from + lf
          const fadeIn = i === 0 ? 1 : interpolate(lf, [0, edgeF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          const fadeOut = interpolate(lf, [s.dur - edgeF, s.dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          const outro = interpolate(gf, [total - outroFadeF, total], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
          return Math.min(fadeIn, fadeOut, outro) * s.vol * duckAt(gf)
        }
        return (
          <Sequence key={i} from={s.from} durationInFrames={s.dur}>
            <Audio src={staticFile(`music/${s.file}`)} volume={volume} />
          </Sequence>
        )
      })}
    </>
  )
}

// 부모가 매 프레임 다시 그려지지만 음악 배치는 프레임과 무관하다 —
// memo 로 재렌더를 끊어 음량 콜백의 참조를 고정한다(Studio 음량 곡선 캐시가 살아난다).
const DiscourseBgm = React.memo(DiscourseBgmInner)

/* ═══════════════ 본체 ═══════════════ */

/**
 * 가상 담화 — 인물이 자기 사상을 말하고, 다른 인물이 받아 반박하는 세로 영상.
 *
 * script 는 무거운 객체다 — Studio 컴포지션 전환마다 직렬화하면 UI 가 멈춘다.
 * 그래서 defaultProps 에는 가벼운 episodeKey 만 싣고 실제 스크립트는 번들에 이미 실린 episodes 에서 꺼낸다.
 * script 를 직접 넘기는 호출(외부 렌더 override)이 있으면 그쪽을 우선한다. (팩션과 같은 관례)
 */
export const Discourse: React.FC<{
  script?: DiscourseScript
  episodeKey?: string
  episodeName: string
  orientation?: Orientation
  shorts?: boolean
  part?: number
  lvPart?: number
}> = ({ script: scriptProp, episodeKey, episodeName, orientation = 'portrait', shorts, part, lvPart }) => {
  const resolved = scriptProp ?? (episodeKey ? episodes[episodeKey] : undefined)
  if (!resolved) throw new Error(`Discourse: 스크립트를 찾을 수 없다 (episodeKey=${episodeKey ?? '없음'})`)
  const script = resolved
  const frame = useCurrentFrame()
  const isEn = !!episodeKey?.endsWith('-en')
  const isShorts = shorts ?? (orientation === 'portrait')
  // 쇼츠만 편(part) 분할, 롱폼은 편 경계 기반 lvPart 분할.
  const activePart = isShorts ? part : undefined
  const activeLvPart = isShorts ? undefined : lvPart
  const cues = useMemo(() => buildCues(script, isShorts, activePart, activeLvPart), [script, isShorts, activePart, activeLvPart])
  const last = cues[cues.length - 1]
  const total = last ? last.start + last.duration : 0

  const clampLR = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

  // 헤더(영상 명칭)는 첫 프레임부터 떠 있다가 마지막 화면으로 넘어갈 때 함께 사라진다 — 끝엔 로고와 고지만 남는다.
  const outroCue = cues.find(tc => tc.cue.kind === 'outro')
  const headerFadeEnd = outroCue ? outroCue.start : total
  const headerOp = total > 0
    ? interpolate(frame, [headerFadeEnd - f(outroCue ? OUTRO_CROSSFADE_SEC : CROSSFADE_SEC), headerFadeEnd], [1, 0], clampLR)
    : 0
  const showHeader = orientation === 'portrait' && headerOp > 0

  // 헤더 강조색 — 지금 말하는 인물의 색을 따라가되, 인물이 바뀌는 경계에서 직전 색과 부드럽게 섞는다(휙 바뀌지 않게).
  const headerAccent = (() => {
    const colorOf = (tc: TimedCue): string => {
      const c = tc.cue
      if (c.kind === 'cast') return castColor(script.cast[c.castIndex], c.castIndex)
      if (c.kind === 'turn') {
        const t = script.turns[c.turnIndex]
        return t ? castColor(script.cast[t.cast], t.cast) : DEFAULT_ACCENT
      }
      return DEFAULT_ACCENT
    }
    let idx = -1
    for (let i = 0; i < cues.length; i++) {
      if (frame >= cues[i].start && frame < cues[i].start + cues[i].duration) { idx = i; break }
    }
    if (idx < 0) return DEFAULT_ACCENT
    const cur = colorOf(cues[idx])
    const prev = idx > 0 ? colorOf(cues[idx - 1]) : cur
    const cfA = f(CROSSFADE_SEC)
    if (prev !== cur && frame < cues[idx].start + cfA) {
      const t = interpolate(frame, [cues[idx].start, cues[idx].start + cfA], [0, 1], clampLR)
      return interpolateColors(t, [0, 1], [prev, cur])
    }
    return cur
  })()

  // 시작 페이드인(검정→화면) · 끝 페이드아웃(화면→검정)
  const endFadeF = f(endFadeSecOf(script))
  const FADE_SEC = 0.7
  const fadeOp = total > 0
    ? interpolate(frame, [0, f(FADE_SEC), total - endFadeF, total], [1, 0, 0, 1], clampLR)
    : 0

  // 고지 — 데이터에 없으면 기본 문구로 폴백한다. 빈 문자열이 돌아오지 않는다.
  const notice = resolveNotice(script, isEn)

  const titleCap = (activePart != null && script.titleByPart?.[activePart])
    || (activeLvPart != null && script.titleByLvPart?.[activeLvPart])
    || script.title

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <DiscourseBgm script={script} total={total} isShorts={isShorts} part={activePart} lvPart={activeLvPart} />
      {/* 시작 효과음 — 시작 화면과 같이 켜지고 같은 구간에서 같이 꺼진다 */}
      {script.startSfx && (() => {
        const introSec = script.introSec ?? INTRO_SEC
        const out0 = f(Math.max(0, introSec - INTRO_FADE_OUT_SEC))
        const out1 = Math.max(out0 + 1, f(introSec))
        return (
          <Sequence from={0} durationInFrames={f(introSec)}>
            <Audio src={staticFile(`common/sfx/${script.startSfx}`)} volume={fr => interpolate(fr, [out0, out1], [0.7, 0], clampLR)} />
          </Sequence>
        )
      })()}
      {cues.map((tc, i) => (
        <CueLayer key={i} tc={tc} script={script} episodeName={episodeName} frame={frame} isEn={isEn} part={activePart} lvPart={activeLvPart} />
      ))}
      {showHeader && <TopHeader caption={titleCap} opacity={headerOp} accent={headerAccent} />}
      {/* 하단 검정 띠 — 상단 헤더와 같은 규격. 본문 컷은 이 위에서 끝나고 여기엔 고지만 앉는다. */}
      {orientation === 'portrait' && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: SAFE_BOTTOM, background: BG, zIndex: 50 }} />
      )}
      {/*
        상시 고지 소자막 — **기능 요건이다.**
        실존 인물에게 하지 않은 말을 시키는 시리즈라 오해 방지가 화면의 의무다(§3 고지 원칙 2번째 겹).
        어떤 컷·어떤 편·어떤 언어에서도 빠지지 않도록 컷 바깥 최상위에 고정하고 조건을 걸지 않는다.
        지우거나 조건부로 감싸지 말 것 — 인트로 카드·아웃트로와 함께 3중 방어의 가운데 겹이다.
      */}
      <div style={{
        position: 'absolute', bottom: 42, left: CONTENT_PAD, right: CONTENT_PAD,
        zIndex: 200, pointerEvents: 'none',
        color: '#ffffff', opacity: NOTICE_OPACITY,
        fontFamily: FONT, fontSize: NOTICE_FONT_SIZE, fontWeight: 600,
        lineHeight: 1.4, textAlign: 'center', wordBreak: 'keep-all',
        textShadow: '0 1px 6px rgba(0,0,0,0.95), 0 0 14px rgba(0,0,0,0.8)',
      }}>{notice}</div>
      {/* 시작·끝 검정 페이드 — 모든 컷·헤더·고지 위에 덮는다 */}
      {fadeOp > 0 && <AbsoluteFill style={{ background: BG, opacity: fadeOp, zIndex: 999, pointerEvents: 'none' }} />}
    </AbsoluteFill>
  )
}
