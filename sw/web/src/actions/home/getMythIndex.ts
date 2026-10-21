import { cache } from 'react'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE, cachedList, throwOnQueryError } from '@/lib/cache'
import { compressedJsonCache } from '@/lib/compressedJsonCache'
import { createStaticClient } from '@/lib/db/static'
import { selectVisibleFactionMembers } from '@/lib/faction-members'
import { toCoverImage, toSceneImages } from '@feelandnote/shared/lib/faction-team-image'
import type { MythData } from './mythTypes'
import { MYTH_OTHER_GROUP_ID } from './mythTypes'

interface IndexMember { lv2_id: string; celeb_id: string; group_name: string | null; group_name_en: string | null; group_position: number | null }
const memberColumns = 'lv2_id,celeb_id,group_name,group_name_en,group_position'

/** Navigation needs counts, groups and image markers, not every person's guide or books. */
const readIndex = compressedJsonCache(async (locale: string): Promise<MythData> => {
  const db = createStaticClient()
  const [regions, myths] = await Promise.all([
    db.from('faction_lv1').select('id,slug,name,name_en').eq('is_myth', true).order('sort_order'),
    db.from('faction_lv2').select('id,lv1_id,slug,name,name_en,headline,headline_en,published,team_images,scenes_complete').eq('is_myth', true).order('sort_order'),
  ])
  throwOnQueryError('myth-index/regions', regions.error)
  throwOnQueryError('myth-index/myths', myths.error)
  const members = await selectVisibleFactionMembers<IndexMember>(db, memberColumns, (myths.data ?? []).map(row => row.id))
  const regionIds = new Set((regions.data ?? []).map(row => row.id))
  const byMyth = new Map<string, IndexMember[]>()
  for (const member of members) { const rows = byMyth.get(member.lv2_id) ?? []; rows.push(member); byMyth.set(member.lv2_id, rows) }
  const entries: MythData['myths'] = (myths.data ?? []).flatMap(row => {
    if (!row.slug) return []
    const rows = byMyth.get(row.id) ?? []
    if (!rows.length) return []
    const groupMap = new Map<string, { name: string | null; personIds: string[]; position: number }>()
    const others: string[] = []
    for (const person of new Map(rows.map(member => [member.celeb_id, member])).values()) {
      const label = person.group_name?.trim()
      if (!label) { others.push(person.celeb_id); continue }
      const group = groupMap.get(label) ?? { name: locale === 'en' ? person.group_name_en?.trim() || null : label, personIds: [], position: Number.MAX_SAFE_INTEGER }
      group.personIds.push(person.celeb_id); group.position = Math.min(group.position, person.group_position ?? Number.MAX_SAFE_INTEGER); groupMap.set(label, group)
    }
    const groups = groupMap.size < 2 ? [] : [...groupMap].sort((a, b) => a[1].position - b[1].position)
      .map(([id, group]) => ({ id, name: group.name, personIds: group.personIds, description: null }))
    if (groups.length && others.length) groups.push({ id: MYTH_OTHER_GROUP_ID, name: null, personIds: others, description: null })
    const titleArt = toCoverImage(row.team_images, true)
    return [{ id: row.id, slug: row.slug, name: locale === 'en' ? row.name_en || row.name : row.name,
      headline: locale === 'en' ? row.headline_en?.trim() || null : row.headline?.trim() || null, description: null, isPublished: row.published === true, scenesComplete: row.scenes_complete,
      regionId: regionIds.has(row.lv1_id) ? row.lv1_id : 'other',
      images: [...(titleArt ? [{ url: titleArt.url, label: null }] : []), ...toSceneImages(row.team_images, locale).map(image => ({ url: image.url, label: null, kind: 'scene' as const }))],
      music: null, personIds: [...new Set(rows.map(member => member.celeb_id))], leadPersonIds: [], groups }]
  })
  const resultRegions = (regions.data ?? []).map(row => ({ id: row.id, slug: row.slug ?? '', name: locale === 'en' ? row.name_en || row.name : row.name, mythIds: entries.filter(myth => myth.regionId === row.id).map(myth => myth.id) })).filter(row => row.mythIds.length)
  const otherIds = entries.filter(myth => myth.regionId === 'other').map(myth => myth.id)
  if (otherIds.length) resultRegions.push({ id: 'other', slug: 'other', name: locale === 'en' ? 'Other myths' : '기타 신화', mythIds: otherIds })
  return { regions: resultRegions, myths: entries, people: [], works: [] }
}, ['myth-index-v2'], { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.FACTIONS, CACHE_TAGS.CELEBS] })

export const getMythIndex = cache(readIndex)

/** Metadata and the publication gate never prepare a book shelf. */
export const getMythMetadata = cache((slug: string, locale: string) => cachedList(CACHE_TAGS.FACTIONS, ['myth-metadata-v1', slug, locale], async () => {
  const db = createStaticClient()
  const { data: row, error } = await db.from('faction_lv2').select('id,name,name_en,headline,headline_en,description,description_en,lead_person_ids')
    .eq('slug', slug).eq('is_myth', true).eq('published', true).maybeSingle()
  throwOnQueryError('myth-metadata', error)
  if (!row) return null
  const members = await selectVisibleFactionMembers<IndexMember>(db, memberColumns, [row.id])
  if (!members.length) return null
  const personIds = [...new Set(members.map(member => member.celeb_id))]
  const leadIds = [...new Set([...(row.lead_person_ids ?? []), ...personIds])].filter(id => personIds.includes(id)).slice(0, 6)
  const profiles = await db.from('celebs').select('id,nickname,nickname_en').in('id', leadIds).eq('publication_status', 'active')
  throwOnQueryError('myth-metadata/leads', profiles.error)
  const names = new Map((profiles.data ?? []).map(person => [person.id, locale === 'en' ? person.nickname_en || person.nickname : person.nickname]))
  const groups = [...new Set(members.map(member => locale === 'en' ? member.group_name_en : member.group_name).filter(Boolean))]
  return { name: locale === 'en' ? row.name_en || row.name : row.name, headline: locale === 'en' ? row.headline_en : row.headline,
    description: locale === 'en' ? row.description_en || row.description : row.description, leads: leadIds.flatMap(id => names.get(id) ?? []), memberCount: personIds.length, groups: groups.length < 2 ? [] : groups }
}, { revalidate: STATIC_REVALIDATE, extraTags: [CACHE_TAGS.CELEBS] }))
