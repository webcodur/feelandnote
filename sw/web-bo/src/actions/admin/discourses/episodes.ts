'use server'

/**
 * 가상 담화 에피소드 관리 — 목록·만들기·복제·이름변경·삭제·진행 상태·노출.
 *
 * 텍스트·구성의 단일 원천은 DB 다(설계 §5). 목록도 폴더를 훑지 않고 DB 에서 센다 —
 * 폴더를 훑으면 파일이 없는 편이 목록에서 사라져 "만들었는데 안 보인다"가 된다.
 * remotion-bo 시절 목록은 **전 편의 세 파일을 통째로 읽어** 인물·발언 수를 셌다(§1 R5). 그 방식은
 * 편이 늘수록 느려지고 파일이 없으면 편이 사라진다. 여기서는 DB 집계로 바꾼다.
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
import { assembleDiscourseEpisode, buildDiscourseRows } from '@feelandnote/shared/lib/discourse-assemble'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { DISCOURSES_DIR, episodeDirOf, safeDirName } from '@feelandnote/shared/bo/episode-store'
import { discourseAdminClient, discourseTreeSource, requireDiscourseAdmin } from '@/lib/discourse-db'
import { REMOTION_LOCAL } from '@/lib/remotion-local'

/** 담화 편 진행 상태 */
export type DiscourseEpisodeStatus = 'todo' | 'live' | 'done'

export interface DiscourseEpisodeSummary {
  id: string
  /** 폴더명 = 고유키. 음성·사진 경로가 이 이름을 물고 있다 */
  folder: string
  title: string
  titleEn: string | null
  topic: string | null
  logline: string | null
  status: DiscourseEpisodeStatus
  /** 렌더 노출(등록) 여부 — `_episodes.json` 에 실리는 편 */
  registered: boolean
  sortOrder: number
  castCount: number
  turnCount: number
  updatedAt: string
}

const VALID_STATUS: DiscourseEpisodeStatus[] = ['todo', 'live', 'done']
/** 폴더명 — 영문·숫자로 시작하고 영문·숫자·하이픈·밑줄·마침표만. 담화는 한 단뿐이다 */
const FOLDER_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * 폴더 키 검사.
 *
 * 담화 폴더는 컴포지션 ID(`Discourse-<폴더명>`)가 되므로 영문·숫자·하이픈만이 안전하다
 * (`discourseCompBase` 가 그 밖의 글자를 즉시 거부한다). 밑줄·마침표는 폴더로는 되지만
 * 컴포지션 ID 로 못 쓰므로 등록(노출) 시점에 그쪽에서 걸린다.
 */
function assertFolder(folder: string): string {
  const f = (folder ?? '').trim().replace(/\\/g, '/')
  if (!f || !FOLDER_RE.test(f)) {
    throw new Error('폴더명은 영문·숫자·하이픈·밑줄·마침표만 쓸 수 있고 영문이나 숫자로 시작해야 합니다')
  }
  if (f !== safeDirName(f)) throw new Error('폴더명에 경로 문자를 쓸 수 없습니다')
  return f
}

/* ────────────────────────── 목록 ────────────────────────── */

/**
 * 에피소드 목록 — 인물 수·발언 수를 함께 센다.
 *
 * 두 계층을 각각 전량 받아 세는데, PostgREST 는 1,000행에서 **조용히 자른다.**
 * 그래서 `selectAllPages` 로 나눠 받는다(정렬키는 고유키 id).
 */
