import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  APPLY_CHUNK_SIZE,
  APPLY_CHUNK_PAUSE_MS,
  chunkItems,
  createHeadlineStore,
  runHeadlineApply,
  syncHeadlineChunk,
  UPDATE_HEADLINES_SQL,
  writeJsonAtomically,
  type HeadlinePatch,
  type HeadlineRow,
  type HeadlineStore,
} from './apply'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LedgerEntry } from './lib'

function patch(index: number): HeadlinePatch {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    headline: `한국어 ${index}`,
    headline_en: `English ${index}`,
  }
}

function ledgerEntry(index: number): LedgerEntry {
  const item = patch(index)
  return {
    ...item,
    slug: `person-${index}`,
    lane: 0,
    phase: 'confirm',
    at: '2026-08-20T00:00:00.000Z',
  }
}

class MemoryStore implements HeadlineStore {
  readonly rows = new Map<string, HeadlineRow>()
  readonly updateBatches: HeadlinePatch[][] = []
  failUpdateAt = 0

  constructor(entries: LedgerEntry[]) {
    for (const entry of entries) {
      this.rows.set(entry.id, { id: entry.id, headline: 'old', headline_en: 'Old' })
    }
  }

  async read(ids: string[]): Promise<HeadlineRow[]> {
    return ids.flatMap((id) => {
      const row = this.rows.get(id)
      return row ? [{ ...row }] : []
    })
  }

  async update(patches: HeadlinePatch[]): Promise<void> {
    this.updateBatches.push(patches.map((item) => ({ ...item })))
    if (this.failUpdateAt === this.updateBatches.length) throw new Error('의도한 DB 실패')
    for (const item of patches) this.rows.set(item.id, { ...item })
  }
}

test('100행 단위로 나눠 DB 트리거의 200태그 묶음과 맞춘다', () => {
  assert.equal(APPLY_CHUNK_SIZE, 100)
  assert.equal(APPLY_CHUNK_PAUSE_MS, 1_500)
  assert.deepEqual(chunkItems(Array.from({ length: 205 }, (_, i) => i)).map((items) => items.length), [
    100,
    100,
    5,
  ])
})

test('원장 체크포인트는 임시 파일을 교체해 항상 완전한 JSON을 남긴다', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'headline-apply-'))
  const file = path.join(directory, 'lane.json')
  try {
    writeJsonAtomically(file, [{ id: 'before' }])
    writeJsonAtomically(file, [{ id: 'after' }, { id: 'complete' }])
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), [{ id: 'after' }, { id: 'complete' }])
  } finally {
    unlinkSync(file)
    rmdirSync(directory)
  }
})

test('한 청크는 다건 쓰기 한 번 뒤 모든 행을 독립 조회해 검증한다', async () => {
  const entries = Array.from({ length: 3 }, (_, i) => ledgerEntry(i))
  const store = new MemoryStore(entries)

  const result = await syncHeadlineChunk(store, entries.map(({ id, headline, headline_en }) => ({
    id,
    headline: headline!,
    headline_en: headline_en!,
  })))

  assert.equal(result.changedRows, 3)
  assert.deepEqual(store.updateBatches.map((items) => items.length), [3])
  assert.equal(store.rows.get(entries[2].id)?.headline, '한국어 2')
})

test('DB에 이미 같은 값이면 재실행 때 쓰기를 생략하고 검증만 한다', async () => {
  const entries = [ledgerEntry(1), ledgerEntry(2)]
  const store = new MemoryStore(entries)
  for (const entry of entries) {
    store.rows.set(entry.id, {
      id: entry.id,
      headline: entry.headline,
      headline_en: entry.headline_en,
    })
  }

  const result = await syncHeadlineChunk(store, entries.map(({ id, headline, headline_en }) => ({
    id,
    headline: headline!,
    headline_en: headline_en!,
  })))

  assert.equal(result.changedRows, 0)
  assert.equal(store.updateBatches.length, 0)
})

test('DB에 없는 ID가 있으면 UPDATE 전에 중단한다', async () => {
  const entry = ledgerEntry(1)
  const store = new MemoryStore([])

  await assert.rejects(
    syncHeadlineChunk(store, [{
      id: entry.id,
      headline: entry.headline!,
      headline_en: entry.headline_en!,
    }]),
    /DB에 없는 인물/,
  )
  assert.equal(store.updateBatches.length, 0)
})

test('다건 쓰기는 INSERT 없이 JSON 파라미터를 받는 단일 UPDATE 문장만 실행한다', async () => {
  const item = patch(7)
  const calls: Array<{ query: string; parameters: unknown[] }> = []
  const store = createHeadlineStore({} as SupabaseClient, async (query, parameters) => {
    calls.push({ query, parameters })
    return []
  })

  await store.update([item])

  assert.equal(calls.length, 1)
  assert.equal(calls[0].query, UPDATE_HEADLINES_SQL)
  assert.match(calls[0].query, /update public\.celebs as celeb/i)
  assert.doesNotMatch(calls[0].query, /\binsert\b/i)
  assert.deepEqual(JSON.parse(calls[0].parameters[0] as string), [item])
})

test('두 번째 청크 실패 시 첫 청크 체크포인트만 남겨 재실행할 수 있다', async () => {
  const entries = Array.from({ length: 150 }, (_, i) => ledgerEntry(i))
  const store = new MemoryStore(entries)
  store.failUpdateAt = 2
  const checkpoints: LedgerEntry[][] = []
  const pauses: number[] = []

  await assert.rejects(
    runHeadlineApply([0], true, store, {
      readLane: () => entries,
      checkpointLane: (_lane, saved) => checkpoints.push(structuredClone(saved)),
      log: () => undefined,
      now: () => '2026-08-20T01:02:03.000Z',
      pause: async (milliseconds) => { pauses.push(milliseconds) },
    }),
    /의도한 DB 실패/,
  )

  assert.equal(checkpoints.length, 1)
  assert.equal(checkpoints[0].filter((entry) => entry.applied).length, 100)
  assert.equal(checkpoints[0].filter((entry) => !entry.applied).length, 50)
  assert.deepEqual(store.updateBatches.map((items) => items.length), [100, 50])
  assert.deepEqual(pauses, [APPLY_CHUNK_PAUSE_MS])
})

test('청크 전수 readback이 다르면 원장 체크포인트를 만들지 않는다', async () => {
  const entries = [ledgerEntry(1), ledgerEntry(2)]
  const store = new MemoryStore(entries)
  const originalRead = store.read.bind(store)
  let reads = 0
  store.read = async (ids) => {
    const rows = await originalRead(ids)
    reads++
    if (reads === 2) rows[1].headline_en = '검증 불일치'
    return rows
  }
  let checkpoints = 0

  await assert.rejects(
    runHeadlineApply([0], true, store, {
      readLane: () => entries,
      checkpointLane: () => { checkpoints++ },
      log: () => undefined,
    }),
    /반영 검증 실패/,
  )

  assert.equal(checkpoints, 0)
  assert.equal(entries.some((entry) => entry.applied), false)
})
