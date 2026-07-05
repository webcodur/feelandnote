/**
 * AI 패권 전쟁 기획전(스포트라이트) 편성 현황 감사.
 * 팩션 faction-data.json 인물 ↔ 세력별 태그 배정(celeb_tag_assignments) 대조.
 * 세력별로 [배정됨 / 미배정 / 미배정 중 DB 미등록]을 출력한다. 읽기 전용.
 *
 * 실행: sw/web-bo 에서  node --import tsx scripts/audit-spotlight-llm.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const data = JSON.parse(
  readFileSync(resolve(process.cwd(), '../remotion/public/factions/01-AI패권전쟁/faction-data.json'), 'utf-8'),
)

// groups 배열 인덱스 → 태그 slug
const GROUP_SLUG: Record<number, string> = {
  0: 'ai-pioneers', 1: 'google-deepmind', 2: 'openai', 3: 'anthropic', 4: 'xai',
  5: 'meta', 6: 'mistral', 7: 'hugging-face', 8: 'deepseek', 9: 'thinking-machines', 10: 'ssi',
}

// 팩션 data name → DB nickname 보정
const NAME_ALIAS: Record<string, string> = {
  '제이슨 긴스버그': '제이슨 긴즈버그',
  '안드레이 카파시': '안드레 카파시',
}

type P = { name: string; slug?: string; longformOnly: boolean }

function peopleOf(group: any): P[] {
  const out: P[] = []
  const push = (arr: any[], lf: boolean) => {
    for (const p of arr ?? []) out.push({ name: (p.name ?? '').trim(), slug: p.slug, longformOnly: lf })
  }
  if (Array.isArray(group.clusters) && group.clusters.length) {
    for (const c of group.clusters) push(c.people, !!c.longformOnly)
  } else {
    push(group.people, false)
  }
  return out
}

async function main() {
  for (let i = 0; i < data.groups.length; i++) {
    const slug = GROUP_SLUG[i]
    const group = data.groups[i]
    const factionPeople = peopleOf(group)
    console.log(`\n=== [${i}] ${slug}  (${(group.name || '').replace(/\n/g, ' / ')}) ===`)

    const { data: tag } = await supabase.from('celeb_tags').select('id, name, is_featured').eq('slug', slug).maybeSingle()
    if (!tag) { console.log('  ⚠ 태그 없음'); continue }

    const { data: assigns } = await supabase
      .from('celeb_tag_assignments')
      .select('celeb_id, profiles!celeb_tag_assignments_celeb_id_fkey(nickname, slug)')
      .eq('tag_id', tag.id)
    const assignedNick = new Set<string>()
    const assignedSlug = new Set<string>()
    for (const a of assigns ?? []) {
      const pr = a.profiles as unknown as { nickname: string; slug: string | null }
      if (pr?.nickname) assignedNick.add(pr.nickname)
      if (pr?.slug) assignedSlug.add(pr.slug)
    }

    const unassigned: P[] = []
    for (const fp of factionPeople) {
      const dbNick = NAME_ALIAS[fp.name] ?? fp.name
      const hit = (fp.slug && assignedSlug.has(fp.slug)) || assignedNick.has(dbNick)
      if (!hit) unassigned.push(fp)
    }

    console.log(`  태그: "${tag.name}" | 배정 ${assignedNick.size}명 | 팩션 ${factionPeople.length}명 | 미배정 ${unassigned.length}명`)

    if (unassigned.length) {
      // 미배정 인물의 DB 등록 여부 조회
      for (const u of unassigned) {
        const dbNick = NAME_ALIAS[u.name] ?? u.name
        let found: any = null
        if (u.slug) {
          const r = await supabase.from('profiles').select('id, nickname').eq('slug', u.slug).maybeSingle()
          found = r.data
        }
        if (!found) {
          const r = await supabase.from('profiles').select('id, nickname').eq('nickname', dbNick).maybeSingle()
          found = r.data
        }
        const lf = u.longformOnly ? '(롱폼전용)' : ''
        console.log(`    - ${u.name}${u.slug ? ` [${u.slug}]` : ''} ${lf}  → DB ${found ? '등록됨 ✅' : '미등록 ❌'}`)
      }
    }
  }
  console.log('\n감사 완료.')
}
main().catch((e) => { console.error(e); process.exit(1) })
