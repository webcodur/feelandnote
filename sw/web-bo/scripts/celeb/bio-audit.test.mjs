import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fingerprint, validateResult, sampleRecords, windowDigest, validateApproval, guardedPatch, parseAccounts, parseResult, writeDisposition, recoverResearchWindow } from './bio-audit-contract.mjs'
import { pageText, assertGrounding, fetchSource, researchEvidence } from './bio-audit-sources.mjs'

const person = { id: 'p1', slug: 'person-one', nickname: '인물', bio: '기존 소개.', bio_en: 'Existing biography.',
  updated_at: '2026-10-21T00:00:00Z', publication_status: 'active', title: '기존 수식어' }
const source = { url: 'https://museum.example.org/person', title: 'Museum biography', primary: true, opened: true,
  identityEvidence: '생년과 소속이 배정 인물과 일치함', excerpt: 'A recorded biographical fact.' }
function result(overrides = {}) {
  return { id: person.id, slug: person.slug, decision: 'REVISE', reason: '기존 소개에 인물 식별에 필요한 정보가 없음',
    issues: ['식별 정보 부족'], bio: '한국의 작가로, 특정 작품을 집필했다.', bio_en: 'A Korean author who wrote a particular work.',
    risk: 'normal', sources: [structuredClone(source)],
    currentClaims: [{ claim: '기존 주장', verdict: 'SUPPORTED', sourceIndexes: [0] }],
    claims: [{ claim: '최종 소개의 사실', verdict: 'SUPPORTED', sourceIndexes: [0] }],
    selfCheck: { identity: true, facts: true, bilingual: true, currentClaimsComplete: true },
    expectedFingerprint: fingerprint(person), ...overrides }
}
test('a revision needs inspected identity evidence and supported final claims', () => {
  assert.equal(validateResult(result(), person).decision, 'REVISE')
  assert.throws(() => validateResult(result({ id: 'another-person' }), person), /identity/)
  assert.throws(() => validateResult(result({ sources: [{ ...source, opened: false }] }), person), /evidence/)
  assert.throws(() => validateResult(result({ claims: [{ claim: '불확실한 주장', verdict: 'UNVERIFIED', sourceIndexes: [0] }] }), person), /unsupported/)
  assert.throws(() => validateResult(result({ sources: [{ ...source, primary: false }] }), person), /independent/)
  assert.throws(() => validateResult(result({ sources: [{ ...source, url: 'https://google.com/search?q=person' }] }), person), /Search results/)
})
test('KEEP must preserve both languages and cannot approve an unverified old claim', () => {
  const keep = result({ decision: 'KEEP', bio: person.bio, bio_en: person.bio_en, issues: [] })
  assert.equal(validateResult(keep, person).decision, 'KEEP')
  assert.throws(() => validateResult({ ...keep, bio_en: 'A different fact.' }, person), /KEEP changed/)
  assert.throws(() => validateResult({ ...keep, currentClaims: [{ claim: '미확인', verdict: 'UNVERIFIED', sourceIndexes: [0] }] }, person), /unverified/)
})

