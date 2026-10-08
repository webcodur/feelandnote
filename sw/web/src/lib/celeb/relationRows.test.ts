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

test('대응 인물은 네 축의 관계로 노출하지 않는다', () => {
  const rows: StoredRelationRow[] = [
    {
      ...base,
      rel_group: 'counterpart',
      from_id: 'jupiter',
      to_id: 'zeus',
      rel_type: 'counterpart',
      note: 'shared',
    },
    {
      ...base,
      rel_group: 'counterpart',
      from_id: 'zeus',
      to_id: 'jupiter',
      rel_type: 'counterpart',
      note: 'old reverse',
    },
  ]

  assert.deepEqual(mergeRelationRowsForViewer(rows, 'zeus'), [])
  assert.deepEqual(mergeRelationRowsForViewer(rows, 'jupiter'), [])
})

test('가족의 구체적 유형과 역방향 기록은 네 축에서 제외한다', () => {
  const rows: StoredRelationRow[] = [
    { ...base, rel_group: 'family', from_id: 'child', to_id: 'parent', rel_type: 'mother', note: 'shared' },
    { ...base, rel_group: 'family', from_id: 'parent', to_id: 'child', rel_type: 'child', note: 'old inverse' },
  ]

  assert.deepEqual(mergeRelationRowsForViewer(rows, 'child'), [])
  assert.deepEqual(mergeRelationRowsForViewer(rows, 'parent'), [])
})

test('부모 기록은 양쪽 상세의 네 축에서 제외한다', () => {
  const rows: StoredRelationRow[] = [
    {
      ...base,
      rel_group: 'family',
      from_id: 'electra',
      to_id: 'agamemnon',
      rel_type: 'parent',
      note: 'Agamemnon is Electra\'s father.',
    },
  ]

  assert.deepEqual(mergeRelationRowsForViewer(rows, 'electra'), [])
  assert.deepEqual(mergeRelationRowsForViewer(rows, 'agamemnon'), [])
})

test('different relationship kinds stay visible for the same person pair', () => {
  const rows: StoredRelationRow[] = [
    { ...base, rel_group: 'career', from_id: 'a', to_id: 'b', rel_type: 'colleague', note: 'cooperation' },
    { ...base, rel_group: 'rivalry', from_id: 'a', to_id: 'b', rel_type: 'rival', note: 'rivals' },
  ]

  assert.deepEqual(
    mergeRelationRowsForViewer(rows, 'a').map((row) => row.relType).sort(),
    ['colleague', 'rival'],
  )
})

test('가족 쌍의 기존 사회 관계도 양쪽 화면에서 제외한다', () => {
  const rows: StoredRelationRow[] = [
    { ...base, rel_group: 'family', from_id: 'b', to_id: 'a', rel_type: 'father', note: 'family' },
    ...['influence', 'influenced', 'colleague', 'rival'].map(rel_type => ({
      ...base, from_id: 'a', to_id: 'b', rel_type, note: 'old social relation',
    })),
    { ...base, from_id: 'a', to_id: 'c', rel_type: 'influence', note: 'non-family influence' },
  ]
  assert.deepEqual(mergeRelationRowsForViewer(rows, 'a').map(r => r.counterpartId), ['c'])
  assert.deepEqual(mergeRelationRowsForViewer(rows, 'b'), [])
})
