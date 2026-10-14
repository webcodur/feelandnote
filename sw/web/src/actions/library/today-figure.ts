'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { NO_ROWS_CODE, STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { getLocale } from 'next-intl/server'
import { getKSTDateKey } from '@/lib/game/date-seed'
import { getVisitorCountry } from '@/lib/visitorCountryServer'
import { coalescePublicRead } from '@/lib/coalescePublicRead'
import { selectTodayFigure, TODAY_FIGURE_FALLBACK_COUNTRY, TODAY_FIGURE_MIN_INFLUENCE_SCORE, type TodayFigureCandidate } from '@/lib/celeb/todayFigureSelection'
import { fetchFeatureExcludedCelebIds } from '@/lib/celeb-feature-exclusion'
import { getInitialCelebContents } from '@/actions/contents/getInitialCelebContents'
import type { GetUserContentsResponse } from '@/actions/contents/getUserContents'
import { getInitialContentBrief, getContentBrief, type ContentBrief } from '@/actions/contents/getContentBrief'
import { shouldStreamForRequest } from '@/lib/render-mode'
import type { ContentTypeCounts } from '@/types/content'
import { DIALOGUE_BRIEF_SELECT, type DialogueBrief } from '@/lib/utils/celeb-dialogues'
import type { Tables } from '@/types/database.generated'
import type { StaticDatabaseClient } from './types'

/** get_seed_eligible_celebs가 돌려주는 행 — 공개 감상 5개 이상인 활성 인물과 그 수 */
type SeedEligibleRow = { celeb_id: string; content_count: number }

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
  type: 'news' | 'seed'
  newsCount: number
}

interface TodayFigureData {
  figure: TodayFigure | null
  initialContents: GetUserContentsResponse
  source: TodayFigureSource
}

export interface TodayFigureResult extends TodayFigureData {
  /** 인물 편성에 사용한 KST 날짜. 화면에서도 같은 날짜를 표시한다. */
  date: string
  initialContentBrief: ContentBrief | null
}

const EMPTY_CONTENTS: GetUserContentsResponse = { items: [], total: 0, page: 1, totalPages: 0, hasMore: false }

/** All countries and languages share the same small candidate directory. */
const getTodayFigureCandidates = unstable_cache(
  coalescePublicRead(async (): Promise<TodayFigureCandidate[]> => {
    const db = createStaticClient()
    const [profiles, eligible, excluded, influential] = await Promise.all([
      selectAllPages<TodayFigureCandidate>((from, to) => db
        .from('celebs').select('id, nationality')
        .eq('publication_status', 'active')
        .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
        .order('id').range(from, to)),
      selectAllPages<SeedEligibleRow>((from, to) => db.rpc('get_seed_eligible_celebs')
        .order('celeb_id', { ascending: true }).range(from, to)),
      fetchFeatureExcludedCelebIds(db),
      selectAllPages<{ celeb_id: string }>((from, to) => db.from('celeb_influence')
        .select('celeb_id')
        .gte('total_score', TODAY_FIGURE_MIN_INFLUENCE_SCORE)
        .order('celeb_id').range(from, to)),
    ])
    const eligibleIds = new Set(eligible.map(row => row.celeb_id))
    const influentialIds = new Set(influential.map(row => row.celeb_id))
    return profiles.filter(row => eligibleIds.has(row.id) && influentialIds.has(row.id) && !excluded.has(row.id))
  }),
  ['today-figure-candidates-v2'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] },
)

const getTodayFigurePick = unstable_cache(
  coalescePublicRead(async (today: string, country: string) =>
    selectTodayFigure(await getTodayFigureCandidates(), today, country)),
  ['today-figure-country-pick-v5'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] },
)

// The same US fallback shares one profile/book payload across all visitor countries and dates.
const getFigureContentsCached = unstable_cache(
  coalescePublicRead(async (id: string, locale: string) => fetchFigureContents(createStaticClient(), id, locale)),
  ['today-figure-contents-v6-detail-library'],
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES] },
)

export async function getTodayFigure(): Promise<TodayFigureResult> {
  const locale = await getLocale()
  const today = getKSTDateKey()
  const country = await getVisitorCountry() ?? TODAY_FIGURE_FALLBACK_COUNTRY
  const result: TodayFigureData = await withQueryFallback('getTodayFigure', async () => {
    const selected = await getTodayFigurePick(today, country)
    const source: TodayFigureSource = { type: 'seed', newsCount: 0 }
    if (!selected) return { figure: null, initialContents: EMPTY_CONTENTS, source }
    const data = await getFigureContentsCached(selected.id, locale)
    return data.figure && data.figure.contentCount >= 5
      ? { ...data, source }
      : { figure: null, initialContents: EMPTY_CONTENTS, source }
  }, { figure: null, initialContents: EMPTY_CONTENTS, source: { type: 'seed', newsCount: 0 } })
  const firstId = result.initialContents.items[0]?.content_id
  const initialContentBrief = firstId
    ? await ((await shouldStreamForRequest()) ? getInitialContentBrief : getContentBrief)(firstId, locale)
    : null
  return { ...result, date: today, initialContentBrief }
}

// 오늘의 인물 celebs 조회 행
type FigureProfileRow = Pick<
  Tables<'celebs'>,
  'id' | 'slug' | 'nickname' | 'nickname_en' | 'avatar_url' | 'profession' | 'title' | 'bio' | 'bio_en' | 'speech_tone' | 'voice_v'
>

async function fetchFigureContents(
  db: StaticDatabaseClient,
  celebId: string,
  locale: string,
): Promise<TodayFigureData> {
  const defaultSource: TodayFigureSource = { type: 'seed', newsCount: 0 }

  const [
    { data: profile, error: profileError },
    { data: typeCounts, error: typeCountsError },
    { data: dialogue, error: dialogueError },
  ] = await Promise.all([
    db
      .from('celebs')
      .select('id, slug, nickname, nickname_en, avatar_url, profession, title, bio, bio_en, speech_tone, voice_v')
      .eq('id', celebId)
      .single(),
    db.rpc('get_celeb_type_counts', { p_celeb_id: celebId }),
    db
      .from('celeb_dialogues')
      .select(DIALOGUE_BRIEF_SELECT)
      .eq('celeb_id', celebId)
      .single()
      .overrideTypes<DialogueBrief, { merge: false }>(),
  ])

  // 「인물 없음」「대사 없음」만 통과시키고 그 밖의 실패는 던져 캐시에 남기지 않는다
  throwOnQueryError('getTodayFigure 인물 조회', profileError, { ignoreCodes: [NO_ROWS_CODE] })
  throwOnQueryError('getTodayFigure 인물 기록 개수 조회', typeCountsError)
  throwOnQueryError('getTodayFigure 인물 대사 조회', dialogueError, { ignoreCodes: [NO_ROWS_CODE] })

  if (!profile) {
    return { figure: null, initialContents: EMPTY_CONTENTS, source: defaultSource }
  }

  const profileRow: FigureProfileRow = profile
  const counts: ContentTypeCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 }
  for (const row of typeCounts ?? []) {
    if (row.content_type in counts) counts[row.content_type as keyof ContentTypeCounts] = Number(row.total)
  }
  const initialContents = await getInitialCelebContents(celebId, counts, locale)

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
      contentCount: Object.values(counts).reduce((sum, count) => sum + count, 0),
      greetingLines,
      quote,
      speechTone: profileRow.speech_tone ?? 'composed',
      voiceV: profileRow.voice_v ?? 0,
    },
    initialContents,
    source: defaultSource
  }
}
// #endregion
