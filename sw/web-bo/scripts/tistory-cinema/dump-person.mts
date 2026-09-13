/**
 * 인물 편 「필앤노트 리뷰」를 쓰려고 **재료를 한자리에 모은다.**
 *
 *   node --env-file=.env --import tsx scripts/tistory-cinema/dump-person.mts --next 6
 *   node --env-file=.env --import tsx scripts/tistory-cinema/dump-person.mts 박찬욱 리안
 *
 * 작품 편이 「한 영화를 여러 사람이 어떻게 봤나」라면 인물 편은 「한 사람이 무엇을 보나」다.
 * 고른 6편의 목록 자체가 이미 관점이므로, 리뷰는 **그 목록에서 읽히는 것**을 적는다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { ASSETS } from '../blog-assets.mjs'

const DIR = path.join(ASSETS, 'tistory-cinema')
const args = process.argv.slice(2)
const NEXT = args.indexOf('--next') >= 0 ? Number(args[args.indexOf('--next') + 1]) : 0

const fn = JSON.parse(fs.readFileSync(path.join(DIR, 'fn-reviews.json'), 'utf8'))

let names = args.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a)).map((n) => (n.startsWith('인물-') ? n : `인물-${n}`))
if (NEXT) {
  names = fs.readdirSync(DIR)
    .filter((f) => f.startsWith('_body-인물-') && f.endsWith('.html'))
    .map((f) => f.slice(6, -5))
    .filter((n) => !fn[n])
    .map((n) => {
      try { return { n, total: JSON.parse(fs.readFileSync(path.join(DIR, `${n}.json`), 'utf8')).total ?? 0 } }
      catch { return { n, total: 0 } }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, NEXT)
    .map((x) => x.n)
}
if (!names.length) throw new Error('인물 이름이나 --next N 이 필요하다')

const out: string[] = []
for (const name of names) {
  const f = path.join(DIR, `${name}.json`)
  if (!fs.existsSync(f)) { out.push(`\n■ ${name} — 재료 없음`); continue }
  const m = JSON.parse(fs.readFileSync(f, 'utf8'))
  const c = m.celeb ?? {}
  out.push(`\n${'='.repeat(78)}\n■ ${name} — 말한 영화 ${m.total}편 중 ${m.picked?.length ?? 0}편 실림`)
  out.push(`소개: ${c.headline ?? c.title ?? ''}${c.bio ? ` / ${c.bio}` : ''}`)
  out.push('')
  for (const r of m.picked ?? []) {
    const yr = (r.release ?? '').slice(0, 4)
    out.push(`  · 『${r.title}』${yr ? ` (${yr})` : ''} — ${r.creator ?? '?'}${r.genres?.length ? ` · ${r.genres.join('·')}` : ''}`)
    out.push(`    ${(r.review ?? '').trim()}`)
  }
}
const dest = path.join(DIR, '_towrite-person.txt')
fs.writeFileSync(dest, out.join('\n'), 'utf8')
console.log(`${names.length}명 · ${dest}`)
console.log(names.join(', '))
