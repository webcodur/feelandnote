// 결정 파일의 content_id 항목 중 이미 책장에 연결된 것은 검증한 새 감상평(결합 파일+사실 교정)으로 기존 행을 교체한다.
// books-step을 먼저 돌려(미리보기) 결합 파일의 review_en을 만든 뒤 쓴다. 나머지 항목은 decision.rest.json으로 남긴다.
// 사용(저장소 루트): node --import tsx <이 파일> <slug> [--apply]
import { R, W } from './paths.mjs'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const [slug] = process.argv.slice(2), APPLY = process.argv.includes('--apply')
const d = JSON.parse(fs.readFileSync(`${W}/${slug}.decision.json`, 'utf8'))
const c = JSON.parse(fs.readFileSync(`${W}/${slug}.books.combined.json`, 'utf8'))
const s = (x) => "'" + String(x).replaceAll("'", "''") + "'"
const ids = d.books.filter((b) => b.content_id).map((b) => b.content_id)
const cur = ids.length ? JSON.parse((await database(`SELECT COALESCE(json_agg(json_build_object('id',cc.content_id,'review',cc.review,'review_en',cc.review_en,'source_url',cc.source_url)),'[]') FROM public.celeb_contents cc JOIN public.celebs c ON c.id=cc.celeb_id WHERE c.slug=${s(slug)} AND cc.content_id IN (${ids.map(s).join(',')});`, W)).text.trim()) : []
const rest = []
for (const b of d.books) {
  const row = cur.find((r) => r.id === b.content_id)
  if (!row) { rest.push(b); continue }
  const src = c.books[b.index]
  let ko = src.review_ko, url = src.source_url
  for (const e of b.edits ?? []) { if (e.field === 'review') ko = ko.replace(e.from, e.to); if (e.field === 'source_url') url = url.replace(e.from, e.to) }
  const en = b.review_en ?? src.review_en
  const edits = [['review', ko], ['review_en', en], ['source_url', url]].filter(([f, v]) => row[f] !== v).map(([f, v]) => ({ field: f, from: row[f], to: v }))
  const fix = `${W}/${slug}.fix.${b.index}.json`
  fs.writeFileSync(fix, JSON.stringify({ slug, content_id: b.content_id, edits }, null, 1))
  console.log('EXISTING', b.index, src.title_ko, edits.map((e) => e.field).join(','))
  if (APPLY && edits.length) console.log(execFileSync('node', ['--import', 'tsx', `${W}/fix-review.mjs`, fix, '--apply'], { cwd: R, encoding: 'utf8' }).trim().split('\n').pop())
}
fs.writeFileSync(`${W}/${slug}.decision.rest.json`, JSON.stringify({ ...d, books: rest }, null, 2))
console.log('rest', rest.length)
