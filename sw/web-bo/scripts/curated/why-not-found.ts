/**
 * 「못 찾음」으로 떨어진 항목이 왜 서재에서 안 잡혔는지 캔다
 *
 * `titles-apply.ts` 는 한국어 제목이 정확히 같고 저자가 맞아야 기존 책에 잇는다.
 * 이 스크립트는 그 대조를 한 건씩 재현해 어느 조건에서 떨어졌는지 보여 준다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/curated/why-not-found.ts "과학혁명의 구조" "사회학으로의 초대"
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

// titles-apply.ts 와 같은 규칙
const normTitle = (s: string) =>
  s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[:：].*$/, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/[^\p{L}\p{N}]/gu, '')

const queries = process.argv.slice(2).filter((a) => !a.startsWith('--'))

async function main() {
  for (const q of queries) {
    console.log(`\n=== ${q}`)
    const { data, error } = await db
      .from('content_locales')
      .select('content_id,locale,title,creator,thumbnail_url')
      .ilike('title', `%${q}%`)
    if (error) throw error
    if (!data?.length) {
      console.log('  서재에 이 제목이 없다')
      continue
    }
    const ids = [...new Set(data.map((d) => d.content_id))]
    const { data: cs } = await db.from('contents').select('id,type,celeb_count').in('id', ids)
    const typeOf = new Map((cs ?? []).map((c) => [c.id, c]))
    const { data: used } = await db.from('curated_list_items').select('content_id').in('content_id', ids)
    const inList = new Set((used ?? []).map((u) => u.content_id))
    for (const d of data) {
      const c = typeOf.get(d.content_id)
      console.log(
        `  ${d.locale}  ${String(d.title).slice(0, 40).padEnd(42)} / ${String(d.creator ?? '').slice(0, 22).padEnd(24)}` +
          ` ${c?.type ?? '?'} 감상${c?.celeb_count ?? 0} ${inList.has(d.content_id) ? '목록연결O' : '목록연결X'}` +
          ` 표지${d.thumbnail_url ? 'O' : 'X'}`,
      )
      if (d.locale === 'ko') console.log(`        정규화 제목: "${normTitle(d.title)}"  (찾는 값: "${normTitle(q)}")`)
    }
  }
}

main().catch((e) => {
  console.error(String(e?.message ?? e))
  process.exit(1)
})
