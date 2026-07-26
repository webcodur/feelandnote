'use server'

/**
 * 세력도 내보내기 — DB → faction-data.json.
 *
 * 렌더·자막·음성·유튜브 파이프라인은 전부 파일을 읽는다(문서 §6). 그래서 DB 를 고친 뒤에는
 * 파일을 다시 만들어야 한다. 편집기 저장이 이 액션을 자동으로 부르므로 사람이 따로 누를 일은
 * 파일이 어긋났을 때뿐이다.
 *
 * 마커·손 편집 가드·백업·등록 목록 형식은 전부 `@feelandnote/shared/bo/faction-export` 소유다.
 * 렌더 저장소의 CLI(`pnpm faction:export`)가 같은 코어를 쓴다 — 규칙을 여기서 다시 짜지 마라.
 */

import {
  factionEpisodePaths, writeFactionRegistry, inspectFactionDataFile,
} from '@feelandnote/shared/bo/faction-export'
import { FACTIONS_DIR } from '@feelandnote/shared/bo/episode-store'
import { factionAdminClient, requireFactionAdmin } from '@/lib/faction-db'
import { assertFactionLocal } from '@/lib/faction-local'
import { runFactionExport, type FactionExportResult } from '@/lib/faction-export-run'

export type { FactionExportResult }

/**
 * 한 편을 파일로 내보낸다. 몸통은 `lib/faction-export-run` — 저장 액션이 같은 몸통을
 * 인증 없이 직접 부르므로, 여기서는 사람 확인만 얹는다.
 *
 * 사람이 파일을 직접 고친 흔적이 있으면 **덮어쓰지 않고** 차이를 돌려준다.
 * 파일 쪽 내용을 버릴 각오가 섰을 때만 `force` 를 준다.
 */
export async function exportFactionEpisode(
  folder: string,
  options: { force?: boolean } = {},
): Promise<FactionExportResult> {
  await requireFactionAdmin()
  return runFactionExport(factionAdminClient(), folder, options)
}

/**
 * 등록 목록(`_episodes.json`) 재생성 — DB 의 `registered=true` 를 순번대로.
 * 렌더 로더가 이 파일을 빌드 시점에 읽어 어떤 편을 만들지 정한다.
 */
export async function regenerateFactionRegistry(): Promise<{ changed: boolean; list: string[] }> {
  await requireFactionAdmin()
  assertFactionLocal()
  const db = factionAdminClient()
  const { data, error } = await db
    .from('faction_episodes').select('folder,sort_order')
    .eq('registered', true).order('sort_order')
  if (error) throw new Error(`등록 에피소드 조회 실패: ${error.message}`)
  const list = (data ?? []).map(r => r.folder as string)
  return { ...writeFactionRegistry(FACTIONS_DIR, list), list }
}

export interface FactionFileStatus {
  folder: string
  /** absent(파일 없음) · pristine(마커 없음) · generated(내보낸 그대로) · hand-edited(사람이 고쳤다) */
  kind: 'absent' | 'pristine' | 'generated' | 'hand-edited'
  /** 마지막 내보낸 시각(ISO) */
  at?: string
}

/** 파일이 지금 어떤 상태인지 본다(쓰기 없음) — 목록 화면의 경고 표시용 */
export async function getFactionFileStatus(folder: string): Promise<FactionFileStatus> {
  await requireFactionAdmin()
  assertFactionLocal()
  const { dataPath } = factionEpisodePaths(FACTIONS_DIR, folder)
  const st = inspectFactionDataFile(dataPath)
  return {
    folder,
    kind: st.kind,
    at: st.kind === 'generated' || st.kind === 'hand-edited' ? st.marker.at : undefined,
  }
}
