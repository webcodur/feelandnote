import assert from 'node:assert/strict'
import test from 'node:test'
import robots from './robots'

// Google REP: 경로는 접두어·*·$로 비교하고, 가장 긴 일치 규칙을 택한다. 동률은 Allow다.
function allowed(agent: string, path: string): boolean {
  const rules = robots().rules
  assert.ok(Array.isArray(rules))
  const group = rules.find((rule) => [rule.userAgent].flat().includes(agent))
    ?? rules.find((rule) => rule.userAgent === '*')
  assert.ok(group)
  const matches = ([['allow', true], ['disallow', false]] as const).flatMap(([key, allow]) =>
    [group[key] ?? []].flat().flatMap((pattern) => {
      const expression = pattern.split('*').map((part) => part.replace(/[.+?^{}()|[\]\\]/g, '\\$&')).join('.*')
      return new RegExp(`^${expression}`).test(path) ? [{ allow, length: pattern.length }] : []
    }),
  ).sort((a, b) => b.length - a.length || Number(b.allow) - Number(a.allow))
  return matches[0]?.allow ?? true
}

test('일반 검색·답변 봇이 한영 기관 선정의 매체·쪽을 읽을 수 있다', () => {
  for (const agent of ['Googlebot', 'OAI-SearchBot', 'Claude-SearchBot']) {
    for (const prefix of ['', '/en']) {
      for (const query of ['?page=2', '?media=VIDEO&page=2', '?media=GAME']) {
        assert.equal(allowed(agent, `${prefix}/explore/works/curated${query}`), true)
      }
      for (const key of ['search', 'country', 'topic', 'kind', 'sort', 'sortBy']) {
        for (const query of [`?${key}=value&page=2`, `?media=VIDEO&page=2&${key}=value`]) {
          assert.equal(allowed(agent, `${prefix}/explore/works/curated${query}`), false, query)
        }
      }
    }
    assert.equal(allowed(agent, '/explore/feed?page=2'), false)
    assert.equal(allowed(agent, '/lab/frames'), false)
    assert.equal(allowed(agent, '/en/lab/frames'), false)
  }
})

test('학습용 봇의 기관 선정 차단은 유지된다', () => {
  for (const agent of ['GPTBot', 'ClaudeBot', 'Google-Extended']) {
    assert.equal(allowed(agent, '/explore/works/curated?page=2'), false)
    assert.equal(allowed(agent, '/en/explore/works/curated?media=VIDEO&page=2'), false)
  }
})
