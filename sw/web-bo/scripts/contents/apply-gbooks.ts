/** Apply verified Google Books descriptions to empty BOOK locale rows.
 * Unlike OL/Kakao marker rows, the GB body is stored directly — there is no
 * runtime fetch path for Google Books, and the text is static publisher copy.
 * Re-reads each row before planning so a concurrently filled row is skipped.
 * node --env-file=.env --import tsx scripts/contents/apply-gbooks.ts [--apply] [--limit N]
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { forLocale } from '@feelandnote/content-search/book-introduction'
import { isBookIntroductionSource } from '@feelandnote/content-search/book-introduction-contract'
import { buildIntroductionApplySql, hasPreparedIntroduction, type IntroductionChange, type IntroductionRow } from './book-description-sources-contract'
import { sendRevalidationTags } from './revalidate-filled-lib'

const PREPARED = resolve('../../data/celeb/book-introductions/gbooks/prepared-gbooks.json')

async function main() {
  const { values } = parseArgs({ options: { apply: { type: 'boolean' }, limit: { type: 'string' }, file: { type: 'string' } }, strict: true })
  const prepared = (JSON.parse(readFileSync(resolve(values.file ?? PREPARED), 'utf8')) as any[]).filter(r => r.ready)
  const limit = Number(values.limit ?? prepared.length)
  const apiUrl = process.env.NEXT_PUBLIC_DB_API_URL, secret = process.env.DB_SECRET_KEY
  if (!apiUrl || !secret || new URL(apiUrl).hostname !== 'db.feelandnote.com') throw new Error('Expected project DB environment')
  if (values.apply && !process.env.CRON_SECRET) throw new Error('CRON_SECRET is required')
  const db = createClient(apiUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const run = `gbooks-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`
  const backupDir = resolve('D:/feelandnote-backups/book-descriptions', run)
  mkdirSync(backupDir, { recursive: true })
  const log = (value: Record<string, unknown>) => {
    const text = JSON.stringify({ at: new Date().toISOString(), ...value })
    appendFileSync(resolve(backupDir, 'events.jsonl'), text + '\n')
    console.log(text)
  }
  let applied = 0, written = 0, skipped = 0
  log({ event: 'start', candidates: prepared.length, apply: Boolean(values.apply), backupDir })
  try {
    for (const r of prepared.slice(0, limit)) {
      const { data: row, error } = await db.from('content_locales')
        .select('content_id,locale,title,creator,publisher,isbn,description,sources')
        .eq('content_id', r.contentId).eq('locale', r.locale).single()
      if (error) throw error
      if (row.description?.trim() || isBookIntroductionSource(row.description)) {
        skipped++; log({ event: 'already-filled', contentId: r.contentId, locale: r.locale }); continue
      }
      if (row.sources !== null && (typeof row.sources !== 'object' || Array.isArray(row.sources))) {
        skipped++; log({ event: 'legacy-sources', contentId: r.contentId, locale: r.locale }); continue
      }
      if (hasPreparedIntroduction(row as IntroductionRow)) {
        skipped++; log({ event: 'prepared-source', contentId: r.contentId, locale: r.locale }); continue
      }
      const text = forLocale(r.description, r.locale)
      if (!text) { skipped++; log({ event: 'locale-failed', contentId: r.contentId, locale: r.locale }); continue }
      const sources = { ...(row.sources ?? {}), description: r.sourceUrl,
        description_method: 'provider', description_source_locale: r.locale, google_books_id: r.volumeId }
      delete sources.introMissing
      const change: IntroductionChange = { table: 'content_locales', before: row as IntroductionRow,
        description: text, sources, verifiedDescription: text }
      const evidence = JSON.stringify({ prepared: r, change }, null, 2)
      writeFileSync(resolve(backupDir, `${r.contentId}-${r.locale}.json`), evidence, { encoding: 'utf8', flag: 'wx' })
      writeFileSync(resolve(backupDir, `${r.contentId}-${r.locale}.sha256`), createHash('sha256').update(evidence).digest('hex'), { flag: 'wx' })
      if (values.apply) {
        const sql = buildIntroductionApplySql(r.contentId, [change])
        const result = spawnSync('ssh', ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'), '-o', 'BatchMode=yes',
          '-o', 'ConnectTimeout=10', 'ubuntu@152.67.198.197',
          'sudo docker exec -i supabase-db psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1'],
        { input: sql, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 })
        if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr)
        written++
        let confirmed = false
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: current, error: readError } = await db.from('content_locales').select('description,sources')
            .eq('content_id', r.contentId).eq('locale', r.locale).single()
          if (!readError && current.description === text && current.sources?.description === r.sourceUrl
            && current.sources?.google_books_id === r.volumeId) { confirmed = true; break }
          await delay(500)
        }
        if (!confirmed) throw new Error(`GB readback failed: ${r.contentId}:${r.locale}`)
        applied++
      }
      log({ event: values.apply ? 'applied' : 'proposed', contentId: r.contentId, locale: r.locale, title: r.title, sourceUrl: r.sourceUrl })
    }
  } finally {
    if (written) log({ event: 'cache-complete', ...await sendRevalidationTags({ tags: ['contents:__all__'], dry: false,
      webUrl: 'https://feelandnote.com', secret: process.env.CRON_SECRET }) })
    log({ event: 'summary', applied, skipped, backupDir })
  }
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1 })
