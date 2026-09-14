/** Reviewed coverage additions. Default is read-only; --apply commits one backed-up work at a time. */
import { deepStrictEqual } from 'node:assert'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import {
  approvedCandidates, buildCoverageApplySql, buildCoverageWrites, resolveCoverageWork,
  sha256, snapshotSql, verifiedCandidates, type CoverageCandidate, type CoverageCatalog, type CoverageSnapshot,
} from './coverage-apply-contract'

function sql<T>(query: string): T {
  const result = spawnSync(process.platform === 'win32' ? 'ssh.exe' : 'ssh', [
    '-i', process.env.FEELANDNOTE_DB_SSH_KEY || resolve(homedir(), '.ssh/feelandnote_oracle'),
    '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', 'ubuntu@152.67.198.197',
    'sudo', 'docker', 'exec', '-i', 'supabase-db', 'psql', '-X', '-qAt',
    '--set', 'ON_ERROR_STOP=1', '--username', 'postgres', '--dbname', 'postgres',
  ], { input: query, encoding: 'utf8', timeout: 90_000, maxBuffer: 100 * 1024 * 1024, windowsHide: true })
  if (result.error || result.status !== 0) {
    throw new Error(`DB command failed; do not retry a write without checking its backup/readback: ${result.error?.message ?? result.stderr.slice(-2000)}`)
  }
  const line = result.stdout.trim().split(/\r?\n/).at(-1)
  if (!line) throw new Error('DB command returned no JSON; write state may be uncertain')
  return JSON.parse(line) as T
}

function loadCatalog(): CoverageCatalog {
  return sql(`SELECT jsonb_build_object(
    'contents',(SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]') FROM contents c WHERE type='BOOK'),
    'locales',(SELECT coalesce(jsonb_agg(to_jsonb(l)), '[]') FROM content_locales l JOIN contents c ON c.id=l.content_id WHERE c.type='BOOK'),
    'editions',(SELECT coalesce(jsonb_agg(to_jsonb(e)), '[]') FROM figure_book_editions e),
    'celebs',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'slug',slug)), '[]') FROM celebs WHERE publication_status='active')
  )::text;`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help')) {
    console.log('node --import tsx coverage-apply.ts --file <prepared.json> (--review <review.json> | --verified-input <verification.json>) [--output <new-directory>] [--apply]')
    return
  }
  const values = new Map<string, string>()
  let apply = false
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (arg === '--apply') { apply = true; continue }
    if (!['--file', '--review', '--verified-input', '--output'].includes(arg) || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Unknown or incomplete argument: ${arg}`)
    values.set(arg, args[++index])
  }
  if (!values.has('--file') || values.has('--review') === values.has('--verified-input')) throw new Error('--file and exactly one of --review / --verified-input are required')
  const file = resolve(values.get('--file')!)
  const reviewFile = values.has('--review') ? resolve(values.get('--review')!) : null
  const verifiedFile = values.has('--verified-input') ? resolve(values.get('--verified-input')!) : null
  const bytes = readFileSync(file)
  const evidenceBytes = readFileSync((reviewFile || verifiedFile)!)
  const verified = verifiedFile ? verifiedCandidates(bytes, JSON.parse(evidenceBytes.toString('utf8')),
    (await import('./coverage-prepare.mjs')).toApplyCandidate) : null
  const candidates = verified?.candidates ?? approvedCandidates(bytes, JSON.parse(evidenceBytes.toString('utf8')))
  const output = resolve(values.get('--output') || `${file}.apply-${Date.now()}`)
  // Exclusive directory creation prevents overwriting a previous backup or ambiguous apply receipt.
  mkdirSync(output)
  const catalog = loadCatalog()
  const groups = new Map<string, CoverageCandidate[]>()
  const held: { candidateId: string; reason: string }[] = verified?.held ?? []
  for (const item of candidates) {
    try {
      const id = resolveCoverageWork(item, catalog).contentId
      groups.set(id, [...groups.get(id) ?? [], item])
    } catch (error) { held.push({ candidateId: item.candidateId, reason: (error as Error).message }) }
  }
  const results: unknown[] = []
  let relationsAdded = 0
  let unchangedWorks = 0
  const common = { inputSha256: sha256(bytes), reviewSha256: reviewFile ? sha256(evidenceBytes) : null,
    verifiedSha256: verifiedFile ? sha256(evidenceBytes) : null, file, reviewFile, verifiedFile }
  // Complete all preflight before the first production write.
  const plans = []
  for (const [id, items] of groups) {
    try {
      const before = sql<CoverageSnapshot>(`SELECT ${snapshotSql(id)}::text;`)
      const plan = buildCoverageWrites(items, catalog, before)
      plans.push({ ...plan, before, candidateIds: items.map(item => item.candidateId),
        affectedCelebs: items.map(item => ({ id: item.celebId, slug: item.slug })) })
    } catch (error) { for (const item of items) held.push({ candidateId: item.candidateId, reason: (error as Error).message }) }
  }
  writeFileSync(resolve(output, 'preflight.json'), JSON.stringify({ ...common, mode: apply ? 'apply' : 'dry-run', held, plans }, null, 2), { flag: 'wx' })
  for (const plan of plans) {
    const receipt = resolve(output, `${plan.contentId}.json`)
    const material = { ...common, ...plan }
    if (!Object.values(plan.rows).some(rows => rows.length)) {
      writeFileSync(receipt, JSON.stringify({ ...material, status: 'unchanged' }, null, 2), { flag: 'wx' })
      results.push({ contentId: plan.contentId, status: 'unchanged', relationsAdded: 0, affectedCelebs: plan.affectedCelebs })
      unchangedWorks++
      continue
    }
    writeFileSync(receipt, JSON.stringify({ ...material, status: apply ? 'applying' : 'dry-run' }, null, 2), { flag: 'wx' })
    if (!apply) { results.push({ contentId: plan.contentId, status: 'dry-run' }); continue }
    try {
      const report = sql<{ status: string; after: CoverageSnapshot }>(buildCoverageApplySql(plan.contentId, plan.before, plan.rows))
      if (report.status !== 'applied') throw new Error('Unexpected transaction status')
      const readback = sql<CoverageSnapshot>(`SELECT ${snapshotSql(plan.contentId)}::text;`)
      deepStrictEqual(readback, report.after)
      writeFileSync(receipt, JSON.stringify({ ...material, status: 'applied', after: readback }, null, 2))
      relationsAdded += plan.rows.figure_book_characters.length
      results.push({ contentId: plan.contentId, status: 'applied', relationsAdded: plan.rows.figure_book_characters.length, affectedCelebs: plan.affectedCelebs })
    } catch (error) {
      let after: CoverageSnapshot | null = null
      try { after = sql<CoverageSnapshot>(`SELECT ${snapshotSql(plan.contentId)}::text;`) } catch { /* retain backup and stop */ }
      writeFileSync(receipt, JSON.stringify({ ...material, status: 'check-required', error: (error as Error).message, after }, null, 2))
      throw error
    }
  }
  writeFileSync(resolve(output, 'result.json'), JSON.stringify({ ...common, held, results }, null, 2), { flag: 'wx' })
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', approved: candidates.length, works: plans.length, held: held.length, relationsAdded, unchangedWorks, output }))
}

main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
