import assert from 'node:assert/strict'
import test from 'node:test'

import {
  generateAIPrompt,
  parseJsonInput,
} from '../../app/(admin)/members/[id]/contents/collect/lib/utils'
import { buildExternalSearchPlan, normalizeBookIsbn } from './ai-collect-search'

test('parseJsonInput preserves a BOOK ISBN for exact metadata lookup', () => {
  const [item] = parseJsonInput(`
    [
      {
        "type": "BOOK",
        "title": "여행의 이유(김영하)",
        "isbn": "978-89-546-5597-2",
        "body": "읽은 경위",
        "source": "https://example.com/source"
      }
    ]
  `)

  assert.equal(
    item.isbn,
    '978-89-546-5597-2'
  )
})

test('BOOK search uses normalized ISBN and never falls back to a title', () => {
  const plan = buildExternalSearchPlan({
    type: 'BOOK',
    title: 'Demian',
    titleKo: '데미안',
    creator: 'Hermann Hesse',
    isbn: 'ISBN-13: 978-89-546-5597-2',
  })

  assert.deepEqual(plan, { primaryQuery: '9788954655972' })
})

test('BOOK search keeps the title-and-creator fallback when ISBN is absent', () => {
  const plan = buildExternalSearchPlan({
    type: 'BOOK',
    title: 'Demian',
    titleKo: '데미안',
    creator: 'Hermann Hesse',
  })

  assert.deepEqual(plan, {
    primaryQuery: '데미안 - Hermann Hesse',
    fallbackQuery: 'Demian - Hermann Hesse',
  })
})

test('invalid ISBN input falls back to title matching', () => {
  assert.equal(normalizeBookIsbn('978-89-546-5597-X'), undefined)
  assert.deepEqual(buildExternalSearchPlan({
    type: 'BOOK',
    title: 'Demian',
    titleKo: '데미안',
    creator: 'Hermann Hesse',
    isbn: '978-89-546-5597-X',
  }), {
    primaryQuery: '데미안 - Hermann Hesse',
    fallbackQuery: 'Demian - Hermann Hesse',
  })
})

test('the collection prompt requests a verified Korean-edition ISBN', () => {
  const prompt = generateAIPrompt()

  assert.match(prompt, /"isbn": "9781234567890"/)
  assert.match(prompt, /실제로 확인한 해당 한국어판의 ISBN-13/)
})
