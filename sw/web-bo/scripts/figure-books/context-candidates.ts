/**
 * 활성 실존 인물의 구체적인 활동 맥락과 기존 한국어 BOOK을 보수적으로 맞춘다.
 * 후보만 만들며 DB는 쓰지 않는다. 결과는 사람별 편집 심사를 거쳐야 한다.
 *
 * pnpm figure-books:context-candidates -- --out ../../data/celeb/figure-books/context-candidates.json
 * pnpm figure-books:context-candidates -- --profession athlete --public-only
 */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { CONTEXT_ANCHORS, findContextAnchorKeys } from './context-anchors'

type CelebRow = {
  id: string
  slug: string
  nickname: string
  nickname_en: string | null
  profession: string | null
  headline: string | null
  bio: string | null
}

type ContentRow = { id: string }

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

type CuratedListRow = {
  id: string
  title: string
  topics: string[] | null
  is_featured: boolean
  is_ranked: boolean
}

type CuratedItemRow = {
  content_id: string | null
  list_id: string
  hidden: boolean
  rank: number | null
}

type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
const dbKey = process.env.DB_SECRET_KEY
if (!dbUrl || !dbKey) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')

const db = createClient(dbUrl, dbKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const PAGE_SIZE = 1000

const STOPWORDS = new Set([
  '그리고', '그러나', '대한', '대해', '통해', '위한', '에서', '으로', '에게', '까지', '부터',
  '이후', '현재', '당시', '최초', '최고', '대표', '주요', '유명', '세계', '세기', '현대',
  '한국', '한국인', '미국', '영국', '중국', '일본', '프랑스', '독일', '러시아', '출신',
  '사람', '인물', '작품', '시리즈', '활동', '분야', '관련', '이야기', '기록', '수상',
  '받았다', '올랐다', '세운', '만든', '되어', '되었다', '한다', '했다', '있다', '없는',
  '나는', '우리', '너는', '그는', '그녀', '이것', '저것', '어떻게', '이유', '쓰는',
  '정신', '변신', '비극', '거장', '그린', '사자의', '완전판', '개정판', '증보판',
  '전집', '세트', '합본', '부작', '권', '편',
  '대한민국', '이탈리아', '이스라엘', '우크라이나', '이집트', '페르시아', '동아시아',
  '아메리칸', '프로젝트', '아카데미', '아티스트', '유니버스', '스페이스',
  '네트워크', '아름다움', '카리스마', 'dream',
  'the', 'and', 'for', 'from', 'with', 'that', 'this', 'his', 'her', 'their', 'into', 'book',
])

const KOREAN_SUFFIXES = [
  '으로부터', '에게서는', '에서는', '에게서', '으로써', '이라고', '이라는', '으로', '에게',
  '에서', '까지', '부터', '처럼', '보다', '이며', '이고', '이다', '였다', '했다', '하는',
  '되어', '된', '의', '을', '를', '이', '가', '은', '는', '과', '와', '로',
]

function argumentValue(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline?.slice(name.length + 3)
}

function positiveInteger(name: string, fallback: number): number {
  const raw = argumentValue(name)
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`--${name}은 1 이상의 정수여야 합니다.`)
  return parsed
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
  return value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

function coreTitle(value: string): string {
  return value.split(/\s*[\(\[\{（【]/u, 1)[0].trim()
}

function sourcePrimary(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const primary = (value as Record<string, unknown>).primary
  return typeof primary === 'string' ? primary : null
}

function stemToken(token: string): string {
  if (!/[가-힣]/u.test(token)) return token
  for (const suffix of KOREAN_SUFFIXES) {
    if (token.endsWith(suffix) && token.length - suffix.length >= 2) {
      return token.slice(0, -suffix.length)
    }
  }
  return token
}

function tokens(value: string | null): Set<string> {
  if (!value) return new Set()
  const matches = value.normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  const result = new Set<string>()
  for (const raw of matches) {
    if (raw.length < 2 || /^\d+$/u.test(raw)) continue
    const token = stemToken(raw)
    if (token.length < 2 || STOPWORDS.has(token)) continue
    result.add(token)
  }
  return result
}

function clipped(value: string | null, maximum = 650): string | null {
  if (!value) return null
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length <= maximum ? compact : `${compact.slice(0, maximum).trim()}…`
}

function extractNamedWorks(value: string): string[] {
  const patterns = [
    /「([^」]{2,80})」/gu,
    /『([^』]{2,80})』/gu,
    /“([^”]{2,80})”/gu,
    /‘([^’]{2,80})’/gu,
    /'([^']{2,80})'/gu,
    /"([^"]{2,80})"/gu,
  ]
  const works = new Set<string>()
  for (const pattern of patterns) {
    for (const match of value.matchAll(pattern)) {
      const work = match[1].replace(/\s+/g, ' ').trim()
      if (normalized(work).length >= 3) works.add(work)
    }
  }
  return [...works]
}

