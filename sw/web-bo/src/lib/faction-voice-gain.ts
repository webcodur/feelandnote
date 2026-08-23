/**
 * 보이스 음량 내려보내기 — 보이스 도감에 적힌 추가 음량을 그 보이스를 쓰는 인물들에게 복사한다.
 * 서버 전용, 인증 밖(서버 액션은 사람 확인만 하고 이 함수를 부른다).
 *
 * ## 왜 복사하나 — 내보내기가 도감을 참조하면 안 되는 이유
 *
 * 렌더는 대본 파일(`faction-data.json`)의 **인물 음량 필드만** 읽고 재생할 때 곱한다
 * (`<Audio volume={dbToLinear(person.quoteGainDb)}>`). 도감이라는 것이 있는 줄 모른다.
 * 그렇다고 내보내기가 도감을 참조해 파일에 몰래 끼워 넣으면 **DB에 없는 값이 파일에 생겨
 * 왕복 검증이 깨진다**(문서 §5·§6). 그래서 값을 데이터에 **명시적으로 적어 둔다** —
 * 보이스를 배정하는 순간 편집기가 빈 칸을 채우고, 도감 값을 고쳤을 때 이 함수가 다시 내려보낸다.
 *
 * ## 덮어쓰기 규칙
 *
 * 사람이 그 인물만 따로 맞춰 둔 값은 지키고, 도감을 그대로 쓰던 자리만 새 값으로 바꾼다.
 *   · 음량 칸이 비어 있다        → 채운다
 *   · 옛 도감값과 같다           → 새 값으로 바꾼다(도감을 따라오던 자리다)
 *   · 그 밖의 값이 적혀 있다     → 손대지 않는다(인물 개별 조정)
 *
 * 범위는 **전 에피소드**다 — 도감이 전역이므로 "그 보이스를 쓰는 모든 곳"이 대상이다.
 * 언어는 가르지 않는다: 음량은 보이스의 성질이라 국문 자리든 영문 자리든 그 보이스를 쓰면 대상이다.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { IN_CHUNK } from '@feelandnote/shared/lib/faction-assemble'
import { FACTION_VOICE_FIELDS } from './faction-sync/types'

type Row = Record<string, unknown>

/** 인물이 쓰는 음량 칸 — 대사 슬롯 하나뿐이다(수식어는 낭독자 몫이라 이 도구가 다루지 않는다) */
const GAIN_FIELD = 'quoteGainDb'

export interface FactionVoiceGainTarget {
  personId: string
  name: string
  folder: string
  group: string
  /** 이 보이스가 배정된 자리 — 국문·영문 둘 다면 둘 다 적힌다(음량 칸은 하나로 공용) */
  usedIn: ('ko' | 'en')[]
  /** 지금 인물에 적혀 있는 음량(없으면 undefined) */
  currentGainDb?: number
  /** 바꿔 넣을 음량 */
  nextGainDb?: number
}

export interface FactionVoiceGainResult {
  voiceId: string
  /** 내려보낼 도감 음량(없으면 인물 칸을 비운다) */
  gainDb?: number
  dryRun: boolean
  /** 바꿀(또는 바꾼) 인물 */
  targets: FactionVoiceGainTarget[]
  /** 실제로 바꾼 인원 — 미리보기면 0 */
  applied: number
  skipped: {
    /** 이미 새 값과 같다 */
    unchanged: number
    /** 사람이 따로 맞춰 둔 값이라 두었다 */
    customized: number
  }
  /** 손댄 편 — 각각 파일을 다시 내보내야 한다 */
  folders: string[]
  failures: { name: string; reason: string }[]
}

function firstLine(v: unknown): string {
  return typeof v === 'string' ? (v.split('\n')[0].trim() || '') : ''
}

