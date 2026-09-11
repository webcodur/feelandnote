/** Resolve missing BOOK introductions, or replace verified external copies with source markers.
 * Default is read-only. Existing translations and unverified prose are retained.
 * node --env-file=.env --import tsx scripts/contents/book-description-sources.ts --limit 20
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { fetchBookIntroduction } from '@feelandnote/content-search/book-introduction'
import { getDaumMobileDetailUrl, toIsbn13 } from '@feelandnote/content-search/kakao-books'
import { getOpenLibraryBookUrl } from '@feelandnote/content-search/openlibrary'
import { isBookIntroductionSource, type BookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'
import {
  buildIntroductionApplySql, hasPreparedIntroduction, planIntroductionChange, planIntroductionMetadataCleanup,
  type IntroductionChange, type IntroductionRow, type IntroductionSelection,
} from './book-description-sources-contract'

const PAGE_SIZE = 100
const REQUEST_INTERVAL_MS = 1000
const MAX_CONSECUTIVE_FAILURES = 3
const READBACK_ATTEMPTS = 5
const READBACK_DELAY_MS = 500
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
    'source-only': { type: 'boolean' },
    'backup-dir': { type: 'string' }, help: { type: 'boolean' },
  }, strict: true })
  if (values.help) {
    console.log('book-description-sources [--limit 20] [--after content-id] [--content-id ID] [--locale ko|en] [--include-stored] [--source-only] [--apply --backup-dir PATH]\nDefault: read-only, NULL introductions only. --include-stored also checks existing external copies; prepared/unknown text is preserved. --source-only converts existing trusted URLs (Kakao/Daum for ko, OpenLibrary for en) without external requests. English --apply requires --source-only, unless one explicit --content-id is supplied.')
    return
  }
  const limit = Number(values.limit)
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer')
  if (values.locale && !['ko', 'en'].includes(values.locale)) throw new Error('--locale must be ko or en')
  if (values['source-only'] && !values.locale) throw new Error('--source-only requires --locale ko or en')
  if (values.apply && values.locale === 'en' && !values['source-only'] && values['content-id']?.length !== 1) {
    throw new Error('English bulk apply is disabled; use --source-only or one explicit --content-id')
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
  while (books < limit) {
    let query = db.from('contents').select('id,external_source,external_id,metadata')
      .eq('type', 'BOOK').order('id').limit(Math.min(PAGE_SIZE, limit - books))
    if (cursor) query = query.gt('id', cursor)
    if (values['content-id']?.length) query = query.in('id', values['content-id'])
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
        if (isBookIntroductionSource(row.description)) { count('already-selected'); continue }
        if (row.description?.trim() && !values['include-stored']) { count('stored-text'); continue }
        if (row.description?.trim() && hasPreparedIntroduction(row)) { count('prepared-text'); continue }
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
        if (!isbn) { count('missing-isbn'); continue }
        if (disabledLocales.has(row.locale)) { count(`lookup-skipped-${row.locale}`); continue }
        const key = `${row.locale}:${isbn}`
        let result = lookup.get(key)
        if (!result) {
          await delay(Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - lastRequest)))
          lastRequest = Date.now()
          try {
            result = await fetchBookIntroduction({ isbn, locale: row.locale })
            lookup.set(key, result)
            if (lookup.size > 500) lookup.delete(lookup.keys().next().value!)
            failures.delete(row.locale)
          } catch (error) {
            count('lookup-failed')
            console.error(JSON.stringify({ contentId: book.id, locale: row.locale, isbn, error: (error as Error).message }))
            const nextFailures = (failures.get(row.locale) ?? 0) + 1
            failures.set(row.locale, nextFailures)
            if (nextFailures >= MAX_CONSECUTIVE_FAILURES) {
              disabledLocales.add(row.locale)
              console.error(`Disabled ${row.locale} lookups after ${MAX_CONSECUTIVE_FAILURES} consecutive failures; other locales continue`)
            }
            continue
          }
        }
        const decision = planIntroductionChange(table, row, result)
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
        const appliedResult = spawnSync('ssh', ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'),
          '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', 'ubuntu@152.67.216.40',
          'sudo docker exec -i supabase-db psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1'],
        { input: sql, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 })
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
