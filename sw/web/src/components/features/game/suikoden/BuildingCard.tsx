'use client'

import { useTranslations } from 'next-intl'
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
  const tS = useTranslations('rest.arena.suikoden')
  const bDef = BUILDINGS.find(b => b.id === card.defId)
  if (!bDef) return null

  const category = BUILDING_CATEGORY[card.defId]
  const catInfo = category ? BUILDING_CATEGORY_INFO[category] : null

  const effectLines: string[] = []
  const e = bDef.effect
  if (e.goldPerTurn) effectLines.push(`🪙 +${e.goldPerTurn}${tS('mgmt.perTurn')}`)
  if (e.foodPerTurn) effectLines.push(`🌾 +${e.foodPerTurn}${tS('mgmt.perTurn')}`)
  if (e.knowledgePerTurn) effectLines.push(`📚 +${e.knowledgePerTurn}${tS('mgmt.perTurn')}`)
  if (e.materialPerTurn) effectLines.push(`🪵 +${e.materialPerTurn}${tS('mgmt.perTurn')}`)
  if (e.troopsPerTurn) effectLines.push(`⚔️ +${e.troopsPerTurn}${tS('mgmt.perTurn')}`)
  if (e.moralePerTurn) effectLines.push(`❤️ +${e.moralePerTurn}${tS('mgmt.perTurn')}`)
  if (e.defenseBonus) effectLines.push(`🛡️ ${tS('mgmt.defenseBonus', { value: e.defenseBonus })}`)
  if (e.special === 'training') effectLines.push(`🎯 ${tS('mgmt.training')}`)
  if (e.special === 'weapons') effectLines.push(`⚔️ ${tS('mgmt.armorLabel')}`)

  return (
    <div
      className="relative p-2 bg-stone-800 border rounded transition-all hover:bg-stone-750"
      style={{ borderColor: catInfo?.color ?? '#57534e' }}
    >
      {/* 건설 중 오버레이 */}
      {card.isConstructing && (
        <div className="absolute inset-0 bg-stone-900/60 flex flex-col items-center justify-center rounded z-10">
          <span className="text-[10px] text-amber-500/80 font-bold">{tS('mgmt.buildProgress', { current: bDef.buildTurns - card.constructionTurnsLeft, total: bDef.buildTurns })}</span>
        </div>
      )}

      {/* 카드 내용 */}
      <div className="flex items-center gap-1.5">
        <span className="text-base">{bDef.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-text-primary truncate">{tS(`bldg.${bDef.id}`)}</div>
          <div className="text-[9px] text-text-secondary">{effectLines.join(' · ')}</div>
        </div>
      </div>

      {/* 배치된 캐릭터 */}
      {!card.isConstructing && (
        <div className="mt-1.5 flex items-center gap-1.5">
          {character ? (
            <>
              <CharacterPortrait character={character} size={18} />
              <span className="text-[10px] text-text-primary truncate flex-1">{character.nickname}</span>
              {onUnassign && (
                <button
                  onClick={onUnassign}
                  className="text-[9px] text-text-secondary hover:text-red-400 px-1"
                  title={tS('mgmt.unassign')}
                >
                  ✕
                </button>
              )}
            </>
          ) : (
            onAssign && (
              <button
                onClick={onAssign}
                className="w-full text-[10px] text-text-secondary hover:text-amber-400 py-0.5 border border-dashed border-stone-600 rounded"
              >
                {tS('mgmt.assignWorker')}
              </button>
            )
          )}
        </div>
      )}

      {/* 철거 버튼 */}
      {!card.isConstructing && onDemolish && (
        <button
          onClick={onDemolish}
          className="absolute top-1 right-1 text-[9px] text-text-secondary hover:text-red-400"
          title={tS('mgmt.demolish')}
        >
          🗑️
        </button>
      )}
    </div>
  )
}
