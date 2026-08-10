const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org'
const OPEN_LIBRARY_SEARCH_URL = `${OPEN_LIBRARY_BASE_URL}/search.json`
const OPEN_LIBRARY_BOOKS_URL = `${OPEN_LIBRARY_BASE_URL}/api/books`
const OPEN_LIBRARY_COVERS_URL = 'https://covers.openlibrary.org'

export const OPEN_LIBRARY_DEFAULT_TIMEOUT_MS = 10_000
export const OPEN_LIBRARY_DEFAULT_PAGE_SIZE = 20
export const OPEN_LIBRARY_MAX_PAGE_SIZE = 100
export const OPEN_LIBRARY_CACHE_TTL_MS = 5 * 60_000
export const OPEN_LIBRARY_MIN_REQUEST_INTERVAL_MS = 2_000
export const OPEN_LIBRARY_MAX_RETRIES = 3

const OPEN_LIBRARY_DEFAULT_USER_AGENT =
  'Feelandnote/1.0 (+https://feelandnote.com; OpenLibrary metadata lookup)'

type JsonRecord = Record<string, unknown>

export type OpenLibraryErrorCode =
  | 'INVALID_ARGUMENT'
  | 'INVALID_ISBN'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'NETWORK'
  | 'HTTP'
  | 'INVALID_RESPONSE'

export class OpenLibraryApiError extends Error {
  readonly code: OpenLibraryErrorCode
  readonly status: number | null

  constructor(
    code: OpenLibraryErrorCode,
    message: string,
    options: { status?: number; cause?: unknown } = {}
  ) {
    super(message)
    this.name = 'OpenLibraryApiError'
    this.code = code
    this.status = options.status ?? null

    if (options.cause !== undefined) {
      Object.defineProperty(this, 'cause', {
        configurable: true,
        value: options.cause,
      })
    }
  }
}

export interface OpenLibraryAuthor {
  olid: string | null
  name: string
  openLibraryUrl: string | null
}

export type OpenLibraryEditionAuthorSource =
  | 'edition'
  | 'work_fallback'
  | 'none'

export type OpenLibraryEditionCoverSource = 'edition' | 'none'

export type OpenLibraryLanguageSource =
  | 'search_edition'
  | 'isbn_edition_record'
  | 'edition_json'
  | 'none'

export interface OpenLibraryLanguageProvenance {
  source: OpenLibraryLanguageSource
  /** Normalized Open Library language codes. English is always `eng`. */
  codes: string[]
  hasEnglish: boolean
}

export interface OpenLibraryAvailability {
  status: string | null
  availableToBorrow: boolean | null
  availableToWaitlist: boolean | null
  isPrintDisabled: boolean | null
  identifier: string | null
  previewUrl: string | null
  editionOlid: string | null
  workOlid: string | null
}

/**
 * One concrete Open Library edition. Work-level and edition-level metadata are
 * intentionally not flattened so callers can decide whether the edition is
 * sufficiently identified before writing it to the database.
 */
export interface OpenLibraryEdition {
  editionOlid: string
  workOlid: string | null
  title: string
  subtitle: string | null
  authors: OpenLibraryAuthor[]
  authorSource: OpenLibraryEditionAuthorSource
  isbn10: string[]
  isbn13: string[]
  publishers: string[]
  publishDate: string | null
  languages: string[]
  languageProvenance: OpenLibraryLanguageProvenance
  numberOfPages: number | null
  coverImageUrl: string | null
  coverSource: OpenLibraryEditionCoverSource
  description: string | null
  availability: OpenLibraryAvailability | null
  openLibraryUrl: string
  raw: Readonly<JsonRecord>
  /** Full `/books/{OLID}.json` response when ISBN lookup needed enrichment. */
  rawEditionRecord: Readonly<JsonRecord> | null
}

/** A work returned by Search API, plus the best-matching English edition. */
export interface OpenLibraryWorkSearchResult {
  workOlid: string
  title: string
  authors: OpenLibraryAuthor[]
  firstPublishYear: number | null
  editionCount: number
  coverImageUrl: string | null
  coverSource: 'work' | 'none'
  description: string | null
  availability: OpenLibraryAvailability | null
  matchedEdition: OpenLibraryEdition | null
  openLibraryUrl: string
  raw: Readonly<JsonRecord>
}

export interface OpenLibrarySearchResponse {
  items: OpenLibraryWorkSearchResult[]
  total: number
  start: number
  page: number
  limit: number
  hasMore: boolean
}

export type OpenLibraryIsbnLookupResult =
  | {
      status: 'found_exact'
      queryIsbn: string
      exactMatch: true
      book: OpenLibraryEdition
    }
  | {
      status: 'found_mismatch'
      queryIsbn: string
      exactMatch: false
      book: OpenLibraryEdition
    }
  | {
      status: 'not_found'
      queryIsbn: string
      exactMatch: false
      book: null
    }

export interface OpenLibraryRequestOptions {
  timeoutMs?: number
  signal?: AbortSignal
  /** Dependency injection for deterministic tests and server runtimes. */
  fetchImpl?: typeof fetch
  userAgent?: string
  /**
   * Runs after the module-local rate slot is acquired and immediately before
   * each real provider attempt. Cache hits and coalesced followers do not call
   * this hook; retry attempts do. A worker can use it to acquire a shared DB
   * rate slot without coupling this provider package to its queue schema.
   */
  beforeProviderRequest?: (
    context: Readonly<OpenLibraryProviderRequestContext>
  ) => void | Promise<void>
}

