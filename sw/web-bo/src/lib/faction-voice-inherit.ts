/**
 * 대사 목소리 일괄 상속 — 셀럽 프로필의 국문 목소리를 인물 대사 설정으로 내려 채운다. 서버 전용, 인증 밖.
 *
 * 서버 액션(`actions/admin/factions/voice-inherit.ts`)은 사람 확인만 하고 이 함수를 부른다.
 * 액션 파일 안에 로직을 두면 Next 밖에서 부를 수 없어 검증이 안 되므로 여기로 뺐다
 * (`lib/faction-save.ts`·`lib/faction-sync/publish.ts` 와 같은 이유다).
 *
 * ## 지키는 규칙
 *
 * 1. **빈 칸만 채운다.** 인물에 이미 목소리가 지정돼 있으면 손대지 않는다 — 편에 맞춰 사람이 고른 값을
 *    프로필 값으로 되돌리면 배역이 무너진다. 덮어쓰기 경로는 두지 않았다(인물 화면의 「DB에서 가져오기」가
 *    한 명씩 사람 손으로 덮는 자리다).
 * 2. **엔진 표기의 짝을 맞춘다.** 목소리를 채우면서 엔진 표기가 비어 있으면 `elevenlabs` 로 함께 세운다.
 *    실측 근거(26.07.25): 목소리를 가진 인물 309명 중 300명이 엔진 표기 `elevenlabs` 를 함께 갖는다.
 *    이미 다른 엔진이 적혀 있으면 그 표기는 건드리지 않는다(사람이 고른 값이다).
 * 3. **에피소드 갱신 시각을 직접 올린다.** 팩션 5테이블에는 트리거가 없다(실측 확인). 인물 행만 고치면
 *    열려 있는 편집 화면의 저장 잠금이 그대로 유효해, 그 화면이 목소리가 빈 옛 내용으로 저장하며
 *    방금 채운 값을 지운다. 그래서 일부러 잠금을 무효화해 편집 화면이 다시 불러오게 만든다.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { IN_CHUNK } from '@feelandnote/shared/lib/faction-assemble'

type Row = Record<string, unknown>

/** 채울 대상 한 명 */
export interface FactionVoiceInheritTarget {
  /** faction_people.id */
  personId: string
  name: string
  /** 세력 명칭 첫 줄 — 어디 있는 인물인지 알려 준다 */
  group: string
  celebId: string
  /** 셀럽 프로필에서 물려받는 목소리 */
  voiceId: string
  /** 엔진 표기까지 함께 세우는가(비어 있던 인물만) */
  setsEngine: boolean
}

export interface FactionVoiceInheritResult {
  folder: string
  /** true면 아무것도 쓰지 않고 명단만 돌려준다 */
  dryRun: boolean
  /** 채울(또는 채운) 인물 명단 */
  targets: FactionVoiceInheritTarget[]
  /** 실제로 채운 인원 — 미리보기면 0 */
  filled: number
  /** 손대지 않은 이유별 인원 */
  skipped: {
    /** 인물에 이미 목소리가 있다 */
    alreadySet: number
    /** 셀럽 프로필에 국문 목소리가 없다 */
    profileEmpty: number
    /** 셀럽이 이어지지 않은 인물 */
    unlinked: number
  }
  /** 개별 실패 — 조용히 넘기지 않는다 */
  failures: { name: string; reason: string }[]
  /** 채운 뒤의 에피소드 갱신 시각 — 열려 있는 편집 화면은 이 값 때문에 다시 불러와야 한다 */
  updatedAt?: string
}

/** 통합 필드(첫 줄=명칭)에서 첫 줄만 */
function firstLine(v: unknown): string {
  return typeof v === 'string' ? (v.split('\n')[0].trim() || '') : ''
}

