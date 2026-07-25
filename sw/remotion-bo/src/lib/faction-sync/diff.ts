/**
 * 출간 진단 — 로컬 팩션 데이터를 본서비스 DB·R2 기록과 대조한다. 서버 전용, 읽기만 한다.
 *
 * 로컬 원본을 한 벌 모형(LocalEpisode)으로 펴는 collectEpisode() 는 출간(publish.ts)도 같이 쓴다.
 * DB 조회는 인물마다 하지 않고 에피소드 전체를 한 번에 긁는다(프로필·태그·배정 각 1~2회).
 */

import { readFile } from 'fs/promises'
import path from 'path'
import { FACTIONS_DIR, loadFactionEpisode } from '@/lib/faction-utils'
import { episodeDirOf, safeRelSegs } from '@feelandnote/shared/bo/episode-store'
import type { FactionCluster, FactionGroup, FactionPerson } from '@/lib/faction-types'
import { adminClient, toImageArray, type CelebAssignmentRow, type CelebProfileRow, type CelebTagRow } from './supabase'
import { fileHash, readManifest, type FactionSyncManifest } from './manifest'
import type {
  FactionSyncDescState,
  FactionSyncGroup,
  FactionSyncPerson,
  FactionSyncSoloShotState,
  FactionSyncStatus,
} from './types'

/* ── 로컬 모형 ── */

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

export interface LocalPerson {
  name: string
  celebId?: string
  slug?: string
  mythical?: boolean
  /**
   * 태그 안 등장 순번 — assignments.sort_order 로 그대로 들어간다.
   * 한 태그를 여러 세력이 나눠 쓰는 에피소드(페이팔 마피아 4세력 → 태그 1개)가 있으므로
   * 세력별 0부터가 아니라 태그를 관통하는 전역 일련번호다(세력 순서 → 클러스터 → 인물).
   */
  order: number
  shortDesc?: string
  longDesc?: string
  shortDescEn?: string
  longDescEn?: string
  image?: LocalImageRef
}

export interface LocalGroup {
  index: number
  /** 세력 명칭 첫 줄 */
  name: string
  /** 세력 명칭 영문 첫 줄 */
  nameEn?: string
  color?: string
  tagSlug: string | null
  suggestedSlug: string
  people: LocalPerson[]
  /** 그룹샷 — num 은 클러스터 번호(1부터). R2 키에 세력 번호와 함께 g01c01 로 들어간다 */
  teamShots: { num: number; image: LocalImageRef }[]
}

export interface LocalEpisode {
  episode: string
  groups: LocalGroup[]
}

/* ── 값 다듬기 ── */

