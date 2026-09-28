import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCuratorMetaTitle, resolveCuratedHubMeta } from './curatedMeta'

const koMore = (count: number) => `외 ${count}개`

test('목록이 하나면 기관명 뒤에 목록 이름을 싣는다', () => {
  assert.equal(buildCuratorMetaTitle('문학사상사', ['이상문학상 대상 수상작'], koMore), '문학사상사: 이상문학상 대상 수상작')
})

test('목록 이름 앞의 기관명은 떼어 낸다', () => {
  assert.equal(buildCuratorMetaTitle('칸 영화제', ['칸 영화제 황금종려상'], koMore), '칸 영화제: 황금종려상')
  assert.equal(buildCuratorMetaTitle('BBC', ['BBC 빅 리드 100', '세상을 빚어낸 소설 100'], koMore), 'BBC: 빅 리드 100, 세상을 빚어낸 소설 100')
})

test('폭을 넘기는 목록은 남은 수로 줄인다', () => {
  assert.equal(
    buildCuratorMetaTitle('가디언', ['21세기 최고의 책 100선', '역대 최고의 논픽션 100선', '영어로 쓰인 최고의 소설 100선'], koMore),
    '가디언: 21세기 최고의 책 100선 외 2개',
  )
})

test('영문 소유격 기관명도 떼어 낸다', () => {
  assert.equal(
    buildCuratorMetaTitle('CNN', ["CNN's 10 Most Influential Books of the Decade"], (count) => `and ${count} more`),
    'CNN: 10 Most Influential Books of the Decade',
  )
})

test('첫 목록은 폭을 넘겨도 싣는다', () => {
  const title = buildCuratorMetaTitle(
    'The Pulitzer Prizes',
    ['Pulitzer Prize for Fiction Winners', 'Pulitzer Prize for History'],
    (count) => `and ${count} more`,
  )
  assert.equal(title, 'The Pulitzer Prizes: Pulitzer Prize for Fiction Winners and 1 more')
})

test('목록이 없으면 기관명만 쓴다', () => {
  assert.equal(buildCuratorMetaTitle('CNN', [], koMore), 'CNN')
})

const COUNTS = new Map([['BOOK', 100], ['VIDEO', 9], ['GAME', 5]])

test('허브 기본 화면과 도서 매체는 조건 없는 주소가 정본이다', () => {
  assert.deepEqual(resolveCuratedHubMeta({}, COUNTS, 12), { media: null, page: 1, path: '/explore/works/curated' })
  assert.equal(resolveCuratedHubMeta({ media: 'BOOK' }, COUNTS, 12).path, '/explore/works/curated')
})

test('허브의 다른 매체와 2쪽부터는 자기 주소가 정본이다', () => {
  assert.equal(resolveCuratedHubMeta({ page: '3' }, COUNTS, 12).path, '/explore/works/curated?page=3')
  assert.equal(resolveCuratedHubMeta({ media: 'VIDEO' }, COUNTS, 12).path, '/explore/works/curated?media=VIDEO')
})

test('허브의 거르기 조건은 그 매체의 첫 쪽으로 모은다', () => {
  assert.equal(resolveCuratedHubMeta({ media: 'VIDEO', country: 'FR', page: '2' }, COUNTS, 12).path, '/explore/works/curated?media=VIDEO')
  assert.equal(resolveCuratedHubMeta({ search: '퓰리처', page: '4' }, COUNTS, 12).path, '/explore/works/curated')
})

test('허브의 없는 매체·넘친 쪽은 있는 값으로 돌린다', () => {
  assert.equal(resolveCuratedHubMeta({ media: 'COMIC' }, COUNTS, 12).path, '/explore/works/curated')
  assert.equal(resolveCuratedHubMeta({ page: '99' }, COUNTS, 12).path, '/explore/works/curated?page=9')
  assert.equal(resolveCuratedHubMeta({ media: 'GAME', page: '2' }, COUNTS, 12).path, '/explore/works/curated?media=GAME')
  assert.equal(resolveCuratedHubMeta({ page: 'abc' }, COUNTS, 12).path, '/explore/works/curated')
})
