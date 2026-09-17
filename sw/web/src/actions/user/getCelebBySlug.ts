'use server'
import { cache } from 'react'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { resolveCelebContentCount } from '@feelandnote/shared/constants/celeb-content-research'
import {
  CELEB_RELATION_TYPE_ORDER,
  type CelebRelationGroup,
} from '@feelandnote/shared/constants/celeb-relations'
import { cachedDetail, throwOnQueryError } from '@/lib/cache'
import { createAdminClient } from '@/lib/db/admin'
import { createStaticClient } from '@/lib/db/static'
import { type ActionResult, failure } from '@/lib/errors'
import { type PublicUserProfile, type CelebTier, type CelebReality } from './getUserProfile'
import { getTitleInfo } from '@/constants/titles'
import {
  DIALOGUE_PROFILE_SELECT,
  getDisplayDialogueQuote,
  type DialogueProfile,
} from '@/lib/utils/celeb-dialogues'
import { toFactionMusic, type FactionMusic } from '@/lib/faction-music'
import { mergeRelationRowsForViewer } from '@/lib/celeb/relationRows'

export interface ContentTypeCounts {
  BOOK: number
  VIDEO: number
  GAME: number
  MUSIC: number
}

const CONTENT_TYPES: Array<keyof ContentTypeCounts> = ['BOOK', 'VIDEO', 'GAME', 'MUSIC']

// 셀럽이 배정된 세력도감 세력(faction_lv2). 분류 헤더(lv1)는 배정이 0이라 여기 걸리지 않는다.
export interface FactionItem {
  id: string
  /** 신화 갈래 소속. 세력도감 명단은 신화를 싣지 않아 세력 탭 판단에서 뺀다 */
  isMyth: boolean
  name: string
  name_en: string | null
  slug: string
  color: string
  factionImageUrl: string | null
  description: string | null
  description_en: string | null
  roleShort: string | null
  roleShortEn: string | null
  roleLong: string | null
  roleLongEn: string | null
  /** 이 테마 구간에 흐르는 배경음악. 없으면 null */
  music: FactionMusic | null
}

interface FactionFactionAssignmentRow {
  lv2_id: string
  image_url: string | null
  sort_order: number | null
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  tag: {
    id: string
    name: string
    name_en: string | null
    slug: string | null
    color: string | null
    description: string | null
    description_en: string | null
    theme_music: unknown
    is_myth: boolean
  } | null
}

// 인물 관계망 한 줄 = "이 인물(target)이 페이지 주인에게 무엇인가"(relType).
// 방향 규약·수집은 sw/web-bo/scripts/sync-celeb-relations.ts (위키데이터 사실 관계만, 창작 없음)
export interface CelebRelationItem {
  relType: string
  relGroup: CelebRelationGroup
  id: string
  /** null이면 이동할 페이지가 없다 — 이름 노드로만 띄운다. 사유는 listed로 갈린다 */
  slug: string | null
  /** true=우리 명단에 등록된 인물(아직 공개 전일 수 있다), false=위키데이터에만 있는 명단 밖 인물 */
  listed: boolean
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  nationality: string | null
  birth_date: string | null
  death_date: string | null
  /** 명단 밖 인물의 위키데이터 항목 — 상세 카드에서 원본 연결에 쓴다 */
  qid: string | null
  /** 관계의 근거 한 줄(사건·시기). 수동 수록 라이벌·공동 창업에 있다 */
  note: string | null
  /** 근거 한 줄의 영문본. 캐시가 언어를 안 타므로 둘 다 내리고 화면에서 고른다 */
  note_en: string | null
}

interface CelebRelationRow {
  from_id: string
  to_id: string
  rel_type: string
  rel_group: CelebRelationGroup
  note: string | null
  note_en: string | null
  from: {
    id: string
    slug: string | null
    nickname: string | null
    nickname_en: string | null
    avatar_url: string | null
    profession: string | null
    nationality: string | null
    birth_date: string | null
    death_date: string | null
    publication_status: string | null
    wikidata_qid: string | null
  } | null
  to: {
    id: string
    slug: string | null
    nickname: string | null
    nickname_en: string | null
    avatar_url: string | null
    profession: string | null
    nationality: string | null
    birth_date: string | null
    death_date: string | null
    publication_status: string | null
    wikidata_qid: string | null
  } | null
}

