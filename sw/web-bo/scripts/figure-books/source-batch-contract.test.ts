import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertExactFigureBookReadback,
  buildFigureBookBatchPlan,
  parseFigureBookBatchManifest,
  parseFigureBookRelationDescription,
  preserveReviewedFigureBookRelations,
  type FigureBookCharacterRow,
  type ResolvedFigureBookCharacter,
} from './source-batch-contract'

const CONTENT_ID = 'content-les-miserables'
const JEAN_VALJEAN_ID = '00000000-0000-4000-8000-000000000001'
const JAVERT_ID = '00000000-0000-4000-8000-000000000002'
const COSETTE_ID = '00000000-0000-4000-8000-000000000003'

function resolved(
  input: Partial<ResolvedFigureBookCharacter> & Pick<ResolvedFigureBookCharacter, 'celebId' | 'slug'>,
): ResolvedFigureBookCharacter {
  return {
    relationType: 'appearance',
    description: null,
    ...input,
  }
}

function stored(
  celebId: string,
  sortOrder: number,
  overrides: Partial<FigureBookCharacterRow> = {},
): FigureBookCharacterRow {
  return {
    content_id: CONTENT_ID,
    celeb_id: celebId,
    relation_type: 'appearance',
    sort_order: sortOrder,
    description: '기존 한국어 설명',
    description_en: 'Existing English description',
    ...overrides,
  }
}

test('등장 관계 설명은 생략과 null 모두 null로 정리한다', () => {
  assert.deepEqual(parseFigureBookBatchManifest({
    contentId: ` ${CONTENT_ID} `,
    title: ' 레 미제라블 ',
    characters: [{
      slug: ' jean-valjean ',
      relationType: 'appearance',
      description: null,
      sortOrder: 0,
    }, {
      celebId: ` ${JAVERT_ID} `,
      relationType: 'appearance',
    }],
  }), {
    contentId: CONTENT_ID,
    title: '레 미제라블',
    characters: [{
      slug: 'jean-valjean',
      relationType: 'appearance',
      description: null,
      sortOrder: 0,
    }, {
      celebId: JAVERT_ID,
      relationType: 'appearance',
      description: null,
    }],
  })
})

test('관계 유형, 폐기된 설명, 단일 식별자, 정렬값을 검증한다', () => {
  const base = {
    contentId: CONTENT_ID,
    characters: [{
      slug: 'jean-valjean',
      relationType: 'appearance',
      description: null,
    }],
  }

  assert.throws(
    () => parseFigureBookBatchManifest({
      ...base,
      characters: [{ ...base.characters[0], relationType: 'cameo' }],
    }),
    /appearance, related/,
  )
  assert.throws(
    () => parseFigureBookBatchManifest({
      ...base,
      characters: [{ ...base.characters[0], celebId: JEAN_VALJEAN_ID }],
    }),
    /중 하나만/,
  )
  assert.throws(
    () => parseFigureBookBatchManifest({
      ...base,
      characters: [{ ...base.characters[0], sortOrder: -1 }],
    }),
    /0 이상의 정수/,
  )

  assert.deepEqual(parseFigureBookBatchManifest({
    contentId: CONTENT_ID,
    characters: [{ slug: 'javert', relationType: 'related' }],
  }).characters[0], {
    slug: 'javert',
    relationType: 'related',
    description: null,
  })
  assert.throws(
    () => parseFigureBookBatchManifest({
      contentId: CONTENT_ID,
      characters: [{
        slug: 'javert',
        relationType: 'related',
        description: '연관 관계에는 넣을 수 없는 등장 설명',
      }],
    }),
    /폐기된 관계 설명/,
  )
})

test('입력과 해석 뒤의 대상 인물 중복을 모두 거부한다', () => {
  assert.throws(() => parseFigureBookBatchManifest({
    contentId: CONTENT_ID,
    characters: [0, 1].map(() => ({
      slug: 'jean-valjean',
      relationType: 'appearance',
      description: null,
    })),
  }), /대상 인물이 중복/)

  assert.throws(() => buildFigureBookBatchPlan(CONTENT_ID, [
    resolved({ slug: 'jean-valjean', celebId: JEAN_VALJEAN_ID }),
    resolved({ slug: 'valjean', celebId: JEAN_VALJEAN_ID }),
  ], []), /해석된 대상 인물이 중복/)
})

test('지정한 인물만 증분 갱신하고 작품의 다른 기존 관계는 보존한다', () => {
  const current = [
    stored(JEAN_VALJEAN_ID, 2),
    stored(JAVERT_ID, 5),
  ]
  const plan = buildFigureBookBatchPlan(CONTENT_ID, [
    resolved({
      slug: 'jean-valjean',
      celebId: JEAN_VALJEAN_ID,
      relationType: 'related',
      description: null,
    }),
    resolved({ slug: 'cosette', celebId: COSETTE_ID }),
  ], current)

  assert.deepEqual(plan.changes.map((change) => change.kind), ['update', 'insert'])
  assert.equal(plan.changes[0].after.sort_order, 2, '생략한 기존 정렬값은 보존한다')
  assert.equal(plan.changes[1].after.sort_order, 6, '새 관계는 기존 마지막 다음에 놓는다')
  assert.equal(plan.writeRows.length, 2)
  assert.equal(plan.changes[0].after.description, null)
  assert.equal(plan.changes[0].after.description_en, null)
  assert.deepEqual(
    plan.expectedRows.find((row) => row.celeb_id === JAVERT_ID),
    current[1],
    '입력에 없는 기존 관계는 그대로 남는다',
  )
})

