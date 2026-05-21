import React from 'react'
import { Audio, interpolate, Sequence } from 'remotion'

const CL = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** 렌더 직전 단계의 SFX 큐 — 시간·페이드는 모두 프레임 단위. */
export interface SfxRenderItem {
  src: string
  startFrame: number
  volume: number
  /** null = 음원 끝까지 */
  durationFrames: number | null
  fadeInFrames: number
  fadeOutFrames: number
  key: string
}

/**
 * 효과음 레이어 — 쇼츠·롱폼 공용. 각 큐를 독립 Sequence·Audio로 배치하고
 * 페이드인/페이드아웃은 volume 함수로 프레임마다 보간한다.
 */
export const SfxAudioLayer: React.FC<{ items: SfxRenderItem[] }> = ({ items }) => {
  if (items.length === 0) return null
  return (
    <>
      {items.map(it => {
        const hasFadeIn = it.fadeInFrames > 0
        const hasFadeOut = it.fadeOutFrames > 0 && it.durationFrames != null
        const volProp = (hasFadeIn || hasFadeOut)
          ? (lf: number) => {
              let v = it.volume
              if (hasFadeIn && lf < it.fadeInFrames) {
                v *= interpolate(lf, [0, it.fadeInFrames], [0, 1], CL)
              }
              if (hasFadeOut) {
                const dur = it.durationFrames as number
                const fadeStart = dur - it.fadeOutFrames
                if (lf > fadeStart) {
                  v *= interpolate(lf, [fadeStart, dur], [1, 0], CL)
                }
              }
              return v
            }
          : it.volume
        return (
          <Sequence
            key={it.key}
            from={it.startFrame}
            durationInFrames={it.durationFrames ?? undefined}
          >
            <Audio src={it.src} volume={volProp} />
          </Sequence>
        )
      })}
    </>
  )
}