interface PublicCelebBySlugData {
  profile: {
    id: string
    slug: string | null
    nickname: string | null
    nickname_en: string | null
    avatar_url: string | null
    bio: string | null
    bio_en: string | null
    profession: string | null
    title: string | null
    title_en: string | null
    headline: string | null
    headline_en: string | null
    nationality: string | null
    birth_date: string | null
    death_date: string | null
    is_verified: boolean | null
    created_at: string
    selected_title: string | null
    has_voice: boolean | null
    voice_v: number | null
    voice_speed: number | null
    wikidata_qid: string | null
    celeb_tier: string | null
    celeb_reality: string | null
    content_research_confirmed_empty_at: string | null
    view_count: number | null
    portrait_url: string | null
    portrait_caption: string | null
    portrait_caption_en: string | null
    virtual_monologue: string | null
    virtual_monologue_en: string | null
  }
  contentCount: number
  followerCount: number
  guestbookCount: number
  contentTypeCounts: ContentTypeCounts
  dialogue: DialogueProfile | null
  explanation: {
    plain_text: string
    plain_text_en: string | null
    interpretive_title: string
    interpretive_title_en: string | null
    interpretive_text: string
    interpretive_text_en: string | null
  } | null
  factions: FactionItem[]
  relations: CelebRelationItem[]
  /** 상단 대표 화보(PC 세로형). 전용 화보가 없으면 세력도감 화보를 끌어다 쓴다 */
  photoUrl: string | null
  /** 그 화보가 그린 순간을 적은 한 줄. 비어 있으면 화면에 아무것도 뜨지 않는다 */
  photoCaption: string | null
  photoCaptionEn: string | null
}

