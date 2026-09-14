/** Apply explicitly reviewed translations; this script never generates or guesses a translation.
 * node --env-file=.env --import tsx scripts/contents/apply-book-introduction-translations.ts --plan FILE [--apply]
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import { createClient } from '@supabase/supabase-js'
import { buildIntroductionApplySql } from './book-description-sources-contract'
import { planIntroductionTranslation, type ReviewedIntroductionTranslation } from './book-introduction-translation-contract'
import { sendRevalidationTags } from './revalidate-filled-lib'

async function main() {
  const { values } = parseArgs({ options: { plan: { type: 'string' }, apply: { type: 'boolean' } }, strict: true })
  if (!values.plan) throw new Error('--plan is required')
  const inputs = JSON.parse(readFileSync(resolve(values.plan), 'utf8')) as ReviewedIntroductionTranslation[]
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('Expected reviewed translation array')
  if (new Set(inputs.map(i => i.target.content_id)).size !== inputs.length) throw new Error('Duplicate translation target')
  const apiUrl = process.env.NEXT_PUBLIC_DB_API_URL, secret = process.env.DB_SECRET_KEY
  if (!apiUrl || !secret || new URL(apiUrl).hostname !== 'db.feelandnote.com') throw new Error('Expected project DB environment')
  if (values.apply && !process.env.CRON_SECRET) throw new Error('CRON_SECRET is required')
  // Validate every entry before the first write.
  const planned = inputs.map(input => ({ input, change: planIntroductionTranslation(input) }))
  const db = createClient(apiUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const run = `translation-en-ko-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`
  const backupDir = resolve('D:/feelandnote-backups/book-descriptions', run)
  mkdirSync(backupDir, { recursive: true })
  const log = (value: Record<string, unknown>) => {
    const text = JSON.stringify({ at: new Date().toISOString(), ...value })
    appendFileSync(resolve(backupDir, 'events.jsonl'), text+'\n')
    console.log(text)
  }
  let applied = 0, written = 0, skipped = 0
  log({ event: 'start', planned: inputs.length, apply: Boolean(values.apply), backupDir })
  try {
    for (const { input, change } of planned) {
      if (!change) { skipped++; continue }
      const id = input.target.content_id
      const { data: current, error } = await db.from('content_locales').select('description').eq('content_id', id).eq('locale', 'ko').single()
      if (error) throw error
      if (current.description?.trim()) { skipped++; log({ event: 'already-filled', contentId: id }); continue }
      const evidence = JSON.stringify({ input, change }, null, 2)
      writeFileSync(resolve(backupDir, `${id}.json`), evidence, { encoding: 'utf8', flag: 'wx' })
      writeFileSync(resolve(backupDir, `${id}.sha256`), createHash('sha256').update(evidence).digest('hex'), { flag: 'wx' })
      if (values.apply) {
        const sql = buildIntroductionApplySql(id, [change], null, [input.source])
        const result = spawnSync('ssh', ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'), '-o', 'BatchMode=yes',
          '-o', 'ConnectTimeout=10', 'ubuntu@152.67.198.197',
          'sudo docker exec -i supabase-db psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1'],
        { input: sql, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 })
        if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr)
        written++
        let confirmed = false
        for (let attempt = 0; attempt < 5; attempt++) {
          const { data: row, error: readError } = await db.from('content_locales').select('description,isbn,sources').eq('content_id', id).eq('locale', 'ko').single()
          if (!readError && row.description === change.description && row.isbn === change.before.isbn
            && row.sources?.description === input.sourceUrl && row.sources?.description_method === 'translation'
            && row.sources?.description_source_locale === 'en') { confirmed = true; break }
          await delay(500)
        }
        if (!confirmed) throw new Error(`Translation readback failed: ${id}`)
        applied++
      }
      log({ event: values.apply ? 'applied' : 'proposed', contentId: id, title: input.target.title, sourceUrl: input.sourceUrl })
    }
  } finally {
    if (written) log({ event: 'cache-complete', ...await sendRevalidationTags({ tags: ['contents:__all__'], dry: false,
      webUrl: 'https://feelandnote.com', secret: process.env.CRON_SECRET }) })
    log({ event: 'summary', applied, skipped, backupDir })
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
