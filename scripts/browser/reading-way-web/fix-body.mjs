// 독서방식 본문(reading_way·reading_way_en)을 원값 md5 조건으로 국소 교정한다.
// 사용(저장소 루트): node --import tsx <이 파일> <교정 파일.json> [--apply]
// 교정 파일: {slug, edits:[{field:'reading_way'|'reading_way_en', from, to}]}
import { R } from './paths.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database, revalidateTags } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const { CACHE_TAGS, itemRevalidationTags } = await import(pathToFileURL(R + '/packages/shared/src/constants/cache-tags.ts').href)
const file = process.argv[2], APPLY = process.argv.includes('--apply')
const d = JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''))
const work = path.dirname(file)
const s = (x) => "'" + String(x).replaceAll("'", "''") + "'"
const md5 = (x) => crypto.createHash('md5').update(x, 'utf8').digest('hex')
const read = async () => JSON.parse((await database(`SELECT json_build_object('id',id,'reading_way',reading_way,'reading_way_en',reading_way_en) FROM public.celebs WHERE slug=${s(d.slug)};`, work)).text.trim())
const before = await read()
const after = { ...before }
for (const e of d.edits) {
  if (!['reading_way', 'reading_way_en'].includes(e.field)) throw Error('bad field ' + e.field)
  const t = after[e.field], i = t.indexOf(e.from)
  if (i < 0 || i !== t.lastIndexOf(e.from)) throw Error(`edit not unique/found: ${e.from.slice(0, 40)}`)
  after[e.field] = t.replace(e.from, e.to)
}
for (const e of d.edits) { const t = after[e.field], i = t.indexOf(e.to); console.log(`[${e.field}] …${t.slice(Math.max(0, i - 120), i + e.to.length + 120)}…\n`) }
console.log('ko', [...after.reading_way].length, 'en', after.reading_way_en.length)
if (!APPLY) process.exit(0)
const res = JSON.parse((await database(`WITH u AS (UPDATE public.celebs SET reading_way=${s(after.reading_way)}, reading_way_en=${s(after.reading_way_en)} WHERE id=${s(before.id)}::uuid AND md5(reading_way)=${s(md5(before.reading_way))} AND md5(reading_way_en)=${s(md5(before.reading_way_en))} RETURNING 1) SELECT json_build_object('n',(SELECT count(*) FROM u));`, work)).text.trim())
if (res.n !== 1) throw Error('guard failed: body changed since read')
const back = await read()
if (back.reading_way !== after.reading_way || back.reading_way_en !== after.reading_way_en) throw Error('readback mismatch')
await revalidateTags(itemRevalidationTags([{ domain: CACHE_TAGS.CELEBS, id: before.id }, { domain: CACHE_TAGS.CELEBS, id: d.slug }], [CACHE_TAGS.CELEBS]), d.slug)
console.log(JSON.stringify({ applied: true, slug: d.slug }))
