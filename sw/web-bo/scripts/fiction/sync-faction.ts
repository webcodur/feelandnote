/**
 * 팩션 DB의 mythical 인물을 검색 가능한 fiction 프로필로 만들고 연결한다.
 *
 * 목표:
 * - 얼굴이 없어도 기본 프로필을 만든다. avatar_url은 null 그대로 둔다.
 * - 근거를 검토하지 않은 장문 독백을 대량 생성하지 않는다. virtual_monologue는 비워 둔다.
 * - 작품별 임시 slug로 같은 인물을 중복 생성하지 않고 canonical slug로 통합한다.
 * - faction_people.slug와 celeb_id를 함께 고쳐 이후 DB 재저장/로컬 재수입에도 연결이 유지된다.
 * - 미출간 신화 편은 편 단위 tagSlug를 faction_groups.data에 넣는다.
 *
 * 기본은 dry-run:
 *   node --env-file=.env --import tsx scripts/sync-faction-fiction-data.ts
 *   node --env-file=.env --import tsx scripts/sync-faction-fiction-data.ts --apply
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type Row = Record<string, unknown>
type DbError = { message: string } | null
type PageResult<T> = { data: T[] | null; error: DbError }

type EpisodeRow = {
  id: string
  folder: string
}

type GroupRow = {
  id: string
  episode_id: string
  position: number
  tag_id: string | null
  data: Row | null
}

type ClusterRow = {
  id: string
  group_id: string
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
  lines: string[] | null
  lines_en: string[] | null
}

type ProfileRow = {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  celeb_tier: string | null
  publication_status: string | null
}

type TagRow = {
  id: string
  slug: string | null
}

type EpisodeMeta = {
  title: string
  titleEn: string
  bioSource: string
  bioSourceEn: string
  nationality: string | null
}

const EPISODE_META: Record<string, EpisodeMeta> = {
  'Gods-Greek': {
    title: '그리스 신화',
    titleEn: 'Greek myth',
    bioSource: '그리스 신화',
    bioSourceEn: 'Greek mythology',
    nationality: 'GR',
  },
  'Homer-Iliad': {
    title: '호메로스 서사',
    titleEn: 'Homeric epic',
    bioSource: '《일리아스》와 트로이 전쟁 전승',
    bioSourceEn: 'the Iliad and the Trojan War tradition',
    nationality: 'GR',
  },
  'Homer-Odyssey': {
    title: '호메로스 서사',
    titleEn: 'Homeric epic',
    bioSource: '《오디세이아》',
    bioSourceEn: 'the Odyssey',
    nationality: 'GR',
  },
  argonauts: {
    title: '그리스 신화',
    titleEn: 'Greek myth',
    bioSource: '아르고호 원정 전승',
    bioSourceEn: 'the Argonautic tradition',
    nationality: 'GR',
  },
  'arthur-round-table': {
    title: '아서 전설',
    titleEn: 'Arthurian legend',
    bioSource: '아서 왕과 원탁의 기사 전승',
    bioSourceEn: 'Arthurian legend',
    nationality: 'GB',
  },
  heracles: {
    title: '그리스 신화',
    titleEn: 'Greek myth',
    bioSource: '헤라클레스 전승',
    bioSourceEn: 'the Heracles tradition',
    nationality: 'GR',
  },
  'house-of-atreus': {
    title: '그리스 비극',
    titleEn: 'Greek tragedy',
    bioSource: '아트레우스 가문 비극',
    bioSourceEn: 'the tragedies of the House of Atreus',
    nationality: 'GR',
  },
  'myth-china-fengshen': {
    title: '봉신연의 인물',
    titleEn: 'Investiture figure',
    bioSource: '《봉신연의》',
    bioSourceEn: 'Investiture of the Gods',
    nationality: 'CN',
  },
  'myth-china-xiyou': {
    title: '서유기 인물',
    titleEn: 'Journey figure',
    bioSource: '《서유기》',
    bioSourceEn: 'Journey to the West',
    nationality: 'CN',
  },
  'myth-egypt': {
    title: '이집트 신화',
    titleEn: 'Egyptian myth',
    bioSource: '고대 이집트 신화',
    bioSourceEn: 'ancient Egyptian mythology',
    nationality: 'EG',
  },
  'myth-hindu-mahabharata': {
    title: '인도 서사시',
    titleEn: 'Indian epic',
    bioSource: '《마하바라타》',
    bioSourceEn: 'the Mahabharata',
    nationality: 'IN',
  },
  'myth-hindu-ramayana': {
    title: '인도 서사시',
    titleEn: 'Indian epic',
    bioSource: '《라마야나》',
    bioSourceEn: 'the Ramayana',
    nationality: 'IN',
  },
  'myth-japan': {
    title: '일본 신화',
    titleEn: 'Japanese myth',
    bioSource: '일본 신화와 고대 전승',
    bioSourceEn: 'Japanese mythology and early tradition',
    nationality: 'JP',
  },
  'myth-korea': {
    title: '한국 신화',
    titleEn: 'Korean myth',
    bioSource: '한국 건국 신화와 고대 전승',
    bioSourceEn: 'Korean foundation myths and early tradition',
    nationality: 'KR',
  },
  'myth-mesopotamia': {
    title: '고대 신화',
    titleEn: 'Ancient myth',
    bioSource: '메소포타미아 신화와 영웅 서사',
    bioSourceEn: 'Mesopotamian myth and heroic epic',
    nationality: 'IQ',
  },
  'myth-norse': {
    title: '북유럽 신화',
    titleEn: 'Norse myth',
    bioSource: '북유럽 신화와 게르만 영웅 전승',
    bioSourceEn: 'Norse myth and Germanic heroic tradition',
    nationality: 'NO',
  },
  'virgil-aeneid': {
    title: '로마 서사시',
    titleEn: 'Roman epic',
    bioSource: '베르길리우스의 《아이네이스》',
    bioSourceEn: "Virgil's Aeneid",
    nationality: 'IT',
  },
}

// 동일 클러스터에 같은 인물이 본명과 왕호로 두 번 들어간 옛 원고 결함.
// 주문왕 행을 남기고 희백 창(Ji Chang) 중복 행만 제거한다.
const DUPLICATE_PLACEMENTS = [
  { folder: 'myth-china-fengshen', nameEn: 'Ji Chang', canonicalSlug: 'king-wen' },
] as const

/**
 * 작품별 임시 slug → 서비스의 한 인물로 쓸 canonical slug.
 *
 * `diomedes-thrace`는 트로이 전쟁의 디오메데스와 다른 인물이므로 합치지 않는다.
 * `nimue`와 `lady-of-the-lake`도 전승마다 동일시 여부가 달라 별개로 둔다.
 */
