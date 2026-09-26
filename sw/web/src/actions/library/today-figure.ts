'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { NO_ROWS_CODE, STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { CategoryId } from '@/constants/categories'
import { getLocale } from 'next-intl/server'
import { getKSTDateKey } from '@/lib/game/date-seed'
import { fetchFeatureExcludedCelebIds } from '@/lib/celeb-feature-exclusion'
import { CL_SELECT_LIST_WITH_AFFILIATE, flattenLocales } from '@/lib/utils/content-locale'
import { DIALOGUE_BRIEF_SELECT, type DialogueBrief } from '@/lib/utils/celeb-dialogues'
import type { Tables } from '@/types/database.generated'
import type { ContentJoinRow, LibraryContent, StaticDatabaseClient } from './types'

/** get_seed_eligible_celebs가 돌려주는 행 — 공개 감상 5개 이상인 활성 인물과 그 수 */
type SeedEligibleRow = { celeb_id: string; content_count: number }
import { fetchUserContentCounts } from './helpers'

// #region 오늘의 인물 - 매일 랜덤 셀럽 1명의 콘텐츠
interface TodayFigure {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  title: string | null
  bio: string | null
  bio_en: string | null
  contentCount: number
  greetingLines: string[]
  quote: string | null
  speechTone: string
  voiceV: number
}

interface TodayFigureSource {
  type: 'news' | 'seed' | 'birthday'
  newsCount: number
}

interface TodayFigureData {
  figure: TodayFigure | null
  contents: LibraryContent[]
  source: TodayFigureSource
}

export interface TodayFigureResult extends TodayFigureData {
  /** 인물 편성에 사용한 KST 날짜. 화면에서도 같은 날짜를 표시한다. */
  date: string
}

/**
 * 오늘 생일인 인물 하나를 고른다. 없으면 null.
 *
 * 편성(`/api/cron/today-figure`)과 같은 규칙이다 — 생일자 중 공개 기록이 많은 순,
 * 5건 이상을 우선한다. 크론은 편성을 미리 저장해 두는 장치일 뿐이고, 생일 자체는
 * 날짜만으로 정해지므로 크론이 못 돌아도 화면은 생일을 알아볼 수 있어야 한다.
 */
