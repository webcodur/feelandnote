/**
 * 신화·전설·허구 팩션 인물을 대표 원전 contents에 연결한다.
 *
 * 원칙:
 * - 기존 contents 판본을 우선 사용한다.
 * - DB에 없는 책은 네이버 도서 또는 OpenLibrary만 사용한다(Google Books 금지).
 * - 한 작품의 관리 roster는 이 파일에서 전량 계산해 RPC로 원자 교체한다.
 * - 작품에 실제로 속하지 않는 일리아스의 멤논·펜테실레이아 등은 억지로 넣지 않는다.
 *
 * 실행:
 *   node --env-file=.env --import tsx scripts/sync-fiction-source-rosters.ts
 *   node --env-file=.env --import tsx scripts/sync-fiction-source-rosters.ts --apply
 */

import { createClient } from '@supabase/supabase-js'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { searchBooks } from '@feelandnote/content-search/naver-books'
import { revalidateWebCache } from '../src/lib/revalidate-web'

type DbError = { message: string } | null
type PageResult<T> = { data: T[] | null; error: DbError }

type EpisodeRow = { id: string; folder: string }
type GroupRow = { id: string; episode_id: string }
type ClusterRow = { id: string; group_id: string }
type PersonRow = {
  id: string
  cluster_id: string
  position: number
  slug: string | null
  celeb_id: string | null
  mythical: boolean
}
type ProfileRow = {
  id: string
  slug: string | null
  celeb_tier: string | null
  profile_type: string | null
  status: string | null
}
type ContentRow = {
  id: string
  external_source: string | null
  external_id: string | null
}

type NewNaverContent = {
  kind: 'naver'
  externalId: string
  query: string
  titleEn: string
  creatorEn: string
}

type NewOpenLibraryContent = {
  kind: 'openlibrary'
  externalId: string
  releaseDate: string
  titleKo: string
  titleEn: string
  creatorKo: string
  creatorEn: string
  publisher: string
  isbn: string | null
  thumbnailUrl: string | null
  descriptionKo: string
  descriptionEn: string
  sourceUrl: string
}

type ExistingContent = {
  kind: 'existing'
  contentId?: string
  externalSource?: string
  externalId?: string
}

type ContentSpec = ExistingContent | NewNaverContent | NewOpenLibraryContent

type WorkPlan = {
  key: string
  content: ContentSpec
  slugs: string[]
}

const apply = process.argv.includes('--apply')
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 필요합니다.')
}

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

function unique(values: string[]): string[] {
  return [...new Set(values)]
}

async function insertNaverContent(spec: NewNaverContent): Promise<string> {
  const search = await searchBooks(spec.query)
  const item = search.items.find((candidate) => candidate.externalId === spec.externalId)
  if (!item) {
    throw new Error(`${spec.query}: 네이버 후보 ${spec.externalId}를 찾지 못했습니다.`)
  }

  const id = crypto.randomUUID()
  const { error: contentError } = await db.from('contents').insert({
    id,
    type: 'BOOK',
    external_source: 'naver_book',
    external_id: item.externalId,
    release_date: item.metadata.publishDate || null,
    user_count: 0,
    metadata: {
      publisher: item.metadata.publisher,
      publishDate: item.metadata.publishDate,
      isbn: item.metadata.isbn,
      description: item.metadata.description,
      link: item.metadata.link,
    },
  })
  if (contentError) throw contentError

  try {
    const { error: localesError } = await db.from('content_locales').insert([
      {
        content_id: id,
        locale: 'ko',
        title: item.title,
        creator: item.creator,
        isbn: item.metadata.isbn || null,
        thumbnail_url: item.coverImageUrl,
        publisher: item.metadata.publisher || null,
        description: item.metadata.description || null,
        verified: true,
        sources: {
          primary: 'naver_book',
          thumbnail: item.coverImageUrl ? 'naver_book' : 'confirmed_unavailable',
          url: item.metadata.link,
        },
      },
      {
        content_id: id,
        locale: 'en',
        title: spec.titleEn,
        creator: spec.creatorEn,
        isbn: item.metadata.isbn || null,
        thumbnail_url: item.coverImageUrl,
        publisher: item.metadata.publisher || null,
        description: null,
        verified: true,
        sources: {
          primary: 'manual_translation',
          thumbnail: item.coverImageUrl ? 'naver_book' : 'confirmed_unavailable',
          source_locale: 'ko',
          url: item.metadata.link,
        },
      },
    ])
    if (localesError) throw localesError
  } catch (error) {
    await db.from('contents').delete().eq('id', id)
    throw error
  }
  return id
}

