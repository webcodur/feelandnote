/**
 * 신규 픽션 원전 작품과 첫 ko/en 판본을 검증한 뒤 한 트랜잭션으로 등록한다.
 * 외부 서지 조회와 기존 작품 중복 검사는 트랜잭션 전에 끝내며, 기본 모드는 dry-run이다.
 * 판매 상품은 이 입력에 넣지 않고 coupang:pick 또는 source-edition-batch.ts로 별도 등록한다.
 *
 * pnpm fiction:source:book -- --file ../../data/celeb/fiction/<work>-book.json
 * pnpm fiction:source:book -- --file ../../data/celeb/fiction/<work>-book.json --apply
 */

import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { extname, resolve } from 'node:path'
import { createClient, type SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { getBookByIsbn } from '@feelandnote/content-search/kakao-books'
import {
  assertExactSourceBookReadback,
  assertDistinctManifestReceiptPaths,
  assertSourceBookReceiptIsWritable,
  buildAtomicSourceBookApplySql,
  buildFictionSourceBookPlan,
  buildResolvedSourceBookRegistration,
  classifySourceBookApplyRecovery,
  parseFictionSourceBookManifest,
  planSha256,
  type BookCatalogSnapshot,
  type ExactContentSnapshot,
  type ExternalBookEdition,
  type FictionSourceBookManifest,
  type StoredContentLocaleRow,
  type StoredContentRow,
  writeSourceBookReceiptAtomically,
} from './source-book-batch-contract'

const EXPECTED_DB_SSH_HOST = 'ubuntu@152.67.216.40'
const EXPECTED_DB_CONTAINER = 'supabase-db'
const EXPECTED_DB_API_HOSTNAME = 'db.feelandnote.com'
const PAGE_SIZE = 1000
const OPENLIBRARY_BASE_URL = 'https://openlibrary.org'

type OracleApplyReport = {
  status: 'applied'
  readback: 'all_columns_match'
  plan_sha256: string
  before: ExactContentSnapshot
  after: ExactContentSnapshot
}

type OracleExecutorFailureKind =
  | 'timeout'
  | 'stream-error'
  | 'spawn-error'
  | 'ssh-network-exit'
  | 'signal-exit'
  | 'confirmed-nonzero-exit'
  | 'invalid-success-output'

class OracleExecutorError extends Error {
  override readonly name = 'OracleExecutorError'

  constructor(
    message: string,
    readonly kind: OracleExecutorFailureKind,
    readonly executorTerminationConfirmed: boolean,
    readonly rollbackConfirmed: boolean,
    readonly commitUncertain: boolean,
    readonly exitCode: number | null = null,
  ) {
    super(message)
  }

  receiptMaterial(): Record<string, unknown> {
    return {
      kind: this.kind,
      executorTerminationConfirmed: this.executorTerminationConfirmed,
      rollbackConfirmed: this.rollbackConfirmed,
      commitUncertain: this.commitUncertain,
      exitCode: this.exitCode,
    }
  }
}

function usage(): string {
  return `Usage: pnpm fiction:source:book -- --file <manifest.json> [--receipt <receipt.json>] [--apply]

Default mode resolves Kakao/OpenLibrary metadata, reads the live BOOK catalog, writes a local
receipt, and performs zero DB writes. --apply uses the same preflight and then inserts/upserts
one source work, its locales, and its initial editions in one short Oracle PostgreSQL transaction.
Purchase products are registered separately after ISBN, shipping, and sales-signal review.`
}

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline?.slice(name.length + 3)
}