function intersection(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((value) => right.has(value))
}

function isSpecificSharedTitleToken(token: string): boolean {
  if (/\d/u.test(token)) return false
  if (/^[가-힣]+$/u.test(token)) return token.length >= 4
  return token.length >= 5
}

async function main(): Promise<void> {
  const profession = argumentValue('profession')
  const output = argumentValue('out')
  const scope = argumentValue('scope') ?? 'unlinked'
  const publicOnly = process.argv.includes('--public-only')
  const maximumCandidates = positiveInteger('max-candidates', 12)
  if (scope !== 'unlinked' && scope !== 'all') throw new Error('--scope는 unlinked 또는 all이어야 합니다.')

  const [celebs, contents, locales, relations, products, curatedLists, curatedItems] = await Promise.all([
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
    allRows<LocaleRow>('한국어 BOOK 메타', async (from, to) => {
      const { data, error } = await db
        .from('content_locales')
        .select('content_id,title,creator,description,isbn,publisher,verified,sources')
        .eq('locale', 'ko')
        .order('content_id')
        .range(from, to)
      return { data: data as LocaleRow[] | null, error }
    }),
    allRows<RelationRow>('인물 도서 관계', async (from, to) => {
      const { data, error } = await db
        .from('fiction_source_characters')
        .select('content_id,celeb_id,relation_type')
        .order('content_id')
        .order('celeb_id')
        .range(from, to)
      return { data: data as RelationRow[] | null, error }
    }),
    allRows<ProductRow>('공개 쿠팡 상품', async (from, to) => {
      const { data, error } = await db
        .from('fiction_source_purchase_options')
        .select('content_id,locale,platform')
        .eq('locale', 'ko')
        .eq('platform', 'coupang')
        .order('content_id')
        .range(from, to)
      return { data: data as ProductRow[] | null, error }
    }),
    allRows<CuratedListRow>('도서 추천목록', async (from, to) => {
      const { data, error } = await db
        .from('curated_lists')
        .select('id,title,topics,is_featured,is_ranked')
        .eq('content_type', 'BOOK')
        .order('id')
        .range(from, to)
      return { data: data as CuratedListRow[] | null, error }
    }),
    allRows<CuratedItemRow>('도서 추천목록 항목', async (from, to) => {
      const { data, error } = await db
        .from('curated_list_items')
        .select('content_id,list_id,hidden,rank')
        .not('content_id', 'is', null)
        .order('id')
        .range(from, to)
      return { data: data as CuratedItemRow[] | null, error }
    }),
  ])

  const bookIds = new Set(contents.map((row) => row.id))
  const linkedCelebIds = new Set(relations.map((row) => row.celeb_id))
  const existingRelations = new Set(
    relations.map((row) => `${row.celeb_id}\u0000${row.content_id}`),
  )
  const publicContentIds = new Set(products.map((row) => row.content_id))
  const curatedListById = new Map(curatedLists.map((row) => [row.id, row]))
  const curatedByContent = new Map<string, {
    listCount: number
    featuredListCount: number
    rankedListCount: number
    bestRank: number | null
    listTitles: string[]
    topics: string[]
  }>()
  for (const item of curatedItems) {
    if (!item.content_id || item.hidden) continue
    const list = curatedListById.get(item.list_id)
    if (!list) continue
    const current = curatedByContent.get(item.content_id) ?? {
      listCount: 0,
      featuredListCount: 0,
      rankedListCount: 0,
      bestRank: null,
      listTitles: [],
      topics: [],
    }
    current.listCount += 1
    if (list.is_featured) current.featuredListCount += 1
    if (list.is_ranked) current.rankedListCount += 1
    if (item.rank !== null && (current.bestRank === null || item.rank < current.bestRank)) {
      current.bestRank = item.rank
    }
    current.listTitles.push(list.title)
    current.topics.push(...(list.topics ?? []))
    curatedByContent.set(item.content_id, current)
  }
  const targets = celebs.filter((celeb) => scope === 'all' || !linkedCelebIds.has(celeb.id))
  const books = locales
    .filter((book) => (
      book.title
      && bookIds.has(book.content_id)
      && book.verified === true
      && Boolean(book.isbn)
      && sourcePrimary(book.sources) === 'kakao_book'
      && (!publicOnly || publicContentIds.has(book.content_id))
    ))
    .map((book) => {
      const titleCore = coreTitle(book.title!)
      const titleTokens = tokens(titleCore)
      const descriptionTokens = tokens(book.description)
      const curation = curatedByContent.get(book.content_id) ?? {
        listCount: 0,
        featuredListCount: 0,
        rankedListCount: 0,
        bestRank: null,
        listTitles: [],
        topics: [],
      }
      return {
        ...book,
        normalizedTitle: normalized(book.title!),
        normalizedCoreTitle: normalized(titleCore),
        titleTokens,
        descriptionTokens,
        titleAnchors: new Set(findContextAnchorKeys(titleCore)),
        descriptionAnchors: new Set(findContextAnchorKeys(book.description ?? '')),
        curation,
      }
    })

  const documentFrequency = new Map<string, number>()
  for (const book of books) {
    for (const token of new Set([...book.titleTokens, ...book.descriptionTokens])) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1)
    }
  }
  const inverseDocumentFrequency = (token: string) => (
    Math.log((books.length + 1) / ((documentFrequency.get(token) ?? 0) + 1)) + 1
  )
  const anchorByKey = new Map(CONTEXT_ANCHORS.map((anchor) => [anchor.key, anchor]))

  const candidates: Array<Record<string, unknown>> = []
  const unmatchedPeople: Array<Record<string, unknown>> = []
  for (const person of targets) {
    const profileText = `${person.headline ?? ''} ${person.bio ?? ''}`.trim()
    const profileAnchors = new Set(findContextAnchorKeys(profileText))
    const profileTokens = tokens(profileText)
    for (const token of tokens(`${person.nickname} ${person.nickname_en ?? ''}`)) profileTokens.delete(token)
    const namedWorks = extractNamedWorks(profileText)
    const personCandidates = books.flatMap((book) => {
      if (existingRelations.has(`${person.id}\u0000${book.content_id}`)) return []

      const workMatches = namedWorks.filter((work) => {
        const normalizedWork = normalized(work)
        if (book.normalizedCoreTitle === normalizedWork) return normalizedWork.length >= 3
        if (normalizedWork.length < 4 || book.normalizedCoreTitle.length < 4) return false
        return book.normalizedCoreTitle.includes(normalizedWork)
          || normalizedWork.includes(book.normalizedCoreTitle)
      })
      const titleAnchors = intersection(profileAnchors, book.titleAnchors)
      const descriptionAnchors = intersection(profileAnchors, book.descriptionAnchors)
        .filter((key) => !titleAnchors.includes(key))
      const sharedTitle = intersection(profileTokens, book.titleTokens)
        .filter((token) => (
          isSpecificSharedTitleToken(token)
          && inverseDocumentFrequency(token) >= 3.8
        ))
        .sort((left, right) => inverseDocumentFrequency(right) - inverseDocumentFrequency(left))
      const sharedDescription = intersection(profileTokens, book.descriptionTokens)
        .filter((token) => inverseDocumentFrequency(token) >= 5.8 && !sharedTitle.includes(token))
        .sort((left, right) => inverseDocumentFrequency(right) - inverseDocumentFrequency(left))

      if (
        workMatches.length === 0
        && titleAnchors.length === 0
        && sharedTitle.length === 0
      ) return []
      if (
        workMatches.length === 0
        && sharedTitle.length === 0
        && book.curation.listCount === 0
        && !publicContentIds.has(book.content_id)
      ) return []

      const score = workMatches.length * 90
        + titleAnchors.length * 32
        + descriptionAnchors.length * 4
        + sharedTitle.reduce((sum, token) => sum + inverseDocumentFrequency(token) * 5, 0)
        + sharedDescription.reduce((sum, token) => sum + inverseDocumentFrequency(token), 0)
        + book.curation.listCount * 8
        + book.curation.featuredListCount * 5
        + book.curation.rankedListCount * 3
        + (book.curation.bestRank !== null ? Math.max(0, 6 - Math.log10(book.curation.bestRank + 1) * 3) : 0)
        + (publicContentIds.has(book.content_id) ? 20 : 0)
      const titleAnchorLabels = titleAnchors.map((key) => anchorByKey.get(key)?.label ?? key)
      const descriptionAnchorLabels = descriptionAnchors
        .map((key) => anchorByKey.get(key)?.label ?? key)

      return [{
        person: {
          id: person.id,
          slug: person.slug,
          nickname: person.nickname,
          nicknameEn: person.nickname_en,
          profession: person.profession,
          headline: person.headline,
          bio: clipped(person.bio),
        },
        book: {
          contentId: book.content_id,
          title: book.title,
          creator: book.creator,
          description: clipped(book.description, 750),
          isbn: book.isbn,
          publisher: book.publisher,
          verified: book.verified,
          sources: book.sources,
          publicKoCoupang: publicContentIds.has(book.content_id),
          curation: {
            listCount: book.curation.listCount,
            featuredListCount: book.curation.featuredListCount,
            rankedListCount: book.curation.rankedListCount,
            bestRank: book.curation.bestRank,
            listTitles: [...new Set(book.curation.listTitles)].slice(0, 8),
            topics: [...new Set(book.curation.topics)],
          },
        },
        signal: 'context',
        contextScore: Number(score.toFixed(2)),
        contextEvidence: {
          namedWorks: workMatches,
          titleAnchors: titleAnchorLabels,
          supportingDescriptionAnchors: descriptionAnchorLabels,
          sharedTitleTerms: sharedTitle.slice(0, 5),
          sharedDescriptionTerms: sharedDescription.slice(0, 5),
        },
        existingRelation: null,
      }]
    }).sort((left, right) => (
      Number(right.contextScore) - Number(left.contextScore)
      || String((left.book as { title?: string }).title ?? '')
        .localeCompare(String((right.book as { title?: string }).title ?? ''))
    )).slice(0, maximumCandidates)

    if (personCandidates.length === 0) {
      unmatchedPeople.push({
        id: person.id,
        slug: person.slug,
        nickname: person.nickname,
        profession: person.profession,
        headline: person.headline,
        bio: clipped(person.bio),
        anchors: [...profileAnchors].map((key) => anchorByKey.get(key)?.label ?? key),
        namedWorks,
      })
    } else {
      candidates.push(...personCandidates)
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    filter: {
      profession: profession ?? null,
      scope,
      publicOnly,
      verifiedKakaoWithIsbn: true,
      maximumCandidates,
    },
    totals: {
      peopleScanned: celebs.length,
      targetPeople: targets.length,
      eligibleBooks: books.length,
      candidateRows: candidates.length,
      candidatePeople: new Set(candidates.map((row) => (row.person as CelebRow).id)).size,
      unmatchedPeople: unmatchedPeople.length,
      publicCandidateRows: candidates.filter(
        (row) => (row.book as { publicKoCoupang?: boolean }).publicKoCoupang,
      ).length,
    },
    candidates,
    unmatchedPeople,
  }

  console.log(JSON.stringify(result.totals, null, 2))
  if (output) {
    const outputPath = resolve(process.cwd(), output)
    writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
    console.log(`WROTE ${outputPath}`)
  } else {
    console.log(JSON.stringify(candidates.slice(0, 30), null, 2))
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
