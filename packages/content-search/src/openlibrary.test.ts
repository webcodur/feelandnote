import assert from 'node:assert/strict'
import test, { afterEach, beforeEach } from 'node:test'

import {
  OPEN_LIBRARY_CACHE_TTL_MS,
  OPEN_LIBRARY_MIN_REQUEST_INTERVAL_MS,
  OpenLibraryApiError,
  __resetOpenLibraryRequestStateForTests,
  __setOpenLibraryRequestRuntimeForTests,
  getOpenLibraryBookByIsbn,
  isbn10ToIsbn13,
  normalizeIsbn,
  searchOpenLibraryBooks,
} from './openlibrary'

let fakeNow = 0

beforeEach(() => {
  __resetOpenLibraryRequestStateForTests()
  fakeNow = 0
  __setOpenLibraryRequestRuntimeForTests({
    now: () => fakeNow,
    sleep: async (ms, signal) => {
      if (signal.aborted) throw signal.reason
      fakeNow += ms
    },
  })
})

afterEach(() => {
  __resetOpenLibraryRequestStateForTests()
})

function responseJson(
  value: unknown,
  status = 200,
  headers: HeadersInit = {}
): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(new Headers(headers)) },
  })
}

const emptySearchResponse = () => ({ numFound: 0, start: 0, docs: [] })

function mockFetch(
  handler: (url: URL, init?: RequestInit) => Response | Promise<Response>
): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof URL
      ? input
      : new URL(typeof input === 'string' ? input : input.url)
    return handler(url, init)
  }) as typeof fetch
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function assertApiError(error: unknown, code: OpenLibraryApiError['code']): boolean {
  assert.ok(error instanceof OpenLibraryApiError)
  assert.equal(error.code, code)
  return true
}

test('normalizes and validates ISBN-10 and ISBN-13 check digits', () => {
  assert.equal(normalizeIsbn('0-14-032872-6'), '0140328726')
  assert.equal(normalizeIsbn('978 0 14 032872 1'), '9780140328721')
  assert.equal(normalizeIsbn('0-8044-2957-x'), '080442957X')
  assert.equal(isbn10ToIsbn13('0140328726'), '9780140328721')
  assert.throws(
    () => normalizeIsbn('9780140328722'),
    error => assertApiError(error, 'INVALID_ISBN')
  )
})

test('search returns distinct work and matched-edition metadata', async () => {
  let requestedUrl: URL | null = null
  const fetchImpl = mockFetch((url) => {
    requestedUrl = url
    return responseJson({
      numFound: 1,
      start: 0,
      docs: [
        {
          key: '/works/OL45804W',
          title: 'Fantastic Mr. Fox',
          author_name: ['Roald Dahl'],
          author_key: ['OL34184A'],
          first_publish_year: 1970,
          edition_count: 139,
          cover_i: 8739161,
          first_sentence: ['Down in the valley there were three farms.'],
          availability: {
            status: 'borrow_available',
            available_to_borrow: true,
            available_to_waitlist: false,
            is_printdisabled: false,
            identifier: 'matilda00dahl',
            openlibrary_work: 'OL45804W',
            openlibrary_edition: 'OL7353617M',
          },
          editions: {
            docs: [
              {
                key: '/books/OL7353617M',
                title: 'Fantastic Mr. Fox',
                author_name: ['Roald Dahl'],
                author_key: ['OL34184A'],
                isbn: ['0140327592', '9780140327595'],
                publisher: ['Puffin'],
                publish_date: ['1988', 'October 1, 1998'],
                language: ['eng'],
                cover_i: 8739161,
              },
            ],
          },
        },
      ],
    })
  })

  const result = await searchOpenLibraryBooks('Fantastic Mr. Fox', 1, {
    author: 'Roald Dahl',
    limit: 10,
    fetchImpl,
  })

  assert.equal(requestedUrl?.searchParams.get('title'), 'Fantastic Mr. Fox')
  assert.equal(requestedUrl?.searchParams.get('author'), 'Roald Dahl')
  assert.equal(requestedUrl?.searchParams.get('language'), 'eng')
  assert.equal(requestedUrl?.searchParams.get('lang'), 'en')
  assert.match(requestedUrl?.searchParams.get('fields') ?? '', /availability/)
  assert.match(requestedUrl?.searchParams.get('fields') ?? '', /editions\.isbn/)
  assert.equal(result.total, 1)
  assert.equal(result.hasMore, false)
  assert.equal(result.items[0].workOlid, 'OL45804W')
  assert.equal(result.items[0].authors[0].olid, 'OL34184A')
  assert.equal(result.items[0].availability?.availableToBorrow, true)
  assert.equal(result.items[0].matchedEdition?.editionOlid, 'OL7353617M')
  assert.equal(result.items[0].matchedEdition?.authorSource, 'edition')
  assert.equal(result.items[0].matchedEdition?.coverSource, 'edition')
  assert.deepEqual(result.items[0].matchedEdition?.isbn13, ['9780140327595'])
  assert.deepEqual(result.items[0].matchedEdition?.languages, ['eng'])
  assert.equal(result.items[0].matchedEdition?.languageProvenance.hasEnglish, true)
  assert.equal(result.items[0].raw.title, 'Fantastic Mr. Fox')
})

