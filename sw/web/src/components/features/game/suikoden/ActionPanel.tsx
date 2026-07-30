'use client'

import { useLocale, useTranslations } from 'next-intl'
import type { BattleUnit } from '@/lib/game/suikoden/types'
import { CLASS_INFO } from '@/lib/game/suikoden/constants'
import { getAvailableSkills } from '@/lib/game/suikoden/skills'
import { getSuikodenText } from './i18n'

interface Props {
  unit: BattleUnit
  selectedAction: string | null
  onSelectAction: (action: string) => void
  disabled: boolean
}

export default function ActionPanel({ unit, selectedAction, onSelectAction, disabled }: Props) {
  const locale = useLocale()
  const tS = useTranslations('rest.arena.suikoden')
  const text = getSuikodenText(locale)
  const skills = getAvailableSkills(unit)
  const cls = CLASS_INFO[unit.character.unitClass]

  return (
    <div className="space-y-2">
      {/* 유닛 정보 */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-amber-400 font-bold">{unit.character.nickname}</span>
        <span className="text-text-secondary">{cls.icon} {tS(`class.${unit.character.unitClass}`)}</span>
        <span className="text-text-secondary">{text.action.hp} {unit.hp}/{unit.maxHp}</span>
      </div>

      {/* 행동 버튼 */}
      <div className="flex flex-wrap gap-1.5">
        {/* 공격 */}
        <ActionButton
          label={text.action.attack}
          icon="⚔️"
          desc={text.action.attackDesc}
          selected={selectedAction === 'attack'}
          onSelect={() => onSelectAction('attack')}
          disabled={disabled}
        />

        {/* 스킬 */}
        {skills.map(skill => (
          <ActionButton
            key={skill.id}
            label={tS(`skill.${skill.id}`)}
            icon={skill.icon}
            desc={tS(`skillDesc.${skill.id}`)}
            selected={selectedAction === `skill:${skill.id}`}
            onSelect={() => onSelectAction(`skill:${skill.id}`)}
            disabled={disabled}
          />
        ))}

        {/* 방어 */}
        <ActionButton
          label={text.action.defend}
          icon="🛡️"
          desc={text.action.defendDesc}
          selected={selectedAction === 'defend'}
          onSelect={() => onSelectAction('defend')}
          disabled={disabled}
        />

        {/* 후퇴 */}
        <ActionButton
          label={text.action.retreat}
          icon="🏃"
          desc={text.action.retreatDesc}
          selected={selectedAction === 'retreat'}
          onSelect={() => onSelectAction('retreat')}
          disabled={disabled}
          variant="danger"
        />
      </div>
    </div>
  )
}

function ActionButton({
  label, icon, desc, selected, onSelect, disabled, variant,
}: {
  label: string; icon: string; desc: string
  selected: boolean; onSelect: () => void; disabled: boolean
  variant?: 'danger'
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`px-2.5 py-1.5 rounded border text-left ${
        selected
          ? 'border-amber-400 bg-amber-900/30 ring-1 ring-amber-400'
          : variant === 'danger'
            ? 'border-red-700 bg-stone-800 hover:border-red-500'
            : 'border-stone-600 bg-stone-800 hover:border-stone-500'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-bold text-text-primary">{label}</span>
      </div>
      <p className="text-[8px] text-text-secondary mt-0.5">{desc}</p>
    </button>
  )
}
