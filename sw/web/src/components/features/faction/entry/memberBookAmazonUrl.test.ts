import assert from 'node:assert/strict'
import test from 'node:test'
import { canSearchFactionMemberReadBook, getFactionMemberAmazonUrl } from './memberBookAmazonUrl'

test('a translated display title with no English edition has no Amazon purchase path', () => {
  assert.equal(getFactionMemberAmazonUrl({
    title: 'The Finger of Seolmundae Halmang',
    creator: 'Shin Dong-heun',
    canSearchEnglishBook: false,
  }), '')
})

test('a verified English edition keeps its product link or title search', () => {
  const product = getFactionMemberAmazonUrl({
    title: 'The Odyssey',
    creator: 'Homer',
    url: 'https://www.amazon.com/dp/0140268863',
    canSearchEnglishBook: true,
  })
  assert.equal(new URL(product).pathname, '/dp/0140268863')

  const search = getFactionMemberAmazonUrl({
    title: 'The Odyssey',
    creator: 'Homer',
    canSearchEnglishBook: true,
  })
  assert.equal(new URL(search).searchParams.get('k'), 'The Odyssey Homer')
})

test('read-book search requires an explicit English locale state', () => {
  assert.equal(canSearchFactionMemberReadBook('The Odyssey', undefined), false)
  assert.equal(canSearchFactionMemberReadBook('The Finger of Seolmundae Halmang', 'no-en'), false)
  assert.equal(canSearchFactionMemberReadBook(null, null), false)
  assert.equal(canSearchFactionMemberReadBook('The Odyssey', null), true)
  assert.equal(canSearchFactionMemberReadBook('Phaedrus', 'out-of-print'), true)
})