function trimmed(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

/** `.in()` 청크 조회 — 462개를 단일 in() 에 실어 실패한 실측 이력이 있어 200 으로 끊는다 */
async function inChunks(
  db: SupabaseClient, table: string, col: string, values: string[], select: string,
): Promise<Row[]> {
  const out: Row[] = []
  for (let i = 0; i < values.length; i += IN_CHUNK) {
    const { data, error } = await db.from(table).select(select).in(col, values.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`${table} 조회 실패(${col}): ${error.message}`)
    out.push(...((data ?? []) as unknown as Row[]))
  }
  return out
}

const byPosition = (a: Row, b: Row) => (a.position as number) - (b.position as number)

/**
 * 한 편의 대사 목소리를 셀럽 프로필에서 물려받는다.
 *
 * @param dryRun 켜면 쓰기 직전까지 똑같이 계산하고 아무것도 쓰지 않는다
 */
export async function inheritVoicesFromProfiles(
  db: SupabaseClient, folder: string, { dryRun = false }: { dryRun?: boolean } = {},
): Promise<FactionVoiceInheritResult> {
  if (!folder) throw new Error('에피소드 폴더명이 필요합니다')

  const { data: epRow, error: epErr } = await db
    .from('faction_episodes').select('id').eq('folder', folder).maybeSingle()
  if (epErr) throw new Error(`에피소드 조회 실패(${folder}): ${epErr.message}`)
  if (!epRow) throw new Error(`에피소드를 찾을 수 없습니다: ${folder}`)
  const episodeId = epRow.id as string

  const { data: gData, error: gErr } = await db
    .from('faction_groups').select('id, position, name').eq('episode_id', episodeId)
  if (gErr) throw new Error(`세력 조회 실패(${folder}): ${gErr.message}`)
  const groupRows = ((gData ?? []) as unknown as Row[]).sort(byPosition)

  const clusterRows = groupRows.length
    ? await inChunks(db, 'faction_clusters', 'group_id', groupRows.map(g => g.id as string), 'id, group_id, position')
    : []
  const personRows = clusterRows.length
    ? await inChunks(
      db, 'faction_people', 'cluster_id', clusterRows.map(c => c.id as string),
      'id, cluster_id, position, name, celeb_id, data',
    )
    : []

  // 자리 순서(세력 → 묶음 → 인물)를 그대로 명단 순서로 쓴다 — 화면에서 찾기 쉽다
  const groupNameByCluster = new Map<string, string>()
  const groupOrderByCluster = new Map<string, number>()
  const clusterOrder = new Map<string, number>()
  groupRows.forEach((g, gi) => {
    const mine = clusterRows.filter(c => c.group_id === g.id).sort(byPosition)
    mine.forEach((c, ci) => {
      groupNameByCluster.set(c.id as string, firstLine(g.name) || `세력 ${gi + 1}`)
      groupOrderByCluster.set(c.id as string, gi)
      clusterOrder.set(c.id as string, ci)
    })
  })
  const ordered = [...personRows].sort((a, b) =>
    (groupOrderByCluster.get(a.cluster_id as string) ?? 0) - (groupOrderByCluster.get(b.cluster_id as string) ?? 0)
    || (clusterOrder.get(a.cluster_id as string) ?? 0) - (clusterOrder.get(b.cluster_id as string) ?? 0)
    || (a.position as number) - (b.position as number))

  const celebIds = [...new Set(ordered.map(p => p.celeb_id).filter((v): v is string => typeof v === 'string' && !!v))]
  const voiceByCeleb = new Map<string, string>()
  if (celebIds.length) {
    for (const row of await inChunks(db, 'profiles', 'id', celebIds, 'id, voice_id_ko')) {
      const v = trimmed(row.voice_id_ko)
      if (v) voiceByCeleb.set(row.id as string, v)
    }
  }

  const targets: FactionVoiceInheritTarget[] = []
  const skipped = { alreadySet: 0, profileEmpty: 0, unlinked: 0 }

  for (const p of ordered) {
    const celebId = typeof p.celeb_id === 'string' ? p.celeb_id : ''
    if (!celebId) { skipped.unlinked += 1; continue }
    const data = (p.data ?? {}) as Row
    if (trimmed(data.quoteElevenlabsVoiceId)) { skipped.alreadySet += 1; continue }
    const voiceId = voiceByCeleb.get(celebId)
    if (!voiceId) { skipped.profileEmpty += 1; continue }
    targets.push({
      personId: p.id as string,
      name: (p.name as string) ?? '',
      group: groupNameByCluster.get(p.cluster_id as string) ?? '',
      celebId,
      voiceId,
      setsEngine: !trimmed(data.quoteEngine),
    })
  }

  const result: FactionVoiceInheritResult = {
    folder, dryRun, targets, filled: 0, skipped, failures: [],
  }
  if (dryRun || !targets.length) return result

  const dataById = new Map(ordered.map(p => [p.id as string, (p.data ?? {}) as Row]))
  for (const t of targets) {
    const next: Row = { ...(dataById.get(t.personId) ?? {}), quoteElevenlabsVoiceId: t.voiceId }
    if (t.setsEngine) next.quoteEngine = 'elevenlabs'
    const { error } = await db.from('faction_people').update({ data: next }).eq('id', t.personId)
    if (error) result.failures.push({ name: t.name, reason: error.message })
    else result.filled += 1
  }

  // 편집 화면의 저장 잠금을 일부러 무효화한다 — 위 주석 3번 참조
  if (result.filled) {
    const { data: bumped, error } = await db
      .from('faction_episodes').update({ updated_at: new Date().toISOString() })
      .eq('id', episodeId).select('updated_at').single()
    if (error) result.failures.push({ name: '(에피소드 갱신 시각)', reason: error.message })
    else result.updatedAt = bumped?.updated_at as string
  }

  return result
}
