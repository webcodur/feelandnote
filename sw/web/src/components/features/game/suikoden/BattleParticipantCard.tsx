'use client'

import { useTranslations } from 'next-intl'
import type { BattleParticipant } from '@/lib/game/suikoden/types'
import { CLASS_INFO } from '@/lib/game/suikoden/constants'
import CharacterPortrait from './CharacterPortrait'

interface Props {
  participant: BattleParticipant
  isPlayer: boolean
}

export default function BattleParticipantCard({ participant, isPlayer }: Props) {
  const tS = useTranslations('rest.arena.suikoden')
  const { character, troops, morale, isLeader, isDefeated } = participant
  const cls = CLASS_INFO[character.unitClass]
  const hpRatio = character.hp / character.maxHp

  return (
    <div
      className={`relative p-2 rounded border transition-all ${
        isDefeated
          ? 'bg-stone-900 border-stone-700 opacity-40'
          : isPlayer
            ? 'bg-stone-800 border-amber-600/40'
            : 'bg-stone-800 border-red-600/40'
      }`}
    >
      {/* 리더 마크 */}
      {isLeader && (
        <div className="absolute -top-1.5 -right-1.5 text-[9px] text-amber-400 font-bold">{tS('battle.leaderMark')}</div>
      )}

      {/* 격파 오버레이 */}
      {isDefeated && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-red-500 font-bold text-xs">{tS('battle.defeated')}</span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <CharacterPortrait character={character} size={28} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-text-secondary">{tS(`class.${character.unitClass}`)}</span>
            <span className="text-[11px] font-bold text-text-primary truncate">{character.nickname}</span>
          </div>
          <div className="text-[9px] text-text-secondary">{character.grade}</div>
        </div>
      </div>

      {/* HP 바 */}
      <div className="mt-1.5">
        <div className="flex items-center justify-between text-[9px] mb-0.5">
          <span className="text-text-secondary">HP</span>
          <span className="text-text-secondary">{character.hp}/{character.maxHp}</span>
        </div>
        <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${hpRatio * 100}%`,
              backgroundColor: hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.2 ? '#eab308' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* 병력/사기 */}
      <div className="flex items-center gap-3 mt-1 text-[9px]">
        <span className="text-text-secondary">{tS('battle.troops', { count: troops })}</span>
        <span className={morale >= 50 ? 'text-green-400' : 'text-red-400'}>
          {tS('battle.morale', { value: morale })}
        </span>
      </div>
    </div>
  )
}
