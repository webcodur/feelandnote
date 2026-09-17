/**
 * new-figures 관계망 일괄 반영 — relations/*.json(닉네임 키) → celeb_relations(source='manual').
 *
 *   pnpm --dir sw/web-bo exec tsx scripts/celeb/seed-relations.ts          # dry-run
 *   pnpm --dir sw/web-bo exec tsx scripts/celeb/seed-relations.ts --apply  # 반영
 *
 * - 양끝이 모두 celebs에 있을 때만 넣는다(위키데이터 수집기와 같은 규약).
 *   to_ko→nickname, to_en→nickname_en으로 해석하며 prospect 판정과 무관하게 존재하면 연결한다.
 * - rel_type은 "to_id가 from_id에게 무엇인가" — 조사 데이터도 같은 방향이라 그대로 쓴다.
 *   canonicalizeCelebRelation으로 대칭형 정렬을 맞추고 factKey로 기존 행·배치 내 중복을 걸러낸다.
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { canonicalizeCelebRelation, celebRelationFactKey } from '@feelandnote/shared/constants/celeb-relations'

config({ path: resolve(process.cwd(), '.env'), quiet: true })
const APPLY = process.argv.includes('--apply')
const R_DIR = resolve(__dirname, '../../../../data/celeb/new-figures/relations')
const LEDGER_DIR = resolve(__dirname, '../../../../data/celeb/new-figures')

const REL_GROUP: Record<string, string> = {
  father: 'family', mother: 'family', parent: 'family', child: 'family',
  spouse: 'family', partner: 'family', sibling: 'family', relative: 'family',
  teacher: 'thought', student: 'thought', influence: 'thought', influenced: 'thought',
  cofounder: 'career', colleague: 'career', counterpart: 'counterpart',
  friend: 'friendship', rival: 'rivalry',
}

interface Edge { to_ko?: string; to_en?: string; rel_type: string; note_ko?: string; note_en?: string; prospect?: string }

async function main() {
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) throw new Error('DB 접속 env(NEXT_PUBLIC_DB_API_URL/DB_SECRET_KEY)가 필요합니다.')
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const ledger = new Map<string, string>()
  for (const f of readdirSync(LEDGER_DIR)) {
    if (!f.endsWith('.json')) continue
    const rows = JSON.parse(readFileSync(resolve(LEDGER_DIR, f), 'utf8'))
    if (!Array.isArray(rows)) continue
    for (const r of rows) if (r.nickname && r.celeb_id) ledger.set(r.nickname, r.celeb_id)
  }

  const edges: Array<{ fromNick: string; e: Edge }> = []
  for (const f of readdirSync(R_DIR)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue
    const d = JSON.parse(readFileSync(resolve(R_DIR, f), 'utf8'))
    for (const [nick, r] of Object.entries(d as Record<string, { relations?: Edge[] }>)) {
      for (const e of r.relations ?? []) edges.push({ fromNick: nick, e })
    }
  }

  // 조사 파일의 한글 표기가 DB와 다른 기등록 인물 — 손으로 잡은 별명 대응표
  const FROM_ALIAS: Record<string, string> = {
    '드미스 하사비스': '데미스 허사비스',
    '애런 스워츠': '애런 슈워츠',
    '필 짐머먼': '필 짐머만',
    '놀란 부시넬': '놀런 부슈널',
    '팔머 러키': '팔머 럭키',
  }

  // 대상 이름 → celeb_id 해석(기존 + 신규 등록분 전부). 출발점 중 기등록 인물도 포함한다
  const targetNames = new Set<string>(Object.values(FROM_ALIAS))
  for (const { fromNick, e } of edges) {
    if (!ledger.has(fromNick)) targetNames.add(fromNick)
    if (e.to_ko) targetNames.add(e.to_ko)
    if (e.to_en) targetNames.add(e.to_en)
  }
  const idByName = new Map<string, string>()
  const names = [...targetNames]
  for (let i = 0; i < names.length; i += 50) {
    const chunk = names.slice(i, i + 50)
    const { data, error } = await db.from('celebs').select('id,nickname,nickname_en')
      .or(`nickname.in.(${chunk.map(n => `"${n.replace(/"/g, '')}"`).join(',')}),nickname_en.in.(${chunk.map(n => `"${n.replace(/"/g, '')}"`).join(',')})`)
    if (error) throw error
    for (const c of data ?? []) {
      if (c.nickname) idByName.set(c.nickname, c.id)
      if (c.nickname_en) idByName.set(c.nickname_en, c.id)
    }
  }
  // in()/or() 조합에서 떨어진 별명 대응표 값은 직접 조회로 보강한다
  for (const dbName of Object.values(FROM_ALIAS)) {
    if (idByName.has(dbName)) continue
    const { data } = await db.from('celebs').select('id,nickname').eq('nickname', dbName).maybeSingle()
    if (data) idByName.set(data.nickname, data.id)
  }

  // 기존 관계 factKey — 기본 페이지 한도(1000)를 넘으므로 전수 페이징
  const existingKeys = new Set<string>()
  for (let off = 0; ; off += 1000) {
    const { data: existing, error } = await db.from('celeb_relations')
      .select('from_id,to_id,rel_type').range(off, off + 999)
    if (error) throw error
    if (!existing?.length) break
    for (const r of existing) {
      existingKeys.add(celebRelationFactKey({ fromId: r.from_id, toId: r.to_id, relType: r.rel_type }))
    }
    if (existing.length < 1000) break
  }

  const rows: object[] = []
  const seen = new Set<string>()
  let unresolved = 0, dupes = 0, missingFrom = 0
  const unresolvedNames = new Set<string>()
  for (const { fromNick, e } of edges) {
    const fromId = ledger.get(fromNick) ?? idByName.get(fromNick) ?? idByName.get(FROM_ALIAS[fromNick] ?? '')
    if (!fromId) { missingFrom++; unresolvedNames.add(fromNick); continue }
    const toId = (e.to_ko && idByName.get(e.to_ko)) || (e.to_en && idByName.get(e.to_en))
    if (!toId) { unresolved++; if (e.to_ko) unresolvedNames.add(e.to_ko); continue }
    if (!REL_GROUP[e.rel_type]) { console.log(`⛔ 알 수 없는 rel_type: ${e.rel_type}`); continue }
    const canon = canonicalizeCelebRelation({ fromId, toId, relType: e.rel_type })
    const key = celebRelationFactKey(canon)
    if (existingKeys.has(key) || seen.has(key)) { dupes++; continue }
    seen.add(key)
    rows.push({
      from_id: canon.fromId, to_id: canon.toId, rel_type: canon.relType,
      rel_group: REL_GROUP[canon.relType], source: 'manual',
      note: e.note_ko ?? null, note_en: e.note_en ?? null,
    })
  }

  console.log(`=== ${APPLY ? 'APPLY' : 'DRY-RUN'} ===`)
  console.log(`간선 ${edges.length}건 → 삽입 예정 ${rows.length}건`)
  console.log(`대상 미등록 스킵: ${unresolved}건 / 중복: ${dupes}건 / 출발점 미해석: ${missingFrom}건`)
  if (!APPLY) {
    console.log(`미해석 대상 샘플: ${[...unresolvedNames].slice(0, 15).join(', ')}`)
    console.log('(dry-run — --apply로 반영)'); return
  }

  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from('celeb_relations').insert(rows.slice(i, i + 100))
    if (error) { console.log(`⛔ 삽입 실패(${i}~): ${error.message}`); process.exit(1) }
  }
  const { count } = await db.from('celeb_relations').select('*', { count: 'exact', head: true })
  console.log(`삽입: ${rows.length}건 — celeb_relations 총 ${count}행`)
  console.log('완료')
}

main().catch(e => { console.error(e); process.exit(1) })
