/*
  파일명: contexts/GameAudioContext.tsx
  기능: 게임 오디오 컨텍스트
  책임: 게임 진입 시 오디오 컨트롤을 등록하여 FloatingMusicPlayer가 게임 모드로 전환할 수 있게 한다.
*/
'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { GameAudioControls } from '@/components/shared/GameAudioPlayer'

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
