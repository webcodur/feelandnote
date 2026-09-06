import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

import { FIGURE_BOOK_TERMS } from '@feelandnote/shared/constants/figure-book-terms'

// 서비스 i18n은 공유 상수와 같은 값을 보여야 한다. 문서(celeb-02-05 「용어」) → 상수 → i18n 순으로 고친다.
function messages(locale: 'ko' | 'en'): Record<string, unknown> {
  const path = resolve(process.cwd(), 'messages', locale, 'celeb.json')
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
}

function pick(root: Record<string, unknown>, key: string): unknown {
  for (const value of Object.values(root)) {
    if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) return (value as Record<string, unknown>)[key]
  }
  return undefined
}

for (const locale of ['ko', 'en'] as const) {
  test(`celeb.json(${locale})의 인물 도서 구획 이름은 공유 상수와 같다`, () => {
    const root = messages(locale)
    assert.equal(pick(root, 'sourceWorks'), FIGURE_BOOK_TERMS.section.appearance[locale])
    assert.equal(pick(root, 'relatedProducts'), FIGURE_BOOK_TERMS.section.relatedAndRecommended[locale])
    const relation = pick(root, 'sourceRelation') as Record<string, string>
    assert.equal(relation.appearance, FIGURE_BOOK_TERMS.section.appearance[locale])
    assert.equal(relation.related, FIGURE_BOOK_TERMS.section.related[locale])
    assert.equal(pick(root, 'tabCreate'), FIGURE_BOOK_TERMS.relationType.authored[locale])
  })
}