export interface OpenLibraryProviderRequestContext {
  url: string
  /** One-based attempt number. */
  attempt: number
  maxAttempts: number
  signal: AbortSignal
}

export interface OpenLibrarySearchOptions extends OpenLibraryRequestOptions {
  author?: string
  limit?: number
}

const SEARCH_FIELDS = [
  'key',
  'title',
  'author_name',
  'author_key',
  'first_publish_year',
  'edition_count',
  'cover_i',
  'first_sentence',
  'availability',
  'editions',
  'editions.key',
  'editions.title',
  'editions.subtitle',
  'editions.author_name',
  'editions.author_key',
  'editions.isbn',
  'editions.publisher',
  'editions.publish_date',
  'editions.language',
  'editions.cover_i',
].join(',')

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalidResponse(path: string, expectation: string): never {
  throw new OpenLibraryApiError(
    'INVALID_RESPONSE',
    `OpenLibrary response schema error at ${path}: expected ${expectation}`
  )
}

function requireRecord(value: unknown, path: string): JsonRecord {
  if (!isRecord(value)) invalidResponse(path, 'an object')
  return value
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    invalidResponse(path, 'a non-empty string')
  }
  return value.trim()
}

function optionalString(value: unknown, path: string): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') invalidResponse(path, 'a string')
  const normalized = value.trim()
  return normalized || null
}

function optionalNumber(value: unknown, path: string): number | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    invalidResponse(path, 'a finite number')
  }
  return value
}

function optionalBoolean(value: unknown, path: string): boolean | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'boolean') invalidResponse(path, 'a boolean')
  return value
}

function optionalStringArray(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) invalidResponse(path, 'an array of strings')

  return value.map((entry, index) =>
    requireString(entry, `${path}[${index}]`)
  )
}

function optionalStringOrFirst(value: unknown, path: string): string | null {
  if (Array.isArray(value)) {
    return optionalStringArray(value, path)[0] ?? null
  }
  return optionalString(value, path)
}

function normalizeOlid(
  value: unknown,
  kind: 'work' | 'edition' | 'author',
  path: string
): string {
  const raw = requireString(value, path)
  const suffix = kind === 'work' ? 'W' : kind === 'edition' ? 'M' : 'A'
  const match = raw.match(new RegExp(`(?:^|/)(OL\\d+${suffix})$`, 'i'))
  if (!match) {
    invalidResponse(path, `an OpenLibrary ${kind} identifier`)
  }
  return match[1].toUpperCase()
}

function optionalOlid(
  value: unknown,
  kind: 'work' | 'edition' | 'author',
  path: string
): string | null {
  if (value === undefined || value === null || value === '') return null
  return normalizeOlid(value, kind, path)
}

function olidUrl(kind: 'works' | 'books' | 'authors', olid: string): string {
  return `${OPEN_LIBRARY_BASE_URL}/${kind}/${olid}`
}

function normalizeHttpUrl(value: unknown, path: string): string | null {
  const raw = optionalString(value, path)
  if (!raw) return null

  try {
    const url = new URL(raw, OPEN_LIBRARY_BASE_URL)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      invalidResponse(path, 'an HTTP(S) URL')
    }
    url.protocol = 'https:'
    return url.toString()
  } catch (error) {
    if (error instanceof OpenLibraryApiError) throw error
    invalidResponse(path, 'an HTTP(S) URL')
  }
}

function coverUrlFromId(value: unknown, path: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    invalidResponse(path, 'a positive integer cover id')
  }
  return `${OPEN_LIBRARY_COVERS_URL}/b/id/${value}-L.jpg?default=false`
}

function firstSentence(value: unknown, path: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value.trim() || null
  if (!Array.isArray(value)) invalidResponse(path, 'a string or string array')
  const sentences = optionalStringArray(value, path)
  return sentences[0] ?? null
}

function parseAuthors(
  namesValue: unknown,
  keysValue: unknown,
  path: string
): OpenLibraryAuthor[] {
  const names = optionalStringArray(namesValue, `${path}.names`)
  const rawKeys = optionalStringArray(keysValue, `${path}.keys`)

  return names.map((name, index) => {
    const rawKey = rawKeys[index]
    const olid = rawKey
      ? normalizeOlid(rawKey, 'author', `${path}.keys[${index}]`)
      : null
    return {
      olid,
      name,
      openLibraryUrl: olid ? olidUrl('authors', olid) : null,
    }
  })
}

function parseAvailability(value: unknown, path: string): OpenLibraryAvailability | null {
  if (value === undefined || value === null) return null
  const raw = requireRecord(value, path)

  return {
    status: optionalString(raw.status ?? raw.availability, `${path}.status`),
    availableToBorrow: optionalBoolean(
      raw.available_to_borrow,
      `${path}.available_to_borrow`
    ),
    availableToWaitlist: optionalBoolean(
      raw.available_to_waitlist,
      `${path}.available_to_waitlist`
    ),
    isPrintDisabled: optionalBoolean(
      raw.is_printdisabled,
      `${path}.is_printdisabled`
    ),
    identifier: optionalString(raw.identifier, `${path}.identifier`),
    previewUrl: normalizeHttpUrl(raw.preview_url, `${path}.preview_url`),
    editionOlid: optionalOlid(
      raw.openlibrary_edition,
      'edition',
      `${path}.openlibrary_edition`
    ),
    workOlid: optionalOlid(
      raw.openlibrary_work,
      'work',
      `${path}.openlibrary_work`
    ),
  }
}