function parseArguments(): { file: string; receipt: string; apply: boolean } {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    console.log(usage())
    process.exit(0)
  }
  const allowed = /^(--apply|--help|--file(?:=.+)?|--receipt(?:=.+)?)$/u
  const values = new Set<string>()
  const invalid: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!allowed.test(argument)) {
      if (index > 0 && ['--file', '--receipt'].includes(args[index - 1])) continue
      invalid.push(argument)
      continue
    }
    if (argument === '--file' || argument === '--receipt') values.add(argument)
  }
  if (invalid.length > 0) throw new Error(`Unknown argument(s): ${invalid.join(', ')}`)
  for (const name of values) {
    const index = args.indexOf(name)
    if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${name} needs a value`)
  }

  const fileArg = argumentValue('file')
  if (!fileArg) throw new Error(`--file is required\n\n${usage()}`)
  const file = resolve(process.cwd(), fileArg)
  const receiptArg = argumentValue('receipt')
  const receipt = receiptArg
    ? resolve(process.cwd(), receiptArg)
    : `${file.slice(0, file.length - extname(file).length)}.receipt.json`
  assertDistinctManifestReceiptPaths(file, receipt)
  return { file, receipt, apply: args.includes('--apply') }
}

function readManifest(file: string): { bytes: Buffer; manifest: FictionSourceBookManifest } {
  if (!existsSync(file)) throw new Error(`Manifest does not exist: ${file}`)
  const bytes = readFileSync(file)
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString('utf8'))
  } catch (error) {
    throw new Error(`Manifest is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  return { bytes, manifest: parseFictionSourceBookManifest(parsed) }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function databaseClient(): DatabaseClient {
  return createClient(
    requiredEnv('NEXT_PUBLIC_DB_API_URL'),
    requiredEnv('DB_SECRET_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

async function selectAll<T>(loadPage: (from: number, to: number) => Promise<{
  data: T[] | null
  error: { message: string } | null
}>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await loadPage(from, from + PAGE_SIZE - 1)
    if (result.error) throw new Error(`DB catalog read failed: ${result.error.message}`)
    const page = result.data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

function recordOrNull(value: unknown, field: string): Record<string, unknown> | null {
  if (value === null) return null
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`DB ${field} is not a JSON object`)
  }
  return value as Record<string, unknown>
}

async function loadBookCatalog(db: DatabaseClient): Promise<BookCatalogSnapshot> {
  const [rawContents, rawLocales] = await Promise.all([
    selectAll<Record<string, unknown>>((from, to) => db
      .from('contents')
      .select('id,type,subtype,external_source,external_id,release_date,metadata,member_count,celeb_count,record_count,created_at')
      .eq('type', 'BOOK')
      .order('id')
      .range(from, to) as never),
    selectAll<Record<string, unknown>>((from, to) => db
      .from('content_locales')
      .select('content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,affiliate_url,sources,verified,created_at,updated_at')
      .order('content_id')
      .order('locale')
      .range(from, to) as never),
  ])

  const contents = rawContents.map((row): StoredContentRow => ({
    id: String(row.id),
    type: String(row.type),
    subtype: typeof row.subtype === 'string' ? row.subtype : null,
    external_source: typeof row.external_source === 'string' ? row.external_source : null,
    external_id: typeof row.external_id === 'string' ? row.external_id : null,
    release_date: typeof row.release_date === 'string' ? row.release_date : null,
    metadata: recordOrNull(row.metadata, `contents/${row.id}.metadata`),
    member_count: Number(row.member_count),
    celeb_count: Number(row.celeb_count),
    record_count: Number(row.record_count),
    created_at: String(row.created_at),
  }))
  const bookIds = new Set(contents.map((row) => row.id))
  const locales = rawLocales
    .filter((row) => bookIds.has(String(row.content_id)))
    .map((row): StoredContentLocaleRow => ({
      content_id: String(row.content_id),
      locale: String(row.locale),
      title: typeof row.title === 'string' ? row.title : null,
      creator: typeof row.creator === 'string' ? row.creator : null,
      description: typeof row.description === 'string' ? row.description : null,
      isbn: typeof row.isbn === 'string' ? row.isbn : null,
      publisher: typeof row.publisher === 'string' ? row.publisher : null,
      thumbnail_url: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
      affiliate_url: row.affiliate_url === undefined ? null : row.affiliate_url,
      sources: row.sources === undefined ? null : row.sources,
      verified: typeof row.verified === 'boolean' ? row.verified : null,
      created_at: typeof row.created_at === 'string' ? row.created_at : null,
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
    }))
  return { contents, locales }
}

function cleanDescription(value: unknown): string | null {
  const text = typeof value === 'string'
    ? value
    : value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>).value
      : null
  if (typeof text !== 'string') return null
  const cleaned = text.replace(/\r\n?/gu, '\n').replace(/\n{3,}/gu, '\n\n').trim()
  return cleaned || null
}

async function fetchJson<T>(url: string, field: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Feelandnote fiction source registrar' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`${field} lookup failed: HTTP ${response.status}`)
  return response.json() as Promise<T>
}

async function resolveKakaoEdition(isbn: string): Promise<ExternalBookEdition> {
  const book = await getBookByIsbn(isbn)
  if (!book) throw new Error(`Kakao returned no Korean edition for ISBN ${isbn}`)
  if (book.metadata.isbn.replace(/[^0-9]/gu, '') !== isbn) {
    throw new Error(`Kakao returned a different ISBN for ${isbn}: ${book.metadata.isbn}`)
  }
  if (!book.title.trim() || !book.creator.trim() || !book.metadata.publisher.trim()
      || !book.coverImageUrl?.trim()) {
    throw new Error(`Kakao edition ${isbn} is missing title, creator, publisher, or cover`)
  }
  return {
    source: 'kakao_book',
    isbn,
    title: book.title.trim(),
    creator: book.creator.trim(),
    thumbnailUrl: book.coverImageUrl.trim(),
    publisher: book.metadata.publisher.trim(),
    description: book.metadata.description.trim() || null,
    sourceUrl: book.metadata.link,
    descriptionSourceUrl: book.metadata.description.trim() ? book.metadata.link : null,
    releaseDate: /^\d{4}-\d{2}-\d{2}$/u.test(book.metadata.publishDate)
      ? book.metadata.publishDate
      : null,
    sourceMetadata: {
      isbn,
      publisher: book.metadata.publisher.trim(),
      publishDate: book.metadata.publishDate || null,
      link: book.metadata.link,
      salesStatus: book.metadata.salesStatus || null,
    },
  }
}

type OpenLibraryEditionResponse = {
  key?: string
  title?: string
  authors?: Array<{ key?: string }>
  publishers?: string[]
  publish_date?: string
  isbn_13?: string[]
  covers?: number[]
  works?: Array<{ key?: string }>
  description?: unknown
}

type OpenLibraryWorkResponse = {
  key?: string
  authors?: Array<{ author?: { key?: string } }>
  description?: unknown
}

async function authorNames(keys: string[]): Promise<string[]> {
  const names = await Promise.all(keys.map(async (key) => {
    const author = await fetchJson<{ name?: string }>(`${OPENLIBRARY_BASE_URL}${key}.json`, `OpenLibrary author ${key}`)
    return author.name?.trim() ?? ''
  }))
  return names.filter(Boolean)
}

async function assertOpenLibraryCover(url: string, isbn: string): Promise<void> {
  const checked = new URL(url)
  checked.searchParams.set('default', 'false')
  const response = await fetch(checked, {
    method: 'HEAD',
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('image/')) {
    throw new Error(`OpenLibrary edition ${isbn} has no verifiable cover`)
  }
}

async function resolveOpenLibraryEdition(isbn: string): Promise<ExternalBookEdition> {
  const edition = await fetchJson<OpenLibraryEditionResponse>(
    `${OPENLIBRARY_BASE_URL}/isbn/${isbn}.json`,
    `OpenLibrary ISBN ${isbn}`,
  )
  if (edition.isbn_13?.length && !edition.isbn_13.map((value) => value.replace(/[^0-9]/gu, '')).includes(isbn)) {
    throw new Error(`OpenLibrary ISBN endpoint returned a different edition for ${isbn}`)
  }
  const workKey = edition.works?.map((work) => work.key).find(Boolean)
  const work = workKey
    ? await fetchJson<OpenLibraryWorkResponse>(`${OPENLIBRARY_BASE_URL}${workKey}.json`, `OpenLibrary work ${workKey}`)
    : undefined
  const editionAuthorKeys = edition.authors?.map((author) => author.key).filter((key): key is string => Boolean(key)) ?? []
  const workAuthorKeys = work?.authors?.map((author) => author.author?.key).filter((key): key is string => Boolean(key)) ?? []
  const authors = await authorNames(editionAuthorKeys.length > 0 ? editionAuthorKeys : workAuthorKeys)
  const title = edition.title?.trim() ?? ''
  const publisher = edition.publishers?.map((value) => value.trim()).find(Boolean) ?? ''
  if (!edition.key || !title || authors.length === 0 || !publisher) {
    throw new Error(`OpenLibrary edition ${isbn} is missing edition key, title, author, or publisher`)
  }
  const coverId = edition.covers?.find((value) => Number.isInteger(value) && value > 0)
  const thumbnailUrl = coverId
    ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
    : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
  await assertOpenLibraryCover(thumbnailUrl, isbn)
  const editionDescription = cleanDescription(edition.description)
  const workDescription = cleanDescription(work?.description)
  const description = editionDescription ?? workDescription
  const sourceUrl = `${OPENLIBRARY_BASE_URL}${edition.key}`
  const descriptionSourceUrl = editionDescription
    ? sourceUrl
    : workDescription && workKey
      ? `${OPENLIBRARY_BASE_URL}${workKey}`
      : null
  return {
    source: 'openlibrary',
    isbn,
    title,
    creator: authors.join(', '),
    thumbnailUrl,
    publisher,
    description,
    sourceUrl,
    descriptionSourceUrl,
    releaseDate: /^\d{4}-\d{2}-\d{2}$/u.test(edition.publish_date ?? '')
      ? edition.publish_date!
      : null,
    sourceMetadata: {
      isbn,
      publisher,
      publishDate: edition.publish_date ?? null,
      editionKey: edition.key,
      workKey: workKey ?? null,
      link: sourceUrl,
    },
  }
}

async function resolveExternalEditions(manifest: FictionSourceBookManifest): Promise<{
  ko?: ExternalBookEdition
  en?: ExternalBookEdition
}> {
  // Every external lookup completes before the DB transaction is even built.
  const [ko, en] = await Promise.all([
    manifest.ko.translationStatus === 'published'
      ? resolveKakaoEdition(manifest.ko.isbn)
      : Promise.resolve(undefined),
    manifest.en ? resolveOpenLibraryEdition(manifest.en.isbn) : Promise.resolve(undefined),
  ])
  return { ko, en }
}

async function loadExactSnapshot(db: DatabaseClient, contentId: string): Promise<ExactContentSnapshot> {
  const [contentResult, localeResult] = await Promise.all([
    db.from('contents')
      .select('id,type,subtype,external_source,external_id,release_date,metadata,member_count,celeb_count,record_count,created_at')
      .eq('id', contentId)
      .maybeSingle(),
    db.from('content_locales')
      .select('content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,affiliate_url,sources,verified,created_at,updated_at')
      .eq('content_id', contentId)
      .order('locale'),
  ])
  if (contentResult.error) throw new Error(`Post-commit content readback failed: ${contentResult.error.message}`)
  if (localeResult.error) throw new Error(`Post-commit locale readback failed: ${localeResult.error.message}`)
  const content = contentResult.data ? {
    id: String(contentResult.data.id),
    type: String(contentResult.data.type),
    subtype: typeof contentResult.data.subtype === 'string' ? contentResult.data.subtype : null,
    external_source: typeof contentResult.data.external_source === 'string' ? contentResult.data.external_source : null,
    external_id: typeof contentResult.data.external_id === 'string' ? contentResult.data.external_id : null,
    release_date: typeof contentResult.data.release_date === 'string' ? contentResult.data.release_date : null,
    metadata: recordOrNull(contentResult.data.metadata, `contents/${contentId}.metadata`),
    member_count: Number(contentResult.data.member_count),
    celeb_count: Number(contentResult.data.celeb_count),
    record_count: Number(contentResult.data.record_count),
    created_at: String(contentResult.data.created_at),
  } satisfies StoredContentRow : null
  const locales = (localeResult.data ?? []).map((row): StoredContentLocaleRow => ({
    content_id: String(row.content_id),
    locale: String(row.locale),
    title: typeof row.title === 'string' ? row.title : null,
    creator: typeof row.creator === 'string' ? row.creator : null,
    description: typeof row.description === 'string' ? row.description : null,
    isbn: typeof row.isbn === 'string' ? row.isbn : null,
    publisher: typeof row.publisher === 'string' ? row.publisher : null,
    thumbnail_url: typeof row.thumbnail_url === 'string' ? row.thumbnail_url : null,
    affiliate_url: row.affiliate_url === undefined ? null : row.affiliate_url,
    sources: row.sources === undefined ? null : row.sources,
    verified: typeof row.verified === 'boolean' ? row.verified : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
  }))
  return { content, locales }
}

function runProcess(
  command: string,
  args: string[],
  input: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { windowsHide: true })
    let stdout = ''
    let stderr = ''
    let settled = false
    const timers: { timeout?: NodeJS.Timeout; closeWait?: NodeJS.Timeout } = {}
    let pendingUncertainError: OracleExecutorError | null = null

    const onStdout = (chunk: string) => { stdout += chunk }
    const onStderr = (chunk: string) => { if (stderr.length < 64 * 1024) stderr += chunk }
    const cleanup = () => {
      if (timers.timeout) clearTimeout(timers.timeout)
      if (timers.closeWait) clearTimeout(timers.closeWait)
      child.stdout.off('data', onStdout)
      child.stderr.off('data', onStderr)
      child.off('error', onChildError)
      child.off('close', onClose)
      child.stdin.off('error', onStdinError)
    }
    const settleResolve = (result: { stdout: string; stderr: string }) => {
      if (settled) return
      settled = true
      cleanup()
      resolvePromise(result)
    }
    const settleReject = (error: OracleExecutorError) => {
      if (settled) return
      settled = true
      cleanup()
      rejectPromise(error)
    }
    const beginUncertainFailure = (error: OracleExecutorError) => {
      if (settled || pendingUncertainError) return
      pendingUncertainError = error
      timers.closeWait = setTimeout(() => settleReject(error), 5_000)
      try { child.kill() } catch { /* remote termination remains unproven */ }
    }
    function onChildError(error: Error): void {
      beginUncertainFailure(new OracleExecutorError(
        `Oracle BOOK executor spawn error: ${error.message}`,
        'spawn-error',
        false,
        false,
        true,
      ))
    }
    function onClose(code: number | null): void {
      if (pendingUncertainError) {
        settleReject(pendingUncertainError)
      } else if (code === 0) {
        settleResolve({ stdout, stderr })
      } else if (code !== null && code !== 255) {
        settleReject(new OracleExecutorError(
          `Oracle BOOK transaction failed (${code}): ${stderr.trim().slice(0, 2000)}`,
          'confirmed-nonzero-exit',
          true,
          true,
          false,
          code,
        ))
      } else {
        settleReject(new OracleExecutorError(
          `Oracle BOOK executor termination is unconfirmed (${code ?? 'signal'}): ${stderr.trim().slice(0, 2000)}`,
          code === 255 ? 'ssh-network-exit' : 'signal-exit',
          false,
          false,
          true,
          code,
        ))
      }
    }
    function onStdinError(error: NodeJS.ErrnoException): void {
      if (error.code === 'EPIPE') return
      beginUncertainFailure(new OracleExecutorError(
        `Oracle BOOK executor stdin error: ${error.message}`,
        'stream-error',
        false,
        false,
        true,
      ))
    }

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', onStdout)
    child.stderr.on('data', onStderr)
    child.on('error', onChildError)
    child.on('close', onClose)
    child.stdin.on('error', onStdinError)
    timers.timeout = setTimeout(() => beginUncertainFailure(new OracleExecutorError(
      'Oracle BOOK transaction timed out; remote psql termination is unconfirmed',
      'timeout',
      false,
      false,
      true,
    )), timeoutMs)
    try {
      child.stdin.end(input)
    } catch (error) {
      onStdinError(error as NodeJS.ErrnoException)
    }
  })
}

