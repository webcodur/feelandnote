import React, { useMemo } from 'react'
import {
  AbsoluteFill, Audio, Img,
  interpolate, useCurrentFrame, staticFile,
} from 'remotion'
import type { FactionScript, FactionGroup, FactionPerson } from './types'
import { buildCues, CROSSFADE_SEC, PERSON_SEC, f, type TimedCue } from './timing'

const FONT = "'Pretendard Variable', 'Pretendard', sans-serif"
const BG = '#0a0a0f'
const FG = '#f5f2ea'
const DEFAULT_ACCENT = '#d4a828'

/** 인물·로고 이미지 경로. 외부 URL은 그대로, basename은 에피소드 폴더 하위 images/ 에서 찾는다. */
const imgSrc = (episodeName: string, image: string) =>
  /^https?:\/\//.test(image) ? image : staticFile(`factions/${episodeName}/images/${image}`)

/** 이름 → 이니셜(이미지 없는 인물 플레이스홀더) */
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')
}

/* ═══════════════ 컷 화면들 ═══════════════ */

const IntroCard: React.FC<{ script: FactionScript }> = ({ script }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 28 }}>
    {script.subtitle && (
      <div style={{ color: DEFAULT_ACCENT, fontFamily: FONT, fontSize: 44, fontWeight: 600, letterSpacing: 8 }}>
        {script.subtitle}
      </div>
    )}
    <div style={{ color: FG, fontFamily: FONT, fontSize: 96, fontWeight: 800, letterSpacing: 2, textAlign: 'center', padding: '0 80px', lineHeight: 1.2 }}>
      {script.title}
    </div>
  </AbsoluteFill>
)

const GroupCard: React.FC<{ episodeName: string; group: FactionGroup }> = ({ episodeName, group }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 36 }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 45% at 50% 50%, ${accent}26 0%, transparent 70%)` }} />
      {group.logo && (
        <Img src={imgSrc(episodeName, group.logo)} style={{ width: 220, height: 220, objectFit: 'contain' }} />
      )}
      <div style={{ width: 64, height: 6, background: accent, borderRadius: 3 }} />
      <div style={{ color: FG, fontFamily: FONT, fontSize: 120, fontWeight: 800, letterSpacing: 1, textAlign: 'center', padding: '0 60px' }}>
        {group.name}
      </div>
      {group.tagline && (
        <div style={{ color: `${FG}b0`, fontFamily: FONT, fontSize: 46, fontWeight: 400, letterSpacing: 4 }}>
          {group.tagline}
        </div>
      )}
    </AbsoluteFill>
  )
}

const PersonCard: React.FC<{ episodeName: string; group: FactionGroup; person: FactionPerson; frame: number; cueStart: number }> = ({ episodeName, group, person, frame, cueStart }) => {
  const accent = group.color ?? DEFAULT_ACCENT
  // 이미지 켄번스 줌
  const scale = interpolate(frame - cueStart, [0, f(PERSON_SEC)], [1.0, 1.08], { extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <AbsoluteFill style={{ background: `linear-gradient(160deg, ${accent}18 0%, ${BG} 60%)` }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
        <div style={{
          width: 460, height: 460, borderRadius: '50%', overflow: 'hidden',
          border: `8px solid ${accent}`, boxShadow: `0 0 80px ${accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `#1a1a22`,
        }}>
          {person.image ? (
            <Img src={imgSrc(episodeName, person.image)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }} />
          ) : (
            <span style={{ color: accent, fontFamily: FONT, fontSize: 180, fontWeight: 800 }}>{initials(person.name)}</span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ color: accent, fontFamily: FONT, fontSize: 36, fontWeight: 600, letterSpacing: 4 }}>
            {person.org ?? group.name}
          </div>
          <div style={{ color: FG, fontFamily: FONT, fontSize: 84, fontWeight: 800, letterSpacing: 1 }}>
            {person.name}
          </div>
          {person.role && (
            <div style={{ color: `${FG}aa`, fontFamily: FONT, fontSize: 44, fontWeight: 400 }}>
              {person.role}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  )
}

const OutroCard: React.FC = () => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
    <div style={{ fontSize: 92, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif", letterSpacing: 12, display: 'flex', gap: 8 }}>
      <span style={{ color: FG }}>FEEL</span>
      <span style={{ color: DEFAULT_ACCENT }}>&</span>
      <span style={{ color: FG }}>NOTE</span>
    </div>
    <div style={{ width: 240, height: 1, backgroundColor: DEFAULT_ACCENT, opacity: 0.5 }} />
    <div style={{ fontSize: 40, fontFamily: FONT, color: '#999', letterSpacing: 4 }}>feelandnote.com</div>
  </AbsoluteFill>
)

/* ═══════════════ 컷 레이어 (크로스페이드) ═══════════════ */

const CueLayer: React.FC<{ tc: TimedCue; script: FactionScript; episodeName: string; frame: number }> = ({ tc, script, episodeName, frame }) => {
  const { start, duration, cue } = tc
  const end = start + duration
  const cf = f(CROSSFADE_SEC)
  // 활성 범위 밖이면 렌더 생략
  if (frame < start - cf || frame > end + cf) return null
  const opacity = interpolate(
    frame,
    [start - cf, start, end, end + cf],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  )

  let content: React.ReactNode = null
  if (cue.kind === 'intro') content = <IntroCard script={script} />
  else if (cue.kind === 'group') content = <GroupCard episodeName={episodeName} group={script.groups[cue.groupIndex]} />
  else if (cue.kind === 'person') {
    const g = script.groups[cue.groupIndex]
    content = <PersonCard episodeName={episodeName} group={g} person={g.people[cue.personIndex]} frame={frame} cueStart={start} />
  } else if (cue.kind === 'outro') content = <OutroCard />

  return <AbsoluteFill style={{ opacity }}>{content}</AbsoluteFill>
}

/* ═══════════════ MAIN ═══════════════ */

export const Faction: React.FC<{ script: FactionScript; episodeName: string }> = ({ script, episodeName }) => {
  const frame = useCurrentFrame()
  const cues = useMemo(() => buildCues(script), [script])
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {script.music && <Audio src={staticFile(`music/${script.music}`)} />}
      {cues.map((tc, i) => (
        <CueLayer key={i} tc={tc} script={script} episodeName={episodeName} frame={frame} />
      ))}
    </AbsoluteFill>
  )
}
