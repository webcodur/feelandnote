import React from 'react'
import { AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { ShortCaption } from '../../components/caption/ShortCaption'
import { DARK } from '../theme'
import { FONT } from '../BookRecommend/fonts'
import {
  CONTENT_PAD, FPS, HEADER_H, MID_H, SAFE_BOTTOM, W,
  CL, beatSec, bookPersonImageRel, buildBeats,
  type BookPersonBeat, type BookPersonScript,
} from './types'

export { FPS, calcBookPersonFrames } from './types'

type Props = { script: BookPersonScript; episodeName: string }

const fade = (frame: number, start: number, dur: number) => {
  const rise = Math.round(0.3 * FPS)
  if (frame < start || frame >= start + dur) return 0
  if (frame < start + rise) return (frame - start) / rise
  if (frame >= start + dur - rise) return (start + dur - frame) / rise
  return 1
}

const imageOf = (script: BookPersonScript, beats: BookPersonBeat[], i: number) => {
  for (let j = i; j >= 0; j--) {
    if (beats[j].image) return beats[j].image ?? null
  }
  return script.bg ?? null
}

export const BookPersonShort: React.FC<Props> = ({ script, episodeName }) => {
  const frame = useCurrentFrame()
  const title = script.title ?? '책과 사람'
  const beats = buildBeats(script)
  const frames = beats.map(beat => Math.round(beatSec(beat) * FPS))
  const starts = frames.reduce<number[]>((acc, _, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + frames[i - 1])
    return acc
  }, [])
  const current = beats.findIndex((_, i) => frame >= starts[i] && frame < starts[i] + frames[i])
  const headerSub = (current >= 0 ? beats[current].bookTitle : null) ?? script.role ?? ''

  return (
    <AbsoluteFill style={{ backgroundColor: DARK.base }}>
      {beats.map((beat, i) => {
        const img = imageOf(script, beats, i)
        const op = fade(frame, starts[i], frames[i])
        if (op <= 0 || !img) return null
        const scale = interpolate(frame, [starts[i], starts[i] + frames[i]], [1, 1.06], CL)
        return (
          <div key={`bg-${beat.id}`} style={{
            position: 'absolute', top: HEADER_H, left: 0, width: W, height: MID_H,
            overflow: 'hidden', opacity: op, zIndex: 1,
          }}>
            <Img
              src={staticFile(bookPersonImageRel(episodeName, img) ?? img)}
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: `scale(${scale})`,
                filter: 'brightness(0.38) saturate(0.55)',
              }}
            />
          </div>
        )
      })}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H, background: DARK.surface, zIndex: 10 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: SAFE_BOTTOM, background: DARK.surface, zIndex: 10 }} />

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 80px', zIndex: 20,
      }}>
        <div style={{
          fontSize: 48, color: '#c8a46e', fontFamily: FONT.hahmlet, fontWeight: 700,
          letterSpacing: 6, marginBottom: 16,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 72, fontFamily: FONT.doHyeon, color: '#e8e0d0', lineHeight: 1.05,
          textAlign: 'center', wordBreak: 'keep-all',
        }}>
          {script.person}
        </div>
        {headerSub ? (
          <div style={{
            marginTop: 10, fontSize: 28, fontFamily: FONT.sans, color: 'rgba(232,224,208,0.72)',
            letterSpacing: 1,
          }}>
            {headerSub}
          </div>
        ) : null}
      </div>

      {beats.map((beat, i) => {
        if (!beat.voice) return null
        return (
          <Sequence key={`vo-${beat.id}`} from={starts[i]} durationInFrames={frames[i]}>
            <Audio src={staticFile(`book-person/${episodeName}/${beat.voice}`)} />
          </Sequence>
        )
      })}

      {beats.map((beat, i) => {
        const op = fade(frame, starts[i], frames[i])
        if (op <= 0) return null
        if (beat.kind === 'lead') {
          return (
            <div key={`lead-${beat.id}`} style={{
              position: 'absolute', top: HEADER_H, left: 0, width: W, height: MID_H,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 64px', zIndex: 15, opacity: op, textAlign: 'center',
            }}>
              <div style={{
                fontSize: 64, color: '#e8e0d0', fontFamily: FONT.serif, fontWeight: 700,
                lineHeight: 1.35, wordBreak: 'keep-all',
              }}>
                {beat.text}
              </div>
            </div>
          )
        }
        return (
          <div key={`cap-${beat.id}`} style={{
            position: 'absolute', bottom: SAFE_BOTTOM + 60, left: CONTENT_PAD, right: CONTENT_PAD,
            zIndex: 20, opacity: op, display: 'flex', justifyContent: 'center',
          }}>
            <ShortCaption
              text={beat.text}
              startFrame={starts[i]}
              spreadFrames={frames[i]}
              locale={script.locale ?? 'ko'}
            />
          </div>
        )
      })}
    </AbsoluteFill>
  )
}
