// 조사 미달을 기록한다. 독서방식 한영이 모두 NULL인 행에만 빈 문자열을 저장하고 재조회·캐시 갱신한다(룰북 「컬럼」: 두 필드가 모두 빈 문자열 = 조사 미달).
// 사용(저장소 루트): node --import tsx <이 파일> slug1,slug2 [--apply]
import { R } from './paths.mjs'
import { pathToFileURL } from 'node:url'
const m = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
process.loadEnvFile(R + '/sw/web-bo/.env')
const url = process.env.NEXT_PUBLIC_DB_API_URL, key = process.env.DB_SECRET_KEY
const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
const APPLY = process.argv.includes('--apply')
for (const slug of process.argv[2].split(/,(?!-)/)) {
  const [row] = await (await fetch(`${url}/rest/v1/celebs?slug=eq.${encodeURIComponent(slug)}&select=id,slug,reading_way,reading_way_en`, { headers: H })).json()
  if (!row) { console.log('NO ROW', slug); continue }
  if (row.reading_way !== null || row.reading_way_en !== null) { console.log('SKIP not null', slug); continue }
  if (!APPLY) { console.log('PLAN', slug); continue }
  const r = await fetch(`${url}/rest/v1/celebs?id=eq.${row.id}&reading_way=is.null&reading_way_en=is.null`, { method: 'PATCH', headers: H, body: JSON.stringify({ reading_way: '', reading_way_en: '' }) })
  const rows = await r.json()
  const ok = Array.isArray(rows) && rows.length === 1 && rows[0].reading_way === '' && rows[0].reading_way_en === ''
  console.log(slug, r.status, ok ? 'READBACK OK' : JSON.stringify(rows).slice(0, 200))
  if (ok) await m.revalidate({ id: row.id, slug })
}
