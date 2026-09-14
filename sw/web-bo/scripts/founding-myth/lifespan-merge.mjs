/**
 * gpt-lifespan.mjs 출력을 하나의 패치로 합치고 검수한다. DB는 건드리지 않는다.
 *
 * 연도 형식·몰년 역전은 gpt-lifespan 이 이미 걸렀다. 여기서는 사람이 봐야 할 것만 본다.
 *   - 같은 전승 안에서 혼자 수천 년 떨어진 값
 *   - 수명이 비상식적으로 긴 값(문헌이 그렇게 적은 경우가 실제로 있으므로 표시만 한다)
 *   - basis 가 비어 근거를 알 수 없는 값
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/founding-myth/lifespan-merge.mjs
 */

import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const IN_DIR = path.resolve(process.cwd(), '../../data/celeb/founding-myth/gpt-lifespan')
const OUT = path.resolve(process.cwd(), '../../data/celeb/founding-myth/patch-lifespan.json')

async function main() {
  const files = fs.existsSync(IN_DIR) ? fs.readdirSync(IN_DIR).filter((f) => f.endsWith('.json')).sort() : []
  const items = []
  const seen = new Set()
  const bySrc = new Map()
  for (const f of files) {
    const list = JSON.parse(fs.readFileSync(path.join(IN_DIR, f), 'utf8'))
    bySrc.set(f.replace(/\.json$/, ''), list)
    for (const it of list) {
      if (seen.has(it.slug)) continue
      seen.add(it.slug)
      items.push(it)
    }
  }
  if (!items.length) { console.log('출력 없음'); return }

  const { data: rows } = await db.from('celebs').select('slug,nickname,birth_date,celeb_reality').in('slug', items.map((i) => i.slug))
  const info = new Map((rows ?? []).map((r) => [r.slug, r]))

  const flags = []
  const keep = []
  for (const it of items) {
    const src = info.get(it.slug)
    if (!src) { flags.push(`${it.slug}: DB에 없다`); continue }
    if (src.birth_date) { flags.push(`${src.nickname}: 이미 생년이 있다(${src.birth_date}) — 반영에서 빠진다`); continue }
    const b = Number(it.celeb.birth_date)
    const d = it.celeb.death_date !== undefined ? Number(it.celeb.death_date) : null
    if (d !== null && d - b > 200) flags.push(`${src.nickname}: 수명 ${d - b}년 (${b}~${d}) — 문헌 근거 확인`)
    if (!it.basis) flags.push(`${src.nickname}: basis 없음`)
    keep.push({ slug: it.slug, celeb: it.celeb })
  }

  // 전승 안에서 혼자 크게 떨어진 값을 찾는다
  for (const [trad, list] of bySrc) {
    const ys = list.map((it) => Number(it.celeb.birth_date)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
    if (ys.length < 4) continue
    const mid = ys[Math.floor(ys.length / 2)]
    for (const it of list) {
      const y = Number(it.celeb.birth_date)
      if (!Number.isFinite(y)) continue
      if (Math.abs(y - mid) > 3000) flags.push(`${trad} / ${info.get(it.slug)?.nickname ?? it.slug}: ${y} 년 — 전승 중앙값 ${mid} 에서 멀다`)
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(keep, null, 2) + '\n', 'utf8')
  console.log(`전승 ${files.length}개 → 인물 ${items.length}명 / 반영 대상 ${keep.length}명`)
  console.log(`패치: ${OUT}`)
  if (flags.length) { console.log(`\n확인할 것 ${flags.length}건`); for (const f of flags) console.log(`  ${f}`) }
  else console.log('\n걸리는 것 없음')
}

main()
