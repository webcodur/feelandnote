/**
 * 출간 진단 — 제작 데이터를 서비스 도감·이미지 저장소 기록과 대조한다. 서버 전용, 읽기만 한다.
 *
 * **텍스트 대조는 없다.** 제작과 서비스가 같은 DB 안에 있어 견줄 상대가 없기 때문이다(문서 §4).
 * 남는 항목은 다섯이다.
 *   ① 셀럽이 해소되지 않은 인물 — 출간이 막힌다
 *   ② 태그가 지정되지 않은 세력 — 출간이 막힌다
 *   ③ 개인샷·그룹샷의 저장소 동기 상태 — 매니페스트 해시 대조
 *   ④ 얼굴 사진(아바타) 유무 — 도감 목록이 얼굴을 쓴다
 *   ⑤ 신화 표시 ↔ 셀럽 등급(fiction) 어긋남
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { IN_CHUNK } from '@feelandnote/shared/lib/faction-assemble'
import {
  collectEpisode, hashOfFile, soloShotKey, tagKeyOf, teamShotKey,
  type PublishEpisode, type PublishPerson,
} from './collect'
import { readManifest, type FactionSyncManifest } from './manifest'
import {
  ASSIGNMENT_COLUMNS, PROFILE_COLUMNS, TAG_COLUMNS, toImageArray,
  type CelebAssignmentRow, type CelebProfileRow, type CelebTagRow,
} from './supabase'
import type {
  FactionSyncGroup, FactionSyncLinkState, FactionSyncPerson,
  FactionSyncSoloShotState, FactionSyncStatus,
} from './types'

/** 서비스 쪽 현재 상태 한 벌 — 태그·배정·프로필. 인물마다 조회하지 않고 편 단위로 묶어 긁는다 */
export interface ServiceSnapshot {
  /** celeb_tags.id → 행 */
  tagsById: Map<string, CelebTagRow>
  /** celeb_tags.slug → 행 (태그 미연결 세력의 연결 키 해소용) */
  tagsBySlug: Map<string, CelebTagRow>
  /** `${tagId}:${celebId}` → 배정 행 */
  assignments: Map<string, CelebAssignmentRow>
  /** profiles.id → 프로필 */
  profilesById: Map<string, CelebProfileRow>
}