export async function listDiscourseEpisodes(): Promise<DiscourseEpisodeSummary[]> {
  await requireDiscourseAdmin()
  const db = discourseAdminClient()

  const episodes = await selectAllPages<Record<string, unknown>>((from, to) =>
    db.from('discourse_episodes')
      .select('id,folder,title,title_en,topic,logline,status,registered,sort_order,updated_at')
      .order('id').range(from, to))

  const speakers = await selectAllPages<Record<string, unknown>>((from, to) =>
    db.from('discourse_speakers').select('id,episode_id').order('id').range(from, to))

  const turns = await selectAllPages<Record<string, unknown>>((from, to) =>
    db.from('discourse_turns').select('id,episode_id').order('id').range(from, to))

  const castCount = new Map<string, number>()
  for (const s of speakers) {
    const ep = s.episode_id as string
    castCount.set(ep, (castCount.get(ep) ?? 0) + 1)
  }
  const turnCount = new Map<string, number>()
  for (const t of turns) {
    const ep = t.episode_id as string
    turnCount.set(ep, (turnCount.get(ep) ?? 0) + 1)
  }

  return episodes
    .map(e => ({
      id: e.id as string,
      folder: e.folder as string,
      title: (e.title as string) ?? (e.folder as string),
      titleEn: (e.title_en as string) ?? null,
      topic: (e.topic as string) ?? null,
      logline: (e.logline as string) ?? null,
      status: (VALID_STATUS.includes(e.status as DiscourseEpisodeStatus)
        ? e.status : 'todo') as DiscourseEpisodeStatus,
      registered: (e.registered as boolean) ?? false,
      sortOrder: (e.sort_order as number) ?? 0,
      castCount: castCount.get(e.id as string) ?? 0,
      turnCount: turnCount.get(e.id as string) ?? 0,
      updatedAt: e.updated_at as string,
    }))
    .sort((a, b) => {
      // 등록분을 편성 순서대로 먼저, 미등록분은 폴더명순으로 뒤에
      if (a.registered !== b.registered) return a.registered ? -1 : 1
      if (a.registered && a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.folder.localeCompare(b.folder)
    })
}

/** 편집기 상단 조작줄이 쓰는 한 편의 상태값 */
export interface DiscourseEpisodeMeta {
  folder: string
  title: string
  status: DiscourseEpisodeStatus
  registered: boolean
  sortOrder: number
  /**
   * 렌더 저장소가 이 컴퓨터에 있어 파일 내보내기를 쓸 수 있는가.
   * 이 값은 서버 환경 설정이라 화면(브라우저)에서 직접 읽을 수 없어 여기 실어 보낸다.
   */
  remotionLocal: boolean
}

/** 한 편의 상태·편성만 가볍게 읽는다 */
export async function getDiscourseEpisodeMeta(folder: string): Promise<DiscourseEpisodeMeta | null> {
  await requireDiscourseAdmin()
  const db = discourseAdminClient()

  const { data, error } = await db.from('discourse_episodes')
    .select('folder,title,status,registered,sort_order')
    .eq('folder', assertFolder(folder))
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    folder: data.folder as string,
    title: (data.title as string) ?? (data.folder as string),
    status: (VALID_STATUS.includes(data.status as DiscourseEpisodeStatus)
      ? data.status : 'todo') as DiscourseEpisodeStatus,
    registered: (data.registered as boolean) ?? false,
    sortOrder: (data.sort_order as number) ?? 0,
    remotionLocal: REMOTION_LOCAL,
  }
}

/* ────────────────────────── 만들기·복제 ────────────────────────── */

