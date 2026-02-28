'use client'

import type { BattleUnit } from '@/lib/game/suikoden/types'
import { SKILL_DEFS, CLASS_INFO } from '@/lib/game/suikoden/constants'
import { getAvailableSkills } from '@/lib/game/suikoden/skills'

interface Props {
  unit: BattleUnit
  selectedAction: string | null
  onSelectAction: (action: string) => void
  disabled: boolean
}

export default function ActionPanel({ unit, selectedAction, onSelectAction, disabled }: Props) {
  const skills = getAvailableSkills(unit)
  const cls = CLASS_INFO[unit.character.unitClass]

  return (
    <div className="space-y-2">
      {/* 유닛 정보 */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-amber-400 font-bold">{unit.character.nickname}</span>
        <span className="text-stone-500">{cls.icon} {cls.name}</span>
        <span className="text-stone-500">HP {unit.hp}/{unit.maxHp}</span>
      </div>

      {/* 행동 버튼 */}
      <div className="flex flex-wrap gap-1.5">
        {/* 공격 */}
        <ActionButton
          id="attack"
          label="공격"
          icon="⚔️"
          desc="물리 대미지"
          selected={selectedAction === 'attack'}
          onSelect={() => onSelectAction('attack')}
          disabled={disabled}
        />

        {/* 스킬 */}
        {skills.map(skill => (
          <ActionButton
            key={skill.id}
            id={`skill:${skill.id}`}
            label={skill.name}
            icon={skill.icon}
            desc={skill.description}
            selected={selectedAction === `skill:${skill.id}`}
            onSelect={() => onSelectAction(`skill:${skill.id}`)}
            disabled={disabled}
          />
        ))}

        {/* 방어 */}
        <ActionButton
          id="defend"
          label="방어"
          icon="🛡️"
          desc="피해 50% 감소"
          selected={selectedAction === 'defend'}
          onSelect={() => onSelectAction('defend')}
          disabled={disabled}
        />

        {/* 후퇴 */}
        <ActionButton
          id="retreat"
          label="후퇴"
          icon="🏃"
          desc="전장 이탈"
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
  id, label, icon, desc, selected, onSelect, disabled, variant,
}: {
  id: string; label: string; icon: string; desc: string
  selected: boolean; onSelect: () => void; disabled: boolean
  variant?: 'danger'
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`px-2.5 py-1.5 rounded border text-left transition-all ${
        selected
          ? 'border-amber-400 bg-amber-900/30 ring-1 ring-amber-400'
          : variant === 'danger'
            ? 'border-red-700 bg-stone-800 hover:border-red-500'
            : 'border-stone-600 bg-stone-800 hover:border-stone-500'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-center gap-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[10px] font-bold text-stone-200">{label}</span>
      </div>
      <p className="text-[8px] text-stone-500 mt-0.5">{desc}</p>
    </button>
  )
}
