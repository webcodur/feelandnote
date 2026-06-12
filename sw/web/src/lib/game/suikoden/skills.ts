// 천도 — 스킬 시스템 (개별 유닛 턴제)

import type { BattleUnit } from './types'
import { SKILL_DEFS, type SkillDef } from './constants'

// ── 유닛의 사용 가능 스킬 목록 ──

export function getAvailableSkills(unit: BattleUnit): SkillDef[] {
  const result: SkillDef[] = []
  const unitClass = unit.character.unitClass
  const stats = unit.character.stats

  for (const [, skillDef] of Object.entries(SKILL_DEFS)) {
    // 병과 체크 (leader → general 매핑이므로 추가 체크)
    if (!skillDef.classes.includes(unitClass)) continue

    // charge 복합 조건: martial ≥ 50 OR command ≥ 70
    if (skillDef.id === 'charge') {
      if ((stats.martial ?? 0) < 50 && (stats.command ?? 0) < 70) continue
      result.push(skillDef)
      continue
    }

    // 스탯 요구사항 체크
    if (skillDef.statReq) {
      const statVal = stats[skillDef.statReq.stat] ?? 0
      if (statVal < skillDef.statReq.min) continue
    }

    result.push(skillDef)
  }

  return result
}
