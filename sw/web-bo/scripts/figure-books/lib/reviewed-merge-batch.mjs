/** Execute independent, already LLM-reviewed work pairs with the existing merge guards. */
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { checkFixedReferences, executeMergeFile, executeTemporaryMergeSql, planSnapshot, remapArrayReferences } from '../merge-works.mjs'
import { SNAPSHOT_TABLES, REFERENCE_TABLES, ARRAY_REFERENCE_TABLES, hasArrayReference, referenceWhere, sqlLiteral, validatePair, findConflicts, buildMergeSql } from './merge-work-sql.mjs'

const EXPECTED_PREFIX = 'MERGE_BATCH_EXPECTED:'
const arrayTables = ['flow_nodes', ...ARRAY_REFERENCE_TABLES]
const directProtected = ['member_contents', 'curated_list_items', 'flow_nodes', 'records', 'notes', 'activity_logs', 'commerce_events', 'profession_book_picks']
function validatePairs(pairs) {
  if (!Array.isArray(pairs) || !pairs.length) throw Error('MERGE_BATCH_REVIEW: nonempty reviewed pairs required')
  const ids = new Set()
  for (const pair of pairs) {
    validatePair(pair)
    for (const id of [pair.keep, pair.drop]) {
      if (ids.has(id)) throw Error('MERGE_BATCH_REVIEW: overlapping work ID ' + id)
      ids.add(id)
    }
  }
}
function validateSnapshot(snapshot) {
  for (const table of SNAPSHOT_TABLES) if (!Array.isArray(snapshot?.[table])) throw Error('MERGE_BATCH_REVIEW: missing snapshot table ' + table)
  return snapshot
}
function snapshotSelect(pairs, previousSnapshot) {
  return `SELECT jsonb_build_object(${SNAPSHOT_TABLES.map(table => {
    const where = pairs.map(pair => '(' + referenceWhere(table, sqlLiteral(pair.keep), sqlLiteral(pair.drop), 't') + ')')
    // Array-only rows no longer match drop after remapping, so retain their original physical IDs.
    if (arrayTables.includes(table) && previousSnapshot?.[table]?.length) {
      const ids = [...new Set(previousSnapshot[table].map(row => String(row.id)))]
      where.push(`t.id::text IN (${ids.map(sqlLiteral).join(',')})`)
    }
    return `${sqlLiteral(table)},(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.${table} t WHERE ${where.join(' OR ')})`
  }).join(',')});`
}
export function buildReviewedMergeSnapshotSql(pairs, { previousSnapshot } = {}) {
  validatePairs(pairs)
  if (previousSnapshot) validateSnapshot(previousSnapshot)
  return `BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;\nSET LOCAL statement_timeout='60s';\n${snapshotSelect(pairs, previousSnapshot)}\nCOMMIT;`
}
/** SQL travels on stdin; Windows command-line length never grows with the batch. */
export async function captureReviewedMergeSnapshot(_db, pairs, { previousSnapshot, spawn = spawnSync } = {}) {
  const sql = buildReviewedMergeSnapshotSql(pairs, { previousSnapshot })
  const result = spawn('ssh', ['-i', 'C:/Users/webco/.ssh/feelandnote_oracle', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15',
    'ubuntu@152.67.198.197', 'docker exec -i feelandnote-db psql -XqAt -v ON_ERROR_STOP=1 -U postgres -d postgres'],
  { input: sql, encoding: 'utf8', shell: false, windowsHide: true, timeout: 90_000, maxBuffer: 32 * 1024 * 1024 })
  if (result.error || result.status !== 0) throw Error(result.error?.message ?? result.stderr?.trim() ?? 'Batch snapshot SSH failed')
  return validateSnapshot(JSON.parse(result.stdout))
}
export function sliceReviewedMergeSnapshot(snapshot, pair, previousPairSnapshot) {
  validatePair(pair); validateSnapshot(snapshot)
  const ids = new Set([pair.keep, pair.drop]), result = {}
  result.contents = snapshot.contents.filter(row => ids.has(row.id))
  for (const table of REFERENCE_TABLES) result[table] = snapshot[table].filter(row => ids.has(row.content_id) || hasArrayReference(table, row, pair.drop))
  const editions = new Set(result.figure_book_editions.map(row => String(row.id)))
  result.figure_book_products = snapshot.figure_book_products.filter(row => editions.has(String(row.edition_id)))
  for (const table of arrayTables) {
    const previousIds = new Set((previousPairSnapshot?.[table] ?? []).map(row => String(row.id)))
    result[table] = snapshot[table].filter(row => (table === 'flow_nodes' && ids.has(row.content_id)) || hasArrayReference(table, row, pair.drop) || previousIds.has(String(row.id)))
  }
  return result
}
function independentSlices(snapshot, pairs) {
  const owners = new Map(), slices = pairs.map(pair => sliceReviewedMergeSnapshot(snapshot, pair))
  for (let index = 0; index < slices.length; index++) for (const table of SNAPSHOT_TABLES) for (const row of slices[index][table]) {
    // Slices retain object identity from the one full snapshot, including composite-key rows.
    if (owners.has(row)) throw Error(`MERGE_BATCH_REVIEW: shared ${table} row across pairs ${owners.get(row)} and ${index}; use applyOne`)
    owners.set(row, index)
  }
  return slices
}
export function buildReviewedMergeBatchSql(pairs, snapshot) {
  validatePairs(pairs); validateSnapshot(snapshot)
  const slices = independentSlices(snapshot, pairs)
  const bodies = pairs.map((pair, index) => {
    const conflict = findConflicts(slices[index], pair), plan = planSnapshot(slices[index], pair)
    if (conflict || plan.skip) throw Error(`MERGE_BATCH_REVIEW: ${pair.keep}/${pair.drop}: ${conflict ?? plan.skip}`)
    const sql = buildMergeSql(pair, slices[index], { reviewedEditionMappings: pair.reviewedEditionMappings ?? [], reviewedNonstartEditionRemovals: pair.reviewedNonstartEditionRemovals ?? [] })
    const match = /^\\set ON_ERROR_STOP on\r?\nBEGIN;\r?\n([\s\S]*)\r?\nCOMMIT;\r?\nSELECT 'MERGE_COMMITTED';\s*$/u.exec(sql)
    if (!match) throw Error('MERGE_BATCH_REVIEW: existing merge SQL envelope changed')
    const body = match[1]
    const end = /\nEND;\r?\n(\$merge_work(?:_\d+)?\$);\s*$/u
    if (!end.test(body)) throw Error('MERGE_BATCH_REVIEW: existing merge DO envelope changed')
    return body.replace(end, (_match, delimiter) => `\nEXCEPTION WHEN OTHERS THEN\n  RAISE EXCEPTION USING MESSAGE=${sqlLiteral(`MERGE_BATCH pair ${index} ${pair.keep}/${pair.drop}: `)} || SQLERRM, ERRCODE=SQLSTATE;\nEND;\n${delimiter};`)
  })
  const expected = snapshotSelect(pairs, snapshot).replace(/^SELECT /u, `SELECT ${sqlLiteral(EXPECTED_PREFIX)} || (`).replace(/;$/u, ')::text;')
  return `\\set ON_ERROR_STOP on\n\\pset format unaligned\n\\pset tuples_only on\nBEGIN;\n${bodies.join('\n')}\n${expected}\nCOMMIT;\nSELECT 'MERGE_COMMITTED';\n`
}
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const rowsCanonical = rows => rows.map(row => JSON.stringify(canonical(row))).sort()
function stripChangedTimestamp(row) { const copy = { ...row }; delete copy.updated_at; return copy }
function assertRows(table, expected, actual, { stripTimestamp = false } = {}) {
  const transform = rows => stripTimestamp ? rows.map(stripChangedTimestamp) : rows
  if (!isDeepStrictEqual(rowsCanonical(transform(expected)), rowsCanonical(transform(actual)))) throw Error(`MERGE_BATCH_READBACK: ${table} rows differ`)
}
/** Independent protected-row transforms plus the normal single-pair postconditions. */
export function verifyReviewedMergePair(before, after, pair) {
  validateSnapshot(before); validateSnapshot(after)
  if (after.contents.length !== 1 || after.contents[0].id !== pair.keep || after.contents[0].type !== 'BOOK') throw Error('MERGE_BATCH_READBACK: surviving BOOK mismatch ' + pair.keep)
  for (const table of REFERENCE_TABLES) if (after[table].some(row => row.content_id === pair.drop)) throw Error('MERGE_BATCH_READBACK: residual ' + table)
  for (const table of arrayTables) {
    if (after[table].some(row => hasArrayReference(table, row, pair.drop))) throw Error('MERGE_BATCH_READBACK: residual array ' + table)
    for (const original of before[table]) {
      const actual = after[table].find(row => String(row.id) === String(original.id))
      for (const [key, value] of Object.entries(remapArrayReferences(table, original, pair))) if (!isDeepStrictEqual(actual?.[key], value)) throw Error(`MERGE_BATCH_READBACK: ${table}.${key} array order differs`)
    }
  }
  for (const table of [...directProtected, ...ARRAY_REFERENCE_TABLES]) {
    const expected = before[table].map(row => ({ ...row, ...(row.content_id === pair.drop ? { content_id: pair.keep } : {}), ...remapArrayReferences(table, row, pair) }))
    assertRows(table, expected, after[table], { stripTimestamp: true })
  }
  if (after.figure_book_products.length !== before.figure_book_products.length
    || !isDeepStrictEqual(before.figure_book_products.map(row => String(row.id)).sort(), after.figure_book_products.map(row => String(row.id)).sort())) throw Error('MERGE_BATCH_READBACK: product history lost')
  for (const [table, key] of [['celeb_contents', 'celeb_id'], ['figure_book_characters', 'celeb_id'], ['content_locales', 'locale']]) {
    if (!isDeepStrictEqual([...new Set(before[table].map(row => row[key]))].sort(), after[table].map(row => row[key]).sort())) throw Error('MERGE_BATCH_READBACK: ' + table + ' relationships lost or duplicated')
  }
  const work = after.contents[0]
  for (const [field, count] of [['member_count', after.member_contents.length], ['celeb_count', after.celeb_contents.length], ['record_count', after.member_contents.length + after.celeb_contents.length]]) {
    if (Number(work[field]) !== count) throw Error('MERGE_BATCH_READBACK: counter ' + field)
  }
}
export async function applyReviewedMergeBatch(db, pairs, { captureMany = captureReviewedMergeSnapshot, execute = executeMergeFile, checkReferences = checkFixedReferences } = {}) {
  validatePairs(pairs)
  for (const pair of pairs) await checkReferences(pair)
  const before = validateSnapshot(await captureMany(db, pairs)), slices = independentSlices(before, pairs)
  const sql = buildReviewedMergeBatchSql(pairs, before)
  const output = await executeTemporaryMergeSql(sql, randomUUID(), execute)
  const encoded = String(output).split(/\r?\n/u).find(line => line.trimStart().startsWith(EXPECTED_PREFIX))?.trim()
  if (!encoded || !String(output).includes('MERGE_COMMITTED')) throw Error('MERGE_BATCH_READBACK: committed expected snapshot missing; inspect owned IDs before retry')
  const expected = validateSnapshot(JSON.parse(encoded.slice(EXPECTED_PREFIX.length)))
  const after = validateSnapshot(await captureMany(db, pairs, { previousSnapshot: before }))
  // No ignored tables/columns: compare every field in all 18 committed row sets.
  for (const table of SNAPSHOT_TABLES) assertRows(table, expected[table], after[table])
  return pairs.map((pair, index) => {
    verifyReviewedMergePair(slices[index], sliceReviewedMergeSnapshot(after, pair, slices[index]), pair)
    return { ...planSnapshot(slices[index], pair), completed: true }
  })
}
