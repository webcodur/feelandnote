'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { mythBranchTagIds } from '@feelandnote/shared/lib/faction-atlas'
import { selectVisibleAtlasMembers } from '@/lib/faction-atlas-members'
import { LIST_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { getInfluenceRanking } from './getCelebs'
import { toFactionMusic, toFactionVideos, type FactionMusic, type FactionVideos } from '@/lib/faction-videos'
import { toTeamImages, type FactionTeamImage } from '@feelandnote/shared/lib/faction-team-image'

export interface FeaturedCeleb {
  id: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  title: string | null
  title_en: string | null
  profession: string | null
  speech_tone: string | null
  short_desc: string | null
  short_desc_en: string | null
  /* 긴 소개(long_desc)는 싣지 않는다 — 명단이 캐시 상한 2MB를 넘어 getFactionLongDescs가 테마별로 준다 */
  faction_image_url: string | null
  /** 출간된 팩션 대사 음성 + 개인 화보 전환 타임라인 */
  /**
   * 세력도감 영상에서 이 인물이 하는 말 — 개인 화보에서 말풍선으로 띄운다.
   * 게임용 `celeb_dialogues`와 다른 값이다. 원천은 제작 데이터이며 도감 뷰가 직접 내놓는다.
   */
  /**
   * 이 인물이 속한 세력(그룹) 이름 — 제작 유래 인물만 값이 있고 수동 배정 인물은 null이다.
   * 목록에서 인물을 세력별로 묶어 보여주는 데 쓴다.
   */
  group_label: string | null
  group_label_en: string | null
  /** 세력 이름 둘째 줄(부제) — 없으면 null */
  group_subtitle: string | null
  group_subtitle_en: string | null
  /** 세력 순번 — 같은 테마 안에서 세력이 등장하는 순서 */
  group_position: number | null
  /** 세력 색(제작 브랜드 색) — 도감이 세력 단위 강조에 쓴다 */
  group_color: string | null
  /** 세력 로고 R2 주소 — 출간 사진 공정이 올린다. 없으면 null */
  group_logo_url: string | null
  /** 영향력 총점(0~100) — 출연진 판에서 앞에 세울 핵심 인물을 가른다. 점수가 없으면 null */
  influence: number | null
}

export interface FeaturedTag {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  slug: string | null
  /** 단체 사진 — 주소마다 「어느 묶음을 찍었고 누가 나오는지」가 함께 온다 */
  team_images: FactionTeamImage[]
  /** 이 테마를 다룬 유튜브 영상(긴 영상·짧은 영상). 둘 다 없으면 null */
  videos: FactionVideos | null
  /** 이 테마 구간에 흐르는 배경음악. 없으면 null */
  music: FactionMusic | null
  celebs: FeaturedCeleb[]
  is_featured: boolean
  /**
   * 이야기 속 인물 구획인지. 컬렉션 화면에서 구분선 아래로 내려간다.
   * 묶음에 켜져 있으면 그 아래 테마도 함께 내려간다.
   */
  is_fiction: boolean
  /** 이 태그가 속한 상위 그룹 slug (자식이면 'ai', 최상위면 null) */
  parentSlug?: string | null
  /** 이 태그가 그룹 헤더인지 (자식을 접었다 펴는 상위 카드) */
  isGroup?: boolean
}

// 세력도감 인물 행 — 단일 원천은 제작 테이블(faction_people)이고, DB 뷰 faction_atlas_members가
// 웹 전용 배정과 합쳐 준다. 뷰는 자동생성 타입에 없어 로컬로 정의한다.
interface AtlasMemberRow {
  tag_id: string
  celeb_id: string
  short_desc: string | null
  short_desc_en: string | null
  faction_image_url: string | null
  sort_order: number | null
  group_label: string | null
  group_label_en: string | null
  group_subtitle: string | null
  group_subtitle_en: string | null
  group_position: number | null
  group_color: string | null
  group_logo_url: string | null
}

interface FeaturedTagRow {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  slug: string | null
  team_images: unknown
  youtube_videos: unknown
  theme_music: unknown
  is_featured: boolean | null
  is_fiction: boolean | null
  parent_id: string | null
}

// team_images Json → 사진 목록 (옛 문자열 배열도 그대로 읽힌다)
const toImageArray = toTeamImages

/**
 * 한 테마가 도감에 띄우는 인물 수 상한.
 *
 * 16이던 것을 26.07.27에 24로, 26.07.29 신화 팩션 전량 연결 때 40으로 올렸다.
 * 북유럽 신화처럼 인물이 29명인 테마도 관계를 조용히 잘라내지 않아야 한다.
 * 목록이 「단체 사진 + 그 사진의 사람들」 계층으로 바뀌어
 * 길어져도 읽히고, 무엇보다 한 사람이 여러 테마에 겹쳐 드는 일이 정상이 되면서 상한에 걸려
 * 멀쩡한 인물이 조용히 잘려 나갔다(소셜 네트워크에서 싸이월드 창업자가 그랬다).
 * 26.09.14 재편으로 105명짜리 테마(문학의 거장들)가 생겨 40에서 124명이 잘렸다 — 200으로 올렸다.
 * 감추는 일은 배정의 hidden 스위치가 맡고, 이 값은 사고 방지용 천장으로만 둔다.
 */
const MAX_CELEBS_PER_TAG = 200

/**
 * 인물 명단을 이 수만큼의 테마씩 나눠 캐시한다.
 * 한 캐시 항목이 2MB를 넘으면 저장되지 않고 옛 값이 계속 나간다 — 한 항목에 모든 테마를 담던 때
 * 2,508명에서 2.0MB에 닿았고, K팝 테마 422명을 공개하자 새 명단이 저장되지 못해 화면이 1명에 멈췄다(26.09.15).
 * 테마 40개 한 덩어리는 400KB 안팎이다.
 */
const MEMBER_CACHE_CHUNK = 40

interface FeaturedProfileRow {
  id: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  title: string | null
  title_en: string | null
  profession: string | null
  speech_tone: string | null
}

// --- 공개 데이터 캐싱 (1시간) ---

/** 태그 행 전부 — 신화 갈래는 신화 화면(/explore/myth)이 따로 다루므로 뺀다(26.09.14) */
async function fetchTagRows(): Promise<FeaturedTagRow[]> {
  const db = createStaticClient()
  const { data: allTags, error: tagsError } = await db
    .from('celeb_tags')
    .select('id, name, name_en, description, description_en, color, slug, team_images, youtube_videos, theme_music, is_featured, is_fiction, parent_id')
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true })

  if (tagsError) throw new Error(tagsError.message)
  if (!allTags?.length) return []

  const mythTagIds = mythBranchTagIds(allTags as FeaturedTagRow[])
  return (allTags as FeaturedTagRow[]).filter((tag) => !mythTagIds.has(tag.id))
}

