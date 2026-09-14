/** Recover empty introductions from verified ISBNs / existing OpenLibrary references.
 * node --env-file=.env --import tsx scripts/contents/recover-book-introductions.ts --locale ko --all-missing
 * Add --apply to save verified source markers and URLs, with fetched bodies backed up locally.
 * --provider yes24 saves the product page introduction body and URL for empty Korean rows.
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { fetchBookIntroduction } from '@feelandnote/content-search/book-introduction'
import { buildIntroductionApplySql, planIntroductionChange,
  type IntroductionChange, type IntroductionRow, type IntroductionSelection } from './book-description-sources-contract'
import { isRecoveryBody, recoveryInputs } from './recover-book-introductions-contract'
import { sendRevalidationTags } from './revalidate-filled-lib'
import { fetchYes24Introduction, planYes24Introduction, type Yes24Introduction } from './yes24-book-introduction'

const ROW_SELECT = 'content_id,locale,title,creator,publisher,isbn,description,sources'
const REQUEST_INTERVAL_MS = 1000
const MAX_CONSECUTIVE_FAILURES = 3

async function main() {
  const { values } = parseArgs({ options: {
    locale: { type: 'string' }, 'content-id': { type: 'string', multiple: true },
    provider: { type: 'string', default: 'existing' }, 'lookup-cache': { type: 'string' },
    'all-missing': { type: 'boolean' }, apply: { type: 'boolean' }, help: { type: 'boolean' },
    limit: { type: 'string' }, after: { type: 'string' },
    'backup-dir': { type: 'string', default: 'D:/feelandnote-backups/book-descriptions' },
    'session-dir': { type: 'string' }, 'web-url': { type: 'string', default: 'https://feelandnote.com' },
  }, strict: true })
  if (values.help) {
    console.log('recover-book-introductions --locale ko|en (--content-id ID [--content-id ID] | --all-missing) [--provider existing|yes24] [--lookup-cache PATH] [--limit N] [--after ID] [--apply] [--backup-dir PATH] [--session-dir PATH]\nOnly empty descriptions are eligible. YES24 saves the original Korean product page body and source URL. English --apply is disabled until cross-locale work identity can be verified; English dry-run is inspection only. Existing filled locale/edition rows are preserved. Actual source bodies are fetched, verified and backed up. Three consecutive source failures stop the run; failure is never absence. Successful writes are read back and production detail caches are invalidated before exit.')
    return
  }
  if (values.locale !== 'ko' && values.locale !== 'en') throw new Error('--locale ko|en is required')
  if (!['existing', 'yes24'].includes(values.provider)) throw new Error('--provider existing|yes24')
  if (values.provider === 'yes24' && (values.locale !== 'ko' || !process.env.YES24_API_KEY)) throw new Error('YES24 requires Korean locale and YES24_API_KEY')
  if (Boolean(values['all-missing']) === Boolean(values['content-id']?.length)) throw new Error('Specify exactly one of --all-missing or --content-id')
  // Existing English ISBN/title/author groups include different works from their Korean counterpart.
  // This collector cannot establish cross-locale work identity; an ISBN lookup alone must not write them.
  if (values.apply && values.locale === 'en') throw new Error('English recovery writes are disabled: validate the original work and sibling locale identity before applying. Dry-run remains available for inspection.')
  const limit = values.limit === undefined ? Number.MAX_SAFE_INTEGER : Number(values.limit)
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('--limit must be a positive integer (books scanned)')
  const apiUrl = process.env.NEXT_PUBLIC_DB_API_URL
  const secret = process.env.DB_SECRET_KEY
  if (!apiUrl || !secret || new URL(apiUrl).hostname !== 'db.feelandnote.com') throw new Error('Expected project DB environment is missing')
  if (values.apply && !process.env.CRON_SECRET) throw new Error('CRON_SECRET is required to complete cache invalidation')
  if (new URL(values['web-url']).origin !== 'https://feelandnote.com') throw new Error('Expected production web URL')
  const db = createClient(apiUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const runId = `recovery-${values.locale}-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`
  const backupDir = resolve(values['backup-dir'], runId)
  const sessionDir = resolve(values['session-dir'] ?? resolve(tmpdir(), 'feelandnote-book-introductions'), runId)
  mkdirSync(backupDir, { recursive: true })
  mkdirSync(sessionDir, { recursive: true })
  const lookupDir = resolve(values['lookup-cache'] ?? resolve(tmpdir(), 'feelandnote-book-introductions', 'yes24-lookup-v2'))
  if (values.provider === 'yes24') mkdirSync(lookupDir, { recursive: true })
  const log = (event: Record<string, unknown>) => {
    const line = JSON.stringify({ at: new Date().toISOString(), ...event })
    appendFileSync(resolve(sessionDir, 'events.jsonl'), line + '\n', 'utf8')
    console.log(line)
  }
  let books = 0, proposed = 0, applied = 0, failures = 0, changedBooks = 0
  let cursor = values.after ?? ''
  const counts: Record<string, number> = {}
  const count = (reason: string) => { counts[reason] = (counts[reason] ?? 0) + 1 }
  const lookup = new Map<string, IntroductionSelection>()
  // Throttle each underlying HTTP call, including the Kakao -> Daum and edition -> work lookups.
  const originalFetch = globalThis.fetch
  let lastRequest = 0
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
    if (url.hostname !== 'db.feelandnote.com' && url.hostname !== 'feelandnote.com') {
      await delay(Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - lastRequest)))
      lastRequest = Date.now()
    }
    return originalFetch(input, init)
  }
  log({ event: 'start', mode: values.apply ? 'apply' : 'dry-run', locale: values.locale, provider: values.provider, backupDir, sessionDir, lookupDir })
  try {
    while (books < limit) {
      let query = db.from('contents').select('id,external_source,external_id,metadata')
        .eq('type', 'BOOK').order('id').limit(Math.min(100, limit - books))
      if (cursor) query = query.gt('id', cursor)
      if (values['content-id']?.length) query = query.in('id', values['content-id'])
      const { data, error } = await query
      if (error) throw error
      if (!data?.length) break
      const ids = data.map(book => book.id)
      const readRows = async (table: IntroductionChange['table']) => {
        const rows: IntroductionRow[] = []
        for (let offset = 0; ; offset += 1000) {
          const { data: page, error: rowError } = await db.from(table)
            .select(table === 'content_locales' ? ROW_SELECT : `id,${ROW_SELECT}`)
            .eq('locale', values.locale!).in('content_id', ids)
            .order('content_id').order(table === 'content_locales' ? 'locale' : 'id').range(offset, offset + 999)
          if (rowError) throw rowError
          rows.push(...page as unknown as IntroductionRow[])
          if (page.length < 1000) return rows
        }
      }
      const [locales, editions] = await Promise.all([readRows('content_locales'), readRows('figure_book_editions')])
      for (const book of data) {
        const rows = [
          ...locales.filter(row => row.content_id === book.id).map(row => ({ table: 'content_locales' as const, row })),
          ...editions.filter(row => row.content_id === book.id).map(row => ({ table: 'figure_book_editions' as const, row })),
        ]
        const changes: IntroductionChange[] = []
        for (const { row, table } of rows) {
          if (row.description?.trim()) { count('already-filled'); continue }
          if (row.sources !== null && (typeof row.sources !== 'object' || Array.isArray(row.sources))) { count('legacy-sources'); continue }
          const inputs = recoveryInputs(row, book.metadata)
          if (!inputs.length) { count('no-verified-lookup-key'); continue }
          if (values.provider === 'yes24') {
            const isbn = inputs[0].isbn!
            const path = resolve(lookupDir, `${isbn}.json`)
            let result: Yes24Introduction
            try {
              let cached: { result: Yes24Introduction } | null = null
              if (existsSync(path)) {
                try {
                  cached = JSON.parse(readFileSync(path, 'utf8'))
                  if (cached?.result?.isbn !== isbn) throw new Error('Invalid cached ISBN')
                } catch {
                  renameSync(path, `${path}.invalid-${Date.now()}-${process.pid}`)
                  cached = null
                  log({ event: 'incomplete-cache-refetch', isbn })
                }
              }
              if (cached) result = cached.result
              else {
                result = await fetchYes24Introduction(isbn, process.env.YES24_API_KEY!)
                const pending = `${path}.${process.pid}.tmp`
                writeFileSync(pending, JSON.stringify({ fetchedAt: new Date().toISOString(), result }, null, 2), { encoding: 'utf8', flag: 'wx' })
                renameSync(pending, path)
              }
              failures = 0
            } catch (error) {
              failures++
              count('lookup-failed')
              log({ event: 'lookup-failed', contentId: book.id, isbn, error: String(error), failures })
              if (failures >= MAX_CONSECUTIVE_FAILURES) throw new Error('Stopped after three consecutive YES24 failures')
              continue
            }
            const change = planYes24Introduction(table, row, result)
            if (change) changes.push(change)
            const reason = change ? 'verified-introduction' : result.description ? 'identity-review-required' : result.reason
            count(reason)
            if (!change) log({ event: reason, contentId: book.id, table, isbn, title: row.title, creator: row.creator, productTitle: result.title, productAuthor: result.author })
            continue
          }
          let unresolved = false, selected = false
          for (const input of inputs) {
            const key = JSON.stringify([book.id, input])
            let result = lookup.get(key)
            if (!result) {
              try {
                result = await fetchBookIntroduction(input)
                failures = 0
                lookup.set(key, result)
                if (lookup.size > 1000) lookup.delete(lookup.keys().next().value!)
              } catch (error) {
                failures += 1
                unresolved = true
                count('lookup-failed')
                log({ event: 'lookup-failed', contentId: book.id, table, locale: row.locale, input, error: String(error), failures })
                if (failures >= MAX_CONSECUTIVE_FAILURES) throw new Error('Stopped after three consecutive source failures; failed rows remain unmodified')
                break
              }
            }
            if (result.description && !isRecoveryBody(result.description, row.locale)) {
              unresolved = true
              count('unverified-description-body')
              log({ event: 'unverified-description-body', contentId: book.id, table, locale: row.locale,
                sourceUrl: result.sourceUrl, description: result.description })
              break
            }
            const decision = planIntroductionChange(table, row, result)
            if (decision.change) {
              changes.push(decision.change)
              selected = true
              break
            }
          }
          if (selected) count('verified-introduction')
          else if (!unresolved) {
            count('no-introduction-at-checked-sources')
            log({ event: 'no-introduction-at-checked-sources', contentId: book.id, table, locale: row.locale, inputs })
          }
        }
        proposed += changes.length
        if (changes.length) {
          const name = createHash('sha256').update(book.id).digest('hex').slice(0, 24)
          const evidence = JSON.stringify({ capturedAt: new Date().toISOString(), book, rows, changes }, null, 2)
          writeFileSync(resolve(backupDir, `${name}.json`), evidence, { encoding: 'utf8', flag: 'wx' })
          writeFileSync(resolve(backupDir, `${name}.sha256`), createHash('sha256').update(evidence).digest('hex') + '\n', { flag: 'wx' })
          if (values.apply) {
            // Old description (NULL/blank), ISBN, source and identity fields are all compared atomically.
            const sql = buildIntroductionApplySql(book.id, changes)
            const result = spawnSync('ssh', ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'),
              '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', 'ubuntu@152.67.198.197',
              'sudo docker exec -i supabase-db psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1'],
            { input: sql, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 })
            if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr)
            changedBooks += 1 // Purge even if subsequent API readback fails.
            for (const change of changes) {
              let confirmed = false
              for (let attempt = 0; attempt < 5; attempt += 1) {
                let read = db.from(change.table).select('description,sources,isbn').eq('content_id', book.id)
                read = change.table === 'content_locales' ? read.eq('locale', change.before.locale) : read.eq('id', change.before.id!)
                const { data: current, error: readError } = await read.single()
                if (!readError && current.description === change.description && current.isbn === change.before.isbn
                  && current.sources?.description === change.sources.description) { confirmed = true; break }
                await delay(500 * (attempt + 1))
              }
              if (!confirmed) throw new Error(`Readback failed: ${book.id} ${change.table}; backup: ${backupDir}`)
            }
            applied += changes.length
          }
          log({ event: values.apply ? 'applied' : 'proposed', contentId: book.id,
            changes: changes.map(change => ({ table: change.table, locale: change.before.locale,
              isbn: change.before.isbn, source: values.provider === 'yes24' ? 'YES24' : change.description, sourceUrl: change.sources.description })) })
        }
        books += 1
        cursor = book.id
        if (books % 20 === 0) log({ event: 'progress', books, proposed, applied, after: cursor, counts })
      }
    }
  } finally {
    globalThis.fetch = originalFetch
    if (changedBooks) {
      const cache = await sendRevalidationTags({ tags: ['contents:__all__'], dry: false,
        webUrl: values['web-url'], secret: process.env.CRON_SECRET })
      log({ event: 'cache-complete', ...cache })
    }
    log({ event: 'summary', books, proposed, applied, after: cursor, counts, backupDir, sessionDir })
  }
}

main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