async function fetchCelebBySlugPublic(slug: string): Promise<PublicCelebBySlugData | null> {
  const db = createStaticClient()

  const { data: celeb, error: profileError } = await db
    .from('celebs')
    .select('id, slug, nickname, nickname_en, avatar_url, bio, bio_en, profession, title, title_en, headline, headline_en, nationality, birth_date, death_date, is_verified, created_at, has_voice, voice_v, voice_speed, wikidata_qid, celeb_tier, celeb_reality, content_research_confirmed_empty_at, view_count, portrait_url, portrait_caption, portrait_caption_en, virtual_monologue, virtual_monologue_en')
    .eq('slug', slug)
    .eq('publication_status', 'active')
    .maybeSingle()

  throwOnQueryError('getCelebBySlug/profile', profileError)
  if (!celeb) return null

  const profile = { ...celeb, selected_title: null }

  const celebId = profile.id as string
  // 공개 RLS는 비활성 상대의 embedded profile을 null로 만든다. 인물 상세에 진입 가능한
  // active 주인공을 확인한 뒤, 관계 카드에 허용한 필드만 서버에서 읽어 이름 노드로 남긴다.
  const relationDb = createAdminClient()

  // 카운트 쿼리는 head:true count:'exact' 로 row 송출 0, 타입별 카운트는 RPC 1회로 수신
  const [
    contentCountResult,
    followerResult,
    guestbookResult,
    dialogueResult,
    typeCountsResult,
    factionFactionRows,
    outgoingRelationsResult,
    incomingRelationsResult,
    externalRelationsResult,
    explanationResult,
  ] = await Promise.all([
    db
      .from('celeb_contents')
      .select('*', { count: 'exact', head: true })
      .eq('celeb_id', celebId),
    db
      .from('member_celeb_follows')
      .select('*', { count: 'exact', head: true })
      .eq('celeb_id', celebId),
    db
      .from('celeb_guestbook_entries')
      .select('*', { count: 'exact', head: true })
      .eq('celeb_id', celebId),
    db
      .from('celeb_dialogues')
      .select(DIALOGUE_PROFILE_SELECT)
      .eq('celeb_id', celebId)
      .maybeSingle(),
    db.rpc('get_celeb_type_counts', { p_celeb_id: celebId }),
    // 세력도감 소속 — 원천은 배정 표(faction_members)이고 DB 뷰 faction_member_rows로 읽는다.
    // 뷰는 세력 embed가 안 되므로 뷰 → faction_lv2 두 단계로 읽는다.
    (async (): Promise<FactionFactionAssignmentRow[]> => {
      const { data: memberRows, error: memberRowsError } = await db
        .from('faction_member_rows')
        .select('lv2_id, image_url, sort_order, short_desc, short_desc_en, long_desc, long_desc_en')
        .eq('celeb_id', celebId)
        .eq('hidden', false)
        .order('sort_order', { ascending: true })
        .overrideTypes<Omit<FactionFactionAssignmentRow, 'tag'>[], { merge: false }>()
      throwOnQueryError('getCelebBySlug/faction-members', memberRowsError)
      if (!memberRows?.length) return []

      const lv2Ids = [...new Set(memberRows.map((r) => r.lv2_id))]
      const { data: factionRows, error: factionRowsError } = await db
        .from('faction_lv2')
        .select('id, name, name_en, slug, color, description, description_en, theme_music, is_myth')
        .in('id', lv2Ids)
        .eq('is_featured', true)
        .overrideTypes<NonNullable<FactionFactionAssignmentRow['tag']>[], { merge: false }>()
      throwOnQueryError('getCelebBySlug/factions', factionRowsError)
      const factionById = new Map((factionRows ?? []).map((t) => [t.id, t]))

      return memberRows.map((r) => ({ ...r, tag: factionById.get(r.lv2_id) ?? null }))
    })(),
    relationDb
      .from('celeb_relations')
      .select('from_id, to_id, rel_type, rel_group, note, note_en, from:celebs!celeb_relations_from_celebs_fkey(id, slug, nickname, nickname_en, avatar_url, profession, nationality, birth_date, death_date, publication_status, wikidata_qid), to:celebs!celeb_relations_to_celebs_fkey(id, slug, nickname, nickname_en, avatar_url, profession, nationality, birth_date, death_date, publication_status, wikidata_qid)')
      .eq('from_id', celebId)
      .overrideTypes<CelebRelationRow[], { merge: false }>(),
    relationDb
      .from('celeb_relations')
      .select('from_id, to_id, rel_type, rel_group, note, note_en, from:celebs!celeb_relations_from_celebs_fkey(id, slug, nickname, nickname_en, avatar_url, profession, nationality, birth_date, death_date, publication_status, wikidata_qid), to:celebs!celeb_relations_to_celebs_fkey(id, slug, nickname, nickname_en, avatar_url, profession, nationality, birth_date, death_date, publication_status, wikidata_qid)')
      .eq('to_id', celebId)
      .overrideTypes<CelebRelationRow[], { merge: false }>(),
    db
      .from('celeb_relations_external')
      .select('rel_type, rel_group, qid, name_ko, name_en, image_url, note, note_en')
      .eq('from_id', celebId),
    db
      .from('celeb_explanations')
      .select('plain_text, plain_text_en, interpretive_title, interpretive_title_en, interpretive_text, interpretive_text_en')
      .eq('profile_id', celebId)
      // 승인 시각이 찍힌 글만 내보낸다. 품질 재검수가 끝나지 않은 원고는 화면에 올리지 않는다
      .not('published_at', 'is', null)
      .maybeSingle(),
  ])

  throwOnQueryError('getCelebBySlug/content-count', contentCountResult.error)
  throwOnQueryError('getCelebBySlug/follower-count', followerResult.error)
  throwOnQueryError('getCelebBySlug/guestbook-count', guestbookResult.error)
  throwOnQueryError('getCelebBySlug/dialogue', dialogueResult.error)
  throwOnQueryError('getCelebBySlug/type-counts', typeCountsResult.error)
  throwOnQueryError('getCelebBySlug/outgoing-relations', outgoingRelationsResult.error)
  throwOnQueryError('getCelebBySlug/incoming-relations', incomingRelationsResult.error)
  throwOnQueryError('getCelebBySlug/external-relations', externalRelationsResult.error)
  throwOnQueryError('getCelebBySlug/explanation', explanationResult.error)

  const contentTypeCounts: ContentTypeCounts = { BOOK: 0, VIDEO: 0, GAME: 0, MUSIC: 0 }
  for (const row of typeCountsResult.data ?? []) {
    const type = row.content_type as keyof ContentTypeCounts
    if (CONTENT_TYPES.includes(type)) contentTypeCounts[type] = Number(row.total)
  }

  // 신화 가지 표시 — 세력도감 명단은 신화를 싣지 않는다. 세력 탭은 신화가 아닌 소속이 있을 때만 켠다(26.09.14).
  // 목록에서 지우지는 않는다 — 대표 사진이 없을 때 세력 화보로 대신하는 자리가 신화 인물에게도 필요하다
  // 슬러그 없는 세력은 세력도감 딥링크로 이동할 수 없어 제외한다
  const factions: FactionItem[] = factionFactionRows
    .filter((a): a is FactionFactionAssignmentRow & { tag: NonNullable<FactionFactionAssignmentRow['tag']> } => !!a.tag?.slug)
    .map((a) => ({
      id: a.tag.id,
      isMyth: a.tag.is_myth === true,
      name: a.tag.name,
      name_en: a.tag.name_en,
      slug: a.tag.slug as string,
      color: a.tag.color ?? '#b4965a',
      factionImageUrl: a.image_url ?? null,
      description: a.tag.description ?? null,
      description_en: a.tag.description_en ?? null,
      roleShort: a.short_desc ?? null,
      roleShortEn: a.short_desc_en ?? null,
      roleLong: a.long_desc ?? null,
      roleLongEn: a.long_desc_en ?? null,
      music: toFactionMusic(a.tag.theme_music),
    }))

  // 비활성·슬러그 없는 상대는 페이지가 없어 이동만 막고, 사람 자체는 이름 노드로 남긴다.
  // (킴벌 머스크처럼 명단에 있으나 비공개인 형제가 통째로 사라지던 문제)
  const rawRelations = [...(outgoingRelationsResult.data ?? []), ...(incomingRelationsResult.data ?? [])]
  const relationProfiles = new Map(
    rawRelations
      .flatMap((row) => [row.from, row.to])
      .filter((person): person is NonNullable<CelebRelationRow['from']> => person !== null)
      .map((person) => [person.id, person]),
  )
  const internalRelations: CelebRelationItem[] = mergeRelationRowsForViewer(rawRelations, celebId)
    .flatMap((relation) => {
      const target = relationProfiles.get(relation.counterpartId)
      if (!target) return []
      return [{
      relType: relation.relType,
      relGroup: relation.relGroup,
      id: target.id,
      slug: target.slug && target.publication_status === 'active' ? target.slug : null,
      listed: true,
      nickname: target.nickname || 'Unknown',
      nickname_en: target.nickname_en,
      avatar_url: target.avatar_url,
      profession: target.profession,
      nationality: target.nationality,
      birth_date: target.birth_date,
      death_date: target.death_date,
      // 등록 인물도 관계 카드에서 본 카드와 위키데이터 원본을 함께 제공한다.
      qid: target.wikidata_qid,
      note: relation.note,
      note_en: relation.noteEn,
    }]
    })

  // 명단 밖 인물(위키데이터 등재) — 이름 노드. 셀럽이 자리를 먼저 차지하도록 뒤에 붙인다
  const externalRelations: CelebRelationItem[] = ((externalRelationsResult.data ?? []) as unknown as
    { rel_type: string; rel_group: CelebRelationItem['relGroup']; qid: string; name_ko: string | null; name_en: string | null; image_url: string | null; note: string | null; note_en: string | null }[])
    .filter((r) => r.name_ko || r.name_en)
    .map((r) => ({
      relType: r.rel_type,
      relGroup: r.rel_group,
      id: `ext-${r.qid}`,
      slug: null,
      listed: false,
      nickname: r.name_ko || (r.name_en as string),
      nickname_en: r.name_en,
      avatar_url: r.image_url,
      profession: null,
      nationality: null,
      birth_date: null,
      death_date: null,
      qid: r.qid,
      note: r.note,
      note_en: r.note_en,
    }))

  const byTypeThenName = (a: CelebRelationItem, b: CelebRelationItem) =>
    CELEB_RELATION_TYPE_ORDER.indexOf(a.relType as typeof CELEB_RELATION_TYPE_ORDER[number])
    - CELEB_RELATION_TYPE_ORDER.indexOf(b.relType as typeof CELEB_RELATION_TYPE_ORDER[number])
    || a.nickname.localeCompare(b.nickname)
  const relations = [...internalRelations.sort(byTypeThenName), ...externalRelations.sort(byTypeThenName)]

  return {
    profile: profile as PublicCelebBySlugData['profile'],
    contentCount: resolveCelebContentCount(
      contentCountResult.count,
      profile.content_research_confirmed_empty_at
    ),
    followerCount: followerResult.count || 0,
    guestbookCount: guestbookResult.count || 0,
    contentTypeCounts,
    dialogue: (dialogueResult.data as unknown as DialogueProfile | null) ?? null,
    explanation: explanationResult.data ?? null,
    factions,
    relations,
    // 전용 화보 → 세력도감 화보(정렬 첫 장) 순. 둘 다 없으면 화면이 얼굴 사진으로 돌아간다
    photoUrl: profile.portrait_url ?? factions.find((t) => t.factionImageUrl)?.factionImageUrl ?? null,
    // 설명은 전용 화보에만 붙는다. 세력도감 화보를 끌어다 쓴 경우에는 그 그림의 설명이 아니므로 비운다
    photoCaption: profile.portrait_url ? profile.portrait_caption ?? null : null,
    photoCaptionEn: profile.portrait_url ? profile.portrait_caption_en ?? null : null,
  }
}

