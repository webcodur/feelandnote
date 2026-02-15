'use client'

import type { BattleUnit, ClassSkill } from '@/lib/game/suikoden/types'
import { getSkillsForUnit, canUseSkill } from '@/lib/game/suikoden/skills'

interface Props {
  unit: BattleUnit
  onUseSkill: (skill: ClassSkill) => void
  onCancel: () => void
}

export default function SkillMenu({ unit, onUseSkill, onCancel }: Props) {
  const skills = getSkillsForUnit(unit)

  return (
    <div className="p-2 bg-stone-800 border border-stone-600 rounded space-y-1">
      <div className="text-[10px] text-stone-500 mb-1">스킬 ({unit.character.nickname})</div>
      {skills.map(skill => {
        const usable = canUseSkill(unit, skill)
        return (
          <button
            key={skill.id}
            onClick={() => usable && onUseSkill(skill)}
            disabled={!usable}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors ${
              usable ? 'hover:bg-stone-700 text-stone-200' : 'opacity-30 cursor-not-allowed text-stone-500'
            }`}
          >
            <span>{skill.icon}</span>
            <div className="flex-1">
              <div className="font-bold">{skill.name}</div>
              <div className="text-[10px] text-stone-400">{skill.description}</div>
            </div>
            {skill.costTroops > 0 && (
              <span className="text-[10px] text-red-400">-{skill.costTroops}兵</span>
            )}
          </button>
        )
      })}
      <button
        onClick={onCancel}
        className="w-full px-2 py-1 rounded text-xs text-stone-400 hover:bg-stone-700"
      >
        취소
      </button>
    </div>
  )
}
