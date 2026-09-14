/**
 * gpt-fill.mjs 가 떨군 출력들을 하나의 패치로 합치고 자동 검수한다. DB는 건드리지 않는다.
 *
 * 형식·길이·허용값은 gpt-fill 이 이미 걸렀으므로 여기서는 사람이 봐야 할 신호만 찾는다.
 *   - title 이 headline 을 잘라 쓴 것
 *   - title 이 DB의 다른 인물 것과 겹치는 것
 *   - 같은 전승에서 headline_en 이 서로 닮은 것
 *   - bio_en 이 너무 짧아 사실이 빠진 것
 *
 * 실행 (sw/web-bo 에서):
 *   node scripts/founding-myth/gpt-merge.mjs
 *   node scripts/founding-myth/gpt-merge.mjs --out ../../data/celeb/founding-myth/patch-gpt.json
 */

import path from 'node:path'
import fs from 'node:fs'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })
const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL, process.env.DB_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const OUT_DIR = path.resolve(process.cwd(), '../../data/celeb/founding-myth/gpt-out')
const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const OUT = path.resolve(process.cwd(), arg('--out', '../../data/celeb/founding-myth/patch-gpt.json'))

/** 두 영문 한 줄의 내용어 겹침 비율. 0.6 넘으면 사실상 같은 문장이다. */
function overlap(a, b) {
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'his', 'her', 'its', 'their', 'who', 'that', 'with', 'for', 'from', 'was', 'were', 'is', 'as', 'by', 'he', 'she', 'they', 'it'])
  const w = (s) => new Set(s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((x) => x.length > 2 && !stop.has(x)))
  const A = w(a), B = w(b)
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const x of A) if (B.has(x)) hit++
  return hit / Math.min(A.size, B.size)
}

async function main() {
  const files = fs.existsSync(OUT_DIR) ? fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json')).sort() : []
  const items = []
  const seen = new Set()
  for (const f of files) {
    for (const it of JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'))) {
      if (seen.has(it.slug)) continue
      seen.add(it.slug)
      // GPT 가 굽은 따옴표를 섞어 낸다. 직접 쓴 217명과 부호를 맞춘다.
      for (const k of Object.keys(it.celeb)) {
        if (typeof it.celeb[k] === 'string') it.celeb[k] = it.celeb[k].replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      }
      items.push(it)
    }
  }
  if (!items.length) { console.log('출력 없음'); return }

  const { data: rows } = await db.from('celebs').select('slug,nickname,headline,title').in('slug', items.map((i) => i.slug))
  const byslug = new Map((rows ?? []).map((r) => [r.slug, r]))

  const used = new Map()
  for (let from = 0; ; from += 1000) {
    const { data: t } = await db.from('celebs').select('slug,title').order('slug').range(from, from + 999)
    for (const r of t ?? []) if (r.title) { const l = used.get(r.title) ?? []; l.push(r.slug); used.set(r.title, l) }
    if ((t ?? []).length < 1000) break
  }

  const flags = []
  const mine = new Map()
  for (const it of items) {
    const src = byslug.get(it.slug)
    const c = it.celeb
    if (!src) { flags.push(`${it.slug}: DB에 없다`); continue }
    if (src.title) { flags.push(`${it.slug}(${src.nickname}): 이미 title 이 있다 — 반영에서 빠진다`); continue }

    const owners = (used.get(c.title) ?? []).filter((s) => s !== it.slug)
    if (owners.length) flags.push(`${src.nickname}: title "${c.title}" 이 이미 ${owners.join(',')} 것`)
    const dup = mine.get(c.title)
    if (dup) flags.push(`${src.nickname}: title "${c.title}" 이 패치 안 ${dup} 와 겹침`)
    mine.set(c.title, src.nickname)

    if (src.headline && src.headline.includes(c.title)) flags.push(`${src.nickname}: title "${c.title}" 이 headline 안에 그대로 있다`)
    if (c.bio_en && c.bio_en.length < 180) flags.push(`${src.nickname}: bio_en 이 ${c.bio_en.length}자로 짧다`)
    // other 는 최종 수단이지 조사 전 기본값이 아니다(celeb-01-01-profile-facts.md)
    if (c.profession === 'other') flags.push(`${src.nickname}: profession=other — 직군 재판정 필요`)
    // 3자 이하 일반명사 title 은 단독으로 읽힐 때 인물을 특정하지 못한다
    if ([...c.title].length <= 3) flags.push(`${src.nickname}: title "${c.title}" 이 ${[...c.title].length}자 — 인물 특정 여부 확인`)
  }

  // headline_en 유사도 — 같은 문장 틀을 돌려 쓴 것을 찾는다
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i].celeb.headline_en, b = items[j].celeb.headline_en
      if (!a || !b) continue
      if (overlap(a, b) >= 0.6) {
        flags.push(`닮음  ${byslug.get(items[i].slug)?.nickname} / ${byslug.get(items[j].slug)?.nickname}\n        "${a}"\n        "${b}"`)
      }
    }
  }

  const keep = items.filter((it) => byslug.has(it.slug) && !byslug.get(it.slug).title)
  fs.writeFileSync(OUT, JSON.stringify(keep, null, 2) + '\n', 'utf8')

  console.log(`파일 ${files.length}개 → 인물 ${items.length}명 / 반영 대상 ${keep.length}명`)
  console.log(`패치: ${OUT}`)
  if (flags.length) { console.log(`\n확인할 것 ${flags.length}건`); for (const f of flags) console.log(`  ${f}`) }
  else console.log('\n걸리는 것 없음')
}

main()
