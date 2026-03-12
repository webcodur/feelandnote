import { AbsoluteFill, interpolate, useCurrentFrame, Sequence } from 'remotion'
import type { ScriptData } from './types'
import { Avatar } from './Avatar'
import { Subtitle } from './Subtitle'
import { QuoteCard } from './QuoteCard'

type Props = {
  script: ScriptData
}

/** 대사 하나당 프레임 수 (글자 수 비례) */
const getLineDuration = (text: string) => Math.max(90, Math.min(text.length * 3, 180))

/** 인트로 + 대담 + 아웃트로 전체 프레임 계산 */
export const calcTotalFrames = (script: ScriptData) => {
  const intro = 90
  const dialogueFrames = script.dialogue.reduce((sum, d) => sum + getLineDuration(d.text), 0)
  const quoteOutro = 180
  const ending = 90
  return intro + dialogueFrames + quoteOutro + ending
}

export const OneNightLibrary: React.FC<Props> = ({ script }) => {
  const frame = useCurrentFrame()

  // --- Intro: 타이틀 ---
  const introEnd = 90
  const titleOpacity = interpolate(frame, [0, 20, 70, 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // --- Dialogue 타이밍 계산 ---
  let cursor = introEnd
  const lineTimings = script.dialogue.map((d) => {
    const start = cursor
    const dur = getLineDuration(d.text)
    cursor += dur
    return { start, dur }
  })
  const dialogueEnd = cursor

  // --- 현재 발화자 ---
  let activeSpeaker: 'left' | 'right' | null = null
  for (let i = lineTimings.length - 1; i >= 0; i--) {
    const t = lineTimings[i]
    if (frame >= t.start && frame <= t.start + t.dur) {
      activeSpeaker = script.dialogue[i].speaker
      break
    }
  }

  // --- Quote outro ---
  const quoteStart = dialogueEnd
  const quoteEnd = quoteStart + 180

  // --- Ending ---
  const endingStart = quoteEnd
  const endingOpacity = interpolate(frame, [endingStart, endingStart + 20, endingStart + 70, endingStart + 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // --- Vignette ---
  const vignetteOpacity = interpolate(frame, [0, 30], [1, 0.6], { extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* 배경 그라디언트 */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, #1a1510 0%, #0a0a0a 70%)',
        }}
      />

      {/* 미세 격자 패턴 (서재 느낌) */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(200,164,110,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,164,110,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* 비네트 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
        }}
      />

      {/* Intro: 타이틀 */}
      {frame < introEnd && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: titleOpacity,
          }}
        >
          <div style={{ color: '#c8a46e', fontSize: 24, fontFamily: 'system-ui', letterSpacing: 8, marginBottom: 20 }}>
            {script.title}
          </div>
          <div style={{ color: '#e8e0d0', fontSize: 64, fontWeight: 700, fontFamily: 'system-ui' }}>
            {script.subtitle}
          </div>
          <div style={{ color: '#555', fontSize: 18, fontFamily: 'system-ui', marginTop: 24 }}>
            {script.left.nickname_en} × {script.right.nickname_en}
          </div>
        </AbsoluteFill>
      )}

      {/* 아바타: 대담 구간 + 아웃트로 */}
      {frame >= introEnd && frame < endingStart && (
        <div
          style={{
            position: 'absolute',
            top: 60,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            padding: '0 160px',
          }}
        >
          <Avatar celeb={script.left} side="left" active={activeSpeaker === 'left'} enterFrame={introEnd} />
          <Avatar celeb={script.right} side="right" active={activeSpeaker === 'right'} enterFrame={introEnd} />
        </div>
      )}

      {/* 대사 자막 */}
      {script.dialogue.map((line, i) => (
        <Subtitle
          key={i}
          line={line}
          startFrame={lineTimings[i].start}
          durationFrames={lineTimings[i].dur}
          speakerName={line.speaker === 'left' ? script.left.nickname : script.right.nickname}
        />
      ))}

      {/* Quote 아웃트로 */}
      {frame >= quoteStart && frame < quoteEnd && (
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 80 }}>
          <Sequence from={quoteStart} durationInFrames={90}>
            <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QuoteCard celeb={script.left} side="left" startFrame={0} />
            </AbsoluteFill>
          </Sequence>
          <Sequence from={quoteStart + 90} durationInFrames={90}>
            <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QuoteCard celeb={script.right} side="right" startFrame={0} />
            </AbsoluteFill>
          </Sequence>
        </AbsoluteFill>
      )}

      {/* Ending: 브랜딩 */}
      {frame >= endingStart && (
        <AbsoluteFill
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: endingOpacity,
          }}
        >
          <div style={{ color: '#c8a46e', fontSize: 36, fontWeight: 700, fontFamily: 'system-ui', letterSpacing: 4 }}>
            FEEL AND NOTE
          </div>
          <div style={{ color: '#666', fontSize: 18, fontFamily: 'system-ui', marginTop: 16 }}>
            기록은 감각이 된다
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  )
}
