import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test, { before } from 'node:test'
import ts from 'typescript'
import { createClient } from '@feelandnote/db'
import { toIsbn13 } from '@feelandnote/content-search/book-isbn'
import { registeredSeriesMatches } from '@feelandnote/content-search/book-series'
import { getOpenLibraryBookMetadata } from '@feelandnote/content-search/openlibrary'
import { withoutBookDescription } from '@feelandnote/shared/lib/book-metadata'

let provider: typeof import('@feelandnote/content-search/external-book-input')
before(async () => {
  process.env.KAKAO_REST_API_KEY = 'test-only'
  provider = await import('@feelandnote/content-search/external-book-input')
})
const compiled = ts.transpileModule(readFileSync(new URL('./addContent.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
type Row = Record<string, unknown>
const isbn = '9788954655972'
const input = () => ({ id: isbn, type: 'BOOK', title: '여행의 이유', creator: '김영하', externalSource: 'kakao_book',
  thumbnailUrl: 'https://forged.test/cover.jpg', publisher: '가짜 출판사', description: '위조한 소개',
  metadata: { isbn, publisher: '가짜 출판사', description: '위조 소개', figureBook: { wikidataQid: 'Q_FORGED' } } })

function kakao(overrides: Row = {}) {
  return Response.json({ documents: [{ title: '여행의 이유', authors: ['김영하'], translators: [], isbn,
    publisher: '문학동네', url: 'https://search.daum.net/search?w=bookpage&bookId=123', datetime: '',
    contents: '', thumbnail: '', status: '정상판매', ...overrides }], meta: { total_count: 1, is_end: true } })
}

function fixture(englishBook?: Awaited<ReturnType<typeof getOpenLibraryBookMetadata>>) {
  const tables: Record<string, Row[]> = { contents: [], content_locales: [], figure_book_editions: [], member_contents: [] }
  const state = { writes: [] as { table: string; method: string; body: Row }[], failLocale: false, failRead: false,
    failMember: false, activity: 0, introduction: 0, revalidated: [] as string[], providerIntroduction: true }
  const db = createClient('https://db.test', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: async (value, init) => {
      const url = new URL(String(value)), table = url.pathname.split('/').at(-1)!, method = init?.method ?? 'GET'
      assert.ok(table in tables, 'unexpected table ' + table)
      const error = (message: string, code = 'XX000') => Response.json({ code, message, details: '', hint: '' }, { status: 503 })
      if (method === 'GET') {
        if (state.failRead) return error('database lookup failed')
        const rows = tables[table].filter(row => [...url.searchParams].every(([key, condition]) => {
          if (!condition.startsWith('eq.')) return true
          const field = key === 'content.type' ? tables.contents.find(work => work.id === row.content_id)?.type
            : key.split(/->>?/u).reduce<unknown>((value, part) => (value as Row | undefined)?.[part], row)
          return String(field) === condition.slice(3)
        }))
        return Response.json(new Headers(init?.headers).get('Accept')?.includes('vnd.pgrst.object') ? rows[0] ?? null : rows)
      }
      const body = JSON.parse(String(init?.body)) as Row
      state.writes.push({ table, method, body })
      assert.equal(method, 'POST', 'existing metadata and references must not be changed or deleted')
      if (table === 'content_locales' && state.failLocale) return error('locale failed')
      if (table === 'member_contents') {
        if (state.failMember) return error('member failed')
        if (tables[table].some(row => row.member_id === body.member_id && row.content_id === body.content_id)) return error('already recorded', '23505')
      }
      const saved = { ...body, ...(table === 'contents' ? { id: 'new-work' } : table === 'member_contents' ? { id: 'new-record' } : {}) }
      tables[table].push(saved)
      const singular = new Headers(init?.headers).get('Accept')?.includes('vnd.pgrst.object')
      return Response.json(singular ? saved : [saved])
    } },
  })
  db.auth.getUser = async () => ({ data: { user: { id: 'owner', aud: 'authenticated', created_at: '', app_metadata: {}, user_metadata: {} } }, error: null })
  const mocks: Record<string, unknown> = {
    '@/lib/db/server': { createClient: async () => db },
    'next/cache': { revalidatePath: (path: string) => state.revalidated.push(path) },
    '@/actions/activity': { logActivity: async () => { state.activity++ } },
    '@/lib/errors': { failure: (error: string, message = error) => ({ success: false, error, message }),
      success: (data: unknown) => ({ success: true, data }), handleDatabaseError: () => ({ success: false, error: 'DB_ERROR' }) },
    '@/lib/utils/content-locale': { sourceToLocale: () => 'ko', sourceToJsonb: (source: string) => ({ primary: source }) },
    '@/lib/books/bookSearch.server': { getEnglishBookMetadataCached: englishBook ? async () => englishBook : getOpenLibraryBookMetadata },
    '@feelandnote/content-search/tmdb': { getVideoEnLocale: async () => null },
    '@feelandnote/shared/lib/book-metadata': { withoutBookDescription },
    '@feelandnote/content-search/book-isbn': { toIsbn13 },
    '@feelandnote/content-search/book-series': { registeredSeriesMatches },
    '@feelandnote/content-search/external-book-input': provider,
    '@feelandnote/content-search/book-introduction': { fetchBookIntroduction: async () => {
      state.introduction++
      return state.providerIntroduction ? { source: 'KAKAO', sourceUrl: 'https://dapi.kakao.com/v3/search/book?target=isbn&query=' + isbn, description: '실제 공급처 소개' } : { source: null, sourceUrl: null, description: null }
    } },
  }
  const loaded = { exports: {} as { addContent: (params: Row) => Promise<{ success: boolean; error?: string; data?: Row }> } }
  new Function('require', 'module', 'exports', compiled)((name: string) => {
    assert.ok(name in mocks, 'unexpected import ' + name)
    return mocks[name]
  }, loaded, loaded.exports)
  return { tables, state, add: loaded.exports.addContent }
}

test('new BOOK uses one fresh official metadata set and never client publisher/cover/description/origin claims', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => kakao())
  const f = fixture()
  assert.equal((await f.add(input())).success, true)
  assert.equal(fetch.mock.callCount(), 1)
  const work = f.tables.contents[0], locale = f.tables.content_locales[0]
  assert.deepEqual(work.metadata, { publisher: '문학동네', publishDate: '', isbn, genre: '', link: 'https://search.daum.net/search?w=bookpage&bookId=123', salesStatus: '정상판매', translators: [] })
  assert.equal(locale.publisher, '문학동네'); assert.equal(locale.thumbnail_url, null)
  assert.equal(locale.description, 'KAKAO'); assert.equal(locale.creator, '김영하')
  assert.equal(f.tables.member_contents[0].content_id, work.id)
})
test('a verified series volume cannot create another work from the ordinary member import', async t=>{
 t.mock.method(globalThis,'fetch',async()=>kakao({title:'여행의 이유 2'}))
 const f=fixture()
 f.tables.contents.push({id:'series-work',type:'BOOK',metadata:{figureBook:{series:{title:'여행의 이유',creator:'김영하',locale:'ko',sourceUrl:'https://publisher.example/series'}}}})
 const result=await f.add({...input(),title:'여행의 이유 2'})
 assert.equal(result.error,'CONFLICT');assert.equal(f.state.writes.length,0)
})

