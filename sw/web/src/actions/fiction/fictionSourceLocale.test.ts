import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getFictionSourceCharacterDescription,
  getFictionSourceLocaleFields,
  hasFictionSourceAffiliateLinkForLocale,
} from './fictionSourceLocale'

test('소개와 판본 정보는 다른 언어 locale 값으로 대체하지 않는다', () => {
  const fields = getFictionSourceLocaleFields([
    { locale: 'ko', title: '신통기', creator: '헤시오도스', thumbnail_url: null },
    {
      locale: 'en',
      title: 'Theogony',
      creator: 'Hesiod',
      thumbnail_url: null,
      description: 'English introduction',
      publisher: 'English Publisher',
      isbn: '1111111111111',
    },
  ], 'ko')

  assert.deepEqual(fields, {
    description: null,
    publisher: null,
    isbn: null,
    coupangUrl: null,
    amazonUrl: null,
  })
})

test('한국어판 쿠팡 링크만 구매 링크로 고른다', () => {
  const fields = getFictionSourceLocaleFields([{
    locale: 'ko',
    title: '오디세이아',
    creator: '호메로스',
    thumbnail_url: null,
    affiliate_url: [
      { platform: 'amazon', url: 'https://example.com/amazon' },
      { platform: 'coupang', url: 'https://link.coupang.com/a/example' },
    ],
  }], 'ko')

  assert.equal(fields.coupangUrl, 'https://link.coupang.com/a/example')
})

test('English source works never expose a Coupang affiliate link', () => {
  const fields = getFictionSourceLocaleFields([{
    locale: 'en',
    title: 'Theogony',
    creator: 'Hesiod',
    thumbnail_url: null,
    affiliate_url: [
      { platform: 'coupang', url: 'https://link.coupang.com/a/example' },
    ],
  }], 'en')

  assert.equal(fields.coupangUrl, null)
})

test('영문판은 같은 en locale의 Amazon 링크만 구매 링크로 고른다', () => {
  const fields = getFictionSourceLocaleFields([{
    locale: 'en',
    title: 'Theogony',
    creator: 'Hesiod',
    thumbnail_url: null,
    affiliate_url: [
      { platform: 'coupang', url: 'https://link.coupang.com/a/example' },
      { platform: 'amazon', url: 'https://www.amazon.com/dp/example' },
    ],
  }], 'en')

  assert.equal(fields.coupangUrl, null)
  assert.equal(fields.amazonUrl, 'https://www.amazon.com/dp/example')
})

test('원전 책장은 요청 locale의 구매 제휴링크가 있는 판본만 노출한다', () => {
  assert.equal(hasFictionSourceAffiliateLinkForLocale({
    coupangUrl: 'https://link.coupang.com/a/example',
    amazonUrl: null,
  }, 'ko'), true)
  assert.equal(hasFictionSourceAffiliateLinkForLocale({
    coupangUrl: null,
    amazonUrl: 'https://www.amazon.com/dp/example',
  }, 'ko'), false)
  assert.equal(hasFictionSourceAffiliateLinkForLocale({
    coupangUrl: null,
    amazonUrl: 'https://www.amazon.com/dp/example',
  }, 'en'), true)
  assert.equal(hasFictionSourceAffiliateLinkForLocale({
    coupangUrl: 'https://link.coupang.com/a/example',
    amazonUrl: null,
  }, 'en'), false)
})

test('인물별 등장 설명은 요청 언어 값만 사용한다', () => {
  const assignment = {
    description: '한국어 등장 설명',
    description_en: 'English appearance description',
  }

  assert.equal(
    getFictionSourceCharacterDescription(assignment, 'ko'),
    '한국어 등장 설명',
  )
  assert.equal(
    getFictionSourceCharacterDescription(assignment, 'en'),
    'English appearance description',
  )
})

test('인물별 등장 설명은 반대 언어로 대체하지 않는다', () => {
  assert.equal(
    getFictionSourceCharacterDescription({
      description: '한국어 등장 설명',
      description_en: null,
    }, 'en'),
    null,
  )
})
