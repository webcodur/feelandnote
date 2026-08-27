'use server'

/**
 * 세력도감 대본 불러오기·저장 — 편집기의 데이터층 입구.
 *
 * DB 가 텍스트·구성의 단일 원천이고 `faction-data.json` 은 렌더용 빌드 산출물이다(문서 §6).
 * 편집기는 예전과 같이 **대본 전체를 한 번에** 저장하고, 그 전체를 원자 저장 함수 한 번으로
 * 갈아끼운다(문서 §8 「저장 방식 실행 전략」). 부분 저장은 후속 최적화로 미룬다 —
 * 저장 도중 끊겨도 DB 가 반쪽으로 남지 않는 것이 먼저다.
 *
 * 이 파일은 **사람 확인과 자동 내보내기만** 한다. 실제 저장 절차는 `lib/faction-save`,
 * 조립·분해 규칙은 `@feelandnote/shared/lib/faction-assemble` 소유다. 사진·음성·영상·음악을
 * R2와 서비스에 올리는 출간은 편집 저장과 분리해 명시적 출간 액션에서만 실행한다.
 */

import { assembleFactionEpisode } from '@feelandnote/shared/lib/faction-assemble'
import { factionAdminClient, factionTreeSource, requireFactionAdmin } from '@/lib/faction-db'
import { FACTION_LOCAL } from '@/lib/faction-local'
import { replaceFactionEpisode } from '@/lib/faction-save'
import { runFactionExport, type FactionExportResult } from '@/lib/faction-export-run'

/** 인물 프로필에 적힌 목소리 — 팩션이 비워 두면 이 값을 따라간다 */
export interface CelebVoiceEntry {
  ko?: string
  en?: string
}

export interface LoadedFactionScript {
  folder: string
  episodeId: string
  /** faction-data.json 과 같은 구조 */
  script: Record<string, unknown>
  /** 낙관적 잠금 기준 — 저장할 때 그대로 되돌려 보낸다 */
  updatedAt: string
  status: string
  registered: boolean
  sortOrder: number
  /**
   * 이 편에 나오는 인물들의 프로필 목소리 (celebId → 값).
   *
   * 화면이 「프로필을 따라가는 중」과 「이 편에서만 다르게」를 구분해 보여주려면 원본 값을 알아야 한다.
   * 대본 조립기는 팩션 4테이블만 읽으므로 여기서 따로 실어 보낸다.
   */
  celebVoices: Record<string, CelebVoiceEntry>
}

/** 대본에 등장하는 모든 인물의 프로필 목소리를 모은다 */
async function loadCelebVoices(
  db: ReturnType<typeof factionAdminClient>, script: Record<string, unknown>,
): Promise<Record<string, CelebVoiceEntry>> {
  type Row = Record<string, unknown>
  const ids = new Set<string>()
  for (const g of (script.groups ?? []) as Row[]) {
    for (const c of (g.clusters ?? []) as Row[]) {
      for (const p of (c.people ?? []) as Row[]) {
        if (typeof p.celebId === 'string' && p.celebId) ids.add(p.celebId)
      }
    }
  }
  if (!ids.size) return {}

  const out: Record<string, CelebVoiceEntry> = {}
  const list = [...ids]
  for (let i = 0; i < list.length; i += 200) {
    const { data, error } = await db
      .from('celebs').select('id,voice_id_ko,voice_id_en').in('id', list.slice(i, i + 200))
    if (error) throw new Error(`프로필 목소리 조회 실패: ${error.message}`)
    for (const r of data ?? []) {
      const ko = (r.voice_id_ko as string | null)?.trim()
      const en = (r.voice_id_en as string | null)?.trim()
      if (ko || en) out[r.id as string] = { ...(ko ? { ko } : {}), ...(en ? { en } : {}) }
    }
  }
  return out
}

/** 편집기가 열 때 — DB 4계층을 한 왕복(중첩 임베드)으로 받아 대본으로 조립한다 */
export async function loadFactionScript(folder: string): Promise<LoadedFactionScript> {
  await requireFactionAdmin()
  const db = factionAdminClient()
  const { script, row } = await assembleFactionEpisode(await factionTreeSource(db, folder), folder)
  return {
    folder,
    episodeId: row.id as string,
    script,
    updatedAt: row.updated_at as string,
    status: (row.status as string) ?? 'blocked',
    registered: (row.registered as boolean) ?? false,
    sortOrder: (row.sort_order as number) ?? 0,
    celebVoices: await loadCelebVoices(db, script),
  }
}

