/**
 * 세력도감 대본 저장 코어 — 서버 전용, 인증 밖.
 *
 * 서버 액션(`actions/admin/factions/script.ts`)은 사람 확인만 하고 이 함수를 부른다.
 * 액션 파일 안에 로직을 두면 Next 밖에서 부를 수 없어 검증이 안 되므로 여기로 뺐다.
 *
 * 하는 일은 셋이다.
 *   1. **보존해야 할 값을 DB 에서 읽는다** — 진행 상태·편성·순번·편별 댓글·음성 길이·도감 손질·세력 테마.
 *      편집기는 이 값들을 모르거나(댓글) 소유하지 않는다(음성 길이 — 문서 §7).
 *      기존 트리(에피소드→세력→장면→인물)는 한 번만 읽고 되살리기 셋이 그 메모리를 나눠 쓴다.
 *   2. 인물 UUID 검증(레거시 파일만 slug → UUID 해소), 세력 태그 이름 → 태그 id.
 *   3. 분해(`buildFactionRows`) 후 원자 저장 함수 한 번 호출.
 *
 * 분해 규칙 자체는 `@feelandnote/shared/lib/faction-assemble` 소유다 — 여기에 복제하지 않는다.
 */

import { randomUUID } from 'crypto'
import type { SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { CELEB_MANAGED_PUBLICATION_STATUSES } from '@feelandnote/shared/constants/celeb-publication'
import {
  buildFactionRows, IN_CHUNK, type DurationLookup,
} from '@feelandnote/shared/lib/faction-assemble'
import { assertIndividualFactionSubject } from '@feelandnote/shared/lib/faction-person-subject'
import { assertFactionSceneSpeakerAssignments } from '@feelandnote/shared/lib/faction-scene-speaker'

type Row = Record<string, unknown>

export interface ReplaceEpisodeResult {
  episodeId: string
  /** 다음 저장에 쓸 새 잠금 기준 */
  updatedAt: string
  counts: { groups: number; clusters: number; people: number; parts: number }
}

/**
 * 대본 전체를 한 트랜잭션에 갈아끼운다.
 *
 * @param expectedUpdatedAt 불러올 때 받은 값. 그 사이 다른 곳에서 저장했으면 DB 가 거부한다.
 *   새로 만드는 경우에만 null 을 준다.
 */
export async function replaceFactionEpisode(
  db: DatabaseClient,
  folder: string,
  script: Record<string, unknown>,
  expectedUpdatedAt: string | null,
): Promise<ReplaceEpisodeResult> {
  if (!folder) throw new Error('에피소드 폴더명이 필요합니다')
  assertFactionSceneSpeakerAssignments((script.groups ?? []) as Row[])

  // 되살릴 기존 값(음성 길이·도감 손질·세력 테마)은 트리 한 번 읽기로 전부 받는다. 편별 댓글만 별도 표라 한 번 더.
  const tree = await loadExistingTree(db, folder)
  if (!tree) throw new Error(`에피소드가 없습니다: ${folder}`)
  const epRow = tree.episode
  const episodeId = epRow.id as string
  const durations = durationLookupOf(tree)
  const webLookup = webOverrideLookupOf(tree)
  const parts = await loadExistingParts(db, episodeId)

  const { slugMap, profilesById, unpublishedIds } = await resolvePeople(db, script)
  const tagMap = await resolveTags(db)
  const keptTags = groupTagLookupOf(tree)

  const payload = buildFactionRows(script, {
    slugMap,
    tagMap,
    newId: randomUUID,
    durations,
    status: (epRow.status as string) ?? 'blocked',
    registered: (epRow.registered as boolean) ?? false,
    sortOrder: (epRow.sort_order as number) ?? 0,
    parts,
  })

  // UUID가 정체성의 원천이다. slug는 현재 프로필 값을 미러링해 이름 변경·레거시 파일의
  // 오래된 키가 새 행에 남지 않게 한다.
  for (const p of payload.people) {
    if (p.is_person === false) continue
    const profile = profilesById.get(p.celeb_id as string)
    if (!profile) throw new Error(`팩션 인물의 DB CELEB 검증 결과가 사라졌다: ${String(p.name ?? p.celeb_id)}`)
    p.slug = profile.slug
  }

  /*
    세력이 어느 도감 테마에 걸렸는지(tag_id)도 되실어 보존한다.

    대본에는 테마 지정이 실려 오지 않는 세력이 많다(편집기에서 테마를 따로 지정하지 않고
    편 단위로 상속받은 경우). 그대로 저장하면 테마가 빈 채로 들어가고, 자동 배정 장치가
    편 이름으로 **다른 테마를 새로 만들어** 붙인다. 그러면 도감에 실려 있던 인물이 통째로
    엉뚱한 테마로 옮겨 간다(26.08.03 실측 — 인간형 로봇 6명이 「기계 인간의 시대」로 이탈).
    그래서 세력 이름을 신원 삼아 기존 테마를 되살린다. 음성 길이·도감 손질과 같은 원리다.
  */
  for (const g of payload.groups) {
    if (g.tag_id) continue
    const kept = keptTags(g)
    if (kept) g.tag_id = kept
  }

  // 도감 상세 손질·개인샷·숨김(web_*)은 도감 편집이 소유한다 — 대본 저장이 인물 행을 전량 갈아끼우므로
  // 여기서 기존 값을 사람 신원 기준으로 되실어 보존한다(음성 길이와 같은 원리).
  // web_hidden 은 NOT NULL 이라 값이 없으면 저장 자체가 거부된다(실측 26.08.03).
  //
  // 처음 실리는 인물은 그 사람이 서비스에 떠 있는지로 도감 노출을 정한다 — 아직 안 뜨는 인물은
  // 도감에 이름만 뜨고 눌러도 화면이 안 열리므로 감춘 채로 넣는다. 사람이 도감 구획에서 직접
  // 보이기로 바꾸면 그 값이 기존 값으로 보존돼 다음 저장에 되살아나지 않는다.
  for (const p of payload.people) {
    if (p.is_person === false) {
      p.web_hidden = true
      p.web_long_desc = null
      p.web_long_desc_en = null
      p.web_image_url = null
      p.web_quote_media = null
      continue
    }
    const kept = webLookup(p)
    p.web_hidden = kept?.web_hidden
      ?? unpublishedIds.has(p.celeb_id as string)
    p.web_long_desc = kept?.web_long_desc ?? null
    p.web_long_desc_en = kept?.web_long_desc_en ?? null
    p.web_image_url = kept?.web_image_url ?? null
    p.web_quote_media = kept?.web_quote_media ?? null
  }

  const { data: res, error } = await db.rpc('faction_replace_episode', {
    p_folder: folder,
    p_episode: payload.episode,
    p_groups: payload.groups,
    p_clusters: payload.clusters,
    p_people: payload.people,
    p_parts: payload.parts,
    p_expected_updated_at: expectedUpdatedAt,
  })
  if (error) throw new Error(error.message)

  const out = res as { episode_id: string; updated_at: string }
  return {
    episodeId: out.episode_id,
    updatedAt: out.updated_at,
    counts: {
      groups: payload.groups.length,
      clusters: payload.clusters.length,
      people: payload.people.length,
      parts: payload.parts.length,
    },
  }
}

/* ────────────────────────── 내부 ────────────────────────── */

type PersonRef = { path: string; name: string; celebId?: string; slug?: string }
type ProfileRef = { id: string; slug: string; status: string; nickname: string; nicknameEn: string }

function collectPeople(script: Record<string, unknown>): PersonRef[] {
  const refs: PersonRef[] = []
  for (const [gi, g] of ((script.groups ?? []) as Row[]).entries()) {
    for (const [ci, c] of (((g.clusters ?? []) as Row[]).entries())) {
      for (const [pi, p] of (((c.people ?? []) as Row[]).entries())) {
        if (p.isPerson === false) continue
        refs.push({
          path: `세력 ${gi + 1}·묶음 ${ci + 1}·인물 ${pi + 1}`,
          name: String(p.name ?? ''),
          ...(typeof p.celebId === 'string' && p.celebId ? { celebId: p.celebId } : {}),
          ...(typeof p.slug === 'string' && p.slug ? { slug: p.slug } : {}),
        })
      }
    }
  }
  return refs
}

/**
 * 모든 인물이 실제 CELEB 프로필을 가리키는지 저장 전에 전량 검증한다.
 * UUID가 있는 편집 데이터는 UUID로 확인하고, 옛 렌더 파일처럼 slug만 있는 입력만 해소한다.
 */
async function resolvePeople(
  db: DatabaseClient, script: Record<string, unknown>,
): Promise<{
  slugMap: Map<string, string>
  profilesById: Map<string, ProfileRef>
  unpublishedIds: Set<string>
}> {
  const refs = collectPeople(script)
  for (const ref of refs) assertIndividualFactionSubject(ref.name, undefined, ref.path)
  const ids = [...new Set(refs.flatMap(r => r.celebId ? [r.celebId] : []))]
  const slugs = [...new Set(refs.flatMap(r => r.slug ? [r.slug] : []))]
  const rows: Row[] = []

  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await db.from('celebs').select('id,slug,status:publication_status,nickname,nickname_en')
      .in('publication_status', [...CELEB_MANAGED_PUBLICATION_STATUSES])
      .in('id', ids.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`셀럽 UUID 조회 실패: ${error.message}`)
    rows.push(...((data ?? []) as Row[]))
  }
  for (let i = 0; i < slugs.length; i += IN_CHUNK) {
    const { data, error } = await db.from('celebs').select('id,slug,status:publication_status,nickname,nickname_en')
      .in('publication_status', [...CELEB_MANAGED_PUBLICATION_STATUSES])
      .in('slug', slugs.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`셀럽 slug 조회 실패: ${error.message}`)
    rows.push(...((data ?? []) as Row[]))
  }

  const profilesById = new Map<string, ProfileRef>()
  const profilesBySlug = new Map<string, ProfileRef>()
  for (const row of rows) {
    const id = row.id as string
    const slug = typeof row.slug === 'string' ? row.slug : ''
    if (!slug) throw new Error(`DB CELEB에 slug가 없습니다: ${id}`)
    const nickname = String(row.nickname ?? '')
    const nicknameEn = String(row.nickname_en ?? '')
    assertIndividualFactionSubject(nickname, nicknameEn, `DB CELEB ${id}`)
    const profile = { id, slug, status: String(row.status ?? ''), nickname, nicknameEn }
    profilesById.set(id, profile)
    profilesBySlug.set(slug, profile)
  }

  const slugMap = new Map<string, string>()
  const unpublishedIds = new Set<string>()
  for (const ref of refs) {
    const byId = ref.celebId ? profilesById.get(ref.celebId) : undefined
    const bySlug = ref.slug ? profilesBySlug.get(ref.slug) : undefined
    const profile = byId ?? bySlug
    if (!profile) {
      throw new Error(`${ref.path}(${ref.name})이 DB CELEB에 등록되어 있지 않습니다. 셀럽 관리에서 먼저 정식 등록한 뒤 다시 검색하세요.`)
    }
    if (byId && bySlug && byId.id !== bySlug.id) {
      throw new Error(`${ref.path}(${ref.name})의 celebId와 slug가 서로 다른 DB 인물을 가리킵니다.`)
    }
    if (ref.slug) slugMap.set(ref.slug, profile.id)
    if (profile.status !== 'active') unpublishedIds.add(profile.id)
  }
  return { slugMap, profilesById, unpublishedIds }
}

