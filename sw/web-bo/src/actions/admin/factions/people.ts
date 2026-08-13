'use server'

/**
 * 현재 편집 중인 팩션 등장인물의 프로필 사진 조회.
 * 등장 순서와 소속은 클라이언트가 쥔 최신 대본에서 정하고, 여기서는 불변 UUID에 해당하는
 * 셀럽 프로필만 한 번에 읽는다. 사진 저장은 기존 셀럽 이미지 편집기가 맡는다.
 */

import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { factionAdminClient, requireFactionAdmin } from '@/lib/faction-db'

interface ProfileRow {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
  portrait_url: string | null
  title: string | null
  profession: string | null
  publication_status: string | null
}

export interface FactionPersonProfile {
  id: string
  slug: string | null
  nickname: string
  avatarUrl: string | null
  portraitUrl: string | null
  title: string | null
  profession: string | null
  publicationStatus: string | null
}

export interface FactionPeopleProfileResult {
  profiles: FactionPersonProfile[]
  missingIds: string[]
}

const MAX_EPISODE_PEOPLE = 300

export async function loadFactionPeopleProfiles(celebIds: string[]): Promise<FactionPeopleProfileResult> {
  await requireFactionAdmin()

  const ids = [...new Set(celebIds.map(id => id.trim()).filter(Boolean))]
  if (ids.length > MAX_EPISODE_PEOPLE) {
    throw new Error(`한 에피소드에서 조회할 수 있는 인물은 최대 ${MAX_EPISODE_PEOPLE}명입니다.`)
  }
  if (ids.length === 0) return { profiles: [], missingIds: [] }

  const db = factionAdminClient()
  const rows = await selectInChunks<ProfileRow>(ids, chunk =>
    db.from('celebs')
      .select('id,slug,nickname,avatar_url,portrait_url,title,profession,publication_status')
      .in('id', chunk)
      .overrideTypes<ProfileRow[], { merge: false }>())
  const foundIds = new Set(rows.map(row => row.id))

  return {
    profiles: rows.map(row => ({
      id: row.id,
      slug: row.slug,
      nickname: row.nickname?.trim() || '이름 없음',
      avatarUrl: row.avatar_url,
      portraitUrl: row.portrait_url,
      title: row.title,
      profession: row.profession,
      publicationStatus: row.publication_status,
    })),
    missingIds: ids.filter(id => !foundIds.has(id)),
  }
}
