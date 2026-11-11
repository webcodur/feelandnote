// agy 범위 조사 결과 초벌 점검: 출처 주소 응답·본문 길이, 근거·감상평의 원어 인용 구절이 출처 본문에 있는지.
// 판정은 하지 않는다. 사람이 결과와 원문을 읽고 확정한다.
// 사용: node precheck.mjs slug1 slug2 ...   → src/<slug>.N.txt(출처 본문), 표준출력 요약
import { W } from './paths.mjs'
import fs from 'node:fs'
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
const norm = (t) => t.toLowerCase().replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/&[a-z#0-9]+;/g, ' ').replace(/[^a-z0-9가-힣\u00c0-\u024f']+/g, ' ').replace(/\s+/g, ' ').trim()
const text = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
async function get(url) {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en,ko' }, redirect: 'follow', signal: AbortSignal.timeout(30000) })
    const ct = r.headers.get('content-type') ?? ''
    const body = ct.includes('pdf') ? '' : await r.text()
    return { status: r.status, ct, body: text(body) }
  } catch (e) { return { status: 'ERR ' + String(e.cause?.code ?? e.message).slice(0, 40), ct: '', body: '' } }
}
// 라틴 문자 인용 구절(따옴표 안 25자 이상)을 근거·감상평에서 뽑는다.
const quotes = (s) => [...(s ?? '').matchAll(/["“'‘]([^"“”'‘’]{25,400}?[A-Za-z][^"“”'‘’]*?)["”'’]/g)].map((m) => m[1]).filter((q) => /[A-Za-z]{3}/.test(q) && !/[가-힣]/.test(q))
for (const slug of process.argv.slice(2)) {
  const p = JSON.parse(fs.readFileSync(`${W}/scoped/${slug}.agy.json`, 'utf8'))
  console.log(`\n### ${slug}  books ${p.books.length}  unresolved ${JSON.stringify(p.unresolved ?? [])}`)
  for (const [i, b] of p.books.entries()) {
    const urls = [b.source_url, ...(b.source_urls ?? [])].filter(Boolean)
    const pages = []
    for (const [k, u] of urls.entries()) { const g = await get(u); pages.push(g); fs.writeFileSync(`${W}/src/${slug}.${i}.${k}.txt`, u + '\n' + g.body.replace(/\s+/g, ' ')); console.log(`  [${i}] ${b.title_ko} | ${g.status} ${g.body.length} | ${u}`) }
    const all = norm(pages.map((g) => g.body).join(' '))
    for (const q of quotes(b.evidence + '\n' + b.review_ko)) {
      const n = norm(q), words = n.split(' ')
      const hit = all.includes(n) ? 'FULL' : (all.includes(words.slice(0, 6).join(' ')) || all.includes(words.slice(-6).join(' '))) ? 'PART' : 'MISS'
      console.log(`     ${hit} "${q.slice(0, 90)}"`)
    }
  }
}
