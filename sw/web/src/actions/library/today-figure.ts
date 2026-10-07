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
import { getVisitorCountry } from '@/lib/visitorCountryServer'
import { coalescePublicRead } from '@/lib/coalescePublicRead'
import { selectTodayFigure, TODAY_FIGURE_FALLBACK_COUNTRY, type TodayFigureCandidate } from '@/lib/celeb/todayFigureSelection'
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

/** All countries and languages share the same small candidate directory. */
const getTodayFigureCandidates = unstable_cache(
  coalescePublicRead(async (): Promise<TodayFigureCandidate[]> => {
    const db = createStaticClient()
    const [profiles, eligible, excluded] = await Promise.all([
      selectAllPages<{ id: string; nationality: string | null; birth_date: string | null }>((from, to) => db
        .from('celebs').select('id, nationality, birth_date')
        .eq('publication_status', 'active')
        .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
        .order('id').range(from, to)),
      selectAllPages<SeedEligibleRow>((from, to) => db.rpc('get_seed_eligible_celebs')
        .order('celeb_id', { ascending: true }).range(from, to)),
      fetchFeatureExcludedCelebIds(db),
    ])
    const counts = new Map(eligible.map(row => [row.celeb_id, row.content_count]))
    return profiles.filter(row => counts.has(row.id) && !excluded.has(row.id))
      .map(row => ({ ...row, content_count: counts.get(row.id)! }))
  }),
  ['today-figure-candidates-v1'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] },
)

const getTodayFigurePick = unstable_cache(
  coalescePublicRead(async (today: string, country: string) =>
    selectTodayFigure(await getTodayFigureCandidates(), today, country)),
  ['today-figure-country-pick-v4'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] },
)

// The same US fallback shares one profile/book payload across all visitor countries and dates.
const getFigureContentsCached = unstable_cache(
  coalescePublicRead(async (id: string, locale: string) => fetchFigureContents(createStaticClient(), id, locale)),
  ['today-figure-contents-v4'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES] },
)

export async function getTodayFigure(): Promise<TodayFigureResult> {
  const locale = await getLocale()
  const today = getKSTDateKey()
  const country = await getVisitorCountry() ?? TODAY_FIGURE_FALLBACK_COUNTRY
  const result: TodayFigureData = await withQueryFallback('getTodayFigure', async () => {
    const selected = await getTodayFigurePick(today, country)
    const source: TodayFigureSource = { type: selected?.birthday ? 'birthday' : 'seed', newsCount: 0 }
    if (!selected) return { figure: null, contents: [], source }
    const data = await getFigureContentsCached(selected.id, locale)
    return data.figure && data.contents.length >= 5
      ? { ...data, source }
      : { figure: null, contents: [], source }
  }, { figure: null, contents: [], source: { type: 'seed', newsCount: 0 } })
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
    const flat = flattenLocales(content?.content_locales, locale, content?.type)
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