/** 테마 한 덩어리의 인물 — 테마 id → 명단 차례대로 */
async function fetchTagMembers(tagIds: string[]): Promise<Record<string, FeaturedCeleb[]>> {
  const db = createStaticClient()

  // 감춘 배정은 빼고, 1,000행 상한에 잘리지 않게 공통 읽기로 끝까지 받는다.
  // 한 번에 읽던 때 테마를 전원 공개하자 3천 행을 넘어 모든 테마가 첫 그룹 몇 명만 받았다(26.09.14)
  const allAssignments = await selectVisibleAtlasMembers<AtlasMemberRow>(
    db,
    'celeb_id, tag_id, short_desc, short_desc_en, faction_image_url, sort_order, group_label, group_label_en, group_subtitle, group_subtitle_en, group_position, group_color, group_logo_url',
    tagIds,
  )
  const assignmentsByTag: Record<string, AtlasMemberRow[]> = {}
  const allCelebIds = new Set<string>()
  for (const tagId of tagIds) {
    const tagAssignments = (allAssignments ?? []).filter((a) => a.tag_id === tagId).slice(0, MAX_CELEBS_PER_TAG)
    assignmentsByTag[tagId] = tagAssignments
    tagAssignments.forEach((a) => allCelebIds.add(a.celeb_id))
  }
  if (allCelebIds.size === 0) return {}

  /*
    배정된 인물을 태운다. 거르는 기준은 **배정의 `hidden`** 하나뿐이다(위 조회에서 이미 걸렀다).

    ① **셀럽 전역 공개 상태(publication_status)로 거르지 않는다** — 그 값은 영상 제작 쪽 사정으로 정해지는 것이라
       진열 판단과 무관하고, 팩션에서 등록된 42명이 그 때문에 13개 테마에서 통째로 사라져
       있었다(26.07.27 실측).
    ② **등급(celeb_tier)으로도 거르지 않는다** — 목록·검색은 신화·허구 등급을 빼는 게 맞지만
       (실존 인물 목록에 제우스가 섞이면 곤란하다), 도감은 테마별 진열이라 맥락이 분명하다.
       뒤섞이지 않게 컬렉션 화면에서 「이야기 속 인물」 구획(`is_fiction`)으로 갈라 놓는다.
       이 게이트 때문에 일리아스 19명·오디세이아 22명을 다 채워 넣고도 0명으로 떴었다.

    게임용 celeb_dialogues는 읽지 않는다.
  */
  const [celebRows, { scoreMap: influenceMap }] = await Promise.all([
    selectInChunks<FeaturedProfileRow>(Array.from(allCelebIds), (chunk) =>
      db.from('celebs').select(`
        id, nickname, nickname_en, avatar_url, title, title_en, profession, speech_tone
      `).in('id', chunk).overrideTypes<FeaturedProfileRow[], { merge: false }>()
    ),
    // 출연진 판이 핵심 인물을 가르는 점수 — 인물 목록과 같은 영향력 캐시를 쓴다
    getInfluenceRanking(),
  ])
  const profileMap = new Map(celebRows.map((p) => [p.id, p]))

  const membersByTag: Record<string, FeaturedCeleb[]> = {}
  for (const tagId of tagIds) {
    membersByTag[tagId] = (assignmentsByTag[tagId] ?? []).flatMap((a): FeaturedCeleb[] => {
      const c = profileMap.get(a.celeb_id)
      if (!c) return []
      return [{
        id: c.id,
        nickname: c.nickname,
        nickname_en: c.nickname_en ?? null,
        avatar_url: c.avatar_url,
        title: c.title,
        title_en: c.title_en ?? null,
        profession: c.profession,
        speech_tone: c.speech_tone ?? null,
        short_desc: a.short_desc,
        short_desc_en: a.short_desc_en,
        faction_image_url: a.faction_image_url ?? null,
        group_label: a.group_label ?? null,
        group_label_en: a.group_label_en ?? null,
        group_subtitle: a.group_subtitle ?? null,
        group_subtitle_en: a.group_subtitle_en ?? null,
        group_position: a.group_position ?? null,
        group_color: a.group_color ?? null,
        group_logo_url: a.group_logo_url ?? null,
        influence: influenceMap[c.id] ?? null,
      }]
    })
  }
  return membersByTag
}

