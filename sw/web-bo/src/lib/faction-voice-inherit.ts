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
 *    프로필 값으로 되돌리면 배역이 무너진다. 덮어쓰기 경로는 두지 않았다(인물 화면의 「셀럽 가져오기」가
 *    한 명씩 사람 손으로 덮는 자리다).
 * 2. **언어를 가른다.** 셀럽 프로필이 국문·영문 목소리를 따로 들고 있으므로(`voice_id_ko`·`voice_id_en`)
 *    제작 데이터도 언어별 칸에 따로 채운다. 한 언어를 채워도 다른 언어 칸은 건드리지 않는다.
 * 3. **목소리 ID만 채운다.** ID 자체가 ElevenLabs 배역을 뜻하며 생성 엔진은 생성할 때 선택한다.
 * 4. **에피소드 갱신 시각을 직접 올린다.** 팩션 5테이블에는 트리거가 없다(실측 확인). 인물 행만 고치면
 *    열려 있는 편집 화면의 저장 잠금이 그대로 유효해, 그 화면이 목소리가 빈 옛 내용으로 저장하며
 *    방금 채운 값을 지운다. 그래서 일부러 잠금을 무효화해 편집 화면이 다시 불러오게 만든다.
 */

import type { SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { IN_CHUNK } from '@feelandnote/shared/lib/faction-assemble'
import { FACTION_VOICE_FIELDS, type FactionVoiceLocale } from './faction-sync/types'

type Row = Record<string, unknown>

/** 다룰 수 있는 언어 — 아무것도 안 고르면 둘 다 */
export const ALL_VOICE_LOCALES: FactionVoiceLocale[] = ['ko', 'en']

/** 채울 대상 한 명(한 언어) — 같은 인물이 두 언어 모두 대상이면 두 줄로 나온다 */
export interface FactionVoiceInheritTarget {
  /** faction_people.id */
  personId: string
  name: string
  /** 세력 명칭 첫 줄 — 어디 있는 인물인지 알려 준다 */
  group: string
  celebId: string
  /** 어느 언어의 목소리를 채우는가 */
  locale: FactionVoiceLocale
  /** 셀럽 프로필에서 물려받는 목소리 */
  voiceId: string
}

export interface FactionVoiceInheritResult {
  folder: string
  /** true면 아무것도 쓰지 않고 명단만 돌려준다 */
  dryRun: boolean
  /** 이번에 다룬 언어 */
  locales: FactionVoiceLocale[]
  /** 채울(또는 채운) 대상 명단 — 인물 × 언어 */
  targets: FactionVoiceInheritTarget[]
  /** 실제로 채운 칸 수 — 미리보기면 0 */
  filled: number
  /** 손대지 않은 이유별 칸 수(언어를 합산) */
  skipped: {
    /** 인물에 이미 그 언어 목소리가 있다 */
    alreadySet: number
    /** 셀럽 프로필에 그 언어 목소리가 없다 */
    profileEmpty: number
    /** 셀럽이 이어지지 않은 인물(언어 수만큼 센다) */
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
  db: DatabaseClient, table: string, col: string, values: string[], select: string,
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
 * @param dryRun  켜면 쓰기 직전까지 똑같이 계산하고 아무것도 쓰지 않는다
 * @param locales 다룰 언어. 비우면 국문·영문 둘 다
 */
export async function inheritVoicesFromProfiles(
  db: DatabaseClient, folder: string,
  { dryRun = false, locales }: { dryRun?: boolean; locales?: FactionVoiceLocale[] } = {},
): Promise<FactionVoiceInheritResult> {
  if (!folder) throw new Error('에피소드 폴더명이 필요합니다')
  const langs = locales?.length ? ALL_VOICE_LOCALES.filter(l => locales.includes(l)) : ALL_VOICE_LOCALES
  if (!langs.length) throw new Error('다룰 언어를 하나 이상 골라야 합니다')

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
      'id, cluster_id, position, is_person, name, celeb_id, data',
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
  const ordered = personRows.filter(p => p.is_person !== false).sort((a, b) =>
    (groupOrderByCluster.get(a.cluster_id as string) ?? 0) - (groupOrderByCluster.get(b.cluster_id as string) ?? 0)
    || (clusterOrder.get(a.cluster_id as string) ?? 0) - (clusterOrder.get(b.cluster_id as string) ?? 0)
    || (a.position as number) - (b.position as number))

  const celebIds = [...new Set(ordered.map(p => p.celeb_id).filter((v): v is string => typeof v === 'string' && !!v))]
  // 셀럽 id → 언어별 목소리. 언어를 골라도 두 컬럼을 함께 읽는다(왕복 수는 같다)
  const voiceByCeleb = new Map<string, Partial<Record<FactionVoiceLocale, string>>>()
  if (celebIds.length) {
    for (const row of await inChunks(db, 'celebs', 'id', celebIds, 'id, voice_id_ko, voice_id_en')) {
      const entry: Partial<Record<FactionVoiceLocale, string>> = {}
      for (const loc of ALL_VOICE_LOCALES) {
        const v = trimmed(row[FACTION_VOICE_FIELDS[loc].profile])
        if (v) entry[loc] = v
      }
      voiceByCeleb.set(row.id as string, entry)
    }
  }

  const targets: FactionVoiceInheritTarget[] = []
  const skipped = { alreadySet: 0, profileEmpty: 0, unlinked: 0 }

  for (const p of ordered) {
    const celebId = typeof p.celeb_id === 'string' ? p.celeb_id : ''
    if (!celebId) { skipped.unlinked += langs.length; continue }
    const data = (p.data ?? {}) as Row
    for (const locale of langs) {
      const F = FACTION_VOICE_FIELDS[locale]
      if (trimmed(data[F.person])) { skipped.alreadySet += 1; continue }
      const voiceId = voiceByCeleb.get(celebId)?.[locale]
      if (!voiceId) { skipped.profileEmpty += 1; continue }
      targets.push({
        personId: p.id as string,
        name: (p.name as string) ?? '',
        group: groupNameByCluster.get(p.cluster_id as string) ?? '',
        celebId,
        locale,
        voiceId,
      })
    }
  }

  const result: FactionVoiceInheritResult = {
    folder, dryRun, locales: langs, targets, filled: 0, skipped, failures: [],
  }
  if (dryRun || !targets.length) return result

  // 같은 인물이 두 언어 모두 대상일 수 있다 — 한 번에 병합해 써야 뒤 갱신이 앞 갱신을 지우지 않는다
  const dataById = new Map(ordered.map(p => [p.id as string, (p.data ?? {}) as Row]))
  const merged = new Map<string, { data: Row; count: number; name: string }>()
  for (const t of targets) {
    const entry = merged.get(t.personId)
      ?? { data: { ...(dataById.get(t.personId) ?? {}) }, count: 0, name: t.name }
    const F = FACTION_VOICE_FIELDS[t.locale]
    entry.data[F.person] = t.voiceId
    entry.count += 1
    merged.set(t.personId, entry)
  }
  for (const [personId, entry] of merged) {
    const { error } = await db.from('faction_people').update({ data: entry.data }).eq('id', personId)
    if (error) result.failures.push({ name: entry.name, reason: error.message })
    else result.filled += entry.count
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