async function insertOpenLibraryContent(spec: NewOpenLibraryContent): Promise<string> {
  const id = crypto.randomUUID()
  const { error: contentError } = await db.from('contents').insert({
    id,
    type: 'BOOK',
    external_source: 'openlibrary',
    external_id: spec.externalId,
    release_date: spec.releaseDate,
    user_count: 0,
    metadata: {
      publisher: spec.publisher,
      isbn: spec.isbn,
      sourceUrl: spec.sourceUrl,
    },
  })
  if (contentError) throw contentError

  try {
    const sharedSource = {
      primary: 'openlibrary',
      thumbnail: spec.thumbnailUrl ? 'openlibrary' : 'confirmed_unavailable',
      url: spec.sourceUrl,
    }
    const { error: localesError } = await db.from('content_locales').insert([
      {
        content_id: id,
        locale: 'ko',
        title: spec.titleKo,
        creator: spec.creatorKo,
        isbn: spec.isbn,
        thumbnail_url: spec.thumbnailUrl,
        publisher: spec.publisher,
        description: spec.descriptionKo,
        verified: true,
        sources: { ...sharedSource, localized_metadata: true },
      },
      {
        content_id: id,
        locale: 'en',
        title: spec.titleEn,
        creator: spec.creatorEn,
        isbn: spec.isbn,
        thumbnail_url: spec.thumbnailUrl,
        publisher: spec.publisher,
        description: spec.descriptionEn,
        verified: true,
        sources: sharedSource,
      },
    ])
    if (localesError) throw localesError
  } catch (error) {
    await db.from('contents').delete().eq('id', id)
    throw error
  }
  return id
}

