/** Replace unauthorized muse en→ko translations with agy re-translations.
 * CAS: row must still hold the exact muse text and its recorded provenance; only the
 * description field changes — sources keep method/source-locale/source-URL untouched.
 * node --env-file=.env --import tsx scripts/contents/apply-enko-redo.ts --plan FILE [--apply]
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { mediaIntroductionText } from './media-introduction-contract'
import { sendRevalidationTags } from './revalidate-filled-lib'

const literal = (value: string) => `'${value.replace(/'/g, "''")}'`
const json = (value: unknown) => `${literal(JSON.stringify(value))}::jsonb`

function replaceSql(input: any): string {
  const { target, description } = input
  const snapshot = { description: target.description, sources: target.sources, isbn: target.isbn,
    title: target.title, creator: target.creator, publisher: target.publisher }
  const setValue = input.clear ? 'NULL' : literal(description)
  const body = `DECLARE changed integer;
BEGIN
UPDATE public.content_locales SET description = ${setValue}, updated_at = now()
WHERE content_id = ${literal(target.content_id)} AND locale = 'ko'
  AND jsonb_build_object('description',description,'sources',sources,'isbn',isbn,
    'title',title,'creator',creator,'publisher',publisher) = ${json(snapshot)};
GET DIAGNOSTICS changed = ROW_COUNT;
IF changed <> 1 THEN RAISE EXCEPTION 'Muse translation changed concurrently'; END IF;
END;`
  let delimiter = '$redo$'
  while (body.includes(delimiter)) delimiter = delimiter.replace(/\$$/, '_x$')
  return `DO ${delimiter}\n${body}\n${delimiter};`
}

async function main() {
  const { values } = parseArgs({ options: { plan: { type: 'string' }, apply: { type: 'boolean' } }, strict: true })
  if (!values.plan) throw new Error('--plan is required')
  const inputs = JSON.parse(readFileSync(resolve(values.plan), 'utf8')) as any[]
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('Expected redo plan array')
  for (const p of inputs) {
    if (p.target?.locale !== 'ko' || p.sourceLocale !== 'en' || !p.museText || !p.sourceUrl?.startsWith('https://')) throw new Error(`Invalid redo row: ${p.content?.id}`)
    if (p.clear) { p.description = null; continue }
    const text = mediaIntroductionText(p.description ?? '', 'ko')
    if (!text) throw new Error(`Invalid ko text: ${p.content?.id}`)
    p.description = text
  }
  const url = process.env.NEXT_PUBLIC_DB_API_URL, secret = process.env.DB_SECRET_KEY
  if (!url || !secret || new URL(url).hostname !== 'db.feelandnote.com') throw new Error('Expected project DB environment')
  if (values.apply && !process.env.CRON_SECRET) throw new Error('CRON_SECRET is required')
  if (!values.apply) { console.log(JSON.stringify({ proposed: inputs.length })); return }
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const backupDir = resolve('D:/feelandnote-backups/book-descriptions', `enko-redo-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`)
  mkdirSync(backupDir, { recursive: true })
  const log = (event: Record<string, unknown>) => {
    const line = JSON.stringify({ at: new Date().toISOString(), ...event })
    appendFileSync(resolve(backupDir, 'events.jsonl'), `${line}\n`)
    console.log(line)
  }
  let written = 0, confirmed = 0, skipped = 0
  log({ event: 'start', planned: inputs.length, backupDir })
  try {
    const batchSize = 50
    for (let offset = 0; offset < inputs.length; offset += batchSize) {
      const batch = inputs.slice(offset, offset + batchSize)
      const ids = [...new Set(batch.map(p => p.target.content_id))]
      const { data: current, error } = await db.from('content_locales').select('content_id,locale,description,sources').in('content_id', ids)
      if (error) throw error
      const pending = batch.filter(p => {
        const row = current.find(r => r.content_id === p.target.content_id && r.locale === 'ko')
        if (!row || row.description !== p.museText || row.sources?.description_method !== 'translation'
          || row.sources?.description_source_locale !== 'en' || (row.sources?.description ?? null) !== p.sourceUrl) { skipped++; return false }
        return true
      })
      if (!pending.length) continue
      for (const input of pending) {
        const evidence = JSON.stringify(input, null, 2)
        const file = `${input.target.content_id}-ko`
        writeFileSync(resolve(backupDir, `${file}.json`), evidence, { encoding: 'utf8', flag: 'wx' })
        writeFileSync(resolve(backupDir, `${file}.sha256`), createHash('sha256').update(evidence).digest('hex'), { flag: 'wx' })
      }
      const sql = `BEGIN;\nSET LOCAL lock_timeout = '5s';\nSET LOCAL statement_timeout = '30s';\n${pending.map(replaceSql).join('\n')}\nCOMMIT;`
      const applied = spawnSync('ssh', ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'), '-o', 'BatchMode=yes',
        '-o', 'ConnectTimeout=10', 'ubuntu@152.67.198.197',
        'sudo docker exec -i supabase-db psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1'],
      { input: sql, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 })
      if (applied.error || applied.status !== 0) throw new Error(applied.error?.message ?? applied.stderr)
      written += pending.length
      const { data: rows, error: readError } = await db.from('content_locales').select('content_id,locale,description,sources').in('content_id', ids)
      if (readError) throw readError
      for (const input of pending) {
        const rb = rows.find(r => r.content_id === input.target.content_id && r.locale === 'ko')
        if (!rb || (rb.description ?? null) !== input.description || rb.sources?.description_method !== 'translation'
          || (rb.sources?.description ?? null) !== input.sourceUrl) throw new Error(`Redo readback failed: ${input.target.content_id}`)
        confirmed++
        log({ event: 'replaced', contentId: input.target.content_id, title: input.target.title })
      }
    }
  } finally {
    if (written) log({ event: 'cache-complete', ...await sendRevalidationTags({ tags: ['contents:__all__'], dry: false,
      webUrl: 'https://feelandnote.com', secret: process.env.CRON_SECRET }) })
    log({ event: 'summary', written, confirmed, skipped, backupDir })
  }
}
main().catch(e => { console.error(e instanceof Error ? e.message : String(e)); process.exitCode = 1 })
