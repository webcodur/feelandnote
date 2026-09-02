/*
  파일명: /actions/spectrum/reviewCelebIds.ts
  기능: 감상 기록을 가진 인물 명단을 한 벌만 조달한다.
  책임: 닮은 인물 추천과 성향 분포가 같은 명단을 따로 읽던 것을 하나의 캐시로 합친다.
        서버 액션이 아니라 두 액션이 함께 쓰는 조회 모듈이다.
*/ // ------------------------------

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedList } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'

/**
 * 감상 기록을 가진 인물 명단.
 * 닮은 인물을 보여주는 목적은 "그 사람은 무엇을 읽었나"로 건너가게 하는 것이다.
 * 기록이 없는 인물이 뽑히면 그 다리가 끊기므로 후보에서 뒤로 민다.
 *
 * 집계 캐시 열을 읽는다 — 감상 행을 매번 훑는 RPC보다 다섯 배 빠르고 결과는 같다
 * (실측 26.08.14: 645ms 대 3,647ms, 양쪽 모두 1,717명으로 일치).
 */
async function fetchReviewCelebIds(): Promise<string[]> {
  const db = createStaticClient()
  const rows = await selectAllPages<{ celeb_id: string }>((from, to) =>
    db
      .from('celeb_metrics')
      .select('celeb_id')
      .gt('content_count', 0)
      .order('celeb_id')
      .range(from, to)
  )
  return rows.map((row) => row.celeb_id)
}

export const getReviewCelebIdsCached = () =>
  cachedList(CACHE_TAGS.CONTENTS, ['review-celeb-ids'], fetchReviewCelebIds)
