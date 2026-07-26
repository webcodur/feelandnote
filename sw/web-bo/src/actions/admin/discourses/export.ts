'use server'

/**
 * 가상 담화 내보내기 — DB → 세 파일(discourse-data.json · cast.json · turns.json).
 *
 * 렌더는 파일을 읽는다(설계 §5). 그래서 DB 를 고친 뒤에는 파일을 다시 만들어야 한다.
 * 편집기 저장이 이 액션을 자동으로 부르므로 사람이 따로 누를 일은 파일이 어긋났을 때뿐이다.
 *
 * 마커·손 편집 가드·백업·등록 목록 형식은 전부 `@feelandnote/shared/bo/discourse-export` 소유다.
 * 렌더 저장소의 CLI(`pnpm discourse:export`)가 같은 코어를 쓴다 — 규칙을 여기서 다시 짜지 마라.
 */

import { assembleDiscourseEpisode } from '@feelandnote/shared/lib/discourse-assemble'
import {
  exportDiscourseEpisodeToFiles, discourseEpisodePaths, writeDiscourseRegistry,
  inspectDiscourseFiles,
} from '@feelandnote/shared/bo/discourse-export'
import { DISCOURSES_DIR } from '@feelandnote/shared/bo/episode-store'
import { discourseAdminClient, discourseTreeSource, requireDiscourseAdmin } from '@/lib/discourse-db'
import { assertRemotionLocal } from '@/lib/remotion-local'

export interface DiscourseExportResult {
  folder: string
  /** 파일을 실제로 썼는가 */
  written: boolean
  /** 사람이 읽을 결과 사유 */
  reason: string
  /** 덮어쓰기 전 보관 위치 */
  backupDir?: string | null
  /** 막힌 경우 파일 ↔ DB 의 의미 차이 (JSON Pointer) */
  diffs?: string[]
}

/**
 * 한 편을 세 파일로 내보낸다.
 *
 * 사람이 파일을 직접 고친 흔적이 있으면 **덮어쓰지 않고** 차이를 돌려준다.
 * 마커는 메타 파일 첫 키에 하나뿐이지만 체크섬은 세 파일을 합친 전체로 계산하므로,
 * `cast.json`·`turns.json` 을 고친 것도 잡힌다.
 * 파일 쪽 내용을 버릴 각오가 섰을 때만 `force` 를 준다.
 */
export async function exportDiscourseEpisode(
  folder: string,
  options: { force?: boolean } = {},
): Promise<DiscourseExportResult> {
  await requireDiscourseAdmin()
  assertRemotionLocal()
  const db = discourseAdminClient()

  const paths = discourseEpisodePaths(DISCOURSES_DIR, folder)

  const r = await exportDiscourseEpisodeToFiles({
    folder,
    paths,
    force: options.force,
    assemble: async (original) => {
      const { script, row } = await assembleDiscourseEpisode(
        await discourseTreeSource(db, folder), folder, original,
      )
      return { script, episodeId: row.id as string }
    },
  })
  return { folder: r.folder, written: r.written, reason: r.reason, backupDir: r.backupDir, diffs: r.diffs }
}

/**
 * 등록 목록(`_episodes.json`) 재생성 — DB 의 `registered=true` 를 순번대로.
 * 렌더 로더가 이 파일을 빌드 시점에 읽어 어떤 편을 만들지 정한다.
 */
export async function regenerateDiscourseRegistry(): Promise<{ changed: boolean; list: string[] }> {
  await requireDiscourseAdmin()
  assertRemotionLocal()
  const db = discourseAdminClient()
  const { data, error } = await db
    .from('discourse_episodes').select('folder,sort_order')
    .eq('registered', true).order('sort_order')
  if (error) throw new Error(`등록 에피소드 조회 실패: ${error.message}`)
  const list = (data ?? []).map(r => r.folder as string)
  return { ...writeDiscourseRegistry(DISCOURSES_DIR, list), list }
}

export interface DiscourseFileStatus {
  folder: string
  /** absent(파일 없음) · pristine(마커 없음) · generated(내보낸 그대로) · hand-edited(사람이 고쳤다) */
  kind: 'absent' | 'pristine' | 'generated' | 'hand-edited'
  /** 마지막 내보낸 시각(ISO) */
  at?: string
}

/** 파일이 지금 어떤 상태인지 본다(쓰기 없음) — 목록 화면의 경고 표시용 */
export async function getDiscourseFileStatus(folder: string): Promise<DiscourseFileStatus> {
  await requireDiscourseAdmin()
  assertRemotionLocal()
  const st = inspectDiscourseFiles(discourseEpisodePaths(DISCOURSES_DIR, folder))
  return {
    folder,
    kind: st.kind,
    at: st.kind === 'generated' || st.kind === 'hand-edited' ? st.marker.at : undefined,
  }
}
