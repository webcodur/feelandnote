'use client'

import { useLocale } from 'next-intl'
import type { BattleUnit, BattleAnimation } from '@/lib/game/suikoden/types'
import { BATTLE_GRID_ROWS, BATTLE_GRID_COLS, CLASS_INFO } from '@/lib/game/suikoden/constants'
import CharacterPortrait from './CharacterPortrait'
import { getSuikodenText } from './i18n'

interface Props {
  units: BattleUnit[]
  isAlly: boolean
  currentUnitId: string | null
  selectedTargetId: string | null
  validTargetIds: string[]
  animation: BattleAnimation | null
  onSelectTarget?: (unitId: string) => void
}

export default function BattleGridView({
  units, isAlly, currentUnitId, selectedTargetId, validTargetIds, animation, onSelectTarget,
}: Props) {
  const locale = useLocale()
  const text = getSuikodenText(locale)
  const rowLabels = [text.battle.row.front, text.battle.row.middle, text.battle.row.rear]
  // 3행×5열 그리드 생성
  const grid: (BattleUnit | null)[][] = Array.from({ length: BATTLE_GRID_ROWS }, () =>
    Array.from({ length: BATTLE_GRID_COLS }, () => null)
  )
  for (const unit of units) {
    const { row, col } = unit.position
    if (row >= 0 && row < BATTLE_GRID_ROWS && col >= 0 && col < BATTLE_GRID_COLS) {
      grid[row][col] = unit
    }
  }

  // 아군은 열을 역순 (좌향), 적군은 정순 (우향)
  const rows = isAlly
    ? grid.map(row => [...row].reverse())
    : grid

  return (
    <div className="space-y-0.5">
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex items-center gap-0.5">
          <span className="text-[8px] text-stone-600 w-5 shrink-0 text-right">
            {rowLabels[rowIdx]}
          </span>
          <div className="flex gap-0.5">
            {row.map((unit, colIdx) => {
              if (!unit) {
                return (
                  <div
                    key={colIdx}
                    className="w-12 h-14 border border-stone-800 rounded bg-stone-900/30"
                  />
                )
              }

              const isValid = validTargetIds.includes(unit.id)
              const isSelected = unit.id === selectedTargetId
              const isCurrent = unit.id === currentUnitId
              const hpRatio = unit.hp / unit.maxHp
              const cls = CLASS_INFO[unit.character.unitClass]

              // 애니메이션 하이라이트
              const isAnimTarget = animation?.targetId === unit.id
              const isAnimActor = animation?.actorId === unit.id

              return (
                <button
                  key={colIdx}
                  onClick={() => isValid && onSelectTarget?.(unit.id)}
                  disabled={!isValid && !isCurrent}
                  className={`relative w-12 h-14 rounded border transition-all ${
                    unit.isDefeated
                      ? 'border-stone-700 opacity-30'
                      : isCurrent
                        ? 'border-amber-400 bg-amber-900/20 ring-1 ring-amber-400'
                        : isSelected
                          ? 'border-red-400 bg-red-900/20 ring-1 ring-red-400'
                          : isValid
                            ? 'border-red-500/50 bg-red-900/10 hover:bg-red-900/20 cursor-pointer'
                            : 'border-stone-700 bg-stone-800/50'
                  } ${isAnimTarget ? 'animate-pulse' : ''} ${isAnimActor ? 'scale-105' : ''}`}
                >
                  {/* 초상화 */}
                  <div className="flex justify-center pt-0.5">
                    <CharacterPortrait character={unit.character} size={24} />
                  </div>

                  {/* HP 바 */}
                  <div className="mx-0.5 mt-0.5">
                    <div className="h-1 bg-stone-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${hpRatio * 100}%`,
                          backgroundColor: hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.2 ? '#eab308' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>

                  {/* 이름 */}
                  <div className="text-[7px] text-center text-stone-400 truncate px-0.5 leading-tight">
                    {unit.character.nickname.slice(0, 3)}
                  </div>

                  {/* 격파 오버레이 */}
                  {unit.isDefeated && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded">
                      <span className="text-red-500 font-bold text-[8px]">{text.battle.defeated}</span>
                    </div>
                  )}

                  {/* 리더 표시 */}
                  {unit.isLeader && !unit.isDefeated && (
                    <div className="absolute -top-1 -right-1 text-[7px] text-amber-400">★</div>
                  )}

                  {/* 상태이상 아이콘 */}
                  {unit.statusEffects.length > 0 && !unit.isDefeated && (
                    <div className="absolute -top-1 -left-1 text-[8px]">
                      {unit.statusEffects.map(e =>
                        e.type === 'confused' ? '😵' :
                        e.type === 'defending' ? '🛡️' :
                        e.type === 'shielded' ? '✨' :
                        e.type === 'trapped' ? '⚙️' : ''
                      ).join('')}
                    </div>
                  )}

                  {/* 대미지 표시 */}
                  {isAnimTarget && animation?.damage && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-red-400 font-bold text-[10px] animate-bounce">
                      -{animation.damage}
                    </div>
                  )}
                  {isAnimTarget && animation?.heal && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-green-400 font-bold text-[10px] animate-bounce">
                      +{animation.heal}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
