'use server'

/**
 * 세력도 에피소드 관리 — 목록·만들기·복제·이름변경·삭제·진행 상태·노출.
 *
 * 텍스트·구성의 단일 원천은 DB 다(문서 §0). 목록도 폴더를 훑지 않고 DB 에서 센다 —
 * 폴더를 훑으면 파일이 없는 편이 목록에서 사라져 "만들었는데 안 보인다"가 된다.
 *
 * 사진·음원은 DB 로 옮기지 않고 렌더 저장소에 남는다. 그래서
 *   - 이름을 바꾸면 로컬 자산 폴더도 함께 옮긴다(음성 파일 경로가 폴더명을 물고 있다).
 *   - **지울 때는 DB 행만 지우고 로컬 자산은 남긴다.** 이 저장소는 추적 밖 자산을 영구 소실한
 *     이력이 여러 번 있어서, 사진·음원을 코드로 지우지 않는 쪽을 규칙으로 삼는다.
 */

import { randomUUID } from 'crypto'
import { existsSync } from 'fs'
import { cp, rename } from 'fs/promises'
import path from 'path'
import { revalidatePath } from 'next/cache'
import { assembleFactionEpisode, buildFactionRows } from '@feelandnote/shared/lib/faction-assemble'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { FACTIONS_DIR, episodeDirOf, safeDirName } from '@feelandnote/shared/bo/episode-store'
import { factionAdminClient, factionRowSource, requireFactionAdmin } from '@/lib/faction-db'
import { FACTION_LOCAL } from '@/lib/faction-local'

export type FactionEpisodeStatus = 'todo' | 'live' | 'done'

export interface FactionEpisodeSummary {
  id: string
  /** 폴더명 = 고유키. 음성·사진 경로가 이 이름을 물고 있다 */
  folder: string
  title: string
  titleEn: string | null
  logline: string | null
  status: FactionEpisodeStatus
  /** 서비스 노출(등록) 여부 — `_episodes.json` 에 실리는 편 */
  registered: boolean
  sortOrder: number
  groupCount: number
  personCount: number
  updatedAt: string
}

const VALID_STATUS: FactionEpisodeStatus[] = ['todo', 'live', 'done']
const FOLDER_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

function assertFolder(folder: string): string {
  const f = (folder ?? '').trim()
  if (!FOLDER_RE.test(f)) {
    throw new Error('폴더명은 영문·숫자·하이픈·밑줄·마침표만 쓸 수 있고 영문이나 숫자로 시작해야 합니다')
  }
  if (f !== safeDirName(f)) throw new Error('폴더명에 경로 문자를 쓸 수 없습니다')
  return f
}

/* ────────────────────────── 목록 ────────────────────────── */

/**
 * 에피소드 목록 — 세력 수·인물 수를 함께 센다.
 *
 * 세 계층을 각각 전량 받아 세는데, PostgREST 는 1,000행에서 **조용히 자른다.**
 * 그래서 `selectAllPages` 로 나눠 받는다(정렬키는 고유키 id).
 */
