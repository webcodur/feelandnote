/**
 * 인물 읽어보기 릴레이 DB 반영 관문.
 * 규칙 SSoT: docs/project/celeb/person-reading.md
 *
 * 에이전트 산출 JSON을 받아 납품 검사를 통과한 행만 반영한다.
 *  - pass   : 본문 유지, review_status='ai_reviewed'만 기록
 *  - update : 한영 여섯 필드 + review_status='ai_reviewed' 동시 저장
 * 안전장치: human_reviewed 불가침, updated_at 조건부 갱신(동시 수정 감지),
 *           상투어 재유입·필드 누락·분량 미달 반려, 원장(ledger.json) 기록.
 *
 * 실행:
 *   pnpm exec tsx scripts/apply-celeb-reading-relay.ts --file=<결과.json> [--dry]
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const file = resolve(process.cwd(), '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const LEDGER_PATH = resolve(process.cwd(), '../../data/celeb/reading-relay/ledger.json')

type Item = {
  slug: string
  updated_at: string
  action: 'pass' | 'update'
  plain?: string
  title?: string
  interp?: string
  plain_en?: string
  title_en?: string
  interp_en?: string
}

// ---------- 납품 검사 ----------

const VAGUE_ENDING =
  /(영향을 (주었다|미쳤다|끼쳤다)|자리 잡았다|알려져 있다|널리 알려졌다|이름을 (알렸다|남겼다)|평가받는다|평가된다|평가를 받(는다|았다)|기여했다|손꼽힌다|꼽힌다|사랑받(았다|는다)|주목받(았다|는다)|인정받(았다|는다)|기틀을 놓았다|바탕이 되었다|토대가 되었다)\.?$/
const TRITE_INTERP = /(보여 ?준다|볼 수 있다|확인할 수 있다|인 셈이다|맞닿아 있다|놓여 있(다|었다))/

function lastSentence(text: string): string {
  const sents = text.replace(/\n+/g, ' ').trim().split(/(?<=다\.)\s+/).filter(Boolean)
  return (sents.at(-1) ?? '').trim()
}

function inspect(item: Item): string | null {
  if (item.action === 'pass') return null
  const fields = ['plain', 'title', 'interp', 'plain_en', 'title_en', 'interp_en'] as const
  for (const f of fields) {
    if (!item[f] || !item[f]!.trim()) return `필드 누락: ${f}`
  }
  if (item.plain!.length < 80) return `안내 분량 미달: ${item.plain!.length}자`
  if (item.interp!.length < 120) return `탐구 분량 미달: ${item.interp!.length}자`
  if (item.plain!.length > 700) return `안내 분량 초과: ${item.plain!.length}자`
  if (item.interp!.length > 800) return `탐구 분량 초과: ${item.interp!.length}자`
  if (VAGUE_ENDING.test(lastSentence(item.plain!))) return '안내 공허 마무리 재유입'
  if (TRITE_INTERP.test(item.interp!)) return '탐구 상투어 재유입'
  return null
}

// ---------- 원장 ----------

type LedgerEntry = { slug: string; action: string; result: string; at: string }

function appendLedger(entries: LedgerEntry[]) {
  const existing: LedgerEntry[] = existsSync(LEDGER_PATH)
    ? JSON.parse(readFileSync(LEDGER_PATH, 'utf8'))
    : []
  existing.push(...entries)
  writeFileSync(LEDGER_PATH, JSON.stringify(existing, null, 1), 'utf8')
}

// ---------- 실행 ----------

async function main() {
  const args = process.argv.slice(2)
  const filePath = args.find((a) => a.startsWith('--file='))?.slice(7)
  const dry = args.includes('--dry')
  if (!filePath) throw new Error('--file=<결과.json> 이 필요하다.')

  const items: Item[] = JSON.parse(readFileSync(filePath, 'utf8'))
  const ledger: LedgerEntry[] = []
  const now = new Date().toISOString()
  let applied = 0
  let passed = 0
  let rejected = 0
  let conflicted = 0

  for (const item of items) {
    const defect = inspect(item)
    if (defect) {
      console.log(`반려 ${item.slug}: ${defect}`)
      ledger.push({ slug: item.slug, action: item.action, result: `반려: ${defect}`, at: now })
      rejected++
      continue
    }

    const { data: celeb, error: celebError } = await supabase
      .from('celebs')
      .select('id')
      .eq('slug', item.slug)
      .single()
    if (celebError || !celeb) {
      console.log(`반려 ${item.slug}: 프로필 조회 실패`)
      rejected++
      continue
    }

    // human_reviewed 불가침. NULL은 SQL neq 필터에 걸리지 않으므로 사전 조회로 확인한다.
    const { data: current } = await supabase
      .from('celeb_explanations')
      .select('review_status')
      .eq('profile_id', celeb.id)
      .maybeSingle()
    if (current?.review_status === 'human_reviewed') {
      console.log(`보호 ${item.slug}: human_reviewed 행은 건드리지 않는다`)
      ledger.push({ slug: item.slug, action: item.action, result: '보호: human_reviewed', at: now })
      conflicted++
      continue
    }

    if (dry) {
      console.log(`[dry] ${item.action} ${item.slug}`)
      continue
    }

    const payload =
      item.action === 'pass'
        ? { review_status: 'ai_reviewed' }
        : {
            plain_text: item.plain,
            interpretive_title: item.title,
            interpretive_text: item.interp,
            plain_text_en: item.plain_en,
            interpretive_title_en: item.title_en,
            interpretive_text_en: item.interp_en,
            review_status: 'ai_reviewed',
          }

    const { data, error } = await supabase
      .from('celeb_explanations')
      .update(payload)
      .eq('profile_id', celeb.id)
      .eq('updated_at', item.updated_at)
      .select('profile_id')
      .maybeSingle()

    if (error) {
      console.log(`실패 ${item.slug}: ${error.message}`)
      ledger.push({ slug: item.slug, action: item.action, result: `실패: ${error.message}`, at: now })
      rejected++
    } else if (!data) {
      console.log(`충돌 ${item.slug}: 행이 그사이 바뀌었거나 human_reviewed다. 건너뜀`)
      ledger.push({ slug: item.slug, action: item.action, result: '충돌: 조건부 갱신 불일치', at: now })
      conflicted++
    } else {
      ledger.push({ slug: item.slug, action: item.action, result: '반영', at: now })
      if (item.action === 'pass') passed++
      else applied++
    }
  }

  if (!dry) appendLedger(ledger)
  console.log(
    JSON.stringify({ input: items.length, updated: applied, passMarked: passed, rejected, conflicted }),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
