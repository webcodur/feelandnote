/** 조사해 직접 쓴 BOOK 소개를 빈 행에 반영한다. 기본 실행은 검사만 하고 DB를 바꾸지 않는다.
 * node --env-file=.env --import tsx scripts/contents/apply-book-research-introductions.ts --plan FILE [--apply]
 * 규칙: docs/project/celeb/celeb-02-06-content-introduction-sources.md 「번역 백엔드」·「데이터 보존 필드」 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import { buildIntroductionApplySql, type IntroductionRow } from './book-description-sources-contract'
import { planResearchIntroduction, researchIntroductionText, type ResearchedBookIntroduction } from './book-research-introduction-contract'
import { sendRevalidationTags } from './revalidate-filled-lib'

const COLUMNS = 'content_id,locale,title,creator,publisher,isbn,description,sources'

async function main() {
  const { values } = parseArgs({ options: { plan: { type: 'string' }, apply: { type: 'boolean' } }, strict: true })
  if (!values.plan) throw new Error('--plan is required')
  const inputs = JSON.parse(readFileSync(resolve(values.plan), 'utf8')) as ResearchedBookIntroduction[]
  if (!Array.isArray(inputs) || !inputs.length) throw new Error('Expected researched introduction array')
  if (new Set(inputs.map(i => `${i.contentId}:${i.locale}`)).size !== inputs.length) throw new Error('Duplicate target')
  for (const input of inputs) researchIntroductionText(input)
  const url = process.env.NEXT_PUBLIC_DB_API_URL, secret = process.env.DB_SECRET_KEY
  if (!url || !secret || new URL(url).hostname !== 'db.feelandnote.com') throw new Error('Expected project DB environment')
  if (values.apply && !process.env.CRON_SECRET) throw new Error('CRON_SECRET is required')
  const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
  const backupDir = resolve('D:/feelandnote-backups/book-descriptions', `research-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`)
  if (values.apply) mkdirSync(backupDir, { recursive: true })
  const log = (event: Record<string, unknown>) => {
    const line = JSON.stringify({ at: new Date().toISOString(), ...event })
    if (values.apply) appendFileSync(resolve(backupDir, 'events.jsonl'), `${line}\n`)
    console.log(line)
  }
  let written = 0, skipped = 0
  try {
    for (const input of inputs) {
      const [{ data: locale, error }, { data: editions, error: editionError }] = await Promise.all([
        db.from('content_locales').select(COLUMNS).eq('content_id', input.contentId).eq('locale', input.locale).maybeSingle(),
        db.from('figure_book_editions').select(`id,${COLUMNS}`).eq('content_id', input.contentId).eq('locale', input.locale),
      ])
      if (error || editionError) throw error ?? editionError
      if (!locale) { skipped++; log({ event: 'missing-row', contentId: input.contentId }); continue }
      let changes
      try { changes = planResearchIntroduction(input, locale as IntroductionRow, (editions ?? []) as IntroductionRow[]) }
      catch (reason) { skipped++; log({ event: 'refused', contentId: input.contentId, title: input.title, reason: String(reason) }); continue }
      if (!values.apply) { log({ event: 'proposed', contentId: input.contentId, title: input.title, rows: changes.length }); continue }
      const evidence = JSON.stringify({ input, changes }, null, 2)
      writeFileSync(resolve(backupDir, `${input.contentId}-${input.locale}.json`), evidence, { encoding: 'utf8', flag: 'wx' })
      writeFileSync(resolve(backupDir, `${input.contentId}-${input.locale}.sha256`), createHash('sha256').update(evidence).digest('hex'), { flag: 'wx' })
      const applied = spawnSync('ssh', ['-i', resolve(homedir(), '.ssh/feelandnote_oracle'), '-o', 'BatchMode=yes',
        '-o', 'ConnectTimeout=10', 'ubuntu@152.67.198.197',
        'sudo docker exec -i supabase-db psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1'],
      { input: buildIntroductionApplySql(input.contentId, changes), encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 })
      if (applied.error || applied.status !== 0) throw new Error(applied.error?.message ?? applied.stderr)
      written++
      const [{ data: after }, { data: afterEditions }] = await Promise.all([
        db.from('content_locales').select('description,sources').eq('content_id', input.contentId).eq('locale', input.locale).single(),
        db.from('figure_book_editions').select('id,description,sources').eq('content_id', input.contentId).eq('locale', input.locale),
      ])
      for (const change of changes) {
        const current = change.table === 'content_locales' ? after : afterEditions?.find(e => e.id === change.before.id)
        if (current?.description !== change.description || current?.sources?.description_method !== 'research'
          || current?.sources?.description !== input.sourceUrl) throw new Error(`Research readback failed: ${input.contentId}`)
      }
      log({ event: 'applied', contentId: input.contentId, title: input.title, rows: changes.length })
    }
  } finally {
    if (written) log({ event: 'cache-complete', ...await sendRevalidationTags({ tags: ['contents:__all__'], dry: false,
      webUrl: 'https://feelandnote.com', secret: process.env.CRON_SECRET }) })
    log({ event: 'summary', planned: inputs.length, written, skipped, ...(values.apply ? { backupDir } : {}) })
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
