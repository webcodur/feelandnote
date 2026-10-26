import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { filterSceneVisibility, toTeamImages } from '@feelandnote/shared/lib/faction-team-image'
import { createStaticClient } from '@/lib/db/static'
import { PUBLIC_FACTION_FILTER, selectVisibleFactionMembers } from '@/lib/faction-members'
import { LIST_REVALIDATE } from '@/lib/cache'
import { coalescePublicRead } from '@/lib/coalescePublicRead'
import { selectFactionPreviewEntries, type FactionPreviewMembership } from './factionPreview'

interface MemberRow {
  lv2_id: string
  celeb_id: string
  lv3_id: string | null
  sort_order: number | null
}

interface FactionRow {
  id: string
  team_images: unknown
  groups: { id: string; name: string; name_en: string | null; sort_order: number | null }[]
}

interface ProfileRow { id: string; nickname: string; nickname_en: string | null }

// 사람 이름과 무관한 표지·공개 배정은 같은 소속 목록의 다른 인물도 재사용한다.
const getFactionPreviewRosters = unstable_cache(
  coalescePublicRead(async (ids: string[]) => {
    const db = createStaticClient()
    const [factions, rows] = await Promise.all([
      selectInChunks<FactionRow>(ids, chunk => db
        .from('faction_lv2').select('id, team_images, groups:faction_lv3(id,name,name_en,sort_order)')
        .in('id', chunk).or(PUBLIC_FACTION_FILTER).order('id')),
      selectVisibleFactionMembers<MemberRow>(db, 'lv2_id, celeb_id, lv3_id, sort_order', ids),
    ])
    const groupsById = new Map(factions.flatMap(faction => faction.groups.map(group => [group.id, group] as const)))
    const membersByFaction = new Map<string, FactionPreviewMembership[]>()
    for (const row of rows) {
      const members = membersByFaction.get(row.lv2_id) ?? []
      const group = row.lv3_id ? groupsById.get(row.lv3_id) : null
      members.push({ id: row.celeb_id, groupId: row.lv3_id, groupName: group?.name ?? null, groupNameEn: group?.name_en ?? null,
        groupPosition: group?.sort_order ?? null, position: row.sort_order })
      membersByFaction.set(row.lv2_id, members)
    }
    return factions.map(faction => {
      const images = filterSceneVisibility(toTeamImages(faction.team_images))
      return { id: faction.id, cover: images.find(image => image.kind === 'cover')?.url ?? images[0]?.url ?? null,
        members: membersByFaction.get(faction.id) ?? [] }
    })
  }),
  ['celeb-faction-preview-rosters-v5-scene-visibility'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.FACTIONS, CACHE_TAGS.CELEBS] },
)

const getFactionPreviewNames = unstable_cache(
  coalescePublicRead(async (ids: string[]) => {
    const db = createStaticClient()
    return selectInChunks<ProfileRow>(ids, chunk => db.from('celebs')
      .select('id, nickname, nickname_en').in('id', chunk).eq('publication_status', 'active'))
  }),
  ['celeb-faction-preview-names-v1'],
  { revalidate: LIST_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
)

export async function getFactionPreviewData(ids: string[], personId: string) {
  const wanted = [...new Set(ids)].sort()
  if (!wanted.length) return []
  const rosters = await getFactionPreviewRosters(wanted)
  const selected = rosters.map(faction => ({ ...faction, selection: selectFactionPreviewEntries(faction.members, personId) }))
  const peopleIds = [...new Set(selected.flatMap(row => row.selection?.kind === 'people'
    ? row.selection.entries.map(person => person.id) : []))].sort()
  const profiles = peopleIds.length ? await getFactionPreviewNames(peopleIds) : []
  const byId = new Map(profiles.map(row => [row.id, row]))
  return selected.map(({ id, cover, selection }) => ({ id, cover, preview: selection ? {
    kind: selection.kind, remaining: selection.remaining,
    items: selection.entries.flatMap(row => {
      if (selection.kind === 'groups') return [{ name: row.groupName!, nameEn: row.groupNameEn }]
      const profile = byId.get(row.id)
      return profile ? [{ name: profile.nickname, nameEn: profile.nickname_en }] : []
    }),
  } : null }))
}