/** 태그는 수십 종뿐이라 전량 조회한다 */
async function resolveTags(db: DatabaseClient): Promise<Map<string, string>> {
  const { data, error } = await db.from('celeb_tags').select('id,slug')
  if (error) throw new Error(`태그 조회 실패: ${error.message}`)
  const map = new Map<string, string>()
  for (const r of data ?? []) if (r.slug) map.set(r.slug as string, r.id as string)
  return map
}

/**
 * 기존 음성 길이를 **사람 기준으로** 모은다.
 *
 * 음성 길이는 음성 파이프라인이 소유하고 사람이 입력하지 않는다(문서 §7). 그래서 저장할 때
 * 편집기가 보낸 값으로 덮지 않고 DB 값을 유지한다.
 *
 * ⚠ 단 **자리(순번) 기준으로 유지하면 안 된다.** 인물 순서를 바꾸면 음원 파일은 인물을 따라
 *   옮겨 가는데(음원 재배치 창구가 그렇게 한다) 길이를 자리에 붙여 두면 그 자리에 남는다.
 *   그러면 옮겨온 음원과 길이가 어긋나 컷 길이가 틀어진다 — 실측으로 잡은 결함이다.
 *   그래서 연결 키(slug), 없으면 이름을 사람의 신원으로 삼아 길이가 사람을 따라가게 한다.
 *
 * 같은 사람이 한 편에 두 번 나오는 경우가 실제로 있다(오디세우스). 그때는 같은 신원끼리
 * **나온 순서대로** 짝지어 준다 — 그 이상 가릴 단서가 데이터에 없다.
 *
 * numeric 컬럼은 PostgREST 가 문자열로 돌려주므로 숫자로 되돌린다.
 */
