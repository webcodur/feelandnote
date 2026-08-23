/**
 * 도서의 영문 소개를 채운다.
 *
 * 카카오는 한국어 소개만 준다. 영문 화면은 원서 ISBN이 있을 때만 OpenLibrary가 답해 왔고,
 * ISBN이 없는 절반은 소개가 통째로 비었다. ISBN을 거치지 않고 제목·저자로 work를 찾아
 * 소개를 받아 DB에 넣는다.
 *
 * OpenLibrary의 description은 사람이 손으로 채우는 칸이라 편집 메모와 출처 머리말이 섞인다.
 * 그대로 실으면 화면에 "This seems to be a duplicate entry of …"가 뜬다. 여기서 걸러 낸다.
 *
 * 실행:
 *   pnpm contents:book-en --limit 20 --dry
 *   pnpm contents:book-en --limit 5000
 */

import path from 'node:path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.resolve(process.cwd(), '.env'), quiet: true })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

const MIN_LENGTH = 60

interface Target {
  contentId: string
  koTitle: string
  enTitle: string
  enCreator: string
  sources: Record<string, unknown>
}

interface SearchDoc {
  key?: string
  title?: string
  author_name?: string[]
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** 부제와 앞 관사를 떼어 후보를 늘린다. OpenLibrary는 부제를 빼고 등록한 경우가 많다. */
function titleCandidates(raw: string): string[] {
  const trimmed = raw.trim()
  const out = [trimmed]
  const withoutSubtitle = trimmed.split(/\s*[:：]\s*/)[0]
  if (withoutSubtitle && withoutSubtitle !== trimmed) out.push(withoutSubtitle)
  for (const value of [...out]) {
    const withoutArticle = value.replace(/^(the|a|an)\s+/i, '')
    if (withoutArticle !== value) out.push(withoutArticle)
  }
  return [...new Set(out)]
}

/** 저자는 성만 맞아도 통과시킨다. OpenLibrary는 중간 이름·표기 순서가 제각각이다. */
function authorMatches(names: string[], want: string): boolean {
  if (!want) return true
  const wantWhole = normalize(want)
  const wantLast = normalize(want.split(/\s+/).filter(Boolean).pop() ?? '')
  return names.some((name) => {
    const value = normalize(name)
    if (!value) return false
    if (value.includes(wantWhole) || wantWhole.includes(value)) return true
    return wantLast.length >= 3 && value.includes(wantLast)
  })
}

async function getJson<T>(target: string): Promise<T | null> {
  try {
    const res = await fetch(target, {
      headers: { 'User-Agent': 'feelandnote/1.0 (contents backfill)' },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** 편집 메모와 출처 머리말을 걷어 낸다. 소개로 못 쓸 것은 null로 돌려보낸다. */
export function cleanIntro(raw: unknown): string | null {
  const source = typeof raw === 'string' ? raw : (raw as { value?: string })?.value
  if (!source) return null

  let text = source
    .replace(/^\s*(description|synopsis|summary)\s*(on|from)?\s*[^:\n]{0,30}:\s*/i, '')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1')
    .replace(/-{3,}[\s\S]*$/, '')
    .replace(/\(\s*source:[^)]*\)/gi, '')
    .replace(/\bcontains? spoilers?\b[.!]?/gi, '')
    .trim()

  // 편집자끼리 남긴 정리용 메모. 소개가 아니다.
  if (/^(this|it)\s+(seems|appears|looks)\s+to\s+be\s+a?\s*(duplicate|copy)/i.test(text)) return null
  if (/^(duplicate|same as|see also|see |merged|redirect)/i.test(text)) return null
  if (/^https?:\/\//i.test(text)) return null

  // 링크만 남은 문장을 걷어 내고 남은 것이 없으면 버린다
  text = text.replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').trim()
  if (text.length < MIN_LENGTH) return null
  return text
}

async function findWork(title: string, author: string): Promise<string | null> {
  for (const candidate of titleCandidates(title)) {
    const params = new URLSearchParams({
      title: candidate,
      limit: '5',
      fields: 'key,title,author_name',
    })
    if (author) params.set('author', author)
    const body = await getJson<{ docs?: SearchDoc[] }>(
      `https://openlibrary.org/search.json?${params}`,
    )
    const want = normalize(candidate)
    for (const doc of body?.docs ?? []) {
      if (!doc.key || !doc.title) continue
      const docTitle = normalize(doc.title)
      const docTitleNoSub = normalize(doc.title.split(/\s*[:：]\s*/)[0])
      if (docTitle !== want && docTitleNoSub !== want) continue
      if (!authorMatches(doc.author_name ?? [], author)) continue
      return doc.key
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return null
}

/** work에 소개가 없으면 영문 판본의 소개를 찾는다. */
async function introOfWork(workKey: string): Promise<string | null> {
  const work = await getJson<{ description?: unknown }>(`https://openlibrary.org${workKey}.json`)
  const direct = cleanIntro(work?.description)
  if (direct) return direct

  const editions = await getJson<{
    entries?: { description?: unknown; languages?: { key: string }[] }[]
  }>(`https://openlibrary.org${workKey}/editions.json?limit=50`)
  for (const entry of editions?.entries ?? []) {
    const languages = entry.languages ?? []
    if (languages.length && !languages.some((l) => l.key === '/languages/eng')) continue
    const text = cleanIntro(entry.description)
    if (text) return text
  }
  return null
}

async function loadTargets(limit: number): Promise<Target[]> {
  const out: Target[] = []
  const PAGE = 500
  for (let from = 0; out.length < limit; from += PAGE) {
    const { data, error } = await db
      .from('contents')
      .select('id, content_locales(locale, title, creator, description, sources)')
      .eq('type', 'BOOK')
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data?.length) break

    for (const row of data) {
      const locales = (row.content_locales ?? []) as {
        locale: string
        title: string | null
        creator: string | null
        description: string | null
        sources: Record<string, unknown> | null
      }[]
      const ko = locales.find((l) => l.locale === 'ko')
      const en = locales.find((l) => l.locale === 'en')
      if (!en?.title?.trim()) continue
      if (en.description?.trim()) continue
      // 영문 제목이 한국어 제목과 같으면 원서가 없는 한국 책이다. 여기서는 다루지 않는다.
      if (en.title === ko?.title) continue

      out.push({
        contentId: row.id as string,
        koTitle: ko?.title ?? '',
        enTitle: en.title,
        enCreator: en.creator ?? '',
        sources: en.sources ?? {},
      })
      if (out.length >= limit) break
    }
    if (data.length < PAGE) break
  }
  return out
}

async function save(target: Target, text: string, workKey: string) {
  const sources = { ...target.sources, description: `https://openlibrary.org${workKey}` }
  const { error } = await db
    .from('content_locales')
    .update({ description: text, sources })
    .eq('content_id', target.contentId)
    .eq('locale', 'en')
  if (error) throw error
}

async function main() {
  const args = process.argv.slice(2)
  const limit = Number(args[args.indexOf('--limit') + 1]) || 20
  const dry = args.includes('--dry')

  const targets = await loadTargets(limit)
  console.log(`대상 ${targets.length}건 (dry=${dry})\n`)

  const stat = { filled: 0, noIntro: 0, noWork: 0 }

  for (const [index, target] of targets.entries()) {
    const label = `${index + 1}/${targets.length} ${target.enTitle}`
    const workKey = await findWork(target.enTitle, target.enCreator)
    if (!workKey) {
      stat.noWork += 1
      console.log(`- ${label} | work 못 찾음`)
      continue
    }
    const text = await introOfWork(workKey)
    if (!text) {
      stat.noIntro += 1
      console.log(`- ${label} | 소개 없음`)
      continue
    }
    console.log(`✔ ${label} | ${text.replace(/\s+/g, ' ').slice(0, 60)}`)
    if (!dry) await save(target, text, workKey)
    stat.filled += 1
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log(`\n완료 · 채움 ${stat.filled} · 소개없음 ${stat.noIntro} · work못찾음 ${stat.noWork}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
