import assert from 'node:assert/strict'
import test from 'node:test'
import {
  externalFamilyRelationFacts, prepareRelationSupplement, relationConflict, validateRelationSupplement,
  type RelationSupplement,
} from './relations-supplement'

const people = [
  { id: 'receiver-id', slug: 'receiver', nickname: '수용자', wikidata_qid: 'Q1' },
  { id: 'source-id', slug: 'source', nickname: '영향원', wikidata_qid: 'Q2' },
]
const input = (): RelationSupplement => ({ schemaVersion: 1, pairs: [{
  a: 'receiver', a_qid: 'Q1', b: 'source', b_qid: 'Q2', kind: 'influence',
  note_ko: '수용자는 영향원의 사상을 받아 통치에 적용했다.',
  note_en: 'The receiver applied the source’s ideas to government.',
  sources: ['https://example.org/verified-speech'],
}] })

test('외부 QID 가족 기록도 내부 쌍의 네 사회 축을 막는다', () => {
  const facts = externalFamilyRelationFacts([
    { from_id: 'source-id', qid: 'Q1', rel_type: 'child', rel_group: 'family' },
    { from_id: 'receiver-id', qid: 'Q2', rel_type: 'colleague' },
    { from_id: 'receiver-id', qid: 'Q999', rel_type: 'father' },
  ], people)
  assert.equal(facts.length, 1)
  for (const kind of ['influence', 'influenced', 'colleague', 'rival'] as const) {
    const payload = input()
    payload.pairs[0].kind = kind
    const plan = prepareRelationSupplement(payload, people, facts)
    assert.equal(plan.rows.length, 0)
    assert.equal(plan.sources.length, 0)
    assert.equal(plan.skipped[0].reason, 'existing family relation')
  }
})

test('영향원과 수용자 방향을 맞추고 재반영 시 기존 설명을 보존한다', () => {
  const first = prepareRelationSupplement(input(), people, [])
  assert.deepEqual(first.rows[0], {
    from_id: 'receiver-id', to_id: 'source-id', rel_type: 'influence', rel_group: 'thought', source: 'manual',
    note: input().pairs[0].note_ko, note_en: input().pairs[0].note_en,
  })
  const retry = input()
  retry.pairs[0].note_ko = '기존 설명을 덮어쓰려고 한 입력'
  assert.equal(prepareRelationSupplement(retry, people, first.rows).rows.length, 0)
  assert.equal(first.rows[0].note, input().pairs[0].note_ko)
})

test('반대쪽 인물 기준 influenced 입력도 같은 사실 하나로 취급한다', () => {
  const reverse = input()
  reverse.pairs[0] = { ...reverse.pairs[0], a: 'source', a_qid: 'Q2', b: 'receiver', b_qid: 'Q1', kind: 'influenced' }
  assert.deepEqual(prepareRelationSupplement(reverse, people, []).rows, prepareRelationSupplement(input(), people, []).rows)
  const batch = input()
  batch.pairs.push(reverse.pairs[0])
  assert.equal(prepareRelationSupplement(batch, people, []).rows.length, 1)
})

test('가족 관계가 있는 쌍은 방향에 관계없이 네 축의 사회 관계를 중복 등록하지 않는다', () => {
  for (const rel_type of ['father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative']) {
    for (const kind of ['influence', 'influenced', 'colleague', 'rival'] as const) {
      const candidate = input()
      candidate.pairs[0].kind = kind
      const existing = [{ from_id: 'source-id', to_id: 'receiver-id', rel_type }]
      const result = prepareRelationSupplement(candidate, people, existing)
      assert.equal(result.rows.length, 0)
      assert.equal(result.sources.length, 0)
      assert.equal(result.skipped[0].reason, 'existing family relation')
    }
  }
})

test('가족 그룹을 인식하되 다른 사람의 가족 관계나 기존 친구 관계는 차단 근거가 아니다', () => {
  assert.equal(prepareRelationSupplement(input(), people, [{ from_id: 'receiver-id', to_id: 'source-id', rel_type: 'legacy-family', rel_group: 'family' }]).rows.length, 0)
  assert.equal(prepareRelationSupplement(input(), people, [{ from_id: 'receiver-id', to_id: 'third-id', rel_type: 'father' }]).rows.length, 1)
  assert.equal(prepareRelationSupplement(input(), people, [{ from_id: 'receiver-id', to_id: 'source-id', rel_type: 'friend' }]).rows.length, 1)
})

