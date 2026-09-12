/**
 * 언어 카드 정비(26.09.10~11)로 끊긴 기관 선정 목록 연결을 되살린다
 *
 * 두 갈래다.
 * 1) 작품 삭제 — `locale-dead-works.mjs`가 목록 참조를 보지 않고 지운 작품. 백업에서 작품 행을 되살리고,
 *    ko 카드에 들어 있던 수입 원서(영문 제목) 데이터는 en 카드로 옮겨 담은 뒤 목록에 다시 잇는다.
 *    한국어 제목은 표시용 제목 행(celeb-02-02)이 따로 맡는다.
 * 2) 작품 통합 — `merge-works.mjs`가 drop 행을 지우며 목록 연결을 keep으로 옮기지 않은 것. keep에 잇는다.
 *
 * 입력: --lost <json>  (26.09.02 대조표와 현재 DB를 비교해 뽑은 끊긴 항목 목록)
 * 백업: data/celeb/figure-books/locale-dead-works-backup.jsonl · locale-ko-2026-08-01-backup.jsonl · merge-candidates*.json
 * 기록: data/celeb/figure-books/curated-relink-log.jsonl
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/curated/relink-lost-items.ts --lost <path>          # 점검만
 *   npx tsx scripts/curated/relink-lost-items.ts --lost <path> --yes    # 반영
 */
import { createClient } from '@supabase/supabase-js'
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { REPO_ROOT } from '../lib/paths'

const ROOT = REPO_ROOT
function loadEnv(p: string) {
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv(join(ROOT, '.env')); loadEnv(join(ROOT, 'sw/web-bo/.env')); loadEnv(join(ROOT, 'sw/web/.env'))
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, (process.env.DB_SECRET_KEY || process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY)!)

const FB = join(ROOT, 'data/celeb/figure-books')
const LOG = join(FB, 'curated-relink-log.jsonl')
const go = process.argv.includes('--yes')
const lostPath = process.argv[process.argv.indexOf('--lost') + 1]
if (!lostPath) throw new Error('--lost <json> 이 필요하다')

type Lost = { id: string; listSlug: string; rawTitle: string; contentId: string; wasDead: boolean }
const lost: Lost[] = JSON.parse(readFileSync(lostPath, 'utf8'))

const deadContents = new Map<string, any>()
for (const line of readFileSync(join(FB, 'locale-dead-works-backup.jsonl'), 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line); deadContents.set(r.content.id, r.content)
}
const koBackup = new Map<string, any>()
for (const line of readFileSync(join(FB, 'locale-ko-2026-08-01-backup.jsonl'), 'utf8').split('\n').filter(Boolean)) {
  const r = JSON.parse(line); if (r.ko) koBackup.set(r.content_id, r.ko)
}
const dropToKeep = new Map<string, string>()
for (const f of readdirSync(FB).filter((n) => /^merge-candidates.*\.json$/.test(n))) {
  const j = JSON.parse(readFileSync(join(FB, f), 'utf8'))
  const arr = Array.isArray(j) ? j : (j.merges ?? [])
  for (const p of arr) if (p.drop && p.keep) dropToKeep.set(p.drop, p.keep)
}

