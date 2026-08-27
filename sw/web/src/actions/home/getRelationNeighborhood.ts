/*
  파일명: /actions/home/getRelationNeighborhood.ts
  기능: 인물 한 명을 둘러싼 관계망 — 탐색기가 중심을 옮길 때마다 부른다
  책임: 중심 인물과 그 이웃을 방향별로 묶어 돌려준다. 나누는 규칙은
        lib/celeb/relationNeighborhood.ts가 쥐고 여기서는 조회와 캐시만 맡는다.
        인물 상세(getCelebBySlug)도 같은 원장을 읽지만 그쪽은 도표·모달까지 딸린
        큰 묶음이라, 탐색기가 중심을 옮길 때마다 쓰기에는 무겁다.
*/

'use server'

import { unstable_cache } from 'next/cache'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import {
  groupNeighbors,
  type NeighborCandidate,
  type NeighborGroup,
  type NeighborRelationInput,
} from '@/lib/celeb/relationNeighborhood'
import { getInfluenceRanking } from './getCelebs'

/** 묶음 하나에 세울 최대 인원. 넘치면 「N명 중 12명」으로 적는다 */
const NEIGHBOR_LIMIT = 12

interface RelationRow {
  rel_type: string
  note: string | null
  note_en: string | null
  target: {
    id: string
    slug: string | null
    nickname: string
    nickname_en: string | null
    avatar_url: string | null
    title: string | null
    title_en: string | null
    celeb_tier: string | null
    publication_status: string | null
  } | null
}

export interface RelationNeighborhood {
  center: NeighborCandidate
  groups: NeighborGroup[]
}

const CENTER_COLUMNS = 'id, slug, nickname, nickname_en, avatar_url, title, title_en'

async function fetchNeighborhood(celebId: string): Promise<RelationNeighborhood | null> {
  const supabase = createStaticClient()

  const [centerResult, relationResult] = await Promise.all([
    supabase.from('celebs').select(CENTER_COLUMNS).eq('id', celebId).maybeSingle(),
    supabase
      .from('celeb_relations')
      .select(
        `rel_type, note, note_en, target:celebs!celeb_relations_to_celebs_fkey(${CENTER_COLUMNS}, celeb_tier, publication_status)`
      )
      .eq('from_id', celebId)
      .overrideTypes<RelationRow[], { merge: false }>(),
  ])

  const centerRow = centerResult.data
  if (!centerRow) return null

  const ranking = await getInfluenceRanking()
  const toCandidate = (row: {
    id: string
    slug: string | null
    nickname: string
    nickname_en: string | null
    avatar_url: string | null
    title: string | null
    title_en: string | null
  }): NeighborCandidate => ({
    id: row.id,
    slug: row.slug,
    nickname: row.nickname,
    nicknameEn: row.nickname_en,
    avatarUrl: row.avatar_url,
    title: row.title,
    titleEn: row.title_en,
    influence: ranking.scoreMap[row.id] ?? 0,
  })

  const candidates = new Map<string, NeighborCandidate>()
  const relations: NeighborRelationInput[] = []

  for (const row of relationResult.data ?? []) {
    const target = row.target
    if (!target) continue
    // 목록에 서지 않는 등급과 비공개 인물은 파고들 곳이 없다
    if (target.publication_status !== 'active') continue
    if (!(LISTING_DEFAULT_TIERS as readonly string[]).includes(target.celeb_tier ?? 'full')) continue

    candidates.set(target.id, toCandidate(target))
    relations.push({
      targetId: target.id,
      relType: row.rel_type,
      note: row.note,
      noteEn: row.note_en,
    })
  }

  return {
    center: toCandidate(centerRow),
    groups: groupNeighbors({ relations, candidates, limit: NEIGHBOR_LIMIT }),
  }
}

/* 인물 한 명분이라 캐시 키에 id가 들어간다. 관계는 운영자가 넣을 때만 바뀌므로
   긴 수명을 두고, 무효화는 CELEBS 태그가 아니라 만료에 맡긴다 —
   태그를 붙이면 프로필 한 건을 고칠 때 모든 인물의 관계망이 함께 비워진다 */
const getNeighborhoodCached = unstable_cache(fetchNeighborhood, ['celeb-relation-neighborhood'], {
  revalidate: STATIC_REVALIDATE,
})

/** 인물 한 명을 둘러싼 관계망. 없는 인물이면 null */
export async function getRelationNeighborhood(
  celebId: string
): Promise<RelationNeighborhood | null> {
  if (!celebId) return null
  return await getNeighborhoodCached(celebId)
}
