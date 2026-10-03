import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test, { before } from 'node:test'
import ts from 'typescript'
import { createClient } from '@feelandnote/db'
import { equivalentIsbns, toIsbn13 } from '@feelandnote/content-search/book-isbn'
import { getOpenLibraryBookMetadata } from '@feelandnote/content-search/openlibrary'
import { verifyEditionWork } from '../../src/lib/book-edition-work'
import { normalizeBookIdentity, resolveExternalBookInput } from '@feelandnote/content-search/external-book-input'

before(() => { process.env.KAKAO_REST_API_KEY = 'test-only' })
type Row = Record<string, unknown>
const isbn = '9780140432169', contentId = 'bacon-original'
const compiled = ts.transpileModule(readFileSync(new URL('./source-edition-batch.ts', import.meta.url), 'utf8').replace(/\nmain\(\)\.catch\([\s\S]*$/, ''), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const manualCompiled = ts.transpileModule(readFileSync(new URL('../../src/actions/admin/figure-books.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const inputCompiled = ts.transpileModule(readFileSync(new URL('../../../../packages/content-search/src/external-book-input.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

function fixture(editionIsbn = isbn) {
  const tables: Record<string, Row[]> = {
    contents: [{ id: contentId, type: 'BOOK', metadata: { workKey: '/works/OL1W', figureBook: { workTitle: 'The Essays', workCreator: 'Francis Bacon' } } }],
    figure_book_contents: [{ content_id: contentId }],
    content_locales: [{ content_id: contentId, locale: 'en', title: 'The Essays', creator: 'Francis Bacon', isbn: null }],
    figure_book_editions: [],
  }
  const state = { title: 'The Essays', originalTitle: 'The Essays', author: 'Francis Bacon' as string | null,
    originalKey: '/works/OL1W', physicalFormat: 'audio cassette', failOriginalRead: false, failProviderWork: false,
    kakaoLookup: null as Row | null, missingProviderEdition: false,
    reads: [] as URL[],
    writes: [] as { table: string; method: string; body: Row }[], manifest: { contentId, locale: 'en', isbn: editionIsbn, editionKind: 'full', textScope: 'complete unabridged reading', sortOrder: 0 } as Row }
  const db = createClient('https://db.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (value, init) => {
      const url = new URL(String(value)), table = url.pathname.split('/').at(-1)!, method = init?.method ?? 'GET'
      assert.ok(table in tables, 'unexpected table ' + table)
      if (method === 'GET') state.reads.push(url)
      if (method === 'GET' && table === 'contents' && state.failOriginalRead) return Response.json({ code: 'XX000', message: 'original lookup failed', details: '', hint: '' }, { status: 503 })
      const matches = (row: Row) => [...url.searchParams].every(([key, condition]) => {
        if (key === 'or') return condition.slice(1, -1).split(',').some(filter => {
          const [column, operator, ...pattern] = filter.split('.')
          assert.equal(operator, 'ilike')
          return new RegExp('^' + pattern.join('.').replaceAll('%', '.*') + '$', 'isu').test(String(row[column] ?? ''))
        })
        if (condition.startsWith('eq.')) return String(row[key]) === condition.slice(3)
        if (condition.startsWith('neq.')) return String(row[key]) !== condition.slice(4)
        if (condition.startsWith('in.')) return condition.slice(4, -1).split(',').includes(String(row[key]))
        return true
      })
      if (method === 'GET') {
        const offset = Number(url.searchParams.get('offset') ?? 0), limit = Number(url.searchParams.get('limit') ?? tables[table].length)
        return Response.json(tables[table].filter(matches).slice(offset, offset + limit))
      }
      const body = JSON.parse(String(init?.body)) as Row
      state.writes.push({ table, method, body })
      assert.equal(table, 'figure_book_editions')
      const saved = method === 'PATCH' ? tables[table].find(matches) : { id: 55 }
      assert.ok(saved)
      Object.assign(saved, body)
      if (method === 'POST') tables[table].push(saved)
      return Response.json(new Headers(init?.headers).get('Accept')?.includes('vnd.pgrst.object') ? saved : [saved])
    } },
  })
  const providerFetch = async (value: Parameters<typeof fetch>[0]) => {
    const url = String(value)
    if (url.includes('provider.test/kakao')) { assert.ok(state.kakaoLookup); return Response.json(state.kakaoLookup) }
    if (url.includes('/isbn/') && state.missingProviderEdition) return new Response('', { status: 404 })
    if (url.includes('/isbn/')) return Response.json({ key: '/books/OL1M', title: state.title, isbn_13: [editionIsbn], publishers: ['Official publisher'],
      authors: [{ key: '/authors/OL1A' }], works: [{ key: state.originalKey }], languages: [{ key: '/languages/eng' }], physical_format: state.physicalFormat })
    if (url.includes('/works/')) {
      if (state.failProviderWork) return new Response('', { status: 503 })
      return Response.json({ title: state.originalTitle, authors: [{ author: { key: '/authors/OL1A' } }] })
    }
    if (url.includes('/authors/')) return Response.json({ name: state.author })
    throw Error('unexpected provider URL ' + url)
  }
  const kakaoLookup = async (selected: string) => {
    assert.equal(selected, editionIsbn)
    const book = await (await fetch('https://provider.test/kakao?isbn=' + selected)).json() as Row
    return { ...book, externalId: selected, externalSource: 'kakao_book' }
  }
  // Execute the shared provider policy with HTTP-backed official lookup mocks, rather than
  // reproducing its KO/import-language decision in the test.
  const providerMocks: Record<string, unknown> = {
    '@feelandnote/content-search/book-isbn': { toIsbn13 },
    '@feelandnote/content-search/kakao-books': { getKakaoBookByIsbn: kakaoLookup },
    '@feelandnote/content-search/openlibrary': { getOpenLibraryBookMetadata },
  }
  const inputModule = { exports: {} as { resolveExternalBookInput: typeof resolveExternalBookInput } }
  new Function('require', 'module', 'exports', inputCompiled)((name: string) => { assert.ok(name in providerMocks); return providerMocks[name] }, inputModule, inputModule.exports)
  const common: Record<string, unknown> = {
    '@feelandnote/db': { createClient: () => db },
    '@feelandnote/content-search/book-isbn': { toIsbn13 },
    '@feelandnote/content-search/openlibrary': { getOpenLibraryBookMetadata },
    '@feelandnote/content-search/book-introduction': { fetchBookIntroduction: async () => ({ source: null, sourceUrl: null, description: null }) },
    '@feelandnote/content-search/kakao-books': { getBookByIsbn: kakaoLookup },
    '../../src/lib/external-book-input': { normalizeBookIdentity, resolveExternalBookInput: inputModule.exports.resolveExternalBookInput },
    '../../src/lib/book-edition-work': { verifyEditionWork },
    'node:fs': { readFileSync: () => JSON.stringify(state.manifest) },
    'node:path': { isAbsolute: () => false, resolve: (...values: string[]) => values.join('/') },
  }
  const loaded = { exports: {} as { main: () => Promise<void> } }
  const requireMock = (name: string) => { assert.ok(name in common, 'unexpected import ' + name); return common[name] }
  new Function('require', 'module', 'exports', 'process', compiled)(requireMock, loaded, loaded.exports,
    { env: { NEXT_PUBLIC_DB_API_URL: 'https://db.test', DB_SECRET_KEY: 'test-key' }, argv: ['node', 'source-edition-batch.ts', '--file', 'fixture.json', '--apply'], cwd: () => '.' })
  const manualMocks: Record<string, unknown> = {
    'next/cache': { revalidatePath: () => {} },
    '@feelandnote/shared/constants/cache-tags': { CACHE_TAGS: {} },
    '@/lib/admin-auth': { requireAdmin: async () => {} },
    '@/lib/revalidate-web': { revalidateWebItems: async () => {} },
    '@/lib/db/admin': { createAdminClient: () => db },
    '@/lib/book-introduction-edit': { resolveBookIntroductionEdit: async () => ({ description: null, sources: {} }) },
    '@/lib/figure-book-product-validation': {},
    '@feelandnote/content-search/book-isbn': { toIsbn13 },
    '@/lib/external-book-input': { resolveExternalBookInput },
    '@/lib/book-edition-work': { verifyEditionWork },
  }
  const manual = { exports: {} as { saveFigureBookEdition: (params: Row) => Promise<void> } }
  new Function('require', 'module', 'exports', manualCompiled)((name: string) => { assert.ok(name in manualMocks, 'unexpected import ' + name); return manualMocks[name] }, manual, manual.exports)
  const saveManual = () => manual.exports.saveFigureBookEdition({ contentId, locale: 'en', title: state.title, creator: state.author ?? '', description: '', isbn: editionIsbn,
    publisher: 'untrusted', thumbnailUrl: '', releaseDate: '', editionKind: 'full', textScope: 'complete', sortOrder: 0, verified: true })
  return { tables, state, db, providerFetch, run: loaded.exports.main, saveManual }
}

test('CLI --apply writes a normal audio edition with raw physical format and independently checked work attribution', async t => {
  const f = fixture(); t.mock.method(globalThis, 'fetch', f.providerFetch); t.mock.method(console, 'log', () => {})
  await f.run()
  assert.equal(f.state.writes.length, 1)
  const sources = f.state.writes[0].body.sources as Row
  assert.equal(sources.physical_format, 'audio cassette')
  assert.equal((sources.work_attribution as Row).work_key, '/works/OL1W')
  assert.equal((sources.work_attribution as Row).original_creator, 'Francis Bacon')
  assert.equal(f.state.writes[0].body.text_scope, 'complete unabridged reading')
})

test('matching candidate title cannot conceal another official original work ID or original title', async t => {
  for (const change of [(f: ReturnType<typeof fixture>) => { f.state.originalKey = '/works/OL2W' },
    (f: ReturnType<typeof fixture>) => { f.state.originalTitle = 'Another Original' }]) {
    const f = fixture(); change(f)
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await assert.rejects(f.run(), /원전/)
    assert.equal(f.state.writes.length, 0)
    mock.mock.restore()
  }
})

test('missing full author and failed server/provider original lookup stop --apply before any write', async t => {
  for (const mode of ['author', 'failOriginalRead', 'failProviderWork'] as const) {
    const f = fixture()
    if (mode === 'author') f.state.author = null
    else f.state[mode] = true
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await assert.rejects(f.run(), /원저자|원전|OpenLibrary/)
    assert.equal(f.state.writes.length, 0)
    mock.mock.restore()
  }
  const f = fixture(); f.tables.contents = []
  t.mock.method(globalThis, 'fetch', f.providerFetch)
  await assert.rejects(f.run(), /기존 원전 작품/)
  assert.equal(f.state.writes.length, 0)
})

test('ISBN already attached to another card, edition or work is rejected, even with identical full title and author', async t => {
  for (const table of ['contents', 'content_locales', 'figure_book_editions']) {
    const f = fixture()
    f.tables[table].push(table === 'contents' ? { id: 'another', type: 'BOOK', external_id: isbn } : { content_id: 'another', isbn, title: 'The Essays', creator: 'Francis Bacon' })
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await assert.rejects(f.run(), /다른 작품/)
    assert.equal(f.state.writes.length, 0)
    mock.mock.restore()
  }
})

test('a differently titled volume needs independent server review, while unreviewed titles and editionTitle overrides fail', async t => {
  const volume = fixture(); volume.state.title = 'The Essays, Volume 1'
  volume.state.manifest.editionKind = 'volume'
  volume.state.manifest.textScope = 'volume 1'
  const proof = { method: 'independent_work_review', content_id: contentId, locale: 'en', isbn,
    edition_title: volume.state.title, edition_creator: 'Francis Bacon', original_title: 'The Essays', original_creator: 'Francis Bacon',
    edition_kind: 'volume', text_scope: 'volume 1', reviewed_at: '2026-10-01T00:00:00Z', source_url: 'https://publisher.test/essays-volume-1' }
  volume.tables.content_locales[0].sources = { edition_work_evidence: [proof] }
  let mock = t.mock.method(globalThis, 'fetch', volume.providerFetch); t.mock.method(console, 'log', () => {})
  await volume.run()
  assert.equal(volume.state.writes[0].body.title, 'The Essays, Volume 1')
  assert.equal(((volume.state.writes[0].body.sources as Row).work_attribution as Row).source_url, proof.source_url)
  mock.mock.restore()
  for (const title of ['The Essays, Volume 1', 'The Essays and Other Works', 'The Essays: A Commentary']) {
    const f = fixture(); f.state.title = title
    mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await assert.rejects(f.run(), /귀속할 근거/)
    assert.equal(f.state.writes.length, 0)
    mock.mock.restore()
  }
  const f = fixture(); f.state.manifest.editionTitle = 'The Essays and Other Works'
  t.mock.method(globalThis, 'fetch', f.providerFetch)
  await assert.rejects(f.run(), /지정한 판본 제목/)
  assert.equal(f.state.writes.length, 0)
})

test('manual BO save uses the same attribution guard and preserves audio metadata', async t => {
  const wrong = fixture(); wrong.state.originalTitle = 'A Different Original'
  const mock = t.mock.method(globalThis, 'fetch', wrong.providerFetch)
  await assert.rejects(wrong.saveManual(), /원전/)
  assert.equal(wrong.state.writes.length, 0)
  mock.mock.restore()
  const normal = fixture(); t.mock.method(globalThis, 'fetch', normal.providerFetch)
  await normal.saveManual()
  assert.equal((normal.state.writes[0].body.sources as Row).physical_format, 'audio cassette')
  assert.equal((normal.state.writes[0].body.sources as Row).work_attribution instanceof Object, true)
})

test('translated same-title edition uses the full original author and exact current KO card, without publisher restrictions', async () => {
  const f = fixture()
  f.tables.content_locales.push({ content_id: contentId, locale: 'ko', title: '베이컨 수상록', creator: '프랜시스 베이컨', isbn: null })
  const good = { contentId, locale: 'ko' as const, isbn, title: '베이컨 수상록', creator: '프랜시스 베이컨', sourceUrl: 'https://search.daum.net/search?w=bookpage&bookId=123' }
  assert.equal((await verifyEditionWork(f.db, good)).original_creator, '프랜시스 베이컨')
  await assert.rejects(verifyEditionWork(f.db, { ...good, creator: '로저 베이컨' }), /귀속할 근거/)
})

test('server work without a full original author cannot accept an edition based on its label alone', async () => {
  const f = fixture()
  f.tables.contents[0].metadata = { figureBook: { workTitle: 'The Essays' } }
  f.tables.content_locales[0].creator = null
  await assert.rejects(verifyEditionWork(f.db, { contentId, locale: 'en', isbn, title: 'The Essays', creator: 'Francis Bacon', sourceUrl: 'https://openlibrary.org/books/OL1M' }), /전체 원저자가 누락/)
  assert.equal(f.state.writes.length, 0)
})

test('CLI --apply rejects Principles Your Guided Journal even when OL incorrectly shares the original work ID', async t => {
  const f = fixture('9781668010198')
  f.tables.contents[0].metadata = { workKey: '/works/OL1W', figureBook: { workTitle: 'Principles', workCreator: 'Ray Dalio' } }
  Object.assign(f.tables.content_locales[0], { title: 'Principles', creator: 'Ray Dalio' })
  Object.assign(f.state, { title: 'Principles: Your Guided Journal', originalTitle: 'Principles', author: 'Ray Dalio' })
  // A caller cannot create the independent review by embedding it in the manifest.
  f.state.manifest.edition_work_evidence = [{ method: 'independent_work_review', content_id: contentId, locale: 'en',
    isbn: '9781668010198', edition_title: f.state.title, edition_creator: 'Ray Dalio', original_title: 'Principles', original_creator: 'Ray Dalio',
    edition_kind: 'full', text_scope: 'complete unabridged reading', reviewed_at: '2026-10-01T00:00:00Z', source_url: 'https://publisher.test/forged' }]
  t.mock.method(globalThis, 'fetch', f.providerFetch)
  await assert.rejects(f.run(), /귀속할 근거/)
  assert.equal(f.state.writes.length, 0)
})

test('independent server review binds the exact ISBN, full authors, original, locale and volume scope', async () => {
  const f = fixture()
  const proof: Row = { method: 'independent_work_review', content_id: contentId, locale: 'en', isbn,
    edition_title: 'The Essays, Volume 1', edition_creator: 'Francis Bacon', original_title: 'The Essays', original_creator: 'Francis Bacon',
    edition_kind: 'volume', text_scope: 'volume 1', reviewed_at: '2026-10-01T00:00:00Z', source_url: 'https://publisher.test/essays-volume-1' }
  const input = { contentId, locale: 'en' as const, isbn, title: 'The Essays, Volume 1', creator: 'Francis Bacon',
    sourceUrl: 'https://openlibrary.org/books/OL1M', workKey: '/works/OL1W', workTitle: 'The Essays', editionKind: 'volume', textScope: 'volume 1' }
  for (const change of [{ isbn: '9781668010198' }, { edition_creator: 'Bacon' }, { original_title: 'Other Essays' },
    { original_creator: 'Roger Bacon' }, { locale: 'ko' }, { edition_kind: 'full' }, { text_scope: 'complete' },
    { source_url: 'https://openlibrary.org/works/OL1W' }, { reviewed_at: '' }, { content_id: 'another' }]) {
    f.tables.content_locales[0].sources = { edition_work_evidence: [{ ...proof, ...change }] }
    await assert.rejects(verifyEditionWork(f.db, input), /귀속할 근거/)
  }
  f.tables.content_locales[0].sources = { edition_work_evidence: [proof] }
  const result = await verifyEditionWork(f.db, input)
  assert.equal(result.method, 'independent_work_review')
  assert.equal(result.source_url, proof.source_url)
  assert.equal(result.official_source_url, input.sourceUrl)
  // Reviewed provenance survives an update, without allowing its scope to be silently enlarged.
  f.tables.content_locales[0].sources = {}
  f.tables.figure_book_editions.push({ content_id: contentId, isbn, sources: { work_attribution: result } })
  assert.equal((await verifyEditionWork(f.db, input)).method, 'independent_work_review')
  await assert.rejects(verifyEditionWork(f.db, { ...input, textScope: 'complete' }), /귀속할 근거/)
})

test('a differently titled Korean translation accepts only the server-reviewed original and precise partial scope', async () => {
  const f = fixture()
  const proof = { method: 'independent_work_review', content_id: contentId, locale: 'ko', isbn,
    edition_title: '베이컨 수상록 1', edition_creator: '프랜시스 베이컨', original_title: 'The Essays', original_creator: 'Francis Bacon',
    edition_kind: 'volume', text_scope: '상권', reviewed_at: '2026-10-01T00:00:00Z', source_url: 'https://publisher.test/ko-volume-1' }
  f.tables.content_locales[0].sources = { edition_work_evidence: [proof] }
  const input = { contentId, locale: 'ko' as const, isbn, title: '베이컨 수상록 1', creator: '프랜시스 베이컨',
    sourceUrl: 'https://search.daum.net/search?w=bookpage&bookId=123', editionKind: 'volume', textScope: '상권' }
  assert.equal((await verifyEditionWork(f.db, input)).original_title, 'The Essays')
  await assert.rejects(verifyEditionWork(f.db, { ...input, textScope: '완역' }), /귀속할 근거/)
})

function reviewedSeriesVolume(editionIsbn = '9780439064873', representativeTitle = "Harry Potter and the Sorcerer's Stone") {
  const f = fixture(editionIsbn)
  const author = 'J. K. Rowling', volumeTitle = 'Harry Potter and the Chamber of Secrets'
  f.tables.contents[0].metadata = { workKey: '/works/OL1W', figureBook: { workTitle: representativeTitle, workCreator: author, workIdentity: 'harry-potter-series' } }
  Object.assign(f.tables.content_locales[0], { title: representativeTitle, creator: author })
  Object.assign(f.state, { title: volumeTitle, originalTitle: volumeTitle, originalKey: '/works/OL2W', author, physicalFormat: 'paperback' })
  Object.assign(f.state.manifest, { editionKind: 'volume', textScope: 'volume 2; complete text of Harry Potter and the Chamber of Secrets' })
  const proof: Row = { method: 'independent_series_review', content_id: contentId, locale: 'en', isbn: '9780439064873',
    original_title: representativeTitle, original_creator: author, representative_work_key: '/works/OL1W', work_identity: 'harry-potter-series',
    edition_title: volumeTitle, edition_creator: author, volume_work_key: '/works/OL2W', volume_work_title: volumeTitle,
    series_title: 'Harry Potter', series_creator: author, series_scope: 'Harry Potter, volumes 1–7',
    edition_kind: 'volume', text_scope: f.state.manifest.textScope, source_url: 'https://publisher.test/harry-potter-series', reviewed_at: '2026-10-01T00:00:00Z' }
  f.tables.content_locales[0].sources = { edition_work_evidence: [proof] }
  return { ...f, proof }
}

test('CLI --apply preserves verified volume 2 under a first-volume or whole-series representative', async t => {
  t.mock.method(console, 'log', () => {})
  for (const representative of ["Harry Potter and the Sorcerer's Stone", 'Harry Potter']) {
    const f = reviewedSeriesVolume('9780439064873', representative)
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await f.run()
    assert.equal(f.state.writes.length, 1)
    const saved = f.state.writes[0].body, attribution = (saved.sources as Row).work_attribution as Row
    assert.equal(saved.isbn, '9780439064873')
    assert.equal(saved.title, 'Harry Potter and the Chamber of Secrets')
    assert.equal(saved.text_scope, f.proof.text_scope)
    assert.equal(saved.edition_kind, 'volume')
    assert.equal(attribution.method, 'independent_series_review')
    assert.equal(attribution.original_title, representative)
    assert.equal(attribution.representative_work_key, '/works/OL1W')
    assert.equal(attribution.work_key, '/works/OL2W')
    assert.equal(attribution.source_url, f.proof.source_url)
    mock.mock.restore()
  }
})

test('CLI --apply cannot reuse a server series review for another ISBN, work, full author or reading scope', async t => {
  for (const mode of ['isbn', 'key', 'author', 'scope', 'fake-cli', 'ordinary-work-review'] as const) {
    const f = reviewedSeriesVolume(mode === 'isbn' ? '9781668010198' : '9780439064873')
    if (mode === 'key') f.state.originalKey = '/works/OL3W'
    if (mode === 'author') f.state.author = 'Robert Galbraith'
    if (mode === 'scope') f.state.manifest.textScope = 'complete series; volumes 1–7'
    if (mode === 'fake-cli') {
      f.tables.content_locales[0].sources = {}
      f.state.manifest.edition_work_evidence = [f.proof]
    }
    if (mode === 'ordinary-work-review') f.proof.method = 'independent_work_review'
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await assert.rejects(f.run(), /원전/)
    assert.equal(f.state.writes.length, 0, mode)
    mock.mock.restore()
  }
})

test('series review requires independent evidence, exact representative identity and the official volume title', async () => {
  const f = reviewedSeriesVolume()
  const input = { contentId, locale: 'en' as const, isbn: '9780439064873', title: f.state.title, creator: f.state.author,
    workKey: f.state.originalKey, workTitle: f.state.originalTitle, sourceUrl: 'https://openlibrary.org/books/OL1M',
    editionKind: 'volume', textScope: String(f.state.manifest.textScope) }
  for (const change of [{ original_title: 'Another first volume' }, { original_creator: 'Rowling' }, { representative_work_key: '/works/OL9W' },
    { series_title: '' }, { series_creator: 'Rowling' }, { series_scope: '' }, { volume_work_title: 'Another volume' },
    { source_url: 'https://openlibrary.org/works/OL1W' }, { work_identity: 'another-series' }]) {
    f.tables.content_locales[0].sources = { edition_work_evidence: [{ ...f.proof, ...change }] }
    await assert.rejects(verifyEditionWork(f.db, input), /원전/)
  }
})

function reviewedSharedOmnibus(target = contentId) {
  const sharedIsbn = '9788949717937', otherId = 'kojiki-original', f = fixture(sharedIsbn)
  const originals: Row[] = [
    { content_id: contentId, title: '일본서기', creator: '도네리 친왕', work_identity: 'nihon-shoki', text_scope: '합본 중 일본서기 수록 부분' },
    { content_id: otherId, title: '고사기', creator: '오노 야스마로', work_identity: 'kojiki', text_scope: '합본 중 고사기 수록 부분' },
  ]
  f.tables.contents = originals.map((original, index) => ({ id: original.content_id, type: 'BOOK', external_id: sharedIsbn,
    metadata: { workKey: `/works/OL${index + 1}W`, figureBook: { workTitle: original.title, workCreator: original.creator, workIdentity: original.work_identity } } }))
  f.tables.figure_book_contents = originals.map(original => ({ content_id: original.content_id }))
  f.tables.content_locales = originals.map(original => ({ content_id: original.content_id, locale: 'ko', isbn: sharedIsbn, title: original.title, creator: original.creator }))
  const selected = originals.find(original => original.content_id === target)!
  f.state.manifest = { contentId: target, locale: 'ko', isbn: sharedIsbn, editionKind: 'selection', textScope: selected.text_scope, sortOrder: 0 }
  // Synthetic provider/TOC responses exercise the approved real shared-ISBN shape, not live metadata.
  f.state.kakaoLookup = { title: '고사기·일본서기', creator: '오노 야스마로, 도네리 친왕', coverImageUrl: null,
    metadata: { isbn: sharedIsbn, publisher: '확인된 합본 출판사', link: 'https://publisher.test/omnibus', publishDate: null } }
  const proof: Row = { method: 'independent_omnibus_review', content_id: target, locale: 'ko', isbn: sharedIsbn,
    edition_title: f.state.kakaoLookup.title, edition_creator: f.state.kakaoLookup.creator, original_title: selected.title, original_creator: selected.creator,
    work_identity: selected.work_identity, official_work_key: null, official_work_title: null,
    owner_content_ids: [contentId, otherId], contained_originals: originals, edition_kind: 'selection', text_scope: selected.text_scope,
    source_url: 'https://publisher.test/omnibus-toc', toc_source_url: 'https://publisher.test/omnibus-toc', reviewed_at: '2026-10-01T00:00:00Z' }
  f.tables.content_locales.find(card => card.content_id === target)!.sources = { edition_work_evidence: [proof] }
  return { ...f, proof, originals, sharedIsbn }
}

test('CLI --apply preserves two distinct originals sharing a server-reviewed omnibus ISBN and their own reading scope', async t => {
  t.mock.method(console, 'log', () => {})
  for (const target of [contentId, 'kojiki-original']) {
    const f = reviewedSharedOmnibus(target), before = structuredClone(f.tables.contents)
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await f.run()
    assert.equal(f.state.writes.length, 1)
    const saved = f.state.writes[0].body, attribution = (saved.sources as Row).work_attribution as Row
    assert.equal(saved.content_id, target); assert.equal(saved.isbn, f.sharedIsbn)
    assert.equal(saved.creator, '오노 야스마로, 도네리 친왕')
    assert.equal(saved.text_scope, f.proof.text_scope)
    assert.equal(attribution.method, 'independent_omnibus_review')
    assert.deepEqual(attribution.owner_content_ids, [contentId, 'kojiki-original'])
    assert.deepEqual(f.tables.contents, before, 'Originals must not be merged or retitled')
    mock.mock.restore()
  }
})

test('shared-ISBN exception rejects changed owners, official key, whole authors, scope and forged CLI review before writing', async t => {
  for (const mode of ['owner', 'key', 'author', 'scope', 'contained-original', 'fake-cli', 'ordinary-review', 'toc-source'] as const) {
    const f = reviewedSharedOmnibus()
    if (mode === 'owner') f.tables.figure_book_editions.push({ content_id: 'unreviewed-original', isbn: f.sharedIsbn })
    if (mode === 'key') f.proof.official_work_key = '/works/OL99W'
    if (mode === 'author') f.state.kakaoLookup!.creator = '오노 야스마로'
    if (mode === 'scope') f.state.manifest.textScope = '두 원전 전체를 읽음'
    if (mode === 'contained-original') (f.tables.contents[1].metadata as Row).figureBook = { workTitle: '다른 원전', workCreator: '다른 저자', workIdentity: 'another' }
    if (mode === 'fake-cli') {
      f.tables.content_locales[0].sources = {}
      f.state.manifest.edition_work_evidence = [f.proof]
    }
    if (mode === 'ordinary-review') f.proof.method = 'independent_work_review'
    if (mode === 'toc-source') f.proof.toc_source_url = 'https://openlibrary.org/works/OL99W'
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    await assert.rejects(f.run(), /ISBN|합본/)
    assert.equal(f.state.writes.length, 0, mode)
    mock.mock.restore()
  }
})

test('omnibus review binds official OL work key/title and cannot hide changed contained scopes or target identity', async () => {
  const f = reviewedSharedOmnibus()
  Object.assign(f.proof, { official_work_key: '/works/OL99W', official_work_title: 'Nihon Shoki and Kojiki' })
  const input = { contentId, locale: 'ko' as const, isbn: f.sharedIsbn, title: '고사기·일본서기', creator: '오노 야스마로, 도네리 친왕',
    sourceUrl: 'https://openlibrary.org/books/OL99M', workKey: '/works/OL99W', workTitle: 'Nihon Shoki and Kojiki',
    editionKind: 'selection', textScope: String(f.proof.text_scope) }
  assert.equal((await verifyEditionWork(f.db, input)).method, 'independent_omnibus_review')
  await assert.rejects(verifyEditionWork(f.db, { ...input, workKey: '/works/OL98W' }), /ISBN/)
  await assert.rejects(verifyEditionWork(f.db, { ...input, workTitle: 'Another Omnibus' }), /ISBN/)
  f.tables.figure_book_editions.push({ content_id: 'kojiki-original', isbn: f.sharedIsbn, text_scope: '확인된 다른 수록 범위' })
  await assert.rejects(verifyEditionWork(f.db, input), /수록 원전/)
})

test('equivalent checked ISBN10/13 identifiers preserve X checksums and have no ISBN10 equivalent for 979', () => {
  assert.deepEqual(equivalentIsbns('9780192802552'), ['9780192802552', '0192802550'])
  assert.deepEqual(equivalentIsbns('0-8044-2957-x'), ['9780804429573', '080442957X'])
  assert.deepEqual(equivalentIsbns('9791190090018'), ['9791190090018'])
  assert.deepEqual(equivalentIsbns('0192802551'), [])
})

test('ordinary work rejects equivalent ISBN10, hyphenated and whitespace owners on all three HTTP lookup paths', async () => {
  const actual = '9780192802552'
  for (const table of ['contents', 'content_locales', 'figure_book_editions']) {
    for (const stored of ['0192802550', '0-19-280255-0', ' 0 19 280255 0 ', '978-0-19-280255-2']) {
      const f = fixture(actual)
      f.tables[table].push(table === 'contents' ? { id: 'other', type: 'BOOK', external_id: stored } : { content_id: 'other', isbn: stored })
      await assert.rejects(verifyEditionWork(f.db, { contentId, locale: 'en', isbn: actual, title: 'The Essays', creator: 'Francis Bacon', sourceUrl: 'https://provider.test/edition' }), /같은 ISBN/)
      assert.equal(f.state.writes.length, 0)
      const queries = f.state.reads.filter(url => url.searchParams.has('or'))
      assert.equal(queries.length, 3)
      for (const url of queries) { assert.equal(url.searchParams.get('limit'), '100'); assert.match(url.searchParams.get('or')!, /ilike/); assert.equal(url.searchParams.has('isbn'), false) }
    }
  }
})

test('CLI --apply cannot attach official ISBN13 while another work owns its ISBN10', async t => {
  const f = fixture('9780192802552')
  f.tables.content_locales.push({ content_id: 'other', locale: 'en', isbn: '0192802550' })
  t.mock.method(globalThis, 'fetch', f.providerFetch)
  await assert.rejects(f.run(), /같은 ISBN/)
  assert.equal(f.state.writes.length, 0)
})

test('candidate pagination detects later normalized owners and rejects unrelated digit-subsequence matches after lookup', async () => {
  const actual = '9780192802552', f = fixture(actual)
  for (let i = 0; i < 101; i++) f.tables.content_locales.push({ content_id: 'unrelated-' + i, isbn: 'junk-' + actual })
  const input = { contentId, locale: 'en' as const, isbn: actual, title: 'The Essays', creator: 'Francis Bacon', sourceUrl: 'https://provider.test/edition' }
  assert.equal((await verifyEditionWork(f.db, input)).method, 'official_exact_title_and_full_author')
  f.tables.content_locales.push({ content_id: 'real-owner-after-page-one', isbn: '0-19-280255-0' })
  await assert.rejects(verifyEditionWork(f.db, input), /같은 ISBN/)
  assert.ok(f.state.reads.some(url => url.pathname.endsWith('content_locales') && url.searchParams.get('offset') === '100'))
})

test('omnibus exact owners include normalized ISBN10/hyphen records, while new owners and conflicting old scopes still fail', async t => {
  t.mock.method(console, 'log', () => {})
  for (const mode of ['valid', 'new-owner', 'old-scope'] as const) {
    const f = reviewedSharedOmnibus(), isbn10 = equivalentIsbns(f.sharedIsbn)[1]
    f.tables.contents[1].external_id = isbn10
    f.tables.content_locales[1].isbn = [...isbn10].join('-')
    f.tables.figure_book_editions.push({ id: 70, content_id: 'kojiki-original', isbn: [...isbn10].join(' '),
      text_scope: mode === 'old-scope' ? 'different recorded scope' : f.originals[1].text_scope })
    if (mode === 'new-owner') f.tables.content_locales.push({ content_id: 'new-unreviewed-owner', isbn: isbn10 })
    const mock = t.mock.method(globalThis, 'fetch', f.providerFetch)
    if (mode === 'valid') { await f.run(); assert.equal(f.state.writes.length, 1) }
    else { await assert.rejects(f.run(), /ISBN|수록 원전/); assert.equal(f.state.writes.length, 0) }
    mock.mock.restore()
  }
})

test('stored figureBook.openLibraryWork activates mismatch checks and supports a reviewed series representative', async t => {
  const wrong = fixture()
  wrong.tables.contents[0].metadata = { figureBook: { workTitle: 'The Essays', workCreator: 'Francis Bacon', openLibraryWork: '/works/OL1W' } }
  await assert.rejects(verifyEditionWork(wrong.db, { contentId, locale: 'en', isbn, title: 'The Essays', creator: 'Francis Bacon',
    sourceUrl: 'https://provider.test/edition', workKey: '/works/OL9W', workTitle: 'The Essays' }), /원전 ID/)
  const series = reviewedSeriesVolume()
  const metadata = series.tables.contents[0].metadata as Row
  delete metadata.workKey
  ;(metadata.figureBook as Row).openLibraryWork = '/works/OL1W'
  t.mock.method(globalThis, 'fetch', series.providerFetch); t.mock.method(console, 'log', () => {})
  await series.run()
  assert.equal(series.state.writes.length, 1)
})

test('KO manifest uses shared import-language policy: English import writes zero while a genuine KO edition succeeds', async t => {
  const imported = fixture()
  imported.state.manifest.locale = 'ko'
  imported.state.kakaoLookup = { title: 'The Essays', creator: 'Francis Bacon', coverImageUrl: null,
    metadata: { isbn, publisher: 'Official publisher', link: 'https://provider.test/import', publishDate: null } }
  let mock = t.mock.method(globalThis, 'fetch', imported.providerFetch)
  await assert.rejects(imported.run(), /판본의 언어/)
  assert.equal(imported.state.writes.length, 0)
  mock.mock.restore()
  const genuine = fixture('9788991290808')
  genuine.state.manifest.locale = 'ko'
  genuine.state.kakaoLookup = { title: '수상록', creator: '프랜시스 베이컨', coverImageUrl: null,
    metadata: { isbn: '9788991290808', publisher: '한국어판 출판사', link: 'https://provider.test/ko-edition', publishDate: null } }
  genuine.tables.contents[0].metadata = { figureBook: { workTitle: '수상록', workCreator: '프랜시스 베이컨' } }
  Object.assign(genuine.tables.content_locales[0], { locale: 'ko', title: '수상록', creator: '프랜시스 베이컨' })
  mock = t.mock.method(globalThis, 'fetch', genuine.providerFetch); t.mock.method(console, 'log', () => {})
  await genuine.run()
  assert.equal(genuine.state.writes.length, 1)
  assert.equal(genuine.state.writes[0].body.locale, 'ko')
  mock.mock.restore()
})

test('actual --apply rejects domestic-ISBN Hangul-labelled English Bookk edition even when a matching KO server anchor exists', async t => {
  const f = fixture('9791127238216'), title = '스완네 집 쪽으로 : Swann’s Way (영문판)', creator = 'Marcel Proust (마르셀 프루스트)'
  f.state.manifest.locale = 'ko'
  f.state.kakaoLookup = { title, creator, coverImageUrl: null,
    metadata: { isbn: '9791127238216', publisher: 'Bookk', link: 'https://provider.test/bookk', publishDate: null } }
  f.state.missingProviderEdition = true
  f.tables.contents[0].metadata = { figureBook: { workTitle: title, workCreator: creator } }
  Object.assign(f.tables.content_locales[0], { locale: 'ko', title, creator })
  t.mock.method(globalThis, 'fetch', f.providerFetch)
  await assert.rejects(f.run(), /명시된 영문판.*OpenLibrary/)
  assert.equal(f.state.writes.length, 0)
})
