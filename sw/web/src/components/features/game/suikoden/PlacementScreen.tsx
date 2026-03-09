'use client'

import { useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import type { BattleState, BattleUnit, GridPosition } from '@/lib/game/suikoden/types'
import { BATTLE_GRID_ROWS, BATTLE_GRID_COLS, CLASS_INFO, CLASS_DEFAULT_ROW } from '@/lib/game/suikoden/constants'
import CharacterPortrait from './CharacterPortrait'
import { getSuikodenText } from './i18n'

interface Props {
  state: BattleState
  onConfirm: (allies: BattleUnit[]) => void
}

export default function PlacementScreen({ state, onConfirm }: Props) {
  const locale = useLocale()
  const text = getSuikodenText(locale)
  const [allies, setAllies] = useState<BattleUnit[]>(state.allies)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleCellClick = useCallback((row: number, col: number) => {
    if (!selectedId) return

    // 셀이 비었으면 이동
    const occupied = allies.find(u => u.position.row === row && u.position.col === col)
    if (occupied && occupied.id !== selectedId) {
      // 스왑
      setAllies(prev => prev.map(u => {
        if (u.id === selectedId) return { ...u, position: { row, col } }
        if (u.id === occupied.id) {
          const selected = prev.find(p => p.id === selectedId)!
          return { ...u, position: selected.position }
        }
        return u
      }))
    } else if (!occupied) {
      setAllies(prev => prev.map(u =>
        u.id === selectedId ? { ...u, position: { row, col } } : u
      ))
    }
    setSelectedId(null)
  }, [selectedId, allies])

  // 3×5 그리드
  const grid: (BattleUnit | null)[][] = Array.from({ length: BATTLE_GRID_ROWS }, () =>
    Array.from({ length: BATTLE_GRID_COLS }, () => null)
  )
  for (const unit of allies) {
    const { row, col } = unit.position
    if (row >= 0 && row < BATTLE_GRID_ROWS && col >= 0 && col < BATTLE_GRID_COLS) {
      grid[row][col] = unit
    }
  }

  const rowLabels = [text.battle.row.front, text.battle.row.middle, text.battle.row.rear]

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-sm font-bold text-text-primary">{text.placement.title}</h3>
        <p className="text-[10px] text-text-secondary mt-1">{text.placement.subtitle}</p>
      </div>

      {/* 그리드 */}
      <div className="space-y-1">
        {grid.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-1">
            <span className="text-[9px] text-text-secondary w-6 text-right shrink-0">
              {rowLabels[rowIdx]}
            </span>
            <div className="flex gap-1">
              {row.map((unit, colIdx) => {
                const isSelected = unit?.id === selectedId

                return (
                  <button
                    key={colIdx}
                    onClick={() => {
                      if (unit) {
                        setSelectedId(prev => prev === unit.id ? null : unit.id)
                      } else if (selectedId) {
                        handleCellClick(rowIdx, colIdx)
                      }
                    }}
                    className={`w-14 h-16 rounded border transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-900/30 ring-1 ring-amber-400'
                        : unit
                          ? 'border-stone-600 bg-stone-800 hover:border-stone-500'
                          : selectedId
                            ? 'border-stone-600 bg-stone-800/50 hover:border-amber-500/50 cursor-pointer'
                            : 'border-stone-800 bg-stone-900/30'
                    }`}
                  >
                    {unit ? (
                      <div className="flex flex-col items-center gap-0.5 p-0.5">
                        <CharacterPortrait character={unit.character} size={28} />
                        <span className="text-[7px] text-text-secondary truncate w-full text-center">
                          {unit.character.nickname.slice(0, 4)}
                        </span>
                        <span className="text-[7px] text-text-secondary">
                          {CLASS_INFO[unit.character.unitClass].icon}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        {selectedId && <span className="text-stone-700 text-xs">+</span>}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 적군 배치 미리보기 */}
      <div className="border-t border-stone-700 pt-3">
        <p className="text-[9px] text-text-secondary mb-1.5">{text.placement.enemyPreview}</p>
        <div className="flex flex-wrap gap-1">
          {state.enemies.map(u => (
            <div key={u.id} className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-800 rounded border border-red-800/30">
              <CharacterPortrait character={u.character} size={20} />
              <span className="text-[8px] text-text-secondary">{u.character.nickname.slice(0, 4)}</span>
              <span className="text-[7px] text-text-secondary">{CLASS_INFO[u.character.unitClass].icon}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 확인 버튼 */}
      <button
        onClick={() => onConfirm(allies)}
        className="w-full py-2.5 bg-amber-600 rounded text-sm text-stone-900 font-bold hover:bg-amber-500 transition-colors"
      >
        {text.placement.confirm}
      </button>
    </div>
  )
}
