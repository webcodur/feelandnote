/**
 * 전승별 공개 준비 상태. 읽기 전용 — DB를 바꾸지 않는다.
 *
 * 전승마다 공개 인물 수, 그 인물들에게 붙은 작품 수, 그중 한국어 쿠팡 상품이 붙어
 * 실제로 살 수 있는 작품 수를 센다. 전승을 열지 말지 판단할 때 본다.
 *
 * 실행:
 *   node --env-file=.env scripts/founding-myth/tradition-readiness.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_DB_API_URL
const key = process.env.DB_SECRET_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY 없음')
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

async function inChunks(ids, fn) {
  const out = []
  for (let i = 0; i < ids.length; i += 100) out.push(...await fn(ids.slice(i, i + 100)))
  return out
}

const main = async () => {
  const { data: tags, error } = await db.from('faction_lv2')
    .select('id,slug,name,published').eq('is_myth', true).order('sort_order')
  if (error) throw new Error(error.message)

  const rows = []
  for (const tag of tags ?? []) {
    const { data: members } = await db.from('faction_member_rows')
      .select('celeb_id').eq('lv2_id', tag.id).eq('hidden', false)
    const celebIds = [...new Set((members ?? []).map((m) => m.celeb_id))]
    let works = 0, sellable = 0
    if (celebIds.length > 0) {
      const links = await inChunks(celebIds, async (ids) => {
        const { data } = await db.from('figure_book_characters').select('content_id').in('celeb_id', ids)
        return data ?? []
      })
      const contentIds = [...new Set(links.map((l) => l.content_id))]
      works = contentIds.length
      if (contentIds.length > 0) {
        const options = await inChunks(contentIds, async (ids) => {
          const { data } = await db.from('figure_book_purchase_options')
            .select('content_id').in('content_id', ids).eq('locale', 'ko').eq('platform', 'coupang')
          return data ?? []
        })
        sellable = new Set(options.map((o) => o.content_id)).size
      }
    }
    rows.push({ name: tag.name, open: tag.published === true, people: celebIds.length, works, sellable })
  }

  rows.sort((a, b) => b.sellable - a.sellable || b.works - a.works)
  const pad = (v, n) => String(v).padStart(n)
  console.log('전승'.padEnd(22) + '공개   인물   작품   살 수 있는 작품')
  for (const r of rows) {
    console.log(r.name.padEnd(22) + (r.open ? '열림' : '잠김').padEnd(6) + pad(r.people, 4) + pad(r.works, 7) + pad(r.sellable, 12))
  }
  console.log(`\n전승 ${rows.length}개 / 열린 전승 ${rows.filter((r) => r.open).length}개`)
}

main().catch((e) => { console.error(e); process.exit(1) })
