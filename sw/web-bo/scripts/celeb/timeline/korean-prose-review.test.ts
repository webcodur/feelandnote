import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyKoreanProseReview,
  buildKoreanReviewerPrompt,
  parseKoreanProseReview,
  type TimelineEventForKoreanReview,
} from './korean-prose-review'

const original: TimelineEventForKoreanReview[] = [{
  year: 1987,
  year_end: 1990,
  kind: 'work',
  title: '바르셀로나에서 카탈로그를 찍다',
  title_en: 'Shoots catalogues in Barcelona',
  description: '스페인에 사 년을 두었다.',
  description_en: 'She stayed in Spain for four years.',
  place_name: '바르셀로나',
  place_name_en: 'Barcelona',
  lat: 41.3825,
  lng: 2.1769,
}]

test('코드펜스를 벗기고 국문 두 필드만 반영한다', () => {
  const parsed = parseKoreanProseReview(`\`\`\`json
  {
    "status":"revised",
    "summary":"직역을 고쳤다.",
    "issues":[{"index":0,"fields":["description"],"problem":"직역"}],
    "fact_check":[],
    "events":[{"index":0,"title":"바르셀로나에서 카탈로그를 찍다","description":"스페인에서 4년간 지냈다."}]
  }
  \`\`\``, 1)
  const reviewed = applyKoreanProseReview(original, parsed)

  assert.equal(reviewed.status, 'revised')
  assert.deepEqual(reviewed.changed_indices, [0])
  assert.equal(reviewed.events[0].description, '스페인에서 4년간 지냈다.')
  assert.equal(reviewed.events[0].description_en, original[0].description_en)
  assert.equal(reviewed.events[0].lat, original[0].lat)
})

test('사건을 빼거나 중복 index를 내면 거부한다', () => {
  assert.throws(() => parseKoreanProseReview(JSON.stringify({
    status: 'pass', summary: '', issues: [], fact_check: [], events: [],
  }), 1), /사건 수가 달라졌다/)
})

test('fact_check에는 확인 이유가 필요하다', () => {
  assert.throws(() => parseKoreanProseReview(JSON.stringify({
    status: 'fact_check', summary: '', issues: [], fact_check: [],
    events: [{ index: 0, title: original[0].title, description: original[0].description }],
  }), 1), /확인할 대목/)
})

test('research_needed에는 생애를 다시 조사할 이유가 필요하다', () => {
  assert.throws(() => parseKoreanProseReview(JSON.stringify({
    status: 'research_needed', summary: '', issues: [], fact_check: [], research_needed_reason: null,
    events: [{ index: 0, title: original[0].title, description: original[0].description }],
  }), 1), /재조사 이유/)
})

test('사실 감사 근거를 최종 문장 대조용으로 함께 보낸다', () => {
  const prompt = buildKoreanReviewerPrompt(
    { slug: 'carrie-anne-moss', nickname: '캐리 앤 모스' },
    [{ ...original[0], year: 2001, description: '첫째 아들이 그해 태어났다.' }],
    {
      defects: [{
        index: 0,
        field: 'year',
        current_value: '2003',
        correct_value: '2001',
        evidence: '속편 촬영은 2001년에 시작했다.',
      }],
      checks: [{
        index: 0,
        evidence: '첫째 아들은 2003년에 태어났다.',
        source_urls: ['https://example.com/a', 'https://example.org/b'],
      }],
    },
  )

  assert.match(prompt, /첫째 아들은 2003년에 태어났다/)
  assert.match(prompt, /「그해」「이듬해」「그 전해」/)
  assert.match(prompt, /fact_check로 보류/)
})
