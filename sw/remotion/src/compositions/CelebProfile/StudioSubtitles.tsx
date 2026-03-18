/**
 * CelebProfile 스튜디오 전용 자막 — DEV에서만 표시
 */
import React from 'react'
import { Subtitles, type Sub } from '../BookRecommend/studio/Subtitles'
import { toAudioFrames } from '../BookRecommend/timing'
import type { CelebProfileScript, StatEntry, DispositionEntry, InfluenceAxis } from './types'

interface Props {
  script: CelebProfileScript
  /** 타임라인 — CelebProfile.tsx와 동일한 시작 프레임 맵 */
  timeline: {
    seriesIntroStart: number
    introStart: number
    bioToPersonaStart: number
    abilityStarts: number[]
    abToVirtStart: number
    virtueStarts: number[]
    virtToDispStart: number
    dispStarts: number[]
    rationaleStart: number
    pToInfStart: number
    infStarts: number[]
    transStart: number
    totalStart: number
    bridgeStart: number
  }
}

function sub(start: number, dur: number | undefined, speaker: string, text: string): Sub | null {
  if (!dur || !text) return null
  return { start, end: start + toAudioFrames(dur), speaker, text }
}

export const ProfileStudioSubtitles: React.FC<Props> = ({ script, timeline: tl }) => {
  const { narrator: n, persona: p, influence: inf, host } = script
  const subs: Sub[] = []

  const push = (s: Sub | null) => { if (s) subs.push(s) }

  // 나레이터 파트
  push(sub(tl.seriesIntroStart, n.seriesIntroDuration, '나레이터', n.seriesIntro))
  push(sub(tl.introStart, n.introDuration, '나레이터', n.intro))
  push(sub(tl.bioToPersonaStart, n.bioToPersonaDuration, '나레이터', n.bioToPersona))

  // 능력
  const abilityEntries = Object.entries(p.abilities) as [string, StatEntry][]
  abilityEntries.forEach(([, e], i) => {
    push(sub(tl.abilityStarts[i], e.duration, '나레이터', e.reason))
  })

  push(sub(tl.abToVirtStart, n.abilitiesToVirtuesDuration, '나레이터', n.abilitiesToVirtues))

  // 덕목
  const allVirtues = [
    ...Object.entries(p.innerVirtues),
    ...Object.entries(p.outerVirtues),
  ] as [string, StatEntry][]
  allVirtues.forEach(([, e], i) => {
    push(sub(tl.virtueStarts[i], e.duration, '나레이터', e.reason))
  })

  push(sub(tl.virtToDispStart, n.virtuesToDispositionsDuration, '나레이터', n.virtuesToDispositions))

  // 성향
  const dispEntries = Object.entries(p.dispositions) as [string, DispositionEntry][]
  dispEntries.forEach(([, e], i) => {
    push(sub(tl.dispStarts[i], e.duration, '나레이터', e.reason))
  })

  // Rationale
  push(sub(tl.rationaleStart, p.rationaleDuration, '나레이터', p.rationale))

  // Influence 전환
  push(sub(tl.pToInfStart, n.personaToInfluenceDuration, '나레이터', n.personaToInfluence))

  // 영향력 축
  const infEntries = Object.entries(inf.axes) as [string, InfluenceAxis][]
  infEntries.forEach(([, a], i) => {
    push(sub(tl.infStarts[i], a.duration, '나레이터', a.exp))
  })

  // 통시성 + 종합
  push(sub(tl.transStart, inf.transhistoricity.duration, '나레이터', inf.transhistoricity.exp))
  push(sub(tl.totalStart, n.totalScoreLineDuration, '나레이터', n.totalScoreLine))

  // Bridge
  push(sub(tl.bridgeStart, n.bridgeDuration, '나레이터', n.bridge))

  return <Subtitles subs={subs} />
}
