/**
 * 셀럽 기본 정보(basic) 텍스트 결손 전수 조사. 읽기 전용.
 *
 * 실행:
 *   pnpm exec tsx scripts/audit-celeb-basic-gaps.ts
 *   pnpm exec tsx scripts/audit-celeb-basic-gaps.ts --json
 */

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

const PAGE = 1000

type ProfileRow = {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  title: string | null
  title_en: string | null
  bio: string | null
  bio_en: string | null
  profession: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  gender: boolean | null
  status: string | null
  celeb_tier: string | null
  profile_type: string | null
}

async function allProfiles(): Promise<ProfileRow[]> {
  const out: ProfileRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('profiles')
      .select(
        'id, slug, nickname, nickname_en, title, title_en, bio, bio_en, profession, nationality, birth_date, death_date, gender, status, celeb_tier, profile_type',
      )
      .eq('profile_type', 'CELEB')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`profiles 조회 실패: ${error.message}`)
    const rows = (data ?? []) as ProfileRow[]
    out.push(...rows)
    if (rows.length < PAGE) break
  }
  return out
}

const blank = (v: string | null | undefined) => !v || v.trim().length === 0

function gapsOf(p: ProfileRow): string[] {
  const g: string[] = []
  if (blank(p.nickname)) g.push('nickname')
  if (blank(p.nickname_en)) g.push('nickname_en')
  if (blank(p.slug)) g.push('slug')
  if (blank(p.profession)) g.push('profession')
  if (blank(p.title)) g.push('title')
  if (blank(p.title_en)) g.push('title_en')
  if (blank(p.bio)) g.push('bio')
  if (blank(p.bio_en)) g.push('bio_en')
  if (blank(p.nationality)) g.push('nationality')
  if (blank(p.birth_date)) g.push('birth_date')
  return g
}

async function main() {
  const rows = await allProfiles()
  const withGaps = rows.map((p) => ({ p, gaps: gapsOf(p) })).filter((x) => x.gaps.length > 0)

  const fieldCount = new Map<string, number>()
  for (const { gaps } of withGaps) for (const f of gaps) fieldCount.set(f, (fieldCount.get(f) ?? 0) + 1)

  const bucketCount = new Map<string, number>()
  for (const { p } of withGaps) {
    const k = `${p.celeb_tier ?? 'null'}/${p.status ?? 'null'}`
    bucketCount.set(k, (bucketCount.get(k) ?? 0) + 1)
  }

  if (process.argv.includes('--json')) {
    console.log(
      JSON.stringify(
        {
          totalCelebs: rows.length,
          withGaps: withGaps.length,
          byField: Object.fromEntries([...fieldCount].sort((a, b) => b[1] - a[1])),
          byTierStatus: Object.fromEntries([...bucketCount].sort((a, b) => b[1] - a[1])),
          rows: withGaps.map(({ p, gaps }) => ({
            slug: p.slug,
            nickname: p.nickname,
            nickname_en: p.nickname_en,
            tier: p.celeb_tier,
            status: p.status,
            gaps,
          })),
        },
        null,
        2,
      ),
    )
    return
  }

  console.log(`CELEB 전체: ${rows.length}명`)
  console.log(`기본 정보 결손 보유: ${withGaps.length}명\n`)
  console.log('필드별 결손')
  for (const [f, c] of [...fieldCount].sort((a, b) => b[1] - a[1])) console.log(`  ${f.padEnd(14)} ${c}`)
  console.log('\n티어/상태별 결손 인물 수')
  for (const [k, c] of [...bucketCount].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${c}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
