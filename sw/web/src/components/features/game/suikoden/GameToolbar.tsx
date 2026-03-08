'use client'

import { useState, useEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { GameState, Territory, TerritoryId, TaxRate } from '@/lib/game/suikoden/types'
import { BUILDING_CATEGORY, BUILDING_CATEGORY_INFO, WANDERING_MAX_COMPANIONS } from '@/lib/game/suikoden/constants'
import { getRelation, isAllied } from '@/lib/game/suikoden/diplomacy'
import { getActiveNeighborInfo, getTotalPower } from '@/lib/game/suikoden/utils'
import { getSuikodenText, stripSuikodenFactionSuffix } from './i18n'

interface Props {
  state: GameState
  territory: Territory
  onNextTurn: () => void
  onToggleAutoAssign: () => void
  onAttack: (targetTerritoryId: TerritoryId) => void
  onClaim: (territoryId: TerritoryId) => void
  onDiplomacy: (action: string, targetFactionId: string) => void
  onSetTaxRate: (rate: TaxRate) => void
  onAbandon: () => void
  onGoHome?: () => void
  onToggleDialogMode?: () => void
}

type DropdownId = 'develop' | 'military' | 'diplomacy' | 'etc'

export default function GameToolbar({
  state, territory,
  onNextTurn,
  onToggleAutoAssign,
  onAttack, onClaim, onDiplomacy, onSetTaxRate, onAbandon, onGoHome, onToggleDialogMode,
}: Props) {
  const locale = useLocale()
  const tS = useTranslations('rest.arena.suikoden')
  const text = getSuikodenText(locale)
  const [openDropdown, setOpenDropdown] = useState<DropdownId | null>(null)
  const [confirmAbandon, setConfirmAbandon] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const playerFaction = state.factions.find(f => f.id === state.playerFactionId)!

  // 외부 클릭 시 닫힘
  useEffect(() => {
    if (!openDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
        setConfirmAbandon(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openDropdown])

  const toggleDropdown = (id: DropdownId) => {
    setOpenDropdown(prev => prev === id ? null : id)
    setConfirmAbandon(false)
  }

  // 인접 영토
  const neighbors = getActiveNeighborInfo(state, territory.id)
  const relationLabel = (relation: number, allied: boolean) => {
    if (allied) return text.toolbar.allied
    if (relation > 0) return text.toolbar.friendly(relation)
    if (relation < 0) return text.toolbar.hostile(relation)
    return text.toolbar.neutral
  }

  return (
    <div className="bg-stone-800/80 border border-stone-700 rounded-lg p-2" ref={dropdownRef}>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {/* 다음 턴 */}
        <button
          onClick={onNextTurn}
          className="px-3 py-1 text-[11px] font-bold rounded bg-amber-600 text-stone-900 hover:bg-amber-500 active:bg-amber-700 transition-colors"
        >
          {text.toolbar.nextTurn}
        </button>

        <div className="w-px h-4 bg-stone-600" />

        {/* 본진 복귀 */}
        {onGoHome && playerFaction.territories.length > 0 &&
          state.viewingTerritoryId !== playerFaction.territories[0].id && (
          <ToolButton
            label={text.toolbar.returnHome}
            onClick={onGoHome}
          />
        )}

        {/* 기본 버튼 */}
        <div className="flex items-center gap-1">
          <ToolButton
            label={state.autoAssign ? text.toolbar.autoOn : text.toolbar.autoOff}
            active={state.autoAssign}
            onClick={onToggleAutoAssign}
          />
          {onToggleDialogMode && (
            <ToolButton
              label={state.settings.dialogMode === 'auto' ? text.toolbar.dialogAuto : text.toolbar.dialogManual}
              active={state.settings.dialogMode === 'manual'}
              onClick={onToggleDialogMode}
            />
          )}
        </div>

        <div className="w-px h-4 bg-stone-600" />

        {/* 드롭다운 4개 */}
        <div className="flex items-center gap-1 relative">
          {/* 내정 */}
          <div className="relative">
            <DropdownButton label={text.toolbar.develop} isOpen={openDropdown === 'develop'} onClick={() => toggleDropdown('develop')} />
            {openDropdown === 'develop' && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-stone-900 border border-stone-600 rounded shadow-xl min-w-[200px] p-2 space-y-2">
                {/* 세율 조정 */}
                <div>
                  <div className="text-[10px] text-stone-500 mb-1">{text.toolbar.tax}</div>
                  <div className="flex gap-1">
                    {(['low', 'normal', 'high'] as const).map(rate => (
                      <button
                        key={rate}
                        onClick={() => { onSetTaxRate(rate); setOpenDropdown(null) }}
                        className={`flex-1 py-1 text-[10px] rounded transition-colors ${
                          territory.taxRate === rate
                            ? rate === 'high' ? 'bg-red-900/50 text-red-300 font-bold'
                              : rate === 'low' ? 'bg-green-900/50 text-green-300 font-bold'
                              : 'bg-amber-900/50 text-amber-300 font-bold'
                            : 'bg-stone-700 text-stone-500 hover:bg-stone-600'
                          }`}
                      >
                        {rate === 'low' ? text.toolbar.taxLow : rate === 'high' ? text.toolbar.taxHigh : text.toolbar.taxNormal}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 건물 현황 요약 */}
                <div className="border-t border-stone-700 pt-1.5 space-y-0.5">
                  <div className="text-[10px] text-stone-500 mb-1">{text.toolbar.buildingStatus}</div>
                  {Object.entries(BUILDING_CATEGORY_INFO).map(([catId, catInfo]) => {
                    const catCards = territory.buildingCards.filter(c => BUILDING_CATEGORY[c.defId] === catId)
                    if (catCards.length === 0) return null
                    return (
                      <div key={catId} className="flex items-center gap-2 text-[10px]">
                        <span style={{ color: catInfo.color }}>{catInfo.icon} {tS(`bldgCat.${catId}`)}</span>
                        <span className="text-stone-500">{text.toolbar.buildingCount(catCards.length)}</span>
                        <span className="text-stone-600">
                          {text.toolbar.buildingConstructing(catCards.filter(c => c.isConstructing).length)}
                        </span>
                      </div>
                    )
                  })}
                  {territory.buildingCards.length === 0 && (
                    <p className="text-[10px] text-stone-600">{text.toolbar.noBuildings}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 군사 */}
          <div className="relative">
            <DropdownButton label={text.toolbar.military} isOpen={openDropdown === 'military'} onClick={() => toggleDropdown('military')} />
            {openDropdown === 'military' && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-stone-900 border border-stone-600 rounded shadow-xl min-w-[180px] p-2 space-y-1">
                {neighbors.map(n => (
                  <div key={n.id} className="flex items-center justify-between py-1 text-xs">
                    <span className="text-stone-300">{tS(`territory.${n.id}`)}</span>
                    {n.owner ? (
                      n.owner.id !== state.playerFactionId ? (
                        <button
                          onClick={() => { onAttack(n.id); setOpenDropdown(null) }}
                          className="px-2 py-1 bg-red-900/80 rounded text-red-200 hover:bg-red-800 font-bold text-[10px]"
                        >
                          {text.toolbar.invade}
                        </button>
                      ) : (
                        <span className="text-stone-600 text-[10px]">{text.toolbar.ally}</span>
                      )
                    ) : (
                      <button
                          onClick={() => { onClaim(n.id); setOpenDropdown(null) }}
                          className="px-2 py-1 bg-green-900/80 rounded text-green-200 hover:bg-green-800 text-[10px]"
                        >
                          {text.toolbar.claim}
                        </button>
                      )}
                  </div>
                ))}
                {neighbors.length === 0 && (
                  <p className="text-[10px] text-stone-500">{text.toolbar.noAdjacentTerritories}</p>
                )}
              </div>
            )}
          </div>

          {/* 외교 */}
          <div className="relative">
            <DropdownButton label={text.toolbar.diplomacy} isOpen={openDropdown === 'diplomacy'} onClick={() => toggleDropdown('diplomacy')} />
            {openDropdown === 'diplomacy' && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-stone-900 border border-stone-600 rounded shadow-xl min-w-[220px] max-w-[280px] p-2 space-y-2">
                {state.factions.filter(f => f.id !== state.playerFactionId && f.territories.length > 0).map(f => {
                  const relation = getRelation(state, f.id)
                  const allied = isAllied(state, f.id)
                  const ourPower = getTotalPower(playerFaction)
                  const theirPower = getTotalPower(f)
                  const canSurrender = theirPower <= ourPower * 0.3

                  return (
                    <div key={f.id} className="p-2 bg-stone-800 rounded space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                        <span className="flex-1 text-xs text-stone-200 truncate font-bold">{stripSuikodenFactionSuffix(f.name)}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                          allied ? 'bg-green-900/50 text-green-300' :
                          relation > 0 ? 'text-blue-400' :
                          relation < -30 ? 'text-red-400' : 'text-stone-500'
                        }`}>
                          {relationLabel(relation, allied)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        {!allied && (
                          <button
                            onClick={() => { onDiplomacy('alliance', f.id); setOpenDropdown(null) }}
                            disabled={playerFaction.resources.gold < 200}
                            className="flex-1 py-1 text-[10px] bg-stone-700 rounded text-blue-300 hover:bg-stone-600 disabled:opacity-30"
                          >
                            {text.toolbar.alliance}
                          </button>
                        )}
                        <button
                          onClick={() => { onDiplomacy('ceasefire', f.id); setOpenDropdown(null) }}
                          disabled={playerFaction.resources.gold < 100}
                          className="flex-1 py-1 text-[10px] bg-stone-700 rounded text-stone-300 hover:bg-stone-600 disabled:opacity-30"
                        >
                          {text.toolbar.ceasefire}
                        </button>
                        <button
                          onClick={() => { onDiplomacy('tribute', f.id); setOpenDropdown(null) }}
                          disabled={playerFaction.resources.gold < 100}
                          className="flex-1 py-1 text-[10px] bg-stone-700 rounded text-amber-300 hover:bg-stone-600 disabled:opacity-30"
                        >
                          {text.toolbar.tribute}
                        </button>
                        {canSurrender && (
                          <button
                            onClick={() => { onDiplomacy('surrender', f.id); setOpenDropdown(null) }}
                            className="flex-1 py-1 text-[10px] bg-red-900/50 rounded text-red-300 hover:bg-red-800/50"
                          >
                            {text.toolbar.surrender}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {state.factions.filter(f => f.id !== state.playerFactionId && f.territories.length > 0).length === 0 && (
                  <p className="text-[10px] text-stone-500">{text.toolbar.noOtherFactions}</p>
                )}
              </div>
            )}
          </div>

          {/* 기타 */}
          <div className="relative">
            <DropdownButton label={text.toolbar.misc} isOpen={openDropdown === 'etc'} onClick={() => toggleDropdown('etc')} />
            {openDropdown === 'etc' && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-stone-900 border border-stone-600 rounded shadow-xl min-w-[200px] p-2">
                <p className="text-[10px] text-stone-400 mb-2">
                  {text.toolbar.abandonHint(WANDERING_MAX_COMPANIONS)}
                </p>
                {!confirmAbandon ? (
                  <button
                    onClick={() => setConfirmAbandon(true)}
                    className="w-full py-1.5 bg-stone-700 rounded text-xs text-red-300 hover:bg-stone-600 transition-colors"
                  >
                    {text.toolbar.abandon}
                  </button>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] text-red-400 font-bold text-center">{text.toolbar.abandonConfirm}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onAbandon(); setConfirmAbandon(false); setOpenDropdown(null) }}
                        className="flex-1 py-1.5 bg-red-900/60 rounded text-xs text-red-200 hover:bg-red-800 font-bold"
                      >
                        {text.toolbar.abandonExecute}
                      </button>
                      <button
                        onClick={() => setConfirmAbandon(false)}
                        className="flex-1 py-1.5 bg-stone-700 rounded text-xs text-stone-400 hover:bg-stone-600"
                      >
                        {text.common.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 현재 영토명 */}
        <span className="ml-auto text-[10px] text-stone-500">{tS(`territory.${territory.id}`)}</span>
      </div>
    </div>
  )
}

function ToolButton({ label, disabled, active, onClick }: {
  label: string; disabled?: boolean; active?: boolean; onClick: () => void
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`px-2 py-1 rounded transition-colors text-[11px] ${
        active
          ? 'bg-amber-700/50 text-amber-200'
          : disabled
            ? 'text-stone-600 cursor-not-allowed'
            : 'text-stone-400 hover:bg-stone-700 hover:text-stone-200'
      }`}
    >
      {label}
    </button>
  )
}

function DropdownButton({ label, isOpen, onClick }: {
  label: string; isOpen: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded transition-colors text-[11px] flex items-center gap-0.5 ${
        isOpen
          ? 'bg-stone-700 text-amber-300'
          : 'text-stone-400 hover:bg-stone-700 hover:text-stone-200'
      }`}
    >
      {label}
      <span className="text-[8px]">{isOpen ? '\u25B4' : '\u25BE'}</span>
    </button>
  )
}

