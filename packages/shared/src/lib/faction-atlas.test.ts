import assert from 'node:assert/strict'
import test from 'node:test'

import { MYTH_ROOT_TAG_SLUG, mythBranchTagIds } from './faction-atlas'

test('신화 갈래는 최상위와 그 아래 모든 자손을 담고, 다른 갈래는 담지 않는다', () => {
  const rows = [
    { id: 'root', slug: MYTH_ROOT_TAG_SLUG, parent_id: null },
    { id: 'greek', slug: 'greek-roman-myth', parent_id: 'root' },
    { id: 'iliad', slug: 'homer-iliad', parent_id: 'greek' },
    { id: 'ai', slug: 'ai', parent_id: null },
    { id: 'openai', slug: 'openai', parent_id: 'ai' },
  ]
  assert.deepEqual([...mythBranchTagIds(rows)].sort(), ['greek', 'iliad', 'root'])
})

test('자손이 부모보다 앞에 와도 빠짐없이 걸린다', () => {
  const rows = [
    { id: 'iliad', slug: 'homer-iliad', parent_id: 'greek' },
    { id: 'greek', slug: 'greek-roman-myth', parent_id: 'root' },
    { id: 'root', slug: MYTH_ROOT_TAG_SLUG, parent_id: null },
  ]
  assert.equal(mythBranchTagIds(rows).size, 3)
})

test('신화 최상위가 없으면 빈 집합이다', () => {
  assert.equal(mythBranchTagIds([{ id: 'ai', slug: 'ai', parent_id: null }]).size, 0)
})