/* ────────────────────────── 되살리기 — 기존 트리 한 번 읽기 ────────────────────────── */

/**
 * 저장 전에 한 번 읽는 기존 트리. 음성 길이·도감 손질·세력 테마 되살리기가 전부 여기서 나온다.
 * 예전엔 세 되살리기가 각자 세력→장면→인물을 다시 읽어 저장 한 번에 7~8왕복이 들었다(왕복당 ≈110ms).
 * 계층은 PostgREST 중첩 임베드로 한 번에 받는다(`faction-db.ts` 의 factionTreeSource 와 같은 방식).
 */
export type ExistingTree = {
  episode: Row
  groups: Row[]
  clusters: Row[]
  people: Row[]
}

async function loadExistingTree(db: DatabaseClient, folder: string): Promise<ExistingTree | undefined> {
  const { data, error } = await db
    .from('faction_episodes')
    .select(
      'id,status,registered,sort_order,'
      + 'faction_groups(id,position,name,tag_id,'
      + 'faction_clusters(id,group_id,position,'
      + 'faction_people(cluster_id,position,is_person,celeb_id,slug,name,quote_duration,epithet_duration,'
      + 'web_long_desc,web_long_desc_en,web_image_url,web_quote_media,web_hidden)))',
    )
    .eq('folder', folder)
    .maybeSingle()
  if (error) throw new Error(`에피소드 조회 실패(${folder}): ${error.message}`)
  if (!data) return undefined

  // select 문자열을 이어 붙여 supabase-js 타입 파서가 모양을 못 읽는다 — 행 모양은 위 select 가 정한다.
  const { faction_groups: gs, ...episode } = data as unknown as { faction_groups?: Row[] } & Row
  const groups: Row[] = []
  const clusters: Row[] = []
  const people: Row[] = []
  for (const gRaw of gs ?? []) {
    const { faction_clusters: cs, ...g } = gRaw as { faction_clusters?: Row[] } & Row
    groups.push(g)
    for (const cRaw of cs ?? []) {
      const { faction_people: ps, ...c } = cRaw as { faction_people?: Row[] } & Row
      clusters.push(c)
      people.push(...(ps ?? []))
    }
  }
  return { episode, groups, clusters, people }
}

