'use server'

/**
 * 편 편집기의 도감 구획 데이터 — 한 편의 세력별 연결 테마와 인물별 도감 손질(web_*) 상태.
 *
 * 26.08.03 단일화 이후 도감 인물의 원천은 faction_people 이다. 한줄 직함은 lines[0] 고정이고,
 * 상세 소개·개인샷·숨김만 같은 행의 web_* 칸에서 손질한다.
 * 편 편집기가 "영상 원문과 도감 표기를 나란히" 보여주려면 이 상태를 읽어야 하는데,
 * 편집기의 대본(JSON)에는 web_* 가 실리지 않으므로(도감 편집 소유) 여기서 따로 조회한다.
 *
 * 쓰기는 이 파일에 없다 — 상세 소개 손질·숨김·개인샷은 `actions/admin/tags.ts` 의 기존 액션
 * (updateTagAssignmentDesc·setTagCelebHidden·setTagCelebImage), 테마 간판은 updateTag 를 재사용한다.
 */

import { factionAdminClient, requireFactionAdmin } from '@/lib/faction-db'

type Row = Record<string, unknown>

/** 세력에 연결된 도감 테마의 간판 — 편집 대상 필드만 */
export interface AtlasTheme {
  id: string
  name: string
  name_en: string | null
  color: string
  slug: string | null
  is_featured: boolean
}

/** 세력(position 순) 하나의 테마 연결 상태 */
export interface AtlasGroupLink {
  /** faction_groups.position (1-based) — 편집기 세력 인덱스 + 1 과 대응 */
  position: number
  tagId: string | null
  theme: AtlasTheme | null
  /** 같은 테마를 공유하는 세력 중 첫 자리(position 최소)인지 — 편집 UI 는 대표 한 곳에만 둔다 */
  representative: boolean
}

/** 인물 한 명의 도감 손질 상태 — 자리(포지션 3종)와 신원(celeb·slug·이름)을 함께 쥔다 */
export interface AtlasPersonState {
  personId: string
  celebId: string | null
  groupPos: number
  clusterPos: number
  personPos: number
  slug: string | null
  name: string
  webLongDesc: string | null
  webLongDescEn: string | null
  webImageUrl: string | null
  webHidden: boolean
}

export interface EpisodeAtlas {
  groups: AtlasGroupLink[]
  people: AtlasPersonState[]
}

const IN_CHUNK = 200

async function inChunks(
  db: ReturnType<typeof factionAdminClient>,
  table: string, col: string, values: string[], select: string,
): Promise<Row[]> {
  const out: Row[] = []
  for (let i = 0; i < values.length; i += IN_CHUNK) {
    const { data, error } = await db.from(table).select(select).in(col, values.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    out.push(...((data ?? []) as unknown as Row[]))
  }
  return out
}

/** 한 편의 도감 상태 전량 — 편집기 로드·저장 직후에 부른다 */
export async function getEpisodeAtlas(folder: string): Promise<EpisodeAtlas> {
  await requireFactionAdmin()
  if (!folder) throw new Error('에피소드 폴더명이 필요합니다')
  const db = factionAdminClient()

  const { data: ep, error: epErr } = await db
    .from('faction_episodes').select('id').eq('folder', folder).maybeSingle()
  if (epErr) throw new Error(`에피소드 조회 실패(${folder}): ${epErr.message}`)
  if (!ep) return { groups: [], people: [] }

  const { data: groups, error: gErr } = await db
    .from('faction_groups').select('id,position,tag_id')
    .eq('episode_id', ep.id as string).order('position')
  if (gErr) throw new Error(`세력 조회 실패: ${gErr.message}`)
  const groupRows = (groups ?? []) as Row[]

  // 연결 테마 간판 일괄 조회
  const tagIds = [...new Set(groupRows.map(g => g.tag_id as string | null).filter((v): v is string => !!v))]
  const themeById = new Map<string, AtlasTheme>()
  if (tagIds.length) {
    const tagRows = await inChunks(db, 'celeb_tags', 'id', tagIds, 'id,name,name_en,color,slug,is_featured')
    for (const t of tagRows) {
      themeById.set(t.id as string, {
        id: t.id as string,
        name: (t.name as string) ?? '',
        name_en: (t.name_en as string | null) ?? null,
        color: (t.color as string) ?? '#7c4dff',
        slug: (t.slug as string | null) ?? null,
        is_featured: t.is_featured === true,
      })
    }
  }

  // 대표 세력 — 같은 테마를 공유하면 position 이 가장 앞선 세력만 편집 UI 를 가진다
  const firstPosByTag = new Map<string, number>()
  for (const g of groupRows) {
    const tagId = g.tag_id as string | null
    if (!tagId) continue
    if (!firstPosByTag.has(tagId)) firstPosByTag.set(tagId, g.position as number)
  }

  const groupLinks: AtlasGroupLink[] = groupRows.map(g => {
    const tagId = (g.tag_id as string | null) ?? null
    return {
      position: g.position as number,
      tagId,
      theme: tagId ? themeById.get(tagId) ?? null : null,
      representative: !!tagId && firstPosByTag.get(tagId) === (g.position as number),
    }
  })

  // 인물별 도감 손질 상태
  const clusterRows = await inChunks(db, 'faction_clusters', 'group_id',
    groupRows.map(g => g.id as string), 'id,group_id,position')
  const personRows = clusterRows.length
    ? await inChunks(db, 'faction_people', 'cluster_id',
        clusterRows.map(c => c.id as string),
        'id,cluster_id,position,celeb_id,slug,name,web_long_desc,web_long_desc_en,web_image_url,web_hidden')
    : []
  const brokenPerson = personRows.find(p => typeof p.celeb_id !== 'string' || !p.celeb_id)
  if (brokenPerson) {
    throw new Error(`팩션 DB 인물 연결 무결성 오류: ${String(brokenPerson.name ?? brokenPerson.id)}`)
  }

  const groupPosById = new Map(groupRows.map(g => [g.id as string, g.position as number]))
  const clusterById = new Map(clusterRows.map(c => [c.id as string, c]))

  const people: AtlasPersonState[] = personRows.map(p => {
    const cluster = clusterById.get(p.cluster_id as string)
    return {
      personId: p.id as string,
      celebId: p.celeb_id as string,
      groupPos: cluster ? groupPosById.get(cluster.group_id as string) ?? 0 : 0,
      clusterPos: (cluster?.position as number) ?? 0,
      personPos: p.position as number,
      slug: (p.slug as string | null) ?? null,
      name: (p.name as string) ?? '',
      webLongDesc: (p.web_long_desc as string | null) ?? null,
      webLongDescEn: (p.web_long_desc_en as string | null) ?? null,
      webImageUrl: (p.web_image_url as string | null) ?? null,
      webHidden: p.web_hidden === true,
    }
  })

  return { groups: groupLinks, people }
}
