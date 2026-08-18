/**
 * 릴레이 스냅샷 재생성.
 *
 * 묶음에 담기는 updated_at은 동시 수정 감지에 쓰인다. DB를 한 번이라도
 * 일괄 갱신했으면 이 값이 전부 어긋나 반영이 통째로 튕긴다.
 * 회차를 새로 발주하기 전에 반드시 실행한다.
 *
 * 실행: pnpm exec tsx scripts/celeb/reading/refresh-snapshot.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const f = resolve(process.cwd(), '.env')
if (existsSync(f)) for (const l of readFileSync(f,'utf8').split(/\r?\n/)) { const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].replace(/^["']|["']$/g,'') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{autoRefreshToken:false,persistSession:false} })
const DIR = resolve(process.cwd(), '../../data/celeb/reading-relay')

async function main() {
  const rows: any[] = []
  for (let from=0;;from+=1000) {
    const { data, error } = await sb
      .from('celeb_explanations')
      .select('profile_id, plain_text, interpretive_title, interpretive_text, plain_text_en, interpretive_title_en, interpretive_text_en, published_at, created_at, updated_at, review_status, celeb:celebs!celeb_explanations_celebs_fkey(slug, nickname, nickname_en, profession, celeb_tier, birth_date, death_date)')
      .order('profile_id')
      .range(from, from+999)
    if (error) throw error
    if (!data?.length) break
    rows.push(...data); if (data.length < 1000) break
  }
  const withCeleb = rows.filter((r) => r.celeb)
  withCeleb.sort((a,b) => String(a.celeb.slug).localeCompare(String(b.celeb.slug)))
  writeFileSync(resolve(DIR,'all-readings.json'), JSON.stringify(withCeleb, null, 1), 'utf8')

  const status: Record<string, number> = {}
  for (const r of withCeleb) status[String(r.review_status)] = (status[String(r.review_status)] ?? 0) + 1
  console.log(JSON.stringify({ 전체: withCeleb.length, 검수상태: status }, null, 1))
}
main().catch((e)=>{console.error(e);process.exit(1)})