const CANONICAL_SLUG: Record<string, string> = {
  'aphrodite-argonaut': 'aphrodite',
  'athena-argonaut': 'athena',
  'hera-argonaut': 'hera',
  'heracles-argonaut': 'heracles',
  'apollo-heracles': 'apollo',
  'athena-heracles': 'athena',
  'zeus-heracles': 'zeus',
  'apollo-oresteia': 'apollo',
  'athena-oresteia': 'athena',
  'cassandra-oresteia': 'cassandra',
  'ji-chang': 'king-wen',
  'nezha-fengshen': 'nezha',
  'taishang-laojun-fs': 'taishang-laojun',
  'yang-jian': 'erlang-shen',
  // 실존 당나라 장군 이정 프로필과 봉신연의의 탁탑천왕을 분리한다.
  'li-jing': 'li-jing-fengshen',
  // 트로이 전쟁의 디오메데스와 별개이며 영문 표시 이름을 그대로 slug에 반영한다.
  // 한국어 표시명도 DISPLAY_NAME에서 구분해 서비스 목록의 동명이인 오인을 막는다.
  'diomedes-thrace': 'diomedes-of-thrace',
}

const DISPLAY_NAME: Record<string, { ko?: string; en: string; slugSuffix?: string }> = {
  'diomedes-of-thrace': {
    ko: '트라키아의 디오메데스',
    en: 'Diomedes of Thrace',
  },
  'li-jing-fengshen': {
    ko: '이정 (봉신연의)',
    en: 'Li Jing',
    slugSuffix: 'fengshen',
  },
  'king-wen': { en: 'King Wen' },
  'king-wu': { en: 'King Wu' },
  'king-zhou': { en: 'King Zhou' },
  buddha: { en: 'Buddha' },
  harpies: { en: 'Harpies' },
  'gjukung-brothers': { en: 'Gjukung Brothers' },
  'tiger-korea': { en: 'Tiger', slugSuffix: 'korea' },
  dangun: { en: 'Dangun' },
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
}

