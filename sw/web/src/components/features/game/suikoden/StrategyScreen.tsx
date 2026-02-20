'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { GameState, GameSpeed, TerritoryId } from '@/lib/game/suikoden/types'
import { RT, TERRITORIES, GRADE_FAME_REQ } from '@/lib/game/suikoden/constants'
import { initBattle } from '@/lib/game/suikoden/engine'
import type { TaxRate } from '@/lib/game/suikoden/types'
import { processTick, commandBuild, commandAssign, commandUnassign, commandIdle, commandTrain, commandReward, commandPunish, commandDemolish, commandSetTaxRate } from '@/lib/game/suikoden/rtEngine'
import { getRegionForNationality } from '@/lib/game/suikoden/utils'
import { commandAlliance, commandCeasefire, commandTribute, commandSurrender } from '@/lib/game/suikoden/diplomacy'
import GameHUD from './GameHUD'
import GameToolbar from './GameToolbar'
import BuildingCardGrid from './BuildingCardGrid'
import WorldMapMini from './WorldMapMini'
import CommandMenu from './CommandMenu'
import CharacterDetailModal from './CharacterDetailModal'
import CharacterPortrait from './CharacterPortrait'

interface Props {
  state: GameState
  onUpdateState: (fn: (s: GameState) => GameState) => void
}

