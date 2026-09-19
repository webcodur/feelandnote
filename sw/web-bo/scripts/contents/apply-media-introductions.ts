/** Review the collected plan first. Default invocation validates without modifying the database. */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { mediaIntroductionBatchSql, prepareMediaIntroduction, type ReviewedMediaIntroduction } from './media-introduction-contract'
import { sendRevalidationTags } from './revalidate-filled-lib'

async function main() {
  const { values } = parseArgs({ options: { plan: { type: 'string' }, apply: { type: 'boolean' } }, strict: true })
  if (!values.plan) throw new Error('--plan is required')
  const inputs = JSON.parse(readFileSync(resolve(values.plan), 'utf8')) as ReviewedMediaIntroduction[]
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('Expected reviewed media introduction array')
  if (new Set(inputs.map(i => `${i.content.id}:${i.target.locale}`)).size !== inputs.length) throw new Error('Duplicate target')
  const planned = inputs.map(input => ({ input, result: prepareMediaIntroduction(input) }))
  const url = process.env.NEXT_PUBLIC_DB_API_URL, secret = process.env.DB_SECRET_KEY
  if (!url || !secret || new URL(url).hostname !== 'db.feelandnote.com') throw new Error('Expected project DB environment')
  if (values.apply && !process.env.CRON_SECRET) throw new Error('CRON_SECRET is required')
  if (!values.apply) { console.log(JSON.stringify({ proposed: inputs.length, types: [...new Set(inputs.map(i => i.content.type))] })); return }
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const backupDir = resolve('D:/feelandnote-backups/book-descriptions', `media-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`)
  mkdirSync(backupDir, { recursive: true })
  const log = (event: Record<string, unknown>) => {
    const line = JSON.stringify({ at: new Date().toISOString(), ...event })
    appendFileSync(resolve(backupDir, 'events.jsonl'), `${line}\n`)
    console.log(line)
  }
  let written = 0, confirmed = 0, skipped = 0
  log({ event: 'start', planned: inputs.length, backupDir })
  try {
    // Amortize SSH connection setup while retaining all-or-nothing CAS within each small batch.
    const batchSize = 50
    for (let offset = 0; offset < planned.length; offset += batchSize) {
      const batch = planned.slice(offset, offset + batchSize)
      const ids = [...new Set(batch.map(p => p.input.content.id))]
      const { data: current, error } = await db.from('content_locales').select('content_id,locale,description').in('content_id', ids)
      if (error) throw error
      const pending = batch.filter(({ input }) => {
        const row = current.find(r => r.content_id === input.content.id && r.locale === input.target.locale)
        if (!row) throw new Error(`Missing target: ${input.content.id}:${input.target.locale}`)
        if (row.description?.trim()) { skipped++; return false }
        return true
      })
      if (!pending.length) continue
      for (const { input } of pending) {
        const evidence = JSON.stringify(input, null, 2)
        const file = `${input.content.id}-${input.target.locale}`
        writeFileSync(resolve(backupDir, `${file}.json`), evidence, { encoding: 'utf8', flag: 'wx' })
        writeFileSync(resolve(backupDir, `${file}.sha256`), createHash('sha256').update(evidence).digest('hex'), { flag: 'wx' })
      }
      const sql = mediaIntroductionBatchSql(pending.map(p => p.input))
      const applied = spawnSync('ssh', ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'), '-o', 'BatchMode=yes',
        '-o', 'ConnectTimeout=10', 'ubuntu@152.67.198.197',
        'sudo docker exec -i supabase-db psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1'],
      { input: sql, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 })
      if (applied.error || applied.status !== 0) throw new Error(applied.error?.message ?? applied.stderr)
      written += pending.length
      const { data: rows, error: readError } = await db.from('content_locales').select('content_id,locale,description,sources,isbn,title,creator,publisher')
        .in('content_id', ids)
      if (readError) throw readError
      for (const { input, result } of pending) {
        const readback = rows.find(r => r.content_id === input.content.id && r.locale === input.target.locale)
        if (!readback || readback.description !== result.description || (readback.sources?.description ?? null) !== input.sourceUrl
        || readback.sources?.description_method !== input.method || readback.sources?.description_source_locale !== input.sourceLocale
        || (['isbn', 'title', 'creator', 'publisher'] as const).some(key => readback[key] !== input.target[key])) {
          throw new Error(`Media readback failed: ${input.content.id}:${input.target.locale}`)
        }
        confirmed++
        log({ event: 'applied', contentId: input.content.id, locale: input.target.locale, title: input.target.title })
      }
    }
  } finally {
    if (written) log({ event: 'cache-complete', ...await sendRevalidationTags({ tags: ['contents:__all__'], dry: false,
      webUrl: 'https://feelandnote.com', secret: process.env.CRON_SECRET }) })
    log({ event: 'summary', written, confirmed, skipped, backupDir })
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