test('Wikipedia language editions cannot provide independent corroboration or be relabeled primary', () => {
  const wiki = host => ({ ...source, url: `https://${host}/wiki/Person`, primary: false })
  assert.throws(() => validateResult(result({ sources: [wiki('en.wikipedia.org'), wiki('zh.wikipedia.org')] }), person), /independent/)
  assert.throws(() => validateResult(result({ sources: [{ ...wiki('en.wikipedia.org'), scholarly: true }] }), person), /secondary/)
  assert.equal(validateResult(result({ sources: [wiki('en.wikipedia.org'), { ...source, primary: false }] }), person).decision, 'REVISE')
})
test('a revision may remove an old unverified claim without inventing a supporting citation', () => {
  const revised = result({ currentClaims: [{ claim: '원문에 없는 기존 국적 주장', verdict: 'UNVERIFIED', sourceIndexes: [] }] })
  assert.equal(validateResult(revised, person).decision, 'REVISE')
  assert.throws(() => validateResult({ ...revised, decision: 'KEEP', bio: person.bio, bio_en: person.bio_en }, person), /unverified/)
})
test('incomplete bilingual self-checks and invalid Korean text cannot be written', () => {
  assert.throws(() => validateResult(result({ bio: '가'.repeat(101) }), person), /Korean/)
  assert.throws(() => validateResult(result({ bio_en: '한국어가 남음' }), person), /English/)
  assert.throws(() => validateResult(result({ selfCheck: { identity: true, facts: true, bilingual: false } }), person), /incomplete/)
})
test('patches touch only bio and bio_en, with exact current values and update time guards', () => {
  const patch = guardedPatch(person, result())
  assert.deepEqual(Object.keys(patch.body).sort(), ['bio', 'bio_en'])
  assert.equal(patch.params.bio, `eq.${person.bio}`)
  assert.equal(patch.params.bio_en, `eq.${person.bio_en}`)
  assert.equal(patch.params.updated_at, `eq.${person.updated_at}`)
  assert.equal(guardedPatch({ ...person, bio: '다른 세션이 수정했다.' }, result()), null)
  assert.equal(guardedPatch({ ...person, publication_status: 'inactive' }, result()), null)
  assert.equal(guardedPatch(person, result({ decision: 'HOLD', reason: '신원 확인 불가' })), null)
})
test('sampling includes unchanged and revised people and is reproducible without model selection', () => {
  const records = Array.from({ length: 40 }, (_, i) => result({ id: `p${i}`, decision: i < 20 ? 'KEEP' : 'REVISE' }))
  const sample = sampleRecords(records, 'window-seed')
  assert.deepEqual(sample, sampleRecords(records, 'window-seed'))
  assert.equal(sample.length, 4)
  assert.equal(sample.filter(id => Number(id.slice(1)) < 20).length, 2)
  assert.equal(sampleRecords(records.slice(0, 4), 'pilot', true).length, 4)
  assert.equal(sampleRecords(records.map(record => ({ ...record, decision: 'KEEP' })), 'keep-only').length, 4)
  records[1].risk = 'identity'
  assert.ok(sampleRecords(records, 'window-seed').includes('p1'))
  records[2].decision = 'HOLD'
  assert.ok(sampleRecords(records, 'window-seed').includes('p2'))
})
test('a restart after PATCH recognizes the exact new bio without overwriting newer edits', () => {
  const candidate = result()
  const written = { ...person, bio: candidate.bio, bio_en: candidate.bio_en }
  candidate.resultFingerprint = fingerprint(written)
  assert.equal(writeDisposition(person, candidate), 'revise')
  assert.equal(writeDisposition(written, candidate), 'already-written')
  assert.equal(writeDisposition({ ...written, bio: '다른 작업자가 다시 수정한 소개.' }, candidate), 'stale')
  assert.equal(writeDisposition({ ...written, nickname: '동명이인으로 바뀜' }, candidate), 'stale')
})
test('an interrupted research window preserves finished drafts and only requeues unfinished people', () => {
  const state = { windows: 0, queue: ['p3'], inFlight: ['p2'], inFlightResults: [result()], pending: null }
  recoverResearchWindow(state, 'recovered-window')
  assert.deepEqual(state.queue, ['p2', 'p3'])
  assert.equal(state.pending.records[0].id, 'p1')
  assert.equal(state.pending.digest, windowDigest(state.pending))
  assert.deepEqual(state.pending.samples, ['p1'])
  assert.deepEqual(state.inFlightResults, [])
})
test('the supervisor must inspect the selected sources and approve the exact pending content', () => {
  const window = { id: 'window1', records: [result()], samples: ['p1'] }
  window.digest = windowDigest(window)
  const review = { decision: 'APPROVE', digest: window.digest, checks: [{ id: 'p1', verdict: 'PASS',
    note: '박물관 원문에서 신원과 소개의 핵심 사실을 직접 대조했다.', openedUrls: [source.url] }] }
  assert.equal(validateApproval(window, review), true)
  assert.throws(() => validateApproval(window, { ...review, checks: [] }), /supervisor/)
  assert.throws(() => validateApproval(window, { ...review, checks: [{ ...review.checks[0], openedUrls: ['https://unrelated.example.org/'] }] }), /supervisor/)
  window.records[0].bio = '승인 후 다른 문구로 바꿈.'
  assert.throws(() => validateApproval(window, review), /digest/)
})
test('account parsing uses CLI status and Flash quota rather than IDE or Claude quota', () => {
  const accounts = parseAccounts('a@example.com cli 100% 0% 100%\nb@example.com ide,token-exp 0% 90% 0%')
  assert.deepEqual(accounts.map(({ active, flash }) => [active, flash]), [[true, 0], [false, 90]])
})
test('JSON fences are accepted but prose and malformed responses are not guessed', () => {
  assert.deepEqual(parseResult('```json\n{"decision":"HOLD"}\n```'), { decision: 'HOLD' })
  assert.throws(() => parseResult('Here is a result: {"decision":"KEEP"}'))
})
test('source extraction reads actual main text and removes scripts and navigation', () => {
  const extracted = pageText('<html><title>Official &amp; verified</title><nav>Menu</nav><main><h1>Identity</h1><script>fake biography</script><p>Real &amp; documented fact.</p></main></html>')
  assert.equal(extracted.title, 'Official & verified')
  assert.equal(extracted.text, 'Identity Real & documented fact.')
})
test('source claims require a real fetched URL and a literal excerpt from its body', () => {
  const fetched = [{ url: source.url, text: source.excerpt, contentHash: 'actual-hash', fetchedAt: '2026-10-21' }]
  const grounded = assertGrounding(result(), fetched)
  assert.equal(grounded.sources[0].contentHash, 'actual-hash')
  assert.throws(() => assertGrounding(result({ sources: [{ ...source, url: 'https://invented.example.org/fake' }] }), fetched), /not actually fetched/)
  assert.throws(() => assertGrounding(result({ sources: [{ ...source, excerpt: 'This plausible quotation was invented.' }] }), fetched), /does not occur/)
  assert.throws(() => assertGrounding(result({ sources: [{ ...source, excerpt: 'A recorded ... fact.' }] }), fetched), /does not occur/)
})

