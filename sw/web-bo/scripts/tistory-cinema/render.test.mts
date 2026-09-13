import assert from 'node:assert/strict'
import test from 'node:test'
import { renderPerson, renderWork, TITLE_MAX, type Material, type PersonMaterial } from './render.mts'

/**
 * 「필앤노트 리뷰」의 강조 렌더링 검사는 그 절과 함께 걷었다(26.09.06).
 * 남은 것은 **DB 감상문을 렌더러가 손대지 않는다**는 보장이다. 감상문의 별표는 사람이
 * 쓴 원문이고, 마크다운으로 해석해 굵게 만들면 우리가 남의 말을 고치는 셈이 된다.
 */
const work: Material = {
  work: { id: 'work', title: '작품', poster: null, creator: null, release: null },
  tmdb: {}, total: 1,
  picked: [{ slug: 'person', nickname: '인물', profession: null, title: null, review: 'DB 감상의 **원문 표기** 와 <b>태그</b>' }],
}

test('work leaves DB review text untouched and escapes its HTML', () => {
  const { html } = renderWork(work)
  assert.ok(html.includes('DB 감상의 **원문 표기**'))
  assert.ok(html.includes('&lt;b&gt;태그&lt;/b&gt;'))
  assert.ok(!html.includes('<b>태그</b>'))
  assert.ok(!html.includes('<strong>원문 표기</strong>'))
})

test('work drops the removed 필앤노트 리뷰 section', () => {
  const { html } = renderWork(work)
  assert.ok(!html.includes('필앤노트 리뷰'))
  assert.ok(!html.includes('fn-note'))
})

test('long movie title keeps its headline by omitting the viewer count', () => {
  const movie = '스타워즈 에피소드 4: 새로운 희망'
  const headline = '제국에 맞서는 소년'
  const { title } = renderWork({ ...work, work: { ...work.work, title: movie }, total: 20, headline })
  assert.ok(title.startsWith(headline))
  assert.ok(title.includes(movie))
  assert.ok(title.length <= TITLE_MAX)
})

test('numeric movie title uses the spoken final consonant for its particle', () => {
  const { title } = renderWork({ ...work, work: { ...work.work, title: '300' }, headline: '협곡으로 향한 왕' })
  assert.ok(title.includes('『300』을 감상한'))
})

test('a single short movie record reads as a complete person article', () => {
  const person: PersonMaterial = {
    celeb: { slug: 'person', name: '인물', profession: null, title: null, headline: null, bio: null, avatar: null },
    total: 1, usable: 1,
    picked: [{ id: 'movie', title: '작품', poster: null, creator: null, release: null, vote: null, review: '지인에게 건넨 추천 목록에 이 영화가 들어 있다.' }],
  }
  const { html, title } = renderPerson(person)
  assert.ok(title.includes('작품'))
  assert.ok(title.length <= TITLE_MAX)
  assert.ok(html.includes(person.picked[0].review))
  assert.ok(html.includes('이 영화에 관해 남긴 이야기를 소개합니다.'))
  assert.ok(!html.includes('나머지 0편'))
  assert.ok(!html.includes('인터뷰와 방송에서 직접 언급'))
})
