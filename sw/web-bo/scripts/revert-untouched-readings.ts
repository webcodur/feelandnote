/**
 * 손대지 않은 채 검수 완료로 기록된 인물을 되돌린다.
 *
 * 백업본과 인물탐구가 한 글자도 다르지 않은데 review_status가 찍혀 있으면
 * "고칠 것 없음" 판정으로 통과한 행이다. 유저가 전량 재작업으로 결정했으므로
 * 검수 표시를 지우고 원장에서도 빼서 다음 회차 대상으로 되돌린다.
 *
 * 실행: pnpm exec tsx scripts/revert-untouched-readings.ts [--dry]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const f = resolve(process.cwd(), '.env')
if (existsSync(f)) for (const l of readFileSync(f,'utf8').split(/\r?\n/)) { const m=l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if(m&&!process.env[m[1]]) process.env[m[1]]=m[2].replace(/^["']|["']$/g,'') }
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth:{autoRefreshToken:false,persistSession:false} })
const DIR = resolve(process.cwd(), '../../data/celeb/reading-relay')

async function main() {
  const dry = process.argv.includes('--dry')
  const backup = JSON.parse(readFileSync(resolve(DIR,'backup-20260814.json'),'utf8'))
  const original = new Map<string, string>(
    backup.map((r: any) => [r.profile_id, r.interpretive_text ?? '']),
  )

  const rows: any[] = []
  for (let from=0;;from+=1000) {
    const { data, error } = await sb
      .from('celeb_explanations')
      .select('profile_id, interpretive_text, review_status, published_at, celeb:celebs!celeb_explanations_celebs_fkey(slug)')
      .not('review_status','is',null)
      .is('published_at', null)
      .order('profile_id')
      .range(from, from+999)
    if (error) throw error
    if (!data?.length) break
    rows.push(...data); if (data.length < 1000) break
  }

  // 승인 시각이 찍힌 행은 이미 서비스에 나가 있다. 조회 단계에서 이미 뺐다
  const untouched = rows.filter((r) => (r.interpretive_text ?? '') === original.get(r.profile_id))
  console.log(`검수 표시된 ${rows.length}명 중 원문 그대로인 ${untouched.length}명`)
  if (dry) { console.log(untouched.slice(0,20).map((r)=>r.celeb?.slug).join(', ')); return }

  let reverted = 0
  for (const r of untouched) {
    const { error } = await sb
      .from('celeb_explanations')
      .update({ review_status: null })
      .eq('profile_id', r.profile_id)
      .is('published_at', null)
    if (!error) reverted++
  }

  const slugs = new Set(untouched.map((r) => r.celeb?.slug).filter(Boolean))
  const ledgerPath = resolve(DIR,'ledger.json')
  const ledger = JSON.parse(readFileSync(ledgerPath,'utf8'))
  const kept = ledger.filter((e: any) => !slugs.has(e.slug))
  writeFileSync(ledgerPath, JSON.stringify(kept, null, 1), 'utf8')
  console.log(JSON.stringify({ 되돌림: reverted, 원장: `${ledger.length}→${kept.length}` }))
}
main().catch((e)=>{console.error(e);process.exit(1)})
