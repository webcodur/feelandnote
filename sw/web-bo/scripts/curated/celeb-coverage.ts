/**
 * 기관 선정 목록이 인물 감상을 얼마나 데리고 있는지 센다
 *
 * 블로그 안내글의 차별점은 "그 목록의 책을 실제로 읽은 인물"이다.
 * 목록이 가리키는 바로 그 content 행에 `celeb_contents` 가 몇 건 붙어 있는지가
 * 그 목록으로 글을 쓸 수 있는지를 정한다. 발행 순서 판단에 쓴다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/curated/celeb-coverage.ts              # 전체 목록
 *   npx tsx scripts/curated/celeb-coverage.ts <slug> ...   # 지정한 목록만
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
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
loadEnv(join(ROOT, '.env'))
loadEnv(join(ROOT, 'sw/web-bo/.env'))
loadEnv(join(ROOT, 'sw/web/.env'))

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL!,
  (process.env.DB_SECRET_KEY || process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY)!,
)

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'))

async function page<T>(table: string, sel: string): Promise<T[]> {
  let from = 0
  const out: T[] = []
  for (;;) {
    const { data, error } = await db.from(table).select(sel).range(from, from + 999)
    if (error) throw error
    out.push(...(data as T[]))
    if (data!.length < 1000) break
    from += 1000
  }
  return out
}

async function main() {
  const lists = await page<{ id: string; slug: string; title: string }>('curated_lists', 'id,slug,title')
  const items = await page<{ list_id: string; content_id: string | null }>('curated_list_items', 'list_id,content_id')
  const revs = await page<{ content_id: string | null }>('celeb_contents', 'content_id')

  const revCnt = new Map<string, number>()
  for (const r of revs) if (r.content_id) revCnt.set(r.content_id, (revCnt.get(r.content_id) ?? 0) + 1)

  const byList = new Map<string, { total: number; linked: number; withCeleb: number; reviews: number }>()
  for (const it of items) {
    const s = byList.get(it.list_id) ?? { total: 0, linked: 0, withCeleb: 0, reviews: 0 }
    s.total++
    if (it.content_id) {
      s.linked++
      const n = revCnt.get(it.content_id) ?? 0
      if (n > 0) {
        s.withCeleb++
        s.reviews += n
      }
    }
    byList.set(it.list_id, s)
  }

  const rows = lists
    .map((l) => ({ ...l, ...(byList.get(l.id) ?? { total: 0, linked: 0, withCeleb: 0, reviews: 0 }) }))
    .filter((r) => (only.length ? only.includes(r.slug) : r.total > 0))
    .sort((a, b) => a.withCeleb - b.withCeleb)

  console.log('감상붙은작품/연결/전체  감상수  목록')
  for (const r of rows) {
    const mark = r.withCeleb >= 5 ? '  ' : '⚠ '
    console.log(
      `${mark}${String(r.withCeleb).padStart(4)}/${String(r.linked).padStart(4)}/${String(r.total).padStart(4)}  ${String(r.reviews).padStart(5)}  ${r.slug}`,
    )
  }
  console.log(`\n인물 감상이 5작품 미만인 목록 ${rows.filter((r) => r.withCeleb < 5).length} / ${rows.length}`)
}

main().catch((e) => {
  console.error(String(e?.message ?? e))
  process.exit(1)
})