/** 인물의 신원 — 불변 UUID 우선, 옛 행만 slug·이름으로 보조한다. */
const identityOf = (p: { celebId?: unknown; celeb_id?: unknown; slug?: unknown; name?: unknown }): string => {
  const id = typeof p.celebId === 'string' && p.celebId
    ? p.celebId
    : typeof p.celeb_id === 'string' ? p.celeb_id : ''
  if (id) return `i:${id}`
  return (typeof p.slug === 'string' && p.slug) ? `s:${p.slug}` : `n:${String(p.name ?? '')}`
}

/**
 * 사람 행을 자리 순서(세력 position → 장면 position → 인물 position)로 줄 세운다.
 * 되살리기 셋이 같은 순서를 써야 같은 신원이 여러 번 나올 때 짝이 어긋나지 않는다.
 */
export function sortedPeopleOf(tree: Pick<ExistingTree, 'groups' | 'clusters' | 'people'>): Row[] {
  const gPos = new Map(tree.groups.map(g => [g.id as string, g.position as number]))
  const cOrder = new Map<string, number>()
  for (const c of tree.clusters) {
    const gi = gPos.get(c.group_id as string) ?? 0
    cOrder.set(c.id as string, gi * 1000 + (c.position as number))
  }
  return tree.people.filter(p => p.is_person !== false).sort((a, b) =>
    (cOrder.get(a.cluster_id as string) ?? 0) - (cOrder.get(b.cluster_id as string) ?? 0)
    || (a.position as number) - (b.position as number))
}

/** 같은 신원이 여러 번 나오면 나온 순서대로 짝짓는 조회기 — 들어오는 대본에서도 몇 번째 등장인지 세어 맞춘다. */
function pickerByIdentity<T>(rows: Row[], project: (row: Row) => T): (row: Row) => T | undefined {
  const byIdentity = new Map<string, T[]>()
  for (const p of rows) {
    const k = identityOf(p)
    if (!byIdentity.has(k)) byIdentity.set(k, [])
    byIdentity.get(k)!.push(project(p))
  }
  const seen = new Map<string, number>()
  return row => {
    const k = identityOf(row)
    const n = seen.get(k) ?? 0
    seen.set(k, n + 1)
    return byIdentity.get(k)?.[n]
  }
}

