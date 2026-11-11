// 아직 조사하지 않은 인물의 조사 범위(scope) 책을 책장과 제목 낱말로 대조해, 책장에 없는 책만 남긴 범위를 만든다(초벌).
// 사용(저장소 루트): node --import tsx <이 파일> <슬러그 목록 파일(쉼표)> <완료 로그>
import { R, W } from './paths.mjs'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const stop = new Set(['the', 'of', 'and', 'a', 'an', 'on', 'in', 'to', 'for', 'de', 'la', 'le', 'des', 'du', 'his', 'its'])
const toks = (t) => (t ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').replace(/[^a-z0-9가-힣]+/g, ' ').split(' ').filter((w) => w.length > 1 && !stop.has(w))
const all = fs.readFileSync(process.argv[2], 'utf8').trim().split(',')
const done = new Set(fs.readFileSync(process.argv[3], 'utf8').split('\n').map((l) => l.split(' ')[1]).filter(Boolean))
const todo = all.filter((s) => !done.has(s))
const q = `SELECT json_object_agg(slug, books) FROM (SELECT c.slug, COALESCE(json_agg((SELECT string_agg(l.title,' // ') FROM public.content_locales l WHERE l.content_id=b.id)) FILTER (WHERE b.id IS NOT NULL),'[]') books FROM public.celebs c LEFT JOIN public.celeb_contents cc ON cc.celeb_id=c.id LEFT JOIN public.contents b ON b.id=cc.content_id AND b.type='BOOK' WHERE c.slug IN (${todo.map((s) => "'" + s.replaceAll("'", "''") + "'").join(',')}) GROUP BY c.slug) x;`
const shelves = JSON.parse((await database(q, W)).text.trim())
const keep = [], report = []
for (const slug of todo) {
  const sc = JSON.parse(fs.readFileSync(`${W}/scoped/${slug}.scope.json`, 'utf8'))
  const shelf = shelves[slug] ?? []
  const fresh = sc.bookScope.filter((b) => {
    const t = new Set([...toks(b.title_ko), ...toks(b.title_en)])
    const hit = shelf.find((x) => { const st = toks(x); const n = st.filter((w) => t.has(w)).length; return n >= Math.min(2, t.size) })
    report.push(`${slug} | ${b.title_ko ?? ''} / ${b.title_en ?? ''} → ${hit ? 'ON SHELF: ' + hit.slice(0, 70) : 'NEW'}`)
    return !hit
  })
  if (fresh.length) { keep.push(slug); fs.writeFileSync(`${W}/scoped/${slug}.scope.new.json`, JSON.stringify({ bookScope: fresh }, null, 2)) }
}
fs.writeFileSync(`${W}/scope-filter.txt`, report.join('\n'))
fs.writeFileSync(`${W}/scoped160/slugs.new.txt`, keep.join(','))
console.log('todo', todo.length, 'keep', keep.length, 'books', report.filter((r) => r.endsWith('NEW')).length, '/', report.length)
