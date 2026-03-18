'use client'

import { useState } from 'react'
import type { useTranslations } from 'next-intl'
import type { GameCharacter } from '@/lib/game/suikoden/types'
import { GRADE_COLORS } from '@/lib/game/suikoden/constants'
import CharacterPortrait from '../../CharacterPortrait'

export default function BuildingSlot({
  tS, buildingName, buildingDefId, index, isConstructing, isResting, turnsLeft, buildTurnsTotal,
  character, catColor, isDragOver, isSelected,
  onDragOver, onDragLeave, onDrop,
  onDragStartChar, onClickChar, onClickAssign, onClickAssignHint,
  onUnassign, onDemolish, onClickInfo, readOnly,
}: {
  tS: ReturnType<typeof useTranslations>
  buildingName: string
  buildingDefId: string
  index?: number
  isConstructing: boolean
  isResting?: boolean
  turnsLeft: number
  buildTurnsTotal: number
  character: GameCharacter | null
  catColor: string
  isDragOver: boolean
  isSelected: boolean
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: () => void
  onDrop?: (e: React.DragEvent) => void
  onDragStartChar?: (e: React.DragEvent) => void
  onClickChar?: () => void
  onClickAssign?: () => void
  onClickAssignHint?: () => void
  onUnassign?: () => void
  onDemolish?: () => void
  onClickInfo?: () => void
  readOnly?: boolean
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className={`relative rounded border min-w-[100px] transition-all ${
        isDragOver
          ? 'border-amber-400 bg-amber-500/15 ring-1 ring-amber-400/50'
          : isConstructing
            ? 'border-stone-600 bg-stone-700/30'
            : character
              ? 'border-stone-500 bg-stone-800/30'
              : 'border-stone-600 bg-stone-800/50 border-dashed'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* 건물 헤더 */}
      <div
        className={`flex items-center justify-between px-1.5 py-1 rounded-t transition-colors ${readOnly ? '' : 'cursor-pointer hover:bg-stone-700/30'}`}
        onClick={readOnly ? undefined : (e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
      >
        <span
          className="text-[10px] font-bold text-text-secondary hover:text-amber-300 transition-colors"
          onClick={(e) => { e.stopPropagation(); onClickInfo?.() }}
        >
          {buildingName}{index != null ? index : ''}
        </span>
        {isConstructing ? (
          <span className="text-[9px] text-amber-500/80">{tS('mgmt.buildProgress', { current: buildTurnsTotal - turnsLeft, total: buildTurnsTotal })}</span>
        ) : character && !isResting ? (
          <span className="text-[9px] text-emerald-400">{tS('mgmt.fullCapacity')}</span>
        ) : character && isResting ? (
          <span className="text-[9px] text-text-secondary">{tS('mgmt.resting')}</span>
        ) : (
          <span className="text-[9px] text-text-secondary">{tS('mgmt.operating')}</span>
        )}
      </div>

      {/* 인물 카드 */}
      <div className="px-1.5 pb-1.5">
        {character ? (
          <div
            draggable={!readOnly}
            onDragStart={readOnly ? undefined : onDragStartChar}
            onClick={readOnly ? undefined : (e) => { e.stopPropagation(); onClickChar?.() }}
            className={`flex items-center gap-1.5 p-1 rounded select-none transition-colors ${
              readOnly
                ? ''
                : isSelected
                  ? 'bg-amber-500/15 ring-1 ring-amber-400/40 cursor-grab active:cursor-grabbing'
                  : 'hover:bg-stone-600/40 cursor-grab active:cursor-grabbing'
            }`}
          >
            <CharacterPortrait character={character} size={24} />
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-text-primary truncate max-w-[56px]">{character.nickname}</div>
              <div className="text-[8px] font-bold" style={{ color: GRADE_COLORS[character.grade] }}>{character.grade}</div>
            </div>
          </div>
        ) : !isConstructing ? (
          <div
            onClick={(e) => {
              e.stopPropagation()
              if (onClickAssign) onClickAssign()
              else onClickAssignHint?.()
            }}
            className={`text-[9px] text-center py-1.5 rounded transition-colors ${
              onClickAssign
                ? 'text-amber-400/60 cursor-pointer hover:bg-amber-500/5 hover:text-amber-300'
                : onClickAssignHint
                  ? 'text-text-secondary cursor-pointer hover:text-text-secondary'
                  : 'text-stone-700'
            }`}
          >
            {onClickAssign ? tS('mgmt.assignWorker') : tS('mgmt.emptySlot')}
          </div>
        ) : null}
      </div>

      {/* 건물 컨텍스트 메뉴 -- readOnly 시 숨김 */}
      {showMenu && !readOnly && (
        <div className="absolute z-50 top-full right-0 mt-1 bg-stone-900 border border-stone-600 rounded shadow-xl text-[10px] min-w-[72px]">
          {character && onUnassign && (
            <button onClick={() => { onUnassign(); setShowMenu(false) }}
              className="w-full text-start px-3 py-1.5 hover:bg-stone-700 text-text-primary">
              {tS('mgmt.unassign')}
            </button>
          )}
          {!isConstructing && onDemolish && (
            <button onClick={() => { onDemolish(); setShowMenu(false) }}
              className="w-full text-start px-3 py-1.5 hover:bg-stone-700 text-red-400">
              {tS('mgmt.demolish')}
            </button>
          )}
          <button onClick={() => setShowMenu(false)}
            className="w-full text-start px-3 py-1.5 hover:bg-stone-700 text-text-secondary">
            {tS('mgmt.close')}
          </button>
        </div>
      )}
    </div>
  )
}
