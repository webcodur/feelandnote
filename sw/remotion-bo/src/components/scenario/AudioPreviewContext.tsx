'use client'

import { createContext, useContext } from 'react'
import type { AudioPreviewCtl } from './useAudioPreview'

/**
 * useAudioPreview 결과를 트리 전체에 공유.
 *
 * ScenarioRow가 자신의 sectionKey에 해당하는 재생 상태(paused/currentTime/duration)와
 * 동작(togglePause/stop/seek)을 prop drilling 없이 읽도록 한다. 기존 playingKey/onTogglePlay
 * 경로는 호환을 위해 유지하되, 신규 필드 단위 컨트롤은 컨텍스트로 흡수한다.
 */
const AudioPreviewContext = createContext<AudioPreviewCtl | null>(null)

export const AudioPreviewProvider = AudioPreviewContext.Provider

export function useAudioPreviewCtx(): AudioPreviewCtl | null {
  return useContext(AudioPreviewContext)
}
