import assert from 'node:assert/strict'
import test from 'node:test'

import { mergeRelationRowsForViewer, type StoredRelationRow } from './relationRows'

const base = {
  rel_group: 'thought' as const,
  note_en: null,
}

test('legacy inverse rows become one viewed relation', () => {
  const rows: StoredRelationRow[] = [
    { ...base, from_id: 'b', to_id: 'a', rel_type: 'influence', note: 'shared' },
    { ...base, from_id: 'a', to_id: 'b', rel_type: 'influenced', note: 'old inverse' },
  ]

  assert.deepEqual(mergeRelationRowsForViewer(rows, 'a'), [{
    factKey: 'b|a|influence',
    counterpartId: 'b',
    relType: 'influenced',
    relGroup: 'thought',
    note: 'shared',
    noteEn: null,
  }])
  assert.equal(mergeRelationRowsForViewer(rows, 'b')[0]?.relType, 'influence')
})

test('specific parent type wins over a legacy child fallback', () => {
  const rows: StoredRelationRow[] = [
    { ...base, rel_group: 'family', from_id: 'child', to_id: 'parent', rel_type: 'mother', note: 'shared' },
    { ...base, rel_group: 'family', from_id: 'parent', to_id: 'child', rel_type: 'child', note: 'old inverse' },
  ]

  assert.equal(mergeRelationRowsForViewer(rows, 'child')[0]?.relType, 'mother')
  assert.equal(mergeRelationRowsForViewer(rows, 'parent')[0]?.relType, 'child')
})

test('different relationship kinds stay visible for the same person pair', () => {
  const rows: StoredRelationRow[] = [
    { ...base, rel_group: 'friendship', from_id: 'a', to_id: 'b', rel_type: 'friend', note: 'friends' },
    { ...base, rel_group: 'rivalry', from_id: 'a', to_id: 'b', rel_type: 'rival', note: 'rivals' },
  ]

  assert.deepEqual(
    mergeRelationRowsForViewer(rows, 'a').map((row) => row.relType).sort(),
    ['friend', 'rival'],
  )
})
