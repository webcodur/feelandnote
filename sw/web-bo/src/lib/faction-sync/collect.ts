/**
 * 출간 대상 모으기 — **DB 에서** 한 편의 세력·인물·사진을 출간용 한 벌 모형으로 펴낸다. 서버 전용, 읽기만 한다.
 *
 * 예전에는 로컬 JSON(faction-data.json)을 읽었다. 이제 글과 구성의 원본은 DB 이므로(문서 §0)
 * 여기서도 DB 를 읽는다. 다만 **사진은 여전히 로컬 파일**이다 — 2,245장을 DB 로 옮기지 않기로 했고,
 * 인물·묶음의 `image` 값은 렌더 저장소 폴더 안의 경로다.
 *
 * 대본 조립기(`assembleFactionEpisode`)를 쓰지 않는 이유: 조립기는 `faction-data.json` 모양을 만드므로
 * `tag_id`·`celeb_id`(해소된 열쇠)를 결과에 담지 않는다. 출간은 바로 그 두 열쇠가 본체다.
 */

import { readFile } from 'fs/promises'
import path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { IN_CHUNK } from '@feelandnote/shared/lib/faction-assemble'
import { safeRelSegs } from '@feelandnote/shared/bo/episode-store'
import { factionEpisodeDir } from '@/lib/faction-paths'
import { fileHash } from './manifest'

type Row = Record<string, unknown>

/* ── 모형 ── */

/** 데이터에 적힌 이미지 한 장 — 로컬 파일이면 상대·절대경로를, 외부 주소면 external 을 세운다 */
export interface LocalImageRef {
  /** 데이터에 적힌 값 그대로 */
  raw: string
  /** http(s) 주소 — 올릴 로컬 파일이 아니다 */
  external: boolean
  /** 에피소드 폴더 기준 상대경로 (external 이면 빈 문자열) */
  rel: string
  /** 파일 절대경로 (external 이면 빈 문자열) */
  abs: string
}

/** 인물의 자리 — (세력, 묶음, 인물) 순번. 배치 충돌 규칙(§4)의 비교 키다 */
export type Placement = readonly [number, number, number]

export interface PublishPerson {
  /** faction_people.id */
  id: string
  name: string
  /** 연결 키 */
  slug?: string
  /** 해소된 셀럽 id — null 이면 미해소(출간 불가) */
  celebId: string | null
  mythical: boolean
  place: Placement
  /**
   * 태그 안 등장 순번 — assignments.sort_order 로 그대로 들어간다.
   * 한 태그를 여러 세력이 나눠 쓰는 편(페이팔 마피아 4세력 → 태그 1개)이 있으므로
   * 세력별 0부터가 아니라 태그를 관통하는 전역 일련번호다(세력 → 묶음 → 인물 순).
   */
  order: number
  shortDesc?: string
  longDesc?: string
  shortDescEn?: string
  longDescEn?: string
  image?: LocalImageRef
}

export interface PublishGroup {
  /** faction_groups.id — 태그 연결(tag_id)을 되쓸 때 필요하다 */
  id: string
  /** faction_groups.position (1-based) */
  position: number
  /** groups[] 인덱스(= position - 1). 화면·요청이 쓰는 번호 */
  index: number
  /** 세력 명칭 첫 줄 */
  name: string
  /** 세력 명칭 영문 첫 줄 */
  nameEn?: string
  color?: string
  /** 해소된 태그 id — null 이면 미지정 */
  tagId: string | null
  /** 데이터에 적힌 태그 연결 키(data.tagSlug) */
  tagSlug: string | null
  /** 세력 폴더(NN-<slug>)에서 뽑은 제안 연결 키 */
  suggestedSlug: string
  people: PublishPerson[]
  /** 그룹샷 — num 은 묶음 번호(1부터). R2 키에 세력 번호와 함께 g01c01 로 들어간다 */
  teamShots: { num: number; image: LocalImageRef }[]
}

export interface PublishEpisode {
  folder: string
  episodeId: string
  groups: PublishGroup[]
}

/* ── 값 다듬기 ── */

/** 통합 필드(첫 줄=명칭, 나머지=설명)에서 첫 줄만 */
function firstLine(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const s = v.split('\n')[0].trim()
  return s || undefined
}

