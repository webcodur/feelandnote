/*
  파일명: contexts/GameAudioContext.tsx
  기능: 게임 오디오 컨텍스트
  책임: 게임 진입 시 오디오 컨트롤을 등록하여 FloatingMusicPlayer가 게임 모드로 전환할 수 있게 한다.
*/
'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode, type MutableRefObject } from 'react'
import { installDomAudioBridge } from '@/lib/audio-ducking'

/** 게임이 올려 두면 음악 재생기가 읽는 게임 오디오 조종 계약 */
export interface GameAudioControls {
  isPlaying: boolean
  volume: number
  currentTime: number
  duration: number
  togglePlay: () => void
  setVolume: (v: number) => void
  seek: (time: number) => void
  /** 오디오 엘리먼트 ref — 플레이어가 자체 폴링으로 currentTime을 읽는다 */
  bgmRef?: MutableRefObject<HTMLAudioElement | null>
  /** 플레이리스트 지원 */
  trackLabel?: string
  /** 지금 곡의 src — 음악 재생기 목록이 같은 곡을 찾아 상태를 맞춘다 */
  trackSrc?: string | null
  trackIndex?: number
  trackCount?: number
  nextTrack?: () => void
  prevTrack?: () => void
  /** src가 지금 플레이리스트에 있으면 그 곡을 재생하고 true를 돌린다 */
  playSrc?: (src: string) => boolean
}

interface GameAudioContextValue {
  controls: GameAudioControls | null
  register: (controls: GameAudioControls) => void
  unregister: () => void
}

const GameAudioContext = createContext<GameAudioContextValue>({
  controls: null,
  register: () => {},
  unregister: () => {},
})

export function GameAudioProvider({ children }: { children: ReactNode }) {
  const [controls, setControls] = useState<GameAudioControls | null>(null)
  const register = useCallback((c: GameAudioControls) => setControls(c), [])
  const unregister = useCallback(() => setControls(null), [])

  useEffect(() => { installDomAudioBridge() }, [])

  return (
    <GameAudioContext.Provider value={{ controls, register, unregister }}>
      {children}
    </GameAudioContext.Provider>
  )
}

export const useGameAudioContext = () => useContext(GameAudioContext)

/** 게임 래퍼에서 호출: 오디오 컨트롤을 등록/해제한다 */
export function useRegisterGameAudio(controls: GameAudioControls) {
  const { register, unregister } = useGameAudioContext()

  useEffect(() => {
    register(controls)
    return () => unregister()
  }, [controls, register, unregister])
}
