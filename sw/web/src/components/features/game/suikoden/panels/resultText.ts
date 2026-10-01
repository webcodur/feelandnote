// 천도 v2 — 명령 결과 코드 → 알림 문장

import type { CommandResult } from '@/lib/game/suikoden/commands'
import type { BuildingType } from '@/lib/game/suikoden/types'
import type { CheondoText, NameLookup } from '../i18n'

export function resultToast(T: CheondoText, names: NameLookup, r: CommandResult): { text: string; tone: 'good' | 'bad' | 'info' } {
  const p = r.params ?? {}
  const gain = Number(p.gain ?? 0)
  const t = T.toast
  if (!r.ok) {
    return { text: t.errors[r.code] ?? t.errors.default, tone: 'bad' }
  }
  switch (r.code) {
    case 'farm_done': return { text: `${names.hero(String(p.hero))} · ${t.farm_done(gain)}`, tone: 'good' }
    case 'commerce_done': return { text: `${names.hero(String(p.hero))} · ${t.commerce_done(gain)}`, tone: 'good' }
    case 'walls_done': return { text: `${names.hero(String(p.hero))} · ${t.walls_done(gain)}`, tone: 'good' }
    case 'relief_done': return { text: `${names.hero(String(p.hero))} · ${t.relief_done(gain)}`, tone: 'good' }
    case 'conscript_done': return { text: `${names.hero(String(p.hero))} · ${t.conscript_done(gain)}`, tone: 'good' }
    case 'train_done': return { text: `${names.hero(String(p.hero))} · ${t.train_done(gain)}`, tone: 'good' }
    case 'subdue_ok': return { text: t.subdue_ok, tone: 'good' }
    case 'subdue_fail': return { text: t.subdue_fail, tone: 'bad' }
    case 'search_found': return { text: t.search_found(r.found?.length ?? 0), tone: 'good' }
    case 'search_none': return { text: t.search_none, tone: 'info' }
    case 'search_gold': return { text: t.search_gold(Number(p.gold ?? 0)), tone: 'info' }
    case 'search_exhausted': return { text: t.search_exhausted, tone: 'info' }
    case 'recruit_ok': return { text: t.recruit_ok(names.hero(String(p.target))), tone: 'good' }
    case 'recruit_fail': return { text: t.recruit_fail(names.hero(String(p.target))), tone: 'bad' }
    case 'move_done': return { text: `${names.hero(String(p.hero))} · ${t.move_done(names.territory(String(p.to)))}`, tone: 'info' }
    case 'build_started': return { text: t.build_started(T.buildings[p.building as BuildingType], Number(p.months ?? 0)), tone: 'good' }
    case 'reward_done': return { text: `${names.hero(String(p.hero))} · ${t.reward_done(gain)}`, tone: 'good' }
    case 'dismissed': return { text: t.dismissed, tone: 'info' }
    case 'governor_set': return { text: t.governor_set, tone: 'info' }
    case 'delegate_on': return { text: t.delegate_on, tone: 'info' }
    case 'delegate_off': return { text: t.delegate_off, tone: 'info' }
    case 'gift_done': return { text: t.gift_done(gain), tone: 'good' }
    case 'alliance_ok': return { text: t.alliance_ok, tone: 'good' }
    case 'alliance_fail': return { text: t.alliance_fail, tone: 'bad' }
    case 'ceasefire_ok': return { text: t.ceasefire_ok, tone: 'good' }
    case 'ceasefire_fail': return { text: t.ceasefire_fail, tone: 'bad' }
    case 'surrender_ok': return { text: t.surrender_ok, tone: 'good' }
    case 'surrender_fail': return { text: t.surrender_fail, tone: 'bad' }
    case 'break_done': return { text: t.break_done, tone: 'bad' }
    default: return { text: r.code, tone: 'info' }
  }
}
