// 독서 방식 본문의 『』·《》 책 가운데 책장에 없는 후보를 뽑는다. 판정은 실행자가 문맥(ctx)과 원출처를 읽고 한다.
// 제목은 공백·부호·괄호를 지우고, 괄호 안 원제도 따로 대조하며, 글자 2-gram 유사도 0.7 이상이거나 그 인물의 기존 감상배경에 같은 제목이 나오면(번역 제목이 다른 경우) 이미 있는 책으로 본다.
// 사용(저장소 루트): node --import tsx scripts/browser/reading-way-web/body-gap.mjs <out.json> [--reading]
//   --reading: 제목 앞뒤에 읽기 동사가 있고 집필 동사가 없는 후보만 남긴다.
if (!process.argv[2] || process.argv[2].startsWith('-')) { console.error('사용: body-gap.mjs <out.json> [--reading]'); process.exit(1) }
import { R, W } from './paths.mjs'
import { pathToFileURL } from 'node:url'
import fs from 'node:fs'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const q = async (sql) => JSON.parse((await database(sql, W)).text.trim() || 'null')
const celebs = await q(`SELECT json_agg(json_build_object('slug',slug,'rw',reading_way)) FROM public.celebs WHERE coalesce(reading_way,'')<>''`)
const shelf = await q(`SELECT json_agg(json_build_object('s',c.slug,'t',(SELECT string_agg(l.title,' ¦ ') FROM public.content_locales l WHERE l.content_id=cc.content_id),'a',(SELECT string_agg(l.creator,' ¦ ') FROM public.content_locales l WHERE l.content_id=cc.content_id))) FROM public.celeb_contents cc JOIN public.celebs c ON c.id=cc.celeb_id JOIN public.contents b ON b.id=cc.content_id WHERE b.type='BOOK'`)
const norm = (t) => t.normalize('NFKC').replace(/&/g, ' and ').replace(/^\s*(the|a|an)\s+/i, '').replace(/\([^)]*\)|\[[^\]]*\]/g, '').replace(/[\s·・,.:;!?'"“”‘’「」『』《》〈〉\-–—~…]/g, '').toLowerCase()
const bg = (x) => { const m = new Map(); for (let i = 0; i < x.length - 1; i++) { const k = x.slice(i, i + 2); m.set(k, (m.get(k) ?? 0) + 1) } return m }
const dice = (x, y) => { if (x.length < 2 || y.length < 2) return 0; const A = bg(x), B = bg(y); let o = 0; for (const [k, v] of A) o += Math.min(v, B.get(k) ?? 0); return (2 * o) / (x.length + y.length - 2) }
const same = (n, h) => h === n || (n.length >= 3 && h.includes(n)) || (n.length === 2 && h.startsWith(n)) || (h.length >= 3 && n.includes(h)) || dice(n, h) >= 0.7
const bySlug = new Map(), reviews = new Map(), authors = new Map()
for (const x of shelf ?? []) { if (!bySlug.has(x.s)) bySlug.set(x.s, []); if (!authors.has(x.s)) authors.set(x.s, new Set()); for (const a of (x.a ?? '').split(/ ¦ |[,;]/)) { const n = norm(a); if (n.length >= 3) authors.get(x.s).add(n) } for (const t of (x.t ?? '').split(' ¦ ')) for (const v of [t, t.split(/[:：]/)[0]]) { const n = norm(v); if (n) bySlug.get(x.s).push(n) } }
const READING = process.argv.includes('--reading')
const out = []
for (const c of celebs) {
  const have = bySlug.get(c.slug) ?? []
  for (const t of new Set([...c.rw.matchAll(/[『《]([^』》]{1,60})[』》]/g)].map((m) => m[1]))) {
    const alts = [norm(t), ...[...t.matchAll(/\(([^)]+)\)/g)].map((m) => norm(m[1]))].filter((x) => x.length >= 2)
    if (!alts.length || alts.some((n) => have.some((h) => same(n, h)))) continue
    const i = Math.max(c.rw.indexOf('『' + t + '』'), c.rw.indexOf('《' + t + '》')), near = c.rw.slice(Math.max(0, i - 45), i + t.length + 50)
    if (READING && !(/읽|낭독|탐독|애독|다시 펼|빠져/.test(near) && !/펴냈|썼다|출간|집필|저서|자서전|회고록을 냈/.test(near))) continue
    // 번역 제목이 달라도 제목 바로 앞 저자가 책장 저자와 같으면 이미 있는 책일 가능성이 크다(26.11.16 『드림 머신』=『꿈의 기계』). 판정은 실행자가 한다.
    const pre = norm(c.rw.slice(Math.max(0, i - 25), i))
    const sameAuthor = [...(authors.get(c.slug) ?? [])].some((a) => pre.includes(a))
    // 책장에 영문 제목만 있으면 한국어 제목·저자로는 맞지 않는다. 제목 앞 「○○의」 저자의 마지막 낱말을 남겨 두고, 그 인물의 기존 감상에 나오면 이미 있는 책일 가능성으로 표시한다(26.11.16 샌드버그 『행복한 삶을 위한 짧은 안내서』, 스위셔 『영어 문장 작법』).
    const preAuthor = norm(c.rw.slice(Math.max(0, i - 25), i).match(/([가-힣]{2,8})의\s*$/)?.[1] ?? '')
    out.push({ slug: c.slug, title: t, books: have.length, sameAuthor, preAuthor, ctx: c.rw.slice(Math.max(0, i - 120), i + t.length + 140).replace(/\s+/g, ' ') })
  }
}
// 번역 제목이 다른 기존 책: 후보 인물의 감상배경 본문에 같은 제목이 나오면 뺀다(출력 한도 때문에 50명씩 받는다).
const slugs = [...new Set(out.map((x) => x.slug))]
for (let i = 0; i < slugs.length; i += 50) {
  const part = slugs.slice(i, i + 50).map((s) => "'" + s.replaceAll("'", "''") + "'").join(',')
  for (const x of (await q(`SELECT json_agg(json_build_object('s',c.slug,'r',coalesce(cc.review,''))) FROM public.celeb_contents cc JOIN public.celebs c ON c.id=cc.celeb_id WHERE c.slug IN (${part})`)) ?? []) reviews.set(x.s, (reviews.get(x.s) ?? '') + norm(x.r))
}
const kept = out.filter((x) => { const n = norm(x.title); return !(n.length >= 3 && (reviews.get(x.slug) ?? '').includes(n)) })
for (const x of kept) { if (x.preAuthor.length >= 2 && (reviews.get(x.slug) ?? '').includes(x.preAuthor)) x.sameAuthor = true; delete x.preAuthor }
out.length = 0; out.push(...kept)
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1))
console.log(JSON.stringify({ celebs: celebs.length, candidates: out.length, persons: new Set(out.map((x) => x.slug)).size, sameAuthor: out.filter((x) => x.sameAuthor).length }))
