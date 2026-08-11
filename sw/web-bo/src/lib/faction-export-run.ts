/**
 * 세력도감 내보내기 몸통 — DB → faction-data.json.
 *
 * 내보내기 액션(`actions/admin/factions/export.ts`)과 저장 액션(script.ts)이 함께 쓴다.
 * 저장이 내보내기 액션을 다시 부르면 관리자 확인(외부 왕복 2회)이 저장마다 두 번 돌아서,
 * 인증은 액션 입구가 하고 몸통은 여기서 인증 없이 수행한다.
 * 마커·손 편집 가드·백업·경로 규칙은 전부 `@feelandnote/shared/bo/faction-export` 소유다.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { assembleFactionEpisode } from '@feelandnote/shared/lib/faction-assemble'
import {
  exportFactionEpisodeToFile, factionEpisodePaths,
  inheritCelebVoices, type CelebVoiceLookup, type CelebVoicePair,
} from '@feelandnote/shared/bo/faction-export'
import { FACTIONS_DIR } from '@feelandnote/shared/bo/episode-store'
import { factionTreeSource } from '@/lib/faction-db'
import { assertFactionLocal } from '@/lib/faction-local'

export interface FactionExportResult {
  folder: string
  /** 내보내기가 정상 완료됐는가 */
  written: boolean
  /** 파일을 실제로 바꿨는가 */
  changed: boolean
  /** 사람이 읽을 결과 사유 */
  reason: string
  /** 덮어쓰기 전 보관 위치 */
  backupDir?: string | null
  /** 막힌 경우 파일 ↔ DB 의 의미 차이 (JSON Pointer) */
  diffs?: string[]
}

/**
 * CELEB 프로필의 국문·영문 목소리 조회 — 팩션이 비운 자리에 물려줄 값.
 * 팩션 트리 공급자는 팩션 4테이블만 알아서 여기서 따로 조회한다.
 */
function celebVoiceLookup(db: SupabaseClient): CelebVoiceLookup {
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

/** 한 편을 파일로 내보낸다. 호출 전에 관리자 확인을 마쳤어야 한다. */
export async function runFactionExport(
  db: SupabaseClient,
  folder: string,
  options: { force?: boolean } = {},
): Promise<FactionExportResult> {
  assertFactionLocal()
  const { dir, dataPath } = factionEpisodePaths(FACTIONS_DIR, folder)

  const r = await exportFactionEpisodeToFile({
    folder,
    episodeDir: dir,
    dataPath,
    force: options.force,
    assemble: async (original) => {
      const { script, row } = await assembleFactionEpisode(await factionTreeSource(db, folder), folder, original)
      await inheritCelebVoices(script, celebVoiceLookup(db))
      return { script, episodeId: row.id as string }
    },
  })
  return {
    folder: r.folder,
    written: r.written,
    changed: r.changed,
    reason: r.reason,
    backupDir: r.backupDir,
    diffs: r.diffs,
  }
}