test('matched edition never presents a work cover as an edition cover and marks author fallback', async () => {
  const result = await searchOpenLibraryBooks('Fantastic Mr. Fox', 1, {
    fetchImpl: mockFetch(() => responseJson({
      numFound: 1,
      start: 0,
      docs: [{
        key: '/works/OL45804W',
        title: 'Fantastic Mr. Fox',
        author_name: ['Roald Dahl'],
        author_key: ['OL34184A'],
        edition_count: 1,
        cover_i: 8739161,
        editions: {
          docs: [{
            key: '/books/OL7353617M',
            title: 'Fantastic Mr. Fox',
            isbn: ['9780140328721'],
            language: ['eng'],
          }],
        },
      }],
    })),
  })

  const work = result.items[0]
  assert.equal(work.coverSource, 'work')
  assert.match(work.coverImageUrl ?? '', /8739161-L\.jpg/)
  assert.equal(work.matchedEdition?.coverImageUrl, null)
  assert.equal(work.matchedEdition?.coverSource, 'none')
  assert.equal(work.matchedEdition?.authorSource, 'work_fallback')
  assert.equal(work.matchedEdition?.authors[0].name, 'Roald Dahl')
})

test('search encodes title and author and preserves page/limit semantics', async () => {
  let requestedUrl: URL | null = null
  await searchOpenLibraryBooks('C++ & 100% fun', 3, {
    author: 'A/B & C',
    limit: 7,
    fetchImpl: mockFetch(url => {
      requestedUrl = url
      return responseJson({ numFound: 50, start: 14, docs: [] })
    }),
  })

  assert.equal(requestedUrl?.searchParams.get('title'), 'C++ & 100% fun')
  assert.equal(requestedUrl?.searchParams.get('author'), 'A/B & C')
  assert.equal(requestedUrl?.searchParams.get('page'), '3')
  assert.equal(requestedUrl?.searchParams.get('limit'), '7')
  assert.match(requestedUrl?.toString() ?? '', /C%2B%2B\+%26\+100%25\+fun/)

  await assert.rejects(
    searchOpenLibraryBooks('valid', 0),
    error => assertApiError(error, 'INVALID_ARGUMENT')
  )
  await assert.rejects(
    searchOpenLibraryBooks('valid', 1, { limit: 101 }),
    error => assertApiError(error, 'INVALID_ARGUMENT')
  )
})

test('default User-Agent includes the public project URL', async () => {
  let userAgent: string | null = null
  await searchOpenLibraryBooks('contact', 1, {
    fetchImpl: mockFetch((_url, init) => {
      userAgent = new Headers(init?.headers).get('User-Agent')
      return responseJson(emptySearchResponse())
    }),
  })
  assert.match(userAgent ?? '', /https:\/\/feelandnote\.com/)
})

