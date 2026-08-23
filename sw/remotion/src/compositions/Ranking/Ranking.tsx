import React, { useMemo } from 'react'
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion'
import { CueCaption, PersonShot } from './RankingCuts'
import { episodes } from './script'
import { buildCues, rankedEntries } from './timing'
import type { RankingScript, TimedCue } from './types'

const BG = '#0a0a0f'
const FG = '#f5f2ea'
const ACCENT = '#d4a828'
const FONT = "'Pretendard Variable', 'Pretendard', sans-serif"

export const Ranking: React.FC<{ episodeKey?: string; episodeName: string }> = ({
  episodeKey,
  episodeName,
}) => {
  const script = episodeKey ? episodes[episodeKey] : undefined
  if (!script) throw new Error(`Ranking: 스크립트 없음 (${episodeKey ?? episodeName})`)
  const cues = useMemo(() => buildCues(script), [script])
  const last = cues[cues.length - 1]
  const total = last ? last.start + last.duration : 0

  return (
    <AbsoluteFill style={{ background: BG, fontFamily: FONT, color: FG }}>
      {script.music ? <RankingBgm music={script.music} volume={script.musicVolume} total={total} /> : null}
      {cues.map((timed, i) => (
        <Sequence key={`${timed.cue.kind}-${i}`} from={timed.start} durationInFrames={timed.duration}>
          <CueCard script={script} timed={timed} episodeName={episodeName} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}

const RankingBgm: React.FC<{ music: string; volume?: number; total: number }> = ({
  music,
  volume,
  total,
}) => {
  const frame = useCurrentFrame()
  const vol = volume == null ? 0.22 : Math.min(1, Math.max(0, volume))
  const fade = interpolate(frame, [Math.max(0, total - 90), total], [vol, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  return <Audio src={staticFile(music)} volume={fade} loop />
}

const CueCard: React.FC<{ script: RankingScript; timed: TimedCue; episodeName: string }> = ({
  script,
  timed,
  episodeName,
}) => {
  const frame = useCurrentFrame()
  const op = interpolate(frame, [0, 12, timed.duration - 10, timed.duration], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const { cue, text } = timed
  const person = cue.kind === 'explain'
    ? pickEntry(script, cue.categoryIndex, cue.entryIndex)
    : undefined

  if (cue.kind === 'explain' && person) {
    return (
      <AbsoluteFill style={{ opacity: op }}>
        <PersonShot
          episodeName={episodeName}
          entry={person}
          category={script.categories[cue.categoryIndex]?.name}
        />
        {text ? <CueCaption text={text} /> : null}
      </AbsoluteFill>
    )
  }

  const body = cue.kind === 'intro' ? (
    <>
      <p style={{ fontSize: 28, letterSpacing: 8, color: ACCENT, margin: 0 }}>RANKING</p>
      <h1 style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.15, margin: '28px 0 0', whiteSpace: 'pre-line' }}>
        {script.title}
      </h1>
    </>
  ) : cue.kind === 'category' ? (
    <h2 style={{ fontSize: 96, fontWeight: 800, letterSpacing: 6, margin: 0 }}>
      {script.categories[cue.categoryIndex]?.name}
    </h2>
  ) : (
    <p style={{ fontSize: 36, letterSpacing: 4, opacity: 0.7, margin: 0 }}>Feel&Note</p>
  )

  return (
    <AbsoluteFill style={{ opacity: op }}>
      <div
        style={{
          position: 'absolute',
          top: 320,
          left: 64,
          right: 64,
          bottom: 460,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        {body}
      </div>
      {text ? <CueCaption text={text} /> : null}
    </AbsoluteFill>
  )
}

function pickEntry(script: RankingScript, categoryIndex: number, entryIndex: number) {
  const category = script.categories[categoryIndex]
  return category ? rankedEntries(category)[entryIndex] : undefined
}