test('영향 양방향·협력·대립 네 축을 같은 인물 쌍에 독립적으로 넣는다', () => {
  const batch = input()
  for (const kind of ['influenced', 'colleague', 'rival'] as const) batch.pairs.push({ ...batch.pairs[0], kind })
  const plan = prepareRelationSupplement(batch, people, [])
  assert.equal(plan.rows.length, 4)
  assert.equal(new Set(plan.rows.map(r => `${r.from_id}|${r.to_id}|${r.rel_type}`)).size, 4)
  assert.equal(prepareRelationSupplement(batch, people, plan.rows).rows.length, 0)
})

test('새 가족 관계는 사회 축 제한과 무관하게 등록하며 역방향 중복은 제외한다', () => {
  for (const kind of ['father', 'mother', 'parent', 'child', 'spouse', 'partner', 'sibling', 'relative'] as const) {
    const payload = input()
    payload.pairs[0].kind = kind
    const plan = prepareRelationSupplement(payload, people, [])
    assert.equal(plan.rows.length, 1)
    assert.equal(plan.rows[0].rel_group, 'family')
    assert.equal(prepareRelationSupplement(payload, people, plan.rows).rows.length, 0)
  }
})

test('가족 후보를 같은 배치의 사회 후보보다 먼저 반영한다', () => {
  const payload = input()
  payload.pairs.push({ ...payload.pairs[0], kind: 'spouse' })
  const plan = prepareRelationSupplement(payload, people, [])
  assert.deepEqual(plan.rows.map(row => row.rel_type), ['spouse'])
  assert.equal(plan.skipped[0].reason, 'existing family relation')
})

test('새 가족 사실은 기존 사회 관계가 있어도 막지 않는다', () => {
  const payload = input()
  payload.pairs[0].kind = 'spouse'
  assert.equal(prepareRelationSupplement(payload, people, [{ from_id: 'receiver-id', to_id: 'source-id', rel_type: 'colleague' }]).rows.length, 1)
})

test('사제·친구·공동창업·대응 유형을 신규 입력으로 받지 않는다', () => {
  for (const kind of ['teacher', 'student', 'friend', 'cofounder', 'counterpart']) {
    assert.throws(() => validateRelationSupplement({ ...input(), pairs: [{ ...input().pairs[0], kind }] }), /허용/)
  }
})

test('신원 QID가 다르거나 상대가 미등록이면 전체 반영을 중단한다', () => {
  const mismatch = input()
  mismatch.pairs.push({ ...mismatch.pairs[0], b_qid: 'Q999' })
  assert.throws(() => prepareRelationSupplement(mismatch, people, []), /QID 불일치/)
  assert.throws(() => prepareRelationSupplement(input(), people.slice(0, 1), []), /명단에 없는 인물/)
})

test('출처·영문 설명 없이 또는 자기 자신에게는 보강하지 않는다', () => {
  const cases: Array<[unknown, RegExp]> = [
    [{ ...input(), pairs: [{ ...input().pairs[0], sources: [] }] }, /출처/],
    [{ ...input(), pairs: [{ ...input().pairs[0], sources: ['javascript:alert(1)'] }] }, /출처/],
    [{ ...input(), pairs: [{ ...input().pairs[0], note_en: ' ' }] }, /note_en/],
    [{ ...input(), pairs: [{ ...input().pairs[0], a: 'source' }] }, /자기 참조/],
    [{ schemaVersion: 1, pairs: [] }, /pairs/],
  ]
  for (const [value, pattern] of cases) assert.throws(() => validateRelationSupplement(value), pattern)
})

test('레거시 사제·공동창업은 같은 축의 중복으로 읽되 다른 축은 막지 않는다', () => {
  assert.equal(relationConflict(
    { from_id: 'receiver-id', to_id: 'source-id', rel_type: 'influence' },
    [{ from_id: 'source-id', to_id: 'receiver-id', rel_type: 'student' }],
  ), 'existing fact')
  assert.equal(relationConflict(
    { from_id: 'receiver-id', to_id: 'source-id', rel_type: 'colleague' },
    [{ from_id: 'source-id', to_id: 'receiver-id', rel_type: 'cofounder' }],
  ), 'existing fact')
  assert.equal(relationConflict(
    { from_id: 'receiver-id', to_id: 'source-id', rel_type: 'rival' },
    [{ from_id: 'receiver-id', to_id: 'source-id', rel_type: 'colleague' }],
  ), null)
})