test('DB와 같은 값은 쓰지 않고 readback 대상으로는 유지한다', () => {
  const current = [stored(JEAN_VALJEAN_ID, 3, { description: null, description_en: null })]
  const plan = buildFigureBookBatchPlan(CONTENT_ID, [resolved({
    slug: 'jean-valjean',
    celebId: JEAN_VALJEAN_ID,
    relationType: 'appearance',
    description: null,
  })], current)

  assert.deepEqual(plan.changes.map((change) => change.kind), ['unchanged'])
  assert.deepEqual(plan.writeRows, [])
  assert.deepEqual(plan.expectedRows, current)
})

test('적용 후에는 기존 관계를 포함한 전체 작품 스냅샷이 정확히 같아야 한다', () => {
  const expected = [stored(JEAN_VALJEAN_ID, 0), stored(JAVERT_ID, 1)]
  assert.doesNotThrow(() => assertExactFigureBookReadback(expected, [...expected].reverse()))

  assert.throws(
    () => assertExactFigureBookReadback(expected, [expected[0]]),
    /누락/,
  )
  assert.throws(
    () => assertExactFigureBookReadback(expected, [
      expected[0],
      { ...expected[1], description_en: 'Wrong readback' },
    ]),
    /값 불일치/,
  )
  assert.throws(
    () => assertExactFigureBookReadback([expected[0]], expected),
    /예상 밖/,
  )
})

test('같은 작품 판본은 별도 복사하지 않고 한 contentId를 쓴다', () => {
  assert.throws(() => parseFigureBookBatchManifest({
    contentId: CONTENT_ID,
    copyFrom: 'another-edition-content-id',
    characters: [{
      slug: 'jean-valjean',
      relationType: 'appearance',
      description: null,
    }],
  }), /허용되지 않은 키.*copyFrom/)
})

test('모든 관계 유형의 신규 행과 지정된 기존 행은 한영 설명을 null로 저장한다', () => {
  for (const relationType of ['appearance', 'related', 'authored'] as const) {
    const current = [stored(JEAN_VALJEAN_ID, 0, { relation_type: relationType })]
    const updated = buildFigureBookBatchPlan(CONTENT_ID, [resolved({
      slug: 'jean-valjean', celebId: JEAN_VALJEAN_ID, relationType,
    })], current)
    const inserted = buildFigureBookBatchPlan(CONTENT_ID, [resolved({
      slug: 'cosette', celebId: COSETTE_ID, relationType,
    })], [])
    for (const row of [...updated.writeRows, ...inserted.writeRows]) {
      assert.equal(row.description, null)
      assert.equal(row.description_en, null)
    }
  }
  assert.throws(() => parseFigureBookBatchManifest({
    contentId: CONTENT_ID,
    characters: [{
      slug: 'jean-valjean',
      relationType: 'appearance',
      description: null,
      descriptionEn: 'Amazon 확인 없이 만든 영어 설명',
    }],
  }), /허용되지 않은 키.*descriptionEn/)
})

test('과거 설명 문자열과 잘못된 값은 유형에 관계없이 파서와 계획에서 거부한다', () => {
  assert.equal(parseFigureBookRelationDescription(undefined, 'description'), null)
  assert.equal(parseFigureBookRelationDescription(null, 'description'), null)
  for (const value of ['old description', '', 1, false, {}]) {
    assert.throws(() => parseFigureBookRelationDescription(value, 'description_en'), /폐기된 관계 설명/)
  }
  for (const relationType of ['appearance', 'related', 'authored'] as const) {
    assert.throws(() => parseFigureBookBatchManifest({
      contentId: CONTENT_ID,
      characters: [{ slug: 'jean-valjean', relationType, description: 'old description' }],
    }), /폐기된 관계 설명/)
    assert.throws(() => buildFigureBookBatchPlan(CONTENT_ID, [resolved({
      slug: 'jean-valjean', celebId: JEAN_VALJEAN_ID, relationType, description: 'old description',
    })], []), /폐기된 관계 설명/)
  }
})

test('검수 배치는 기존 창작 관계를 등장·연관으로 바꾸지 않고 그대로 보존한다', () => {
  const current = [stored(JEAN_VALJEAN_ID, 2, { relation_type: 'authored' })]
  for (const relationType of ['appearance', 'related'] as const) {
    const selections = [resolved({ slug: 'jean-valjean', celebId: JEAN_VALJEAN_ID, relationType })]
    const safe = preserveReviewedFigureBookRelations(selections, current)
    assert.equal(safe.preservedAuthored, 1)
    assert.equal(safe.preservedAppearance, 0)
    assert.deepEqual(safe.safeSelections, [])
    const plan = buildFigureBookBatchPlan(CONTENT_ID, safe.safeSelections, current)
    assert.deepEqual(plan.writeRows, [])
    assert.deepEqual(plan.expectedRows, current)
    assert.throws(() => buildFigureBookBatchPlan(CONTENT_ID, selections, current), /기존 창작 관계/)
  }
})

test('검수의 기존 등장 보호는 유지하고 연관에서 등장·창작 승격은 허용한다', () => {
  const current = [stored(JEAN_VALJEAN_ID, 0), stored(JAVERT_ID, 1, { relation_type: 'related' })]
  const selections = [
    resolved({ slug: 'jean-valjean', celebId: JEAN_VALJEAN_ID, relationType: 'related' }),
    resolved({ slug: 'javert', celebId: JAVERT_ID, relationType: 'authored' }),
    resolved({ slug: 'cosette', celebId: COSETTE_ID }),
  ]
  const safe = preserveReviewedFigureBookRelations(selections, current)
  assert.equal(safe.preservedAppearance, 1)
  assert.equal(safe.preservedAuthored, 0)
  assert.deepEqual(safe.safeSelections, selections.slice(1))
})