function oracleOptions(): { host: string; container: string; sshKey: string } {
  const host = process.env.FEELANDNOTE_DB_SSH_HOST ?? EXPECTED_DB_SSH_HOST
  const container = process.env.FEELANDNOTE_DB_CONTAINER ?? EXPECTED_DB_CONTAINER
  const sshKey = process.env.FEELANDNOTE_DB_SSH_KEY ?? resolve(homedir(), '.ssh/feelandnote_oracle')
  if (host !== EXPECTED_DB_SSH_HOST) throw new Error(`Refusing non-production Oracle DB SSH host: ${host}`)
  if (container !== EXPECTED_DB_CONTAINER) throw new Error(`Refusing unexpected DB container: ${container}`)
  if (!existsSync(sshKey)) throw new Error(`Oracle DB SSH key is missing: ${sshKey}`)
  const hostname = new URL(requiredEnv('NEXT_PUBLIC_DB_API_URL')).hostname
  if (hostname !== EXPECTED_DB_API_HOSTNAME) throw new Error(`Refusing non-Oracle DB API hostname: ${hostname}`)
  return { host, container, sshKey }
}

async function executeOracleSql(sql: string): Promise<OracleApplyReport> {
  const options = oracleOptions()
  const result = await runProcess(
    process.platform === 'win32' ? 'ssh.exe' : 'ssh',
    [
      '-i', options.sshKey,
      '-o', 'BatchMode=yes',
      '-o', 'ConnectTimeout=15',
      options.host,
      'sudo', 'docker', 'exec', '-i', options.container,
      'psql', '-X', '-qAt', '--set', 'ON_ERROR_STOP=1',
      '--username', 'postgres', '--dbname', 'postgres',
    ],
    sql,
    2 * 60_000,
  )
  const report = result.stdout.split(/\r?\n/gu).reverse().map((line) => {
    try { return JSON.parse(line) as OracleApplyReport } catch { return null }
  }).find((value): value is OracleApplyReport => value?.status === 'applied')
  if (!report || report.readback !== 'all_columns_match') {
    throw new OracleExecutorError(
      `Oracle transaction returned no exact readback: ${result.stdout.slice(-2000)}`,
      'invalid-success-output',
      true,
      false,
      true,
      0,
    )
  }
  return report
}