test('HOLD citations also carry actual fetch provenance and cannot invent inspected sources', () => {
  const fetched = [{ url: source.url, text: source.excerpt, contentHash: 'real-hash', fetchedAt: 'today' }]
  assert.equal(assertGrounding(result({ decision: 'HOLD' }), fetched).sources[0].contentHash, 'real-hash')
  assert.throws(() => assertGrounding(result({ decision: 'HOLD', sources: [{ ...source, excerpt: 'An invented plausible passage.' }] }), fetched), /does not occur/)
  assert.deepEqual(assertGrounding({ decision: 'HOLD' }, []).sources, [])
})
test('private network URLs cannot be used by the public-source collector', async () => {
  await assert.rejects(fetchSource('https://127.0.0.1/'), /Non-public/)
  await assert.rejects(fetchSource('https://10.0.0.1/'), /Non-public/)
})

test('missing existing claims trigger one supplemental search using readable sources and blocked URL feedback', async () => {
  let discoveries = 0, assessments = 0
  const blocked = 'https://blocked.example.org/biography', extra = 'https://archive.example.org/report'
  const collected = []
  const audited = await researchEvidence(person, '', {
    discover: async context => {
      if (discoveries++) {
        assert.match(context, /대표 보고서/)
        assert.ok(context.includes(blocked))
        return { id: person.id, urls: [blocked, source.url, extra] }
      }
      return { id: person.id, urls: [source.url, blocked] }
    },
    collect: async url => {
      collected.push(url)
      if (url === blocked) throw new Error('Source HTTP 403')
      return { url, text: source.excerpt, contentHash: 'hash', fetchedAt: 'today' }
    },
    assess: async materials => {
      if (assessments++) {
        assert.equal(materials.length, 2)
        return result()
      }
      return result({ currentClaims: [{ claim: '대표 보고서', verdict: 'UNVERIFIED', sourceIndexes: [] }] })
    },
  })
  assert.equal(audited.decision, 'REVISE')
  assert.equal(discoveries, 2)
  assert.deepEqual(collected, [source.url, blocked, extra])
})

test('evidence supplementation is bounded and leaves unresolved core facts on HOLD', async () => {
  let calls = 0
  const audited = await researchEvidence(person, '', {
    discover: async () => { calls++; return { id: person.id, urls: [source.url] } },
    collect: async url => ({ url, text: source.excerpt }),
    assess: async () => result({ decision: 'HOLD', reason: '대표 활동을 확인하지 못했다.' }),
  })
  assert.equal(calls, 2)
  assert.equal(audited.decision, 'HOLD')
})