// 팩션 편성 전용 공유 자료다. 일반 인물·서고 수정이 모든 인물 상세을 연쇄 무효화하지 않도록
// TAGS만 즉시 갱신하고, 프로필 표시값은 한 시간 만료로 흡수한다.
const getCachedTagRows = unstable_cache(fetchTagRows, ['featured-tag-rows-v1'], {
  revalidate: LIST_REVALIDATE,
  tags: [CACHE_TAGS.TAGS],
})
// 인자(테마 id 덩어리)가 캐시 키에 들어가 덩어리마다 따로 저장된다
const getCachedTagMembers = unstable_cache(fetchTagMembers, ['featured-tag-members-v1'], {
  revalidate: LIST_REVALIDATE,
  tags: [CACHE_TAGS.TAGS],
})

function toFeaturedTag(tag: FeaturedTagRow, celebs: FeaturedCeleb[], extra: Pick<FeaturedTag, 'parentSlug' | 'isGroup'>): FeaturedTag {
  return {
    id: tag.id,
    name: tag.name,
    name_en: tag.name_en ?? null,
    description: tag.description ?? null,
    description_en: tag.description_en ?? null,
    color: tag.color,
    slug: tag.slug ?? null,
    team_images: toImageArray(tag.team_images),
    videos: toFactionVideos(tag.youtube_videos),
    music: toFactionMusic(tag.theme_music),
    celebs,
    is_featured: tag.is_featured === true,
    is_fiction: tag.is_fiction === true,
    ...extra,
  }
}

