/**
 * 감상 조사 원장. 출처 범위(`CELEB_CONTENT_RESEARCH_SOURCES`)마다 무엇을 찾았는지 기록하고,
 * 모든 출처의 기록이 있을 때만 0건 확정을 남긴다. 원장은 작업 폴더의 JSON이며 DB에 저장하지 않는다.
 *
 * pnpm celeb:research:ledger -- init    --dir <작업폴더> --slug a,b
 * pnpm celeb:research:ledger -- record  --dir <작업폴더> --slug a --source youtube --result found|none|na
 *                                       [--query "<검색어>"] [--url <열어 본 주소>] [--note "<메모>"]
 * pnpm celeb:research:ledger -- check   --dir <작업폴더> [--slug a,b]
 * pnpm celeb:research:ledger -- confirm-empty --dir <작업폴더> --slug a [--apply]
 *
 * 규칙: docs/project/celeb/celeb-02-01-content-research.md 「원칙」「0건 확정」
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  CELEB_CONTENT_RESEARCH_RESULTS,
  CELEB_CONTENT_RESEARCH_SOURCES,
} from '@feelandnote/shared/constants/celeb-content-research'

type Entry = { at: string; result: string; query?: string; url?: string; note?: string }
type Ledger = { slug: string; created: string; sources: Record<string, Entry[]> }

const args = process.argv.slice(2)
const command = args[0]
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const flag = (name: string) => args.includes(`--${name}`)
const dir = opt('dir')
const slugs = (opt('slug') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const KEYS = CELEB_CONTENT_RESEARCH_SOURCES.map((s) => s.key) as string[]

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}
if (!command || !dir) fail('사용법은 파일 머리말을 본다. --dir는 필수다.')
const file = (slug: string) => path.join(dir!, `${slug}.research.json`)
const load = (slug: string): Ledger => {
  if (!existsSync(file(slug))) fail(`원장이 없다: ${file(slug)} (먼저 init)`)
  return JSON.parse(readFileSync(file(slug), 'utf8'))
}
const save = (l: Ledger) => writeFileSync(file(l.slug), JSON.stringify(l, null, 1))
const missing = (l: Ledger) => KEYS.filter((k) => !(l.sources[k]?.length))
const found = (l: Ledger) => KEYS.filter((k) => l.sources[k]?.some((e) => e.result === 'found'))

async function db(pathAndQuery: string, init?: RequestInit) {
  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) fail('NEXT_PUBLIC_DB_API_URL·DB_SECRET_KEY가 없다. --env-file=.env로 실행한다.')
  const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
    ...init,
    headers: { apikey: key!, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers ?? {}) },
  })
  const body = await res.json()
  if (!res.ok) fail(`DB 오류 ${res.status}: ${JSON.stringify(body).slice(0, 300)}`)
  return body
}

if (command === 'init') {
  if (!slugs.length) fail('--slug가 필요하다.')
  mkdirSync(dir!, { recursive: true })
  for (const slug of slugs) {
    if (existsSync(file(slug))) { console.log(`있음 ${slug}`); continue }
    save({ slug, created: new Date().toISOString(), sources: Object.fromEntries(KEYS.map((k) => [k, []])) })
    console.log(`생성 ${file(slug)}`)
  }
} else if (command === 'record') {
  const source = opt('source')
  const result = opt('result')
  if (slugs.length !== 1) fail('record는 --slug 하나만 받는다.')
  if (!source || !KEYS.includes(source)) fail(`--source는 다음 중 하나다: ${KEYS.join(', ')}`)
  if (!result || !(CELEB_CONTENT_RESEARCH_RESULTS as readonly string[]).includes(result)) fail(`--result는 ${CELEB_CONTENT_RESEARCH_RESULTS.join('|')} 중 하나다.`)
  if (result !== 'na' && !opt('query') && !opt('url')) fail('found·none은 --query나 --url 가운데 하나가 있어야 한다. 무엇을 뒤졌는지 남긴다.')
  const l = load(slugs[0])
  l.sources[source!].push({ at: new Date().toISOString(), result: result!, query: opt('query'), url: opt('url'), note: opt('note') })
  save(l)
  console.log(`기록 ${l.slug} ${source} ${result} (남은 출처 ${missing(l).length})`)
} else if (command === 'check') {
  const { readdirSync } = await import('node:fs')
  const targets = slugs.length ? slugs : readdirSync(dir!).filter((f) => f.endsWith('.research.json')).map((f) => f.replace('.research.json', ''))
  let incomplete = 0
  for (const slug of targets) {
    const l = load(slug)
    const m = missing(l)
    if (m.length) incomplete++
    console.log(`${slug.padEnd(24)} ${m.length ? `미완 ${m.length}: ${m.join(', ')}` : '완료'}${found(l).length ? ` | 결과 있음: ${found(l).join(', ')}` : ''}`)
  }
  process.exit(incomplete ? 2 : 0)
} else if (command === 'confirm-empty') {
  if (slugs.length !== 1) fail('confirm-empty는 --slug 하나만 받는다.')
  const l = load(slugs[0])
  const m = missing(l)
  if (m.length) fail(`출처 기록이 빠졌다(${m.join(', ')}). 0건으로 확정하지 않는다.`)
  if (found(l).length) fail(`결과 있음으로 기록된 출처가 있다(${found(l).join(', ')}). 채택 판정을 마치고 관계를 넣거나 기록을 고친다.`)
  const [celeb] = await db(`celebs?slug=eq.${encodeURIComponent(l.slug)}&select=id,content_research_confirmed_empty_at`)
  if (!celeb) fail(`인물이 없다: ${l.slug}`)
  const rows = await db(`celeb_contents?celeb_id=eq.${celeb.id}&select=id&limit=1`)
  if (rows.length) fail('이미 감상 관계가 있다. 0건으로 확정하지 않는다.')
  if (!flag('apply')) { console.log(`확정 가능 ${l.slug}. --apply로 기록한다.`); process.exit(0) }
  const out = await db(`celebs?id=eq.${celeb.id}`, { method: 'PATCH', body: JSON.stringify({ content_research_confirmed_empty_at: new Date().toISOString() }) })
  console.log(`0건 확정 ${l.slug} ${out[0]?.content_research_confirmed_empty_at}`)
} else {
  fail(`알 수 없는 명령: ${command}`)
}
