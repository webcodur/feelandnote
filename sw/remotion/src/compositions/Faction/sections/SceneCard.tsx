import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import type { FactionScene } from '../types'
import { BG, DEFAULT_ACCENT, FG, FONT, FONT_SERIF, TEXT_PAINT } from '../constants'
import { f } from '../timing'
import { imgSrc } from '../utils'
import { FilledImage } from './FilledImage'

/**
 * 상황 화면 — 인물 등록·직함·대사·음성 없이 사건 하나를 짧게 통과한다.
 * media가 없더라도 편집 단계에서 바로 흐름을 확인할 수 있도록 텍스트 카드로 렌더한다.
 */
export const SceneCard: React.FC<{
  scene: FactionScene
  episodeName: string
  cueStart: number
  cueDuration: number
}> = ({ scene, episodeName, cueStart, cueDuration }) => {
  const frame = useCurrentFrame()
  const end = cueStart + cueDuration
  const opacity = Math.min(
    interpolate(frame, [cueStart + f(0.08), cueStart + f(0.45)], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    }),
    interpolate(frame, [end - f(0.7), end - f(0.12)], [1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    }),
  )
  const rise = interpolate(frame, [cueStart, cueStart + f(0.55)], [32, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const zoom = interpolate(frame, [cueStart, end], [1.01, 1.065], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const objPos = `${scene.mediaCrop?.x ?? 50}% ${scene.mediaCrop?.y ?? 50}%`

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {scene.media ? (
        <FilledImage
          src={imgSrc(episodeName, scene.media)}
          objPos={objPos}
          scale={(scene.mediaCrop?.scale ?? 1) * zoom}
          startFrame={cueStart}
          onError={() => {}}
        />
      ) : (
        <AbsoluteFill style={{
          background: 'radial-gradient(ellipse 90% 70% at 50% 44%, rgba(36,70,82,0.44) 0%, rgba(11,24,31,0.35) 42%, rgba(10,10,15,1) 82%)',
        }} />
      )}
      <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.04) 34%, rgba(0,0,0,0.82) 100%)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 88% 76% at 50% 45%, transparent 35%, rgba(0,0,0,0.6) 100%)' }} />
      <AbsoluteFill style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '0 90px 120px',
        opacity,
        transform: `translateY(${rise}px)`,
      }}>
        <div style={{ width: 86, height: 4, borderRadius: 99, background: DEFAULT_ACCENT, marginBottom: 30, boxShadow: '0 0 18px rgba(212,168,40,0.35)' }} />
        <div style={{
          color: FG,
          fontFamily: FONT_SERIF,
          fontWeight: 700,
          fontSize: 82,
          lineHeight: 1.18,
          letterSpacing: -1.5,
          textAlign: 'center',
          ...TEXT_PAINT,
        }}>
          {scene.title}
        </div>
        {scene.caption?.trim() && (
          <div style={{
            marginTop: 26,
            maxWidth: 1180,
            color: 'rgba(245,242,234,0.9)',
            fontFamily: FONT,
            fontWeight: 500,
            fontSize: 42,
            lineHeight: 1.5,
            letterSpacing: -0.5,
            textAlign: 'center',
            whiteSpace: 'pre-line',
            ...TEXT_PAINT,
          }}>
            {scene.caption}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
