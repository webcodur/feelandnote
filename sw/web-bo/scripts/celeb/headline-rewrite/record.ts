import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  argOf,
  HEADLINE_REVIEW_VERSION,
  laneOf,
  parseLane,
  readLedger,
  writeLedger,
  type LedgerEntry,
  type RecordItem,
} from './lib'

type ReviewPhase = 'confirm' | 'skip'
const PHASES = new Set<ReviewPhase>(['confirm', 'skip'])

type RecordFile = {
  lane?: number
  reviewVersion?: number
  phase?: ReviewPhase
  items: RecordItem[]
}

function asPhase(raw: unknown): ReviewPhase | undefined {
  return typeof raw === 'string' && PHASES.has(raw as ReviewPhase) ? (raw as ReviewPhase) : undefined
}

export function record(): void {
  const file = argOf('file')
  if (!file) throw new Error('--file=<최종 검수 JSON>')
  const body = JSON.parse(readFileSync(path.resolve(file), 'utf8')) as RecordFile
  if (!Array.isArray(body.items) || body.items.length === 0) throw new Error('items 가 비었다')
  if (body.reviewVersion !== HEADLINE_REVIEW_VERSION) {
    throw new Error(`reviewVersion=${HEADLINE_REVIEW_VERSION} 필요`)
  }
  const defaultPhase = asPhase(body.phase)
  const lane = body.lane !== undefined ? parseLane(String(body.lane)) : parseLane(argOf('lane'))
  const now = new Date().toISOString()
  const existing = readLedger(lane)
  const byId = new Map(existing.map((e) => [e.id, e]))

  for (const item of body.items) {
    if (!item.id) throw new Error('item.id 필요')
    if (laneOf(item.id) !== lane) throw new Error(`${item.id} 는 레인 ${lane} 이 아니다`)
    const phase = asPhase(item.phase) ?? defaultPhase
    if (!phase) throw new Error(`${item.id}: phase 필요 (confirm|skip)`)
    const headline = item.headline?.trim()
    const headlineEn = item.headline_en?.trim()
    if (!headline || !headlineEn) {
      throw new Error(`${item.id}: 최종 headline/headline_en 모두 필요`)
    }
    const prev = byId.get(item.id)
    const next: LedgerEntry = {
      id: item.id,
      slug: item.slug ?? prev?.slug ?? null,
      lane,
      phase,
      headline,
      headline_en: headlineEn,
      reviewVersion: HEADLINE_REVIEW_VERSION,
      applied: phase === 'confirm' ? false : prev?.applied,
      at: now,
    }
    byId.set(item.id, next)
  }

  const merged = [...byId.values()].sort((a, b) => (a.slug ?? a.id).localeCompare(b.slug ?? b.id))
  writeLedger(lane, merged)
  console.log(`record lane=${lane} items=${body.items.length} → 원장 ${merged.length}`)
}
