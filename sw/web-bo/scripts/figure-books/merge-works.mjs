/**
 * 중복 작품 통합. 기본 dry-run. apply는 pair별 단일 transaction이며 사용자 기록 충돌은 건너뛴다.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { isDeepStrictEqual } from 'node:util'
import { argumentValue, bareIsbn, dbClient, hasFlag, allRows } from './lib/figure-work.mjs'
import { ARRAY_REFERENCE_TABLES, SNAPSHOT_TABLES, hasArrayReference, findConflicts, buildMergeSql, validatePair } from './lib/merge-work-sql.mjs'
import { CONTENT_ARRAY_REFERENCES } from './lib/content-array-references.mjs'
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const sshHost = 'ubuntu@152.67.198.197'
const sshKey = 'C:/Users/webco/.ssh/feelandnote_oracle'
export async function captureSnapshot(db, pair) {
  validatePair(pair)
  const snapshot = {}
  for (const table of SNAPSHOT_TABLES.filter(t => !['figure_book_products', 'flow_nodes', ...ARRAY_REFERENCE_TABLES].includes(t))) snapshot[table] = await allRows(table, (a, b) => {
    let query = db.from(table).select('*').in(table === 'contents' ? 'id' : 'content_id', [pair.keep, pair.drop])
    if (['figure_book_contents', 'figure_book_characters', 'content_locales'].includes(table)) {
      query = query.order('content_id')
      if (table !== 'figure_book_contents') query = query.order(table === 'content_locales' ? 'locale' : 'celeb_id')
    } else query = query.order('id')
    return query.range(a, b)
  })
  for (const table of ['flow_nodes', ...ARRAY_REFERENCE_TABLES]) {
    // tiers의 등급명은 자유 키라 고정 등급 필터로 일부를 누락하지 않는다.
    const rows = await allRows(table, (a, b) => db.from(table).select('*').order('id').range(a, b))
    snapshot[table] = rows.filter(row => hasArrayReference(table, row, pair.drop) || (table === 'flow_nodes' && [pair.keep, pair.drop].includes(row.content_id)))
  }
  const ids = snapshot.figure_book_editions.map(r => r.id)
  snapshot.figure_book_products = ids.length ? await allRows('products', (a, b) => db.from('figure_book_products').select('*').in('edition_id', ids).order('id').range(a, b)) : []
  return snapshot
}
export function planSnapshot(snapshot, pair) {
  validatePair(pair)
  if (snapshot.contents.length !== 2) return { ...pair, skip: 'missing-content' }
  const split = t => [snapshot[t].filter(r => r.content_id === pair.keep), snapshot[t].filter(r => r.content_id === pair.drop)]
  const [kr, dr] = split('figure_book_characters'), [ke, de] = split('figure_book_editions'), [kl, dl] = split('content_locales'), [km, dm] = split('member_contents')
  const title = rows => (rows.find(r => r.locale === 'ko') ?? rows[0])?.title ?? '(제목 없음)'
  return { ...pair, skip: findConflicts(snapshot, pair), keepTitle: title(kl), dropTitle: title(dl),
    members: { move: dm.filter(r => !km.some(k => k.member_id === r.member_id)).length, conflict: dm.filter(r => km.some(k => k.member_id === r.member_id)).length },
    relations: { move: dr.filter(r => !kr.some(k => k.celeb_id === r.celeb_id)).length, dropDuplicate: dr.filter(r => kr.some(k => k.celeb_id === r.celeb_id)).length },
    editions: de.map(r => ({ id: r.id, locale: r.locale, isbn: bareIsbn(r.isbn), collidesWith: r.isbn == null ? null : ke.find(k => k.locale === r.locale && k.isbn === r.isbn)?.id ?? null })),
    locales: { move: dl.filter(r => !kl.some(k => k.locale === r.locale)).map(r => r.locale), drop: dl.filter(r => kl.some(k => k.locale === r.locale)).map(r => r.locale) } }
}
export function runProcess(command, args, spawn = spawnSync) {
  const r = spawn(command, args, { encoding: 'utf8', shell: false, windowsHide: true, timeout: 90_000, maxBuffer: 16 * 1024 * 1024 })
  if (r.error || r.status !== 0) throw new Error(r.error?.message ?? r.stderr?.trim() ?? command + ' failed')
  return r.stdout
}
export function checkFixedReferences(pair, spawn = spawnSync) {
  const r = spawn('rg', ['--files-with-matches', '--fixed-strings', '--hidden', '--no-ignore', '-g', '*.ts', '-g', '*.tsx', '-g', '*.json', '-g', '*.mjs', '-g', '*.js', '--', pair.drop, 'sw/web/src', 'sw/web-bo/src', 'packages', 'sw/remotion/src', 'sw/remotion/public'], { cwd: repositoryRoot, encoding: 'utf8', shell: false, windowsHide: true, timeout: 30_000 })
  if (r.error || ![0, 1].includes(r.status)) throw new Error(r.error?.message ?? r.stderr ?? 'ID 참조 검색 실패')
  if (r.status === 0) throw new Error('MERGE_REVIEW: 코드·Remotion에 drop ID 참조: ' + r.stdout.trim())
}
export function executeMergeFile(localFile, token, spawn = spawnSync) {
  if (!/^[a-f0-9-]+$/.test(token)) throw new Error('잘못된 원격 파일 토큰')
  const remoteDirectory = '/tmp/feelandnote-merge-' + token
  const remote = remoteDirectory + '/merge.sql'
  const connection = ['-i', sshKey, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15']
  runProcess('ssh', [...connection, sshHost, "install -d -m 700 '" + remoteDirectory + "'"], spawn)
  runProcess('scp', [...connection, localFile, sshHost + ':' + remote], spawn)
  const command = "docker exec -i feelandnote-db psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < '" + remote + "'"
  const output = runProcess('ssh', [...connection, sshHost, command], spawn)
  if (!output.includes('MERGE_COMMITTED')) throw new Error('COMMIT 확인을 받지 못했습니다. 재실행 전에 같은 ID로 조회하십시오.')
  // 원격 SQL에는 감상 원문이 있으므로 성공 후 지우고 원본 백업은 로컬에 보존한다.
  try { runProcess('ssh', [...connection, sshHost, "rm -f '" + remote + "' && rmdir '" + remoteDirectory + "'"], spawn) } catch (error) { console.warn('원격 임시 SQL 정리 실패: ' + error.message) }
  return output
}
export async function applyOne(db, pair, { execute = executeMergeFile, checkReferences = checkFixedReferences } = {}) {
  checkReferences(pair)
  const snapshot = await captureSnapshot(db, pair), plan = planSnapshot(snapshot, pair)
  if (plan.skip) return plan
  const token = randomUUID(), directory = join(repositoryRoot, 'data/celeb/figure-books/_backup')
  mkdirSync(directory, { recursive: true })
  const backupFile = join(directory, 'merge-' + token + '.json'), sqlFile = join(directory, 'merge-' + token + '.sql')
  writeFileSync(backupFile, JSON.stringify({ pair, snapshot }, null, 2), { flag: 'wx' })
  writeFileSync(sqlFile, buildMergeSql(pair, snapshot), { flag: 'wx' })
  execute(sqlFile, token)
  const after = await captureSnapshot(db, pair)
  if (after.contents.some(r => r.id === pair.drop) || after.contents.length !== 1 || after.member_contents.length !== snapshot.member_contents.length || after.figure_book_products.length !== snapshot.figure_book_products.length) throw new Error('재조회 불일치. 백업으로 확인 필요: ' + backupFile)
  for (const table of ['flow_nodes', ...ARRAY_REFERENCE_TABLES]) {
    if (after[table].some(row => hasArrayReference(table, row, pair.drop))) throw new Error(`${table}에 drop ID 배열 참조가 남아 있습니다: ${backupFile}`)
    const affected = snapshot[table].filter(row => hasArrayReference(table, row, pair.drop))
    if (!affected.length) continue
    const actual = await allRows(table, (a, b) => db.from(table).select('*').in('id', affected.map(row => row.id)).order('id').range(a, b))
    for (const before of affected) {
      const expected = remapArrayReferences(table, before, pair), row = actual.find(row => row.id === before.id)
      for (const field of Object.keys(expected)) if (!isDeepStrictEqual(row?.[field], expected[field])) throw new Error(`${table}.${field} 순서·참조 재조회 불일치: ${backupFile}`)
    }
  }
  return { ...plan, completed: true, backupFile }
}
export function remapArrayReferences(table, row, pair) {
  const remap = ids => {
    let seenKeep = false
    return ids.flatMap(id => {
      if (![pair.keep, pair.drop].includes(id)) return [id]
      if (seenKeep) return []
      seenKeep = true
      return [pair.keep]
    })
  }
  const fields = {}
  for (const ref of CONTENT_ARRAY_REFERENCES.filter(ref => ref.table === table)) {
    const value = row[ref.column]
    if (ref.shape === 'tiers') {
      if (Object.values(value ?? {}).some(ids => Array.isArray(ids) && ids.includes(pair.drop))) fields[ref.column] = Object.fromEntries(Object.entries(value).map(([key, ids]) => [key, remap(ids)]))
    } else if (Array.isArray(value) && value.includes(pair.drop)) {
      fields[ref.column] = table === 'faction_lv2' ? [...new Set(value.map(id => id === pair.drop ? pair.keep : id))] : remap(value)
    }
  }
  return fields
}
export async function main() {
  const parsed = JSON.parse(readFileSync(resolve(process.cwd(), argumentValue('in', '../../data/celeb/figure-books/merge-candidates.json')), 'utf8'))
  const merges = Array.isArray(parsed) ? parsed : parsed.merges
  if (!Array.isArray(merges)) throw new Error('통합 후보 배열이 필요합니다.')
  const apply = hasFlag('apply'), db = dbClient()
  console.log('통합 후보 ' + merges.length + '쌍 (' + (apply ? 'apply' : 'dry-run') + ')')
  let done = 0, failed = 0
  for (const pair of merges) {
    try {
      const plan = apply ? await applyOne(db, pair) : planSnapshot(await captureSnapshot(db, pair), pair)
      console.log(JSON.stringify(plan)); if (plan.completed) done += 1; if (plan.skip) failed += 1
    } catch (error) { failed += 1; console.log(JSON.stringify({ ...pair, skip: 'requires-review', error: error.message })) }
  }
  if (!apply) console.log('dry-run이다. 반영하려면 --apply를 붙인다.')
  else console.log('통합 완료 ' + done + ' / ' + merges.length + ', 확인 필요 ' + failed)
  if (apply && failed) process.exitCode = 1
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1 })
