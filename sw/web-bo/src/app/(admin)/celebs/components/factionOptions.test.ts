import assert from 'node:assert/strict'
import test from 'node:test'

import type { FactionEntry } from '@/actions/admin/factions/entries'
import { buildFactionThemes, resolveFactionSelection } from './factionOptions'

function entry(id: string, name: string, level: 1 | 2, lv1Id: string | null): FactionEntry {
  return {
    id,
    name,
    name_en: null,
    description: null,
    description_en: null,
    color: '#000000',
    slug: null,
    level,
    lv1_id: level === 2 ? lv1Id : null,
    team_images: [],
    lead_person_ids: [],
    sort_order: 0,
    is_featured: false,
    is_myth: false,
    is_fiction: false,
    published: false,
    start_date: null,
    end_date: null,
    created_at: '',
    updated_at: '',
  }
}

test('분류(L1) 아래에 소속 세력(L2)을 묶는다', () => {
  const themes = buildFactionThemes([
    entry('myth', '그리스', 1, null),
    entry('greek', '그리스 신화', 2, 'myth'),
    entry('history', '역사', 1, null),
  ])

  assert.deepEqual(themes.map((theme) => [theme.id, theme.factions.map((item) => item.id)]), [
    ['myth', ['greek']],
    ['history', []],
  ])
})

test('세력 주소값에서 소속 분류를 복원한다', () => {
  const themes = buildFactionThemes([entry('myth', '그리스', 1, null), entry('greek', '그리스 신화', 2, 'myth')])
  assert.deepEqual(resolveFactionSelection(themes, 'greek'), { theme: 'myth', faction: 'greek' })
  assert.deepEqual(resolveFactionSelection(themes, 'missing'), { theme: 'all', faction: 'all' })
})
