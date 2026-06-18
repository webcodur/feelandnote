'use client'

import { createContext, useContext } from 'react'

/** voice/ 폴더 스캔 결과 한 건 — 파일명·길이 */
export interface FactionVoiceMeta {
  file: string
  size: number
  duration: number
}

export interface FactionVoiceCtx {
  /** 파일명 → 메타. 존재 여부·길이 판정용 */
  byFile: Map<string, FactionVoiceMeta>
  /** 파일명 → 재생 URL */
  voiceUrl: (file: string) => string
  /** 이 파일(인물)만 재생성 트리거 */
  regenerate: (file: string) => void
  /** 현재 재생성 중인 파일명 (없으면 null) */
  regeneratingFile: string | null
}

const Ctx = createContext<FactionVoiceCtx | null>(null)

export const FactionVoiceProvider = Ctx.Provider

export function useFactionVoice(): FactionVoiceCtx | null {
  return useContext(Ctx)
}
