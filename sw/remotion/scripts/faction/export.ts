/**
 * export.ts — DB → faction-data.json 재조립·기록 (CLI 껍데기)
 *
 * 사용:
 *   pnpm faction:export -- --episode AI-Supremacy [--force]
 *   pnpm faction:export -- --all [--force]
 *   pnpm faction:export -- --episode X --stdout   # 화면 출력만(파일 안 씀)
 *
 * ⚠ 조립·기록의 **실제 규칙은 이 파일에 없다.**
 *   - DB 4계층 → FactionScript 조립 : `@feelandnote/shared/lib/faction-assemble`
 *   - 마커·손 편집 가드·파일 쓰기 : `@feelandnote/shared/bo/faction-export`
 *   web-bo 편집기의 자동 내보내기가 같은 두 모듈을 쓴다. 규칙을 여기서 고치지 마라 —
 *   파일과 화면이 갈라지고, 그 갈라짐은 영상이 렌더된 뒤에야 드러난다.
 */

import { assembleFactionEpisode, type FactionRowSource } from '@feelandnote/shared/lib/faction-assemble'
import {
  exportFactionEpisodeToFile, writeFactionRegistry, inspectFactionDataFile,
  inheritCelebVoices,
  type CelebVoiceLookup, type CelebVoicePair, type FactionExportResult,
} from '@feelandnote/shared/bo/faction-export'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminClient, readFactionData, parseArgs, selectEpisodes, pad, FACTIONS_DIR,
  type EpisodeFolder,
} from './lib.js'

const USAGE = '사용: pnpm faction:export -- (--episode <폴더명> | --all) [--force] [--stdout]'

/** supabase 클라이언트를 조립기가 요구하는 행 공급자로 감싼다 (청크·정렬은 조립기가 한다) */
export function supabaseRowSource(db: SupabaseClient): FactionRowSource {
  return async (table, col, values) => {
    const { data, error } = await db.from(table).select('*').in(col, values)
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    return (data ?? []) as Record<string, unknown>[]
  }
}

/** CELEB 프로필의 국문·영문 목소리 조회 — 팩션이 비운 자리에 물려줄 값 */
export function celebVoiceLookup(db: SupabaseClient): CelebVoiceLookup {
  return async (celebIds) => {
    const out = new Map<string, CelebVoicePair>()
    for (let i = 0; i < celebIds.length; i += 200) {
      const { data, error } = await db
        .from('celebs').select('id,voice_id_ko,voice_id_en').in('id', celebIds.slice(i, i + 200))
      if (error) throw new Error(`CELEB 목소리 조회 실패: ${error.message}`)
      for (const r of data ?? []) {
        const ko = (r.voice_id_ko as string | null)?.trim()
        const en = (r.voice_id_en as string | null)?.trim()
        if (ko || en) out.set(r.id as string, { ...(ko ? { ko } : {}), ...(en ? { en } : {}) })
      }
    }
    return out
  }
}

/** DB 에서 한 에피소드를 faction-data.json 구조로 재조립한다 (verify 가 이 함수를 쓴다) */
export async function exportEpisode(
  db: SupabaseClient,
  folder: string,
  original?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { script } = await assembleFactionEpisode(supabaseRowSource(db), folder, original)
  await inheritCelebVoices(script, celebVoiceLookup(db))
  return script
}

/** verify 가 쓰는 파일 상태 판정 — 공용 코어를 그대로 재노출한다 */
export const inspectFile = inspectFactionDataFile

/** 등록 목록(_episodes.json) 재생성 — DB 의 registered=true 를 sort_order 순으로 */
export async function regenerateEpisodeRegistry(
  db: SupabaseClient,
): Promise<{ changed: boolean; list: string[] }> {
  const { data, error } = await db
    .from('faction_episodes').select('folder,sort_order')
    .eq('registered', true).order('sort_order')
  if (error) throw new Error(`등록 에피소드 조회 실패: ${error.message}`)
  const list = (data ?? []).map(r => r.folder as string)
  return { ...writeFactionRegistry(FACTIONS_DIR, list), list }
}

/* ────────────────────────── main ────────────────────────── */

async function writeEpisode(
  db: SupabaseClient, ep: EpisodeFolder, force: boolean,
): Promise<FactionExportResult> {
  const src = supabaseRowSource(db)
  return exportFactionEpisodeToFile({
    folder: ep.folder,
    episodeDir: ep.dir,
    dataPath: ep.dataPath,
    force,
    assemble: async (original) => {
      const { script, row } = await assembleFactionEpisode(src, ep.folder, original)
      await inheritCelebVoices(script, celebVoiceLookup(db))
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
      const out = await exportEpisode(db, ep.folder, readFactionData(ep.dataPath))
      console.log(JSON.stringify(out, null, 2))
    }
    return
  }

  console.log(`대상 ${eps.length}편${args.force ? ' (--force — 손 편집 덮어씀)' : ''}`)
  const results: FactionExportResult[] = []
  const skipped: string[] = []
  for (const ep of eps) {
    let r: FactionExportResult
    try {
      r = await writeEpisode(db, ep, args.force)
    } catch (e) {
      // 전량 내보내기는 DB 에 없는 폴더(기획만 해 둔 편) 하나 때문에 멈추면 안 된다.
      // 편을 지목한 경우는 사용자가 그 편을 원한 것이므로 그대로 던진다.
      if (!args.all) throw e
      skipped.push(ep.folder)
      console.log(`  – ${pad(ep.folder, 24)} 건너뜀: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }
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
  const changed = results.filter(r => r.written && r.changed)
  const unchanged = results.filter(r => r.written && !r.changed)
  console.log(`\n변경 ${changed.length}편 · 변화 없음 ${unchanged.length}편 · 중단 ${blocked.length}편`
    + (skipped.length ? ` · 건너뜀 ${skipped.length}편(${skipped.join(', ')})` : ''))

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
