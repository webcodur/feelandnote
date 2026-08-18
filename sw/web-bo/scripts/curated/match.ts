/**
 * 기관 선정 목록의 항목을 우리 콘텐츠와 잇는다
 *
 * curated_list_items.raw_title / raw_creator 를 content_locales 의 제목·저자와 대조해
 * content_id 를 채운다. 확실한 것만 잇고 애매한 것은 손대지 않은 채 보고한다.
 *
 * 사용법 (sw/web-bo 디렉토리에서):
 *   npx tsx scripts/match-curated-items.ts --dry           # 무엇이 붙을지 보기만
 *   npx tsx scripts/match-curated-items.ts                 # 실제 연결
 *   npx tsx scripts/match-curated-items.ts --list <slug>   # 특정 목록만
 *   npx tsx scripts/match-curated-items.ts --relink        # 이미 연결된 항목도 다시 판정
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { boPath, repoPath } from '../lib/paths'


function loadEnv(p: string) {
  const t = readFileSync(p, 'utf-8')
  for (const raw of t.split('\n')) {
    const line = raw.replace(/\r$/, '')
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) {
      const v = m[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  }
}

/**
 * PostgREST는 한 번에 1,000행에서 조용히 끊는다.
 * 전수 조회는 반드시 정렬키를 고정해 페이지로 나눠 받는다.
 */
async function selectAll<T>(
  sb: SupabaseClient,
  table: string,
  columns: string,
  orderKey: string,
  eq?: { column: string; value: string }
): Promise<T[]> {
  const out: T[] = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const base = sb.from(table).select(columns).order(orderKey, { ascending: true }).range(from, from + size - 1)
    const { data, error } = await (eq ? base.eq(eq.column, eq.value) : base)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    const rows = (data ?? []) as T[]
    out.push(...rows)
    if (rows.length < size) return out
  }
}

/** 제목 대조용 정규화. 판본 표기·부제·괄호주석 차이로 같은 책을 놓치지 않게 한다. */
function normTitle(s: string): string {
  let t = s.normalize('NFKC').toLowerCase()
  t = t.replace(/[「」『』《》〈〉<>"'"'']/g, ' ')
  t = t.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')
  t = t.split(/[:：]/)[0] // 부제 제거 — DB 제목에 ": A Novel" 류가 흔하다
  t = t.replace(/^(the|a|an)\s+/i, '')
  t = t.replace(/&/g, 'and')
  t = t.replace(/[^\p{L}\p{N}]+/gu, '')
  return t
}

/** 저자 대조용. 영문은 성만, 한국어는 공백·중점을 턴 형태로 본다. */
function authorKeys(s: string | null | undefined): string[] {
  if (!s) return []
  const base = s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/;.*$/, '') // "저자; translated by 역자" 에서 역자 제거
    .replace(/\b(translated|edited|trans\.|ed\.)\b.*$/i, '')
  const parts = base
    .split(/[,&/·]|\band\b/)
    .map((p) => p.trim())
    .filter(Boolean)
  const keys = new Set<string>()
  for (const p of parts) {
    const clean = p.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
    if (!clean) continue
    keys.add(clean.replace(/\s+/g, ''))
    const words = clean.split(/\s+/).filter((w) => w.length > 1)
    if (words.length > 1) keys.add(words[words.length - 1]) // 영문 성
  }
  // 이니셜 한 글자가 열쇠가 되면 엉뚱하게 맞으므로 두 글자 이상만 쓴다.
  // 다만 이름 자체가 한 글자인 표기(「밀」)까지 버리면 대조가 아예 불가능해지므로 그때는 남긴다.
  const out = [...keys].filter((k) => k.length >= 2)
  return out.length > 0 ? out : [...keys]
}

/** 편집 거리. 저자 표기가 조금씩 어긋나는 경우가 흔하다(몽테스큐↔몽테스키외, 소새키↔소세키) */
function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (m === 0 || n === 0) return Math.max(m, n)
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

function similar(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  if (len < 3) return a === b
  const ratio = 1 - editDistance(a, b) / len
  // 짧은 이름일수록 한 글자 차이의 무게가 크므로 기준을 높인다
  return ratio >= (len <= 5 ? 0.75 : 0.82)
}

