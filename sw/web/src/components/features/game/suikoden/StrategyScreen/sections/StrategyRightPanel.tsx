'use client'

import type { GameState, TerritoryId } from '@/lib/game/suikoden/types'
import WorldMapView from '../../WorldMapView'
import TextMapView from '../../TextMapView'
import CharacterInfoPanel from '../../CharacterInfoPanel'
import { stripSuikodenFactionSuffix } from '../../i18n'

interface Props {
  state: GameState
  mapMode: 'globe' | 'text'
  setMapMode: (mode: 'globe' | 'text') => void
  mapOpen: boolean
  setMapOpen: (fn: (v: boolean) => boolean) => void
  charPanelOpen: boolean
  setCharPanelOpen: (fn: (v: boolean) => boolean) => void
  selectedCharId: string | null
  playerFaction: GameState['factions'][number]
  focusTarget: { id: TerritoryId; key: number } | null
  handleSelectTerritory: (tId: TerritoryId) => void
  handleIdle: () => void
  handleTrain: () => void
  handleReward: () => void
  handlePunish: () => void
  handleReinforce: () => void
  showHelp: boolean
  setShowHelp: (v: boolean) => void
  text: ReturnType<typeof import('../../i18n').getSuikodenText>
}

export default function StrategyRightPanel({
  state, mapMode, setMapMode, mapOpen, setMapOpen,
  charPanelOpen, setCharPanelOpen, selectedCharId, playerFaction,
  focusTarget, handleSelectTerritory,
  handleIdle, handleTrain, handleReward, handlePunish, handleReinforce,
  showHelp, setShowHelp, text,
}: Props) {
  return (
    <div className="space-y-3">
      {/* 세계 지도 — 아코디언 */}
      <div className="bg-stone-800/80 border border-stone-700 rounded-lg">
        <div
          className="flex items-center gap-2 p-2.5 cursor-pointer select-none"
          onClick={(e) => {
            // 탭 버튼 클릭은 무시 (헤더 빈 영역만 토글)
            if ((e.target as HTMLElement).closest('button')) return
            setMapOpen(v => !v)
          }}
        >
          <span className="text-[8px] text-text-secondary">{mapOpen ? '\u25BC' : '\u25B6'}</span>
          <span className="text-xs font-bold text-text-secondary mr-auto">{text.strategy.mapWorld}</span>
          {mapOpen && (
            <div className="flex bg-stone-900/80 rounded p-0.5 gap-0.5">
              <button
                onClick={() => setMapMode('globe')}
                className={`px-2 py-0.5 text-[10px] rounded ${
                  mapMode === 'globe'
                    ? 'bg-stone-700 text-text-primary font-bold'
                    : 'text-text-secondary hover:text-text-secondary'
                }`}
              >
                {text.strategy.mapGlobe}
              </button>
              <button
                onClick={() => setMapMode('text')}
                className={`px-2 py-0.5 text-[10px] rounded ${
                  mapMode === 'text'
                    ? 'bg-stone-700 text-text-primary font-bold'
                    : 'text-text-secondary hover:text-text-secondary'
                }`}
              >
                {text.strategy.mapText}
              </button>
            </div>
          )}
        </div>

        {mapOpen && (
          <div className="px-2.5 pb-2.5">
            {mapMode === 'globe' ? (
              <WorldMapView
                state={state}
                viewingTerritoryId={state.viewingTerritoryId}
                selectedTerritoryId={state.selectedTerritoryId}
                onSelectTerritory={handleSelectTerritory}
                phase="strategy"
                focusTerritoryId={focusTarget?.id ?? null}
                focusKey={focusTarget?.key ?? 0}
              />
            ) : (
              <TextMapView
                state={state}
                viewingTerritoryId={state.viewingTerritoryId}
                selectedTerritoryId={state.selectedTerritoryId}
                onSelectTerritory={handleSelectTerritory}
                phase="strategy"
              />
            )}
          </div>
        )}
      </div>

      {/* 선택 인물 상세 — 아코디언 */}
      <div className="bg-stone-800 border border-stone-700 rounded">
        <div
          className="flex items-center gap-2 p-2 cursor-pointer select-none"
          onClick={() => setCharPanelOpen(v => !v)}
        >
          <span className="text-[8px] text-text-secondary">{charPanelOpen ? '\u25BC' : '\u25B6'}</span>
          <span className="text-xs font-bold text-text-secondary">{text.strategy.characterInfo}</span>
          {selectedCharId && !charPanelOpen && (() => {
            const c = playerFaction.members.find(m => m.id === selectedCharId)
            return c ? <span className="ml-auto text-[10px] text-text-secondary truncate">{c.nickname}</span> : null
          })()}
        </div>
        {charPanelOpen && (
          <CharacterInfoPanel
            state={state}
            selectedCharId={selectedCharId}
            onIdle={handleIdle}
            onTrain={handleTrain}
            onReward={handleReward}
            onPunish={handlePunish}
            onReinforce={handleReinforce}
          />
        )}
      </div>

      {/* 세력 현황 */}
      <details className="border border-stone-700 rounded bg-stone-800/50" open>
        <summary className="p-2 text-xs font-bold text-text-primary cursor-pointer hover:text-stone-100">{text.strategy.factionStatus}</summary>
        <div className="px-2 pb-2 space-y-1">
          {state.factions.map(f => (
            <div key={f.id} className="flex items-center gap-1.5 text-[10px]">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
              <span className={`flex-1 truncate ${f.id === state.playerFactionId ? 'text-amber-300 font-bold' : 'text-text-secondary'}`}>
                {stripSuikodenFactionSuffix(f.name)}
              </span>
              <span className="text-text-secondary">{text.strategy.memberCount(f.members.length)}</span>
              <span className="text-text-secondary">{text.strategy.territoryCount(f.territories.length)}</span>
            </div>
          ))}
        </div>
      </details>

      {/* 도움말 토글 */}
      <button onClick={() => setShowHelp(!showHelp)} className="w-full text-[10px] text-text-secondary hover:text-amber-400">{text.strategy.help}</button>
    </div>
  )
}
