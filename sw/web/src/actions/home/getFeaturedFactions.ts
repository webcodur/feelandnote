'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { selectVisibleFactionMembers } from '@/lib/faction-members'
import { LIST_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { getInfluenceRanking } from './getCelebs'
import { toFactionMusic, type FactionMusic } from '@/lib/faction-music'
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
  faction_image_url: string | null  // faction_members.image_url — 세력 전용 화보
  /**
   * 이 인물이 속한 그룹 이름 — 배정의 그룹(`faction_lv3`)에서 온다. 그룹 없는 배정은 null이다.
   * 목록에서 인물을 그룹별로 묶어 보여주는 데 쓴다.
   */
  group_label: string | null
  group_label_en: string | null
  /** 세력 순번 — 같은 테마 안에서 세력이 등장하는 순서 */
  group_position: number | null
  /** 영향력 총점(0~100) — 출연진 판에서 앞에 세울 핵심 인물을 가른다. 점수가 없으면 null */
  influence: number | null
}

export interface FeaturedFaction {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  slug: string | null
  /** 단체 사진 — 주소마다 「어느 묶음을 찍었고 누가 나오는지」가 함께 온다 */
  team_images: FactionTeamImage[]
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

// 세력도감 인물 행 — DB 뷰 faction_member_rows(faction_members + faction_lv3 그룹 이름)를 읽는다.
// 읽는 칸만 로컬로 정의한다.
interface MemberRow {
  lv2_id: string
  celeb_id: string
  short_desc: string | null
  short_desc_en: string | null
  image_url: string | null
  sort_order: number | null
  group_name: string | null
  group_name_en: string | null
  group_position: number | null
}

// lv1(테마)와 lv2(세력)를 한 형태로 펼친 행 — parentSlug·isGroup은 조회 시점에 확정된다
interface FeaturedFactionRow {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  slug: string | null
  team_images: unknown
  theme_music: unknown
  is_featured: boolean | null
  is_fiction: boolean | null
  parentSlug: string | null
  isGroup: boolean
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
const MAX_CELEBS_PER_FACTION = 200

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

/** 테마(lv1)·세력(lv2) 행 전부 — 신화 가지는 신화 화면(/explore/myth)이 따로 다루므로 뺀다(26.09.14) */
async function fetchFactionRows(): Promise<FeaturedFactionRow[]> {
  const db = createStaticClient()
  const [lv1Result, lv2Result] = await Promise.all([
    db.from('faction_lv1')
      .select('id, name, name_en, description, description_en, color, slug, is_featured, is_fiction')
      .eq('is_myth', false)
      .order('sort_order', { ascending: true }),
    db.from('faction_lv2')
      .select('id, lv1_id, name, name_en, description, description_en, color, slug, team_images, theme_music, is_featured, is_fiction')
      .eq('is_myth', false)
      .order('sort_order', { ascending: true }),
  ])
  if (lv1Result.error) throw new Error(lv1Result.error.message)
  if (lv2Result.error) throw new Error(lv2Result.error.message)

  const lv1ById = new Map((lv1Result.data ?? []).map((row) => [row.id, row]))
  return [
    ...(lv1Result.data ?? []).map((row): FeaturedFactionRow => ({
      ...row, team_images: null, theme_music: null, parentSlug: null, isGroup: true,
    })),
    ...(lv2Result.data ?? []).map((row): FeaturedFactionRow => ({
      ...row, parentSlug: lv1ById.get(row.lv1_id)?.slug ?? null, isGroup: false,
    })),
  ]
}

/** 세력 한 덩어리의 인물 — 세력 id → 명단 차례대로 */
async function fetchFactionMembers(lv2Ids: string[]): Promise<Record<string, FeaturedCeleb[]>> {
  const db = createStaticClient()

  // 감춘 배정은 빼고, 1,000행 상한에 잘리지 않게 공통 읽기로 끝까지 받는다.
  // 한 번에 읽던 때 테마를 전원 공개하자 3천 행을 넘어 모든 테마가 첫 그룹 몇 명만 받았다(26.09.14)
  const allAssignments = await selectVisibleFactionMembers<MemberRow>(
    db,
    'celeb_id, lv2_id, short_desc, short_desc_en, image_url, sort_order, group_name, group_name_en, group_position',
    lv2Ids,
  )
  const assignmentsByFaction: Record<string, MemberRow[]> = {}
  const allCelebIds = new Set<string>()
  for (const lv2Id of lv2Ids) {
    const factionAssignments = (allAssignments ?? []).filter((a) => a.lv2_id === lv2Id).slice(0, MAX_CELEBS_PER_FACTION)
    assignmentsByFaction[lv2Id] = factionAssignments
    factionAssignments.forEach((a) => allCelebIds.add(a.celeb_id))
  }
  if (allCelebIds.size === 0) return {}

  /*
    배정된 인물을 태운다. 거르는 기준은 **배정의 `hidden`** 하나뿐이다(위 조회에서 이미 걸렀다).

    ① **셀럽 전역 공개 상태(publication_status)로 거르지 않는다** — 그 값은 인물 전역의 공개 여부라
       테마 진열 판단과 무관하고, 팩션에서 등록된 42명이 그 때문에 13개 테마에서 통째로 사라져
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

  const membersByFaction: Record<string, FeaturedCeleb[]> = {}
  for (const lv2Id of lv2Ids) {
    membersByFaction[lv2Id] = (assignmentsByFaction[lv2Id] ?? []).flatMap((a): FeaturedCeleb[] => {
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
        faction_image_url: a.image_url ?? null,
        group_label: a.group_name ?? null,
        group_label_en: a.group_name_en ?? null,
        group_position: a.group_position ?? null,
        influence: influenceMap[c.id] ?? null,
      }]
    })
  }
  return membersByFaction
}

// 팩션 편성 전용 공유 자료다. 일반 인물·서고 수정이 모든 인물 상세을 연쇄 무효화하지 않도록
// TAGS만 즉시 갱신하고, 프로필 표시값은 한 시간 만료로 흡수한다.
const getCachedFactionRows = unstable_cache(fetchFactionRows, ['featured-faction-rows-v1'], {
  revalidate: LIST_REVALIDATE,
  tags: [CACHE_TAGS.FACTIONS],
})
// 인자(테마 id 덩어리)가 캐시 키에 들어가 덩어리마다 따로 저장된다
const getCachedFactionMembers = unstable_cache(fetchFactionMembers, ['featured-faction-members-v1'], {
  revalidate: LIST_REVALIDATE,
  tags: [CACHE_TAGS.FACTIONS],
})

function toFeaturedFaction(faction: FeaturedFactionRow, celebs: FeaturedCeleb[], extra: Pick<FeaturedFaction, 'parentSlug' | 'isGroup'>): FeaturedFaction {
  return {
    id: faction.id,
    name: faction.name,
    name_en: faction.name_en ?? null,
    description: faction.description ?? null,
    description_en: faction.description_en ?? null,
    color: faction.color,
    slug: faction.slug ?? null,
    team_images: toImageArray(faction.team_images),
    music: toFactionMusic(faction.theme_music),
    celebs,
    is_featured: faction.is_featured === true,
    is_fiction: faction.is_fiction === true,
    ...extra,
  }
}

export async function getFeaturedFactions(): Promise<FeaturedFaction[]> {
  const factionRows = await getCachedFactionRows()
  if (!factionRows.length) return []

  const activeFactions = factionRows.filter((t) => t.is_featured)
  if (!activeFactions.length) return []

  // 위계는 조회 시점에 확정돼 행에 실린다 — lv1 행은 isGroup, lv2 행은 parentSlug를 든다.
  // 멤버는 세력(lv2)에만 붙으므로 테마 헤더는 건너뛴다
  const memberFactions = activeFactions.filter((t) => !t.isGroup)

  // 덩어리는 차례로 채운다 — 캐시가 비었을 때 한꺼번에 조회하면 DB 풀이 막힌다
  const membersByFaction: Record<string, FeaturedCeleb[]> = {}
  for (let i = 0; i < memberFactions.length; i += MEMBER_CACHE_CHUNK) {
    Object.assign(membersByFaction, await getCachedFactionMembers(memberFactions.slice(i, i + MEMBER_CACHE_CHUNK).map((t) => t.id)))
  }

  // 배정된 인물이 한 명도 없으면 태그만 늘어놓는다
  if (Object.keys(membersByFaction).length === 0) {
    return factionRows.map((faction) => toFeaturedFaction(faction, [], { parentSlug: faction.parentSlug, isGroup: faction.isGroup }))
  }

  const result: FeaturedFaction[] = []
  for (const faction of activeFactions) {
    const celebs = membersByFaction[faction.id] ?? []
    // 테마 헤더는 배정이 없어도 목록에 포함한다
    if (celebs.length > 0 || faction.isGroup) {
      result.push(toFeaturedFaction(faction, celebs, { parentSlug: faction.parentSlug, isGroup: faction.isGroup }))
    }
  }
  // 비활성 태그 추가
  for (const faction of factionRows.filter((t) => !t.is_featured)) {
    result.push(toFeaturedFaction(faction, [], { parentSlug: faction.parentSlug, isGroup: faction.isGroup }))
  }
  return result
}

export async function getFactionsByIds(factionIds: string[]): Promise<FeaturedFaction[]> {
  if (factionIds.length === 0) return []

  const factions = await getFeaturedFactions()
  const factionById = new Map(factions.map((faction) => [faction.id, faction]))

  return factionIds
    .map((factionId) => factionById.get(factionId))
    .filter((faction): faction is FeaturedFaction => faction?.is_featured === true && faction.isGroup !== true)
}