/**
 * 같은 사람의 다른 표기를 묶은 대응표(data/curated-lists/_author-aliases.json).
 * 음역 차이는 규칙으로 잡히지 않아 사람이 확인한 것만 등록한다.
 */
let aliasGroups: Set<string>[] = []
function loadAliases(path: string) {
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as { aliases?: string[][] }
    aliasGroups = (raw.aliases ?? []).map((g) => new Set(g.flatMap((n) => authorKeys(n))))
    const count = aliasGroups.length
    if (count) console.log(`  저자 대응표 ${count}건 적용`)
  } catch {
    aliasGroups = []
  }
}

function sameByAlias(a: string[], b: string[]): boolean {
  return aliasGroups.some((g) => a.some((x) => g.has(x)) && b.some((y) => g.has(y)))
}

function authorMatches(rawCreator: string | null, dbCreator: string | null): boolean {
  const a = authorKeys(rawCreator)
  const b = authorKeys(dbCreator)
  if (a.length === 0 || b.length === 0) return false
  if (a.some((x) => b.some((y) => x === y || (x.length >= 4 && (y.includes(x) || x.includes(y))) || similar(x, y))))
    return true
  return sameByAlias(a, b)
}

interface LocaleRow {
  content_id: string
  locale: string
  title: string | null
  creator: string | null
}
interface ItemRow {
  id: string
  list_id: string
  raw_title: string
  raw_creator: string | null
  content_id: string | null
}

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry')
  const relink = args.includes('--relink')
  const listIdx = args.indexOf('--list')
  const onlyList = listIdx >= 0 ? args[listIdx + 1] : null

  loadEnv(boPath('.env'))
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env as Record<string, string>
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('.env 누락')
  const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // 1. 후보 사전 — BOOK 콘텐츠의 모든 로케일 제목
  console.log('콘텐츠 사전 적재 중...')
  loadAliases(repoPath('data', 'curated-lists', '_author-aliases.json'))
  // 도서만이 아니라 영상까지 후보로 삼는다. 목록마다 대상 매체가 다르므로 판정할 때 갈라 쓴다
  const works = await selectAll<{ id: string; type: string; record_count: number | null }>(
    sb,
    'contents',
    'id, type, record_count',
    'id'
  )
  const books = works.filter((w) => w.type === 'BOOK' || w.type === 'VIDEO')
  const bookIds = new Set(books.map((b) => b.id))
  const typeById = new Map(books.map((b) => [b.id, b.type]))
  // 같은 책이 여러 건으로 등록된 경우가 있다. 실제로 쓰이는 쪽(감상 기록이 많은 쪽)을 정본으로 본다
  const useCount = new Map(books.map((b) => [b.id, b.record_count ?? 0]))
  const pickBest = (ids: string[]) =>
    [...ids].sort((x, y) => (useCount.get(y) ?? 0) - (useCount.get(x) ?? 0) || x.localeCompare(y))[0]
  const locales = await selectAll<LocaleRow>(sb, 'content_locales', 'content_id, locale, title, creator', 'content_id')
  const bookLocales = locales.filter((l) => bookIds.has(l.content_id) && l.title)
  console.log(`  도서 ${bookIds.size}종 / 제목 표기 ${bookLocales.length}건`)

  const byTitle = new Map<string, LocaleRow[]>()
  const creatorsByContent = new Map<string, string[]>()
  for (const l of bookLocales) {
    const k = normTitle(l.title as string)
    if (k) {
      const arr = byTitle.get(k)
      if (arr) arr.push(l)
      else byTitle.set(k, [l])
    }
    if (l.creator) {
      const arr = creatorsByContent.get(l.content_id)
      if (arr) arr.push(l.creator)
      else creatorsByContent.set(l.content_id, [l.creator])
    }
  }

  // 2. 대상 항목
  let lists = await selectAll<{ id: string; slug: string; title: string; content_type: string }>(
    sb,
    'curated_lists',
    'id, slug, title, content_type',
    'id'
  )
  if (onlyList) lists = lists.filter((l) => l.slug === onlyList)
  const listById = new Map(lists.map((l) => [l.id, l]))

  const items = await selectAll<ItemRow>(
    sb,
    'curated_list_items',
    'id, list_id, raw_title, raw_creator, content_id',
    'id'
  )
  const targets = items.filter((i) => listById.has(i.list_id) && (relink || !i.content_id))
  console.log(`대상 항목 ${targets.length}건\n`)

  // 3. 판정
  const updates: { id: string; content_id: string }[] = []
  const ambiguous: { list: string; title: string; creator: string | null; candidates: string[] }[] = []
  const missing: { list: string; title: string; creator: string | null }[] = []
  const noAuthorPicked: { list: string; title: string; chosen: string; among: number }[] = []
  const perList = new Map<string, { matched: number; total: number }>()

  for (const it of targets) {
    const list = listById.get(it.list_id)!
    const stat = perList.get(list.slug) ?? { matched: 0, total: 0 }
    stat.total++

    // 이 목록이 다루는 매체와 같은 것만 후보로 남긴다 — 같은 제목의 책과 영화가 섞이지 않게
    const cands = (byTitle.get(normTitle(it.raw_title)) ?? []).filter(
      (c) => typeById.get(c.content_id) === list.content_type
    )
    if (cands.length === 0) {
      missing.push({ list: list.slug, title: it.raw_title, creator: it.raw_creator })
      perList.set(list.slug, stat)
      continue
    }

    const uniqueContent = [...new Set(cands.map((c) => c.content_id))]
    let picked: string | null = null

    if (it.raw_creator) {
      // 저자가 있으면 저자까지 맞아야 붙인다 — 같은 제목 다른 책을 막는 유일한 방어선
      // 한 책의 어느 언어 표기에서든 저자가 맞으면 인정한다 (영문 목록 ↔ 한국어 저자 표기)
      const byAuthor = [...new Set(cands.map((c) => c.content_id))].filter((id) =>
        (creatorsByContent.get(id) ?? []).some((cr) => authorMatches(it.raw_creator, cr))
      )
      if (byAuthor.length >= 1) picked = pickBest(byAuthor)
      else
        ambiguous.push({
          list: list.slug,
          title: it.raw_title,
          creator: it.raw_creator,
          candidates: uniqueContent.map((id) => `${id}(저자불일치: ${cands.find((c) => c.content_id === id)?.creator ?? '-'})`),
        })
    } else {
      // 원문 목록에 저자가 없는 항목(작자 미상 고전·선집). 제목만으로 판정하되 흔적을 남긴다
      picked = pickBest(uniqueContent)
      if (uniqueContent.length > 1)
        noAuthorPicked.push({ list: list.slug, title: it.raw_title, chosen: picked, among: uniqueContent.length })
    }

    if (picked) {
      updates.push({ id: it.id, content_id: picked })
      stat.matched++
    }
    perList.set(list.slug, stat)
  }

  // 4. 보고
  console.log('목록별 결과')
  for (const [slug, s] of perList) {
    const pct = s.total ? Math.round((s.matched / s.total) * 100) : 0
    console.log(`  ${slug.padEnd(34)} ${String(s.matched).padStart(3)}/${String(s.total).padStart(3)} (${pct}%)`)
  }
  console.log(`\n연결 확정 ${updates.length} / 판단 보류 ${ambiguous.length} / 우리에게 없는 책 ${missing.length}`)

  const reportPath = repoPath('data', 'curated-lists', '_match-report.json')
  writeFileSync(
    reportPath,
    JSON.stringify(
      { generatedFor: onlyList ?? 'all', matched: updates.length, ambiguous, noAuthorPicked, missing },
      null,
      2
    ),
    'utf-8'
  )
  console.log(`상세 보고: ${reportPath}`)

  if (dry) {
    console.log('\n[점검만] 실제 연결은 하지 않았다')
    return
  }

  // 5. 반영
  let done = 0
  for (const u of updates) {
    const { error } = await sb.from('curated_list_items').update({ content_id: u.content_id }).eq('id', u.id)
    if (error) throw new Error(`연결 실패(${u.id}): ${error.message}`)
    done++
    if (done % 50 === 0) console.log(`  ${done}/${updates.length}`)
  }
  console.log(`\n연결 완료 ${done}건`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
