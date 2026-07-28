/*
  파일명: components/features/game/suikoden/SuikodenGame.tsx
  기능: 천도 게임 메인 컴포넌트
  책임: GameShell의 Game 인터페이스를 구현. setup → wandering → strategy → battle → result 흐름 관리.
*/
'use client'

import { useState, useCallback, useEffect, type MutableRefObject } from 'react'
import { useLocale } from 'next-intl'
import type { GameState, GameCharacter, Era, DialogEntry, WorldPreview, ScenarioDef } from '@/lib/game/suikoden/types'
import { initGame, previewWorld, previewScenario, finalizeGame } from '@/lib/game/suikoden/engine'
import { preloadAssets } from '@/lib/game/suikoden/assetManager'
import SetupScreen from './SetupScreen'
import WanderingScreen from './WanderingScreen'
import StrategyScreen from './StrategyScreen'
import BattleScreen from './BattleScreen'
import DispositionScreen from './DispositionScreen'
import ResultScreen from './ResultScreen'
import DialogSnackbar from './DialogSnackbar'
import { getSuikodenText } from './i18n'

/** characterId → celeb_dialogues.lines */
type DialoguesMap = Record<string, Record<string, string[]>>

interface SuikodenGameProps {
  characters: GameCharacter[]
  dialogues: DialoguesMap
  onEnterFullScreen?: () => void
  onHomeRef?: MutableRefObject<(() => void) | null>
  onPhaseChange?: (phase: string) => void
  onStartRef?: MutableRefObject<(() => void) | null>
}

type InternalPhase = 'idle' | 'setup' | 'ingame'

export default function SuikodenGame({ characters, dialogues, onHomeRef, onPhaseChange, onStartRef }: SuikodenGameProps) {
  const locale = useLocale()
  const text = getSuikodenText(locale)
  const [internalPhase, setInternalPhase] = useState<InternalPhase>('idle')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [worldPreview, setWorldPreview] = useState<WorldPreview | null>(null)
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
    setWorldPreview(null)
    setInternalPhase('setup')
  }, [])

  useEffect(() => {
    if (onStartRef) onStartRef.current = handleStart
  }, [onStartRef, handleStart])

  // 1단계 → 시나리오 선택 → 세력 미리보기 생성
  const handleSelectScenario = useCallback((scenario: ScenarioDef) => {
    const preview = previewScenario(scenario, characters)
    setWorldPreview(preview)
  }, [characters])

  // 2단계 → 게임 시작
  const handleSetupComplete = useCallback((leaderId: string) => {
    if (!worldPreview) return
    const state = finalizeGame(worldPreview, leaderId)
    setGameState(state)
    setWorldPreview(null)
    setInternalPhase('ingame')
  }, [worldPreview])

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
  if (internalPhase === 'idle') return null

  // ── setup ──
  if (internalPhase === 'setup') {
    if (!assetsLoaded) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-pulse text-text-secondary font-serif">{text.game.loading}</div>
            <p className="text-xs mt-2">{text.game.characterCount(characters.length)}</p>
          </div>
        </div>
      )
    }
    return (
      <SetupScreen
        characters={characters}
        worldPreview={worldPreview}
        onSelectScenario={handleSelectScenario}
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
      {phase === 'wandering' && <WanderingScreen state={gameState} onUpdateState={updateState} onDialog={pushDialog} onClearDialogs={clearDialogs} dialogues={dialogues} />}
      {(phase === 'strategy' || phase === 'battle' || phase === 'disposition' || phase === 'result') && (
        <StrategyScreen state={gameState} onUpdateState={updateState} onDialog={pushDialog} dialogues={dialogues} />
      )}

      {phase === 'battle' && gameState.battle && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-2xl mx-4 my-8">
            <BattleScreen state={gameState} onUpdateState={updateState} onDialog={pushDialog} dialogues={dialogues} />
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