test('search rejects a malformed upstream response instead of coercing it', async () => {
  const fetchImpl = mockFetch(() =>
    responseJson({ numFound: 1, start: 0, docs: [{ key: '/works/OL1W' }] })
  )

  await assert.rejects(
    searchOpenLibraryBooks('Missing title', 1, { fetchImpl }),
    error => assertApiError(error, 'INVALID_RESPONSE')
  )
})

test('ISBN lookup reports an exact normalized identifier match', async () => {
  const fetchImpl = mockFetch((url) => {
    assert.equal(url.searchParams.get('bibkeys'), 'ISBN:9780140328721')
    assert.equal(url.searchParams.get('jscmd'), 'data')
    return responseJson({
      'ISBN:9780140328721': {
        url: 'http://openlibrary.org/books/OL7353617M',
        key: '/books/OL7353617M',
        work_key: '/works/OL45804W',
        title: 'Fantastic Mr. Fox',
        authors: [
          {
            url: 'http://openlibrary.org/authors/OL34184A/Roald_Dahl',
            name: 'Roald Dahl',
          },
        ],
        number_of_pages: 96,
        identifiers: {
          isbn_10: ['0140328726'],
          isbn_13: ['9780140328721'],
        },
        publishers: [{ name: 'Puffin' }],
        publish_date: '1988',
        languages: [{ key: '/languages/eng' }],
        excerpts: [
          { text: 'Down in the valley there were three farms.', first_sentence: true },
        ],
        ebooks: [
          {
            availability: 'restricted',
            preview_url: 'https://archive.org/details/fantasticmrfoxpu00roal',
          },
        ],
        cover: {
          large: 'http://covers.openlibrary.org/b/id/8739161-L.jpg',
        },
      },
    })
  })

  const result = await getOpenLibraryBookByIsbn('978-0-14-032872-1', { fetchImpl })
  assert.equal(result.status, 'found_exact')
  assert.equal(result.exactMatch, true)
  assert.equal(result.book.title, 'Fantastic Mr. Fox')
  assert.equal(result.book.authors[0].olid, 'OL34184A')
  assert.equal(result.book.authorSource, 'edition')
  assert.deepEqual(result.book.isbn10, ['0140328726'])
  assert.equal(result.book.workOlid, 'OL45804W')
  assert.deepEqual(result.book.languages, ['eng'])
  assert.deepEqual(result.book.languageProvenance, {
    source: 'isbn_edition_record',
    codes: ['eng'],
    hasEnglish: true,
  })
  assert.equal(result.book.coverImageUrl?.startsWith('https:'), true)
  assert.equal(result.book.coverSource, 'edition')
  assert.equal(result.book.availability?.status, 'restricted')
  assert.equal(result.book.description, 'Down in the valley there were three farms.')
})

test('ISBN exact lookup enriches missing language/work provenance from the edition endpoint', async () => {
  const paths: string[] = []
  const result = await getOpenLibraryBookByIsbn('9780140328721', {
    fetchImpl: mockFetch(url => {
      paths.push(url.pathname)
      if (url.pathname === '/api/books') {
        return responseJson({
          'ISBN:9780140328721': {
            url: 'https://openlibrary.org/books/OL7353617M',
            key: '/books/OL7353617M',
            title: 'Fantastic Mr. Fox',
            identifiers: {
              isbn_10: ['0140328726'],
              isbn_13: ['9780140328721'],
            },
          },
        })
      }
      assert.equal(url.pathname, '/books/OL7353617M.json')
      return responseJson({
        key: '/books/OL7353617M',
        title: 'Fantastic Mr. Fox',
        works: [{ key: '/works/OL45804W' }],
        languages: [{ key: '/languages/eng' }],
        covers: [8739161],
        isbn_10: ['0140328726'],
        isbn_13: ['9780140328721'],
      })
    }),
  })

  assert.equal(result.status, 'found_exact')
  assert.deepEqual(paths, ['/api/books', '/books/OL7353617M.json'])
  assert.equal(result.book.workOlid, 'OL45804W')
  assert.deepEqual(result.book.languages, ['eng'])
  assert.deepEqual(result.book.languageProvenance, {
    source: 'edition_json',
    codes: ['eng'],
    hasEnglish: true,
  })
  assert.equal(result.book.coverSource, 'edition')
  assert.equal(result.book.rawEditionRecord?.key, '/books/OL7353617M')
})

