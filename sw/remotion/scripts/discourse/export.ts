/**
 * export.ts — DB → 담화 세 파일 재조립·기록 (CLI 껍데기)
 *
 * 사용:
 *   pnpm discourse:export -- --episode musk-altman [--force]
 *   pnpm discourse:export -- --all [--force]
 *   pnpm discourse:export -- --episode X --stdout   # 화면 출력만(파일 안 씀)
 *
 * ⚠ 조립·기록의 **실제 규칙은 이 파일에 없다.**
 *   - DB 3테이블 → DiscourseScript 조립 : `@feelandnote/shared/lib/discourse-assemble`
 *   - 마커·손 편집 가드·백업·파일 쓰기   : `@feelandnote/shared/bo/discourse-export`
 *   web-bo 편집기의 자동 내보내기가 같은 두 모듈을 쓴다(Phase 4). 규칙을 여기서 고치지 마라 —
 *   파일과 화면이 갈라지고, 그 갈라짐은 영상이 렌더된 뒤에야 드러난다.
 */

import { assembleDiscourseEpisode, type DiscourseRowSource } from '@feelandnote/shared/lib/discourse-assemble'
import {
  exportDiscourseEpisodeToFiles, writeDiscourseRegistry, inspectDiscourseFiles,
  type DiscourseExportResult,
} from '@feelandnote/shared/bo/discourse-export'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminClient, readDiscourseData, parseArgs, selectEpisodes, pad, DISCOURSES_DIR,
  type EpisodeFolder,
} from './lib.js'

const USAGE = '사용: pnpm discourse:export -- (--episode <폴더명> | --all) [--force] [--stdout]'

/** supabase 클라이언트를 조립기가 요구하는 행 공급자로 감싼다 (청크·정렬은 조립기가 한다) */
export function supabaseRowSource(db: SupabaseClient): DiscourseRowSource {
  return async (table, col, values) => {
    const { data, error } = await db.from(table).select('*').in(col, values)
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    return (data ?? []) as Record<string, unknown>[]
  }
}

/** DB 에서 한 에피소드를 병합된 DiscourseScript 구조로 재조립한다 (verify 가 이 함수를 쓴다) */
export async function exportEpisode(
  db: SupabaseClient,
  folder: string,
  original?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { script } = await assembleDiscourseEpisode(supabaseRowSource(db), folder, original)
  return script
}

/** verify 가 쓰는 파일 상태 판정 — 공용 코어를 그대로 재노출한다 */
export const inspectFiles = inspectDiscourseFiles

/** 등록 목록(_episodes.json) 재생성 — DB 의 registered=true 를 sort_order 순으로 */
export async function regenerateEpisodeRegistry(
  db: SupabaseClient,
): Promise<{ changed: boolean; list: string[] }> {
  const { data, error } = await db
    .from('discourse_episodes').select('folder,sort_order')
    .eq('registered', true).order('sort_order')
  if (error) throw new Error(`등록 에피소드 조회 실패: ${error.message}`)
  const list = (data ?? []).map(r => r.folder as string)
  return { ...writeDiscourseRegistry(DISCOURSES_DIR, list), list }
}

/* ────────────────────────── main ────────────────────────── */

async function writeEpisode(
  db: SupabaseClient, ep: EpisodeFolder, force: boolean,
): Promise<DiscourseExportResult> {
  const src = supabaseRowSource(db)
  return exportDiscourseEpisodeToFiles({
    folder: ep.folder,
    paths: ep.paths,
    force,
    assemble: async (original) => {
      const { script, row } = await assembleDiscourseEpisode(src, ep.folder, original)
      return { script, episodeId: row.id as string }
    },
  })
}

async function main() {
  const args = parseArgs(process.argv, USAGE)
  const eps: EpisodeFolder[] = selectEpisodes(args)
  const db = adminClient()

  // --stdout 은 진단용 — 파일을 쓰지 않는다
  if (args.stdout) {
    for (const ep of eps) {
      const out = await exportEpisode(db, ep.folder, readDiscourseData(ep))
      console.log(JSON.stringify(out, null, 2))
    }
    return
  }

  console.log(`대상 ${eps.length}편${args.force ? ' (--force — 손 편집 덮어씀)' : ''}`)
  const results: DiscourseExportResult[] = []
  for (const ep of eps) {
    const r = await writeEpisode(db, ep, args.force)
    results.push(r)
    if (r.written) {
      console.log(`  ✓ ${pad(ep.folder, 24)} ${r.reason}`)
    } else {
      console.log(`  ✗ ${pad(ep.folder, 24)} ${r.reason}`)
      for (const d of (r.diffs ?? []).slice(0, 20)) console.log(`        · ${d}`)
      if ((r.diffs?.length ?? 0) > 20) console.log(`        … 외 ${r.diffs!.length - 20}건`)
    }
  }

  const blocked = results.filter(r => !r.written)
  console.log(`\n기록 ${results.length - blocked.length}편 · 중단 ${blocked.length}편`)

  // 등록 목록 재생성은 전량 export 일 때만(단일 에피소드 export 는 목록을 건드리지 않는다)
  if (args.all) {
    const reg = await regenerateEpisodeRegistry(db)
    console.log(`_episodes.json ${reg.changed ? '갱신' : '변화 없음(byte 동일)'} — 등록 ${reg.list.length}편`)
  }

  if (blocked.length) {
    console.log('\n손 편집된 파일은 DB 를 고친 뒤 다시 export 하거나, 파일 내용을 버릴 각오면 --force 를 준다.')
    process.exitCode = 1
  }
}

// 직접 실행일 때만 CLI 로 동작한다(verify 가 exportEpisode 를 import 해 쓴다).
if (process.argv[1] && /export\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  main().catch(e => {
    console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  })
}