/** 슬러그화 — 영문·숫자만 남긴다. 한글만으로 된 이름은 빈 문자열이 되어 제안값이 없음을 뜻한다 */
function slugify(v: string | undefined): string {
  return (v ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * 이미지 경로 해석 — 세 가지 표기를 모두 받는다.
 *   http(s) 주소   → 외부(업로드 대상 아님)
 *   슬래시 포함     → factions/<에피소드>/<경로>
 *   파일명만        → factions/<에피소드>/images/<파일명>
 */
export function resolveImageRef(folder: string, raw: unknown): LocalImageRef | undefined {
  const value = typeof raw === 'string' ? raw.trim() : ''
  if (!value) return undefined
  if (/^https?:\/\//i.test(value)) return { raw: value, external: true, rel: '', abs: '' }
  const segs = safeRelSegs(value)
  if (!segs.length) return undefined
  const relSegs = value.includes('/') ? segs : ['images', segs[segs.length - 1]]
  return {
    raw: value,
    external: false,
    rel: relSegs.join('/'),
    abs: path.join(factionEpisodeDir(folder), ...relSegs),
  }
}

/** 세력 폴더명(01a-declarers)에서 슬러그 추출 — 앞 번호와 구분자를 떼낸다 */
function slugFromFolder(folder: string): string {
  return slugify(folder.replace(/^\d+[a-z]*[-_]?/i, ''))
}

/**
 * 이 세력의 폴더 이름 — 인물·그룹샷 이미지 경로의 첫 토막에서 뽑는다.
 * 폴더 순서와 세력 순서가 어긋난 편(AI-Supremacy: 8번째 세력이 11-huggingface)이 실재하므로
 * 번호 대조는 쓰지 않는다. 가장 많이 등장한 첫 토막을 그 세력의 폴더로 본다.
 */
function folderOfGroup(refs: (LocalImageRef | undefined)[]): string | undefined {
  const count = new Map<string, number>()
  for (const r of refs) {
    if (!r || r.external) continue
    const head = r.rel.split('/')[0]
    if (!head || head === 'images') continue
    count.set(head, (count.get(head) ?? 0) + 1)
  }
  let best: string | undefined
  let bestN = 0
  for (const [f, n] of count) if (n > bestN) { best = f; bestN = n }
  return best
}

/** 문자열 배열 컬럼(lines·lines_en) 정리 */
function textArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map(x => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
}

/** 인물의 소개문 재료 — 수식어 우선, 없으면 직함 첫 줄. 긴 소개문은 직함 2·3줄을 잇는다 */
function descsOf(p: Row) {
  const lines = textArray(p.lines)
  const linesEn = textArray(p.lines_en)
  const epithet = typeof p.epithet === 'string' ? p.epithet.trim() : ''
  const epithetEn = typeof p.epithet_en === 'string' ? p.epithet_en.trim() : ''
  return {
    shortDesc: epithet || lines[0] || undefined,
    longDesc: lines.slice(1, 3).join(', ') || undefined,
    shortDescEn: epithetEn || linesEn[0] || undefined,
    longDescEn: linesEn.slice(1, 3).join(', ') || undefined,
  }
}

/* ── DB 읽기 ── */

/** `.in()` 청크 조회 — 462개를 단일 in() 에 실어 실패한 실측 이력이 있어 200 으로 끊는다 */
async function inChunks(
  db: SupabaseClient, table: string, col: string, values: string[], select: string,
): Promise<Row[]> {
  const out: Row[] = []
  for (let i = 0; i < values.length; i += IN_CHUNK) {
    const { data, error } = await db.from(table).select(select).in(col, values.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    out.push(...((data ?? []) as unknown as Row[]))
  }
  return out
}

const GROUP_SELECT = 'id, position, name, name_en, color, tag_id, data'
const CLUSTER_SELECT = 'id, group_id, position, image'
const PERSON_SELECT = 'id, cluster_id, position, name, slug, celeb_id, mythical, epithet, epithet_en, lines, lines_en, image'

const byPosition = (a: Row, b: Row) => (a.position as number) - (b.position as number)

/**
 * 한 편의 출간 대상을 DB 에서 모은다.
 *
 * 인물 순서는 자리 순서(세력 → 묶음 → 인물)를 그대로 쓴다. 영상에서 빼둔 항목(disabled)도 포함한다 —
 * 그 표시는 영상 노출 여부일 뿐이고 도감은 제작 데이터를 정본으로 삼는다.
 */
export async function collectEpisode(db: SupabaseClient, folder: string): Promise<PublishEpisode> {
  const { data: epRow, error: epErr } = await db
    .from('faction_episodes').select('id').eq('folder', folder).maybeSingle()
  if (epErr) throw new Error(`에피소드 조회 실패(${folder}): ${epErr.message}`)
  if (!epRow) throw new Error(`에피소드를 찾을 수 없습니다: ${folder}`)
  const episodeId = epRow.id as string

  const { data: gData, error: gErr } = await db
    .from('faction_groups').select(GROUP_SELECT).eq('episode_id', episodeId)
  if (gErr) throw new Error(`세력 조회 실패(${folder}): ${gErr.message}`)
  const groupRows = ((gData ?? []) as unknown as Row[]).sort(byPosition)

  const clusterRows = groupRows.length
    ? await inChunks(db, 'faction_clusters', 'group_id', groupRows.map(g => g.id as string), CLUSTER_SELECT)
    : []
  const personRows = clusterRows.length
    ? await inChunks(db, 'faction_people', 'cluster_id', clusterRows.map(c => c.id as string), PERSON_SELECT)
    : []

  const clustersByGroup = new Map<string, Row[]>()
  for (const c of clusterRows) {
    const k = c.group_id as string
    if (!clustersByGroup.has(k)) clustersByGroup.set(k, [])
    clustersByGroup.get(k)!.push(c)
  }
  for (const arr of clustersByGroup.values()) arr.sort(byPosition)

  const peopleByCluster = new Map<string, Row[]>()
  for (const p of personRows) {
    const k = p.cluster_id as string
    if (!peopleByCluster.has(k)) peopleByCluster.set(k, [])
    peopleByCluster.get(k)!.push(p)
  }
  for (const arr of peopleByCluster.values()) arr.sort(byPosition)

  const groups: PublishGroup[] = groupRows.map((g, index) => {
    const data = (g.data ?? {}) as Row
    const clusters = clustersByGroup.get(g.id as string) ?? []

    const people: PublishPerson[] = []
    clusters.forEach((c, ci) => {
      for (const [pi, p] of (peopleByCluster.get(c.id as string) ?? []).entries()) {
        people.push({
          id: p.id as string,
          name: (p.name as string) ?? '',
          slug: typeof p.slug === 'string' && p.slug.trim() ? p.slug.trim() : undefined,
          celebId: (p.celeb_id as string | null) ?? null,
          mythical: p.mythical === true,
          place: [index, ci, pi] as const,
          order: 0, // assignTagOrder 가 태그 관통 번호로 다시 매긴다
          ...descsOf(p),
          image: resolveImageRef(folder, p.image),
        })
      }
    })

    // 묶음이 없는 세력은 세력 화보(data.image)가 유일한 그룹샷이다 — 1번 묶음으로 취급
    const teamRaw: unknown[] = clusters.length ? clusters.map(c => c.image) : [data.image]
    const teamShots = teamRaw
      .map((raw, i) => ({ num: i + 1, image: resolveImageRef(folder, raw) }))
      .filter((t): t is { num: number; image: LocalImageRef } => !!t.image)

    const imgFolder = folderOfGroup([...people.map(p => p.image), ...teamShots.map(t => t.image)])
    const nameEn = firstLine(g.name_en)
    const suggestedSlug = (imgFolder && slugFromFolder(imgFolder)) || slugify(nameEn) || slugify(firstLine(g.name))
    const tagSlug = typeof data.tagSlug === 'string' && data.tagSlug.trim() ? data.tagSlug.trim() : null

    return {
      id: g.id as string,
      position: g.position as number,
      index,
      name: firstLine(g.name) ?? `세력 ${index + 1}`,
      nameEn,
      color: typeof g.color === 'string' && g.color.trim() ? g.color.trim() : undefined,
      tagId: (g.tag_id as string | null) ?? null,
      tagSlug,
      suggestedSlug,
      people,
      teamShots,
    }
  })

  assignTagOrder(groups)
  return { folder, episodeId, groups }
}

/**
 * 순번(sort_order)을 태그 단위 전역 일련번호로 매긴다 — 세력 → 묶음 → 인물 순.
 * 세력별 0부터 매기면 한 태그를 나눠 쓰는 뒤 세력이 앞 세력의 순번을 그대로 덮어써
 * 도감 인물 순서가 뒤엉킨다(페이팔 마피아 4세력 → 태그 1개).
 * 태그가 없는 세력은 서로 섞이지 않게 세력별로 따로 센다.
 */
export function assignTagOrder(groups: PublishGroup[]): void {
  const seq = new Map<string, number>()
  for (const g of groups) {
    const key = tagKeyOf(g)
    let n = seq.get(key) ?? 0
    for (const p of g.people) { p.order = n; n += 1 }
    seq.set(key, n)
  }
}

/**
 * 태그 묶음 열쇠 — 같은 태그를 나눠 쓰는 세력끼리 한 묶음으로 묶는 기준.
 *
 * **연결 키(tagSlug)를 먼저 본다.** `tag_id` 는 연결 키에서 파생된 값이라, 한쪽 세력만 이어져 있고
 * 다른 쪽은 아직 null 인 상태가 실제로 생긴다(태그가 없던 때 저장한 편). 그때 `tag_id` 로 묶으면
 * 두 세력이 남남이 되어 도감 단체사진 배열을 한쪽 몫만으로 갈아끼우는 사고가 난다.
 */
export function tagKeyOf(g: PublishGroup): string {
  if (g.tagSlug) return `slug:${g.tagSlug}`
  if (g.tagId) return `id:${g.tagId}`
  return `#${g.index}`
}

/** 이 태그를 함께 쓰는 세력들 — 태그 단위로 다뤄야 하는 항목(team_images·배치 충돌)의 대상 */
export function groupsOfSameTag(episode: PublishEpisode, target: PublishGroup): PublishGroup[] {
  const key = tagKeyOf(target)
  return episode.groups.filter(g => tagKeyOf(g) === key)
}

/**
 * 배치 충돌 규칙(§4) — 같은 셀럽이 한 태그 안 여러 자리에 있으면 **자리가 가장 앞인** 배치만 채택한다.
 * `celeb_tag_assignments` 는 (셀럽, 태그) 하나뿐이라 뒤 배치가 앞 배치를 덮어쓰기 때문이다.
 *
 * 세력을 하나씩 출간해도 결과가 같아야 하므로 판정은 **편 전체**를 보고 한다.
 * @returns `${tagKey}:${celebId}` → 채택된 인물의 faction_people.id
 */
export function winningPlacements(episode: PublishEpisode): Map<string, string> {
  const best = new Map<string, { id: string; place: Placement }>()
  for (const g of episode.groups) {
    const key = tagKeyOf(g)
    for (const p of g.people) {
      if (!p.celebId) continue
      const k = `${key}:${p.celebId}`
      const cur = best.get(k)
      if (!cur || comparePlace(p.place, cur.place) < 0) best.set(k, { id: p.id, place: p.place })
    }
  }
  const out = new Map<string, string>()
  for (const [k, v] of best) out.set(k, v.id)
  return out
}

function comparePlace(a: Placement, b: Placement): number {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
}

/** 개인샷 R2 키 — 고정 키(덮어쓰기) */
export function soloShotKey(tagId: string, celebId: string): string {
  return `spotlight/${tagId}/celeb-${celebId}.webp`
}

/**
 * 그룹샷 R2 키 — 세력 번호 + 묶음 번호(각 2자리) + 원본 해시 8자. 사진이 바뀌면 키가 갈린다.
 * 세력 번호를 넣는 이유: 한 태그를 여러 세력이 나눠 쓰면 묶음 번호만으로는 서로 겹쳐
 * 다른 세력의 그룹샷을 덮어쓴다(페이팔 마피아 4세력 → 태그 1개).
 */
export function teamShotKey(tagId: string, groupNum: number, clusterNum: number, hash: string): string {
  const g = String(groupNum).padStart(2, '0')
  const c = String(clusterNum).padStart(2, '0')
  return `spotlight/${tagId}/team/g${g}c${c}-${hash}.webp`
}

/** 로컬 파일 해시 — 파일이 없으면 null */
export async function hashOfFile(abs: string): Promise<string | null> {
  try { return fileHash(await readFile(abs)) }
  catch { return null }
}
