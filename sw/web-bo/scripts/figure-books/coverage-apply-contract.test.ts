import assert from 'node:assert/strict'
import test from 'node:test'
import { approvedCandidates, buildCoverageApplySql, buildCoverageWrites, resolveCoverageWork, sha256, verifiedCandidates,
  snapshotSql, type CoverageCandidate, type CoverageCatalog, type CoverageSnapshot,
} from './coverage-apply-contract'

const candidate = (): CoverageCandidate => ({
  candidateId: 'person:9788937463013', celebId: 'eccf1500-9000-4e0e-8f28-66409d387058', slug: 'test-person',
  relationType: 'related', rationale: 'Specific documented field', evidenceUrls: ['https://example.com/relation'],
  manifest: { work: { identity: 'homer/odyssey', title: 'Odyssey', creator: 'Homer', titleAliases: ['오디세이아'], creatorAliases: ['호메로스'] },
    edition: { kind: 'full', scope: 'complete' }, ko: { translationStatus: 'published', isbn: '9788937463013' } },
  editions: { ko: { source: 'kakao_book', isbn: '9788937463013', title: '오디세이아', creator: '호메로스',
    thumbnailUrl: 'https://example.com/cover.jpg', publisher: 'Publisher', sourceUrl: 'https://example.com/book',
    description: null, descriptionSourceUrl: null, releaseDate: '2020-01-01', sourceMetadata: {} } },
  originalWork: { kind: 'translated', title: 'Odyssey', creator: 'Homer', evidenceUrls: ['https://example.com/original'] },
})
const catalog = (): CoverageCatalog => ({ contents: [], locales: [], editions: [], celebs: [{ id: candidate().celebId, slug: 'test-person' }] })
const snapshot = (): CoverageSnapshot => ({ contents: [], content_locales: [], figure_book_contents: [], figure_book_editions: [], figure_book_characters: [], figure_book_products: [] })
const approve = (items: CoverageCandidate[]) => {
  const bytes = Buffer.from(JSON.stringify({ version: 1, items }))
  return approvedCandidates(bytes, { inputSha256: sha256(bytes), reviewedBy: 'independent-reviewer', approvedCandidateIds: items.map(item => item.candidateId) })
}

