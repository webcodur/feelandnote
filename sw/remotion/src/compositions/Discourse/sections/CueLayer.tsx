import React from 'react'
import { AbsoluteFill, interpolate } from 'remotion'
import type { DiscourseScript } from '../types'
import { CROSSFADE_SEC, OUTRO_CROSSFADE_SEC, f, type TimedCue } from '../timing'
import { HEADER_H, SAFE_BOTTOM } from '../constants'
import { resolveHoldMotion, castColor } from '../utils'
import { vnTurn, vnTimingKey } from '../voice-names'
import { IntroCard } from './IntroCard'
import { CastCard } from './CastCard'
import { TurnCard } from './TurnCard'
import { EraCard } from './EraCard'
import { OutroCard } from './OutroCard'

/**
 * 컷 한 장 — 종류별로 카드를 골라 그리고, 앞뒤 컷과 크로스페이드로 잇는다.
 *
 * 컷 배치·길이는 timing.ts(buildCues)가 정한다. 여기는 그 배치를 화면에 옮기기만 한다.
 * 진입 전환(난입·글리치 등)은 아직 넣지 않았다 — 전 컷 크로스페이드 한 가지로 통일한다.
 */
export const CueLayer: React.FC<{
  tc: TimedCue
  script: DiscourseScript
  episodeName: string
  frame: number
  isEn: boolean
  part?: number
  lvPart?: number
}> = ({ tc, script, episodeName, frame, isEn, part, lvPart }) => {
  const { start, duration, cue } = tc
  const end = start + duration
  // 마지막 화면 진입만 더 완만하게 — 여운을 끊지 않는다.
  const crossSec = cue.kind === 'outro' ? OUTRO_CROSSFADE_SEC : CROSSFADE_SEC
  const cf = f(crossSec)

  // 화면 밖 컷은 내용을 만들기 전에 즉시 끊는다 — 매 프레임 전체 컷을 도므로 여기서 잘라야 싸다.
  if (frame < start - cf || frame > end + cf) return null

  let content: React.ReactNode = null
  if (cue.kind === 'intro') {
    content = <IntroCard script={script} episodeName={episodeName} isEn={isEn} part={part} lvPart={lvPart} />
  } else if (cue.kind === 'outro') {
    // 종료 화면 영상은 크로스페이드가 시작되는 시점부터 존재해야 교차가 보인다.
    content = <OutroCard script={script} episodeName={episodeName} isEn={isEn} startFrame={start - cf} />
  } else if (cue.kind === 'era') {
    content = <EraCard label={cue.label} />
  } else if (cue.kind === 'cast') {
    const speaker = script.cast[cue.castIndex]
    if (!speaker) return null
    content = (
      <CastCard
        episodeName={episodeName}
        speaker={speaker}
        color={castColor(speaker, cue.castIndex)}
        frame={frame}
        cueStart={start}
        cueDuration={duration}
        hold={resolveHoldMotion(undefined, speaker, script)}
      />
    )
  } else if (cue.kind === 'turn') {
    const turn = script.turns[cue.turnIndex]
    const speaker = turn ? script.cast[turn.cast] : undefined
    if (!turn || !speaker) return null
    // 발화 시각 조회 키 = 음원 파일 stem. 음원 이름 규칙(voice-names)과 한 몸이라 어긋날 수 없다.
    const stem = vnTimingKey(vnTurn(cue.turnIndex, speaker.slug))
    content = (
      <TurnCard
        episodeName={episodeName}
        script={script}
        turn={turn}
        turnIndex={cue.turnIndex}
        speaker={speaker}
        color={castColor(speaker, turn.cast)}
        frame={frame}
        cueStart={start}
        cueDuration={duration}
        voiceTiming={script.voiceTimings?.[stem]}
        hold={resolveHoldMotion(turn, speaker, script)}
        isEn={isEn}
      />
    )
  }

  const clampLR = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
  const fadeIn = interpolate(frame, [start - cf, start], [0, 1], clampLR)
  const fadeOut = interpolate(frame, [end, end + cf], [1, 0], clampLR)
  const opacity = Math.min(fadeIn, fadeOut)

  // 본문 컷은 상·하단 검정 띠 사이에만 그린다 — 위아래 잘림을 전 컷에서 통일하고,
  // 하단 띠는 상시 고지 소자막이 앉을 자리로 비워 둔다.
  return (
    <div style={{
      position: 'absolute', top: HEADER_H, left: 0, right: 0, bottom: SAFE_BOTTOM,
      overflow: 'hidden', opacity,
    }}>
      <AbsoluteFill>{content}</AbsoluteFill>
    </div>
  )
}
