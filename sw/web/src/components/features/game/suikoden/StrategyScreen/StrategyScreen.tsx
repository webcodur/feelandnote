'use client'

import { useState, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { TerritoryId } from '@/lib/game/suikoden/types'
import { getTerritoryDef } from '@/lib/game/suikoden/utils'
import type { TaxRate } from '@/lib/game/suikoden/types'
import GameHUD from '../GameHUD'
import GameToolbar from '../GameToolbar'
import BuildingCardGrid from '../BuildingCardGrid'
import { getSuikodenText, translateSuikodenMessage } from '../i18n'
import { useStrategyCommands } from './useStrategyCommands'
import StrategyRightPanel from './sections/StrategyRightPanel'
import type { StrategyScreenProps } from './types'

export default function StrategyScreen({ state, onUpdateState, onDialog, dialogues }: StrategyScreenProps) {
  const locale = useLocale()
  const tS = useTranslations('rest.arena.suikoden')
  const text = getSuikodenText(locale)
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null)
  const [mapMode, setMapMode] = useState<'globe' | 'text'>('globe')
  const [toast, setToast] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(state.turnCount === 0)
  const [focusTarget, setFocusTarget] = useState<{ id: TerritoryId; key: number } | null>(null)
  const [mapOpen, setMapOpen] = useState(true)
  const [charPanelOpen, setCharPanelOpen] = useState(true)
  const [splash, setSplash] = useState<{ name: string; id: string } | null>(null)
  const [splashVisible, setSplashVisible] = useState(false)
  const focusKeyRef = useRef(0)

  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!
  // 모든 세력의 영토에서 조회 (적/무주지 포함)
  const allTerritories = state.factions.flatMap(f => f.territories)
  const viewingTerritory = allTerritories.find(t => t.id === state.viewingTerritoryId)
    ?? (() => {
      // 무주지: 기본 Territory 생성
      const tDef = state.viewingTerritoryId ? getTerritoryDef(state.viewingTerritoryId) : null
      if (tDef) return {
        id: tDef.id as TerritoryId,
        name: tDef.name,
        regionId: tDef.regionId,
        buildingCards: [],
        maxBuildings: 8,
        population: 0,
        morale: 0,
        resources: { gold: 0, food: 0, knowledge: 0, material: 0, troops: 0, weapons: 0, horses: 0, ships: 0, charms: 0 },
        taxRate: 'normal' as TaxRate,
      }
      return playerFaction.territories[0]
    })()
  const isViewingOwn = playerFaction.territories.some(t => t.id === viewingTerritory.id)

  const commands = useStrategyCommands({
    state, onUpdateState, onDialog, dialogues,
    selectedCharId, viewingTerritory, playerFaction,
    setToast, setSplash, setSplashVisible, setFocusTarget, focusKeyRef,
  })

  return (
    <div className="relative space-y-3">

      {/* 영토 전환 스플래시 */}
      {splash && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none transition-opacity duration-500"
              style={{ opacity: splashVisible ? 1 : 0 }}
            >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(/images/game/suikoden/territories/${splash.id}.png)` }}
          />
            <div className="absolute inset-0 bg-black/50" />
            <span className="relative text-2xl font-serif text-white/90 tracking-widest drop-shadow-lg">
              【{splash.name}】
          </span>
        </div>
      )}

      {/* 토스트 알림 — absolute, 레이아웃 무영향 */}
      {toast && (
        <div className="absolute top-0 left-1/2 z-30 w-[calc(100vw_-_2rem)] max-w-[32rem] -translate-x-1/2">
          <div className="break-words whitespace-normal rounded border border-amber-500/30 bg-stone-900 px-4 py-2 text-center text-xs text-amber-300 shadow-lg">
            {toast}
          </div>
        </div>
      )}

      {/* 가이드 모달 */}
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="bg-stone-800 border border-amber-500/30 rounded-lg shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-5 space-y-3 animate-modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-amber-300">{text.strategy.helpTitle}</h3>
              <button onClick={() => setShowHelp(false)} className="text-text-secondary hover:text-text-primary text-xs">✕</button>
            </div>
            <div className="text-xs text-text-primary space-y-2 leading-relaxed">
              <p><b className="text-amber-400">{text.strategy.helpTurnLabel}</b>: {text.strategy.helpTurnDesc}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2 bg-stone-900 rounded">
                  <p className="font-bold text-text-primary mb-1">{text.strategy.helpBuildTitle}</p>
                  <p>{text.strategy.helpBuildDesc}</p>
                </div>
                <div className="p-2 bg-stone-900 rounded">
                  <p className="font-bold text-text-primary mb-1">{text.strategy.helpAssignTitle}</p>
                  <p>{text.strategy.helpAssignDesc}</p>
                </div>
                <div className="p-2 bg-stone-900 rounded">
                  <p className="font-bold text-text-primary mb-1">{text.strategy.helpBattleTitle}</p>
                  <p>{text.strategy.helpBattleDesc}</p>
                </div>
                <div className="p-2 bg-stone-900 rounded">
                  <p className="font-bold text-text-primary mb-1">{text.strategy.helpDiplomacyTitle}</p>
                  <p>{text.strategy.helpDiplomacyDesc}</p>
                </div>
              </div>

              {/* 스탯 가이드 */}
              <div className="border-t border-stone-700 pt-2 mt-1">
                <p className="font-bold text-amber-400 mb-1.5">{text.strategy.helpStatsTitle}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                  <p>{text.strategy.helpStat1}</p>
                  <p>{text.strategy.helpStat2}</p>
                  <p>{text.strategy.helpStat3}</p>
                  <p>{text.strategy.helpStat4}</p>
                  <p>{text.strategy.helpStat5}</p>
                  <p>{text.strategy.helpStat6}</p>
                  <p>{text.strategy.helpStat7}</p>
                </div>
                <p className="text-[10px] text-text-secondary mt-1.5">{text.strategy.helpFooter}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUD — 상태 표시줄 (읽기 전용) */}
      <PanelLabel name={text.strategy.panelResources} />
      <GameHUD state={state} />

      {/* 도구바 — 내 영토: 풀 도구바, 적 영토: 복귀 버튼 */}
      <PanelLabel name={text.strategy.panelToolbar} />
      {viewingTerritory && isViewingOwn ? (
        <GameToolbar
          state={state}
          territory={viewingTerritory}
          onNextTurn={commands.handleNextTurn}
          onToggleAutoAssign={commands.handleToggleAutoAssign}
          onAttack={commands.handleAttack}
          onClaim={commands.handleClaim}
          onDiplomacy={commands.handleDiplomacy}
          onSetTaxRate={commands.handleSetTaxRate}
          onAbandon={commands.handleAbandon}
          onGoHome={commands.handleGoHome}
          onToggleDialogMode={commands.handleToggleDialogMode}
        />
      ) : viewingTerritory && !isViewingOwn ? (
        <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-2 flex items-center gap-3">
          <button
            onClick={commands.handleGoHome}
            className="px-3 py-1.5 bg-amber-700/50 hover:bg-amber-700 text-amber-200 text-xs font-bold rounded"
          >
            {text.strategy.goMain}
          </button>
          <span className="text-[11px] text-text-secondary">
            {state.factions.some(f => f.territories.some(t => t.id === viewingTerritory.id))
              ? text.toolbar.viewingForeignTerritory
              : text.toolbar.unclaimedTerritory(tS(`territory.${viewingTerritory.id}`))}
          </span>
        </div>
      ) : null}

      {/* 메인 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* 좌측: 건물 칩 리스트 (2/3) */}
        <div className="lg:col-span-2 space-y-3">
          <PanelLabel name={text.strategy.panelBuildings} />
          {viewingTerritory && isViewingOwn && (
            <BuildingCardGrid
              state={state}
              territory={viewingTerritory}
              selectedCharId={selectedCharId}
              onSelectChar={setSelectedCharId}
              onBuild={commands.handleBuild}
              onReassign={commands.handleReassign}
              onUnassign={commands.handleUnassign}
              onDemolish={commands.handleDemolish}
              onAssignRecruiter={commands.handleAssignRecruiter}
              onCancelRecruiter={commands.handleCancelRecruiter}
              onDispatch={commands.handleDispatch}
              onRecall={commands.handleRecall}
              onToast={commands.showToast}
            />
          )}

          {/* 적/무주지 — 플레이어 화면과 동일한 BuildingCardGrid (readOnly) */}
          {viewingTerritory && !isViewingOwn && (() => {
            const owner = state.factions.find(f => f.territories.some(t => t.id === viewingTerritory.id))

            if (!owner) {
              return (
                <div className="border border-stone-700 rounded-lg p-6 bg-stone-800/60 text-center space-y-3">
                  <p className="text-text-secondary">{text.strategy.noOneOccupies}</p>
                  <button
                    onClick={() => commands.handleClaim(viewingTerritory.id)}
                    className="px-6 py-3 bg-green-900/50 border border-green-700 rounded-lg hover:bg-green-800/60 hover:border-green-500 text-sm text-stone-100 font-bold"
                  >
                    {text.strategy.claim}
                  </button>
                </div>
              )
            }

            return (
              <BuildingCardGrid
                state={state}
                territory={viewingTerritory}
                selectedCharId={null}
                onSelectChar={() => {}}
                onBuild={() => {}}
                onReassign={() => {}}
                onUnassign={() => {}}
                onDemolish={() => {}}
                onAssignRecruiter={() => {}}
                onCancelRecruiter={() => {}}
                onDispatch={() => {}}
                onRecall={() => {}}
                onToast={() => {}}
                readOnly
                factionOverrideId={owner.id}
              />
            )
          })()}

          {/* 이벤트 로그 */}
          <PanelLabel name={text.strategy.panelLogs} />
          <div className="border border-stone-700 rounded-lg p-2 bg-stone-800/50 max-h-24 overflow-y-auto">
            {state.log.slice(-8).reverse().map((l, i) => (
              <p key={i} className="text-[9px] text-text-secondary leading-relaxed">{translateSuikodenMessage(l, locale, {
                translateTerritory: (id) => tS(`territory.${id}`),
                translateRegion: (id) => tS(`region.${id}`),
              })}</p>
            ))}
          </div>
        </div>

        {/* 우측 패널 (1/3) */}
        <StrategyRightPanel
          state={state}
          mapMode={mapMode}
          setMapMode={setMapMode}
          mapOpen={mapOpen}
          setMapOpen={setMapOpen}
          charPanelOpen={charPanelOpen}
          setCharPanelOpen={setCharPanelOpen}
          selectedCharId={selectedCharId}
          playerFaction={playerFaction}
          focusTarget={focusTarget}
          handleSelectTerritory={commands.handleSelectTerritory}
          handleIdle={commands.handleIdle}
          handleTrain={commands.handleTrain}
          handleReward={commands.handleReward}
          handlePunish={commands.handlePunish}
          handleReinforce={commands.handleReinforce}
          showHelp={showHelp}
          setShowHelp={setShowHelp}
          text={text}
        />
      </div>
    </div>
  )
}

function PanelLabel({ name }: { name: string }) {
  return (
    <div className="text-[9px] text-text-secondary uppercase tracking-wider mb-0.5">{name}</div>
  )
}
