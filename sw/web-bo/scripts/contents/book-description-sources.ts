/** Resolve missing BOOK introductions, or replace verified external copies with source markers.
 * Default is read-only. Existing translations and unverified prose are retained.
 * node --env-file=.env --import tsx scripts/contents/book-description-sources.ts --limit 20
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { createClient } from '@feelandnote/db'
import { fetchBookIntroduction } from '@feelandnote/content-search/book-introduction'
import { getDaumMobileDetailUrl, toIsbn13 } from '@feelandnote/content-search/kakao-books'
import { getOpenLibraryBookUrl } from '@feelandnote/content-search/openlibrary'
import { isBookIntroductionSource, type BookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'
import {
  buildIntroductionApplySql, hasPreparedIntroduction, planIntroductionChange, planIntroductionMetadataCleanup,
  planMarkerVerification,
  type IntroductionChange, type IntroductionRow, type IntroductionSelection,
} from './book-description-sources-contract'

const PAGE_SIZE = 100
const REQUEST_INTERVAL_MS = 1000
const MAX_CONSECUTIVE_FAILURES = 3
const READBACK_ATTEMPTS = 10
const READBACK_DELAY_MS = 500
const SSH_CONNECT_RETRIES = 5
const SSH_CONNECT_RETRY_MS = 60_000
const ROW_SELECT = 'content_id,locale,title,creator,publisher,isbn,description,sources'
interface Book {
  id: string
  external_source: string | null
  external_id: string | null
  metadata: Record<string, unknown> | null
  content_locales: IntroductionRow[]
  figure_book_editions: IntroductionRow[]
}

async function main() {
  const { values } = parseArgs({ options: {
    limit: { type: 'string', default: '20' }, after: { type: 'string' },
    'content-id': { type: 'string', multiple: true }, locale: { type: 'string' },
    'include-stored': { type: 'boolean' }, apply: { type: 'boolean' },
    'source-only': { type: 'boolean' }, reselect: { type: 'boolean' },
    'verify-markers': { type: 'boolean' }, 'content-ids-file': { type: 'string' }, 'kakao-to-daum': { type: 'boolean' },
    'backup-dir': { type: 'string' }, help: { type: 'boolean' },
  }, strict: true })
  if (values.help) {
    console.log('book-description-sources [--limit 20] [--after content-id] [--content-id ID] [--locale ko|en] [--include-stored] [--source-only] [--verify-markers] [--content-ids-file PATH] [--kakao-to-daum] [--apply --backup-dir PATH]\nDefault: read-only, NULL introductions only. --include-stored also checks existing external copies; prepared/unknown text is preserved. --source-only converts existing trusted URLs (Kakao/Daum for ko, OpenLibrary for en) without external requests. English --apply requires --source-only or --verify-markers, unless one explicit --content-id is supplied. --reselect re-fetches rows that already carry a marker (explicit --content-id only, e.g. after an ISBN change) and keeps the old marker when no introduction is found. --verify-markers re-resolves every marker row: the stored pointer is verified first, then a fresh provider lookup; a marker that resolves to nothing becomes NULL (investigation needed) while its source URL is kept. --content-ids-file limits the run to the IDs in a file (one per line), resumable with --after. --kakao-to-daum moves KAKAO markers to DAUM only when Daum returns a longer text of the same ISBN, because Kakao cuts its text at about 250 characters; Korean only. A locale whose lookups keep failing stops the run instead of scanning on.')
    return
  }
  const limit = Number(values.limit)
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer')
  if (values.locale && !['ko', 'en'].includes(values.locale)) throw new Error('--locale must be ko or en')
  if (values['source-only'] && !values.locale) throw new Error('--source-only requires --locale ko or en')
  if (values.reselect && !values['content-id']?.length) throw new Error('--reselect requires --content-id')
  if (values['kakao-to-daum'] && values.locale !== 'ko') throw new Error('--kakao-to-daum requires --locale ko')
  if (values['kakao-to-daum'] && (values.reselect || values['source-only'] || values['verify-markers'] || values['include-stored'])) throw new Error('--kakao-to-daum runs alone')
  if (values['content-ids-file'] && values['content-id']?.length) throw new Error('Specify --content-id or --content-ids-file, not both')
  const targetIds = values['content-ids-file']
    ? [...new Set(readFileSync(values['content-ids-file'], 'utf8').split(/\r?\n/).map((id) => id.trim()).filter(Boolean))].sort()
    : null
  if (values.reselect && values['source-only']) throw new Error('--reselect cannot be combined with --source-only')
  if (values['verify-markers'] && (values.reselect || values['source-only'])) throw new Error('--verify-markers cannot be combined with --reselect or --source-only')
  if (values.apply && values.locale === 'en' && !values['source-only'] && !values['verify-markers'] && values['content-id']?.length !== 1) {
    throw new Error('English bulk apply is disabled; use --source-only, --verify-markers, or one explicit --content-id')
  }
  if (values.apply && !values['backup-dir']) throw new Error('--apply requires --backup-dir for the original values')
  const apiUrl = process.env.NEXT_PUBLIC_DB_API_URL
  const secret = process.env.DB_SECRET_KEY
  if (!apiUrl || !secret || new URL(apiUrl).hostname !== 'db.feelandnote.com') throw new Error('Expected project DB environment is missing')
  const db = createClient(apiUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const lookup = new Map<string, IntroductionSelection>()
  let lastRequest = 0
  const failures = new Map<string, number>()
  const disabledLocales = new Set<string>()
  let books = 0
  let proposed = 0
  let applied = 0
  let cursor = values.after ?? ''
  const counts: Record<string, number> = {}
  const count = (reason: string) => { counts[reason] = (counts[reason] ?? 0) + 1 }
  const backupDir = values.apply ? resolve(values['backup-dir']!, new Date().toISOString().replace(/[:.]/g, '-')) : null
  if (backupDir) mkdirSync(backupDir, { recursive: true })
  const throttle = async () => { await delay(Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - lastRequest))); lastRequest = Date.now() }
  // 카카오 ISBN 칸의 10자리 값은 979 ISBN의 앞자리가 빠진 값일 수 있어 978로 환산하면 다른 번호를 조회한다.
  // 이런 행은 등록 때 저장한 다음 책 주소로 같은 책을 직접 조회한다.
  const tenDigitIsbnDaumUrl = (row: IntroductionRow): string | undefined => {
    if (row.locale !== 'ko' || row.isbn?.trim().length !== 10) return undefined
    for (const key of ['isbn', 'title', 'description']) {
      const url = row.sources?.[key]
      const detailUrl = typeof url === 'string' ? getDaumMobileDetailUrl(url) : null
      if (detailUrl) return detailUrl
    }
    return undefined
  }
  const freshLookup = async (isbn: string, locale: 'ko' | 'en', contentId: string, daumUrl?: string): Promise<IntroductionSelection | undefined> => {
    if (disabledLocales.has(locale)) { count(`lookup-skipped-${locale}`); return undefined }
    const key = `${locale}:${daumUrl ?? isbn}`
    const cached = lookup.get(key)
    if (cached) return cached
    await throttle()
    try {
      const result = await fetchBookIntroduction(daumUrl ? { locale, source: 'DAUM', sourceUrl: daumUrl } : { isbn, locale })
      lookup.set(key, result)
      if (lookup.size > 500) lookup.delete(lookup.keys().next().value!)
      failures.delete(locale)
      return result
    } catch (error) {
      count('lookup-failed')
      console.error(JSON.stringify({ contentId, locale, isbn, error: (error as Error).message }))
      const nextFailures = (failures.get(locale) ?? 0) + 1
      failures.set(locale, nextFailures)
      if (nextFailures >= MAX_CONSECUTIVE_FAILURES) {
        disabledLocales.add(locale)
        console.error(`Disabled ${locale} lookups after ${MAX_CONSECUTIVE_FAILURES} consecutive failures; other locales continue`)
      }
      return undefined
    }
  }
  while (books < limit && !disabledLocales.size) {
    let query = db.from('contents').select('id,external_source,external_id,metadata')
      .eq('type', 'BOOK').order('id').limit(Math.min(PAGE_SIZE, limit - books))
    if (cursor) query = query.gt('id', cursor)
    if (values['content-id']?.length) query = query.in('id', values['content-id'])
    if (targetIds) {
      // The full list does not fit in one request URL.
      const page = targetIds.filter((id) => id > cursor).slice(0, Math.min(PAGE_SIZE, limit - books))
      if (!page.length) break
      query = query.in('id', page)
    }
    const { data, error } = await query
    if (error) throw error
    if (!data?.length) break
    const ids = data.map((book) => book.id)
    const readRows = async (table: 'content_locales' | 'figure_book_editions') => {
      const rows: IntroductionRow[] = []
      for (let offset = 0; ; offset += 1000) {
        const { data: page, error: rowError } = await db.from(table)
          .select(table === 'content_locales' ? ROW_SELECT : `id,${ROW_SELECT}`)
          .in('content_id', ids).order('content_id').order(table === 'content_locales' ? 'locale' : 'id')
          .range(offset, offset + 999)
        if (rowError) throw rowError
        rows.push(...(page as unknown as IntroductionRow[]))
        if (page.length < 1000) return rows
      }
    }
    const [locales, editions] = await Promise.all([readRows('content_locales'), readRows('figure_book_editions')])
    for (const raw of data) {
      if (disabledLocales.size) break
      const book: Book = { ...raw, content_locales: locales.filter((row) => row.content_id === raw.id),
        figure_book_editions: editions.filter((row) => row.content_id === raw.id) }
      books += 1
      const changes: IntroductionChange[] = []
      const rows = [
        ...book.content_locales.map((row) => ({ table: 'content_locales' as const, row })),
        ...book.figure_book_editions.map((row) => ({ table: 'figure_book_editions' as const, row })),
      ]
      for (const { table, row } of rows) {
        if (!['ko', 'en'].includes(row.locale) || (values.locale && row.locale !== values.locale)) continue
        // 선정 제외 판정이 붙은 행은 화면에 나가지 않고, 판본 행은 DB 가드가 출처 변경을 거부한다.
        if (Array.isArray(row.sources?.edition_selection_evidence) && row.sources.edition_selection_evidence.length) { count('excluded-edition'); continue }
        const marker = isBookIntroductionSource(row.description) ? row.description as BookIntroductionSource : null
        if (values['kakao-to-daum']) {
          if (marker !== 'KAKAO') { count('not-kakao-marker'); continue }
          const isbn = row.isbn?.trim() || (book.external_source === 'kakao_book' ? book.external_id : null)
          if (!isbn) { count('missing-isbn'); continue }
          const result = await freshLookup(isbn, 'ko', book.id, tenDigitIsbnDaumUrl(row))
          if (result === undefined) continue
          if (result.source !== 'DAUM') { count('kakao-kept'); continue }
          const decision = planIntroductionChange(table, row, result, { reselect: true })
          count(decision.reason)
          if (decision.change) changes.push(decision.change)
          continue
        }
        if (marker && !values.reselect && !values['verify-markers']) { count('already-selected'); continue }
        if (!marker && row.description?.trim() && !values['include-stored']) { count('stored-text'); continue }
        if (!marker && row.description?.trim() && hasPreparedIntroduction(row)) { count('prepared-text'); continue }
        if (table === 'figure_book_editions' && !row.description?.trim() && book.content_locales.some((locale) =>
          locale.locale === row.locale && locale.isbn === row.isbn && locale.description?.trim()
          && !isBookIntroductionSource(locale.description) && hasPreparedIntroduction(locale))) {
          count('uses-prepared-locale'); continue
        }
        if (values['source-only']) {
          if (row.sources !== null && (typeof row.sources !== 'object' || Array.isArray(row.sources))) {
            count('legacy-sources'); continue
          }
          const rawSource = row.sources?.description
          let source: BookIntroductionSource | null = null
          let sourceUrl: string | null = null
          if (typeof rawSource === 'string' && row.locale === 'en') {
            sourceUrl = getOpenLibraryBookUrl(rawSource)
            source = sourceUrl ? 'OPEN' : null
          } else if (typeof rawSource === 'string' && row.locale === 'ko') {
            const daumUrl = getDaumMobileDetailUrl(rawSource)
            if (daumUrl) {
              source = 'DAUM'
              sourceUrl = daumUrl
            } else {
              try {
                const kakaoUrl = new URL(rawSource)
                const sourceIsbn = kakaoUrl.origin === 'https://dapi.kakao.com'
                  && kakaoUrl.pathname === '/v3/search/book'
                  && kakaoUrl.searchParams.get('target') === 'isbn'
                  ? toIsbn13(kakaoUrl.searchParams.get('query') ?? '') : null
                const rowIsbn = row.isbn ? toIsbn13(row.isbn) : null
                if (sourceIsbn && (!rowIsbn || sourceIsbn === rowIsbn)) {
                  source = 'KAKAO'
                  sourceUrl = `https://dapi.kakao.com/v3/search/book?target=isbn&query=${sourceIsbn}`
                }
              } catch { /* malformed legacy URL */ }
            }
          }
          if (!source || !sourceUrl) { count('no-trusted-source'); continue }
          const currentDescription = row.description?.trim() ?? ''
          changes.push({
            table,
            before: row,
            description: source,
            sources: { ...row.sources, description: sourceUrl },
            verifiedDescription: currentDescription,
          })
          count(currentDescription ? 'external-copy' : 'missing-introduction')
          continue
        }
        // Never substitute the representative Korean ISBN for an English locale.
        const isbn = row.isbn?.trim() || (row.locale === 'ko' && book.external_source === 'kakao_book' ? book.external_id : null)
        if (marker && values['verify-markers']) {
          const storedUrl = typeof row.sources?.description === 'string' ? row.sources.description : null
          let resolved = false
          if (storedUrl) {
            try {
              await throttle()
              const stored = await fetchBookIntroduction({ isbn, locale: row.locale, source: marker, sourceUrl: storedUrl })
              if (stored.description?.trim()) {
                resolved = true
                const decision = planMarkerVerification(table, row,
                  { source: marker, sourceUrl: stored.sourceUrl ?? storedUrl, description: stored.description })
                count(decision.reason)
                if (decision.change) changes.push(decision.change)
              }
            } catch (error) {
              count('stored-pointer-invalid')
              console.error(JSON.stringify({ contentId: book.id, locale: row.locale, sourceUrl: storedUrl, error: (error as Error).message }))
            }
          }
          if (!resolved) {
            const result = isbn
              ? await freshLookup(isbn, row.locale, book.id)
              : { source: null, sourceUrl: null, description: null }
            if (result === undefined) continue
            const decision = planMarkerVerification(table, row, result)
            count(decision.reason)
            if (decision.change) changes.push(decision.change)
          }
          continue
        }
        if (!isbn) { count('missing-isbn'); continue }
        const result = await freshLookup(isbn, row.locale, book.id, tenDigitIsbnDaumUrl(row))
        if (result === undefined) continue
        const decision = planIntroductionChange(table, row, result, { reselect: values.reselect })
        count(decision.reason)
        if (decision.change) changes.push(decision.change)
      }
      proposed += changes.length
      const metadataChange = values['include-stored']
        ? planIntroductionMetadataCleanup(book.metadata, rows.map(({ row }) => row), changes.map(({ verifiedDescription }) => verifiedDescription))
        : null
      if (metadataChange) count('duplicate-metadata')
      if ((changes.length || metadataChange) && backupDir) {
        const name = createHash('sha256').update(book.id).digest('hex').slice(0, 24)
        const backup = JSON.stringify({ capturedAt: new Date().toISOString(), book, changes, metadataChange }, null, 2)
        writeFileSync(resolve(backupDir, `${name}.json`), backup, { encoding: 'utf8', flag: 'wx' })
        writeFileSync(resolve(backupDir, `${name}.sha256`), createHash('sha256').update(backup).digest('hex') + '\n', { flag: 'wx' })
        const sql = buildIntroductionApplySql(book.id, changes, metadataChange)
        const runApply = () => spawnSync('ssh', ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'),
          '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', 'ubuntu@152.67.198.197',
          'sudo docker exec -i feelandnote-db psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1'],
        { input: sql, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 })
        let appliedResult = runApply()
        // 연결이 맺어지기 전의 실패만 재시도한다. 트랜잭션이 시작되지 않았으므로 중복 반영이 없다.
        for (let attempt = 0; attempt < SSH_CONNECT_RETRIES && /^ssh: connect to host/m.test(appliedResult.stderr ?? ''); attempt += 1) {
          count('ssh-connect-retry')
          await delay(SSH_CONNECT_RETRY_MS)
          appliedResult = runApply()
        }
        if (appliedResult.error || appliedResult.status !== 0) throw new Error(appliedResult.error?.message ?? appliedResult.stderr)
        // Confirm persisted descriptions and source URLs before advancing the cursor.
        // The API may briefly serve a stale replica immediately after the SSH transaction;
        // retrying preserves the concurrency guard without treating that lag as a failed write.
        for (const change of changes) {
          let confirmed = false
          for (let attempt = 0; attempt < READBACK_ATTEMPTS; attempt += 1) {
            let read = db.from(change.table).select('description,sources').eq('content_id', book.id)
            read = change.table === 'content_locales' ? read.eq('locale', change.before.locale) : read.eq('id', change.before.id!)
            const { data: current, error: readError } = await read.single()
            if (!readError && current.description === change.description && current.sources?.description === change.sources.description) {
              confirmed = true
              break
            }
            if (attempt + 1 < READBACK_ATTEMPTS) await delay(READBACK_DELAY_MS * (attempt + 1))
          }
          if (!confirmed) throw new Error(`Readback failed for ${book.id}; backup: ${backupDir}`)
        }
        if (metadataChange) {
          let confirmed = false
          for (let attempt = 0; attempt < READBACK_ATTEMPTS; attempt += 1) {
            const { data: current, error: readError } = await db.from('contents').select('metadata').eq('id', book.id).single()
            if (!readError && !metadataChange.removed.some((key) => key in (current.metadata ?? {}))) {
              confirmed = true
              break
            }
            if (attempt + 1 < READBACK_ATTEMPTS) await delay(READBACK_DELAY_MS * (attempt + 1))
          }
          if (!confirmed) throw new Error(`Metadata readback failed for ${book.id}; backup: ${backupDir}`)
        }
        applied += changes.length
      }
      cursor = book.id
      if (changes.length || metadataChange) console.log(JSON.stringify({ contentId: book.id, mode: values.apply ? 'applied' : 'dry-run',
        changes: changes.map(({ table, before, description }) => ({ table, locale: before.locale, isbn: before.isbn, source: description })),
        ...(metadataChange ? { removedMetadata: metadataChange.removed } : {}) }))
      if (books % 20 === 0) console.log(JSON.stringify({ books, proposed, applied, after: cursor, counts }))
    }
  }
  console.log(JSON.stringify({ mode: values.apply ? 'applied' : 'dry-run', books, proposed, applied, after: cursor, counts,
    ...(disabledLocales.size ? { disabledLocales: [...disabledLocales] } : {}), ...(backupDir ? { backupDir } : {}) }))
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