/* 인물 한 명짜리 조회라 항목 태그를 단다 — 한 명을 고쳐도 나머지 인물 화면은 그대로 둔다.
   celebs(셀럽 본체) + celeb_contents(서고 수) + celeb_dialogues + faction_member_rows(소속 세력도감)를 읽는다.
   여기서는 slug가 곧 그 인물의 식별자다(id를 아직 모르는 시점의 조회다). */
const getCelebBySlugCached = (slug: string) =>
  cachedDetail(
    CACHE_TAGS.CELEBS,
    slug,
    // v9: 가상독백을 함께 싣는 조회 결과만 캐시한다.
    ['celeb-by-slug-v9-virtual-monologue', slug],
    () => fetchCelebBySlugPublic(slug),
    { extraTags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.DIALOGUES, CACHE_TAGS.FACTIONS] },
  )

/**
 * 주소에서 받은 인물 식별자를 DB 값과 맞춘다.
 *
 * 경로의 동적 구간은 퍼센트 인코딩된 채로 도착한다. 인물 slug는 거의 전부 ASCII라
 * 인코딩될 것이 없어 여태 드러나지 않았는데, 비ASCII slug 하나가 사이트맵에는 실리고
 * 페이지는 404가 되는 상태로 남아 있었다(26.09.12 실측 — `uğur-şahin`).
 * 결합 문자 차이로 어긋나지 않게 NFC로도 맞춘다.
 */
