/*
  파일명: components/features/game/suikoden/SuikodenGame.tsx
  기능: 천도 게임 메인 컴포넌트
  책임: GameShell의 Game 인터페이스를 구현. setup → wandering → strategy → battle → result 흐름 관리.
*/
'use client'

import { useState, useCallback, useEffect, type MutableRefObject } from 'react'
import type { GameState, GameCharacter, GameItem, Era, DialogEntry, WorldPreview } from '@/lib/game/suikoden/types'
import { initGame, previewWorld, finalizeGame } from '@/lib/game/suikoden/engine'
import { preloadAssets } from '@/lib/game/suikoden/assetManager'
import SetupScreen from './SetupScreen'
import WanderingScreen from './WanderingScreen'
import StrategyScreen from './StrategyScreen'
import BattleScreen from './BattleScreen'
import DispositionScreen from './DispositionScreen'
import ResultScreen from './ResultScreen'
import DialogSnackbar from './DialogSnackbar'

interface SuikodenGameProps {
  characters: GameCharacter[]
  items: GameItem[]
  onEnterFullScreen?: () => void
  onHomeRef?: MutableRefObject<(() => void) | null>
  onPhaseChange?: (phase: string) => void
  onStartRef?: MutableRefObject<((...args: any[]) => void) | null>
}

type InternalPhase = 'idle' | 'setup' | 'ingame'

export default function SuikodenGame({ characters, items, onHomeRef, onPhaseChange, onStartRef }: SuikodenGameProps) {
  const [internalPhase, setInternalPhase] = useState<InternalPhase>('idle')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [worldPreview, setWorldPreview] = useState<WorldPreview | null>(null)
  const [assetsLoaded, setAssetsLoaded] = useState(false)
  const [dialogQueue, setDialogQueue] = useState<DialogEntry[]>([])
  const [devBlocked, setDevBlocked] = useState(false)

  const pushDialog = useCallback((entry: DialogEntry) => {
    setDialogQueue(prev => [...prev, entry])
  }, [])

  const dismissDialog = useCallback(() => {
    setDialogQueue(prev => prev.slice(1))
  }, [])

  const clearDialogs = useCallback(() => {
    setDialogQueue([])
  }, [])

  // 에셋 프리로드
  useEffect(() => {
    preloadAssets(characters).then(() => setAssetsLoaded(true))
  }, [characters])

  // phase 리포트
  useEffect(() => {
    if (internalPhase === 'idle') {
      onPhaseChange?.('idle')
    } else if (internalPhase === 'setup') {
      onPhaseChange?.('setup')
    } else if (gameState) {
      onPhaseChange?.(gameState.phase)
    }
  }, [internalPhase, gameState?.phase, onPhaseChange])

  // 홈 (idle 복귀)
  const handleHome = useCallback(() => {
    setGameState(null)
    setWorldPreview(null)
    setDialogQueue([])
    setInternalPhase('idle')
  }, [])

  useEffect(() => {
    if (onHomeRef) onHomeRef.current = handleHome
  }, [onHomeRef, handleHome])

  // 시작 (로비에서 호출)
  const handleStart = useCallback(() => {
    if (process.env.NODE_ENV !== 'development') {
      setDevBlocked(true)
      return
    }
    setWorldPreview(null)
    setInternalPhase('setup')
  }, [])

  useEffect(() => {
    if (onStartRef) onStartRef.current = handleStart
  }, [onStartRef, handleStart])

  // 1단계 → 세력 미리보기 생성
  const handlePreviewWorld = useCallback((difficulty: 'easy' | 'normal' | 'hard', era: Era) => {
    const preview = previewWorld(characters, difficulty, era)
    setWorldPreview(preview)
  }, [characters])

  // 2단계 → 게임 시작
  const handleSetupComplete = useCallback((leaderId: string) => {
    if (!worldPreview) return
    const state = finalizeGame(worldPreview, leaderId, items)
    setGameState(state)
    setWorldPreview(null)
    setInternalPhase('ingame')
  }, [worldPreview, items])

  // 뒤로 (2단계 → 1단계, 또는 1단계 → idle)
  const handleBack = useCallback(() => {
    if (worldPreview) {
      setWorldPreview(null)
    } else {
      handleHome()
    }
  }, [worldPreview, handleHome])

  // gameState 업데이트
  const updateState = useCallback((fn: (s: GameState) => GameState) => {
    setGameState(prev => prev ? fn(prev) : prev)
  }, [])

  // ── idle: 아무것도 렌더하지 않음 (로비는 GameShell이 관리) ──
  if (internalPhase === 'idle') {
    return (
      <>
        {devBlocked && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center" onClick={() => setDevBlocked(false)}>
            <div className="bg-bg-main border border-white/10 rounded-xl px-8 py-6 text-center max-w-xs mx-4" onClick={e => e.stopPropagation()}>
              <div className="text-3xl mb-3">🔨</div>
              <p className="text-white font-serif font-bold mb-2">개발 중</p>
              <p className="text-text-secondary text-sm leading-relaxed">천도는 현재 개발 중입니다.<br />조금만 기다려주세요.</p>
              <button onClick={() => setDevBlocked(false)} className="mt-4 px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-text-secondary text-sm hover:bg-white/10 transition-colors">
                확인
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  // ── setup ──
  if (internalPhase === 'setup') {
    if (!assetsLoaded) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-pulse text-text-secondary font-serif">데이터 로딩 중...</div>
            <p className="text-xs text-text-tertiary mt-2">{characters.length}명의 인물</p>
          </div>
        </div>
      )
    }
    return (
      <SetupScreen
        characters={characters}
        worldPreview={worldPreview}
        onPreviewWorld={handlePreviewWorld}
        onComplete={handleSetupComplete}
        onBack={handleBack}
      />
    )
  }

  // ── ingame ──
  if (!gameState) return null
  const phase = gameState.phase

  return (
    <>
      {phase === 'wandering' && <WanderingScreen state={gameState} onUpdateState={updateState} onDialog={pushDialog} onClearDialogs={clearDialogs} />}
      {(phase === 'strategy' || phase === 'battle' || phase === 'disposition' || phase === 'result') && (
        <StrategyScreen state={gameState} onUpdateState={updateState} onDialog={pushDialog} />
      )}

      {phase === 'battle' && gameState.battle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-2xl mx-4 my-8">
            <BattleScreen state={gameState} onUpdateState={updateState} />
          </div>
        </div>
      )}

      {phase === 'disposition' && gameState.disposition && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-md mx-4 my-8">
            <DispositionScreen state={gameState} onUpdateState={updateState} />
          </div>
        </div>
      )}

      {gameState.settings && (
        <DialogSnackbar
          queue={dialogQueue}
          settings={gameState.settings}
          onDismiss={dismissDialog}
        />
      )}

      {phase === 'result' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <ResultScreen state={gameState} onRestart={handleHome} />
        </div>
      )}
    </>
  )
}
