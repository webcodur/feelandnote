'use client'

import type { BuildingCard as BuildingCardType, GameCharacter } from '@/lib/game/suikoden/types'
import { BUILDINGS, BUILDING_CATEGORY, BUILDING_CATEGORY_INFO } from '@/lib/game/suikoden/constants'
import CharacterPortrait from './CharacterPortrait'

interface Props {
  card: BuildingCardType
  character?: GameCharacter | null
  onAssign?: () => void
  onUnassign?: () => void
  onDemolish?: () => void
}

export default function BuildingCard({ card, character, onAssign, onUnassign, onDemolish }: Props) {
  const bDef = BUILDINGS.find(b => b.id === card.defId)
  if (!bDef) return null

  const category = BUILDING_CATEGORY[card.defId]
  const catInfo = category ? BUILDING_CATEGORY_INFO[category] : null

  const effectLines: string[] = []
  const e = bDef.effect
  if (e.goldPerTurn) effectLines.push(`🪙 +${e.goldPerTurn}/턴`)
  if (e.foodPerTurn) effectLines.push(`🌾 +${e.foodPerTurn}/턴`)
  if (e.knowledgePerTurn) effectLines.push(`📚 +${e.knowledgePerTurn}/턴`)
  if (e.materialPerTurn) effectLines.push(`🪵 +${e.materialPerTurn}/턴`)
  if (e.troopsPerTurn) effectLines.push(`⚔️ +${e.troopsPerTurn}/턴`)
  if (e.moralePerTurn) effectLines.push(`❤️ +${e.moralePerTurn}/턴`)
  if (e.defenseBonus) effectLines.push(`🛡️ 방어 +${e.defenseBonus}%`)
  if (e.special === 'training') effectLines.push('🎯 훈련')
  if (e.special === 'weapons') effectLines.push('⚔️ 무장')

  return (
    <div
      className="relative p-2 bg-stone-800 border rounded transition-all hover:bg-stone-750"
      style={{ borderColor: catInfo?.color ?? '#57534e' }}
    >
      {/* 건설 중 오버레이 */}
      {card.isConstructing && (
        <div className="absolute inset-0 bg-stone-900/60 flex flex-col items-center justify-center rounded z-10">
          <span className="text-[10px] text-amber-500/80 font-bold">건설 {bDef.buildTurns - card.constructionTurnsLeft}/{bDef.buildTurns}</span>
        </div>
      )}

      {/* 카드 내용 */}
      <div className="flex items-center gap-1.5">
        <span className="text-base">{bDef.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-stone-200 truncate">{bDef.name}</div>
          <div className="text-[9px] text-stone-500">{effectLines.join(' · ')}</div>
        </div>
      </div>

      {/* 배치된 캐릭터 */}
      {!card.isConstructing && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {character ? (
            <>
              <CharacterPortrait character={character} size={18} />
              <span className="text-[10px] text-stone-300 truncate flex-1">{character.nickname}</span>
              {onUnassign && (
                <button
                  onClick={onUnassign}
                  className="text-[9px] text-stone-500 hover:text-red-400 px-1"
                  title="해제"
                >
                  ✕
                </button>
              )}
            </>
          ) : (
            onAssign && (
              <button
                onClick={onAssign}
                className="w-full text-[10px] text-stone-500 hover:text-amber-400 py-0.5 border border-dashed border-stone-600 rounded"
              >
                + 배치
              </button>
            )
          )}
        </div>
      )}

      {/* 철거 버튼 */}
      {!card.isConstructing && onDemolish && (
        <button
          onClick={onDemolish}
          className="absolute top-1 right-1 text-[9px] text-stone-600 hover:text-red-400"
          title="철거"
        >
          🗑️
        </button>
      )}
    </div>
  )
}