/**
 * 인물 프로필의 목소리를 바꾼다 — 그 사람이 나오는 **모든 편**에 영향이 간다.
 *
 * 팩션 인물 행을 비워 둔 편들은 다음 내보내기부터 이 값을 따라간다. 그래서 화면은 이 함수를
 * 부르기 전에 반드시 사람의 승인을 받는다(어느 편들이 바뀌는지 보여준 뒤).
 */
export async function setCelebVoice(
  celebId: string,
  lang: 'ko' | 'en',
  voiceId: string,
): Promise<{ ok: true; affectedEpisodes: string[] }> {
  await requireFactionAdmin()
  if (!celebId) throw new Error('인물이 지정되지 않았습니다')
  const db = factionAdminClient()

  const column = lang === 'en' ? 'voice_id_en' : 'voice_id_ko'
  const value = voiceId.trim() || null
  const { error } = await db.from('celebs').update({ [column]: value }).eq('id', celebId)
  if (error) throw new Error(`프로필 목소리 저장 실패: ${error.message}`)

  return { ok: true, affectedEpisodes: await episodesFollowingProfile(db, celebId) }
}

/**
 * 승인창이 미리 묻는다 — 이 인물의 프로필 목소리를 바꾸면 어느 편들이 따라 바뀌는가.
 * 바꾸기 전에 보여줄 목록이라 읽기 전용이다.
 */
export async function getEpisodesFollowingProfile(celebId: string): Promise<string[]> {
  await requireFactionAdmin()
  if (!celebId) return []
  return episodesFollowingProfile(factionAdminClient(), celebId)
}

/**
 * 이 인물이 프로필을 따라가고 있는 편 목록 — 팩션 인물 행의 목소리 칸이 빈 편들이다.
 * 서버 안에서만 쓴다(액션 인자로 DB 연결을 넘길 수 없다).
 */
async function episodesFollowingProfile(
  db: ReturnType<typeof factionAdminClient>,
  celebId: string,
): Promise<string[]> {
  const { data, error } = await db
    .from('faction_people')
    .select('data, faction_clusters!inner(faction_groups!inner(faction_episodes!inner(folder)))')
    .eq('celeb_id', celebId)
  if (error) throw new Error(`출연 편 조회 실패: ${error.message}`)

  const folders = new Set<string>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const own = (row.data as Record<string, unknown> | null)?.quoteElevenlabsVoiceId
    if (typeof own === 'string' && own.trim()) continue   // 그 편에서만 따로 쓰는 중 — 영향 없음
    const cluster = row.faction_clusters as Record<string, unknown> | undefined
    const group = cluster?.faction_groups as Record<string, unknown> | undefined
    const ep = group?.faction_episodes as Record<string, unknown> | undefined
    const folder = ep?.folder
    if (typeof folder === 'string') folders.add(folder)
  }
  return [...folders].sort()
}

export interface SaveFactionScriptResult {
  ok: true
  episodeId: string
  /** 다음 저장에 쓸 새 잠금 기준 */
  updatedAt: string
  counts: { groups: number; clusters: number; people: number; parts: number }
  /** 자동 내보내기 결과(껐거나 렌더 저장소가 연결되지 않았으면 없음) */
  exported?: FactionExportResult
}

export interface SaveFactionScriptOptions {
  /**
   * 저장 직후 faction-data.json 을 다시 내보낼지. 기본 켬 —
   * 렌더·음성·자막·유튜브가 전부 그 파일을 읽으므로, 저장과 내보내기가 붙어 있어야 최신을 본다.
   */
  autoExport?: boolean
}

/**
 * 대본 전체 저장. 성공하면 새 잠금 기준을 돌려주고, 이어서 파일까지 다시 만든다.
 *
 * @param expectedUpdatedAt 불러올 때 받은 값. 그 사이 다른 곳에서 저장했으면 거부된다(낙관적 잠금).
 */
export async function saveFactionScript(
  folder: string,
  script: Record<string, unknown>,
  expectedUpdatedAt: string,
  options: SaveFactionScriptOptions = {},
): Promise<SaveFactionScriptResult> {
  await requireFactionAdmin()
  if (!expectedUpdatedAt) throw new Error('저장 기준 시각이 없습니다 — 대본을 다시 불러오세요')

  const db = factionAdminClient()
  const saved = await replaceFactionEpisode(db, folder, script, expectedUpdatedAt)

  // 렌더·음성·자막은 로컬 faction-data.json 을 읽으므로 DB 저장 직후 최신본을 내보낸다.
  // R2·서비스 출간은 수백 MB 파일 해시와 업로드를 동반하므로 이 경로에서 실행하지 않는다.
  const exported = options.autoExport !== false && FACTION_LOCAL
    ? await runFactionExport(db, folder)
    : undefined
  return { ok: true, ...saved, ...(exported ? { exported } : {}) }
}
