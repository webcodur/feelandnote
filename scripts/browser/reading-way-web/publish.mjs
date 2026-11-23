// 독서방식 처리(본문 또는 조사 미달)를 마친 inactive 인물을 active 요건 점검(celeb:audit:inactive-required) 뒤 미비가 없는 사람만 공개로 바꾼다.
// 독서방식 본문이 비어 있어도(조사 미달) 공개할 수 있다. NULL(미조사)과 대표 사진이 없는 인물은 바꾸지 않는다.
// 사용(저장소 루트): node --import tsx <이 파일> slug1,slug2 [--apply]
import { R } from './paths.mjs'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
const m = await import(pathToFileURL(R + '/scripts/browser/reading-way-argon.mjs').href)
process.loadEnvFile(R + '/sw/web-bo/.env')
const url = process.env.NEXT_PUBLIC_DB_API_URL, key = process.env.DB_SECRET_KEY
const H = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }
const APPLY = process.argv.includes('--apply')
const want = process.argv[2].split(',').filter(Boolean)
const rows = await (await fetch(`${url}/rest/v1/celebs?slug=in.(${want.map(encodeURIComponent).join(',')})&select=id,slug,publication_status,avatar_url,reading_way`, { headers: H })).json()
const inactive = rows.filter((r) => r.publication_status === 'inactive')
for (const r of rows.filter((r) => r.publication_status !== 'inactive')) console.log('ALREADY', r.slug, r.publication_status)
if (!inactive.length) process.exit(0)
const out = execFileSync('pnpm', ['--dir', 'sw/web-bo', 'celeb:audit:inactive-required', '--json', '--show-gaps', `--slugs=${inactive.map((r) => r.slug).join(',')}`], { cwd: R, encoding: 'utf8', shell: true })
const audit = JSON.parse(out.slice(out.indexOf('{')))
const list = Object.values(audit).find((v) => Array.isArray(v) && v[0]?.slug) || []
for (const c of list) {
  if (c.gaps?.length) { console.log('GAP', c.slug, c.gaps.join(',')); continue }
  const row = inactive.find((r) => r.slug === c.slug)
  if (!row?.avatar_url || row.reading_way === null) { console.log('GAP', c.slug, 'avatar/reading_way'); continue }
  if (!APPLY) { console.log('PLAN', c.slug); continue }
  const res = await fetch(`${url}/rest/v1/celebs?id=eq.${row.id}&publication_status=eq.inactive`, { method: 'PATCH', headers: H, body: JSON.stringify({ publication_status: 'active' }) })
  const back = await res.json()
  const ok = Array.isArray(back) && back.length === 1 && back[0].publication_status === 'active'
  console.log(c.slug, res.status, ok ? 'ACTIVE OK' : JSON.stringify(back).slice(0, 200))
  if (ok) await m.revalidate({ id: row.id, slug: row.slug })
}