test('ISBN exact lookup enriches a missing edition cover even when language and work are present', async () => {
  const paths: string[] = []
  const result = await getOpenLibraryBookByIsbn('9780140328721', {
    fetchImpl: mockFetch(url => {
      paths.push(url.pathname)
      if (url.pathname === '/api/books') {
        return responseJson({
          'ISBN:9780140328721': {
            url: 'https://openlibrary.org/books/OL7353617M',
            key: '/books/OL7353617M',
            work_key: '/works/OL45804W',
            title: 'Fantastic Mr. Fox',
            identifiers: {
              isbn_10: ['0140328726'],
              isbn_13: ['9780140328721'],
            },
            languages: [{ key: '/languages/eng' }],
          },
        })
      }
      assert.equal(url.pathname, '/books/OL7353617M.json')
      return responseJson({
        key: '/books/OL7353617M',
        covers: [8739161],
      })
    }),
  })

  assert.equal(result.status, 'found_exact')
  assert.deepEqual(paths, ['/api/books', '/books/OL7353617M.json'])
  assert.equal(result.book.workOlid, 'OL45804W')
  assert.deepEqual(result.book.languages, ['eng'])
  assert.equal(result.book.languageProvenance.source, 'isbn_edition_record')
  assert.match(result.book.coverImageUrl ?? '', /8739161-L\.jpg/)
  assert.equal(result.book.coverSource, 'edition')
  assert.equal(result.book.rawEditionRecord?.key, '/books/OL7353617M')
})

test('ISBN lookup distinguishes a returned mismatched edition from not-found', async () => {
  const mismatchFetch = mockFetch(() =>
    responseJson({
      'ISBN:9780140328721': {
        url: 'https://openlibrary.org/books/OL82563M',
        key: '/books/OL82563M',
        title: 'To Kill a Mockingbird',
        identifiers: { isbn_13: ['9780061120084'] },
      },
    })
  )
  const mismatch = await getOpenLibraryBookByIsbn('9780140328721', {
    fetchImpl: mismatchFetch,
  })
  assert.equal(mismatch.status, 'found_mismatch')
  assert.equal(mismatch.exactMatch, false)
  assert.equal(mismatch.book.title, 'To Kill a Mockingbird')

  const notFound = await getOpenLibraryBookByIsbn('9780140328721', {
    fetchImpl: mockFetch(() => responseJson({})),
  })
  assert.deepEqual(notFound, {
    status: 'not_found',
    queryIsbn: '9780140328721',
    exactMatch: false,
    book: null,
  })
})

test('ISBN-10 query exactly matches an edition that returns only equivalent ISBN-13', async () => {
  const result = await getOpenLibraryBookByIsbn('0-14-032872-6', {
    fetchImpl: mockFetch(url => {
      assert.equal(url.searchParams.get('bibkeys'), 'ISBN:0140328726')
      return responseJson({
        'ISBN:0140328726': {
          url: 'https://openlibrary.org/books/OL7353617M',
          key: '/books/OL7353617M',
          work_key: '/works/OL45804W',
          title: 'Fantastic Mr. Fox',
          identifiers: { isbn_13: ['9780140328721'] },
          languages: [{ key: '/languages/eng' }],
          cover: { large: 'https://covers.openlibrary.org/b/id/8739161-L.jpg' },
        },
      })
    }),
  })
  assert.equal(result.status, 'found_exact')
  assert.deepEqual(result.book.languages, ['eng'])
  assert.equal(result.book.languageProvenance.hasEnglish, true)
})

test('invalid JSON is rejected explicitly and never cached', async () => {
  let calls = 0
  const fetchImpl = mockFetch(() => {
    calls += 1
    return new Response('{not-json', { status: 200 })
  })
  await assert.rejects(
    searchOpenLibraryBooks('broken-json', 1, { fetchImpl }),
    error => assertApiError(error, 'INVALID_RESPONSE')
  )
  await assert.rejects(
    searchOpenLibraryBooks('broken-json', 1, { fetchImpl }),
    error => assertApiError(error, 'INVALID_RESPONSE')
  )
  assert.equal(calls, 2)
})