function writeReceipt(file: string, receipt: Record<string, unknown>): void {
  writeSourceBookReceiptAtomically(file, receipt)
}

async function main(): Promise<void> {
  const args = parseArguments()
  assertSourceBookReceiptIsWritable(args.receipt)
  const input = readManifest(args.file)
  const manifestSha256 = createHash('sha256').update(input.bytes).digest('hex')

  const editions = await resolveExternalEditions(input.manifest)
  const resolved = buildResolvedSourceBookRegistration(input.manifest, editions)
  const db = databaseClient()
  const catalog = await loadBookCatalog(db)
  const plan = buildFictionSourceBookPlan(input.manifest, resolved, catalog)
  const sha256 = planSha256(plan)
  const plannedDatabaseWrites = plan.localeChanges.filter((change) => change.kind !== 'unchanged').length
    + (plan.contentInsert ? 1 : 0)
    + (plan.contentUpdate ? 1 : 0)
    + plan.localeChanges.length
    + 1
  const baseReceipt = {
    version: 1,
    mode: args.apply ? 'apply' : 'dry-run',
    manifestPath: args.file,
    manifestSha256,
    planSha256: sha256,
    workIdentity: input.manifest.work.identity,
    edition: input.manifest.edition,
    reviewedDistinctContentIds: input.manifest.reviewedDistinctContentIds ?? [],
    metadataSources: resolved.locales.map((locale) => ({
      locale: locale.locale,
      primary: locale.sources.primary,
      isbn: locale.isbn,
    })),
    transactionBoundary: 'external lookups before one Oracle PostgreSQL work+locale+edition transaction',
    databaseRole: args.apply ? 'service_role (SET LOCAL)' : null,
    plan,
  }

  if (plan.action === 'conflict') {
    writeReceipt(args.receipt, { ...baseReceipt, status: 'conflict', databaseWrites: 0 })
    console.log(JSON.stringify({ status: 'conflict', receipt: args.receipt, conflicts: plan.conflicts }, null, 2))
    process.exitCode = 2
    return
  }

  if (!args.apply) {
    writeReceipt(args.receipt, {
      ...baseReceipt,
      status: 'dry-run-complete',
      databaseWrites: 0,
      after: plan.before,
    })
    console.log(JSON.stringify({
      status: 'dry-run-complete',
      action: plan.action,
      contentId: plan.contentId,
      localeChanges: plan.localeChanges.map((change) => `${change.locale}:${change.kind}`),
      planSha256: sha256,
      receipt: args.receipt,
      databaseWrites: 0,
    }, null, 2))
    return
  }

  writeReceipt(args.receipt, { ...baseReceipt, status: 'applying', databaseWrites: 0 })
  let executorCompletedSuccessfully = false
  try {
    const report = await executeOracleSql(buildAtomicSourceBookApplySql(plan))
    executorCompletedSuccessfully = true
    if (report.plan_sha256 !== sha256) throw new Error('Oracle transaction returned a different plan hash')
    assertExactSourceBookReadback(plan.before, report.before)
    const postCommit = await loadExactSnapshot(db, plan.contentId)
    assertExactSourceBookReadback(report.after, postCommit)
    writeReceipt(args.receipt, {
      ...baseReceipt,
      status: 'applied',
      appliedAt: new Date().toISOString(),
      databaseWrites: plannedDatabaseWrites,
      transactionReadback: report,
      postCommitReadback: postCommit,
    })
    console.log(JSON.stringify({
      status: 'applied',
      contentId: plan.contentId,
      planSha256: sha256,
      receipt: args.receipt,
      readback: 'transaction and post-commit all columns match',
    }, null, 2))
  } catch (error) {
    const originalError = error instanceof Error ? error.message : String(error)
    const rollbackConfirmed = error instanceof OracleExecutorError && error.rollbackConfirmed
    const executorFailure = error instanceof OracleExecutorError
      ? error.receiptMaterial()
      : {
          kind: executorCompletedSuccessfully ? 'post-executor-verification' : 'pre-or-unknown-executor-error',
          executorTerminationConfirmed: executorCompletedSuccessfully,
          rollbackConfirmed: false,
          commitUncertain: !executorCompletedSuccessfully,
          exitCode: executorCompletedSuccessfully ? 0 : null,
        }
    let recoveryStatus: ReturnType<typeof classifySourceBookApplyRecovery> = 'commit-unknown'
    let recoveryReadback: ExactContentSnapshot | null = null
    let recoveryReadError: string | null = null
    try {
      recoveryReadback = await loadExactSnapshot(db, plan.contentId)
      recoveryStatus = classifySourceBookApplyRecovery(plan, recoveryReadback, {
        rollbackConfirmed,
      })
    } catch (recoveryError) {
      recoveryReadError = recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
    }

    if (recoveryStatus === 'applied-after-recovery' && recoveryReadback) {
      writeReceipt(args.receipt, {
        ...baseReceipt,
        status: recoveryStatus,
        appliedAt: new Date().toISOString(),
        databaseWrites: plannedDatabaseWrites,
        originalError,
        executorFailure,
        recoveryReadback,
      })
      console.log(JSON.stringify({
        status: recoveryStatus,
        contentId: plan.contentId,
        planSha256: sha256,
        receipt: args.receipt,
        readback: 'live material matches expectedAfterMaterial',
      }, null, 2))
      return
    }

    writeReceipt(args.receipt, {
      ...baseReceipt,
      status: recoveryStatus,
      failedAt: new Date().toISOString(),
      databaseWrites: recoveryStatus === 'rolled-back' ? 0 : null,
      originalError,
      executorFailure,
      recoveryReadback,
      recoveryReadError,
    })
    if (recoveryStatus === 'rolled-back') {
      throw new Error(`Oracle apply failed; exact recovery confirmed rollback: ${originalError}`)
    }
    throw new Error(
      `Oracle apply failed and commit state is unknown: ${originalError}`
      + (recoveryReadError ? `; recovery read failed: ${recoveryReadError}` : ''),
    )
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
