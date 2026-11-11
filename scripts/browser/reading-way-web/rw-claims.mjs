import { R, W } from './paths.mjs'
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url)
// 미등록 판정 책이 본문에 독서 단정으로 남았는지 문장 단위로 보여 준다.
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const T = JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'))
const slugs = Object.keys(T).map(s => `'${s}'`).join(',')
const r = await database(`select json_agg(json_build_object($$slug$$,slug,$$reading_way$$,reading_way)) from celebs where slug in (${slugs})`, W)
const rows = JSON.parse(r.text.trim().match(/\[[\s\S]*\]/)[0])
for (const { slug, reading_way } of rows) {
  const ss = (reading_way || '').split(/(?<=[.다])\s+/)
  for (const s of ss) if (T[slug].some(k => s.includes(k))) console.log(`[${slug}] ${s}`)
}
