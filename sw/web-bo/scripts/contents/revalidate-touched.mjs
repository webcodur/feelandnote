/**
 * 바뀐 작품·목록의 캐시만 비운다. 도메인 전체를 비우지 않는다(이후 방문마다 재생성이 쌓인다).
 * 입력 JSON: { contents: [id…], lists: [id…] } — display-names-apply.mjs 의 applied.json, relink-lost-items.ts 의 relink-touched.json
 *
 * node --env-file=.env scripts/contents/revalidate-touched.mjs --file <json> [--yes] [--site=https://feelandnote.com]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { argumentValue } from '../figure-books/lib/figure-work.mjs'

const SITE = argumentValue('site', 'https://feelandnote.com')
const SECRET = process.env.CRON_SECRET
const go = process.argv.includes('--yes')
const input = JSON.parse(readFileSync(resolve(process.cwd(), argumentValue('file', '')), 'utf8'))
const tags = [...new Set([...(input.lists ?? []).map((id) => `curated:${id}`), ...(input.contents ?? []).map((id) => `contents:${id}`)])]
console.log(`목록 ${input.lists?.length ?? 0} · 작품 ${input.contents?.length ?? 0} → 태그 ${tags.length}개`)
if (!SECRET) throw new Error('CRON_SECRET 이 없다')
if (!go) { console.log(tags.slice(0, 5).join('\n')); console.log('\n[점검만] 실제로 보내려면 --yes'); process.exit(0) }
for (let i = 0; i < tags.length; i += 150) {
  const chunk = tags.slice(i, i + 150)
  const res = await fetch(`${SITE}/api/revalidate`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tag: chunk, secret: SECRET }) })
  console.log(`  ${i / 150 + 1}차 ${chunk.length}개 → ${res.status} ${(await res.text()).slice(0, 100)}`)
}
