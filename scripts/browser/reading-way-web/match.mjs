// agy 결과의 각 책이 이미 그 인물 책장에 있는지 영문·한국어 제목 낱말로 대조한다(초벌). 판단은 사람이 한다.
// 사용(저장소 루트): node --import tsx <이 파일> slug1 slug2 ...
import { R, W } from './paths.mjs'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const stop = new Set(['the', 'of', 'and', 'a', 'an', 'on', 'in', 'to', 'for', 'de', 'la', 'le', 'des', 'du', 'his', 'its'])
const toks = (t) => (t ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9가-힣]+/g, ' ').split(' ').filter((w) => w.length > 1 && !stop.has(w))
for (const slug of process.argv.slice(2)) {
  const p = JSON.parse(fs.readFileSync(`${W}/scoped/${slug}.agy.json`, 'utf8'))
  const shelf = JSON.parse((await database(`SELECT COALESCE(json_agg(json_build_object('id',b.id,'t',(SELECT string_agg(l.title||' | '||COALESCE(l.creator,''),' // ') FROM public.content_locales l WHERE l.content_id=b.id))),'[]') FROM public.celeb_contents cc JOIN public.celebs c ON c.id=cc.celeb_id JOIN public.contents b ON b.id=cc.content_id WHERE c.slug='${slug.replaceAll("'", "''")}' AND b.type='BOOK';`, W)).text.trim())
  console.log(`### ${slug} shelf ${shelf.length}`)
  for (const [i, b] of p.books.entries()) {
    const q = new Set([...toks(b.title_en), ...toks(b.title_ko)])
    const hits = shelf.map((x) => ({ x, n: toks(x.t).filter((w) => q.has(w)).length })).filter((h) => h.n >= Math.min(2, q.size)).sort((a, b) => b.n - a.n)
    // 제목이 전혀 다르게 등록된 같은 책을 잡기 위해, 저자 성(姓)이 같은 책장 항목을 후보로 함께 보인다.
    const sur = toks(b.author_en).filter((w) => w.length > 2).pop()
    const byAuthor = hits.length || !sur ? [] : shelf.filter((x) => toks(x.t).includes(sur))
    console.log(`  [${i}] ${b.title_ko} / ${b.title_en}  →  ${hits.length ? hits.slice(0, 2).map((h) => h.x.id + ' ' + h.x.t.slice(0, 90)).join('  ||  ') : byAuthor.length ? 'SAME AUTHOR? ' + byAuthor.map((x) => x.id.slice(0, 8) + ' ' + x.t.slice(0, 70)).join(' || ') : 'NEW'}`)
  }
}
