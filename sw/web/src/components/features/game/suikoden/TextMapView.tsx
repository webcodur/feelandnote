'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { GameState, RegionId, TerritoryId } from '@/lib/game/suikoden/types'
import { REGIONS, TERRITORIES } from '@/lib/game/suikoden/constants'
import { getSuikodenText, stripSuikodenFactionSuffix } from './i18n'

interface Props {
  state: GameState
  viewingTerritoryId?: TerritoryId | null
  selectedTerritoryId?: TerritoryId | null
  currentRegionId?: RegionId | null
  onSelectTerritory: (tid: TerritoryId) => void
  onSelectRegion?: (rid: RegionId) => void
  phase: 'wandering' | 'strategy'
}

export default function TextMapView({
  state, viewingTerritoryId, selectedTerritoryId,
  currentRegionId, onSelectTerritory, onSelectRegion, phase,
}: Props) {
  const locale = useLocale()
  const tS = useTranslations('rest.arena.suikoden')
  const text = getSuikodenText(locale)
  const [focusedRegion, setFocusedRegion] = useState<RegionId | null>(null)

  const viewingRegionId = phase === 'wandering'
    ? currentRegionId
    : TERRITORIES.find(t => t.id === viewingTerritoryId)?.regionId ?? null

  const focusedNeighbors = focusedRegion
    ? REGIONS.find(r => r.id === focusedRegion)?.neighbors ?? []
    : []

  const getOwner = (tid: TerritoryId) =>
    state.factions.find(f => f.territories.some(t => t.id === tid))

  return (
    <div
      className="max-h-[420px] overflow-y-auto"
      style={{ fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column', gap: '3px' }}
    >
      {REGIONS.filter(r =>
        state.activeRegionIds.length === 0 || state.activeRegionIds.includes(r.id)
      ).map(region => {
        const isCurrent = region.id === viewingRegionId
        const isFocused = region.id === focusedRegion
        const isLinked = focusedNeighbors.includes(region.id)
          && (state.activeRegionIds.length === 0 || state.activeRegionIds.includes(region.id))
        const activeSet = state.activeTerritoryIds.length > 0 ? new Set(state.activeTerritoryIds) : null
        const regionTerritories = TERRITORIES.filter(t =>
          t.regionId === region.id && (!activeSet || activeSet.has(t.id))
        )

        return (
          <div
            key={region.id}
            onClick={() => setFocusedRegion(prev => prev === region.id ? null : region.id)}
            className={`flex items-center gap-2.5 py-2 rounded-md border cursor-pointer transition-all duration-200 ${
              isFocused
                ? 'border-sky-400/50 bg-gradient-to-r from-sky-950/40 to-sky-900/20'
                : isLinked
                  ? 'border-sky-600/20 bg-sky-950/15'
                  : 'border-stone-700/30 bg-stone-900/30 hover:border-stone-600/40 hover:bg-stone-800/30'
            }`}
            style={{
              paddingLeft: isCurrent ? '7px' : '10px',
              paddingRight: '10px',
              borderLeftWidth: isCurrent ? '3px' : undefined,
              borderLeftColor: isCurrent ? 'rgba(251,191,36,0.6)' : undefined,
            }}
          >
            {/* 1열: 마커 */}
            <div className="shrink-0 flex items-center justify-center w-4 relative">
              {isCurrent && (
                <span
                  className="absolute w-2.5 h-2.5 rounded-full animate-ping"
                  style={{ backgroundColor: region.color, opacity: 0.4 }}
                />
              )}
              <span
                className={`relative block w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                  isFocused ? 'scale-125 shadow-[0_0_6px_var(--glow)]' : ''
                }`}
                style={{
                  backgroundColor: region.color,
                  '--glow': region.color,
                } as React.CSSProperties}
              />
            </div>

            {/* 2열: 지역명 */}
            <div
              className={`shrink-0 w-[56px] text-[11px] font-bold leading-none tracking-wide transition-colors duration-200 ${
                isFocused
                  ? 'text-sky-200'
                  : isLinked
                    ? 'text-sky-400/70'
                    : isCurrent
                      ? 'text-amber-300'
                      : 'text-stone-300'
              }`}
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {tS(`region.${region.id}`)}
            </div>

            {/* 3열: 거점 */}
            <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
              {regionTerritories.map(tDef => {
                const owner = getOwner(tDef.id)
                const isPlayer = owner?.id === state.playerFactionId
                const isViewing = tDef.id === viewingTerritoryId || tDef.id === selectedTerritoryId

                return (
                  <button
                    key={tDef.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectTerritory(tDef.id)
                    }}
                    title={`${tS(`territory.${tDef.id}`)}${owner ? ` (${stripSuikodenFactionSuffix(owner.name)})` : ` (${text.map.unclaimed})`}`}
                    style={{ fontFamily: 'var(--font-sans)', fontWeight: isViewing ? 700 : 400 }}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition-all duration-150 ${
                      isViewing
                        ? 'border-amber-400/60 bg-amber-900/30 text-amber-200 shadow-[0_0_4px_rgba(251,191,36,0.15)]'
                        : isPlayer
                          ? 'border-red-500/40 bg-red-950/20 text-red-300 hover:border-red-400/60 hover:bg-red-900/25'
                          : owner
                            ? 'border-stone-600/40 text-stone-300 hover:text-stone-100 hover:border-stone-500/60 hover:bg-stone-800/40'
                            : 'border-stone-700/30 text-stone-400 hover:text-stone-200 hover:border-stone-600/50 hover:bg-stone-800/30'
                    }`}
                  >
                    {isPlayer && <span className="text-red-400 mr-0.5">★</span>}
                    {tS(`territory.${tDef.id}`)}
                    {owner && (
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full ml-1 align-middle"
                        style={{ backgroundColor: owner.color }}
                      />
                    )}
                  </button>
                )
              })}

              {/* 이동 버튼 */}
              {isLinked && phase === 'wandering' && viewingRegionId && focusedRegion === viewingRegionId && onSelectRegion && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectRegion(region.id)
                  }}
                  style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}
                  className="text-[9px] px-2 py-0.5 rounded bg-amber-700/50 hover:bg-amber-600/60 text-amber-200 transition-colors ml-auto border border-amber-600/30"
                >
                  {text.map.move}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