test('review is bound to exact input bytes and only approved candidates pass', () => {
  const bytes = Buffer.from(JSON.stringify({ version: 1, items: [candidate()] }))
  assert.throws(() => approvedCandidates(bytes, { inputSha256: 'stale', reviewedBy: 'reviewer', approvedCandidateIds: [] }), /does not match/)
  assert.equal(approvedCandidates(bytes, { inputSha256: sha256(bytes), reviewedBy: 'reviewer', approvedCandidateIds: [] }).length, 0)
  assert.equal(approve([candidate()]).length, 1)
})
test('translation cannot be registered as domestic ISBN identity or without original title', () => {
  const item = candidate(); item.manifest.work.identity = 'book/9788937463013'
  assert.throws(() => approve([item]), /translation cannot/)
  item.manifest.work.identity = 'homer/odyssey'; delete item.originalWork.title
  assert.throws(() => approve([item]), /originalWork.title/)
})
test('unverified English edition is rejected', () => {
  const item = candidate(); item.manifest.en = { isbn: '9780140449112' }
  item.editions.en = { ...item.editions.ko, source: 'openlibrary', isbn: '9780140449112' }
  assert.throws(() => approve([item]), /language/)
})
test('new work reuses deterministic identity and persists original author/title', () => {
  const a = resolveCoverageWork(candidate(), catalog())
  const b = resolveCoverageWork(candidate(), catalog())
  assert.equal(a.contentId, b.contentId)
  assert.equal((a.contentInsert?.metadata?.figureBook as Record<string, unknown>).originalTitle, 'Odyssey')
})
test('existing work metadata/locales/editions remain untouched and authored relation is blocked', () => {
  const item = candidate(), db = catalog(), before = snapshot()
  const created = resolveCoverageWork(item, db)
  const content = { ...created.contentInsert!, created_at: '2020-01-01T00:00:00Z' }
  db.contents.push(content); before.contents.push(content)
  before.figure_book_contents.push({ content_id: content.id })
  const locale = { content_id: content.id, locale: 'ko', title: 'Old display title', creator: 'Old author', description: 'keep', isbn: null,
    publisher: null, thumbnail_url: null, affiliate_url: null, sources: {}, verified: false, created_at: '', updated_at: '' }
  db.locales.push(locale); before.content_locales.push(locale)
  const result = buildCoverageWrites([item], db, before)
  assert.equal(result.rows.contents.length, 0)
  assert.equal(result.rows.content_locales.length, 0)
  assert.equal(result.rows.figure_book_editions.length, 1)
  assert.equal(result.rows.figure_book_characters[0].description, null)
  assert.equal(result.rows.figure_book_characters[0].description_en, null)
  before.figure_book_characters.push({ celeb_id: item.celebId, relation_type: 'authored' })
  assert.throws(() => buildCoverageWrites([item], db, before), /Authored/)
})
test('same ISBN in another stored edition is reused and ambiguous matches are held', () => {
  const item = candidate(), db = catalog()
  const content = { ...resolveCoverageWork(item, db).contentInsert!, created_at: '', id: 'legacy-work', external_id: null, metadata: {} }
  db.contents.push(content); db.editions.push({ content_id: content.id, isbn: item.editions.ko.isbn })
  assert.equal(resolveCoverageWork(item, db).contentId, 'legacy-work')
  db.contents.push({ ...content, id: 'duplicate' }); db.editions.push({ content_id: 'duplicate', isbn: item.editions.ko.isbn })
  assert.throws(() => resolveCoverageWork(item, db), /Ambiguous/)
})
test('hash-bound reviewer may choose an existing exact edition among duplicates for relationship-only writes', () => {
  const item = candidate(), db = catalog(), before = snapshot()
  const content = { ...resolveCoverageWork(item, db).contentInsert!, created_at: '', id: 'selected', metadata: {} }
  db.contents.push(content, { ...content, id: 'duplicate' })
  db.editions.push({ content_id: 'selected', locale: 'ko', isbn: item.editions.ko.isbn })
  item.reviewedReuseContentId = 'selected'
  assert.equal(approve([item])[0].reviewedReuseContentId, undefined, 'input cannot self-approve reuse')
  item.manifest.work.identity = 'book/9788937463013'
  item.manifest.reuseContentId = 'selected'
  assert.throws(() => approve([item]), /translation cannot/, 'legacy identity exception requires review approval')
  const bytes = Buffer.from(JSON.stringify({ version: 1, items: [item] }))
  const reviewed = approvedCandidates(bytes, { inputSha256: sha256(bytes), reviewedBy: 'parent', approvedCandidateIds: [item.candidateId], reuseContentIds: { [item.candidateId]: 'selected' } })[0]
  before.contents.push(content); before.figure_book_contents.push({ content_id: 'selected' })
  before.figure_book_editions.push(db.editions[0])
  const plan = buildCoverageWrites([reviewed], db, before)
  assert.equal(plan.contentId, 'selected')
  assert.equal(plan.rows.contents.length + plan.rows.content_locales.length + plan.rows.figure_book_editions.length, 0)
  assert.equal(plan.rows.figure_book_characters.length, 1)
  db.editions.length = 0
  assert.throws(() => resolveCoverageWork(reviewed, db), /every exact ISBN/)
})
test('SQL backs up product ownership through editions and never updates/deletes existing rows', () => {
  const before = snapshot(), plan = buildCoverageWrites([candidate()], catalog(), before)
  const sql = buildCoverageApplySql(plan.contentId, before, plan.rows)
  assert.doesNotMatch(sql, /\b(?:UPDATE|DELETE)\s+(?:public\.)/i)
  assert.ok(sql.indexOf('INSERT INTO public.figure_book_contents') < sql.indexOf('INSERT INTO public.content_locales'))
  assert.match(sql, /Existing row changed/)
  assert.match(sql, /Edition ISBN belongs to another work/)
  assert.match(snapshotSql(plan.contentId), /edition_id IN/)
})
test('same-lane verified mode accepts only matching prepare-passed material without approval file', () => {
  const item = candidate(), bytes = Buffer.from(JSON.stringify({ version: 1, items: [item] }))
  const row = { held: ['new_work_identity_requires_review'], matches: [], reuseOverride: null,
    evidence: { quoteMatched: true, status: 200, error: null, quote: 'A sufficiently long exact source quotation', excerpt: 'Before A sufficiently long exact source quotation After' } }
  const result = verifiedCandidates(bytes, { rows: [row] }, () => item)
  assert.equal(result.candidates.length, 1)
  assert.equal(result.held.length, 0)
  assert.equal(result.candidates[0].reviewedReuseContentId, undefined)
  const changed = structuredClone(item); changed.rationale = 'Unverified replacement'
  assert.equal(verifiedCandidates(bytes, { rows: [row] }, () => changed).held[0].reason, 'prepared_candidate_material_changed')
  for (const invalid of [
    { ...row, held: ['evidence_unreadable'] },
    { ...row, matches: [{ contentId: 'a' }, { contentId: 'b' }] },
    { ...row, reuseOverride: 'reviewed-somewhere-else' },
    { ...row, evidence: { ...row.evidence, status: undefined } },
    { ...row, evidence: { ...row.evidence, quoteMatched: false } },
    { ...row, evidence: { ...row.evidence, excerpt: 'A different source' } },
  ]) assert.equal(verifiedCandidates(bytes, { rows: [invalid] }, () => item).candidates.length, 0)
})
