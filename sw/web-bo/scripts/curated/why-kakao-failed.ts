/**
 * 「서점에서 못 찾음」으로 떨어진 항목이 어느 관문에서 걸렸는지 카카오 응답으로 캔다
 *
 * `titles-apply.ts` 는 카카오 결과 가운데 제목과 저자가 둘 다 맞는 첫 건만 쓴다.
 * 그래서 검색은 성공했는데 관문에서 떨어지는 일이 생긴다. 이 스크립트는
 * 실제 응답 상위 몇 건과 제목·저자 판정을 나란히 찍어 원인을 드러낸다.
 *
 * 사용법 (sw/web-bo 에서):
 *   npx tsx scripts/curated/why-kakao-failed.ts            # 못 찾은 것 중 20건 표본
 *   npx tsx scripts/curated/why-kakao-failed.ts --n 40
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { REPO_ROOT } from '../lib/paths'

const ROOT = REPO_ROOT
const WORK = join(ROOT, 'data/curated-lists/_korean-titles')
function loadEnv(p: string) {
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv(join(ROOT, '.env'))
loadEnv(join(ROOT, 'sw/web-bo/.env'))
loadEnv(join(ROOT, 'sw/web/.env'))

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL!,
  (process.env.DB_SECRET_KEY || process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY)!,
)

// titles-apply.ts 와 같은 규칙 (바꾸면 양쪽을 함께 고친다)
const normTitle = (s: string) =>
  s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[:：].*$/, ' ').replace(/\b(the|a|an)\b/g, ' ').replace(/[^\p{L}\p{N}]/gu, '')
const normCreator = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^\p{L}\p{N}]/gu, '')
const creatorTokens = (s: string) =>
  s.toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[\s.,·^&/;|]+/).map((t) => t.replace(/[^\p{L}\p{N}]/gu, '')).filter((t) => t.length >= 2)
function titleMatches(want: string, got: string) {
  const a = normTitle(want), b = normTitle(got)
  if (!a || !b) return false
  if (a === b) return true
  return (a.length >= 2 && b.startsWith(a)) || (b.length >= 2 && a.startsWith(b))
}
function creatorMatches(want: string | null, got: string | null) {
  if (!want || !got) return false
  const a = normCreator(want), b = normCreator(got)
  if (!a || !b) return false
  if (a === b) return true
  for (const part of got.split(/[\^,·&]/)) {
    const p = normCreator(part)
    if (p && (p === a || (p.length >= 2 && a.includes(p)) || (a.length >= 2 && p.includes(a)))) return true
  }
  const A = creatorTokens(want), B = creatorTokens(got)
  if (A.length && B.length) {
    const [s, l] = A.length <= B.length ? [A, B] : [B, A]
    if (s.every((t) => l.includes(t))) return true
  }
  return a.includes(b) || b.includes(a)
}

async function searchKakao(query: string) {
  const key = process.env.KAKAO_REST_API_KEY
  if (!key) throw new Error('KAKAO_REST_API_KEY 없음')
  const res = await fetch(`https://dapi.kakao.com/v3/search/book?query=${encodeURIComponent(query)}&size=20`, {
    headers: { Authorization: `KakaoAK ${key}` },
  })
  if (!res.ok) return []
  const j = (await res.json()) as { documents?: { title: string; authors: string[] }[] }
  return (j.documents ?? []).map((d) => ({ title: d.title, creator: (d.authors ?? []).join('^') }))
}

type Answer = { id: string; koTitle: string | null; koCreator: string | null }
type Target = { id: string; state: string; contentId: string | null; listSlug: string }

async function main() {
  const nIdx = process.argv.indexOf('--n')
  const N = nIdx > 0 ? Number(process.argv[nIdx + 1]) : 20
  const answers: Record<string, Answer> = JSON.parse(readFileSync(join(WORK, 'answers.json'), 'utf8'))
  const targets: Target[] = JSON.parse(readFileSync(join(WORK, 'targets.json'), 'utf8'))
  const byId = new Map(targets.map((t) => [t.id, t]))

  // 아직 한국어 연결이 없는데 한국어 제목은 아는 것 = 카카오에서 찾았어야 할 것
  const missing = Object.values(answers).filter((r) => {
    const t = byId.get(r.id)
    return r.koTitle && t && t.state !== 'linked-ko'
  })
  console.log(`한국어 제목은 아는데 아직 연결 안 된 것 ${missing.length}건 · 표본 ${N}건 조사\n`)

  const tally = { 검색0건: 0, 제목불일치: 0, 저자불일치: 0, 통과: 0 }
  for (const m of missing.slice(0, N)) {
    const q = m.koCreator ? `${m.koTitle} ${m.koCreator}` : m.koTitle!
    let found = await searchKakao(q)
    if (!found.length) found = await searchKakao(m.koTitle!)
    await new Promise((r) => setTimeout(r, 150))

    const okTitle = found.filter((f) => titleMatches(m.koTitle!, f.title))
    const best = okTitle.find((f) => !m.koCreator || creatorMatches(m.koCreator, f.creator))
    let why: keyof typeof tally
    if (!found.length) why = '검색0건'
    else if (!okTitle.length) why = '제목불일치'
    else if (!best) why = '저자불일치'
    else why = '통과'
    tally[why]++

    console.log(`[${why}] ${m.koTitle} / ${m.koCreator ?? ''}`)
    if (why === '제목불일치' || why === '저자불일치') {
      found.slice(0, 3).forEach((f) => console.log(`        카카오: ${f.title.slice(0, 44)} / ${f.creator.slice(0, 30)}`))
    }
  }
  console.log(`\n${JSON.stringify(tally)}`)
}

main().catch((e) => {
  console.error(String(e?.message ?? e))
  process.exit(1)
})
