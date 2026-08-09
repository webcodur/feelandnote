'use server'

/**
 * 가상 담화 대본 불러오기·저장 — 편집기의 데이터층 입구.
 *
 * DB 가 텍스트·구성의 단일 원천이고 세 파일은 렌더용 빌드 산출물이다(설계 §5).
 * 편집기는 예전과 같이 **대본 전체를 한 번에** 저장하고, 그 전체를 원자 저장 함수 한 번으로
 * 갈아끼운다. 저장 도중 끊겨도 DB 가 반쪽으로 남지 않는 것이 먼저다.
 *
 * 이 파일은 **사람 확인과 자동 내보내기 연결만** 한다. 실제 저장 절차는 `lib/discourse-save`,
 * 조립·분해 규칙은 `@feelandnote/shared/lib/discourse-assemble` 소유다.
 */

import { assembleDiscourseEpisode } from '@feelandnote/shared/lib/discourse-assemble'
import { discourseAdminClient, discourseTreeSource, requireDiscourseAdmin } from '@/lib/discourse-db'
import { REMOTION_LOCAL } from '@/lib/remotion-local'
import { replaceDiscourseEpisode } from '@/lib/discourse-save'
import { runDiscourseExport, type DiscourseExportResult } from '@/lib/discourse-export-run'

export interface LoadedDiscourseScript {
  folder: string
  episodeId: string
  /** 세 파일을 합친 것과 같은 구조 */
  script: Record<string, unknown>
  /** 낙관적 잠금 기준 — 저장할 때 그대로 되돌려 보낸다 */
  updatedAt: string
  status: string
  registered: boolean
  sortOrder: number
}

/** 편집기가 열 때 — DB 3테이블을 한 왕복(중첩 임베드)으로 받아 대본으로 조립한다 */
export async function loadDiscourseScript(folder: string): Promise<LoadedDiscourseScript> {
  await requireDiscourseAdmin()
  const db = discourseAdminClient()
  const { script, row } = await assembleDiscourseEpisode(await discourseTreeSource(db, folder), folder)
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

export interface SaveDiscourseScriptResult {
  ok: true
  episodeId: string
  /** 다음 저장에 쓸 새 잠금 기준 */
  updatedAt: string
  counts: { speakers: number; turns: number }
  /** 자동 내보내기 결과(껐거나 렌더 저장소가 연결되지 않았으면 없음) */
  exported?: DiscourseExportResult
}

export interface SaveDiscourseScriptOptions {
  /**
   * 저장 직후 세 파일을 다시 내보낼지. 기본 켬 —
   * 렌더가 그 파일을 읽으므로 저장과 내보내기가 붙어 있어야 최신을 본다.
   */
  autoExport?: boolean
}

/**
 * 대본 전체 저장. 성공하면 새 잠금 기준을 돌려주고, 이어서 파일까지 다시 만든다.
 *
 * @param expectedUpdatedAt 불러올 때 받은 값. 그 사이 다른 곳에서 저장했으면 거부된다(낙관적 잠금).
 */
export async function saveDiscourseScript(
  folder: string,
  script: Record<string, unknown>,
  expectedUpdatedAt: string,
  options: SaveDiscourseScriptOptions = {},
): Promise<SaveDiscourseScriptResult> {
  await requireDiscourseAdmin()
  if (!expectedUpdatedAt) throw new Error('저장 기준 시각이 없습니다 — 대본을 다시 불러오세요')

  const db = discourseAdminClient()
  const saved = await replaceDiscourseEpisode(db, folder, script, expectedUpdatedAt)

  const result: SaveDiscourseScriptResult = { ok: true, ...saved }
  if (options.autoExport !== false && REMOTION_LOCAL) {
    // 입구에서 이미 사람을 확인했으므로 내보내기 몸통을 직접 부른다(관리자 확인 중복 왕복 제거)
    result.exported = await runDiscourseExport(db, folder)
  }
  return result
}

/**
 * 연결된 셀럽의 가상 독백 — 담화 대본의 **원천 사료**다(설계 §0-4).
 *
 * 담화 대사는 사람이 이 글을 읽고 재작문한 것이지 코드가 읽어 쓰는 값이 아니다.
 * remotion-bo 시절에는 다른 저장소·다른 DB 접근이라 편집기에서 볼 수 없었고, 작업자가
 * 서비스 화면을 따로 띄워 놓고 옮겨 적었다. web-bo 로 오면서 같은 DB 안이 됐으므로
 * 조인 한 번으로 편집기 옆에 띄운다 — 담화 통합의 고유 이득이다.
 */
export interface SourceMonologue {
  slug: string
  name: string
  /** 한국어 독백 원문. 없으면 null */
  monologue: string | null
  /** 영문 독백 원문. 없으면 null */
  monologueEn: string | null
}

/** 인물 slug 목록으로 원천 독백을 한 번에 읽는다(읽기 전용 — 이 화면은 독백을 고치지 않는다) */
export async function getSourceMonologues(slugs: string[]): Promise<SourceMonologue[]> {
  await requireDiscourseAdmin()
  const uniq = [...new Set(slugs.filter(s => typeof s === 'string' && s))]
  if (!uniq.length) return []
  const db = discourseAdminClient()
  const { data, error } = await db
    .from('celebs')
    .select('slug,nickname,virtual_monologue,virtual_monologue_en')
    .in('slug', uniq)
  if (error) throw new Error(`원천 독백 조회 실패: ${error.message}`)
  return (data ?? []).map(r => ({
    slug: r.slug as string,
    name: (r.nickname as string) ?? (r.slug as string),
    monologue: (r.virtual_monologue as string) ?? null,
    monologueEn: (r.virtual_monologue_en as string) ?? null,
  }))
}
