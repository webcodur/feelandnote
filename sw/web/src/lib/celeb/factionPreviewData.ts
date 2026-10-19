import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { toTeamImages } from '@feelandnote/shared/lib/faction-team-image'
import { createStaticClient } from '@/lib/db/static'
import { PUBLIC_FACTION_FILTER, selectVisibleFactionMembers } from '@/lib/faction-members'
import { LIST_REVALIDATE } from '@/lib/cache'
import { coalescePublicRead } from '@/lib/coalescePublicRead'
import type { FactionPreviewMember } from './factionPreview'

interface MemberRow {
  lv2_id: string
  celeb_id: string
  lv3_id: string | null
  group_name: string | null
  group_name_en: string | null
  group_position: number | null
  sort_order: number | null
}

interface ProfileRow { id: string; nickname: string; nickname_en: string | null }

// 표지·이름·그룹만 읽는 공개 미리보기. 개인 사진·소개·음성 등 도감 상세 자료는 싣지 않는다.
export const getFactionPreviewData = unstable_cache(
  coalescePublicRead(async (ids: string[]) => {
    const db = createStaticClient()
    const [factions, rows] = await Promise.all([
      selectInChunks<{ id: string; team_images: unknown }>(ids, chunk => db
        .from('faction_lv2').select('id, team_images')
        .in('id', chunk).or(PUBLIC_FACTION_FILTER).order('id')),
      selectVisibleFactionMembers<MemberRow>(db, 'lv2_id, celeb_id, lv3_id, group_name, group_name_en, group_position, sort_order', ids),
    ])
    const profiles = await selectInChunks<ProfileRow>([...new Set(rows.map(row => row.celeb_id))], chunk => db
      .from('celebs').select('id, nickname, nickname_en').in('id', chunk).eq('publication_status', 'active'))
    const byId = new Map(profiles.map(row => [row.id, row]))
    return factions.map(faction => {
      const images = toTeamImages(faction.team_images)
      const members: FactionPreviewMember[] = rows.filter(row => row.lv2_id === faction.id).flatMap(row => {
        const profile = byId.get(row.celeb_id)
        return profile ? [{ id: profile.id, name: profile.nickname, nameEn: profile.nickname_en,
          groupId: row.lv3_id, groupName: row.group_name, groupNameEn: row.group_name_en,
          groupPosition: row.group_position, position: row.sort_order }] : []
      })
      return { id: faction.id, cover: images.find(image => image.kind === 'cover')?.url ?? images[0]?.url ?? null, members }
    })
  }),
  ['celeb-faction-preview-data-v2'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.FACTIONS, CACHE_TAGS.CELEBS] },
)
