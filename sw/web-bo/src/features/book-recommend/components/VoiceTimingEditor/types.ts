import React from 'react'

export type Timing = { start: number; end: number; text?: string; sub?: string[]; subTimings?: number[] }

export type Props = {
  audioUrl: string
  duration: number
  sentences: string[]
  timings: Timing[]
  onChange: (timings: Timing[]) => void
  /** 토막 텍스트 변경 시 부모에 전파 */
  onSegmentsChange?: (segments: string[]) => void
  /** 부모가 현재 토막를 읽을 수 있도록 ref 연결 */
  segmentsRef?: React.MutableRefObject<string[]>
}