function validateTimeout(timeoutMs: number): void {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 60_000) {
    throw new OpenLibraryApiError(
      'INVALID_ARGUMENT',
      'OpenLibrary timeoutMs must be an integer between 1 and 60000.'
    )
  }
}

interface OpenLibraryRequestRuntime {
  now(): number
  sleep(ms: number, signal: AbortSignal): Promise<void>
}

interface CachedJson {
  value: unknown
  expiresAt: number
}

interface InFlightJson {
  key: string
  promise: Promise<unknown>
  controller: AbortController
  subscribers: number
  settled: boolean
}

const defaultRequestRuntime: OpenLibraryRequestRuntime = {
  now: () => Date.now(),
  sleep: (ms, signal) => new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      return
    }
    const timeout = setTimeout(finish, Math.max(0, ms))
    const abort = () => finish(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    function finish(error?: unknown) {
      clearTimeout(timeout)
      signal.removeEventListener('abort', abort)
      if (error !== undefined) reject(error)
      else resolve()
    }
    signal.addEventListener('abort', abort, { once: true })
  }),
}

let requestRuntime: OpenLibraryRequestRuntime = defaultRequestRuntime
let nextProviderRequestAt = 0
let rateLimiterTail: Promise<void> = Promise.resolve()
let nextFetchIdentity = 1
let fetchIdentities = new WeakMap<typeof fetch, number>()
const responseCache = new Map<string, CachedJson>()
const inFlightRequests = new Map<string, InFlightJson>()

/** Test-only clock/sleeper injection; production callers should not use this. */
export function __setOpenLibraryRequestRuntimeForTests(
  runtime: OpenLibraryRequestRuntime
): void {
  requestRuntime = runtime
}

/** Clear module-global cache, coalescing, and rate-limit state between tests. */
export function __resetOpenLibraryRequestStateForTests(): void {
  for (const entry of inFlightRequests.values()) {
    entry.controller.abort(new DOMException('OpenLibrary test state reset', 'AbortError'))
  }
  responseCache.clear()
  inFlightRequests.clear()
  nextProviderRequestAt = 0
  rateLimiterTail = Promise.resolve()
  nextFetchIdentity = 1
  fetchIdentities = new WeakMap<typeof fetch, number>()
  requestRuntime = defaultRequestRuntime
}

function fetchIdentity(fetchImpl: typeof fetch): number {
  const known = fetchIdentities.get(fetchImpl)
  if (known !== undefined) return known
  const identity = nextFetchIdentity++
  fetchIdentities.set(fetchImpl, identity)
  return identity
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw signal.reason ?? new DOMException('Aborted', 'AbortError')
  }
}

async function acquireProviderRateSlot(signal: AbortSignal): Promise<void> {
  let release!: () => void
  const previous = rateLimiterTail
  rateLimiterTail = new Promise<void>(resolve => {
    release = resolve
  })

  await previous
  try {
    throwIfAborted(signal)
    const waitMs = Math.max(0, nextProviderRequestAt - requestRuntime.now())
    if (waitMs > 0) await requestRuntime.sleep(waitMs, signal)
    throwIfAborted(signal)
    nextProviderRequestAt = requestRuntime.now() + OPEN_LIBRARY_MIN_REQUEST_INTERVAL_MS
  } finally {
    release()
  }
}

function retryAfterMs(response: Response): number | null {
  const raw = response.headers.get('Retry-After')?.trim()
  if (!raw) return null
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    return Math.min(Math.ceil(Number(raw) * 1_000), 60_000)
  }
  const timestamp = Date.parse(raw)
  if (!Number.isFinite(timestamp)) return null
  return Math.min(Math.max(0, timestamp - requestRuntime.now()), 60_000)
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || (status >= 500 && status <= 599)
}

interface ProviderAttempt {
  response: Response
  signal: AbortSignal
  didTimeout(): boolean
  cleanup(): void
}

async function fetchProviderResponse(
  url: URL,
  fetchImpl: typeof fetch,
  userAgent: string,
  parentSignal: AbortSignal
): Promise<ProviderAttempt> {
  const controller = new AbortController()
  let didTimeout = false
  const timeout = setTimeout(() => {
    didTimeout = true
    controller.abort(new DOMException('OpenLibrary provider attempt timed out', 'TimeoutError'))
  }, OPEN_LIBRARY_DEFAULT_TIMEOUT_MS)
  const abortFromParent = () => controller.abort(parentSignal.reason)
  parentSignal.addEventListener('abort', abortFromParent, { once: true })

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': userAgent,
      },
      signal: controller.signal,
    })
    return {
      response,
      signal: controller.signal,
      didTimeout: () => didTimeout,
      cleanup: () => {
        clearTimeout(timeout)
        parentSignal.removeEventListener('abort', abortFromParent)
      },
    }
  } catch (error) {
    clearTimeout(timeout)
    parentSignal.removeEventListener('abort', abortFromParent)
    if (didTimeout) {
      throw new OpenLibraryApiError(
        'TIMEOUT',
        `OpenLibrary provider attempt timed out after ${OPEN_LIBRARY_DEFAULT_TIMEOUT_MS}ms: ${url.pathname}`,
        { cause: error }
      )
    }
    if (parentSignal.aborted) throw error
    throw new OpenLibraryApiError(
      'NETWORK',
      `OpenLibrary network request failed: ${url.pathname}`,
      { cause: error }
    )
  }
}