test('full original author, subtitle, collection scope and volume cannot be substituted by client metadata', async t => {
  t.mock.method(globalThis, 'fetch', async () => kakao())
  for (const patch of [{ creator: '김정하' }, { creator: '' }, { title: '여행의 이유: 해설' }, { title: '여행의 이유 (2)' }]) {
    const f = fixture()
    assert.equal((await f.add({ ...input(), ...patch })).error, 'VALIDATION_ERROR')
    assert.equal(f.state.writes.length, 0)
  }
})

test('missing provider original author cannot be replaced with a translator or the supplied author', async t => {
  t.mock.method(globalThis, 'fetch', async () => kakao({ authors: [], translators: ['김영하'] }))
  const f = fixture()
  assert.equal((await f.add(input())).error, 'VALIDATION_ERROR')
  assert.equal(f.state.writes.length, 0)
})

test('canonical DB ID is reused offline and an existing member rating/review/presets are preserved', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw Error('reuse must not contact metadata APIs') })
  const f = fixture()
  f.tables.contents.push({ id: 'canonical-id', type: 'BOOK', metadata: { original: true } })
  f.tables.content_locales.push({ content_id: 'canonical-id', title: '기존 원전', description: '보존할 소개', locale: 'ko' })
  f.tables.member_contents.push({ id: 'old-record', member_id: 'owner', content_id: 'canonical-id', rating: 4.5, review: '내 감상', review_presets: ['INSIGHT'], created_at: 'original-date' })
  const before = structuredClone(f.tables)
  const result = await f.add({ ...input(), id: 'canonical-id', title: '위조 제목', creator: '위조 저자' })
  assert.equal(result.success, true)
  assert.deepEqual(result.data?.existingRecord, { rating: 4.5, review: '내 감상', reviewPresets: ['INSIGHT'] })
  assert.deepEqual(f.tables, before)
  assert.equal(f.state.introduction, 0); assert.equal(fetch.mock.callCount(), 0)
  assert.ok(f.state.writes.every(row => row.table === 'member_contents'))
})

test('canonical ID of another content type is refused, not inserted as a new BOOK', async () => {
  const f = fixture(); f.tables.contents.push({ id: 'canonical-id', type: 'VIDEO' })
  assert.equal((await f.add({ ...input(), id: 'canonical-id' })).error, 'VALIDATION_ERROR')
  assert.equal(f.state.writes.length, 0)
})

test('ISBN in an existing secondary edition reuses its work; ISBN on multiple works is an explicit conflict', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw Error('existing ISBN metadata must be retained') })
  const f = fixture()
  f.tables.contents.push({ id: 'existing', type: 'BOOK', external_id: 'another-isbn' })
  f.tables.figure_book_editions.push({ content_id: 'existing', isbn })
  assert.equal((await f.add(input())).data?.contentId, 'existing')
  assert.equal(f.state.introduction, 0)
  const ambiguous = fixture()
  ambiguous.tables.content_locales.push({ content_id: 'one', isbn }, { content_id: 'two', isbn })
  assert.equal((await ambiguous.add(input())).error, 'CONFLICT')
  assert.equal(ambiguous.state.writes.length, 0)
})