export async function listFactionEpisodes(): Promise<FactionEpisodeSummary[]> {
  await requireFactionAdmin()
  const db = factionAdminClient()

  const episodes = await selectAllPages<Record<string, unknown>>((from, to) =>
    db.from('faction_episodes')
      .select('id,folder,title,title_en,logline,status,registered,sort_order,updated_at')
      .order('id').range(from, to))

  const groups = await selectAllPages<Record<string, unknown>>((from, to) =>
    db.from('faction_groups').select('id,episode_id').order('id').range(from, to))

  const clusters = await selectAllPages<Record<string, unknown>>((from, to) =>
    db.from('faction_clusters').select('id,group_id').order('id').range(from, to))

  const people = await selectAllPages<Record<string, unknown>>((from, to) =>
    db.from('faction_people').select('id,cluster_id').order('id').range(from, to))

  const groupCount = new Map<string, number>()
  const episodeOfGroup = new Map<string, string>()
  for (const g of groups) {
    const ep = g.episode_id as string
    episodeOfGroup.set(g.id as string, ep)
    groupCount.set(ep, (groupCount.get(ep) ?? 0) + 1)
  }
  const episodeOfCluster = new Map<string, string>()
  for (const c of clusters) {
    const ep = episodeOfGroup.get(c.group_id as string)
    if (ep) episodeOfCluster.set(c.id as string, ep)
  }
  const personCount = new Map<string, number>()
  for (const p of people) {
    const ep = episodeOfCluster.get(p.cluster_id as string)
    if (ep) personCount.set(ep, (personCount.get(ep) ?? 0) + 1)
  }

  return episodes
    .map(e => ({
      id: e.id as string,
      folder: e.folder as string,
      title: (e.title as string) ?? (e.folder as string),
      titleEn: (e.title_en as string) ?? null,
      logline: (e.logline as string) ?? null,
      status: (VALID_STATUS.includes(e.status as FactionEpisodeStatus)
        ? e.status : 'todo') as FactionEpisodeStatus,
      registered: (e.registered as boolean) ?? false,
      sortOrder: (e.sort_order as number) ?? 0,
      groupCount: groupCount.get(e.id as string) ?? 0,
      personCount: personCount.get(e.id as string) ?? 0,
      updatedAt: e.updated_at as string,
    }))
    .sort((a, b) => {
      // 등록분을 편성 순서대로 먼저, 미등록분은 폴더명순으로 뒤에
      if (a.registered !== b.registered) return a.registered ? -1 : 1
      if (a.registered && a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.folder.localeCompare(b.folder)
    })
}

/* ────────────────────────── 만들기·복제 ────────────────────────── */

/** 빈 세력도 만들기 — 미등록·todo 로 시작한다 */
export async function createFactionEpisode(
  folder: string, title: string,
): Promise<{ folder: string; episodeId: string }> {
  await requireFactionAdmin()
  const f = assertFolder(folder)
  const db = factionAdminClient()

  const { data: dup } = await db.from('faction_episodes').select('id').eq('folder', f).maybeSingle()
  if (dup) throw new Error(`이미 있는 폴더명입니다: ${f}`)

  const { data, error } = await db.rpc('faction_replace_episode', {
    p_folder: f,
    p_episode: {
      title: (title ?? '').trim() || f,
      status: 'todo', registered: false, sort_order: 0,
      longform_layout: null, data: {},
    },
    p_groups: [], p_clusters: [], p_people: [], p_parts: [],
    p_expected_updated_at: null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/factions')
  return { folder: f, episodeId: (data as { episode_id: string }).episode_id }
}

/**
 * 복제 — DB 내용을 그대로 새 폴더로 옮겨 담고, 로컬 사진도 함께 복사한다.
 * 복제본은 항상 미등록·todo 로 시작한다(실수로 원본을 밀어내지 않게).
 */
export async function duplicateFactionEpisode(
  src: string, dst: string,
): Promise<{ folder: string; episodeId: string; imagesCopied: boolean }> {
  await requireFactionAdmin()
  const from = assertFolder(src)
  const to = assertFolder(dst)
  if (from === to) throw new Error('원본과 같은 폴더명입니다')
  const db = factionAdminClient()

  const { data: dup } = await db.from('faction_episodes').select('id').eq('folder', to).maybeSingle()
  if (dup) throw new Error(`이미 있는 폴더명입니다: ${to}`)

  const { script } = await assembleFactionEpisode(factionRowSource(db), from)
  const payload = buildFactionRows(script, {
    newId: randomUUID,
    status: 'todo', registered: false, sortOrder: 0,
  })

  const { data, error } = await db.rpc('faction_replace_episode', {
    p_folder: to,
    p_episode: payload.episode,
    p_groups: payload.groups,
    p_clusters: payload.clusters,
    p_people: payload.people,
    p_parts: payload.parts,
    p_expected_updated_at: null,
  })
  if (error) throw new Error(error.message)

  // 사진 복사 — 음원은 옮기지 않는다(원본 편의 음원을 복제본이 나눠 쓰면 어느 쪽을 고쳐도 둘이 같이 바뀐다)
  let imagesCopied = false
  if (FACTION_LOCAL) {
    const srcImages = path.join(episodeDirOf(FACTIONS_DIR, from), 'images')
    if (existsSync(srcImages)) {
      await cp(srcImages, path.join(episodeDirOf(FACTIONS_DIR, to), 'images'), { recursive: true })
      imagesCopied = true
    }
  }

  revalidatePath('/factions')
  return { folder: to, episodeId: (data as { episode_id: string }).episode_id, imagesCopied }
}

/**
 * 이름(폴더) 변경 — DB 의 고유키와 로컬 자산 폴더를 함께 옮긴다.
 *
 * 음성 파일·발화 시각·받아쓰기 산출물이 모두 이 폴더 안에 있어서, 폴더를 두고 DB 만 바꾸면
 * 그 편의 음성이 통째로 사라진 것처럼 보인다.
 */
export async function renameFactionEpisode(
  src: string, dst: string,
): Promise<{ folder: string; assetsMoved: boolean }> {
  await requireFactionAdmin()
  const from = assertFolder(src)
  const to = assertFolder(dst)
  if (from === to) return { folder: to, assetsMoved: false }
  const db = factionAdminClient()

  const { data: dup } = await db.from('faction_episodes').select('id').eq('folder', to).maybeSingle()
  if (dup) throw new Error(`이미 있는 폴더명입니다: ${to}`)

  // 자산 폴더를 먼저 옮긴다 — 실패하면 DB 를 건드리지 않고 멈춘다
  let assetsMoved = false
  if (FACTION_LOCAL) {
    const fromDir = episodeDirOf(FACTIONS_DIR, from)
    const toDir = episodeDirOf(FACTIONS_DIR, to)
    if (existsSync(fromDir)) {
      if (existsSync(toDir)) throw new Error(`같은 이름의 자산 폴더가 이미 있습니다: ${to}`)
      await rename(fromDir, toDir)
      assetsMoved = true
    }
  }

  const { error } = await db.from('faction_episodes')
    .update({ folder: to, updated_at: new Date().toISOString() }).eq('folder', from)
  if (error) {
    // DB 가 실패하면 폴더를 되돌린다 — 이름이 어긋난 채로 남으면 음성이 안 보인다
    if (assetsMoved) {
      await rename(episodeDirOf(FACTIONS_DIR, to), episodeDirOf(FACTIONS_DIR, from)).catch(() => {})
    }
    throw new Error(error.message)
  }

  revalidatePath('/factions')
  return { folder: to, assetsMoved }
}

/**
 * 삭제 — **DB 행만 지운다. 사진·음원은 그대로 남긴다.**
 *
 * 되돌릴 수 없는 조작이라 폴더명을 그대로 다시 입력받아 대조한다(2단계 확인).
 */
export async function deleteFactionEpisode(
  folder: string, confirmFolder: string,
): Promise<{ deleted: string; assetsKept: string | null }> {
  await requireFactionAdmin()
  const f = assertFolder(folder)
  if (confirmFolder?.trim() !== f) {
    throw new Error('확인 입력이 폴더명과 다릅니다 — 삭제하지 않았습니다')
  }
  const db = factionAdminClient()
  const { error } = await db.from('faction_episodes').delete().eq('folder', f)
  if (error) throw new Error(error.message)

  const dir = FACTION_LOCAL ? episodeDirOf(FACTIONS_DIR, f) : null
  revalidatePath('/factions')
  return { deleted: f, assetsKept: dir && existsSync(dir) ? dir : null }
}

/* ────────────────────────── 진행 상태·노출 ────────────────────────── */

/** 진행 상태 변경 (todo/live/done) */
export async function setFactionEpisodeStatus(
  folder: string, status: FactionEpisodeStatus,
): Promise<{ ok: true }> {
  await requireFactionAdmin()
  if (!VALID_STATUS.includes(status)) throw new Error(`알 수 없는 진행 상태: ${status}`)
  const db = factionAdminClient()
  const { error } = await db.from('faction_episodes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('folder', assertFolder(folder))
  if (error) throw new Error(error.message)
  revalidatePath('/factions')
  return { ok: true }
}

/**
 * 노출(등록) 전환 — 등록하면 편성 맨 뒤에 붙고, 해제하면 순번을 0으로 되돌린다.
 * 이 값이 `_episodes.json` 을 만들고, 그 파일이 렌더할 편을 정한다.
 */
export async function setFactionEpisodeRegistered(
  folder: string, registered: boolean,
): Promise<{ ok: true; sortOrder: number }> {
  await requireFactionAdmin()
  const f = assertFolder(folder)
  const db = factionAdminClient()

  let sortOrder = 0
  if (registered) {
    const { data, error } = await db.from('faction_episodes')
      .select('sort_order').eq('registered', true).order('sort_order', { ascending: false }).limit(1)
    if (error) throw new Error(error.message)
    sortOrder = ((data?.[0]?.sort_order as number) ?? 0) + 1
  }

  const { error } = await db.from('faction_episodes')
    .update({ registered, sort_order: sortOrder, updated_at: new Date().toISOString() })
    .eq('folder', f)
  if (error) throw new Error(error.message)
  revalidatePath('/factions')
  return { ok: true, sortOrder }
}

/** 편성 순서 다시 매기기 — 받은 순서대로 1부터 채운다(등록분만) */
export async function reorderFactionEpisodes(folders: string[]): Promise<{ ok: true }> {
  await requireFactionAdmin()
  const db = factionAdminClient()
  const now = new Date().toISOString()
  for (const [i, folder] of folders.entries()) {
    const { error } = await db.from('faction_episodes')
      .update({ sort_order: i + 1, updated_at: now })
      .eq('folder', assertFolder(folder)).eq('registered', true)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/factions')
  return { ok: true }
}