async function parseResponseJson(
  response: Response,
  url: URL,
  attempt: ProviderAttempt,
  parentSignal: AbortSignal
): Promise<unknown> {
  try {
    const value = await response.json()
    throwIfAborted(attempt.signal)
    return value
  } catch (error) {
    if (attempt.didTimeout()) {
      throw new OpenLibraryApiError(
        'TIMEOUT',
        `OpenLibrary response body timed out after ${OPEN_LIBRARY_DEFAULT_TIMEOUT_MS}ms: ${url.pathname}`,
        { cause: error }
      )
    }
    if (parentSignal.aborted) throw error
    throw new OpenLibraryApiError(
      'INVALID_RESPONSE',
      `OpenLibrary returned invalid JSON: ${url.pathname}`,
      { cause: error }
    )
  }
}

async function executeProviderRequest(
  url: URL,
  fetchImpl: typeof fetch,
  userAgent: string,
  signal: AbortSignal,
  beforeProviderRequest?: OpenLibraryRequestOptions['beforeProviderRequest']
): Promise<unknown> {
  for (let attempt = 0; attempt <= OPEN_LIBRARY_MAX_RETRIES; attempt += 1) {
    await acquireProviderRateSlot(signal)
    throwIfAborted(signal)
    if (beforeProviderRequest) {
      await beforeProviderRequest({
        url: url.toString(),
        attempt: attempt + 1,
        maxAttempts: OPEN_LIBRARY_MAX_RETRIES + 1,
        signal,
      })
      throwIfAborted(signal)
    }
    const providerAttempt = await fetchProviderResponse(url, fetchImpl, userAgent, signal)
    const { response } = providerAttempt
    try {
      if (response.ok) return await parseResponseJson(response, url, providerAttempt, signal)

      if (!isRetryableStatus(response.status) || attempt === OPEN_LIBRARY_MAX_RETRIES) {
        throw new OpenLibraryApiError(
          'HTTP',
          `OpenLibrary HTTP error ${response.status}: ${url.pathname}`,
          { status: response.status }
        )
      }

      await response.body?.cancel().catch(() => undefined)
      const exponentialMs = Math.min(500 * (2 ** attempt), 8_000)
      const delayMs = Math.max(exponentialMs, retryAfterMs(response) ?? 0)
      if (delayMs > 0) await requestRuntime.sleep(delayMs, signal)
    } finally {
      providerAttempt.cleanup()
    }
  }

  throw new OpenLibraryApiError('NETWORK', 'OpenLibrary retry loop ended unexpectedly.')
}

function createInFlightRequest(
  key: string,
  url: URL,
  fetchImpl: typeof fetch,
  userAgent: string,
  beforeProviderRequest?: OpenLibraryRequestOptions['beforeProviderRequest']
): InFlightJson {
  const controller = new AbortController()
  const entry = {
    key,
    controller,
    subscribers: 0,
    settled: false,
    promise: Promise.resolve(undefined) as Promise<unknown>,
  }
  entry.promise = executeProviderRequest(
    url,
    fetchImpl,
    userAgent,
    controller.signal,
    beforeProviderRequest
  )
    .then(value => {
      responseCache.set(key, {
        value,
        expiresAt: requestRuntime.now() + OPEN_LIBRARY_CACHE_TTL_MS,
      })
      return value
    })
    .finally(() => {
      entry.settled = true
      if (inFlightRequests.get(key) === entry) inFlightRequests.delete(key)
    })
  inFlightRequests.set(key, entry)
  return entry
}

function callerError(
  code: 'TIMEOUT' | 'ABORTED',
  url: URL,
  timeoutMs: number,
  cause?: unknown
): OpenLibraryApiError {
  const message = code === 'TIMEOUT'
    ? `OpenLibrary request timed out after ${timeoutMs}ms: ${url.pathname}`
    : `OpenLibrary request was aborted by the caller: ${url.pathname}`
  return new OpenLibraryApiError(code, message, { cause })
}

async function subscribeToInFlight(
  entry: InFlightJson,
  url: URL,
  options: OpenLibraryRequestOptions,
  timeoutMs: number
): Promise<unknown> {
  if (options.signal?.aborted) {
    throw callerError('ABORTED', url, timeoutMs, options.signal.reason)
  }
  entry.subscribers += 1

  try {
    return await new Promise<unknown>((resolve, reject) => {
      let finished = false
      const finish = (callback: () => void) => {
        if (finished) return
        finished = true
        clearTimeout(timeout)
        options.signal?.removeEventListener('abort', abortFromCaller)
        callback()
      }
      const timeout = setTimeout(() => {
        finish(() => reject(callerError('TIMEOUT', url, timeoutMs)))
      }, timeoutMs)
      const abortFromCaller = () => {
        finish(() => reject(callerError('ABORTED', url, timeoutMs, options.signal?.reason)))
      }
      options.signal?.addEventListener('abort', abortFromCaller, { once: true })
      entry.promise.then(
        value => finish(() => resolve(value)),
        error => finish(() => reject(error))
      )
    })
  } finally {
    entry.subscribers -= 1
    if (!entry.settled && entry.subscribers === 0) {
      if (inFlightRequests.get(entry.key) === entry) inFlightRequests.delete(entry.key)
      entry.controller.abort(new DOMException('No OpenLibrary callers remain', 'AbortError'))
    }
  }
}

