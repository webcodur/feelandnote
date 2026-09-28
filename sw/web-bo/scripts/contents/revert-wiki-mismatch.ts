/** Revert book-wiki descriptions that matched the wrong Wikipedia page.
 * CAS: row description must still equal the recorded wiki extract; then
 * description → NULL, sources lose description provenance, introMissing restored.
 * node --env-file=../web/.env --import tsx scripts/contents/revert-wiki-mismatch.ts --plan FILE [--apply]
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { sendRevalidationTags } from './revalidate-filled-lib'

const literal = (value: string) => `'${value.replace(/'/g, "''")}'`

function revertSql(input: any): string {
  const body = `DECLARE changed integer;
BEGIN
UPDATE public.content_locales
SET description = NULL,
    sources = (coalesce(sources,'{}'::jsonb) - 'description' - 'description_method' - 'description_source_locale' - 'google_books_id') || '{"introMissing":true}'::jsonb,
    updated_at = now()
WHERE content_id = ${literal(input.contentId)} AND locale = ${literal(input.locale)}
  AND description = ${literal(input.badText)};
GET DIAGNOSTICS changed = ROW_COUNT;
IF changed <> 1 THEN RAISE EXCEPTION 'Row changed concurrently: ${input.contentId}'; END IF;
END;`
  let delimiter = '$rev$'
  while (body.includes(delimiter)) delimiter = delimiter.replace(/\$$/, '_x$')
  return `DO ${delimiter}\n${body}\n${delimiter};`
}

async function main() {
  const { values } = parseArgs({ options: { plan: { type: 'string' }, apply: { type: 'boolean' } }, strict: true })
  if (!values.plan) throw new Error('--plan is required')
  const inputs = JSON.parse(readFileSync(resolve(values.plan), 'utf8')) as any[]
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('Expected revert plan array')
  const url = process.env.NEXT_PUBLIC_DB_API_URL, secret = process.env.DB_SECRET_KEY
  if (!url || !secret || new URL(url).hostname !== 'db.feelandnote.com') throw new Error('Expected project DB environment')
  if (values.apply && !process.env.CRON_SECRET) throw new Error('CRON_SECRET is required')
  if (!values.apply) { console.log(JSON.stringify({ proposed: inputs.length })); return }
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const backupDir = resolve('D:/feelandnote-backups/book-descriptions', `wiki-revert-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`)
  mkdirSync(backupDir, { recursive: true })
  const log = (event: Record<string, unknown>) => {
    const line = JSON.stringify({ at: new Date().toISOString(), ...event })
    appendFileSync(resolve(backupDir, 'events.jsonl'), `${line}\n`)
    console.log(line)
  }
  let written = 0, skipped = 0
  log({ event: 'start', planned: inputs.length, backupDir })
  try {
    const ids = [...new Set(inputs.map(p => p.contentId))]
    const { data: current, error } = await db.from('content_locales').select('content_id,locale,description').in('content_id', ids)
    if (error) throw error
    const pending = inputs.filter(p => {
      const row = current.find(r => r.content_id === p.contentId && r.locale === p.locale)
      if (!row || row.description !== p.badText) { skipped++; log({ event: 'skip', contentId: p.contentId, locale: p.locale }); return false }
      return true
    })
    if (pending.length) {
      for (const input of pending) {
        const evidence = JSON.stringify(input, null, 2)
        writeFileSync(resolve(backupDir, `${input.contentId}-${input.locale}.json`), evidence, { encoding: 'utf8', flag: 'wx' })
        writeFileSync(resolve(backupDir, `${input.contentId}-${input.locale}.sha256`), createHash('sha256').update(evidence).digest('hex'), { flag: 'wx' })
      }
      const sql = `BEGIN;\nSET LOCAL lock_timeout = '5s';\nSET LOCAL statement_timeout = '30s';\n${pending.map(revertSql).join('\n')}\nCOMMIT;`
      const applied = spawnSync('ssh', ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'), '-o', 'BatchMode=yes',
        '-o', 'ConnectTimeout=10', 'ubuntu@152.67.198.197',
        'sudo docker exec -i supabase-db psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1'],
      { input: sql, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 })
      if (applied.error || applied.status !== 0) throw new Error(applied.error?.message ?? applied.stderr)
      written = pending.length
      for (const input of pending) log({ event: 'reverted', contentId: input.contentId, locale: input.locale, title: input.title })
    }
  } finally {
    if (written) log({ event: 'cache-complete', ...await sendRevalidationTags({ tags: ['contents:__all__'], dry: false,
      webUrl: 'https://feelandnote.com', secret: process.env.CRON_SECRET }) })
    log({ event: 'summary', written, skipped, backupDir })
  }
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