export async function getFeaturedTags(): Promise<FeaturedTag[]> {
  const tagRows = await getCachedTagRows()
  if (!tagRows.length) return []

  const activeTags = tagRows.filter((t) => t.is_featured)
  if (!activeTags.length) return []

  // 상위 그룹 위계 — celeb_tags.parent_id 가 정본이다(26.07.26 코드 상수에서 승격).
  // 그룹 헤더는 따로 표시하는 값이 아니라 "자식을 하나라도 가진 태그"로 판정한다.
  // 노출 여부와 무관하게 전체 행으로 계산해야 숨긴 자식·숨긴 부모가 섞여도 위계가 유지된다.
  const slugById = new Map<string, string>()
  const childCountByParent = new Map<string, number>()
  for (const t of tagRows) {
    if (t.slug) slugById.set(t.id, t.slug)
    if (t.parent_id) childCountByParent.set(t.parent_id, (childCountByParent.get(t.parent_id) ?? 0) + 1)
  }
  const hierarchy = (t: FeaturedTagRow) => ({
    parentSlug: t.parent_id ? slugById.get(t.parent_id) ?? null : null,
    isGroup: (childCountByParent.get(t.id) ?? 0) > 0,
  })

  // 덩어리는 차례로 채운다 — 캐시가 비었을 때 한꺼번에 조회하면 DB 풀이 막힌다
  const membersByTag: Record<string, FeaturedCeleb[]> = {}
  for (let i = 0; i < activeTags.length; i += MEMBER_CACHE_CHUNK) {
    Object.assign(membersByTag, await getCachedTagMembers(activeTags.slice(i, i + MEMBER_CACHE_CHUNK).map((t) => t.id)))
  }

  // 배정된 인물이 한 명도 없으면 태그만 늘어놓는다
  if (Object.keys(membersByTag).length === 0) {
    return tagRows.map((tag) => toFeaturedTag(tag, [], hierarchy(tag)))
  }

  const result: FeaturedTag[] = []
  for (const tag of activeTags) {
    const { parentSlug, isGroup } = hierarchy(tag)
    const celebs = membersByTag[tag.id] ?? []
    // 그룹 헤더는 배정이 없어도 목록에 포함한다
    if (celebs.length > 0 || isGroup) result.push(toFeaturedTag(tag, celebs, { parentSlug, isGroup }))
  }
  // 비활성 태그 추가
  for (const tag of tagRows.filter((t) => !t.is_featured)) {
    result.push(toFeaturedTag(tag, [], hierarchy(tag)))
  }
  return result
}

export async function getFactionTagsByIds(tagIds: string[]): Promise<FeaturedTag[]> {
  if (tagIds.length === 0) return []

  const tags = await getFeaturedTags()
  const tagById = new Map(tags.map((tag) => [tag.id, tag]))

  return tagIds
    .map((tagId) => tagById.get(tagId))
    .filter((tag): tag is FeaturedTag => tag?.is_featured === true && tag.isGroup !== true)
}
