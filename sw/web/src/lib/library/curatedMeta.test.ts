import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCuratorMetaTitle, curatedListSubject, fitListNames, leadDescription, resolveCuratedHubMeta } from './curatedMeta'

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

test('쌍점으로 이은 기관명과 괄호 부연이 붙은 기관명도 떼어 낸다', () => {
  const enMore = (count: number) => `and ${count} more`
  assert.equal(buildCuratorMetaTitle('Time Out', ['Time Out: The 100 Best Horror Films'], enMore), 'Time Out: The 100 Best Horror Films')
  assert.equal(buildCuratorMetaTitle('BBC Culture', ['BBC Culture: The 100 Greatest Comedies of All Time'], enMore), 'BBC Culture: The 100 Greatest Comedies of All Time')
  assert.equal(
    buildCuratorMetaTitle('Sight and Sound (British Film Institute)', ["Sight and Sound: The Greatest Films of All Time (2022 Critics' Poll)"], enMore),
    "Sight and Sound (British Film Institute): The Greatest Films of All Time (2022 Critics' Poll)",
  )
})

test('떼면 토막만 남는 목록 이름은 통째로 쓰고 기관명 머리를 두지 않는다', () => {
  const enMore = (count: number) => `and ${count} more`
  assert.equal(buildCuratorMetaTitle('여성문학상', ['여성문학상 수상작'], koMore), '여성문학상 수상작')
  assert.equal(buildCuratorMetaTitle('타임', ['타임 선정 100대 소설'], koMore), '타임 선정 100대 소설')
  assert.equal(buildCuratorMetaTitle('베일리 기퍼드상', ['베일리 기퍼드상 논픽션'], koMore), '베일리 기퍼드상 논픽션')
  assert.equal(buildCuratorMetaTitle('케임브리지대 철학과', ['케임브리지대 철학과 추천도서'], koMore), '케임브리지대 철학과 추천도서')
  assert.equal(buildCuratorMetaTitle("Women's Prize", ["Women's Prize for Fiction"], enMore), "Women's Prize for Fiction")
  assert.equal(buildCuratorMetaTitle('The Baillie Gifford Prize', ['The Baillie Gifford Prize for Non-Fiction'], enMore), 'The Baillie Gifford Prize for Non-Fiction')
  // 이름이 남으면 그대로 뗀다
  assert.equal(buildCuratorMetaTitle('왕립학회', ['왕립학회 과학도서상'], koMore), '왕립학회: 과학도서상')
})

test('목록 문장의 주어는 기관명과 목록 이름을 겹치지 않게 나눈다', () => {
  assert.deepEqual(curatedListSubject('칸 영화제', '칸 영화제 황금종려상'), { curator: '칸 영화제', title: '황금종려상' })
  assert.deepEqual(curatedListSubject('여성문학상', '여성문학상 수상작'), { curator: null, title: '여성문학상 수상작' })
  assert.deepEqual(curatedListSubject('더 게임 어워즈', '올해의 게임'), { curator: '더 게임 어워즈', title: '올해의 게임' })
})

test('설명문 머리의 목록 이름은 폭 안에 드는 만큼만 싣는다', () => {
  assert.equal(fitListNames(['포스텍 권장도서 100선'], koMore), '포스텍 권장도서 100선')
  assert.equal(
    fitListNames(['고려대 도서관 추천 고전 소설 30선', '고려대 도서관 추천 고전 사상 20선', '고려대 학과별 권장도서', '고려대 권장도서 100선'], koMore),
    '고려대 도서관 추천 고전 소설 30선, 고려대 도서관 추천 고전 사상 20선, 고려대 학과별 권장도서 외 1개',
  )
})

test('설명문은 머리 문장 뒤에 소개문 요약을 남은 폭만큼 잇는다', () => {
  const cut = (value: string, max: number) => value.slice(0, max)
  assert.equal(leadDescription('A의 B 목록, 수록작 12개.', '2014–2025년 수상작.', cut), 'A의 B 목록, 수록작 12개. 2014–2025년 수상작.')
  assert.equal(leadDescription('머리.', null, cut), '머리.')
  assert.equal(leadDescription('머리.', 'x'.repeat(400), cut).length, 160)
  assert.equal(leadDescription('가'.repeat(150), '본문', cut), '가'.repeat(150), '남은 자리가 좁으면 본문을 잇지 않는다')
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
