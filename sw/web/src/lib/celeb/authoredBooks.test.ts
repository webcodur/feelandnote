import assert from 'node:assert/strict'
import test from 'node:test'
import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import { partitionFigureBooks, pickDisplayFigureBooks } from './authoredBooks'

function book(overrides: Partial<FigureBookContent> = {}): FigureBookContent {
  return {
    id: 'book', title: '작품', creator: null, thumbnailUrl: null,
    type: 'BOOK', category: 'book', relationType: 'related',
    editions: [], ...overrides,
  }
}

test('관계 유형 값으로만 가른다 — 등장·창작·연관', () => {
  const appearance = book({ id: 'appearance', creator: '전기 작가', relationType: 'appearance' })
  const authored = book({ id: 'authored', creator: '푸쉬킨', relationType: 'authored' })
  const related = book({ id: 'related', creator: '다른 저자', relationType: 'related' })
  assert.deepEqual(partitionFigureBooks([appearance, authored, related]), {
    appearanceBooks: [appearance],
    authoredBooks: [authored],
    relatedBooks: [related],
  })
})

test('저자 표기가 인물과 같아도 관계 유형이 연관이면 창작으로 올리지 않는다', () => {
  // 표기 비교는 DB 값(authored)으로 옮겼다. 화면은 이름을 보지 않는다.
  const source = book({ id: 'same-name', creator: '칼 세이건', relationType: 'related' })
  assert.deepEqual(partitionFigureBooks([source]).authoredBooks, [])
  assert.deepEqual(partitionFigureBooks([source]).relatedBooks, [source])
})

test('입력 순서를 구획 안에서 지킨다', () => {
  const first = book({ id: 'a', relationType: 'authored' })
  const second = book({ id: 'b', relationType: 'authored' })
  assert.deepEqual(partitionFigureBooks([first, second]).authoredBooks, [first, second])
})

test('요청 언어의 판본이 없는 작품(미번역본)과 절판은 어떤 화면에도 세우지 않는다', () => {
  const edition = {
    id: 1, title: '판본', creator: null, description: null, isbn: '9788900000000',
    publisher: null, thumbnailUrl: null, releaseDate: null, editionKind: null,
    textScope: null, sortOrder: 0, platform: null, purchaseUrl: null,
  }
  const confirmed = book({ id: 'confirmed', editions: [edition] })
  const outOfPrint = book({ id: 'out', editions: [edition], titleBadge: 'out-of-print' })
  const noKo = book({ id: 'no-ko', editions: [edition], titleBadge: 'no-ko' })
  const noEn = book({ id: 'no-en', editions: [], titleBadge: 'no-en' })
  const noEdition = book({ id: 'empty', editions: [] })
  assert.deepEqual(
    pickDisplayFigureBooks([confirmed, outOfPrint, noKo, noEn, noEdition]).map(({ id }) => id),
    ['confirmed', 'no-ko'],
  )
})
