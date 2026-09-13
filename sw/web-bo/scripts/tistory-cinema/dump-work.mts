/**
 * 「필앤노트 리뷰」를 쓰려고 **작품 편 재료를 한자리에 모은다.**
 *
 *   node --env-file=.env --import tsx scripts/tistory-cinema/dump-work.mts 엑소시스트 매트릭스
 *   node --env-file=.env --import tsx scripts/tistory-cinema/dump-work.mts --next 14
 *
 * 리뷰는 조립할 수 없다. 누가 무엇을 보고 무슨 말을 했는지 읽어야 각이 선다.
 * 직군 분포·함께 본 작품·실린 사람들의 발언을 한 파일로 모아 통독한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { ASSETS } from '../blog-assets.mjs'

const DIR = path.join(ASSETS, 'tistory-cinema')
const args = process.argv.slice(2)
const NEXT = args.indexOf('--next') >= 0 ? Number(args[args.indexOf('--next') + 1]) : 0

const PROF: Record<string, string> = {
  director: '감독', actor: '배우', musician: '음악가', athlete: '운동선수', entrepreneur: '기업가',
  humanities_scholar: '학자', social_scientist: '학자', natural_scientist: '학자', scientist: '학자',
  author: '작가', poet: '작가', influencer: '크리에이터', investor: '투자자',
  politician: '정치인', leader: '정치인', commander: '군인', visual_artist: '예술가', other: '',
}

const fn = JSON.parse(fs.readFileSync(path.join(DIR, 'fn-reviews.json'), 'utf8'))
const isWork = (n: string) => !n.startsWith('목록-') && !n.startsWith('인물-')

let names = args.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a))
if (NEXT) {
  // 아직 리뷰를 안 쓴 작품 편을, 다루는 인물이 많은 순으로
  names = fs.readdirSync(DIR)
    .filter((f) => f.startsWith('_body-') && f.endsWith('.html'))
    .map((f) => f.slice(6, -5))
    .filter((n) => isWork(n) && !fn[n])
    .map((n) => {
      try { return { n, total: JSON.parse(fs.readFileSync(path.join(DIR, `${n}.json`), 'utf8')).total ?? 0 } }
      catch { return { n, total: 0 } }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, NEXT)
    .map((x) => x.n)
}
if (!names.length) throw new Error('작품 이름이나 --next N 이 필요하다')

const out: string[] = []
for (const name of names) {
  const f = path.join(DIR, `${name}.json`)
  if (!fs.existsSync(f)) { out.push(`\n■ ${name} — 재료 없음`); continue }
  const m = JSON.parse(fs.readFileSync(f, 'utf8'))
  const profs = Object.entries(m.profCount ?? {})
    .map(([k, v]) => `${PROF[k] || k} ${v}`).join(' · ')
  out.push(`\n${'='.repeat(78)}\n■ ${name} — 전체 ${m.total}명`)
  out.push(`직군: ${profs}`)
  out.push(`함께 본 작품: ${(m.alsoLiked ?? []).map((a: any) => `${a.title}(${a.n})`).join(', ') || '없음'}`)
  out.push(`개봉 ${m.work?.release ?? m.tmdb?.release ?? '?'} · 감독 ${(m.tmdb?.director ?? []).join(', ')} · 평점 ${m.tmdb?.vote ?? '?'}`)
  out.push('')
  for (const p of m.picked ?? []) {
    out.push(`  · ${p.nickname} (${PROF[p.profession] || p.profession || '?'}${p.title ? ` · ${p.title}` : ''})`)
    out.push(`    ${(p.review ?? '').trim()}`)
  }
}
const dest = path.join(DIR, '_towrite.txt')
fs.writeFileSync(dest, out.join('\n'), 'utf8')
console.log(`${names.length}편 · ${dest}`)
console.log(names.join(', '))