function normalizeCelebSlug(raw: string): string {
  let value = raw
  try {
    value = decodeURIComponent(raw)
  } catch {
    // 잘못 인코딩된 주소는 손대지 않는다 — 없는 인물로 처리되게 둔다
  }
  return value.normalize('NFC')
}

// React.cache로 같은 RSC 요청(generateMetadata + default export 등) 안의 중복 호출 dedup
export const getCelebBySlug = cache(getCelebBySlugInner);

export type CelebBySlugProfile = PublicUserProfile & {
  contentTypeCounts: ContentTypeCounts
  factions: FactionItem[]
  relations: CelebRelationItem[]
  /** 상단 대표 화보(PC 세로형). 없으면 null이라 화면이 얼굴 사진으로 돌아간다 */
  photo_url: string | null
  /** 그 화보가 그린 순간 한 줄. 비면 크게 보기에 아무것도 뜨지 않는다. 캐시가 언어를 안 타므로 둘 다 내리고 화면에서 고른다 */
  photo_caption: string | null
  photo_caption_en: string | null
  reading: {
    guide: string
    explorationTitle: string
    explorationText: string
  } | null
  /** 인물이 1인칭으로 말하는 가상독백. 화면 언어로 고르며 영문이 없으면 한국어가 온다 */
  virtualMonologue: string | null
  /** 영문 화면에서 영문본이 없어 한국어 원문을 대신 보여주는 필드 */
  translationFallbacks: string[]
}

