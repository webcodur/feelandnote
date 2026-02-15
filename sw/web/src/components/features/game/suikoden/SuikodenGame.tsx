'use client'

import { useState, useCallback, useEffect } from 'react'
import type { GameState, GameCharacter, GameItem, GamePhase } from '@/lib/game/suikoden/types'
import { initGame } from '@/lib/game/suikoden/engine'
import { preloadAssets } from '@/lib/game/suikoden/assetManager'
import TitleScreen from './TitleScreen'
import SetupScreen from './SetupScreen'
import StrategyScreen from './StrategyScreen'
import BattleScreen from './BattleScreen'
import ResultScreen from './ResultScreen'

interface Props {
  characters: GameCharacter[]
  items: GameItem[]
}

/** phase를 gameState.phase로 일원화. title/setup은 gameState 없이 별도 관리 */
type PreGamePhase = 'title' | 'setup'

export default function SuikodenGame({ characters, items }: Props) {
  const [prePhase, setPrePhase] = useState<PreGamePhase | null>('title')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [assetsLoaded, setAssetsLoaded] = useState(false)

  useEffect(() => {
    preloadAssets(characters).then(() => setAssetsLoaded(true))
  }, [characters])

  const handleStart = useCallback(() => setPrePhase('setup'), [])

  const handleSetupComplete = useCallback((leaderId: string, difficulty: 'easy' | 'normal' | 'hard') => {
    const state = initGame(characters, leaderId, difficulty)
    state.allItems = items
    setGameState(state)
    setPrePhase(null) // 프리게임 종료 → gameState.phase가 'strategy'
  }, [characters, items])

  const handleRestart = useCallback(() => {
    setGameState(null)
    setPrePhase('title')
  }, [])

  // gameState 업데이트 (모든 화면에서 공용)
  const updateState = useCallback((fn: (s: GameState) => GameState) => {
    setGameState(prev => prev ? fn(prev) : prev)
  }, [])

  // ── 프리게임 (title / setup) ──
  if (prePhase !== null) {
    if (!assetsLoaded && prePhase === 'title') {
      return (
        <div className="flex items-center justify-center min-h-[60vh] text-stone-400">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">⚔️</div>
            <p>데이터 로딩 중...</p>
            <p className="text-sm text-stone-500 mt-2">{characters.length}명의 인물</p>
          </div>
        </div>
      )
    }
    if (prePhase === 'title') return <TitleScreen characterCount={characters.length} onStart={handleStart} />
    if (prePhase === 'setup') return <SetupScreen characters={characters} onComplete={handleSetupComplete} onBack={() => setPrePhase('title')} />
  }

  // ── 인게임: gameState.phase로 분기 ──
  if (!gameState) return null
  const phase = gameState.phase

  switch (phase) {
    case 'strategy':
      return <StrategyScreen state={gameState} onUpdateState={updateState} />
    case 'battle':
      return gameState.battle ? (
        <BattleScreen
          state={gameState}
          onUpdateState={updateState}
        />
      ) : null
    case 'result':
      return <ResultScreen state={gameState} onRestart={handleRestart} />
    default:
      return <StrategyScreen state={gameState} onUpdateState={updateState} />
  }
}
