// 이미 반영된 celeb_contents 감상평을 원값 일치 조건으로 국소 교정한다.
// 사용(저장소 루트): node --import tsx <이 파일> <교정 파일.json> [--apply]
// 교정 파일: {slug, content_id, edits:[{field:'review'|'review_en'|'source_url', from, to}]}
import { R } from './paths.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database, revalidateTags } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const { CACHE_TAGS, itemRevalidationTags } = await import(pathToFileURL(R + '/packages/shared/src/constants/cache-tags.ts').href)
const file = process.argv[2], APPLY = process.argv.includes('--apply')
const d = JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, ''))
const work = path.dirname(file)
const s = (x) => "'" + String(x).replaceAll("'", "''") + "'"
const q = async (sql) => JSON.parse((await database(sql, work)).text.trim())
const read = () => q(`SELECT json_build_object('celeb_id',c.id,'id',cc.id,'review',cc.review,'review_en',cc.review_en,'source_url',cc.source_url) FROM public.celeb_contents cc JOIN public.celebs c ON c.id=cc.celeb_id WHERE c.slug=${s(d.slug)} AND cc.content_id=${s(d.content_id)};`)
const before = await read()
if (!before?.id) throw Error('relation not found')
const after = { ...before }
for (const e of d.edits) {
  if (!['review', 'review_en', 'source_url'].includes(e.field)) throw Error('bad field ' + e.field)
  const t = after[e.field], i = t.indexOf(e.from)
  if (i < 0 || i !== t.lastIndexOf(e.from)) throw Error(`edit not unique/found: ${e.from.slice(0, 40)}`)
  after[e.field] = t.replace(e.from, e.to)
}
const changed = ['review', 'review_en', 'source_url'].filter((f) => after[f] !== before[f])
for (const f of changed) console.log(`[${f}]\n${after[f]}\n`)
if (!APPLY) { console.log(JSON.stringify({ ready: true, changed })); process.exit(0) }
const set = changed.map((f) => `${f}=${s(after[f])}`).join(',')
const where = changed.map((f) => `${f}=${s(before[f])}`).join(' AND ')
const res = await q(`WITH u AS (UPDATE public.celeb_contents SET ${set} WHERE id=${s(before.id)} AND ${where} RETURNING 1) SELECT json_build_object('n',(SELECT count(*) FROM u));`)
if (res.n !== 1) throw Error('guard failed: row changed since read')
const back = await read()
for (const f of changed) if (back[f] !== after[f]) throw Error('readback mismatch ' + f)
await revalidateTags(itemRevalidationTags([{ domain: CACHE_TAGS.CELEBS, id: before.celeb_id }, { domain: CACHE_TAGS.CELEBS, id: d.slug }, { domain: CACHE_TAGS.CONTENTS, id: d.content_id }], [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS]), d.slug)
console.log(JSON.stringify({ applied: true, changed }))