async function getCelebBySlugInner(
  slug: string,
  locale: string = 'ko'
): Promise<ActionResult<CelebBySlugProfile>> {
  const pub = await getCelebBySlugCached(normalizeCelebSlug(slug))

  if (!pub) {
    return failure('NOT_FOUND', '셀럽을 찾을 수 없다.')
  }

  const profile = pub.profile
  const selectedTitle = getTitleInfo(profile.selected_title)

  const isEn = locale === 'en'
  const translationFallbacks: string[] = []
  const resolve = <T,>(
    field: string,
    en: T | null | undefined,
    ko: T,
  ): T => {
    if (!isEn) return ko
    if (en) return en
    if (ko) translationFallbacks.push(field)
    return ko
  }

  const d = pub.dialogue
  const quoteKo = getDisplayDialogueQuote(d?.quote)
  const quoteEn = getDisplayDialogueQuote(d?.quote_en)

  return {
    success: true,
    data: {
      id: profile.id,
      slug: profile.slug ?? null,
      nickname: resolve('nickname', profile.nickname_en, profile.nickname || 'Unknown'),
      nickname_en: profile.nickname_en,
      nickname_ko: profile.nickname || 'Unknown',
      avatar_url: profile.avatar_url,
      bio: resolve('bio', profile.bio_en, profile.bio),
      quotes: resolve('quotes', quoteEn, quoteKo),
      monologue: resolve('monologue', d?.monologue_en ?? null, d?.monologue ?? null),
      profession: profile.profession,
      title: resolve('title', profile.title_en, profile.title),
      title_en: profile.title_en,
      title_ko: profile.title,
      headline: resolve('headline', profile.headline_en, profile.headline),
      headline_en: profile.headline_en,
      headline_ko: profile.headline,
      nationality: profile.nationality,
      birth_date: profile.birth_date,
      death_date: profile.death_date,
      subject_kind: 'celeb',
      is_verified: profile.is_verified || false,
      created_at: profile.created_at,
      selected_title: selectedTitle,
      stats: {
        content_count: pub.contentCount,
        follower_count: pub.followerCount,
        following_count: 0,
        friend_count: 0,
        guestbook_count: pub.guestbookCount,
      },
      // 이 공개 프로필 조회는 정적/ISR 렌더에서도 쓴다. viewer 관계는 모달·팔로우
      // 전용 액션이 클라이언트에서 조회하며, 공개 문서에는 섞지 않는다.
      is_following: false,
      is_follower: false,
      is_blocked: false,
      has_voice: profile.has_voice ?? false,
      voice_v: profile.voice_v ?? 0,
      voice_speed: profile.voice_speed ?? 1.0,
      wikidata_qid: profile.wikidata_qid ?? null,
      celeb_tier: ((profile.celeb_tier as CelebTier) ?? 'full'),
      celeb_reality: ((profile.celeb_reality as CelebReality) ?? 'REAL'),
      view_count: profile.view_count ?? 0,
      contentTypeCounts: pub.contentTypeCounts,
      // 배포 전에 만들어진 캐시 항목에는 이 필드가 없다 — 빈 배열로 대체해 화면 오류를 막는다
      factions: pub.factions ?? [],
      relations: pub.relations ?? [],
      photo_url: pub.photoUrl ?? null,
      photo_caption: pub.photoCaption ?? null,
      photo_caption_en: pub.photoCaptionEn ?? null,
      reading: pub.explanation
        ? {
            guide: resolve('personGuide', pub.explanation.plain_text_en, pub.explanation.plain_text),
            explorationTitle: resolve(
              'personExploreTitle',
              pub.explanation.interpretive_title_en,
              pub.explanation.interpretive_title,
            ),
            explorationText: resolve(
              'personExplore',
              pub.explanation.interpretive_text_en,
              pub.explanation.interpretive_text,
            ),
          }
        : null,
      virtualMonologue: resolve('virtualMonologue', profile.virtual_monologue_en?.trim(), profile.virtual_monologue?.trim() || null) || null,
      translationFallbacks,
    },
  }
}
