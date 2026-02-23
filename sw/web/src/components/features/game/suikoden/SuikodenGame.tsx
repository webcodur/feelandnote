'use client'

import { useState, useCallback, useEffect } from 'react'
import type { GameState, GameCharacter, GameItem, GamePhase, Era, DialogEntry } from '@/lib/game/suikoden/types'
import { initGame } from '@/lib/game/suikoden/engine'
import { preloadAssets } from '@/lib/game/suikoden/assetManager'
import TitleScreen from './TitleScreen'
import SetupScreen from './SetupScreen'
import WanderingScreen from './WanderingScreen'
import StrategyScreen from './StrategyScreen'
import BattleScreen from './BattleScreen'
import DispositionScreen from './DispositionScreen'
import ResultScreen from './ResultScreen'
import DialogSnackbar from './DialogSnackbar'

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
  const [dialogQueue, setDialogQueue] = useState<DialogEntry[]>([])

  const pushDialog = useCallback((entry: DialogEntry) => {
    setDialogQueue(prev => [...prev, entry])
  }, [])

  const dismissDialog = useCallback(() => {
    setDialogQueue(prev => prev.slice(1))
  }, [])

  const clearDialogs = useCallback(() => {
    setDialogQueue([])
  }, [])

  useEffect(() => {
    preloadAssets(characters).then(() => setAssetsLoaded(true))
  }, [characters])

  const handleStart = useCallback(() => setPrePhase('setup'), [])

  const handleSetupComplete = useCallback((leaderId: string, difficulty: 'easy' | 'normal' | 'hard', era: Era) => {
    const state = initGame(characters, leaderId, difficulty, era)
    state.allItems = items
    setGameState(state)
    setPrePhase(null) // 프리게임 종료 → gameState.phase가 'wandering'
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

  // ── 인게임: 메인 콘텐츠 + 오버레이 레이어 ──
  if (!gameState) return null
  const phase = gameState.phase

  return (
    <>
      {/* 메인 콘텐츠: 방랑 OR 전략 (둘 중 하나만) */}
      {phase === 'wandering' && <WanderingScreen state={gameState} onUpdateState={updateState} onDialog={pushDialog} onClearDialogs={clearDialogs} />}
      {(phase === 'strategy' || phase === 'battle' || phase === 'disposition' || phase === 'result') && (
        <StrategyScreen state={gameState} onUpdateState={updateState} onDialog={pushDialog} />
      )}

      {/* 오버레이: 전투 */}
      {phase === 'battle' && gameState.battle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-2xl mx-4 my-8">
            <BattleScreen state={gameState} onUpdateState={updateState} />
          </div>
        </div>
      )}

      {/* 오버레이: 포로 처분 */}
      {phase === 'disposition' && gameState.disposition && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-md mx-4 my-8">
            <DispositionScreen state={gameState} onUpdateState={updateState} />
          </div>
        </div>
      )}

      {/* 대화 스낵바 */}
      {gameState.settings && (
        <DialogSnackbar
          queue={dialogQueue}
          settings={gameState.settings}
          onDismiss={dismissDialog}
        />
      )}

      {/* 오버레이: 결과 */}
      {phase === 'result' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <ResultScreen state={gameState} onRestart={handleRestart} />
        </div>
      )}
    </>
  )
}
