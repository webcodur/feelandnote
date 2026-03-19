/**
 * SpeakingIndicator — 셀럽 발화 시 아바타에 표시하는 이퀄라이저 배지
 *
 * 부모 요소에 position: relative 필요.
 * 아바타 원형 우하단 가장자리에 배치된다.
 *
 * audioSrc 전달 시 실제 오디오 파형(visualizeAudio)을 반영.
 * audioSrc 없으면 sin wave 폴백.
 */
import React from 'react'
import { useCurrentFrame } from 'remotion'
import { useAudioData, visualizeAudio } from '@remotion/media-utils'
import { FPS } from '../timing'

interface Props {
  /** 배지 지름 (px) */
  size?: number
  /** 페이드 opacity (0~1) */
  opacity?: number
  /** 오디오 파일 URL (staticFile 경로) */
  audioSrc?: string | null
  /** 오디오 재생 시작 프레임 (컴포넌트 로컬 프레임 기준) */
  audioStartFrame?: number
}

const BAR_COUNT = 3

/** 실제 오디오 파형 기반 바 높이 */
const AudioBars: React.FC<{
  audioSrc: string
  audioStartFrame: number
  maxH: number
  barW: number
  gap: number
}> = ({ audioSrc, audioStartFrame, maxH, barW, gap }) => {
  const frame = useCurrentFrame()
  const audioData = useAudioData(audioSrc)

  const audioFrame = frame - audioStartFrame
  if (!audioData || audioFrame < 0) {
    return <FallbackBars frame={frame} maxH={maxH} barW={barW} gap={gap} />
  }

  const viz = visualizeAudio({
    fps: FPS,
    frame: audioFrame,
    audioData,
    numberOfSamples: 16,
  })

  // 전체 대역 평균 → 바 3개에 위상차 적용
  const avg = viz.reduce((sum, v) => sum + v, 0) / viz.length
  // sqrt로 작은 값 증폭 + 스케일 보정
  const amp = Math.min(1, Math.sqrt(avg) * 2.5)

  const bars = [0, 1, 2].map(i => {
    const offset = Math.sin(frame / 4 + i * 2.2) * 0.15
    return Math.max(0, Math.min(1, amp + offset))
  })

  return (
    <>
      {bars.map((a, i) => (
        <div key={i} style={{
          width: barW,
          height: Math.max(2, maxH * (0.1 + 0.9 * a)),
          borderRadius: barW / 2,
          backgroundColor: '#c8a46e',
        }} />
      ))}
    </>
  )
}

/** sin wave 폴백 바 */
const FallbackBars: React.FC<{
  frame: number
  maxH: number
  barW: number
  gap: number
}> = ({ frame, maxH, barW }) => (
  <>
    {Array.from({ length: BAR_COUNT }, (_, i) => {
      const phase = (i * Math.PI * 2) / BAR_COUNT
      const h = maxH * (0.3 + 0.7 * Math.abs(Math.sin(frame / 8 + phase)))
      return (
        <div key={i} style={{
          width: barW,
          height: h,
          borderRadius: barW / 2,
          backgroundColor: '#c8a46e',
        }} />
      )
    })}
  </>
)

export const SpeakingIndicator: React.FC<Props> = ({
  size = 36, opacity = 1, audioSrc, audioStartFrame = 0,
}) => {
  const frame = useCurrentFrame()
  if (opacity <= 0) return null

  const barW = Math.max(3, Math.round(size * 0.12))
  const maxH = size * 0.45
  const gap = Math.max(2, Math.round(size * 0.08))

  return (
    <div style={{
      position: 'absolute',
      bottom: '5%',
      right: '5%',
      width: size,
      height: size,
      borderRadius: '50%',
      backgroundColor: '#0a0a0a',
      border: '2px solid rgba(200,164,110,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap,
      opacity,
    }}>
      {audioSrc
        ? <AudioBars audioSrc={audioSrc} audioStartFrame={audioStartFrame} maxH={maxH} barW={barW} gap={gap} />
        : <FallbackBars frame={frame} maxH={maxH} barW={barW} gap={gap} />
      }
    </div>
  )
}
