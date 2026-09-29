import assert from 'node:assert/strict'
import { test } from 'node:test'
import { planResearchIntroduction, type ResearchedBookIntroduction } from './book-research-introduction-contract'
import type { IntroductionRow } from './book-description-sources-contract'

const text = `"존 골트가 누구지?" 무너져 가는 미국에서 사람들은 체념하듯 이 말을 주고받습니다. 철도 회사를 이끄는 대그니 태거트와 새 합금을 만든 제철업자 행크 리어든은 규제와 비난 속에서도 버팁니다. 하지만 곁에 있던 유능한 사람들은 하나둘 말없이 사라집니다.

창조하는 사람들이 일손을 놓으면 세상이 어떻게 되는지를 묻는 소설입니다. 지금도 자유와 개인, 국가의 역할을 두고 논쟁이 벌어지면 찬사와 반발을 함께 불러옵니다.`
const input: ResearchedBookIntroduction = {
  contentId: 'c1', locale: 'ko', title: '아틀라스', creator: '아인 랜드', description: text,
  sourceUrl: 'https://en.wikipedia.org/wiki/Atlas_Shrugged',
  evidence: [{ url: 'https://en.wikipedia.org/wiki/Atlas_Shrugged', note: '줄거리·인물' }],
}
const row = (over: Partial<IntroductionRow> = {}): IntroductionRow => ({
  content_id: 'c1', locale: 'ko', title: '아틀라스', creator: '아인 랜드', publisher: null, isbn: null,
  description: null, sources: { primary: 'kakao' }, ...over,
})

test('fills the empty locale row and same-ISBN empty editions as F&N research', () => {
  const changes = planResearchIntroduction(input, row(), [row({ id: 1 }), row({ id: 2, isbn: '9780000000000' }), row({ id: 3, description: '판본 소개' })])
  assert.deepEqual(changes.map(c => [c.table, c.before.id]), [['content_locales', undefined], ['figure_book_editions', 1]])
  assert.deepEqual(changes[0].sources, { primary: 'kakao', description: input.sourceUrl, description_method: 'research', description_source_locale: 'ko' })
})

test('accepts an English research introduction under the English length range only', () => {
  const english = `"Who is John Galt?" In a collapsing America, people trade the phrase as a shrug of despair. Dagny Taggart, who runs a transcontinental railroad, and the steel maker Hank Rearden, inventor of a new alloy, keep working through regulation and public scorn. Yet around them the most capable people quietly vanish one by one, and Dagny sets out to learn where they have gone.

The novel asks what happens to the world when those who create stop working. It is the fullest statement of Rand's Objectivist philosophy and still draws both praise and hostility whenever freedom, the individual and the role of the state are debated.`
  const en = { ...input, locale: 'en' as const, title: 'Atlas Shrugged', description: english }
  const changes = planResearchIntroduction(en, row({ locale: 'en', title: 'Atlas Shrugged' }), [])
  assert.equal(changes[0].sources.description_source_locale, 'en')
  assert.throws(() => planResearchIntroduction({ ...en, description: 'A short English note about the book and the author.' }, row({ locale: 'en', title: 'Atlas Shrugged' }), []))
})

test('refuses filled rows, markers, identity drift, thin text and missing evidence', () => {
  assert.throws(() => planResearchIntroduction(input, row({ description: 'KAKAO' }), []))
  assert.throws(() => planResearchIntroduction(input, row({ description: '기존 소개' }), []))
  assert.throws(() => planResearchIntroduction(input, row({ title: '다른 책' }), []))
  assert.throws(() => planResearchIntroduction({ ...input, description: '짧은 소개입니다.' }, row(), []))
  assert.throws(() => planResearchIntroduction({ ...input, evidence: [] }, row(), []))
  assert.throws(() => planResearchIntroduction({ ...input, sourceUrl: 'http://example.com' }, row(), []))
})
