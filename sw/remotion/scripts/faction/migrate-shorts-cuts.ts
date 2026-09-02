/**
 * migrate-shorts-cuts.ts — 옛 쇼츠 편 배정(`faction_groups.part`·`shortsPartCount`)을 이야기 순서 위의 경계(cut)로 바꾼다.
 *
 * 사용:
 *   pnpm faction:migrate-shorts-cuts -- --episode Homer-Iliad [--dry-run]
 *   pnpm faction:migrate-shorts-cuts -- --all [--dry-run]           DB 의 모든 편
 *
 * 규칙
 * - 쇼츠 대상 세력(disabled·longformOnly 아님)을 position 순서로 걸으며, part 번호가 **커지는** 자리마다
 *   앞 세력의 sequence 끝에 경계를 둔다. 작아지는 자리(뒤편 세력이 앞에 놓인 옛 배정)는 경계를 두지 않는다 —
 *   경계 모델은 이야기 순서 = 편 순서라 표현할 수 없고, 편 번호가 밀리면 편별 제목·음악 키가 어긋난다.
 * - 이미 경계(sequence cut·beat shortsCutBefore)가 있는 편은 옛 배정이 처음부터 무시되던 편이라 경계를 더하지 않는다.
 * - 옛 값(`part`, `shortsPartCount`)은 지운다. 편 미지정(공통) 세력은 그 자리에 그대로 들어간다.
 * - DB 만 고친다. 파일은 `pnpm faction:export -- --episode <편>` 으로 다시 내보낸다.
 */

