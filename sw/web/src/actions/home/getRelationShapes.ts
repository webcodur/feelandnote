/*
  파일명: /actions/home/getRelationShapes.ts
  기능: 탐색 화면 관계망이 처음 세울 시작점들
  책임: 관계 유형과 인물 원장을 가볍게 받아 시작점만 고른다.

        갈래·맞수·무리는 더 이상 화면에 판으로 서지 않는다. 고정된 판만 보여 주면
        방문자는 고른 것을 볼 뿐 관계망을 뒤질 수 없다. 대신 그 계산으로
        「여기서부터 보세요」할 만한 인물을 뽑아 탐색기의 시작점으로 넘긴다.
        원장은 인물 한 명의 수정과 무관한 공유 자료라 목록 태그를 달지 않는다 —
        태그를 붙이면 프로필 한 건을 고칠 때마다 관계망 전체를 다시 계산한다.
*/

'use server'

import { unstable_cache } from 'next/cache'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { parseCelebDate } from '@/lib/celeb/lifespan'
import {
  buildRelationCircles,
  buildRelationFans,
  buildRivalries,
  type ShapeCandidate,
  type ShapeRelationInput,
} from '@/lib/celeb/relationShapes'
import { getInfluenceRanking } from './getCelebs'

/** 시작점 선정에 쓰는 관계 유형 */
const SHAPE_REL_TYPES = [
  'teacher', 'student', 'influence', 'influenced',
  'rival',
  'colleague', 'cofounder',
]

const FAN_COUNT_PER_DIRECTION = 1
const FAN_SPOKE_LIMIT = 10
const FAN_MIN_SPOKES = 6

const RIVALRY_COUNT = 4

const CIRCLE_COUNT = 2
const CIRCLE_MIN_SIZE = 4
const CIRCLE_MAX_SIZE = 9

/** 탐색기 옆에 세울 시작점 수 */
const STARTER_COUNT = 8

interface RelationRow {
  from_id: string
  to_id: string
  rel_type: string
}

interface CelebRow {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  title: string | null
  title_en: string | null
  birth_date: string | null
  celeb_tier: string | null
}

/** 탐색기가 처음 세울 인물과, 옆에 둘 시작점 후보들 */
export interface RelationStarter {
  id: string
  nickname: string
  nicknameEn: string | null
  /** 왜 볼 만한지 — 갈래가 넓은 사람 · 맞선 사람 · 무리에 낀 사람 */
  reason: 'fan' | 'rival' | 'circle'
}

export interface RelationShapes {
  /** 첫 화면의 중심. 갈래가 가장 넓은 인물이라 펼칠 것이 많다 */
  openingCelebId: string | null
  starters: RelationStarter[]
}

async function fetchShapeRelations(): Promise<RelationRow[]> {
  const supabase = createStaticClient()
  // 1,000행 상한에 걸리므로 나눠 받는다. 자르면 그래프가 조용히 성긴다.
  return await selectAllPages<RelationRow>((from, to) =>
    supabase
      .from('celeb_relations')
      .select('from_id, to_id, rel_type')
      .in('rel_type', SHAPE_REL_TYPES)
      .order('from_id')
      .order('to_id')
      .range(from, to)
      .overrideTypes<RelationRow[], { merge: false }>()
  )
}

async function fetchShapeCelebs(): Promise<CelebRow[]> {
  const supabase = createStaticClient()
  return await selectAllPages<CelebRow>((from, to) =>
    supabase
      .from('celebs')
      .select('id, slug, nickname, nickname_en, avatar_url, title, title_en, birth_date, celeb_tier')
      .eq('publication_status', 'active')
      .order('id')
      .range(from, to)
      .overrideTypes<CelebRow[], { merge: false }>()
  )
}

const getShapeRelationsCached = unstable_cache(fetchShapeRelations, ['celeb-shape-relations'], {
  revalidate: STATIC_REVALIDATE,
})

const getShapeCelebsCached = unstable_cache(fetchShapeCelebs, ['celeb-index-for-shapes'], {
  revalidate: STATIC_REVALIDATE,
})

/** 관계망이 이루는 네 모양. 한 모양이 비어도 나머지는 그대로 온다 */
export async function getRelationShapes(): Promise<RelationShapes> {
  const [relations, celebs, ranking] = await Promise.all([
    getShapeRelationsCached(),
    getShapeCelebsCached(),
    getInfluenceRanking(),
  ])

  const candidates: ShapeCandidate[] = celebs
    .filter((row) => (LISTING_DEFAULT_TIERS as readonly string[]).includes(row.celeb_tier ?? 'full'))
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      nickname: row.nickname,
      nicknameEn: row.nickname_en,
      avatarUrl: row.avatar_url,
      title: row.title,
      titleEn: row.title_en,
      // 기원전은 음수 연도로 온다 — 문자열을 잘라 쓰면 부호를 잃는다
      birthYear: parseCelebDate(row.birth_date)?.year ?? null,
      influence: ranking.scoreMap[row.id] ?? 0,
    }))

  const flows: ShapeRelationInput[] = relations.map((row) => ({
    fromId: row.from_id,
    toId: row.to_id,
    relType: row.rel_type,
  }))

  const fans = buildRelationFans({
    relations: flows,
    candidates,
    countPerDirection: FAN_COUNT_PER_DIRECTION,
    spokeLimit: FAN_SPOKE_LIMIT,
    minSpokes: FAN_MIN_SPOKES,
  })
  const rivalries = buildRivalries({ relations: flows, candidates, count: RIVALRY_COUNT })
  const circles = buildRelationCircles({
    relations: flows,
    candidates,
    count: CIRCLE_COUNT,
    minSize: CIRCLE_MIN_SIZE,
    maxSize: CIRCLE_MAX_SIZE,
  })

  /* 시작점은 세 갈래에서 골고루 뽑는다 — 한 종류만 세우면 관계망이 한쪽 모양뿐인 줄 안다.
     같은 인물이 두 번 들어가지 않게 걸러 낸다 */
  const starters: RelationStarter[] = []
  const seen = new Set<string>()
  const addStarter = (celeb: ShapeCandidate, reason: RelationStarter['reason']) => {
    if (seen.has(celeb.id) || starters.length >= STARTER_COUNT) return
    seen.add(celeb.id)
    starters.push({ id: celeb.id, nickname: celeb.nickname, nicknameEn: celeb.nicknameEn, reason })
  }

  fans.forEach((fan) => addStarter(fan.center, 'fan'))
  rivalries.forEach((rivalry) => {
    addStarter(rivalry.a, 'rival')
    addStarter(rivalry.b, 'rival')
  })
  circles.forEach((circle) => circle.members.slice(0, 2).forEach((m) => addStarter(m, 'circle')))

  return {
    openingCelebId: fans[0]?.center.id ?? starters[0]?.id ?? null,
    starters,
  }
}
