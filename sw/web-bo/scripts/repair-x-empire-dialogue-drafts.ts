/**
 * X-Empire의 quote 한 칸에 선택안과 후보안이 함께 붙은 7개 배치를 교정한다.
 *
 * 선택된 본문은 이미 quote_chunks / quote_en / quote_origin 네 필드가 합의하고 있다.
 * 새 문장을 쓰지 않고 quote를 quote_chunks 재조립값으로 되돌린다.
 *
 * 기본은 dry-run:
 *   pnpm exec tsx scripts/repair-x-empire-dialogue-drafts.ts
 * 실제 반영:
 *   pnpm exec tsx scripts/repair-x-empire-dialogue-drafts.ts --apply
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const TARGETS = new Map<string, string>([
  ['15197b4c-0a3e-4328-a01d-5925f170a65b', '로스 노딘'],
  ['34ccf317-893b-4b33-bb2d-e4a41e3a7da8', '알렉스 스파이로'],
  ['949d64fc-534c-4210-8a16-6b50bb787b3d', '알렉스 스파이로'],
  ['6b8d2bbe-abae-412b-a1fe-a1476f93da00', '안토니오 그라시아스'],
  ['bf994476-5631-473a-98df-e061954c4d85', '안토니오 그라시아스'],
  ['b7a48961-4f8b-4dca-8937-431729bf8127', '앤드루 머스크'],
  ['895033db-962a-4160-ab01-a71cfe821522', '제임스 머스크'],
])

type PersonRow = {
  id: string
  name: string
  quote: string | null
  quote_en: string | null
  quote_origin: string | null
  quote_chunks: unknown
  quote_en_chunks: unknown
}

function chunks(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw new Error(`${label}: 배열이 아님`)
  const out = value.map(item => typeof item === 'string' ? item.trim() : '').filter(Boolean)
  if (!out.length) throw new Error(`${label}: 빈 배열`)
  return out
}

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

async function main() {
  const apply = process.argv.includes('--apply')

  // 이미 공개된 뒤에는 이 수선 자체를 중단한다. 업로드 영상의 대사는 보호 대상이다.
  const lineupPath = path.resolve(process.cwd(), '../remotion/scripts/youtube/faction-lineup.json')
  const lineup = JSON.parse(await readFile(lineupPath, 'utf8')) as Record<string, { uploads?: Record<string, unknown> }>
  if (Object.keys(lineup['X-Empire']?.uploads ?? {}).length) {
    throw new Error('X-Empire에 업로드 기록이 생겼다. 공개 대사 보호 규칙에 따라 자동 교정을 중단한다.')
  }

  const { data, error } = await db
    .from('faction_people')
    .select('id, name, quote, quote_en, quote_origin, quote_chunks, quote_en_chunks')
    .in('id', [...TARGETS.keys()])
    .order('id')
  if (error) throw new Error(`대상 조회 실패: ${error.message}`)

  const rows = (data ?? []) as unknown as PersonRow[]
  if (rows.length !== TARGETS.size) {
    const found = new Set(rows.map(row => row.id))
    const missing = [...TARGETS.keys()].filter(id => !found.has(id))
    throw new Error(`대상 행 누락: ${missing.join(', ')}`)
  }

  const changes: { row: PersonRow; selected: string }[] = []
  for (const row of rows) {
    const expectedName = TARGETS.get(row.id)
    if (row.name !== expectedName) throw new Error(`${row.id}: 예상 인물 ${expectedName}, 실제 ${row.name}`)

    const selected = chunks(row.quote_chunks, `${row.name} quote_chunks`).join(' ')
    const selectedEn = chunks(row.quote_en_chunks, `${row.name} quote_en_chunks`).join(' ')
    const current = row.quote?.trim() ?? ''
    const currentEn = row.quote_en?.trim() ?? ''

    if (!row.quote_origin?.trim()) throw new Error(`${row.name}: quote_origin 없음`)
    if (compact(currentEn) !== compact(selectedEn)) {
      throw new Error(`${row.name}: quote_en과 quote_en_chunks 불일치`)
    }
    if (compact(current) === compact(selected)) {
      console.log(`SKIP  ${row.id} ${row.name} — 이미 선택안만 남아 있음`)
      continue
    }
    if (!current.startsWith(`${selected}\n\n`)) {
      throw new Error(`${row.name}: quote 첫 문단과 quote_chunks가 다름`)
    }
    if (!/(?:^|\n)\s*\(?\d+\s*안(?:\s|[·:：.)])/.test(current)) {
      throw new Error(`${row.name}: 후보안 표식 없음 — 자동 축약 금지`)
    }

    changes.push({ row, selected })
    console.log(`PLAN  ${row.id} ${row.name} ${current.length}자 → ${selected.length}자`)
    console.log(`      ${selected}`)
  }

  if (!apply) {
    console.log(`DRY-RUN 변경 예정 ${changes.length}건 · DB 쓰기 0건`)
    return
  }

  let updated = 0
  for (const { row, selected } of changes) {
    const { data: changed, error: updateError } = await db
      .from('faction_people')
      .update({ quote: selected })
      .eq('id', row.id)
      .eq('quote', row.quote)
      .select('id, quote')
      .maybeSingle()
    if (updateError) throw new Error(`${row.name} 갱신 실패: ${updateError.message}`)
    if (!changed) throw new Error(`${row.name} 갱신 충돌: 읽은 뒤 값이 바뀜`)
    if (compact(changed.quote as string) !== compact(selected)) throw new Error(`${row.name} 갱신 후 값 불일치`)
    updated++
    console.log(`UPDATE ${row.id} ${row.name}`)
  }

  console.log(`APPLIED ${updated}건`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
