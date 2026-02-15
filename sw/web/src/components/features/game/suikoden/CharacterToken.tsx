'use client'

import type { CharacterPlacement, GameCharacter } from '@/lib/game/suikoden/types'
import { CLASS_INFO } from '@/lib/game/suikoden/constants'

interface Props {
  placement: CharacterPlacement
  character: GameCharacter
  tileSize: number
  isSelected: boolean
  isPlayer: boolean
  factionColor: string
  onClick: () => void
}

const TASK_ICONS: Record<string, string> = {
  idle: '',
  moving: '🚶',
  building: '🔨',
  working: '⚙️',
  training: '🎯',
  patrolling: '👁️',
}

export default function CharacterToken({ placement, character, tileSize, isSelected, isPlayer, factionColor, onClick }: Props) {
  const classInfo = CLASS_INFO[character.unitClass]
  const taskIcon = TASK_ICONS[placement.task] ?? ''

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className={`absolute cursor-pointer z-10 flex items-center justify-center rounded-full border-2 ${
        isSelected ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-stone-900' : ''
      }`}
      style={{
        left: placement.x * tileSize + tileSize * 0.1,
        top: placement.y * tileSize + tileSize * 0.1,
        width: tileSize * 0.8,
        height: tileSize * 0.8,
        borderColor: factionColor,
        backgroundColor: classInfo.color + '40',
        transition: 'left 0.18s linear, top 0.18s linear',
      }}
      title={`${character.nickname} (${classInfo.name}) — ${placement.task}`}
    >
      <span className="text-[8px] font-bold text-white leading-none truncate px-0.5">
        {character.nickname.slice(0, 2)}
      </span>
      {taskIcon && (
        <span className="absolute -bottom-1 -right-1 text-[8px]">{taskIcon}</span>
      )}
      {isPlayer && (
        <span className="absolute -top-1 -left-1 text-[6px]">★</span>
      )}
    </div>
  )
}
