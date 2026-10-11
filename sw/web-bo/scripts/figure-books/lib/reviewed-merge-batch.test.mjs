import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { SNAPSHOT_TABLES } from './merge-work-sql.mjs'
import { applyReviewedMergeBatch, buildReviewedMergeBatchSql, buildReviewedMergeSnapshotSql, captureReviewedMergeSnapshot, sliceReviewedMergeSnapshot, verifyReviewedMergePair } from './reviewed-merge-batch.mjs'

const pairs = [{ keep: 'keep-a', drop: 'drop-a' }, { keep: 'keep-b', drop: 'drop-b' }]
const empty = () => Object.fromEntries(SNAPSHOT_TABLES.map(table => [table, []]))
function fixture() {
  const before = empty()
  for (const [index, pair] of pairs.entries()) {
    before.contents.push(...[pair.keep, pair.drop].map(id => ({ id, type: 'BOOK', external_id: null, metadata: {}, member_count: 0, celeb_count: 0, record_count: 0 })))
    before.figure_book_contents.push({ content_id: pair.keep }, { content_id: pair.drop })
    before.content_locales.push({ content_id: pair.keep, locale: 'en', title: 'Book ' + index, isbn: null, sources: {} }, { content_id: pair.drop, locale: 'en', title: 'Book ' + index, isbn: null, sources: {} })
    before.member_contents.push({ id: index + 1, member_id: 'member-' + index, content_id: pair.drop, memo: 'Keep the full original value', updated_at: 'before' })
    before.flows.push({ id: index + 1, tiers: { Adult: [pair.drop, 'other', pair.keep, 'other'] }, updated_at: 'before' })
  }
  return before
}
function committed(before) {
  const after = structuredClone(before)
  for (const pair of pairs) {
    after.contents = after.contents.filter(row => row.id !== pair.drop)
    Object.assign(after.contents.find(row => row.id === pair.keep), { member_count: 1, celeb_count: 0, record_count: 1 })
    after.figure_book_contents = after.figure_book_contents.filter(row => row.content_id !== pair.drop)
    after.content_locales = after.content_locales.filter(row => row.content_id !== pair.drop)
    for (const row of after.member_contents) if (row.content_id === pair.drop) row.content_id = pair.keep
    for (const row of after.flows) if (row.tiers.Adult.includes(pair.drop)) row.tiers.Adult = [pair.keep, 'other', 'other']
  }
  return after
}
test('one stdin read snapshots every protected table and preserves remapped array rows in readback', async () => {
  const before = fixture(), calls = []
  const result = await captureReviewedMergeSnapshot(null, pairs, { previousSnapshot: before, spawn(command, args, options) {
    calls.push({ command, args, options }); return { status: 0, stdout: JSON.stringify(before), stderr: '' }
  } })
  assert.deepEqual(result, before); assert.equal(calls.length, 1)
  assert.equal(calls[0].command, 'ssh'); assert.match(calls[0].args.at(-1), /docker exec -i.*psql -XqAt/)
  assert.ok(calls[0].args.every(arg => !arg.includes('jsonb_build_object')))
  assert.match(calls[0].options.input, /REPEATABLE READ READ ONLY/)
  for (const table of SNAPSHOT_TABLES) assert.ok(calls[0].options.input.includes('FROM public.' + table))
  assert.match(calls[0].options.input, /t\.id::text IN \(E'1',E'2'\)/)
  assert.doesNotMatch(calls[0].options.input, /INSERT|UPDATE|DELETE/u)
})
test('incomplete snapshots and real transport errors fail closed', async () => {
  await assert.rejects(captureReviewedMergeSnapshot(null, pairs, { spawn: () => ({ status: 0, stdout: '{}', stderr: '' }) }), /missing snapshot table/)
  await assert.rejects(captureReviewedMergeSnapshot(null, pairs, { spawn: () => ({ status: 1, stderr: 'read failed' }) }), /read failed/)
  await assert.rejects(captureReviewedMergeSnapshot(null, pairs, { spawn: () => ({ error: Error('ENAMETOOLONG') }) }), /ENAMETOOLONG/)
})
test('all IDs must be distinct and shared physical array/protected rows are rejected before writing', async () => {
  assert.throws(() => buildReviewedMergeSnapshotSql([pairs[0], { keep: pairs[0].keep, drop: 'third' }]), /overlapping/)
  const shared = fixture(); shared.flows.push({ id: 99, tiers: { Adult: [pairs[0].drop, pairs[1].drop] } })
  assert.throws(() => buildReviewedMergeBatchSql(pairs, shared), /shared flows row/)
  const cross = fixture(); cross.flow_nodes.push({ id: 99, content_id: pairs[0].keep, bonus_content_ids: [pairs[1].drop] })
  assert.throws(() => buildReviewedMergeBatchSql(pairs, cross), /shared flow_nodes row/)
  let writes = 0
  await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async () => shared, execute() { writes++ } }), /shared/)
  assert.equal(writes, 0)
})
test('compiled SQL is one atomic transaction with every existing CAS/FK/trigger guard and pair-specific errors', () => {
  const sql = buildReviewedMergeBatchSql(pairs, fixture())
  assert.equal(sql.match(/^BEGIN;$/gm)?.length, 1); assert.equal(sql.match(/^COMMIT;$/gm)?.length, 1)
  assert.equal(sql.match(/SELECT 'MERGE_COMMITTED'/g)?.length, 1)
  for (const table of SNAPSHOT_TABLES) assert.equal(sql.match(new RegExp('concurrent change in ' + table + "'", 'g'))?.length, pairs.length)
  assert.equal(sql.match(/unhandled edition FK/g)?.length, 2)
  assert.equal(sql.match(/product history lost/g)?.length, 2)
  assert.match(sql, /MERGE_BATCH pair 1 keep-b\/drop-b/); assert.match(sql, /ERRCODE=SQLSTATE/)
  assert.match(sql, /MERGE_BATCH_EXPECTED:/); assert.ok(sql.indexOf('MERGE_BATCH_EXPECTED:') < sql.indexOf('\nCOMMIT;'))
  assert.doesNotMatch(sql, /DISABLE TRIGGER|session_replication_role/)
})
test('one execution and two full reads return the normal completed plans and clean local temporary SQL', async () => {
  const before = fixture(), after = committed(before), calls = [], paths = []
  const result = await applyReviewedMergeBatch(null, pairs, {
    checkReferences: pair => calls.push('fixed:' + pair.drop),
    captureMany: async (_db, ownedPairs, options) => { assert.equal(ownedPairs, pairs); calls.push(options ? 'readback' : 'before'); if (options) assert.equal(options.previousSnapshot, before); return options ? after : before },
    execute(path) { paths.push(path); calls.push('execute'); assert.match(readFileSync(path, 'utf8'), /MERGE_BATCH_EXPECTED:/); return 'MERGE_BATCH_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED\n' }
  })
  assert.deepEqual(calls, ['fixed:drop-a', 'fixed:drop-b', 'before', 'execute', 'readback'])
  assert.equal(result.length, 2); assert.ok(result.every(row => row.completed && !row.skip)); assert.ok(paths.every(path => !existsSync(path)))
})
test('a failure of any pair propagates without retrying another pair or taking readback', async () => {
  const calls = [], paths = []
  await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async () => { calls.push('capture'); return fixture() }, execute(path) { paths.push(path); calls.push('execute'); throw Error('MERGE_BATCH pair 1: policy trigger rejected') } }), /pair 1.*policy trigger/)
  assert.deepEqual(calls, ['capture', 'execute']); assert.ok(paths.every(path => !existsSync(path)))
})
test('every final table and every field is compared, including tables usually overlooked', async () => {
  for (const table of SNAPSHOT_TABLES) {
    const before = fixture(), expected = committed(before), actual = structuredClone(expected)
    actual[table].push({ id: 'unexpected', preserved: 'changed' })
    await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async (_db, _pairs, options) => options ? actual : before,
      execute: () => 'MERGE_BATCH_EXPECTED:' + JSON.stringify(expected) + '\nMERGE_COMMITTED' }), new RegExp(table + ' rows differ'))
  }
})
test('normal postconditions independently reject loss, hidden memo changes and array reorder even if emitted/readback states agree', async () => {
  for (const change of [after => { after.member_contents[0].memo = 'corrupted' }, after => { after.flows[0].tiers.Adult.reverse() }, after => { after.contents[0].member_count = 999 }]) {
    const before = fixture(), after = committed(before); change(after)
    await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async (_db, _pairs, options) => options ? after : before,
      execute: () => 'MERGE_BATCH_EXPECTED:' + JSON.stringify(after) + '\nMERGE_COMMITTED' }), /MERGE_BATCH_READBACK/)
  }
})
test('missing commit proof never claims completed and original missing-work/conflict checks run before execution', async () => {
  let writes = 0
  const before = fixture(); before.member_contents.push({ id: 99, member_id: 'member-0', content_id: pairs[0].keep })
  await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async () => before, execute() { writes++ } }), /member-duplicate/)
  assert.equal(writes, 0)
  await assert.rejects(applyReviewedMergeBatch(null, pairs, { checkReferences() {}, captureMany: async () => fixture(), execute: () => 'MERGE_COMMITTED' }), /expected snapshot missing/)
})
test('explicit source-reviewed edition mappings reach the unchanged canonical product mapping', () => {
  const before = fixture()
  before.figure_book_editions.push({ id: 1, content_id: pairs[0].keep, locale: 'en', isbn: '9780500295779', title: 'Instant Stories', sources: {} },
    { id: 2, content_id: pairs[0].drop, locale: 'en', isbn: '9780500544785', title: 'Instant Stories', sources: {} })
  const reviewed = [{ ...pairs[0], reviewedEditionMappings: [{ keepEditionId: 1, dropEditionId: 2, keepIsbn: '9780500295779', dropIsbn: '9780500544785', locale: 'en', sourceUrl: 'https://www.thamesandhudson.com/products/wim-wenders-instant-stories', reason: 'Publisher confirms identical photographs in reduced format.' }] }, pairs[1]]
  assert.match(buildReviewedMergeBatchSql(reviewed, before), /canonical_id := CASE duplicate_edition.id WHEN 2 THEN 1 ELSE NULL END/)
  const wrong = structuredClone(reviewed); wrong[0].reviewedEditionMappings[0].keepEditionId = 999
  assert.throws(() => buildReviewedMergeBatchSql(wrong, before), /owner\/locale\/duplicate/)
})
test('pair context keeps SQL literals and replacement metacharacters inside the error string', () => {
  const pair = { keep: "keep$&'\\", drop: 'drop$1' }, before = empty()
  before.contents = [pair.keep, pair.drop].map(id => ({ id, type: 'BOOK', external_id: null, metadata: {} }))
  const sql = buildReviewedMergeBatchSql([pair], before)
  assert.ok(sql.includes("MESSAGE=E'MERGE_BATCH pair 0 keep$&''\\\\/drop$1: ' || SQLERRM"))
  assert.equal(sql.match(/EXCEPTION WHEN OTHERS/g)?.length, 1)
  assert.equal(sql.match(/^COMMIT;$/gm)?.length, 1)
})
test('fixed-reference refusal aborts before the one-read snapshot and never reaches executor', async () => {
  await assert.rejects(applyReviewedMergeBatch(null, pairs, {
    checkReferences() { throw Error('existing Remotion fixed reference') },
    captureMany() { assert.fail('must not capture') }, execute() { assert.fail('must not execute') }
  }), /existing Remotion/)
})