test('another scope or full author is never merged into the first title/surname match', async t => {
  t.mock.method(globalThis, 'fetch', async () => kakao({ title: '여행의 이유: 외 두 편' }))
  const f = fixture()
  f.tables.contents.push({ id: 'old-work', type: 'BOOK' })
  f.tables.content_locales.push({ content_id: 'old-work', locale: 'ko', title: '여행의 이유', creator: '김영하' })
  assert.equal((await f.add({ ...input(), title: '여행의 이유: 외 두 편' })).data?.contentId, 'new-work')
  assert.equal(f.tables.content_locales[0].title, '여행의 이유')
})

test('same full title and author with another ISBN require original-work confirmation instead of automatic merge', async t => {
  t.mock.method(globalThis, 'fetch', async () => kakao())
  const f = fixture()
  f.tables.contents.push({ id: 'existing', type: 'BOOK' })
  f.tables.content_locales.push({ content_id: 'existing', locale: 'ko', title: '여행의 이유', creator: '김영하', isbn: 'other-isbn' })
  assert.equal((await f.add(input())).error, 'CONFLICT')
  assert.equal(f.state.writes.length, 0)
})

test('locale failure is reported, does not create a member record, and never deletes concurrently referenced work', async t => {
  t.mock.method(globalThis, 'fetch', async () => kakao())
  t.mock.method(console, 'error', () => {})
  const f = fixture(); f.state.failLocale = true
  assert.equal((await f.add(input())).error, 'DB_ERROR')
  assert.equal(f.tables.contents.length, 1)
  assert.equal(f.tables.member_contents.length, 0)
  assert.equal(f.state.activity, 0); assert.equal(f.state.revalidated.length, 0)
  assert.deepEqual(f.state.writes.map(row => row.table), ['contents', 'content_locales'])
})

test('failed lookup is not treated as absent work and missing introduction never saves client prose', async t => {
  const failed = fixture(); failed.state.failRead = true
  assert.equal((await failed.add(input())).error, 'DB_ERROR')
  assert.equal(failed.state.writes.length, 0)
  t.mock.method(globalThis, 'fetch', async () => kakao())
  const f = fixture(); f.state.providerIntroduction = false
  assert.equal((await f.add(input())).success, true)
  assert.equal(f.tables.content_locales[0].description, null)
  assert.equal((f.tables.content_locales[0].sources as Row).description, undefined)
})

test('manual title, supplier product code, mismatched ISBN and non-English edition cannot create verified BOOK', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ key: '/books/OL1M', title: 'The Essays', isbn_13: ['9780140432169'], publishers: ['Penguin'], languages: [{ key: '/languages/spa' }] }))
  for (const params of [{ ...input(), id: 'manual_1', externalSource: undefined, metadata: undefined },
    { ...input(), id: '4808952741950', metadata: { isbn: '4808952741950' } },
    { ...input(), id: '9780140432169' }]) {
    const f = fixture(); assert.equal((await f.add(params)).error, 'VALIDATION_ERROR'); assert.equal(f.state.writes.length, 0)
  }
  assert.equal(fetch.mock.callCount(), 0)
  const f = fixture()
  assert.equal((await f.add({ ...input(), id: '9780140432169', title: 'The Essays', creator: 'Francis Bacon', externalSource: 'openlibrary', metadata: { isbn: '9780140432169' } })).error, 'VALIDATION_ERROR')
  assert.equal(f.state.writes.length, 0)
})


test('another ISBN and title variant on one original work cannot create another work or discard existing records', async () => {
  const englishIsbn = '9780062301253'
  const book = {isbn:englishIsbn,title:'Elon Musk: Tesla, SpaceX, and the Quest for a Fantastic Future',creator:'Ashlee Vance',
    publisher:'Ecco',publishDate:'2017',coverImageUrl:null,sourceUrl:'https://openlibrary.org/books/OL29732932M',
    workKey:'/works/OL17184556W',workTitle:'Elon Musk',languages:['/languages/eng']}
  for (const source of ['contents','figure_book_editions','content_locales']) {
    const f = fixture(book)
    f.tables.contents.push({id:'original',type:'BOOK',...(source==='contents' ? {metadata:{workKey:book.workKey}} : {})})
    if(source!=='contents') f.tables[source].push({content_id:'original',isbn:'9780062301239',sources:{workKey:book.workKey}})
    f.tables.member_contents.push({id:'record',content_id:'original',member_id:'owner',review:'기존 감상',rating:5})
    const before=structuredClone(f.tables)
    const result=await f.add({id:englishIsbn,type:'BOOK',externalSource:'openlibrary',title:book.title,creator:book.creator,
      metadata:{isbn:englishIsbn,editionKey:'/books/OL29732932M',workKey:book.workKey}})
    assert.equal(result.error,'CONFLICT');assert.equal(f.state.writes.length,0);assert.deepEqual(f.tables,before)
  }
})
