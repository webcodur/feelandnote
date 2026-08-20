import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  argOf,
  laneOf,
  parseLane,
  readLedger,
  writeLedger,
  type LedgerEntry,
  type LedgerPhase,
  type RecordItem,
} from './lib'

const PHASES = new Set<LedgerPhase>(['draft', 'confirm', 'skip'])

type RecordFile = {
  lane?: number
  phase?: LedgerPhase
  items: RecordItem[]
}

function asPhase(raw: unknown): LedgerPhase | undefined {
  return typeof raw === 'string' && PHASES.has(raw as LedgerPhase) ? (raw as LedgerPhase) : undefined
}

export function record(): void {
  const file = argOf('file')
  if (!file) throw new Error('--file=<초안|개편 JSON>')
  const body = JSON.parse(readFileSync(path.resolve(file), 'utf8')) as RecordFile
  if (!Array.isArray(body.items) || body.items.length === 0) throw new Error('items 가 비었다')
  const defaultPhase = asPhase(body.phase)
  const lane = body.lane !== undefined ? parseLane(String(body.lane)) : parseLane(argOf('lane'))
  const now = new Date().toISOString()
  const existing = readLedger(lane)
  const byId = new Map(existing.map((e) => [e.id, e]))

  for (const item of body.items) {
    if (!item.id) throw new Error('item.id 필요')
    if (laneOf(item.id) !== lane) throw new Error(`${item.id} 는 레인 ${lane} 이 아니다`)
    const phase = asPhase(item.phase) ?? defaultPhase
    if (!phase) throw new Error(`${item.id}: phase 필요 (draft|confirm|skip)`)
    const prev = byId.get(item.id)
    if (prev?.phase === 'confirm' && phase === 'draft') continue
    if (prev?.applied && phase !== 'confirm') continue
    const next: LedgerEntry = {
      id: item.id,
      slug: item.slug ?? prev?.slug ?? null,
      lane,
      phase,
      headline: item.headline ?? prev?.headline ?? null,
      headline_en: item.headline_en ?? prev?.headline_en ?? null,
      applied: phase === 'confirm' ? false : prev?.applied,
      at: now,
    }
    byId.set(item.id, next)
  }

  const merged = [...byId.values()].sort((a, b) => (a.slug ?? a.id).localeCompare(b.slug ?? b.id))
  writeLedger(lane, merged)
  console.log(`record lane=${lane} items=${body.items.length} → 원장 ${merged.length}`)
}