test('HTTP failures expose status and do not fall back to another provider', async () => {
  await assert.rejects(
    searchOpenLibraryBooks('Matilda', 1, {
      fetchImpl: mockFetch(() => responseJson({ error: 'busy' }, 503)),
    }),
    (error: unknown) => {
      assertApiError(error, 'HTTP')
      assert.equal((error as OpenLibraryApiError).status, 503)
      return true
    }
  )
})

test('network failures have a distinct error code', async () => {
  await assert.rejects(
    searchOpenLibraryBooks('Matilda', 1, {
      fetchImpl: mockFetch(() => {
        throw new TypeError('socket closed')
      }),
    }),
    error => assertApiError(error, 'NETWORK')
  )
})

test('successful JSON responses are cached until TTL and then refreshed', async () => {
  let calls = 0
  const fetchImpl = mockFetch(() => {
    calls += 1
    return responseJson(emptySearchResponse())
  })

  await searchOpenLibraryBooks('cached', 1, { fetchImpl })
  await searchOpenLibraryBooks('cached', 1, { fetchImpl })
  assert.equal(calls, 1)

  fakeNow += OPEN_LIBRARY_CACHE_TTL_MS + 1
  await searchOpenLibraryBooks('cached', 1, { fetchImpl })
  assert.equal(calls, 2)
})

test('beforeProviderRequest runs for each real retry attempt and not for a cache hit', async () => {
  const events: string[] = []
  const hookCalls: Array<{ url: string; attempt: number; maxAttempts: number }> = []
  let fetchCalls = 0
  const fetchImpl = mockFetch(() => {
    fetchCalls += 1
    events.push(`fetch:${fetchCalls}`)
    return fetchCalls === 1
      ? responseJson({ error: 'temporarily unavailable' }, 503)
      : responseJson(emptySearchResponse())
  })
  const beforeProviderRequest = async (
    context: { url: string; attempt: number; maxAttempts: number; signal: AbortSignal }
  ) => {
    await Promise.resolve()
    assert.equal(context.signal.aborted, false)
    hookCalls.push({
      url: context.url,
      attempt: context.attempt,
      maxAttempts: context.maxAttempts,
    })
    events.push(`hook:${context.attempt}`)
  }

  await searchOpenLibraryBooks('hook retry cache', 1, {
    fetchImpl,
    beforeProviderRequest,
  })
  await searchOpenLibraryBooks('hook retry cache', 1, {
    fetchImpl,
    beforeProviderRequest,
  })

  assert.equal(fetchCalls, 2)
  assert.deepEqual(events, ['hook:1', 'fetch:1', 'hook:2', 'fetch:2'])
  assert.deepEqual(hookCalls.map(call => call.attempt), [1, 2])
  assert.ok(hookCalls.every(call => call.maxAttempts === 4))
  assert.ok(hookCalls.every(call => call.url.includes('hook+retry+cache')))
})

test('identical concurrent requests coalesce into one provider call', async () => {
  const pending = deferred<Response>()
  let calls = 0
  const fetchImpl = mockFetch(() => {
    calls += 1
    return pending.promise
  })

  const first = searchOpenLibraryBooks('coalesced', 1, { fetchImpl })
  const second = searchOpenLibraryBooks('coalesced', 1, { fetchImpl })
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(calls, 1)
  pending.resolve(responseJson(emptySearchResponse()))
  const [left, right] = await Promise.all([first, second])
  assert.deepEqual(left, right)
})

test('global rate limiter spaces distinct provider calls by at least two seconds', async () => {
  const starts: number[] = []
  const fetchImpl = mockFetch(() => {
    starts.push(fakeNow)
    return responseJson(emptySearchResponse())
  })

  await searchOpenLibraryBooks('lane one', 1, { fetchImpl })
  await searchOpenLibraryBooks('lane two', 1, { fetchImpl })
  await searchOpenLibraryBooks('lane three', 1, { fetchImpl })
  assert.deepEqual(starts, [
    0,
    OPEN_LIBRARY_MIN_REQUEST_INTERVAL_MS,
    OPEN_LIBRARY_MIN_REQUEST_INTERVAL_MS * 2,
  ])
})