/** 통합 필드(첫 줄=명칭, 나머지=설명)에서 첫 줄만 */
function firstLine(v: string | undefined): string | undefined {
  const s = v?.split('\n')[0].trim()
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
export function resolveImageRef(episode: string, raw: string | undefined): LocalImageRef | undefined {
  const value = raw?.trim()
  if (!value) return undefined
  if (/^https?:\/\//i.test(value)) return { raw: value, external: true, rel: '', abs: '' }
  const segs = safeRelSegs(value)
  if (!segs.length) return undefined
  const relSegs = value.includes('/') ? segs : ['images', segs[segs.length - 1]]
  return {
    raw: value,
    external: false,
    rel: relSegs.join('/'),
    abs: path.join(episodeDirOf(FACTIONS_DIR, episode), ...relSegs),
  }
}

/** 세력 폴더명(01a-declarers)에서 슬러그 추출 — 앞 번호와 구분자를 떼낸다 */
function slugFromFolder(folder: string): string {
  return slugify(folder.replace(/^\d+[a-z]*[-_]?/i, ''))
}

/**
 * 이 세력의 폴더 이름 — 인물·그룹샷 이미지 경로의 첫 토막에서 뽑는다.
 * 폴더 순서와 groups[] 순서가 어긋난 에피소드(AI-Supremacy: 8번째 세력이 11-huggingface)가
 * 실재하므로 인덱스 대조는 쓰지 않는다. 가장 많이 등장한 첫 토막을 그 세력의 폴더로 본다.
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
  for (const [folder, n] of count) if (n > bestN) { best = folder; bestN = n }
  return best
}

/** 인물의 소개문 재료 — 수식어 우선, 없으면 직함 첫 줄. 긴 소개문은 직함 2·3줄을 잇는다 */
function descsOf(p: FactionPerson) {
  const lines = (p.lines ?? []).map(l => l.trim()).filter(Boolean)
  const linesEn = (p.linesEn ?? []).map(l => l.trim()).filter(Boolean)
  return {
    shortDesc: p.epithet?.trim() || lines[0] || undefined,
    longDesc: lines.slice(1, 3).join(', ') || undefined,
    shortDescEn: p.epithetEn?.trim() || linesEn[0] || undefined,
    longDescEn: linesEn.slice(1, 3).join(', ') || undefined,
  }
}

/**
 * 로컬 에피소드를 출간용 한 벌 모형으로 펴낸다.
 *
 * 인물 순서는 데이터 배열 순서(세력 → 클러스터 → 인물)를 그대로 쓴다.
 * 영상에서 빼둔 항목(disabled)도 포함한다 — 그 표시는 영상 노출 여부일 뿐이고
 * 도감은 로컬 데이터를 정본으로 삼는다.
 */
export async function collectEpisode(episode: string): Promise<LocalEpisode> {
  const script = await loadFactionEpisode(episode)
  const groups: LocalGroup[] = (script.groups ?? []).map((g: FactionGroup, index: number) => {
    const clusters: FactionCluster[] = g.clusters ?? []
    const rawPeople: FactionPerson[] = clusters.length
      ? clusters.flatMap(c => c.people ?? [])
      : (g.people ?? [])

    const people: LocalPerson[] = rawPeople.map((p, order) => ({
      name: p.name,
      celebId: p.celebId?.trim() || undefined,
      slug: p.slug?.trim() || undefined,
      mythical: p.mythical,
      order,
      ...descsOf(p),
      image: resolveImageRef(episode, p.image),
    }))

    // 그룹을 나누지 않은 세력은 세력 화보(group.image)가 유일한 그룹샷이다 — 1번 클러스터로 취급
    const teamRaw: (string | undefined)[] = clusters.length ? clusters.map(c => c.image) : [g.image]
    const teamShots = teamRaw
      .map((raw, i) => ({ num: i + 1, image: resolveImageRef(episode, raw) }))
      .filter((t): t is { num: number; image: LocalImageRef } => !!t.image)

    const folder = folderOfGroup([...people.map(p => p.image), ...teamShots.map(t => t.image)])
    const nameEn = firstLine(g.nameEn)
    const suggestedSlug = (folder && slugFromFolder(folder)) || slugify(nameEn) || slugify(firstLine(g.name))

    return {
      index,
      name: firstLine(g.name) ?? `세력 ${index + 1}`,
      nameEn,
      color: g.color?.trim() || undefined,
      tagSlug: g.tagSlug?.trim() || null,
      suggestedSlug,
      people,
      teamShots,
    }
  })

  assignTagOrder(groups)
  return { episode, groups }
}

/**
 * 순번(sort_order)을 태그 단위 전역 일련번호로 매긴다 — 세력 순서 → 클러스터 → 인물.
 * 세력별 0부터 매기면 한 태그를 나눠 쓰는 뒤 세력이 앞 세력의 순번을 그대로 덮어써
 * 도감 인물 순서가 뒤엉킨다(페이팔 마피아 4세력 → 태그 1개).
 * tagSlug 가 없는 세력은 서로 섞이지 않게 세력별로 따로 센다.
 */
export function assignTagOrder(groups: LocalGroup[]): void {
  const seq = new Map<string, number>()
  for (const g of groups) {
    const key = g.tagSlug ?? `#${g.index}`
    let n = seq.get(key) ?? 0
    for (const p of g.people) { p.order = n; n += 1 }
    seq.set(key, n)
  }
}

/** 이 태그를 함께 쓰는 세력들 — 태그 단위로 다뤄야 하는 항목(team_images·순번)의 대상 */
export function groupsOfTag(local: LocalEpisode, tagSlug: string): LocalGroup[] {
  return local.groups.filter(g => g.tagSlug === tagSlug)
}

/* ── DB 조회 ── */

export interface DbSnapshot {
  /** slug → 태그 행 */
  tagsBySlug: Map<string, CelebTagRow>
  /** `${tagId}:${celebId}` → 배정 행 */
  assignments: Map<string, CelebAssignmentRow>
  /** profiles.id → 프로필 */
  profilesById: Map<string, CelebProfileRow>
  /** profiles.slug → 프로필 */
  profilesBySlug: Map<string, CelebProfileRow>
}

const PROFILE_COLUMNS = 'id, slug, nickname, avatar_url, celeb_tier, profile_type, status'
const TAG_COLUMNS = 'id, slug, name, name_en, color, team_images, is_featured, sort_order'
const ASSIGNMENT_COLUMNS = 'id, tag_id, celeb_id, short_desc, long_desc, short_desc_en, long_desc_en, spotlight_image_url, sort_order'

/**
 * 에피소드 전체를 한 번에 조회한다 — 태그 1회, 배정 1회, 프로필 2회(id·slug).
 * 인물마다 조회하면 수십 번이 되므로 목록(in) 으로 묶는다.
 */
export async function loadDbSnapshot(local: LocalEpisode): Promise<DbSnapshot> {
  const sb = adminClient()

  const tagSlugs = [...new Set(local.groups.map(g => g.tagSlug).filter((s): s is string => !!s))]
  const celebIds = [...new Set(local.groups.flatMap(g => g.people.map(p => p.celebId).filter((v): v is string => !!v)))]
  const slugs = [...new Set(local.groups.flatMap(g => g.people.map(p => p.slug).filter((v): v is string => !!v)))]

  const tagsBySlug = new Map<string, CelebTagRow>()
  if (tagSlugs.length) {
    const { data, error } = await sb.from('celeb_tags').select(TAG_COLUMNS).in('slug', tagSlugs)
    if (error) throw new Error(`celeb_tags 조회 실패: ${error.message}`)
    for (const row of (data ?? []) as CelebTagRow[]) if (row.slug) tagsBySlug.set(row.slug, row)
  }

  const assignments = new Map<string, CelebAssignmentRow>()
  const tagIds = [...tagsBySlug.values()].map(t => t.id)
  if (tagIds.length) {
    const { data, error } = await sb.from('celeb_tag_assignments').select(ASSIGNMENT_COLUMNS).in('tag_id', tagIds)
    if (error) throw new Error(`celeb_tag_assignments 조회 실패: ${error.message}`)
    for (const row of (data ?? []) as CelebAssignmentRow[]) assignments.set(`${row.tag_id}:${row.celeb_id}`, row)
  }

  const profilesById = new Map<string, CelebProfileRow>()
  const profilesBySlug = new Map<string, CelebProfileRow>()
  const remember = (rows: CelebProfileRow[]) => {
    for (const row of rows) {
      profilesById.set(row.id, row)
      if (row.slug) profilesBySlug.set(row.slug, row)
    }
  }
  if (celebIds.length) {
    const { data, error } = await sb.from('profiles').select(PROFILE_COLUMNS).in('id', celebIds)
    if (error) throw new Error(`profiles(id) 조회 실패: ${error.message}`)
    remember((data ?? []) as CelebProfileRow[])
  }
  if (slugs.length) {
    const { data, error } = await sb.from('profiles').select(PROFILE_COLUMNS).in('slug', slugs)
    if (error) throw new Error(`profiles(slug) 조회 실패: ${error.message}`)
    remember((data ?? []) as CelebProfileRow[])
  }

  return { tagsBySlug, assignments, profilesById, profilesBySlug }
}

/**
 * 인물 → DB 프로필 해석. celebId(불변 UUID) 가 먼저고, 없으면 slug 로 찾는다.
 * 둘 다 없으면 unkeyed — 데이터에 열쇠가 없어 출간할 수 없다.
 */
export function resolveProfile(
  person: LocalPerson,
  db: DbSnapshot,
): { state: 'linked'; celebId: string; profile: CelebProfileRow } | { state: 'missing' | 'unkeyed' } {
  if (person.celebId) {
    const byId = db.profilesById.get(person.celebId)
    if (byId) return { state: 'linked', celebId: byId.id, profile: byId }
  }
  if (person.slug) {
    const bySlug = db.profilesBySlug.get(person.slug)
    if (bySlug) return { state: 'linked', celebId: bySlug.id, profile: bySlug }
  }
  return { state: person.celebId || person.slug ? 'missing' : 'unkeyed' }
}

/** 개인샷 R2 키 — 고정 키(덮어쓰기) */
export function soloShotKey(tagId: string, celebId: string): string {
  return `spotlight/${tagId}/celeb-${celebId}.webp`
}

/**
 * 그룹샷 R2 키 — 세력 번호 + 클러스터 번호(각 2자리) + 원본 해시 8자. 사진이 바뀌면 키가 갈린다.
 * 세력 번호를 넣는 이유: 한 태그를 여러 세력이 나눠 쓰면 클러스터 번호만으로는 서로 겹쳐
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

/* ── 진단 ── */

function descStateOf(person: LocalPerson, assignment: CelebAssignmentRow | undefined): FactionSyncDescState {
  const dbHas = !!(assignment?.short_desc?.trim() || assignment?.long_desc?.trim())
  if (dbHas) return 'db'
  const localHas = !!(person.shortDesc || person.longDesc || person.shortDescEn || person.longDescEn)
  return localHas ? 'fillable' : 'none'
}

function soloShotStateOf(
  hash: string | null,
  dbUrl: string | null | undefined,
  expectedKey: string | null,
  tagId: string | null,
  manifest: FactionSyncManifest,
  rel: string,
): FactionSyncSoloShotState {
  const hasDb = !!dbUrl?.trim()
  if (!hash) return hasDb ? 'db-only' : 'none'
  if (!hasDb) return 'local-only'
  const entry = manifest[rel]
  const same = !!entry && entry.hash === hash && (!expectedKey || entry.r2Key === expectedKey) && (!tagId || entry.tagId === tagId)
  return same ? 'synced' : 'stale'
}

/** 에피소드 진단 — 세력·인물 전수를 DB·R2 기록과 대조한 읽기 전용 보고 */
export async function buildStatus(episode: string): Promise<FactionSyncStatus> {
  const local = await collectEpisode(episode)
  const [db, manifest] = await Promise.all([loadDbSnapshot(local), readManifest(episode)])

  const groups: FactionSyncGroup[] = []
  for (const g of local.groups) {
    const tag = g.tagSlug ? db.tagsBySlug.get(g.tagSlug) : undefined
    const tagId = tag?.id ?? null

    const people: FactionSyncPerson[] = []
    for (const p of g.people) {
      const resolved = resolveProfile(p, db)
      const celebId = resolved.state === 'linked' ? resolved.celebId : undefined
      const assignment = tagId && celebId ? db.assignments.get(`${tagId}:${celebId}`) : undefined
      const hash = p.image && !p.image.external ? await hashOfFile(p.image.abs) : null
      people.push({
        name: p.name,
        celebId: p.celebId,
        slug: p.slug,
        mythical: p.mythical,
        profile: resolved.state,
        assigned: !!assignment,
        desc: descStateOf(p, assignment),
        soloShot: soloShotStateOf(
          hash,
          assignment?.spotlight_image_url,
          tagId && celebId ? soloShotKey(tagId, celebId) : null,
          tagId,
          manifest,
          p.image?.rel ?? '',
        ),
        avatar: resolved.state === 'linked' ? !!resolved.profile.avatar_url : false,
        tier: resolved.state === 'linked' ? resolved.profile.celeb_tier ?? undefined : undefined,
      })
    }

    let teamLocal = 0
    let teamMatched = 0
    for (const shot of g.teamShots) {
      if (shot.image.external) continue
      const hash = await hashOfFile(shot.image.abs)
      if (!hash) continue
      teamLocal += 1
      const entry = manifest[shot.image.rel]
      const expected = tagId ? teamShotKey(tagId, g.index + 1, shot.num, hash) : null
      if (entry && entry.hash === hash && (!expected || entry.r2Key === expected)) teamMatched += 1
    }

    groups.push({
      index: g.index,
      name: g.name,
      tagSlug: g.tagSlug,
      suggestedSlug: g.suggestedSlug,
      tag: {
        exists: !!tag,
        id: tag?.id,
        name: tag?.name,
        isFeatured: tag?.is_featured ?? undefined,
        teamImagesCount: toImageArray(tag?.team_images).length,
      },
      // tagTotal 은 아래에서 태그 단위로 합산해 채운다
      teamShots: { local: teamLocal, matched: teamMatched, tagTotal: teamLocal },
      people,
    })
  }

  // team_images 는 태그 단위 배열이다 — 태그를 나눠 쓰는 세력들의 로컬 장수 합을 함께 실어
  // 화면이 "이 세력 1장인데 DB는 4장"을 어긋남으로 오해하지 않게 한다.
  const localByTag = new Map<string, number>()
  for (const g of groups) {
    if (!g.tagSlug) continue
    localByTag.set(g.tagSlug, (localByTag.get(g.tagSlug) ?? 0) + g.teamShots.local)
  }
  for (const g of groups) {
    if (g.tagSlug) g.teamShots.tagTotal = localByTag.get(g.tagSlug) ?? g.teamShots.local
  }

  const allPeople = groups.flatMap(g => g.people)
  return {
    episode,
    groups,
    summary: {
      groups: groups.length,
      groupsUnlinked: groups.filter(g => !g.tagSlug).length,
      people: allPeople.length,
      publishable: allPeople.filter(p => p.profile === 'linked').length,
      blocked: allPeople.filter(p => p.profile !== 'linked').length,
      unassigned: allPeople.filter(p => p.profile === 'linked' && !p.assigned).length,
      descFillable: allPeople.filter(p => p.desc === 'fillable').length,
      soloShotPending: allPeople.filter(p => p.soloShot === 'stale' || p.soloShot === 'local-only').length,
      teamShotPending: groups.reduce((s, g) => s + Math.max(0, g.teamShots.local - g.teamShots.matched), 0),
    },
  }
}
