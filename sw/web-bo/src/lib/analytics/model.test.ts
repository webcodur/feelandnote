import { test } from 'node:test'
import assert from 'node:assert/strict'
import { audienceFilter, parseAnalyticsOptions, visitMetrics, displayPath, formatSeconds, type DimensionFilter } from './model'

function matches(expression: DimensionFilter, event: Record<string, string>): boolean {
  if ('andGroup' in expression) return expression.andGroup.expressions.every(part => matches(part, event))
  if ('notExpression' in expression) return !matches(expression.notExpression, event)
  const { fieldName } = expression.filter
  if ('inListFilter' in expression.filter) return expression.filter.inListFilter.values.includes(event[fieldName])
  return expression.filter.stringFilter.matchType === 'EXACT'
    ? event[fieldName] === expression.filter.stringFilter.value
    : event[fieldName]?.startsWith(expression.filter.stringFilter.value) ?? false
}

const botLike = {
  hostName: 'feelandnote.com', browserVersion: '144.0.7559.132', deviceCategory: 'desktop',
  browser: 'Chrome', language: 'English', sessionSourceMedium: '(direct) / (none)', country: 'Singapore',
}

test('의심 유입은 관찰한 조합 전체가 맞을 때만 분리하고 국가만으로 제외하지 않는다', () => {
  assert.equal(matches(audienceFilter('suspect'), botLike), true)
  assert.equal(matches(audienceFilter('filtered'), botLike), false)
  for (const change of [{ browserVersion: '144.0.0.0' }, { language: 'Korean' }, { sessionSourceMedium: 'google / organic' }, { deviceCategory: 'mobile' }, { browser: 'Edge' }]) {
    assert.equal(matches(audienceFilter('filtered'), { ...botLike, ...change }), true)
    assert.equal(matches(audienceFilter('suspect'), { ...botLike, ...change }), false)
  }
  assert.equal(matches(audienceFilter('filtered'), { ...botLike, browserVersion: '150', country: 'Singapore' }), true)
})

test('전체·한국 조건은 독립적이고 모든 조건은 운영 호스트만 포함한다', () => {
  assert.equal(matches(audienceFilter('all'), botLike), true)
  assert.equal(matches(audienceFilter('korea'), botLike), false)
  assert.equal(matches(audienceFilter('korea'), { ...botLike, country: 'South Korea' }), true)
  for (const audience of ['all', 'filtered', 'suspect', 'korea'] as const) {
    assert.equal(matches(audienceFilter(audience), { ...botLike, country: 'South Korea', hostName: 'localhost' }), false)
  }
})

test('한국 자정과 월 경계를 기준으로 어제까지 정확히 7일을 조회한다', () => {
  const before = parseAnalyticsOptions({}, new Date('2026-10-31T14:59:59Z'))
  assert.equal(before.startDate, '2026-10-24')
  assert.equal(before.endDate, '2026-10-30')
  const after = parseAnalyticsOptions({}, new Date('2026-10-31T15:00:00Z'))
  assert.equal(after.startDate, '2026-10-25')
  assert.equal(after.endDate, '2026-10-31')
})

test('오늘 포함·28일·윤년 경계를 처리하고 허용되지 않은 입력은 기본값으로 돌린다', () => {
  const options = parseAnalyticsOptions({ days: '28', today: '1', audience: 'korea' }, new Date('2024-03-01T03:00:00Z'))
  assert.equal(options.startDate, '2024-02-03')
  assert.equal(options.endDate, '2024-03-01')
  const invalid = parseAnalyticsOptions({ days: '100000', audience: 'constructor', today: ['1'] }, new Date('2026-10-20T00:00:00Z'))
  assert.equal(invalid.days, 7)
  assert.equal(invalid.audience, 'filtered')
  assert.equal(invalid.includeToday, false)
})

test('참여율은 세션을 분모로 하고 시간은 전체 세션 기준이며 데이터 없음은 비율 0과 구별한다', () => {
  const m = visitMetrics([75, 84, 61, 161, 4588])
  assert.equal(m.users, 75)
  assert.equal(m.engagementRate, 61 / 84)
  assert.equal(m.averageSeconds, 4588 / 84)
  assert.equal(visitMetrics().engagementRate, null)
  assert.equal(visitMetrics().averageSeconds, null)
  assert.equal(formatSeconds(119.8), '2분 0초')
})

test('페이지 경로 표시에서 쿼리·해시를 제거한다', () => {
  assert.equal(displayPath('/explore?q=private#anchor'), '/explore')
  assert.equal(displayPath('(not set)'), '진입 페이지 미확인')
})