async function fetchJson(url: URL, options: OpenLibraryRequestOptions): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? OPEN_LIBRARY_DEFAULT_TIMEOUT_MS
  validateTimeout(timeoutMs)
  if (options.signal?.aborted) {
    throw callerError('ABORTED', url, timeoutMs, options.signal.reason)
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  if (typeof fetchImpl !== 'function') {
    throw new OpenLibraryApiError(
      'INVALID_ARGUMENT',
      'A Fetch API implementation is required for OpenLibrary requests.'
    )
  }
  const userAgent = options.userAgent?.trim() || OPEN_LIBRARY_DEFAULT_USER_AGENT
  const key = `${fetchIdentity(fetchImpl)}\n${userAgent}\n${url.toString()}`
  const cached = responseCache.get(key)
  if (cached && cached.expiresAt > requestRuntime.now()) return cached.value
  if (cached) responseCache.delete(key)

  const entry = inFlightRequests.get(key)
    ?? createInFlightRequest(key, url, fetchImpl, userAgent, options.beforeProviderRequest)
  return subscribeToInFlight(entry, url, options, timeoutMs)
}

function compactIsbn(value: string): string {
  return value.replace(/[\s-]/g, '').toUpperCase()
}

function isValidIsbn10(value: string): boolean {
  if (!/^\d{9}[\dX]$/.test(value)) return false
  const sum = [...value].reduce((total, char, index) => {
    const digit = char === 'X' ? 10 : Number(char)
    return total + digit * (10 - index)
  }, 0)
  return sum % 11 === 0
}

function isValidIsbn13(value: string): boolean {
  if (!/^97[89]\d{10}$/.test(value)) return false
  const sum = [...value].reduce(
    (total, char, index) => total + Number(char) * (index % 2 === 0 ? 1 : 3),
    0
  )
  return sum % 10 === 0
}

/** Remove separators, uppercase ISBN-10 X, and verify the check digit. */
export function normalizeIsbn(value: string): string {
  if (typeof value !== 'string') {
    throw new OpenLibraryApiError('INVALID_ISBN', 'ISBN must be a string.')
  }

  const compact = compactIsbn(value)
  if (!isValidIsbn10(compact) && !isValidIsbn13(compact)) {
    throw new OpenLibraryApiError(
      'INVALID_ISBN',
      `Invalid ISBN or check digit: ${value}`
    )
  }
  return compact
}

export function isbn10ToIsbn13(value: string): string {
  const isbn10 = normalizeIsbn(value)
  if (isbn10.length !== 10) return isbn10

  const body = `978${isbn10.slice(0, 9)}`
  const weighted = [...body].reduce(
    (total, char, index) => total + Number(char) * (index % 2 === 0 ? 1 : 3),
    0
  )
  return `${body}${(10 - (weighted % 10)) % 10}`
}

function normalizeIsbnList(value: unknown, path: string): {
  isbn10: string[]
  isbn13: string[]
} {
  const identifiers = optionalStringArray(value, path)
  const isbn10 = new Set<string>()
  const isbn13 = new Set<string>()

  for (const identifier of identifiers) {
    const compact = compactIsbn(identifier)
    if (isValidIsbn10(compact)) isbn10.add(compact)
    if (isValidIsbn13(compact)) isbn13.add(compact)
  }

  return { isbn10: [...isbn10], isbn13: [...isbn13] }
}

