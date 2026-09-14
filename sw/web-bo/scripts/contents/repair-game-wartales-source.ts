/** One reviewed source-key repair. External ID and locale data are never changed. */
import fs from 'node:fs/promises'
import path from 'node:path'
import { homedir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
async function main() {
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  if (!url || new URL(url).hostname !== 'db.feelandnote.com' || !process.env.DB_SECRET_KEY) throw new Error('Expected production credentials')
  const db = createClient(url, process.env.DB_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const id = 'c6758f9c-455a-41e7-9652-f86a06f62786'
  const { data: before, error } = await db.from('contents').select('id,type,external_id,external_source,content_locales(*)').eq('id', id).single()
  if (error) throw error
  if (before.type !== 'GAME' || before.external_id !== 'igdb-152257' || !before.content_locales.every(row => row.title === 'Wartales' && row.creator === 'Shiro Games')) throw new Error('Identity no longer agrees')
  if (before.external_source === 'igdb') { console.log(JSON.stringify({ alreadyRepaired: true })); return }
  if (before.external_source !== null) throw new Error('Unexpected non-null source')
  const backupDir = path.resolve('D:/feelandnote-backups/book-descriptions', `game-wartales-source-${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`)
  await fs.mkdir(backupDir, { recursive: true })
  await fs.writeFile(path.join(backupDir, 'before.json'), JSON.stringify(before, null, 2) + '\n', 'utf8')
  const guard = `id = '${id}' AND type = 'GAME' AND external_id = 'igdb-152257'`
  const sql = `BEGIN; SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';
DO $wartales_source$ DECLARE changed integer; BEGIN
PERFORM content_id FROM public.content_locales WHERE content_id='${id}' AND locale IN ('ko','en') FOR SHARE;
IF (SELECT count(*) FROM public.content_locales WHERE content_id='${id}' AND locale IN ('ko','en') AND title='Wartales' AND creator='Shiro Games') <> 2 THEN RAISE EXCEPTION 'Wartales locale identity changed'; END IF;
UPDATE public.contents SET external_source='igdb' WHERE ${guard} AND external_source IS NULL;
GET DIAGNOSTICS changed = ROW_COUNT;
IF changed <> 1 THEN RAISE EXCEPTION 'Wartales source changed concurrently'; END IF;
END $wartales_source$; COMMIT;`
  const rollback = `BEGIN; UPDATE public.contents SET external_source=NULL WHERE ${guard} AND external_source='igdb'; COMMIT;\n`
  await fs.writeFile(path.join(backupDir, 'apply.sql'), sql, 'utf8')
  await fs.writeFile(path.join(backupDir, 'rollback.sql'), rollback, 'utf8')
  const result = spawnSync('ssh', ['-i', path.resolve(homedir(), '.ssh/feelandnote_oracle'), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', 'ubuntu@152.67.198.197', 'sudo docker exec -i supabase-db psql -U postgres -d postgres -X -q -A -t -v ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', timeout: 45000, maxBuffer: 1024 * 1024 })
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr)
  const { data: after, error: readError } = await db.from('contents').select('id,type,external_id,external_source').eq('id', id).single()
  if (readError) throw readError
  if (after.external_id !== before.external_id || after.external_source !== 'igdb' || after.type !== 'GAME') throw new Error('Wartales source readback failed')
  await fs.writeFile(path.join(backupDir, 'after.json'), JSON.stringify(after, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify({ repaired: id, backupDir, readback: true }))
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