async function pickBirthdayCeleb(
  db: StaticDatabaseClient,
  today: string,
  excluded: ReadonlySet<string>,
): Promise<string | null> {
  const monthDay = today.slice(5) // "MM-DD"

  const { data: celebs, error: celebsError } = await db
    .from('celebs')
    .select('id')
    .eq('publication_status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
    .like('birth_date', `%-${monthDay}`)

  throwOnQueryError('getTodayFigure 생일 인물 조회', celebsError)

  const ids = (celebs ?? []).map((c) => c.id).filter((id) => !excluded.has(id))
  if (ids.length === 0) return null
  const { data: contentRows, error: contentRowsError } = await db
    .from('celeb_contents')
    .select('celeb_id')
    .in('celeb_id', ids)
    .eq('status', 'FINISHED')
    .eq('visibility', 'public')

  throwOnQueryError('getTodayFigure 생일 인물 기록 조회', contentRowsError)

  const counts = new Map<string, number>()
  for (const row of contentRows ?? []) {
    counts.set(row.celeb_id, (counts.get(row.celeb_id) ?? 0) + 1)
  }

  // 기록이 많은 순. 동수는 id 순으로 고정해 캐시 재생성 간에도 흔들리지 않게 한다
  const sorted = [...ids].sort((a, b) => {
    const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    return diff !== 0 ? diff : a.localeCompare(b)
  })

  return sorted.find((id) => (counts.get(id) ?? 0) >= 5) ?? sorted[0]
}

async function fetchTodayFigure(today: string, locale: string): Promise<TodayFigureData> {
  const db = createStaticClient()

  const { data: dailyFigure, error: dailyFigureError } = await db
    .from('daily_figures')
    .select('celeb_id, source, news_count')
    .eq('date', today)
    .single()

  // 「오늘 편성 없음」만 통과시킨다 — 조회 실패를 편성 없음으로 캐시하면 편성이 7일 동안 무시된다
  throwOnQueryError('getTodayFigure 편성 조회', dailyFigureError, { ignoreCodes: [NO_ROWS_CODE] })

  if (dailyFigure) {
    const result = await fetchFigureContents(db, dailyFigure.celeb_id, locale)
    return {
      ...result,
      source: {
        type: dailyFigure.source as 'news' | 'seed' | 'birthday',
        newsCount: dailyFigure.news_count || 0,
      },
    }
  }

  const seedSource: TodayFigureSource = { type: 'seed', newsCount: 0 }

  // 크론과 같은 명단이다 — 추천 노출 제외 인물은 생일·시드 어느 갈래로도 세우지 않는다
  const excluded = await fetchFeatureExcludedCelebIds(db)

  // 편성 행이 없어도 생일은 날짜만으로 정해진다 — 크론이 못 돌았다고 생일인 사람을
  // 시드로 덮지 않는다. 크론과 같은 규칙(기록 많은 순, 5건 이상 우선)을 쓴다.
  const birthdayFigure = await pickBirthdayCeleb(db, today, excluded)
  if (birthdayFigure) {
    const result = await fetchFigureContents(db, birthdayFigure, locale)
    return { ...result, source: { type: 'birthday', newsCount: 0 } }
  }

  // 공개 감상 5개 이상 보유한 활성 셀럽만 RPC로 카운트 수신
  // 후보가 천 명을 넘어 한 번에 받으면 1,000명에서 잘린다 — 나눠 받는다(26.09.14)
  const eligibleData = (await selectAllPages<SeedEligibleRow>((from, to) => db
    .rpc('get_seed_eligible_celebs')
    .order('celeb_id', { ascending: true })
    .range(from, to))).filter((row) => !excluded.has(row.celeb_id))

  if (!eligibleData.length) {
    return { figure: null, contents: [], source: seedSource }
  }

  // 시드 선택이 캐시 재생성 간에도 흔들리지 않도록 id 순으로 고정
  const eligibleCelebs = [...eligibleData].sort((a, b) => a.celeb_id.localeCompare(b.celeb_id))

  const seed = today.split('-').reduce((acc, n) => acc + parseInt(n), 0) + 1
  const selectedIndex = seed % eligibleCelebs.length
  const selected = eligibleCelebs[selectedIndex]

  const result = await fetchFigureContents(db, selected.celeb_id, locale)
  return { ...result, source: seedSource }
}

const getTodayFigureCached = unstable_cache(
  fetchTodayFigure,
  ['today-figure'],
  // daily_figures(BO 오늘의 인물 편성) + celebs + celeb_contents + celeb_dialogues
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES] }
)

export async function getTodayFigure(): Promise<TodayFigureResult> {
  const locale = await getLocale()
  // 편성(크론)과 같은 KST 날짜를 써야 한다 — 기준이 어긋나면 편성을 못 찾고 seed로 흐른다
  const today = getKSTDateKey()
  const result: TodayFigureData = await withQueryFallback('getTodayFigure', () => getTodayFigureCached(today, locale), { figure: null, contents: [], source: { type: 'seed', newsCount: 0 } })
  return { ...result, date: today }
}

// 오늘의 인물 celebs 조회 행
type FigureProfileRow = Pick<
  Tables<'celebs'>,
  'id' | 'slug' | 'nickname' | 'nickname_en' | 'avatar_url' | 'profession' | 'title' | 'bio' | 'bio_en' | 'speech_tone' | 'voice_v'
>

// 오늘의 인물 celeb_contents 조회 행
interface FigureUserContentRow {
  id: string
  content_id: string
  review: string | null
  review_en?: string | null
  is_spoiler: boolean | null
  source_url: string | null
  contents: ContentJoinRow | ContentJoinRow[] | null
}