function normalizeLanguageCode(value: string): string {
  const code = value.trim().replace(/^\/languages\//i, '').toLowerCase()
  if (code === 'en' || code === 'english') return 'eng'
  return code
}

function languageProvenance(
  identifiers: string[],
  source: Exclude<OpenLibraryLanguageSource, 'none'>
): { languages: string[]; languageProvenance: OpenLibraryLanguageProvenance } {
  const languages = [...new Set(
    identifiers.map(normalizeLanguageCode).filter(Boolean)
  )]
  return {
    languages,
    languageProvenance: {
      source: languages.length > 0 ? source : 'none',
      codes: languages,
      hasEnglish: languages.includes('eng'),
    },
  }
}

function parseSearchLanguages(
  value: unknown,
  path: string
): { languages: string[]; languageProvenance: OpenLibraryLanguageProvenance } {
  return languageProvenance(optionalStringArray(value, path), 'search_edition')
}

function parseSearchEdition(
  value: unknown,
  path: string,
  workOlid: string,
  fallbackAuthors: OpenLibraryAuthor[]
): OpenLibraryEdition {
  const raw = requireRecord(value, path)
  const editionOlid = normalizeOlid(raw.key, 'edition', `${path}.key`)
  const title = requireString(raw.title, `${path}.title`)
  const editionAuthors = parseAuthors(
    raw.author_name,
    raw.author_key,
    `${path}.authors`
  )
  const isbns = normalizeIsbnList(raw.isbn, `${path}.isbn`)
  const authors = editionAuthors.length > 0 ? editionAuthors : fallbackAuthors
  const authorSource: OpenLibraryEditionAuthorSource = editionAuthors.length > 0
    ? 'edition'
    : fallbackAuthors.length > 0
      ? 'work_fallback'
      : 'none'
  const editionCover = coverUrlFromId(raw.cover_i, `${path}.cover_i`)
  const language = parseSearchLanguages(raw.language, `${path}.language`)

  return {
    editionOlid,
    workOlid,
    title,
    subtitle: optionalString(raw.subtitle, `${path}.subtitle`),
    authors,
    authorSource,
    ...isbns,
    publishers: optionalStringArray(raw.publisher, `${path}.publisher`),
    publishDate: optionalStringOrFirst(raw.publish_date, `${path}.publish_date`),
    ...language,
    numberOfPages: null,
    coverImageUrl: editionCover,
    coverSource: editionCover ? 'edition' : 'none',
    description: null,
    availability: null,
    openLibraryUrl: olidUrl('books', editionOlid),
    raw,
    rawEditionRecord: raw,
  }
}

function parseSearchWork(value: unknown, path: string): OpenLibraryWorkSearchResult {
  const raw = requireRecord(value, path)
  const workOlid = normalizeOlid(raw.key, 'work', `${path}.key`)
  const title = requireString(raw.title, `${path}.title`)
  const authors = parseAuthors(raw.author_name, raw.author_key, `${path}.authors`)
  const firstPublishYear = optionalNumber(
    raw.first_publish_year,
    `${path}.first_publish_year`
  )
  if (
    firstPublishYear !== null
    && (!Number.isSafeInteger(firstPublishYear) || firstPublishYear < 0)
  ) {
    invalidResponse(`${path}.first_publish_year`, 'a non-negative integer')
  }
  const editionCount = optionalNumber(raw.edition_count, `${path}.edition_count`) ?? 0
  if (!Number.isSafeInteger(editionCount) || editionCount < 0) {
    invalidResponse(`${path}.edition_count`, 'a non-negative integer')
  }
  const coverImageUrl = coverUrlFromId(raw.cover_i, `${path}.cover_i`)
  const availability = parseAvailability(raw.availability, `${path}.availability`)

  let matchedEdition: OpenLibraryEdition | null = null
  if (raw.editions !== undefined && raw.editions !== null) {
    const editions = requireRecord(raw.editions, `${path}.editions`)
    if (!Array.isArray(editions.docs)) {
      invalidResponse(`${path}.editions.docs`, 'an array')
    }
    const parsedEditions = editions.docs.map((edition, index) =>
      parseSearchEdition(
        edition,
        `${path}.editions.docs[${index}]`,
        workOlid,
        authors
      )
    )
    matchedEdition = parsedEditions[0] ?? null
  }

  return {
    workOlid,
    title,
    authors,
    firstPublishYear,
    editionCount,
    coverImageUrl,
    coverSource: coverImageUrl ? 'work' : 'none',
    description: firstSentence(raw.first_sentence, `${path}.first_sentence`),
    availability,
    matchedEdition,
    openLibraryUrl: olidUrl('works', workOlid),
    raw,
  }
}

function parseSearchResponse(
  value: unknown,
  page: number,
  limit: number
): OpenLibrarySearchResponse {
  const raw = requireRecord(value, '$')
  const totalValue = raw.numFound ?? raw.num_found
  const total = optionalNumber(totalValue, '$.numFound')
  if (total === null || !Number.isSafeInteger(total) || total < 0) {
    invalidResponse('$.numFound', 'a non-negative integer')
  }
  const start = optionalNumber(raw.start, '$.start') ?? (page - 1) * limit
  if (!Number.isSafeInteger(start) || start < 0) {
    invalidResponse('$.start', 'a non-negative integer')
  }
  if (!Array.isArray(raw.docs)) invalidResponse('$.docs', 'an array')

  const items = raw.docs.map((doc, index) =>
    parseSearchWork(doc, `$.docs[${index}]`)
  )

  return {
    items,
    total,
    start,
    page,
    limit,
    hasMore: start + items.length < total,
  }
}

function parseNamedObjectArray(value: unknown, path: string): string[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) invalidResponse(path, 'an array')

  return value.map((entry, index) => {
    const raw = requireRecord(entry, `${path}[${index}]`)
    return requireString(raw.name, `${path}[${index}].name`)
  })
}

function parseBookAuthors(value: unknown, path: string): OpenLibraryAuthor[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) invalidResponse(path, 'an array')

  return value.map((entry, index) => {
    const raw = requireRecord(entry, `${path}[${index}]`)
    const name = requireString(raw.name, `${path}[${index}].name`)
    const url = normalizeHttpUrl(raw.url, `${path}[${index}].url`)
    const match = url?.match(/\/authors\/(OL\d+A)(?:\/|$)/i)
    const olid = match?.[1]?.toUpperCase() ?? null
    return { olid, name, openLibraryUrl: url }
  })
}

