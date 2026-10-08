import assert from 'node:assert/strict'
import test from 'node:test'
import { getSeoImageUrl, toSeoSummary } from './seo'

test('SEO 이미지 URL은 소스가 없어도 안정적인 버전 키를 갖는다', () => {
  const first = new URL(getSeoImageUrl('celeb', 'jensen-huang', 'ko'))
  const second = new URL(getSeoImageUrl('celeb', 'jensen-huang', 'ko'))

  assert.ok(first.searchParams.get('v'))
  assert.equal(first.searchParams.get('v'), second.searchParams.get('v'))
})

test('SEO 이미지 소스가 바뀌면 버전 키도 바뀌다', () => {
  const before = new URL(getSeoImageUrl('content', 'book-1', 'en', 'https://img.example/old.webp'))
  const after = new URL(getSeoImageUrl('content', 'book-1', 'en', 'https://img.example/new.webp'))

  assert.notEqual(before.searchParams.get('v'), after.searchParams.get('v'))
})

test('인물 합성 변경은 같은 아바타도 새 캐시 키를 쓰고 작품 키는 유지한다', () => {
  const source = 'https://img.example/avatar.webp'
  const person = new URL(getSeoImageUrl('celeb', 'person', 'ko', source))
  const content = new URL(getSeoImageUrl('content', 'book', 'ko', source))
  assert.notEqual(person.searchParams.get('v'), content.searchParams.get('v'))
  assert.equal(person.pathname, '/seo-image/celeb/person')
})

test('긴 소개문은 한도 안에 드는 앞 문장까지만 싣는다', () => {
  const text = '1977년 이상문학상을 제정해 2024년 제47회까지 주관한 한국의 문학 전문 출판사다. 소설가 이상의 문학적 업적을 기리기 위해 상을 만들었고, 해마다 대상 수상작을 표제로 삼은 이상문학상 작품집을 펴냈다. 2025년 제48회부터는 다산북스가 주관사를 이어받았다.'
  const summary = toSeoSummary(text, 120)

  assert.equal(summary, '1977년 이상문학상을 제정해 2024년 제47회까지 주관한 한국의 문학 전문 출판사다. 소설가 이상의 문학적 업적을 기리기 위해 상을 만들었고, 해마다 대상 수상작을 표제로 삼은 이상문학상 작품집을 펴냈다.')
  assert.ok(summary.length <= 120)
})

test('첫 문장부터 넘치면 「…」로 자르지 않고 빈 값을 돌려준다', () => {
  assert.equal(toSeoSummary('one two three four five six seven eight nine ten.', 20), '')
})

test('약어 뒤 마침표에서는 문장을 끊지 않는다', () => {
  const text = 'A registered charity in England (no. 1090049) that runs the prize. It was created in 2002.'
  assert.equal(toSeoSummary(text, 70), 'A registered charity in England (no. 1090049) that runs the prize.')
})

test('작품 이름과 인용 안의 마침표·말줄임은 그대로 두고 그 안에서 끊지 않는다', () => {
  const text = '《Mr. Nobody》는 선택을 다룬다. 「기다려… 아직 끝나지 않았다. 다시 본다」라는 대사로 끝난다. 셋째 문장이다.'
  assert.equal(
    toSeoSummary(text, 60),
    '《Mr. Nobody》는 선택을 다룬다. 「기다려… 아직 끝나지 않았다. 다시 본다」라는 대사로 끝난다.',
  )
})

test('짧은 소개문은 그대로 둔다', () => {
  assert.equal(toSeoSummary('짧은 소개다.', 160), '짧은 소개다.')
})