async function fetchFigureContents(
  db: StaticDatabaseClient,
  celebId: string,
  locale: string,
): Promise<TodayFigureData> {
  const defaultSource: TodayFigureSource = { type: 'seed', newsCount: 0 }

  const [
    { data: profile, error: profileError },
    { data: celebContents, error: celebContentsError },
    { data: dialogue, error: dialogueError },
  ] = await Promise.all([
    db
      .from('celebs')
      .select('id, slug, nickname, nickname_en, avatar_url, profession, title, bio, bio_en, speech_tone, voice_v')
      .eq('id', celebId)
      .single(),
    db
      .from('celeb_contents')
      // 영어 감상문은 en 화면에서만 쓰인다 — ko 응답에서 수신 제외 (egress 절감)
      // 홈 카드의 책 구매 단추(YES24·쿠팡·아마존)가 제휴 링크를 쓴다
      .select(`id, content_id, review, ${locale === 'en' ? 'review_en, ' : ''}is_spoiler, source_url, contents(id, type, content_locales(${CL_SELECT_LIST_WITH_AFFILIATE}))`)
      .eq('celeb_id', celebId)
      .eq('status', 'FINISHED')
      .eq('visibility', 'public'),
    db
      .from('celeb_dialogues')
      .select(DIALOGUE_BRIEF_SELECT)
      .eq('celeb_id', celebId)
      .single()
      .overrideTypes<DialogueBrief, { merge: false }>(),
  ])

  // 「인물 없음」「대사 없음」만 통과시키고 그 밖의 실패는 던져 캐시에 남기지 않는다
  throwOnQueryError('getTodayFigure 인물 조회', profileError, { ignoreCodes: [NO_ROWS_CODE] })
  throwOnQueryError('getTodayFigure 인물 기록 조회', celebContentsError)
  throwOnQueryError('getTodayFigure 인물 대사 조회', dialogueError, { ignoreCodes: [NO_ROWS_CODE] })

  if (!profile) {
    return { figure: null, contents: [], source: defaultSource }
  }

  const profileRow: FigureProfileRow = profile
  const ucRows = (celebContents || []) as unknown as FigureUserContentRow[]
  const contentIds = [...new Set(ucRows
    .map(item => (Array.isArray(item.contents) ? item.contents[0] : item.contents)?.id)
    .filter((id): id is string => Boolean(id)))]
  const userCountMap = await fetchUserContentCounts(db, undefined, contentIds)

  const contents: LibraryContent[] = ucRows.map(item => {
    const content = Array.isArray(item.contents) ? item.contents[0] : item.contents
    const flat = flattenLocales(content?.content_locales, locale)
    return {
      id: content?.id || '',
      title: flat.title,
      creator: flat.creator,
      thumbnail_url: flat.thumbnail_url,
      type: (content?.type as CategoryId) || 'BOOK',
      celeb_count: 1,
      user_count: userCountMap.get(content?.id || '') ?? 0,
      avg_rating: null,
      review: item.review,
      review_en: item.review_en ?? null,
      is_spoiler: item.is_spoiler as boolean,
      source_url: item.source_url,
      user_content_id: item.id,
      title_ko: flat.title_ko,
      title_en: flat.title_en,
      creator_en: flat.creator_en,
      isbn_en: flat.isbn_en,
      thumbnail_en: flat.thumbnail_en,
      has_en_edition: flat.has_en_edition,
      title_badge: flat.title_badge,
      affiliate_url: flat.affiliate_url,
    }
  }).filter(c => c.id)

  const nicknameEn = profileRow.nickname_en ?? null
  const bioEn = profileRow.bio_en ?? null

  const d: DialogueBrief | null = dialogue
  const useEn = locale === 'en'
  const greetingLines: string[] = (useEn ? d?.greeting_en : d?.greeting) ?? d?.greeting ?? []
  const quote: string | null = (useEn ? d?.quote_en : d?.quote) ?? d?.quote ?? null

  return {
    figure: {
      id: profileRow.id,
      slug: profileRow.slug,
      nickname: (locale === 'en' ? nicknameEn || profileRow.nickname : profileRow.nickname) || '',
      nickname_en: nicknameEn,
      avatar_url: profileRow.avatar_url,
      profession: profileRow.profession,
      title: profileRow.title ?? null,
      bio: (locale === 'en' ? bioEn || profileRow.bio : profileRow.bio) ?? null,
      bio_en: bioEn,
      contentCount: contents.length,
      greetingLines,
      quote,
      speechTone: profileRow.speech_tone ?? 'composed',
      voiceV: profileRow.voice_v ?? 0,
    },
    contents,
    source: defaultSource
  }
}
// #endregion
