'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { CategoryId } from '@/constants/categories'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales } from '@/lib/utils/content-locale'
import { DIALOGUE_BRIEF_SELECT, type DialogueBrief } from '@/lib/utils/celeb-dialogues'
import type { Tables } from '@/types/supabase'
import type { ContentJoinRow, LibraryContent, StaticSupabase } from './types'
import { fetchUserContentCounts } from './helpers'

// #region 오늘의 인물 - 매일 랜덤 셀럽 1명의 콘텐츠
interface TodayFigure {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
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

export interface TodayFigureResult {
  figure: TodayFigure | null
  contents: LibraryContent[]
  source: TodayFigureSource
}

async function fetchTodayFigure(today: string, locale: string): Promise<TodayFigureResult> {
  const supabase = createStaticClient()

  const { data: dailyFigure } = await supabase
    .from('daily_figures')
    .select('celeb_id, source, news_count')
    .eq('date', today)
    .single()

  if (dailyFigure) {
    const result = await fetchFigureContents(supabase, dailyFigure.celeb_id, locale)
    return {
      ...result,
      source: {
        type: dailyFigure.source as 'news' | 'seed' | 'birthday',
        newsCount: dailyFigure.news_count || 0,
      },
    }
  }

  const seedSource: TodayFigureSource = { type: 'seed', newsCount: 0 }

  // 공개 감상 5개 이상 보유한 활성 셀럽만 RPC로 카운트 수신
  const { data: eligibleData, error: eligibleError } = await supabase.rpc('get_seed_eligible_celebs')

  if (eligibleError || !eligibleData?.length) {
    if (eligibleError) console.error('getTodayFigure seed error:', eligibleError.message)
    return { figure: null, contents: [], source: seedSource }
  }

  // 시드 선택이 캐시 재생성 간에도 흔들리지 않도록 id 순으로 고정
  const eligibleCelebs = [...eligibleData].sort((a, b) => a.celeb_id.localeCompare(b.celeb_id))

  const seed = today.split('-').reduce((acc, n) => acc + parseInt(n), 0) + 1
  const selectedIndex = seed % eligibleCelebs.length
  const selected = eligibleCelebs[selectedIndex]

  const result = await fetchFigureContents(supabase, selected.celeb_id, locale)
  return { ...result, source: seedSource }
}

const getTodayFigureCached = unstable_cache(
  fetchTodayFigure,
  ['today-figure'],
  // daily_figures(BO 오늘의 인물 편성) + profiles + user_contents + celeb_dialogues
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES] }
)

export async function getTodayFigure(): Promise<TodayFigureResult> {
  const locale = await getLocale()
  const today = new Date().toISOString().slice(0, 10)
  return getTodayFigureCached(today, locale)
}

// 오늘의 인물 profiles 조회 행
type FigureProfileRow = Pick<
  Tables<'profiles'>,
  'id' | 'slug' | 'nickname' | 'nickname_en' | 'avatar_url' | 'profession' | 'bio' | 'bio_en' | 'speech_tone' | 'voice_v'
>

// 오늘의 인물 user_contents 조회 행
interface FigureUserContentRow {
  id: string
  content_id: string
  rating: number | null
  review: string | null
  review_en?: string | null
  is_spoiler: boolean | null
  source_url: string | null
  contents: ContentJoinRow | ContentJoinRow[] | null
}

async function fetchFigureContents(
  supabase: StaticSupabase,
  celebId: string,
  locale: string,
): Promise<TodayFigureResult> {
  const defaultSource: TodayFigureSource = { type: 'seed', newsCount: 0 }

  const [{ data: profile }, { data: userContents }, { data: dialogue }, userCountMap] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, slug, nickname, nickname_en, avatar_url, profession, bio, bio_en, speech_tone, voice_v')
      .eq('id', celebId)
      .single(),
    supabase
      .from('user_contents')
      // 영어 감상문은 en 화면에서만 쓰인다 — ko 응답에서 수신 제외 (egress 절감)
      .select(`id, content_id, rating, review, ${locale === 'en' ? 'review_en, ' : ''}is_spoiler, source_url, contents(id, type, content_locales(${CL_SELECT_LIST}))`)
      .eq('user_id', celebId)
      .eq('status', 'FINISHED')
      .eq('visibility', 'public'),
    supabase
      .from('celeb_dialogues')
      .select(DIALOGUE_BRIEF_SELECT)
      .eq('celeb_id', celebId)
      .single()
      .overrideTypes<DialogueBrief, { merge: false }>(),
    fetchUserContentCounts(supabase),
  ])

  if (!profile) {
    return { figure: null, contents: [], source: defaultSource }
  }

  const profileRow: FigureProfileRow = profile
  const ucRows = (userContents || []) as unknown as FigureUserContentRow[]

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
      avg_rating: item.rating ? Number(item.rating) : null,
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
