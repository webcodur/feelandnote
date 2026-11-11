// finals/<slug>.combined.json을 독서방식이 비어 있는 행에만 저장하고 재조회·캐시 갱신한다.
// 사용(저장소 루트): node --import tsx <이 파일> slug1,slug2 [--apply]
import { R, W } from './paths.mjs'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
const m = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
process.loadEnvFile(R + '/sw/web-bo/.env')
const url = process.env.NEXT_PUBLIC_DB_API_URL, key = process.env.DB_SECRET_KEY
const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
const APPLY = process.argv.includes('--apply')
const strip = (x) => x.replace(/\*{1,2}([^*\n]+?)\*{1,2}/g, '$1')
for (const slug of process.argv[2].split(',')) {
  const c = JSON.parse(await fs.readFile(`${W}/finals/${slug}.combined.json`, 'utf8'))
  if (c.slug !== slug || !c.ko || !c.en) throw Error('bad combined ' + slug)
  c.en = strip(c.en); c.ko = strip(c.ko)
  if (/\*/.test(c.en + c.ko)) throw Error('asterisk left ' + slug)
  const [row] = await (await fetch(`${url}/rest/v1/celebs?slug=eq.${slug}&select=id,slug,reading_way,reading_way_en`, { headers: H })).json()
  if (row.reading_way || row.reading_way_en) { console.log('SKIP already has value', slug); continue }
  if (!APPLY) { console.log('PLAN', slug, [...c.ko].length, c.en.length); continue }
  const guard = (f) => (row[f] === null ? `${f}=is.null` : `${f}=eq.`)
  const r = await fetch(`${url}/rest/v1/celebs?id=eq.${row.id}&${guard('reading_way')}&${guard('reading_way_en')}`, { method: 'PATCH', headers: H, body: JSON.stringify({ reading_way: c.ko, reading_way_en: c.en }) })
  const rows = await r.json()
  const ok = Array.isArray(rows) && rows.length === 1 && rows[0].reading_way === c.ko && rows[0].reading_way_en === c.en
  console.log(slug, r.status, ok ? 'READBACK OK' : JSON.stringify(rows).slice(0, 200))
  if (ok) await m.revalidate({ id: row.id, slug })
}
