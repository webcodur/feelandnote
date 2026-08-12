/*
  파일명: /actions/contents/getContentBrief.ts
  기능: 작품 한 건의 소개·정보만 가볍게 조달한다.
  책임: 펼침 보기가 지금 화면에 띄운 한 건에 대해서만 소개글과 타입별 정보를 채운다.
        상세 페이지용 getContentDetail과 달리 감상문 피드·등장인물·기관 선정을 읽지 않는다.
*/ // ------------------------------
'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import { cachedDetail, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { fetchContentMetadata } from './fetchContentMetadata'
import type { ContentType } from '@/types/database'
import type { ContentMetadata } from '@/types/content'
import type { CategoryId, VideoSubtype } from '@/constants/categories'
import { CL_SELECT, type ContentLocaleRow } from '@/lib/utils/content-locale'

// #region 타입
export interface ContentBrief {
  contentId: string
  category: CategoryId
  /** 작품 소개. content_locales에 없으면 외부 메타의 소개문으로 채운다 */
  description: string | null
  releaseDate: string | null
  metadata: ContentMetadata | null
  subtype?: VideoSubtype
}
// #endregion

const TYPE_TO_CATEGORY: Record<ContentType, CategoryId> = {
  BOOK: 'book',
  VIDEO: 'video',
  GAME: 'game',
  MUSIC: 'music',
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* 같은 값이 출처마다 다른 이름으로 저장돼 있다(26.08.10 실측 — 출간일이 publishDate·pubdate·publishedDate
   세 갈래, 원제가 original_title·titleOriginal 두 갈래). 화면 부품은 한 이름만 읽으므로 여기서 모은다.
   앞에 적은 이름이 이긴다. */
const ALIASES: Record<string, readonly string[]> = {
  publishDate: ['publishDate', 'pubdate', 'publishedDate', 'published_date'],
  isbn: ['isbn', 'isbn13', 'isbn_13', 'isbn10', 'isbn_10'],
  releaseDate: ['releaseDate', 'release_date', 'first_release_date', 'firstAirDate'],
  voteAverage: ['voteAverage', 'vote_average'],
  totalTracks: ['totalTracks', 'total_tracks'],
  albumType: ['albumType', 'album_type'],
  // 듣기 링크는 출처마다 이름이 다르다 — 여기서 합치면 애플 주소에 스포티파이 이름이 붙는다. 각자 둔다.
  developer: ['developer'],
  storyline: ['storyline', 'summary'],
  description: ['description', 'overview', 'summary'],
}

/** 표시용 한 벌로 이름을 통일한다. 원래 키도 남겨 둔다 — 이미 맞는 이름으로 들어온 값이 대부분이다. */
function normalizeMetadata(raw: Record<string, unknown> | null): ContentMetadata | null {
  if (!raw || Object.keys(raw).length === 0) return null
  const out: Record<string, unknown> = { ...raw }

  for (const [canonical, names] of Object.entries(ALIASES)) {
    if (out[canonical] != null && out[canonical] !== '') continue
    const hit = names.find((name) => raw[name] != null && raw[name] !== '')
    if (hit) out[canonical] = raw[hit]
  }

  // 게임 발매일은 초 단위 시각으로 들어오는 경우가 있다 — 연도만 남긴다
  const release = out.releaseDate
  if (typeof release === 'number') out.releaseDate = new Date(release * 1000).getFullYear().toString()

  // 장르가 한 덩어리 문자열인 출처가 있다 — 목록 부품이 배열을 기대한다
  if (typeof out.genres === 'string') {
    out.genres = (out.genres as string).split(/[,·/]/).map((g) => g.trim()).filter(Boolean)
  }
  if (!out.genres && typeof out.genre === 'string' && out.genre) {
    out.genres = (out.genre as string).split(/[,·/]/).map((g) => g.trim()).filter(Boolean)
  }

  return out as ContentMetadata
}

/** 외부 메타의 소개문은 출처에 따라 원어(영문)일 수 있다. 국문 화면에서는 믿을 수 있는 출처만 쓴다. */
function isMetaDescUsable(locale: string, source?: string | null): boolean {
  return locale === 'ko'
    ? source === 'kakao_book' || source === 'tmdb'
    : source === 'google_books' || source === 'igdb' || source === 'spotify'
}

async function fetchBrief(contentId: string, locale: string): Promise<ContentBrief | null> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('contents')
    .select(`id, type, external_id, external_source, release_date, metadata, content_locales(${CL_SELECT})`)
    .eq('id', contentId)
    .maybeSingle()

  // 조회 자체가 실패한 것과 그런 작품이 없는 것을 가른다 — 실패를 캐시에 박으면 7일간 정보가 사라진다
  throwOnQueryError('getContentBrief 작품 조회', error)
  if (!data) return null

  const row = data as unknown as Record<string, unknown>
  const type = row.type as ContentType
  const locales = row.content_locales as ContentLocaleRow[] | null
  // 소개글은 다른 언어로 대체하지 않는다. 값이 없으면 해당 언어에 맞는 외부 출처만 사용한다.
  const exactLocale = locales?.find((item) => item.locale === locale)
  const externalId = (row.external_id as string | null) || contentId
  const externalSource = row.external_source as string | null

  const fetched = await fetchContentMetadata(externalId, type, externalSource ?? undefined)

  /* DB에 쌓인 값과 바깥에서 받아온 값을 합친다. 바깥 값이 더 온전하므로 먼저 깔고
     운영자가 손으로 고친 DB 값을 그 위에 덮는다. */
  const merged: Record<string, unknown> = {
    ...(row.release_date && type === 'BOOK' ? { publishDate: row.release_date } : {}),
    ...(fetched.metadata ?? {}),
    ...((row.metadata as Record<string, unknown> | null) ?? {}),
    ...(exactLocale?.publisher ? { publisher: exactLocale.publisher } : {}),
    ...(exactLocale?.isbn ? { isbn: exactLocale.isbn } : {}),
  }
  const metadata = normalizeMetadata(merged)

  const fetchedMetadata = normalizeMetadata(fetched.metadata)
  const metaDesc = isMetaDescUsable(locale, fetched.source)
    ? (fetchedMetadata?.storyline || (fetched.metadata?.description as string | undefined))
    : undefined

  return {
    contentId,
    category: TYPE_TO_CATEGORY[type],
    description: exactLocale?.description || metaDesc || null,
    releaseDate: (row.release_date as string | null) || (metadata?.publishDate ?? null),
    metadata,
    subtype: fetched.subtype as VideoSubtype | undefined,
  }
}

/**
 * 작품 한 건의 소개·정보를 가져온다.
 *
 * 바깥(카카오·TMDB·IGDB·Spotify) 조회가 섞여 있어 첫 호출은 왕복이 생긴다.
 * 결과는 작품 한 건 단위로 저장되므로 같은 작품을 두 번째 열 때는 즉시 돌아온다.
 */
export async function getContentBrief(contentId: string, locale: string): Promise<ContentBrief | null> {
  if (!UUID_PATTERN.test(contentId)) return null
  const safeLocale = locale === 'en' ? 'en' : 'ko'
  return withQueryFallback(
    'getContentBrief',
    () =>
      cachedDetail(
        CACHE_TAGS.CONTENTS,
        contentId,
        ['content-brief', contentId, safeLocale],
        () => fetchBrief(contentId, safeLocale),
      ),
    null,
  )
}
