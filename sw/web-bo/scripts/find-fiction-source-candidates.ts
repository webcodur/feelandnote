/**
 * 픽션 대표 원전으로 쓸 기존 contents 후보를 제목·저자로 찾는다.
 *
 * 읽기 전용이며 같은 작품의 여러 판본은 record_count가 높은 순으로 보여 준다.
 *
 * 실행:
 *   node --env-file=.env --import tsx scripts/find-fiction-source-candidates.ts \
 *     --queries "라마야나,Ramayana,마하바라타,Mahabharata"
 */

import { createClient } from '@supabase/supabase-js'

type ContentRow = {
  id: string
  type: string
  external_id: string | null
  external_source: string | null
  record_count: number | null
}

type LocaleRow = {
  content_id: string
  locale: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
  isbn: string | null
}

const argValue = (name: string): string | null => {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
}

const queries = (argValue('--queries') ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => value.length >= 2)
if (queries.length === 0) throw new Error('--queries "검색어,검색어"가 필요합니다.')

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const idsByQuery = new Map<string, Set<string>>()

  for (const query of queries) {
    const pattern = `%${query}%`
    const [title, creator] = await Promise.all([
      db.from('content_locales').select('content_id').ilike('title', pattern).limit(100),
      db.from('content_locales').select('content_id').ilike('creator', pattern).limit(100),
    ])
    if (title.error) throw title.error
    if (creator.error) throw creator.error
    idsByQuery.set(query, new Set([
      ...(title.data ?? []).map((row) => row.content_id as string),
      ...(creator.data ?? []).map((row) => row.content_id as string),
    ]))
  }

  const ids = [...new Set([...idsByQuery.values()].flatMap((set) => [...set]))]
  const contents: ContentRow[] = []
  const locales: LocaleRow[] = []
  for (let from = 0; from < ids.length; from += 200) {
    const chunk = ids.slice(from, from + 200)
    const [contentResult, localeResult] = await Promise.all([
      db.from('contents')
        .select('id,type,external_id,external_source,record_count')
        .in('id', chunk),
      db.from('content_locales')
        .select('content_id,locale,title,creator,thumbnail_url,isbn')
        .in('content_id', chunk),
    ])
    if (contentResult.error) throw contentResult.error
    if (localeResult.error) throw localeResult.error
    contents.push(...((contentResult.data ?? []) as ContentRow[]))
    locales.push(...((localeResult.data ?? []) as LocaleRow[]))
  }

  const contentById = new Map(contents.map((row) => [row.id, row]))
  const localesById = new Map<string, LocaleRow[]>()
  for (const locale of locales) {
    localesById.set(locale.content_id, [...(localesById.get(locale.content_id) ?? []), locale])
  }

  const report = Object.fromEntries(queries.map((query) => {
    const rows = [...(idsByQuery.get(query) ?? [])].flatMap((id) => {
      const content = contentById.get(id)
      if (!content) return []
      const editions = localesById.get(id) ?? []
      const ko = editions.find((row) => row.locale === 'ko')
      const en = editions.find((row) => row.locale === 'en')
      return [{
        id,
        type: content.type,
        recordCount: content.record_count ?? 0,
        externalSource: content.external_source,
        externalId: content.external_id,
        ko: ko ? {
          title: ko.title,
          creator: ko.creator,
          hasThumbnail: Boolean(ko.thumbnail_url),
          isbn: ko.isbn,
        } : null,
        en: en ? {
          title: en.title,
          creator: en.creator,
          hasThumbnail: Boolean(en.thumbnail_url),
          isbn: en.isbn,
        } : null,
      }]
    }).sort((a, b) => (
      b.recordCount - a.recordCount
      || (a.ko?.title ?? a.en?.title ?? '').localeCompare(
        b.ko?.title ?? b.en?.title ?? '',
        'ko',
      )
    ))
    return [query, rows]
  }))

  console.log(JSON.stringify(report, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
