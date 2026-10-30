import assert from 'node:assert/strict'
import test from 'node:test'
import { createClient } from '@feelandnote/db'
import { auditInactiveRequiredValues, parseOptions, requiredValueGaps, type Profile } from './audit-inactive-required-values.mts'

const profile = (): Profile => ({
  id: 'p', slug: 'person', nickname: '인물', nickname_en: 'Person', profession: 'director', nationality: 'KR',
  birth_date: '1900-01-01', death_date: null, gender: false, title: '감독', title_en: 'Director',
  bio: '소개.', bio_en: 'Biography.', headline: '한 줄.', headline_en: 'Headline.', avatar_url: 'https://assets.test/avatar.webp',
  virtual_monologue: '독백.', virtual_monologue_en: 'Monologue.', publication_status: 'inactive',
  celeb_tier: 'light', celeb_reality: 'REAL', content_research_confirmed_empty_at: '2026-10-12T00:00:00Z',
  reading_way: '', reading_way_en: '',
})
const guide = { profile_id: 'p', plain_text: '안내.', plain_text_en: 'Guide.' }
const quote = { celeb_id: 'p', quote: '검증된 한마디.', quote_en: 'Verified quote.' }

test('독서 방식은 본문 필수가 아니라 조사 1회 필수이며, 미달도 충족한다', () => {
  const p = profile(); p.reading_way = null; p.reading_way_en = null
  assert.deepEqual(requiredValueGaps(p, guide, quote, 1), ['reading_way_research'])
  p.celeb_reality = 'BOTH'
  assert.deepEqual(requiredValueGaps(p, guide, quote, 1), ['reading_way_research'])
  p.reading_way = ''; p.reading_way_en = ''
  assert.deepEqual(requiredValueGaps(p, guide, quote, 1), [])
  p.reading_way = null; p.reading_way_en = null; p.celeb_reality = 'FICTION'
  assert.deepEqual(requiredValueGaps(p, guide, quote, 0), [])
})

test('선택 데이터·생존 인물 사망일·여성의 false 값은 결손이 아니다', () => {
  assert.deepEqual(requiredValueGaps(profile(), guide, quote, 0), [])
})

test('필수 영어 본문과 한마디가 빠지면 완비로 보지 않는다', () => {
  const p = profile(); p.virtual_monologue_en = '  '
  assert.deepEqual(requiredValueGaps(p, { ...guide, plain_text_en: '' }, { ...quote, quote_en: '' }, 1),
    ['virtual_monologue_en', 'plain_text_en', 'quote_en'])
})

test('실존 축이 콘텐츠 조사 요건을 가르고, full이라는 이름만으로 조사 완료를 추정하지 않는다', () => {
  const p = profile(); p.content_research_confirmed_empty_at = null; p.celeb_tier = 'full'
  assert.deepEqual(requiredValueGaps(p, guide, quote, 0), ['content_research'])
  assert.deepEqual(requiredValueGaps(p, guide, quote, 1), [])
  p.celeb_reality = 'FICTION'
  assert.deepEqual(requiredValueGaps(p, guide, quote, 0), [])
})

test('단독 미상 값은 걸러내지만, 없는 한마디의 표준값이나 본문 속 단어를 오인하지 않는다', () => {
  const p = profile(); p.bio = '미상'; p.bio_en = 'His early life is unknown, but his career is documented.'
  assert.deepEqual(requiredValueGaps(p, guide, { ...quote, quote: '없음', quote_en: 'None' }, 1), ['bio'])
})

test('쓰기 옵션과 알 수 없는 인자를 거절하고, slug·JSON 조회 옵션만 받는다', () => {
  assert.throws(() => parseOptions(['--apply']), /지원하지 않는 인자/)
  assert.throws(() => parseOptions(['--slugs', '--json']), /slug/)
  assert.deepEqual(parseOptions(['--', '--json', '--slugs=a,b,a']),
    { json: true, showGaps: false, help: false, slugs: ['a', 'b'] })
})

test('페이지를 끝까지 읽고 후보를 판정하며, 실제 DB 요청은 모두 GET이다', async () => {
  const profiles = Array.from({ length: 103 }, (_, i) => ({ ...profile(), id: String(i).padStart(3, '0'), slug: `person-${i}` }))
  const calls: { table: string; method: string }[] = []
  const db = createClient('https://database.test', 'test-only', { global: {
    fetch: async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input)); const table = url.pathname.split('/').pop()!
      calls.push({ table, method: init?.method ?? 'GET' })
      let rows: Record<string, unknown>[] = table === 'celebs' ? profiles
        : table === 'celeb_explanations' ? profiles.map(p => ({ ...guide, profile_id: p.id }))
        : table === 'celeb_dialogues' ? profiles.map(p => ({ ...quote, celeb_id: p.id })) : []
      const idColumn = table === 'celeb_explanations' ? 'profile_id' : 'celeb_id'
      const filter = url.searchParams.get(idColumn)
      if (filter) {
        const ids = new Set(filter.replace(/^in\.(\(|\[)|[)\]]$/g, '').split(',').map(id => id.replace(/^"|"$/g, '')))
        rows = rows.filter(row => ids.has(String(row[idColumn])))
      }
      const headers = new Headers(init?.headers)
      const range = headers.get('Range')
      const from = Number(url.searchParams.get('offset') ?? range?.split('-')[0] ?? 0)
      const limit = Number(url.searchParams.get('limit') ?? (range ? Number(range.split('-')[1]) - from + 1 : 100))
      return new Response(JSON.stringify(rows.slice(from, from + limit)), { status: 200, headers: { 'content-type': 'application/json' } })
    },
  } })
  const result = await auditInactiveRequiredValues(db)
  assert.equal(result.scannedInactive, 103)
  assert.equal(result.valuesCompleteCount, 103)
  assert.equal(result.incompleteCount, 0)
  assert.ok(result.candidates.every(row => row.contentCount === -1))
  assert.ok(calls.filter(call => call.table === 'celebs').length >= 2)
  assert.ok(calls.every(call => call.method === 'GET'))
  assert.ok(result.manualChecks.includes('관계망 조사'))
})
