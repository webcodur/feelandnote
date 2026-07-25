/**
 * 세력도 에피소드 데이터 읽기 — 서버 전용, 인증 밖.
 *
 * 옛 영상 관리 대시보드의 창구들은 `loadFactionEpisode(name)` 으로 **파일을 읽었다.**
 * 이제 글과 구성의 원본은 DB 다(문서 §0). 그래서 창구들이 이 함수를 대신 쓴다 —
 * 이름만 바꾼 게 아니라 원천이 바뀐 것이다.
 *
 * 파일을 읽어야 하는 곳이 아직 하나 있다. 렌더·유튜브 올리기 **실행 스크립트**는
 * `faction-data.json` 을 읽으므로, 그것을 부르기 전에 `ensureFactionExport` 로 파일이
 * DB 와 같은지 맞춰 둔다. 안 맞으면 화면에서 고친 내용이 영상에 안 들어간다.
 */

import { assembleFactionEpisode } from '@feelandnote/shared/lib/faction-assemble'
import { factionTreeSource } from './faction-db'
import {
  exportFactionEpisodeToFile, factionEpisodePaths,
} from '@feelandnote/shared/bo/faction-export'
import { FACTIONS_DIR } from '@feelandnote/shared/bo/episode-store'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import type { FactionScript } from './faction-types'

/** service role 클라이언트 — 팩션 5테이블은 RLS 로 admin 전용이다 */
function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL 없음')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY 없음')
  return createClient(url, key, { auth: { persistSession: false } })
}

/** DB 에서 한 편을 대본 구조로 조립해 준다(파일을 읽지 않는다). 한 왕복 트리 조회 */
export async function loadFactionScriptFromDb(folder: string): Promise<FactionScript> {
  const client = db()
  const { script } = await assembleFactionEpisode(await factionTreeSource(client, folder), folder)
  return script as unknown as FactionScript
}

/** 편의 메타 — 진행 상태·편성 여부까지 함께 필요할 때 */
export async function loadFactionEpisodeMeta(folder: string): Promise<{
  script: FactionScript
  episodeId: string
  status: string
  registered: boolean
  sortOrder: number
  updatedAt: string
}> {
  const client = db()
  const { script, row } = await assembleFactionEpisode(await factionTreeSource(client, folder), folder)
  return {
    script: script as unknown as FactionScript,
    episodeId: row.id as string,
    status: (row.status as string) ?? 'todo',
    registered: (row.registered as boolean) ?? false,
    sortOrder: (row.sort_order as number) ?? 0,
    updatedAt: row.updated_at as string,
  }
}

/**
 * 렌더·업로드 **실행 직전**에 파일을 DB 와 맞춘다.
 *
 * 실행 스크립트가 읽는 것은 파일이므로, 화면에서 고친 내용이 파일에 안 내려가 있으면
 * 옛 내용으로 영상이 나간다. 사람이 파일을 직접 고쳐 둔 경우에는 덮어쓰지 않고 그 사실을
 * 알린다(되돌림 사고 방지 — 문서 §11 R3).
 *
 * @returns 파일이 DB 와 같아졌으면 null, 막혔으면 사람에게 보여줄 사유
 */
export async function ensureFactionExport(folder: string): Promise<string | null> {
  const client = db()
  const src = await factionTreeSource(client, folder)
  const { dir, dataPath } = factionEpisodePaths(FACTIONS_DIR, folder)
  const r = await exportFactionEpisodeToFile({
    folder,
    episodeDir: dir,
    dataPath,
    assemble: async (original) => {
      const a = await assembleFactionEpisode(src, folder, original)
      return { script: a.script, episodeId: a.row.id as string }
    },
  })
  if (r.written) return null
  return `${r.reason}${r.diffs?.length ? ` (차이 ${r.diffs.length}곳)` : ''}`
}
