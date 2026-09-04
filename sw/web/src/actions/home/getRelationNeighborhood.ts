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
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import type { CelebRelationGroup } from '@feelandnote/shared/constants/celeb-relations'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import {
  groupNeighbors,
  type NeighborCandidate,
  type NeighborGroup,
  type NeighborRelationInput,
} from '@/lib/celeb/relationNeighborhood'
import { mergeRelationRowsForViewer } from '@/lib/celeb/relationRows'
import { getInfluenceRanking } from './getCelebs'

/** 묶음 하나에 세울 최대 인원. 넘치면 「N명 중 12명」으로 적는다 */
const NEIGHBOR_LIMIT = 12

interface RelationRow {
  from_id: string
  to_id: string
  rel_type: string
  rel_group: CelebRelationGroup
  note: string | null
  note_en: string | null
  from: {
    id: string
    slug: string | null
    nickname: string
    nickname_en: string | null
    avatar_url: string | null
    title: string | null
    title_en: string | null
    celeb_reality: string | null
    publication_status: string | null
  } | null
  to: {
    id: string
    slug: string | null
    nickname: string
    nickname_en: string | null
    avatar_url: string | null
    title: string | null
    title_en: string | null
    celeb_reality: string | null
    publication_status: string | null
  } | null
}

export interface RelationNeighborhood {
  center: NeighborCandidate
  groups: NeighborGroup[]
}

const CENTER_COLUMNS = 'id, slug, nickname, nickname_en, avatar_url, title, title_en'

async function fetchNeighborhood(celebId: string): Promise<RelationNeighborhood | null> {
  const db = createStaticClient()

  const relationSelect = `from_id, to_id, rel_type, rel_group, note, note_en,
    from:celebs!celeb_relations_from_celebs_fkey(${CENTER_COLUMNS}, celeb_reality, publication_status),
    to:celebs!celeb_relations_to_celebs_fkey(${CENTER_COLUMNS}, celeb_reality, publication_status)`
  const [centerResult, outgoingResult, incomingResult, ranking] = await Promise.all([
    db.from('celebs').select(CENTER_COLUMNS).eq('id', celebId).maybeSingle(),
    db
      .from('celeb_relations')
      .select(relationSelect)
      .eq('from_id', celebId)
      .overrideTypes<RelationRow[], { merge: false }>(),
    db
      .from('celeb_relations')
      .select(relationSelect)
      .eq('to_id', celebId)
      .overrideTypes<RelationRow[], { merge: false }>(),
    getInfluenceRanking(),
  ])

  const centerRow = centerResult.data
  if (!centerRow) return null

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

  const rawRows = [...(outgoingResult.data ?? []), ...(incomingResult.data ?? [])]
  const profileById = new Map(
    rawRows
      .flatMap((row) => [row.from, row.to])
      .filter((profile): profile is NonNullable<RelationRow['from']> => profile !== null)
      .map((profile) => [profile.id, profile]),
  )
  const viewedRows = mergeRelationRowsForViewer(rawRows, celebId)

  for (const row of viewedRows) {
    const target = profileById.get(row.counterpartId)
    if (!target) continue
    // 목록에 서지 않는 등급과 비공개 인물은 파고들 곳이 없다
    if (target.publication_status !== 'active') continue
    if (!(LISTING_DEFAULT_REALITIES as readonly string[]).includes(target.celeb_reality ?? 'REAL')) continue

    candidates.set(target.id, toCandidate(target))
    relations.push({
      targetId: target.id,
      relType: row.relType,
      note: row.note,
      noteEn: row.noteEn,
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
