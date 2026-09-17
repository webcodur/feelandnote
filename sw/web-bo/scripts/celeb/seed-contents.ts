/**
 * new-figures 감상내역 일괄 반영 — contents/*.json(닉네임 키) → contents + content_locales + celeb_contents.
 *
 *   pnpm --dir sw/web-bo exec tsx scripts/celeb/seed-contents.ts          # dry-run
 *   pnpm --dir sw/web-bo exec tsx scripts/celeb/seed-contents.ts --apply  # 반영
 *
 * - 작품 마스터는 제목(ko/en)·유형·제작자로 기존 contents를 찾고, 없으면 만든다
 *   (external_source/external_id는 비워 둔다 — API 수집분이 아닌 수동 조사분).
 * - celeb_contents는 (celeb_id, content_id) 기존 행이 있으면 건너뛴다.
 * - review·review_en·source_url·status(FINISHED/WANT)를 그대로 넣는다.
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env'), quiet: true })
const APPLY = process.argv.includes('--apply')
const C_DIR = resolve(__dirname, '../../../../data/celeb/new-figures/contents')
const LEDGER_DIR = resolve(__dirname, '../../../../data/celeb/new-figures')

interface Draft {
  type: string; title: string; title_en?: string | null; creator?: string | null
  year?: number | null; status: string; source_url?: string | null
  evidence?: string; review?: string | null; review_en?: string | null
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

async function main() {
  const url = process.env.NEXT_PUBLIC_DB_API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.DB_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('DB 접속 env 필요')
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const ledger = new Map<string, string>()
  for (const f of readdirSync(LEDGER_DIR)) {
    if (!f.endsWith('.json')) continue
    const rows = JSON.parse(readFileSync(resolve(LEDGER_DIR, f), 'utf8'))
    if (!Array.isArray(rows)) continue
    for (const r of rows) if (r.nickname && r.celeb_id) ledger.set(r.nickname, r.celeb_id)
  }

  // 항목 수집 + 작품 단위 dedup
  interface Item { celeb_id: string; nick: string; d: Draft }
  const items: Item[] = []
  const problems: string[] = []
  for (const f of readdirSync(C_DIR)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue
    const d = JSON.parse(readFileSync(resolve(C_DIR, f), 'utf8'))
    for (const [nick, r] of Object.entries(d as Record<string, { contents?: Draft[] }>)) {
      const cid = ledger.get(nick)
      if (!cid) { problems.push(`원장 없음: ${nick}`); continue }
      for (const c of r.contents ?? []) {
        if (!c.type || !c.title) { problems.push(`${nick}: type/title 누락`); continue }
        if (!['BOOK', 'VIDEO', 'GAME', 'MUSIC'].includes(c.type)) { problems.push(`${nick}: 유효하지 않은 type ${c.type}`); continue }
        if (!['FINISHED', 'WANT'].includes(c.status)) { problems.push(`${nick}: 유효하지 않은 status ${c.status}`); continue }
        items.push({ celeb_id: cid, nick, d: c })
      }
    }
  }

  const contentKey = (d: Draft) => `${d.type}|${norm(d.title)}|${norm(d.title_en)}|${norm(d.creator)}`
  const unique = new Map<string, Draft>()
  for (const it of items) unique.set(contentKey(it.d), it.d)

  // 기존 작품 매칭 — 제목으로 content_locales를 한 번에 긁는다
  const allTitles = [...new Set([...unique.values()].flatMap(d => [d.title, d.title_en].filter(Boolean) as string[]))]
  const byTitle = new Map<string, Array<{ content_id: string; creator: string | null; locale: string }>>()
  const contentTypeById = new Map<string, string>()
  for (let i = 0; i < allTitles.length; i += 50) {
    const { data, error } = await db.from('content_locales')
      .select('content_id, title, creator, locale')
      .in('title', allTitles.slice(i, i + 50))
    if (error) throw error
    const ids = [...new Set((data ?? []).map(r => r.content_id))]
    for (let j = 0; j < ids.length; j += 200) {
      const { data: cs, error: e2 } = await db.from('contents').select('id,type').in('id', ids.slice(j, j + 200))
      if (e2) throw e2
      for (const c of cs ?? []) contentTypeById.set(c.id, c.type)
    }
    for (const r of data ?? []) {
      const list = byTitle.get(norm(r.title)) ?? []
      list.push({ content_id: r.content_id, creator: r.creator, locale: r.locale })
      byTitle.set(norm(r.title), list)
    }
  }

  const existingContent = new Map<string, string>() // contentKey → content_id
  let matched = 0
  for (const [key, d] of unique) {
    const candidates = new Map<string, string[]>() // content_id → creators
    for (const t of [d.title, d.title_en]) {
      for (const hit of byTitle.get(norm(t)) ?? []) {
        if (contentTypeById.get(hit.content_id) !== d.type) continue
        candidates.set(hit.content_id, [...(candidates.get(hit.content_id) ?? []), norm(hit.creator)])
      }
    }
    const wantCreator = norm(d.creator)
    for (const [cid, creators] of candidates) {
      // 제작자가 둘 다 비거나, 한쪽이 다른 쪽을 포함하면 같은 작품으로 본다
      if (!wantCreator || creators.some(c => !c || c.includes(wantCreator) || wantCreator.includes(c))) {
        existingContent.set(key, cid); matched++; break
      }
    }
  }

  // 기존 celeb_contents 쌍
  const celebIds = [...new Set(items.map(i => i.celeb_id))]
  const existingPairs = new Set<string>()
  for (let i = 0; i < celebIds.length; i += 100) {
    const { data, error } = await db.from('celeb_contents').select('celeb_id,content_id').in('celeb_id', celebIds.slice(i, i + 100))
    if (error) throw error
    for (const r of data ?? []) existingPairs.add(`${r.celeb_id}|${r.content_id}`)
  }

  console.log(`=== ${APPLY ? 'APPLY' : 'DRY-RUN'} ===`)
  console.log(`감상내역 항목 ${items.length}건 / 고유 작품 ${unique.size}개 (기존 작품 매칭 ${matched}, 신규 생성 ${unique.size - matched})`)
  if (problems.length) { console.log('⛔ 문제:'); problems.slice(0, 20).forEach(p => console.log('  -', p)); process.exit(1) }
  if (!APPLY) { console.log('(dry-run — --apply로 반영)'); return }

  // 1. 신규 작품 생성
  const contentId = new Map<string, string>(existingContent)
  for (const [key, d] of unique) {
    if (contentId.has(key)) continue
    const { data: c, error } = await db.from('contents').insert({
      type: d.type,
      release_date: d.year ? `${String(d.year).padStart(4, '0')}-01-01` : null,
      metadata: d.year ? { year: d.year } : {},
    }).select('id').single()
    if (error) { console.log(`⛔ contents 실패 ${d.title}: ${error.message}`); process.exit(1) }
    const locs = [
      { content_id: c.id, locale: 'ko', title: d.title, creator: d.creator ?? null, sources: { primary: 'manual-research' }, verified: true },
      ...(d.title_en ? [{ content_id: c.id, locale: 'en', title: d.title_en, creator: d.creator ?? null, sources: { primary: 'manual-research' }, verified: true }] : []),
    ]
    const { error: le } = await db.from('content_locales').insert(locs)
    if (le) { console.log(`⛔ content_locales 실패 ${d.title}: ${le.message}`); process.exit(1) }
    contentId.set(key, c.id)
  }
  console.log(`작품 생성: ${unique.size - matched}개`)

  // 2. celeb_contents 연결
  const rows: object[] = []
  let dupSkip = 0
  const seen = new Set<string>()
  for (const it of items) {
    const cid = contentId.get(contentKey(it.d))!
    const pair = `${it.celeb_id}|${cid}`
    if (existingPairs.has(pair) || seen.has(pair)) { dupSkip++; continue }
    seen.add(pair)
    rows.push({
      celeb_id: it.celeb_id, content_id: cid,
      status: it.d.status, review: it.d.review ?? null, review_en: it.d.review_en ?? null,
      source_url: it.d.source_url ?? null, visibility: 'public', is_spoiler: false,
    })
  }
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await db.from('celeb_contents').insert(rows.slice(i, i + 100))
    if (error) { console.log(`⛔ celeb_contents 실패(${i}~): ${error.message}`); process.exit(1) }
  }
  console.log(`celeb_contents 삽입: ${rows.length}건, 중복 스킵: ${dupSkip}건`)

  // 3. readback
  const { data: check } = await db.from('celeb_contents').select('id').in('celeb_id', celebIds)
  console.log(`readback — 대상 인물들의 celeb_contents 총 ${check?.length ?? 0}행`)
  console.log('완료')
}

main().catch(e => { console.error(e); process.exit(1) })
