import { R, W } from './paths.mjs'
import { pathToFileURL } from 'node:url'
process.loadEnvFile(R + '/sw/web-bo/.env')
const { database } = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
const T = JSON.parse(process.argv[2])
const slugs = Object.keys(T).map(s => `'${s}'`).join(',')
const r = await database(`select json_agg(json_build_object('slug',slug,'t',reading_way_en)) from celebs where slug in (${slugs})`, W)
for (const { slug, t } of JSON.parse(r.text.trim())) for (const s of t.split(/(?<=\.)\s+/)) if (T[slug].some(k => s.includes(k))) console.log(`[${slug}] ${s}`)