function parseBookLanguages(
  value: unknown,
  path: string
): { languages: string[]; languageProvenance: OpenLibraryLanguageProvenance } {
  if (value === undefined || value === null) {
    return {
      languages: [],
      languageProvenance: { source: 'none', codes: [], hasEnglish: false },
    }
  }
  if (!Array.isArray(value)) invalidResponse(path, 'an array')

  const identifiers = value.map((entry, index) => {
    if (typeof entry === 'string') return requireString(entry, `${path}[${index}]`)
    const raw = requireRecord(entry, `${path}[${index}]`)
    return requireString(raw.key, `${path}[${index}].key`)
  })
  return languageProvenance(identifiers, 'isbn_edition_record')
}

function parseBookDescription(raw: JsonRecord, path: string): string | null {
  const notes = optionalString(raw.notes, `${path}.notes`)
  if (notes) return notes
  if (raw.excerpts === undefined || raw.excerpts === null) return null
  if (!Array.isArray(raw.excerpts)) invalidResponse(`${path}.excerpts`, 'an array')

  for (let index = 0; index < raw.excerpts.length; index += 1) {
    const excerpt = requireRecord(raw.excerpts[index], `${path}.excerpts[${index}]`)
    const text = optionalString(excerpt.text, `${path}.excerpts[${index}].text`)
    if (text) return text
  }
  return null
}

function parseBookAvailability(raw: JsonRecord, path: string): OpenLibraryAvailability | null {
  if (raw.ebooks === undefined || raw.ebooks === null) return null
  if (!Array.isArray(raw.ebooks)) invalidResponse(`${path}.ebooks`, 'an array')
  if (raw.ebooks.length === 0) return null
  const ebook = requireRecord(raw.ebooks[0], `${path}.ebooks[0]`)
  return {
    status: optionalString(ebook.availability, `${path}.ebooks[0].availability`),
    availableToBorrow: null,
    availableToWaitlist: null,
    isPrintDisabled: null,
    identifier: null,
    previewUrl: normalizeHttpUrl(ebook.preview_url, `${path}.ebooks[0].preview_url`),
    editionOlid: null,
    workOlid: null,
  }
}

function parseBookRecord(value: unknown, path: string): OpenLibraryEdition {
  const raw = requireRecord(value, path)
  const editionOlid = normalizeOlid(raw.key, 'edition', `${path}.key`)
  const title = requireString(raw.title, `${path}.title`)
  const identifiers = requireRecord(raw.identifiers ?? {}, `${path}.identifiers`)
  const isbn10 = normalizeIsbnList(identifiers.isbn_10, `${path}.identifiers.isbn_10`).isbn10
  const isbn13 = normalizeIsbnList(identifiers.isbn_13, `${path}.identifiers.isbn_13`).isbn13
  const workOlid = optionalOlid(raw.work_key, 'work', `${path}.work_key`)
  const cover = raw.cover === undefined || raw.cover === null
    ? null
    : requireRecord(raw.cover, `${path}.cover`)
  const numberOfPages = optionalNumber(raw.number_of_pages, `${path}.number_of_pages`)
  if (
    numberOfPages !== null
    && (!Number.isSafeInteger(numberOfPages) || numberOfPages <= 0)
  ) {
    invalidResponse(`${path}.number_of_pages`, 'a positive integer')
  }
  const authors = parseBookAuthors(raw.authors, `${path}.authors`)
  const language = parseBookLanguages(raw.languages, `${path}.languages`)
  const coverImageUrl = cover
    ? normalizeHttpUrl(
        cover.large ?? cover.medium ?? cover.small,
        `${path}.cover.large`
      )
    : null

  return {
    editionOlid,
    workOlid,
    title,
    subtitle: optionalString(raw.subtitle, `${path}.subtitle`),
    authors,
    authorSource: authors.length > 0 ? 'edition' : 'none',
    isbn10,
    isbn13,
    publishers: parseNamedObjectArray(raw.publishers, `${path}.publishers`),
    publishDate: optionalString(raw.publish_date, `${path}.publish_date`),
    ...language,
    numberOfPages,
    coverImageUrl,
    coverSource: coverImageUrl ? 'edition' : 'none',
    description: parseBookDescription(raw, path),
    availability: parseBookAvailability(raw, path),
    openLibraryUrl:
      normalizeHttpUrl(raw.url, `${path}.url`) ?? olidUrl('books', editionOlid),
    raw,
    rawEditionRecord: null,
  }
}

function parseEditionWorkOlid(value: unknown, path: string): string | null {
  if (value === undefined || value === null) return null
  if (!Array.isArray(value)) invalidResponse(path, 'an array')
  if (value.length === 0) return null
  const work = requireRecord(value[0], `${path}[0]`)
  return normalizeOlid(work.key, 'work', `${path}[0].key`)
}

function parseEditionCover(value: unknown, path: string): string | null {
  if (value === undefined || value === null) return null
  if (!Array.isArray(value)) invalidResponse(path, 'an array of cover ids')
  if (value.length === 0) return null
  return coverUrlFromId(value[0], `${path}[0]`)
}

function mergeUnique(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right])]
}

