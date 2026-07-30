/*
  파일명: components/features/game/suikoden/SuikodenGame.tsx
  기능: 천도 게임 메인 컴포넌트
  책임: GameShell의 Game 인터페이스를 구현. setup → wandering → strategy → battle → result 흐름 관리.
*/
'use client'

import { useState, useCallback, useEffect, type MutableRefObject } from 'react'
import { useTranslations } from 'next-intl'
import type { GameState, GameCharacter, DialogEntry, WorldPreview, ScenarioDef } from '@/lib/game/suikoden/types'
import { previewScenario, finalizeGame } from '@/lib/game/suikoden/engine'
import { clearSuikodenGame, loadSuikodenGame, saveSuikodenGame, type SuikodenStartMode } from '@/lib/game/suikoden/save'
import { preloadAssets } from '@/lib/game/suikoden/assetManager'
import SetupScreen from './SetupScreen'
import WanderingScreen from './WanderingScreen'
import StrategyScreen from './StrategyScreen'
import BattleScreen from './BattleScreen'
import DispositionScreen from './DispositionScreen'
import ResultScreen from './ResultScreen'
import DialogSnackbar from './DialogSnackbar'

/** characterId → celeb_dialogues.lines */
type DialoguesMap = Record<string, Record<string, string[]>>

interface SuikodenGameProps {
  characters: GameCharacter[]
  dialogues: DialoguesMap
  onEnterFullScreen?: () => void
  onHomeRef?: MutableRefObject<(() => void) | null>
  onPhaseChange?: (phase: string) => void
  onStartRef?: MutableRefObject<((mode: SuikodenStartMode) => void) | null>
}

type InternalPhase = 'idle' | 'setup' | 'ingame'

export default function SuikodenGame({ characters, dialogues, onHomeRef, onPhaseChange, onStartRef }: SuikodenGameProps) {
  const tS = useTranslations('rest.arena.suikoden')
  const [internalPhase, setInternalPhase] = useState<InternalPhase>('idle')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [worldPreview, setWorldPreview] = useState<WorldPreview | null>(null)
  const [dialogQueue, setDialogQueue] = useState<DialogEntry[]>([])
  const [saveFailed, setSaveFailed] = useState(false)

  const pushDialog = useCallback((entry: DialogEntry) => {
    setDialogQueue(prev => [...prev, entry])
  }, [])

  const dismissDialog = useCallback(() => {
    setDialogQueue(prev => prev.slice(1))
  }, [])

  const clearDialogs = useCallback(() => {
    setDialogQueue([])
  }, [])

  // 에셋 확인은 게임 진행을 막지 않고 뒤에서 수행한다.
  useEffect(() => {
    void preloadAssets(characters)
  }, [characters])

  // 진행 중인 한 판은 브라우저에 자동 저장한다.
  useEffect(() => {
    if (!gameState) return

    const timer = window.setTimeout(() => {
      if (gameState.isGameOver) {
        clearSuikodenGame()
        setSaveFailed(false)
        return
      }
      setSaveFailed(!saveSuikodenGame(gameState))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [gameState])

  // phase 리포트
  useEffect(() => {
    if (internalPhase === 'idle') {
      onPhaseChange?.('idle')
    } else if (internalPhase === 'setup') {
      onPhaseChange?.('setup')
    } else if (gameState) {
      onPhaseChange?.(gameState.phase)
    }
  }, [internalPhase, gameState, onPhaseChange])

  // 홈 (idle 복귀)
  const handleHome = useCallback(() => {
    setGameState(null)
    setWorldPreview(null)
    setDialogQueue([])
    setSaveFailed(false)
    setInternalPhase('idle')
  }, [])

  useEffect(() => {
    if (onHomeRef) onHomeRef.current = handleHome
  }, [onHomeRef, handleHome])

  // 시작 또는 이어하기 (로비에서 호출)
  const handleStart = useCallback((mode: SuikodenStartMode) => {
    setSaveFailed(false)
    if (mode === 'continue') {
      const savedState = loadSuikodenGame()
      if (savedState) {
        setWorldPreview(null)
        setGameState(savedState)
        setInternalPhase('ingame')
        return
      }
    }

    clearSuikodenGame()
    setGameState(null)
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
      {saveFailed && (
        <div
          role="status"
          className="pointer-events-none fixed left-1/2 top-4 z-[70] w-[calc(100vw_-_2rem)] max-w-[32rem] -translate-x-1/2 rounded border border-red-500/50 bg-red-950/95 px-3 py-2 text-center text-xs font-bold text-red-200 shadow-lg"
        >
          {tS('saveUnavailableWarning')}
        </div>
      )}

      {phase === 'wandering' && <WanderingScreen state={gameState} onUpdateState={updateState} onDialog={pushDialog} onClearDialogs={clearDialogs} dialogues={dialogues} />}
      {(phase === 'strategy' || phase === 'battle' || phase === 'disposition' || phase === 'result') && (
        <StrategyScreen state={gameState} onUpdateState={updateState} onDialog={pushDialog} dialogues={dialogues} />
      )}

      {phase === 'battle' && gameState.battle && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:py-8">
          <div className="w-full max-w-2xl">
            <BattleScreen state={gameState} onUpdateState={updateState} onDialog={pushDialog} dialogues={dialogues} />
          </div>
        </div>
      )}

      {phase === 'disposition' && gameState.disposition && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:py-8">
          <div className="w-full max-w-md">
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:py-8">
          <ResultScreen state={gameState} onRestart={handleHome} />
        </div>
      )}
    </>
  )
}
