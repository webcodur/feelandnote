import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assertExactFictionSourceReadback,
  buildFictionSourceBatchPlan,
  parseFictionSourceBatchManifest,
  type FictionSourceCharacterRow,
  type ResolvedFictionSourceCharacter,
} from './source-batch-contract'

const CONTENT_ID = 'content-les-miserables'
const JEAN_VALJEAN_ID = '00000000-0000-4000-8000-000000000001'
const JAVERT_ID = '00000000-0000-4000-8000-000000000002'
const COSETTE_ID = '00000000-0000-4000-8000-000000000003'

function resolved(
  input: Partial<ResolvedFictionSourceCharacter> & Pick<ResolvedFictionSourceCharacter, 'celebId' | 'slug'>,
): ResolvedFictionSourceCharacter {
  return {
    relationType: 'appearance',
    description: `${input.slug}의 한국어 등장 설명`,
    ...input,
  }
}

function stored(
  celebId: string,
  sortOrder: number,
  overrides: Partial<FictionSourceCharacterRow> = {},
): FictionSourceCharacterRow {
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

test('작품 하나와 인물별 한국어 등장 설명을 정리한다', () => {
  assert.deepEqual(parseFictionSourceBatchManifest({
    contentId: ` ${CONTENT_ID} `,
    title: ' 레 미제라블 ',
    characters: [{
      slug: ' jean-valjean ',
      relationType: 'appearance',
      description: ' 장 발장은 작품의 주인공이다. ',
      sortOrder: 0,
    }, {
      celebId: ` ${JAVERT_ID} `,
      relationType: 'appearance',
      description: '자베르는 장 발장을 추적한다.',
    }],
  }), {
    contentId: CONTENT_ID,
    title: '레 미제라블',
    characters: [{
      slug: 'jean-valjean',
      relationType: 'appearance',
      description: '장 발장은 작품의 주인공이다.',
      sortOrder: 0,
    }, {
      celebId: JAVERT_ID,
      relationType: 'appearance',
      description: '자베르는 장 발장을 추적한다.',
    }],
  })
})

test('관계 유형, 한국어 설명, 단일 식별자, 정렬값을 필수 검증한다', () => {
  const base = {
    contentId: CONTENT_ID,
    characters: [{
      slug: 'jean-valjean',
      relationType: 'appearance',
      description: '한국어 설명',
    }],
  }

  assert.throws(
    () => parseFictionSourceBatchManifest({
      ...base,
      characters: [{ ...base.characters[0], relationType: 'cameo' }],
    }),
    /appearance, related/,
  )
  assert.throws(
    () => parseFictionSourceBatchManifest({
      ...base,
      characters: [{ ...base.characters[0], celebId: JEAN_VALJEAN_ID }],
    }),
    /중 하나만/,
  )
  assert.throws(
    () => parseFictionSourceBatchManifest({
      ...base,
      characters: [{ ...base.characters[0], sortOrder: -1 }],
    }),
    /0 이상의 정수/,
  )

  assert.deepEqual(parseFictionSourceBatchManifest({
    contentId: CONTENT_ID,
    characters: [{ slug: 'javert', relationType: 'related' }],
  }).characters[0], {
    slug: 'javert',
    relationType: 'related',
    description: null,
  })
  assert.throws(
    () => parseFictionSourceBatchManifest({
      contentId: CONTENT_ID,
      characters: [{
        slug: 'javert',
        relationType: 'related',
        description: '연관 관계에는 넣을 수 없는 등장 설명',
      }],
    }),
    /연관 도서 관계에 입력할 수 없습니다/,
  )
})

test('입력과 해석 뒤의 대상 인물 중복을 모두 거부한다', () => {
  assert.throws(() => parseFictionSourceBatchManifest({
    contentId: CONTENT_ID,
    characters: [0, 1].map(() => ({
      slug: 'jean-valjean',
      relationType: 'appearance',
      description: '한국어 설명',
    })),
  }), /대상 인물이 중복/)

  assert.throws(() => buildFictionSourceBatchPlan(CONTENT_ID, [
    resolved({ slug: 'jean-valjean', celebId: JEAN_VALJEAN_ID }),
    resolved({ slug: 'valjean', celebId: JEAN_VALJEAN_ID }),
  ], []), /해석된 대상 인물이 중복/)
})

test('지정한 인물만 증분 갱신하고 작품의 다른 기존 관계는 보존한다', () => {
  const current = [
    stored(JEAN_VALJEAN_ID, 2),
    stored(JAVERT_ID, 5),
  ]
  const plan = buildFictionSourceBatchPlan(CONTENT_ID, [
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
  const current = [stored(JEAN_VALJEAN_ID, 3)]
  const plan = buildFictionSourceBatchPlan(CONTENT_ID, [resolved({
    slug: 'jean-valjean',
    celebId: JEAN_VALJEAN_ID,
    relationType: 'appearance',
    description: current[0].description!,
  })], current)

  assert.deepEqual(plan.changes.map((change) => change.kind), ['unchanged'])
  assert.deepEqual(plan.writeRows, [])
  assert.deepEqual(plan.expectedRows, current)
})

test('적용 후에는 기존 관계를 포함한 전체 작품 스냅샷이 정확히 같아야 한다', () => {
  const expected = [stored(JEAN_VALJEAN_ID, 0), stored(JAVERT_ID, 1)]
  assert.doesNotThrow(() => assertExactFictionSourceReadback(expected, [...expected].reverse()))

  assert.throws(
    () => assertExactFictionSourceReadback(expected, [expected[0]]),
    /누락/,
  )
  assert.throws(
    () => assertExactFictionSourceReadback(expected, [
      expected[0],
      { ...expected[1], description_en: 'Wrong readback' },
    ]),
    /값 불일치/,
  )
  assert.throws(
    () => assertExactFictionSourceReadback([expected[0]], expected),
    /예상 밖/,
  )
})

test('같은 작품 판본은 별도 복사하지 않고 한 contentId의 설명 한 벌을 쓴다', () => {
  assert.throws(() => parseFictionSourceBatchManifest({
    contentId: CONTENT_ID,
    copyFrom: 'another-edition-content-id',
    characters: [{
      slug: 'jean-valjean',
      relationType: 'appearance',
      description: '한국어 설명',
    }],
  }), /허용되지 않은 키.*copyFrom/)
})

test('한국어 배치는 새 영어 설명을 만들지 않고 기존 영어 설명은 보존한다', () => {
  const current = [stored(JEAN_VALJEAN_ID, 0)]
  const updated = buildFictionSourceBatchPlan(CONTENT_ID, [resolved({
    slug: 'jean-valjean',
    celebId: JEAN_VALJEAN_ID,
    description: '새 한국어 설명',
  })], current)
  const inserted = buildFictionSourceBatchPlan(CONTENT_ID, [resolved({
    slug: 'cosette',
    celebId: COSETTE_ID,
  })], [])

  assert.equal(updated.writeRows[0].description_en, current[0].description_en)
  assert.equal(inserted.writeRows[0].description_en, null)
  assert.throws(() => parseFictionSourceBatchManifest({
    contentId: CONTENT_ID,
    characters: [{
      slug: 'jean-valjean',
      relationType: 'appearance',
      description: '한국어 설명',
      descriptionEn: 'Amazon 확인 없이 만든 영어 설명',
    }],
  }), /허용되지 않은 키.*descriptionEn/)
})
