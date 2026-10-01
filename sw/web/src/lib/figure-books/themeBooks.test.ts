import assert from 'node:assert/strict'
import test from 'node:test'
import { getThemeBookTextScope, isThemeBook, selectCelebAffiliationBooks } from './themeBooks'
import type { FactionFigureBook } from '@/actions/home/getFactionFigureBooks'

const book = (contentId: string, title: string, memberIds: string[] = []): FactionFigureBook => ({
  contentId, title, memberIds, appearedIds: memberIds, authoredIds: [], url: '',
})

test('오디세이아를 선택하면 다른 신화와 일리아스로 채우지 않고 오디세이아만 표시한다', () => {
  const books = [book('greek', '그리스 신화', ['zeus', 'odysseus']), book('odyssey', '오디세이아'), book('iliad', '일리아스')]
  const odyssey = selectCelebAffiliationBooks(books, { slug: 'homer-odyssey', name: '오디세이아', isMyth: true })
  const iliad = selectCelebAffiliationBooks(books, { slug: 'homer-iliad', name: '일리아스', isMyth: true })
  assert.deepEqual(odyssey.map((book) => book.contentId), ['odyssey'])
  assert.deepEqual(iliad.map((book) => book.contentId), ['iliad'])
})

test('주제책이 없으면 구성원에게 연결된 다른 책으로 대신 채우지 않는다', () => {
  const books = [book('distant', '다른 작품', ['a', 'b', 'c'])]
  assert.deepEqual(selectCelebAffiliationBooks(books, { slug: 'homer-odyssey', name: '오디세이아', isMyth: true }), [])
})

test('주제책은 소속 안에서 중복을 빼고 다른 소속의 조회에도 유지한다', () => {
  const shared = book('shared', '그리스 신화')
  const theme = { slug: 'greek-roman-myth', name: '그리스 신화', isMyth: true }
  assert.deepEqual(selectCelebAffiliationBooks([shared, shared], theme), [shared])
  assert.deepEqual(selectCelebAffiliationBooks([shared], theme), [shared])
})

test('구성원에게 배정되지 않은 명시적 세력 주제책도 주제에 속한다', () => {
  assert.equal(isThemeBook(book('fe895343-eb8d-450f-b2e2-e5f8655f38cd', 'AI 제국'), 'openai', 'OpenAI', false), true)
  assert.equal(isThemeBook(book('other', 'OpenAI와 무관한 책'), 'openai', 'OpenAI', false), false)
})

test('아트레우스 가문은 영문에서도 오레스테이아만 세운다', () => {
  const oresteia = book('ff0392c6-49b3-4cd4-ba03-7c1c0ec83014', 'The Oresteia')
  const books = selectCelebAffiliationBooks([book('other', 'Greek Myths', ['a', 'b']), oresteia], { slug: 'house-of-atreus', name: 'House of Atreus', isMyth: true })
  assert.deepEqual(books, [oresteia])
})

test('오디세이아 책장의 그레이브스 신화는 영웅시대 권을 선택한다', () => {
  const contentId = 'd0ae4f4f-2e9b-41e7-9670-72eaf2f85528'
  assert.equal(getThemeBookTextScope(contentId, 'homer-odyssey'), 'volume-2')
  assert.equal(getThemeBookTextScope(contentId, 'greek-roman-myth'), null)
})
