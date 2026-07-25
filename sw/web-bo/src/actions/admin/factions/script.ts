'use server'

/**
 * 세력도 대본 불러오기·저장 — 편집기의 데이터층 입구.
 *
 * DB 가 텍스트·구성의 단일 원천이고 `faction-data.json` 은 렌더용 빌드 산출물이다(문서 §6).
 * 편집기는 예전과 같이 **대본 전체를 한 번에** 저장하고, 그 전체를 원자 저장 함수 한 번으로
 * 갈아끼운다(문서 §8 「저장 방식 실행 전략」). 부분 저장은 후속 최적화로 미룬다 —
 * 저장 도중 끊겨도 DB 가 반쪽으로 남지 않는 것이 먼저다.
 *
 * 이 파일은 **사람 확인과 자동 내보내기 연결만** 한다. 실제 저장 절차는 `lib/faction-save`,
 * 조립·분해 규칙은 `@feelandnote/shared/lib/faction-assemble` 소유다.
 */

import { assembleFactionEpisode } from '@feelandnote/shared/lib/faction-assemble'
import { factionAdminClient, factionTreeSource, requireFactionAdmin } from '@/lib/faction-db'
import { FACTION_LOCAL } from '@/lib/faction-local'
import { replaceFactionEpisode } from '@/lib/faction-save'
import { exportFactionEpisode } from './export'
import type { FactionExportResult } from './export'

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
    status: (row.status as string) ?? 'todo',
    registered: (row.registered as boolean) ?? false,
    sortOrder: (row.sort_order as number) ?? 0,
  }
}

export interface SaveFactionScriptResult {
  ok: true
  episodeId: string
  /** 다음 저장에 쓸 새 잠금 기준 */
  updatedAt: string
  counts: { groups: number; clusters: number; people: number; parts: number }
  /** 자동 내보내기 결과(껐거나 렌더 저장소가 연결되지 않았으면 없음) */
  exported?: FactionExportResult
  /** 셀럽 프로필을 못 찾은 slug — celeb_id 는 null 로 두고 slug 문자열은 보존된다 */
  unresolvedSlugs: string[]
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

  const result: SaveFactionScriptResult = { ok: true, ...saved }
  if (options.autoExport !== false && FACTION_LOCAL) {
    result.exported = await exportFactionEpisode(folder)
  }
  return result
}