test('429 and 5xx use bounded retry, Retry-After, and exponential spacing', async () => {
  const starts: number[] = []
  let attempt = 0
  const fetchImpl = mockFetch(() => {
    starts.push(fakeNow)
    attempt += 1
    if (attempt === 1) return responseJson({ error: 'rate limited' }, 429, { 'Retry-After': '3' })
    if (attempt === 2) return responseJson({ error: 'busy' }, 503)
    return responseJson(emptySearchResponse())
  })

  await searchOpenLibraryBooks('retry-success', 1, { fetchImpl })
  assert.equal(attempt, 3)
  assert.deepEqual(starts, [0, 3_000, 5_000])

  __resetOpenLibraryRequestStateForTests()
  fakeNow = 0
  __setOpenLibraryRequestRuntimeForTests({
    now: () => fakeNow,
    sleep: async ms => { fakeNow += ms },
  })
  let exhaustedCalls = 0
  await assert.rejects(
    searchOpenLibraryBooks('retry-exhausted', 1, {
      fetchImpl: mockFetch(() => {
        exhaustedCalls += 1
        return responseJson({ error: 'still busy' }, 503)
      }),
    }),
    (error: unknown) => {
      assertApiError(error, 'HTTP')
      assert.equal((error as OpenLibraryApiError).status, 503)
      return true
    }
  )
  assert.equal(exhaustedCalls, 4)
})

test('one coalesced caller can abort without cancelling another caller', async () => {
  const pending = deferred<Response>()
  let calls = 0
  const firstController = new AbortController()
  const fetchImpl = mockFetch(() => {
    calls += 1
    return pending.promise
  })
  const first = searchOpenLibraryBooks('shared-abort', 1, {
    fetchImpl,
    signal: firstController.signal,
  })
  const second = searchOpenLibraryBooks('shared-abort', 1, { fetchImpl })
  firstController.abort('caller stopped')
  await assert.rejects(first, error => assertApiError(error, 'ABORTED'))
  assert.equal(calls, 1)
  pending.resolve(responseJson(emptySearchResponse()))
  assert.equal((await second).total, 0)
})

test('an already-aborted caller performs no provider request', async () => {
  const controller = new AbortController()
  controller.abort('stop')
  let calls = 0
  await assert.rejects(
    searchOpenLibraryBooks('never sent', 1, {
      signal: controller.signal,
      fetchImpl: mockFetch(() => {
        calls += 1
        return responseJson(emptySearchResponse())
      }),
    }),
    error => assertApiError(error, 'ABORTED')
  )
  assert.equal(calls, 0)
})

test('timeout aborts the request and has a distinct error code', async () => {
  const fetchImpl = mockFetch((_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      const rejectAborted = () => reject(new DOMException('Aborted', 'AbortError'))
      if (init?.signal?.aborted) {
        rejectAborted()
      } else {
        init?.signal?.addEventListener('abort', rejectAborted, { once: true })
      }
    })
  )

  await assert.rejects(
    searchOpenLibraryBooks('Matilda', 1, { fetchImpl, timeoutMs: 5 }),
    error => assertApiError(error, 'TIMEOUT')
  )
})

test('timeout also covers a stalled JSON response body', async () => {
  const fetchImpl = mockFetch((_url, init) => ({
    ok: true,
    status: 200,
    json: () => new Promise<unknown>((_resolve, reject) => {
      const rejectAborted = () => reject(new DOMException('Aborted', 'AbortError'))
      if (init?.signal?.aborted) {
        rejectAborted()
      } else {
        init?.signal?.addEventListener('abort', rejectAborted, { once: true })
      }
    }),
  }) as Response)

  await assert.rejects(
    searchOpenLibraryBooks('Matilda', 1, { fetchImpl, timeoutMs: 5 }),
    error => assertApiError(error, 'TIMEOUT')
  )
})