/** 빈 담화 만들기 — 미등록·todo 로 시작한다 */
export async function createDiscourseEpisode(
  folder: string, title: string,
): Promise<{ folder: string; episodeId: string }> {
  await requireDiscourseAdmin()
  const f = assertFolder(folder)
  const db = discourseAdminClient()

  const { data: dup } = await db.from('discourse_episodes').select('id').eq('folder', f).maybeSingle()
  if (dup) throw new Error(`이미 있는 폴더명입니다: ${f}`)

  const { data, error } = await db.rpc('discourse_replace_episode', {
    p_folder: f,
    p_episode: {
      title: (title ?? '').trim() || f,
      status: 'todo', registered: false, sort_order: 0,
      longform_layout: null, data: {},
    },
    p_speakers: [], p_turns: [],
    p_expected_updated_at: null,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/discourses')
  return { folder: f, episodeId: (data as { episode_id: string }).episode_id }
}

/**
 * 복제 — DB 내용을 그대로 새 폴더로 옮겨 담고, 로컬 사진도 함께 복사한다.
 * 복제본은 항상 미등록·todo 로 시작한다(실수로 원본을 밀어내지 않게).
 */
export async function duplicateDiscourseEpisode(
  src: string, dst: string,
): Promise<{ folder: string; episodeId: string; imagesCopied: boolean }> {
  await requireDiscourseAdmin()
  const from = assertFolder(src)
  const to = assertFolder(dst)
  if (from === to) throw new Error('원본과 같은 폴더명입니다')
  const db = discourseAdminClient()

  const { data: dup } = await db.from('discourse_episodes').select('id').eq('folder', to).maybeSingle()
  if (dup) throw new Error(`이미 있는 폴더명입니다: ${to}`)

  const { script, row: sourceRow } = await assembleDiscourseEpisode(await discourseTreeSource(db, from), from)
  const { data: linkedSpeakers, error: linkedError } = await db
    .from('discourse_speakers')
    .select('slug,celeb_id')
    .eq('episode_id', sourceRow.id as string)
  if (linkedError) throw new Error(`원본 담화 DB 인물 연결 조회 실패: ${linkedError.message}`)
  const slugMap = new Map<string, string>()
  for (const speaker of linkedSpeakers ?? []) {
    if (!speaker.slug || !speaker.celeb_id) throw new Error(`원본 담화에 DB 인물 연결이 없는 발언자가 있습니다: ${from}`)
    slugMap.set(speaker.slug as string, speaker.celeb_id as string)
  }
  const payload = buildDiscourseRows(script, {
    slugMap,
    newId: randomUUID,
    status: 'todo', registered: false, sortOrder: 0,
  })

  const { data, error } = await db.rpc('discourse_replace_episode', {
    p_folder: to,
    p_episode: payload.episode,
    p_speakers: payload.speakers,
    p_turns: payload.turns,
    p_expected_updated_at: null,
  })
  if (error) throw new Error(error.message)

  // 사진 복사 — 음원은 옮기지 않는다(원본 편의 음원을 복제본이 나눠 쓰면 어느 쪽을 고쳐도 둘이 같이 바뀐다)
  let imagesCopied = false
  if (REMOTION_LOCAL) {
    const srcImages = path.join(episodeDirOf(DISCOURSES_DIR, from), 'images')
    if (existsSync(srcImages)) {
      await cp(srcImages, path.join(episodeDirOf(DISCOURSES_DIR, to), 'images'), { recursive: true })
      imagesCopied = true
    }
  }

  revalidatePath('/discourses')
  return { folder: to, episodeId: (data as { episode_id: string }).episode_id, imagesCopied }
}

/**
 * 이름(폴더) 변경 — DB 의 고유키와 로컬 자산 폴더를 함께 옮긴다.
 *
 * 음성 파일·발화 시각이 모두 이 폴더 안에 있어서, 폴더를 두고 DB 만 바꾸면
 * 그 편의 음성이 통째로 사라진 것처럼 보인다.
 */
export async function renameDiscourseEpisode(
  src: string, dst: string,
): Promise<{ folder: string; assetsMoved: boolean }> {
  await requireDiscourseAdmin()
  const from = assertFolder(src)
  const to = assertFolder(dst)
  if (from === to) return { folder: to, assetsMoved: false }
  const db = discourseAdminClient()

  const { data: dup } = await db.from('discourse_episodes').select('id').eq('folder', to).maybeSingle()
  if (dup) throw new Error(`이미 있는 폴더명입니다: ${to}`)

  // 자산 폴더를 먼저 옮긴다 — 실패하면 DB 를 건드리지 않고 멈춘다
  let assetsMoved = false
  if (REMOTION_LOCAL) {
    const fromDir = episodeDirOf(DISCOURSES_DIR, from)
    const toDir = episodeDirOf(DISCOURSES_DIR, to)
    if (existsSync(fromDir)) {
      if (existsSync(toDir)) throw new Error(`같은 이름의 자산 폴더가 이미 있습니다: ${to}`)
      await rename(fromDir, toDir)
      assetsMoved = true
    }
  }

  const { error } = await db.from('discourse_episodes')
    .update({ folder: to, updated_at: new Date().toISOString() }).eq('folder', from)
  if (error) {
    // DB 가 실패하면 폴더를 되돌린다 — 이름이 어긋난 채로 남으면 음성이 안 보인다
    if (assetsMoved) {
      await rename(episodeDirOf(DISCOURSES_DIR, to), episodeDirOf(DISCOURSES_DIR, from)).catch(() => {})
    }
    throw new Error(error.message)
  }

  revalidatePath('/discourses')
  return { folder: to, assetsMoved }
}

/**
 * 삭제 — **DB 행만 지운다. 사진·음원은 그대로 남긴다.**
 *
 * 되돌릴 수 없는 조작이라 폴더명을 그대로 다시 입력받아 대조한다(2단계 확인).
 */
export async function deleteDiscourseEpisode(
  folder: string, confirmFolder: string,
): Promise<{ deleted: string; assetsKept: string | null }> {
  await requireDiscourseAdmin()
  const f = assertFolder(folder)
  if (confirmFolder?.trim() !== f) {
    throw new Error('확인 입력이 폴더명과 다릅니다 — 삭제하지 않았습니다')
  }
  const db = discourseAdminClient()

  // 발언이 인물을 restrict 로 물고 있어 에피소드 CASCADE 만으로는 지워지지 않는다 — 발언부터 지운다
  const { data: ep, error: findErr } = await db
    .from('discourse_episodes').select('id').eq('folder', f).maybeSingle()
  if (findErr) throw new Error(findErr.message)
  if (ep) {
    const { error: tErr } = await db.from('discourse_turns').delete().eq('episode_id', ep.id)
    if (tErr) throw new Error(`발언 삭제 실패: ${tErr.message}`)
    const { error: sErr } = await db.from('discourse_speakers').delete().eq('episode_id', ep.id)
    if (sErr) throw new Error(`인물 삭제 실패: ${sErr.message}`)
  }
  const { error } = await db.from('discourse_episodes').delete().eq('folder', f)
  if (error) throw new Error(error.message)

  const dir = REMOTION_LOCAL ? episodeDirOf(DISCOURSES_DIR, f) : null
  revalidatePath('/discourses')
  return { deleted: f, assetsKept: dir && existsSync(dir) ? dir : null }
}

/* ────────────────────────── 진행 상태·노출 ────────────────────────── */

/** 진행 상태 변경 (todo/live/done) */
export async function setDiscourseEpisodeStatus(
  folder: string, status: DiscourseEpisodeStatus,
): Promise<{ ok: true }> {
  await requireDiscourseAdmin()
  if (!VALID_STATUS.includes(status)) throw new Error(`알 수 없는 진행 상태: ${status}`)
  const db = discourseAdminClient()
  const { error } = await db.from('discourse_episodes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('folder', assertFolder(folder))
  if (error) throw new Error(error.message)
  revalidatePath('/discourses')
  return { ok: true }
}

/**
 * 노출(등록) 전환 — 등록하면 편성 맨 뒤에 붙고, 해제하면 순번을 0으로 되돌린다.
 * 이 값이 `_episodes.json` 을 만들고, 그 파일이 렌더할 편을 정한다.
 */
export async function setDiscourseEpisodeRegistered(
  folder: string, registered: boolean,
): Promise<{ ok: true; sortOrder: number }> {
  await requireDiscourseAdmin()
  const f = assertFolder(folder)
  const db = discourseAdminClient()

  let sortOrder = 0
  if (registered) {
    const { data, error } = await db.from('discourse_episodes')
      .select('sort_order').eq('registered', true).order('sort_order', { ascending: false }).limit(1)
    if (error) throw new Error(error.message)
    sortOrder = ((data?.[0]?.sort_order as number) ?? 0) + 1
  }

  const { error } = await db.from('discourse_episodes')
    .update({ registered, sort_order: sortOrder, updated_at: new Date().toISOString() })
    .eq('folder', f)
  if (error) throw new Error(error.message)
  revalidatePath('/discourses')
  return { ok: true, sortOrder }
}

/** 편성 순서 다시 매기기 — 받은 순서대로 1부터 채운다(등록분만) */
export async function reorderDiscourseEpisodes(folders: string[]): Promise<{ ok: true }> {
  await requireDiscourseAdmin()
  const db = discourseAdminClient()
  const now = new Date().toISOString()
  for (const [i, folder] of folders.entries()) {
    const { error } = await db.from('discourse_episodes')
      .update({ sort_order: i + 1, updated_at: now })
      .eq('folder', assertFolder(folder)).eq('registered', true)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/discourses')
  return { ok: true }
}
