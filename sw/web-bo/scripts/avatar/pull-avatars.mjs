/**
 * 등록된 아바타를 조건으로 골라 내려받는다. 정규화(빛 방향 → 재배치 → 재등록)의 1단계 입력을 만든다.
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/avatar/pull-avatars.mjs --faction <팩션명|slug> [--out <폴더>]
 *   node scripts/avatar/pull-avatars.mjs --reality REAL|FICTION [--offset 0] [--limit 200] [--out <폴더>]
 *   node scripts/avatar/pull-avatars.mjs --since <ISO 시각> [--out <폴더>]
 *   node scripts/avatar/pull-avatars.mjs --slugs a,b,c [--out <폴더>]
 *
 *   --faction  faction_lv2 소속. 후보가 여럿이면 목록을 보여주고 멈춘다.
 *   --reality  celebs.celeb_reality 기준. slug 오름차순으로 offset/limit을 잘라 전수 작업을 나눈다.
 *   --since    avatar_url의 캐시 버스터(?v=밀리초)가 이 시각 이후인 인물. 마지막 정규화 이후 새로 등록·교체된 아바타를 뽑는다.
 *   --slugs    명시 명단.
 *   --out      기본 <repo>/_backup/faction-avatars/<조건 이름>/
 *
 * 파일명은 <정렬번호>-<slug>.webp 다. 뒤 단계(light-unify·reframe·upload-reframed)가 이 이름에서 slug를 읽는다.
 * 팩션은 faction_members.sort_order, 그 외는 100 단위 순번을 쓴다. 같은 폴더의 _manifest.json에 대상·URL을 남긴다.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BO = resolve(__dirname, '..', '..')
const REPO = resolve(BO, '..', '..')

for (const raw of readFileSync(resolve(BO, '.env'), 'utf-8').split('\n')) {
  const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY)

const args = process.argv.slice(2)
const arg = (n) => {
  const i = args.indexOf(`--${n}`)
  return i >= 0 ? args[i + 1] : undefined
}
const faction = arg('faction')
const reality = arg('reality')
const since = arg('since')
const slugs = arg('slugs')
const offset = Number(arg('offset') ?? 0)
const limit = Number(arg('limit') ?? 200)
if (!faction && !reality && !since && !slugs) {
  console.error('사용법: node scripts/avatar/pull-avatars.mjs --faction <slug> | --reality REAL|FICTION [--offset --limit] | --since <ISO> | --slugs a,b')
  process.exit(1)
}

const SELECT = 'id, slug, nickname, nickname_en, avatar_url, celeb_reality'
let label = ''
/** [{celeb, order}] */
let targets = []

if (faction) {
  const { data: fs, error } = await db
    .from('faction_lv2').select('id, slug, name, name_en')
    .or(`slug.eq.${faction},name.ilike.%${faction}%,name_en.ilike.%${faction}%`)
  if (error) throw error
  if (!fs?.length) { console.error(`팩션 없음: ${faction}`); process.exit(1) }
  if (fs.length > 1) {
    console.error('후보가 여럿이다. slug로 지정하라:')
    for (const f of fs) console.error(`  ${f.slug}  ${f.name} / ${f.name_en}`)
    process.exit(1)
  }
  const f = fs[0]
  label = f.slug
  console.log(`팩션: ${f.name} (${f.slug})`)
  const { data: members, error: e1 } = await db
    .from('faction_members').select('celeb_id, sort_order').eq('lv2_id', f.id).order('sort_order')
  if (e1) throw e1
  const ids = members.map((m) => m.celeb_id)
  const { data: celebs, error: e2 } = await db.from('celebs').select(SELECT).in('id', ids)
  if (e2) throw e2
  const byId = new Map(celebs.map((c) => [c.id, c]))
  targets = members.filter((m) => byId.has(m.celeb_id)).map((m) => ({ celeb: byId.get(m.celeb_id), order: m.sort_order ?? 0 }))
} else {
  let q = db.from('celebs').select(SELECT).eq('publication_status', 'active').not('avatar_url', 'is', null).order('slug')
  if (slugs) {
    q = q.in('slug', slugs.split(',').map((s) => s.trim()))
    label = 'slugs'
  } else if (reality) {
    q = q.eq('celeb_reality', reality).range(offset, offset + limit - 1)
    label = `${reality.toLowerCase()}-${offset}`
  } else {
    label = `since-${since.replace(/[:.]/g, '-')}`
  }
  // DB API는 한 요청에 1,000행까지만 돌려준다. --since는 전수를 봐야 하므로 페이지를 돈다
  let rows = []
  if (since) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await q.range(from, from + 999)
      if (error) throw error
      rows.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
  } else {
    const { data, error } = await q
    if (error) throw error
    rows = data ?? []
  }
  if (since) {
    const t = Date.parse(since)
    if (Number.isNaN(t)) { console.error(`--since 시각을 해석할 수 없다: ${since}`); process.exit(1) }
    rows = rows.filter((c) => Number((c.avatar_url.match(/[?&]v=(\d+)/) || [])[1] || 0) > t)
  }
  targets = rows.map((c, i) => ({ celeb: c, order: (i + 1) * 100 }))
}

const outDir = resolve(arg('out') ?? resolve(REPO, '_backup', 'faction-avatars', label))
mkdirSync(outDir, { recursive: true })
console.log(`대상 ${targets.length}명 → ${outDir}`)

const manifest = []
let ok = 0
let failed = 0
for (const { celeb: c, order } of targets) {
  try {
    const res = await fetch(c.avatar_url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    let ext = extname(new URL(c.avatar_url).pathname).toLowerCase()
    if (!ext) ext = (res.headers.get('content-type') ?? '').includes('png') ? '.png' : '.webp'
    const file = `${String(order).padStart(3, '0')}-${c.slug}${ext}`
    writeFileSync(resolve(outDir, file), buf)
    ok++
    manifest.push({ slug: c.slug, nickname: c.nickname, reality: c.celeb_reality, file, bytes: buf.length, url: c.avatar_url })
  } catch (err) {
    failed++
    manifest.push({ slug: c.slug, nickname: c.nickname, status: 'failed', error: String(err.message ?? err), url: c.avatar_url })
    console.log(`  ✗ ${c.nickname} (${c.slug}): ${err.message ?? err}`)
  }
}
writeFileSync(resolve(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8')
console.log(`완료: 성공 ${ok} / 실패 ${failed}`)