import type { SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { factionSequenceOf, withFactionSequenceCut, type FactionSequenceItem } from '@feelandnote/shared/lib/faction-sequence'
import { hasFactionShortsCuts } from '@feelandnote/shared/lib/faction-shorts'
import { adminClient, parseArgs } from './lib.js'

const USAGE = '사용: pnpm faction:migrate-shorts-cuts -- (--episode <폴더명> | --all) [--dry-run]'
type Row = Record<string, unknown>

interface GroupRow {
  id: string
  position: number
  name: string | null
  part: number | null
  disabled: boolean | null
  longform_only: boolean | null
  data: Row | null
  clusterCount: number
  clusters: Row[]
}

/** 한 편의 변환 계획 — 순수 계산. 어느 세력 끝에 경계가 붙는지와 이유를 돌려준다. */
export function planShortsCuts(groups: GroupRow[]): { cutAfter: Set<string>; note: string } {
  const asFactionGroups = groups.map(g => ({
    name: g.name ?? '',
    disabled: g.disabled ?? undefined,
    longformOnly: g.longform_only ?? undefined,
    clusters: g.clusters,
    sequence: (g.data?.sequence as FactionSequenceItem[] | undefined),
  }))
  if (hasFactionShortsCuts(asFactionGroups as unknown as Row[])) {
    return { cutAfter: new Set(), note: '이미 경계가 있는 편 — 옛 배정은 무시되던 값이라 경계를 더하지 않는다' }
  }
  const cutAfter = new Set<string>()
  let prevShorts: GroupRow | null = null
  let prevPart: number | null = null
  let dropped = 0
  for (const g of groups) {
    if (g.disabled || g.longform_only) continue
    const part = g.part != null && g.part > 0 ? g.part : null
    if (part != null && prevPart != null && prevShorts) {
      if (part > prevPart) cutAfter.add(prevShorts.id)
      else if (part < prevPart) dropped++
    }
    if (part != null) prevPart = part
    prevShorts = g
  }
  const parts = new Set(groups.filter(g => !g.disabled && !g.longform_only && g.part != null && g.part > 0).map(g => g.part))
  const note = parts.size <= 1
    ? '편 배정 없음 → 단편(경계 없음)'
    : `part ${[...parts].sort((a, b) => (a as number) - (b as number)).join('/')} → 경계 ${cutAfter.size}개${dropped ? ` · 순서 역행 ${dropped}곳은 경계로 못 옮김` : ''}`
  return { cutAfter, note }
}

async function loadGroups(db: DatabaseClient, episodeId: string): Promise<GroupRow[]> {
  const { data, error } = await db
    .from('faction_groups')
    .select('id,position,name,part,disabled,longform_only,data,faction_clusters(id,position,data)')
    .eq('episode_id', episodeId)
    .order('position')
  if (error) throw new Error(`faction_groups 조회 실패: ${error.message}`)
  return ((data ?? []) as unknown as (Omit<GroupRow, 'clusterCount' | 'clusters'> & { faction_clusters?: Row[] })[]).map(g => {
    const clusters = [...(g.faction_clusters ?? [])].sort((a, b) => (a.position as number) - (b.position as number))
    return {
      ...g,
      clusterCount: clusters.length,
      // 정규화(경계 자리 계산)에 필요한 최소 모양 — beats 는 cluster.data 에 있으면 쓰고 없으면 빈 배열
      clusters: clusters.map(c => ({ people: [], beats: (c.data as Row | null)?.beats ?? [] })),
    }
  })
}

async function main() {
  const args = parseArgs(process.argv, USAGE)
  const db = adminClient()
  let query = db.from('faction_episodes').select('id,folder,data').order('sort_order')
  if (!args.all) {
    if (!args.episodes.length) throw new Error(USAGE)
    query = query.in('folder', args.episodes)
  }
  const { data: episodes, error } = await query
  if (error) throw new Error(`faction_episodes 조회 실패: ${error.message}`)

  let changedGroups = 0, changedEpisodes = 0
  for (const ep of (episodes ?? []) as { id: string; folder: string; data: Row | null }[]) {
    const groups = await loadGroups(db, ep.id)
    const { cutAfter, note } = planShortsCuts(groups)
    const hadPart = groups.some(g => g.part != null) || ep.data?.shortsPartCount != null
    console.log(`${args.dryRun ? '(dry-run) ' : ''}${ep.folder.padEnd(24)} ${note}${hadPart ? '' : ' · 옛 값 없음'}`)
    if (args.dryRun) continue

    for (const g of groups) {
      const needsCut = cutAfter.has(g.id)
      const patch: Row = {}
      if (g.part != null) patch.part = null
      if (needsCut) {
        const group = {
          name: g.name ?? '',
          clusters: g.clusters,
          sequence: g.data?.sequence as FactionSequenceItem[] | undefined,
        }
        const sequence = factionSequenceOf(group as unknown as Row)
        patch.data = { ...(g.data ?? {}), sequence: withFactionSequenceCut(sequence, g.clusterCount, true) }
      }
      if (!Object.keys(patch).length) continue
      const { error: gErr } = await db.from('faction_groups').update(patch).eq('id', g.id)
      if (gErr) throw new Error(`${ep.folder} 세력 ${g.position} 갱신 실패: ${gErr.message}`)
      changedGroups++
      if (needsCut) console.log(`  ● 세력 ${g.position} 「${(g.name ?? '').split('\n')[0]}」 뒤 경계`)
    }
    if (ep.data?.shortsPartCount != null) {
      const { shortsPartCount: _dropped, ...rest } = ep.data
      const { error: eErr } = await db.from('faction_episodes').update({ data: rest }).eq('id', ep.id)
      if (eErr) throw new Error(`${ep.folder} 에피소드 갱신 실패: ${eErr.message}`)
      changedEpisodes++
    }
  }
  console.log(`\n${args.dryRun ? '(dry-run) ' : ''}세력 ${changedGroups}행 · 에피소드 ${changedEpisodes}행 갱신. 파일은 pnpm faction:export -- --episode <편> 으로 다시 내보낸다.`)
}

main().catch(err => { console.error(err instanceof Error ? err.message : err); process.exit(1) })