const hasHangul = (s: unknown) => /[가-힣]/.test(String(s ?? ''))
const log = (row: Record<string, unknown>) => appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`, 'utf8')

async function main() {
  let restore = 0, repoint = 0, skip = 0
  const touchedLists = new Set<string>(); const touchedContents = new Set<string>()
  for (const it of lost) {
    const { data: cur } = await db.from('curated_list_items').select('id,list_id,content_id').eq('id', it.id).maybeSingle()
    if (!cur) { console.log(`  SKIP 항목 없음 ${it.listSlug} | ${it.rawTitle}`); skip++; continue }
    if (cur.content_id) { console.log(`  SKIP 이미 연결됨 ${it.listSlug} | ${it.rawTitle}`); skip++; continue }

    if (it.wasDead) {
      const c = deadContents.get(it.contentId); const ko = koBackup.get(it.contentId)
      if (!c || !ko) { console.log(`  SKIP 백업 없음 ${it.listSlug} | ${it.rawTitle}`); skip++; continue }
      if (hasHangul(ko.title)) { console.log(`  SKIP 한국어 카드였음(판본 오류로 지워진 것) ${it.listSlug} | ${it.rawTitle} | ${ko.title}`); skip++; continue }
      const { data: exists } = await db.from('contents').select('id').eq('id', it.contentId).maybeSingle()
      const { data: sameIsbn } = c.external_id ? await db.from('contents').select('id').eq('external_id', c.external_id).limit(1) : { data: [] }
      let contentId = it.contentId
      if (exists) console.log(`  (작품 이미 복원됨) ${it.rawTitle}`)
      else if (sameIsbn?.length) { contentId = sameIsbn[0].id; console.log(`  (같은 ISBN 작품 존재 → 그쪽에 연결) ${it.rawTitle}`) }
      else {
        console.log(`  RESTORE ${it.listSlug} | ${it.rawTitle} → en:「${ko.title}」 / ${ko.creator} isbn=${ko.isbn}`)
        if (go) {
          const ins = await db.from('contents').insert({ id: c.id, type: c.type, metadata: c.metadata ?? {}, release_date: c.release_date, subtype: c.subtype, external_source: c.external_source, external_id: c.external_id, created_at: c.created_at })
          if (ins.error) throw new Error(`contents insert ${c.id}: ${ins.error.message}`)
          const loc = await db.from('content_locales').insert({
            content_id: c.id, locale: 'en', title: ko.title, creator: ko.creator, thumbnail_url: ko.thumbnail_url, description: ko.description,
            publisher: ko.publisher, isbn: ko.isbn, affiliate_url: ko.affiliate_url, verified: true,
            sources: { primary: 'kakao_book', note: 'curated-list import; imported foreign edition moved from ko (26.09.13)' },
          })
          if (loc.error) throw new Error(`content_locales insert ${c.id}: ${loc.error.message}`)
          log({ kind: 'restore', item: it.id, content: c.id, contents_row: c, en_row_from_ko: ko })
        }
      }
      if (go) {
        const u = await db.from('curated_list_items').update({ content_id: contentId }).eq('id', it.id)
        if (u.error) throw new Error(`item update ${it.id}: ${u.error.message}`)
        log({ kind: 'relink', item: it.id, list: cur.list_id, content: contentId })
      }
      restore++; touchedLists.add(cur.list_id); touchedContents.add(contentId)
    } else {
      const keep = dropToKeep.get(it.contentId)
      if (!keep) { console.log(`  SKIP 통합 대상 아님 ${it.listSlug} | ${it.rawTitle}`); skip++; continue }
      const { data: k } = await db.from('contents').select('id').eq('id', keep).maybeSingle()
      if (!k) { console.log(`  SKIP keep 작품 없음 ${it.listSlug} | ${it.rawTitle}`); skip++; continue }
      console.log(`  REPOINT ${it.listSlug} | ${it.rawTitle} → ${keep.slice(0, 8)}`)
      if (go) {
        const u = await db.from('curated_list_items').update({ content_id: keep }).eq('id', it.id)
        if (u.error) throw new Error(`item update ${it.id}: ${u.error.message}`)
        log({ kind: 'repoint', item: it.id, list: cur.list_id, from: it.contentId, to: keep })
      }
      repoint++; touchedLists.add(cur.list_id); touchedContents.add(keep)
    }
  }
  console.log(`\n복원·재연결 ${restore} / 통합 재지정 ${repoint} / 건너뜀 ${skip}${go ? ' — 반영 완료' : ' — 점검만. 반영하려면 --yes'}`)
  if (go) appendFileSync(join(process.cwd(), 'scripts/curated/.tmp/relink-touched.json'), JSON.stringify({ lists: [...touchedLists], contents: [...touchedContents] }), 'utf8')
}
main().catch((e) => { console.error(e); process.exit(1) })
