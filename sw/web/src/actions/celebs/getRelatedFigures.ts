/*
  파일명: /actions/celebs/getRelatedFigures.ts
  기능: 인물 상세 맨 아래 「이어지는 인물」에 세울 인물을 고른다
  책임: 관계는 페이지가 이미 들고 있으므로 다시 묻지 않는다. 여기서는 순위를 매길 때
        필요한 후보 원장(직군·나라·생년·등급·영향력)만 인물 무관 공용 캐시로 한 번 받는다.
        페이지 본문에서 읽히므로 짧은 수명을 쓰면 그 수명이 인물 상세 전체의
        재검증 주기로 전파된다 — 7일 안전망을 쓴다.
*/

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/db/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { getCelebYear } from '@/lib/celeb/lifespan'
import {
  rankRelatedFigures,
  type RelatedCandidate,
  type RelatedFigureRanked,
  type RelatedRelationInput,
} from '@/lib/celeb/relatedFigures'

interface CelebIndexRow {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  nationality: string | null
  birth_date: string | null
  celeb_tier: string | null
  celeb_reality: string | null
}

interface InfluenceRow {
  celeb_id: string
  total_score: number | null
}

async function fetchCelebIndex(): Promise<CelebIndexRow[]> {
  const db = createStaticClient()
  // 1,000행 상한에 걸리므로 나눠 받는다. 자르면 후보가 조용히 줄어 순위가 부실해진다.
  return await selectAllPages<CelebIndexRow>((from, to) =>
    db
      .from('celebs')
      .select('id, slug, nickname, nickname_en, avatar_url, profession, nationality, birth_date, celeb_tier, celeb_reality')
      .eq('publication_status', 'active')
      .order('id')
      .range(from, to)
      .overrideTypes<CelebIndexRow[], { merge: false }>()
  )
}

async function fetchInfluenceScores(): Promise<InfluenceRow[]> {
  const db = createStaticClient()
  return await selectAllPages<InfluenceRow>((from, to) =>
    db
      .from('celeb_influence')
      .select('celeb_id, total_score')
      .order('celeb_id')
      .range(from, to)
      .overrideTypes<InfluenceRow[], { merge: false }>()
  )
}

/* 인물 한 명의 수정과 무관한 공유 원장이라 CELEBS 목록 태그를 달지 않는다.
   태그를 붙이면 프로필 한 건을 고칠 때마다 모든 인물 상세가 함께 비워진다. */
const getCelebIndexCached = unstable_cache(
  fetchCelebIndex,
  ['celeb-index-for-related'],
  { revalidate: STATIC_REVALIDATE },
)

const getInfluenceScoresCached = unstable_cache(
  fetchInfluenceScores,
  ['celeb-influence-for-related'],
  { revalidate: STATIC_REVALIDATE },
)

export interface RelatedFiguresInput {
  celebId: string
  profession: string | null
  nationality: string | null
  birthDate: string | null
  celebReality?: string | null
  relations: readonly RelatedRelationInput[]
  limit: number
}

/** 관계를 먼저 세우고 남은 자리를 직군·시대·나라 거리로 채운 인물 목록 */
export async function getRelatedFigures({
  celebId,
  profession,
  nationality,
  birthDate,
  celebReality,
  relations,
  limit,
}: RelatedFiguresInput): Promise<RelatedFigureRanked[]> {
  const [rows, scores] = await Promise.all([
    getCelebIndexCached(),
    getInfluenceScoresCached(),
  ])

  const scoreById = new Map(
    scores.map((row) => [row.celeb_id, row.total_score ?? 0]),
  )

  const candidates: RelatedCandidate[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    nickname: row.nickname,
    nickname_en: row.nickname_en,
    avatar_url: row.avatar_url,
    profession: row.profession,
    nationality: row.nationality,
    birthYear: getCelebYear(row.birth_date),
    influence: scoreById.get(row.id) ?? 0,
    isFiction: row.celeb_reality !== 'REAL',
  }))

  return rankRelatedFigures({
    self: {
      id: celebId,
      profession,
      nationality,
      birthYear: getCelebYear(birthDate),
      isFiction: (celebReality ?? 'REAL') !== 'REAL',
    },
    relations,
    candidates,
    limit,
  })
}
