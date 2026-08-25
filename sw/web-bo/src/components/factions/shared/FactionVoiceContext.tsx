'use client'

import { createContext, useContext } from 'react'
import type { FactionNarratorVoice } from '@/lib/faction-types'

/** voice/ 폴더 스캔 결과 한 건 — 파일명·길이 */
export interface FactionVoiceMeta {
  file: string
  size: number
  duration: number
}

export interface FactionVoiceCtx {
  /** 셀럽 프로필에 저장된 언어별 ElevenLabs 보이스. 편별 값이 없을 때 유효값으로 쓴다. */
  celebVoices: Record<string, { ko?: string; en?: string }>
  /** 파일명 → 메타. 존재 여부·길이 판정용 */
  byFile: Map<string, FactionVoiceMeta>
  /** 파일명 → 재생 URL */
  voiceUrl: (file: string) => string
  /** 이 파일(인물)만 재생성 트리거 */
  regenerate: (file: string) => void
  /** 현재 재생성 중인 파일명 (없으면 null) */
  regeneratingFile: string | null
  /** 음성 파일 목록 다시 읽기 — 미리듣기 저장 직후 존재·길이 갱신용 */
  reload?: () => void
  /** 현재 화면의 대본을 DB와 렌더용 JSON에 확정한다. 음원 저장과 배역 저장을 한 동작으로 묶는 데 쓴다. */
  save: () => Promise<boolean>
  /** 현재 에피소드 폴더명 — 인물 패널 preview·save 라우트용 */
  episodeName?: string
  /** 시리즈 id — preview·save 라우트용 */
  series?: string
  /** 장면의 나레이터 해설·제목·시작문구·챕터명·인물 수식어가 함께 상속하는 공용 목소리 */
  commonNarrationVoice?: FactionNarratorVoice
}

const Ctx = createContext<FactionVoiceCtx | null>(null)

export const FactionVoiceProvider = Ctx.Provider

export function useFactionVoice(): FactionVoiceCtx | null {
  return useContext(Ctx)
}
