/**
 * 팩션 폴더에서 "대표 사진으로 쓸 만한 인물 단독 이미지" 후보를 훑는다.
 *
 * 구조: public/factions/<에피소드>/<구획>/<인물명>/*.png
 * 거르는 것: 언더스코어로 시작하는 폴더(_docs·_refs 등), 세로/가로로 심하게 치우친 것,
 *            작은 것, 이미 세력도감 개인화보로 등록된 URL과 같은 파일.
 *
 * 사용법 (sw/web-bo 에서): node scripts/scan-faction-portrait-candidates.mjs <출력.json>
 */
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, join, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FACTIONS = resolve(__dirname, '..', '..', 'remotion', 'public', 'factions')

function loadEnv(p) {
  const t = readFileSync(p, 'utf-8')
  for (const raw of t.split('\n')) {
    const line = raw.replace(/\r$/, '')
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const out = process.argv[2]
if (!out) throw new Error('출력 경로를 넘겨라')

loadEnv(resolve(__dirname, '..', '.env'))
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// 대문이 아직 빈 인물만 대상으로 삼는다 (한 번에 1000행까지만 오므로 나눠 받는다)
const people = []
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb
    .from('profiles')
    .select('id, slug, nickname, nickname_en, celeb_tier, status, portrait_url')
    .eq('profile_type', 'CELEB')
    .is('portrait_url', null)
    .order('id')
    .range(from, from + 999)
  if (error) throw error
  people.push(...data)
  if (data.length < 1000) break
}

const norm = (s) => (s || '').replace(/[\s·・.'’\-_]/g, '').toLowerCase()
const byName = new Map()
for (const p of people) {
  for (const key of [p.nickname, p.nickname_en, p.slug]) {
    const k = norm(key)
    if (k && !byName.has(k)) byName.set(k, p)
  }
}

const IMG = /\.(png|jpe?g|webp)$/i
const candidates = []
const unmatched = new Set()

function walk(dir, depth = 0) {
  let entries = []
  try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (e.name.startsWith('_') || e.name.startsWith('.')) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) { walk(p, depth + 1); continue }
    if (depth < 2 || !IMG.test(e.name)) continue

    // 부모 폴더명 = 인물명 이라는 규약. 접두 번호("01-제우스")는 떼고 본다
    const raw = basename(dir).replace(/^\d+[-_. ]*/, '')
    const person = byName.get(norm(raw))
    if (!person) { unmatched.add(basename(dir)); continue }

    let size
    try { size = statSync(p).size } catch { continue }
    if (size < 200 * 1024) continue

    candidates.push({ person, file: p })
  }
}

walk(FACTIONS)

// 비율·해상도 검사는 후보에만 (파일 열기가 비싸다)
const kept = []
for (const c of candidates) {
  try {
    const m = await sharp(c.file).metadata()
    if (!m.width || !m.height) continue
    const ratio = m.width / m.height
    if (m.width < 800 || m.height < 800) continue
    if (ratio < 0.85 || ratio > 1.3) continue   // 정사각 근처만
    kept.push({
      slug: c.person.slug,
      celeb_id: c.person.id,
      nickname: c.person.nickname,
      celeb_tier: c.person.celeb_tier,
      status: c.person.status,
      image: c.file.replace(/\\/g, '/'),
      size: `${m.width}x${m.height}`,
    })
  } catch { /* 열리지 않는 파일은 버린다 */ }
}

// 인물별로 묶어 저장 — 어느 장을 쓸지는 눈으로 고른다
const grouped = new Map()
for (const k of kept) {
  if (!grouped.has(k.slug)) grouped.set(k.slug, { slug: k.slug, celeb_id: k.celeb_id, nickname: k.nickname, celeb_tier: k.celeb_tier, status: k.status, images: [] })
  grouped.get(k.slug).images.push({ image: k.image, size: k.size })
}

const result = [...grouped.values()].sort((a, b) => b.images.length - a.images.length)
writeFileSync(out, JSON.stringify(result, null, 2), 'utf-8')

console.log(`대문 빈 인물 ${people.length}명 중, 팩션 이미지가 있는 인물 ${result.length}명 / 후보 이미지 ${kept.length}장`)
console.log(`이름을 못 맞춘 폴더 ${unmatched.size}개`)
writeFileSync(out.replace(/\.json$/, '-unmatched.json'), JSON.stringify([...unmatched].sort(), null, 2), 'utf-8')
console.log(result.slice(0, 10).map(r => `  ${r.nickname} (${r.celeb_tier}/${r.status}) ${r.images.length}장`).join('\n'))
