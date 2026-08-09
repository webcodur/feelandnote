/**
 * 대표 화보가 없는 인물을 우선순위(방문·영향력) 순으로 뽑아 JSON으로 저장한다.
 * 세력도감 화보로 이미 대문이 채워지는 인물은 제외한다.
 *
 * 사용법 (sw/web-bo 에서): node scripts/pick-hero-photo-targets.mjs <출력.json> [개수] [건너뛸수]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv(p) {
  const t = readFileSync(p, 'utf-8')
  for (const raw of t.split('\n')) {
    const line = raw.replace(/\r$/, '')
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const out = process.argv[2]
const want = Number(process.argv[3] || 60)
const skip = Number(process.argv[4] || 0)
if (!out) throw new Error('출력 경로를 넘겨라')

loadEnv(resolve(__dirname, '..', '.env'))
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: rows, error } = await sb.rpc('exec_sql_readonly', {}).then(() => ({ data: null, error: 'unused' })).catch(() => ({ data: null, error: null }))

// RPC가 없으므로 클라이언트 조인으로 처리한다
const { data: people, error: e1 } = await sb
  .from('celebs')
  .select('id, slug, nickname, nickname_en, profession, nationality, birth_date, death_date, title, bio, avatar_url, view_count, celeb_tier, publication_status, portrait_url')
  .eq('publication_status', 'active')
  .not('avatar_url', 'is', null)
  .is('portrait_url', null)
  .limit(5000)
if (e1) throw e1

const usable = people.filter(p => p.celeb_tier !== 'fiction')

const { data: infl } = await sb.from('celeb_influence').select('celeb_id, total_score').limit(5000)
const scoreOf = new Map((infl || []).map(r => [r.celeb_id, r.total_score || 0]))

const { data: shots } = await sb
  .from('celeb_tag_assignments').select('celeb_id, faction_image_url').not('faction_image_url', 'is', null).limit(5000)
const hasFactionShot = new Set((shots || []).map(r => r.celeb_id))

const pool = usable.filter(p => !hasFactionShot.has(p.id))

// 방문 순위와 영향력 순위를 반반 섞는다 (두 축이 서로 다른 인물을 가리키므로)
const byView = [...pool].sort((a, b) => (a.view_count || 0) - (b.view_count || 0))
const byInf = [...pool].sort((a, b) => (scoreOf.get(a.id) || 0) - (scoreOf.get(b.id) || 0))
const rankView = new Map(byView.map((p, i) => [p.id, i / Math.max(1, byView.length - 1)]))
const rankInf = new Map(byInf.map((p, i) => [p.id, i / Math.max(1, byInf.length - 1)]))

const ranked = pool
  .map(p => ({ p, s: (rankView.get(p.id) + rankInf.get(p.id)) / 2 }))
  .sort((a, b) => b.s - a.s || (scoreOf.get(b.p.id) || 0) - (scoreOf.get(a.p.id) || 0))
  .slice(skip, skip + want)
  .map(({ p }) => ({
    slug: p.slug,
    celeb_id: p.id,
    nickname: p.nickname,
    nickname_en: p.nickname_en,
    profession: p.profession,
    nationality: p.nationality,
    birth_date: p.birth_date,
    death_date: p.death_date,
    title: p.title,
    bio: (p.bio || '').slice(0, 300),
    avatar_url: p.avatar_url,
    view_count: p.view_count || 0,
    influence: scoreOf.get(p.id) || 0,
  }))

writeFileSync(out, JSON.stringify(ranked, null, 2), 'utf-8')
console.log(`대상 ${ranked.length}명 (후보 풀 ${pool.length}명) -> ${out}`)
console.log(ranked.slice(0, 8).map(r => `  ${r.nickname} (${r.profession}, 조회 ${r.view_count}, 영향력 ${r.influence})`).join('\n'))
