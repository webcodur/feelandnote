// 책장 후처리 초벌 조회: 기존 카탈로그 일치, 카카오 한국어판, OpenLibrary 영문판 후보를 한 번에 뽑는다. 판단은 실행자가 한다.
// 사용(저장소 루트): node --import tsx <이 파일> "<제목 ko>" "<제목 en>" "<저자 ko>" "<저자 en>"
import { R } from './paths.mjs'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { searchBooks } = await import(pathToFileURL(R + '/packages/content-search/src/kakao-books.ts').href)
const [tko = '', ten = '', ako = '', aen = ''] = process.argv.slice(2)
const url = process.env.NEXT_PUBLIC_DB_API_URL, key = process.env.DB_SECRET_KEY
const H = { apikey: key, Authorization: `Bearer ${key}` }
const like = (s) => encodeURIComponent(`*${s}*`)
const cat = []
for (const t of [tko, ten].filter(Boolean)) {
  const rows = await (await fetch(`${url}/rest/v1/content_locales?title=ilike.${like(t)}&select=content_id,locale,title,creator,isbn,sources,contents!inner(type)&limit=12`, { headers: H })).json()
  for (const r of rows) cat.push(`${r.content_id} ${r.contents.type} ${r.locale} ${r.title} / ${r.creator} / ${r.isbn ?? '-'} / ${r.sources?.primary ?? ''}${r.sources?.availability ? ' ' + r.sources.availability : ''}`)
}
console.log('CATALOG', cat.length ? '\n  ' + [...new Set(cat)].join('\n  ') : 'none')
if (tko) {
  const k = await searchBooks(`${tko} ${ako}`.trim())
  console.log('KAKAO', k.total, '\n  ' + k.items.slice(0, 6).map((b) => `${b.metadata.isbn} ${b.title} / ${b.creator} / ${b.metadata.publisher} ${b.metadata.publishDate?.slice(0, 4)} / ${b.metadata.salesStatus || '-'} / tr:${b.metadata.translators.join(',')}`).join('\n  '))
}
if (ten) {
  const q = new URLSearchParams({ title: ten, ...(aen ? { author: aen } : {}), fields: 'key,title,author_name,first_publish_year,isbn,language,edition_count', limit: '5' })
  const o = await (await fetch(`https://openlibrary.org/search.json?${q}`, { headers: { 'User-Agent': 'feelandnote-catalog/1.0' } })).json()
  console.log('OPENLIBRARY', o.numFound, '\n  ' + (o.docs ?? []).map((d) => `${d.key} ${d.title} / ${(d.author_name ?? []).join(',')} / ${d.first_publish_year ?? ''} / ed:${d.edition_count} / lang:${(d.language ?? []).slice(0, 4).join(',')} / isbn13:${(d.isbn ?? []).filter((i) => i.length === 13 && i.startsWith('978')).slice(0, 4).join(',')}`).join('\n  '))
}