type Durations = { quoteDuration: number | null; epithetDuration: number | null }

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : typeof v === 'string' ? Number(v) : (v as number)

/** 음성 길이는 파이프라인 소유 값이라 편집기가 보내지 않는다 — 기존 행에서 신원 기준으로 되싣는다. */
export function durationLookupOf(tree: Pick<ExistingTree, 'groups' | 'clusters' | 'people'>): DurationLookup {
  const pick = pickerByIdentity<Durations>(sortedPeopleOf(tree), p => ({
    quoteDuration: num(p.quote_duration),
    epithetDuration: num(p.epithet_duration),
  }))
  return (_gi, _ci, _pi, person) => {
    const hit = pick(person as unknown as Row)
    if (!hit) return undefined
    return {
      quoteDuration: hit.quoteDuration ?? undefined,
      epithetDuration: hit.epithetDuration ?? undefined,
    }
  }
}

/**
 * 도감 손질(web_*) 칸 — 대본 저장이 인물 행을 전량 갈아끼우므로, 기존 값을 **사람 신원 기준으로**
 * 모아 새 행에 되싣는다. 반환 함수는 새 인물 행(slug·name 컬럼 보유)을 받아 짝지어진 기존 손질을 돌려준다.
 */
type WebOverride = {
  web_long_desc: string | null
  web_long_desc_en: string | null
  web_image_url: string | null
  web_quote_media: unknown
  web_hidden: boolean
}

export function webOverrideLookupOf(
  tree: Pick<ExistingTree, 'groups' | 'clusters' | 'people'>,
): (personRow: Row) => WebOverride | undefined {
  return pickerByIdentity<WebOverride>(sortedPeopleOf(tree), p => ({
    web_long_desc: (p.web_long_desc as string | null) ?? null,
    web_long_desc_en: (p.web_long_desc_en as string | null) ?? null,
    web_image_url: (p.web_image_url as string | null) ?? null,
    web_quote_media: p.web_quote_media ?? null,
    web_hidden: p.web_hidden === true,
  }))
}

/**
 * 세력이 걸려 있던 도감 테마를 **세력 이름 기준으로** 모은다.
 *
 * 자리(순번) 기준이면 세력 순서를 바꿨을 때 테마가 엉뚱한 세력을 따라간다. 이름이 같은 세력이
 * 한 편에 둘 있는 경우(도감용으로 따로 세운 자리 등)에는 나온 순서대로 짝지어 준다 —
 * 음성 길이·도감 손질과 같은 짝짓기 규칙이다.
 */
export function groupTagLookupOf(tree: Pick<ExistingTree, 'groups'>): (groupRow: Row) => string | undefined {
  const rows = tree.groups
    .filter(r => !!r.tag_id)
    .sort((a, b) => (a.position as number) - (b.position as number))

  const nameOf = (r: { name?: unknown }) =>
    typeof r.name === 'string' ? r.name.split('\n')[0].trim() : ''

  const byName = new Map<string, string[]>()
  for (const r of rows) {
    const k = nameOf(r)
    if (!byName.has(k)) byName.set(k, [])
    byName.get(k)!.push(r.tag_id as string)
  }

  const seen = new Map<string, number>()
  return groupRow => {
    const k = nameOf(groupRow)
    const n = seen.get(k) ?? 0
    seen.set(k, n + 1)
    return byName.get(k)?.[n]
  }
}

/** 편별 고정 댓글 — 편집기가 보내지 않으므로 저장 때 그대로 실어 보내 보존한다. 별도 표라 한 번 더 읽는다. */
async function loadExistingParts(
  db: DatabaseClient, episodeId: string,
): Promise<{ part: number; comment: string }[]> {
  const { data, error } = await db
    .from('faction_episode_parts').select('part,comment').eq('episode_id', episodeId)
  if (error) throw new Error(`편별 댓글 조회 실패: ${error.message}`)
  return (data ?? [])
    .map(r => ({ part: r.part as number, comment: (r.comment as string) ?? '' }))
    .sort((a, b) => a.part - b.part)
}