const apply = process.argv.includes('--apply')
const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const PAGE = 1000

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

function canonicalSlug(slug: string): string {
  return CANONICAL_SLUG[slug] ?? slug
}

/**
 * celebs.slug generated column의 현행 규칙을 신규 데이터 검증에 필요한 범위로 재현한다.
 * 이 대상의 영문명은 ASCII라 diacritic translate 단계가 결과를 바꾸지 않는다.
 */
function expectedGeneratedSlug(nicknameEn: string, slugSuffix?: string): string {
  const base = nicknameEn.trim().toLocaleLowerCase('en').replaceAll(' ', '-')
  return `${base}${slugSuffix ? `-${slugSuffix}` : ''}`
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function cleanFragment(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/[一-鿿]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim()
}

function sentence(value: string, max: number): string {
  const cleaned = cleanFragment(value).replace(/[.。]+$/g, '')
  if (cleaned.length < max) return `${cleaned}.`
  return `${cleaned.slice(0, Math.max(1, max - 1)).trimEnd()}…`
}

function desiredProfile(person: PersonRow, folder: string, slug: string) {
  const meta = EPISODE_META[folder]
  if (!meta) throw new Error(`에피소드 기본 정보가 없습니다: ${folder}`)
  if (!person.name_en?.trim()) throw new Error(`${folder}/${person.name}: name_en이 없습니다.`)

  const koRoles = (person.lines ?? []).map(cleanFragment).filter(Boolean).slice(0, 2)
  const enRoles = (person.lines_en ?? []).map(cleanFragment).filter(Boolean).slice(0, 2)
  const bio = sentence(
    `${meta.bioSource}에 등장한다.${koRoles.length ? ` ${koRoles.join(', ')}.` : ''}`,
    100,
  )
  const bioEn = sentence(
    `A figure from ${meta.bioSourceEn}.${enRoles.length ? ` ${enRoles.join('; ')}.` : ''}`,
    220,
  )
  const display = DISPLAY_NAME[slug]
  const nicknameEn = display?.en ?? person.name_en.trim()

  return {
    nickname: display?.ko ?? person.name.trim(),
    nickname_en: nicknameEn,
    slug_suffix: display?.slugSuffix ?? null,
    profession: 'other',
    title: meta.title,
    title_en: meta.titleEn,
    nationality: meta.nationality,
    gender: null,
    birth_date: null,
    death_date: null,
    bio,
    bio_en: bioEn,
    celeb_tier: 'fiction',
    publication_status: 'active',
    is_verified: false,
    // 근거 검토를 거치지 않은 장문을 채우지 않는다.
    virtual_monologue: null,
    virtual_monologue_en: null,
  }
}

async function createDataOnlyProfile(
  client: SupabaseClient,
  person: PersonRow,
  folder: string,
  slug: string,
): Promise<ProfileRow> {
  // 인물은 로그인 계정을 갖지 않는다. 도메인 식별자만 직접 발급한다.
  const celebId = crypto.randomUUID()
  try {
    const { error: profileError } = await client
      .from('celebs')
      .insert({ id: celebId, ...desiredProfile(person, folder, slug) })
    if (profileError) throw profileError

    const [metrics, created] = await Promise.all([
      client.from('celeb_metrics').upsert({
        celeb_id: celebId,
        follower_count: 0,
        content_count: 0,
      }),
      client.from('celebs')
        .select('id,slug,nickname,nickname_en,celeb_tier,publication_status')
        .eq('id', celebId)
        .single(),
    ])
    if (metrics.error) throw metrics.error
    if (created.error) throw created.error
    if (created.data.slug !== slug) {
      throw new Error(`${person.name_en}: 생성 slug ${created.data.slug} !== ${slug}`)
    }
    return created.data as ProfileRow
  } catch (error) {
    const cleanup = await client.from('celebs').delete().eq('id', celebId)
    if (cleanup.error) {
      throw new AggregateError([error, cleanup.error], `${slug}: 생성 실패 뒤 celebs 정리도 실패`)
    }
    throw error
  }
}

async function main() {
  const episodes = await allRows<EpisodeRow>('faction_episodes', async (from, to) => {
    const { data, error } = await db.from('faction_episodes')
      .select('id,folder').order('id').range(from, to)
    return { data: data as EpisodeRow[] | null, error }
  })
  const groups = await allRows<GroupRow>('faction_groups', async (from, to) => {
    const { data, error } = await db.from('faction_groups')
      .select('id,episode_id,position,tag_id,data').order('id').range(from, to)
    return { data: data as unknown as GroupRow[] | null, error }
  })
  const clusters = await allRows<ClusterRow>('faction_clusters', async (from, to) => {
    const { data, error } = await db.from('faction_clusters')
      .select('id,group_id').order('id').range(from, to)
    return { data: data as ClusterRow[] | null, error }
  })
  const people = await allRows<PersonRow>('faction_people', async (from, to) => {
    const { data, error } = await db.from('faction_people')
      .select('id,cluster_id,position,name,name_en,slug,celeb_id,mythical,lines,lines_en')
      .order('id').range(from, to)
    return { data: data as unknown as PersonRow[] | null, error }
  })
  const profiles = await allRows<ProfileRow>('celebs', async (from, to) => {
    const { data, error } = await db.from('celebs')
      .select('id,slug,nickname,nickname_en,celeb_tier,publication_status')
      .order('id').range(from, to)
    return { data: data as unknown as ProfileRow[] | null, error }
  })
  const tags = await allRows<TagRow>('celeb_tags', async (from, to) => {
    const { data, error } = await db.from('celeb_tags')
      .select('id,slug').order('id').range(from, to)
    return { data: data as TagRow[] | null, error }
  })

  const episodeById = new Map(episodes.map((row) => [row.id, row]))
  const groupById = new Map(groups.map((row) => [row.id, row]))
  const clusterById = new Map(clusters.map((row) => [row.id, row]))
  const profileBySlug = new Map(
    profiles.flatMap((row) => row.slug ? [[row.slug, row] as const] : []),
  )
  const tagById = new Map(tags.map((row) => [row.id, row]))
  const episodeOf = (person: PersonRow): EpisodeRow | undefined => {
    const cluster = clusterById.get(person.cluster_id)
    const group = cluster ? groupById.get(cluster.group_id) : undefined
    return group ? episodeById.get(group.episode_id) : undefined
  }

  const duplicatePlacements = people.filter((person) => {
    const episode = episodeOf(person)
    return DUPLICATE_PLACEMENTS.some((duplicate) =>
      duplicate.folder === episode?.folder
      && duplicate.nameEn === person.name_en
      && duplicate.canonicalSlug === canonicalSlug(person.slug ?? ''),
    )
  })
  const duplicatePlacementIds = new Set(duplicatePlacements.map((person) => person.id))

  const mythical = people.filter((row) => {
    if (duplicatePlacementIds.has(row.id)) return false
    return row.mythical
  })
  const canonicalGroups = new Map<string, PersonRow[]>()
  for (const person of mythical) {
    if (!person.slug?.trim()) throw new Error(`mythical 인물 slug 누락: ${person.name} (${person.id})`)
    const canonical = canonicalSlug(person.slug)
    canonicalGroups.set(canonical, [...(canonicalGroups.get(canonical) ?? []), person])
  }

  const plannedCreates: Array<{ slug: string; person: PersonRow; folder: string }> = []
  const profileForCanonical = new Map<string, ProfileRow>()
  for (const [slug, variants] of canonicalGroups) {
    const existing = profileBySlug.get(slug)
    if (existing) {
      if (existing.celeb_tier !== 'fiction') {
        throw new Error(
          `${slug}: canonical slug가 fiction CELEB가 아닙니다. `
          + `(${existing.celeb_tier}, ${existing.nickname_en})`,
        )
      }
      profileForCanonical.set(slug, existing)
      continue
    }

    const representative = variants.find((row) => row.slug === slug) ?? variants[0]
    const episode = episodeOf(representative)
    if (!episode) throw new Error(`${slug}: 소속 에피소드를 찾지 못했습니다.`)
    if (!EPISODE_META[episode.folder]) {
      throw new Error(`${slug}: 대상 밖 에피소드 ${episode.folder}`)
    }
    plannedCreates.push({ slug, person: representative, folder: episode.folder })
  }

  const plannedDesired = plannedCreates.map((plan) => ({
    plan,
    desired: desiredProfile(plan.person, plan.folder, plan.slug),
  }))
  const seenEnglishNames = new Map<string, string>()
  const generatedSlugMismatches: string[] = []
  for (const { plan, desired } of plannedDesired) {
    if (desired.title.length > 8) {
      throw new Error(`${plan.slug}: title이 8자를 넘습니다: ${desired.title}`)
    }
    if (!desired.bio || desired.bio.length > 100) {
      throw new Error(`${plan.slug}: bio 길이 ${desired.bio.length}`)
    }
    if (/[一-鿿]/.test(`${desired.nickname}${desired.title}${desired.bio}`)) {
      throw new Error(`${plan.slug}: 기본 정보에 한자가 남았습니다.`)
    }
    const generatedSlug = expectedGeneratedSlug(
      desired.nickname_en,
      desired.slug_suffix ?? undefined,
    )
    if (generatedSlug !== plan.slug) {
      generatedSlugMismatches.push(
        `${plan.slug} <- ${desired.nickname_en}`
        + `${desired.slug_suffix ? ` + ${desired.slug_suffix}` : ''}: ${generatedSlug}`,
      )
    }
    const key = desired.nickname_en.toLocaleLowerCase('en')
    const duplicate = seenEnglishNames.get(key)
    if (duplicate) throw new Error(`${plan.slug}/${duplicate}: nickname_en 중복 ${desired.nickname_en}`)
    seenEnglishNames.set(key, plan.slug)
  }
  if (generatedSlugMismatches.length) {
    throw new Error(
      `nickname_en/slug_suffix 생성 slug 불일치 ${generatedSlugMismatches.length}건:\n`
      + generatedSlugMismatches.join('\n'),
    )
  }

  const personChanges = mythical.map((person) => {
    const originalSlug = person.slug!
    const slug = canonicalSlug(originalSlug)
    const profile = profileForCanonical.get(slug)
    return {
      person,
      originalSlug,
      slug,
      currentCelebId: person.celeb_id,
      desiredCelebId: profile?.id ?? null,
    }
  })
  const mythicalEpisodeIds = new Set(
    mythical.flatMap((person) => {
      const episode = episodeOf(person)
      return episode ? [episode.id] : []
    }),
  )
  const tagSlugChanges = groups.flatMap((group) => {
    if (!mythicalEpisodeIds.has(group.episode_id)) return []
    const episode = episodeById.get(group.episode_id)
    if (!episode || !EPISODE_META[episode.folder]) return []
    const current = typeof group.data?.tagSlug === 'string' ? group.data.tagSlug.trim() : ''
    if (current) return []
    const linkedTagSlug = group.tag_id ? tagById.get(group.tag_id)?.slug?.trim() : ''
    const tagSlug = linkedTagSlug || episode.folder.toLocaleLowerCase('en')
    return [{ group, folder: episode.folder, tagSlug }]
  })

  console.log(JSON.stringify({
    mode: apply ? 'APPLY' : 'DRY-RUN',
    mythicalPlacements: mythical.length,
    canonicalPeople: canonicalGroups.size,
    existingFictionProfiles: profileForCanonical.size,
    createProfiles: plannedCreates.length,
    removeDuplicatePlacements: duplicatePlacements.map((person) => ({
      episode: episodeOf(person)?.folder,
      id: person.id,
      name: person.name,
      nameEn: person.name_en,
      slug: person.slug,
    })),
    relinkPlacements: personChanges.filter((row) =>
      row.originalSlug !== row.slug
      || !row.currentCelebId
      || (row.desiredCelebId && row.currentCelebId !== row.desiredCelebId)
      || !row.person.mythical
    ).length,
    restoreMythicalFlags: personChanges.filter((row) => !row.person.mythical).length,
    canonicalSlugChanges: personChanges.filter((row) => row.originalSlug !== row.slug)
      .map((row) => ({
        episode: episodeOf(row.person)?.folder,
        name: row.person.name,
        from: row.originalSlug,
        to: row.slug,
      })),
    addEpisodeTagSlug: tagSlugChanges.length,
    episodeTagSlugs: Object.fromEntries(
      unique(tagSlugChanges.map((row) => row.folder)).map((folder) => [
        folder,
        tagSlugChanges.find((row) => row.folder === folder)!.tagSlug,
      ]),
    ),
    createSample: plannedCreates.slice(0, 20).map((row) => ({
      slug: row.slug,
      nickname: row.person.name,
      nicknameEn: row.person.name_en,
      episode: row.folder,
      profile: desiredProfile(row.person, row.folder, row.slug),
    })),
  }, null, 2))

  if (!apply) return

  for (const person of duplicatePlacements) {
    const { error } = await db.from('faction_people').delete().eq('id', person.id)
    if (error) {
      throw new Error(`faction_people 중복 제거 실패(${person.name}): ${error.message}`)
    }
  }

  let created = 0
  let nextCreate = 0
  const createWorker = async () => {
    while (true) {
      const index = nextCreate
      nextCreate += 1
      const plan = plannedCreates[index]
      if (!plan) return
      const profile = await createDataOnlyProfile(db, plan.person, plan.folder, plan.slug)
      profileForCanonical.set(plan.slug, profile)
      created += 1
      if (created % 20 === 0 || created === plannedCreates.length) {
        console.log(`[PROFILE] ${created}/${plannedCreates.length}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(5, plannedCreates.length) }, createWorker))

  let linked = 0
  for (const change of personChanges) {
    const profile = profileForCanonical.get(change.slug)
    if (!profile) throw new Error(`${change.slug}: 생성 후 프로필을 찾지 못했습니다.`)
    if (
      change.originalSlug === change.slug
      && change.currentCelebId === profile.id
      && change.person.mythical
    ) continue
    const { error } = await db.from('faction_people')
      .update({ slug: change.slug, celeb_id: profile.id, mythical: true })
      .eq('id', change.person.id)
    if (error) throw new Error(`faction_people 연결 실패(${change.person.name}): ${error.message}`)
    linked += 1
  }

  let tagged = 0
  for (const change of tagSlugChanges) {
    const { error } = await db.from('faction_groups')
      .update({ data: { ...(change.group.data ?? {}), tagSlug: change.tagSlug } })
      .eq('id', change.group.id)
    if (error) {
      throw new Error(
        `faction_groups tagSlug 실패(${change.folder} #${change.group.position}): ${error.message}`,
      )
    }
    tagged += 1
  }

  console.log(JSON.stringify({
    applied: true,
    profilesCreated: created,
    peopleRelinked: linked,
    groupsTagged: tagged,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
