import React from 'react'
import { interpolate, Easing } from 'remotion'
import type { FactionScript, Orientation } from '../types'
import { CROSSFADE_SEC, personQuoteEndSec, f, type TimedCue } from '../timing'
import { HEADER_H, SAFE_BOTTOM } from '../constants'
import { clustersOf, personCutKind } from '../utils'
import { CutEnter, transitionEnterSec, isSlideKind, slideDir } from '../transitions'
import { vnPersonQuote, vnTimingKey } from '../voice-names'
import { IntroCard } from './IntroCard'
import { GroupCard, ClusterCard } from './GroupCard'
import { PersonCard } from './PersonCard'

export const CueLayer: React.FC<{ tc: TimedCue; script: FactionScript; episodeName: string; frame: number; orientation: Orientation; part?: number; nextCutKind?: string | null; isLast?: boolean; isShorts?: boolean }> = ({ tc, script, episodeName, frame, orientation, part, nextCutKind, isLast, isShorts = false }) => {
  const { start, duration, cue } = tc
  const end = start + duration
  const cf = f(CROSSFADE_SEC)
  const clampLR = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

  // 자기 컷 전환(진입 효과) 종류 — 세로 쇼츠 인물 컷만.
  const cutKind = personCutKind(script, cue, orientation)

  let content: React.ReactNode = null
  if (cue.kind === 'intro' || cue.kind === 'outro') content = <IntroCard script={script} episodeName={episodeName} orientation={orientation} part={part} isOutro={cue.kind === 'outro'} />
  else if (cue.kind === 'group') content = <GroupCard episodeName={episodeName} group={script.groups[cue.groupIndex]} frame={frame} cueStart={start} orientation={orientation} />
  else if (cue.kind === 'cluster') {
    const g = script.groups[cue.groupIndex]
    content = <ClusterCard episodeName={episodeName} group={g} cluster={clustersOf(g)[cue.clusterIndex]} frame={frame} cueStart={start} orientation={orientation} />
  } else if (cue.kind === 'person') {
    const g = script.groups[cue.groupIndex]
    const person = cue.clusterIndex != null
      ? clustersOf(g)[cue.clusterIndex].people[cue.personIndex]
      : g.people[cue.personIndex]
    const stem = vnTimingKey(vnPersonQuote(cue.groupIndex, cue.personIndex, cue.clusterIndex))
    // 마지막 인물 컷이면 대사 끝 시점부터 줌인을 멈추고 종료 꼬리 동안 정지시킨다.
    const zoomFreezeSec = isLast ? personQuoteEndSec(person, cue.quoteMode) : undefined
    content = <PersonCard episodeName={episodeName} group={g} person={person} frame={frame} cueStart={start} cueDuration={end - start} orientation={orientation} groupIndex={cue.groupIndex} personIndex={cue.personIndex} clusterIndex={cue.clusterIndex} transition={script.transition} quoteMode={cue.quoteMode} voiceTiming={script.voiceTimings?.[stem]} zoomFreezeSec={zoomFreezeSec} isShorts={isShorts} />
  }

  // 진입: 자기 컷 전환이면 이전 컷 끝보다 앞당겨 시작(이전 인물 위로). 아니면 크로스페이드.
  const enterSec = cutKind ? transitionEnterSec(cutKind) : CROSSFADE_SEC
  const enterStart = start - f(enterSec)
  // 종료: 다음 컷이 슬라이드면 이 컷도 함께 그 방향으로 밀려난다(두 인물 동시 슬라이드).
  const nextSlide = isSlideKind(nextCutKind)
  const exitStart = nextSlide ? end - f(transitionEnterSec(nextCutKind!)) : end
  if (frame < enterStart || frame > end + cf) return null

  // ── 슬라이드 transform(두 컷이 함께 미끄러짐) ──
  let slideX = 0
  const selfSlide = isSlideKind(cutKind)
  if (selfSlide && frame < start) {
    const p = interpolate(frame, [enterStart, start], [0, 1], { ...clampLR, easing: Easing.out(Easing.cubic) })
    // slideLeft(dir -1): 다음은 오른쪽(+100)에서 옴 / slideRight(dir +1): 왼쪽(-100)에서
    const fromX = slideDir(cutKind) === 1 ? -100 : 100
    slideX = fromX * (1 - p)
  }
  if (nextSlide && frame >= exitStart) {
    const p = interpolate(frame, [exitStart, end], [0, 1], { ...clampLR, easing: Easing.out(Easing.cubic) })
    // slideLeft: 화면이 왼쪽으로 흐름 → 이 컷은 왼쪽(-100)으로 / slideRight: 오른쪽(+100)
    const toX = slideDir(nextCutKind) === 1 ? 100 : -100
    slideX = toX * p
  }

  // 불투명도 — 컷 전환/슬라이드는 효과·이동이 담당(불투명 유지), 그 외는 크로스페이드.
  const fadeIn = cutKind ? 1 : interpolate(frame, [start - cf, start], [0, 1], clampLR)
  const fadeOut = nextSlide ? 1 : interpolate(frame, [end, end + cf], [1, 0], clampLR)
  const opacity = Math.min(fadeIn, fadeOut)

  // 세로: 모든 컷(인트로·아웃트로 포함)을 상·하단 블랙바 사이(MID)에 그려 위아래 잘림을 통일한다.
  const useHeader = orientation === 'portrait'

  // 슬라이드는 transform(이동)으로만 — A·B 원본은 흐리지 않는다(선명 유지).
  // 두 컷 경계의 완충(ab) 블러 띠는 화면 좌표에서 단일 레이어로 MAIN이 따로 얹는다.
  const enterProgress = cutKind ? interpolate(frame, [enterStart, start], [0, 1], clampLR) : 1
  const useCutEnter = cutKind != null && !selfSlide
  const wrapped = useCutEnter ? <CutEnter kind={cutKind!} progress={enterProgress} frame={frame}>{content}</CutEnter> : content
  const wrapStyle: React.CSSProperties = {
    position: 'absolute',
    ...(useHeader ? { top: HEADER_H, left: 0, right: 0, bottom: SAFE_BOTTOM } : { inset: 0 }),
    overflow: 'hidden',
    opacity,
    transform: slideX !== 0 ? `translateX(${slideX}%)` : undefined,
  }
  return <div style={wrapStyle}>{wrapped}</div>
}
