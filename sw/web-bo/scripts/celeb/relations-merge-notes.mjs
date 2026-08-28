import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { codexCall, looksRateLimited } from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'

const root = resolve(process.cwd(), '../..')
const dir = resolve(root, 'data/celeb/relations-consolidation')
const candidatesPath = resolve(dir, 'candidates.json')
const outputPath = resolve(dir, 'merged-notes.json')
const batchSize = 30
const concurrency = 5
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='))
const limit = limitArg ? Number(limitArg.split('=')[1]) : Number.POSITIVE_INFINITY

const prepared = JSON.parse(readFileSync(candidatesPath, 'utf8'))
const state = existsSync(outputPath)
  ? JSON.parse(readFileSync(outputPath, 'utf8'))
  : { source_sha256: prepared.source_sha256, results: {}, failures: {} }
if (state.source_sha256 !== prepared.source_sha256) throw new Error('Source hash changed. Rebuild candidates first.')

const targets = prepared.candidates
  .filter((candidate) => candidate.needs_merge && !state.results[candidate.fact_key])
  .slice(0, limit)
const batches = Array.from({ length: Math.ceil(targets.length / batchSize) }, (_, index) =>
  targets.slice(index * batchSize, (index + 1) * batchSize))

function save() {
  writeFileSync(outputPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
}

function promptOf(batch) {
  const items = batch.map((candidate) => ({
    fact_key: candidate.fact_key,
    from_name: candidate.from_name,
    from_name_en: candidate.from_name_en,
    to_name: candidate.to_name,
    to_name_en: candidate.to_name_en,
    rel_type: candidate.rel_type,
    ko_notes: [...new Set(candidate.old_rows.map((row) => row.note).filter(Boolean))],
    en_notes: [...new Set(candidate.old_rows.map((row) => row.note_en).filter(Boolean))],
  }))
  return `다음은 같은 두 사람의 같은 관계를 양쪽 관점으로 두 번 쓴 기록이다. 각 항목을 두 사람이 함께 쓰는 관계 설명 한 벌로 합쳐라.

규칙:
- 입력 문장에 있는 사실만 쓴다. 검색·도구·파일을 사용하지 말고 새 사실이나 인과를 만들지 않는다.
- 한국어 note는 두 사람 이름을 직접 쓰고, 각자가 한 행동과 상대에게 생긴 변화가 이어지게 1~2문장으로 쓴다.
- 중복 사실은 한 번만 쓴다. 서로 다른 날짜·행동·결과는 빠뜨리지 않는다.
- 사람이 주어가 되어 기본 동사로 끝낸다. 번역투, 평론, 감동 결론, 은유를 쓰지 않는다.
- 포개다·벼리다·빚어내다·꿰뚫다·스며들다·길어 올리다·자리 잡다·발돋움하다와 em dash(—)를 쓰지 않는다.
- note_en도 같은 사실을 자연스러운 영어 1~2문장으로 쓴다.
- 두 입력이 실제로 충돌해 하나로 합칠 수 없으면 status를 review로 하고 note와 note_en을 null로 둔다.
- JSON 배열만 출력한다. 설명이나 코드 펜스를 붙이지 않는다.
- 입력 순서와 fact_key를 그대로 유지한다.

출력 형식:
[{"fact_key":"...","status":"ok|review","note":"...|null","note_en":"...|null"}]

입력:
${JSON.stringify(items)}`
}

function parseResult(text, batch) {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end < start) throw new Error('JSON array missing')
  const rows = JSON.parse(text.slice(start, end + 1))
  if (!Array.isArray(rows) || rows.length !== batch.length) throw new Error('Result count mismatch')
  const expected = new Set(batch.map((item) => item.fact_key))
  for (const row of rows) {
    if (!expected.delete(row.fact_key)) throw new Error(`Unexpected key ${row.fact_key}`)
    if (!['ok', 'review'].includes(row.status)) throw new Error(`Invalid status ${row.fact_key}`)
    if (row.status === 'ok' && (!row.note || !row.note_en)) throw new Error(`Missing note ${row.fact_key}`)
    if (row.note && /—|포개|벼리|빚어내|꿰뚫|스며들|길어 올|자리 잡|발돋움|공개히/.test(row.note)) {
      throw new Error(`Forbidden prose ${row.fact_key}`)
    }
  }
  return rows
}

let nextBatch = 0
let completed = 0
let stoppedByRate = false

async function worker() {
  while (!stoppedByRate) {
    const index = nextBatch
    nextBatch += 1
    const batch = batches[index]
    if (!batch) return
    try {
      const text = await codexCall(promptOf(batch), { model: 'gpt-5.6-sol', effort: 'medium', timeoutMs: 300000 })
      const rows = parseResult(text, batch)
      for (const row of rows) {
        state.results[row.fact_key] = row
        delete state.failures[row.fact_key]
      }
      completed += batch.length
      save()
      console.log(`merged ${completed}/${targets.length}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      for (const item of batch) state.failures[item.fact_key] = message.slice(0, 600)
      save()
      console.error(`batch ${index + 1} failed: ${message}`)
      if (looksRateLimited(message)) stoppedByRate = true
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, () => worker()))
console.log(JSON.stringify({ requested: targets.length, completed, remaining: prepared.needs_merge_count - Object.keys(state.results).length, stoppedByRate }, null, 2))