async function main() {
  const episodes = await allRows<EpisodeRow>('faction_episodes', async (from, to) => {
    const { data, error } = await db.from('faction_episodes')
      .select('id,folder').order('id').range(from, to)
    return { data: data as EpisodeRow[] | null, error }
  })
  const groups = await allRows<GroupRow>('faction_groups', async (from, to) => {
    const { data, error } = await db.from('faction_groups')
      .select('id,episode_id').order('id').range(from, to)
    return { data: data as GroupRow[] | null, error }
  })
  const clusters = await allRows<ClusterRow>('faction_clusters', async (from, to) => {
    const { data, error } = await db.from('faction_clusters')
      .select('id,group_id').order('id').range(from, to)
    return { data: data as ClusterRow[] | null, error }
  })
  const people = await allRows<PersonRow>('faction_people', async (from, to) => {
    const { data, error } = await db.from('faction_people')
      .select('id,cluster_id,position,slug,celeb_id,mythical')
      .order('id').range(from, to)
    return { data: data as unknown as PersonRow[] | null, error }
  })
  const profiles = await allRows<ProfileRow>('profiles', async (from, to) => {
    const { data, error } = await db.from('profiles')
      .select('id,slug,celeb_tier,profile_type,status')
      .eq('profile_type', 'CELEB')
      .order('id').range(from, to)
    return { data: data as unknown as ProfileRow[] | null, error }
  })
  const contents = await allRows<ContentRow>('contents', async (from, to) => {
    const { data, error } = await db.from('contents')
      .select('id,external_source,external_id')
      .order('id').range(from, to)
    return { data: data as ContentRow[] | null, error }
  })

  const episodeById = new Map(episodes.map((row) => [row.id, row]))
  const groupById = new Map(groups.map((row) => [row.id, row]))
  const clusterById = new Map(clusters.map((row) => [row.id, row]))
  const profileBySlug = new Map(
    profiles.flatMap((row) => row.slug ? [[row.slug, row] as const] : []),
  )
  const contentByExternal = new Map(
    contents.flatMap((row) => row.external_source && row.external_id
      ? [[`${row.external_source}:${row.external_id}`, row] as const]
      : []),
  )
  const contentById = new Map(contents.map((row) => [row.id, row]))

  const slugsByEpisode = new Map<string, string[]>()
  for (const person of people.filter((row) => row.mythical)) {
    const cluster = clusterById.get(person.cluster_id)
    const group = cluster ? groupById.get(cluster.group_id) : undefined
    const episode = group ? episodeById.get(group.episode_id) : undefined
    if (!episode || !person.slug) continue
    slugsByEpisode.set(
      episode.folder,
      [...(slugsByEpisode.get(episode.folder) ?? []), person.slug],
    )
  }
  for (const [folder, slugs] of slugsByEpisode) {
    slugsByEpisode.set(folder, unique(slugs))
  }
  const episodeSlugs = (folder: string): string[] => {
    const slugs = slugsByEpisode.get(folder)
    if (!slugs?.length) throw new Error(`${folder}: mythical roster가 없습니다.`)
    return slugs
  }

  const plans: WorkPlan[] = [
    {
      key: 'iliad',
      content: { kind: 'existing', externalSource: 'naver_book', externalId: '9788991290167' },
      slugs: [
        'agamemnon', 'menelaus', 'nestor', 'achilles', 'patroclus',
        'ajax-the-great', 'diomedes', 'ajax-the-lesser', 'odysseus',
        'hector', 'paris', 'priam', 'cassandra', 'helen', 'sarpedon',
        'aeneas', 'zeus', 'hera', 'poseidon', 'athena', 'apollo',
        'ares', 'aphrodite', 'hermes',
      ],
    },
    {
      key: 'odyssey',
      content: { kind: 'existing', externalSource: 'naver_book', externalId: '9788961673747' },
      slugs: unique([
        ...episodeSlugs('Homer-Odyssey'),
        'athena', 'zeus', 'poseidon', 'hermes',
      ]),
    },
    {
      key: 'theogony',
      content: { kind: 'existing', externalSource: 'naver_book', externalId: '9788937480515' },
      slugs: episodeSlugs('Gods-Greek'),
    },
    {
      key: 'aeneid',
      content: { kind: 'existing', externalSource: 'naver_book', externalId: '9788952237309' },
      slugs: unique([...episodeSlugs('virgil-aeneid'), 'sinon']),
    },
    {
      key: 'oresteia',
      content: { kind: 'existing', contentId: 'ff0392c6-49b3-4cd4-ba03-7c1c0ec83014' },
      slugs: episodeSlugs('house-of-atreus'),
    },
    {
      key: 'argonautica',
      content: {
        kind: 'naver',
        externalId: '9788992132114',
        query: '아르고호 이야기',
        titleEn: 'Argonautica',
        creatorEn: 'Apollonius of Rhodes',
      },
      slugs: episodeSlugs('argonauts'),
    },
    {
      key: 'bibliotheca-heracles',
      content: {
        kind: 'naver',
        externalId: '9788991290006',
        query: '아폴로도로스 원전으로 읽는 그리스 신화',
        titleEn: 'The Library of Greek Mythology',
        creatorEn: 'Pseudo-Apollodorus',
      },
      slugs: episodeSlugs('heracles'),
    },
    {
      key: 'prose-edda',
      content: { kind: 'existing', contentId: '01e7bad5-4e39-461a-aea9-7aecc40baf74' },
      slugs: episodeSlugs('myth-norse'),
    },
    {
      key: 'egyptian-book-of-the-dead',
      content: {
        kind: 'naver',
        externalId: '9788982812118',
        query: '이집트 사자의 서',
        titleEn: 'The Egyptian Book of the Dead',
        creatorEn: 'Anonymous',
      },
      slugs: episodeSlugs('myth-egypt'),
    },
    {
      key: 'journey-to-the-west',
      content: { kind: 'existing', contentId: '02db5067-3541-406c-a0d2-2641fddc2bb7' },
      slugs: episodeSlugs('myth-china-xiyou'),
    },
    {
      key: 'investiture-of-the-gods',
      content: {
        kind: 'naver',
        externalId: '9788957321058',
        query: '봉신연의',
        titleEn: 'Investiture of the Gods',
        creatorEn: 'Xu Zhonglin',
      },
      slugs: episodeSlugs('myth-china-fengshen'),
    },
    {
      key: 'ramayana',
      content: { kind: 'existing', contentId: 'aed16cb6-be49-4234-925a-651e4d3c55d7' },
      slugs: episodeSlugs('myth-hindu-ramayana'),
    },
    {
      key: 'mahabharata',
      content: { kind: 'existing', contentId: '1ca908d5-f3c1-4f97-afb5-3cb8fcb880c7' },
      // 《마하바라타》에는 시바와 브라흐마도 신적 행위자로 직접 등장한다.
      slugs: unique([...episodeSlugs('myth-hindu-mahabharata'), 'shiva', 'brahma']),
    },
    {
      key: 'kojiki',
      content: {
        kind: 'naver',
        externalId: '9791130455402',
        query: '고사기',
        titleEn: 'Kojiki',
        creatorEn: 'Ō no Yasumaro',
      },
      slugs: episodeSlugs('myth-japan'),
    },
    {
      key: 'samguk-yusa',
      content: { kind: 'existing', contentId: '79334378-a390-40bb-9dd9-025c41eed94f' },
      slugs: ['dangun', 'hwanin', 'hwanung', 'ungnyeo', 'tiger-korea'],
    },
    {
      key: 'dongmyeongwangpyeon',
      content: { kind: 'existing', contentId: 'ac9f1d4e-f76b-4c27-8570-7657483f1a5a' },
      slugs: ['jumong', 'yuhwa', 'haemosu', 'geumwa'],
    },
    {
      key: 'samguk-sagi',
      content: { kind: 'existing', contentId: '467d387e-c688-43b0-8570-01df791de22b' },
      slugs: ['jumong', 'soseono'],
    },
    {
      key: 'epic-of-gilgamesh',
      content: { kind: 'existing', contentId: '020eb69c-4f27-4f8e-a1b1-a35ddf26a66b' },
      slugs: ['gilgamesh', 'enkidu', 'shamhat', 'humbaba', 'ishtar', 'siduri', 'utnapishtim'],
    },
    {
      key: 'enuma-elish',
      content: {
        kind: 'openlibrary',
        externalId: 'OL51041680M',
        releaseDate: '2024-01-01',
        titleKo: '에누마 엘리시',
        titleEn: 'Enuma Elish: The Babylonian Epic of Creation',
        creatorKo: '작자 미상',
        creatorEn: 'Anonymous',
        publisher: 'Bloomsbury Publishing',
        isbn: '9781350297166',
        thumbnailUrl: null,
        descriptionKo: '바빌론의 주신 마르두크가 티아마트를 물리치고 세계의 질서를 세우는 아카드어 창세 서사시.',
        descriptionEn: 'The Babylonian creation epic in which Marduk defeats Tiamat and establishes the order of the cosmos.',
        sourceUrl: 'https://openlibrary.org/books/OL51041680M',
      },
      slugs: ['apsu', 'ea', 'marduk', 'tiamat'],
    },
    {
      key: 'le-morte-darthur',
      content: {
        kind: 'openlibrary',
        externalId: 'OL6633760M',
        releaseDate: '1920-01-01',
        titleKo: '아서 왕의 죽음',
        titleEn: "Le Morte d'Arthur",
        creatorKo: '토머스 말로리',
        creatorEn: 'Thomas Malory',
        publisher: 'Medici Society',
        isbn: null,
        thumbnailUrl: 'https://covers.openlibrary.org/b/id/9605616-L.jpg',
        descriptionKo: '아서 왕의 탄생부터 원탁의 기사, 성배 탐색, 카멜롯의 붕괴까지 집대성한 중세 영문 기사도 서사.',
        descriptionEn: 'Thomas Malory’s compilation of the Arthurian story, from Arthur’s rise through the Round Table, the Grail quest, and Camelot’s fall.',
        sourceUrl: 'https://openlibrary.org/books/OL6633760M',
      },
      slugs: episodeSlugs('arthur-round-table'),
    },
  ]

  const managedSlugs = unique(plans.flatMap((plan) => plan.slugs))
  const missingProfiles = managedSlugs.filter((slug) => {
    const profile = profileBySlug.get(slug)
    return !profile
      || profile.profile_type !== 'CELEB'
      || profile.celeb_tier !== 'fiction'
      || profile.status !== 'active'
  })
  if (missingProfiles.length) {
    throw new Error(`원전 roster fiction 프로필 해소 실패: ${missingProfiles.join(', ')}`)
  }

  const resolvedPlans = plans.map((plan) => {
    const spec = plan.content
    let existing: ContentRow | undefined
    if (spec.kind === 'existing') {
      existing = spec.contentId
        ? contentById.get(spec.contentId)
        : contentByExternal.get(`${spec.externalSource}:${spec.externalId}`)
      if (!existing) throw new Error(`${plan.key}: 기존 콘텐츠를 찾지 못했습니다.`)
    } else {
      existing = contentByExternal.get(`${spec.kind === 'naver' ? 'naver_book' : 'openlibrary'}:${spec.externalId}`)
    }
    return { ...plan, existingContentId: existing?.id ?? null }
  })

  const coveredSlugs = new Set(managedSlugs)
  const allFactionSlugs = unique(
    [...slugsByEpisode.values()].flat(),
  )
  const uncoveredFactionSlugs = allFactionSlugs.filter((slug) => !coveredSlugs.has(slug)).sort()

  console.log(JSON.stringify({
    mode: apply ? 'APPLY' : 'DRY-RUN',
    works: resolvedPlans.length,
    existingContents: resolvedPlans.filter((plan) => plan.existingContentId).length,
    createContents: resolvedPlans.filter((plan) => !plan.existingContentId).map((plan) => ({
      work: plan.key,
      source: plan.content.kind,
      externalId: plan.content.kind === 'existing' ? null : plan.content.externalId,
    })),
    uniqueCoveredFactionProfiles: coveredSlugs.size,
    uncoveredFactionSlugs,
    rosters: resolvedPlans.map((plan) => ({
      work: plan.key,
      contentId: plan.existingContentId,
      count: plan.slugs.length,
      slugs: plan.slugs,
    })),
  }, null, 2))

  if (!apply) return

  const contentIdByWork = new Map<string, string>()
  for (const plan of resolvedPlans) {
    if (plan.existingContentId) {
      contentIdByWork.set(plan.key, plan.existingContentId)
      continue
    }
    if (plan.content.kind === 'existing') {
      throw new Error(`${plan.key}: 기존 콘텐츠 해소 실패`)
    }
    const contentId = plan.content.kind === 'naver'
      ? await insertNaverContent(plan.content)
      : await insertOpenLibraryContent(plan.content)
    contentIdByWork.set(plan.key, contentId)
    console.log(`[CONTENT] ${plan.key}: ${contentId}`)
  }

  let relations = 0
  for (const plan of resolvedPlans) {
    const contentId = contentIdByWork.get(plan.key)
    if (!contentId) throw new Error(`${plan.key}: content id 누락`)
    const celebIds = plan.slugs.map((slug) => profileBySlug.get(slug)!.id)
    const { error } = await db.rpc('set_fiction_source_characters', {
      p_content_id: contentId,
      p_celeb_ids: celebIds,
    })
    if (error) throw new Error(`${plan.key}: 원전 roster 저장 실패: ${error.message}`)
    relations += celebIds.length
    console.log(`[ROSTER] ${plan.key}: ${celebIds.length}`)
  }

  console.log(JSON.stringify({
    applied: true,
    works: resolvedPlans.length,
    relationRowsAcrossWorks: relations,
    uniqueCoveredFactionProfiles: coveredSlugs.size,
    uncoveredFactionSlugs,
  }, null, 2))

  // 기존 배포본도 먼저 확실히 비운다. FICTION_SOURCES는 이 기능 배포 전 서버에서는
  // 아직 허용 태그가 아니어서 400이 날 수 있으므로 별도 요청으로 보낸다.
  await revalidateWebCache([CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS])
  await revalidateWebCache(CACHE_TAGS.FICTION_SOURCES)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
