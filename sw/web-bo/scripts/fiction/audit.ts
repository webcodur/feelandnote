/**
 * 팩션의 신화·전설·허구 인물과 fiction 프로필·대표 원전 연결을 전수 감사한다.
 *
 * 읽기 전용이다. DB 4계층과 로컬 faction-data.json을 함께 보되,
 * 인물·글의 SSoT는 DB, 로컬 파일은 export/아이디어 잔존 여부 확인에만 쓴다.
 *
 * 실행:
 *   node --env-file=.env --import tsx scripts/audit-fiction-faction-links.ts
 *   node --env-file=.env --import tsx scripts/audit-fiction-faction-links.ts --json
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>
type DbError = { message: string } | null
type PageResult<T> = { data: T[] | null; error: DbError }

type EpisodeRow = {
  id: string
  folder: string
  title: string | null
  title_en: string | null
  status: string
  registered: boolean
}

type GroupRow = {
  id: string
  episode_id: string
  position: number
  name: string
  tag_id: string | null
}

type ClusterRow = {
  id: string
  group_id: string
  position: number
}

type PersonRow = {
  id: string
  cluster_id: string
  position: number
  name: string
  name_en: string | null
  slug: string | null
  celeb_id: string | null
  mythical: boolean
  image: string | null
  epithet: string | null
  epithet_en: string | null
  lines: string[] | null
  lines_en: string[] | null
  disabled: boolean
  longform_only: boolean
}

type ProfileRow = {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  celeb_tier: string | null
  publication_status: string | null
  avatar_url: string | null
  virtual_monologue: string | null
}

type TagRow = {
  id: string
  slug: string
  name: string
  is_fiction: boolean
}

type AssignmentRow = {
  tag_id: string
  celeb_id: string
}

type SourceRelationRow = {
  content_id: string
  celeb_id: string
}

type SourceContentRow = {
  content_id: string
}

type ContentRow = {
  id: string
  type: string
  external_source: string | null
  external_id: string | null
}

type ContentLocaleRow = {
  content_id: string
  locale: string
  title: string
}

type JsonPerson = {
  name?: unknown
  nameEn?: unknown
  slug?: unknown
  mythical?: unknown
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
}

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PAGE = 1000
const root = path.resolve(process.cwd(), '../remotion/public/factions')
const ideaBank = path.join(root, '_docs/idea-bank')

async function allRows<T>(
  label: string,
  page: (from: number, to: number) => Promise<PageResult<T>>,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw new Error(`${label} 조회 실패: ${error.message}`)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < PAGE) return out
  }
}

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name)
    return entry.isDirectory() ? walkFiles(absolute) : [absolute]
  })
}

function collectJsonPeople(value: unknown, out: JsonPerson[] = []): JsonPerson[] {
  if (Array.isArray(value)) {
    for (const child of value) collectJsonPeople(child, out)
    return out
  }
  if (!value || typeof value !== 'object') return out
  const row = value as Row
  if ('slug' in row && ('name' in row || 'nameEn' in row)) out.push(row as JsonPerson)
  for (const child of Object.values(row)) collectJsonPeople(child, out)
  return out
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function normalizedName(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('en')
    .replace(/\([^)]*\)/g, '')
    .replace(/^the\s+/i, '')
    .replace(/[^a-z0-9가-힣]/g, '')
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  return Object.fromEntries(
    [...values.reduce((map, value) => {
      const name = key(value)
      map.set(name, (map.get(name) ?? 0) + 1)
      return map
    }, new Map<string, number>())].sort(([a], [b]) => a.localeCompare(b)),
  )
}

async function main() {
  const episodes = await allRows<EpisodeRow>('faction_episodes', async (from, to) => {
    const { data, error } = await db
      .from('faction_episodes')
      .select('id,folder,title,title_en,status,registered')
      .order('id')
      .range(from, to)
    return { data: data as unknown as EpisodeRow[] | null, error }
  })
  const groups = await allRows<GroupRow>('faction_groups', async (from, to) => {
    const { data, error } = await db
      .from('faction_groups')
      .select('id,episode_id,position,name,tag_id')
      .order('id')
      .range(from, to)
    return { data: data as unknown as GroupRow[] | null, error }
  })
  const clusters = await allRows<ClusterRow>('faction_clusters', async (from, to) => {
    const { data, error } = await db
      .from('faction_clusters')
      .select('id,group_id,position')
      .order('id')
      .range(from, to)
    return { data: data as unknown as ClusterRow[] | null, error }
  })
  const people = await allRows<PersonRow>('faction_people', async (from, to) => {
    const { data, error } = await db
      .from('faction_people')
      .select('id,cluster_id,position,name,name_en,slug,celeb_id,mythical,image,epithet,epithet_en,lines,lines_en,disabled,longform_only')
      .order('id')
      .range(from, to)
    return { data: data as unknown as PersonRow[] | null, error }
  })
  const profiles = await allRows<ProfileRow>('celebs', async (from, to) => {
    const { data, error } = await db
      .from('celebs')
      .select('id,slug,nickname,nickname_en,celeb_tier,publication_status,avatar_url,virtual_monologue')
      .order('id')
      .range(from, to)
    return { data: data as unknown as ProfileRow[] | null, error }
  })
  const tags = await allRows<TagRow>('celeb_tags', async (from, to) => {
    const { data, error } = await db
      .from('celeb_tags')
      .select('id,slug,name,is_fiction')
      .order('id')
      .range(from, to)
    return { data: data as unknown as TagRow[] | null, error }
  })
  const assignments = await allRows<AssignmentRow>('celeb_tag_assignments', async (from, to) => {
    const { data, error } = await db
      .from('celeb_tag_assignments')
      .select('tag_id,celeb_id')
      .order('tag_id')
      .order('celeb_id')
      .range(from, to)
    return { data: data as unknown as AssignmentRow[] | null, error }
  })
  const sourceRelations = await allRows<SourceRelationRow>(
    'fiction_source_characters',
    async (from, to) => {
      const { data, error } = await db
        .from('fiction_source_characters')
        .select('content_id,celeb_id')
        .order('content_id')
        .order('celeb_id')
        .range(from, to)
      return { data: data as unknown as SourceRelationRow[] | null, error }
    },
  )
  const sourceContents = await allRows<SourceContentRow>(
    'fiction_source_contents',
    async (from, to) => {
      const { data, error } = await db
        .from('fiction_source_contents')
        .select('content_id')
        .order('content_id')
        .range(from, to)
      return { data: data as unknown as SourceContentRow[] | null, error }
    },
  )
  const sourceContentIds = sourceContents.map((row) => row.content_id)
  const { data: sourceContentRows, error: sourceContentError } = await db
    .from('contents')
    .select('id,type,external_source,external_id')
    .in('id', sourceContentIds)
  if (sourceContentError) {
    throw new Error(`대표 원전 contents 조회 실패: ${sourceContentError.message}`)
  }
  const { data: sourceLocaleRows, error: sourceLocaleError } = await db
    .from('content_locales')
    .select('content_id,locale,title')
    .in('content_id', sourceContentIds)
  if (sourceLocaleError) {
    throw new Error(`대표 원전 locale 조회 실패: ${sourceLocaleError.message}`)
  }

  const episodeById = new Map(episodes.map((row) => [row.id, row]))
  const groupById = new Map(groups.map((row) => [row.id, row]))
  const clusterById = new Map(clusters.map((row) => [row.id, row]))
  const profileById = new Map(profiles.map((row) => [row.id, row]))
  const profileBySlug = new Map(
    profiles.flatMap((row) => row.slug ? [[row.slug, row] as const] : []),
  )
  const profilesByName = new Map<string, ProfileRow[]>()
  for (const profile of profiles) {
    for (const key of unique([
      normalizedName(profile.nickname),
      normalizedName(profile.nickname_en),
    ]).filter(Boolean)) {
      profilesByName.set(key, [...(profilesByName.get(key) ?? []), profile])
    }
  }
  const tagById = new Map(tags.map((row) => [row.id, row]))
  const sourceCountByCeleb = countBy(sourceRelations, (row) => row.celeb_id)
  const sourceRelationCountByContent = countBy(sourceRelations, (row) => row.content_id)
  const sourceContentById = new Map(
    ((sourceContentRows ?? []) as ContentRow[]).map((row) => [row.id, row]),
  )
  const sourceLocaleKeys = new Set(
    ((sourceLocaleRows ?? []) as ContentLocaleRow[])
      .map((row) => `${row.content_id}:${row.locale}`),
  )

  const personEpisode = (person: PersonRow): EpisodeRow | undefined => {
    const cluster = clusterById.get(person.cluster_id)
    const group = cluster ? groupById.get(cluster.group_id) : undefined
    return group ? episodeById.get(group.episode_id) : undefined
  }

  const mythicalPeople = people.filter((row) => row.mythical)
  const fictionPlacementsMissingMythical = people.flatMap((person) => {
    if (person.mythical) return []
    const profile = person.celeb_id
      ? profileById.get(person.celeb_id)
      : person.slug
        ? profileBySlug.get(person.slug)
        : undefined
    if (profile?.celeb_tier !== 'fiction') return []
    return [{
      episode: personEpisode(person)?.folder ?? '(orphan)',
      personId: person.id,
      slug: person.slug,
      name: person.name,
      celebId: person.celeb_id,
    }]
  })
  const mythicalSlugs = unique(
    mythicalPeople.flatMap((row) => row.slug ? [row.slug] : []),
  ).sort()
  const mythicalDuplicateSlugs = Object.entries(
    countBy(
      mythicalPeople.filter((row): row is PersonRow & { slug: string } => Boolean(row.slug)),
      (row) => row.slug,
    ),
  ).filter(([, count]) => count > 1).map(([slug, count]) => ({
    slug,
    count,
    episodes: unique(
      mythicalPeople
        .filter((row) => row.slug === slug)
        .flatMap((row) => {
          const episode = personEpisode(row)
          return episode ? [episode.folder] : []
        }),
    ).sort(),
  }))
  const mythicalEpisodeFolders = unique(
    mythicalPeople.flatMap((row) => {
      const episode = personEpisode(row)
      return episode ? [episode.folder] : []
    }),
  ).sort()

  const unresolved = mythicalPeople.flatMap((person) => {
    const episode = personEpisode(person)
    if (person.celeb_id) return []
    const slugProfile = person.slug ? profileBySlug.get(person.slug) : undefined
    const nameProfiles = unique([
      ...(profilesByName.get(normalizedName(person.name)) ?? []),
      ...(profilesByName.get(normalizedName(person.name_en)) ?? []),
    ])
    return [{
      episode: episode?.folder ?? '(orphan)',
      personId: person.id,
      name: person.name,
      nameEn: person.name_en,
      slug: person.slug,
      epithet: person.epithet,
      epithetEn: person.epithet_en,
      lines: person.lines,
      linesEn: person.lines_en,
      profileBySlug: slugProfile
        ? {
            id: slugProfile.id,
            tier: slugProfile.celeb_tier,
            publicationStatus: slugProfile.publication_status,
          }
        : null,
      profilesByName: nameProfiles.map((profile) => ({
        id: profile.id,
        slug: profile.slug,
        nickname: profile.nickname,
        nicknameEn: profile.nickname_en,
        tier: profile.celeb_tier,
        publicationStatus: profile.publication_status,
      })),
    }]
  })

  const wrongTier = mythicalPeople.flatMap((person) => {
    if (!person.celeb_id) return []
    const profile = profileById.get(person.celeb_id)
    if (profile?.celeb_tier === 'fiction') return []
    return [{
      episode: personEpisode(person)?.folder ?? '(orphan)',
      slug: person.slug,
      name: person.name,
      celebId: person.celeb_id,
      profile: profile
        ? {
            slug: profile.slug,
            nickname: profile.nickname,
            tier: profile.celeb_tier,
            publicationStatus: profile.publication_status,
          }
        : null,
    }]
  })

  const fictionProfiles = profiles.filter((row) => row.celeb_tier === 'fiction')
  const fictionProfileIds = new Set(fictionProfiles.map((row) => row.id))
  const sourceRelationsToNonFiction = sourceRelations
    .filter((row) => !fictionProfileIds.has(row.celeb_id))
  const sourceWorksWithoutCharacters = sourceContents
    .filter((row) => (sourceRelationCountByContent[row.content_id] ?? 0) === 0)
    .map((row) => row.content_id)
  const sourceWorksMissingContent = sourceContents
    .filter((row) => !sourceContentById.has(row.content_id))
    .map((row) => row.content_id)
  const sourceWorksMissingKoLocale = sourceContents
    .filter((row) => !sourceLocaleKeys.has(`${row.content_id}:ko`))
    .map((row) => row.content_id)
  const sourceWorksMissingEnLocale = sourceContents
    .filter((row) => !sourceLocaleKeys.has(`${row.content_id}:en`))
    .map((row) => row.content_id)
  const linkedMythicalIds = new Set(
    mythicalPeople.flatMap((row) => row.celeb_id ? [row.celeb_id] : []),
  )
  const fictionNotInMythicalFaction = fictionProfiles
    .filter((row) => !linkedMythicalIds.has(row.id))
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      nickname: row.nickname,
      publicationStatus: row.publication_status,
      hasAvatar: Boolean(row.avatar_url),
      sourceCount: sourceCountByCeleb[row.id] ?? 0,
    }))

  const linkedProfiles = unique(
    mythicalPeople.flatMap((row) => row.celeb_id ? [row.celeb_id] : []),
  ).flatMap((id) => {
    const profile = profileById.get(id)
    return profile ? [profile] : []
  })
  const dataOnlyProfiles = linkedProfiles
    .filter((row) => !row.avatar_url)
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      nickname: row.nickname,
      publicationStatus: row.publication_status,
      hasMonologue: Boolean(row.virtual_monologue),
      sourceCount: sourceCountByCeleb[row.id] ?? 0,
    }))
  const withoutSource = linkedProfiles
    .filter((row) => (sourceCountByCeleb[row.id] ?? 0) === 0)
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      nickname: row.nickname,
      publicationStatus: row.publication_status,
      hasAvatar: Boolean(row.avatar_url),
    }))

  const nullTagGroups = groups
    .filter((row) => !row.tag_id)
    .map((row) => ({
      episode: episodeById.get(row.episode_id)?.folder ?? '(orphan)',
      position: row.position,
      name: row.name,
    }))
  const linkedTagGroups = groups
    .filter((row) => row.tag_id)
    .map((row) => ({
      episode: episodeById.get(row.episode_id)?.folder ?? '(orphan)',
      position: row.position,
      name: row.name,
      tag: tagById.get(row.tag_id!)?.slug ?? row.tag_id!,
    }))
  const mythicalGroupIds = new Set(
    mythicalPeople.flatMap((person) => {
      const cluster = clusterById.get(person.cluster_id)
      return cluster ? [cluster.group_id] : []
    }),
  )
  const mythicalTagRows = unique(
    groups
      .filter((group) => mythicalGroupIds.has(group.id) && group.tag_id)
      .map((group) => group.tag_id!),
  ).flatMap((tagId) => {
    const tag = tagById.get(tagId)
    return tag ? [tag] : []
  })
  const mythicalTagsNotMarkedFiction = mythicalTagRows
    .filter((tag) => !tag.is_fiction)
    .map((tag) => ({ id: tag.id, slug: tag.slug, name: tag.name }))
  const assignmentKeys = new Set(assignments.map((row) => `${row.tag_id}:${row.celeb_id}`))
  const missingAssignments = mythicalPeople.flatMap((person) => {
    if (!person.celeb_id) return []
    const cluster = clusterById.get(person.cluster_id)
    const group = cluster ? groupById.get(cluster.group_id) : undefined
    if (!group?.tag_id || assignmentKeys.has(`${group.tag_id}:${person.celeb_id}`)) return []
    return [{
      episode: episodeById.get(group.episode_id)?.folder ?? '(orphan)',
      groupPosition: group.position,
      tag: tagById.get(group.tag_id)?.slug ?? group.tag_id,
      slug: person.slug,
      name: person.name,
    }]
  })

  const rootFolders = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => entry.name)
    .sort()
  const dbFolders = episodes.map((row) => row.folder).sort()
  const dbFolderSet = new Set(dbFolders)
  const rootFolderSet = new Set(rootFolders)
  const rootWithoutDb = rootFolders.filter((folder) => !dbFolderSet.has(folder))
  const dbWithoutRoot = dbFolders.filter((folder) => !rootFolderSet.has(folder))
  const rootWithoutExport = rootFolders.filter(
    (folder) => !existsSync(path.join(root, folder, 'faction-data.json')),
  )

  const localMythical: Array<{
    episode: string
    name: string | null
    nameEn: string | null
    slug: string | null
  }> = []
  const localJsonErrors: Array<{ file: string; error: string }> = []
  for (const folder of rootFolders) {
    const file = path.join(root, folder, 'faction-data.json')
    if (!existsSync(file)) continue
    try {
      const json = JSON.parse(readFileSync(file, 'utf8')) as unknown
      for (const person of collectJsonPeople(json)) {
        if (person.mythical !== true) continue
        localMythical.push({
          episode: folder,
          name: asString(person.name),
          nameEn: asString(person.nameEn),
          slug: asString(person.slug),
        })
      }
    } catch (error) {
      localJsonErrors.push({
        file: path.relative(root, file),
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const ideaFiles = walkFiles(ideaBank)
  const ideaDataFiles = ideaFiles
    .filter((file) => /\.json$/i.test(file))
    .map((file) => path.relative(root, file).replaceAll('\\', '/'))
    .sort()
  const ideaAssetFiles = ideaFiles
    .filter((file) => /\.(png|jpe?g|webp|gif|mp3|wav|m4a|mp4|mov)$/i.test(file))
    .map((file) => path.relative(root, file).replaceAll('\\', '/'))
    .sort()
  const ideaJsonPeople: Array<{
    file: string
    name: string | null
    nameEn: string | null
    slug: string | null
    mythical: boolean
  }> = []
  const ideaJsonErrors: Array<{ file: string; error: string }> = []
  for (const relative of ideaDataFiles) {
    const file = path.join(root, relative)
    try {
      const json = JSON.parse(readFileSync(file, 'utf8')) as unknown
      for (const person of collectJsonPeople(json)) {
        ideaJsonPeople.push({
          file: relative,
          name: asString(person.name),
          nameEn: asString(person.nameEn),
          slug: asString(person.slug),
          mythical: person.mythical === true,
        })
      }
    } catch (error) {
      ideaJsonErrors.push({
        file: relative,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const localMythicalKeys = new Set(localMythical.map((row) => `${row.episode}:${row.slug}`))
  const dbMythicalKeys = new Set(
    mythicalPeople.map((row) => `${personEpisode(row)?.folder ?? '(orphan)'}:${row.slug}`),
  )

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      dbEpisodes: episodes.length,
      dbGroups: groups.length,
      dbClusters: clusters.length,
      dbPeoplePlacements: people.length,
      dbUniquePersonSlugs: unique(people.flatMap((row) => row.slug ? [row.slug] : [])).length,
      rootFolders: rootFolders.length,
      mythicalEpisodes: mythicalEpisodeFolders.length,
      mythicalPlacements: mythicalPeople.length,
      mythicalUniqueSlugs: mythicalSlugs.length,
      fictionPlacementsMissingMythical: fictionPlacementsMissingMythical.length,
      fictionProfiles: fictionProfiles.length,
      linkedMythicalProfiles: linkedProfiles.length,
      sourceWorks: sourceContents.length,
      sourceRelations: sourceRelations.length,
      sourceLinkedMythicalProfiles: linkedProfiles.length - withoutSource.length,
      sourceWorksWithoutCharacters: sourceWorksWithoutCharacters.length,
      sourceWorksMissingContent: sourceWorksMissingContent.length,
      sourceWorksMissingKoLocale: sourceWorksMissingKoLocale.length,
      sourceWorksMissingEnLocale: sourceWorksMissingEnLocale.length,
      sourceRelationsToNonFiction: sourceRelationsToNonFiction.length,
      mythicalTags: mythicalTagRows.length,
      mythicalTagsNotMarkedFiction: mythicalTagsNotMarkedFiction.length,
      groupsWithoutTag: nullTagGroups.length,
      missingAssignments: missingAssignments.length,
    },
    episodeStatus: countBy(episodes, (row) => `${row.registered ? 'registered' : 'unregistered'}:${row.status}`),
    mythicalEpisodeFolders,
    mythicalDuplicateSlugs,
    fictionPlacementsMissingMythical,
    unresolved,
    wrongTier,
    dataOnlyProfiles,
    linkedProfilesWithoutSource: withoutSource,
    sourceIntegrity: {
      worksWithoutCharacters: sourceWorksWithoutCharacters,
      worksMissingContent: sourceWorksMissingContent,
      worksMissingKoLocale: sourceWorksMissingKoLocale,
      worksMissingEnLocale: sourceWorksMissingEnLocale,
      relationsToNonFiction: sourceRelationsToNonFiction,
    },
    fictionProfilesNotInMythicalFaction: fictionNotInMythicalFaction,
    groupsWithoutTag: nullTagGroups,
    linkedTagGroups,
    mythicalTagsNotMarkedFiction,
    missingAssignments,
    filesystem: {
      rootWithoutDb,
      dbWithoutRoot,
      rootWithoutExport,
      localMythicalPlacements: localMythical.length,
      localMythicalUniqueSlugs: unique(localMythical.flatMap((row) => row.slug ? [row.slug] : [])).length,
      localMythicalMissingInDb: localMythical.filter(
        (row) => !dbMythicalKeys.has(`${row.episode}:${row.slug}`),
      ),
      dbMythicalMissingInLocal: mythicalPeople.flatMap((row) => {
        const episode = personEpisode(row)?.folder ?? '(orphan)'
        return localMythicalKeys.has(`${episode}:${row.slug}`)
          ? []
          : [{ episode, name: row.name, nameEn: row.name_en, slug: row.slug }]
      }),
      localJsonErrors,
      ideaBank: {
        dataFiles: ideaDataFiles,
        assetFiles: ideaAssetFiles,
        jsonPeople: ideaJsonPeople,
        jsonErrors: ideaJsonErrors,
      },
    },
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(JSON.stringify(report.totals, null, 2))
  console.log(`\nMYTHICAL EPISODES (${mythicalEpisodeFolders.length})`)
  console.log(mythicalEpisodeFolders.join('\n'))
  console.log(`\nUNRESOLVED (${unresolved.length})`)
  console.log(unresolved)
  console.log(`\nWRONG TIER (${wrongTier.length})`)
  console.log(wrongTier)
  console.log(`\nLINKED WITHOUT SOURCE (${withoutSource.length})`)
  console.log(withoutSource)
  console.log(`\nGROUPS WITHOUT TAG (${nullTagGroups.length})`)
  console.log(nullTagGroups)
  console.log(`\nMISSING ASSIGNMENTS (${missingAssignments.length})`)
  console.log(missingAssignments)
  console.log('\nFILESYSTEM')
  console.log(report.filesystem)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
