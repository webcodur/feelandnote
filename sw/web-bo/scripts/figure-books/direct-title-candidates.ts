/**
 * 기존 한국어 BOOK의 제목 또는 창작자에서 활성 실존 인물의 이름이 직접 보이는 후보를 찾는다.
 * DB는 읽기만 하며, 결과는 후속 사실 검수의 입력일 뿐 자동 연결하지 않는다.
 *
 * pnpm figure-books:direct-candidates -- --out ../../data/celeb/figure-books/direct-title-candidates.json
 * pnpm figure-books:direct-candidates -- --source creator --out ../../data/celeb/figure-books/direct-creator-candidates.json
 * pnpm figure-books:direct-candidates -- --profession athlete
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

type CelebRow = {
  id: string
  slug: string
  nickname: string
  nickname_en: string | null
  profession: string | null
  headline: string | null
  bio: string | null
}

type ContentRow = {
  id: string
}

type LocaleRow = {
  content_id: string
  title: string | null
  creator: string | null
  description: string | null
  isbn: string | null
  publisher: string | null
  verified: boolean | null
  sources: unknown
}

type RelationRow = {
  content_id: string
  celeb_id: string
  relation_type: string
}

type ProductRow = {
  content_id: string
  locale: string
  platform: string
}

type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
const dbKey = process.env.DB_SECRET_KEY
if (!dbUrl || !dbKey) {
  throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
}

const db = createClient(dbUrl, dbKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const PAGE_SIZE = 1000

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline?.slice(name.length + 3)
}

async function allRows<T>(
  label: string,
  page: (from: number, to: number) => Promise<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${label} 조회 실패: ${error.message}`)
    const current = data ?? []
    rows.push(...current)
    if (current.length < PAGE_SIZE) return rows
  }
}

function normalized(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

function tokenized(value: string): string {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function usableAlias(value: string | null): string | null {
  if (!value) return null
  const alias = normalized(value)
  if (!alias) return null
  const hasHangul = /[가-힣]/u.test(alias)
  if (hasHangul ? alias.length < 2 : alias.length < 4) return null
  return alias
}

function clipped(value: string | null, maximum = 500): string | null {
  if (!value) return null
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length <= maximum ? compact : `${compact.slice(0, maximum).trim()}…`
}

async function main(): Promise<void> {
  const profession = argumentValue('profession')
  const out = argumentValue('out')
  const source = argumentValue('source') ?? 'title'
  const publicOnly = process.argv.includes('--public-only')
  if (source !== 'title' && source !== 'creator' && source !== 'both') {
    throw new Error('--source는 title, creator, both 중 하나여야 합니다.')
  }

  const [celebs, contents, locales, relations, products] = await Promise.all([
    allRows<CelebRow>('celebs', async (from, to) => {
      let query = db
        .from('celebs')
        .select('id,slug,nickname,nickname_en,profession,headline,bio')
        .eq('publication_status', 'active')
        .neq('celeb_tier', 'fiction')
        .order('id')
        .range(from, to)
      if (profession) query = query.eq('profession', profession)
      const { data, error } = await query
      return { data: data as CelebRow[] | null, error }
    }),
    allRows<ContentRow>('BOOK contents', async (from, to) => {
      const { data, error } = await db
        .from('contents')
        .select('id')
        .eq('type', 'BOOK')
        .order('id')
        .range(from, to)
      return { data: data as ContentRow[] | null, error }
    }),
    allRows<LocaleRow>('content_locales', async (from, to) => {
      const { data, error } = await db
        .from('content_locales')
        .select('content_id,title,creator,description,isbn,publisher,verified,sources')
        .eq('locale', 'ko')
        .order('content_id')
        .range(from, to)
      return { data: data as LocaleRow[] | null, error }
    }),
    allRows<RelationRow>('fiction_source_characters', async (from, to) => {
      const { data, error } = await db
        .from('fiction_source_characters')
        .select('content_id,celeb_id,relation_type')
        .order('content_id')
        .order('celeb_id')
        .range(from, to)
      return { data: data as RelationRow[] | null, error }
    }),
    allRows<ProductRow>('fiction_source_purchase_options', async (from, to) => {
      const { data, error } = await db
        .from('fiction_source_purchase_options')
        .select('content_id,locale,platform')
        .eq('locale', 'ko')
        .eq('platform', 'coupang')
        .order('content_id')
        .range(from, to)
      return { data: data as ProductRow[] | null, error }
    }),
  ])

  const bookIds = new Set(contents.map((row) => row.id))
  const existingRelations = new Map(
    relations.map((row) => [`${row.celeb_id}\u0000${row.content_id}`, row.relation_type]),
  )
  const publicKoContentIds = new Set(products.map((row) => row.content_id))
  const books = locales
    .filter((row) => (
      row.title
      && bookIds.has(row.content_id)
      && (!publicOnly || publicKoContentIds.has(row.content_id))
    ))
    .map((row) => ({
      ...row,
      normalizedTitle: normalized(row.title!),
      tokenizedTitle: tokenized(row.title!),
      normalizedCreator: row.creator ? normalized(row.creator) : '',
      tokenizedCreator: row.creator ? tokenized(row.creator) : '',
    }))

  const candidates = celebs.flatMap((celeb) => {
    const aliases: Array<{
      field: 'nickname' | 'nickname_en'
      value: string
      tokenized: string
    }> = []
    const nickname = usableAlias(celeb.nickname)
    const nicknameEn = usableAlias(celeb.nickname_en)
    if (nickname) aliases.push({
      field: 'nickname',
      value: nickname,
      tokenized: tokenized(celeb.nickname),
    })
    if (nicknameEn && celeb.nickname_en) aliases.push({
      field: 'nickname_en',
      value: nicknameEn,
      tokenized: tokenized(celeb.nickname_en),
    })

    return books.flatMap((book) => {
      const titleMatch = source !== 'creator'
        ? aliases.find((alias) => alias.field === 'nickname'
            ? book.normalizedTitle.includes(alias.value)
            : ` ${book.tokenizedTitle} `.includes(` ${alias.tokenized} `))
        : undefined
      const creatorMatch = source !== 'title'
        ? aliases.find((alias) => ` ${book.tokenizedCreator} `.includes(` ${alias.tokenized} `))
        : undefined
      const match = titleMatch ?? creatorMatch
      if (!match) return []
      const creatorMatched = Boolean(creatorMatch)
      const descriptionMatch = book.description
        ? normalized(book.description).includes(match.value)
        : false
      const hasHangul = /[가-힣]/u.test(match.value)
      const fullNameSignal = hasHangul ? match.value.length >= 4 : match.tokenized.includes(' ')
      const signal = creatorMatched
        ? 'creator'
        : descriptionMatch
          ? 'description'
          : fullNameSignal
            ? 'full-name-title'
            : 'weak'
      return [{
        person: {
          id: celeb.id,
          slug: celeb.slug,
          nickname: celeb.nickname,
          nicknameEn: celeb.nickname_en,
          profession: celeb.profession,
          headline: celeb.headline,
          bio: clipped(celeb.bio),
        },
        book: {
          contentId: book.content_id,
          title: book.title,
          creator: book.creator,
          description: clipped(book.description, 700),
          isbn: book.isbn,
          publisher: book.publisher,
          verified: book.verified,
          sources: book.sources,
          publicKoCoupang: publicKoContentIds.has(book.content_id),
        },
        matchField: match.field,
        matchLocation: titleMatch ? 'title' : 'creator',
        signal,
        existingRelation: existingRelations.get(`${celeb.id}\u0000${book.content_id}`) ?? null,
      }]
    })
  }).sort((left, right) => (
    (left.person.profession ?? '').localeCompare(right.person.profession ?? '')
    || left.person.nickname.localeCompare(right.person.nickname)
    || (left.book.title ?? '').localeCompare(right.book.title ?? '')
  ))

  const document = {
    generatedAt: new Date().toISOString(),
    filter: { profession: profession ?? null, source, publicOnly },
    totals: {
      peopleScanned: celebs.length,
      koreanBooksScanned: books.length,
      candidateRows: candidates.length,
      candidatePeople: new Set(candidates.map((row) => row.person.id)).size,
      alreadyLinkedRows: candidates.filter((row) => row.existingRelation).length,
      publicKoCoupangRows: candidates.filter((row) => row.book.publicKoCoupang).length,
      strongCandidateRows: candidates.filter((row) => row.signal !== 'weak').length,
      strongCandidatePeople: new Set(
        candidates.filter((row) => row.signal !== 'weak').map((row) => row.person.id),
      ).size,
    },
    candidates,
  }

  console.log(JSON.stringify(document.totals, null, 2))
  if (out) {
    const outputPath = resolve(process.cwd(), out)
    writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8')
    console.log(`WROTE ${outputPath}`)
  } else {
    console.log(JSON.stringify(candidates.slice(0, 50), null, 2))
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