export default function StrategyScreen({ state, onUpdateState }: Props) {
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [detailCharacter, setDetailCharacter] = useState<string | null>(null)
  const [recruitResult, setRecruitResult] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(state.tickCount === 0)

  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!
  const viewingTerritory = playerFaction.territories.find(t => t.id === state.viewingTerritoryId)
    ?? playerFaction.territories[0]

  // ── 실시간 게임 루프 ──
  useGameLoop(state, onUpdateState)

  // ── 배속 설정 ──
  const handleSetSpeed = useCallback((speed: GameSpeed) => {
    onUpdateState(s => ({
      ...s,
      speed,
      prevSpeed: speed === 0 ? s.prevSpeed : speed,
    }))
  }, [onUpdateState])

  // ── 영토 전환 ──
  const handleSelectTerritory = useCallback((tId: TerritoryId) => {
    if (playerFaction.territories.some(t => t.id === tId)) {
      onUpdateState(s => ({ ...s, viewingTerritoryId: tId }))
    }
    onUpdateState(s => ({ ...s, selectedTerritoryId: tId }))
  }, [playerFaction, onUpdateState])

  // ── 건설 명령 ──
  const handleBuild = useCallback((buildingDefId: string) => {
    if (!selectedCharId || !viewingTerritory) return
    onUpdateState(s => commandBuild(s, selectedCharId, buildingDefId, viewingTerritory.id))
  }, [selectedCharId, viewingTerritory, onUpdateState])

  // ── 배치 명령 ──
  const handleAssign = useCallback((charId: string, buildingInstanceId: string) => {
    onUpdateState(s => commandAssign(s, charId, buildingInstanceId))
  }, [onUpdateState])

  // ── 해제 명령 ──
  const handleUnassign = useCallback((charId: string) => {
    onUpdateState(s => commandUnassign(s, charId))
  }, [onUpdateState])

  // ── 자동 내정 토글 ──
  const handleToggleAutoAssign = useCallback(() => {
    onUpdateState(s => ({ ...s, autoAssign: !s.autoAssign }))
  }, [onUpdateState])

  // ── 대기 명령 ──
  const handleIdle = useCallback(() => {
    if (!selectedCharId) return
    onUpdateState(s => commandIdle(s, selectedCharId))
  }, [selectedCharId, onUpdateState])

  // ── 훈련 명령 ──
  const handleTrain = useCallback(() => {
    if (!selectedCharId) return
    onUpdateState(s => commandTrain(s, selectedCharId))
  }, [selectedCharId, onUpdateState])

  // ── 포상 명령 ──
  const handleReward = useCallback(() => {
    if (!selectedCharId) return
    onUpdateState(s => commandReward(s, selectedCharId))
  }, [selectedCharId, onUpdateState])

  // ── 처벌 명령 ──
  const handlePunish = useCallback(() => {
    if (!selectedCharId) return
    onUpdateState(s => commandPunish(s, selectedCharId))
  }, [selectedCharId, onUpdateState])

  // ── 철거 명령 ──
  const handleDemolish = useCallback((buildingInstanceId: string) => {
    if (!viewingTerritory) return
    onUpdateState(s => commandDemolish(s, viewingTerritory.id, buildingInstanceId))
  }, [viewingTerritory, onUpdateState])

  // ── 세율 조정 ──
  const handleSetTaxRate = useCallback((rate: TaxRate) => {
    if (!viewingTerritory) return
    onUpdateState(s => commandSetTaxRate(s, viewingTerritory.id, rate))
  }, [viewingTerritory, onUpdateState])

  // ── 외교 명령 ──
  const [diplomacyResult, setDiplomacyResult] = useState<string | null>(null)
  const handleDiplomacy = useCallback((action: string, targetFactionId: string) => {
    onUpdateState(s => {
      let result: { state: GameState; result: { success: boolean; message: string } }
      switch (action) {
        case 'alliance':
          result = commandAlliance(s, targetFactionId)
          break
        case 'ceasefire':
          result = commandCeasefire(s, targetFactionId)
          break
        case 'tribute':
          result = commandTribute(s, targetFactionId, 100)
          break
        case 'surrender':
          result = commandSurrender(s, targetFactionId)
          break
        default:
          return s
      }
      setDiplomacyResult(result.result.message)
      setTimeout(() => setDiplomacyResult(null), 3000)
      return result.state
    })
  }, [onUpdateState])

  // ── 인재 탐색 ──
  const handleRecruit = useCallback(() => {
    const playerRegion = getRegionForNationality(playerFaction.members[0]?.nationality ?? '')
    const currentFame = playerFaction.fame
    const candidates = state.wanderers.filter(w => {
      if (getRegionForNationality(w.nationality) !== playerRegion) return false
      const reqFame = GRADE_FAME_REQ[w.grade] ?? 0
      return currentFame >= reqFame
    })
    if (candidates.length === 0) {
      const regionAll = state.wanderers.filter(w => getRegionForNationality(w.nationality) === playerRegion)
      if (regionAll.length > 0) {
        const minReq = Math.min(...regionAll.map(w => GRADE_FAME_REQ[w.grade] ?? 0))
        setRecruitResult(`명성이 부족하다. (최소 ${minReq} 필요, 현재 ${currentFame})`)
      } else {
        setRecruitResult('이 지역에 영입 가능한 인재가 없다.')
      }
      setTimeout(() => setRecruitResult(null), 2500)
      return
    }

    const target = candidates[Math.floor(Math.random() * candidates.length)]
    const leader = playerFaction.members.find(m => m.id === playerFaction.leaderId)!
    const fameBonus = Math.min(0.15, currentFame * 0.00015)
    const rate = 0.3 + leader.stats.virtue * 0.05 + fameBonus

    if (Math.random() < rate) {
      onUpdateState(s => {
        const territory = s.factions.find(f => f.id === s.playerFactionId)!.territories[0]
        return {
          ...s,
          factions: s.factions.map(f =>
            f.id === s.playerFactionId ? { ...f, fame: f.fame + 1, members: [...f.members, target] } : f
          ),
          placements: [...s.placements, {
            characterId: target.id,
            factionId: s.playerFactionId,
            territoryId: territory.id,
            task: 'idle' as const,
            taskProgress: 0,
            assignedBuildingId: null,
          }],
          wanderers: s.wanderers.filter(w => w.id !== target.id),
          log: [...s.log, `${target.nickname}이(가) 합류했다!`],
        }
      })
      setRecruitResult(`${target.nickname}이(가) 합류했다!`)
    } else {
      setRecruitResult(`${target.nickname}이(가) 거절했다.`)
    }
    setTimeout(() => setRecruitResult(null), 2500)
  }, [state, playerFaction, onUpdateState])

  // ── 침공 ──
  const handleAttack = useCallback((targetTerritoryId: TerritoryId) => {
    const defenderFaction = state.factions.find(f =>
      f.id !== state.playerFactionId && f.territories.some(t => t.id === targetTerritoryId)
    )
    if (!defenderFaction) return

    const pf = state.factions.find(f => f.id === state.playerFactionId)!
    const attackerIds = pf.members.slice(0, 5).map(m => m.id)
    const defenderIds = defenderFaction.members.slice(0, 5).map(m => m.id)
    if (attackerIds.length === 0 || defenderIds.length === 0) return

    const battle = initBattle(pf, defenderFaction, attackerIds, defenderIds, targetTerritoryId)

    onUpdateState(s => ({
      ...s,
      battle,
      phase: 'battle' as const,
      speed: 0,
      prevSpeed: s.speed || 1,
      log: [...s.log, `${defenderFaction.name}의 ${TERRITORIES.find(t => t.id === targetTerritoryId)?.name}에 침공!`],
    }))
  }, [state, onUpdateState])

  // ── 무주지 점령 ──
  const handleClaim = useCallback((territoryId: TerritoryId) => {
    const def = TERRITORIES.find(t => t.id === territoryId)!
    onUpdateState(s => ({
      ...s,
      factions: s.factions.map(f =>
        f.id === s.playerFactionId
          ? { ...f, fame: f.fame + 5, territories: [...f.territories, {
              id: territoryId,
              name: def.name,
              regionId: def.regionId,
              buildingCards: [],
              maxBuildings: 8,
              population: 500,
              morale: 60,
              resources: { gold: 0, food: 0, knowledge: 0, material: 0, troops: 0 },
              taxRate: 'normal' as const,
            }] }
          : f
      ),
      log: [...s.log, `${def.name}을(를) 점령했다! (명성 +5)`],
    }))
  }, [onUpdateState])

  const detailChar = detailCharacter ? playerFaction.members.find(m => m.id === detailCharacter) : null

  return (
    <div className="space-y-3">
      {detailChar && <CharacterDetailModal character={detailChar} onClose={() => setDetailCharacter(null)} />}

      {/* 가이드 */}
      {showHelp && (
        <div className="p-4 bg-stone-800 border border-amber-500/30 rounded space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-300">📜 천도 — 실시간 전략</h3>
            <button onClick={() => setShowHelp(false)} className="text-stone-500 hover:text-stone-300 text-xs">닫기 ✕</button>
          </div>
          <div className="text-xs text-stone-300 space-y-2 leading-relaxed">
            <p><b className="text-amber-400">실시간</b>: 시간이 자동으로 흐른다. 배속 조절 (1x/2x/3x) 또는 일시정지 가능.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 bg-stone-900 rounded">
                <p className="font-bold text-stone-200 mb-1">🏗️ 건설</p>
                <p>인물 선택 → 건물 그리드에서 + 버튼 → 건물 선택. 건설 완료 시 자동 근무.</p>
              </div>
              <div className="p-2 bg-stone-900 rounded">
                <p className="font-bold text-stone-200 mb-1">⚙️ 배치</p>
                <p>인물 선택 → 빈 건물 카드의 '배치' 클릭. 근무자가 있으면 생산 1.5배.</p>
              </div>
              <div className="p-2 bg-stone-900 rounded">
                <p className="font-bold text-stone-200 mb-1">⚔️ 전투</p>
                <p>군사 탭에서 인접 적 영토에 침공. 전투는 전술 카드 대결.</p>
              </div>
              <div className="p-2 bg-stone-900 rounded">
                <p className="font-bold text-stone-200 mb-1">🗺️ 외교</p>
                <p>외교 탭에서 동맹/정전/조공/항복 등 외교 행동.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUD */}
      <GameHUD state={state} onSetSpeed={handleSetSpeed} />

      {/* 도구바 */}
      {viewingTerritory && (
        <GameToolbar
          state={state}
          territory={viewingTerritory}
          selectedCharId={selectedCharId}
          onSelectChar={setSelectedCharId}
          onIdle={handleIdle}
          onRecruit={handleRecruit}
          onToggleAutoAssign={handleToggleAutoAssign}
          onDetailChar={setDetailCharacter}
        />
      )}

      {/* 메인 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {/* 건물 카드 그리드 (3/4) */}
        <div className="lg:col-span-3">
          {viewingTerritory && (
            <BuildingCardGrid
              state={state}
              territory={viewingTerritory}
              selectedCharId={selectedCharId}
              onBuild={handleBuild}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
              onDemolish={handleDemolish}
            />
          )}
        </div>

        {/* 우측 패널 (1/4) */}
        <div className="space-y-3">
          {/* 미니맵 */}
          <WorldMapMini
            state={state}
            viewingTerritoryId={state.viewingTerritoryId}
            onSelectTerritory={handleSelectTerritory}
          />

          {/* 도움말 토글 */}
          <button onClick={() => setShowHelp(!showHelp)} className="w-full text-[10px] text-stone-600 hover:text-amber-400">❓ 가이드</button>

          {/* 명령 메뉴 */}
          <CommandMenu
            state={state}
            selectedCharId={selectedCharId}
            viewingTerritoryId={state.viewingTerritoryId}
            onIdle={handleIdle}
            onRecruit={handleRecruit}
            onTrain={handleTrain}
            onReward={handleReward}
            onPunish={handlePunish}
            onAttack={handleAttack}
            onClaim={handleClaim}
            onDiplomacy={handleDiplomacy}
            onSetTaxRate={handleSetTaxRate}
            autoAssign={state.autoAssign}
            onToggleAutoAssign={handleToggleAutoAssign}
          />

          {recruitResult && (
            <div className="p-2 bg-stone-800 border border-amber-500/30 rounded text-xs text-amber-300 text-center animate-pulse">
              {recruitResult}
            </div>
          )}
          {diplomacyResult && (
            <div className="p-2 bg-stone-800 border border-blue-500/30 rounded text-xs text-blue-300 text-center animate-pulse">
              {diplomacyResult}
            </div>
          )}

          {/* 인재 목록 토글 */}
          <details className="border border-stone-700 rounded bg-stone-800/50">
            <summary className="p-2 text-xs font-bold text-stone-300 cursor-pointer hover:text-stone-100">
              👥 인재 ({playerFaction.members.length})
            </summary>
            <div className="px-2 pb-2 space-y-1 max-h-36 overflow-y-auto">
              {playerFaction.members.map(m => {
                const p = state.placements.find(pl => pl.characterId === m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedCharId(m.id === selectedCharId ? null : m.id)}
                    className={`w-full flex items-center gap-1.5 text-xs rounded p-1 transition-colors ${
                      selectedCharId === m.id ? 'bg-amber-800/30' : 'hover:bg-stone-700'
                    }`}
                  >
                    <CharacterPortrait character={m} size={20} />
                    <span className="text-stone-200 flex-1 truncate text-left text-[10px]">{m.nickname}</span>
                    <span className="text-stone-500 text-[9px]">{p?.task === 'idle' ? '' : taskLabel(p?.task)}</span>
                  </button>
                )
              })}
            </div>
          </details>

          {/* 세력 현황 */}
          <details className="border border-stone-700 rounded bg-stone-800/50" open>
            <summary className="p-2 text-xs font-bold text-stone-300 cursor-pointer hover:text-stone-100">🏳️ 세력</summary>
            <div className="px-2 pb-2 space-y-1">
              {state.factions.map(f => (
                <div key={f.id} className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                  <span className={`flex-1 truncate ${f.id === state.playerFactionId ? 'text-amber-300 font-bold' : 'text-stone-400'}`}>
                    {f.name.replace('의 세력', '')}
                  </span>
                  <span className="text-stone-500">{f.members.length}명</span>
                  <span className="text-stone-500">{f.territories.length}</span>
                </div>
              ))}
            </div>
          </details>

          {/* 이벤트 로그 */}
          <div className="border border-stone-700 rounded p-2 bg-stone-800/50 max-h-24 overflow-y-auto">
            {state.log.slice(-8).reverse().map((l, i) => (
              <p key={i} className="text-[9px] text-stone-500 leading-relaxed">{l}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 게임 루프 Hook ──

function useGameLoop(state: GameState, onUpdateState: (fn: (s: GameState) => GameState) => void) {
  const stateRef = useRef(state)
  stateRef.current = state

  const accRef = useRef(0)
  const lastRef = useRef(0)

  useEffect(() => {
    let rafId: number

    const loop = (timestamp: number) => {
      const s = stateRef.current
      if (s.speed === 0 || s.phase !== 'strategy' || s.isGameOver) {
        lastRef.current = timestamp
        rafId = requestAnimationFrame(loop)
        return
      }

      const delta = lastRef.current ? timestamp - lastRef.current : 0
      lastRef.current = timestamp

      accRef.current += delta
      const tickMs = RT.BASE_TICK_MS / s.speed

      let ticked = false
      while (accRef.current >= tickMs) {
        accRef.current -= tickMs
        ticked = true
      }

      if (ticked) {
        onUpdateState(prev => processTick(prev))
      }

      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [onUpdateState])
}

// ── 유틸 ──

function taskLabel(task?: string): string {
  if (!task) return ''
  const labels: Record<string, string> = {
    idle: '', building: '🔨', working: '⚙️', training: '🎯',
  }
  return labels[task] ?? ''
}
