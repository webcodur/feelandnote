/** Luna 결과의 진행 건수와 원문·관계 ID 일치만 확인한다. DB와 파일은 변경하지 않는다. */
import fs from 'node:fs'
import path from 'node:path'
import { ASSETS } from '../blog-assets.mjs'

const dir = path.join(ASSETS, 'tistory-cinema')
const read = (name) => {
  try { return JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) }
  catch (error) { throw new Error(`${name}: ${error.message}`) }
}
const inventory = read('luna-cinema-full-inventory.json')
const inventoryIds = new Set(inventory.rows.map((row) => row.rid))
const groups = [
  { name: 'initial', input: 'luna-cinema-initial-slop-input.json', fallbackInput: 'luna-cinema-batch-01-input.json', result: 'luna-cinema-initial-slop.json' },
  ...Array.from({ length: 5 }, (_, i) => ({
    name: `worker-${i + 1}`,
    input: `luna-cinema-worker-${i + 1}-input.json`,
    result: `luna-cinema-worker-${i + 1}-slop.json`,
  })),
]
const errors = []
const assigned = new Set()
const processed = new Set()
const totals = { keep: 0, revise: 0 }
const progress = []

for (const group of groups) {
  const input = read(fs.existsSync(path.join(dir, group.input)) ? group.input : group.fallbackInput)
  const originals = new Map()
  for (const row of input.rows) {
    if (!inventoryIds.has(row.rid)) errors.push(`${group.name}: relation outside inventory: ${row.rid}`)
    if (assigned.has(row.rid)) errors.push(`${group.name}: duplicate assignment: ${row.rid}`)
    assigned.add(row.rid)
    originals.set(row.rid, row)
  }
  const resultNames = [group.result].filter((name) => fs.existsSync(path.join(dir, name)))
  const result = { rows: [] }
  for (const name of resultNames) {
    try {
      const part = read(name)
      if (!Array.isArray(part.rows)) throw new Error(`${name}: rows must be an array`)
      result.rows.push(...part.rows)
    } catch (error) {
      errors.push(error.message)
    }
  }
  const counts = { keep: 0, revise: 0 }
  for (const row of result.rows) {
    const original = originals.get(row.rid)
    const fail = (message) => errors.push(`${group.name}: ${row.rid}: ${message}`)
    if (!original) { fail('relation is not assigned to this worker'); continue }
    if (processed.has(row.rid)) { fail('duplicate result'); continue }
    if (!Object.hasOwn(counts, row.decision)) { fail(`unknown decision: ${row.decision}`); continue }
    processed.add(row.rid)
    counts[row.decision]++
    totals[row.decision]++
    if (row.celeb_id !== original.celeb_id || row.content_id !== original.content_id) fail('relation identity changed')
    if (row.before !== original.current_review || row.review_en_before !== original.review_en) fail('before differs from assigned original')
    if (row.source_url !== original.source_url) fail('source_url differs from assigned original')
    if (typeof row.after !== 'string' || !row.after.trim()) fail('Korean result is empty or not a string')
    if (row.review_en_after !== null && typeof row.review_en_after !== 'string') fail('English result is neither a string nor null')
    const changed = row.before !== row.after || row.review_en_before !== row.review_en_after
    if (row.decision !== 'revise' && changed) fail('keep changed the original')
    if (row.decision === 'revise' && !changed) fail('revise has no change')
    if (typeof row.reason !== 'string' || !row.reason.trim()) fail('missing reason')
  }
  progress.push({
    name: group.name,
    assigned: originals.size,
    processed: counts.keep + counts.revise,
    ...counts,
    updatedAt: resultNames.length ? new Date(Math.max(...resultNames.map((name) => fs.statSync(path.join(dir, name)).mtimeMs))).toISOString() : null,
  })
}

const unassigned = [...inventoryIds].filter((id) => !assigned.has(id))
if (unassigned.length) errors.push(`${unassigned.length} inventory relations are unassigned`)
console.log(JSON.stringify({
  inventory: inventory.rows.length,
  assigned: assigned.size,
  processed: processed.size,
  pending: inventoryIds.size - processed.size,
  ...totals,
  groups: progress,
  errors,
}, null, 2))
if (errors.length) process.exitCode = 1