async function inChunks(
  db: SupabaseClient, table: string, col: string, values: string[], select: string,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  for (let i = 0; i < values.length; i += IN_CHUNK) {
    const { data, error } = await db.from(table).select(select).in(col, values.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    out.push(...((data ?? []) as unknown as Record<string, unknown>[]))
  }
  return out
}

/** 서비스 현황 조회 — 태그 2회(id·slug), 배정 1회, 프로필 1회 */
export async function loadServiceSnapshot(
  db: SupabaseClient, episode: PublishEpisode,
): Promise<ServiceSnapshot> {
  const tagIds = [...new Set(episode.groups.map(g => g.tagId).filter((v): v is string => !!v))]
  const tagSlugs = [...new Set(episode.groups.map(g => g.tagSlug).filter((v): v is string => !!v))]
  const celebIds = [...new Set(episode.groups.flatMap(g => g.people.map(p => p.celebId).filter((v): v is string => !!v)))]

  const tagsById = new Map<string, CelebTagRow>()
  const tagsBySlug = new Map<string, CelebTagRow>()
  const remember = (rows: CelebTagRow[]) => {
    for (const row of rows) {
      tagsById.set(row.id, row)
      if (row.slug) tagsBySlug.set(row.slug, row)
    }
  }
  if (tagIds.length) remember(await inChunks(db, 'celeb_tags', 'id', tagIds, TAG_COLUMNS) as unknown as CelebTagRow[])
  if (tagSlugs.length) remember(await inChunks(db, 'celeb_tags', 'slug', tagSlugs, TAG_COLUMNS) as unknown as CelebTagRow[])

  const assignments = new Map<string, CelebAssignmentRow>()
  const knownTagIds = [...tagsById.keys()]
  if (knownTagIds.length) {
    const rows = await inChunks(db, 'celeb_tag_assignments', 'tag_id', knownTagIds, ASSIGNMENT_COLUMNS)
    for (const row of rows as unknown as CelebAssignmentRow[]) {
      assignments.set(`${row.tag_id}:${row.celeb_id}`, row)
    }
  }

  const profilesById = new Map<string, CelebProfileRow>()
  if (celebIds.length) {
    const rows = await inChunks(db, 'profiles', 'id', celebIds, PROFILE_COLUMNS)
    for (const row of rows as unknown as CelebProfileRow[]) profilesById.set(row.id, row)
  }

  return { tagsById, tagsBySlug, assignments, profilesById }
}

/**
 * 세력의 태그 해소 — `tag_id` 가 먼저고, 없으면 데이터에 적힌 연결 키로 찾는다.
 *
 * 연결 키로 찾아지는 경우가 실제로 있다: 태그가 없던 때 저장했으면 `tag_id` 가 null 로 남고,
 * 그 뒤 태그가 생겨도 다시 저장하기 전까지는 이어지지 않는다. 출간이 그 자리에서 이어 준다.
 */
export function resolveTag(
  group: { tagId: string | null; tagSlug: string | null }, snap: ServiceSnapshot,
): CelebTagRow | undefined {
  if (group.tagId) {
    const byId = snap.tagsById.get(group.tagId)
    if (byId) return byId
  }
  if (group.tagSlug) return snap.tagsBySlug.get(group.tagSlug)
  return undefined
}

/** 인물의 셀럽 연결 상태 */
export function linkStateOf(p: PublishPerson): FactionSyncLinkState {
  if (p.celebId) return 'linked'
  return p.slug ? 'unresolved' : 'unkeyed'
}

function soloShotStateOf(
  hash: string | null,
  dbUrl: string | null | undefined,
  expectedKey: string | null,
  tagId: string | null,
  manifest: FactionSyncManifest,
  rel: string,
): FactionSyncSoloShotState {
  const hasDb = !!dbUrl?.trim()
  if (!hash) return hasDb ? 'db-only' : 'none'
  if (!hasDb) return 'local-only'
  const entry = manifest[rel]
  const same = !!entry
    && entry.hash === hash
    && (!expectedKey || entry.r2Key === expectedKey)
    && (!tagId || entry.tagId === tagId)
  return same ? 'synced' : 'stale'
}

/**
 * 신화 표시 ↔ 셀럽 등급 어긋남.
 * 제작 데이터가 신화라 했는데 셀럽 등급이 fiction 이 아니거나, 반대로 fiction 인데 표시가 없는 경우다.
 * 어느 쪽이 맞는지는 사람이 판단하므로 출간을 막지 않고 알리기만 한다.
 */
function tierMismatchOf(mythical: boolean, tier: string | undefined): boolean {
  if (!tier) return false
  return mythical !== (tier === 'fiction')
}

/** 에피소드 진단 — 읽기 전용 보고 */
export async function buildStatus(db: SupabaseClient, folder: string): Promise<FactionSyncStatus> {
  const episode = await collectEpisode(db, folder)
  const [snap, manifest] = await Promise.all([loadServiceSnapshot(db, episode), readManifest(folder)])

  const groups: FactionSyncGroup[] = []
  for (const g of episode.groups) {
    const tag = resolveTag(g, snap)
    const tagId = tag?.id ?? null

    const people: FactionSyncPerson[] = []
    for (const p of g.people) {
      const profile = p.celebId ? snap.profilesById.get(p.celebId) : undefined
      const assignment = tagId && p.celebId ? snap.assignments.get(`${tagId}:${p.celebId}`) : undefined
      const hash = p.image && !p.image.external ? await hashOfFile(p.image.abs) : null
      const tier = profile?.celeb_tier ?? undefined
      people.push({
        name: p.name,
        slug: p.slug,
        celebId: p.celebId,
        mythical: p.mythical,
        link: linkStateOf(p),
        assigned: !!assignment,
        soloShot: soloShotStateOf(
          hash,
          assignment?.spotlight_image_url,
          tagId && p.celebId ? soloShotKey(tagId, p.celebId) : null,
          tagId,
          manifest,
          p.image?.rel ?? '',
        ),
        avatar: !!profile?.avatar_url,
        tier,
        tierMismatch: tierMismatchOf(p.mythical, tier),
      })
    }

    let teamLocal = 0
    let teamSynced = 0
    for (const shot of g.teamShots) {
      if (shot.image.external) continue
      const hash = await hashOfFile(shot.image.abs)
      if (!hash) continue
      teamLocal += 1
      const entry = manifest[shot.image.rel]
      const expected = tagId ? teamShotKey(tagId, g.position, shot.num, hash) : null
      if (entry && entry.hash === hash && (!expected || entry.r2Key === expected)) teamSynced += 1
    }

    groups.push({
      index: g.index,
      position: g.position,
      name: g.name,
      tagId,
      tagSlug: g.tagSlug,
      suggestedSlug: g.suggestedSlug,
      tag: {
        exists: !!tag,
        id: tag?.id,
        name: tag?.name,
        isFeatured: tag?.is_featured ?? undefined,
        teamImagesCount: toImageArray(tag?.team_images).length,
      },
      // tagTotal 은 아래에서 태그 단위로 합산해 채운다
      teamShots: { local: teamLocal, synced: teamSynced, tagTotal: teamLocal },
      people,
    })
  }

  // team_images 는 태그 하나의 배열이다 — 태그를 나눠 쓰는 세력들의 로컬 장수 합을 함께 실어
  // 화면이 "이 세력 1장인데 도감은 4장"을 어긋남으로 오해하지 않게 한다.
  const localByTag = new Map<string, number>()
  episode.groups.forEach((g, i) => {
    const key = tagKeyOf(g)
    localByTag.set(key, (localByTag.get(key) ?? 0) + groups[i].teamShots.local)
  })
  episode.groups.forEach((g, i) => {
    groups[i].teamShots.tagTotal = localByTag.get(tagKeyOf(g)) ?? groups[i].teamShots.local
  })

  const allPeople = groups.flatMap(g => g.people)
  return {
    folder,
    groups,
    summary: {
      groups: groups.length,
      groupsUnlinked: groups.filter(g => !g.tagId && !g.tag.exists).length,
      people: allPeople.length,
      publishable: allPeople.filter(p => p.link === 'linked').length,
      blocked: allPeople.filter(p => p.link !== 'linked').length,
      unassigned: allPeople.filter(p => p.link === 'linked' && !p.assigned).length,
      soloShotPending: allPeople.filter(p => p.soloShot === 'stale' || p.soloShot === 'local-only').length,
      teamShotPending: groups.reduce((s, g) => s + Math.max(0, g.teamShots.local - g.teamShots.synced), 0),
      avatarMissing: allPeople.filter(p => p.link === 'linked' && !p.avatar).length,
      tierMismatch: allPeople.filter(p => p.tierMismatch).length,
    },
  }
}