function numberOrUndefined(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

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

/**
 * 한 보이스의 도감 음량을 그 보이스를 쓰는 인물들에게 내려보낸다.
 *
 * @param gainDb         내려보낼 값. 비우면(undefined) 대상 인물의 음량 칸을 지운다
 * @param previousGainDb 고치기 직전의 도감 값. 이 값을 그대로 쓰던 인물도 함께 바꾼다
 * @param dryRun         켜면 아무것도 쓰지 않고 명단만 돌려준다
 */
export async function applyVoiceGainToPeople(
  db: SupabaseClient,
  { voiceId, gainDb, previousGainDb, dryRun = false }: {
    voiceId: string
    gainDb?: number
    previousGainDb?: number
    dryRun?: boolean
  },
): Promise<FactionVoiceGainResult> {
  const id = voiceId.trim()
  if (!id) throw new Error('보이스를 지정해야 합니다')

  // 국문·영문 어느 자리에 배정됐든 대상이다 — 음량은 보이스의 성질이라 언어를 가르지 않는다
  const koKey = FACTION_VOICE_FIELDS.ko.person
  const enKey = FACTION_VOICE_FIELDS.en.person
  const { data: peopleData, error: pErr } = await db
    .from('faction_people')
    .select('id, name, cluster_id, data')
    .eq('is_person', true)
    .or(`data->>${koKey}.eq.${id},data->>${enKey}.eq.${id}`)
  if (pErr) throw new Error(`인물 조회 실패: ${pErr.message}`)
  const people = (peopleData ?? []) as unknown as Row[]

  const result: FactionVoiceGainResult = {
    voiceId: id, gainDb, dryRun, targets: [], applied: 0,
    skipped: { unchanged: 0, customized: 0 }, folders: [], failures: [],
  }
  if (!people.length) return result

  // 자리 이름표(편·세력)를 붙이려고 위로 두 칸 거슬러 올라간다
  const clusterIds = [...new Set(people.map(p => p.cluster_id as string))]
  const clusters = await inChunks(db, 'faction_clusters', 'id', clusterIds, 'id, group_id')
  const groupIds = [...new Set(clusters.map(c => c.group_id as string))]
  const groups = await inChunks(db, 'faction_groups', 'id', groupIds, 'id, name, episode_id')
  const episodeIds = [...new Set(groups.map(g => g.episode_id as string))]
  const episodes = await inChunks(db, 'faction_episodes', 'id', episodeIds, 'id, folder')

  const groupById = new Map(groups.map(g => [g.id as string, g]))
  const folderByEpisode = new Map(episodes.map(e => [e.id as string, e.folder as string]))
  const placeByCluster = new Map(clusters.map(c => {
    const g = groupById.get(c.group_id as string)
    return [c.id as string, {
      group: firstLine(g?.name),
      episodeId: (g?.episode_id as string) ?? '',
      folder: folderByEpisode.get((g?.episode_id as string) ?? '') ?? '',
    }]
  }))

  const touchedEpisodes = new Set<string>()

  for (const p of people) {
    const data = (p.data ?? {}) as Row
    const current = numberOrUndefined(data[GAIN_FIELD])
    const place = placeByCluster.get(p.cluster_id as string)

    if ((current ?? null) === (gainDb ?? null)) { result.skipped.unchanged += 1; continue }
    // 사람이 따로 맞춰 둔 값은 지킨다 — 비었거나 옛 도감값을 그대로 쓰던 자리만 바꾼다
    const followsCatalog = current === undefined
      || (previousGainDb !== undefined && current === previousGainDb)
    if (!followsCatalog) { result.skipped.customized += 1; continue }

    const usedIn: ('ko' | 'en')[] = []
    if (data[koKey] === id) usedIn.push('ko')
    if (data[enKey] === id) usedIn.push('en')

    result.targets.push({
      personId: p.id as string,
      name: (p.name as string) ?? '',
      folder: place?.folder ?? '',
      group: place?.group ?? '',
      usedIn,
      currentGainDb: current,
      nextGainDb: gainDb,
    })

    if (dryRun) continue

    const next: Row = { ...data }
    if (gainDb === undefined) delete next[GAIN_FIELD]
    else next[GAIN_FIELD] = gainDb
    const { error } = await db.from('faction_people').update({ data: next }).eq('id', p.id as string)
    if (error) result.failures.push({ name: (p.name as string) ?? '', reason: error.message })
    else {
      result.applied += 1
      if (place?.episodeId) touchedEpisodes.add(place.episodeId)
    }
  }

  result.folders = [...new Set(result.targets.map(t => t.folder).filter(Boolean))].sort()

  // 열려 있는 편집 화면이 옛 내용으로 저장해 방금 넣은 값을 지우지 않도록 잠금 기준을 무효화한다
  // (팩션 5테이블에 트리거가 없어 인물 행만 고치면 편 갱신 시각이 그대로 남는다)
  for (const episodeId of touchedEpisodes) {
    const { error } = await db
      .from('faction_episodes').update({ updated_at: new Date().toISOString() }).eq('id', episodeId)
    if (error) result.failures.push({ name: `(${folderByEpisode.get(episodeId)} 갱신 시각)`, reason: error.message })
  }

  return result
}