function enrichBookFromEditionRecord(
  book: OpenLibraryEdition,
  value: unknown,
  path: string
): OpenLibraryEdition {
  const raw = requireRecord(value, path)
  const editionOlid = normalizeOlid(raw.key, 'edition', `${path}.key`)
  if (editionOlid !== book.editionOlid) {
    invalidResponse(`${path}.key`, `the requested edition ${book.editionOlid}`)
  }
  const workOlid = parseEditionWorkOlid(raw.works, `${path}.works`)
  const language = parseBookLanguages(raw.languages, `${path}.languages`)
  const editionCover = parseEditionCover(raw.covers, `${path}.covers`)
  const isbn10 = normalizeIsbnList(raw.isbn_10, `${path}.isbn_10`).isbn10
  const isbn13 = normalizeIsbnList(raw.isbn_13, `${path}.isbn_13`).isbn13

  return {
    ...book,
    workOlid: workOlid ?? book.workOlid,
    isbn10: mergeUnique(book.isbn10, isbn10),
    isbn13: mergeUnique(book.isbn13, isbn13),
    languages: language.languages.length > 0 ? language.languages : book.languages,
    languageProvenance: language.languages.length > 0
      ? { ...language.languageProvenance, source: 'edition_json' }
      : book.languageProvenance,
    coverImageUrl: book.coverImageUrl ?? editionCover,
    coverSource: book.coverImageUrl || editionCover ? 'edition' : 'none',
    rawEditionRecord: raw,
  }
}

function sameIsbnEdition(query: string, book: OpenLibraryEdition): boolean {
  const all = new Set([...book.isbn10, ...book.isbn13])
  if (all.has(query)) return true
  if (query.length === 10) return all.has(isbn10ToIsbn13(query))
  return [...book.isbn10].some(isbn10 => isbn10ToIsbn13(isbn10) === query)
}

/** Search English-language works and expose the API-selected concrete edition. */
export async function searchOpenLibraryBooks(
  query: string,
  page: number = 1,
  options: OpenLibrarySearchOptions = {}
): Promise<OpenLibrarySearchResponse> {
  const title = query.trim()
  if (!title) {
    throw new OpenLibraryApiError(
      'INVALID_ARGUMENT',
      'OpenLibrary title query must not be empty.'
    )
  }
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new OpenLibraryApiError(
      'INVALID_ARGUMENT',
      'OpenLibrary page must be a positive integer.'
    )
  }
  const limit = options.limit ?? OPEN_LIBRARY_DEFAULT_PAGE_SIZE
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > OPEN_LIBRARY_MAX_PAGE_SIZE) {
    throw new OpenLibraryApiError(
      'INVALID_ARGUMENT',
      `OpenLibrary limit must be between 1 and ${OPEN_LIBRARY_MAX_PAGE_SIZE}.`
    )
  }

  const params = new URLSearchParams({
    title,
    language: 'eng',
    lang: 'en',
    page: String(page),
    limit: String(limit),
    fields: SEARCH_FIELDS,
  })
  const author = options.author?.trim()
  if (author) params.set('author', author)

  const response = await fetchJson(
    new URL(`${OPEN_LIBRARY_SEARCH_URL}?${params}`),
    options
  )
  return parseSearchResponse(response, page, limit)
}

/**
 * Look up one normalized ISBN. An empty response is `not_found`; a record whose
 * returned identifiers do not contain the requested ISBN is `found_mismatch`.
 * Exact records missing language/work/cover provenance are enriched from the
 * same Open Library edition endpoint before they are returned for direct
 * ingestion.
 */
export async function getOpenLibraryBookByIsbn(
  isbn: string,
  options: OpenLibraryRequestOptions = {}
): Promise<OpenLibraryIsbnLookupResult> {
  const queryIsbn = normalizeIsbn(isbn)
  const bibKey = `ISBN:${queryIsbn}`
  const params = new URLSearchParams({
    bibkeys: bibKey,
    format: 'json',
    jscmd: 'data',
  })
  const response = await fetchJson(
    new URL(`${OPEN_LIBRARY_BOOKS_URL}?${params}`),
    options
  )
  const raw = requireRecord(response, '$')
  const entries = Object.entries(raw)
  if (entries.length === 0) {
    return { status: 'not_found', queryIsbn, exactMatch: false, book: null }
  }

  const exactEntry = entries.find(([key]) => key.toUpperCase() === bibKey)
  const [recordKey, recordValue] = exactEntry ?? entries[0]
  let book = parseBookRecord(recordValue, `$[${JSON.stringify(recordKey)}]`)
  const apiRecordMatches = sameIsbnEdition(queryIsbn, book)
  if (
    exactEntry
    && apiRecordMatches
    && (
      book.languages.length === 0
      || book.workOlid === null
      || book.coverImageUrl === null
    )
  ) {
    const editionUrl = new URL(`/books/${book.editionOlid}.json`, OPEN_LIBRARY_BASE_URL)
    const editionRecord = await fetchJson(editionUrl, options)
    book = enrichBookFromEditionRecord(book, editionRecord, '$.edition')
  }
  const exactMatch = sameIsbnEdition(queryIsbn, book)

  return exactMatch
    ? { status: 'found_exact', queryIsbn, exactMatch: true, book }
    : { status: 'found_mismatch', queryIsbn, exactMatch: false, book }
}

// Module-scoped aliases mirror the other provider adapters.
export const searchBooks = searchOpenLibraryBooks
export const getBookByIsbn = getOpenLibraryBookByIsbn
