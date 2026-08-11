/*
  파일명: /actions/celebs/getCelebSlugById.ts
  기능: 인물 식별자로 정본 주소(slug)만 찾는다.
  책임: 옛 `/<식별자>` 주소로 들어온 요청을 `/celeb/<이름>`으로 넘길 때 쓴다.
        상세 데이터는 읽지 않는다 — 넘길 주소 한 줄만 필요하다.
*/ // ------------------------------
'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import { cachedDetail, throwOnQueryError, withQueryFallback } from '@/lib/cache'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function fetchCelebSlug(celebId: string): Promise<string | null> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('celebs')
    .select('slug')
    .eq('id', celebId)
    .eq('publication_status', 'active')
    .maybeSingle()

  // 조회 실패와 "그런 인물이 없다"를 가른다 — 실패를 캐시에 박으면 멀쩡한 인물이 오래 404가 된다
  throwOnQueryError('getCelebSlugById 인물 조회', error)
  return data?.slug ?? null
}

/**
 * 인물 식별자에 대응하는 정본 주소 조각을 돌려준다. 인물이 아니거나 비공개면 null.
 *
 * 식별자 모양이 아니면 조회하지 않는다 — 회원 주소 자리에는 어떤 문자열이든 들어올 수 있어
 * 그때마다 인물 테이블을 두드리면 헛조회가 쌓인다.
 */
export async function getCelebSlugById(celebId: string): Promise<string | null> {
  if (!UUID.test(celebId)) return null

  return withQueryFallback(
    'getCelebSlugById',
    () =>
      cachedDetail(
        CACHE_TAGS.CELEBS,
        celebId,
        ['celeb-slug-by-id', celebId],
        () => fetchCelebSlug(celebId),
      ),
    null,
  )
}
