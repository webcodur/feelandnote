import assert from 'node:assert/strict'
import test from 'node:test'

import type { CelebTag } from '@/actions/admin/tags'
import { buildFactionThemes, resolveFactionSelection } from './factionOptions'

function tag(id: string, name: string, parentId: string | null): CelebTag {
  return {
    id,
    name,
    name_en: null,
    description: null,
    description_en: null,
    color: '#000000',
    slug: null,
    team_images: [],
    sort_order: 0,
    is_featured: false,
    parent_id: parentId,
    start_date: null,
    end_date: null,
    created_at: '',
    updated_at: '',
  }
}

test('상위 테마 아래에 소속 세력을 묶는다', () => {
  const themes = buildFactionThemes([
    tag('myth', '신화', null),
    tag('greek', '그리스 신화', 'myth'),
    tag('history', '역사', null),
  ])

  assert.deepEqual(themes.map((theme) => [theme.id, theme.factions.map((item) => item.id)]), [
    ['myth', ['greek']],
    ['history', []],
  ])
})

test('하위 세력 주소값에서 소속 테마를 복원한다', () => {
  const themes = buildFactionThemes([tag('myth', '신화', null), tag('greek', '그리스 신화', 'myth')])
  assert.deepEqual(resolveFactionSelection(themes, 'greek'), { theme: 'myth', faction: 'greek' })
  assert.deepEqual(resolveFactionSelection(themes, 'missing'), { theme: 'all', faction: 'all' })
})
